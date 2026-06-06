# `self-improving-product` — Design Plan

> Status: **PLAN — not yet implemented.** This document is the agreed design before
> any code is scaffolded.

An experimental, **self-contained** Amplitude plugin that turns the Opportunity
Manager into a closed loop: pull the latest opportunities, validate and improve
the plan, implement the change with coding agents, get the PR to a ship-ready
"for review" state, decide whether it needs an experiment, track the outcome via
the right metric, and feed learnings back so the system gets better over time.

The plugin is the **orchestrator**. Amplitude's MCP tools (Opportunity Manager,
analytics, experiments, instrumentation) are the hands.

---

## 1. Design decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| Dispatch model | **In-ADE loop + subagents** | Runs inside the user's ADE session (Claude Code / Cursor / Codex). Spawns local subagents for isolatable phases where the host supports it; falls back to inline phases where it doesn't. |
| Autonomy | **Gate merge + experiment launch** | Fully autonomous up to "ready for review" with attached evidence. A human approves the merge and any experiment that touches real traffic. |
| Packaging | **Standalone experimental plugin** named `self-improving-product` | Installable on its own; must not require any other plugin in this repo. |
| Instrumentation | **Metric-first, instrument last** | Prefer existing metrics/events. Only *recommend* new tracking when measurement is otherwise impossible — never auto-add it. |
| Concurrency | **Respect shared work** | Opportunities are shared objects. Defer when someone else is actively working an item; only take over when their work is demonstrably stale. |
| Invocation | **Manual + automation, same entry point** | Callable on demand by a user in an ADE, and triggerable on a schedule by automations (Cursor/Codex automations, Claude scheduled tasks). One skill, two ways in. |

---

## 2. Constraints that shape the build

1. **Self-contained.** No dependency on the `amplitude` or `amplitude-experimental`
   plugins. The plugin ships its own `.mcp.json` pointing at the shared Amplitude
   MCP endpoint (`https://mcp.amplitude.com/mcp`) and inlines a minimal version of
   any logic it needs (e.g. a lightweight instrumentation-recommendation step
   rather than depending on the full `add-analytics-instrumentation` skill).
2. **Tight footprint.** Two skills, one config example, and a small `references/`
   file for rubrics. Orchestration lives in **skills** (portable markdown) rather
   than a sprawl of agent files, because Cursor and Codex don't share Claude Code's
   custom-agent format — keeping logic in skills preserves cross-ADE portability.
3. **In-ADE reality.** Nothing in the MCP toolset launches an agent. The loop runs
   in the session the user starts and works opportunities whose
   `execution_plan.repository` is available in the current workspace. Opportunities
   for other repos are surfaced and deferred (or handled via `git worktree` when
   checked out locally).

---

## 2b. Invocation modes (flexible triggering)

The same `self-improving-product` skill is the single entry point, runnable two ways:

- **Manual (attended).** A user runs it in their ADE ("work the opportunity backlog",
  `/self-improving-product`, or pointed at one opportunity). The loop can prompt for
  ambiguous decisions and pause interactively at the gates.
- **Automated (unattended).** Triggered on a schedule by Cursor/Codex automations or
  Claude scheduled tasks. No agent-launch API is needed — the automation *is* the
  thing that starts the session; the skill just runs to completion within it.

To stay safe and useful in both modes the loop is **parameterized, not interactive
by default**:

- **Bounded runs.** `maxOpportunitiesPerRun` / `maxNewIdeasPerRun` cap a single
  invocation so a scheduled run can't fan out unbounded.
- **No blocking prompts when unattended.** A `mode` parameter (`attended` |
  `unattended`, default inferred from whether the host is interactive). In
  `unattended` mode the loop **never blocks on a prompt** — it parks the opportunity
  at the gate (`FOR_REVIEW`, or experiment "prepared"), records what it needs from a
  human via `add_opportunity_comment`, and moves on. Gates are still hard stops; they
  just become "report and continue" instead of "wait".
- **Scope filters.** Optional `objectiveId`, `opportunityId`, `tags`, or repo filter
  so a schedule can target one workstream (e.g. nightly run over a single objective).
- **Idempotent + reconciling.** Because every run starts with RECONCILE and checks
  `get_relations` before acting, repeated scheduled invocations are safe and resume
  rather than duplicate.
- **Run summary.** Each invocation ends with a concise summary (claimed / shipped /
  deferred / parked-at-gate / dismissed) suitable for an automation log or a human
  skim.

`measure-outcome` is likewise schedulable on its own cadence (e.g. a daily/weekly
task) since outcomes land days after ship.

## 3. File layout

```
plugins/self-improving-product/
  .claude-plugin/plugin.json
  .cursor-plugin/plugin.json
  .codex-plugin/plugin.json          # parity manifests (CI manifest-sync-check enforces these)
  .mcp.json                          # Amplitude MCP server (shared infra, not a plugin dep)
  README.md
  config/
    repo-registry.example.json       # project -> repo, base branch, build/test cmds, gates, caps
  skills/
    self-improving-product/
      SKILL.md                       # the loop: pull -> claim -> ship -> gate
      references/
        rubrics.md                   # metric-selection, experiment-vs-ship, staleness, RICE recap
    measure-outcome/
      SKILL.md                       # post-ship readout; separate because it runs async, days later
```

