---
name: analyze-experiments
description: Designs A/B tests with proper metrics and variants, analyzes running or completed experiments, and interprets results with statistical rigor. Use when setting up experiments, checking experiment status, analyzing results, or making ship decisions.
---

# Experiment Analyst

Perform comprehensive, detailed deep-dive analysis of experiments to make data-driven ship/no-ship decisions. This is NOT a quick summary - provide thorough insights with specific numbers and business implications.

## When to Use

- Analyzing completed experiment results for ship decisions
- Checking on running experiment progress and early signals
- Understanding why an experiment succeeded or failed
- Investigating unexpected results or segment-level effects

---

## Analysis Philosophy

**Be comprehensive, not brief:**
- Include specific numbers, percentages, and data points
- Explain statistical meaning AND business implications in plain language
- Cover all metrics (primary, secondary, guardrails) with actual values
- This is a single comprehensive analysis - do not rush or provide superficial summaries

---

## Instructions

### Step 0: Identify Experiment

**If user provides a specific experiment:**
- Accept experiment **URL or experiment ID**
- If URL: use `Amplitude:get_from_url` to extract details
- If ID: proceed to Step 1

**If user asks about experiments generally:**
- Use `Amplitude:search` with `entityTypes: ["EXPERIMENT"]` and relevant query terms
- Present top 3-5 matches with names, IDs, and states
- Ask user which experiment to analyze

**If no experiment specified:**
- Ask explicitly for experiment URL, ID, or search terms and stop

---

### Step 1: Retrieve and Validate Setup

Use `Amplitude:get_experiments` with experiment ID to capture:

- Experiment name, key, description, and state
- Start/end dates and duration
- Variants: names, traffic allocation
- Attached metrics: primary (recommendation=true), secondary, guardrails (stores as IDs)
- Bucketing strategy

**Get metric names:**
- Extract metric IDs from the experiment response (e.g., "c4pn8fkv")
- **CRITICAL: Amplitude MCP cannot retrieve metric names by ID directly**
- Workaround options:
  1. Search for experiment-related charts using `Amplitude:search` with `entityTypes: ["CHART"]` and experiment name
  2. Use `Amplitude:get_charts` on related charts to examine their definitions for metric references
  3. Check if experiment description contains links to metric documentation
- If metric names cannot be found, report as descriptive placeholders:
  - Primary metric: "Primary Goal Metric (ID: {id})"
  - Secondary metrics: "Secondary Metric {index} (ID: {id})"
  - Include metric IDs so users can look them up in Amplitude UI

**Validation:**
- Is experiment running or completed? (not draft)
- Has it run for 1+ weeks?
- Are variants and metrics clearly defined?

If incomplete, explain what's missing and stop.

---

### Step 2: Check Data Quality (with explicit thresholds)

Use `Amplitude:query_experiment` (primary metric only) to assess:

**Traffic Balance:**
- Report actual traffic split per variant (e.g., 48.2% control, 51.8% treatment)
- **Flag if >10% deviation from expected** (e.g., 50/50 should be 45-55% range)
- Severe imbalance indicates instrumentation issue

**Sample Size:**
- Report total users per variant with specific numbers
- **Flag if <100 users per variant** (insufficient for any conclusion)
- **Flag if 100-1000 users** (directional signals only, not confident decision)
- Need 1000+ per variant for confident decisions

**Sample Ratio Mismatch (SRM):**
- If traffic split deviates >5% from expected, flag as SRM
- Severe SRM can invalidate results

**Temporal Stability:**
- Check if primary metric is stable day-over-day
- Note ramp period (first 24-48hrs) or day-of-week effects

**Document all data quality issues found** - these affect result reliability.

---

### Step 3: Analyze Primary Metric

Use `Amplitude:query_experiment` **without metricIds** to get primary metric only.

**Use metric name from Step 1** - Report using the human-readable metric name, not the metric ID.

Extract and report:
- **Control baseline:** metric value and sample size
- **Treatment performance:** metric value and sample size
- **Absolute lift:** treatment - control
- **Relative lift:** (treatment - control) / control × 100%
- **P-value:** with interpretation
- **Confidence interval:** report 95% CI bounds

**Interpret:**
- ✅ **Statistically significant:** p < 0.05 and CI doesn't include 0
- ⚠️ **Trending:** 0.05 < p < 0.15 (suggestive but inconclusive)
- ❌ **No effect:** p ≥ 0.15 or CI includes 0

**Practical significance:**
- Is the lift magnitude meaningful for the business?
- Small lifts (<2-3%) may not be worth complexity even if significant
- Consider metric's business impact (revenue vs. low-value engagement)

---

### Step 4: Analyze Secondary Metrics & Guardrails

Use `Amplitude:query_experiment` **with metricIds** for all metrics.

**Use metric names from Step 1** - Report using human-readable metric names, not metric IDs.

**For each secondary metric:**
- Report metric name (from Step 1 mapping), variant performance, and statistical significance
- Note which moved and which didn't (with specific numbers)
- **Identify unintended consequences:** Flag any negative impacts with specific values

