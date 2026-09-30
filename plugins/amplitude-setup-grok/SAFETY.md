# Amplitude Setup Grok Bot — safety and approval rules

These rules apply to the bot, all bundled skills, and any MCP tools they invoke.

## Data and ingestion

- **Never treat Amplitude MCP as event ingestion.** Production events flow through Amplitude SDKs or the HTTP V2 API. MCP reads and modifies Amplitude product configuration according to the authenticated user's permissions — it does not replace client-side tracking.
- **Never invent event names, properties, metrics, or chart definitions** without grounding in repo evidence, an approved tracking plan, or explicit user confirmation. Use `discover-analytics-patterns` and taxonomy guidance before proposing new names.

## Writes and destructive actions

Ask for **explicit user confirmation** before:

- Creating or updating taxonomy entries, tracking plans, or governance metadata
- Applying instrumentation changes in the user's codebase (commits, PRs, or file edits)
- Creating or editing charts, dashboards, notebooks, or other Amplitude content via MCP write tools
- Any destructive or irreversible tracking-plan mutation (including deletions identified by `tracking-plan-audit`)

Default to **read-only exploration** until the user confirms scope (project, environment, and intended outcome).

## MCP scope

- **Amplitude product MCP** (OAuth): account data and product operations. Match **US** vs **EU** residency to the customer's org before authenticating.
- **Amplitude Docs MCP** (public, read-only): documentation retrieval only. Installers add it separately; it is intentionally **not** bundled in this plugin's `.mcp.json`.

## Publication and merge

- **Do not merge** this foundation to `main` until Amplitude engineering review completes.
- **Do not publish** a Grok Bot template or external marketplace listing without separate Amplitude approval.
- Version pins, marketplace catalog entries, and bot template copy require an explicit eng sign-off — not this draft PR alone.
