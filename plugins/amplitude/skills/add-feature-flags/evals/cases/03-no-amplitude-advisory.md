# Case 03 — no Amplitude Experiment integration → Advisory-only

## Scenario
A PR adds a genuine net-new user-facing surface, but the repo has **no** Amplitude
Experiment SDK. The agent should suggest a flag (advisory) but wrap nothing.

## Repo context
- No `@amplitude/experiment-*` dependency anywhere. No flag-guard patterns.

## Input diff
```diff
+++ b/src/checkout/ExpressCheckout.tsx
@@
+export function ExpressCheckout({ cart }: { cart: Cart }) {
+  return (
+    <button onClick={() => startExpressCheckout(cart)}>
+      Express checkout
+    </button>
+  );
+}
+++ b/src/checkout/CheckoutPage.tsx
@@
       <StandardCheckout cart={cart} />
+      <ExpressCheckout cart={cart} />
```

## Expected
- **Verdict: Advisory-only.**
- `feature-flags.json`:
  - `advisory_only` = `true`, `no_flaggable_surfaces` = `false`
  - `detected_integration.sdk` = `"none"`, `confidence` = `"low"`,
    `confidence_reason` explains the repo has no high-confidence Experiment
    integration.
  - `flags` has one entry (suggested key + rationale) with **empty**
    `wrap_locations`.
- **No source edits** (nothing was wrapped). Agent-runtime: comment lists the
  suggested flag, no prepare PR.
