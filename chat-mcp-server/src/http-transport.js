import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
/**
 * @param {{
 *   host: string,
 *   port: number,
 *   createServerForSession: (pat: string) => Promise<import("@modelcontextprotocol/sdk/server/mcp.js").McpServer> | import("@modelcontextprotocol/sdk/server/mcp.js").McpServer
 * }} options
 */
export async function startHttpTransport({ host, port, createServerForSession }) {
    const app = express();
    app.use(express.json());

    const sessions = new Map();

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
        const auth = req.header("authorization") || "";
        const pat = auth.startsWith("Bearer ") ? auth.slice(7) : null;
        if (!pat || !pat.startsWith("dsc_pat_")) {
            return res.status(401).json({ error: "Bearer PAT required" });
        }

        const transport = new SSEServerTransport("/message", res);
        const server = await createServerForSession(pat);
        sessions.set(transport.sessionId, { transport, server });
        
        res.on("close", () => {
            sessions.delete(transport.sessionId);
        });
        await server.connect(transport);
    });

    // ── Message endpoint — client POSTs JSON-RPC here ─────
    app.post("/message", async (req, res) => {
        const sessionId = String(req.query.sessionId || "");
        if (!sessionId) {
            return res.status(400).json({ error: "sessionId query parameter is required" });
        }
        const session = sessions.get(sessionId);
        const transport = session?.transport;

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
