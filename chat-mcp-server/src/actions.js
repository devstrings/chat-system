import axios from "axios";
import config from '../config/index.js';


const { chat } = config;

const normalizedBaseUrl = (chat.apiBaseUrl || "").replace(/\/+$/, "");
const mcpApiBaseUrl = `${normalizedBaseUrl}/api/mcp`;

const basicAuthEncoded = Buffer.from(
    `${chat.basicAuth.username}:${chat.basicAuth.password}`,
).toString("base64");

const chatInstance = axios.create({
    baseURL: mcpApiBaseUrl,
    timeout: chat.timeoutMs,
    headers: {
        Authorization: `Bearer ${chat.personalAccessToken}`,
        "Proxy-Authorization": `Basic ${basicAuthEncoded}`,
        "Content-Type": "application/json",
    },
});

chatInstance.interceptors.response.use(
    (res) => res,
    (err) => {
        const msg =
            err.response?.data?.message ||
            err.response?.statusText ||
            err.message ||
            "Unknown API error";

        const status = err.response?.status ?? 0;

        const error = new Error(`[${status}] ${msg}`);
        error.status = status;
        error.raw = err.response?.data;

        return Promise.reject(error);
    }
);


const whoAmI = async () => {
    const { data } = await chatInstance.get("/auth/me");
    return data;
};

// ─────────────────────────────
// MESSAGES / CONVERSATIONS
// ─────────────────────────────

const listConversations = async () => {
    const { data } = await chatInstance.get("/messages/conversations");
    return data;
};

const getMessages = async (conversationId, limit = 50, skip = 0) => {
    const { data } = await chatInstance.get(`/messages/${conversationId}`, {
        params: { limit, skip },
    });
    return data;
};

const getGroupMessages = async (groupId, limit = 50, skip = 0) => {
    const { data } = await chatInstance.get(`/messages/group/${groupId}`, {
        params: { limit, skip },
    });
    return data;
};

const sendMessage = async (conversationId, text, replyToId = null) => {
    const body = { conversationId, text };
    if (replyToId) body.replyTo = { _id: replyToId };

    const { data } = await chatInstance.post("/messages/send", body);
    return data;
};

const sendGroupMessage = async (groupId, text, replyToId = null) => {
    const body = { groupId, text };
    if (replyToId) body.replyTo = { _id: replyToId };

    const { data } = await chatInstance.post("/messages/send", body);
    return data;
};

const searchMessages = async (query, conversationId = null, groupId = null) => {
    const body = { query };

    if (groupId) body.groupId = groupId;
    else if (conversationId) body.conversationId = conversationId;

    const { data } = await chatInstance.post("/ai/search", body);
    return data;
};

const listGroups = async () => {
    const { data } = await chatInstance.get("/groups/list");
    return data;
};

const getGroupDetails = async (groupId) => {
    const { data } = await chatInstance.get(`/groups/${groupId}`);
    return data;
};

const searchUsers = async (query) => {
    const { data } = await chatInstance.get("/users/search", {
        params: { q: query },
    });
    return data;
};

const getUserById = async (userId) => {
    const { data } = await chatInstance.get(`/users/${userId}`);
    return data;
};

export default {
    whoAmI,
    listConversations,
    getMessages,
    getGroupMessages,
    sendMessage,
    sendGroupMessage,
    searchMessages,
    listGroups,
    getGroupDetails,
    searchUsers,
    getUserById,
}
