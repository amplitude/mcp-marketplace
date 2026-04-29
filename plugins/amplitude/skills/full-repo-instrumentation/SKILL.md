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
  coverage. This is the Init-mode counterpart to add-analytics-instrumentation
  (which is PR/diff-scoped).
---

# full-repo-instrumentation

You are the orchestrator for full-repo analytics instrumentation. Your job is
to analyze an entire codebase and produce comprehensive Amplitude event
tracking — business context, product map, tracking plan, implemented code
changes, and an events manifest ready for taxonomy registration.

This skill chains multiple sub-skills. Execute each phase in order. Do not
skip phases or parallelize — later phases depend on earlier outputs.

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

If the diff is small (< 20 files changed, mostly in 1-2 product areas): switch
to **incremental mode** — read existing `.amplitude/` files as context and only
analyze changed areas. Follow the `add-analytics-instrumentation` skill scoped
to the diff, then run `generate-events-manifest` to update the manifest.

If the diff is large or the existing `.amplitude/` files are missing/corrupted:
proceed with full analysis below.

**If not found**: this is the first run. Proceed with full analysis.

---

## Phase 1: Discover analytics patterns

Follow the methodology in `../discover-analytics-patterns/SKILL.md`.

Scan the full repository (not just a diff). Record:
- Tracking function, import path, argument structure
- Event naming convention (Title Case, snake_case, etc.)
- Property naming convention
- Example calls

This output informs all naming decisions in later phases.

## Phase 2: Business context

Follow `../analyze-business-context/SKILL.md`.

Output: `.amplitude/business-context.md`

## Phase 3: Product mapping

Follow `../discover-product-map/SKILL.md`.

Output: `.amplitude/product-map.md` and `.amplitude/product-map.json`

## Phase 4: Event design (tracking plan)

For each product area from Phase 3, design events following the methodology
in `../discover-event-surfaces/SKILL.md`.

### Adapting discover-event-surfaces for full-repo context

The `discover-event-surfaces` skill expects a `change_brief` YAML from
`diff-intake`. For full-repo analysis, synthesize a compatible input per
product area:

For each area in `product-map.json`, construct:

```yaml
change_brief:
  classification:
    primary: feat
    types: [feat]
    analytics_scope: high
    stack: <from product-map techStack>
  summary: "<area name>: <area description>"
  user_facing_changes:
    - "<interaction 1 from the route descriptions>"
    - "<interaction 2>"
  surfaces:
    components:
      - name: "<component name>"
        file: "<file path>"
        change: modified
  file_summary_map:
    - file: "<route file>"
      summary: "<route description from product map>"
      layer: frontend
```

Then apply the `discover-event-surfaces` methodology:
- Generate from four categories: business_outcome, user_journey,
  feature_success, friction_failure
- Every event needs `analysis_recipe` and `stakeholder_narrative`
- Funnel start/end events are always **critical** (priority 3)
- Intermediate funnel events: 1 for medium flows (3-5 steps), 2-3 for long
  flows (5+ steps)
- Deduplicate against existing events found in Phase 3 coverage assessment
- Quality filter: decision-useful, outcome-focused, stable across redesigns

### Funnel-start exemption (gate)

The "no raw clicks without outcomes" rule from `discover-event-surfaces`
must NOT remove funnel-entry clicks. A click that is the *entry point of a
funnel* (user picks a checkout flow from a landing page, user starts a
signup, user opens a paywall modal) is the top-of-funnel intent signal —
keep it, name it around the business concept (`Donation Flow Selected`,
`Checkout Started`, `Signup Started`), and mark its `funnel_role` as
`start`. The "no raw clicks" rule applies to leaf interactions where no
funnel exists, not to funnel-start events.

### Candidate-count gate (RUN BEFORE EMITTING THE PLAN)

Before writing the tracking plan to disk, count the proposed
`critical`+`high`+`medium` events. If the count is below the band for the
repo size, do NOT emit the plan yet.

| Repo size              | Minimum critical+high+medium | Hard floor |
|------------------------|------------------------------|------------|
| Small (1–2 areas)      | 10                           | 10         |
| Medium (3–4 areas)     | 15                           | 12         |
| Large (5+ areas)       | 20                           | 15         |

If you are below the minimum, for each product area in `product-map.json`
list explicitly:

- The funnel(s) you identified (or "no funnel — single-action surface")
- The funnel start event (must be `critical`)
- The funnel end event (must be `critical`)
- Async success branches that fire a track call
- Async failure branches that fire a track call
- Segmentation dimensions (mode, variant, source) worth capturing as their
  own event or as event properties

Add the missing events. If the repo is genuinely below the hard floor (a
true one-page demo or two-command CLI), state that explicitly in the
tracking plan executive summary with a one-line justification. Otherwise,
keep iterating until the count clears the minimum.

### Priority rules

- **critical**: Revenue or core-journey events, funnel start/end
- **high**: Feature success/failure, important interaction outcomes
- **medium**: Secondary interactions, configuration changes
- **low**: Nice-to-have context events

### Required elements per event

