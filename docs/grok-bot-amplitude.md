# Grok Bot — Amplitude data partner (draft)

Engineering preview for a **general Amplitude Grok Bot** (data partner for existing customers). **Not** listed in Cursor/Claude/Codex marketplaces and **must not** be published to xAI's public catalog without approval.

**Linear:** [MCP-836](https://linear.app/amplitude/issue/MCP-836/build-and-validate-an-amplitude-bot-for-the-grok-bot-marketplace) · Agent Analytics bundle: [MCP-840](https://linear.app/amplitude/issue/MCP-840/grok-bot-template-include-agent-analytics-skills)

**Proposal:** [Google Doc](https://docs.google.com/document/d/1WEm3XMXBk7-HoteswKrH_6cuxYp1dWbzU3nW-ve7Iss/edit)

Setup-first bot positioning is **explicitly later** (after agentic signup). This draft validates packaging only.

| Path | Purpose |
| --- | --- |
| [`.grok-plugin/marketplace.json`](../.grok-plugin/marketplace.json) | Draft Grok catalog entry (`amplitude-grok`) |
| [`plugins/amplitude-grok/`](../plugins/amplitude-grok/) | Adapter plugin, onboarding skill, MCP docs, skill manifests |

Primary skill source: [amplitude/builder-skills](https://github.com/amplitude/builder-skills). Supplemental **Agent Analytics** skills (`monitor-ai-quality`, `investigate-ai-session`, `analyze-ai-topics`) are documented in [`CURATED_SKILLS.yaml`](../plugins/amplitude-grok/CURATED_SKILLS.yaml) under `supplemental_agent_analytics` (MCP-840).
