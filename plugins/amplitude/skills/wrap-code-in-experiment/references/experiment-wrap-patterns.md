# Canonical Amplitude Experiment wrap patterns

Reference for `wrap-code-in-experiment`. These are the **default-OFF** guard
idioms to reproduce, grounded in the Amplitude Experiment SDK docs:
- Client: https://amplitude.com/docs/sdks/experiment-sdks/experiment-javascript
- Server (Node): https://amplitude.com/docs/sdks/experiment-sdks/experiment-node-js

**Always reproduce the repo's existing guard idiom** (`detected_integration.guard_pattern`)
over these defaults — these are the fallback when the repo has no established
pattern. The control (`off`/missing) branch MUST equal pre-PR behavior.

> **Default-off semantics:** a null or missing variant evaluates as off. Prefer
> an explicit `=== 'on'` test so the treatment runs **only** on an affirmative
> `on`, and everything else (off, control, unfetched, error) falls back to the
> existing path.

---

## Client — `@amplitude/experiment-js-client`

```ts
import { Experiment } from '@amplitude/experiment-js-client';

// Initialization (reuse the repo's existing client/instance — do not create a new one).
// Plain client deployment key:
const experiment = Experiment.initialize('<DEPLOYMENT_KEY>');
// or, when wired to Amplitude Analytics:
const experiment = Experiment.initializeWithAmplitudeAnalytics('<DEPLOYMENT_KEY>');

// fetch() is async and must have resolved before variant() is meaningful.
// Reuse the repo's existing fetch lifecycle; do not add a new fetch in a hot path.
await experiment.fetch(user);

// Guard. Variant shape: { value, key, payload }. value is e.g. 'on' | 'off' | 'control' | 'treatment'.
const variant = experiment.variant('flag-key');
if (variant.value === 'on') {
  // net-new code path
} else {
  // existing behavior (default-off)
}

// Explicit fallback variant (belt-and-suspenders default-off):
const v = experiment.variant('flag-key', { value: 'off' });
```

### Client — unified browser SDK (`@amplitude/unified`)

When discovery reports `package: @amplitude/unified`, the Experiment client is the
`experiment` namespace exported from the unified package. It is initialized once
via `initAll(API_KEY, { experiment })` (reuse that — never call `initAll` again).

```ts
import { experiment } from '@amplitude/unified';

// initAll('<AMPLITUDE_API_KEY>', { experiment: { ... } }) is already called at app bootstrap.
await experiment.fetch(user);

const variant = experiment.variant('flag-key');
if (variant.value === 'on') {
  // net-new code path
} else {
  // existing behavior (default-off)
}
```

### Client — React hook wrapper (if the repo uses one)

```tsx
// Reproduce the repo's own hook, not a generic one. Shape varies; the guard is the same.
const { value } = useExperiment('flag-key');
return value === 'on' ? <NewSurface /> : <ExistingSurface />;
```

---

## Server — `@amplitude/experiment-node-server`

### Remote evaluation

```ts
import { Experiment } from '@amplitude/experiment-node-server';

const experiment = Experiment.initializeRemote('<DEPLOYMENT_KEY>', config);

// fetchV2(user) is async -> Promise<Variants>. Variants maps flag key -> variant.
const variants = await experiment.fetchV2(user);
if (variants['flag-key']?.value === 'on') {
  // net-new code path
} else {
  // existing behavior (default-off)
}
```

> Older integrations may use `fetch(user)` returning a variants map; match
> whatever the repo already calls (`detected_integration.guard_pattern`).

### Local evaluation

```ts
import { Experiment } from '@amplitude/experiment-node-server';

const experiment = Experiment.initializeLocal('<DEPLOYMENT_KEY>', config);
await experiment.start(); // required once before evaluating

// evaluateV2(user) is synchronous -> Variants
const variants = experiment.evaluateV2(user);
if (variants['flag-key']?.value === 'on') {
  // net-new code path
} else {
  // existing behavior (default-off)
}
```

---

## Other languages

The non-JS SDKs (Python, Go, Ruby, JVM, iOS, Android) follow the same shape:
`Experiment.initialize*(<deployment key>)` → fetch/evaluate for a user → read a
variant whose `.value` is the variant string → `== 'on'` gate with the existing
path as the else branch. Reproduce the repo's local idiom and language
conventions; the default-OFF contract is identical.

---

## Deployment scope (one app can have several)

The client is initialized with a **deployment key**, so each client is bound to
one deployment. When `detected_integration.deployment.multiple_detected` is true,
"reuse the existing client" is ambiguous — wrap against the client whose
deployment matches the flag's scope (e.g. the client used in the same module /
runtime as the net-new surface), never an arbitrary one. If the correct client
can't be determined, **do not wrap that flag** — leave it to advisory.
