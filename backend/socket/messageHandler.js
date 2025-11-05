import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";

export function handleMessage(io, socket) {
  console.log(` User connected: ${socket.user.id}`);

  //  Send message
  socket.on("sendMessage", async ({ conversationId, text, attachments = [] }) => {
    try {
      console.log(" Sending message:", { conversationId, text, senderId: socket.user.id });

      //  Create message with 'sent' status
      const msg = await Message.create({
        conversationId,
        sender: socket.user.id,
        text: text || "",
        attachments: attachments || [],
        status: "sent",
      });

      await msg.populate("sender", "username email");

      //  Get conversation & find participants
      const conversation = await Conversation.findById(conversationId).populate(
        "participants",
        "_id username email"
      );

      if (!conversation) {
        console.warn(" Conversation not found:", conversationId);
        return;
      }

      //  Update conversation with last message
      const lastMessageText = text || (attachments.length > 0 ? "📎 Attachment" : "");
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: lastMessageText,
        lastMessageTime: Date.now(),
        lastMessageSender: socket.user.id,
      });

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
        attachments: msg.attachments || [],
        status: msg.status,
        createdAt: msg.createdAt,
      };

      console.log(" Broadcasting message with status:", messageData.status);

      //  Emit only to conversation participants
      conversation.participants.forEach((participant) => {
        const targetSocket = [...io.sockets.sockets.values()].find(
          (s) => s.user && s.user.id === participant._id.toString()
        );

        if (targetSocket) {
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
          //  Receiver is online
          console.log(` Receiver is ONLINE, marking as delivered`);
          setTimeout(async () => {
            try {
              await Message.findByIdAndUpdate(msg._id, {
                status: "delivered",
                deliveredAt: new Date(),
              });

              console.log(" Message delivered:", msg._id);

              // Notify both users
              [socket, receiverSocket].forEach((s) =>
                s.emit("messageStatusUpdate", {
                  messageId: msg._id,
                  conversationId,
                  status: "delivered",
                })
              );
            } catch (err) {
              console.error(" Delivery update error:", err);
            }
          }, 500);
        } else {
          console.log(` Receiver is OFFLINE, message stays 'sent'`);
        }
      }
    } catch (err) {
      console.error(" sendMessage error:", err);
      socket.emit("errorMessage", { message: "Message send failed" });
    }
  });

  //  Handle user coming online - Deliver pending messages
  socket.on("userOnline", async () => {
    try {
      console.log(` User ${socket.user.id} came online, checking pending messages`);

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
          console.log(` Delivering ${pendingMessages.length} pending messages`);

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
      console.error(" userOnline error:", err);
    }
  });

  //  Mark messages as read
  socket.on("markAsRead", async ({ conversationId }) => {
    try {
      console.log(` Marking messages as read in conversation: ${conversationId}`);

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
        console.log(` Marked ${result.modifiedCount} messages as read`);

        //  find conversation participants
        const conversation = await Conversation.findById(conversationId).populate("participants", "_id");

        //  send read status only to conversation participants
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
      console.error(" markAsRead error:", err);
    }
  });

  //  Handle disconnect
  socket.on("disconnect", () => {
    console.log(` User disconnected: ${socket.user.id}`);
  });
}
