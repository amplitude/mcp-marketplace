---
name: full-repo-instrumentation
description: >
  End-to-end analytics instrumentation workflow for a full repository. Chains
  business context analysis, product mapping, event discovery, instrumentation,
  and manifest generation into a single autonomous run. Produces a PR-ready
  set of code changes plus a structured events manifest for taxonomy
  registration. Use this when onboarding a new codebase with Amplitude, when
  asked to "instrument this entire repo", "add analytics to this project",
  "run init mode", or any request for comprehensive full-repo analytics
  coverage.
---

# full-repo-instrumentation

You are the orchestrator for full-repo analytics instrumentation. Your job is
to analyze an entire codebase and produce comprehensive Amplitude event
tracking — business context, product map, tracking plan, implemented code
changes, and an events manifest ready for taxonomy registration.

This skill chains three sub-skills (`analyze-business-context`,
`discover-product-map`, `generate-events-manifest`) and inlines the
event-design and implementation methodology so it runs end-to-end without
external dependencies. Execute each phase in order. Do not skip phases or
parallelize — later phases depend on earlier outputs.

Read the `taxonomy` skill at `../taxonomy/SKILL.md` for naming standards and
description quality requirements that apply throughout.

---

## Phase 0: Check for prior state

Check if `.amplitude/manifest.json` exists:

```bash
cat .amplitude/manifest.json 2>/dev/null
```

**If found**: read the `commit_hash` and compute what changed:

```bash
git diff <commit_hash>..HEAD --stat
```

Decide between **incremental** and **full** rerun:

- **Incremental** — fewer than ~20 files changed AND the changes touch only
  product areas already documented in `.amplitude/product-map.json`. In this
  case: re-read `.amplitude/business-context.md` and
  `.amplitude/product-map.json` as authoritative for unchanged areas, redo
  Phase 4 only for the changed areas (treating each as a self-contained
  product area for event design), then proceed to Phase 5 and Phase 6
  scoped to the new events.
- **Full** — diff is large, spans many product areas, or any
  `.amplitude/*` file is missing or fails to parse. Run all phases below.

**If not found**: this is the first run. Run all phases.

---

## Phase 1: Discover analytics patterns

Detect the codebase's existing tracking conventions so every event you add
later looks like it belongs.

### Find the tracking function

```bash
grep -rn "\.track(\|trackEvent(\|logEvent(\|\.capture(\|amplitude\.\|ampli\." \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.py" --include="*.rb" --include="*.go" --include="*.php" \
  src/ app/ lib/ core/ 2>/dev/null \
  | grep -v "node_modules\|\.next\|dist\|__tests__\|\.test\.\|\.spec\." \
  | head -50
```

Also check for analytics wrapper modules:

```bash
grep -rn "export.*function.*track\|export.*const.*track\|def track" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.py" \
  src/ lib/ app/ core/ 2>/dev/null | head -10
```

### Record the pattern

- **trackingFunction** — exact callable engineers use (e.g. `trackEvent`,
  `client.track`, `amplitude.logEvent`)
- **importPath** — where it's imported from (`@/lib/analytics`,
  `from amplitude import ...`, etc.)
- **eventArgPosition** — first arg = event name? wrapped in a builder
  (`BaseEvent(...)`)? object literal?
- **eventNamingConvention** — Title Case, snake_case, kebab-case, dot.notation
- **propertyNamingConvention** — snake_case, camelCase
- **exampleCall** — a real one-liner from the codebase

### If no tracking exists yet

Choose the canonical Amplitude SDK for the stack:

| Stack | SDK | Import |
|---|---|---|
| Browser TS/JS | `@amplitude/analytics-browser` | `import * as amplitude from '@amplitude/analytics-browser'` |
| Node TS/JS | `@amplitude/analytics-node` | `import { Amplitude } from '@amplitude/analytics-node'` |
| Python | `amplitude-analytics` | `from amplitude import Amplitude, BaseEvent` |
| Ruby | `amplitude-experiment` for FF, `AmplitudeAPI` gem for events | — |
| Go | `github.com/amplitude/analytics-go/amplitude` | — |

Default to **Title Case** event names and **snake_case** properties when
introducing a convention.

---

## Phase 2: Business context

Follow `../analyze-business-context/SKILL.md`.

Output: `.amplitude/business-context.md`

