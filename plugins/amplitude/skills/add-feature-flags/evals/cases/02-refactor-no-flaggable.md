# Case 02 — refactor / rename only → No flags needed

## Scenario
A PR only refactors: relocates a constant and renames a helper. No net-new
user-facing behavior. The agent should produce nothing.

## Repo context
- Repo uses `@amplitude/experiment-js-client` (integration present — irrelevant
  here because there is no flag-worthy surface).

## Input diff
```diff
+++ b/src/utils/format.ts
@@
-export function getUserId(req) {
-  const PREFIX = "user_";
-  return PREFIX + req.session.user.id;
-}
+const PREFIX = "user_";
+export function resolveUserId(req) {
+  return PREFIX + req.session.user.id;
+}
+++ b/src/api/route.ts
@@
-import { getUserId } from '../utils/format';
+import { resolveUserId } from '../utils/format';
@@
-  const id = getUserId(req);
+  const id = resolveUserId(req);
```

## Expected
- **Verdict: No flags needed.**
- `feature-flags.json`:
  - `no_flaggable_surfaces` = `true`
  - `flags` = `[]`
- **No source edits.** Agent-runtime: no comment, no PR, no row (silent).
