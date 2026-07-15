---
name: setup-amplitude-first-event
description: >
  Installs the Amplitude SDK from zero and verifies the first event reaches the user's
  project — detect the framework, install and initialize, fire one verify event, confirm on
  the Amplitude Setup page. Use when the user asks "set up Amplitude", "install Amplitude",
  "add Amplitude to this app", "add analytics to my app", "get my first event into
  Amplitude", or "instrument this app with Amplitude" and the repo has no working Amplitude
  tracking yet. Do not use when tracking already exists — use discover-analytics-patterns or
  add-analytics-instrumentation instead. Not for tracking plans, taxonomies, or dashboards —
  this skill stops at one verified event.
---

# setup-amplitude-first-event

You are setting up Amplitude in the user's project and verifying one real event reaches their
Amplitude project. Goal: **detect → install + init → fire one verify event → confirm.**
Nothing more — no tracking plan, no custom event design, no dashboards.

> **Scope rule (enforce):** do not add any events beyond the single verify event below — no
> click or interaction tracking, no event taxonomy; autocapture already covers interactions.
> If the user wants more events, finish the first event, then hand off (see **Done**).

## Step 1: Detect the framework

Read `package.json` and match against this table:

| Dependency | Branch | Entry point | Env var prefix | SDK |
|---|---|---|---|---|
| `next` | Next.js | client component imported by `app/layout.tsx` | `NEXT_PUBLIC_` | `@amplitude/unified` |
| `react` + `vite` | React + Vite | `src/main.tsx` | `VITE_` | `@amplitude/unified` |
| `vue` + `vite` | Vue + Vite | `src/main.ts` | `VITE_` | `@amplitude/unified` |
| `vite` (plain JS) | JS + Vite | `src/main.js` | `VITE_` | `@amplitude/unified` |
| none of the above, has a server entry | Node backend | server entry file | none — `process.env` | `@amplitude/analytics-node` |

- **Not a JavaScript-family project** (no `package.json`, or Python/Go/mobile/etc.): stop —
  make no code changes. Tell the user this skill covers JS apps today and point them to
  the platform SDK docs at https://amplitude.com/docs/sdks.
- Framework not in the table but JS-based: keep the same steps, use the closest row, and
  adapt file names and env access — never invent SDK option names.

## Step 2: Get the API key into an env var

Ask the user for their **project API key** — it's on their Amplitude **Setup page** (if they
have no project yet: sign up, create one, the Setup page appears after that).

Also ask which **data center** their project is on — **EU or US**. Quick check: if their
Amplitude Setup page URL is `app.eu.amplitude.com`, it's EU; `app.amplitude.com` is US.
You'll need this in Step 3.

Put it in `.env` at the project root (create the file if missing, keep existing lines),
using the framework's public prefix from the table:

```
VITE_AMPLITUDE_API_KEY=<key>        # Vite family
NEXT_PUBLIC_AMPLITUDE_API_KEY=<key> # Next.js
AMPLITUDE_API_KEY=<key>             # Node backend
```

Never hardcode the key in source.

## Step 3: Install and initialize — exactly once

Install, pinned to the verified major:

```bash
npm install @amplitude/unified@^1.1.20     # browser branches
npm install @amplitude/analytics-node@^1   # Node backend branch
```

Initialize **once**, at the app entry. The package, import style, and init call are
**exact** — correct any deviation before proceeding.

**React/Vue/JS + Vite** — create `src/amplitude.ts`:

```ts
import * as amplitude from '@amplitude/unified';

amplitude.initAll(import.meta.env.VITE_AMPLITUDE_API_KEY, {
  analytics: { autocapture: true },
});
```

Then add `import './amplitude';` as the **first** import in the entry file (`src/main.tsx`).

**Next.js** — create `components/AmplitudeInit.tsx` (client component; do NOT mark the root
layout `"use client"`):

```tsx
'use client';
import * as amplitude from '@amplitude/unified';
import { useEffect } from 'react';

export default function AmplitudeInit() {
  useEffect(() => {
    amplitude.initAll(process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY!, {
      analytics: { autocapture: true },
    });
    amplitude.track('Setup Verified', { skill_version: 'BA395.3' });
  }, []);
  return null;
}
```

Render `<AmplitudeInit />` once inside `app/layout.tsx`'s body.

**Node backend** — at the server entry:

```ts
import { init, track } from '@amplitude/analytics-node';
init(process.env.AMPLITUDE_API_KEY!);
```

> **EU data center:** add top-level `serverZone: 'EU'` to the init options —
> `amplitude.initAll(key, { serverZone: 'EU', analytics: { autocapture: true } })` (browser) /
> `init(key, { serverZone: 'EU' })` (Node backend). US is the default; omit it for US projects.

> ⚠️ Browser branches use **`amplitude.initAll`** exactly — `amplitude.init(...)` is a
> different, analytics-only entry point and is NOT acceptable there. The Node package's
> correct call IS `init(...)` — do not swap `initAll` into the backend branch.

## Step 4: Fire the one verify event

One explicit event, named exactly `Setup Verified` (Title Case, with the space), carrying
the version property. Browser (Vite family) — in the component that first mounts, inside a
run-once `useEffect` (Next.js: already included in the snippet above):

```ts
amplitude.track('Setup Verified', { skill_version: 'BA395.3' });
```

Node backend — right after `init` at boot:

```ts
track('Setup Verified', { skill_version: 'BA395.3' }, { user_id: 'setup-verify' });
```

Autocapture will also collect real interactions — a bonus, but always fire this explicit
event so success doesn't depend on the user clicking around.

## Step 5: Verify it compiles

Run the project's build (`npm run build`, or this project's equivalent). If Amplitude lines
error, reconcile against the installed package's exported types — do not invent options or
exports. If the error is in code you didn't touch, it's likely pre-existing — say so instead
of fixing unrelated code. **Never claim success on a failing build.**

## Step 6: Run and confirm

Have the user start the app and watch the **checklist on their Amplitude Setup page** — it
flips to confirmed the moment the first event lands (usually seconds). That in-app flip is
the source of truth: **do not claim success before it flips.**

If it doesn't flip within a minute:

1. EU project but `serverZone` not set — events went to the US endpoint. Add
   `serverZone: 'EU'` to the init options (Step 3).
2. Restart the dev server — env vars load at startup.
3. Try an incognito window / disable ad blockers — both silently drop analytics requests.
4. Re-check the key in `.env` against the Setup page — no extra spaces or quotes.

## Non-negotiables — enforce, don't ratify

These are exact, not suggestions. If anything deviates, fix it before moving on — never
"that's fine":

1. Browser branches: package `@amplitude/unified`, init `amplitude.initAll(...)`. Wrong
   package → uninstall it, install the right one.
2. Node branch: package `@amplitude/analytics-node`, init `init(...)`.
3. Event name `Setup Verified` exactly.
4. The verify event carries `skill_version`.
5. Key in an env var, never in source.
6. No events beyond the verify event.

## Done

Once the checklist confirms, tell the user their first event landed and where to go next:

- **Ongoing / repo-wide instrumentation** → [add-analytics-instrumentation](../add-analytics-instrumentation/SKILL.md)
  (start with [discover-analytics-patterns](../discover-analytics-patterns/SKILL.md) if the
  repo may already have tracking).
- **Guided taxonomy / dashboards** → the Amplitude wizard: `npx @amplitude/wizard`.

Do not design tracking plans or dashboards here — hand off.
