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

When determining naming conventions in this skill, use the following sources in strict order of preference:
1. Events and properties observed from the Amplitude MCP server
2. Real tracking call sites in the codebase
3. The `taxonomy` skill at `../taxonomy/SKILL.md`

---

## Step 1: Find tracking calls

Use two approaches based on what's available.

### If the Amplitude MCP is connected

Call `get_events` (or equivalent) to fetch a sample of event names from the
project. Use those results to choose a few representative non-system product
events, then call `get_event_properties` for those events to inspect real
property names. This is your primary naming reference.

Do not infer naming conventions from bracket-prefixed Amplitude system names
such as `[Amplitude], [Guides-Surveys], [Assistant], [Experiment]` for either events or properties. Exclude those from
pattern detection. If the MCP sample is dominated by Amplitude system names or otherwise does not provide enough evidence, fall back to codebase
inference for naming.

Then search the codebase for the sampled non-system event names using Grep to
locate the actual tracking call sites.

### If the Amplitude MCP is not available (fallback)

Search the codebase for these signals using Grep. Cast a wide net — you can
narrow down after:

| What to search for                                       | Why                                               |
| -------------------------------------------------------- | ------------------------------------------------- |
| `\.track\(`                                              | Generic `.track()` method calls                   |
| `ampli\.`                                                | Ampli typed SDK calls (e.g. `ampli.myEvent(...)`) |
| `amplitude\.track\|amplitude\.logEvent`                  | Direct Amplitude SDK calls                        |
| `sendEvent`                                              | Custom wrapper method names                       |
| `from.*amplitude\|import.*amplitude\|require.*amplitude` | Import statements                                 |
| `https://api2\.amplitude\.com/2/httpapi`                 | HTTP API calls                                    |

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
   bracket-prefixed Amplitude system names as naming evidence.
2. **Codebase second.** If the MCP evidence is unavailable, sparse, or
   inconsistent, infer the dominant convention from nearby, real tracking call
   sites in the repository. If the codebase shows multiple conventions, call
   out the dominant one and note meaningful local exceptions.
3. **Taxonomy fallback last.** If neither MCP nor codebase evidence is
   clear enough, fall back to the `taxonomy` skill at `../taxonomy/SKILL.md`.

Do not guess. If one or both conventions remain unclear even after checking
those sources, say so explicitly.

---

## Step 4: Output

Start with a short conventions section, then list each unique pattern.

```yaml
event_naming_convention: "<from MCP if clear, otherwise codebase, otherwise taxonomy skill, or 'insufficient evidence'>"
property_naming_convention: "<from MCP if clear, otherwise codebase, otherwise taxonomy skill, or 'insufficient evidence'>"
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

## Step 5: Inventory existing event names (for downstream name preservation)

If any tracking calls were found in Step 1, capture the **exact event name
strings** used at those call sites and emit them as a dedicated section of the
output. Downstream skills (`taxonomy`, `instrument-events`,
`generate-events-manifest`) are required to **preserve these names verbatim**
when the new instrumentation extends an existing event — renaming is a
breaking change that orphans historical data and breaks downstream charts,
funnels, and cohorts built on the old name.

This matters most for migration cases (e.g., an existing Segment or Mixpanel
installation that the agent is asked to extend or port to Amplitude): the
analytics-standard event names (`Product Added`, `Order Completed`, `Signed
Up`, `Products Searched`, etc.) MUST be carried through unchanged.

Emit the inventory in this shape:

```yaml
existing_event_names:
  # One entry per unique event name found. Preserve capitalization and spacing exactly.
  - name: "Order Completed"
    sdk: "segment"                 # segment | amplitude | mixpanel | posthog | custom-wrapper | ...
    call_sites:
      - "src/app/checkout/review/page.tsx:42"
      - "src/app/api/orders/route.ts:18"
    property_names:                # flat list of property keys seen in the args
      - order_id
      - total
      - currency
  - name: "Product Added"
    sdk: "segment"
    call_sites:
      - "src/components/product-card.tsx:31"
    property_names:
      - product_id
      - product_category
      - price
```

### Downstream contract (explicit)

Any skill that consumes this output must obey these rules:

1. **Never rename.** If the codebase fires `analytics.track("Product Added", …)`,
   the Amplitude equivalent must also be `"Product Added"` — not "Cart Item
   Added", "Product Added to Cart", or any other variant.
2. **Additive only.** New instrumentation at a NEW call site may add brand-new
   events (with new names), but may not shadow, split, or re-cast an existing
   one.
3. **Property name continuity.** Reuse existing property keys from the
   inventory above when tracking the same semantic value — e.g., `product_id`
   stays `product_id`, don't rename to `productId` or `item_id`.
4. **Flag, don't fix, rename intents.** If the diff itself clearly renames an
   existing event, surface it as a breaking-change warning in the analysis
   output instead of silently applying the rename.

---

## Step 6: Handle no results

If no tracking calls are found with any search strategy, say so clearly. Suggest
that the user check whether Amplitude (or another analytics library) has been set
up in the project, and offer to search for other analytics libraries (Segment,
Mixpanel, PostHog, etc.) if relevant.

Also emit an empty `existing_event_names: []` section so downstream skills can
distinguish "no existing tracking" (greenfield — invent names freely per the
taxonomy skill) from "skill wasn't run" (unknown state).
