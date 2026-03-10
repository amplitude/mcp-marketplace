---
name: monitor-experiments
description: Monitors all active and recently completed experiments across Amplitude projects, triages them by importance, then runs deep analysis and reporting on the most impactful ones. Use when the user asks to "check on experiments", "experiment status", "experiment review", "what experiments are running", or wants a periodic experiment health report.
---

# Experiment Monitor & Report Generator

Scan active and recently completed experiments, triage by importance, deep-dive on the ones that matter.

---

## CRITICAL: Managing Response Sizes

1. **`get_experiments`: 3-5 IDs max per call.** Filter using `search` results BEFORE fetching.
2. **`query_experiment` responses are large.** Extract only `summary` objects and validity flags. Ignore `timeseries`, `xValues`, bulk arrays.
3. **Segment `groupBy` calls are the largest (500K+ chars).** Only run for top 1-2 experiments. Start with `country` only; add dimensions only if asked.
4. **Metric name resolution**: `search` does NOT match metric IDs in `queries`. Search with `entityTypes: ["METRIC"]`, empty `queries`, `limitPerQuery: 50`, scoped to project. Match IDs from results.

---

## Instructions

### Step 1: Context & Discovery

1. Call `Amplitude:get_context`. If multiple projects, ask which to monitor.
2. Search for experiments:
```
Amplitude:search({
  entityTypes: ["EXPERIMENT"],
  appIds: [projectId],
  queries: [],
  sortOrder: "lastModified",
  sortDirection: "DESC",
  limitPerQuery: 50
})
```
3. Pre-filter to experiments modified in last 30 days before fetching metadata.

---

### Step 2: Metadata & Metric Names

1. Call `Amplitude:get_experiments` in batches of 3-5 IDs (only pre-filtered ones).
2. Extract: state, dates/duration, variants, metric IDs (primary where recommendation=true), decision.
3. Filter to: running + completed within 14 days. Exclude drafts/disabled.
4. Resolve metric names via `Amplitude:search({ entityTypes: ["METRIC"], appIds: [projectId], queries: [], limitPerQuery: 50 })`. Build `{ id: name }` mapping.

---

### Step 3: Triage

Present summary table. Auto-prioritize by:
1. Completed without decisions
2. Long-running (>30 days)
3. No metrics configured
4. Recently started (<7 days)

Ask which to deep-dive, default to top 2.

---

### Step 4: Deep-Dive & Report (per experiment)

For each selected experiment, run the tool calls below and output the report in a single pass. Don't repeat data — each finding appears once.

**Output format — keep it tight:**

```
## [Experiment Name]
[State] | [Duration]d | Control: [N] / Treatment: [N] | [Link]
```

#### 4a: Primary Metric

Call `Amplitude:query_experiment({ id: "<id>" })` (no metricIds).

Extract from `summary`: per-variant mean, num, variance, relativeLift, pValue, CI bounds, is_stat_sig. Also: `recommendation`, `takeaway`.

Report as:

```
### [Metric Name]: [Verdict word — e.g. "Significant negative" or "No effect"]

| Variant | Value | Lift | 95% CI | P-value |
|---------|-------|------|--------|---------|
| Control | [X] | — | — | — |
| Treatment | [Y] | [+Z%] | [A, B] | [P] |

Amplitude says: [recommendation]. [takeaway].
```

One sentence on practical significance if lift is small (<2%) or very large (>20%).

#### 4b: Data Quality

Extract from the same response. Report **only issues found** — if everything passes, one line: "All quality checks pass."

If issues exist, report as a compact list:
```
### Data Quality: [N issues found]
- **SRM detected** — actual split [X%/Y%] vs expected [50/50]
- **Validity flag:** [flag name] — [one-sentence meaning]
- **CI precision:** Low ([X]% of baseline)
- **Sample size:** Moderate ([N] per variant)
```

**Quality checks to run:**
- SRM: `srmDetected` field
- Traffic balance: flag if >10% deviation from expected
- Sample size: <100 insufficient, 100-1000 moderate, 1000+ adequate
- CI precision: `(upper - lower) / abs(control_mean) * 100` — >10% low, 5-10% moderate, <5% high
- 7 validity flags — only report failures:

