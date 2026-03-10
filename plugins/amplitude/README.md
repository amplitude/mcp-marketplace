# Amplitude Analysis Plugin

> Reusable analysis skills for Amplitude – chart creation, dashboard creation, chart analysis, dashboard reviews, experiment analysis, experiment monitoring, opportunity discovery, feedback synthesis, account health analysis, daily and weekly briefs, and more.

Works with **Claude Code**, **Cursor**, and **Claude CLI**.

---

## Installation

Claude Code: (CLI Application)
```bash
# Add the Amplitude marketplace (one-time)
/plugin marketplace add amplitude/mcp-marketplace

# Install this plugin
/plugin install amplitude@amplitude
```

Cursor:
- Go to cursor settings
- Click on Plugins
- Look for the Amplitude Analytics plugin
- Install the plugin
- You can test if the skills exist by typing /
- For the skills to work you need to have the amplitude MCP server
- You can add the MCP server to cursor by going to agent settings
- Agent settings -> Tools & MCP -> Add a new MCP server
- Add the following server to the config:
    "amplitude-us": {
        "command": "npx",
        "args": [
            "-y",
            "mcp-remote",
            "https://mcp-server.prod.us-west-2.amplitude.com/v1/mcp"
        ]
    }
- This should take you to the browser to complete the 0Auth flow

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
| **create-dashboard** | Build dashboards from requirements or goals – organize charts into logical sections with layouts |
| **daily-brief** | Deliver a concise daily briefing – metric anomalies, experiment updates, feedback, and deployment context from the last 1-2 days |
| **weekly-brief** | Deliver a weekly summary – week-over-week trends, wins, risks, inflection points, and strategic recommendations |
| **discover-opportunities** | Discover product opportunities by mining analytics, experiments, replays, and feedback — synthesized into RICE-scored, actionable recommendations |
| **monitor-experiments** | Monitor active and recently completed experiments, triage by importance, and deep-dive on the most impactful ones |

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
"Build a dashboard for our growth team"            → create-dashboard activates
"Give me my daily download"                        → daily-brief activates
"Find product opportunities"                       → discover-opportunities activates
"Check on experiments"                             → monitor-experiments activates
"What happened this week?"                         → weekly-brief activates
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

#### Dashboard Creation

1. Ask: "Build an executive dashboard for our product launch"
2. Skill clarifies audience, decisions, and review cadence
3. Skill finds existing charts and identifies gaps needing new charts
4. You get a structured dashboard with logical sections, appropriate layouts, and context

#### Daily Brief

1. Ask: "Give me my morning briefing" or "Anything I should know today?"
2. Skill discovers your dashboards, queries charts, checks experiments, feedback, and deployments
3. Skill identifies the biggest day-over-day changes and validates against false positives
4. You get a concise, narrative briefing with key findings and concrete priorities for today

#### Discover Opportunities

1. Ask: "Find me the biggest product opportunities" or "Where are we losing users in onboarding?"
2. Skill mines dashboards, funnels, experiments, feedback, and session replays for signals
3. Skill synthesizes findings into structured opportunities with RICE scoring and multi-source evidence
4. You get a prioritized list of actionable opportunities with specific recommendations and supporting data links

#### Experiment Monitor

1. Ask: "Check on experiments" or "What experiments are running?"
2. Skill scans all active and recently completed experiments across projects
3. Skill triages by importance — flagging stale decisions, long-running tests, and missing metrics
4. You get a portfolio summary with deep-dives on the most impactful experiments, including statistical analysis and ship/iterate/abandon recommendations

#### Weekly Brief

1. Ask: "Give me my weekly summary" or "What happened this week?"
2. Skill gathers week-over-week trends across dashboards, experiments, feedback, and deployments
3. Skill detects accelerating trends, inflection points, and new highs/lows over the trailing 4 weeks
4. You get a shareable memo with key findings, what's working, and next week's priorities

---

## MCP Configuration

The Amplitude MCP connection is required for the skills to access your Amplitude data. Configure it in your MCP client settings.

Get your API keys from: Amplitude → Settings → Projects → [Your Project] → API Keys