- Event name (matching Phase 1 naming convention)
- Description (for analysts — what happened and why it matters)
- Trigger (specific function and file)
- Category (business_outcome / user_journey / feature_success / friction_failure)
- Priority (critical / high / medium / low)
- Properties (max 7, matching Phase 1 property convention in code; described
  with chart/filter utility)
- Analysis recipe (specific chart, funnel, or query)
- Stakeholder narrative (PM slide sentence)

### Mandatory: unified Error Encountered event

Include ONE `Error Encountered` event with properties:
- `error_type` (string) — category of error
- `error_context` (string) — where it occurred
- `error_message` (string) — human-readable detail

### User properties and identify wiring

**Identify wiring is mandatory** for any flow with authenticated users or
a post-conversion identifier (email at checkout, customer ID after
payment, session-bound user ID after sign-in). The tracking plan MUST
include an identify call placed at the earliest point the identifier
becomes available:

- After successful authentication / sign-in
- After a post-conversion event surfaces an email or customer ID (e.g.
  `paymentIntent.receipt_email`, `checkoutSession.customer_details.email`)
- On any explicit `setUserId` opportunity in existing wrapper modules

Use the SDK's canonical identify call (`amplitude.setUserId(id)` +
`amplitude.identify(new Identify().set(...))` for browser/node SDKs;
`client.identify(Identify(user_id=..., user_properties={...}))` for
Python). One identify call per session-establishing event is enough — do
not call identify on every track. If the codebase has zero auth and no
post-conversion identifier, note that explicitly in the tracking plan and
skip identify wiring.

**User properties** (set on `Identify()` rather than per event), following
`../user-property-best-practices/SKILL.md` if available, or these rules:

- 5-15 properties, intrinsic to the user
- Lower case with spaces (match the codebase convention)
- Not duplicating SDK defaults (platform, country, device, language, etc.)
- Each with: name, description, example values, where to set

### Funnel design

For every multi-step flow from Phase 3:
- Start event (critical) — entry into the flow
- Intermediate events — based on flow complexity
- End event (critical) — successful completion

### Write tracking plan

Output: `.amplitude/tracking-plan.md`

Sections: executive summary, summary table, funnel definitions,
already-tracked events, per-area event specs, user properties,
implementation priority.

## Phase 5: Implementation

Implement ALL critical, high, and medium priority events from Phase 4.

Follow the methodology in `../instrument-events/SKILL.md` for placement:
- Find exact insertion points (after outcome confirmed, not action initiated)
- Match Phase 1 patterns exactly (same imports, same function, same style)
- Properties use real variable names from scope
- If no tracking SDK exists: use appropriate Amplitude SDK import

### Async-branch coverage gate

Whenever you place a track call on an async boundary (server action, API
handler, webhook handler, payment confirmation, etc.), enumerate ALL of
its terminal branches and decide for each one whether it fires a track
call:

- **success branch** — did you place a success event (or is one already
  covered downstream, e.g. a result-page event)?
- **failure branch** — did you place a failure event (or is one already
  covered, e.g. a parent error boundary)?
- **early-return / validation-failure branches** — same question.

For webhook-style switches (`switch (event.type) { ... }`) and
`if/else` async result handling, walk every case explicitly. If a branch
has no track call AND no downstream coverage, either add one or note in
the tracking plan's reasoning why it was deliberately skipped (e.g.
"`payment_intent.succeeded` webhook is covered client-side by
`Donation Completed` on the result page"). Never leave an async terminal
branch silently uninstrumented.

### Property symmetry across multi-callsite events

When the same `event_type` fires from more than one callsite (e.g.
`Donation Completed` emitted from three different result pages, or
`Checkout Started` emitted from both a hosted and an embedded flow),
align the property keys across all callsites:

1. Compute the **union** of useful in-scope variables across callsites
   (e.g. `donation_amount`, `currency`, `payment_flow`).
2. For each callsite, emit every key from the union — even if the value
   has to come from a constant at that callsite (`payment_flow:
   "embedded_checkout"` vs `payment_flow: "hosted_checkout"`). This is
   what enables side-by-side comparison in Amplitude charts.
3. If a key is genuinely unavailable at one callsite (the variable
   doesn't exist there and can't be reconstructed), note it in the
   tracking plan reasoning so an analyst knows to expect nulls for that
   segment.

Asymmetric properties on the same event are a silent analytics bug — the
chart will silently drop or misclassify rows. Catch this before edits
ship, not after the dashboard goes live.

Process one file at a time. After all changes:

```bash
# Run typecheck/build
npm run build 2>&1 || npx tsc --noEmit 2>&1 || echo "No build command found"
```

Fix any errors and re-run.

### Verification

Count tracking calls and compare to the plan:

```bash
grep -rn "<tracking_function>(" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ app/ | grep -v "node_modules\|\.next\|dist\|__tests__" | wc -l
```

If the count is lower than expected, find and implement missing events.

## Phase 6: Events manifest

Follow `../generate-events-manifest/SKILL.md`.

Output: `.amplitude/events.json` and `.amplitude/manifest.json`

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
