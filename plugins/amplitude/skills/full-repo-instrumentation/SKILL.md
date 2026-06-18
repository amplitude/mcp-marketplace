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

The unit Phase 4 iterates over is **the journey**, not the area or the
file. `product-map.json[productAreas][].flows[]` is the authoritative
list of journeys: each entry has structured `steps[]` with `role`
(start / intermediate / success_end / failure_end), `file`, `handler`,
and `existing_event`. Phase 4 walks every flow in every area and grades
per-leg coverage.

If `product-map.json` flows are missing the structured-step shape (older
maps emitted prose strings), backfill them in-memory before continuing —
read the route handler files cited in the area, identify start/success/
failure terminals, and grep for `existing_event` at each step. Do not
skip to event design with unstructured flows; the per-leg coverage gate
below depends on step structure.

### Per-leg coverage gate (the bar)

For each `flow` in each `productArea`:

1. **Enumerate the legs the flow needs covered**:
   - Exactly one `start` leg
   - Zero or more `intermediate` legs (instrumented selectively per the
     funnel-length guidance below — short flows skip these)
   - Exactly one `success_end` leg
   - One or more named `failure_end` legs — every distinct user-visible
     failure mode (provider rejection, timeout, validation error, etc.)
     gets its own leg. A single generic "something failed" leg is not
     acceptable; the analyst can't act on it.

2. **For each required leg, check coverage**:
   - If the step's `existing_event` is non-null AND the existing event
     answers the leg's analyst question, the leg is **covered by
     existing**. Cite the event in the tracking plan.
   - Otherwise, the leg is **uncovered**. Propose a new candidate event
     for the leg. The candidate must be specific to the flow + leg —
     `SIGNIN_FAILED` for sign-in's failure_end, not a shared
     `ERROR_ENCOUNTERED`.

3. **A leg covered by an existing event of the wrong shape is NOT
   covered.** Common traps:
   - A success/completion event does not cover a failure_end. e.g.
     `PMS_CONNECTION_REQUEST_SUBMITTED` (success) does NOT cover the
     PMS connection's failure_end. Failure_ends require failure events.
   - A click/intent event does not cover a success_end. `SIGNIN_CTA`
     (the user tapped sign-in) does NOT cover sign-in's success_end —
     the CTA fires whether auth succeeds or fails. Success_end requires
     a confirmed-outcome event.
   - A pan-product catch-all (`APP_CLICK`, `APP_PAGE_VIEW`,
     `ERROR_ENCOUNTERED` standalone) does not cover any leg. The
     analyst can't isolate the flow without back-mapping property
     combinations onto code paths — that's exactly the analytics
     anti-pattern this audit exists to fix.