---

## Phase 3: Product mapping

Follow `../discover-product-map/SKILL.md`.

Output: `.amplitude/product-map.md` and `.amplitude/product-map.json`

---

## Phase 4: Event design (tracking plan)

For each product area from Phase 3, generate a candidate list of events,
prioritize them, and assemble a tracking plan. The methodology below is
self-contained — do not look elsewhere.

### 4a. Build a funnel hypothesis per area

Before generating any events for an area, trace the user's path through it.
Read each route handler in the area; for each one identify:

- **Entry point** — how does the user arrive (route, navigation call, link)?
- **Interaction sequence** — handlers (`onClick`, `onSubmit`, POST handlers,
  state mutations) in order.
- **Async boundaries** — API calls, mutations, server actions. These are
  where "attempted" becomes "succeeded" or "failed."
- **Terminal states** — success confirmations, error responses, redirects.
- **Branching paths** — conditionals that route users to different outcomes.

Synthesize into one or more funnels per area:

- A name (e.g., "Sign-in flow", "Checkout flow")
- Ordered steps with file + function for each
- Which step is **start** and which is **end**

Single-action surfaces (a toggle, a one-click action) don't need a funnel
— note that and move on. Don't invent multi-step flows that aren't in the
code.

### 4b. Generate candidate events

For each `user_facing_change` in the area, ask: *"If a user does this, what
outcomes would a PM want to know about?"*

Generate from four categories:

| Category | What it captures | When to include |
|---|---|---|
| **business_outcome** | Revenue, retention, growth (purchases, subscription changes, conversion gates) | Area touches monetization or retention |
| **user_journey** | Meaningful state transitions (workflow completed, feature activated, onboarding finished) | Area introduces or alters a user-journey step |
| **feature_success** | The "it worked" moment — confirmed outcome, not button click | Any new or materially-changed feature |
| **friction_failure** | Where users fail, get stuck, or give up (errors, empty states, abandonment) | Complex multi-step interactions or error-prone flows |

### 4c. Deduplicate against existing events

For each candidate, check it against the `existingEvents` list in
`product-map.json`:

- **Exact match** — `event_type` already exists verbatim. Drop the candidate.
- **Semantic match** — different name, same user action or outcome (e.g., you
  proposed `Plan Upgraded` but `Subscription Upgraded` already exists).
  Drop the candidate.
- **Partial overlap** — existing event covers a broader action that subsumes
  yours (e.g., `Checkout Completed` already exists and your candidate
  `Payment Submitted` fires at the same moment). Drop unless your candidate
  captures meaningfully different information.

If you drop a candidate, note it in an `already_tracked` list in the
tracking plan so the user sees the coverage.

### 4d. Quality filter

Every kept candidate must pass all three:

1. **Decision-useful** — A PM could make a product decision from this alone,
   without other events for context.
2. **Outcome-focused** — Captures that something *happened*, not that the
   user *attempted* it. `Property Extracted` > `Extract Button Clicked`.
3. **Stable across redesigns** — Named around the business/product concept,
   not the UI element.

**Cut**: raw clicks/hovers without outcomes, internal technical actions,
UI-versioned names (`modal_v2_submit`), sub-step granularity.

### 4e. Assign priority

| Priority | Meaning | Guidance |
|---|---|---|
| **critical** | You would block a release if this were missing | Revenue events; funnel start; funnel end |
| **high** | Feature success/failure; primary interaction outcomes | Feature confirmed events; key state transitions |
| **medium** | Segmentation dimensions, secondary workflows, configuration choices | Page views supporting funnels; meaningful user choices |
| **low** | Nice-to-have context, exploratory signals | Edge-case failures; discoverability metrics |

**Funnel start and funnel end events are always `critical`**.

For intermediate funnel events:
- Short flow (2–3 steps): start and end are enough.
- Medium flow (3–5 steps): one intermediate at the most likely drop-off
  point, priority `high`.
- Long flow (5+ steps): 2–3 intermediate at natural phase boundaries,
  priority `high`.

### 4f. Target candidate count

Across `critical` + `high` + `medium`, aim for **10–30 events total** per
repo (matches the quickstart taxonomy starter-kit guidance):

- ~10–15 candidates for a small repo (1–2 product areas, simple flows)
- ~15–25 for a medium repo (3–4 areas, multiple components)
- Up to ~25–30 for a large repo (multiple features, full user journeys)

