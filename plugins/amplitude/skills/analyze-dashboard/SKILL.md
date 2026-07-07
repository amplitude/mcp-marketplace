---
name: analyze-dashboard
description: Deeply analyze Amplitude dashboards by analyzing key charts, surfacing top areas for concern and takeaways, identifying anomalies, then packaging the analysis into a shareable, self-contained HTML report (RAG status table, per-chart visuals linked to Amplitude, prioritized recommendations)
---

# Analyze Dashboard

## When to Use

- Meeting prep: Synthesize a dashboard into a shareable report before a review or exec meeting
- Monitoring / execution validation: Produce a standing health readout for a launch, experiment, or KPI dashboard
- Cross-chart pattern detection: Spot correlations across multiple charts that are hard to see manually
- Dashboard investigation: A key number moved in a chart within this dashboard and you want to explain why
- Connecting quant to qual: Understand if user feedback explains the trends you're seeing
- Onboarding to unfamiliar dashboards: Get up to speed on what a dashboard tracks and its current state

## Output

The deliverable is a **self-contained HTML report** saved to disk (`reports/<yyyymmdd>-<dashboard-slug>-analysis.html`), plus a 2-line verdict in chat with the file path. The report is built from the bundled template at `assets/report-template.html` and contains: a verdict banner, a RAG status-at-a-glance table, one chart card per key chart (each linked to the exact Amplitude chart), prioritized recommendations, and a caveats/sources footer.

## Instructions

### Step 0: Identify the Dashboard ID

If the user gives a URL, use `Amplitude:getting_data_from_url` to get the dashboard ID.

### Step 1: Retrieve the Dashboard

Use `Amplitude:get_dashboard` with the dashboard ID to get the full structure, chart IDs, and the `org` slug (needed to build chart links). Trust the live structure over any prior assumptions about the dashboard.

### Step 2: Query the Charts

Use `Amplitude:query_charts` to fetch data (up to 3 charts at a time). Prioritize:

1. Primary KPI charts (usually at the top)
2. Charts with recent changes
3. Trend-based visualizations

Capture, per chart: the numbers you'll cite, the chart `id`, and the exact chart URL `https://app.amplitude.com/analytics/<org>/chart/<chartId>`.

### Step 3: Analyze Patterns

When analyzing charts, focus on the most decision-relevant signals for each type:
  - KPI tiles: Context (timeframe, user type) and % change if shown.
  - Line / Time series: Trends, slope changes, or notable events (not right-edge noise).
  - Funnel: Major drop-off steps or unexpected retention. Use conversion framing (solid bars), not dropoff framing, unless explicitly relevant. Compare arms/segments at the same anchor step so denominators match.
  - Bar / Categorical: Concentrations, gaps, or surprising distributions.
  - Stacked area: Total volume shifts and changing composition over time.
  - Retention by interval: Compare segments at key intervals (Day 1, Day 7, Day 30).
  - Retention over time: Recent cohorts may show incomplete periods (dotted lines) because they haven't completed the retention window yet—this does NOT mean retention is declining.
  - Tables: Top contributors, dominant players, distribution imbalances.

### Step 4: Contextualize with User Feedback (Optional)

If significant changes or anomalies are detected, check if user feedback can explain them:

1. Use `Amplitude:get_feedback_insights` with the same `projectId`, `dateStart`/`dateEnd` matching the analysis period, filtered by relevant types (`request`, `complaint`, `lovedFeature`, `bug`, `painPoint`).
2. Look for feedback themes that correlate with metric changes (complaints ↔ engagement drops, bugs ↔ conversion dips, loved features ↔ usage increases).
3. If a relevant insight is found, use `Amplitude:get_feedback_mentions` with the `insightId` to pull illustrative quotes.

**Skip this step if:** no feedback sources are configured, no insights match the period/changes, or the changes are minor/expected.

### Step 5: Build the HTML report

Read `assets/report-template.html` (next to this SKILL.md) and fill each `<!-- PLACEHOLDER: ... -->` block. The report has five parts:

1. **Verdict banner** — one-line overall health, an overall RAG dot (🟢/🟡/🔴), and the single most important action or gate. This is the "Overall Health" takeaway.

2. **Status-at-a-glance table** — one row per KPI, area, or check. Columns: **Check | Status | Reading & why**. Status is a colored pill using this rubric:
   - 🟢 **Green** — healthy / behaving as expected.
   - 🟡 **Yellow** — watch, or needs an action but not blocking (e.g. a metric to investigate, a fix in flight, a known caveat).
   - 🔴 **Red** — broken / urgent / off-track.
   Every "Area of Concern" and "Key Takeaway" becomes a row. **Data-quality and instrumentation gaps get their own rows** (e.g. "events missing on screen X", "metric not segmentable by arm").

3. **Chart cards** — one card per key chart. Each card MUST:
   - Link to the exact Amplitude chart (header "Open in Amplitude ↗" and the chart id in the caption both point to `https://app.amplitude.com/analytics/<org>/chart/<chartId>`).
   - Render a faithful Chart.js visualization from the queried data. Add reference lines for targets/baselines where relevant (a reusable dashed-line plugin is included in the template).
   - If a chart cannot be faithfully reproduced (unsupported type, or reproduction would misrepresent it), OMIT the canvas and show only the "Open in Amplitude ↗" link — never ship a chart that contradicts the source.

4. **Recommendations / open items** — up to ~5 concise, action-first bullets, each prefixed with `[p0]`–`[p3]` (p0 = most urgent). If something gates a decision (e.g. a rollout), make it the first bullet.

5. **Footer** — the list of chart IDs used, the "data as of" date, caveats (incomplete/partial periods; non-additive metrics like uniques and rates that can't be summed across intervals; instrumentation gaps), and a **Sources** list of the chart links.

Then save the filled HTML to `reports/<yyyymmdd>-<dashboard-slug>-analysis.html` (create `reports/` if missing; prefer the user's `~/reports/` if that convention exists, else `./reports/`).

### Step 6: Deliver

Give a 2-line verdict in chat (overall health + the top gate/action) and the saved file path. Do not re-explain the whole report in chat — the HTML is the artifact.

## Best Practices

- Be comprehensive in investigation but tight in the report — every row and card should earn its place.
- **RAG discipline:** reserve 🔴 for genuinely broken/urgent; use 🟡 for "watch / action in flight"; don't inflate severity.
- **Link every chart card to Amplitude** so a reader can validate the number at its source. Never put a bare URL in prose — use the card link and the footer Sources list.
- Flag metrics that changed more than 10% week-over-week.
- Do not infer trends from incomplete periods or unreliable data — call those out as caveats instead.
- Note any charts with data-quality or instrumentation issues as their own status rows, not buried in prose.
- Attribute every finding to a specific chart.
- Keep the report self-contained (Chart.js via CDN, no external assets beyond the template) so it can be shared as a single file.
- Do not recap what you did; end after the saved-path + verdict.
