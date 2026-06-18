---
name: analyze-business-context
description: >
  Builds a comprehensive business context document from a codebase. Reads
  source code, configuration, dependencies, and documentation to understand
  what the product does, how it's built, how it makes money, and what
  analytics state exists. Use this as Phase 1 of the full-repo
  instrumentation workflow, or independently when you need to understand a
  product before making analytics decisions. Trigger on "analyze this repo",
  "what does this product do", "build business context", or any request
  to understand a codebase before instrumenting it.
---

# analyze-business-context

Build a product brief from code. You have something the Amplitude taxonomy
pipeline doesn't: **direct code access**. Your output must be richer because
you can verify what behavioral data can only infer.

What code access gives you that behavioral data doesn't:

- **Database schemas** reveal the exact data model
- **Form components** reveal every user input
- **API handlers** reveal the exact operations users can perform
- **Auth/middleware** reveals the security model
- **Feature flag checks** reveal what's being tested
- **Error handling** reveals where friction occurs
- **Config/constants** reveal pricing tiers and feature gates

Read the `taxonomy` skill at `../taxonomy/SKILL.md` for the description
quality standard your output should meet.

---

## Step 1: Read the product story

| File | What It Reveals | Read For |
|------|-----------------|----------|
| README.md | What the product IS | Product description, target users |
| package.json / pyproject.toml / Gemfile | How the team describes it | Domain, purpose |
| CONTRIBUTING.md / docs/ | Architecture decisions | How the team thinks |
| CHANGELOG.md | Recent priorities | What's actively developed |

## Step 2: Read the architecture

| File | What It Reveals | Read For |
|------|-----------------|----------|
| Database schema (prisma, models/, migrations/) | The data model | Entities, relationships |
| API routes / handlers | Operations users perform | CRUD surface, business logic |
| Middleware / auth | Security model | Who can do what |
| package.json dependencies | Every tool and service | Framework, integrations |

## Step 3: Read the infrastructure

| File | What It Reveals | Read For |
|------|-----------------|----------|
| .env.example | External services | Each env var = a connection |
| docker-compose.yml | Services architecture | DB, cache, queue, search |
| CI/CD config | Deployment target | Where and how it runs |

## Step 4: Read the business model

Search for monetization signals:

```bash
grep -rn "price\|plan\|tier\|premium\|free\|pro\|enterprise" --include="*.ts" --include="*.py" --include="*.rb" src/
grep -rn "stripe\|payment\|charge\|invoice\|subscription" --include="*.ts" --include="*.py" src/
grep -rn "isPremium\|canAccess\|featureFlag\|hasPermission" --include="*.ts" --include="*.py" src/
```

## Step 5: Scan for existing analytics

```bash
grep -rn "track(\|trackEvent(\|logEvent(\|amplitude\|analytics\|segment" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.py" src/ | head -30
```

Note: tracking function, import path, naming convention, and count of existing calls.

## Output

Write `.amplitude/business-context.md` with these required sections (prose, not bullets):

1. **Product Overview** (2-3 paragraphs) — What is this product? Who is it for?
   Be specific: "a B2B SaaS project management tool for remote engineering
   teams" not "a SaaS app."

2. **Architecture** — How is it built? Monolith vs microservices? SSR vs SPA?
   Data flow from user action to database. Data model if a schema was found.

3. **Monetization & Revenue Model** — How does it make money? Reference specific
   code (pricing constants, Stripe handlers, plan checks). If none detected,
   say so explicitly.

4. **Integrations** — Table of every external service with evidence and
   significance.

5. **Analytics Status** — What tracking exists today? List every event found
   with file location. Describe the tracking pattern (function, import, naming).

6. **Key Observations** — Insights that affect analytics strategy: feature flags,
   multi-tenancy, SSR patterns, background jobs, PII concerns.

Every claim must reference specific files you actually read.

## Anti-patterns

- DON'T write a tech stack checklist ("Languages: TypeScript. Frameworks: Next.js.")
- DON'T list dependencies without explaining what they mean for the product
- DON'T skip the database schema — it's the most revealing file
- DON'T ignore the README — it's the team's own product description
- DON'T produce less than 40 lines. If shorter, you haven't read enough code.
