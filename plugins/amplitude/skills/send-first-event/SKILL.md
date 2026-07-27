---
name: send-first-event
description: >
  Installs the Amplitude SDK from zero and verifies one real event from the user's own
  app lands in their project. Use when the user asks "set up Amplitude", "install
  Amplitude", "add Amplitude to this app", "add analytics to my app", "get my first event
  into Amplitude", or "instrument this app with Amplitude" and the repo has no Amplitude
  tracking yet. If tracking already exists, use discover-analytics-patterns or
  add-analytics-instrumentation instead. Stops at one verified event.
---

# send-first-event

You are setting up Amplitude in the user's project and verifying one real event — chosen
with the user from their own codebase — reaches their Amplitude project. Goal:
**preflight → detect → find their event → install + init → instrument → confirm.**
Nothing more — no tracking plan, no event taxonomy, no dashboards.

> **Scope rule (enforce):** exactly one explicit event, and only the one the user chose —
> no additional click or interaction tracking, no taxonomy; autocapture already covers
> generic interactions. If the user wants more events, finish this one, then hand off
> (see **Done**).

> **Conflict rule:** if the user's instructions conflict with anything this skill does —
> in either direction — say so explicitly and let them decide. Never silently override.

> **Amplitude MCP (if connected):** when an Amplitude MCP server is available in this
> environment, prefer its tools where a step offers an **[MCP path]** — programmatic key
> retrieval and server-side ingestion verification replace the manual asks. Every step
> still works without it via the ask-the-user path. Use only tools the connected server
> actually exposes — never invent tool names; if the tool a step expects isn't there,
> take the no-MCP path.

## Step 0: Preflight — is Amplitude already here?

Scan before touching anything: `@amplitude/*` in any `package.json`, and Amplitude
`init(` / `initAll(` / `track(` patterns in source. If found, **stop — make no changes** —
and route: discover-analytics-patterns to map what exists, then
add-analytics-instrumentation to extend it.

## Step 1: Detect the framework

Read `package.json` and match against this table. Exactly **one** row applies — take the
first match, top-down:

| Dependency | Branch | Entry point | Env var prefix | SDK |
|---|---|---|---|---|
| `next` (has `app/`) | Next.js App Router | client component imported by `app/layout.tsx` | `NEXT_PUBLIC_` | `@amplitude/unified` |
| `next` (has `pages/`) | Next.js Pages Router | init module imported in `pages/_app.*` | `NEXT_PUBLIC_` | `@amplitude/unified` |
| `react` + `vite` | React + Vite | `src/main.tsx` | `VITE_` | `@amplitude/unified` |
| `vue` + `vite` | Vue + Vite | `src/main.ts` | `VITE_` | `@amplitude/unified` |
| `vite` (plain JS) | JS + Vite | `src/main.js` | `VITE_` | `@amplitude/unified` |
| none of the above, has a server entry | Node backend | server entry file | none — `process.env` | `@amplitude/analytics-node` |

- **Monorepo:** operate on the workspace that owns the runnable app. If it's ambiguous
  which one that is, ask before touching anything.
- **Not a JavaScript-family project** (no `package.json`, or Python/Go/mobile/etc.): stop —
  make no code changes. Tell the user this skill covers JS apps today and point them to
  the platform SDK docs at https://amplitude.com/docs/sdks.
- Framework not in the table but JS-based: keep the same steps and adapt file names and
  env access — but if you cannot confidently map the client boundary or the env access,
  stop and say so instead of improvising. Never invent SDK option names.

## Step 2: Get the API key, data center, and Setup page

**[MCP path]** — with the Amplitude MCP connected, skip the questions below, with three
guards:

- **Project:** state the target project **by name** and get a yes — even when only one is
  selected. A silently-wrong project passes Step 7's ingestion check while the user's
  real project stays empty.
- **Data center:** read EU/US from the project's context. If the context doesn't clearly
  show it, don't guess — ask the user exactly as the no-MCP path does; wrong region =
  events silently never arrive.
- **Setup page:** take the project's Setup-page URL from the MCP context if it exposes
  one; otherwise collect the org slug and build the link as below — Step 7 uses it.

