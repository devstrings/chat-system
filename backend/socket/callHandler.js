import Call from "../models/Call.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { redisClient } from "../config/redis.js";

export const setupCallHandlers = (io, socket) => {
  const userId = socket.user.id;
  const activeCalls = new Map();

  //  Conversation fetch helper
  const getConvId = async (user1, user2) => {
    const conv = await Conversation.findOne({
      participants: { $all: [user1, user2] },
    });
    return conv?._id?.toString() || null;
  };

  const makeCallMessage = (callRecord, convId) => ({
    _id: `call-${callRecord._id}`,
    isCallRecord: true,
    callType: callRecord.callType,
    callStatus: callRecord.status,
    callDuration: callRecord.duration || 0,
    caller: callRecord.caller.toString(),
    receiver: callRecord.receiver.toString(),
    createdAt:
      callRecord.endedAt || callRecord.startedAt || new Date().toISOString(),
    sender: userId,
    conversationId: convId || null,
    text: "",
    attachments: [],
  });

  const saveCallToConversation = async (callRecord, convId) => {
    console.log(" saveCallToConversation called:", {
      convId,
      callId: callRecord._id,
    });
    if (!convId) return null;
    try {
      console.log(" Creating message in DB...");
      const durationText =
        callRecord.duration > 0 ? `${callRecord.duration}s` : "";
      const icon = callRecord.callType === "video" ? "📹" : "📞";
      const statusText =
        callRecord.status === "rejected"
          ? "Declined"
          : callRecord.status === "missed"
            ? "Missed"
            : callRecord.status === "cancelled"
              ? "Cancelled"
              : durationText;

      const callTime = callRecord.endedAt || callRecord.startedAt || new Date();

      const msg = await Message.create({
        conversationId: convId,
        sender: callRecord.caller,
        text: `${icon} ${statusText}`,
        isCallRecord: true,
        callRecordId: callRecord._id,
        callStatus: callRecord.status,
        callType: callRecord.callType,
        callDuration: callRecord.duration || 0,
        callCaller: callRecord.caller,
        callReceiver: callRecord.receiver,
      });

      await Message.findByIdAndUpdate(msg._id, {
        $set: { createdAt: callTime },
      });

      console.log(" Message saved! ID:", msg._id, "Text:", msg.text);

      await Conversation.findByIdAndUpdate(convId, {
        lastMessage: msg.text,
        lastMessageTime: callTime,
        updatedAt: callTime,
      });

      return msg;
    } catch (err) {
      console.error("saveCallToConversation error:", err);
      return null;
    }
  };

  socket.on("call:initiate", async ({ to, offer, callType }) => {
    console.log(` Call from ${userId} to ${to}`);
    try {
      const callRecord = await Call.create({
        caller: userId,
        receiver: to,
        callType,
        status: "completed",
        startedAt: new Date(),
      });

      activeCalls.set(`${userId}-${to}`, {
        callId: callRecord._id,
        startTime: Date.now(),
        callType,
      });

      const toId = to.toString();
      const receiverOnline = await redisClient.hGet("onlineUsers", toId);

      socket.emit("call:receiver_status", { isOnline: !!receiverOnline });

      if (receiverOnline) {
        io.to(to).emit("call:incoming", {
          from: userId,
          offer,
          callType,
          callerUsername: socket.user.username,
          callId: callRecord._id.toString(),
        });
      } else {
        const updated = await Call.findByIdAndUpdate(
          callRecord._id,
          {
            status: "missed",
            endedAt: new Date(),
          },
          { new: true },
        );

        const convId = await getConvId(userId, to);
        await saveCallToConversation(updated, convId);
        const callMsg = makeCallMessage(updated, convId);
        socket.emit("call:record", { callMessage: callMsg, otherUserId: to });
      }
    } catch (err) {
      console.error("Call initiate error:", err);
    }
  });

  socket.on("call:answer", ({ to, answer }) => {
    console.log(` Call answered by ${userId}`);
    io.to(to).emit("call:answered", { from: userId, answer });
  });

  socket.on("ice:candidate", ({ to, candidate }) => {
    io.to(to).emit("ice:candidate", { from: userId, candidate });
  });

  socket.on("call:end", async ({ to }) => {
    console.log(` Call ended by ${userId}`);
    try {
      const callKey = `${userId}-${to}`;
      const reverseKey = `${to}-${userId}`;
      const callData = activeCalls.get(callKey) || activeCalls.get(reverseKey);

      if (callData) {
        const duration = Math.floor((Date.now() - callData.startTime) / 1000);
        const updated = await Call.findByIdAndUpdate(
          callData.callId,
          {
            status: "completed",
            duration,
            endedAt: new Date(),
          },
          { new: true },
        );

        activeCalls.delete(callKey);
        activeCalls.delete(reverseKey);

        if (updated) {
          const convId = await getConvId(userId, to);
          await saveCallToConversation(updated, convId);
          const callMsg = makeCallMessage(updated, convId);
          io.to(userId).emit("call:record", {
            callMessage: callMsg,
            otherUserId: to,
          });
          io.to(to).emit("call:record", {
            callMessage: callMsg,
            otherUserId: userId,
          });
        }
      }
    } catch (err) {
      console.error("Call end error:", err);
    }
    io.to(to).emit("call:ended", { from: userId });
  });

  socket.on("call:reject", async ({ to, callId }) => {
    console.log(` Call rejected by ${userId}`);
    io.to(to).emit("call:rejected", { from: userId });

    try {
      if (callId) {
        const updated = await Call.findByIdAndUpdate(
          callId,
          {
            status: "rejected",
            endedAt: new Date(),
          },
          { new: true },
        );

        if (updated) {
          const convId = await getConvId(userId, to);
          await saveCallToConversation(updated, convId);
          const callMsg = makeCallMessage(updated, convId);
          io.to(userId).emit("call:record", {
            callMessage: callMsg,
            otherUserId: to,
          });
          io.to(to).emit("call:record", {
            callMessage: callMsg,
            otherUserId: userId,
          });
        }
      }
      activeCalls.delete(`${to}-${userId}`);
    } catch (err) {
      console.error("Call reject error:", err);
    }
  });

  socket.on("call:cancel", async ({ to }) => {
    console.log(` Call cancelled by ${userId}`);
    try {
      const callKey = `${userId}-${to}`;
      const callData = activeCalls.get(callKey);
      if (callData) {
        const updated = await Call.findByIdAndUpdate(
          callData.callId,
          {
            status: "cancelled",
            endedAt: new Date(),
          },
          { new: true },
        );

        activeCalls.delete(callKey);

        if (updated) {
          const convId = await getConvId(userId, to);
          await saveCallToConversation(updated, convId);
          const callMsg = makeCallMessage(updated, convId);
          socket.emit("call:record", { callMessage: callMsg, otherUserId: to });
        }
      }
    } catch (err) {
      console.error("Call cancel error:", err);
    }
    io.to(to).emit("call:cancelled", { from: userId });
  });
};
