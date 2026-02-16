import Friendship from "../../models/Friendship.js";
import Conversation from "../../models/Conversation.js";
import Group from "../../models/Group.js";
import FriendRequest from "../../models/FriendRequest.js";
import BlockedUser from "../../models/BlockedUser.js";
import User from "../../models/User.js";
import Message from "../../models/Message.js";
import Status from "../../models/Status.js";

// HELPER FUNCTIONS

const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({ message });
};

// AUTH VALIDATIONS

export const validateUserExists = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return sendError(res, 404, "User not found");
    }
    
    req.validatedUser = user;
    next();
  } catch (err) {
    return sendError(res, 500, "Validation error");
  }
};

// FRIENDSHIP VALIDATIONS

export const validateFriendship = async (req, res, next) => {
  try {
    // CHECK if req.user exists
    if (!req.user || !req.user.id) {
      console.error(" req.user not set in validateFriendship");
      return sendError(res, 401, "Unauthorized");
    }

    const currentUserId = req.user.id;
    const { otherUserId, skipCreate } = req.body;

    console.log(" Validating friendship:", {
      currentUserId,
      otherUserId,
      skipCreate
    });

    if (!otherUserId) {
      return sendError(res, 400, "Other user ID is required");
    }

    // Skip friendship check if skipCreate is true
    if (skipCreate === true) {
      console.log("⏭ Skipping friendship validation (skipCreate=true)");
      return next();
    }

    //  Add status check in query
    const friendship = await Friendship.findOne({
      $or: [
        { user1: currentUserId, user2: otherUserId },
        { user1: otherUserId, user2: currentUserId }
      ],
      status: 'accepted' 
    });

    console.log(" Friendship found:", !!friendship, "Status:", friendship?.status || 'not found');

    if (!friendship) {
      console.log(" Not friends or friendship not accepted");
      return sendError(res, 403, "Not friends");
    }

    req.validatedFriendship = friendship;
    next();
  } catch (err) {
    console.error(" Friendship validation error:", err);
    return sendError(res, 500, "Validation error");
  }
};

export const validateNotBlocked = async (req, res, next) => {
  try {
    //  CHECK if req.user exists
    if (!req.user || !req.user.id) {
      console.error(" req.user not set in validateNotBlocked");
      return sendError(res, 401, "Unauthorized");
    }

    const currentUserId = req.user.id;
    const targetUserId = req.body.otherUserId || req.body.receiverId || req.body.userId || req.params.userId;

    console.log(" Checking block status:", {
      currentUserId,
      targetUserId
    });

    //  Skip if no target user
    if (!targetUserId) {
      console.log("⏭ No target user ID - skipping block check");
      return next();
    }

    const isBlocked = await BlockedUser.findOne({
      $or: [
        { blocker: currentUserId, blocked: targetUserId },
        { blocker: targetUserId, blocked: currentUserId }
      ]
    });

    if (isBlocked) {
      console.log(" Users are blocked");
      return sendError(res, 403, "Cannot perform this action - users are blocked");
    }

    console.log(" Not blocked");
    next();
  } catch (err) {
    console.error(" Block validation error:", err);
    return sendError(res, 500, "Validation error");
  }
};

export const validateFriendRequest = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { requestId } = req.params;

    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return sendError(res, 404, "Request not found");
    }

    if (friendRequest.receiver.toString() !== currentUserId) {
      return sendError(res, 403, "Unauthorized");
    }

    if (friendRequest.status !== "pending") {
      return sendError(res, 400, "Request already processed");
    }

    req.validatedFriendRequest = friendRequest;
    next();
  } catch (err) {
    return sendError(res, 500, "Validation error");
  }
};

export const validateFriendRequestForReject = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { requestId } = req.params;

    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return sendError(res, 404, "Request not found");
    }

    if (friendRequest.receiver.toString() !== currentUserId) {
      return sendError(res, 403, "Unauthorized");
    }

    req.validatedFriendRequest = friendRequest;
    next();
  } catch (err) {
    return sendError(res, 500, "Validation error");
  }
};

