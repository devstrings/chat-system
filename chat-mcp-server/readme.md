# Chat MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that connects **Claude** (or any MCP client) to your DevStrings Chat System REST API — letting you query conversations, search messages, inspect groups, and send messages using natural language.

---

## Architecture

```
Claude / MCP Client
        │
        │  stdio  OR  HTTP+SSE
        ▼
chat-mcp-server   ←── your PAT token + backend Basic Auth
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
- A valid Personal Access Token (PAT) from user settings
- Backend basic auth credentials (`BASIC_AUTH_USERNAME`, `BASIC_AUTH_PASSWORD`)

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

# PAT generated in chat app user settings
CHAT_API_PERSONAL_ACCESS_TOKEN=dsc_pat_xxxxx

# Transport mode: stdio | http | both
MCP_TRANSPORT=both

# HTTP server settings (used in http/both mode)
MCP_HTTP_PORT=3100
MCP_HTTP_HOST=0.0.0.0

# Backend /api/mcp basic auth
BACKEND_BASIC_AUTH_USERNAME=testuser
BACKEND_BASIC_AUTH_PASSWORD=testpassword
```

#### How to get your PAT

Generate a personal access token in your chat dashboard user settings.
Copy the token once and set it as `CHAT_API_PERSONAL_ACCESS_TOKEN`.

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

## MCP Inspector

Use MCP Inspector to test tools locally.

```bash
# Inspect stdio transport directly (recommended for local debugging)
npm run inspect:stdio

# Inspect HTTP transport (start server first with npm run start:http)
npm run inspect:http
```

Notes:
- `inspect:stdio` launches the inspector and starts your server in stdio mode.
- `inspect:http` connects inspector to `http://localhost:3100/message` (update script if your port differs).

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
        "CHAT_API_PERSONAL_ACCESS_TOKEN": "your_pat_here",
        "BACKEND_BASIC_AUTH_USERNAME": "testuser",
        "BACKEND_BASIC_AUTH_PASSWORD": "testpassword"
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

- The PAT token in `.env` acts as the authenticated user — Claude will send messages **as that user**.
- The MCP backend route requires backend basic auth in addition to PAT.
- Claude is instructed in the tool descriptions to always confirm with the user before sending messages.
- Keep your `.env` file out of version control (it's in `.gitignore`).
- For production, use HTTPS and restrict `MCP_HTTP_HOST` to trusted networks.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Auth failed — could not reach /auth/me` | Check `CHAT_API_BASE_URL` and that your backend is running |
| `[401] Unauthorized` | Check PAT validity and backend basic auth credentials |
| `search_messages` returns no results | The AI search feature must be enabled in your admin panel (`/api/admin/settings`) |
| Claude Desktop doesn't show the tools | Restart Claude Desktop after editing `claude_desktop_config.json` |
