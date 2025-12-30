import Message from "../models/message.js";
import Conversation from "../models/Conversation.js";

export function handleMessage(io, socket) {
  console.log(` User connected: ${socket.user.id}`);

 
  socket.on("sendMessage", async ({ conversationId, text, attachments = [] }) => {
    try {
      console.log(" Sending message:", { conversationId, text, senderId: socket.user.id });

      // Extract attachment IDs
      let attachmentIds = [];
      if (attachments && attachments.length > 0) {
        attachmentIds = attachments.map(att => att.attachmentId).filter(Boolean);
        console.log(" Attachment IDs:", attachmentIds);
      }

      // Get conversation to find receiver
      const conversation = await Conversation.findById(conversationId).populate(
        "participants",
        "_id username email"
      );

      if (!conversation) {
        console.warn(" Warning: Conversation not found:", conversationId);
        return;
      }

      // Find receiver ID
      const receiverId = conversation.participants.find(
        (p) => p._id.toString() !== socket.user.id
      )?._id;

      // Create message with 'sent' status
      const msg = await Message.create({
        conversationId,
        sender: socket.user.id,
        text: text || "",
        attachments: attachmentIds,
        status: "sent",
      });

      console.log(" Message created:", msg._id);

      //  Populate sender AND attachments with ALL required fields
      await msg.populate("sender", "username email");
      await msg.populate({
        path: "attachments",
        select: "fileName fileType sizeInKilobytes serverFileName duration isVoiceMessage" 
      });

      // Update conversation with last message
      const lastMessageText = text || (attachmentIds.length > 0 ? "📎 Attachment" : "");
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: lastMessageText,
        lastMessageTime: Date.now(),
        lastMessageSender: socket.user.id,
      });

      // Transform attachments with complete data including duration
      const transformedAttachments = msg.attachments && msg.attachments.length > 0
        ? msg.attachments.map(att => {
            if (!att || !att.serverFileName) {
              console.warn(" Warning: Invalid attachment:", att);
              return null;
            }
            return {
              url: `/api/file/get/${att.serverFileName}`,
              filename: att.fileName,
              fileName: att.fileName, // Both formats for compatibility
              fileType: att.fileType,
              fileSize: att.sizeInKilobytes * 1024,
              attachmentId: att._id,
              duration: att.duration || 0,              
              isVoiceMessage: att.isVoiceMessage || false 
            };
          }).filter(Boolean)
        : [];

      // Prepare message data WITH receiver field
      const messageData = {
        _id: msg._id,
        conversationId: msg.conversationId,
        sender: {
          _id: msg.sender._id,
          username: msg.sender.username,
          email: msg.sender.email,
        },
        receiver: receiverId,
        text: msg.text,
        attachments: transformedAttachments, 
        status: msg.status,
        createdAt: msg.createdAt,
      };

      console.log(" Broadcasting message to both users");
      console.log("Attachments with duration:", transformedAttachments); 

      // Emit to BOTH sender and receiver explicitly
      socket.emit("receiveMessage", messageData);

      // Emit to receiver (if online)
      if (receiverId) {
        const receiverSocket = [...io.sockets.sockets.values()].find(
          (s) => s.user && s.user.id === receiverId.toString()
        );

        if (receiverSocket) {
          console.log(`Receiver ONLINE, sending message`);
          receiverSocket.emit("receiveMessage", messageData);

          // Mark as delivered after 500ms
          setTimeout(async () => {
            try {
              await Message.findByIdAndUpdate(msg._id, {
                status: "delivered",
                deliveredAt: new Date(),
              });

              console.log(" Message delivered:", msg._id);

              const statusUpdate = {
                messageId: msg._id,
                _id: msg._id,
                conversationId: msg.conversationId,
                status: "delivered",
              };

              socket.emit("messageStatusUpdate", statusUpdate);
              receiverSocket.emit("messageStatusUpdate", statusUpdate);
            } catch (err) {
              console.error(" Delivery error:", err);
            }
          }, 500);
        } else {
          console.log(`⏸ Receiver OFFLINE, message stays 'sent'`);
        }
      }
    } catch (err) {
      console.error(" sendMessage error:", err);
      console.error("Stack:", err.stack);
      socket.emit("errorMessage", { message: "Message send failed" });
    }
  });

  socket.on("userOnline", async () => {
    try {
      console.log(` User ${socket.user.id} came online`);

      const conversations = await Conversation.find({
        participants: socket.user.id,
      });

      for (const conv of conversations) {
        const pendingMessages = await Message.find({
          conversationId: conv._id,
          status: "sent",
        }).populate("sender", "username");

        if (pendingMessages.length > 0) {
          console.log(` Delivering ${pendingMessages.length} pending messages`);

          await Message.updateMany(
            {
              conversationId: conv._id,
              status: "sent",
            },
            {
              status: "delivered",
              deliveredAt: new Date(),
            }
          );

          for (const msg of pendingMessages) {
            const senderSocket = [...io.sockets.sockets.values()].find(
              (s) => s.user && s.user.id === msg.sender._id.toString()
            );

            const statusUpdate = {
              messageId: msg._id,
              _id: msg._id,
              conversationId: msg.conversationId,
              status: "delivered",
            };

            socket.emit("messageStatusUpdate", statusUpdate);
            if (senderSocket) {
              senderSocket.emit("messageStatusUpdate", statusUpdate);
            }
          }
        }
      }
    } catch (err) {
      console.error(" userOnline error:", err);
    }
  });

  
  socket.on("markAsRead", async ({ conversationId }) => {
    try {
      console.log(` Marking read in conversation: ${conversationId}`);

      const conversation = await Conversation.findById(conversationId).populate("participants", "_id");
      
      if (!conversation) {
        console.warn(" Conversation not found");
        return;
      }

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

        const readMessages = await Message.find({
          conversationId,
          sender: { $ne: socket.user.id },
          status: "read"
        }).select('_id sender');

        for (const msg of readMessages) {
          const statusUpdate = {
            messageId: msg._id,
            _id: msg._id,
            conversationId,
            status: "read",
          };

          for (const participant of conversation.participants) {
            const targetSocket = [...io.sockets.sockets.values()].find(
              (s) => s.user && s.user.id === participant._id.toString()
            );

            if (targetSocket) {
              targetSocket.emit("messageStatusUpdate", statusUpdate);
            }
          }
        }

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
      console.error(" markAsRead error:", err);
    }
  });

 
  //   DELETE FOR ME
