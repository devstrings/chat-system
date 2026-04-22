import config from "../config/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createActionClient } from "./actions.js";
import { registerTools } from "../src/tools.js";
import { startHttpTransport } from "../src/http-transport.js";

const { mcp, chat } = config;

if (!chat.basicAuth.username || !chat.basicAuth.password) {
    console.error("BACKEND_BASIC_AUTH_USERNAME and BACKEND_BASIC_AUTH_PASSWORD are required.");
    process.exit(1);
}

const HTTP_PORT = parseInt(mcp.httpPort ?? "3100", 10);
const HTTP_HOST = mcp.httpHost ?? "0.0.0.0";

const cliTransport = process.argv
    .find((a) => a.startsWith("--transport="))
    ?.split("=")[1];

const TRANSPORT = (
    cliTransport ?? process.env.MCP_TRANSPORT ?? "both"
).toLowerCase();

// ─── Validation ─────────────────────────────────────────────────────────────



if (!["stdio", "http", "both"].includes(TRANSPORT)) {
    console.error(
        `❌  Unknown MCP_TRANSPORT "${TRANSPORT}". Use: stdio | http | both`
    );
    process.exit(1);
}

const createServerWithClient = (actionClient) => {
    const server = new McpServer({
        name: "chat-mcp-server",
        version: "1.0.0",
        description:
            "Exposes your DevStrings Chat System to Claude: read conversations, " +
            "search messages, inspect groups, and send messages.",
    });
    registerTools(server, actionClient);
    return server;
};


async function main() {
    console.error(`🚀  Chat MCP Server ready — transport: ${TRANSPORT}`);

    const useStdio = TRANSPORT === "stdio" || TRANSPORT === "both";
    const useHttp = TRANSPORT === "http" || TRANSPORT === "both";

    if (useHttp) {
        await startHttpTransport({
            host: HTTP_HOST,
            port: HTTP_PORT,
            createServerForSession: async (pat) => {
                console.log(pat);
                const actionClient = createActionClient(pat);
                const me = await actionClient.whoAmI();
                const userId = me._id ?? me.id;
                console.error(`[http] Authenticated session as @${me.username} (${userId})`);
                return createServerWithClient(actionClient);
            },
        });
    }

    if (useStdio) {
        if (!chat.personalAccessToken) {
            console.error("CHAT_API_PERSONAL_ACCESS_TOKEN is required for stdio transport.");
            process.exit(1);
        }
        const stdioActions = createActionClient(chat.personalAccessToken);
        const me = await stdioActions.whoAmI();
        const userId = me._id ?? me.id;
        console.error(`[stdio] Authenticated as @${me.username} (${userId})`);

        if (useHttp) {
            console.error("[stdio] Also listening on stdin/stdout for MCP clients.");
        }
        const server = createServerWithClient(stdioActions);
        const stdioTransport = new StdioServerTransport();
        await server.connect(stdioTransport);
    }
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
