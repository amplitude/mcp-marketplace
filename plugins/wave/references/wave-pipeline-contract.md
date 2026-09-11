# Wave Pipeline Contract

Shared operating contract for every skill in the Amplitude Wave plugin. Read this file
before querying or mutating Wave. Live tool schemas take precedence if they change.

## Scope

Wave opportunities are product-improvement work in Amplitude Wave Opportunity Manager.
They are not Salesforce opportunities, CRM records, sales pipeline, or generic business
opportunities. Use only the `*_wave_*` tools for Wave records.

The plugin is a workflow layer powered by the existing Amplitude MCP server. It does not
wrap or duplicate MCP tools.

## Current tool map

| Need | Tool and action |
|---|---|
| Resolve org/projects | `get_amplitude_context` without `projectId` |
| Resolve project settings | `get_amplitude_context` with numeric `projectId` |
| List/get product areas | `query_wave_product_areas` `list` / `get` |
| Create/update product areas | `manage_wave_product_areas` `create` / `update` |
| Browse/search/get opportunities | `query_wave_opportunities` `list` / `search` / `get` |
| Traverse relations | `query_wave_opportunities` `get_relations` |
| Update opportunity | `manage_wave_opportunities` `update` |
| Submit idea | `manage_wave_opportunities` `submit_idea` |
| Add context | `manage_wave_opportunities` `add_comment` |
| Add relation | `manage_wave_opportunities` `add_opportunity_relation` |
| Attach proof | `manage_wave_verification_artifacts` |
| Find analytics entities | `search_amp_entities` |
| Find events/properties | `search_amp_data_taxonomy` |
| Read saved charts | `get_amplitude_charts` |
| Run ad-hoc analytics | `query_amplitude_data` |
| Flags/deployments | `use_amp_flags` (`create` takes a `flags` array; prepare with `enabled: false`) |
| Experiments | `use_amp_experiments` (`create` requires `projectIds` as an array, not `projectId`) |
| Metric definitions | `use_amplitude_metrics` |

`get_amplitude_context` accepts a numeric project ID. Wave tools accept `projectId` as a
string; convert the discovered app ID to a string rather than guessing another ID.

## Product areas, not objectives

The current Wave API organizes opportunities with `productAreaId`. Older source skills
refer to `objectiveId`, `list_objectives`, and `PRODUCT_NODE`; do not use those names.
Resolve product areas through `query_wave_product_areas`.

## Customer configuration

At the start of every skill, look for `wave-config.json` in the **application** workspace
root and then `.amplitude/wave-config.json`. This file belongs in the product repository
being changed, not in the marketplace checkout. Use it when present for project ID,
repository mapping, commands, measurement window, staleness, and per-run caps.

- Validate the configured project ID against `get_amplitude_context`; never trust or guess
  an inaccessible ID.
- Standalone dispatch/babysit skills use the repository commands from this config.
- Standalone close-out uses its measurement window.
- Missing config is acceptable in attended mode; ask only for context the task needs.
- Missing config in unattended autopilot permits read-only reconcile only, then park.
- Merge and live experiment launch gates are not configurable.

## Query discipline

1. Use `list` or semantic `search` only to discover candidate IDs.
2. List/search descriptions are truncated snippets. Call `get` before any verdict,
   status change, dispatch, or relation write.
3. Do not paginate through the entire backlog. Use the first page plus `totalCount`, then
   narrow by status, tags, product area, or semantic search.
4. For each candidate, query relations in both directions when the workflow depends on
   PRs, agents, blockers, parents, children, charts, or metrics.
5. Never invent project, product-area, opportunity, relation-target, metric, chart,
   flag, experiment, deployment, PR, or agent IDs.

## Canonical lifecycle

`NEW → PLANNED → INVESTIGATING → IN_PROGRESS → FOR_REVIEW → SHIPPED → MEASURED`

`DISMISSED` is terminal unless a human explicitly reopens the opportunity.

Status is coarse workflow state, not proof:

| Status | Required interpretation |
|---|---|
| `NEW` | Surfaced but not ready for implementation |
| `PLANNED` | Analyzed enough for codebase validation |
| `INVESTIGATING` | Validated or actively being sharpened |
| `IN_PROGRESS` | Implementation exists, but no reviewable PR is ready |
| `FOR_REVIEW` | A real linked PR is open and reviewable |
| `SHIPPED` | Delivery is verified merged/deployed |
| `MEASURED` | Outcome evidence or an explicit measurement fallback is recorded |
| `DISMISSED` | The problem itself is demonstrably invalid or obsolete |

Never infer completion from status alone. Reconcile relations and external PR state.

## Normalize every opportunity

Build this in memory from `get` plus incoming and outgoing relations:

```yaml
id: <uuid>
projectId: <string>
productAreaId: <id>
title: <title>
status: <status>
canonicalTags: []
originalTags: []
repositories: []
executionPlan: {}
acceptanceCriteria: []
citations: []
rice: {}
relations:
  incoming: []
  outgoing: []
prs: []
agents: []
measurement:
  metrics: []
  charts: []
  experiments: []
verificationArtifacts: []
```

Normalize repositories from execution-plan metadata, relation metadata, PR URLs, and
comments. Preserve the raw values so a human can audit the inference.

## Tags

Normalize aliases in memory, but preserve useful raw tags on writes:

