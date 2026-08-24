---
name: wave-autopilot
description: Orchestrates the Wave loop within caps: reconcile, evaluate, dispatch, babysit, optional experiment prep, and close-out. Use when the user explicitly asks to run Wave autonomously, work the Wave backlog end to end, or schedule the self-improving product loop. Not for ranking a morning queue or evaluating a single item.
disable-model-invocation: true
---

# Wave Autopilot

Orchestrate the installed Wave skills. Do not duplicate their detailed procedures.

Read:

- [Wave pipeline contract](../../references/wave-pipeline-contract.md)
- [Decision rubrics](../../references/decision-rubrics.md)
- [Output contracts](../../references/output-contracts.md)

## Hard boundaries

- Never merge a PR.
- Never enable rollout to real users or launch an experiment without explicit human
  approval in the current run.
- Never silently dismiss ambiguous opportunities.
- Never exceed configured opportunity, idea, retry, or concurrency caps.
- Never start new work before reconciling work already in progress.

## Configuration

Load `wave-config.json` from the workspace root or `.amplitude/`. If absent:

- attended mode: ask for project ID and target-repo commands;
- unattended mode: run read-only queue/reconcile, park missing setup, and stop.

Hard gates remain on regardless of configuration.

Supported scope inputs: `opportunityId`, `productAreaId`, tags, repository, and mode.
Default interactive mode is `attended`; scheduled sessions use `unattended`.

## Orchestration

### 0. Reconcile

Invoke `wave-queue` logic over bounded `IN_PROGRESS`, `FOR_REVIEW`, and `SHIPPED` work
previously touched by this workflow.

- Existing PR → `wave-babysit`.
- Shipped and measurement-ready → `wave-close-out`.
- Failed/interrupted agent with resumable branch → resume through
  `wave-dispatch-handoff`.

Complete reconciliation before selecting new work.

### 1. Select

Use `wave-queue` for `NEW`/`PLANNED` opportunities in scope. Honor
`maxOpportunitiesPerRun`. Prefer resumable/high-impact/unblocked work and avoid parent
epics as implementation units. Fetch the selected product area's description/metadata
and recent approve, replan, dismiss, and outcome comments as a compact "team taste"
brief; use it to rank and sharpen work without overriding fresh evidence.

### 2. Investigate

Run `wave-evaluate` for selected opportunities:

- confirm current code state;
- improve plan and acceptance criteria;
- park ambiguity as `needs-human-review`;
- propose dismissal only for conclusive obsolete/invalid problems, then park for human
  confirmation rather than transitioning to `DISMISSED`.

In unattended mode, do not wait for questions. Record the decision needed and continue.

### 3. Experiment decision

When the decision rubric recommends an experiment, invoke `wave-experiment` before the
implementation starts so the coding handoff includes the flag, variants, and metrics.
Prepare the disabled experiment and park live traffic at its human gate. Direct-ship work
bypasses this stage.

### 4. Dispatch and implement

For each approved opportunity, invoke `wave-dispatch-handoff` subject to
`maxConcurrentAgents`. Include the experiment setup in the handoff when applicable. Use
isolated agents/worktrees when available. Resume existing work instead of duplicating it.

### 5. Shepherd

Invoke `wave-babysit` for returned/linked PRs. Drive deterministic CI and review work to a
verified `FOR_REVIEW` state. Park at the merge gate.

### 6. Learn

Invoke `wave-close-out` for shipped work whose measurement window is ready. Persist
outcome evidence and learnings. Do not force early measurement.

### 7. Replenish

Only when no workable backlog remains and `maxNewIdeasPerRun > 0`, invoke `wave-intake`
with measured/product-area learnings. Semantic-search before submission. In unattended
mode, submit only high-confidence, non-duplicate ideas; otherwise park proposals.

### 8. Reflect

After the configured minimum sample, invoke `wave-refine` read-only to identify workflow
and skill improvements. It may propose a patch/PR; it must not silently rewrite the
plugin.

## Attended versus unattended

**Attended**

- Show evaluation batches before Wave writes.
- Ask focused questions for genuine ambiguity.
- Stop at merge and experiment-launch gates.

**Unattended**

- Never block on a prompt.
- Park human decisions with a `wave_gate` comment.
- Continue independent opportunities within caps.
- Finish with a machine-readable `wave_run` summary.

## Failure policy

- Retry transient failures within `maxRetriesPerStage`.
- Authentication/authorization denial: record once and stop affected work.
- Agent/CI failure: preserve branch/session/PR state and mark resumable.
- Tool schema mismatch: do not guess parameters; park and report the incompatibility.
- Run timeout: stop launching work, persist resumable state, summarize.

## Done

The run reconciles existing work, advances bounded opportunities as far as safely
possible, parks every human gate with evidence, and emits `wave_run`.

## Gotchas

- Autonomy means unattended orchestration, not removal of merge/traffic gates.
- The host or automation starts the session; Wave MCP does not launch sessions itself.
- Product-area metadata and Wave records are durable memory; local logs are operational.
- Do not inline sibling skill bodies here—invoke their contracts.