**For each guardrail:**
- ✅ No regression: neutral or positive (p > 0.05)
- ⚠️ Marginal concern: small negative lift (1-5%) with p < 0.10
- 🚩 **Significant regression:** negative lift with p < 0.05 - report actual numbers

**Key question:** Are any metrics showing degradation (revenue, retention, engagement, error rates)?

**Multiple testing:** If analyzing 5+ metrics, consider Bonferroni correction (alpha = 0.05 / number of metrics)

---

### Step 5: Comprehensive Segment Analysis

Use `Amplitude:query_experiment` with `groupBy` parameter (one at a time).

Test 3-4 high-signal segments:
1. **Platform** (iOS, Android, Web)
2. **User tenure** (new vs. established users)
3. **Plan type** (free vs. paid)
4. **Geography** (country, region)

**MANDATORY: Format results as markdown breakdown tables**

For each segment analysis, present results in this exact format:

| Segment | Control Rate | Control Exposures | Control % of Total | Treatment Rate | Treatment Exposures | Treatment % of Total | Relative Lift | Significant? |
|---------|--------------|-------------------|-------------------|----------------|---------------------|---------------------|---------------|--------------|
| iOS | 48.7% | 1,234 | 45.2% | 55.4% | 1,456 | 54.8% | **+13.6%** | Yes (p=0.02) |
| Android | 63.9% | 567 | 20.8% | 65.1% | 589 | 22.2% | +1.9% | No (p=0.45) |
| Web | 51.2% | 928 | 34.0% | 50.8% | 611 | 23.0% | -0.8% | No (p=0.89) |

**Calculate % of Total:**
- Sum all exposures across segments to get total
- Show each segment's share: (segment exposures / total exposures) × 100%
- This reveals which segments drive overall results

**Key insights:**
- Identify segments where treatment performs **best** (targeted rollout opportunity)
- Identify segments where treatment **hurts** (consider exclusions)
- Explain why different segments show different performance
- **Watch for Simpson's Paradox:** Overall result may differ from all segment results

Use `groupByLimit: 10` to avoid overwhelming output.

---

### Step 6: Assess Statistical Power & Duration

**Power Analysis:**
Based on current sample sizes and observed variance, assess:
- **Current statistical power:** Is it adequate to detect meaningful effects?
- **Required sample size:** How many more users needed for p < 0.05?
- **Estimated days to significance:** Given current traffic, how long to reach target sample?
- **Duration assessment:** Has experiment run long enough given power constraints?

**Interpretation:**
- Low power (<60%): Experiment cannot reliably detect effects, need more data
- Moderate power (60-80%): Trending toward conclusion, consider extending
- High power (>80%): Sufficient data to draw conclusions

**Recommendation:**
- If underpowered and p > 0.15: Extend duration or increase traffic
- If powered and p < 0.05: Ready for decision
- If powered and p > 0.15: Accept null result (no effect detected)

---

### Step 7: Understand Why (Qualitative Context)

**For significant results (positive or negative):**

Use `Amplitude:get_feedback_insights`:
- Filter by experiment date range
- For wins: look for `["lovedFeature", "mentionedFeature"]`
- For losses: look for `["bug", "complaint", "painPoint"]`
- Check if themes align with experiment hypothesis

Use `Amplitude:get_session_replays`:
- Filter by treatment variant (use experiment flag property: `gp:[Experiment] experiment-name`)
- For wins: observe users engaging with new feature
- For losses: identify friction, confusion, or bugs
- Watch 2-3 replays to understand behavior

**Connect quantitative to qualitative:**
- Explain the lift with user quotes or replay observations
- Present 2-3 representative examples with specific details

---

### Step 8: Synthesize Findings and Make Recommendation

**Before finalizing, verify you have included:**
- ✓ All primary metric data (lift, CI, p-value, interpretation)
- ✓ All data quality findings (traffic balance, sample size, SRM, with actual numbers)
- ✓ All secondary metrics and guardrails (with actual values and significance)
- ✓ All segment analysis tables (formatted with % of total exposures)
- ✓ Statistical power assessment (current power, required sample, duration)
- ✓ Qualitative insights (feedback themes and replay observations)

Present structured analysis:

---

## Experiment Analysis: [Experiment Name]

**Overview:**
- **Hypothesis:** [What was tested and expected impact]
- **Duration:** [Start] to [End] ([X days])
- **Sample Size:** Control: [N] | Treatment: [N]
- **Link:** [Experiment URL]

---

**Data Quality Assessment:**
- **Traffic Balance:** Control [X%] | Treatment [Y%] [Flag if >10% deviation]
- **Sample Size:** [Adequate/Moderate/Low] - [specific numbers]
- **SRM Detected:** [Yes/No]
- **Duration:** [Adequate/Need more time based on power analysis]

---

**Primary Metric: [Metric Name]**

| Variant | Value | Lift | 95% CI | P-value | Status |
|---------|-------|------|--------|---------|--------|
| Control | [X] | — | — | — | — |
| Treatment | [Y] | **[+Z%]** | [[A, B]] | [P] | ✅ Significant |

**Interpretation:** [1-2 sentences on statistical AND practical significance]

---

**Secondary Metrics & Guardrails:**

