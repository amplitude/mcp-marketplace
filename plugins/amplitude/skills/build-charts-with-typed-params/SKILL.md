---
name: build-charts-with-typed-params
description: Builds Amplitude chart definitions using the typed chart-parameter schema — segments, intervals, date ranges, and per-chart-type enums — and runs them with query_amplitude_data. Use when constructing a chart definition from scratch, when a definition returns empty data, or when adapting an existing chart's parameters to a new question.
x-amp-flags: [mcp-consolidate-charts]
---

# Build Charts With Typed Params

Construct a valid chart definition, confirm every event and property name
against the project's taxonomy, then run it.

## The one thing that goes wrong

The chart schema validates **structure only**. It does not check event or
property names against your project's taxonomy. A misspelled key does not
raise an error — it returns a well-formed chart with **empty data**, which
reads like a real answer of "zero".

So: never type an event or property name you have not read back from a tool.
Empty results are a name problem until proven otherwise.

## Workflow

### 1. Resolve the project

Call `get_amplitude_context` with no arguments to list accessible projects,
then again with a `projectId` for its settings. Every step below needs that id.

### 2. Resolve names before building

Do this first, not after a query comes back empty.

- `search` — find events, properties, and existing charts by fuzzy name. This is
  the reliable starting point; it is always available.
- `get_properties` with `propertyType: 'event'` — event properties. Use
  `propertyType: 'user'` for user properties.
- For listing event names, use whichever event tool this server exposes —
  `manage_amp_events` or `get_events`. Which one appears depends on a separate
  taxonomy rollout, so read the tool list rather than assuming a name.

There is no `get_event_properties` tool. If a tool description or an older skill
tells you to call it, use `get_properties` with `propertyType: 'event'`.

### 3. Copy from a similar chart when one exists

A saved chart's definition is guaranteed to reference real taxonomy, so it beats
building from the schema. Resolve an id first — `get_amplitude_charts` rejects
speculative calls:

1. `search` by name, or `get_from_url` if you have a chart link.
2. `get_amplitude_charts` with `include: 'definition'` and `chartIds`.
3. Reuse the segment and param shapes; swap in your own events.

`include` selects the mode: `link` (default — validates ids, returns URLs, does
not run the chart), `definition` (config; `chartIds` only), `data` (runs it, max
3 ids), `guide` (schema, no ids needed).

### 4. Look up the type's schema

`get_amplitude_charts` with `include: 'guide'` and a `chartType` returns that
type's params, valid enums, and a working example. Omit `chartType` to list
supported types: `eventsSegmentation`, `funnels`, `retention`, `sessions`,
`composition`, `revenueLtv`, `stickiness`, `metricExplorer`.

You can skip this — `query_amplitude_data` returns the same schema on a
validation failure — but calling it first is cheaper than a failed query when
you are unsure of the shape.

### 5. Build the definition

Always set a descriptive `name`; it becomes the chart title.

**Segments.** All users is `[{conditions: []}]` — not `[]`.

```jsonc
// property-based
[{ "conditions": [{ "type": "property", "group_type": "User", "prop_type": "user",
                    "prop": "country", "op": "is", "values": ["United States"] }] }]

// behavioral (event-based)
[{ "conditions": [{ "type": "event", "event_type": "Some Event",
                    "time_type": "rolling", "time_value": 30,
                    "op": ">=", "value": 1 }] }]
```

`time_value`'s format depends on `time_type`, and mixing them up silently
changes the window:

| `time_type`       | `time_value` format                                |
| ----------------- | -------------------------------------------------- |
| `rolling`         | int, **days** (`30` = last 30 days)                |
| `absolute`        | two ints, **epoch seconds** (`[start, end]`)       |
| `since`           | int, epoch seconds                                  |
| `relative`        | int, **seconds** (`2592000` = 30 days)             |
| `forEachInterval` | must be `0`                                         |

Operators: `>=`, `<=`, `=`, `>`, `<`, `!=`.

**Intervals.** Fixed codes, not durations:

| Value      | Bucket                                     |
| ---------- | ------------------------------------------ |
| `-3600000` | hourly                                     |
| `-300000`  | realtime, 5-min (`eventsSegmentation` only) |
| `1`        | daily                                      |
| `7`        | weekly                                     |
| `30`       | monthly                                    |
| `90`       | quarterly                                  |

**Date range.** `range` (`"Last 30 Days"`, `"This Quarter"`, `"Yesterday"`) is
mutually exclusive with `start`/`end`. ISO strings and relative forms like
`"now-7d"` are coerced to Unix seconds. `start` alone is a valid open-ended
"Since" range; `end` without `start` is invalid.

**Other common fields.** `countGroup` defaults to `"User"`. `groupBy` takes
top-level breakdowns, e.g. `[{type: "user", value: "country", group_type: "User"}]`.

### 6. Run it

Call `query_amplitude_data` with the definition and `projectId`. Validation is
inline — there is no separate verify step. On failure the response carries
`chartTypeSchema` with params, enums, an example, and coercion rules; fix from
that and call again.

### 7. Show it

`render_amplitude_chart` with the `chartEditId` returned by the query.

## When results come back empty

Work through this before concluding the number is really zero:

1. Re-read each event and property name from `get_events` / `get_properties`.
   Casing and spacing must match exactly.
2. Widen the date range — the window may predate the event's instrumentation.
3. Drop segments one at a time to find which one empties the result.
4. Confirm the event is still arriving with `check_for_recent_event_ingestion`.