**Key timing:** if the server exposes a dedicated key-retrieval tool, defer the key fetch
to Step 4 and retrieve it just-in-time — human round-trips are expensive, so the no-MCP
path front-loads its questions; tool calls are cheap, so fetch at the moment of use. If
there is no dedicated key tool (or it's unclear which tool that is), do **not** defer:
ask the user for the key now, exactly as below — and never use a generic data/query tool
to obtain a key. Either way the key gets placed per **Key placement** at the end of this
step. Then go to Step 3.

**[No MCP — ask the user]:**

Ask the user for their **project API key** — it's on their Amplitude **Setup page** (if they
have no project yet: sign up, create one, the Setup page appears after that).

Also ask which **data center** their project is on — **EU or US**. Quick check: if their
Amplitude URL when logged in is `app.eu.amplitude.com`, it's EU; `app.amplitude.com` is US.
Settle this **now, before any code is generated** — it changes the init options in Step 4,
and events sent to the wrong endpoint never arrive.

To point them at the Setup page directly, ask for their org's **URL slug** — the segment
right after `/analytics/` in their Amplitude URL when logged in (not the org display name;
the two can differ) — and build the link:

```
https://app.amplitude.com/analytics/<slug>/setup      # US
https://app.eu.amplitude.com/analytics/<slug>/setup   # EU
```

Have the user confirm that URL loads. If they don't know the slug, have them log in at the
data center's host URL and open Setup from there.

**Key placement — BOTH paths, follow the repo's convention** (however the key was
obtained — MCP fetch or user-provided — it lands the same way):

- **Repo already uses env machinery** (existing `.env*` files or framework env config) →
  put the key in the env file the repo already uses (create it if missing, keep existing
  lines), with the framework's public prefix from the table:

  ```
  VITE_AMPLITUDE_API_KEY=<key>        # Vite family
  NEXT_PUBLIC_AMPLITUDE_API_KEY=<key> # Next.js
  AMPLITUDE_API_KEY=<key>             # Node backend
  ```

  Prefixed vars are inlined at build time, so an unset var is a **silent** production
  failure — every snippet that reads the key carries a missing-key guard (see Step 4)
  that warns loudly instead.

- **Bare repo, no env system** → hardcode the key in the init module, with this comment:

  ```ts
  // Amplitude ingestion key — public by design (ships in the bundle either way);
  // consider moving to an env var when you set up environments — see the final step.
  const AMPLITUDE_API_KEY = '<key>';
  ```

Either way, the key must never be silently absent.

## Step 3: Find the first event

The first event should be a real product moment from **their** app — not a placeholder.
Scan the repo for low-hanging meaningful moments:

- routes / pages → `Viewed Home Page`
- auth flows → `Signed Up`
- the primary CTA → e.g. `Started Checkout`

Propose 1–3 candidates **with file evidence** (the path and line of the route, handler, or
component each one comes from). Recommend the candidate that fires at load/mount time — it
confirms in seconds without anyone having to click. Be honest about the trade-off:
autocapture (Step 4) already logs generic page views; an explicit named event gives them a
clean, chartable, named moment of their own.

The user picks — or names their own; their word is final. Bare scaffold with nothing
meaningful in it yet → default to `Viewed Home Page`. Naming guidance, one line: Title
Case, past-tense action ("Signed Up", "Viewed Home Page").

**Exactly one event.** More events are a hand-off (see **Done**), not a bigger Step 3.

## Step 4: Install and initialize — exactly once

Install with the project's package manager, pinned to the minimum verified version within
major 1 (npm shown as the example):

```bash
npm install @amplitude/unified@^1.1.20     # browser branches
npm install @amplitude/analytics-node@^1   # Node backend branch
```

**[MCP path, deferred key]** — fetch the key now with the server's dedicated
key-retrieval tool and place it per Step 2's **Key placement** rules (env file +
missing-key guard, or hardcoded constant + comment) **before** writing the init module —
the snippets below read the key from wherever you placed it, and a fetched-but-unplaced
key means the guard fires and analytics is silently disabled. If you wrote an env file
while a dev server was already running, note that it must be restarted — env vars load
at startup. If the fetch fails or returns no key, fall back to asking the user (Step 2's
no-MCP ask) — the key must never be silently absent.

Initialize **once**, at the app entry. The file paths and placement below are an example
integration — adapt them to this repo's conventions, and match the repo's language: the
init module's extension follows the repo (`.ts` / `.js`), and TypeScript-only syntax never
goes into a `.js` file. The package, import style, and init call are **exact** — correct
any deviation before proceeding. On the bare-repo branch (hardcoded key per Step 2),
replace each env read below with the commented constant from Step 2.

**EU projects:** the generated init call must include `serverZone: 'EU'` — it is marked in
place in each snippet below. US projects omit that line. Not optional; see Non-negotiables.

