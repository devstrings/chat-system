import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";

export function handleMessage(io, socket) {
  console.log(`✅ User connected: ${socket.user.id}`);

  //  Send message
  socket.on("sendMessage", async ({ conversationId, text, attachments = [] }) => {
    try {
      console.log("📤 Sending message:", { conversationId, text, senderId: socket.user.id });

      //  Extract attachment IDs from attachment objects
      let attachmentIds = [];
      if (attachments && attachments.length > 0) {
        attachmentIds = attachments.map(att => att.attachmentId).filter(Boolean);
        console.log("📎 Attachment IDs:", attachmentIds);
      }

      //  Create message with 'sent' status
      const msg = await Message.create({
        conversationId,
        sender: socket.user.id,
        text: text || "",
        attachments: attachmentIds,
        status: "sent",
      });

      console.log("✅ Message created:", msg._id);

      //  Populate sender AND attachments properly
      await msg.populate("sender", "username email");
      await msg.populate({
        path: "attachments",
        select: "fileName fileType sizeInKilobytes serverFileName"
      });

      console.log("✅ Populated attachments:", msg.attachments);

      //  Get conversation & find participants
      const conversation = await Conversation.findById(conversationId).populate(
        "participants",
        "_id username email"
      );

      if (!conversation) {
        console.warn("⚠️ Conversation not found:", conversationId);
        return;
      }

      //  Update conversation with last message
      // ✅ FIX: Use attachmentIds.length instead of attachments.length
      const lastMessageText = text || (attachmentIds.length > 0 ? "📎 Attachment" : "");
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: lastMessageText,
        lastMessageTime: Date.now(),
        lastMessageSender: socket.user.id,
      });

      //  Transform attachments for frontend (with safety checks)
      const transformedAttachments = msg.attachments && msg.attachments.length > 0
        ? msg.attachments.map(att => {
            if (!att || !att.serverFileName) {
              console.warn("⚠️ Invalid attachment:", att);
              return null;
            }
            return {
              url: `/api/file/get/${att.serverFileName}`,
              filename: att.fileName,
              fileType: att.fileType,
              fileSize: att.sizeInKilobytes * 1024,
              attachmentId: att._id
            };
          }).filter(Boolean)
        : [];

      console.log("✅ Transformed attachments:", transformedAttachments);

      //  Prepare message data
      const messageData = {
        _id: msg._id,
        conversationId: msg.conversationId,
        sender: {
          _id: msg.sender._id,
          username: msg.sender.username,
          email: msg.sender.email,
        },
        text: msg.text,
        attachments: transformedAttachments,
        status: msg.status,
        createdAt: msg.createdAt,
      };

      console.log("✅ Broadcasting message:", messageData);

      //  Emit only to conversation participants
      conversation.participants.forEach((participant) => {
        const targetSocket = [...io.sockets.sockets.values()].find(
          (s) => s.user && s.user.id === participant._id.toString()
        );

        if (targetSocket) {
          console.log(`✅ Emitting to user: ${participant._id}`);
          targetSocket.emit("receiveMessage", messageData);
        }
      });

      //  Identify receiver (for delivery update)
      const receiverId = conversation.participants.find(
        (p) => p._id.toString() !== socket.user.id
      )?._id;

      if (receiverId) {
        const receiverSocket = [...io.sockets.sockets.values()].find(
          (s) => s.user && s.user.id === receiverId.toString()
        );

        if (receiverSocket) {
          console.log(`✅ Receiver ONLINE, marking delivered`);
          setTimeout(async () => {
            try {
              await Message.findByIdAndUpdate(msg._id, {
                status: "delivered",
                deliveredAt: new Date(),
              });

              console.log("✅ Message delivered:", msg._id);

              [socket, receiverSocket].forEach((s) =>
                s.emit("messageStatusUpdate", {
                  messageId: msg._id,
                  conversationId,
                  status: "delivered",
                })
              );
            } catch (err) {
              console.error("❌ Delivery error:", err);
            }
          }, 500);
        } else {
          console.log(`⚠️ Receiver OFFLINE`);
        }
      }
    } catch (err) {
      console.error("❌ sendMessage error:", err);
      console.error("❌ Stack:", err.stack);
      socket.emit("errorMessage", { message: "Message send failed" });
    }
  });

  //  Handle user coming online
  socket.on("userOnline", async () => {
    try {
      console.log(`✅ User ${socket.user.id} online`);

      const conversations = await Conversation.find({
        participants: socket.user.id,
      });

      for (const conv of conversations) {
        const pendingMessages = await Message.find({
          conversationId: conv._id,
          sender: { $ne: socket.user.id },
          status: "sent",
        });

        if (pendingMessages.length > 0) {
          console.log(`✅ Delivering ${pendingMessages.length} messages`);

          await Message.updateMany(
            {
              conversationId: conv._id,
              sender: { $ne: socket.user.id },
              status: "sent",
            },
            {
              status: "delivered",
              deliveredAt: new Date(),
            }
          );

          pendingMessages.forEach((msg) => {
            socket.emit("messageStatusUpdate", {
              messageId: msg._id,
              conversationId: msg.conversationId,
              status: "delivered",
            });
          });
        }
      }
    } catch (err) {
      console.error("❌ userOnline error:", err);
    }
  });

  //  Mark messages as read
  socket.on("markAsRead", async ({ conversationId }) => {
    try {
      console.log(`✅ Marking read: ${conversationId}`);

      const result = await Message.updateMany(
        {
          conversationId,
          sender: { $ne: socket.user.id },
          status: { $ne: "read" },
        },
        {
          status: "read",
          readAt: new Date(),
        }
      );

      if (result.modifiedCount > 0) {
        console.log(` Marked ${result.modifiedCount} as read`);

        const conversation = await Conversation.findById(conversationId).populate("participants", "_id");

        for (const participant of conversation.participants) {
          const targetSocket = [...io.sockets.sockets.values()].find(
            (s) => s.user && s.user.id === participant._id.toString()
          );

          if (targetSocket) {
            targetSocket.emit("messageStatusUpdate", {
              conversationId,
              status: "read",
            });
          }
        }
      }
    } catch (err) {
      console.error("markAsRead error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.user.id}`);
  });
}