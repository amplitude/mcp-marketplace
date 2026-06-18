---
name: generate-flags-manifest
description: >
  Produces a structured feature-flag manifest (.amplitude/feature-flags.json)
  recording the flags a PR introduces — flag keys, the net-new user-facing
  surfaces they gate, rationale, default-OFF variant model, and the wrap
  locations where the Experiment guard was inserted. Use after wrapping code
  behind a flag, or independently to record an advisory or no-flaggable verdict.
  Trigger on "generate feature-flags manifest", "what flags does this PR add",
  "create feature-flags.json", or any request to extract a structured inventory
  of the flags introduced by a change. The manifest follows the locked schema in
  this skill's references/ directory and is the run's record of work — its
  advisory_only and no_flaggable_surfaces fields, plus the flags[] entries, drive
  the downstream verdict and surfaces.
---

# generate-flags-manifest

The recording stage of the feature-flag pipeline. It serializes the run's
outcome into `.amplitude/feature-flags.json`: what was wrapped, what was only
suggested (advisory), or that nothing was flag-worthy.

**The manifest records the run; it does not decide it.** Verdicts come from the
upstream stages and the langley ship gate. The manifest's job is to be a
schema-valid, faithful record.

## Output contract — the single source of truth

The canonical, machine-checkable schema lives at
[`references/feature-flags.schema.json`](references/feature-flags.schema.json).
Every other skill in this set references THIS file. Summary:

```json
{
  "detected_integration": {
    "sdk": "client | server | none",
    "package": "@amplitude/experiment-js-client",
    "import_path": "@/lib/experiment",
    "init_pattern": "Experiment.initialize('DEPLOYMENT_KEY')",
    "guard_pattern": "experiment.variant('key').value === 'on'",
    "deployment": { "key_source": "env:NEXT_PUBLIC_EXPERIMENT_KEY", "multiple_detected": false },
    "confidence": "high | low"
  },
  "advisory_only": false,
  "no_flaggable_surfaces": false,
  "flags": [
    {
      "key": "new-checkout-redesign",
      "surface": "Redesigned checkout page",
      "files": ["src/checkout/Checkout.tsx"],
      "rationale": "Gates the net-new redesigned checkout render path so it can be dark-launched and rolled out gradually.",
      "variant_values": ["off", "on"],
      "default": "off",
      "wrap_locations": [
        { "file": "src/checkout/Checkout.tsx", "line": 42, "what_it_wraps": "the new redesigned checkout render branch" }
      ]
    }
  ]
}
```

> `wrap_locations[]` is **model-authored, NOT authoritative** — the PR diff is
> ground truth (DESIGN_v2 §4.7 L5). The manifest describes intent; the diff is
> what the langley ship gate verifies.

## Step 1: Assemble inputs

Gather the upstream stage outputs:
- `detected_integration` (from `discover-experiment-integration`), **including
  its optional `deployment` member when present**.
- `flags[]` definitions (from `define-feature-flags`).
- `wrap_locations[]` (from `wrap-code-in-experiment`; empty in advisory mode).

## Step 2: Set the top-level signals

- `no_flaggable_surfaces: true` → emit `flags: []` and stop (no wraps, advisory
  irrelevant). This is the "no flags needed" record.
- `advisory_only: true` → emit `flags[]` with definitions but **empty
  `wrap_locations`** (nothing was wrapped).
- otherwise (Wrapped) → emit `flags[]` with populated `wrap_locations`.

These fields are signals, not the ship decision — the langley ship gate decides
shipping from the real diff (§4.7).

## Step 3: Wrap-location precision

Hold every `wrap_locations[]` entry to precise call-site discipline. Each entry
MUST carry:
- `file` — repo-relative path where the guard sits **after** edits.
- `line` — 1-indexed line of the guard after edits; **adjust for any insertions
  made earlier in the same file** so the line is current, not pre-edit.
- `what_it_wraps` — one sentence on the net-new behavior gated there.

Use an array even for a single location. If the same flag gates several sites,
record every one.

## Step 4: Write the manifest

Write `.amplitude/feature-flags.json` exactly per the schema. **Round-trip the
`detected_integration.deployment` block faithfully when present** —
`key_source` and `multiple_detected` are carried through like any other field
(never the raw deployment key). Validate the output against
`references/feature-flags.schema.json` before finishing.

## Step 5: Handling prior state

If `.amplitude/feature-flags.json` already exists (a re-run):
1. Read the existing manifest.
2. **Keep** flags still backed by a current surface, unchanged.
3. **Add** new flags.
4. **Update** flags whose wrap locations, rationale, or definition changed
   (re-adjust line numbers).
5. **Remove** flags whose surface/wrap no longer exists in the code.
6. Carry forward `detected_integration` (including `deployment`) — preserve or
   update on re-run; **do not drop** the deployment member.
7. Note changes for transparency.

## Step 6: Manifest metadata sibling *(optional)*

Optionally write a `.amplitude/manifest.json` sibling with the minimal schema —
`generated_at` (ISO 8601), `commit_hash` (from `git rev-parse HEAD`),
`base_branch` — plus agent-runtime fields (`mode`, `agent_version`,
`amplitude_project`) when running under the coding agent. Omit the extra fields
in standalone mode.
