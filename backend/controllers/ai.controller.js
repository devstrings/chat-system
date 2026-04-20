import asyncHandler from "express-async-handler";
import Message from "#models/Message";
import { aiService } from "#services";

// POST /api/ai/summarize
export const summarize = asyncHandler(async (req, res) => {
  const { conversationId, groupId } = req.body;

  let messages;
  if (groupId) {
    messages = await Message.find({ groupId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("sender", "username");
    messages = messages.reverse();
  } else {
    messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("sender", "username");
    messages = messages.reverse();
  }

  if (!messages.length) {
    return res.json({ summary: "No messages to summarize." });
  }

  const summary = await aiService.summarizeConversation(messages);
  res.json({ summary });
});

// POST /api/ai/search
export const search = asyncHandler(async (req, res) => {
  const { query, conversationId, groupId } = req.body;

  if (!query?.trim()) {
    return res.status(400).json({ message: "Query is required" });
  }

  let messages;
  if (groupId) {
    messages = await Message.find({ groupId })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("sender", "username");
  } else if (conversationId) {
    messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("sender", "username");
  } else {
    return res.status(400).json({ message: "conversationId or groupId required" });
  }

  messages = messages.reverse();
  const results = await aiService.searchMessages(query, messages);
  res.json({ results });
});

// POST /api/ai/translate
export const translate = asyncHandler(async (req, res) => {
  const { text, targetLang } = req.body;

  if (!text?.trim()) return res.status(400).json({ message: "Text is required" });
  if (!targetLang?.trim()) return res.status(400).json({ message: "targetLang is required" });

  const translated = await aiService.translateText(text, targetLang);
  res.json({ translated });
});
