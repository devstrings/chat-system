import { statusService } from "#services";
import Friendship from "#models/Friendship";
import asyncHandler from "express-async-handler";

// CREATE STATUS CONTROLLER
export const createStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const newStatus = await statusService.processCreateStatus(userId, req.body, req.file);
  const io = req.app.get("io");
  if (io) {
    await statusService.broadcastStatusToFriends(io, userId, newStatus);
  }
  res.status(201).json({ message: "Status created successfully", status: newStatus });
});

// GET STATUSES CONTROLLER
export const getStatuses = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const friendships = await statusService.fetchUserFriendships(userId);
  const friendIds = statusService.getFriendIds(friendships, userId);
  friendIds.push(userId);
  const statuses = await statusService.fetchActiveStatuses(friendIds);
  const visibleStatuses = statusService.filterVisibleStatuses(statuses, userId);
  const result = statusService.groupStatusesByUser(visibleStatuses);
  res.json(result);
});

// GET USER STATUSES CONTROLLER
export const getUserStatuses = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const viewerId = req.user.id;
  const statuses = await statusService.fetchUserSpecificStatuses(userId);
  const visibleStatuses = statusService.filterVisibleStatuses(statuses, viewerId);
  res.json(visibleStatuses);
});
// MARK AS VIEWED CONTROLLER
export const markAsViewed = asyncHandler(async (req, res) => {
  const { statusId } = req.params;
  const viewerId = req.user.id;
  const status = req.validatedStatus;
  const result = await statusService.processMarkAsViewed(statusId, viewerId);
  if (result.isOwnStatus) {
    return res.json({ message: result.message });
  }
  const io = req.app.get("io");
  if (io) {
    statusService.broadcastStatusViewed(io, result.status.userId.toString(), result.status._id, viewerId, result.viewCount);
  }
  res.json({ message: "Status marked as viewed" });
});

// DELETE STATUS CONTROLLER

export const deleteStatus = asyncHandler(async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.id;
  const result = await statusService.processDeleteStatus(statusId, userId);

  if (!result) {
    return res.status(404).json({ message: "Status not found" });
  }

  const io = req.app.get("io");
  if (io) {
    statusService.broadcastStatusDeleted(io, result.statusId, result.userId);
  }
  res.json({ message: "Status deleted successfully" });
});

// GET STATUS VIEWERS CONTROLLER
export const getStatusViewers = asyncHandler(async (req, res) => {
  const { statusId } = req.params;
  const status = await statusService.fetchStatusWithViewers(statusId);
  res.json({ totalViews: status.viewedBy.length, viewers: status.viewedBy });
});

// UPDATE STATUS PRIVACY CONTROLLER
export const updateStatusPrivacy = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await statusService.processUpdatePrivacySettings(userId, req.body);
  if (!result) return res.status(404).json({ message: "User not found" });
  res.json({ message: "Privacy settings updated", statusPrivacy: result.statusPrivacy, mutedStatuses: result.mutedStatuses });
});

// TEMP - CREATE FRIENDSHIP FOR TESTING
export const createFriendshipTest = asyncHandler(async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = req.user.id;

    const existing = await Friendship.findOne({
      $or: [
        { user1: userId, user2: friendId },
        { user1: friendId, user2: userId },
      ],
    });

    if (existing) {
      return res.json({
        message: "Friendship already exists",
        friendship: existing,
      });
    }

    const friendship = new Friendship({ user1: userId, user2: friendId });
    await friendship.save();
    res.json({ message: "Friendship created!", friendship });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});