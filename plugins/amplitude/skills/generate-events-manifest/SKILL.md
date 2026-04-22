---
name: generate-events-manifest
description: >
  Scans a codebase for all analytics tracking calls and produces a structured
  events manifest (.amplitude/events.json) with exact event names, rich
  descriptions, analysis recipes, and property definitions. Pattern-agnostic:
  works with trackEvent, amplitude.track, analytics.track, useTracking,
  logEvent, or any custom wrapper. The manifest is the bridge between code
  instrumentation and Amplitude taxonomy registration — event names and
  descriptions are passed through unchanged. Use after implementing events,
  or independently to audit what's currently instrumented. Trigger on
  "generate events manifest", "what events are instrumented", "audit
  tracking calls", "create events.json", or any request to extract a
  structured inventory of instrumented events.
---

# generate-events-manifest

Scan a codebase for every analytics tracking call and produce a structured
manifest that can be used to register events in Amplitude's taxonomy.

**The manifest is the source of truth** for what events exist in the code.
Event names and descriptions flow unchanged into the Amplitude taxonomy, so
quality matters. Read the `taxonomy` skill at `../taxonomy/SKILL.md` for
the description quality standard.

---

## Step 1: Discover the tracking pattern

Find how this codebase sends events. Search for:

```bash
grep -rn "\.track(\|trackEvent(\|logEvent(\|\.capture(\|\.record(" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.py" --include="*.rb" \
  src/ app/ lib/ | grep -v "node_modules\|\.next\|dist\|__tests__\|\.test\.\|\.spec\." | head -50
```

Also check for analytics wrappers:

```bash
grep -rn "export.*function.*track\|export.*const.*track\|export.*track" \
  --include="*.ts" --include="*.tsx" --include="*.js" src/ lib/ | head -10
```

Record the pattern:
- **trackingFunction**: the function name engineers call (e.g., `trackEvent`)
- **importPath**: where it's imported from (e.g., `@/lib/analytics`)
- **exampleCall**: a real one-liner from the codebase

## Step 2: Extract all tracking calls

Find every tracking call in the codebase:

```bash
grep -rn "<tracking_function>(" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.py" --include="*.rb" \
  src/ app/ lib/ components/ | grep -v "node_modules\|\.next\|dist\|__tests__"
```

For each call, extract:
- The exact event name string (first argument)
- The file path
- The properties object (keys and types)

**Count them.** If a tracking plan or prior analysis exists (e.g., in
`.amplitude/tracking-plan.md`), compare your count against the expected count.
Flag any discrepancies.

## Step 3: Enrich with reasoning

For each event, write a **rich taxonomy description** that will be registered
in Amplitude. Follow the taxonomy skill's description structure:

1. **Non-technical behavior definition** — what the user did, in plain language
2. **Trigger conditions** — exact conditions, UI vs API, success-only or also
   failure
3. **Disambiguation** — how this differs from similarly-named events
4. **Key use cases** — funnel step, success metric, or key analysis input
5. **Related events** — upstream and downstream events in the user journey

**Example:**

> Fired when a user adds a product to their cart from the product detail page.
> This is a critical conversion event measuring purchase intent. Use in the
> Browse → Cart → Checkout funnel to identify drop-off by product category.
> Segment by product_category to find which categories convert best. Pairs
> with Product Viewed (upstream) and Checkout Started (downstream).

Also write:
- **analysis_recipe**: specific chart, funnel, or query an analyst would build
- **stakeholder_narrative**: one sentence a PM would put on a slide

## Step 4: Write the manifest

Write `.amplitude/events.json` with this exact schema:

```json
{
  "existingPattern": {
    "trackingFunction": "trackEvent",
    "importPath": "@/lib/analytics",
    "exampleCall": "trackEvent('Product Viewed', { product_id: product.id })"
  },
  "events": [
    {
      "event_type": "Exact Event Name As In Code",
      "description": "Rich taxonomy description following the 5-point structure above.",
      "category": "Commerce",
      "file": "src/app/page.tsx",
      "properties": [
        {
          "name": "property_name",
          "type": "string",
          "description": "What chart axis or filter this enables"
        }
      ],
      "analysis_recipe": "Specific chart/funnel description with segmentation dimensions",
      "stakeholder_narrative": "One sentence for a PM slide using this event's data"
    }
  ]
}
```

