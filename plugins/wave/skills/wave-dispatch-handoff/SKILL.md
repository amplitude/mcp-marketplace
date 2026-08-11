---
name: wave-dispatch-handoff
description: Claims approved Amplitude Wave opportunities and launches or prepares isolated coding-agent sessions with a normalized implementation handoff. Use when users ask to dispatch agents, start coding approved Wave work, implement selected opportunities, or hand a Wave opportunity to a coding agent. Not for evaluating unapproved opportunities or shepherding an existing PR.
disable-model-invocation: true
---

# Wave Dispatch Handoff

Turn approved, codebase-validated opportunities into bounded coding-agent work.

Read:

- [Wave pipeline contract](../../references/wave-pipeline-contract.md)
- [Decision rubrics](../../references/decision-rubrics.md)
- [Output contracts](../../references/output-contracts.md)

## Preconditions

Dispatch only when all are true:

- full opportunity was fetched;
- verdict is approved and problem is codebase-confirmed;
- structured `wave_handoff` exists;
- target repository is available;
- acceptance criteria are observable;
- no fresh competing claim, implementation, or matching PR exists.

If any precondition fails, route to `wave-evaluate` or `wave-babysit`; do not improvise.

## Workflow

1. Resolve project and re-fetch the opportunity plus incoming/outgoing relations.
2. Detect current repository and match it to the approved handoff. For multi-repo work,
   create one bounded handoff per repository and preserve dependency order.
3. Apply the staleness rubric. Resume existing work when possible; never launch a
   duplicate agent for an open/fresh PR.
4. Determine execution shape:
   - isolated local subagent/worktree when supported;
   - cloud coding agent when explicitly requested and available;
   - inline implementation only when the host lacks isolation and the user approved it.
5. Create a branch name such as `wave/<short-opportunity-id>-<slug>`.
6. Launch the coding agent with the `wave_dispatch` block plus:
   - current codebase findings,
   - exact acceptance criteria,
   - target metric and experiment recommendation,
   - repository test/lint/build commands,
   - instruction to stop at a review-ready PR and never merge.
7. When the host returns a stable agent/session ID, add an idempotent `IMPLEMENTED_BY`
   relation. Use an `INVESTIGATED_BY` lease when supported, pass `leaseTtlSeconds`, then
   re-read to detect a race. Never fabricate a session ID.
8. Set `IN_PROGRESS` only after work actually started. Add the dispatch handoff comment
   if an equivalent one is absent.

## Coding-agent contract

The launched agent must:

- reconcile the opportunity before edits;
- follow current repository conventions;
- decide experiment gating before implementing the behavior;
- keep changes scoped to acceptance criteria;
- run configured checks;
- create verification evidence;
- open or update a PR;
- return PR URL, commit, check results, and unresolved risks;
- never merge or enable real-user experiment traffic.

## Failure handling

- Launch fails before work starts: leave status unchanged; add no implementation relation.
- Agent starts but fails: preserve branch/session information, add `agent-failed`, and
  leave `IN_PROGRESS` with a concise resume comment.
- Retries exceed configured cap: add `retries-exhausted` and park for human review.
- Another fresh claim wins: stop the launched work if safe, record the race, and defer.

## Done

Work is claimed and linked to a real coding-agent session/branch, or parked with a
specific precondition/failure. The next skill is `wave-babysit`.

## Gotchas

- Never launch from a list/search result.
- `sourceId` is the opportunity ID for relation writes; do not use `id`.
- An agent relation without a stable ID is worse than an attribution comment.
- Do not create a second branch/PR when resumable work exists.
- This skill starts work; it does not shepherd CI/review or merge.
