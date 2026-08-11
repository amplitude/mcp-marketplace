---
name: wave-babysit
description: Shepherds pull requests linked to Amplitude Wave opportunities through CI, review feedback, conflicts, acceptance-criteria verification, and a merge-ready human gate. Use when users ask to babysit Wave PRs, fix CI or review comments, resume opportunity implementation, or get Wave work ready for review. Never merges automatically.
disable-model-invocation: true
---

# Wave Babysit

Drive linked implementation to a verified, merge-ready PR. Never merge.

Read:

- [Wave pipeline contract](../../references/wave-pipeline-contract.md)
- [Output contracts](../../references/output-contracts.md)

## Discover and reconcile

1. Resolve the project.
2. Query a bounded set of candidates across `IN_PROGRESS`, `FOR_REVIEW`,
   `INVESTIGATING`, and `PLANNED`, or use supplied opportunity IDs.
3. Call `get` and inspect relations in both directions.
4. Discover PRs from:
   - `DELIVERED_VIA` → `GITHUB_PR`;
   - `IMPLEMENTED_BY` relation metadata;
   - structured dispatch/PR-ready comments.
5. Verify each PR's live state with the host's GitHub tooling. Status/tags/comments may
   be stale.

## Shepherd the PR

For each active PR:

1. Read the full diff, checks, review threads, and mergeability.
2. Classify blockers:
   - deterministic: CI, lint, tests, formatting, clear defect, simple conflict;
   - ambiguous: product direction, security tradeoff, architecture change, scope dispute.
3. Fix deterministic blockers on the existing branch. Route ambiguous blockers to a
   human with one clear decision; add `pr-blocked` only when progress cannot continue.
4. Re-run relevant checks after every substantive fix.
5. Review the result against the current opportunity acceptance criteria—not merely the
   PR description.
6. For frontend behavior, capture a screenshot or GIF. For backend work, attach a test
   log, trace, or other concise proof. Use the exact upload sequence in the shared
   contract and bind artifacts to one-based acceptance-criterion indexes.
7. Ensure the idempotent `DELIVERED_VIA` relation exists with full PR URL.
8. Add/update the `wave_pr_ready` comment. Use:
   - `IN_PROGRESS` while checks or criteria are incomplete;
   - `FOR_REVIEW` only when the PR is genuinely reviewable.
9. Add `pr-ready` when all checks and criteria pass; remove stale failure/block tags.

## Human gate

At merge-ready:

- summarize change, checks, evidence, experiment state, and remaining risk;
- produce a `wave_gate` block with `gate: merge`;
- stop and request explicit human approval.

Merge is never automatic. Approval must be explicit in the current run and the merge
itself belongs outside this skill.

## Already merged or closed

- Merged PR: verify merge, add `pr-merged`, remove `pr-open`, transition to `SHIPPED`,
  and route to `wave-close-out`.
- Closed without merge: add `pr-closed`; transition to `IN_PROGRESS` only if resumable
  implementation remains, otherwise add `needs-replan`.
- Missing PR relation but known PR URL: create the relation after duplicate check.

## Done

Each candidate is merge-ready at a human gate, still in progress with concrete blockers,
verified shipped, or explicitly parked.

## Gotchas

- `FOR_REVIEW` does not prove a PR exists.
- Never open a duplicate PR for an existing branch.
- Do not resolve ambiguous review feedback by guessing.
- Verification proves user-visible acceptance criteria, not just compilation.
- Never merge.