socket.on("deleteMessageForMe", async ({ messageId, conversationId }) => {
  try {
    console.log(" Delete for me request:", messageId);

    const message = await Message.findById(messageId).populate('conversationId');
    if (!message) {
      console.warn(" Message not found");
      return;
    }

    const userId = socket.user.id;

    const isParticipant = message.conversationId.participants.some(
      p => p.toString() === userId
    );

    if (!isParticipant) {
      socket.emit("errorMessage", { message: "Unauthorized" });
      return;
    }

    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
    }

    const allDeleted = message.conversationId.participants.every(
      p => message.deletedFor.includes(p.toString())
    );

    if (allDeleted) {
      message.isDeleted = true;
      message.deletedAt = new Date();
      await message.save();
      
      await Message.findByIdAndDelete(messageId);
      console.log(" Message physically deleted from DB");
    } else {
      await message.save();
    }

    //  Emit delete event
    socket.emit("messageDeleted", {
      messageId,
      conversationId,
      deletedFor: [userId],
      isDeleted: allDeleted
    });

    //  conversation's lastMessage if needed
    if (allDeleted) {
      const remainingMessages = await Message.find({ 
        conversationId: conversationId 
      })
      .sort({ createdAt: -1 })
      .limit(1)
      .populate('sender', 'username');

      if (remainingMessages.length > 0) {
        const lastMsg = remainingMessages[0];
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: lastMsg.text || "📎 Attachment",
          lastMessageTime: lastMsg.createdAt,
          lastMessageSender: lastMsg.sender._id
        });
      } else {
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: "",
          lastMessageTime: Date.now(),
          lastMessageSender: null
        });
      }
    }

    console.log(" Message deleted for user");
  } catch (err) {
    console.error(" Delete for me error:", err);
  }
});


  // DELETE FOR EVERYONE
  socket.on("deleteMessageForEveryone", async ({ messageId, conversationId }) => {
  try {
    console.log(" Delete for everyone request:", messageId);

    const message = await Message.findById(messageId).populate('conversationId');
    if (!message) {
      console.warn(" Message not found");
      return;
    }

    const userId = socket.user.id;

    if (message.sender.toString() !== userId) {
      socket.emit("errorMessage", { message: "Only sender can delete for everyone" });
      return;
    }

    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const fiveMinutes = 5 * 60 * 1000;

    if (messageAge > fiveMinutes) {
      socket.emit("errorMessage", { 
        message: "Cannot delete for everyone after 5 minutes" 
      });
      return;
    }

    message.deletedForEveryone = true;
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.text = "";
    message.attachments = [];

    await message.save();

    const deleteData = {
      messageId,
      conversationId,
      deletedForEveryone: true
    };

    //  Emit to all participants
    for (const participant of message.conversationId.participants) {
      const targetSocket = [...io.sockets.sockets.values()].find(
        (s) => s.user && s.user.id === participant.toString()
      );

      if (targetSocket) {
        targetSocket.emit("messageDeletedForEveryone", deleteData);
      }
    }

    //  conversation's lastMessage
    const remainingMessages = await Message.find({ 
      conversationId: conversationId,
      deletedForEveryone: { $ne: true }
    })
    .sort({ createdAt: -1 })
    .limit(1)
    .populate('sender', 'username');

    if (remainingMessages.length > 0) {
      const lastMsg = remainingMessages[0];
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: lastMsg.text || "📎 Attachment",
        lastMessageTime: lastMsg.createdAt,
        lastMessageSender: lastMsg.sender._id
      });
    } else {
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: "",
        lastMessageTime: Date.now(),
        lastMessageSender: null
      });
    }

    console.log(" Message deleted for everyone");
  } catch (err) {
    console.error(" Delete for everyone error:", err);
  }
});

  socket.on("disconnect", () => {
    console.log(` User disconnected: ${socket.user.id}`);
  });
}