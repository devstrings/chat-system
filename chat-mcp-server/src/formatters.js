/**
 * formatters.js
 * ─────────────
 * Converts raw API objects into clean, human-readable strings
 * that Claude can reason over naturally.
 */

// ─── Helpers ───────────────────────────────────────────────

const ts = (date) =>
    date
        ? new Date(date).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
        })
        : "unknown time";

const truncate = (str, max = 200) =>
    str && str.length > max ? str.slice(0, max) + "…" : str ?? "";

const senderName = (msg) =>
    msg.sender?.username ?? msg.sender ?? "Unknown";

// ─── Message ───────────────────────────────────────────────

/**
 * Format a single message into a readable line.
 */
export function formatMessage(msg) {
    if (!msg) return "(empty message)";

    if (msg.deletedForEveryone) {
        return `[${ts(msg.createdAt)}] ${senderName(msg)}: 🗑️ This message was deleted`;
    }

    let body = "";

    if (msg.isCallRecord) {
        const icon = msg.callType === "video" ? "📹" : "📞";
        body = `${icon} ${msg.callType ?? ""} call — ${msg.callStatus ?? ""}${msg.callDuration ? ` (${msg.callDuration}s)` : ""
            }`;
    } else if (msg.text) {
        body = msg.text;
    } else if (msg.attachments?.length) {
        const atts = msg.attachments
            .map((a) => `📎 ${a.filename ?? a.fileName ?? "file"} (${a.fileType ?? ""})`)
            .join(", ");
        body = atts;
    } else {
        body = "(no content)";
    }

    const edited = msg.isEdited ? " ✏️" : "";
    const reply = msg.replyTo?.text
        ? ` ↩️ replying to "${truncate(msg.replyTo.text, 60)}"`
        : "";

    return `[${ts(msg.createdAt)}] ${senderName(msg)}${reply}: ${truncate(body)}${edited}`;
}

/**
 * Format an array of messages into a readable transcript.
 */
export function formatMessages(messages, title = "Messages") {
    if (!messages?.length) return `No messages found.`;

    const lines = messages.map((m, i) => `${i + 1}. ${formatMessage(m)}`);
    return `── ${title} (${messages.length}) ──\n${lines.join("\n")}`;
}

// ─── Conversation ──────────────────────────────────────────

/**
 * Format a single conversation (DM) for listing.
 */
export function formatConversation(conv, currentUserId) {
    const other = conv.participants?.find(
        (p) => (p._id ?? p).toString() !== currentUserId
    );
    const otherName = other?.username ?? "Unknown";
    const last = conv.lastMessage
        ? `Last: "${truncate(conv.lastMessage, 80)}" at ${ts(conv.lastMessageTime)}`
        : "No messages yet";

    return `• Conv[${conv._id}] with @${otherName} — ${last}`;
}

/**
 * Format a list of conversations.
 */
export function formatConversations(conversations, currentUserId) {
    if (!conversations?.length) return "You have no conversations.";

    const lines = conversations.map((c) =>
        formatConversation(c, currentUserId)
    );
    return `── Your Conversations (${conversations.length}) ──\n${lines.join("\n")}`;
}

// ─── Group ─────────────────────────────────────────────────

/**
 * Format a group summary (for listing).
 */
export function formatGroupSummary(group) {
    const memberCount = group.members?.length ?? 0;
    const last = group.lastMessage
        ? `Last: "${truncate(group.lastMessage, 80)}" at ${ts(group.lastMessageTime)}`
        : "No messages yet";

    return `• Group[${group._id}] "${group.name}" — ${memberCount} member(s) — ${last}`;
}

/**
 * Format full group details.
 */
export function formatGroupDetails(group) {
    if (!group) return "Group not found.";

    const members = (group.members ?? [])
        .map((m) => `    • @${m.username ?? m} (${m._id ?? m})`)
        .join("\n");

    const admins = (group.admins ?? [])
        .map((a) => `@${a.username ?? a}`)
        .join(", ");

    const creator = group.creator?.username ?? group.creator ?? "Unknown";

    return [
        `── Group Details ──`,
        `Name        : ${group.name}`,
        `ID          : ${group._id}`,
        `Description : ${group.description || "(none)"}`,
        `Creator     : @${creator}`,
        `Admins      : ${admins || "(none)"}`,
        `Members (${group.members?.length ?? 0}):`,
        members || "  (none)",
        `Last Message: ${group.lastMessage ? `"${truncate(group.lastMessage, 100)}"` : "(none)"}`,
        `Created     : ${ts(group.createdAt)}`,
    ].join("\n");
}

/**
 * Format a list of groups for quick overview.
 */
export function formatGroups(groups) {
    if (!groups?.length) return "You are not a member of any group.";

    const lines = groups.map(formatGroupSummary);
    return `── Your Groups (${groups.length}) ──\n${lines.join("\n")}`;
}

// ─── Sent message confirmation ─────────────────────────────

/**
 * Confirmation message after sending.
 */
export function formatSentMessage(msg, destination) {
    return [
        `✅ Message sent to ${destination}`,
        `ID        : ${msg._id}`,
        `Text      : ${truncate(msg.text, 120)}`,
        `Sent at   : ${ts(msg.createdAt)}`,
    ].join("\n");
}

// ─── Search results ────────────────────────────────────────

/**
 * Format AI search results.
 */
export function formatSearchResults(results, query) {
    if (!results?.length) {
        return `No messages found matching "${query}".`;
    }

    const lines = results.map((m, i) => `${i + 1}. ${formatMessage(m)}`);
    return [
        `── Search Results for "${query}" (${results.length} found) ──`,
        ...lines,
    ].join("\n");
}

// ─── User ──────────────────────────────────────────────────

export function formatUser(user) {
    return `@${user.username} (ID: ${user._id}, email: ${user.email})`;
}
