---
name: discover-product-map
description: >
  Builds a product map for a codebase that downstream instrumentation skills
  consume. Captures the product strategy (kind, audience, lifecycle, segments,
  metrics, identity, group model) AND the discovery layer (routes, components,
  flows, existing tracking) for frameworks like Next.js, React Router, Remix,
  Vue, Angular, Express, Django, Rails, Flask, Laravel. Use as Phase 2 of the
  full-repo instrumentation workflow, or independently when you need to
  understand a product. Outputs a human-readable product map and a structured
  JSON. Trigger on "map this repo", "discover product areas", "what does this
  app do", or any request to understand a codebase's surfaces and analytics.
---

# discover-product-map

Build a product map that grounds every other instrumentation artifact. The map
has two layers:

- **Strategy layer** — what kind of product this is, what users do with it,
  what success looks like, which questions analytics should answer. A PM or
  data scientist should be able to read this layer alone and form a hypothesis
  worth testing.
- **Discovery layer** — routes, components, flows, and existing tracking. The
  raw codebase facts the next agent run needs to wire up tracking calls.

Both required. A route inventory without the strategy layer produces generic
events with no analytical use; strategy without discovery has nothing to wire
into. Mark anything you cannot determine from the codebase or README as
`"unknown"` with `evidence` — never invent a value to fill a slot.

---

## Step 1: Detect framework and discover routes

Identify frameworks from dependencies and project structure, then find all routes.

### Next.js

**Detect**: `next` in package.json, `next.config.*` exists.

**Routes**:
```bash
# App Router
find app src/app -name "page.tsx" -o -name "page.jsx" -o -name "page.ts" 2>/dev/null | sort
find app src/app -name "route.ts" -o -name "route.tsx" 2>/dev/null | sort  # API routes

# Pages Router
find pages -name "*.tsx" -o -name "*.jsx" 2>/dev/null | grep -v "_app\|_document\|_error" | sort
```

Directory path = URL path. `app/dashboard/settings/page.tsx` = `/dashboard/settings`.

### React Router

**Detect**: `react-router-dom` in package.json.

```bash
grep -rn "path:" --include="*.tsx" --include="*.ts" src/
grep -rn "createBrowserRouter\|<Route " --include="*.tsx" --include="*.ts" src/
```

### Remix

**Detect**: `@remix-run/react` in package.json.

```bash
find app/routes -name "*.tsx" -o -name "*.jsx" 2>/dev/null | sort
```

### Vue Router

**Detect**: `vue-router` in package.json.

```bash
grep -rn "path:" --include="*.ts" --include="*.js" --include="*.vue" src/router/
```

### Angular

**Detect**: `@angular/router` in package.json.

```bash
grep -rn "path:" --include="*.ts" src/ | grep -i "route\|module"
find src -name "*-routing.module.ts" -o -name "app.routes.ts" | sort
```

### Express / Fastify / Hono / Koa

**Detect**: `express`, `fastify`, `hono`, or `koa` in package.json.

```bash
grep -rn "app\.\(get\|post\|put\|delete\|use\)(" --include="*.ts" --include="*.js" src/
grep -rn "router\.\(get\|post\|put\|delete\)(" --include="*.ts" --include="*.js" src/
```

Distinguish API routes (return JSON) from page routes (render HTML). Focus on page routes.

### Django

**Detect**: `django` in requirements.txt, `manage.py` exists.

```bash
find . -name "urls.py" -exec cat {} \; 2>/dev/null
find . -name "views.py" | sort
```

### Rails

**Detect**: `rails` in Gemfile, `config/routes.rb` exists.

```bash
cat config/routes.rb
```

### Flask

**Detect**: `flask` in requirements.txt.

```bash
grep -rn "@app.route\|@blueprint.route" --include="*.py"
```

### Laravel

**Detect**: `laravel` in composer.json.

```bash
cat routes/web.php routes/api.php 2>/dev/null
```

### Fallback

```bash
find src -type d -name "pages" -o -name "views" -o -name "screens" 2>/dev/null
find src -type f -name "*Page.*" -o -name "*View.*" -o -name "*Screen.*" 2>/dev/null | head -50
```

## Step 2: Read every route handler

For each discovered route, READ the source file. Describe:
- What the page/view does (substantive, not "Cart page")
- What interactions exist (forms, buttons, CTAs, modals, toggles)
- What state mutations happen (add/remove/update operations)
- What API calls it makes

## Step 3: Group into product areas

