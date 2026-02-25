import Call from "../models/Call.js";
import mongoose from "mongoose"
export const fetchUserCallHistory = async (userId, limit = 20, page = 1) => {
  const calls = await Call.find({
    $or: [{ caller: userId }, { receiver: userId }]
  })
    .populate("caller", "username profileImage")
    .populate("receiver", "username profileImage")
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Call.countDocuments({
    $or: [{ caller: userId }, { receiver: userId }]
  });

  console.log(` Fetched ${calls.length} calls for user ${userId}`);
  
  return {
    calls,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit))
  };
};

export const fetchCallStats = async (userId) => {
  const stats = await Call.aggregate([
    {
      $match: {
        $or: [
          { caller: new mongoose.Types.ObjectId(userId) },
          { receiver: new mongoose.Types.ObjectId(userId) }
        ]
      }
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalDuration: { $sum: "$duration" }
      }
    }
  ]);

  const totalCalls = await Call.countDocuments({
    $or: [{ caller: userId }, { receiver: userId }]
  });

  const outgoingCalls = await Call.countDocuments({ caller: userId });
  const incomingCalls = await Call.countDocuments({ receiver: userId });

  return {
    stats,
    totalCalls,
    outgoingCalls,
    incomingCalls
  };
};

export const processDeleteCall = async (callId, userId) => {
  const call = await Call.findOne({
    _id: callId,
    $or: [{ caller: userId }, { receiver: userId }]
  });

  if (!call) {
    throw new Error("Call not found");
  }

  await Call.findByIdAndDelete(callId);
  
  console.log(` Call deleted: ${callId}`);
  return { message: "Call deleted successfully" };
};

export const processClearCallHistory = async (userId) => {
  const result = await Call.deleteMany({
    $or: [{ caller: userId }, { receiver: userId }]
  });

  console.log(` Cleared ${result.deletedCount} calls`);
  
  return {
    message: "Call history cleared successfully",
    deletedCount: result.deletedCount
  };
};

export const fetchRecentCalls = async (userId) => {
  const calls = await Call.find({
    $or: [{ caller: userId }, { receiver: userId }]
  })
    .populate("caller", "username profileImage")
    .populate("receiver", "username profileImage")
    .sort({ createdAt: -1 })
    .limit(10);

  return calls;
};

export const fetchCallById = async (callId, userId) => {
  const call = await Call.findOne({
    _id: callId,
    $or: [{ caller: userId }, { receiver: userId }]
  })
    .populate("caller", "username profileImage")
    .populate("receiver", "username profileImage");

  if (!call) {
    throw new Error("Call not found");
  }

  return call;
};