**Guardrails:**
- ✅ **Revenue per user:** No regression ([+X%], p=[P])
- ✅ **Retention D7:** Slight positive ([+X%], p=[P])
- 🚩 **Bounce rate:** Regression detected ([+X%], p=[P]) ⚠️

**Secondary Metrics:**
- **[Metric]:** [+X% lift, p=[P]] - [brief interpretation]
- **[Metric]:** No significant change (p=[P])

**Unintended Consequences:** [List any negative impacts on secondary metrics or guardrails]

---

**Segment Analysis:**

**By Platform:**
| Segment | Control Rate | Control Exp | Control % | Treatment Rate | Treatment Exp | Treatment % | Lift | Sig? |
|---------|--------------|-------------|-----------|----------------|---------------|-------------|------|------|
| [Data from query_experiment with groupBy] |

**Key Finding:** [Which segments drove results; which showed differential effects]

**By User Tenure:**
[Similar table]

---

**Statistical Power:**
- **Current Power:** [X%] - [Adequate/Underpowered]
- **Required Sample:** Need [X] more users per variant for 80% power
- **Estimated Duration:** [X] more days at current traffic to reach significance

---

**Why This Result:**
- **[Feedback theme]** ([X mentions])
  - "[Quote]" - [Source] ([Date])
- **[Session replay observation]**
  - [What you observed in 2-3 replays with specific details]

---

**Recommendation: ✅ SHIP** / **⚠️ ITERATE** / **❌ ABANDON** / **🔄 NEED MORE DATA**

**Rationale:**
1. [Primary metric result with statistical and practical significance]
2. [Guardrail status and any unintended consequences]
3. [Segment insights - opportunities or concerns]
4. [Power analysis - adequate data or need more time]
5. [Qualitative validation]

**Known Risks:**
- [Risk 1 with mitigation if shipping]
- [Risk 2 with mitigation if shipping]

**Next Steps:**
1. [Specific action based on recommendation]
2. [Follow-up or monitoring action]

---

**Key Takeaways (3-5 actionable insights):**
1. [Most important finding]
2. [Second most important finding]
3. [Third most important finding]
4. [Additional insight if relevant]

---

---

## Key Scenarios & How to Handle

### Inconclusive Results (p > 0.05)

**Diagnose:**
- Check statistical power: Is sample size adequate? Report current power percentage
- Check confidence interval: Very wide = high variance, need more data
- Check segments: Effect may exist in specific subgroup

**Action:**
- If power <60%: Extend duration or increase traffic allocation
- If power >80% but p >0.15: Accept null result (no effect detected)
- Check segment tables: Look for subgroups with significant effects

---

### Guardrail Regressed

**Diagnose:**
- Quantify trade-off with specific numbers: +10% conversion but -2% retention
- Which segments drove the regression? Check segment tables
- Is regression statistically significant or just noise?

**Action:**
- Small regression + large primary win + not significant = ship with monitoring
- Significant regression on critical metric = iterate to fix or abandon
- Segment-specific regression = consider targeted rollout excluding affected segments

---

### Segment Tables Show Opposite Effects

**Simpson's Paradox detected:**
- Overall result may be misleading if segments show opposite directions
- Example: Overall +5% lift, but iOS -10%, Android +15%

**Action:**
- Report the paradox clearly with specific segment numbers
- Consider targeted rollout to segments that benefit
- Exclude or iterate for segments that are harmed

---

## Best Practices

**Comprehensive analysis:**
- ✅ Include ALL data from tool calls with specific numbers
- ✅ Format segment analysis as breakdown tables with % of total
- ✅ Check statistical power and duration adequacy
- ✅ Verify data quality before drawing conclusions
- ✅ Connect quantitative results to qualitative insights

**Statistical rigor:**
- ✅ Report confidence intervals, not just p-values
- ✅ Distinguish statistical vs. practical significance
- ✅ Apply multiple testing correction for 5+ metrics
- ✅ Check for Simpson's Paradox in segment analysis

**Avoid:**
- ❌ Don't provide brief summaries - be comprehensive
- ❌ Don't omit data quality issues or negative secondary metrics
- ❌ Don't ignore segments - they reveal critical insights
- ❌ Don't make recommendations without adequate power
- ❌ Don't stop analysis early because primary looks good

---

## For Experiment Design

If user wants to **design a new experiment**, guide them through:

1. **Define hypothesis:** "We believe [change] will cause [users] to [behavior] because [reason]"

2. **Select metrics:**
   - Use `Amplitude:search` with `entityTypes: ["METRIC"]` to find candidates
   - Primary: directly measures hypothesis
   - Guardrails: revenue, retention, core engagement (prevent unintended consequences)

3. **Estimate sample size:**
   - Typical: 1-2 weeks minimum, 1000+ users per variant
   - Higher variance metrics need more data
   - Use `Amplitude:query_chart` to check metric's historical variance

4. **Create experiment:**
   - Use `Amplitude:create_experiment` with projectIds, variants, and metrics
   - Return experiment ID, URL, and deployment key for engineering

For detailed setup guidance, consider using the `setup-experiment-and-flags` skill.
