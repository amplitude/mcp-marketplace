---
name: discover-experiment-integration
description: >
  Discovers how (and whether) a codebase integrates Amplitude Experiment — the
  SDK package, whether it is the client or server variant, where it is
  initialized, the existing flag-guard patterns engineers use, and the flag keys
  already referenced in code. Use this skill before wrapping any new code behind
  a flag, when someone asks "how do we use feature flags here?", "is Amplitude
  Experiment set up in this repo?", "what's the flag pattern in this codebase?",
  or any time the wrap-code-in-experiment skill is about to run and you need to
  know the correct integration to reuse. Outputs the detected SDK variant and a
  confidence signal, the existing guard patterns and import sites, an inventory
  of existing flag keys (so new flags don't collide or rename), and the net-new
  user-facing surfaces in the diff. Always use this skill before generating any
  feature-flag wrapping code.
---

# discover-experiment-integration

> **STATUS: scaffold (BA-329).** Frontmatter + skeleton only. Full implementation
> is **BA-331**. This is the **discovery** stage of the `add-feature-flags`
> (BA-330) pipeline; it is the feature-flag analog of `discover-analytics-patterns`.

Discover whether and how the repo integrates Amplitude Experiment, and identify
the net-new user-facing surfaces in the diff. Feeds `define-feature-flags`
(BA-332) and `wrap-code-in-experiment` (BA-333).

## To implement in BA-331

- **Detect the SDK and its variant**: client (`@amplitude/experiment-js-client`,
  `Experiment.initialize`) vs server (`@amplitude/experiment-node-server`,
  `Experiment.initializeRemote` / `initializeLocal`). Capture import path,
  initialization site, and deployment-key/config wiring →
  `detected_integration` in `feature-flags.json`.
- **Inventory existing flag-guard patterns** (e.g. `experiment.variant('key')`,
  `.value === 'on'`, framework wrappers/hooks) so generated code matches local
  convention. Port the "group by pattern + infer conventions" discipline from
  `discover-analytics-patterns`.
- **Inventory existing flag keys** referenced in code so the definition stage
  never collides or renames (port the existing-name-inventory contract).
- **Detect the deployment** (not just app_id). A deployment is the container
  (with its own key) that serves flags/experiments; **one app/project can have
  multiple deployments**, so it's a dimension below app_id. The init key is
  usually an env var or constant, not a literal — record `key_source` (where it
  comes from), never the secret. → `detected_integration.deployment`.
- **High-confidence detection heuristic** (DESIGN_v2 §4.7.4): best-effort;
  ambiguous / test-only / vendored SDK import → `confidence: low` → advisory-only.
  **Multiple wired deployments, an unresolvable key, or per-environment keys
  also lower confidence** (set `deployment.multiple_detected`) — we handle this
  here in discovery/confidence rather than trying to fully resolve which
  deployment a flag lands in.
- **Identify net-new user-facing surfaces** from the diff (merge-base diff
  semantics consistent with the existing flow).

## Output

Contributes the `detected_integration` block (and the candidate-surface list the
orchestrator uses for Phase 0) toward `feature-flags.json`. Schema:
`../generate-flags-manifest/references/feature-flags.schema.json`.