export const validateNotSelf = (req, res, next) => {
  const currentUserId = req.user.id;
  const targetUserId = req.body.receiverId || req.body.userId || req.params.userId;

  if (currentUserId === targetUserId) {
    return sendError(res, 400, "Cannot perform this action on yourself");
  }

  next();
};

// CONVERSATION VALIDATIONS

export const validateConversationExists = async (req, res, next) => {
  try {
    const { conversationId } = req.params || req.body;

    if (!conversationId) {
      return sendError(res, 400, "Conversation ID is required");
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return sendError(res, 404, "Conversation not found");
    }

    req.validatedConversation = conversation;
    next();
  } catch (err) {
    return sendError(res, 500, "Validation error");
  }
};

export const validateConversationParticipant = async (req, res, next) => {
  try {
    //  CHECK if req.user exists
    if (!req.user || !req.user.id) {
      console.error(" req.user not set in validateConversationParticipant");
      console.error("Request headers:", req.headers);
      return sendError(res, 401, "Unauthorized - No user");
    }

    const currentUserId = req.user.id;
    const conversation = req.validatedConversation;

    console.log(" [VALIDATE PARTICIPANT] Input:", {
      currentUserId,
      conversationId: conversation._id,
      participants: conversation.participants.map(p => p.toString()),
      deletedBy: conversation.deletedBy?.map(d => ({
        userId: d.userId?.toString(),
        deletedAt: d.deletedAt
      }))
    });

    //  Check if conversation was deleted by user
    if (conversation.deletedBy?.some(d => d.userId?.toString() === currentUserId.toString())) {
      console.log(" [VALIDATE PARTICIPANT] Conversation deleted by user");
      return sendError(res, 404, "Conversation not found");
    }

    //  Check participant with proper string conversion
    const participantsAsStrings = conversation.participants.map(p => p.toString());
    const userIdAsString = currentUserId.toString();
    
    console.log(" [VALIDATE PARTICIPANT] Comparison:", {
      userIdAsString,
      participantsAsStrings,
      includes: participantsAsStrings.includes(userIdAsString)
    });

    const isParticipant = participantsAsStrings.includes(userIdAsString);

    if (!isParticipant) {
      console.error(" [VALIDATE PARTICIPANT] User is NOT a participant");
      console.error("Current user:", userIdAsString);
      console.error("Participants:", participantsAsStrings);
      return sendError(res, 403, "Not authorized to access this conversation");
    }

    console.log(" [VALIDATE PARTICIPANT] Validation passed");
    next();
  } catch (err) {
    console.error(" [VALIDATE PARTICIPANT] Error:", err);
    return sendError(res, 500, "Validation error");
  }
};

export const validateMessageContent = (req, res, next) => {
  const { text, attachments } = req.body;

  if (!text && (!attachments || attachments.length === 0)) {
    return sendError(res, 400, "Message must contain text or attachments");
  }

  next();
};

export const validateConversationPinLimit = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const conversation = req.validatedConversation;

    const isAlreadyPinned = conversation.pinnedBy && conversation.pinnedBy.some(
      pin => pin.userId.toString() === userId
    );

    if (isAlreadyPinned) {
      return sendError(res, 400, "Conversation already pinned");
    }

    const userPinnedCount = await Conversation.countDocuments({
      "pinnedBy.userId": userId
    });

    if (userPinnedCount >= 3) {
      return sendError(res, 400, "Maximum 3 conversations can be pinned");
    }

    next();
  } catch (err) {
    return sendError(res, 500, "Validation error");
  }
};

export const validateConversationArchive = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const conversation = req.validatedConversation;

    const isAlreadyArchived = conversation.archivedBy && conversation.archivedBy.some(
      archive => archive.userId.toString() === userId
    );

    if (isAlreadyArchived) {
      return sendError(res, 400, "Conversation already archived");
    }

    next();
  } catch (err) {
    return sendError(res, 500, "Validation error");
  }
};

// MESSAGE VALIDATIONS

