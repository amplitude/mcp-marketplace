---
name: wrap-code-in-experiment
description: >
  Wraps net-new user-facing code behind the repo's detected Amplitude Experiment
  flag guard, launched default-OFF, matching the codebase's existing SDK and
  import conventions. Use as the code-generation step of the feature-flag
  workflow, after discover-experiment-integration and define-feature-flags.
  Trigger whenever you have a flag definition and a net-new surface and need to
  insert the actual guard, asks "wrap this behind the flag", "add the experiment
  check around this code", "gate this code default-off", or any request to turn a
  flag decision into concrete source edits. Generates the client
  (experiment.variant('key').value === 'on') or server (experiment.fetch(user))
  guard, reuses the repo's existing experiment client (extend before add), stays
  in its lane (wrap only — no refactors), and keeps the control path behaviorally
  identical to pre-PR so the launch is truly dark.
---

# wrap-code-in-experiment

> **STATUS: scaffold (BA-329).** Frontmatter + skeleton only. Full implementation
> is **BA-333**, including a bundled `references/` doc of canonical Experiment
> wrap patterns. This is the **code_generation** stage of the `add-feature-flags`
> (BA-330) pipeline; it is the feature-flag analog of `instrument-events`.

Writes the actual Experiment SDK guard around qualifying net-new code, gated
default-OFF, matching the SDK variant and conventions found by
`discover-experiment-integration` (BA-331).

## To implement in BA-333

- **Generate the flag guard** around qualifying net-new code, gated default-OFF.
  - Client: `experiment.variant('flag-key').value === 'on'`
  - Server: `(await experiment.fetch(user))['flag-key']` / local-evaluation variants
  Match the **detected variant** and the repo's existing guard/import conventions.
- **Extend before add**: reuse the repo's existing experiment client/init rather
  than introducing a new one; add init wiring only if none exists and it's safe.
- **Stay in lane**: wrap only — do not refactor, rename, or change behavior of
  surrounding code; the control (`off`) path must preserve pre-PR behavior.
- Respect the **diff-as-data** boundary; produce real source edits whose diff the
  langley ship gate can verify (a non-empty wrap diff is what ships, §4.7).
- Record `wrap_locations[]` for the manifest — explicitly **model-authored, not
  authoritative** (§4.7 L5).
- **Bundled resource (BA-333)**: `references/` doc of canonical Experiment wrap
  patterns (client + server; JS/TS first, note other-language SDKs), grounded in
  https://amplitude.com/docs/sdks/experiment-sdks/experiment-javascript, so
  generation isn't guessing the API.

## Output

Source edits + `wrap_locations[]` entries toward `feature-flags.json`. Schema:
`../generate-flags-manifest/references/feature-flags.schema.json`.