4. **Coverage decision per leg, written into the tracking plan**:
   - `covered_by_existing: <EVENT_NAME>` — leg is covered, cite event,
     done.
   - `proposed_new: <EVENT_NAME>` — leg is uncovered, propose this.
   - `intentionally_skipped: <one-sentence reason>` — leg is genuinely
     low-leverage (e.g. a 2-step flow's intermediate leg). Allowed
     sparingly; never for `failure_end` legs.

The output of this phase is a journey-by-journey tracking plan where
every leg has one of the three decisions above. A flow with three
`failure_end` legs and only one `proposed_new` event covering one of
them is not done — the other two need decisions.

### Synthesizing the change_brief per journey

The `discover-event-surfaces` skill expects a `change_brief` YAML.
Synthesize one **per journey** (not per area), carrying the journey's
structured step list through:

```yaml
change_brief:
  classification:
    primary: feat
    types: [feat]
    analytics_scope: high
    stack: <from product-map techStack>
  summary: "<area name> / <journey name>: <flow description>"
  user_facing_changes:
    - "<step.label for each step in journey.steps>"
  surfaces:
    components:
      - name: "<step.handler>"
        file: "<step.file>"
        change: modified
  file_summary_map:
    - file: "<step.file>"
      summary: "<step.label>"
      layer: frontend
  funnel:
    name: "<journey.name>"
    steps:
      - label: "<step.label>"
        role: "<step.role>"          # start | intermediate | success_end | failure_end
        file: "<step.file>"
        handler: "<step.handler>"
        existing_event: "<step.existing_event or null>"
```

The `funnel` block is the new contract. `discover-event-surfaces` reads
it and is graded against per-leg completeness (see that skill's
"Funnel-completeness rule").

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

### Quality bar (per-leg, not per-area)

Earlier versions of this skill graded coverage at the area level — a
single `coverage_decision` block per area was enough to satisfy the
gate. Areas with 5 distinct user flows could be marked "covered" by
citing 3 events from one corner of one flow. The bar is now per-leg
(see "Per-leg coverage gate" above), which closes that loophole.

The reasoning standard the tracking plan must still demonstrate:

1. **Articulate analyst questions per journey.** For each flow in
   `productAreas[].flows[]`, write the 1-3 product questions a PM
   would ask of that journey — phrased as chart-able questions
   ("where in signup do users drop off?", "what % of recordings
   complete sync?"). The questions anchor each leg's coverage
   decision.

2. **Cite specific evidence per leg.** When a leg is marked
   `covered_by_existing`, name the event AND state which analyst
   question it answers AND which leg-shape it is (start / intermediate /
   success_end / failure_end). A `success_end` cited with a click event
   like `SIGNIN_CTA` fails this check — the click fires whether auth
   succeeded or failed.

3. **Per-leg decision, never per-area.** Every leg the flow needs
   (start, success_end, named failure_ends) gets its own
   `covered_by_existing` / `proposed_new` / `intentionally_skipped`
   line. A flow with 3 failure_end legs and one event covering one of
   them is not done.

4. **End-to-end traceability in the final plan.** A reviewer reading
   `tracking-plan.md` should be able to trace, for each journey:
   analyst question → leg → coverage decision → event (existing or
   proposed) → analysis recipe. If the chain breaks anywhere, the bar
   isn't met.

Coverage is measured by per-leg completeness, not event count. A
6-event plan covering 7 flows × 3 legs each (= 21 leg decisions, most
covered by existing) is shippable. A 6-event plan covering 7 flows
where 2 of them have uncovered failure_end legs is not.

#### What does NOT count as leg coverage

Specific evidence means a **named event of the right shape for the
leg** — `IDEXX_CONNECT_CREDENTIALS_ERROR` (failure event) covers the
IDEXX-connect flow's `failure_end` leg for the
"credentials rejected" failure mode. The following do NOT cover any
leg:

- `APP_CLICK` with any `action` / `surface` / `result` property —
  pan-product catch-all
- `APP_PAGE_VIEW` with any `path` / `screen_name` property —
  pan-product catch-all
- A standalone unified `ERROR_ENCOUNTERED` / `ERROR_OCCURRED` event,
  unless the leg is the flow's catch-all error and a flow-specific
  failure event also covers the named failure modes
- A success/completion event cited as cover for a `failure_end` leg
  (e.g. `PMS_CONNECTION_REQUEST_SUBMITTED` does not cover PMS-connect
  failure_end)
- A click/intent event cited as cover for a `success_end` leg (e.g.
  `SIGNIN_CTA` does not cover sign-in's success_end — the CTA fires
  whether auth succeeded or failed)

Why each rule exists: the analyst can't action a chart that aggregates
multiple flows or multiple outcomes into one row. `APP_CLICK` with
`action=submit_feedback,result=failure` looks fine in a tracking plan
and produces unusable analytics — the analyst can't tell which submit
failed for which reason without back-mapping property combinations
onto code paths. The per-leg gate is exactly what the catch-all hides.

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

Required sections, in order:

1. **Executive summary** — one-paragraph read of where existing
   instrumentation is dense and where the per-leg coverage gate found
   gaps.
2. **Coverage matrix** — one row per journey, columns for each leg
   (start / intermediate / success_end / failure_ends). Each cell
   contains either the cited existing event, the proposed new event,
   or `intentionally_skipped: <reason>`. This is the at-a-glance
   completeness check; an empty cell that isn't `intentionally_skipped`
   is a bug.
3. **Per-area, per-journey detail** — for each area, list each journey
   with: analyst questions, the structured leg list (from
   `productAreas[].flows[].steps[]`), and the per-leg decision.
4. **Already-tracked events** — events found in code that the gate
   did NOT propose to change. Reference, not a decision item.
5. **User properties / identify wiring** — see "User properties and
   identify wiring" section above.
6. **Implementation priority** — sorted from critical → low across all
   `proposed_new` events. funnel_role: success_end and failure_end
   events on critical/high-priority flows are themselves critical.

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
