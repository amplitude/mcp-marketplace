---
name: copy-tracking-plan-to-projects
description: Copies selected tracking-plan events, or every event in the plan, from one Amplitude project's main or branch to other projects through run_amp tracking-plan CSV export/import, reviews each import branch, then merges, deletes, or leaves it as the user chooses. Use when asked to copy a tracking plan, tracking-plan changes or events to other projects, or to keep the same tracking-plan edits in sync across projects.
x-amp-flags: [mcp-run-amp]
---

# Copy tracking plan to projects

This skill covers only taxonomy data from tracking-plan CSV (events, event
properties, and referenced property-group rows present in that CSV). It does
not cover instrumentation, data sources, destination setup, governance rollout,
or branch reviews and approvals. It merges an import branch only when the user
explicitly asks in step 8.

## Required inputs

- Source project (id or name) and optional source branch name.
- One or more target projects (ids or names).
- Event names to sync, or **all events** (the whole events tracking plan of
  the source main or branch). If the user names a source branch but no
  events, step 2 derives them from that branch.
- Optional branch-name prefix for target imports.

Important `run_amp` constraints:
- Inline CSV cap is 256 KiB (262,144 characters) for import and export output.
- `dry-run` is not supported for tracking-plan export/import in run_amp.
- Import must create a new branch; never use `main` or `master`.
- Never set or change the CSV `Action` column; a value there can make import
  delete objects. Exports leave it empty except for `IGNORE` on events and
  properties that are unexpected (seen but not planned), deleted or blocked
  on the source; step 3 drops those rows.
- For an event the target already has, import makes its sources, tags and
  property-group links match the CSV: ones the target has but the CSV lacks
  are removed. Sources are matched by name; a source name the target does
  not have is skipped. Properties the target's event has but the CSV lacks
  are not unlinked.

## Workflow

1. **Pre-flight**
   - Use one Amplitude MCP server (one region and environment) for every call
     in this run. If several are connected (for example US and EU) and the
     user did not say which, ask.
   - Call `run_amp` with `command: ["help", "tracking-plan", "export"]` and
     `command: ["help", "tracking-plan", "import"]`.
   - If either command is unavailable (`availableThroughRunAmp: false`) or the
     help call fails, stop and tell the user run_amp tracking-plan CSV is not
     enabled in the current MCP environment.

