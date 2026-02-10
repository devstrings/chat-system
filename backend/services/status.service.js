
import Status from "../models/Status.js";
import User from "../models/user.js";
import Friendship from "../models/Friendship.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CREATE STATUS SERVICE
export const processCreateStatus = async (userId, statusData, file) => {
  const {
    type,
    content,
    caption,
    backgroundColor,
    textColor,
    font,
    privacy,
    hiddenFrom,
    sharedWith,
  } = statusData;

  let statusContent = content;

  if (type === "image" || type === "video") {
    statusContent = `/uploads/status/${file.filename}`;
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const newStatus = new Status({
    userId,
    type,
    content: statusContent,
    caption: caption || "",
    backgroundColor: backgroundColor || "#1E3A8A",
    textColor: textColor || "#FFFFFF",
    font: font || "sans-serif",
    privacy: privacy || "contacts",
    hiddenFrom: hiddenFrom ? JSON.parse(hiddenFrom) : [],
    sharedWith: sharedWith ? JSON.parse(sharedWith) : [],
    expiresAt,
  });

  await newStatus.save();
  await newStatus.populate("userId", "username profileImage");

  return newStatus;
};

// FETCH USER FRIENDSHIPS SERVICE
export const fetchUserFriendships = async (userId) => {
  const friendships = await Friendship.find({
    $or: [{ user1: userId }, { user2: userId }],
  });

  return friendships;
};

// GET FRIEND IDS SERVICE
export const getFriendIds = (friendships, userId) => {
  const friendIds = friendships.map((f) => {
    const user1Id = f.user1.toString();
    const user2Id = f.user2.toString();
    return user1Id === userId ? user2Id : user1Id;
  });

  return friendIds;
};

// BROADCAST STATUS TO FRIENDS SERVICE
export const broadcastStatusToFriends = async (io, userId, status) => {
  try {
    const friendships = await fetchUserFriendships(userId);
    const friendIds = getFriendIds(friendships, userId);

    console.log(" Broadcasting status to", friendIds.length, "friends");

    // Broadcast to friends
    for (const friendId of friendIds) {
      const friendSockets = [...io.sockets.sockets.values()].filter(
        (s) => s.user && s.user.id === friendId,
      );

      for (const socket of friendSockets) {
        socket.emit("newStatus", { status });
      }
    }

    // Send to self (multi-device)
    const userSockets = [...io.sockets.sockets.values()].filter(
      (s) => s.user && s.user.id === userId,
    );

    for (const socket of userSockets) {
      socket.emit("newStatus", { status });
    }

    console.log(" Status broadcast complete");
  } catch (err) {
    console.error(" Broadcast error:", err);
  }
};

// FETCH ALL ACTIVE STATUSES SERVICE
export const fetchActiveStatuses = async (friendIds) => {
  const now = new Date();
  const statuses = await Status.find({
    userId: { $in: friendIds },
    expiresAt: { $gt: now },
  })
    .populate("userId", "username profileImage")
    .populate("viewedBy.userId", "username")
    .sort({ createdAt: -1 });

  return statuses;
};

// FILTER VISIBLE STATUSES SERVICE
export const filterVisibleStatuses = (statuses, userId) => {
  const visibleStatuses = statuses.filter((status) => status.canView(userId));
  return visibleStatuses;
};

// GROUP STATUSES BY USER SERVICE
export const groupStatusesByUser = (statuses) => {
  const groupedStatuses = statuses.reduce((acc, status) => {
    const userIdStr = status.userId._id.toString();
    if (!acc[userIdStr]) {
      acc[userIdStr] = {
        user: status.userId,
        statuses: [],
      };
    }
    acc[userIdStr].statuses.push(status);
    return acc;
  }, {});

  const result = Object.values(groupedStatuses).sort((a, b) => {
    const latestA = Math.max(...a.statuses.map((s) => new Date(s.createdAt)));
    const latestB = Math.max(...b.statuses.map((s) => new Date(s.createdAt)));
    return latestB - latestA;
  });

  return result;
};

// FETCH USER SPECIFIC STATUSES SERVICE
export const fetchUserSpecificStatuses = async (userId) => {
  const now = new Date();
  const statuses = await Status.find({
    userId,
    expiresAt: { $gt: now },
  })
    .populate("userId", "username profileImage")
    .populate("viewedBy.userId", "username")
    .sort({ createdAt: 1 });

  return statuses;
};

// FETCH STATUS BY ID SERVICE
export const fetchStatusById = async (statusId) => {
  const status = await Status.findById(statusId);
  return status;
};

// MARK STATUS AS VIEWED SERVICE
export const processMarkAsViewed = async (statusId, viewerId) => {
  const status = await Status.findById(statusId);
  
  if (status.userId.toString() === viewerId) {
    return {
      isOwnStatus: true,
      message: "Own status, not marking as viewed"
    };
  }

  await status.markAsViewed(viewerId);

  return {
    isOwnStatus: false,
    status,
    viewCount: status.viewedBy.length
  };
};

// BROADCAST STATUS VIEWED SERVICE
export const broadcastStatusViewed = (io, ownerId, statusId, viewerId, viewCount) => {
  const ownerSockets = [...io.sockets.sockets.values()].filter(
    (s) => s.user && s.user.id === ownerId,
  );

  for (const socket of ownerSockets) {
    socket.emit("statusViewed", {
      statusId: statusId,
      viewerId: viewerId,
      viewCount: viewCount,
      viewedAt: new Date(),
    });
  }
};

// DELETE STATUS FILE SERVICE
export const deleteStatusFile = (status) => {
  if (status.type === "image" || status.type === "video") {
    const filePath = path.join(__dirname, "..", status.content);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(" File deleted:", filePath);
    }
  }
};

// DELETE STATUS SERVICE
export const processDeleteStatus = async (statusId, userId) => {
  const status = await Status.findById(statusId);

  if (!status) {
    return null;
  }

  // Delete file
  deleteStatusFile(status);

  // Delete from database
  await Status.findByIdAndDelete(statusId);

  return {
    statusId,
    userId
  };
};

// BROADCAST STATUS DELETED SERVICE
export const broadcastStatusDeleted = (io, statusId, userId) => {
  io.emit("statusDeleted", { statusId, userId });
};

// FETCH STATUS WITH VIEWERS SERVICE
export const fetchStatusWithViewers = async (statusId) => {
  const status = await Status.findById(statusId).populate(
    "viewedBy.userId",
    "username profileImage",
  );

  return status;
};

// FETCH USER BY ID SERVICE
export const fetchUserById = async (userId) => {
  const user = await User.findById(userId);
  return user;
};

// UPDATE USER PRIVACY SETTINGS SERVICE
export const processUpdatePrivacySettings = async (userId, privacyData) => {
  const { defaultPrivacy, mutedStatuses } = privacyData;

  const user = await User.findById(userId);

  if (!user) {
    return null;
  }

  if (defaultPrivacy) {
    user.statusPrivacy = defaultPrivacy;
  }

  if (mutedStatuses !== undefined) {
    user.mutedStatuses = mutedStatuses;
  }

  await user.save();

  return {
    statusPrivacy: user.statusPrivacy,
    mutedStatuses: user.mutedStatuses,
  };
};