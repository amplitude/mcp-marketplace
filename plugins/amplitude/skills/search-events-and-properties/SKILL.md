---
name: search-events-and-properties
description: >
  Finds the events and properties that exist in an Amplitude project and returns their
  exact names, so later analysis filters on real taxonomy instead of guessed strings.
  Use when the user names an event or property informally ("signups", "plan tier"), when
  a query returned no data and a wrong name is suspected, when checking whether something
  is already tracked before instrumenting it, or whenever an event or property name is
  needed and has not been confirmed against the project.
---

# Search Events & Properties

## When to Use

- The user refers to an event or property by an informal name and the real one is unknown
- A chart or query came back empty and a mistyped event/property name is a likely cause
- You need to know whether an event already exists before recommending instrumentation
- You need the valid values of a property before filtering or grouping on it
- Any workflow is about to pass an event or property name into another tool

**Never guess an event or property name.** They are project-specific. A guessed name
silently returns zero rows rather than erroring, which produces confidently wrong
analysis.

## Instructions

### Step 0: Establish the project

Call `Amplitude:get_amplitude_context` with no arguments to list accessible projects.
If the user has not named a project and more than one is available, ask which to use —
do not pick for them. Every tool below needs the resulting `projectId`.

### Step 1: Search broadly first

Start with `Amplitude:search`. It matches across entity types and tolerates informal
phrasing, so it is the fastest way from "signups" to the real event name.

Prefer it over enumeration: listing an entire taxonomy to eyeball it wastes context on
large projects.

### Step 2: Resolve exact event names

Once you have candidates, confirm them with `Amplitude:get_events`, filtering with
`eventTypes` to the specific names you are checking.

If search returned nothing, fall back to a paged listing — `get_events` supports `limit`
and `cursor`. Page rather than raising the limit indiscriminately.

Report back the **exact** event name as stored. Do not normalise casing, spacing, or
punctuation; downstream filters are literal.

### Step 3: Resolve properties

Call `Amplitude:get_properties` with the `propertyType` that matches what you need — it
is a discriminated union, and the wrong type returns the wrong taxonomy:

| `propertyType` | Returns |
| --- | --- |
| `event` | Properties attached to events (scope with the event name) |
| `user` | User-level properties |
| `group` | Group properties (filter with group types) |
| `lookup` | Lookup-table properties |
| `channel` | Channel properties |
| `persisted` | Persisted properties |

For event properties, scope to the event resolved in Step 2 rather than pulling the
whole project's property list.

### Step 4: Return a usable answer

Report:

- The exact event name(s), spelled as stored
- The relevant property names, with their `propertyType`
- Any candidate that looked plausible but does **not** exist, called out explicitly

That last point matters most. Saying "there is no `user_signup` event; the project uses
`Signed Up`" is what prevents the next step from querying nothing.

## Notes

- If nothing matches, say so plainly rather than proposing the closest-looking name as
  if it were confirmed. The event may genuinely not be instrumented — check with
  `Amplitude:check_for_recent_event_ingestion` before concluding it is missing versus
  simply not sending data.
- To create or modify taxonomy rather than read it, this is the wrong skill — use the
  `taxonomy` skill, which covers naming standards and governance.
