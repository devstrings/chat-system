import {
  fetchUserCallHistory,
  fetchCallStats,
  processDeleteCall,
  processClearCallHistory,
  fetchRecentCalls,
  fetchCallById
} from "../services/call.service.js";
import asyncHandler from "express-async-handler";

export const getCallHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 20, page = 1 } = req.query;
  const result = await fetchUserCallHistory(userId, limit, page);
  res.json(result);
});

export const getCallStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const stats = await fetchCallStats(userId);
  res.json(stats);
});

export const deleteCallHistory = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const userId = req.user.id;
  const result = await processDeleteCall(callId, userId);
  res.json(result);
});

export const clearCallHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await processClearCallHistory(userId);
  res.json(result);
});
export const getRecentCalls = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const calls = await fetchRecentCalls(userId);
  res.json({ calls });
});

export const getCallById = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const userId = req.user.id;
  const call = await fetchCallById(callId, userId);
  res.json({ call });
});