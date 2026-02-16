import * as statusService from "../services/status.service.js";

// CREATE STATUS CONTROLLER
export const createStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    // Service call
    const newStatus = await statusService.processCreateStatus(userId, req.body, req.file);

    // Socket broadcast
    const io = req.app.get("io");
    if (io) {
      await statusService.broadcastStatusToFriends(io, userId, newStatus);
    }

    res.status(201).json({
      message: "Status created successfully",
      status: newStatus,
    });
  } catch (err) {
    console.error(" Create status error:", err);
    res.status(500).json({ message: "Failed to create status" });
  }
};

// GET STATUSES CONTROLLER
export const getStatuses = async (req, res) => {
  try {
    const userId = req.user.id;

    // Service calls
    const friendships = await statusService.fetchUserFriendships(userId);
    const friendIds = statusService.getFriendIds(friendships, userId);
    friendIds.push(userId); // Include self

    const statuses = await statusService.fetchActiveStatuses(friendIds);
    const visibleStatuses = statusService.filterVisibleStatuses(statuses, userId);
    const result = statusService.groupStatusesByUser(visibleStatuses);

    res.json(result);
  } catch (err) {
    console.error(" Get statuses error:", err);
    res.status(500).json({ message: "Failed to fetch statuses" });
  }
};

// GET USER STATUSES CONTROLLER
export const getUserStatuses = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user.id;

    // Service call
    const statuses = await statusService.fetchUserSpecificStatuses(userId);
    const visibleStatuses = statusService.filterVisibleStatuses(statuses, viewerId);

    res.json(visibleStatuses);
  } catch (err) {
    console.error("Get user statuses error:", err);
    res.status(500).json({ message: "Failed to fetch user statuses" });
  }
};

// MARK AS VIEWED CONTROLLER
export const markAsViewed = async (req, res) => {
  try {
    const { statusId } = req.params;
    const viewerId = req.user.id;

    const status = req.validatedStatus; 

    // Service call
    const result = await statusService.processMarkAsViewed(statusId, viewerId);

    if (result.isOwnStatus) {
      return res.json({ message: result.message });
    }

    // Socket emit
    const io = req.app.get("io");
    if (io) {
      statusService.broadcastStatusViewed(
        io,
        result.status.userId.toString(),
        result.status._id,
        viewerId,
        result.viewCount
      );
    }

    res.json({ message: "Status marked as viewed" });
  } catch (err) {
    console.error(" Mark viewed error:", err);
    res.status(500).json({ message: "Failed to mark status as viewed" });
  }
};

// DELETE STATUS CONTROLLER
export const deleteStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user.id;

    // Service call
    const result = await statusService.processDeleteStatus(statusId, userId);

    // Socket broadcast
    const io = req.app.get("io");
    if (io) {
      statusService.broadcastStatusDeleted(io, result.statusId, result.userId);
    }

    res.json({ message: "Status deleted successfully" });
  } catch (err) {
    console.error(" Delete status error:", err);
    res.status(500).json({ message: "Failed to delete status" });
  }
};

// GET STATUS VIEWERS CONTROLLER
export const getStatusViewers = async (req, res) => {
  try {
    const { statusId } = req.params;

    // Service call
    const status = await statusService.fetchStatusWithViewers(statusId);

    res.json({
      totalViews: status.viewedBy.length,
      viewers: status.viewedBy,
    });
  } catch (err) {
    console.error(" Get viewers error:", err);
    res.status(500).json({ message: "Failed to fetch viewers" });
  }
};

// UPDATE STATUS PRIVACY CONTROLLER
export const updateStatusPrivacy = async (req, res) => {
  try {
    const userId = req.user.id;

    // Service call
    const result = await statusService.processUpdatePrivacySettings(userId, req.body);

    if (!result) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Privacy settings updated",
      statusPrivacy: result.statusPrivacy,
      mutedStatuses: result.mutedStatuses,
    });
  } catch (err) {
    console.error(" Update privacy error:", err);
    res.status(500).json({ message: "Failed to update privacy settings" });
  }
};