Also add `self-improving-product` to the three marketplace manifests
(`.claude-plugin/marketplace.json`, `.cursor-plugin/marketplace.json`,
`.agents/plugins/marketplace.json`) as a third plugin entry.

---

## 4. Lifecycle, mapped to the Opportunity status machine

Amplitude already models the states we need:
`NEW → INVESTIGATING → PLANNED → IN_PROGRESS → FOR_REVIEW → SHIPPED → MEASURED` (+ `DISMISSED`).

| Phase | Status transition | Primary MCP tools |
|---|---|---|
| Pull state | — | `list_objectives`, `list_opportunities([NEW,PLANNED])`, `search_opportunities`, `get_opportunity` |
| Conflict check + claim | → `IN_PROGRESS` | `get_relations`, `create_relation INVESTIGATED_BY` (lease), `update_opportunity_status` |
| Validate / improve plan | `INVESTIGATING` | `get_opportunity`, `query_chart`/`query_dataset`, feedback & replay tools, `update_opportunity` (sharpen AC / solution plan) |
| Pick the metric | — | reuse target metric → else `get_charts`/`get_events`/`search`/`get_metric*` → else recommend |
| Implement | `IN_PROGRESS` | coding agent in repo; `create_flags`/`update_flag` only if experiment-gated |
| Ready for review | → `FOR_REVIEW` | open PR; `create_relation DELIVERED_VIA` + `IMPLEMENTED_BY` + `TARGETS_METRIC`; verification artifacts |
| 🚦 Gate: merge | (human) | — |
| 🚦 Gate: experiment launch | (human) | `create_experiment` prepared with success + guardrail metrics |
| Ship | → `SHIPPED` | on merge |
| Measure | → `MEASURED` | `query_experiment` / `query_chart`; attach before/after artifact |
| Learn + replenish | — | `add_opportunity_comment`, `update_opportunity` metadata, `submit_opportunity_idea` |

---

## 5. The loop (`self-improving-product` skill)

```
0. RECONCILE
   Scan IN_PROGRESS opportunities this agent previously touched; resume any with an
   open PR (get_relations DELIVERED_VIA) instead of starting new work. Prevents a
   dead session from stranding an opportunity.

1. PULL & RANK
   list_objectives + list_opportunities(status=[NEW, PLANNED]); rank by RICE score.

2. FILTER TO WORKABLE
   Keep opportunities whose execution_plan.repository is in repo-registry AND
   available in the current workspace. Surface the rest as "deferred (other repo)".

3. CONFLICT CHECK  (see staleness rubric)
   get_opportunity + get_relations. Skip and move on if someone else holds it and
   the work is fresh. Only proceed/take over when stale.

4. CLAIM (soft lease — verify, don't assume)
   create_relation INVESTIGATED_BY with leaseTtlSeconds (e.g. 1800).
   Re-read relations to confirm no competing fresh claim landed in the race window.
   Then update_opportunity_status -> IN_PROGRESS. Renew the lease during long work.

5. SHIP  (validate -> pick metric -> implement -> review; details in section 6)

6. GATES
   Stop at merge. Stop at experiment launch. Hand back to the human with a summary.

7. ON EMPTY BACKLOG
   search_opportunities to dedupe against existing, then submit_opportunity_idea for
   net-new ideas — guided by accumulated learnings, not random. Cap ideas per run.
```

### 5b. Concurrency & staleness rubric (constraint 4)

Before claiming, gather: `status`, `assignments`, and relations
(`INVESTIGATED_BY`, `IMPLEMENTED_BY`, `DELIVERED_VIA`).

**Defer** (pick the next opportunity) when any of these is *fresh*:

- An `INVESTIGATED_BY` lease that has **not** expired (`expires_at` in the future).
- A `DELIVERED_VIA` PR that is **open with commits in the last N days** (default 5).
- Status is `IN_PROGRESS`/`FOR_REVIEW` with a recent `updated_at`.

**Take over** only when work is **stale**:

- Lease expired, **or**
- Linked PR is closed-unmerged, **or** open with no commits for N+ days, **or**
- No linked PR and status has been `IN_PROGRESS` past a staleness threshold.

On takeover: `add_opportunity_comment` explaining the takeover + evidence of
staleness, then claim. Never silently stomp active work. All thresholds live in
`repo-registry` so they're tunable per team.

---

## 6. `ship-opportunity` phases (inside the loop, via subagents where supported)

**A. Validate & improve the plan**
- Read `execution_plan`, `acceptance_criteria`, `citations`, `rice_score`.
- Re-check the hypothesis against *fresh* data (`query_chart`, funnels, feedback,
  replays). Confirm the problem is still real and the proposed action still fits.
