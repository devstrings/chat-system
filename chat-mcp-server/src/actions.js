import axios from "axios";
import config from '../config/index.js';

const { chat } = config;
const normalizedBaseUrl = (chat.apiBaseUrl || "").replace(/\/+$/, "");
const apiBaseUrl = normalizedBaseUrl.endsWith("/api")
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/api`;
const mcpApiBaseUrl = `${apiBaseUrl}/mcp`;
const basicAuthEncoded = Buffer.from(
    `${chat.basicAuth.username}:${chat.basicAuth.password}`,
).toString("base64");

export function createActionClient(pat) {
    if (!pat) {
        throw new Error("PAT is required to create action client");
    }

    const http = axios.create({
        baseURL: mcpApiBaseUrl,
        timeout: chat.timeoutMs,
        headers: {
            Authorization: `Bearer ${pat}`,
            "Proxy-Authorization": `Basic ${basicAuthEncoded}`,
            "Content-Type": "application/json",
        },
    });

    http.interceptors.response.use(
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
        },
    );

    return {
        whoAmI: async () => {
            const { data } = await http.get("/auth/me");
            return data;
        },
        listConversations: async () => {
            const { data } = await http.get("/messages/conversations");
            return data;
        },
        getMessages: async (conversationId, limit = 50, skip = 0) => {
            const { data } = await http.get(`/messages/${conversationId}`, {
                params: { limit, skip },
            });
            return data;
        },
        getGroupMessages: async (groupId, limit = 50, skip = 0) => {
            const { data } = await http.get(`/messages/group/${groupId}`, {
                params: { limit, skip },
            });
            return data;
        },
        sendMessage: async (conversationId, text, replyToId = null) => {
            const body = { conversationId, text };
            if (replyToId) body.replyTo = { _id: replyToId };
            const { data } = await http.post("/messages/send", body);
            return data;
        },
        sendGroupMessage: async (groupId, text, replyToId = null) => {
            const body = { groupId, text };
            if (replyToId) body.replyTo = { _id: replyToId };
            const { data } = await http.post("/messages/send", body);
            return data;
        },
        searchMessages: async (query, conversationId = null, groupId = null) => {
            const body = { query };
            if (groupId) body.groupId = groupId;
            else if (conversationId) body.conversationId = conversationId;
            const { data } = await http.post("/ai/search", body);
            return data;
        },
        listGroups: async () => {
            const { data } = await http.get("/groups/list");
            return data;
        },
        getGroupDetails: async (groupId) => {
            const { data } = await http.get(`/groups/${groupId}`);
            return data;
        },
        searchUsers: async (query) => {
            const { data } = await http.get("/users/search", {
                params: { q: query },
            });
            return data;
        },
        getUserById: async (userId) => {
            const { data } = await http.get(`/users/${userId}`);
            return data;
        },
    };
}
