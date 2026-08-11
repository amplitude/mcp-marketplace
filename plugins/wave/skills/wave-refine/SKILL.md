---
name: wave-refine
description: Audits the Amplitude Wave workflow across opportunity quality, plan improvements, agent/PR success, cycle time, experiment outcomes, measurement coverage, and skill drift. Use when users ask how the Wave pipeline is performing, want to improve Wave autonomy, review opportunity quality, or generate evidence-backed plugin changes. Produces recommendations; never silently self-edits.
---

# Wave Refine

Evaluate whether the end-to-end Wave loop is getting better. Use
`minOpportunitiesForRefine` from customer config (default 20) or run monthly; smaller
samples are directional and must be labeled as such.

Read:

- [Wave pipeline contract](../../references/wave-pipeline-contract.md)
- [Output contracts](../../references/output-contracts.md)
- [Skill design checklist](../../references/skill-design-checklist.md)

## Gather

1. Resolve project and product-area scope.
2. Query bounded cohorts by status/tags and semantic searches; do not paginate the entire
   backlog blindly.
3. Fetch full records and relations for the sample.
4. Extract structured `wave_handoff`, `wave_dispatch`, `wave_pr_ready`, `wave_gate`,
   `wave_outcome`, and `wave_run` blocks.
5. Validate live PR/experiment state for sampled records rather than trusting stale tags.

## Measure

Report by product area and overall:

- trigger/routing precision when invocation logs exist;
- approved, replanned, human-review, and dismissed rates;
- dismiss reasons and later reversals;
- opportunities where codebase validation materially improved the plan;
- duplicate comment/relation/PR rate;
- claim conflicts and stale-work takeovers;
- coding-agent start, failure, retry, and PR-ready rates;
- median time from planned → PR-ready → shipped → measured;
- CI/review blocker distribution;
- acceptance-criterion verification coverage;
- experiment-prepared, launched, decided, and win/flat/regression rates;
- shipped-to-measured rate and measurement fallbacks;
- human overrides at evaluation, merge, and experiment gates.

## Drift audit

Flag:

- legacy objective/tool names;
- tag aliases or accidental tag replacement;
- missing structured handoffs;
- PRs hidden only in agent metadata;
- statuses unsupported by real relations/PR state;
- parent epics dispatched as implementation units;
- `MEASURED` without evidence/fallback;
- experiment/flag IDs stored nowhere durable;
- duplicated writes from reruns;
- skills over 500 lines, broken references, vague/overlapping descriptions;
- any path that could merge or launch traffic without a human gate.

## Recommend

Prioritize no more than five changes by expected effect and confidence:

```yaml
wave_refinement:
  observation: <measured problem>
  evidence: []
  root_cause: <skill|contract|tool|config|product-area context>
  proposed_change:
    files: []
    summary: <specific patch>
  expected_metric: <pipeline metric>
  confidence: <high|medium|low>
```

Separate:

- product-area memory/context updates;
- workflow/config changes;
- skill/contract patches;
- upstream MCP capability gaps.

## Self-improvement gate

This skill is read-only by default. It may draft a patch or PR only after explicit user
approval. It never edits its own skills, contract, configuration, or production Wave
records silently.

## Done

The user gets a small, evidence-backed pipeline report and concrete reviewable
improvements tied to success metrics.

## Gotchas

- Low dismissal rate is not automatically good; inspect validity and later reversals.
- High PR throughput without measurement is an incomplete loop.
- Do not infer causality between a skill change and outcomes without enough samples.
- Never pad the report with weak findings.
