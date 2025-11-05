import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";

export function handleMessage(io, socket) {
  console.log(` User connected: ${socket.user.id}`);

  //  Send message
  socket.on("sendMessage", async ({ conversationId, text, attachments = [] }) => {
    try {
      console.log(" Sending message:", { conversationId, text, senderId: socket.user.id });

      // Create message with 'sent' status
      const msg = await Message.create({
        conversationId,
        sender: socket.user.id,
        text: text || "",
        attachments: attachments || [],
        status: 'sent'
      });

      await msg.populate("sender", "username email");

      // Get conversation to find receiver
      const conversation = await Conversation.findById(conversationId);
      const receiverId = conversation.participants.find(
        p => p.toString() !== socket.user.id
      );

      // Update conversation with last message
      const lastMessageText = text || (attachments.length > 0 ? "📎 Attachment" : "");
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: lastMessageText,
        lastMessageTime: Date.now(),
          lastMessageSender: socket.user.id, 

      });

      // Prepare message data
      const messageData = {
        _id: msg._id,
        conversationId: msg.conversationId,
        sender: {
          _id: msg.sender._id,
          username: msg.sender.username,
          email: msg.sender.email
        },
        text: msg.text,
        attachments: msg.attachments || [],
        status: msg.status,
        createdAt: msg.createdAt,
      };

      console.log("✅ Broadcasting message with status:", messageData.status);
      
      // Broadcast to all connected clients
      io.emit("receiveMessage", messageData);

      // ✅ Check if receiver is ONLINE
      const receiverSocket = Array.from(io.sockets.sockets.values()).find(
        s => s.user && s.user.id === receiverId.toString()
      );

      if (receiverSocket) {
        // ✅ Receiver is ONLINE - Mark as delivered
        console.log(`📬 Receiver is ONLINE, marking as delivered`);
        
        setTimeout(async () => {
          try {
            await Message.findByIdAndUpdate(msg._id, {
              status: 'delivered',
              deliveredAt: new Date()
            });
            
            console.log("📬 Message delivered:", msg._id);
            
            // Broadcast delivery status
            io.emit("messageStatusUpdate", {
              messageId: msg._id,
              status: 'delivered'
            });
          } catch (err) {
            console.error("❌ Delivery update error:", err);
          }
        }, 500);
      } else {
        // ❌ Receiver is OFFLINE - Keep as 'sent' (single tick)
        console.log(`⏸️ Receiver is OFFLINE, staying as 'sent'`);
      }
      
    } catch (err) {
      console.error("❌ sendMessage error:", err);
      socket.emit("errorMessage", { message: "Message send failed" });
    }
  });

  // ✅ Handle user coming online - Deliver pending messages
  socket.on("userOnline", async () => {
    try {
      console.log(`🟢 User ${socket.user.id} came online, checking pending messages`);

      // Find all conversations where user is participant
      const conversations = await Conversation.find({
        participants: socket.user.id
      });

      for (const conv of conversations) {
        // Find messages that are 'sent' but not delivered (user was offline)
        const pendingMessages = await Message.find({
          conversationId: conv._id,
          sender: { $ne: socket.user.id },
          status: 'sent'
        });

        if (pendingMessages.length > 0) {
          console.log(`📬 Delivering ${pendingMessages.length} pending messages`);

          // Update all to 'delivered'
          await Message.updateMany(
            {
              conversationId: conv._id,
              sender: { $ne: socket.user.id },
              status: 'sent'
            },
            {
              status: 'delivered',
              deliveredAt: new Date()
            }
          );

          // Broadcast status updates
          pendingMessages.forEach(msg => {
            io.emit("messageStatusUpdate", {
              messageId: msg._id,
              status: 'delivered'
            });
          });
        }
      }
    } catch (err) {
      console.error("❌ userOnline error:", err);
    }
  });

  // ✅ Mark messages as read
  socket.on("markAsRead", async ({ conversationId }) => {
    try {
      console.log(`👁️ Marking messages as read in conversation: ${conversationId}`);

      // Update all unread messages in this conversation
      const result = await Message.updateMany(
        {
          conversationId,
          sender: { $ne: socket.user.id },
          status: { $ne: 'read' }
        },
        {
          status: 'read',
          readAt: new Date()
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ Marked ${result.modifiedCount} messages as read`);
        
        // Broadcast read status to all clients
        io.emit("messagesMarkedRead", {
          conversationId,
          readBy: socket.user.id
        });

        // Also emit individual status updates
        const readMessages = await Message.find({
          conversationId,
          sender: { $ne: socket.user.id },
          status: 'read'
        }).select('_id');

        readMessages.forEach(msg => {
          io.emit("messageStatusUpdate", {
            messageId: msg._id,
            status: 'read'
          });
        });
      }
    } catch (err) {
      console.error("❌ markAsRead error:", err);
    }
  });

  // ✅ Handle disconnect
  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.user.id}`);
  });
}