import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";

export function handleMessage(io, socket) {
  console.log(`✅ User connected: ${socket.user.id}`);

  //  Send message
  socket.on("sendMessage", async ({ conversationId, text, attachments = [] }) => {
    try {
      console.log("📤 Sending message:", { conversationId, text, senderId: socket.user.id });

      //  Extract attachment IDs
      let attachmentIds = [];
      if (attachments && attachments.length > 0) {
        attachmentIds = attachments.map(att => att.attachmentId).filter(Boolean);
        console.log("📎 Attachment IDs:", attachmentIds);
      }

      //  Get conversation to find receiver
      const conversation = await Conversation.findById(conversationId).populate(
        "participants",
        "_id username email"
      );

      if (!conversation) {
        console.warn("⚠️ Conversation not found:", conversationId);
        return;
      }

      //  Find receiver ID
      const receiverId = conversation.participants.find(
        (p) => p._id.toString() !== socket.user.id
      )?._id;

      //  Create message with 'sent' status AND receiver field
      const msg = await Message.create({
        conversationId,
        sender: socket.user.id,
        receiver: receiverId, // ✅ FIX: Add receiver field
        text: text || "",
        attachments: attachmentIds,
        status: "sent",
      });

      console.log("✅ Message created:", msg._id);

      //  Populate sender AND attachments
      await msg.populate("sender", "username email");
      await msg.populate({
        path: "attachments",
        select: "fileName fileType sizeInKilobytes serverFileName"
      });

      //  Update conversation with last message
      const lastMessageText = text || (attachmentIds.length > 0 ? "📎 Attachment" : "");
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: lastMessageText,
        lastMessageTime: Date.now(),
        lastMessageSender: socket.user.id,
      });

      //  Transform attachments for frontend
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

      //  Prepare message data
      const messageData = {
        _id: msg._id,
        conversationId: msg.conversationId,
        sender: {
          _id: msg.sender._id,
          username: msg.sender.username,
          email: msg.sender.email,
        },
        receiver: receiverId, // ✅ Include receiver
        text: msg.text,
        attachments: transformedAttachments,
        status: msg.status,
        createdAt: msg.createdAt,
      };

      console.log("✅ Broadcasting message to both users");

      // ✅ FIX: Emit to BOTH sender and receiver explicitly
      // Emit to sender (confirmation)
      socket.emit("receiveMessage", messageData);

      // Emit to receiver (if online)
      if (receiverId) {
        const receiverSocket = [...io.sockets.sockets.values()].find(
          (s) => s.user && s.user.id === receiverId.toString()
        );

        if (receiverSocket) {
          console.log(`✅ Receiver ONLINE, sending message`);
          receiverSocket.emit("receiveMessage", messageData);

          // Mark as delivered after 500ms
          setTimeout(async () => {
            try {
              await Message.findByIdAndUpdate(msg._id, {
                status: "delivered",
                deliveredAt: new Date(),
              });

              console.log("✅ Message delivered:", msg._id);

              // ✅ FIX: Broadcast status to BOTH users
              const statusUpdate = {
                messageId: msg._id,
                _id: msg._id, // ✅ Add both for compatibility
                conversationId,
                status: "delivered",
              };

              socket.emit("messageStatusUpdate", statusUpdate);
              receiverSocket.emit("messageStatusUpdate", statusUpdate);
            } catch (err) {
              console.error("❌ Delivery error:", err);
            }
          }, 500);
        } else {
          console.log(`⚠️ Receiver OFFLINE, message stays 'sent'`);
        }
      }
    } catch (err) {
      console.error("❌ sendMessage error:", err);
      console.error("❌ Stack:", err.stack);
      socket.emit("errorMessage", { message: "Message send failed" });
    }
  });

  //  Handle user coming online (deliver pending messages)
  socket.on("userOnline", async () => {
    try {
      console.log(`✅ User ${socket.user.id} came online`);

      const conversations = await Conversation.find({
        participants: socket.user.id,
      });

      for (const conv of conversations) {
        // Find messages sent TO this user that are still 'sent'
        const pendingMessages = await Message.find({
          conversationId: conv._id,
          receiver: socket.user.id, // ✅ Use receiver field
          status: "sent",
        });

        if (pendingMessages.length > 0) {
          console.log(`✅ Delivering ${pendingMessages.length} pending messages`);

          // Update all to delivered
          await Message.updateMany(
            {
              conversationId: conv._id,
              receiver: socket.user.id,
              status: "sent",
            },
            {
              status: "delivered",
              deliveredAt: new Date(),
            }
          );

          // Notify sender(s) about delivery
          for (const msg of pendingMessages) {
            const senderSocket = [...io.sockets.sockets.values()].find(
              (s) => s.user && s.user.id === msg.sender.toString()
            );

            const statusUpdate = {
              messageId: msg._id,
              _id: msg._id,
              conversationId: msg.conversationId,
              status: "delivered",
            };

            // Notify both users
            socket.emit("messageStatusUpdate", statusUpdate);
            if (senderSocket) {
              senderSocket.emit("messageStatusUpdate", statusUpdate);
            }
          }
        }
      }
    } catch (err) {
      console.error("❌ userOnline error:", err);
    }
  });

  //  Mark messages as read
  socket.on("markAsRead", async ({ conversationId }) => {
    try {
      console.log(`✅ Marking read in conversation: ${conversationId}`);

      // ✅ FIX: Update messages where THIS user is the receiver
      const result = await Message.updateMany(
        {
          conversationId,
          receiver: socket.user.id, // ✅ This user received these messages
          status: { $ne: "read" },
        },
        {
          status: "read",
          readAt: new Date(),
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ Marked ${result.modifiedCount} messages as read`);

        // Get the messages that were just marked read
        const readMessages = await Message.find({
          conversationId,
          receiver: socket.user.id,
          status: "read"
        }).select('_id sender');

        const conversation = await Conversation.findById(conversationId).populate("participants", "_id");

        // ✅ FIX: Emit individual status updates for each message
        for (const msg of readMessages) {
          const statusUpdate = {
            messageId: msg._id,
            _id: msg._id,
            conversationId,
            status: "read",
          };

          // Emit to all participants
          for (const participant of conversation.participants) {
            const targetSocket = [...io.sockets.sockets.values()].find(
              (s) => s.user && s.user.id === participant._id.toString()
            );

            if (targetSocket) {
              targetSocket.emit("messageStatusUpdate", statusUpdate);
            }
          }
        }

        // Also emit bulk read event (for backward compatibility)
        for (const participant of conversation.participants) {
          const targetSocket = [...io.sockets.sockets.values()].find(
            (s) => s.user && s.user.id === participant._id.toString()
          );

          if (targetSocket) {
            targetSocket.emit("messagesMarkedRead", {
              conversationId,
              count: result.modifiedCount
            });
          }
        }
      }
    } catch (err) {
      console.error("❌ markAsRead error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.user.id}`);
  });
}