If you produce fewer than ~10 non-low candidates on a non-trivial repo,
you've likely under-scoped — re-read the user flows and look for
segmentation dimensions, alternate paths, configuration events, and
friction points you skipped.

A `critical`+`high`+`medium` count below 10 is acceptable only when the
repo genuinely has very little product surface (a one-page demo, a CLI
with two commands, etc.) — confirm by re-reading `product-map.json`.

### 4g. Required fields per event

| Field | Notes |
|---|---|
| `event_type` | Title Case (or whatever Phase 1 detected). Stable, business/product noun + verb |
| `description` | What happened, in plain language. Will register in Amplitude — write for an analyst who hasn't seen the code |
| `category` | One of: `business_outcome`, `user_journey`, `feature_success`, `friction_failure` |
| `priority` | `critical` / `high` / `medium` / `low` |
| `trigger` | Specific function and file + when it fires (after outcome confirmed) |
| `properties` | 2–4 properties; each must enable a chart axis or filter. See cardinality rules below |
| `analysis_recipe` | Specific chart/funnel/query an analyst would build |
| `stakeholder_narrative` | One sentence a PM would put on a slide |
| `funnel_role` | `start` / `intermediate` / `end` — omit if not part of a funnel |

### 4h. Property cardinality discipline (CRITICAL)

For each property, look at what the *value* would be at runtime:

- **User-typed strings** (search query, comment body, error message, filter
  input, chat text, review, feedback) — never send raw. Bucket via:
  - `*_length` (character count) for size signal
  - `has_*` (boolean presence) for "did the user supply this?"
  - `*_type` / `*_code` (enumerated classification) for category
  - `*_hash` (stable fingerprint) for cross-event correlation
  - `*_count` (quantity of matched items) for density signal
- **Error exceptions** — never send `error_message: err.message`. Produce
  `error_type` (enum of exception classes you care about) plus `error_code`
  (short stable identifier). Stack traces explode cardinality and routinely
  carry PII, paths, and user input.
- **Filter selections** — only acceptable if the value comes from a bounded
  enum. `filter_value: "red"` from a color picker is OK only if you declare
  the enum. If the user can type arbitrary values, bucket it.
- **Unsure?** — if you can't enumerate possible values in advance, it's
  high-cardinality. Bucket it.

A property *name* containing `query`, `search`, `message`, or `text` isn't
automatically bad — `query_length` is fine because the value is an integer.
The contract is the value shape, not the name.

### 4i. Error events

If the codebase has user-perceptible error paths worth instrumenting (form
validation failures, API error envelopes, payment declines, search
no-results, etc.), include error events as `friction_failure` candidates.

**No mandatory event.** If `product-map.json` already lists an error event
in `existingEvents`, treat it as covered (per 4c dedup rules) — even if its
properties are imperfect, fixing existing instrumentation is out of scope
for this run unless explicitly asked.

When you *do* propose new error events, follow the cardinality rules in
4h: `error_type` + `error_code` only. Never propose a new event with
`error_message: str(e)` or equivalent — that's the rule, including for
error events.

### 4j. User properties

Recommend 5–15 user properties (set on `Identify()` rather than per event):

- Lower case with underscores or spaces (match the codebase convention)
- Intrinsic to the user (account age, plan tier, role, signup source)
- Not duplicating SDK defaults (platform, country, device, language are
  auto-captured by Amplitude SDKs)
- Each with: name, description, example values, where to set

### 4k. Write the tracking plan

Output: `.amplitude/tracking-plan.md`

Required sections:

1. Executive summary (2–3 sentences: total event count, primary funnels,
   biggest gaps closed).
2. Summary table (event, area, priority, category, funnel role).
3. Funnel definitions (per funnel: start, intermediates, end, analysis
   recipe).
4. Already-tracked events (kept as-is; one-line each with file/line).
5. Per-area event specs (full required-fields block for each new event).
6. User properties (table with source and significance).
7. Implementation priority (ordered list — implement critical first, then
   high, then medium).

---

## Phase 5: Implementation

Implement ALL `critical`, `high`, and `medium` priority events from Phase 4.
Skip `low` unless explicitly asked.

For large plans (15+ events), implement in priority batches: do all
`critical` first, run typecheck/build, then do `high`, then `medium`.
Pause between batches only if a batch breaks the build.

