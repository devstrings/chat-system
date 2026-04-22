import config from "../config/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import apiActions from "./actions.js";
import { registerTools } from "../src/tools.js";
import { startHttpTransport } from "../src/http-transport.js";

const { mcp, chat } = config;

const API_BASE = chat.apiBaseUrl ?? "http://localhost:3000/api";
const MCP_API_BASE = `${API_BASE.replace(/\/+$/, "")}/mcp`;

if (!chat.personalAccessToken) {
    console.error("CHAT_API_PERSONAL_ACCESS_TOKEN is not set.");
    process.exit(1);
}
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


async function main() {

    let identity;
    
    try {
        const me = await apiActions.whoAmI();
        identity = { userId: me._id ?? me.id, username: me.username };
        console.error(`Authenticated as @${identity.username} (${identity.userId})`);
    } catch (err) {
        console.error(`${err.message}`);
        
        process.exit(1);
    }

    // 3. Create MCP server
    const server = new McpServer({
        name: "chat-mcp-server",
        version: "1.0.0",
        description:
            "Exposes your DevStrings Chat System to Claude: read conversations, " +
            "search messages, inspect groups, and send messages.",
    });

    // 4. Register all tools
    registerTools(server, identity);

    console.error(`🚀  Chat MCP Server ready — transport: ${TRANSPORT}`);

    // 5. Start transport(s)
    const useStdio = TRANSPORT === "stdio" || TRANSPORT === "both";
    const useHttp = TRANSPORT === "http" || TRANSPORT === "both";

    if (useHttp) {
        await startHttpTransport(server, { host: HTTP_HOST, port: HTTP_PORT });
    }

    if (useStdio) {
        if (useHttp) {
            console.error("[stdio] Also listening on stdin/stdout for MCP clients.");
        }
        const stdioTransport = new StdioServerTransport();
        await server.connect(stdioTransport);
    }
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
