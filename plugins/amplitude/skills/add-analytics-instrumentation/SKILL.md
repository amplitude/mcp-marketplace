---
name: add-analytics-instrumentation
description: >
  End-to-end analytics instrumentation workflow for a PR, branch, file,
  directory, or feature. Reads the code, discovers what events should be
  tracked, and produces a concrete instrumentation plan — all in one shot. Use
  this skill whenever a user wants to add analytics to a PR, asks "instrument
  this PR", "add tracking to this branch", "what analytics does this file need",
  "instrument the checkout flow", "run the full instrumentation workflow", or any
  request that implies going from code changes to a tracking plan. Also trigger
  when the user gives you a PR link, branch name, file path, or feature
  description and mentions analytics, events, or instrumentation. This is the
  main entry point for the analytics workflow — prefer it over calling the
  individual steps (diff-intake, discover-event-surfaces, instrument-events)
  separately.
---

# add-analytics-instrumentation

You are the orchestrator for the analytics instrumentation pipeline. Your job is
to figure out what the user wants to instrument, gather the relevant code, and
run the pipeline to produce a tracking plan — **or cleanly skip** if the change
has no user-facing product surfaces worth instrumenting.

## Pipeline

### Phase 0: Product-surface gate (stop-early)

Before running the pipeline, decide whether this diff is even a product change.
The agent should NOT propose events for pure backend, tooling, harness, or
infrastructure work. Recommending instrumentation on every PR — regardless of
whether it touches a user-facing surface — produces taxonomy pollution (events
registered in Amplitude that will never fire) and noise in the PR review.

**Non-product paths** (skip instrumentation entirely when ALL changed files
match these):

| Pattern                                  | Rationale                                       |
| ---------------------------------------- | ----------------------------------------------- |
| `tests/`, `__tests__/`, `*_test.py`, `*.test.ts`, `*.spec.ts` | Test harness — runs in CI, not prod |
| `scripts/`, `bin/`, `cli/`, `tools/`     | Developer / CI utilities                         |
| `_eval/`, `evals/`, `benchmarks/`        | Evaluation harness — internal tooling            |
| `infra/`, `terraform/`, `k8s/`, `deploy/`, `.github/` | Infrastructure / CI config            |
| `docs/`, `*.md`, `README*`, `CHANGELOG*` | Documentation                                    |
| `package.json`, `*.lock`, `go.sum`, `Cargo.toml`, `Gemfile.lock` | Dependency manifests |
| `*.config.js`, `*.config.ts`, `tsconfig*.json`, `.eslintrc*`, `.prettierrc*` | Build / lint config |
| `migrations/`, `db/migrate/`             | Schema migrations — no runtime UI interaction    |

**Product surfaces** (at least ONE of these must be present in Core Logic
files for the pipeline to proceed):

| Signal                                                      | Where to look |
| ----------------------------------------------------------- | ------------- |
| React / Vue / Svelte / Angular components                   | `.jsx`, `.tsx`, `.vue`, `.svelte` files with component exports or JSX returns |
| Click / submit / change handlers                            | `onClick=`, `onSubmit=`, `onChange=`, `@click`, `v-on:`, `addEventListener` |
| Route handlers / page components                            | Next.js `app/**/page.tsx`, Remix `routes/`, React Router `<Route>`, Vue Router |
| Form element definitions                                    | `<form>`, `<input>`, `<select>`, `<button type="submit">` |
| HTTP endpoint handlers that serve user requests             | Express/Fastify/Koa route handlers, FastAPI / Flask routes, Rails controllers |
| Mobile UI views                                             | SwiftUI `View` protocols, UIKit `UIViewController`, Jetpack Compose `@Composable`, Android `Activity` / `Fragment` |
| Analytics / tracking calls themselves                       | Existing `track(`, `identify(`, `logEvent(` — even modifications count |

**Decision rule:**

1. If the change_brief has ZERO Core Logic files → stop.
2. If EVERY Core Logic file path matches a non-product pattern → stop.
3. If NO Core Logic file contains any product surface signal → stop.
4. Otherwise → proceed to Step 0 (Capture intent) and the rest of the pipeline.

**When stopping**, write a single marker file:

```
# .amplitude/no-trackable-surfaces.md
reason: "<one-sentence explanation of why no surfaces were found>"
changed_paths:
  - <path 1>
  - <path 2>
hint: "<what kind of diff WOULD produce trackable surfaces on this repo, optional>"
```

Then STOP. Do not proceed to diff-intake or any downstream skill. Do not write
`.amplitude/events.json`. The orchestrator flow (pr_agent.yaml /
init_agent.yaml) reads this marker file and posts a short comment on the
original PR explaining that no instrumentation is proposed, instead of opening
a prepare PR with taxonomy noise.

