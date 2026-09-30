# Grok Bot — Amplitude data partner (draft)

Engineering preview for a **general Amplitude Grok Bot** (data partner for existing customers). **Not** listed in Cursor/Claude/Codex marketplaces and **must not** be published to xAI's public catalog without approval.

**Linear:** [MCP-836 — Build and validate an Amplitude bot for the Grok Bot Marketplace](https://linear.app/amplitude/issue/MCP-836/build-and-validate-an-amplitude-bot-for-the-grok-bot-marketplace)

**Proposal:** [Google Doc](https://docs.google.com/document/d/1WEm3XMXBk7-HoteswKrH_6cuxYp1dWbzU3nW-ve7Iss/edit)

Setup-first bot positioning is **explicitly later** (after agentic signup). This draft validates packaging only.

| Path | Purpose |
| --- | --- |
| [`.grok-plugin/marketplace.json`](../.grok-plugin/marketplace.json) | Draft Grok catalog entry (`amplitude-grok`) |
| [`plugins/amplitude-grok/`](../plugins/amplitude-grok/) | Adapter plugin, onboarding skill, MCP docs, skill manifests |

Primary skill source: [amplitude/builder-skills](https://github.com/amplitude/builder-skills). See [`plugins/amplitude-grok/BUILDER_SKILLS.md`](../plugins/amplitude-grok/BUILDER_SKILLS.md).
