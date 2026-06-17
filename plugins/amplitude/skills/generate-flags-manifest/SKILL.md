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

> **STATUS: scaffold (BA-329).** Frontmatter + skeleton, plus the **locked output
> schema** at `references/feature-flags.schema.json` (the single source of truth
> for the contract). Full implementation is **BA-334**. This is the
> **recording_work** stage of the `add-feature-flags` (BA-330) pipeline; it is
> the feature-flag analog of `generate-events-manifest`.

Produces `.amplitude/feature-flags.json` — the run's structured record of what
was wrapped (or suggested, or skipped).

## Output contract — the single source of truth

The canonical, machine-checkable schema lives at
[`references/feature-flags.schema.json`](references/feature-flags.schema.json).
Every other skill in this set references THIS file rather than restating the
shape. Summary:

```json
{
  "detected_integration": {
    "sdk": "client | server | none",
    "package": "@amplitude/experiment-js-client",
    "import_path": "@/lib/experiment",
    "init_pattern": "Experiment.initialize('DEPLOYMENT_KEY')",
    "guard_pattern": "experiment.variant('key').value === 'on'",
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
> ground truth (DESIGN_v2 §4.7 L5).

## To implement in BA-334

- Emit `.amplitude/feature-flags.json` per the locked schema.
- **Wrap-location precision**: every location with file + current line, adjusted
  for edits made earlier in the same file (port the call-site precision from
  `generate-events-manifest`).
- **Prior-state handling**: read any existing manifest; keep unchanged flags, add
  new, update changed, remove deleted.
- Optional `manifest.json` metadata sibling (`generated_at`, `commit_hash`,
  `base_branch`, agent-runtime fields) mirroring `generate-events-manifest`.

## Manifest metadata sibling *(optional)*

Mirror `generate-events-manifest`'s `.amplitude/manifest.json` minimal schema
(`generated_at`, `commit_hash`, `base_branch`) plus agent-runtime fields
(`mode`, `agent_version`, `amplitude_project`) when running under the agent.
