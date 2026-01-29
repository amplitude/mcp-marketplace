# Amplitude Analysis Plugin

> Reusable analysis skills for Amplitude – chart analysis, dashboard reviews, feedback synthesis, and more.

Works with **Claude Code**, **Cursor**, and **Claude**.

---

## Installation

```bash
# Add the Amplitude marketplace (one-time)
/plugin marketplace add amplitude/mcp-marketplace

# Install this plugin
/plugin install amplitude-analysis@amplitude
```

---

## What's Included

| Skill | What it does |
| ----- | ------------ |
| **analyze-chart** | Deep dive into a specific chart to explain trends, anomalies, and likely drivers |
| **analyze-dashboard** | Synthesize dashboards into talking points, surface concerns, connect quant to qual |
| **analyze-feedback** | Synthesize customer feedback into themes (requests, bugs, pain points, praise) |

---

## Requirements

- **MCP-compatible client** – Claude Code, Cursor, or Claude
- **Amplitude MCP** – Required for data access
- **Node.js** – For MCP server
- **Amplitude account** – With API access

---

## Usage

**Just ask naturally** – skills auto-trigger based on your request:

```
"Analyze this chart: [URL]"                    → analyze-chart activates
"Review my KPI dashboard before the meeting"   → analyze-dashboard activates
"What are customers saying about the new feature?" → analyze-feedback activates
```

### Example Workflows

#### Chart Analysis

1. Share a chart URL: "Why did this metric spike last week?"
2. Skill retrieves chart data and identifies the pattern
3. Skill investigates likely drivers (experiments, deployments, segments)
4. You get a structured analysis with hypothesis and next steps

#### Dashboard Review

1. Ask: "Summarize this dashboard for my exec meeting"
2. Skill queries all charts and identifies patterns
3. Skill surfaces areas of concern and key takeaways
4. You get talking points with prioritized recommendations

#### Feedback Synthesis

1. Ask: "What are the top customer complaints this month?"
2. Skill retrieves feedback from all connected sources
3. Skill groups into themes with representative quotes
4. You get prioritized issues with actionable recommendations

---

## MCP Configuration

The Amplitude MCP connection is required for the skills to access your Amplitude data. Configure it in your MCP client settings.

Get your API keys from: Amplitude → Settings → Projects → [Your Project] → API Keys