### Step 0: Capture intent

Before running anything, determine **what** the user wants to instrument. There
are four input types — infer the type from what the user has already provided in
the conversation. Only ask if it's genuinely ambiguous.

| Input type           | How to recognize it                                                            | Example                                                                     |
| -------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| **PR**               | A PR URL, PR number, or phrases like "this PR", "my PR"                        | `instrument PR #42`, `https://github.com/org/repo/pull/42`                  |
| **Branch**           | A branch name or "this branch", "my branch", "current branch"                  | `instrument feature/checkout`, `add tracking to this branch`                |
| **File / Directory** | A file path, directory path, or glob pattern                                   | `instrument src/components/Checkout.tsx`, `add analytics to src/payments/`  |
| **Feature**          | A natural-language description of functionality, not a specific code reference | `instrument the onboarding flow`, `add tracking to the checkout experience` |

**Inference rules:**
- If the user provided a URL or `#number` → **PR**
- If the user provided something that looks like a branch name (contains `/`, no file extension, matches a git branch) → **Branch**
- If the user provided a path that exists on disk (file or directory) → **File / Directory**
- If none of the above match and the input is descriptive → **Feature**
- If the conversation already contains a PR link, branch name, or file path from earlier messages, use that instead of asking again

**If ambiguous**, ask the user:

> What would you like to instrument?
> 1. A specific file or directory
> 2. A PR
> 3. A branch
> 4. A feature (describe it and I'll find the relevant code)

Once you know the input type, proceed to the appropriate step:

- **PR or Branch** → go to Step 1 (diff-intake)
- **File / Directory** → go to Step 1a (direct file read)
- **Feature** → go to Step 1b (feature search)

### Step 1: diff-intake skill (PR or Branch)

Invoke the `diff-intake` skill with the user's PR or branch reference.

It produces a `change_brief` YAML block.

Capture the full YAML output — step 2 consumes it verbatim. Skip to Step 2.

### Step 1a: Direct file read (File / Directory)

Skip diff-intake entirely — there's no diff to analyze. Instead, build the
`change_brief` YAML yourself by reading the files directly.

1. **Resolve the input.** If a directory, find all source files in it (skip
   tests, config, lock files, generated code). If a single file, just use that.
2. **Read each file** and summarize what it does — focus on user-facing behavior,
   not implementation details.
3. **Scan for existing instrumentation** using the same patterns as diff-intake:
   `track(`, `trackEvent(`, `logEvent(`, `amplitude.track(`, `ampli.`, and
   analytics-related imports.
4. **Build the `change_brief` YAML** with `analytics_scope: high` (the user
   explicitly asked to instrument these files, so assume they want tracking).
   Set `primary: feat` and `classification.types: [feat]`. Populate
   `file_summary_map` with each file's summary, layer, and existing
   instrumentation.

Proceed to Step 2 with the YAML you built.

### Step 1b: Feature search (Feature)

The user described a feature in natural language. Your job is to find the
relevant code, then build a `change_brief`.

1. **Search git commit history** to find related commits. Use `git log --all --grep="<patterns>"`. This will find relevant commits. Then read the git commit body to understand the feature and relevant files. If the results are good, then proceed to generating the `change_brief` YAML
2. **Search the codebase** for files related to the described feature. Use a
   combination of:
   - Grep for keywords from the feature description (component names, route
     paths, function names, domain terms)
   - Glob for likely file paths (e.g., `**/checkout/**`, `**/onboarding/**`)
   - Read route definitions, navigation configs, or index files to find entry
     points
3. Build the `change_brief` YAML.

Proceed to Step 2 with the YAML you built.

### Step 2: discover-event-surfaces

Invoke the `discover-event-surfaces` skill, passing the `change_brief` YAML
from step 1.

It produces an `event_candidates` YAML block. If there are zero candidates,
stop and tell the user the change has user-facing impact but no events worth
instrumenting were identified.

If event_candidates is empty, stop here and tell the user there's nothing to
instrument.

Capture the full YAML output — step 3 consumes it.

### Step 3: instrument-events

Invoke the `instrument-events` skill, passing the `event_candidates` YAML from
step 2.

It produces a `trackingPlan` JSON with exact file locations, tracking code, and
property definitions for every critical (priority 3) event.

## Presenting the result

After step 3 completes, present the tracking plan to the user. Walk through each
event briefly:

- What it tracks and why it matters
- Where the tracking call goes (file + function)
- What properties it sends

Then ask if they want to adjust anything or proceed to implementation.

## Error handling

If any step fails (e.g., the PR doesn't exist, git commands error, no files to
analyze), surface the error clearly and stop. Don't try to continue with
incomplete data.