| Canonical | Legacy alias |
|---|---|
| `execution-method.code` | `execution-method-code` |
| `execution-method.hybrid` | `execution-method-hybrid` |
| `execution-method.guide` | `execution-method-guide` |
| `agent-autonomous.low` | `agent-autonomous-low` |
| `agent-autonomous.medium` | `agent-autonomous-medium` |
| `agent-autonomous.high` | `agent-autonomous-high` |
| `location.frontend` | `location-frontend` |
| `location.backend` | `location-backend` |
| `location.mix` | `location-mix` |

Workflow tags include `agent-approved`, `needs-human-review`, `needs-replan`, `pr-open`,
`pr-ready`, `pr-merged`, `pr-closed`, `pr-blocked`, `agent-failed`,
`retries-exhausted`, `instrumented`, and `needs-instrumentation`.

Prefer `tagsToAdd` / `tagsToRemove`. If using full `tags`, merge intentionally; never
erase domain, sizing, location, execution-method, or feedback tags accidentally.

## Idempotent writes

Before every mutation, re-read the opportunity and relevant relations.

- Do not add a comment when an equivalent structured comment already exists.
- Do not create a relation when the same source, type, and target already exist.
- Do not open a PR when a matching open PR or active implementation relation exists.
- Do not create a flag, experiment, or metric before searching for a linked/equivalent
  entity.
- Use `metadataPatch` for partial metadata changes; nested keys use `snake_case`.
- Add a short `rationale` to every MCP mutation.
- In attended mode, present the proposed batch and obtain confirmation before mass status
  changes or dismissals.

## Relations and claims

Known relation conventions:

- `DELIVERED_VIA` → `GITHUB_PR`, with the full PR URL as `targetId`.
- `IMPLEMENTED_BY` → an agent/session only when a stable target ID exists.
- `INVESTIGATED_BY` → an agent/session soft lease only when a stable target ID exists.
- `TARGETS_METRIC` → `METRIC`.
- Parent/child, blocker, chart, and other relation types may be reused when discovered in
  the opportunity or confirmed by the live tool schema.

`add_opportunity_relation` requires `sourceType`, `sourceId`, `relationType`,
`targetType`, `targetId`, and `productAreaId`. For opportunity-originated relations use
`sourceType: OPPORTUNITY` and the opportunity ID as `sourceId`; do not pass it as `id`.

Claims are soft. Pass `leaseTtlSeconds`, re-read relations after claiming, and defer if a
competing fresh claim won. Do not fabricate an agent ID just to claim work. If the host
does not expose a stable session ID, record attribution in a comment and rely on PR state.

## Dismiss conservatively

The evaluator's job is to improve real opportunities, not clear the queue.

Default outcomes:

- `APPROVE`: problem is real; write a codebase-grounded improved plan.
- `NEEDS_HUMAN_REVIEW`: evidence is ambiguous, sensitive, or needs product judgment.
- `NEEDS_REPLAN`: problem is real but plan, repo, sizing, or strategy needs correction.

Use `DISMISSED` only when the problem statement itself is demonstrably invalid or
obsolete: already shipped and verified, unrecoverably inaccurate evidence, or the
behavior no longer exists in both current code and relevant fresh evidence.

Weak plans, wrong repositories, low RICE, questionable strategy, or non-code portions are
replan/routing inputs—not automatic dismissals.

Every dismissal requires explicit human confirmation. In unattended mode, record a
proposed `DISMISS`, add `needs-human-review`, and park without changing status. After
confirmation, map verdict `DISMISS` to status `DISMISSED`.

## Verification

For hosted proof use `create_link`. For a local screenshot, GIF, video, or log:

1. `prepare_upload` with `opportunityId`, `filePath`, and `mimeType`.
2. Execute the returned upload command exactly.
3. `finalize_upload` with the returned `artifactId`.

Use one-based `acceptanceCriterionIdx` to bind proof to a criterion. Frontend work should
normally include a screenshot or GIF. Never mark `FOR_REVIEW` when required acceptance
criteria remain unverified; leave the work `IN_PROGRESS` and explain the gap.

## Experiment and measurement gates

Decide experiment versus direct ship before implementation so experiment-worthy behavior
is flag-gated in the PR.

- Search before creating flags, metrics, or experiments.
- Use an existing trusted metric before creating a new metric.
- Create new tracking only after explicit user approval.
- Preparing a disabled flag or draft experiment is allowed only in an explicitly invoked
  experiment/autopilot workflow.
- Never enable rollout to real users or launch an experiment without explicit human
  approval in the current run.
- Never merge a PR without explicit human approval in the current run.

The Wave relation tool explicitly documents PRs, agents, charts, metrics, and opportunity
relations. For flags/experiments, create a Wave relation only when the live descriptor or
an existing relation proves the target type is supported. Otherwise persist the ID/key in
opportunity metadata, add an idempotent comment, link back to the opportunity from the
experiment, and always link the supported metric relation.

## Durable memory

Wave is the source of product truth. Store plan decisions, overrides, evidence, agent/PR
links, experiment IDs, and outcomes in opportunity metadata/comments/relations. Store
product-area-level preferences in product-area metadata when available.

Local files hold only operational configuration, test fixtures, and run logs. They must
not become a competing opportunity database.

## Attended and unattended behavior

- `attended`: may ask focused questions and must stop at confirmation gates.
- `unattended`: never block on a question. Park the opportunity, add a concise comment
  describing the decision needed, and continue within configured caps.

Both modes reconcile before acting, resume idempotently, and stop at merge and live
experiment launch.
