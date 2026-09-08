# Deletion mutation and verification

Read this before creating or changing an Amplitude tracking-plan branch.

## Authorization and scope

- Use the catalog's workspace or branch read capability to inspect approval,
  protection, and branch settings when exposed.
- Create a uniquely named feature branch from current main only when the user
  explicitly requests it. If safe branch-based review is required but
  unavailable, stop before destructive writes and explain the limitation.
- Re-read the exact candidates on fresh main and branch snapshots.
- Run every deletion as a two-step operation: first omit the current schema's
  confirmation control and show the confirmation-required response, including
  exact names, scope, project, branch, and soft-delete/hard-removal buckets;
  then wait for explicit user confirmation before making the confirmed call
  exactly as that schema requires. If candidate state or the preview changes
  while waiting, show a fresh preview and obtain confirmation again.
- Delete only the confirmed names and scopes. Earlier general approval such as
  "clean up related objects" is not confirmation for newly discovered targets.
- Do not merge or delete the tracking-plan branch unless the user separately
  asks and confirms that exact destructive action.
- If additions, restorations, or metadata changes are needed, stop and report
  the prerequisite. Do not perform it inside this skill.

## Select public mutation capabilities

Inspect the connected public Amplitude MCP catalog immediately before each
mutation. Select only capabilities whose advertised schemas explicitly support:

- raw tracking-plan event deletion by exact name and branch;
- event-property deletion by exact name, property scope, and branch;
- a two-step destructive confirmation response and confirmed retry;
- the intended soft-delete or hard-removal transition.

For property deletion, use the schema's documented per-event scope field to
delete only one event attachment. Omit that field only when the schema
explicitly documents omission as a plan-wide/global deletion and the user has
separately confirmed that broader scope. Never guess an action, parameter, or
omission behavior from an older tool version.

## Soft-delete versus hard removal

Explain the tool's bucketed behavior before asking for confirmation:

- An ingested event is soft-deleted and can be restored by a separate workflow.
  A never-ingested planned event is hard-removed and cannot be restored.
- A live or unexpected event property is soft-deleted. A planned property is
  hard-removed. For an event-scoped target, hard removal unlinks only that
  event; for a global target, it removes the plan-wide property.
- Soft-deleted objects remain visible when the active taxonomy reader is asked
  to include deleted objects. A hard-removed never-ingested object is absent.

Deletion or blocking does not erase already-ingested historical data.
Historical data remains queryable in existing analyses, while future ingestion
for the deleted or blocked tracking-plan object stops immediately on main or
after its branch is merged. Check enforcement settings to explain the exact
rejection or handling behavior without weakening that distinction.

## Global property scope

Deleting a property attachment under one event is not global property
deletion. Set the mutation schema's event-scope field for an event-scoped
target; omit it only when the current schema explicitly defines omission as a
separately confirmed plan-wide/global delete. Never create or restore a global
property as a cleanup side effect.

After deleting events, always perform a global orphan-property sweep. Present
the resulting global candidates as a separate batch and obtain separate
explicit confirmation before deleting any of them.

## Deletion-only invariant

Compare fresh main and branch exports at event and property levels. The only
allowed tracking-plan differences are the exact approved soft-deletes of
ingested/live/unexpected objects and exact approved hard-removals of
never-ingested/planned objects.
Before completion, report:

- the exact approved event and property transitions;
- `0 additions`;
- `0 restorations`;
- `0 metadata-only changes`.

If anything else changed, stop and report the unexpected difference. Do not
make an additive, restorative, or metadata correction inside this skill; any
reversion of unintended branch-local changes requires separate explicit
authorization. Do not rely on export `Action` fields or UI counters.
Deleted parent events may hide child rows in an export; accept that only after
verifying no global object was added, restored, or changed.

## Global verification

After plan-wide property deletion, fully paginate the connected event-property
taxonomy reader on the branch with deleted objects included. Prefer the
catalog's consolidated taxonomy reader when exposed, using only its advertised
event-property and deleted-object selectors.

Verify each soft-deleted global at the response's documented global scope with
deleted status. Verify each hard-removed never-ingested global is absent.
Confirm the accumulated row count matches the API total and no cursor failed;
retry transient failures rather than accepting a short read.

Finally export main and branch again and compare stable taxonomy fields while
excluding telemetry fields that can drift between export timestamps.