**React/Vue/JS + Vite** — create an init module (example: `src/amplitude.ts`):

```ts
import * as amplitude from '@amplitude/unified';

const key = import.meta.env.VITE_AMPLITUDE_API_KEY;
if (key) {
  amplitude.initAll(key, {
    serverZone: 'EU', // EU data center only — omit this line for US
    analytics: { autocapture: true },
  });
} else {
  console.warn('[amplitude] VITE_AMPLITUDE_API_KEY is not set — analytics disabled');
}
```

Then add `import './amplitude';` as the **first** import in the entry file (example:
`src/main.tsx`).

**Next.js App Router** — create a client component (example: `components/AmplitudeInit.tsx`;
do NOT mark the root layout `"use client"`):

```tsx
'use client';
import * as amplitude from '@amplitude/unified';
import { useEffect } from 'react';

let initialized = false; // React StrictMode double-invokes effects in dev

export default function AmplitudeInit() {
  useEffect(() => {
    if (initialized) return;
    initialized = true;
    const key = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
    if (!key) {
      console.warn('[amplitude] NEXT_PUBLIC_AMPLITUDE_API_KEY is not set — analytics disabled');
      return;
    }
    amplitude.initAll(key, {
      serverZone: 'EU', // EU data center only — omit this line for US
      analytics: { autocapture: true },
    });
  }, []);
  return null;
}
```

Render `<AmplitudeInit />` once inside the root layout's body (`app/layout.tsx`).

**Next.js Pages Router** — create an init module (example: `lib/amplitude.ts`), guarded so
it only runs in the browser (the module is also evaluated during server-side rendering):

```ts
import * as amplitude from '@amplitude/unified';

const key = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
if (typeof window !== 'undefined') {
  if (key) {
    amplitude.initAll(key, {
      serverZone: 'EU', // EU data center only — omit this line for US
      analytics: { autocapture: true },
    });
  } else {
    console.warn('[amplitude] NEXT_PUBLIC_AMPLITUDE_API_KEY is not set — analytics disabled');
  }
}
```

Then import it at the top of `pages/_app.*`.

**Node backend** — at the server entry:

```ts
import { init, track } from '@amplitude/analytics-node';

const key = process.env.AMPLITUDE_API_KEY;
if (key) {
  init(key, {
    serverZone: 'EU', // EU data center only — omit this line for US
  });
} else {
  console.warn('[amplitude] AMPLITUDE_API_KEY is not set — analytics disabled');
}
```

> ⚠️ The package determines the init call, exactly: `@amplitude/unified` also exports
> `init`, but it initializes analytics ONLY — session replay, experiment, and engagement
> are silently dropped. Never use `init` with unified; always **`initAll`**.
> (`@amplitude/analytics-node`'s correct call IS `init`.)

## Step 5: Instrument the chosen event

Add the one chosen event at the moment it represents:

- **Load/mount-time event** (e.g. `Viewed Home Page`) — right after `initAll` in the init
  module (App Router: inside the guarded effect, right after `initAll`). The SDK queues
  events fired before init completes, so this is safe.
- **Interaction event** (e.g. `Signed Up`) — in that action's existing handler, at the
  point where the action has actually succeeded.

Browser branches:

```ts
amplitude.track('Viewed Home Page', {
  skill_version: 'BA395.7', // helps improve this setup flow — safe to remove
});
```

Node backend:

```ts
track('Viewed Home Page', {
  skill_version: 'BA395.7', // helps improve this setup flow — safe to remove
}, { user_id: 'first-event-verify' });
```

Use the user's chosen event name — `Viewed Home Page` above is only the example. The
`skill_version` property rides along on this one event and is safe to delete later.

Autocapture will also collect real interactions — a bonus, but the chosen explicit event
is the verification target, so success never depends on someone happening to click around.

## Step 6: Verify it compiles

Run the project's build (`npm run build`, or this project's equivalent). If Amplitude lines
error, reconcile against the installed package's exported types — do not invent options or
exports. If the error is in code you didn't touch, it's likely pre-existing — say so instead
of fixing unrelated code. **Never claim success on a failing build.**

## Step 7: Run and confirm

The source of truth is **observed ingestion** — either the MCP's server-side check or the
user's in-app confirmation. Never your own assumption, and never the network tab alone:
a request that left the browser is not an event that landed.

