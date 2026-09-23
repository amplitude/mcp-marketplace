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

The standards layer of the feature-flag pipeline. It defines **flag identity**
(keys, variants, defaults) and the **flag-worthiness bar**, and it is the
authority the code-generation stage (`wrap-code-in-experiment`) is bound by. It consumes discovery output
(`detected_integration`, `existing_flag_keys`, `candidate_surfaces`) and produces
flag definitions; it **does not edit source**.

## Core principles

1. **Evidence-first.** A flag definition is grounded in a real net-new surface
   from the diff (`candidate_surfaces`) and a real integration
   (`detected_integration`). Never invent a flag for code that does not exist in
   the diff.
2. **Conservative by default.** A flag is a durable artifact and a code change a
   human will review. When a surface is borderline, prefer **no flag** over a
   speculative one. Reviewer trust is the scarce resource.
3. **Wrap only net-new, default-OFF.** Everything this skill defines launches
   dark. It never changes the behavior users see today.
4. **Explain every flag.** Each definition carries a `rationale` a reviewer can
   act on without reading the skill.

## What is flag-worthy (the qualification bar)

These standards back the orchestrator's Phase 0 gate. **Flag-worthy = net-new,
user-facing behavior introduced by this diff** that a team would plausibly want
to dark-launch or roll out gradually:

- a new feature, screen, route, or rendered component
- a new user-visible interaction path or entry point
- a meaningful new branch of user-facing behavior (e.g. a redesigned flow behind
  the same entry point)

**Not flag-worthy** (reject — produces no flag for that change):
- refactors, renames, formatting, type-only changes
- bug fixes that restore intended behavior (no new behavior to gate)
- config, dependency bumps, build/CI changes
- tests, fixtures, generated code, dead code
- bot-authored / purely internal changes with no user-perceptible surface

A diff with no flag-worthy surface → `no_flaggable_surfaces: true` (no flag, no
comment, no PR, no row).

## Flag-key naming standards

- **Derive the key from the feature/surface**, not the implementation detail.
  Good: `checkout-redesign`, `new-search-ranking`. Bad: `tmp-flag`, `test1`,
  `jira-1234`, `wrap-component`.
- **Casing: `kebab-case`**, lowercase, words separated by hyphens — unless
  discovery shows the repo's existing keys use a different dominant convention
  (e.g. `snake_case`); in that case **match the local convention** (consistency
  beats the default).
- **No redundant prefixes** like `flag-` / `ff-` (the system already knows it is
  a flag). Use a short product/area prefix only if existing keys do.
- **Low cardinality, stable, descriptive.** One key per net-new surface; do not
  encode env, date, or PR number into the key.
- **Preserve existing keys verbatim.** If discovery's `existing_flag_keys`
  contains a key, never propose it again and never rename it — a rename detaches
  the flag from its live targeting/rollout config. If a candidate surface is
  already gated by an existing key, it is **not** net-new → do not redefine it.
- **Uniqueness is deployment-scoped, not org-wide.** Flag keys are unique within
  a **deployment** (one Amplitude project can have several — see
  `detected_integration.deployment`). Collision checks and phase-2 reconciliation
  are scoped to the detected deployment, not a flat org namespace. In v1 the only
  hard rule is "don't collide with `existing_flag_keys`"; richer reconciliation
  against the deployment's registered flags is phase 2.

## Variants & default discipline

- **Binary in v1: `["off", "on"]`**, with **`off` as the default/control**.
- The `off` path must be behaviorally identical to pre-PR (true dark launch) —
  this is enforced when `wrap-code-in-experiment` generates the guard, but the
  definition states it as the contract.
- **No targeting, no rollout %, no multi-variant in v1.** Audience targeting,
  percentage rollouts, and multivariate experiments are **phase 2**.

## Wrapped vs advisory verdict (definition-side inputs)

The orchestrator routes the final verdict; this skill supplies the
definition-side inputs:

- **Wrapped** — there is ≥1 flag-worthy surface **and** discovery reported
  `confidence: high` with a usable integration. Emit full flag definitions; the
  wrap stage will gate the code.
- **Advisory-only** — there is ≥1 flag-worthy surface **but** discovery reported
  `confidence: low` / `sdk: none`. Emit the same flag definitions (key +
  rationale + variant model) but mark the run `advisory_only: true` and leave
  `wrap_locations` empty — the comment suggests flags, no code is wrapped.
- **No flags needed** — no flag-worthy surface → `no_flaggable_surfaces: true`.

The langley server-side ship gate, not the `advisory_only` boolean, makes the
final ship decision — this skill only sets the signal.

## Rationale authoring

Every flag carries a `rationale`. Frame it as **a code change a reviewer is
evaluating**:

- say what net-new behavior the flag gates and why it benefits from a dark
  launch / gradual rollout
- reference the surface concretely (component/route/flow), not internals
- keep it to 1–3 sentences a reviewer can act on

> Good: "Gates the redesigned checkout page (`Checkout.tsx`) so the new layout
> can be dark-launched and rolled out gradually instead of shipping to 100% on
> merge."
>
> Avoid: "Flag for checkout." — too vague; name the behavior and the rollout reason.

## Identity & targeting (light — mostly phase 2)

v1 launches default-OFF with **no targeting**, so identity guidance is
intentionally minimal:
- The SDK already needs a user/identity to evaluate (client: the initialized
  user; server: the `user` passed to `fetch`). Reuse whatever the repo's existing
  integration already supplies — do **not** introduce new identity wiring or
  collect new user properties to drive targeting.
- Audience rules, targeting properties, and reconciliation against the
  deployment's registered flags are **phase 2**. If a surface seems to *need*
  targeting to be safe, that is a signal to prefer advisory-only and say so.

## Output

Per qualifying surface, contribute a flag definition toward
`.amplitude/feature-flags.json` (schema:
`../generate-flags-manifest/references/feature-flags.schema.json`):

```yaml
flags:
  - key: "checkout-redesign"
    surface: "Redesigned checkout page"
    rationale: "Gates the new checkout layout so it can be dark-launched and rolled out gradually."
    variant_values: ["off", "on"]
    default: "off"
    # wrap_locations[] is filled by wrap-code-in-experiment (empty in advisory_only mode)
```

Plus the top-level signals you determine: `advisory_only` and
`no_flaggable_surfaces`.