| Flag | Meaning | Severity |
|------|---------|----------|
| `statsAssumptionsMetForWholeExperiment` = false | Stats assumptions violated | High |
| `hasSuspiciousUplift` = true | Possible measurement error | High |
| `isVariancePositive` = false | Tests invalid | Critical |
| `isConfidenceIntervalNotFlipped` = false | CI error | Critical |
| `isStandardErrorLargeEnough` = false | Unreliable inference | Medium |
| `isPointEstimateInsideConfidenceInterval` = false | Numerical instability | High |
| `isMeanValid` = false | Cannot analyze | Critical |

#### 4c: Secondary Metrics

Call `Amplitude:query_experiment({ id: "<id>", metricIds: [...] })`.

Report as compact list — one line per metric:
```
### Secondary Metrics
- **[Name]:** [+X%, p=P] — [OK / Concerning / Blocker]
- **[Name]:** No sig change (p=P)
```

Only elaborate on metrics that are concerning. If 5+ metrics, note Bonferroni correction.

#### 4d: Segments (top 1-2 experiments only)

Call `Amplitude:query_experiment` with `groupBy: [{"type": "user", "value": "country", "group_type": "User"}]`, `groupByLimit: 10`.

```
### Segments (Country)
| Country | Ctrl | Trt | Lift | Sig? |
|---------|------|-----|------|------|
| US | 34.5% (n=339) | 27.5% (n=1061) | -20% | No |
```

Note Simpson's Paradox only if detected. Skip the section entirely if segments tell the same story as the overall result — just say "Consistent across segments."

#### 4e: Power Analysis

Compute from 4a data. Show the math inline, report results compactly:

```
### Power
Cohen's d=[X] → need [N]/variant for 80% power → currently [N] → power ≈[X]%
[Assessment: Well-powered / Underpowered — ~X more days needed at Y/day]
```

**Formulas:**
1. `pooled_var = (ctrl_var + trt_var) / 2`
2. `d = (MDE * ctrl_mean) / sqrt(pooled_var)` — MDE defaults to 0.05
3. `required_n = ceil(15.7 / d^2)`
4. `x = d * sqrt(min(ctrl_n, trt_n) / 2) - 1.96` → lookup power:

| x | Power |
|---|-------|
| -1.0 | 16% |
| -0.5 | 31% |
| 0.0 | 50% |
| 0.5 | 69% |
| 0.84 | 80% |
| 1.0 | 84% |
| 1.5 | 93% |
| 2.0 | 98% |

5. Days remaining: `ceil((required_n - current_n) / (current_n / duration_days))`

**Caveat:** If observed effect >> MDE, significance can be achieved despite low "MDE power." Note when this occurs.

#### 4f: Feedback (only if primary is significant)

Call `Amplitude:get_feedback_insights` with experiment-related keywords. Report 2-3 themes in one line each.

#### 4g: Verdict

```
### Verdict: [SHIP / ITERATE / ABANDON / EXTEND]
1. [Primary metric finding — one sentence]
2. [Quality / guardrail status — one sentence]
3. [Segment or power insight — one sentence]
```

Decision matrix (internal reference, don't output this):

| Signal | Ship | Iterate | Abandon | Extend |
|--------|------|---------|---------|--------|
| Primary | Sig positive + practical | Sig positive but guardrail issue | Sig negative or blocker | Not yet significant |
| Quality | All pass | Minor flags | SRM or critical flags | Insufficient |
| Guardrails | Neutral/positive | 1 marginal regression | Significant regression | Not enough data |
| Segments | Consistent | Key segments positive | Key segments negative | Mixed |
| Power | Well-powered | Well-powered | Well-powered | Underpowered |

---

### Step 5: Portfolio Summary

After all deep-dives, output one table and categorized action items:

```
## Portfolio Summary

| Experiment | Lift | Sig? | Quality | Verdict | Action |
|-----------|------|------|---------|---------|--------|

**Act now:** [experiments needing decisions]
**Monitor:** [recently started or extending]
**Configure:** [missing metrics]
```

---

## Edge Cases

- **No experiments:** Report clearly, suggest other projects
- **No data (<24hrs):** Note setup, check back in 7 days
- **SRM detected:** Lead with this — can invalidate everything
- **10+ experiments:** Triage first, deep-dive top 2, offer batches
- **Response too large / saved to disk:** Extract `summary` + validity flags only
- **No metrics configured:** Flag in triage — can't analyze without metrics
