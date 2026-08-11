---
name: wave-experiment
description: Designs, prepares, links, and monitors Amplitude experiments for validated Wave opportunities, including flags, variants, success metrics, guardrails, and outcome handoff. Use when users ask to A/B test a Wave opportunity, gate Wave work behind a flag, prepare an experiment, or review the experiment attached to an opportunity. Never launches traffic without explicit human approval.
disable-model-invocation: true
---

# Wave Experiment

Make experiments a first-class Act/Learn path for Wave opportunities. Preparation and
monitoring are allowed; live traffic launch is a hard human gate.

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
2. Search `search_amp_entities` for existing linked/equivalent flags, experiments, and
   metrics. Reuse rather than duplicate.
3. Select measurement:
   - prefer an existing linked/official metric;
   - discover metric/event/property definitions before use;
   - create a metric with `use_amplitude_metrics` only after explicit approval;
   - include one primary success metric and at least one guardrail.
4. Resolve deployments with `use_amp_flags` `list_deployments`.
5. Ensure code supports control/treatment via a flag. Create a new **disabled** flag with
   `use_amp_flags` `create` only when no suitable flag exists.
6. Create the experiment with `use_amp_experiments` `create`:
   - clear key/name/description tied to the opportunity;
   - control and treatment variants;
   - project/deployment IDs;
   - project metrics, with one recommendation metric;
   - explicit MDE when sizing matters;
   - `proxyExposureEvent` at the tested surface when an existing event is available;
   - link back to the opportunity/PR when a stable URL exists.
7. Persist experiment ID, flag key, metric IDs, hypothesis, variants, and gate state via
   `metadataPatch`; add one idempotent comment.
8. Add `TARGETS_METRIC`. Add direct flag/experiment relations only when current Wave tool
   support is proven; otherwise use metadata/comment plus experiment links as specified
   in the shared contract.
9. Produce `wave_gate` with `gate: experiment_launch` and stop.

## Launch gate

Never enable a flag rollout or launch traffic merely because the experiment is prepared.
The user must explicitly approve launch in the current run after reviewing:

- hypothesis and variants,
- targeting and exposure event,
- primary metric, guardrails, and MDE,
- estimated duration/traffic,
- rollback plan.

Even after approval, show the exact flag update before applying it. This skill must never
combine experiment launch with PR merge. Use `use_amp_flags` `update` with the resolved
experiment/flag `flagId` and only the intended update sections. Enabling a prepared
experiment uses `flagConfig.enabled: true`; do not alter variants, testers, deployments,
or links unless they were included in the approved launch plan. If the customer needs a
rollout/targeting mutation that the current MCP schema cannot express, park at the gate
and link them to the Amplitude UI instead of improvising another tool.

## Monitor

For a linked experiment:

1. Resolve the real experiment ID and fetch it.
2. Call `use_amp_experiments` `analyze`; omit secondary `metricIds` unless requested.
3. Report decision readiness, primary lift, guardrails, validity issues, and Amplitude URL.
4. Do not call a winner early or ignore validity warnings.
5. Record a concise status comment only when the state materially changed.
6. Once a decision is final, route to `wave-close-out` for durable outcome recording.

## Done

The opportunity has a deduplicated, disabled experiment setup at a human launch gate, or
an existing experiment has a decision-quality monitoring readout.

## Gotchas

- `use_amp_experiments` metric updates fully replace the metric set.
- Experiments require flag-aware code before launch.
- Without a proxy exposure event, planning can overstate duration using Any Active Event.
- Never guess deployment, metric, event, flag, or experiment IDs.
- Never launch real traffic without explicit approval.
