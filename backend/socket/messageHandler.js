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

      // Update conversation with last message
      const lastMessageText = text || (attachments.length > 0 ? " Attachment" : "");
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: lastMessageText,
        lastMessageTime: Date.now(),
      });

      // Prepare message data with all fields
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
        status: msg.status || 'sent',  //  Make sure status is included
        createdAt: msg.createdAt,
      };

      console.log(" Broadcasting message with status:", messageData.status, messageData);
      
      // Broadcast to all connected clients
      io.emit("receiveMessage", messageData);

      //  Auto-update to 'delivered' after 500ms
      setTimeout(async () => {
        try {
          await Message.findByIdAndUpdate(msg._id, {
            status: 'delivered',
            deliveredAt: new Date()
          });
          
          console.log(" Message delivered:", msg._id);
          
          // Broadcast delivery status
          io.emit("messageStatusUpdate", {
            messageId: msg._id,
            status: 'delivered'
          });
        } catch (err) {
          console.error(" Delivery update error:", err);
        }
      }, 500);
      
    } catch (err) {
      console.error(" sendMessage error:", err);
      socket.emit("errorMessage", { message: "Message send failed" });
    }
  });

  //  Mark messages as read
  socket.on("markAsRead", async ({ conversationId }) => {
    try {
      console.log(` Marking messages as read in conversation: ${conversationId}`);

      // Update all unread messages in this conversation
      const result = await Message.updateMany(
        {
          conversationId,
          sender: { $ne: socket.user.id }, // Not sent by current user
          status: { $ne: 'read' } // Not already read
        },
        {
          status: 'read',
          readAt: new Date()
        }
      );

      if (result.modifiedCount > 0) {
        console.log(` Marked ${result.modifiedCount} messages as read`);
        
        // Broadcast read status to all clients
        io.emit("messagesMarkedRead", {
          conversationId,
          readBy: socket.user.id
        });

        // Also emit individual status updates for each message
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
      console.error(" markAsRead error:", err);
    }
  });

  //  Handle disconnect
  socket.on("disconnect", () => {
    console.log(` User disconnected: ${socket.user.id}`);
  });
}