### Enumerate first, prune second

Before grouping, **list every candidate area exhaustively**. The discovery
goal is to capture what actually exists in the product so downstream
instrumentation has a complete surface inventory; a too-tight grouping
silently drops real features and the next phase can't propose tracking
for what isn't on the map.

Run an enumeration pass over the codebase's feature/module organization
before you decide which areas to merge or downgrade:

```bash
# Frontend feature/module directories (one entry per immediate child)
find src/features src/modules src/pages app/features apps -mindepth 1 -maxdepth 1 -type d 2>/dev/null
find lib/features lib/modules lib/screens -mindepth 1 -maxdepth 1 -type d 2>/dev/null  # Flutter / Dart
find src/views src/screens -mindepth 1 -maxdepth 1 -type d 2>/dev/null
```

Every immediate child directory is a **candidate area** unless it is empty,
test-only fixtures, build output, or experimental UI not wired into any
route. Treat a directory as "real product" if any of its files are
imported from a route handler or referenced by another feature directory.

For each enumerated candidate, **decide explicitly** whether to keep it as
its own area, merge it into a parent area, or drop it — and write the
reason in the area's `description` (kept) or in a comment-style note in
the map's `productAreas` block (merged/dropped). Silent drop is not
allowed: if `lib/features/templates/` has 30 files and the final map omits
"Templates", a reviewer can't tell whether you saw it and judged it minor
or simply missed it.

Acceptable disposition for a candidate:

- **Keep as own area** — substantive feature with its own user-facing flows.
- **Merge into parent area** — explicitly fold into another area whose flows
  cover this directory's interactions; record `merged_from: [<directory>]`
  on the parent area (e.g. Recording & Upload merged into Case Workflow
  because users always invoke it from the case page).
- **Downgrade to `low` priority** — substantive but rarely used (admin
  tools, settings, edge surfaces). Keep on the map at low priority rather
  than dropping; the per-area coverage gate downstream will accept a
  `coverage_decision` block for low-priority areas.
- **Drop** — only for: empty / scaffolding / test fixtures / experimental
  code not exposed in the running product.

### Grouping heuristics

By URL prefix:
`/auth/*`, `/login`, `/signup` → Authentication
`/dashboard/*` → Dashboard
`/settings/*` → Settings

By directory structure:
`src/features/billing/` → Billing
`app/(marketing)/` → Marketing

By domain concept (only when the directories actually share a flow):
Signup + Login + Password Reset + OAuth → Authentication
Cart + Checkout + Order Confirmation → Purchase Flow

### Priority assignment
- **critical**: Core journey or revenue-impacting (signup, checkout, main feature)
- **high**: Daily active paths (dashboard, search, primary CRUD)
- **medium**: Secondary features, settings, admin
- **low**: Edge cases, rarely used, admin-only — but *still on the map*

## Step 4: Trace user flows

Find multi-step flows:

```bash
# Navigation chains
grep -rn "router.push\|router.replace\|navigate(" --include="*.tsx" --include="*.ts" src/
grep -rn "<Link " --include="*.tsx" --include="*.jsx" src/ | grep "href\|to="

# Multi-step forms
grep -rn "step\|wizard\|stepper\|progress" --include="*.tsx" --include="*.jsx" -i src/ | head -30

# Form submissions and redirects
grep -rn "onSubmit\|handleSubmit" --include="*.tsx" --include="*.jsx" src/ | head -30
grep -rn "redirect\|router.push\|window.location" --include="*.ts" --include="*.tsx" src/ | head -30
```

For each flow, document: name, ordered steps (with files), start event, end event.

## Step 5: Assess existing analytics coverage

```bash
# Count tracking calls
grep -rn "track(\|trackEvent(\|logEvent(\|capture(" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ | wc -l

# Count by directory
grep -rn "track(\|trackEvent(\|logEvent(\|capture(" --include="*.ts" --include="*.tsx" src/ | sed 's|/[^/]*$||' | sort | uniq -c | sort -rn
```

### Coverage levels
- **full**: Entry + primary action + outcome all tracked
- **partial**: Some tracking but key interactions missing
- **none**: No tracking calls in any files for this area

## Step 6: Capture product strategy

The discovery steps tell you WHAT exists. The strategy layer says WHY it
matters and what questions analytics should answer. Without it, downstream
instrumentation skills produce generic events that don't ladder up to any
business question.

Read the README, top-level docs, package descriptions, and any onboarding
copy to ground the strategy. If the codebase doesn't reveal something, mark
the field `"unknown"` with `evidence` — do not guess.