- Sharpen scope and write/lock acceptance criteria (`update_opportunity` metadata).
- **Kill switch:** if invalidated, `DISMISSED` + comment with the evidence. A dead
  opportunity caught here is a successful outcome, not a failure.

**B. Pick the metric (metric-first, instrument last — constraint 2)**
1. If the opportunity already has a target metric (`TARGETS_METRIC` relation or a
   metric in metadata), **use it**.
2. Else find the **closest existing** metric/event/chart (`get_charts`, `get_events`,
   `search`, metric tools). Prefer something already tracked and trusted.
3. Only if no existing signal can measure the outcome **and** measurement is
   essential: **flag a recommendation** — `add_opportunity_comment` + an acceptance
   criterion noting the gap. Do **not** auto-create events/properties. Surface it to
   the human as "instrumentation recommended" and let the customer opt in.
- Record the chosen metric via `create_relation TARGETS_METRIC` (idempotent: check
  `get_relations` first).

**C. Implement**
- Branch / `git worktree` off the configured base. Make the change.
- **Experiment-vs-ship decision** happens here (rubric in references): if an
  experiment is warranted, gate the code behind a flag now (`create_flags`) so the
  variants are honored — the experiment can't be wired after the fact.
- Keep instrumentation minimal: only what step B concluded is necessary.

**D. Get to ready-for-review**
- Run available correctness/security review passes; run the repo's tests/lint/build
  from `repo-registry`.
- Validate each acceptance criterion; attach a **verification artifact** (screenshot
  / GIF / Loom or a dashboard link) via the artifact tools, linked to the AC.
- Open the PR. Create `DELIVERED_VIA` (PR URL) + `IMPLEMENTED_BY` (agent attribution).
  Set `FOR_REVIEW`.
- **Idempotency:** before opening a PR or creating relations/experiments, check
  `get_relations` so re-runs don't duplicate.

**E. Gates (human)**
- 🚦 **Merge gate:** summarize the change + evidence; hand to the human. Optionally
  watch PR activity and auto-fix CI / clear review comments; route *ambiguous*
  comments to the human rather than guessing.
- 🚦 **Experiment-launch gate:** `create_experiment` is *prepared* (success +
  guardrail metrics, variants, deployment) but launching to real traffic waits for
  explicit human approval.

---

## 7. `measure-outcome` skill (async re-entry)

The loop is long-lived but ADE sessions are ephemeral, so measurement is a separate
entry point the user (or a scheduler / `/loop`) runs days after ship:

- For each `SHIPPED` opportunity, read the target metric / experiment
  (`query_experiment`, `query_chart`) over the defined window.
- Set `MEASURED`, attach a before/after artifact, and write the result + learnings
  back to opportunity metadata and `add_opportunity_comment`.
- Roll learnings up to the objective so the next discovery/replenishment round is
  smarter. (See open question in §9 about durable product-area memory.)

---

## 8. `repo-registry.example.json` (shape)

```jsonc
{
  "projectId": "187520",
  "defaults": {
    "mode": "attended",            // "attended" | "unattended" (scheduled/automation)
    "staleLeaseGraceMinutes": 30,
    "stalePrInactivityDays": 5,
    "maxOpportunitiesPerRun": 3,
    "maxNewIdeasPerRun": 2,
    "dryRun": false
  },
  "repos": [
    {
      "repository": "amplitude/example-app",   // matches execution_plan.repository
      "baseBranch": "main",
      "setup": "pnpm install",
      "test": "pnpm test",
      "lint": "pnpm lint",
      "build": "pnpm build",
      "allowMerge": false,          // hard gate; loop never merges
      "allowExperimentLaunch": false // hard gate; loop never launches to traffic
    }
  ]
}
```

---

## 9. Open questions / risks to resolve before/while building

1. **Durable product-area memory.** `create_relation` accepts `PRODUCT_NODE` /
   `PRODUCT_EDGE` as source types, but there's no visible tool to *create/update*
   those nodes. Until confirmed, "memory" lives in opportunity metadata + comments +
   objective context. **Confirm with the MCP team** whether a product-node write API
   exists or is planned.
2. **Cross-ADE subagents.** Claude Code supports subagents; Cursor/Codex differ. The
   skill must degrade to inline phases when subagents aren't available.
3. **Metric availability for measurement.** Some opportunities will have no
   measurable signal without new tracking; per constraint 2 we recommend, not
   auto-instrument — so some outcomes will be "measurement pending instrumentation."
4. **Soft lease races.** `INVESTIGATED_BY` does not prevent concurrent claims; the
   verify-after-claim step narrows but can't fully eliminate races. Acceptable given
   the human merge gate.
5. **Cost / runaway control.** `maxOpportunitiesPerRun`, `maxNewIdeasPerRun`,
   `dryRun`, and the two hard gates bound autonomous spend and blast radius.

---

## 10. Out of scope (v1)

- External dispatcher / cross-repo fan-out (CI or cloud agents launching sessions).
- Auto-merge and auto-launch of experiments (both are hard-gated to humans).
- Heavyweight taxonomy management (the standalone `amplitude` plugin owns that).
