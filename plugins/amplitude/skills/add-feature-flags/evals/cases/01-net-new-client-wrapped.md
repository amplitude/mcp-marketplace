# Case 01 — net-new client surface → Wrapped

## Scenario
A PR adds a brand-new user-facing component to a repo that already uses the
Amplitude Experiment client SDK. The agent should wrap the net-new render path
behind a default-OFF flag.

## Repo context
- `package.json` depends on `@amplitude/experiment-js-client`.
- `src/lib/experiment.ts` exports an initialized client:
  ```ts
  import { Experiment } from '@amplitude/experiment-js-client';
  export const experiment = Experiment.initializeWithAmplitudeAnalytics(process.env.NEXT_PUBLIC_EXPERIMENT_KEY!);
  ```
- Existing guard idiom elsewhere: `experiment.variant('...').value === 'on'`.
- Single deployment key (`NEXT_PUBLIC_EXPERIMENT_KEY`).

## Input diff
```diff
+++ b/src/recommendations/RecommendedForYou.tsx
@@
+export function RecommendedForYou({ userId }: { userId: string }) {
+  const recs = useRecommendations(userId);
+  return (
+    <section className="recs">
+      {recs.map((r) => <RecCard key={r.id} rec={r} />)}
+    </section>
+  );
+}
+++ b/src/home/HomePage.tsx
@@
   return (
     <main>
       <Hero />
+      <RecommendedForYou userId={user.id} />
     </main>
   );
```

## Expected
- **Verdict: Wrapped.**
- `feature-flags.json`:
  - `no_flaggable_surfaces` = `false`, `advisory_only` = `false`
  - `detected_integration.sdk` = `"client"`, `confidence` = `"high"`,
    `deployment.multiple_detected` = `false`
  - `flags` has exactly one entry; `key` derived from the surface (e.g.
    `recommended-for-you`), `default` = `"off"`, `variant_values` =
    `["off","on"]`, non-empty `wrap_locations` pointing at `HomePage.tsx`
    (and/or the component).
- Source edit gates the new `<RecommendedForYou/>` render behind
  `experiment.variant('recommended-for-you').value === 'on'`; the off path
  renders the page exactly as pre-PR (no recs section).
