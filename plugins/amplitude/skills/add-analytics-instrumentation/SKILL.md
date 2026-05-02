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

Before running the pipeline, decide whether this diff is a product change.
The agent should not propose events for work that never reaches a user —
tooling, harness code, infrastructure, pure data transformations — because
that produces taxonomy rows that will never fire and noise in PR review.

**The judgment to make**

For this specific diff, ask: *does a user directly cause any of the changed
code to run, and does that code produce a surface, response, or feedback
the user perceives?*

That's the entire question. Don't enumerate path patterns — conventions
vary wildly across customer codebases. A Rails app's tests live in
`spec/`. A Go service's user-facing handlers live in `cmd/`. A CLI tool's
product IS the command-line interface. A Next.js `pages/api/` file is
backend *and* product because users hit it with every click. Path names
are a weak hint at best; the file's contents and how it's reached are
what matter.

**How to read a file**

For each changed file (or the small set of files most representative of
the change, when a diff touches many), read it and ask:

1. **Is this code on a user-reachable path?** Follow the imports and call
   chain as far as it takes to answer. If a utility function is only
   called by a CI script that produces a JSON report, it's not
   user-reachable. If the same utility is called by a route handler that
   returns HTML, it is.

2. **Does it produce a user-perceptible effect?** UI renders, HTTP
   responses to browsers/mobile/API consumers, CLI output when the CLI
   is the product, state changes that drive subsequent UI behavior, and
   modifications to existing analytics call sites all count. Internal
   data crunching with no user-visible outcome (a training pipeline, a
   data migration, an eval harness that writes to a log) does not.

3. **Would an analyst at this company reasonably want to know when this
   code runs?** If the answer is "no, this is behind-the-scenes
   machinery," it's probably not worth instrumenting even if it *does*
   technically sit on a user-reachable path.

**Strong positive signals** (any ONE is enough for the pipeline to proceed):

- UI component definitions (JSX/TSX render trees, Vue `<template>`,
  Svelte markup, SwiftUI `View` bodies, Jetpack Compose `@Composable`
  functions, Android layouts / Activities, UIKit view controllers) — the
  file renders pixels a user sees.
- Event handlers attached to interactive elements — `onClick`,
  `onSubmit`, `@click`, `addEventListener`, gesture recognizers,
  keyboard/touch handlers. The file describes something a user can
  directly invoke.
- Route / endpoint definitions that serve user requests — any framework,
  any language, including CLI command registrations when the CLI is
  the product.
- Existing analytics / tracking call sites being modified — if the diff
  changes code that already fires events, instrumenting is by definition
  in scope.
- A clear, reader-level description that says "this is the product
  surface" — e.g., a component module, a page file, an API controller.

**Strong negative signals** (push toward stopping, but don't trigger by
themselves — a single ambiguous file with positive signal still proceeds):

- The file is a test, verified by its own imports (`pytest`, `unittest`,
  `vitest`, `jest`, `rspec`, `go test` helpers, etc.) rather than by its
  directory name.
- The file is a developer utility whose only callers are other developer
  utilities or CI pipelines.
- The change is a pure configuration / manifest edit (lockfile bump,
  `tsconfig` tweak, dependency pin).
- The change is a schema migration with no accompanying code touching a
  user surface.
- The change is documentation / markdown only.
- **The diff is a pure refactor of code that already runs**, with no new
  user-reachable execution path introduced. Concretely, all of these
  patterns are "no new surface" and route to the marker file:
  - **Constant or symbol moved to module-level scope** (or out of it)
    without changing how / when it is read. Hoisting a literal out of a
    function body so it can be reused is internal plumbing — a user did
    not gain a new surface, the code that runs in response to a user is
    unchanged. (See amplitude/amplitude#37008 — the canonical false
    positive that motivated this rule.)
  - **Pure rename** of a function, class, variable, file, or directory
    when call sites are mechanically updated and behavior is unchanged.
  - **File move / split / consolidation** that re-homes existing code
    without touching its semantics — including extracting a helper into
    its own module, or merging two helpers into one.
  - **Type-only changes**: adding type annotations, narrowing a generic,
    converting `any` to a concrete type, reshuffling a function
    signature when no callers behave differently at runtime.
  - **Formatting-only churn**: whitespace, import ordering, lint
    autofix, prettier / black / gofmt runs, comment edits, doc-string
    rewrites.
  - **Dead-code removal**: deleting an unreachable branch, an unused
    helper, a deprecated symbol with no remaining callers.

  A refactor of already-instrumented product code is still "no new
  surface": the existing `track(` call sites are untouched, there is no
  new event to fire, and a tracking-plan diff would be empty.

**Decision rule**

The question is not "is this code on a user-reachable path" — most files
in a product app are. The sharper question is **"does THIS DIFF
introduce a new user-reachable execution path that is not already
instrumented?"** Refactors of already-running product code do not, even
though the surrounding file is a product surface.

- If the diff **introduces a new user-reachable execution path** —
  concretely, ANY of: a new event handler attached to a user-interactive
  element, a new route / endpoint / IPC handler / CLI subcommand, a new
  page / view / screen / component entry point, a new async/await call
  from a product surface into product code that was not there before, a
  newly exported function reached from product UI, or a newly added
  `track(` call site (or modification to an existing one) → **proceed**
  with the full pipeline.
- If EVERY changed file is non-product (test, CI utility, harness code,
  infrastructure, schema-only, docs) → **stop** and write the marker
  file below.
- If the diff is **a pure refactor** of already-running product code —
  any of the patterns from the "Strong negative signals" refactor list
  above (constant relocation, rename, file move, type-only change,
  formatting churn, dead-code removal) — there is **no new
  user-reachable execution path**, so → **stop** and write the marker
  file below. A refactor of a product surface still counts as no new
  surface; the existing instrumentation is untouched and there is no
  new behavior to track.
- If you genuinely cannot decide between proceed and stop — the diff is
  small, ambiguous, the imports are unfamiliar — **stop**. A reviewer
  can always re-run the agent against the PR if they actually want
  events; a prepare PR opened on internal plumbing wastes review time
  and erodes trust in the gate. The earlier "default to proceeding when
  ambiguous" rule produced exactly this failure mode in
  amplitude/amplitude#37008 — a module-level constant relocation the
  agent treated as instrumentable product work.

**When stopping**, write a single marker file:

```
# .amplitude/no-trackable-surfaces.md
reason: "<one-sentence explanation tied to what you actually read in the
  diff — cite specific files / behaviors, not just path patterns>"
files_reviewed:
  - path: <path 1>
    signal: <what you saw when you read it — "unit test", "CLI utility
      called only from CI", "Dockerfile", etc.>
  - path: <path 2>
    signal: <...>
```

Then STOP. Do not proceed to diff-intake or any downstream skill. Do not
write `.amplitude/events.json`. The orchestrator flow (pr_agent.yaml /
init_agent.yaml) reads this marker file and posts a short comment on the
original PR explaining that no instrumentation is proposed, instead of
opening a prepare PR with events that would never fire.

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