### `productProfile`

```json
{
  "kind": "ecommerce-storefront",
  "summary": "B2C storefront for curated home goods. Visitors browse, search, view, add to cart, checkout.",
  "primaryAudience": "consumers",
  "valueExchange": "users pay money for physical goods; product earns transaction revenue per order",
  "stage": "post-launch operating product"
}
```

- **`kind`** — one of: `ecommerce-storefront, saas-dashboard, marketplace, content-platform, developer-tools, social-network, media-streaming, fintech, productivity-tool, internal-tool, other`. If `other`, justify in `summary`.
- **`primaryAudience`** — `consumers, businesses, business-buyers, developers, creators, internal-users, mixed`.
- **`valueExchange`** — one sentence: what does the user get and what do they give up (money / attention / data / their work)?
- **`stage`** — `prototype, early-product, growth, post-launch operating product, mature-extending, internal-tool` — inferred from codebase maturity (test coverage, error handling, breadth).

### `userLifecycle`

Stages, primary funnels (event chains from first interaction to value-exchange
moment), and retention loops. Don't transplant SaaS stages onto an ecommerce
site. For a content platform: `Visitor → Reader → Returning → Subscriber`.
For a marketplace, define parallel paths (`Browser → Buyer`, `Browser →
Lister`). Skip retention loops only if the product has no natural repeat-use
shape.

```json
{
  "stages": [
    { "name": "Visitor", "definition": "anonymous browser pre-signup",
      "entrySignal": "first Page Viewed without user_id",
      "exitSignal": "User Signed Up OR User Logged In" }
  ],
  "primaryFunnels": [
    { "name": "Acquisition → First Purchase",
      "steps": ["Page Viewed (homepage)", "Product Viewed", "Add To Cart", "Checkout Started", "Order Placed"],
      "expectedDropoff": "biggest at Add To Cart and Checkout Started" }
  ],
  "retentionLoops": [
    { "name": "Reorder loop", "triggerEvent": "Order Placed",
      "returnEvent": "Order Placed (>= 7 days later)",
      "businessReason": "repeat purchase is the lifeblood metric" }
  ]
}
```

### `userSegments`

Each segment maps to a question an analyst would ask. Cap at ~6. Avoid generic
("desktop users") unless load-bearing. Each segment should change what gets
instrumented (a property to add, an event to refine).

```json
[
  { "name": "First-time buyers",
    "definition": "users with exactly one Order Placed",
    "evidenceProperties": ["lifetime_orders", "first_order_at"],
    "analysisQuestions": [
      "% returning for 2nd purchase within 30d?",
      "Does discount on first order correlate with repeat?"
    ] }
]
```

### `metrics`

One north-star tied to `productProfile.valueExchange`. 1-3 guardrails — each
implies an event you must instrument. Leading indicators are early-warning
ratios for north-star movement.

```json
{
  "northStar": { "name": "Weekly Active Buyers",
    "definition": "distinct user_id with >=1 Order Placed in trailing 7d",
    "whyThis": "ecommerce repeat-buying is the leading edge of revenue health" },
  "guardrails": [
    { "name": "Checkout error rate",
      "definition": "Error Encountered at checkout-* / Checkout Started",
      "threshold": "rises above 2% sustained 24h" }
  ],
  "leadingIndicators": [
    "Add To Cart per Product Viewed (intent quality)",
    "Checkout Started per Add To Cart (commitment ratio)"
  ]
}
```

### `identity`

Anonymous → known transitions and the user properties that make cohort analysis
possible. Each property: name, set/setOnce/increment/append/prepend operation,
trigger event, purpose (why this is load-bearing for analysis). If
auth-required (no anonymous tracking), say so.

```json
{
  "supportsAnonymous": true,
  "identitySetMoment": "amplitude.setUserId() called after login or registration",
  "identityResolutionRules": "device_id pre-login → user_id post-login; SDK handles merge",
  "userProperties": [
    { "name": "user_id", "operation": "set",
      "trigger": "Login + Registration", "purpose": "stable per-user identity" },
    { "name": "first_seen_at", "operation": "setOnce",
      "trigger": "Registration", "purpose": "tenure cohorts" },
    { "name": "lifetime_orders", "operation": "increment",
      "trigger": "Order Placed", "purpose": "buyer-segment cohorts" }
  ],
  "multiDeviceModel": "user_id stable across devices; device_id rotates per browser"
}
```

