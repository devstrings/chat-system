import Message from "#models/Message";
import Conversation from "#models/Conversation";
import Group from "#models/Group";
import Status from "#models/Status";
import {
  MESSAGE_EDIT_LIMIT_MS,
  MESSAGE_DELETE_LIMIT_MS,
  GROUP_MESSAGE_EDIT_LIMIT_MS,
} from "#utils";
export function handleMessage(io, socket) {


  socket.on("userOnline", async () => {
    try {
      const conversations = await Conversation.find({
        participants: socket.user.id,
      });

      for (const conv of conversations) {
        const pendingMessages = await Message.find({
          conversationId: conv._id,
          status: "sent",
        }).populate("sender", "username");

        if (pendingMessages.length > 0) {
          await Message.updateMany(
            {
              conversationId: conv._id,
              status: "sent",
            },
            {
              status: "delivered",
              deliveredAt: new Date(),
            },
          );

          for (const msg of pendingMessages) {
            const senderSocket = [...io.sockets.sockets.values()].find(
              (s) => s.user && s.user.id === msg.sender._id.toString(),
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
      const conversation = await Conversation.findById(conversationId).populate(
        "participants",
        "_id",
      );

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
        },
      );

      if (result.modifiedCount > 0) {
        const readMessages = await Message.find({
          conversationId,
          sender: { $ne: socket.user.id },
          status: "read",
        }).select("_id sender");

        for (const msg of readMessages) {
          const statusUpdate = {
            messageId: msg._id,
            _id: msg._id,
            conversationId,
            status: "read",
          };

          for (const participant of conversation.participants) {
            const targetSocket = [...io.sockets.sockets.values()].find(
              (s) => s.user && s.user.id === participant._id.toString(),
            );

            if (targetSocket) {
              targetSocket.emit("messageStatusUpdate", statusUpdate);
            }
          }
        }

        for (const participant of conversation.participants) {
          const targetSocket = [...io.sockets.sockets.values()].find(
            (s) => s.user && s.user.id === participant._id.toString(),
          );

          if (targetSocket) {
            targetSocket.emit("messagesMarkedRead", {
              conversationId,
              count: result.modifiedCount,
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
      const message =
        await Message.findById(messageId).populate("conversationId");
      if (!message) {
        console.warn(" Message not found");
        return;
      }

      const userId = socket.user.id;

      const isParticipant = message.conversationId.participants.some(
        (p) => p.toString() === userId,
      );

      if (!isParticipant) {
        socket.emit("errorMessage", { message: "Unauthorized" });
        return;
      }

      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
      }

      const allDeleted = message.conversationId.participants.every((p) =>
        message.deletedFor.includes(p.toString()),
      );

      if (allDeleted) {
        message.isDeleted = true;
        message.deletedAt = new Date();
        await message.save();

        await Message.findByIdAndDelete(messageId);
      } else {
        await message.save();
      }

      // Emit delete event
      socket.emit("messageDeleted", {
        messageId,
        conversationId,
        deletedFor: [userId],
        isDeleted: allDeleted,
      });

      // Update conversation's lastMessage if needed
      if (allDeleted) {
        const remainingMessages = await Message.find({
          conversationId: conversationId,
        })
          .sort({ createdAt: -1 })
          .limit(1)
          .populate("sender", "username");

        if (remainingMessages.length > 0) {
          const lastMsg = remainingMessages[0];
          await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: lastMsg.text || "📎 Attachment",
            lastMessageTime: lastMsg.createdAt,
            lastMessageSender: lastMsg.sender._id,
          });
        } else {
          await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: "",
            lastMessageTime: Date.now(),
            lastMessageSender: null,
          });
        }
      }

      //  UPDATE SIDEBAR if this was the last message
      if (allDeleted) {
        const remainingMessages = await Message.find({
          conversationId: conversationId,
        })
          .sort({ createdAt: -1 })
          .limit(1)
          .populate("sender", "username");

        const newLastMessage =
          remainingMessages.length > 0
            ? remainingMessages[0].text || "📎 Attachment"
            : "";

        // Notify current user only
        socket.emit("conversationUpdated", {
          conversationId: conversationId.toString(),
          lastMessage: newLastMessage,
          lastMessageTime:
            remainingMessages.length > 0
              ? remainingMessages[0].createdAt
              : Date.now(),
          updateType: "delete",
        });
      }
    } catch (err) {
      console.error(" Delete for me error:", err);
    }
  });
  // DELETE FOR EVERYONE
  socket.on(
    "deleteMessageForEveryone",
    async ({ messageId, conversationId }) => {
      try {
        const message =
          await Message.findById(messageId).populate("conversationId");
        if (!message) {
          console.warn(" Message not found");
          return;
        }

        const userId = socket.user.id;

        if (message.sender.toString() !== userId) {
          socket.emit("errorMessage", {
            message: "Only sender can delete for everyone",
          });
          return;
        }

        const messageAge = Date.now() - new Date(message.createdAt).getTime();
        // const fiveMinutes = 5 * 60 * 1000;

        if (messageAge > MESSAGE_DELETE_LIMIT_MS) {
          socket.emit("errorMessage", {
            message: "Cannot delete for everyone after 5 minutes",
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
          deletedForEveryone: true,
        };

        // Emit to all participants
        for (const participant of message.conversationId.participants) {
          const targetSocket = [...io.sockets.sockets.values()].find(
            (s) => s.user && s.user.id === participant.toString(),
          );

          if (targetSocket) {
            targetSocket.emit("messageDeletedForEveryone", deleteData);
          }
        }

        // Update conversation's lastMessage
        const remainingMessages = await Message.find({
          conversationId: conversationId,
          deletedForEveryone: { $ne: true },
        })
          .sort({ createdAt: -1 })
          .limit(1)
          .populate("sender", "username");

        if (remainingMessages.length > 0) {
          const lastMsg = remainingMessages[0];
          await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: lastMsg.text || " Attachment",
            lastMessageTime: lastMsg.createdAt,
            lastMessageSender: lastMsg.sender._id,
          });
        } else {
          await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: "",
            lastMessageTime: Date.now(),
            lastMessageSender: null,
          });
        }

        //  Notify all participants about lastMessage change
        for (const participant of message.conversationId.participants) {
          const targetSocket = [...io.sockets.sockets.values()].find(
            (s) => s.user && s.user.id === participant.toString(),
          );

          if (targetSocket) {
            const newLastMessage =
              remainingMessages.length > 0
                ? remainingMessages[0].text || " Attachment"
                : "";

            targetSocket.emit("conversationUpdated", {
              conversationId: conversationId.toString(),
              lastMessage: newLastMessage,
              lastMessageTime:
                remainingMessages.length > 0
                  ? remainingMessages[0].createdAt
                  : Date.now(),
              updateType: "delete",
            });
          }
        }
      } catch (err) {
        console.error("Delete for everyone error:", err);
      }
    },
  );

  // Socket events section mein ye add karo:
  socket.on("editMessage", async ({ messageId, text, conversationId }) => {
    try {
      const message =
        await Message.findById(messageId).populate("conversationId");
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
      // const threeHours = 3 * 60 * 60 * 1000;

      if (messageAge > MESSAGE_EDIT_LIMIT_MS) {
        socket.emit("errorMessage", {
          message: "Cannot edit after 15 minutes",
        });
        return;
      }
      // Save to history
      if (!message.editHistory) {
        message.editHistory = [];
      }
      message.editHistory.push({
        text: message.text,
        editedAt: new Date(),
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
        editedAt: message.editedAt,
      };

      // Emit to all participants
      for (const participant of message.conversationId.participants) {
        const targetSocket = [...io.sockets.sockets.values()].find(
          (s) => s.user && s.user.id === participant.toString(),
        );

        if (targetSocket) {
          targetSocket.emit("messageEdited", editData);
        }
      }
    } catch (err) {
      console.error(" Edit message error:", err);
      socket.emit("errorMessage", { message: "Failed to edit message" });
    }
  });
  /// GROUP MESSAGE HANDLER


  // GROUP TYPING INDICATOR
  socket.on("groupTyping", async ({ groupId, isTyping }) => {
    try {
      const group = await Group.findById(groupId).populate("members", "_id");
      if (
        !group ||
        !group.members.some((m) => m._id.toString() === socket.user.id)
      )
        return;

      for (const member of group.members) {
        if (member._id.toString() === socket.user.id) continue;

        const memberSockets = [...io.sockets.sockets.values()].filter(
          (s) => s.user?.id === member._id.toString(),
        );
        for (const s of memberSockets) {
          s.emit("groupUserTyping", {
            userId: socket.user.id,
            groupId,
            isTyping,
          });
        }
      }
    } catch (err) {
      console.error(" groupTyping error:", err);
    }
  });

  // DELETE GROUP MESSAGE FOR ME
  socket.on("deleteGroupMessageForMe", async ({ messageId, groupId }) => {
    try {
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
      const allDeleted = group.members.every((m) =>
        message.deletedFor.includes(m.toString()),
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
        deletedFor: [userId],
      });
    } catch (err) {
      console.error(" Delete group message error:", err);
      socket.emit("errorMessage", { message: "Failed to delete message" });
    }
  });

  // DELETE GROUP MESSAGE FOR EVERYONE
  socket.on("deleteGroupMessageForEveryone", async ({ messageId, groupId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message || !message.isGroupMessage) {
        socket.emit("errorMessage", { message: "Message not found" });
        return;
      }

      const userId = socket.user.id;

      // Only sender can delete for everyone
      if (message.sender.toString() !== userId) {
        socket.emit("errorMessage", {
          message: "Only sender can delete for everyone",
        });
        return;
      }

      // Check 5 minute time limit
      const messageAge = Date.now() - new Date(message.createdAt).getTime();
      // const fiveMinutes = 5 * 60 * 1000;
      if (messageAge > MESSAGE_DELETE_LIMIT_MS) {
        socket.emit("errorMessage", {
          message: "Cannot delete for everyone after 5 minutes",
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
          (s) => s.user?.id === member._id.toString(),
        );
        for (const s of memberSockets) {
          s.emit("groupMessageDeletedForEveryone", {
            messageId,
            groupId,
            deletedForEveryone: true,
          });
        }
      }
    } catch (err) {
      console.error(" Delete group message for everyone error:", err);
      socket.emit("errorMessage", { message: "Failed to delete message" });
    }
  });

  // View status
  socket.on("viewStatus", async ({ statusId }) => {
    try {
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
        (s) => s.user && s.user.id === status.userId.toString(),
      );

      if (ownerSocket) {
        ownerSocket.emit("statusViewed", {
          statusId,
          viewer: {
            userId: socket.user.id,
            viewedAt: new Date(),
          },
        });
      }
    } catch (err) {
      console.error(" View status error:", err);
    }
  });

  // Delete status
  socket.on("deleteStatus", async ({ statusId }) => {
    try {
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
    } catch (err) {
      console.error("Delete status error:", err);
    }
  });
  //  EDIT GROUP MESSAGE
  socket.on("editGroupMessage", async ({ messageId, text, groupId }) => {
    try {
      console.log(" Edit group message request:", {
        messageId,
        groupId,
        userId: socket.user.id,
      });

      const message = await Message.findById(messageId);
      if (!message || !message.isGroupMessage) {
        socket.emit("errorMessage", { message: "Group message not found" });
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
      // const threeHours = 3 * 60 * 60 * 1000;

      if (messageAge > GROUP_MESSAGE_EDIT_LIMIT_MS) {
        socket.emit("errorMessage", {
          message: "Cannot edit after 15 minutes",
        });
        return;
      }

      // Verify user is group member
      const group = await Group.findById(groupId).populate("members", "_id");
      if (!group || !group.members.some((m) => m._id.toString() === userId)) {
        socket.emit("errorMessage", { message: "Not authorized" });
        return;
      }

      // Save to edit history
      if (!message.editHistory) {
        message.editHistory = [];
      }
      message.editHistory.push({
        text: message.text,
        editedAt: new Date(),
      });

      // Update message
      message.text = text;
      message.isEdited = true;
      message.editedAt = new Date();
      await message.save();

      const editData = {
        messageId,
        groupId,
        text,
        isEdited: true,
        editedAt: message.editedAt,
      };

      // Emit to all group members
      for (const member of group.members) {
        const memberSockets = [...io.sockets.sockets.values()].filter(
          (s) => s.user?.id === member._id.toString(),
        );

        for (const s of memberSockets) {
          s.emit("groupMessageEdited", editData);
        }
      }
    } catch (err) {
      console.error(" Edit group message error:", err);
      socket.emit("errorMessage", { message: "Failed to edit message" });
    }
  });
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.user.id}`);
  });
}
