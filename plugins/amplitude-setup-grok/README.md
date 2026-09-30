# Amplitude Setup — Grok Bot adapter (DRAFT)

**Status:** Engineering preview only. Not a published Grok Bot template or marketplace listing.

This folder is the **Grok-specific packaging layer** for an Amplitude Setup bot. Canonical skills remain under [`../amplitude/skills/`](../amplitude/skills/). This adapter adds:

- First-run skill: [`getting-started-with-amplitude`](skills/getting-started-with-amplitude/SKILL.md)
- Product MCP defaults in [`.mcp.json`](.mcp.json) (same URL as [`../amplitude/.mcp.json`](../amplitude/.mcp.json))
- Installer docs for **Amplitude Docs MCP** (not in `.mcp.json` by design)
- Curated skill manifest: [`CURATED_SKILLS.yaml`](CURATED_SKILLS.yaml)
- Safety rules: [`SAFETY.md`](SAFETY.md)

Repo-level Grok catalog (draft): [`.grok-plugin/marketplace.json`](../../.grok-plugin/marketplace.json).

## What installers get

| Component | Source | Notes |
| --- | --- | --- |
| Amplitude product MCP | This plugin `.mcp.json` | OAuth; US default URL |
| Amplitude Docs MCP | **Manual** — see [`MCP_SETUP.md`](MCP_SETUP.md) | Public read-only docs |
| Setup onboarding skill | This plugin `skills/` | Grok first-run |
| Instrumentation & setup skills | `plugins/amplitude/skills/` | Listed in `CURATED_SKILLS.yaml` |

### Bundling options (open for eng)

1. **Monorepo install (recommended for dev):** Point Grok at this repo; install plugin `amplitude-setup-grok` and ensure the client also loads [`../amplitude`](../amplitude) skills (or symlink/copy at packaging time).
2. **Single artifact later:** CI could assemble one `skills/` tree from `CURATED_SKILLS.yaml` without duplicating SKILL bodies in git.

## First-run checklist (human or agent)

1. **Region:** Confirm Amplitude data residency (US vs EU) — see [`MCP_SETUP.md`](MCP_SETUP.md).
2. **OAuth:** Connect Amplitude product MCP and complete browser OAuth.
3. **Docs MCP:** Add `https://amplitude.com/docs/api/mcp` as a separate HTTP MCP server.
4. **Project context:** Run `get_amplitude_context` (no `projectId` first) and confirm org/projects with the user.
5. **Path:** Existing org → instrumentation/chart skills. New org signup → see limitations below.
6. **Safety:** Read [`SAFETY.md`](SAFETY.md); confirm before any writes.

## Existing org vs new org

| Path | When | Bot behavior |
| --- | --- | --- |
| **Existing org** | User already has Amplitude projects | Full setup flow: patterns → instrumentation → optional charts/dashboards |
| **New org** | User needs a brand-new Amplitude organization | **Known limitation:** end-to-end signup/onboarding via MCP may be incomplete or blocked pending product e2e. Use Docs MCP for setup guidance; defer project-scoped MCP writes until the user confirms a project exists |

## Curated skills (canonical paths)

All paths relative to `plugins/amplitude/` unless noted:

- `add-analytics-instrumentation`
- `diff-intake`
- `discover-event-surfaces`
- `discover-analytics-patterns`
- `instrument-events`
- `taxonomy`
- `tracking-plan-audit`
- `create-chart`
- `create-dashboard`

Plus adapter-only: `getting-started-with-amplitude` (this plugin).

Typical instrumentation chain: `diff-intake` → `discover-event-surfaces` → `instrument-events`, with `discover-analytics-patterns` for conventions.

## Related docs

- [Amplitude MCP Server](https://amplitude.com/docs/amplitude-ai/amplitude-mcp)
- [Amplitude Docs MCP Server](https://amplitude.com/docs/amplitude-ai/docs-mcp-server)
- [Connect Amplitude MCP to other clients](https://amplitude.com/docs/amplitude-ai/amplitude-mcp/other-clients)

## Internal coordination

Discussion thread (Slack): linked from the draft PR description — not duplicated in this public repo.
