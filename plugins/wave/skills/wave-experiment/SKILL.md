---
name: wave-experiment
description: Prepares or monitors an Amplitude experiment tied to a validated Wave opportunity (flag, variants, metrics). Use when the user asks to A/B test a Wave opportunity, gate it behind a flag, or check the experiment already linked to one. Never launches traffic without explicit approval. Not for generic experiment analysis unrelated to a Wave opportunity.
disable-model-invocation: true
---

# Wave Experiment

Prepare and monitor experiments for Wave opportunities. Live traffic launch is a hard
human gate.

Read:

- [Wave pipeline contract](../../references/wave-pipeline-contract.md)
- [Decision rubrics](../../references/decision-rubrics.md)
- [Output contracts](../../references/output-contracts.md)

## Preconditions

- Full opportunity and relations are fetched.
- Problem is codebase-confirmed.
- Experiment-vs-direct-ship rubric favors an experiment.
- Treatment can be safely flag-gated in the implementation PR.
- Human explicitly invoked this skill or approved experiment preparation.

If the implementation is already merged without variant-aware behavior, do not pretend an
experiment can be bolted on. Replan or measure as a direct ship.

## Prepare

1. Resolve project/product-area/opportunity IDs and fetch current relations/metadata.
2. Search `search_amp_entities` (`entityTypes: ["FLAG"]`, `["EXPERIMENT"]`, `["METRIC"]`)
   and reuse matches. Never guess IDs.
3. Select measurement: existing linked/official metric first; discover events/properties
   before use; create a metric with `use_amplitude_metrics` only after explicit approval.
   One primary success metric and at least one guardrail.
4. Resolve deployments with `use_amp_flags` `list_deployments`.
5. Create a **disabled** flag only when none exists. `use_amp_flags` `create` takes a
   `flags` array, not a lone flag object. Do not set `percentage` or `rolloutWeights`:

   ```yaml
   action: create
   flags:
     - key: <flag-key>
       name: <name>
       description: <tied to opportunity>
       enabled: false
       deploymentIds: [<id>]
   ```

6. Create the experiment. `use_amp_experiments` `create` requires `projectIds` (array),
   not `projectId`:

   ```yaml
   action: create
   projectIds: ["<project-id>"]
   key: <experiment-key>
   name: <name>
   description: <hypothesis>
   variants:
     - key: control
     - key: treatment
   deploymentIds: [<id>]
   projectMetrics:
     - metricId: <primary>
       metricIndex: 0
       recommendation: true
       analysisParams:
         metricGoalType: success
         minDetectableEffect: <relative fraction, e.g. 0.05>
     - metricId: <guardrail>
       metricIndex: 1
       analysisParams:
         metricGoalType: guardrail
   proxyExposureEvent:
     eventType: <existing event at the tested surface>
   links:
     - url: <opportunity or PR URL>
       title: Wave opportunity
   ```

7. Persist experiment ID, flag key, metric IDs, hypothesis, variants, and gate state via
   `metadataPatch`; add one idempotent comment.
8. Add `TARGETS_METRIC`. Add flag/experiment Wave relations only when the live tool
   schema supports those target types; otherwise metadata/comment plus experiment links.
9. Produce `wave_gate` with `gate: experiment_launch` and stop.

## Launch gate

Never enable a flag rollout or launch traffic merely because the experiment is prepared.
After explicit approval in the current run, show this exact update before applying it:

```yaml
action: update
flagId: <experiment-or-flag-id>
flagConfig:
  enabled: true
```

Do not send `variants`, `testers`, `deployments`, `links`, or `percentage` unless they
were in the approved launch plan. Never combine launch with PR merge. If the needed
rollout cannot be expressed by this schema, park and link the Amplitude UI.

## Monitor

1. Resolve the real experiment ID and `get` it.
2. Call `use_amp_experiments` `analyze`; omit secondary `metricIds` unless requested.
3. Report decision readiness, primary lift, guardrails, validity issues, and Amplitude URL.
4. Do not call a winner early or ignore validity warnings.
5. Record a concise status comment only when the state materially changed.
6. Once a decision is final, route to `wave-close-out`.

## Done

The opportunity has a deduplicated, disabled experiment at a human launch gate, or an
existing experiment has a decision-quality monitoring readout.

## Gotchas

- `use_amp_experiments` `create` uses `projectIds` (array). `update` metrics fully replace
  the metric set.
- Flag `create` uses `flags: [{ enabled: false }]`. `percentage` on a live flag is a
  rollout; do not set it during prepare.
- Without `proxyExposureEvent`, planning overstates duration via Any Active Event.
- Never guess deployment, metric, event, flag, or experiment IDs.
- Never enable a flag rollout without explicit human approval.
