---
name: discover-product-map
description: >
  Discovers all routes, pages, components, and user flows in a codebase and
  maps them into product areas. Detects framework-specific routing patterns
  (Next.js, React Router, Remix, Vue, Angular, Express, Django, Rails, Flask,
  Laravel), identifies product area boundaries, traces multi-step user flows,
  and assesses existing analytics coverage. Use this as Phase 2 of the
  full-repo instrumentation workflow, or independently when you need to
  understand a product's surface area. Outputs a human-readable product map
  and a structured JSON for downstream skills. Trigger on "map this repo",
  "discover product areas", "what pages does this app have", or any request
  to understand the navigation and feature surface of a codebase.
---

# discover-product-map

Map every user-facing surface in a codebase into product areas with coverage
assessment. This is the foundation for full-repo instrumentation — downstream
skills use this map to generate events area by area.

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

### By URL prefix
`/auth/*`, `/login`, `/signup` → Authentication
`/dashboard/*` → Dashboard
`/settings/*` → Settings

### By directory structure
`src/features/billing/` → Billing
`app/(marketing)/` → Marketing

### By domain concept
Signup + Login + Password Reset + OAuth → Authentication
Cart + Checkout + Order Confirmation → Purchase Flow

### Priority assignment
- **critical**: Core journey or revenue-impacting (signup, checkout, main feature)
- **high**: Daily active paths (dashboard, search, primary CRUD)
- **medium**: Secondary features, settings, admin
- **low**: Edge cases, rarely used, admin-only

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

## Step 6: Output

Write two files:

### `.amplitude/product-map.md`

Human-readable document with:
- Product area sections (name, priority, routes, description, key interactions, flows, coverage)
- Descriptions must be substantive — not "Cart page" but "Users review items, adjust quantities, remove products, see subtotal/tax/shipping, and initiate checkout"

### `.amplitude/product-map.json`

```json
{
  "productAreas": [
    {
      "name": "Product area name",
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
  "techStack": {
    "languages": ["TypeScript"],
    "frameworks": ["Next.js"],
    "analyticsSDKs": ["@amplitude/analytics-browser"],
    "packageManager": "npm"
  },
  "existingTracking": {
    "totalEvents": 3,
    "trackingFunction": "trackEvent",
    "importPath": "@/lib/analytics",
    "namingConvention": "Title Case"
  }
}
```

## Common pitfalls

- Do NOT confuse API routes with page routes
- Do NOT count test files (`*.test.*`, `*.spec.*`, `__tests__/`)
- Do NOT count generated or build output (`node_modules/`, `dist/`, `.next/`)
- Do NOT double-count events (trace to actual fire point)
- Do NOT treat internal tooling as product (unless the product IS an internal tool)
