---
name: instrument-events
description: >
  Given event_candidates YAML (output from discover-event-surfaces), generates a
  concrete instrumentation plan for priority-3 (critical) events. Acts as a
  Software Architect: discovers existing analytics patterns in the codebase, reads
  the hinted files to determine what variables are in scope, designs minimal
  chart-useful properties, and identifies the exact insertion point for each
  tracking call. Outputs a structured JSON trackingPlan. Use this as step 3 of
  the analytics instrumentation workflow, after discover-event-surfaces. Trigger
  whenever a user has event_candidates and wants to generate tracking code, asks
  "instrument these events", "generate tracking plan", "add analytics for these
  events", "where should I put the tracking calls", or any request to turn event
  candidates into concrete implementation guidance.
---

# instrument-events

You are step 3 of the analytics instrumentation workflow. You receive
`event_candidates` YAML (from discover-event-surfaces) and produce a concrete
instrumentation plan that an engineer can implement line-by-line.

Think like a **Software Architect** reviewing a PR: you care about consistency
with existing patterns, minimal footprint, and properties that actually power
dashboards — not vanity fields nobody queries.

Read the `taxonomy` skill at `../taxonomy/SKILL.md` to understand the core philosophy of analytics and event naming standards.

---

## 1. Filter to critical events

Parse the `event_candidates` YAML. Extract only candidates where `priority: 3`.
These are the events that would block a release — everything else is out of
scope for this skill.

If there are zero priority-3 events, tell the user and stop.

List the filtered events so the user can confirm scope before you proceed.

## 2. For each critical event, build the instrumentation plan

Work through each priority-3 event one at a time:

### 2a. Read the hinted file

The event candidate has a `file` field pointing to where instrumentation likely
belongs. Read that file completely. Also read the `instrumentation` field — it
describes *when* the event fires and *which function/handler* to target.

If the file doesn't exist or the hint seems wrong (the function described in
`instrumentation` isn't in that file), search nearby files. The hint is a
starting point, not gospel.

### 2b. Find the exact insertion point

Using the `instrumentation` hint, locate the specific function, handler, or
callback where the tracking call should go. Look for:

- The handler/callback named in the `instrumentation` field
- The point where the **outcome is confirmed** (after an async response, after
  state is committed, inside a success callback) — not where the action is
  initiated
- Existing tracking calls nearby — if there are already `track()` calls in the
  same function, your new call should follow the same placement pattern

Record the **line number** and note the **function/block name** as a stable
anchor (line numbers shift; function names don't).

### 2c. Design properties

Look at what variables are **in scope** at the insertion point. These are your
property candidates. For each one, ask:

1. **Would an analyst segment or filter by this in a chart?** If not, skip it.
2. **Is it a primitive value (string, number, boolean)?** Arrays and objects
   don't chart well — flatten or skip.
3. **Does it duplicate something the tracking SDK already captures?** (e.g.,
   timestamp, user_id, session_id are usually automatic — don't re-send them)

**Less is more.** 2-4 properties per event is the sweet spot. Each property
should unlock a specific chart axis or filter. If you can't describe the chart
it enables in one sentence, drop it.

**Cardinality check — bucket VALUES, not just avoid bad names.** Before
emitting each property, look at what the code would actually pass as the
value at runtime:

- **If the value is a user-typed string** (search query, comment body, error
  message, filter input, chat text, review, feedback) — do NOT send it raw
  even if the property name looks fine. Replace with a bucketed shape:
  `*_length` (character count), `has_*` (boolean presence),
  `*_type` / `*_code` (enumerated classification), `*_hash` (stable
  fingerprint), `*_count` (quantity of matched items).
- **If the value is an error exception** — never send `error_message: err.message`.
  Produce `error_type` (enum of exception classes you care about) plus
  `error_code` (short stable identifier). Stack-trace text explodes cardinality
  and routinely carries PII, paths, and user input. See the `taxonomy` skill's
  "Cardinality Discipline" section for the full rule.
- **If the value is a filter selection** — ensure the VALUE comes from a
  bounded set. `filter_value: "red"` from a color picker is OK only if you
  declare the enum. If the user can type arbitrary values, bucket it.
- **Unsure?** If you can't enumerate the possible values in advance, it's
  high-cardinality — bucket it.

A property whose *name* contains `query`, `search`, `message`, or `text` is
not automatically bad — a name like `query_length` is fine because the value
is an integer. The real contract is the value shape, not the name.

Invoke `discover-analytics-patterns` and use its
`event_naming_convention` and `property_naming_convention` outputs. That skill
owns the naming-resolution procedure and precedence order. Do not redefine it
here.

This applies only to event and property naming. Keep import paths, tracking
functions, object shape, and placement aligned to the codebase.

**Stay in scope.** Only use variables available at the insertion point. If an
important property exists elsewhere (e.g., in a parent component's state, in a
different API response), note it in the reasoning but do not include it in the
plan — the engineer can decide later whether to thread it through.

### 2d. Validate against existing tracking calls

Compare your planned call against the examples you found in step 2:

- Same import/function?
- Same property shape (flat object? nested? typed interface?)?
- Same placement pattern (inline in handler? extracted to a helper?)?

If anything diverges, adjust to match. Consistency > cleverness.

## 3. Assemble the tracking plan

Output the result as a JSON object following this exact shape:

```json
{
  "trackingRequired": true,
  "reasoning": "Concise sentence explaining why these events are critical.",
  "existingPattern": {
    "trackingFunction": "the function name used (e.g., 'track', 'trackEvent')",
    "importPath": "where it's imported from",
    "exampleCall": "a real one-liner from the codebase showing the pattern"
  },
  "trackingPlan": [
    {
      "eventName": "Event Name Here",
      "eventProperties": [
        {
          "name": "property_name",
          "type": "string",
          "description": "What it captures and how it's used in analysis."
        }
      ],
      "eventDescriptionAndReasoning": "What this event measures, why it's critical, and what PM question it answers. Include the analysis_recipe context.",
      "implementationLocations": [
        {
          "filePath": "src/components/Foo/Bar.tsx",
          "originalLineNumberPreChanges": 142,
          "codeContext": "inside onSuccess callback of useExtract() hook",
          "trackingCode": "track('Event Name Here', { property_name: variableInScope })"
        }
      ]
    }
  ]
}
```

### Field guidance

- **`eventDescriptionAndReasoning`** — merge the candidate's `rationale` and `analysis_recipe` into a coherent paragraph. This is the "why" an engineer reads before implementing.
- **`filePath`** — relative from repo root.
- **`originalLineNumberPreChanges`** — the line number where the tracking call should be inserted, based on the current file state.
- **`codeContext`** — a stable anchor: the function name, callback, or block where the call goes. This survives rebases; line numbers don't.
- **`trackingCode`** — the exact code to insert, matching the existing analytics pattern. Use real variable names from the file.

## 5. Present the plan

Show the user the JSON tracking plan. Walk through each event briefly:
- What it tracks
- Where it goes (file + function)
- What properties it sends and why

Ask if they want to adjust anything before an engineer implements it.

---

## Principles

- **Match, don't invent.** The codebase already has a way of sending events. Find it and follow it exactly.
- **Properties earn their place.** Every property must answer: "what chart axis or filter does this enable?" If the answer is vague, cut it.
- **Scope is sacred.** Only use variables available at the insertion point. Don't propose refactors to thread data through — that's a separate PR.
- **Critical means critical.** This skill only handles priority 3. If the user wants priority 2 events, they should say so explicitly and you can include them.
