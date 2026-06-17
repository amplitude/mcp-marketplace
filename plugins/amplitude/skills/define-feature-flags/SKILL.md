---
name: define-feature-flags
description: >
  Source of truth for Amplitude Experiment feature-flag definition standards —
  flag-key naming conventions, default-OFF dark-launch discipline, what code is
  flag-worthy versus not, and the wrapped-vs-advisory verdict criteria. Use when
  an agent needs to name a flag, decide whether a change should be gated, or
  decide whether to wrap code or only suggest a flag. Covers flag-key naming and
  casing, verbatim preservation of existing keys, binary off/on variants with
  off as the default control, qualification rules (net-new user-facing behavior
  only), rationale authoring, and the boundary of what is deferred to phase 2
  (targeting and reconciliation against existing org flags).
---

# define-feature-flags

> **STATUS: scaffold (BA-329).** Frontmatter + skeleton only. Full implementation
> is **BA-332**. This is the **new_flag_definition** stage of the
> `add-feature-flags` (BA-330) pipeline; it is the feature-flag analog of the
> `taxonomy` reference skill (the standards layer the code-gen stage is bound by).

The standards reference the code-generation stage (`wrap-code-in-experiment`,
BA-333) is bound by. Defines flag identity and the qualification bar; does not
itself edit code.

## To implement in BA-332

- **Flag-key naming standards**: derive keys from the feature/surface; define
  casing convention (e.g. kebab/snake), prefix/namespace guidance, and a
  **verbatim-preserve rule** for any existing key surfaced by discovery (never
  rename). Port the cardinality/naming discipline from `taxonomy`.
- **Default-OFF dark-launch discipline**: binary `off`/`on` variants with `off`
  the default/control; no targeting rules in v1. Targeting + reconciliation
  against existing org flags is **phase 2** (DESIGN_v2 §4.8 / §6). Note flags
  live within a **deployment** (a project can have several) — so phase-2
  key reconciliation is scoped to the deployment discovery detected, not the
  app as a whole.
- **Qualification criteria**: what is flag-worthy (net-new user-facing behavior)
  vs not (refactor / bugfix / config / bot) — the standards behind the
  orchestrator's Phase 0 gate.
- **Wrapped vs advisory verdict criteria** — the definition-side inputs to §4.4
  routing.
- **Rationale authoring**: per-flag `rationale` explaining what net-new code it
  wraps and why — framed as a **code change to review**, not a telemetry add
  (§4.4 / B1).
- Minimal experiment **identity/targeting-property** guidance lives here (the
  light `user-property-best-practices` analog), but is mostly deferred to phase 2.

## Output

Contributes well-formed flag definitions (`key`, `surface`, `rationale`,
`variant_values`, `default`) toward `feature-flags.json`. Schema:
`../generate-flags-manifest/references/feature-flags.schema.json`.
