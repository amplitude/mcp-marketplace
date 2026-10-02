# builder-skills integration

The Grok marketplace bot is a **general Amplitude data partner** for people who **already have Amplitude**. The primary skill surface lives in **[amplitude/builder-skills](https://github.com/amplitude/builder-skills)** — not duplicated in this repo.

## How bundling should work (eng decision)

At install/publish time, combine:

1. **This adapter** (`plugins/amplitude-grok/`) — Grok metadata, `.mcp.json`, first-run skill
2. **builder-skills** — clone or submodule at a **pinned commit**; load selected plugin folders
3. **Supplemental skills** from `plugins/amplitude/skills/` in *this* repo when a capability exists only here (see [`CURATED_SKILLS.yaml`](CURATED_SKILLS.yaml))

Do **not** assume a single folder contains every SKILL body until CI assembles the bundle. This document records intent and paths only.

## Primary builder-skills plugins

| Plugin folder | Role for the Grok bot |
| --- | --- |
| [`analytics-skills/`](https://github.com/amplitude/builder-skills/tree/main/analytics-skills) | Charts, dashboards, experiments, feedback, account health, custom agents |
| [`execution-skills/`](https://github.com/amplitude/builder-skills/tree/main/execution-skills) | `daily-brief` / `weekly-brief` commands and stakeholder workflows |
| [`product-skills/`](https://github.com/amplitude/builder-skills/tree/main/product-skills) | `discover-opportunities` and adjacent PM workflows that pull Amplitude data |

Optional later: `growth-skills/`, `launch-skills/`, `engineering-skills/` (instrumentation is **not** MVP positioning).

## analytics-skills inventory (reference)

Paths relative to repo root `amplitude/builder-skills`:

- `analytics-skills/skills/analyze-chart`
- `analytics-skills/skills/analyze-dashboard`
- `analytics-skills/skills/analyze-experiment`
- `analytics-skills/skills/analyze-feedback`
- `analytics-skills/skills/analyze-account-health`
- `analytics-skills/skills/create-chart`
- `analytics-skills/skills/create-dashboard`
- `analytics-skills/skills/monitor-experiments`
- `analytics-skills/skills/analyze-mcp-server`
- `analytics-skills/skills/create-custom-agent`
- `analytics-skills/skills/churn-lost-deal-analysis`
- `analytics-skills/skills/support-feedback-prioritization`

Agent routing hints: [`AGENTS.md`](https://github.com/amplitude/builder-skills/blob/main/AGENTS.md) in builder-skills.

## Relationship to mcp-marketplace `plugins/amplitude`

Many skill **names** overlap between builder-skills and this repo. For the Grok bot MVP, **prefer builder-skills copies** for the analysis surface unless eng standardizes on one source of truth (see MCP-836). Use mcp-marketplace-only skills listed under `supplemental` and `supplemental_agent_analytics` in [`CURATED_SKILLS.yaml`](CURATED_SKILLS.yaml).

## Agent Analytics (mcp-marketplace supplement, MCP-840)

These skills live only under `plugins/amplitude/skills/` in this repo. They apply when the customer's project has **Amplitude Agent Analytics** instrumented (not the same as in-product AI agent insights).

| Skill | Typical ask |
| --- | --- |
| `monitor-ai-quality` | Agent health, LLM cost, quality regressions |
| `investigate-ai-session` | Drill into a failed or low-quality agent session |
| `analyze-ai-topics` | What users ask agents about and topic-level quality |

All three use MCP tool **`get_amplitude_agent_analytics_info`** (plus `get_amplitude_context` for project scope).

**Out of scope for this bundle:** `review-agent-insights` — that skill uses **`get_agent_results`** for Amplitude in-product AI agents, not Agent Analytics SDK data.

## Explicitly later (not MVP pitch)

- Setup-first onboarding or agentic signup flows
- Instrumentation pipeline as the default first-run path (`engineering-skills/instrument-pr`, mcp-marketplace `add-analytics-instrumentation`, etc.)
