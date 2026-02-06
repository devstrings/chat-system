
import * as statusService from "../services/status.service.js";
import * as statusValidation from "../validations/status.validation.js";

// CREATE STATUS CONTROLLER
export const createStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.body;

    // Validation
    const typeValidation = statusValidation.validateStatusType(type);
    if (!typeValidation.isValid) {
      return res.status(typeValidation.statusCode).json({ message: typeValidation.message });
    }

    const fileValidation = statusValidation.validateFileRequired(req.file, type);
    if (!fileValidation.isValid) {
      return res.status(fileValidation.statusCode).json({ message: fileValidation.message });
    }

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
    console.error("❌ Create status error:", err);
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
    console.error("❌ Get statuses error:", err);
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
    console.error("❌ Get user statuses error:", err);
    res.status(500).json({ message: "Failed to fetch user statuses" });
  }
};

// MARK AS VIEWED CONTROLLER
export const markAsViewed = async (req, res) => {
  try {
    const { statusId } = req.params;
    const viewerId = req.user.id;

    // Fetch status
    const status = await statusService.fetchStatusById(statusId);

    // Validation
    const statusValidationResult = statusValidation.validateStatusExists(status);
    if (!statusValidationResult.isValid) {
      return res.status(statusValidationResult.statusCode).json({ message: statusValidationResult.message });
    }

    const canViewValidation = statusValidation.validateCanViewStatus(status, viewerId);
    if (!canViewValidation.isValid) {
      return res.status(canViewValidation.statusCode).json({ message: canViewValidation.message });
    }

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
    console.error("❌ Mark viewed error:", err);
    res.status(500).json({ message: "Failed to mark status as viewed" });
  }
};

// DELETE STATUS CONTROLLER
export const deleteStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user.id;

    // Fetch status
    const status = await statusService.fetchStatusById(statusId);

    // Validation
    const statusValidationResult = statusValidation.validateStatusExists(status);
    if (!statusValidationResult.isValid) {
      return res.status(statusValidationResult.statusCode).json({ message: statusValidationResult.message });
    }

    const ownershipValidation = statusValidation.validateStatusOwnership(status, userId);
    if (!ownershipValidation.isValid) {
      return res.status(ownershipValidation.statusCode).json({ message: ownershipValidation.message });
    }

    // Service call
    const result = await statusService.processDeleteStatus(statusId, userId);

    // Socket broadcast
    const io = req.app.get("io");
    if (io) {
      statusService.broadcastStatusDeleted(io, result.statusId, result.userId);
    }

    res.json({ message: "Status deleted successfully" });
  } catch (err) {
    console.error("❌ Delete status error:", err);
    res.status(500).json({ message: "Failed to delete status" });
  }
};

// GET STATUS VIEWERS CONTROLLER
export const getStatusViewers = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user.id;

    // Service call
    const status = await statusService.fetchStatusWithViewers(statusId);

    // Validation
    const statusValidationResult = statusValidation.validateStatusExists(status);
    if (!statusValidationResult.isValid) {
      return res.status(statusValidationResult.statusCode).json({ message: statusValidationResult.message });
    }

    const ownershipValidation = statusValidation.validateStatusOwnership(status, userId);
    if (!ownershipValidation.isValid) {
      return res.status(ownershipValidation.statusCode).json({ message: ownershipValidation.message });
    }

    res.json({
      totalViews: status.viewedBy.length,
      viewers: status.viewedBy,
    });
  } catch (err) {
    console.error("❌ Get viewers error:", err);
    res.status(500).json({ message: "Failed to fetch viewers" });
  }
};

// UPDATE STATUS PRIVACY CONTROLLER
export const updateStatusPrivacy = async (req, res) => {
  try {
    const userId = req.user.id;

    // Service call
    const result = await statusService.processUpdatePrivacySettings(userId, req.body);

    // Validation
    const userValidation = statusValidation.validateUserExists(result);
    if (!userValidation.isValid) {
      return res.status(userValidation.statusCode).json({ message: userValidation.message });
    }

    res.json({
      message: "Privacy settings updated",
      statusPrivacy: result.statusPrivacy,
      mutedStatuses: result.mutedStatuses,
    });
  } catch (err) {
    console.error("❌ Update privacy error:", err);
    res.status(500).json({ message: "Failed to update privacy settings" });
  }
};