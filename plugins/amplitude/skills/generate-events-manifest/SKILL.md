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
  "low_confidence_note": "(optional) Free-form text describing why Phase 0 was uncertain about whether to instrument this diff. Written by add-analytics-instrumentation when the trigger was manual AND the diff was ambiguous — see that skill's Phase 0 decision rule. Omit this field entirely when Phase 0 was confident either way.",
  "events": [
    {
      "event_type": "Exact Event Name As In Code",
      "description": "Rich taxonomy description following the 5-point structure above.",
      "category": "Commerce",
      "call_sites": [
        {
          "file": "src/app/page.tsx",
          "line": 142,
          "purpose": "Fired inside the onSuccess callback of useExtract() when the form submission resolves."
        }
      ],
      "properties": [
        {
          "name": "property_name",
          "type": "string",
          "description": "What chart axis or filter this enables"
        }
      ],
      "analysis_recipe": "Specific chart/funnel description with segmentation dimensions",
      "stakeholder_narrative": "One sentence for a PM slide using this event's data",
      "volume_estimate": {
        "low": 800000,
        "mid": 1015000,
        "high": 1220000,
        "confidence": "high",
        "basis": "existing_analog",
        "basis_detail": "Matches existing `Product Viewed` (1.0M/30d)",
        "analog_event": "Product Viewed",
        "analog_volume_30d": 1000000
      }
    }
  ]
}
```

The `volume_estimate` field is **optional**; populate it only for the
existing-analog case (Step 4a below). Events without a clear analog
omit the field entirely — downstream surfaces (the prepare-PR inline
annotations) handle the absence cleanly.

## Step 4a: Annotate volume_estimate for events with existing analogs (DMT-407)

Customers can blow through Amplitude event-volume capacity when a
proposed instrumentation PR contains high-cardinality events — capacity
overages are a renewal-conversation event. The prepare-PR review surface
needs a volume signal so reviewers can spot risk before merging.

For each event you propose, check whether the customer's existing
taxonomy (read `.amplitude/existing-taxonomy.json` when present — it
carries every existing event's `volume_30d`) has a clear analog. If
yes, populate the `volume_estimate` field on the event entry; if no,
**omit the field entirely** — do not guess, do not use category priors,
do not invent numbers. The annotation surface handles missing
`volume_estimate` cleanly.

### Matching heuristic (analog selection)

Walk the existing-taxonomy events in this order; first match wins:

1. **Exact name match** (case-insensitive). The proposed event's
   `event_type` equals an existing `event_type`.
2. **Normalized name match.** Strip non-alphanumeric, lowercase both
   sides, compare. Catches `pageViewed` ↔ `Page Viewed`.
3. **Category + ≥80% property overlap.** Same `category` AND the
   proposed event's property names overlap ≥80% (Jaccard) with the
   existing event's property names.

The match must have a non-null `volume_30d`. If the candidate's volume
is unknown, skip it and try the next match — without a real volume,
the analog adds no signal.

### Schema (when populated)

```json
"volume_estimate": {
  "low": <int>,
  "mid": <int>,
  "high": <int>,
  "confidence": "high",
  "basis": "existing_analog",
  "basis_detail": "Matches existing `<analog_event_type>` (<formatted_volume>/30d)",
  "analog_event": "<analog_event_type>",
  "analog_volume_30d": <int>
}
```

### Formula

For an analog with `volume_30d = V`:

- `analog_volume_30d` = `V` (the raw 30-day count from existing-taxonomy)
- `mid` = `round(V * 30.44 / 30)` (30d → monthly normalization, using
  the standard month-length constant)
- `low` = `round(mid * 0.8)`
- `high` = `round(mid * 1.2)`

The ±20% band reflects that analog volume is a strong signal but actual
fire rates still drift with adoption.

### basis_detail rendering

`basis_detail` is shown to the reviewer in the prepare-PR table and in
the tracking-plan markdown. Render the volume short-form:

- `< 1,000` → bare integer (e.g. `742`)
- `< 1,000,000` → thousands (e.g. `1.5k`, `200k`)
- `≥ 1,000,000` → millions (e.g. `1.5M`, `49M`)

Examples of well-formed `basis_detail`:

- `"Matches existing \`Page Viewed\` (49M/30d)"`
- `"Matches existing \`Order Completed\` (120k/30d)"`
- `"Matches existing \`Component Rendered\` (1.5M/30d)"`

### Guardrails

- **Never invent a volume.** If no analog exists, the field is absent.
  Do not estimate from category priors or hallucinate numbers — those
  paths belong to a downstream langley-side post-processor that
  doesn't exist yet. False precision on a renewal-impacting number is
  the worst failure mode.
- **Never overwrite a `volume_estimate` already on the entry.** If the
  events.json already carries the field (e.g. from a prior run), trust
  it — only populate when the field is absent.
- **One analog per event.** The first-match-wins rule above prevents
  ambiguity. Do not "average" multiple candidate analogs.
- **Math must be exact.** Use integer arithmetic everywhere; do not
  emit floats. `round(...)` is the canonical rounding mode.

---

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

- **`call_sites`** records every line where this event fires, so a downstream
  reviewer surface (e.g. a CI check that posts inline comments on the prepare
  PR) can pin per-line annotations to the actual SDK call. Each entry MUST
  carry:
  - `file`: repo-relative path (e.g. `src/components/Foo.tsx`)
  - `line`: 1-indexed line number where the SDK call sits AFTER your edits
  - `purpose` (optional): one short sentence on why THIS site fires the event
    — useful when the same event fires from several places (e.g. a `Page
    Viewed` event instrumented in multiple route components).

  When you instrumented from the `instrument-events` step, copy each entry's
  `filePath` → `file` and `originalLineNumberPreChanges` → `line` (adjusted
  for any insertions you made above this line in the same file). When the
  same event has multiple call sites, include every one — they each get
  their own inline annotation.

  Use an array even for a single call site (the schema is uniform). Omit the
  whole `call_sites` field only if you genuinely cannot locate the call —
  downstream surfaces will skip annotation for that event rather than
  pinning to a placeholder line.

- **`properties`** are registered into the Amplitude taxonomy alongside the
  event itself — each entry creates or updates an event-property row keyed on
  `(event_type, name)`. That means `name`, `type`, and `description` are
  load-bearing taxonomy state, not just PR-body decoration. Property
  descriptions are shown to analysts in the Amplitude UI and to AI features —
  hold them to the same quality bar as event descriptions: explain what the
  value represents and what segmentation/filter it enables, not just the
  variable name. Include `is_required`, `is_array_type`, `enum_values`, or
  `regex` when you know them; the registrar will pick them up.

- **`analysis_recipe`** and **`stakeholder_narrative`** are required for every
  event. If you can't write a compelling analysis recipe, question whether the
  event is worth instrumenting.

- **`low_confidence_note`** (optional, top-level) records that Phase 0 in
  ``add-analytics-instrumentation`` was uncertain about whether this diff
  should be instrumented and proceeded anyway because the trigger was manual.
  Write this field ONLY when Phase 0 explicitly invoked the manual-uncertain
  path — leave it out otherwise. The text should describe what specifically
  made you uncertain, in plain language a reviewer can act on. Examples:

  > "no clear user-facing handler in this diff — the changes are inside an
  > internal service module that's only called from a webhook handler. I
  > instrumented the webhook entry on the assumption that's the user-perceived
  > surface, but you may want to close this if the webhook isn't user-triggered."

  > "the diff renames an existing component but adds no new interactions; I
  > don't think there's net-new instrumentation needed, but since you ran
  > @amplitude track explicitly I attempted to enrich the existing tracking
  > on the renamed component."

  The orchestrator (in agent-runtime mode) renders this field as a
  ``> **⚠️ Low confidence:**`` callout in the PR comment so the reviewer is
  primed to check the proposed events. In standalone mode the field shows
  up in the events.json output the human reviews directly.

## Step 5: Write manifest metadata

Also write or update `.amplitude/manifest.json`. The minimal schema (always
required):

```json
{
  "generated_at": "ISO 8601 timestamp",
  "commit_hash": "current HEAD commit hash",
  "base_branch": "main or whatever the default branch is"
}
```

Get the commit hash with `git rev-parse HEAD`.

### *(agent-runtime only)* Additional fields

When this skill is running under the Amplitude Coding Agent, the merge
webhook handler reads extra fields to know how this manifest was produced
and where to register events. Include them as well:

```json
{
  "generated_at": "...",
  "commit_hash": "...",
  "base_branch": "...",
  "mode": "init or pr",
  "agent_version": "1.0",
  "amplitude_project": {
    "app_id": 12345,
    "org_id": 67890
  }
}
```

The `amplitude_project` section links this repo to a specific Amplitude
project. It is set during the init run (from the session's app_id/org_id)
and read by the merge webhook handler to know where to register events. If
not present, the merge handler cannot register events automatically.

In standalone mode none of these extra fields apply — omit them. The minimal
schema above is enough for a human to use the manifest as a tracking-plan
artifact.

## Handling prior state

If `.amplitude/events.json` already exists:
1. Read the existing manifest
2. Compare existing events against current tracking calls
3. **Keep** events that still exist in the code unchanged
4. **Add** new events found in the code
5. **Update** events whose code location or properties changed
6. **Remove** events whose tracking calls no longer exist in the code
7. Note changes in output for transparency
