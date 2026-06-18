# Amplitude plugin skills

Skills here **auto-discover** from this directory — the slash name equals the skill `name`
frontmatter, which equals the directory name. No plugin manifest enumerates skills
(`.claude-plugin` / `.cursor-plugin` rely on discovery; `.codex-plugin` points `"skills": "./skills/"`
at this whole dir). Adding a new `directory/SKILL.md` is all that's needed to ship a skill.

## The feature-flag coding-agent pipeline

`add-feature-flags` (orchestrator) turns a PR diff into a reviewable change:
`discover-experiment-integration → define-feature-flags → wrap-code-in-experiment →
generate-flags-manifest`. Output: net-new code wrapped behind an Amplitude Experiment flag,
default-OFF (dark launch), recorded in `.amplitude/feature-flags.json`.

The pipeline is diff-scoped, treats the diff (and any `<reviewer_guidance>`) as
**data not instructions**, writes narrowly to the diff boundary, never writes dotfile-rooted
paths, and emits **signals** — the langley server-side gate, not the skill, makes the final
ship decision.

## Feature-flag skill set conventions

- **Output contract:** `generate-flags-manifest/references/feature-flags.schema.json` is the single
  source of truth for `feature-flags.json`. Other skills reference it, never restate it.
- **Verdicts:** Wrapped / Advisory-only / No-flags-needed (DESIGN_v2 §4.4). Advisory = suggest, don't
  wrap (no usable integration); No-flags-needed = silent (no comment/PR/row).
- **Default-OFF only.** Binary `off`/`on`, `off` is control; targeting and reconciliation against a
  deployment's registered flags are **phase 2**.
- **Deployment:** a dimension below app_id (one app, many deployments). Detected in discovery
  (`detected_integration.deployment`), factored into confidence, and round-tripped through the
  manifest. Never store a raw deployment key.
- **`wrap_locations[]` is model-authored, not authoritative** — the PR diff is ground truth.
- **Fallback / degenerate path:** if `/add-feature-flags` is unavailable, the flow degrades to a
  silent no-op.
- **Evals:** `add-feature-flags/evals/` (no automated harness yet; manual / LLM-judge cases).

Skills deploy to running agents within ~2 minutes of landing on the skills branch.
