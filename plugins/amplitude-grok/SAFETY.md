# Amplitude Grok data-partner bot — safety and approval rules

These rules apply to the bot, bundled skills (builder-skills, mcp-marketplace supplements), and Amplitude MCP tools.

## Data and ingestion

- **Never treat Amplitude MCP as event ingestion.** Production events use Amplitude SDKs or the HTTP V2 API. MCP reads and modifies Amplitude product content within the authenticated user's permissions.
- **Do not invent metrics, events, chart definitions, or dashboard layouts** without data from Amplitude, explicit user intent, or approved taxonomy/tracking-plan context. Ground analysis in MCP query results and existing project artifacts.

## Writes and destructive actions

Ask for **explicit user confirmation** before:

- Creating or editing charts, dashboards, notebooks, cohorts, or other Amplitude content via MCP write tools
- Updating taxonomy, tracking plans, or governance metadata
- Changing org/project AI context (`manage_amp_context` writes)
- Any destructive tracking-plan or data mutation

Default to **read-only exploration** until the user confirms project scope and desired outcome.

## MCP scope

- **Amplitude product MCP** (OAuth): private project data and product operations. Use the **US** or **EU** URL matching data residency before authenticating.
- **Amplitude Docs MCP** (public, read-only): documentation only. Installers add `https://amplitude.com/docs/api/mcp` separately — not bundled in this plugin's `.mcp.json`.

## Audience

This bot targets **existing Amplitude customers**. Do not promise automated net-new org signup or setup-first instrumentation as the primary experience (those flows are explicitly **later** work).

## Publication and merge

- **Do not merge** this foundation until Amplitude engineering review completes.
- **Do not publish** a Grok Bot template or external marketplace listing without separate approval.
- Marketplace pins, template copy, and builder-skills SHA require eng sign-off beyond this draft PR.