export const validateMessageExists = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId).populate("conversationId");

    if (!message) {
      return sendError(res, 404, "Message not found");
    }

    req.validatedMessage = message;
    next();
  } catch (err) {
    return sendError(res, 500, "Validation error");
  }
};

export const validateMessageSender = (req, res, next) => {
  const currentUserId = req.user.id;
  const message = req.validatedMessage;

  if (message.sender.toString() !== currentUserId) {
    return sendError(res, 403, "Can only edit/delete your own messages");
  }

  next();
};

export const validateMessageEditTime = (req, res, next) => {
  const message = req.validatedMessage;
  const messageAge = Date.now() - new Date(message.createdAt).getTime();

  if (messageAge > 15 * 60 * 1000) { // 15 minutes
    return sendError(res, 400, "Cannot edit message after 15 minutes");
  }

  next();
};

export const validateMessageDeleteTime = (req, res, next) => {
  const message = req.validatedMessage;
  const messageAge = Date.now() - new Date(message.createdAt).getTime();

  if (messageAge > 5 * 60 * 1000) { // 5 minutes
    return sendError(res, 400, "Cannot delete for everyone after 5 minutes");
  }

  next();
};

export const validateMessageParticipant = (req, res, next) => {
  const currentUserId = req.user.id;
  const message = req.validatedMessage;

  if (!message.conversationId) {
    return sendError(res, 404, "Conversation not found");
  }

  const isParticipant = message.conversationId.participants.some(
    p => p.toString() === currentUserId
  );

  if (!isParticipant) {
    return sendError(res, 403, "Unauthorized");
  }

  next();
};

export const validateBulkMessageIds = (req, res, next) => {
  const { messageIds } = req.body;

  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    return sendError(res, 400, "Message IDs array is required");
  }

  next();
};

// GROUP VALIDATIONS

export const validateGroupExists = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);

    if (!group) {
      return sendError(res, 404, "Group not found");
    }

    req.validatedGroup = group;
    next();
  } catch (err) {
    return sendError(res, 500, "Validation error");
  }
};

export const validateGroupMember = (req, res, next) => {
  const currentUserId = req.user.id;
  const group = req.validatedGroup;

  const isMember = group.members.some(m =>
    m._id ? m._id.toString() === currentUserId : m.toString() === currentUserId
  );

  if (!isMember) {
    return sendError(res, 403, "Not a member");
  }

  next();
};

export const validateGroupAdmin = (req, res, next) => {
  const currentUserId = req.user.id;
  const group = req.validatedGroup;

  const isAdmin = group.admins.some(a => a.toString() === currentUserId);

  if (!isAdmin) {
    return sendError(res, 403, "Only admins can perform this action");
  }

  next();
};

export const validateGroupCreator = (req, res, next) => {
  const currentUserId = req.user.id;
  const group = req.validatedGroup;

  if (group.creator.toString() !== currentUserId) {
    return sendError(res, 403, "Only creator can perform this action");
  }

  next();
};

export const validateNotGroupCreator = (req, res, next) => {
  const { memberId } = req.params;
  const group = req.validatedGroup;

  if (group.creator.toString() === memberId) {
    return sendError(res, 400, "Cannot perform this action on group creator");
  }

  next();
};

export const validateGroupPinLimit = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const group = req.validatedGroup;

    const isAlreadyPinned = group.pinnedBy && group.pinnedBy.some(
      pin => pin.userId.toString() === userId
    );

    if (isAlreadyPinned) {
      return sendError(res, 400, "Group already pinned");
    }

    const userPinnedCount = await Group.countDocuments({
      "pinnedBy.userId": userId
    });

    if (userPinnedCount >= 3) {
      return sendError(res, 400, "Maximum 3 groups can be pinned");
    }

    next();
  } catch (err) {
    return sendError(res, 500, "Validation error");
  }
};

export const validateGroupArchive = (req, res, next) => {
  const userId = req.user.id;
  const group = req.validatedGroup;

  const isAlreadyArchived = group.archivedBy && group.archivedBy.some(
    archive => archive.userId.toString() === userId
  );

  if (isAlreadyArchived) {
    return sendError(res, 400, "Group already archived");
  }

  next();
};

