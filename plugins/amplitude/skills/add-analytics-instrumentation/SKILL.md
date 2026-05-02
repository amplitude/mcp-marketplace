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
run the pipeline to produce a tracking plan.

## Pipeline

### Phase 0: Product-surface gate (PR / Branch mode only)

Before doing any other work in PR or branch mode, decide a single question:

> Does this diff add a **new user-reachable execution path** that produces a
> surface, response, or feedback a user perceives?

If the answer is **no** for every changed file, write the marker file
`.amplitude/no-trackable-surfaces.md` and **STOP**. Do not proceed to Step 0.
The orchestrator reads the marker and posts a "no trackable surfaces" comment
on the original PR instead of opening a prepare PR with events that would
never fire.

This gate exists because publishing a prepare PR for a refactor-only diff
wastes reviewer time, pollutes the project's PR list, and erodes trust in the
agent. A prepare PR the reviewer closes is **not** cheaper than a quiet skip —
it is more expensive, because every false positive trains reviewers to ignore
the agent's output.

**Apply the gate to PR / Branch input only.** File / Directory and Feature
inputs (Step 1a / Step 1b) are explicit user requests to instrument specific
code; Phase 0 does not apply there.

#### Decision rule

Read the **contents** of every changed file (not just paths). For each file,
ask: does the change introduce or expose a new user-reachable execution path?
A user-reachable execution path is code a user **directly causes to run** by
interacting with the product (clicking, typing, navigating, submitting,
viewing, calling an exposed API), and which produces something the user
perceives.

- If **every** changed file is refactor-only (see patterns below) → write
  `.amplitude/no-trackable-surfaces.md` and STOP.
- If **any** changed file introduces a new user-reachable execution path →
  proceed to Step 0.
- If you cannot tell from the diff whether a change is user-reachable, read
  the surrounding code (callers, route definitions, exported symbols). Do not
  guess. **Do not default to proceeding** — the right tiebreaker is "is there
  evidence of a new user-reachable path?" If there is no such evidence, the
  answer is no.

#### Refactor patterns that route to no-trackable-surfaces

These changes do **not** add new user-reachable execution paths and MUST route
to the marker file when they are the only kind of change in the diff:

1. **Constant or literal relocations** — moving a string/number/object
   literal from one scope to another (e.g. function-local → module-level,
   inline → named export). Behaviour is unchanged; only the binding site
   moves.

   *Example (the #37008 shape):*
   ```diff
   -function format(x) {
   -  const PREFIX = "user_";
   -  return PREFIX + x;
   -}
   +const PREFIX = "user_";
   +function format(x) {
   +  return PREFIX + x;
   +}
   ```
   No new surface. Skip.

2. **Renames** — variable, function, parameter, type, or file renames where
   call sites are updated mechanically and behaviour is preserved.

   *Example:*
   ```diff
   -export function getUserId(req) { return req.session.user.id; }
   +export function resolveUserId(req) { return req.session.user.id; }
   ```
   No new surface. Skip. (If the rename touches a tracking call name, that's
   a separate concern handled downstream — never rename event names in
   `events.json`.)

3. **Type-only changes** — adding/refining TypeScript types, Python type
   hints, generic parameters, or interface declarations without altering
   runtime behaviour.

   *Example:*
   ```diff
   -function load(id) { ... }
   +function load(id: UserId): Promise<User> { ... }
   ```
   No new surface. Skip.

4. **Formatting and whitespace** — prettier/black/gofmt reflows, import
   reordering, trailing-comma changes, line-length wraps.

5. **Code reorganization** — splitting a file into modules, extracting a
   helper, inlining a one-off function, reordering exports — when call sites
   resolve to the same behaviour. The execution graph is unchanged; only the
   file layout differs.

6. **Comment / docstring / JSDoc edits** — including TODO removals and
   typo fixes inside comments.

7. **Dead-code deletion** — removing unused exports, unreachable branches,
   or commented-out blocks.

8. **Dependency / lockfile bumps** — `package-lock.json`, `yarn.lock`,
   `uv.lock`, `Pipfile.lock`, `go.sum`, `Gemfile.lock`. Same applies to
   version-only `package.json` / `pyproject.toml` bumps with no new
   imported call sites in source files.

9. **Build / config / tooling** — CI YAML, `.eslintrc`, `tsconfig.json`,
   `Makefile`, dockerfiles, `.gitignore`. These don't reach users at
   runtime.

10. **Test-only diffs** — changes confined to test files (`*.test.*`,
    `*_test.py`, `spec/`, `__tests__/`). Tests don't run in production and
    don't fire tracking calls a user perceives. (Caveat: if the test file is
    actually the product — e.g. an exported test fixture imported by user
    code — read the contents to verify before applying this rule.)

11. **Generated code** — files marked auto-generated, vendored bundles,
    minified output. The source generator is what a reviewer would
    instrument; the artifact is not.

If the diff mixes refactor-only files with files that DO introduce new
user-reachable paths, the gate **opens** — proceed to Step 0. The
downstream pipeline will scope its analysis to the user-reachable files.

#### Heuristics that strongly suggest a new user-reachable path (gate opens)

Any of these in a changed file is sufficient evidence to proceed:

- A new exported handler, route, controller, or page component
- A new `onClick`, `onSubmit`, `onChange`, or other event-handler binding in
  a user-visible component
- A new `fetch` / `axios` / RPC call from client code, or a new endpoint
  registration on the server
- A new branch in user-reachable control flow that produces user-visible
  output (toast, modal, redirect, response body, render output)
- A new feature-flag check that gates user-visible behaviour
- A new form field, button, link, or navigation entry
- A new SDK call site (`.track(`, `.identify(`, `.setUserId(`,
  `.setGroup(`, `.groupIdentify(`) — if the diff is already adding these,
  the gate is moot, but their presence confirms the path is user-reachable

#### Marker file template

When the gate closes, write `.amplitude/no-trackable-surfaces.md` with this
shape:

```markdown
---
reason: <one-line summary of why no surfaces were found>
changed_paths:
  - <path/to/file.ts>
  - <path/to/other.py>
classification: refactor-only | tooling-only | tests-only | docs-only | mixed-non-product
---

# No trackable surfaces

This diff was reviewed against the Phase 0 product-surface gate. No changed
file introduces a new user-reachable execution path that would warrant
instrumentation.

## What we looked at

<bulleted summary, one line per file, naming the refactor pattern that
applied — e.g. "src/utils/format.ts: constant relocation (PREFIX moved to
module scope, no behaviour change)">
```

Then STOP. Do not write `.amplitude/events.json`. Do not run Step 0 onward.
The orchestrator inspects the marker and posts the "no trackable surfaces"
comment on the original PR.

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
