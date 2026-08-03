---
name: build-charts-with-typed-params
description: Builds Amplitude charts using the typed `chart` parameter on query_amplitude_data — events, filters, group-bys, segments, date ranges, and per-kind fields for segmentation, funnel, retention, sessions, and data tables. Use when creating a chart, modifying or forking a saved one, or when a query returns empty data.
x-amp-flags: [mcp-consolidate-charts]
---

# Build Charts With Typed Params

Express the chart as typed, UI-shaped parameters and let the server compile it.
Do not hand-build raw definition JSON.

## Typed `chart` first

`query_amplitude_data` takes **exactly one of** `chart` or `definition`.

- **`chart` (preferred)** — a small model mirroring the chart builder UI. It is
  compiled server-side by Langley's `CompileChart` into a validated definition,
  so a successful compile is structurally correct by construction. Compile
  errors name the offending field and come back with a fix-oriented hint.
- **`definition` (fallback)** — raw definition JSON. Only for chart types the
  typed model does not cover (`composition`, `revenueLtv`) or advanced params
  with no typed field.

Field names are snake_case; they are validated server-side by Pydantic.

## The one thing that goes wrong

The compiler validates **structure**, not your taxonomy. An event or property
name that doesn't exist won't error — it returns a well-formed chart with
**empty data**, which reads like a real answer of "zero".

Resolve names first with `search`, and `get_properties`
(`propertyType: 'event'` or `'user'`). Use the exact name **and scope** that
comes back. There is no `get_event_properties` tool — if a description mentions
it, use `get_properties`.

## Two workflows

**Create:** `search` for the taxonomy → build the typed `chart` → call
`query_amplitude_data` → `render_amplitude_chart` with the returned
`chartEditId` to show it.

**Modify or fork a saved chart:** `search` to find the chart id →
`get_amplitude_charts` with `include: 'typed'` → edit the returned object →
call `query_amplitude_data` with that `chart` **and** `chartId` set to the saved
chart id. Passing `chartId` links the edit to its parent, and the parent's
params fill any gaps the typed model omits. Reading a real chart back as typed
params is also the fastest way to see how this project spells things.

