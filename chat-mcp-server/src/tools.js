
import { z } from "zod";
import {
    formatMessages,
    formatConversations,
    formatGroups,
    formatGroupDetails,
    formatSentMessage,
    formatSearchResults,
    formatUser,
} from "./formatters.js";
import apiActions from "./actions.js";

/**
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {{ userId: string, username: string }} identity  – current user info
 */
export function registerTools(server, identity) {
    const { userId, username } = identity;

    // ─────────────────────────────────────────────────────────
    //  TOOL 1 — whoami
    // ─────────────────────────────────────────────────────────
    server.tool(
        "whoami",
        "Returns the identity of the currently authenticated chat user. " +
        "Call this first if you need the user's ID or username.",
        {},
        async () => {
            return {
                content: [
                    {
                        type: "text",
                        text: `Authenticated as @${username} (user ID: ${userId})`,
                    },
                ],
            };
        }
    );

    server.tool(
        "list_conversations",
        "Lists all direct-message (DM) conversations for the current user, " +
        "including the other participant's name, conversation ID, and last message preview. " +
        "Use conversation IDs from this list when calling other tools.",
        {},
        async () => {
            const conversations = await apiActions.listConversations();
            return {
                content: [
                    {
                        type: "text",
                        text: formatConversations(conversations, userId),
                    },
                ],
            };
        }
    );

    server.tool(
        "get_messages",
        "Fetches messages from a direct-message conversation. " +
        "Returns a formatted transcript with sender names, timestamps, and content. " +
        "Use list_conversations first to find the conversation ID.",
        {
            conversation_id: z
                .string()
                .describe("The conversation ID (from list_conversations)"),
            limit: z
                .number()
                .int()
                .min(1)
                .max(100)
                .default(30)
                .describe("Number of messages to fetch (1-100, default 30)"),
            skip: z
                .number()
                .int()
                .min(0)
                .default(0)
                .describe("Number of messages to skip for pagination (default 0)"),
        },
        async ({ conversation_id, limit, skip }) => {
            const messages = await apiActions.getMessages(conversation_id, limit, skip);
            return {
                content: [
                    {
                        type: "text",
                        text: formatMessages(
                            messages,
                            `Conversation ${conversation_id} — latest ${limit} messages`
                        ),
                    },
                ],
            };
        }
    );

    server.tool(
        "list_groups",
        "Lists all groups the current user is a member of, " +
        "showing group name, ID, member count, and last message preview.",
        {},
        async () => {
            const groups = await apiActions.listGroups();
            return {
                content: [
                    {
                        type: "text",
                        text: formatGroups(groups),
                    },
                ],
            };
        }
    );

    server.tool(
        "get_group_info",
        "Returns full details about a specific group: name, description, " +
        "creator, admins, member list (with usernames and IDs), and last message. " +
        "Use list_groups first to find group IDs.",
        {
            group_id: z
                .string()
                .describe("The group ID (from list_groups)"),
        },
        async ({ group_id }) => {
            const group = await apiActions.getGroupDetails(group_id);
            return {
                content: [
                    {
                        type: "text",
                        text: formatGroupDetails(group),
                    },
                ],
            };
        }
    );

    server.tool(
        "get_group_messages",
        "Fetches messages from a group chat. " +
        "Returns a formatted transcript with sender names, timestamps, and content. " +
        "Use list_groups first to find the group ID.",
        {
            group_id: z
                .string()
                .describe("The group ID (from list_groups)"),
            limit: z
                .number()
                .int()
                .min(1)
                .max(100)
                .default(30)
                .describe("Number of messages to fetch (1-100, default 30)"),
            skip: z
                .number()
                .int()
                .min(0)
                .default(0)
                .describe("Number of messages to skip for pagination"),
        },
        async ({ group_id, limit, skip }) => {
            const messages = await apiActions.getGroupMessages(group_id, limit, skip);
            return {
                content: [
                    {
                        type: "text",
                        text: formatMessages(
                            messages,
                            `Group ${group_id} — latest ${limit} messages`
                        ),
                    },
                ],
            };
        }
    );

    // ─────────────────────────────────────────────────────────
    //  TOOL 7 — search_messages
    // ─────────────────────────────────────────────────────────
    server.tool(
        "search_messages",
        "Semantically searches messages in a conversation or group using AI. " +
        "Returns the most relevant messages that match the query. " +
        "Provide either conversation_id OR group_id, not both.",
        {
            query: z
                .string()
                .min(1)
                .describe("The search query — what to look for in the messages"),
            conversation_id: z
                .string()
                .optional()
                .describe("Search within this DM conversation ID (use if searching DMs)"),
            group_id: z
                .string()
                .optional()
                .describe("Search within this group ID (use if searching a group)"),
        },
        async ({ query, conversation_id, group_id }) => {
            if (!conversation_id && !group_id) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Error: you must provide either conversation_id or group_id to search in.",
                        },
                    ],
                    isError: true,
                };
            }

            const result = await apiActions.searchMessages(
                query,
                conversation_id ?? null,
                group_id ?? null
            );

            return {
                content: [
                    {
                        type: "text",
                        text: formatSearchResults(result.results ?? [], query),
                    },
                ],
            };
        }
    );

    server.tool(
        "send_message",
        "Sends a text message to a direct-message conversation. " +
        "Optionally reply to a specific message by providing reply_to_message_id. " +
        "Use list_conversations to find conversation IDs. " +
        "IMPORTANT: Always confirm with the user before sending a message on their behalf.",
        {
            conversation_id: z
                .string()
                .describe("The conversation ID to send the message to"),
            text: z
                .string()
                .min(1)
                .describe("The message text to send"),
            reply_to_message_id: z
                .string()
                .optional()
                .describe("Optional: ID of a message to reply to"),
        },
        async ({ conversation_id, text, reply_to_message_id }) => {
            const msg = await apiActions.sendMessage(
                conversation_id,
                text,
                reply_to_message_id ?? null
            );
            return {
                content: [
                    {
                        type: "text",
                        text: formatSentMessage(msg, `conversation ${conversation_id}`),
                    },
                ],
            };
        }
    );


    server.tool(
        "send_group_message",
        "Sends a text message to a group chat. " +
        "Use list_groups to find group IDs. " +
        "IMPORTANT: Always confirm with the user before sending a message on their behalf.",
        {
            group_id: z
                .string()
                .describe("The group ID to send the message to"),
            text: z
                .string()
                .min(1)
                .describe("The message text to send"),
            reply_to_message_id: z
                .string()
                .optional()
                .describe("Optional: ID of a message to reply to"),
        },
        async ({ group_id, text, reply_to_message_id }) => {
            const msg = await apiActions.sendGroupMessage(
                group_id,
                text,
                reply_to_message_id ?? null
            );
            return {
                content: [
                    {
                        type: "text",
                        text: formatSentMessage(msg, `group ${group_id}`),
                    },
                ],
            };
        }
    );

    // ─────────────────────────────────────────────────────────
    //  TOOL 10 — find_user
    // ─────────────────────────────────────────────────────────
    server.tool(
        "find_user",
        "Searches for users by username or email. " +
        "Returns a list of matching users with their IDs. " +
        "Useful before referencing a specific person in context.",
        {
            query: z
                .string()
                .min(1)
                .describe("Username or email to search for"),
        },
        async ({ query }) => {
            const users = await api.searchUsers(query);
            if (!users?.length) {
                return {
                    content: [{ type: "text", text: `No users found for "${query}".` }],
                };
            }
            const lines = users.map((u) => `• ${formatUser(u)}`).join("\n");
            return {
                content: [
                    {
                        type: "text",
                        text: `── Users matching "${query}" (${users.length}) ──\n${lines}`,
                    },
                ],
            };
        }
    );
}
