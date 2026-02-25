import {
  fetchUserCallHistory,
  fetchCallStats,
  processDeleteCall,
  processClearCallHistory,
  fetchRecentCalls,
  fetchCallById
} from "../services/call.service.js";

export const getCallHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, page = 1 } = req.query;

    const result = await fetchUserCallHistory(userId, limit, page);
    res.json(result);
  } catch (err) {
    console.error(" Get call history error:", err);
    res.status(500).json({ message: "Failed to get call history" });
  }
};

export const getCallStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await fetchCallStats(userId);
    res.json(stats);
  } catch (err) {
    console.error(" Get call stats error:", err);
    res.status(500).json({ message: "Failed to get call stats" });
  }
};

export const deleteCallHistory = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    const result = await processDeleteCall(callId, userId);
    res.json(result);
  } catch (err) {
    console.error(" Delete call error:", err);
    const statusCode = err.message === "Call not found" ? 404 : 500;
    res.status(statusCode).json({ message: err.message });
  }
};

export const clearCallHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await processClearCallHistory(userId);
    res.json(result);
  } catch (err) {
    console.error(" Clear call history error:", err);
    res.status(500).json({ message: "Failed to clear call history" });
  }
};

export const getRecentCalls = async (req, res) => {
  try {
    const userId = req.user.id;
    const calls = await fetchRecentCalls(userId);
    res.json({ calls });
  } catch (err) {
    console.error(" Get recent calls error:", err);
    res.status(500).json({ message: "Failed to get recent calls" });
  }
};

export const getCallById = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    const call = await fetchCallById(callId, userId);
    res.json({ call });
  } catch (err) {
    console.error(" Get call by ID error:", err);
    const statusCode = err.message === "Call not found" ? 404 : 500;
    res.status(statusCode).json({ message: err.message });
  }
};
