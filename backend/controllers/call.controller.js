import {
  callService
} from "#services";
import Call from "#models/Call";
import asyncHandler from "express-async-handler";


export const getTurnCredentials = asyncHandler(async (req, res) => {
  const credentials = await callService.fetchTurnCredentials();
  res.json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      credentials
    ]
  });
});


export const getCallHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 20, page = 1 } = req.query;
  const result = await callService.fetchUserCallHistory(userId, limit, page);
  res.json(result);
});

export const getCallStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const stats = await callService.fetchCallStats(userId);
  res.json(stats);
});

export const deleteCallHistory = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const userId = req.user.id;
  const result = await callService.processDeleteCall(callId, userId);
  res.json(result);
});

export const clearCallHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await callService.processClearCallHistory(userId);
  res.json(result);
});
export const getRecentCalls = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const calls = await callService.fetchRecentCalls(userId);
  res.json({ calls });
});

export const getCallById = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const userId = req.user.id;
  const call = await callService.fetchCallById(callId, userId);
  res.json({ call });
});

export const getCallsWithUser = asyncHandler(async (req, res) => {
  try {
    const calls = await Call.find({
      $or: [
        { caller: req.user.id, receiver: req.params.otherUserId },
        { caller: req.params.otherUserId, receiver: req.user.id }
      ]
    }).sort({ createdAt: 1 });
    res.json(calls);
  } catch (err) {
    res.json([]);
  }
});