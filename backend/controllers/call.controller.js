import {
  callService
} from "#services";
import asyncHandler from "express-async-handler";


export const getTurnCredentials = asyncHandler(async (req, res) => {
  const credentials = await callService.fetchTurnCredentials();
  res.json({ iceServers: credentials });
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