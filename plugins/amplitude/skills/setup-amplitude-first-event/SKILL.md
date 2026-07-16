---
name: setup-amplitude-first-event
description: >
  Installs the Amplitude SDK from zero and verifies the first event reaches the user's
  project. Use when the user asks "set up Amplitude", "install Amplitude", "add Amplitude
  to this app", "add analytics to my app", "get my first event into Amplitude", or
  "instrument this app with Amplitude" and the repo has no Amplitude tracking yet. If
  tracking already exists, use discover-analytics-patterns or add-analytics-instrumentation
  instead. Stops at one verified event.
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
Amplitude URL when logged in is `app.eu.amplitude.com`, it's EU; `app.amplitude.com` is US.
You'll need this in Step 3.

To point them at the Setup page directly, ask for their org's **URL slug** — the segment
right after `/analytics/` in their Amplitude URL when logged in (not the org display name;
the two can differ) — and build the link:

```
https://app.amplitude.com/analytics/<slug>/setup      # US
https://app.eu.amplitude.com/analytics/<slug>/setup   # EU
```

Have the user confirm that URL loads. If they don't know the slug, have them log in at the
data center's host URL and open Setup from there.

Put the key in an env file, following the repo's existing env-file convention (fall back to
`.env` at the project root; create it if missing, keep existing lines), using the
framework's public prefix from the table:

```
VITE_AMPLITUDE_API_KEY=<key>        # Vite family
NEXT_PUBLIC_AMPLITUDE_API_KEY=<key> # Next.js
AMPLITUDE_API_KEY=<key>             # Node backend
```

Never hardcode the key in source.

## Step 3: Install and initialize — exactly once

Install with the project's package manager, pinned to the verified major (npm shown as
the example):

```bash
npm install @amplitude/unified@^1.1.20     # browser branches
npm install @amplitude/analytics-node@^1   # Node backend branch
```

Initialize **once**, at the app entry. The file paths and placement below are an example
integration — adapt them to this repo's conventions. The package, import style, and init
call are **exact** — correct any deviation before proceeding.

**React/Vue/JS + Vite** — create an init module (example: `src/amplitude.ts`):

```ts
import * as amplitude from '@amplitude/unified';

amplitude.initAll(import.meta.env.VITE_AMPLITUDE_API_KEY, {
  analytics: { autocapture: true },
});
amplitude.track('Setup Verified', { skill_version: 'BA395.4' });
```

The verify event fires right after `initAll` on purpose — the SDK queues events fired
before init completes, so this works in any Vite-family app with no framework hooks.

Then add `import './amplitude';` as the **first** import in the entry file (example:
`src/main.tsx`).

**Next.js** — create a client component (example: `components/AmplitudeInit.tsx`; do NOT
mark the root layout `"use client"`):

```tsx
'use client';
import * as amplitude from '@amplitude/unified';
import { useEffect } from 'react';

let fired = false; // React StrictMode double-invokes effects in dev

export default function AmplitudeInit() {
  useEffect(() => {
    if (fired) return;
    fired = true;
    amplitude.initAll(process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY!, {
      analytics: { autocapture: true },
    });
    amplitude.track('Setup Verified', { skill_version: 'BA395.4' });
  }, []);
  return null;
}
```

Render `<AmplitudeInit />` once inside the root layout's body (`app/layout.tsx`).

**Node backend** — at the server entry:

```ts
import { init, track } from '@amplitude/analytics-node';
init(process.env.AMPLITUDE_API_KEY!);
```

> **EU data center:** add top-level `serverZone: 'EU'` to the init options —
> `amplitude.initAll(key, { serverZone: 'EU', analytics: { autocapture: true } })` (browser) /
> `init(key, { serverZone: 'EU' })` (Node backend). US is the default; omit it for US projects.

> ⚠️ The package determines the init call, exactly: `@amplitude/unified` exposes
> **`initAll`** (`init` does not exist there); `@amplitude/analytics-node` exposes
> **`init`**. Never mix the two.

## Step 4: Fire the one verify event

One explicit event, named exactly `Setup Verified` (Title Case, with the space), carrying
the version property:

```ts
amplitude.track('Setup Verified', { skill_version: 'BA395.4' });
```

Browser branches: already wired in Step 3 — the Vite init module fires it right after
`initAll`, and the Next.js component fires it inside the guarded effect.

Node backend — right after `init` at boot:

```ts
track('Setup Verified', { skill_version: 'BA395.4' }, { user_id: 'setup-verify' });
```

Autocapture will also collect real interactions — a bonus, but always fire this explicit
event so success doesn't depend on the user clicking around.

## Step 5: Verify it compiles

Run the project's build (`npm run build`, or this project's equivalent). If Amplitude lines
error, reconcile against the installed package's exported types — do not invent options or
exports. If the error is in code you didn't touch, it's likely pre-existing — say so instead
of fixing unrelated code. **Never claim success on a failing build.**

## Step 6: Run and confirm

Have the user start the app and watch the **checklist on their Amplitude Setup page** (the
`/setup` URL built in Step 2) — it flips to confirmed the moment the first event lands
(usually seconds). That in-app flip is
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

1. Package ↔ init call: `@amplitude/unified` exposes `amplitude.initAll(...)` (`init` does
   not exist there); `@amplitude/analytics-node` exposes `init(...)`. Never mix the two.
2. Wrong package installed → uninstall it, install the right one.
3. Event name `Setup Verified` exactly.
4. The verify event carries `skill_version`.
5. Key in an env var, never in source.
6. No events beyond the verify event.

## Done

Once the checklist confirms, tell the user their first event landed and where to go next:

- **Ongoing / repo-wide instrumentation** → the add-analytics-instrumentation skill
  (start with discover-analytics-patterns if the repo may already have tracking).
- **Guided taxonomy / dashboards** → the Amplitude wizard: `npx @amplitude/wizard`.

Do not design tracking plans or dashboards here — hand off.
