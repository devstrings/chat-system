import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSettingsWithDecryptedKeys } from "./appSettings.service.js";

const getClient = async () => {
  const settings = await getSettingsWithDecryptedKeys();
  const apiKey = settings.aiProvider?.geminiApiKey;
  if (!apiKey) throw new Error("Gemini API key not configured");
  return new GoogleGenerativeAI(apiKey);
};

const getModel = async (featureName) => {
  const settings = await getSettingsWithDecryptedKeys();
  const modelName = settings.aiFeatures?.[featureName]?.model || "gemini-1.5-flash";
  const client = await getClient();
  return client.getGenerativeModel({ model: modelName });
};

// Summarize a list of messages
export const summarizeConversation = async (messages) => {
  const model = await getModel("summarize");

  const formatted = messages
    .map((m) => `[${m.sender?.username || "User"}]: ${m.text}`)
    .join("\n");

  const prompt = `You are a helpful assistant. Summarize the following chat conversation concisely in 3-5 bullet points. Focus on key topics, decisions, and action items.\n\nConversation:\n${formatted}\n\nSummary:`;

  const result = await model.generateContent(prompt);
  return result.response.text();
};

// Search messages semantically
export const searchMessages = async (query, messages) => {
  const model = await getModel("smartSearch");

  const formatted = messages
    .map((m, i) => `[${i}] [${m.sender?.username || "User"}]: ${m.text}`)
    .join("\n");

  const prompt = `You are a search assistant. Given the following chat messages, find all messages relevant to this query: "${query}"\n\nMessages:\n${formatted}\n\nReturn only the indices of relevant messages as a JSON array, e.g. [0, 3, 7]. If none are relevant, return [].`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    const match = text.match(/\[[\d,\s]*\]/);
    const indices = match ? JSON.parse(match[0]) : [];
    return indices.map((i) => messages[i]).filter(Boolean);
  } catch {
    return [];
  }
};

// Translate text to target language
export const translateText = async (text, targetLang) => {
  const model = await getModel("translate");

  const prompt = `Translate the following text to ${targetLang}. Return only the translated text, nothing else.\n\nText: ${text}`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
};
