# Case 06 — multiple / ambiguous deployments → Advisory-only

## Scenario
The repo has a real Experiment client integration, but **two distinct deployment
keys** are wired with no clear rule for which a new flag belongs to. A PR adds a
net-new surface. Deployment ambiguity lowers confidence → advisory (don't guess
which deployment to wrap against).

## Repo context
- `@amplitude/experiment-js-client` present.
- Two initialized clients with different deployment keys, e.g.:
  ```ts
  export const webExperiment   = Experiment.initialize(process.env.WEB_EXPERIMENT_KEY!);
  export const adminExperiment = Experiment.initialize(process.env.ADMIN_EXPERIMENT_KEY!);
  ```
- No convention tying a module/surface to one deployment.

## Input diff
```diff
+++ b/src/dashboard/InsightsWidget.tsx
@@
+export function InsightsWidget({ orgId }: { orgId: string }) {
+  const data = useInsights(orgId);
+  return <Widget title="Insights" data={data} />;
+}
+++ b/src/dashboard/Dashboard.tsx
@@
       <Overview orgId={orgId} />
+      <InsightsWidget orgId={orgId} />
```

## Expected
- **Verdict: Advisory-only.**
- `feature-flags.json`:
  - `advisory_only` = `true`
  - `detected_integration.sdk` = `"client"`,
    `detected_integration.deployment.multiple_detected` = `true`,
    `confidence` = `"low"`; `confidence_reason` cites ambiguous deployment.
  - `deployment.key_source` records how the keys were found (e.g.
    `env:WEB_EXPERIMENT_KEY / env:ADMIN_EXPERIMENT_KEY`) — never the raw values.
  - `flags` has one suggested entry with **empty** `wrap_locations`.
- **No source edits** — the correct client/deployment for `InsightsWidget` can't
  be determined, so nothing is wrapped.