export const validateMemberIsInGroup = (req, res, next) => {
  const { memberId } = req.params;
  const group = req.validatedGroup;

  const isMember = group.members.some(m =>
    m._id ? m._id.toString() === memberId : m.toString() === memberId
  );

  if (!isMember) {
    return sendError(res, 404, "Member not found in group");
  }

  next();
};

export const validateMemberIsAdmin = (req, res, next) => {
  const { memberId } = req.params;
  const group = req.validatedGroup;

  const isMember = group.members.some(m =>
    m._id ? m._id.toString() === memberId : m.toString() === memberId
  );

  if (!isMember) {
    return sendError(res, 404, "Member not found in group");
  }

  const isAdmin = group.admins.some(a => a.toString() === memberId);

  if (!isAdmin) {
    return sendError(res, 400, "User is not an admin");
  }

  next();
};

export const validateMemberIsNotAdmin = (req, res, next) => {
  const { memberId } = req.params;
  const group = req.validatedGroup;

  const isAlreadyAdmin = group.admins.some(a => a.toString() === memberId);

  if (isAlreadyAdmin) {
    return sendError(res, 400, "User is already an admin");
  }

  next();
};

export const validateGroupMessageSender = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return sendError(res, 404, "Message not found");
    }

    if (!message.isGroupMessage || !message.groupId) {
      return sendError(res, 400, "Not a group message");
    }

    if (message.sender.toString() !== userId) {
      return sendError(res, 403, "Can only edit your own messages");
    }

    req.validatedMessage = message;
    next();
  } catch (err) {
    return sendError(res, 500, "Validation error");
  }
};

export const validateGroupMessageText = (req, res, next) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return sendError(res, 400, "Message text is required");
  }

  next();
};

// FILE VALIDATIONS

export const validateFileUploaded = (req, res, next) => {
  if (!req.file) {
    return sendError(res, 400, "No file uploaded");
  }

  next();
};

export const validateFilename = (req, res, next) => {
  const { filename } = req.params;

  if (!filename || typeof filename !== 'string') {
    return sendError(res, 400, "Invalid filename");
  }

  next();
};

// STATUS VALIDATIONS

export const validateStatusExists = async (req, res, next) => {
  try {
    const { statusId } = req.params;

    const status = await Status.findById(statusId);

    if (!status) {
      return sendError(res, 404, "Status not found");
    }

    req.validatedStatus = status;
    next();
  } catch (err) {
    return sendError(res, 500, "Validation error");
  }
};

export const validateStatusOwner = (req, res, next) => {
  const userId = req.user.id;
  const status = req.validatedStatus;

  if (status.userId.toString() !== userId) {
    return sendError(res, 403, "Unauthorized");
  }

  next();
};

export const validateStatusViewPermission = (req, res, next) => {
  const viewerId = req.user.id;
  const status = req.validatedStatus;

  if (!status.canView || !status.canView(viewerId)) {
    return sendError(res, 403, "Cannot view this status");
  }

  next();
};

// USER VALIDATIONS

export const validateSearchQuery = (req, res, next) => {
  const searchQuery = req.query.q || req.query.query;

  if (!searchQuery || searchQuery.trim().length === 0) {
    return res.json([]);
  }

  next();
};

export const validateUserNotBlocked = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { id } = req.params;

    const isBlocked = await BlockedUser.findOne({
      $or: [
        { blocker: currentUserId, blocked: id },
        { blocker: id, blocked: currentUserId }
      ]
    });

    if (isBlocked) {
      return sendError(res, 403, "User not accessible");
    }

    next();
  } catch (err) {
    return sendError(res, 500, "Validation error");
  }
};

export const validateProfileImageUrl = (req, res, next) => {
  const { profileImage } = req.body;

  if (!profileImage) {
    return sendError(res, 400, "Profile image URL is required");
  }

  next();
};
