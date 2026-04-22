import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

/**
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} mcpServer
 * @param {{ host: string, port: number }} options
 */
export async function startHttpTransport(mcpServer, { host, port }) {
    const app = express();
    app.use(express.json());

    // Track active SSE transports keyed by session ID
    const transports = new Map();

    // ── Health check ──────────────────────────────────────
    app.get("/", (_req, res) => {
        res.json({
            name: "chat-mcp-server",
            status: "ok",
            transport: "http/sse",
            tools: "available at /sse",
        });
    });

    // ── SSE endpoint — client connects here ───────────────
    app.get("/sse", async (req, res) => {
        console.log(`[HTTP] SSE connection from ${req.ip}`);

        const transport = new SSEServerTransport("/message", res);
        transports.set(transport.sessionId, transport);

        res.on("close", () => {
            console.log(`[HTTP] SSE client disconnected (session: ${transport.sessionId})`);
            transports.delete(transport.sessionId);
        });

        await mcpServer.connect(transport);
    });

    // ── Message endpoint — client POSTs JSON-RPC here ─────
    app.post("/message", async (req, res) => {
        const sessionId = req.query.sessionId;
        const transport = transports.get(sessionId);

        if (!transport) {
            return res
                .status(404)
                .json({ error: `No active SSE session: ${sessionId}` });
        }

        await transport.handlePostMessage(req, res, req.body);
    });

    // ── Start listening ────────────────────────────────────
    await new Promise((resolve, reject) => {
        const srv = app.listen(port, host, () => {
            console.log(`[HTTP] MCP server listening on http://${host}:${port}`);
            console.log(`[HTTP]   SSE endpoint : http://${host}:${port}/sse`);
            console.log(`[HTTP]   Message POST : http://${host}:${port}/message`);
            resolve(srv);
        });
        srv.on("error", reject);
    });
}