**[MCP path]** — once the app runs and the chosen event has fired (load/mount events fire
on start; interaction events need the action performed — ask the user to do it, or, only
with their permission, perform it **through the running app's real flow**; never by
calling `track()` or the HTTP API directly, which would confirm an event the app didn't
produce), call the MCP's ingestion-check tool for the chosen event in the last few
minutes — **against the same project confirmed in Step 2** (key and check scoped to
different projects = false verdicts in both directions). Success = the tool's result
naming **your chosen event** — generic autocapture arrivals are not proof it landed. With that observed you may claim success, citing the
tool result; still point the user at their Setup page (URL from Step 2) so they see the
checklist flip themselves — if you have no Setup URL, the ingestion check is the proof,
skip the pointer. Tool shows nothing (or only autocapture) after ~a minute → fall through
to the debug list below; do not claim success.

**[No MCP]** — have the user start the app and watch the **checklist on their Amplitude
Setup page** (the `/setup` URL built in Step 2). It flips to confirmed the moment any
event arrives (usually seconds) — that proves *something* landed. The specific proof is
their **chosen event name** showing up in the project's live event stream (the Setup
page's event feed). Both together = done. **Do not claim success before the user
confirms.**

If nothing shows within a minute:

1. EU project but `serverZone` not set — events went to the US endpoint. Add
   `serverZone: 'EU'` to the init options (Step 4).
2. Restart the dev server — env vars load at startup.
3. Try an incognito window / disable ad blockers — both silently drop analytics requests.
4. Re-check the key (env file or init module) against the Setup page — or, on the MCP
   path, re-fetch it with the key tool and compare — no extra spaces or quotes.

## Non-negotiables — enforce, don't ratify

These are exact, not suggestions. If anything deviates, fix it before moving on — never
"that's fine":

1. Exactly **one** explicit event, chosen with the user from their own codebase, carrying
   the removable `skill_version` property.
2. Package ↔ init call: with `@amplitude/unified`, always `amplitude.initAll(...)` — its
   `init` export initializes analytics only and silently drops session replay, experiment,
   and engagement. `@amplitude/analytics-node`'s correct call IS `init(...)`.
3. Region correct for their data center: EU project → `serverZone: 'EU'` in the init call.
4. Key placed per the repo's convention — env file with a missing-key guard where the repo
   has env machinery, hardcoded with the explanatory comment on bare repos. Either way it
   must never be silently absent.
5. No events the user didn't choose — never invent a taxonomy.
6. Never claim success you didn't observe. Observation means exactly two things: the MCP
   ingestion check returning **the chosen event by name** in the confirmed project, or
   the user confirming in their own UI. Nothing else counts — not the network tab, not
   a passing build, not autocapture traffic.

## Complete when

Audit this list before your final message — every box, honestly:

- [ ] Build passes.
- [ ] Exactly one explicit event exists — the chosen one, `skill_version` present.
- [ ] Package ↔ init call correct for the branch.
- [ ] Region correct for their data center.
- [ ] Key placed per the repo's convention — env file + missing-key guard, or hardcoded +
      explanatory comment — and never silently absent.
- [ ] The landing is confirmed — by the MCP ingestion check (cite the tool result), or by
      the user (checklist flip plus their event name in the stream). Without the MCP you
      cannot observe this yourself; if unconfirmed either way, say so and stop.

Anything unchecked → report it plainly. Never claim completion over an unchecked box.

## Done

Once the landing is confirmed (the last **Complete when** box — not before), open with
their result: **"Your `<chosen event>` landed, and autocapture is collecting real
usage alongside it."** (Node backend: their event landed — no autocapture claim.)

Then one default next step: if the Amplitude MCP is connected, offer to build a first chart
of their chosen event over time via the create-chart skill — a modest smoke-test of their
new data. No MCP → point them at the chart builder in the Amplitude UI.

If the key is hardcoded: when you set up environments or deploys, move it to an env var
(and consider per-environment projects).

Then ask ONE question — **more events, session replay, or a guided taxonomy?** — and expand
only the matching handoff:

- **More events** → the add-analytics-instrumentation skill (start with
  discover-analytics-patterns if the repo may already have tracking you didn't create).
- **Session replay** → its own enablement decision (sampling rate, privacy, masking) — do
  not embed that configuration here. Once sessions exist, debug-replay and replay-ux-audit
  consume them.
- **Guided taxonomy / dashboards** → the Amplitude wizard: `npx @amplitude/wizard`.

If a named skill or MCP isn't available in this environment, describe the Amplitude-UI
equivalent instead. Do not design tracking plans or dashboards here — hand off.
