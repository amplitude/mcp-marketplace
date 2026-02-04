# Amplitude Analysis Plugin

> Reusable analysis skills for Amplitude – chart creation, chart analysis, dashboard reviews, experiment analysis, feedback synthesis, account health analysis, and more.

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
| **analyze-account-health** | Summarize B2B account health – usage patterns, engagement trends, risk signals, expansion opportunities |
| **analyze-chart** | Deep dive into a specific chart to explain trends, anomalies, and likely drivers |
| **analyze-dashboard** | Synthesize dashboards into talking points, surface concerns, connect quant to qual |
| **analyze-experiment** | Design A/B tests, analyze running or completed experiments, interpret results with statistical rigor |
| **analyze-feedback** | Synthesize customer feedback into themes (requests, bugs, pain points, praise) |
| **create-chart** | Create Amplitude charts from natural language – event discovery, filters, groupings, visualization |

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
"Analyze this chart: [URL]"                        → analyze-chart activates
"Review my KPI dashboard before the meeting"       → analyze-dashboard activates
"What are customers saying about the new feature?" → analyze-feedback activates
"How healthy is Acme Corp's account?"              → analyze-account-health activates
"Analyze the results of our onboarding experiment" → analyze-experiment activates
"Create a chart showing weekly active users"       → create-chart activates
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

#### Account Health Analysis

1. Ask: "Prepare an account review for Acme Corp before our QBR"
2. Skill analyzes usage trends, engagement, and user-level activity
3. Skill correlates behavioral data with customer feedback
4. You get a health score, risk factors, champions to leverage, and specific CS recommendations

#### Experiment Analysis

1. Ask: "Should we ship the new checkout flow experiment?"
2. Skill retrieves experiment configuration and results
3. Skill evaluates statistical significance, segment performance, and guardrail metrics
4. You get a ship/no-ship recommendation with confidence levels and business impact

#### Chart Creation

1. Ask: "Create a chart showing weekly AI feature users over the last 90 days"
2. Skill discovers relevant events and validates data availability
3. Skill builds the chart definition with proper filters and groupings
4. You get a working chart URL with explanation of methodology and initial insights

---

## MCP Configuration

The Amplitude MCP connection is required for the skills to access your Amplitude data. Configure it in your MCP client settings.

Get your API keys from: Amplitude → Settings → Projects → [Your Project] → API Keys
