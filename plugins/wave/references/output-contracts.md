# Wave Output Contracts

Use these compact structures so skills can hand work to each other without reparsing prose.

## Queue item

```yaml
opportunityId: <uuid>
productAreaId: <id>
title: <title>
status: <status>
riceScore: <number|null>
problemSummary: <one sentence>
evidenceSummary: <one sentence>
repository: <org/repo|null>
existingWork: <none|agent|branch|pr|blocked>
recommendedNextSkill: <wave-evaluate|wave-experiment|wave-dispatch-handoff|wave-babysit|wave-close-out>
reason: <one sentence>
```

## Evaluation handoff comment

Place this fenced block in the approval/replan comment:

```yaml
wave_handoff:
  version: 1
  verdict: APPROVE
  problem_confirmed: true
  codebase_checked:
    repository: <org/repo>
    paths: []
    recent_change_check: <summary>
  improved_plan:
    summary: <implementation direction>
    repositories: []
    steps: []
  acceptance_criteria:
    - <observable criterion>
  measurement:
    target_metric_id: <id|null>
    experiment_recommended: <true|false>
    rationale: <one sentence>
  risks: []
```

For `NEEDS_REPLAN` or `NEEDS_HUMAN_REVIEW`, change `verdict` and include the unresolved
decision. Never emit `APPROVE` with `problem_confirmed: false`.

For a proposed dismissal:

```yaml
wave_handoff:
  version: 1
  verdict: DISMISS
  problem_confirmed: false
  invalidation:
    reason: <obsolete|already_resolved|invalid_evidence>
    code_evidence: []
    product_evidence: []
  status_transition:
    from: <current status>
    to: DISMISSED
    confirmed_by_human: <true|false>
```

Do not apply the transition until `confirmed_by_human` is true. Unattended runs park this
block at a human-review gate with status unchanged.

## Dispatch handoff

```yaml
wave_dispatch:
  version: 1
  opportunity_id: <uuid>
  product_area_id: <id>
  repository: <org/repo>
  base_branch: <branch>
  branch: <branch>
  acceptance_criteria: []
  target_metric_id: <id|null>
  experiment_recommended: <true|false>
  existing_pr: <url|null>
  claim:
    relation_id: <id|null>
    expires_at: <timestamp|null>
```

## PR-ready comment

```yaml
wave_pr_ready:
  version: 1
  pr_url: <url>
  commit: <sha>
  checks:
    test: <pass|fail|not_run>
    lint: <pass|fail|not_run>
    build: <pass|fail|not_run>
    review: <pass|issues>
  acceptance_criteria:
    - index: 1
      status: <verified|unverified>
      artifact_id: <id|null>
  experiment:
    required: <true|false>
    id: <id|null>
    launch_status: <not_applicable|prepared_human_gate>
```

## Parked-at-gate comment

```yaml
wave_gate:
  version: 1
  gate: <merge|experiment_launch|human_review>
  opportunity_id: <uuid>
  ready: <true|false>
  decision_needed: <single clear decision>
  evidence: []
  resume_with: <skill name and input>
```

## Outcome comment

```yaml
wave_outcome:
  version: 1
  measurement_type: <experiment|before_after|fallback>
  window: <dates>
  result: <win|flat|regression|inconclusive|not_measurable>
  primary_metric:
    id: <id|null>
    before: <number|null>
    after: <number|null>
    change: <number|string|null>
  guardrails: []
  confidence: <high|medium|low>
  caveats: []
  learning: <one sentence>
  follow_up: <opportunity id|null>
```

## Automation run summary

```yaml
wave_run:
  version: 1
  mode: <attended|unattended>
  started_at: <timestamp>
  finished_at: <timestamp>
  counts:
    reconciled: 0
    evaluated: 0
    dispatched: 0
    pr_ready: 0
    measured: 0
    dismissed: 0
    deferred: 0
    parked: 0
  opportunities: []
  gates: []
  errors: []
```