`get_amplitude_charts` has five modes on `include`: `link` (default; validates
ids, returns URLs, doesn't run the chart), `typed`, `definition` (raw), `data`
(runs it, max 3 ids), and `guide` (schema for the raw fallback). All except
`guide` need concrete ids — resolve them via `search` or `get_from_url` first.

## Building blocks

These are shared across every chart kind.

**Condition** — one filter (`+ Filter by`, or a segment condition):

```jsonc
{ "property": "platform", "op": "is", "values": ["iOS"], "scope": "event" }
```

`op`: `is`, `is not`, `contains`, `does not contain`, `greater than`,
`less than`, `set`, `is not null`. Use `contains` for prefix/substring matching
and `set` / `is not null` for presence. `scope`: `event`, `user`, `group`,
`session`, or `derivedV2` for computed properties — take the scope from the
taxonomy lookup rather than guessing. Group-scoped properties also need
`group_type` (e.g. `"org id"`).

**Event** — `{ event, where[], group_by[] }`. A **composite event** puts several
events in one slot: add `object_type` as `INLINE_CUSTOM_EVENT` (any member
counts) or `COMPARISON_EVENT` (members compared), plus `members[]`.

**Segment** — a population, combining property conditions **and** behaviors:

```jsonc
{
  "where": [{ "property": "country", "op": "is", "values": ["United States"], "scope": "user" }],
  "performed": [{ "event": "Purchase", "op": ">=", "count": 1,
                  "time_type": "rolling", "time_value": 30 }]
}
```

Omit `segments` entirely for all users. In `performed`, `time_type` defaults to
`forEachInterval`; use `rolling` with `time_value` as **lookback days**.

**Date range** — required, and either relative or absolute, never both:

```jsonc
{ "relative": "Last 30 Days" }
{ "start": 1716854400, "end": 1717459200 }   // epoch seconds; omit end for "up to now"
```

Optional `timezone` is an IANA name; omit for the project default.

**Interval** — a word, not a number: `hour`, `day` (default), `week`, `month`,
`quarter`. Sub-daily intervals only allow short windows (`hour` caps around
8 days).

**`count_unique_by`** — the counting entity, `"User"` by default, or a group
like `"org id"`.

## Chart kinds

`kind` discriminates the union. All kinds take `group_by`, `segments`,
`date_range`, `interval`, `count_unique_by`, and `name` (always set a
descriptive `name` — it becomes the title).

### `segmentation`

Needs `events` (at least one). `measured_as.as` defaults to `unique_users`;
other values are `event_totals`, `active_pct`, `avg_per_user`, `frequency`,
`formula`, `histogram`, and the property aggregations `property_sum`,
`property_avg`, `property_min`, `property_max`, `property_median`,
`property_count`, `property_count_avg`.

Property aggregations and `histogram` require the aggregated property to also
appear in that event's `group_by` — omitting it is a common cause of an empty
or malformed result.

For `formula`, put the expression in `measured_as.formula` using UPPERCASE
functions (`UNIQUES`, `TOTALS`, `PROPSUM`, `PERCENTILE`, …) and refer to events
as `A`, `B`, `C` in the order they are listed.

Also available: `rolling_window` (days), `cumulative`, `period_over_period`
(`period`, `parent`, `grandparent`, `quarter`), and `vis`
(`line`, `bar`, `area`, `stackedbar`, `pie`, `kpi`).

### `funnel`

Needs `steps` (at least two) and `conversion_window` — `{value, unit}` where
unit is `second`, `minute`, `hour`, `day`, or `week`.

`mode` is `ordered` (default), `unordered`, or `sequential`. `measured_as.as`
is `conversion` (default), `conversion_over_time`, `time_to_convert`,
`time_to_convert_over_time`, or `step_count`.

`constant_properties` forces values to match across steps — this is how you
build a same-session funnel (hold `session_id`). `excluded_events` takes
`{event, step_index}`, where `-1` excludes globally across all steps.

### `retention`

Needs `start_event` (use `_new` for new users) and `return_events` (OR-combined;
use `_active` for any activity). `retention_method` is `rolling` (default; on or
after day N), `nday` (exactly day N), `bracket` (custom, via
`retention_brackets` like `[[0,7],[7,14]]`), or `nday_or_before`.
`measured_as` is `retention` or `usage_interval`.

### `sessions`

`measured_as` is one of `totalSessions` (default), `average`, `length`,
`peruser`, `totalTime`, `averageTimePerUser`, `averageEventsPerSession`,
`totalEvents`, `eventCountDistribution`, or `formula`. Use `groups` for multiple
series; omit it for a single unfiltered series.

### `data_table`

Needs `columns` (at least one), each with a `metric_type` — `UNIQUES`, `TOTALS`,
`FORMULA`, `SESSIONS`, `CONVERSION`, or the property aggregations `PROPSUM`,
`PROPAVG`, `PROPMAX`, `PROPMIN`. `rows` are the breakdown dimensions, each
`kind` either `property` or `time`.

## Worked example

Weekly unique users of a signup event, on iOS, among users in the US, broken out
by plan:

```jsonc
{
  "kind": "segmentation",
  "name": "iOS signups by plan",
  "events": [{ "event": "Sign Up", "where": [
    { "property": "platform", "op": "is", "values": ["iOS"], "scope": "event" }
  ]}],
  "measured_as": { "as": "unique_users" },
  "group_by": [{ "property": "plan", "scope": "user" }],
  "segments": [{ "where": [
    { "property": "country", "op": "is", "values": ["United States"], "scope": "user" }
  ]}],
  "date_range": { "relative": "Last 12 Weeks" },
  "interval": "week"
}
```

## When results come back empty

1. Re-read every event and property name from `search` / `get_properties`, and
   check the `scope` matches what the taxonomy returned.
2. Widen `date_range` — the window may predate instrumentation.
3. Drop `segments`, then `where`, to find which filter empties the result.
4. For property aggregations, confirm the property is in the event's `group_by`.
5. Confirm the event is still arriving with `check_for_recent_event_ingestion`.
