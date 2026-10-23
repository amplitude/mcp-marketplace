# Case 05 — test-only / vendored SDK import → Advisory-only

## Scenario
The Experiment SDK appears in the repo only inside a test file (or a vendored
bundle), not in shipped code. A PR adds a net-new product surface. The confidence
heuristic must demote: there is no real integration to wrap against.

## Repo context
- The only reference to `@amplitude/experiment-js-client` is in
  `src/__tests__/experiment.mock.test.ts` (a mock) — no init in shipped code, no
  guard pattern in product modules.

## Input diff
```diff
+++ b/src/profile/AvatarUploader.tsx
@@
+export function AvatarUploader({ userId }: { userId: string }) {
+  return <input type="file" onChange={(e) => uploadAvatar(userId, e)} />;
+}
+++ b/src/profile/ProfilePage.tsx
@@
       <ProfileForm user={user} />
+      <AvatarUploader userId={user.id} />
```

## Expected
- **Verdict: Advisory-only.**
- `feature-flags.json`:
  - `advisory_only` = `true`
  - `detected_integration.confidence` = `"low"`; `confidence_reason` notes the
    SDK appears only in test/mock/vendored code with no shipped init or guard.
  - `flags` has one suggested entry with **empty** `wrap_locations`.
- **No source edits.** The test/mock file is not treated as a usable integration.
