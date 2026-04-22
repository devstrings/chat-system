# Chat MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that connects **Claude** (or any MCP client) to your DevStrings Chat System REST API — letting you query conversations, search messages, inspect groups, and send messages using natural language.

---

## Architecture

```
Claude / MCP Client
        │
        │  stdio  OR  HTTP+SSE
        ▼
 chat-mcp-server   ←── your JWT token
        │
        │  HTTP REST calls
        ▼
 Your Chat Backend (Express + MongoDB)
   http://localhost:5000/api
```

---

## Prerequisites

- Node.js ≥ 18
- Your chat backend running (see `backend/` in this repo)
- A valid JWT token from `POST /api/auth/login`

---

## Setup

### 1. Install dependencies

```bash
cd chat-mcp-server
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# URL of your chat backend
CHAT_API_BASE_URL=http://localhost:5000/api

# Get this by calling POST /api/auth/login
CHAT_AUTH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Transport mode: stdio | http | both
MCP_TRANSPORT=both

# HTTP server settings (used in http/both mode)
MCP_HTTP_PORT=3100
MCP_HTTP_HOST=0.0.0.0
```

#### How to get your JWT token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}'
```

Copy the `accessToken` from the response into `CHAT_AUTH_TOKEN`.

---

## Running the Server

```bash
# Both stdio + HTTP (default)
npm start

# Stdio only (for Claude Desktop local config)
npm run start:stdio

# HTTP/SSE only (for remote clients, Cursor, etc.)
npm run start:http
```

---

## Connecting to Claude Desktop

Add this to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "chat": {
      "command": "node",
      "args": ["/absolute/path/to/chat-mcp-server/src/index.js", "--transport=stdio"],
      "env": {
        "CHAT_API_BASE_URL": "http://localhost:5000/api",
        "CHAT_AUTH_TOKEN": "your_jwt_token_here"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

---

## Connecting via HTTP (Remote / Cursor / custom clients)

Start the server in HTTP mode:

```bash
MCP_TRANSPORT=http npm start
```

Then configure your client to connect to:
```
SSE endpoint : http://localhost:3100/sse
POST endpoint: http://localhost:3100/message
```

---

## Available Tools

| Tool | Description |
|------|-------------|
| `whoami` | Returns the authenticated user's name and ID |
| `list_conversations` | Lists all DM conversations with last message preview |
| `get_messages` | Fetches messages from a DM conversation (paginated) |
| `list_groups` | Lists all groups you're a member of |
| `get_group_info` | Full group details: members, admins, description |
| `get_group_messages` | Fetches messages from a group chat (paginated) |
| `search_messages` | AI-powered semantic search within a conversation or group |
| `send_message` | Sends a text message to a DM conversation |
| `send_group_message` | Sends a text message to a group |
| `find_user` | Searches for users by username or email |

---

## Example Prompts for Claude

Once connected, you can ask Claude things like:

```
"Show me my conversations"
"What did @alice say about the project deadline?"
"Search for messages about 'invoice' in the DevTeam group"
"Show the last 20 messages in my conversation with @bob"
"Who is in the Backend Engineers group?"
"Send 'Meeting at 3pm today' to my conversation with @carol"
"What groups am I part of?"
"Find user john"
```

---

## Project Structure

```
chat-mcp-server/
├── src/
│   ├── index.js          # Entry point — boots stdio and/or HTTP transport
│   ├── api-client.js     # Axios wrapper for your chat REST API
│   ├── tools.js          # All MCP tool definitions (Claude sees these)
│   ├── formatters.js     # Converts raw API data to readable text
│   └── http-transport.js # Express + SSE server for HTTP mode
├── .env.example
├── package.json
└── README.md
```

---

## Security Notes

- The JWT token in `.env` acts as the authenticated user — Claude will send messages **as that user**.
- Claude is instructed in the tool descriptions to always confirm with the user before sending messages.
- Keep your `.env` file out of version control (it's in `.gitignore`).
- For production, use HTTPS and restrict `MCP_HTTP_HOST` to trusted networks.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Auth failed — could not reach /auth/me` | Check `CHAT_API_BASE_URL` and that your backend is running |
| `[401] Unauthorized` | Your `CHAT_AUTH_TOKEN` has expired — log in again to get a fresh token |
| `search_messages` returns no results | The AI search feature must be enabled in your admin panel (`/api/admin/settings`) |
| Claude Desktop doesn't show the tools | Restart Claude Desktop after editing `claude_desktop_config.json` |
