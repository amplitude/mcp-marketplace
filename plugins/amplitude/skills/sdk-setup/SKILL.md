---
name: sdk-setup
description: >
  Installs and initializes the Amplitude unified SDK in a frontend app —
  nothing more. Detects the app root and package manager, adds
  @amplitude/unified to the app's package manifest, and initializes it with
  Session Replay and Autocapture enabled. Use this when asked to "install
  Amplitude", "set up Amplitude", "add the Amplitude SDK", "initialize the SDK
  in this app", "bootstrap Amplitude", or otherwise get the SDK running in a
  frontend codebase. This skill is deliberately SDK-only — it does NOT add
  custom events, taxonomy, a tracking plan, or a manifest. If the request
  mentions specific events to track, use add-analytics-instrumentation or
  full-repo-instrumentation instead.
---

# sdk-setup

Your job is to install and initialize the Amplitude unified SDK in the
customer's frontend app. That is the entire scope. You are a bootstrap skill,
not an instrumentation skill.

## What this skill does

1. Detects the frontend app root, its package manager, and its entry point.
2. Adds `@amplitude/unified` to that app's package manifest.
3. Initializes the SDK at the entry point with Session Replay and Autocapture
   enabled.

## What this skill does NOT do

Read the "Forbidden actions" section below before writing anything. In short:
no custom events, no taxonomy, no tracking plan, no manifest.

---

## Step 1 — Detect the frontend app root

Find the app that runs in a browser. The answer must come from the repository's
own conventions, not from a hardcoded framework list.

Look for, in order of reliability:

1. **Manifests** — `package.json` files. A frontend app has a `dev`/`build`
   script and a browser framework dependency (`react`, `vue`, `svelte`,
   `@angular/core`, `solid-js`, `preact`, `lit`, `astro`, `next`, `nuxt`,
   `@remix-run/react`, `@sveltejs/kit`, etc.).
2. **Build config** — `vite.config.*`, `webpack.config.*`, `rollup.config.*`,
   `next.config.*`, `angular.json`. These live in the app root.
3. **An HTML entry** — `index.html` (or a framework template that renders one)
   confirms a browser target.

Ignore `packages/` that are libraries, server-only services, CLIs, or test
harnesses. A workspace root `package.json` with no source of its own is not the
app.

### If more than one candidate app root exists

If you cannot determine a single frontend app root, **report the candidate
roots** — list each path with one line of evidence (framework dependency +
build config) — and stop. Do not pick one and do not guess. A human will choose.

### If the target is not a browser app

If the only candidates are server-only, static-site, or native targets, report
that the app is unsupported for SDK setup and stop. Write nothing.

---

## Step 2 — Identify the package manager

Infer the package manager from the repository, not from preference:

| Evidence file in the app root or workspace root | Package manager |
| ----------------------------------------------- | --------------- |
| `pnpm-lock.yaml` | `pnpm` |
| `yarn.lock` | `yarn` |
| `bun.lockb` / `bun.lock` | `bun` |
| `package-lock.json` | `npm` |
| a `packageManager` field in `package.json` | that value |

If the repo is a workspace/monorepo, respect the workspace layout: add the
dependency to the **app's** `package.json`, not the workspace root, and run the
install from the workspace root the way the repo's scripts do.

---

## Step 3 — Pick the entry point

Choose the app's bootstrap file — the module that runs first in the browser.
Prefer, in this order:

1. An existing analytics/telemetry init module, if the repo already has one.
2. The framework's documented bootstrap (`src/main.tsx`, `src/main.ts`,
   `src/index.tsx`, `app/layout.tsx` for Next.js App Router, `pages/_app.tsx`
   for Pages Router, etc.).
3. `src/index.ts` / `src/index.tsx`.

Ignore test and Storybook entry points (`*.test.*`, `*.stories.*`, `cypress/`,
`e2e/`, `__tests__/`).

Initialize at module scope so it runs once on load. If the framework renders on
the server as well, guard the init so it only runs in the browser (`typeof
window !== 'undefined'`).

---

## Step 4 — Install `@amplitude/unified`

Add one dependency: `@amplitude/unified`. Use the package manager from Step 2
and the repo's own add command, for example:

```bash
# pnpm (from the workspace root)
pnpm --filter <app-package-name> add @amplitude/unified

# npm / yarn / bun, from the app root
npm install @amplitude/unified
yarn add @amplitude/unified
bun add @amplitude/unified
```

Do not add any other package. `@amplitude/unified` bundles the analytics
browser SDK and the Session Replay plugin.

---

## Step 5 — Initialize with `initAll`

Import and initialize at the entry point using the API key supplied to you.
Enable Session Replay and Autocapture in the init options:

```ts
import { initAll } from '@amplitude/unified';

initAll('<AMPLITUDE_API_KEY>', {
  analytics: {
    // Autocapture: page views, sessions, element/frustration interactions,
    // network tracking. `true` enables the defaults; use an object to tune.
    autocapture: true,
  },
  sessionReplay: {
    sampleRate: 1, // record 100% of sessions during initial setup
  },
});
```

Notes:

- `initAll` returns a promise; you do not need to await it to finish the task.
- `serverZone: 'EU'` must be added only if the account is EU. Ask if unclear;
  default to US.
- `autocapture` accepts `true` or an options object. Fields include
  `pageViews`, `sessions`, `elementInteractions`, `frustrationInteractions`,
  `networkTracking`, and `webVitals`.
- `sessionReplay.sampleRate` is a number between 0 and 1.
- The API key is the project's browser (client) key. It is expected in client
  code. Do not invent one — use the key you were given, and if none was given,
  report that the key is missing and stop.

---

## Step 6 — Report

Report, concisely:

- the app root you chose and why,
- the entry point you modified,
- the exact dependency added,
- the init block you wrote.

Do not produce a tracking plan, an events manifest, or a `.amplitude/`
directory.

---

## Forbidden actions

This skill MUST NOT do any of the following. These belong to other skills:

- Emit custom `trackEvent(...)` or `logEvent(...)` calls. Do not invent events.
- Register or update taxonomy.
- Create or edit `.amplitude/events.json`.
- Create or edit `.amplitude/tracking-plan.md`.
- Create or edit `.amplitude/manifest.json`.
- Perform business-context analysis.
- Perform product-map analysis.
- Read a `.amplitude/instrumentation-agent.yaml` mapping file. There is no such
  precondition for SDK setup; a fresh repo with no `.amplitude/` directory is
  the expected case.

If you find yourself writing an event name, you have drifted out of scope — stop
and cut that change.

---

## Preconditions

None beyond a frontend app and an API key. In particular, there is no mapping
file to find and no app config to read.
