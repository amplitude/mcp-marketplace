---
name: wave-dispatch-handoff
description: Claims an approved Wave opportunity and launches isolated coding work with a normalized handoff. Use when the user asks to dispatch, implement, or hand an approved Wave opportunity to a coding agent. Not for evaluating unapproved items or babysitting an existing PR.
disable-model-invocation: true
---

# Wave Dispatch Handoff

Turn approved, codebase-validated opportunities into bounded coding-agent work. This
skill launches work; it does not implement in the orchestrating session.

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
2. Match the current repository to the approved handoff. For multi-repo work, create one
   bounded handoff per repository and preserve dependency order.
3. Apply the staleness rubric. Resume existing work when possible; never launch a
   duplicate agent for an open/fresh PR.
4. Create branch `wave/<short-opportunity-id>-<slug>` in an isolated git worktree.
5. Launch a **child** coding agent in that worktree with the `wave_dispatch` block plus
   current codebase findings, acceptance criteria, metric/experiment recommendation,
   repo test/lint/build commands, and "stop at a review-ready PR; never merge."
   In Cursor, use an isolated subagent/worktree, or a cloud agent only if the user asked.
6. Isolation rules:
   - Unattended: if a worktree/child agent cannot be launched, park with `wave_gate`
     and do not code inline.
   - Attended: inline coding only if the user explicitly asks to implement here.
7. When the host returns a stable agent/session ID, add an idempotent `IMPLEMENTED_BY`
   relation. Use an `INVESTIGATED_BY` lease when supported, pass `leaseTtlSeconds`, then
   re-read to detect a race. Never fabricate a session ID. If there is no stable ID,
   write attribution in a comment and rely on the branch/PR.
8. Set `IN_PROGRESS` only after work actually started. Add the dispatch handoff comment
   if an equivalent one is absent.

## Coding-agent contract

The launched agent must: reconcile before edits; follow repo conventions; decide
experiment gating before implementing; stay inside acceptance criteria; run configured
checks; create verification evidence; open or update a PR; return PR URL, commit, checks,
and risks; never merge or enable real-user experiment traffic.

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