## Rules

- **`event_type` = exact string from code.** Never paraphrase, rename, or
  normalize. If the code says `trackEvent("Add To Cart", ...)`, the event_type
  is `"Add To Cart"` — not `"Product Added"`, not `"add_to_cart"`.

- **Every instrumented event must appear.** Verify by counting tracking calls
  in the code and comparing to the events array length.

- **`description` is the taxonomy description.** It gets registered in Amplitude
  and shown to analysts and AI features. Write for a product manager who has
  never seen the code. Generic descriptions like "User clicks a button" are
  unacceptable.

- **`category`** must be a meaningful taxonomy grouping that the event belongs
  to — inferred from the product-map area the event was surfaced in, from the
  existing-taxonomy sample (when present), or from the tracking plan. The
  taxonomy category is what analysts filter by in the Amplitude UI, so it has
  to carry real meaning.

  Pick from a small, consistent vocabulary. Good options (extend as needed):

  | Category | When to use |
  |---|---|
  | `Commerce` | browse, cart, checkout, orders, payment, product views |
  | `Account` | signup, login, logout, profile edits, password reset, verification |
  | `Navigation` | page/screen views, tab switches, generic surface views |
  | `Search` | search submissions, results views, filter/sort changes |
  | `Content` | reading/watching/playing media, likes, shares, bookmarks |
  | `Onboarding` | first-run tutorials, guided setup, feature tours |
  | `Billing` | subscription changes, plan upgrades/downgrades, invoice views |
  | `Messaging` | in-app chat, notifications, inbox interactions |
  | `Settings` | preference toggles, integration setup, admin config |
  | `Social` | follow, friend, group join/leave |
  | `Error` | error encountered, validation failures, retry attempts |

  Rules:
  - **Never use `"Coding Agent"`, `"Auto"`, `"Instrumentation"` or any
    self-referential label.** The category has to describe the user's world,
    not the agent that generated it.
  - If two events in the same functional area end up in different categories
    (e.g., "Checkout Started" → Commerce but "Checkout Payment Submitted" →
    Billing), pick one — the area that's most analytically useful for
    downstream segmentation.
  - If an event genuinely doesn't fit the common vocabulary, invent a new
    category with Title Case (e.g., `Experiment Exposure`, `Referral`) rather
    than falling back to a generic bucket.

- **`properties`** are documentation only — they are not currently registered
  via the taxonomy API. Still include them for the tracking plan and PR body.

- **`analysis_recipe`** and **`stakeholder_narrative`** are required for every
  event. If you can't write a compelling analysis recipe, question whether the
  event is worth instrumenting.

## Step 5: Write manifest metadata

Also write or update `.amplitude/manifest.json`:

```json
{
  "generated_at": "ISO 8601 timestamp",
  "commit_hash": "current HEAD commit hash",
  "mode": "init or pr",
  "agent_version": "1.0",
  "base_branch": "main or whatever the default branch is",
  "amplitude_project": {
    "app_id": 12345,
    "org_id": 67890
  }
}
```

The `amplitude_project` section links this repo to a specific Amplitude project.
It is set during the init run (from the session's app_id/org_id) and read by the
merge webhook handler to know where to register events. If not present, the merge
handler cannot register events automatically.
```

Get the commit hash with `git rev-parse HEAD`.

## Handling prior state

If `.amplitude/events.json` already exists:
1. Read the existing manifest
2. Compare existing events against current tracking calls
3. **Keep** events that still exist in the code unchanged
4. **Add** new events found in the code
5. **Update** events whose code location or properties changed
6. **Remove** events whose tracking calls no longer exist in the code
7. Note changes in output for transparency
