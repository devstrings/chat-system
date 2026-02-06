import Message from "../models/message.js";
import Conversation from "../models/Conversation.js";
import Group from "../models/Group.js";

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

      
      // Check if conversation is archived for any user
      if (conversation.archivedBy && conversation.archivedBy.length > 0) {
        console.log(` Conversation ${conversationId} is archived by ${conversation.archivedBy.length} user(s)`);
        
        // Store who had it archived before clearing
        const usersWhoArchived = conversation.archivedBy.map(a => a.userId.toString());
        
        // Clear the archive for all users
        conversation.archivedBy = [];
        await conversation.save();
        
        console.log(` Auto-unarchived conversation ${conversationId}`);
        
        // Notify all participants that chat is unarchived
        for (const participant of conversation.participants) {
          const participantId = participant._id.toString();
          
          // Only notify if they had it archived
          if (usersWhoArchived.includes(participantId)) {
            const targetSocket = [...io.sockets.sockets.values()].find(
              (s) => s.user && s.user.id === participantId
            );

            if (targetSocket) {
              targetSocket.emit("chatUnarchived", {
                conversationId: conversationId,
                reason: "newMessage"
              });
              console.log(` Notified user ${participantId} about unarchive`);
            }
          }
        }
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

      // Populate sender AND attachments with ALL required fields
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
              fileName: att.fileName,
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
      console.log(" Attachments with duration:", transformedAttachments); 

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
          console.log(`Receiver OFFLINE, message stays 'sent'`);
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

 
  // DELETE FOR ME
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

      // Emit delete event
      socket.emit("messageDeleted", {
        messageId,
        conversationId,
        deletedFor: [userId],
        isDeleted: allDeleted
      });

      // Update conversation's lastMessage if needed
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

      console.log("Message deleted for user");
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

      // Emit to all participants
      for (const participant of message.conversationId.participants) {
        const targetSocket = [...io.sockets.sockets.values()].find(
          (s) => s.user && s.user.id === participant.toString()
        );

        if (targetSocket) {
          targetSocket.emit("messageDeletedForEveryone", deleteData);
        }
      }

      // Update conversation's lastMessage
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
          lastMessage: lastMsg.text || " Attachment",
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
  
// Socket events section mein ye add karo:
socket.on("editMessage", async ({ messageId, text, conversationId }) => {
  try {
    console.log(" Edit message request:", messageId);

    const message = await Message.findById(messageId).populate('conversationId');
    if (!message) {
      socket.emit("errorMessage", { message: "Message not found" });
      return;
    }

    const userId = socket.user.id;

    // Only sender can edit
    if (message.sender.toString() !== userId) {
      socket.emit("errorMessage", { message: "Only sender can edit" });
      return;
    }

    // Check 3 hour limit
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const threeHours = 3 * 60 * 60 * 1000;

    if (messageAge > threeHours) {
      socket.emit("errorMessage", { 
        message: "Cannot edit after 3 hours" 
      });
      return;
    }

    // Save to history
    if (!message.editHistory) {
      message.editHistory = [];
    }
    message.editHistory.push({
      text: message.text,
      editedAt: new Date()
    });

    // Update
    message.text = text;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const editData = {
      messageId,
      conversationId,
      text,
      isEdited: true,
      editedAt: message.editedAt
    };

    // Emit to all participants
    for (const participant of message.conversationId.participants) {
      const targetSocket = [...io.sockets.sockets.values()].find(
        (s) => s.user && s.user.id === participant.toString()
      );

      if (targetSocket) {
        targetSocket.emit("messageEdited", editData);
      }
    }

    console.log(" Message edited successfully");
  } catch (err) {
    console.error(" Edit message error:", err);
    socket.emit("errorMessage", { message: "Failed to edit message" });
  }
});
/// GROUP MESSAGE HANDLER
socket.on("sendGroupMessage", async ({ groupId, text, attachments = [] }) => {
  try {
    console.log(" Sending group message:", { groupId, text, senderId: socket.user.id });

    const group = await Group.findById(groupId).populate("members", "_id username email profileImage");
    if (!group) return socket.emit("errorMessage", { message: "Group not found" });

    if (!group.members.some(m => m._id.toString() === socket.user.id)) {
      return socket.emit("errorMessage", { message: "Not a member of this group" });
    }

    const attachmentIds = attachments?.map(att => att.attachmentId).filter(Boolean) || [];

    const msg = await Message.create({
      groupId,
      sender: socket.user.id,
      text: text || "",
      attachments: attachmentIds,
      isGroupMessage: true,
      status: "sent"
    });

    await msg.populate("sender", "username email profileImage");
    await msg.populate({ path: "attachments", select: "fileName fileType sizeInKilobytes serverFileName duration isVoiceMessage" });

    await Group.findByIdAndUpdate(groupId, {
      lastMessage: text || "📎 Attachment",
      lastMessageTime: Date.now(),
      lastMessageSender: socket.user.id
    });

    const transformedAttachments = msg.attachments?.map(att => ({
      url: `/api/file/get/${att.serverFileName}`,
      filename: att.fileName,
      fileType: att.fileType,
      fileSize: att.sizeInKilobytes * 1024,
      attachmentId: att._id,
      duration: att.duration || 0,
      isVoiceMessage: att.isVoiceMessage || false
    })) || [];

    const messageData = {
      _id: msg._id,
      groupId: msg.groupId,
      sender: {
        _id: msg.sender._id,
        username: msg.sender.username,
        email: msg.sender.email,
        profileImage: msg.sender.profileImage
      },
      text: msg.text,
      attachments: transformedAttachments,
      status: msg.status,
      createdAt: msg.createdAt,
      isGroupMessage: true
    };

  
    //  Emit to all group members with CORRECT event name
console.log(" Broadcasting to", group.members.length, "members");

for (const member of group.members) {
  const memberSockets = [...io.sockets.sockets.values()].filter(s => s.user?.id === member._id.toString());
  
  console.log(` Member ${member.username}:`, memberSockets.length, "sockets");
  
  for (const s of memberSockets) {
    s.emit("receiveGroupMessage", messageData);  
    console.log(" Sent to socket:", s.id);
  }
}

console.log(" Group message broadcast complete");

  } catch (err) {
    console.error(" sendGroupMessage error:", err);
    socket.emit("errorMessage", { message: "Failed to send message" });
  }
});

// GROUP TYPING INDICATOR
socket.on("groupTyping", async ({ groupId, isTyping }) => {
  try {
    const group = await Group.findById(groupId).populate("members", "_id");
    if (!group || !group.members.some(m => m._id.toString() === socket.user.id)) return;

    for (const member of group.members) {
      if (member._id.toString() === socket.user.id) continue;

      const memberSockets = [...io.sockets.sockets.values()].filter(s => s.user?.id === member._id.toString());
      for (const s of memberSockets) {
        s.emit("groupUserTyping", { userId: socket.user.id, groupId, isTyping });
      }
    }
  } catch (err) {
    console.error(" groupTyping error:", err);
  }
});

// DELETE GROUP MESSAGE FOR ME
socket.on("deleteGroupMessageForMe", async ({ messageId, groupId }) => {
  try {
    console.log(" Delete group message for me:", messageId);

    const message = await Message.findById(messageId);
    if (!message || !message.isGroupMessage) {
      socket.emit("errorMessage", { message: "Message not found" });
      return;
    }

    const userId = socket.user.id;

    // Verify user is group member
    const group = await Group.findById(groupId);
    if (!group || !group.members.includes(userId)) {
      socket.emit("errorMessage", { message: "Not authorized" });
      return;
    }

    // Add user to deletedFor array
    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
    }

    // Check if all members deleted it
    const allDeleted = group.members.every(
      m => message.deletedFor.includes(m.toString())
    );

    if (allDeleted) {
      message.isDeleted = true;
      message.deletedAt = new Date();
      await message.save();
      await Message.findByIdAndDelete(messageId);
    } else {
      await message.save();
    }

    // Emit only to this user
    socket.emit("groupMessageDeleted", {
      messageId,
      groupId,
      deletedFor: [userId]
    });

    console.log(" Group message deleted for user");
  } catch (err) {
    console.error(" Delete group message error:", err);
    socket.emit("errorMessage", { message: "Failed to delete message" });
  }
});

