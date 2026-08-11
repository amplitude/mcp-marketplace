---
name: wave-evaluate
description: Validates Amplitude Wave opportunities against the current codebase and fresh product evidence, then improves their execution plans and acceptance criteria. Use when users ask to evaluate, validate, review, sharpen, approve, or replan Wave opportunities. Dismisses only when the underlying problem is demonstrably obsolete or invalid; does not implement code.
---

# Wave Evaluate

Confirm that the problem still exists, then make the plan implementable. Improving a real
opportunity is the default success condition; clearing the queue is not.

Read:

- [Wave pipeline contract](../../references/wave-pipeline-contract.md)
- [Decision rubrics](../../references/decision-rubrics.md)
- [Output contracts](../../references/output-contracts.md)

## Mode

- `attended` (default): investigate read-only, present proposed verdicts, and obtain
  confirmation before any Wave writes.
- `unattended`: allowed only when explicitly invoked by `wave-autopilot`; write approvals
  and replans, but park ambiguity as `needs-human-review`. A conclusive dismiss finding is
  proposed and parked for human confirmation rather than applied silently.

## Workflow

### 1. Resolve and fetch

1. Resolve project context with `get_amplitude_context`.
2. Discover candidates with a bounded `query_wave_opportunities` `list` or `search`.
3. For every candidate, call `get`; query relevant incoming and outgoing relations.
4. Normalize tags, repositories, PRs, agents, parent/child state, and measurement links.

### 2. Confirm current code state

For each opportunity:

1. Resolve the target repository from the full record; never infer from a snippet.
2. Read referenced files and adjacent code paths.
3. Check recent commits and linked/open PRs for an existing or in-flight fix.
4. Reproduce or trace the described behavior when feasible.
5. Separate:
   - implementation truth: what current code does;
   - product truth: whether the behavior matters to users/metrics.

If the repository is unavailable, do not fabricate a verdict. Mark
`NEEDS_HUMAN_REVIEW` with the missing repository/context.

### 3. Corroborate evidence

When the opportunity cites charts, metrics, feedback, experiments, or replays:

- fetch the cited entities rather than guessing replacements;
- use fresh data when practical;
- discover event/property names through taxonomy tools before ad-hoc queries;
- treat stale or missing product evidence as a confidence limitation, not automatic
  dismissal when code confirms the problem.

### 4. Improve the plan

When the problem is real:

- correct repository and file targeting;
- replace a weak or risky solution with one aligned to current code conventions;
- make steps concrete and minimal;
- define observable acceptance criteria;
- identify a target metric and experiment-vs-direct-ship recommendation;
- capture risks, blockers, existing work, and verification needs.

Use `metadataPatch` with `snake_case` keys for partial metadata changes. Emit the
`wave_handoff` block from the output contract in an idempotent comment.

### 5. Choose verdict

- `APPROVE`: problem confirmed and improved plan is executable. Add `agent-approved`;
  transition to `INVESTIGATING`.
- `NEEDS_REPLAN`: problem confirmed but material implementation ambiguity remains. Add
  `needs-replan`; keep it out of dispatch.
- `NEEDS_HUMAN_REVIEW`: product/security/design judgment or missing context blocks a safe
  plan. Add `needs-human-review`.
- `DISMISS`: only when the underlying problem is conclusively obsolete or invalid. After
  human confirmation, transition to `DISMISSED`, remove dispatch workflow tags, and add
  the structured dismissal handoff/comment.

Wrong repository, weak strategy, low RICE, oversized scope, or non-code work are routing
and replan inputs—not dismissal reasons.

### 6. Confirmation and writes

In attended mode, show a compact verdict table and exact proposed writes. After
confirmation:

1. Re-fetch each opportunity.
2. Apply `metadataPatch` and tag additions/removals.
3. Add one structured handoff/verdict comment if an equivalent block is absent.
4. Apply the status transition.

Do not batch more than ten verdicts. Every dismissal requires explicit human confirmation.
In unattended mode, leave the current status unchanged, add `needs-human-review`, and
park the proposed `DISMISS` verdict at a human gate.

## Done

Each evaluated opportunity has a codebase-grounded verdict, improved plan, observable
acceptance criteria, measurement direction, and structured handoff—or one clearly stated
human decision needed.

## Gotchas

- Never decide from list/search snippets.
- Never dismiss because the proposed solution is poor; fix the solution.
- “Feature already shipped” requires code/PR evidence and, when relevant, product-state
  confirmation.
- Preserve non-workflow tags.
- Do not implement code or launch agents from this skill.
