# Amplitude MCP Marketplace

Open-source plugins and skills for [Amplitude](https://amplitude.com) MCP users. Turn your AI coding assistant into a product manager and analytics powerhouse.

Works with **Claude**, **Claude Code**, **Cursor**, and **Codex**.

---

## What's Inside

| Plugin                            | Description                                                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [amplitude](./plugins/amplitude/) | Reusable analysis and instrumentation skills covering charts, dashboards, experiments, session replays, reliability, AI agent analytics, and analytics tracking workflows |

---

## Amplitude Plugin

The amplitude plugin turns your AI assistant into an expert product analyst and instrumentation partner. Skills are organized into seven areas:

### Core Analytics

| Skill               | What it does                                                                 |
| ------------------- | ---------------------------------------------------------------------------- |
| `create-chart`      | Creates Amplitude charts from natural language descriptions                  |
| `create-dashboard`  | Builds dashboards from requirements, organizing charts into logical sections |
| `analyze-chart`     | Deep-dives a chart to explain trends, anomalies, and likely drivers          |
| `analyze-dashboard` | Reviews a dashboard end-to-end, surfacing key takeaways and areas of concern |

### Product Insights

| Skill                    | What it does                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `analyze-experiment`     | Designs A/B tests, monitors running experiments, and interprets results                        |
| `monitor-experiments`    | Triages all active and recently completed experiments by importance                            |
| `analyze-feedback`       | Synthesizes customer feedback into themes — feature requests, bugs, pain points, praise        |
| `analyze-account-health` | Summarizes B2B account health with usage patterns, risk signals, and expansion opportunities   |
| `discover-opportunities` | Finds product opportunities by cross-referencing analytics, experiments, replays, and feedback |
| `compare-user-journeys`  | Compares two user groups side-by-side to surface behavioral differences                        |

### Session Replay & Debugging

| Skill                 | What it does                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `debug-replay`        | Turns bug reports into numbered reproduction steps by extracting the interaction timeline from Session Replay |
| `replay-ux-audit`     | Watches multiple session replays for a flow and synthesizes a ranked friction map                             |
| `diagnose-errors`     | Triages product issues across network failures, JS errors, and error clicks                                   |
| `monitor-reliability` | Proactive reliability report from auto-captured error data so issues surface before users complain            |

### AI Agent Analytics

| Skill                    | What it does                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| `analyze-ai-topics`      | Analyzes what users ask AI agents about and how well each topic is served                       |
| `investigate-ai-session` | Deep-dives specific AI agent sessions or failure patterns for root-cause analysis               |
| `monitor-ai-quality`     | Delivers a proactive health report on AI agents covering quality, cost, performance, and errors |

### Analytics Instrumentation

| Skill                           | What it does                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `diff-intake`                   | Reads a PR or branch diff and outputs a structured `change_brief` YAML for downstream skills                  |
| `discover-event-surfaces`       | From a change brief, lists candidate analytics events for PM prioritization                                   |
| `discover-analytics-patterns`   | Maps how analytics is already implemented in the repo (SDK calls, naming, imports)                            |
| `instrument-events`             | From prioritized event candidates, builds a concrete instrumentation plan and JSON tracking plan              |
| `add-analytics-instrumentation` | End-to-end workflow — reads code, decides what to track, and produces a full instrumentation plan in one pass |

A typical flow: `diff-intake` → `discover-event-surfaces` → `instrument-events`, with `discover-analytics-patterns` ensuring new tracking matches existing conventions.

### Briefings

| Skill          | What it does                                                                  |
| -------------- | ----------------------------------------------------------------------------- |
| `daily-brief`  | Morning briefing of the most important changes across your Amplitude instance |
| `weekly-brief` | Weekly recap of trends, wins, and risks to share with your team or leadership |

### Bonus

| Skill                 | What it does                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| `what-would-lenny-do` | Answers product strategy questions by searching Lenny Rachitsky's archive (requires `lennysdata` MCP) |

---

## Quick Start

### Claude Code

```bash
# Add the Amplitude marketplace (one-time)
/plugin marketplace add amplitude/mcp-marketplace

# Install the plugin
/plugin install amplitude@amplitude
```

### Cursor

1. Go to Cursor Settings > Plugins
2. Search for the **Amplitude Analytics** plugin and install it
3. Verify the skills are available by typing `/`
4. Add the Amplitude MCP server: Settings > Agent > Tools & MCP > Add MCP Server
5. Use this config:

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

6. Complete the OAuth flow in the browser when prompted

---

## Repository Structure

```text
.claude-plugin/
  marketplace.json            # Marketplace catalog
plugins/
  amplitude/
    .claude-plugin/
      plugin.json             # Plugin manifest
    skills/
      add-analytics-instrumentation/
      analyze-account-health/
      analyze-ai-topics/
      analyze-chart/
      analyze-dashboard/
      analyze-experiment/
      analyze-feedback/
      compare-user-journeys/
      create-chart/
      create-dashboard/
      daily-brief/
      debug-replay/
      diagnose-errors/
      diff-intake/
      discover-analytics-patterns/
      discover-event-surfaces/
      discover-opportunities/
      instrument-events/
      investigate-ai-session/
      monitor-ai-quality/
      monitor-experiments/
      monitor-reliability/
      replay-ux-audit/
      weekly-brief/
      what-would-lenny-do/
```

---

## Requirements

- **MCP-compatible client** – Claude Code, Cursor, Claude, and Codex
- **Amplitude account** with API access
- **Node.js** – for the MCP server

---

## Contributing

We welcome contributions! Whether it's a new skill or improvement:

1. Fork this repo
2. Create a new branch for your feature
3. Follow the existing patterns in `plugins/` for structure
4. Submit a PR with a clear description

---

## Resources

- [Amplitude Docs](https://amplitude.com/docs)
- [MCP Protocol](https://modelcontextprotocol.io/)

---

## License

MIT

---

## Support

- **Issues**: [GitHub Issues](https://github.com/amplitude/mcp-marketplace/issues)
- **Amplitude**: [amplitude.com](https://amplitude.com)
