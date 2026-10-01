# Amplitude Grok data-partner bot (DRAFT)

**Status:** Engineering preview only — **not** a published Grok Bot template or marketplace listing.

**Audience:** People who **already have Amplitude** and want an AI data partner for analysis, charts, dashboards, experiments, taxonomy context, and related product workflows.

**Tracking:** [Linear MCP-836](https://linear.app/amplitude/issue/MCP-836/build-and-validate-an-amplitude-bot-for-the-grok-bot-marketplace) · Agent Analytics skills: [MCP-840](https://linear.app/amplitude/issue/MCP-840/grok-bot-template-include-agent-analytics-skills)

This folder is the **Grok-specific packaging adapter**. Skill bodies live primarily in **[amplitude/builder-skills](https://github.com/amplitude/builder-skills)**; supplemental skills may come from [`../amplitude/skills/`](../amplitude/skills/). See [`BUILDER_SKILLS.md`](BUILDER_SKILLS.md) and [`CURATED_SKILLS.yaml`](CURATED_SKILLS.yaml).

**Setup-first promotion is explicitly later** (after agentic signup). Do not position this package as an Amplitude Setup bot.

## What's in this adapter

| Artifact | Purpose |
| --- | --- |
| [`.mcp.json`](.mcp.json) | Amplitude **product** MCP (US default URL) |
| [`MCP.md`](MCP.md) | US/EU OAuth, manual Docs MCP, `get_amplitude_context` verification |
| [`SAFETY.md`](SAFETY.md) | Read-before-write, no invented analytics, MCP ≠ ingestion |
| [`skills/getting-started-with-amplitude/`](skills/getting-started-with-amplitude/SKILL.md) | First-run for **existing** customers |
| [`.grok-plugin/plugin.json`](.grok-plugin/plugin.json) | Grok plugin manifest |
| [`.grok-plugin/marketplace.json`](../../.grok-plugin/marketplace.json) | Draft repo catalog entry |

## Skill strategy (MVP)

1. **Primary:** [builder-skills](https://github.com/amplitude/builder-skills) — especially `analytics-skills/`, plus `execution-skills/` briefs and `product-skills/discover-opportunities`.
2. **Supplemental:** mcp-marketplace-only skills (forensics, taxonomy, consolidated experiment skills, **Agent Analytics** — MCP-840, etc.) — see manifest.
3. **Secondary / optional later:** instrumentation pipeline skills in `plugins/amplitude/skills/` — not the MVP pitch or default first-run path.

### Agent Analytics (MCP-840)

When the project has **Agent Analytics** instrumented, include supplemental skills `monitor-ai-quality`, `investigate-ai-session`, and `analyze-ai-topics` from `plugins/amplitude/skills/`. They query via **`get_amplitude_agent_analytics_info`**. Do not bundle `review-agent-insights` (different MCP surface: `get_agent_results`).

## Bundling options (open for eng)

1. **Pinned multi-repo bundle:** Adapter + builder-skills at fixed SHA + selected supplemental paths from this repo.
2. **Dev monorepo:** Install `amplitude-grok` locally and configure the client to also load builder-skills checkout paths.

## First-run (summary)

1. Confirm user already uses Amplitude (has accessible projects).
2. OAuth product MCP (US or EU).
3. Add Docs MCP manually.
4. `get_amplitude_context` → pick project.
5. Route to analysis workflows (`analyze-chart`, `create-dashboard`, `daily-brief`, etc.) — see onboarding skill.

Details: [`MCP.md`](MCP.md) and the getting-started skill.

## Proposal

Product framing and marketplace requirements: [Google Doc proposal](https://docs.google.com/document/d/1WEm3XMXBk7-HoteswKrH_6cuxYp1dWbzU3nW-ve7Iss/edit) (internal).