// DELETE GROUP MESSAGE FOR EVERYONE
socket.on("deleteGroupMessageForEveryone", async ({ messageId, groupId }) => {
  try {
    console.log(" Delete group message for everyone:", messageId);

    const message = await Message.findById(messageId);
    if (!message || !message.isGroupMessage) {
      socket.emit("errorMessage", { message: "Message not found" });
      return;
    }

    const userId = socket.user.id;

    // Only sender can delete for everyone
    if (message.sender.toString() !== userId) {
      socket.emit("errorMessage", { message: "Only sender can delete for everyone" });
      return;
    }

    // Check 5 minute time limit
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const fiveMinutes = 5 * 60 * 1000;

    if (messageAge > fiveMinutes) {
      socket.emit("errorMessage", { 
        message: "Cannot delete for everyone after 5 minutes" 
      });
      return;
    }

    // Mark as deleted for everyone
    message.deletedForEveryone = true;
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.text = "";
    message.attachments = [];
    await message.save();

    // Get group members
    const group = await Group.findById(groupId).populate("members", "_id");
    
    // Emit to all group members
    for (const member of group.members) {
      const memberSockets = [...io.sockets.sockets.values()].filter(
        s => s.user?.id === member._id.toString()
      );
      for (const s of memberSockets) {
        s.emit("groupMessageDeletedForEveryone", {
          messageId,
          groupId,
          deletedForEveryone: true
        });
      }
    }

    console.log("Group message deleted for everyone");
  } catch (err) {
    console.error(" Delete group message for everyone error:", err);
    socket.emit("errorMessage", { message: "Failed to delete message" });
  }
});



  // View status
  socket.on("viewStatus", async ({ statusId }) => {
    try {
      console.log(" View status:", statusId, "by user:", socket.user.id);

      const Status = (await import("../models/Status.js")).default;
      const status = await Status.findById(statusId);

      if (!status) {
        console.warn(" Status not found");
        return;
      }

      // Check if user can view
      if (!status.canView(socket.user.id)) {
        socket.emit("errorMessage", { message: "Cannot view this status" });
        return;
      }

      // Don't mark own status as viewed
      if (status.userId.toString() === socket.user.id) {
        return;
      }

      // Mark as viewed
      await status.markAsViewed(socket.user.id);

      // Emit to status owner
      const ownerSocket = [...io.sockets.sockets.values()].find(
        (s) => s.user && s.user.id === status.userId.toString()
      );

      if (ownerSocket) {
        ownerSocket.emit("statusViewed", {
          statusId,
          viewer: {
            userId: socket.user.id,
            viewedAt: new Date()
          }
        });
      }

      console.log(" Status marked as viewed");
    } catch (err) {
      console.error(" View status error:", err);
    }
  });

  // Delete status
  socket.on("deleteStatus", async ({ statusId }) => {
    try {
      console.log(" Delete status:", statusId);

      const Status = (await import("../models/Status.js")).default;
      const status = await Status.findById(statusId);

      if (!status) {
        socket.emit("errorMessage", { message: "Status not found" });
        return;
      }

      // Only owner can delete
      if (status.userId.toString() !== socket.user.id) {
        socket.emit("errorMessage", { message: "Unauthorized" });
        return;
      }

      await Status.findByIdAndDelete(statusId);

      // Broadcast to all users
      io.emit("statusDeleted", { statusId });

      console.log(" Status deleted successfully");
    } catch (err) {
      console.error("Delete status error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.user.id}`);
  });
}