### 5a. Per event: find the insertion point

Read the file referenced in `trigger`. Locate the function/handler/callback
named in the trigger description. Place the call at the point where the
**outcome is confirmed** — after an async response, after state is committed,
inside a success callback. Not where the action was initiated.

If existing tracking calls already live in the same function, follow their
placement pattern exactly.

Record the line number AND the function/block name as a stable anchor (line
numbers shift; function names don't).

### 5b. Per event: design properties (in scope only)

Look at variables in scope at the insertion point. For each one, ask:

1. Would an analyst segment or filter by this in a chart? If not, skip.
2. Is it a primitive (string, number, boolean)? Arrays/objects don't chart
   well — flatten or skip.
3. Does it duplicate something the SDK already captures (timestamp, user_id,
   session_id, page URL, viewport)? Don't re-send.

**Apply the cardinality rules from 4h.** Do not send raw user-typed
strings. Do not send raw error messages. Bucket high-cardinality values via
`*_length`, `has_*`, `*_type`, `*_code`, `*_count`, or `*_hash`.

**Less is more.** 2–4 properties per event. Each must unlock a specific
chart axis or filter. If you can't describe the chart in one sentence, drop
the property.

**Stay in scope.** Only use variables available at the insertion point. If
an important property exists elsewhere (parent component state, a different
API response), note it in the reasoning but don't include it — the engineer
can decide later whether to thread it through.

### 5c. Per event: validate against existing patterns

Compare your planned call against the existing-pattern examples found in
Phase 1:

- Same import path / function name?
- Same property shape (flat object, builder, typed interface)?
- Same placement style (inline in handler, extracted helper)?

If anything diverges, adjust to match. **Consistency > cleverness.**

### 5d. Tracking-call code

Match the codebase's pattern. Examples:

```ts
// Title Case + snake_case props, browser SDK
amplitude.track('Property Extracted', {
  property_name: variableInScope,
  extract_type: extractType,
});
```

```py
# Title Case + snake_case props, Python SDK BaseEvent pattern
client.track(BaseEvent(
    event_type='Property Extracted',
    user_id=user_id,
    event_properties={
        'property_name': name,
        'extract_type': extract_type,
    },
))
```

```ts
// Custom wrapper
trackEvent('Property Extracted', { property_name: name });
```

If the existing pattern guards calls (`if (client) client.track(...)`,
`if amplitude_disabled: return`, etc.), your new calls must guard the same
way.

### 5e. After all edits: verify

Run typecheck/build:

```bash
npm run build 2>&1 || npx tsc --noEmit 2>&1 || \
python -m py_compile <files> 2>&1 || \
echo "No build command found"
```

Fix errors and re-run.

Count tracking calls and compare against the plan:

```bash
grep -rn "<tracking_function>(" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.py" \
  src/ app/ core/ lib/ \
  | grep -v "node_modules\|\.next\|dist\|__tests__" | wc -l
```

Expected = (existing tracking calls) + (new events implemented). If short,
find and add missing events; do not stop early.

---

## Phase 6: Events manifest

Follow `../generate-events-manifest/SKILL.md`.

Output: `.amplitude/events.json` and `.amplitude/manifest.json`

The manifest's `event_type` strings must match the code exactly — never
paraphrase or normalize. The manifest is what the Amplitude taxonomy
registers from.

---

## Phase 7: Evaluation (optional)

If `.evals/eval-harness.ts` exists:

```bash
npx tsx .evals/eval-harness.ts
```

This is measurement only — do NOT self-correct based on eval results.

---

## Quality standards

### Descriptions must be substantive

**Bad**: "Account page" / "Cart management"
**Good**: "Users manage profile settings (name, email), view order history,
and log out. Implemented as a tabbed interface with login/register toggle
for unauthenticated users."

### Every claim requires evidence

Never say "this page handles checkout" without reading the file. Reference
specific files for every route, component, and event.

### Implementation must be complete

If the tracking plan says 30 events at critical/high/medium priority,
Phase 5 must add 30 tracking calls. Do NOT stop early.

### Shell usage

Use `find`, `grep`, `cat`, `head`, `wc` freely. Always exclude:
`node_modules/`, `.next/`, `dist/`, `build/`, `__tests__/`, `.git/`