### `groupModel`

Group analytics (orgs / accounts / workspaces) is a key differentiator —
missing it forces analysts into per-user-only analysis. State an explicit
"none" with rationale if the product is single-tenant B2C.

```json
{
  "hasOrgOrAccountConcept": true,
  "groupTypes": [
    { "groupType": "account", "definition": "billing-paying organization",
      "groupProperties": ["plan_tier", "seat_count", "account_created_at"],
      "purpose": "account-level cohort analysis (expansion revenue, churn risk)" }
  ],
  "rationale": "users belong to accounts; nearly every analysis question is account-scoped"
}
```

---

## Step 7: Output

Write two files. Both layers in both files; same section order.

### `.amplitude/product-map.json`

```json
{
  "techStack": {
    "languages": ["TypeScript"],
    "frameworks": ["Next.js"],
    "analyticsSDKs": ["@amplitude/analytics-browser"],
    "packageManager": "npm"
  },
  "productProfile":  { "...": "Step 6.productProfile" },
  "userLifecycle":   { "...": "Step 6.userLifecycle" },
  "userSegments":    [ "...": "Step 6.userSegments" ],
  "metrics":         { "...": "Step 6.metrics" },
  "identity":        { "...": "Step 6.identity" },
  "groupModel":      { "...": "Step 6.groupModel" },
  "productAreas": [
    {
      "name": "Product area name",
      "primaryQuestion": "What analyst question does this area answer? (e.g., 'how do users find what they buy?')",
      "description": "1-2 sentence description",
      "priority": "critical|high|medium|low",
      "routes": [
        { "path": "/url/path", "file": "src/file.tsx", "description": "what it does" }
      ],
      "components": [
        { "name": "ComponentName", "file": "src/file.tsx", "type": "page|form|modal|cta|panel" }
      ],
      "flows": [
        { "name": "Flow name", "description": "what it accomplishes", "steps": ["step descriptions"] }
      ],
      "existingEvents": [
        { "name": "event name from code", "file": "src/file.tsx", "line": 42 }
      ],
      "coverage": "full|partial|none",
      "gaps": ["description of what tracking is missing"]
    }
  ],
  "existingTracking": {
    "totalEvents": 3,
    "trackingFunction": "trackEvent",
    "importPath": "@/lib/analytics",
    "namingConvention": "Title Case"
  }
}
```

`primaryQuestion` is required on each product area. The question can be
generic when the area's user-facing function is real but its analytical
framing is unclear from code alone (e.g. *"Where do users hit dead ends in
&lt;area&gt; flows?"* is a fine fallback). The right move when an area is
substantive but its primaryQuestion is weak is to **downgrade priority**,
not to drop the area off the map. Areas only get dropped under the rules
in Step 3 (empty / scaffolding / test fixtures / experimental / not
wired into any route).

Map size depends on the product. A small SaaS dashboard might have 3-5
areas; a multi-feature mobile app or a clinical/financial workflow tool
routinely has 8-15+ substantive areas, and that's correct — the
downstream instrumentation phase relies on the map being complete.
Don't enforce an artificial "3-5" ceiling.

### `.amplitude/product-map.md`

Same section order as the JSON, in prose. Descriptions must be substantive —
not "Cart page" but "Users review items, adjust quantities, remove products,
see subtotal/tax/shipping, and initiate checkout."

## Quality bar — self-check before output

1. **Could a PM read just `productProfile + userLifecycle + metrics` and form a testable hypothesis?** If not, sharpen those sections.
2. **Does every strategy field map to instrumentation?** A north-star you can't compute from your proposed events means either the metric or the events are wrong.
3. **Did you mark unknowns as `unknown` rather than guess?** Bad map → bad events → bad analysis.
4. **Is every funnel chainable from the events you propose?** If not, either the funnel is aspirational or the event set is short.

## Common pitfalls

- Do NOT confuse API routes with page routes
- Do NOT count test files (`*.test.*`, `*.spec.*`, `__tests__/`)
- Do NOT count generated or build output (`node_modules/`, `dist/`, `.next/`)
- Do NOT double-count events (trace to actual fire point)
- Do NOT treat internal tooling as product (unless the product IS an internal tool)
- Do NOT pad `productAreas` with weak entries to inflate count — but a substantive feature directory is *not* a weak entry just because the primaryQuestion is generic. Downgrade priority before considering a drop, and follow the Step 3 disposition rules (keep / merge / downgrade / drop) for every enumerated candidate.
