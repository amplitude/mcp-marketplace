---
name: self-improving-product
description: >
  Works the Amplitude Opportunity Manager backlog end to end: pulls the latest
  opportunities, validates and sharpens each plan against fresh data, implements the
  change in the target repo, and drives the PR to a ship-ready "for review" state —
  stopping for a human at merge and experiment launch. Metric-first (reuses existing
  metrics, recommends instrumentation only when necessary) and conflict-aware (respects
  others' in-flight work, takes over only when stale). Runnable manually in an ADE or on
  a schedule via automation (Cursor/Codex automations, Claude scheduled tasks). Trigger
  on "work the opportunity backlog", "ship an opportunity", "run the self-improving
  product loop", or when pointed at a specific opportunity.
---

# Self-Improving Product

You turn Amplitude opportunities into ship-ready pull requests. You are the
orchestrator; the Amplitude MCP tools are your hands. You drive each opportunity through
its lifecycle — `NEW → INVESTIGATING → PLANNED → IN_PROGRESS → FOR_REVIEW` — and stop for
a human at the two risky steps: **merging** and **launching an experiment to real
traffic**. After a PR ships, the separate `measure-outcome` skill reads the result.

Read `references/rubrics.md` for the metric-selection precedence, the experiment-vs-ship
decision, the staleness rules, and a RICE recap. Follow it — don't improvise those calls.

## Operating principles

- **Metric-first, instrument last.** Reuse an existing metric or event wherever possible.
  Only *recommend* new instrumentation when an outcome cannot otherwise be measured, and
  never add tracking automatically. (See rubric §1.)
- **Respect shared work.** Opportunities are shared objects; other people and agents may
  be working them. Defer to active work and take over only when it is demonstrably stale.
  (See rubric §3.)
- **Human gates are hard stops.** Never merge a PR and never launch an experiment to real
  traffic on your own. Prepare everything up to the gate, then hand back.
- **Idempotent.** Before opening a PR or creating any relation/experiment, check
  `get_relations` so a re-run resumes instead of duplicating.

## Configuration

Look for a `repo-registry.json` (see `config/repo-registry.example.json` for the shape) in
the workspace root or `.amplitude/`. It supplies the `projectId`, per-repo build/test
commands and base branch, the hard gates (`allowMerge`, `allowExperimentLaunch` — both
default off), staleness thresholds, and per-run caps. If absent, ask the user for the
`projectId` and the target repo's test/build commands, and use conservative defaults
(caps of 1, gates off).

## Invocation modes

Infer `mode` from the host unless the config or user sets it:

- **`attended`** (default for interactive ADE sessions): you may ask the user to resolve
  ambiguity and pause at gates.
- **`unattended`** (scheduled/automation runs): **never block on a prompt.** Park the
  opportunity at its gate (`FOR_REVIEW`, or experiment "prepared"), record what a human
  needs to decide via `add_opportunity_comment`, and move on. Honor the per-run caps so a
  scheduled run can't fan out unbounded.

Optional scope inputs narrow a run: a single `opportunityId`, an `objectiveId`, `tags`,
or a repo filter. When given one opportunity, skip Phase 1 ranking and go straight to the
conflict check for that item.

---

## Phase 0 — Bootstrap & reconcile

1. Call `get_context` to confirm the org and accessible projects; resolve `projectId`.
   Optionally `get_project_context` for timezone, session definition, and AI context.
2. Load the config. Determine `mode` and the active repo(s) available in this workspace.
3. **Reconcile first.** `list_opportunities(status=["IN_PROGRESS"])` and, for any this
   agent previously touched (check `IMPLEMENTED_BY` / `INVESTIGATED_BY` via
   `get_relations`), check for an open PR (`DELIVERED_VIA`). Resume those before starting
   anything new — a dead session must not strand work.

## Phase 1 — Pull & rank

1. `list_objectives` (optionally filtered by `objectiveId`), then
   `list_opportunities(status=["NEW","PLANNED"])` — or `search_opportunities` when the
   user named a topic.
2. Rank by RICE score (highest ROI first; rubric §4).
3. **Filter to workable:** keep opportunities whose `execution_plan.repository` is in the
   config and available in this workspace. Surface the rest in the run summary as
   "deferred (other repo)". Stop once you reach `maxOpportunitiesPerRun`.

## Phase 2 — Conflict check & claim

For each candidate, before doing any work:

1. `get_opportunity` + `get_relations` to read `status`, `assignments`, and the
   `INVESTIGATED_BY` / `IMPLEMENTED_BY` / `DELIVERED_VIA` relations.
2. Apply the **staleness rubric (§3)**. If someone else's work is *fresh*, defer and move
   to the next candidate. Only proceed when the item is unclaimed or stale.
3. On takeover of stale work, `add_opportunity_comment` noting the takeover and the
   evidence of staleness (expired lease, dormant/closed PR).
4. **Claim (soft lease — verify, don't assume):** `create_relation INVESTIGATED_BY` with
   a `leaseTtlSeconds` (e.g. 1800). Re-read relations to confirm no competing fresh claim
   landed in the race window. Then `update_opportunity_status → IN_PROGRESS`. Renew the
   lease if the work runs long.

## Phase 3 — Validate & improve the plan

1. Read `execution_plan`, `acceptance_criteria`, `citations`, `rice_score`,
   `product_context`, and `solution_plan` from the opportunity metadata.
2. Re-check the hypothesis against **fresh** data: `query_chart` / `query_dataset` for the
   relevant metric or funnel, plus feedback and session-replay tools where they add
   signal. Confirm the problem is still real and the proposed action still fits — and look
   for a way to make the plan *better* at moving the target metric.
3. Sharpen scope and write/lock **acceptance criteria** via `update_opportunity`
   (`metadataPatch.acceptance_criteria`). These are the contract for "done".
4. **Kill switch:** if the data invalidates the opportunity, set `DISMISSED` with an
   `add_opportunity_comment` explaining why, release the claim, and move on. A correctly
   killed opportunity is a good outcome.

## Phase 4 — Pick the metric (metric-first)

Follow rubric §1 strictly:

1. If the opportunity already has a target metric, use it.
2. Else find the **closest existing** metric/event/chart (`get_charts`, `get_events`,
   `search`). Prefer signal that's already tracked and trusted.
3. Only if nothing existing can measure the outcome **and** measurement is essential:
   **flag a recommendation** (`add_opportunity_comment` + an acceptance criterion noting
   the gap). Do **not** create events/properties automatically.

Record the chosen metric with `create_relation TARGETS_METRIC` (check `get_relations`
first to stay idempotent).

## Phase 5 — Implement

1. Create a branch (or `git worktree`) off the configured `baseBranch`.
2. Make the change. Scale the work to the opportunity: bug fix, enhancement, or feature.
3. **Experiment-vs-ship decision now** (rubric §2). If an experiment is warranted, gate
   the new behavior behind a flag in the code in this PR (`create_flags`) so variants are
   honored — an experiment cannot be wired in after the fact.
4. Keep instrumentation to only what Phase 4 concluded is necessary.

## Phase 6 — Drive to ready-for-review

1. Run the repo's `setup`, `test`, `lint`, and `build` from the config. Fix failures.
2. Self-review for correctness and security (use the host's review skills/commands if
   available). Verify every acceptance criterion and mark validated ones via
   `update_opportunity` (`acceptance_criteria.update[].validated`).
3. Attach a **verification artifact** — a screenshot/GIF/before-after, or a dashboard link
   (`prepare_…/finalize_opportunity_verification_artifact_upload`, or
   `create_opportunity_verification_link_artifact`) — linked to the relevant acceptance
   criterion.
4. Open the PR (small, well-described, linked to the opportunity). Create
   `DELIVERED_VIA` (PR URL) and `IMPLEMENTED_BY` (agent attribution). Set
   `update_opportunity_status → FOR_REVIEW`.

## Phase 7 — Gates (hand back to a human)

- 🚦 **Merge gate.** Never merge unless `allowMerge` is true *and* a human approved this
  run. Summarize the change + evidence and hand back. In `attended` mode you may offer to
  watch the PR and auto-fix CI / clear unambiguous review comments; route *ambiguous*
  comments to the human instead of guessing. In `unattended` mode, park at `FOR_REVIEW`
  and report.
- 🚦 **Experiment-launch gate.** If an experiment is warranted, *prepare* it with
  `create_experiment` (primary success metric + at least one guardrail, control/treatment
  variants, deployment) and link it to the opportunity — but **launching to real traffic
  waits for explicit human approval**. Never start an experiment yourself.

## Phase 8 — Replenish (only when the backlog is empty)

If no workable `NEW`/`PLANNED` opportunities remain, generate net-new ideas guided by
accumulated learnings:

1. `search_opportunities` first to avoid duplicates.
2. `submit_opportunity_idea` (tied to an objective) for genuinely new gaps, up to
   `maxNewIdeasPerRun`. Don't flood the backlog.

## Run summary

End every invocation with a concise summary suitable for a human skim or an automation
log: per opportunity — claimed / shipped-to-review / parked-at-gate / dismissed /
deferred (with reason) — plus any instrumentation recommendations raised and any new
ideas submitted.

## Troubleshooting

- **Lease race / someone else claimed it mid-flight.** Defer gracefully; comment if you'd
  already started, and pick the next candidate.
- **No config found.** Ask for `projectId` + the repo's test/build commands; default caps
  to 1 and keep both gates off.
- **Opportunity targets a repo not in this workspace.** Defer it (report in the summary);
  this in-ADE loop only works repos available locally.
- **Tests/build can't run here.** Don't claim ready-for-review. Open the PR as a draft,
  note the gap on the opportunity, and leave it `IN_PROGRESS`.
