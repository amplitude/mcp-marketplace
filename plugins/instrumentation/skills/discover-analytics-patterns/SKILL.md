---
name: discover-analytics-patterns
description: >
  Discovers how analytics tracking calls are actually written in this codebase —
  the concrete SDK calls, function signatures, and import patterns used to send
  events. Use this skill whenever you need to understand the existing analytics
  instrumentation patterns before adding new tracking, when someone asks "how do
  we track events here?", "show me the analytics setup", "what's the analytics
  pattern in this codebase?", or any time the instrument-events or
  discover-event-surfaces skills are about to run and you need to know the
  correct coding style to follow. Outputs a deduplicated list of patterns with
  generalized examples and the file paths where each pattern appears, plus the
  dominant event and property naming conventions inferred from those call sites.
  Always use this skill before writing any analytics instrumentation code.
---

# discover-analytics-patterns

Your goal is to find out **how** this codebase sends analytics events — not which
events exist, but the specific code patterns engineers use to fire a tracking
call. This output helps engineers add new events that look consistent with the
rest of the codebase. It should also tell downstream skills how event names and
property names are typically written in code here.

For naming conventions in this skill, use one order only:
1. Events and properties observed from the Amplitude MCP server
2. Real tracking call sites in the codebase
3. `../instrument-events/references/best-practices.md`

---

## Step 1: Find tracking calls

Use two approaches based on what's available.

### If the Amplitude MCP is connected

Call `get_events` (or equivalent) to fetch a sample of event names from the
project. Use those results to choose a few representative non-system product
events, then call `get_event_properties` for those events to inspect real
property names. This is your primary naming reference.

Do not infer naming conventions from bracket-prefixed Amplitude system names
such as `[Amplitude] ...` for either events or properties. Exclude those from
pattern detection. If the MCP sample is dominated by `[Amplitude] ...` events
or otherwise does not provide enough non-system evidence, fall back to codebase
inference for naming.

Then search the codebase for the sampled non-system event names using Grep to
locate the actual tracking call sites.

### If the Amplitude MCP is not available (fallback)

Search the codebase for these signals using Grep. Cast a wide net — you can
narrow down after:

| What to search for | Why |
|---|---|
| `\.track\(` | Generic `.track()` method calls |
| `ampli\.` | Ampli typed SDK calls (e.g. `ampli.myEvent(...)`) |
| `amplitude\.track\|amplitude\.logEvent` | Direct Amplitude SDK calls |
| `sendEvent` | Custom wrapper method names |
| `from.*amplitude\|import.*amplitude\|require.*amplitude` | Import statements |
| `https://api2\.amplitude\.com/2/httpapi` | HTTP API calls |

Also actively look for custom analytics wrappers — a codebase often wraps the
raw SDK in a utility like `trackEvent()`, `track()`, or a React hook like
`useAnalytics()` or `useTracking()`. Search for these by looking for functions
that call into Amplitude internally. **Treat each wrapper as its own pattern,
separate from the underlying SDK call**, even if it ultimately calls
`amplitude.track()` underneath. Engineers who encounter the wrapper will use
*it*, not the raw SDK — so it's the more important pattern to document.

To find wrappers: search for files that import the Amplitude SDK, then check
whether any of those files export a function or hook that other parts of the
codebase import and use for tracking.

Exclude test files (`.test.`, `.spec.`, `__tests__`) and mock files unless they
are the *only* place a pattern appears.

---

## Step 2: Group by pattern

Two call sites use the **same pattern** if they share the same:
- Library/SDK/function being called
- Method name
- Argument structure (even if the event name or properties differ)

For example, these are the **same** pattern:
```ts
amplitude.track('Page Viewed', { page: '/home' })
amplitude.track('Button Clicked', { label: 'signup' })
```

But these are **different** patterns — always keep them separate:
```ts
amplitude.track('Page Viewed', { page: '/home' })   // direct SDK — one pattern
ampli.pageViewed({ page: '/home' })                  // Ampli typed method — different pattern
trackEvent('Page Viewed', { page: '/home' })         // custom wrapper — also a separate pattern
```

A custom wrapper is always its own pattern, even if it delegates to the SDK
underneath. When documenting a wrapper pattern, note what it wraps (e.g.,
"Custom hook wrapping `amplitude.track()`") so engineers understand the layering.

---

## Step 3: Resolve naming conventions

Resolve two conventions separately:

- `event_naming_convention` — casing, separators, word order, prefixes, and
  tense used for event names in instrumentation code. Examples: `Title Case`,
  `snake_case`, `[Prefix] Action`, object-first vs action-first.
- `property_naming_convention` — casing, separators, and common suffix/prefix
  patterns used for event properties. Examples: `snake_case`, `camelCase`,
  `*_id`, `is_*`, flat keys vs nested objects.

Use this precedence order:

1. **Amplitude MCP first.** If the observed `eventType` values and
   property names returned by `get_event_properties` for a few representative
   non-system events show a clear dominant convention, use that. Do not use
   bracket-prefixed Amplitude system events or properties (`[Amplitude] ...`)
   as naming evidence.
2. **Codebase second.** If the MCP evidence is unavailable, sparse, or
   inconsistent, infer the dominant convention from nearby, real tracking call
   sites in the repository. If the codebase shows multiple conventions, call
   out the dominant one and note meaningful local exceptions.
3. **Best-practices fallback last.** If neither MCP nor codebase evidence is
   clear enough, fall back to `../instrument-events/references/best-practices.md`.

Do not guess. If one or both conventions remain unclear even after checking
those sources, say so explicitly.

---

## Step 4: Output

Start with a short conventions section, then list each unique pattern.

```yaml
event_naming_convention: "<from MCP if clear, otherwise codebase, otherwise best-practices, or 'insufficient evidence'>"
property_naming_convention: "<from MCP if clear, otherwise codebase, otherwise best-practices, or 'insufficient evidence'>"
```

Then, for each unique pattern, output a section in this format:

---

### Pattern: `<short descriptive name>`

**Description**: What this pattern does and when it's typically used in this
codebase (e.g., "Used throughout the React frontend for user action tracking").

**Example** (generalized):
```<language>
// show the import(s) needed
import { amplitude } from '@/lib/analytics'

// show a representative tracking call with placeholder names
amplitude.track('Event Name', {
  propertyOne: value,
  propertyTwo: value,
})
```

**Relevant paths**:
- `src/path/to/file.ts`
- `src/another/file.tsx`

---

List patterns from most common (most file paths) to least common.

If two patterns are always used together (e.g., an import + a call), show them
together in one example.

---

## Step 5: Handle no results

If no tracking calls are found with any search strategy, say so clearly. Suggest
that the user check whether Amplitude (or another analytics library) has been set
up in the project, and offer to search for other analytics libraries (Segment,
Mixpanel, PostHog, etc.) if relevant.
