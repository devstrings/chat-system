import Status from "../models/Status.js";
import User from "../models/user.js";
import Friendship from "../models/Friendship.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//  Create new status (NO LIMIT - Multiple statuses allowed)
export const createStatus = async (req, res) => {
  try {
    const userId = req.user.id;
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
    } = req.body;

    if (!["image", "video", "text"].includes(type)) {
      return res.status(400).json({ message: "Invalid status type" });
    }

    let statusContent = content;

    if (type === "image" || type === "video") {
      if (!req.file) {
        return res.status(400).json({ message: "File is required" });
      }
      statusContent = `/uploads/status/${req.file.filename}`;
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    //  NO CHECK FOR EXISTING STATUS - Allow multiple
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

    // Socket broadcast to friends
    const io = req.app.get("io");
    if (io) {
      try {
        const friendships = await Friendship.find({
          $or: [{ user1: userId }, { user2: userId }],
        });

        const friendIds = friendships.map((f) => {
          const user1Id = f.user1.toString();
          const user2Id = f.user2.toString();
          return user1Id === userId ? user2Id : user1Id;
        });

        console.log(" Broadcasting status to", friendIds.length, "friends");

        for (const friendId of friendIds) {
          const friendSockets = [...io.sockets.sockets.values()].filter(
            (s) => s.user && s.user.id === friendId,
          );

          for (const socket of friendSockets) {
            socket.emit("newStatus", { status: newStatus });
          }
        }

        // Send to self (multi-device)
        const userSockets = [...io.sockets.sockets.values()].filter(
          (s) => s.user && s.user.id === userId,
        );

        for (const socket of userSockets) {
          socket.emit("newStatus", { status: newStatus });
        }

        console.log(" Status broadcast complete");
      } catch (err) {
        console.error(" Broadcast error:", err);
      }
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

//  Get all active statuses from friends
export const getStatuses = async (req, res) => {
  try {
    const userId = req.user.id;

    const friendships = await Friendship.find({
      $or: [{ user1: userId }, { user2: userId }],
    });

    const friendIds = friendships.map((f) => {
      const user1Id = f.user1.toString();
      const user2Id = f.user2.toString();
      return user1Id === userId ? user2Id : user1Id;
    });

    friendIds.push(userId); // Include self

    const now = new Date();
    const statuses = await Status.find({
      userId: { $in: friendIds },
      expiresAt: { $gt: now },
    })
      .populate("userId", "username profileImage")
      .populate("viewedBy.userId", "username")
      .sort({ createdAt: -1 });

    const visibleStatuses = statuses.filter((status) => status.canView(userId));

    //  Group by user - SUPPORT MULTIPLE STATUSES
    const groupedStatuses = visibleStatuses.reduce((acc, status) => {
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

    res.json(result);
  } catch (err) {
    console.error("Get statuses error:", err);
    res.status(500).json({ message: "Failed to fetch statuses" });
  }
};

// Get specific user's statuses (ALL OF THEM)
export const getUserStatuses = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user.id;

    const now = new Date();
    const statuses = await Status.find({
      userId,
      expiresAt: { $gt: now },
    })
      .populate("userId", "username profileImage")
      .populate("viewedBy.userId", "username")
      .sort({ createdAt: 1 });

    const visibleStatuses = statuses.filter((status) =>
      status.canView(viewerId),
    );

    res.json(visibleStatuses);
  } catch (err) {
    console.error(" Get user statuses error:", err);
    res.status(500).json({ message: "Failed to fetch user statuses" });
  }
};

//  Mark status as viewed
export const markAsViewed = async (req, res) => {
  try {
    const { statusId } = req.params;
    const viewerId = req.user.id;

    const status = await Status.findById(statusId);

    if (!status) {
      return res.status(404).json({ message: "Status not found" });
    }

    if (!status.canView(viewerId)) {
      return res.status(403).json({ message: "Cannot view this status" });
    }

    if (status.userId.toString() === viewerId) {
      return res.json({ message: "Own status, not marking as viewed" });
    }

    await status.markAsViewed(viewerId);

    //  Socket emit
    const io = req.app.get("io");
    if (io) {
      const ownerSockets = [...io.sockets.sockets.values()].filter(
        (s) => s.user && s.user.id === status.userId.toString(),
      );

      for (const socket of ownerSockets) {
        socket.emit("statusViewed", {
          statusId: status._id,
          viewerId: viewerId,
          viewCount: status.viewedBy.length,
          viewedAt: new Date(),
        });
      }
    }

    res.json({ message: "Status marked as viewed" });
  } catch (err) {
    console.error(" Mark viewed error:", err);
    res.status(500).json({ message: "Failed to mark status as viewed" });
  }
};

// Delete status (Individual status delete)
export const deleteStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user.id;

    const status = await Status.findById(statusId);

    if (!status) {
      return res.status(404).json({ message: "Status not found" });
    }

    if (status.userId.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Delete file if exists
    if (status.type === "image" || status.type === "video") {
      const filePath = path.join(__dirname, "..", status.content);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Status.findByIdAndDelete(statusId);

    //  Socket broadcast
    const io = req.app.get("io");
    if (io) {
      io.emit("statusDeleted", { statusId, userId });
    }

    res.json({ message: "Status deleted successfully" });
  } catch (err) {
    console.error("Delete status error:", err);
    res.status(500).json({ message: "Failed to delete status" });
  }
};

//  Get status viewers
export const getStatusViewers = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user.id;

    const status = await Status.findById(statusId).populate(
      "viewedBy.userId",
      "username profileImage",
    );

    if (!status) {
      return res.status(404).json({ message: "Status not found" });
    }

    if (status.userId.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json({
      totalViews: status.viewedBy.length,
      viewers: status.viewedBy,
    });
  } catch (err) {
    console.error(" Get viewers error:", err);
    res.status(500).json({ message: "Failed to fetch viewers" });
  }
};

//   status privacy
export const updateStatusPrivacy = async (req, res) => {
  try {
    const userId = req.user.id;
    const { defaultPrivacy, mutedStatuses } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (defaultPrivacy) {
      user.statusPrivacy = defaultPrivacy;
    }

    if (mutedStatuses !== undefined) {
      user.mutedStatuses = mutedStatuses;
    }

    await user.save();

    res.json({
      message: "Privacy settings updated",
      statusPrivacy: user.statusPrivacy,
      mutedStatuses: user.mutedStatuses,
    });
  } catch (err) {
    console.error(" Update privacy error:", err);
    res.status(500).json({ message: "Failed to update privacy settings" });
  }
};
