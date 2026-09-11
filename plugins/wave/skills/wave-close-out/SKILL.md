---
name: wave-close-out
description: Measures a shipped Wave opportunity and records the outcome. Use when the user asks if a shipped Wave opportunity worked, wants a post-ship readout, or wants to move work to MEASURED. Not for preparing or launching experiments, and not for ranking new work.
---

# Wave Close Out

Read shipped outcomes and feed the learning back into Wave.

Read:

- [Wave pipeline contract](../../references/wave-pipeline-contract.md)
- [Decision rubrics](../../references/decision-rubrics.md)
- [Output contracts](../../references/output-contracts.md)

## Workflow

### 1. Find measurable work

1. Resolve project context.
2. Query a bounded `SHIPPED` set, narrowed by opportunity, product area, tags, or
   configured measurement window.
3. Call `get` and inspect incoming/outgoing relations for each candidate.
4. Verify the delivery actually merged/shipped. Parent opportunities without a concrete
   delivered child/PR are not measurement units.
5. Resolve target metric, chart, experiment ID, ship date, and measurement window from
   relations, metadata, and structured comments.

### 2. Check readiness

- Too early: leave `SHIPPED`; report the next valid measurement date.
- Missing signal: add/retain `needs-instrumentation`; record an explicit fallback only
  when the gap is real and no existing signal can answer the question.
- Experiment still running or awaiting launch: leave `SHIPPED`; report its gate/state.

### 3. Read outcome

**Experiment-backed**

1. Resolve experiment ID with `search_amp_entities` when needed.
2. Call `use_amp_experiments` `analyze`; omit `metricIds` unless specific secondary
   metrics were requested.
3. Report primary decision, lift, guardrails, validity warnings, and Amplitude link.

**Direct ship**

1. Read linked saved charts with `get_amplitude_charts`.
2. Use `query_amplitude_data` for a necessary ad-hoc pre/post query only after discovering
   real events/properties through taxonomy tools.
3. Compare equivalent pre/post windows; account for weekday and known seasonality.
4. State correlation and caveats. Do not claim causality from a before/after comparison.

### 4. Record and learn

1. Attach a hosted chart with `manage_wave_verification_artifacts` `create_link`, or use
   the documented prepare/upload/finalize sequence for a local before/after artifact.
2. Add one idempotent `wave_outcome` comment.
3. Patch durable metadata with measurement type, window, result, confidence, and learning.
4. Ensure supported metric/chart relations exist.
5. Remove stale measurement-gap tags and add `instrumented` when appropriate.
6. Transition to `MEASURED` only when evidence or an explicit fallback is recorded.
7. If the outcome warrants a follow-up, semantic-search existing opportunities first.
   Invoke `wave-intake` only for a genuinely new, human-approved idea.
8. Roll a concise learning into product-area metadata when the tool supports it.

## Attended and scheduled behavior

Attended mode shows proposed updates before writing. Unattended close-out may record
outcome evidence and transition ready opportunities, but it parks ambiguous experiment
decisions or attribution questions for a human.

## Done

Every candidate is measured with evidence and learning, too early with a recheck date, or
not measurable with a precise instrumentation gap.

## Gotchas

- Never move to `MEASURED` just because enough days elapsed.
- Experiment metrics are a replacement set when updated; this skill does not update them.
- Do not invent a metric for close-out.
- Direct-ship movement is not causal proof.
