# Audit modes

Read only the selected mode plus the shared rules in `../SKILL.md`.

## 1. General stale events/properties

Find objects with no meaningful activity over the last two to three months,
preferably using a 180-day volume and query window, and no current code
references. Exclude default/system objects, required active schema fields,
unresolved dynamic instrumentation, and planned objects with no first-seen date
unless the user explicitly widens the audit.

## 2. Cross-app overlap

Compare the target project with another app or source. A same-named object is a
candidate only when target-side ingestion is zero and ownership plus source
code show it belongs to the other app. Audit both apps' emitting code. Treat
global and event-scoped properties separately.

## 3. Planned but never ingested

Use event metadata, not only an export, to inspect creation time, first seen,
last seen, status, sources, owner, and schema. Prioritize old creation dates
with empty first-seen values, then check all identified source roots, generated
clients, dynamic paths, and upcoming work. A planned object may be intentionally
staged. For properties, verify owning events, required status, and global/event
scope.

## 4. Global orphan properties

Find active global properties with zero active event attachments. Reconstruct
ownership from a complete export and verify global state through fully
paginated taxonomy reads. Keep these distinct:

- active globals with no active owner;
- globals owned only by deleted events;
- already globally deleted properties;
- shared globals with another active owner.

Recent global `lastSeen` can come from an unexpected or dynamically emitted
event even when no active schema attachment is visible. Compare it with parent
event last-seen times and inspect code before deleting.

## 5. Dead generated-client definitions

Map each generated event or property to its method or class, then trace all
production consumers. Classify it as reachable production, dynamic/wrapper,
tests only, generated only, or unknown external owner. Audit every repository
that can consume the generated source, not just the repository containing it.
Only generated-only or independently proven dead definitions are strong
candidates.

When code cleanup is requested, pull the affected generated client from the
tracking-plan branch and inspect its diff. Reject unrelated drift or removals
that break reachable callers. After the tracking-plan branch merges, point the
client configuration back to main, pull again, and rerun affected builds and
consumer type checks using the customer's actual commands.

## 6. Duplicate events/properties

Generate candidates from casing, separators, prefixes, aliases, scoping,
custom-event overlap, and similar payloads. Choose the canonical object from
current production emission and telemetry, not plan status or naming
convention alone. Check schemas, dependencies, dual emission, migration
comments, and dynamically constructed final names.

If the canonical object must be added or restored, stop this deletion audit and
report that prerequisite. It belongs in a separate additive workflow and must
be completed before a fresh deletion-only audit begins.

## 7. Retired features, routes, flags, or experiments

Find objects tied to removed features, routes, experiments, or flags. Verify
retirement in code, production activity, and lifecycle metadata.

Before auditing, ask the user which connected capabilities cover:

- monitoring, APM, logs, route traffic, and background jobs;
- feature flags and remote configuration;
- experiments and rollouts;
- deployments or change history when useful for timing.

Inspect the available MCP or app catalog and use the customer's connected
systems read-only. For routes and jobs, check traffic over a
project-appropriate window and account for aliases, retries, scheduled cadence,
and environment. For flags and experiments, inspect active or archived state,
allocation, rollout history, last exposure, and related code references. For
deployments, correlate removal dates with the drop in ingestion or traffic.

If a relevant system is not connected, ask the user for an alternative source
or exported evidence and mark that signal unresolved. Do not infer retirement
from missing access. Code absence, zero traffic, archival, or stale ingestion
is supporting evidence, not proof by itself; resolve dynamic paths,
dependencies, and source ownership. Do not mutate monitoring, flag,
experiment, or deployment systems as part of this audit.

## 8. High-volume, low-query instrumentation

Prioritize project-relative high-volume objects with little or no saved-query
usage. Volume is the prioritization signal; do not impose a universal cutoff.
Inspect amplification from mount effects, hovers, loops, per-item logging,
retries, mirrored services, temporary diagnostics, and observability already
covered elsewhere.

For actively ingested objects:

1. Remove emitters in separate PRs by repository or independently deployable
   service ownership.
2. Deploy and verify ingestion reaches zero while product and operational
   behavior remain intact.
3. Delete taxonomy objects later on a deletion-only tracking-plan branch.
4. Sweep global properties owned only by the deleted events.

Deduplicate savings across mirrored implementations. Report the measured
lookback and label any annualized estimate.

## 9. Code still emitting deleted or blocked events

Find deleted or blocked events still emitted by production code. Search
generated clients, direct SDK calls, wrappers, constructed names, and every
identified emitter. Remove only analytics instrumentation while preserving
product and API behavior. Keep code PRs split by repository and independently
deployable service. Report unresolved external owners instead of guessing. Do
not restore taxonomy objects in this mode.
