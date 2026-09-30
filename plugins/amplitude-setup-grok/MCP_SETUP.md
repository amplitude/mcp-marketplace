# MCP setup — Amplitude Setup Grok Bot

Two MCP servers work together. Only the **product** server belongs in this plugin's [`.mcp.json`](.mcp.json). Installers must add **Docs MCP** separately so public documentation stays decoupled from OAuth credentials.

## 1. Amplitude product MCP (OAuth)

Read and modify Amplitude content with the authenticated user's permissions. **Not** an event ingestion endpoint — use SDKs or HTTP V2 for production events.

| Region | URL |
| --- | --- |
| United States (default) | `https://mcp.amplitude.com/mcp` |
| EU data residency | `https://mcp.eu.amplitude.com/mcp` |

Optional token savings (if the client supports progressive tool discovery):

- US: `https://mcp.amplitude.com/mcp?discovery=progressive`
- EU: `https://mcp.eu.amplitude.com/mcp?discovery=progressive`

### Grok / Cursor-style HTTP config (product)

This plugin ships:

```json
{
  "mcpServers": {
    "amplitude": {
      "type": "http",
      "url": "https://mcp.amplitude.com/mcp"
    }
  }
}
```

**EU customers:** change `url` to `https://mcp.eu.amplitude.com/mcp` before authenticating.

### Legacy US remote via `mcp-remote` (some Cursor docs)

Some guides use:

```json
"amplitude-us": {
  "command": "npx",
  "args": [
    "-y",
    "mcp-remote",
    "https://mcp-server.prod.us-west-2.amplitude.com/v1/mcp"
  ]
}
```

Prefer the canonical HTTP URLs in the table above for new installs unless your client requires `mcp-remote`.

### Authenticate

1. Add the server in the client's MCP settings.
2. Complete the **Amplitude OAuth** flow in the browser when prompted.
3. Verify: ask the agent to call **`get_amplitude_context`** (no arguments) and list accessible organizations/projects.

If the user has both US and EU orgs, confirm which residency they need **before** picking the URL.

## 2. Amplitude Docs MCP (public, read-only)

**Not included in** `plugins/amplitude/.mcp.json` or this plugin's `.mcp.json` today. Add manually for every Setup bot install.

| Setting | Value |
| --- | --- |
| Name (suggested) | `amplitude-docs` |
| URL | `https://amplitude.com/docs/api/mcp` |
| Auth | None (public Streamable HTTP) |
| Purpose | Fetch/search Amplitude documentation — not private project data |

Example snippet for clients that accept JSON MCP config:

```json
{
  "mcpServers": {
    "amplitude-docs": {
      "type": "http",
      "url": "https://amplitude.com/docs/api/mcp"
    }
  }
}
```

CLI example (Claude Code):

```shell
claude mcp add -t http -s user amplitude-docs https://amplitude.com/docs/api/mcp
```

Docs: [Amplitude Docs MCP Server](https://amplitude.com/docs/amplitude-ai/docs-mcp-server).

## 3. Confirm project access

After both servers are configured (Docs optional but recommended for setup questions):

1. Call **`get_amplitude_context`** without `projectId` to list accessible projects.
2. If the user names a project, call again with **`projectId`** for project-scoped settings.
3. If no projects appear, treat as **new-org / access** issue — see [README.md](README.md#existing-org-vs-new-org).

Do not use MCP tools to simulate event traffic or replace SDK initialization in application code.