2. **Resolve and validate inputs**
   - Call `get_amplitude_context` with no `projectId`. Use its `projects` list
     for every check below, and keep `user.orgRole` for step 4 (`4` or `5`
     means org admin).
   - Resolve every project given by name to an id by exact `appName` match.
     If there is no exact match, or several projects match exactly, list the
     candidates with ids and ask which one is meant. If one project matches
     exactly but others have near-identical names (for example a `[TEMP]` copy
     or a `(Dev)` variant), use the exact match and list the look-alikes with
     ids in the step 4 preview so the user can correct it at the gate.
   - The source and every target must be in `projects`; stop and name any that
     is not (no access, or a different org). The source must not also be a
     target, and target ids must be unique.
   - If no events were given but a source branch was, call `get_amp_taxonomy`
     with `action: "branch_changes"` on the source branch, list the events it
     adds or updates, and ask the user to confirm the event list.
   - **All-events mode** applies only when the user asks for the whole
     tracking plan or all events (for example "copy the tracking plan from A
     to B"). If they gave neither events nor a source branch and did not say
     all, ask whether they mean all events or specific ones; never assume
     all. In all-events mode the event list comes from the step 3 export.
   - Otherwise, ensure every event name is non-empty. If source branch is
     empty, export from main by omitting `branch-name`.
   - Build one target branch name per target, using a UTC timestamp:
     `<prefix-or-taxonomy-sync>-<source-project>-<yyyymmddhhmm>-<target-project>`.
     Slugify each project name: replace every run of characters other than
     letters, digits and `-` with a single `-`, and trim leading and trailing
     `-` (`[TEMP] Web App (Dev)` becomes `TEMP-Web-App-Dev`).
   - For each target, call `get_amp_taxonomy` with `action: "workspace"`:
     - if a branch with the planned name already exists, propose a new name,
     - keep `eventNC` / `propertyNC` (naming conventions) for step 4.

3. **Export from source project for the selected events**
   - `command: ["tracking-plan", "export"]`
   - The run_amp contract accepts one `event` value per call, so for multiple
     events, run one export per event from the same source branch or main:
     - `flags.project = <source_project_id>`
     - optional `flags.branch-name = <source_branch_name>`
     - `flags.type = "events"`
     - `flags.event = <one_event_name>`
   - **All-events mode:** run one export with the same flags but no
     `flags.event`, and never set `include-deleted`. The selected events are
     the `Object Name` of every `Event` block in that CSV. Apply the merge
     rules below to that one CSV (they drop `IGNORE` rows and check
     `Action`). If the export fails or the merged CSV is over the cap, stop
     and suggest copying named events, or a source branch's changes, in
     smaller runs.
   - Stop before import if any export fails (`ok` is false, or a tool error,
     which includes over-cap errors), if `stderr` reports unmatched event names,
     or if the CSV has no `Event` row.
   - Merge exports by CSV blocks, not by individual row de-dup:
     - split each CSV into blocks: one row with non-empty `Object Type` plus
       following continuation rows until the next non-empty `Object Type`,
     - keep header once,
     - keep each `Property Group` block once, keyed by `Object Name`,
     - keep every `Event` block,
     - emit all `Property Group` blocks first, then all `Event` blocks,
     - drop every property row whose `Action` is `IGNORE`, and drop the
       whole block of an `Event` row whose `Action` is `IGNORE` (dropping
       only the event row would attach its property rows to the block
       before it); keep each dropped name, and its event, for the step 4
       preview,
     - stop if any row has any other non-empty `Action`,
     - keep all other row values as-is.
   - Stop if merged CSV is longer than 262,144 characters.
   - **Find source metadata the CSV does not carry.** Never copy it; step 4
     only warns. On the same source branch or main, call `get_amp_taxonomy`:
     - `action: "events"`, `eventTypes` = the selected events, `fields` =
       `["name", "description", "isOfficial", "mergedFrom"]`;
       for more than 100 events, split `eventTypes` into batches of 100,
     - `action: "properties"`, `propertyType: "event"`, `names` = every
       `Event Property Name` in the merged CSV, from both `Event` and
       `Property Group` blocks, `fields` = `["name",
       "classifications", "isSplit", "mergedFrom"]`. `names` takes at most
       100 per call, so split longer lists into batches of 100 and combine
       the results. If any batch fails, say the "not synced" preview in
       step 4 is incomplete rather than leaving those properties out.
     - These reads expose neither event classifications nor property
       `isOfficial`; step 4 says those were not checked.
     - A field absent from a row means it is not set.
     - If either call fails, do not stop; step 4 says the check was skipped.

4. **Show preview**
   - For each requested event, show the event name and the row count from its
     export.
   - In all-events mode, say so, show the event count, and list the event
     names. Say the targets keep any events and properties they have that
     the source lacks; nothing is removed.
   - Also show:
     - total merged row count,
     - each property group in the merged CSV, with its properties and the
       selected events that link it,
     - source project/branch,
     - full target list with ids, names and planned branch names.
   - If step 3 dropped `IGNORE` rows, list those events and properties (per
     event) and say they are unexpected, deleted or blocked on the source, so
     they will not be synced. To sync one, plan it on the source first and
     rerun.
   - **Replaced on existing events.** For targets that already have a
     selected event, say its sources, tags and property-group links will be
     made to match the CSV, and ones the CSV lacks will be removed. List each
     selected event's `Event Source` values and say a source name the
     target does not have is skipped, which can leave the event with fewer
     sources than before.
   - Naming conventions: if a target's `eventNC` or `propertyNC` is set and a
     selected event or property name does not follow it, say which names and
     which target. Import copies names as-is.
   - **Not synced.** From the step 3 metadata reads, list each selected event
     or property whose source has any of the following, and say it will not
     reach the targets and must be set there by hand if wanted:
     - event `isOfficial: true`,
     - property `classifications`,
     - `mergedFrom` on an event or property (a merge is a project-wide
       transformation),
     - property `isSplit: true` (property splitting is set per project),
     - an `ampl://` image in an event description (it will not resolve in
       another project).
     This list reflects the CSV columns when the skill was written. If the
     merged CSV header has a column for one of these fields (for example an
     official column), the import carries it: leave that field out of this
     list and the line below, and in step 7 check the import `breakdown` for
     unmapped counts.
     If the reads failed, say this check was skipped. Always add one line:
     event classifications and property official status were not checked,
     and custom and labeled events, value mappings, derived, lookup and
     persisted properties, and filters are never synced.
   - Write permission: if `orgRole` is `4` or `5`, say the user is an org
     admin and can write every target. Otherwise, ask the user to make sure
     they have the **Update Tracking Plan** permission on every target project
     and on any project sharing its tracking plan (for example its production
     environment), or the import may fail with a 403.

5. **Confirmation gate**
   - Stop and ask for explicit confirmation before any import.
   - State that each import creates a new branch on the target and that
     creating it publishes any unpublished changes on that target's main as a
     new main version. Deleting the branch later does not undo that.
   - Do not continue on implied approval.

6. **Import to each target project branch**
   - Import one target at a time, in order; wait for each result before the
     next. For each target, call:
     - `command: ["tracking-plan", "import"]`
     - `flags.project = <target_project_id>`
     - `flags.branch-name = <target_branch_name>`
     - `flags.csv = <merged_csv_text>`
   - Handle responses by run_amp result:
     - **success:** `ok: true` and `exitCode: 0`; record `body.data.branch_name`,
       `body.data.branch_id`, and `body.data.breakdown`. `event_properties`
       counts distinct properties, not event-property links: a property on two
       events counts once. A change to one event's override of a property
       (for example its `Property Required`) counts under `events.updated`,
       not `event_properties`. Check links and values in step 7, not here.
       If any `removed` count in `breakdown` is above 0, import no further
       targets and report it. The counts may not include sources, tags or
       property-group links removed from existing events; step 7 checks
       those. Import does not unlink properties the target's event has but
       the CSV lacks; they stay.
       If every `breakdown` count is 0, say the branch was created with no
       changes (the target already matches) and suggest deleting it in step 8.
     - **409 conflict:** `ok: false`, `exitCode: 1`, and `stderr` JSON contains
       `error.http_status: 409`; import no further targets. A branch with the
       planned name was created after step 2 checked; it is not from this run,
       so never offer to delete it, even though the message says `Import
       branch name conflict`. Ask the user for a new branch name strategy.
     - **403 forbidden:** `stderr` contains `error.http_status: 403`, or the
       error says permissions are insufficient. Do not retry. Import no further
       targets. Tell the user they need the **Update Tracking Plan** permission
       on that target (or org admin) and that an org admin can grant it.
     - **any other failure or tool error:** import no further targets. Report
       `stderr`, or the tool error message, verbatim. If the failure names an
       `Import branch`, state that branch exists and must be reviewed or
       deleted in Amplitude Data before any retry.
   - After any failure, still run steps 7-9 for targets already imported.

7. **Review each imported branch**
   - Never approve, and do not merge during review (merging is only a step 8
     choice). Do not open a branch review or refresh the
     branch. Do not re-export from target branches.
   - Do not pass `detail` or `detailFor` to `branch_changes`: per-field
     detail needs an open branch review, which a fresh import branch never
     has, so it always comes back `detailUnavailable`. The reads below give
     the field values instead.
   - **Per target, these reads** with `get_amp_taxonomy`, all with
     `projectId = <target_project_id>`:
     - `action: "branch_changes"`, `branchName = <target_branch_name>`,
     - `action: "events"`, `branchName = <target_branch_name>`,
       `eventTypes` = the selected events, `fields` =
       `["name", "displayName", "description", "category", "tags",
       "sources"]`,
     - one `action: "properties"` call **per selected event**, with
       `propertyType: "event"`, `branchName = <target_branch_name>`,
       `eventType = <event>`, `names` = the properties in that event's block
       of the merged CSV plus the properties of every property group the
       block links (`Event Property Group` rows); an event that only links a
       group has no property rows of its own. `fields` = `["name", "type",
       "isRequired", "isOverridden",
       "enumValues", "constValue", "regex", "isArrayType", "isHidden"]`.
       If an event has more than 100 properties, split `names` into batches
       of 100, as in step 3. Always pass `eventType`: without it the read
       returns the plan-wide
       definition and misses event-level overrides, which is where the
       import writes an event's own `Property Required` and similar values.
     In all-events mode, run the events read (with `eventTypes` in batches
     of 100) and the per-event properties reads only for the events
     `branch_changes` marks **Added** or **Updated**. Report the count of
     the other events as unchanged by the import and not re-read.
     If `branch_changes` marks any entity **Updated**, repeat the events read
     and the per-event properties reads on the target's main (omit
     `branchName`), limited to those entities, for their before values. An
     event-level property change shows only on its event, as **Updated**
     with `propertyChangeCount` above 0 and no entry under `properties`; treat
     such an event's properties as Updated too.
   - **Branch vs main.**
     - From `branch_changes`, for each selected event, its properties, and
       its property groups (listed under `templates`), report whether it was
       **Added** (new to
       the target) or **Updated** (existed on the target's main and was
       changed).
     - For each **Updated** event or property, report the fields that differ
       between the main read and the branch read. Call out any source, tag or
       property-group link that main has and the branch lost.
     - No read returns a property group's own fields, so for a group marked
       **Updated** report only that it changed. Its effect is checked through
       its properties on each linking event (the per-event reads above, and
       on main for before values). Point the user to Amplitude Data for the
       group itself.
     - Report anything outside that expected set as unexpected. Relay the
       `comparison` field: if it is `"2-way"`, such an entry may be a change
       made on main after the branch was cut rather than an import side
       effect; say so. If it is `"3-way"`, also report any `conflicts`.
   - **Branch vs source.** For each selected event, compare the branch reads
     with that event's rows in the merged source CSV, counting the property
     rows of every `Property Group` block the event links as its own:
     - the event's display name, description, category and tags, and its
       sources (a CSV source the target does not have is expected to be
       missing; say so),
     - each property's event links, `type`, `isRequired` (`Property Value
       Type`, `Property Required`), and, where the CSV sets them, enum
       values, const value, regex, `isArrayType` and `isHidden`,
     - a property listed in the CSV but missing from the event on the branch
       (returned in the per-event read's `missing` list).
     Min/max lengths and values are not readable here; if the CSV sets any,
     say they were not verified.
   - If `get_amp_taxonomy` is unavailable or any of these calls fails, do not
     substitute exports. Report the import `breakdown` counts from step 6,
     state which part of the branch review was skipped, and point the user to
     review the branch in Amplitude Data.

8. **Merge, delete or leave each branch**
   - Ask the user what to do with each imported branch. They may choose
     differently per target:
     - **Merge**: apply the branch to the target's main. Merging also removes
       the branch.
     - **Delete**: abort the sync for that target and discard the branch.
     - **Leave**: stop here and keep the branch for review in Amplitude Data.
   - Act only on branches created in this run, and only on an explicit
     choice. If the user does not answer, leave every branch in place.
   - **Merge** uses `manage_amp_branches` with `action: "merge_branch"`,
     `projectId`, `branchName`. It is two-step:
     - Call once without `confirmed`. The preview returns `changeCount` and a
       warning. If `changeCount` differs from the step 7 `branch_changes`
       count, or the preview says the branch needs approval or cannot merge,
       do not confirm; tell the user and leave the branch.
     - Show the preview and remind the user that a merge is permanent and
       cannot be undone. On their explicit go-ahead, call again with
       `confirmed: true`.
     - Then read the target's main with `get_amp_taxonomy` (omit
       `branchName`): `action: "events"` for the selected events and one
       `action: "properties"` call per selected event with `eventType`, as in
       step 7 (in all-events mode, for the same events step 7 read). Confirm
       the synced events and properties are on main. Report any that are
       missing.
   - **Delete** uses `manage_amp_branches` with `action: "delete_branch"`,
     `projectId`, `branchName`. It is also two-step: call once, then again
     with `confirmed: true` after the user's explicit go-ahead.

9. **Final response format**
   - Source project + branch.
   - Selected events.
   - Per-event row counts used for import.
   - For each target:
     - target project id and name,
     - branch name,
     - import status,
     - Added / Updated per event, what changed for Updated events, and any
       unexpected entries, or the import `breakdown` and a note that the
       review was skipped,
     - branch-vs-source diff summary,
     - whether the branch was merged (and whether main was confirmed),
       deleted, or left in place.
   - Explicitly state that no branch was approved, and list the targets whose
     main changed because of a merge (or say none did).
   - Explicitly state: this copies only tracking-plan events, not full cross-project
     setup.
