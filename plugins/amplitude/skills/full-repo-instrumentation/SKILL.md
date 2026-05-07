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

## Operating modes

This skill runs in two contexts:

- **Standalone** (Claude Code, manual invocation): you produce artifacts in
  `.amplitude/` and code edits that the human reviews and decides whether to
  commit. No downstream automation reads your output.
- **Agent-runtime** (Amplitude Coding Agent): a webhook handler downstream
  may consume `.amplitude/events.json` + `.amplitude/manifest.json` to
  register events into Amplitude's taxonomy automatically when the resulting
  PR merges.

Sections tagged *(agent-runtime only)* describe behavior that exists to hand
off cleanly to that downstream automation. In standalone mode they are
informational.

---

## Scope contract (READ FIRST)

If the user (or the invoking process) named a specific subdirectory as the
target — e.g., *"Analyze the `sites/marketplace` subdirectory"* — treat
that subdirectory as **your working tree** for this run. You may ONLY read,
write, or stage files under that subdirectory. Other parts of the same
repository are out of scope.

Do not extend the workspace beyond the named subdirectory. Do not import
scope from a `git ls-files` walk of the repo root. Do not write
`.amplitude/events.json`, `.amplitude/tracking-plan.md`, source code, or
any other file outside the named subdirectory under any circumstance.

Why this matters: in a monorepo, out-of-scope writes ship source code
changes to siblings the user never asked you to instrument, and — in
agent-runtime mode — register events from those siblings into the Amplitude
project they don't belong to. Both are silent footguns that surface as
unwanted instrumentation in unrelated parts of the repo or unwanted events
in the analytics destination.

Where this skill (or any sub-skill it calls) says **"scan the full
repository"** or **"the full repo"**, read it as **"the full subdirectory"**
when a subdirectory was named. Phase 1's instruction to *"scan the full
repository"* applies to the named subdirectory's tree only, not the
monorepo root.

If no subdirectory was named — i.e., the request is to analyze the whole
repository — the working directory IS the whole repo and you may walk it
freely. The scope contract is only meaningful when a subdirectory is in
play.

Verification step before any artifact write: every path you are about to
create or modify must start with the named subdirectory's prefix. If a path
doesn't, the write is out of scope — drop it, don't expand the workspace
to "fix" the path.

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

### Quality bar (replaces the prior count + per-area gates)

Earlier versions of this skill imposed a numeric candidate-count floor
banded by area count, plus a per-area structural requirement to ship
either a new event or a `coverage_decision` block per area. Both became
gameable: agents under-merged areas to satisfy the floor with trash, or
over-merged areas to drop the floor under the bar. Hardcoded numerics
are the wrong shape for an inherently context-dependent question — a
mature, well-instrumented codebase honestly needs few new events; an
under-instrumented one of the same size needs many.

Replace those gates with **a reasoning standard the tracking plan must
demonstrate** before it's emitted:

1. **Articulate the analyst questions per area.** For each entry in
   `product-map.json[productAreas]`, write the 1-3 product/business
   questions a PM or operator would ask of that surface — phrased as
   chart-able questions ("where in signup do users drop off?", "which
   recording entry-points convert best to a saved case?"). The
   questions are the lens for everything else.

2. **Cite specific evidence for each conclusion.** Every claim in the
   tracking plan — "this area is already covered," "this funnel needs
   a failure event," "this property is high-cardinality, bucket it" —
   must reference specific evidence: existing event names from
   `analytics-patterns.md`, file paths and line numbers from the source,
   property values from `existing-taxonomy.json`. "Generic existing
   tracking suffices" without naming the events that actually cover the
   analyst questions is not specific evidence; it's a hand-wave.

3. **Reach a defensible coverage decision per area, not a uniform
   structural one.** Possible decisions:
   - *new events proposed* — list them with their analysis_recipe.
   - *existing coverage adequate* — `coverage_decision` block citing
     specific named events that answer the analyst questions, with a
     one-sentence explanation of why each cited event answers which
     question.
   - *area is genuinely low-leverage and out of scope this run* —
     allowed when the area's analyst questions are weak or its traffic
     is so low that instrumenting it isn't worth review cost. Say so
     explicitly with a reason; don't write a fake `coverage_decision`.

4. **Produce a tracking plan a reviewer can follow end-to-end.** A
   reviewer reading the final `tracking-plan.md` should be able to
   trace each area's analyst questions → cited evidence → decision
   without backfilling. If the reasoning is buried, the bar isn't met
   regardless of event count.

Coverage is measured by reasoning quality, not volume. A 3-event plan
with airtight per-area reasoning is shippable. A 20-event plan with
hand-wavy reasoning isn't. The agent's judgment is the lever; this
section gives it the frame to exercise it well.

#### What does NOT count as "specific evidence"

The reasoning standard above is meaningless if the agent can pad it with
generic catch-alls. Specific evidence means a **named event with a clear
mapping to a named analyst question** — `IDEXX_CONNECT_CREDENTIALS_ERROR`
answers "where do users fail to connect their lab integration?";
`OFFLINE_CONTENT_ASSIGN_NEW_CASE` answers "do users actually use offline
recordings to start cases?". The following do **not** answer per-area
analyst questions and don't count as evidence that an area is covered:

- `APP_CLICK` with any `action` / `surface` / `result` property
- `APP_PAGE_VIEW` with any `path` / `screen_name` property
- Generic `Click`, `Page Viewed`, or similar pan-product taxonomies that
  fire on every interaction
- A standalone unified `ERROR_ENCOUNTERED` / `ERROR_OCCURRED` event,
  when the area has no area-specific failure event — it's fine *additive*
  to specific failure events, never as the sole evidence that failure
  paths are covered

Why: a funnel built on `APP_CLICK[action=submit_feedback,result=failure]`
looks fine in a tracking plan and produces unusable analytics — the
analyst can't tell which submit failed for which reason without
back-mapping property combinations onto code paths. The per-area
analyst questions are exactly what the catch-all hides.

When an area's existing evidence is generic catch-alls, the agent should
propose a specific failure event for the area's flows rather than write
a hand-wavy "existing tracking suffices" — the latter makes the
reasoning standard above unmet.

Optional `coverage_decision` format (when the agent reaches an
"existing coverage adequate" decision and wants to make the cited
evidence machine-readable for the reviewer):

```yaml
coverage_decision:
  area: "<product area name>"
  analyst_questions:
    - "<question 1 the area's tracking should answer>"
  cited_events:
    - event: "<SPECIFIC_NAMED_EVENT>"
      answers: "<which analyst question above>"
  rationale: "<one sentence — why these events answer the questions>"
```

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
