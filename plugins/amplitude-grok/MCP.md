# MCP connection — Amplitude Grok data-partner bot

Two MCP servers work together. Only the **product** server belongs in this plugin's [`.mcp.json`](.mcp.json). Installers must add **Docs MCP** separately.

## 1. Amplitude product MCP (OAuth)

Query and modify Amplitude content with the user's permissions. **Not** an event ingestion endpoint.

| Region | URL |
| --- | --- |
| United States (default) | `https://mcp.amplitude.com/mcp` |
| EU data residency | `https://mcp.eu.amplitude.com/mcp` |

Optional progressive tool discovery (if supported):

- US: `https://mcp.amplitude.com/mcp?discovery=progressive`
- EU: `https://mcp.eu.amplitude.com/mcp?discovery=progressive`

### Bundled default (this plugin)

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

**EU customers:** set `url` to `https://mcp.eu.amplitude.com/mcp` before OAuth.

### Authenticate

1. Add the server in the client's MCP settings.
2. Complete **Amplitude OAuth** in the browser.
3. Verify with **`get_amplitude_context`** (no `projectId`) — list orgs/projects the user can access.

If nothing appears, check US vs EU URL mismatch before debugging permissions.

## 2. Amplitude Docs MCP (public, read-only)

**Not** in `plugins/amplitude/.mcp.json` or this plugin's `.mcp.json`. Add manually for every install.

| Setting | Value |
| --- | --- |
| Name (suggested) | `amplitude-docs` |
| URL | `https://amplitude.com/docs/api/mcp` |
| Auth | None |

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

Docs: [Amplitude Docs MCP Server](https://amplitude.com/docs/amplitude-ai/docs-mcp-server).

Use Docs MCP for product how-to questions; use product MCP for **your** charts, dashboards, and project data.

## 3. Confirm project (existing customers)

This bot assumes the user **already has Amplitude**.

1. Call **`get_amplitude_context`** without `projectId`.
2. If the user names a project, call again with **`projectId`** for scoped context.
3. If no projects are visible, stop and help troubleshoot OAuth/residency/access — do not pivot to setup-first signup promises in this MVP.

## References

- [Amplitude MCP Server](https://amplitude.com/docs/amplitude-ai/amplitude-mcp)
- [Connect to other MCP clients](https://amplitude.com/docs/amplitude-ai/amplitude-mcp/other-clients)
