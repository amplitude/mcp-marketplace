---
name: measure-outcome
description: >
  Reads the outcome of shipped Amplitude opportunities and closes the loop. For each
  opportunity that has shipped, measures the target metric or experiment over the
  measurement window, sets it to MEASURED, attaches a before/after artifact, and writes the
  result and learnings back so future opportunities are smarter. Runs days after ship, so
  it's a separate entry point — run it manually or on its own schedule (Cursor/Codex
  automations, Claude scheduled tasks). Trigger on "measure shipped opportunities",
  "did that opportunity work", "close out the opportunity loop", or "outcome readout".
---

# Measure Outcome

The shipping loop (`self-improving-product`) ends at a merged PR; the result lands days
later. This skill is the async readout that turns `SHIPPED` into `MEASURED` and feeds
learnings back. It is deliberately separate so it can run on its own cadence.

## Configuration

Reuse the same `repo-registry.json` as `self-improving-product` for `projectId` and
`measurementWindowDays` (default 14). If absent, ask for `projectId` and assume a 14-day
window.

## Workflow

### Phase 0 — Bootstrap
1. `get_context` to resolve the org and `projectId`.
2. `list_opportunities(status=["SHIPPED"])` — optionally narrowed by `objectiveId`, `tags`,
   or a single `opportunityId`.

### Phase 1 — Confirm it's ready to measure
For each shipped opportunity, `get_opportunity` + `get_relations`:
- Confirm the ship date (from the `DELIVERED_VIA` PR merge or the `SHIPPED` transition) is
  at least the measurement window in the past. If not, skip and report "too early — recheck
  after <date>".
- Find the target metric (`TARGETS_METRIC`) and any linked experiment.
- If the opportunity carries a "measurement pending instrumentation" recommendation and the
  tracking still isn't in place, report it as **not measurable yet** and skip — do not
  invent a metric.

### Phase 2 — Read the result
- **Experiment-backed:** `query_experiment` for the lift on the success metric and the
  guardrails. Report the decision (win / flat / regression) with the numbers.
- **Direct ship:** `query_chart` / `query_dataset` on the target metric, comparing the
  window after ship against an equivalent baseline before it. Compare like-for-like
  (day-of-week, seasonality) and call out confounders — a single shipped change is rarely
  cleanly attributable without an experiment, so state hypotheses, not certainties.

### Phase 3 — Record & close
1. Attach a before/after **verification artifact** (a chart/dashboard link via
   `create_opportunity_verification_link_artifact`, or an uploaded image).
2. `add_opportunity_comment` with the outcome: what moved, by how much, over what window,
   and the confidence/caveats.
3. `update_opportunity_status → MEASURED`.

### Phase 4 — Feed learnings back
Make the next cycle smarter:
- Write durable learnings into the opportunity metadata (`update_opportunity`) and roll a
  one-line takeaway up to the objective context where relevant.
- If the outcome suggests a follow-on opportunity (a partial win worth iterating, or a
  regression to fix), note it — and, when clearly warranted, `submit_opportunity_idea` for
  it so the loop has something to pick up next.

> Note: a durable "product-area memory" store (graph `PRODUCT_NODE` / `PRODUCT_EDGE`) is an
> open question — there's no confirmed tool to create/update those nodes yet. Until then,
> opportunity metadata, comments, and objective context are the memory.

## Run summary
End with a per-opportunity readout: measured (with the result), too-early (recheck date),
or not-measurable (instrumentation gap) — plus any follow-on ideas raised.
