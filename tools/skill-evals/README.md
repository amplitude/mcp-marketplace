# skill-evals — a runner for marketplace skill evals

`run_evals.py` discovers the self-contained skill-eval cases authored as
markdown specs, runs the skill against each case headlessly through the
`claude` CLI, and grades the result. It turns the previously manual /
LLM-judge-only evals into a repeatable, CI-able pass/fail signal.

It is **data-driven by directory convention**: any skill that grows an
`evals/cases/*.md` tree is picked up automatically, with no per-skill code.

## Quick start

```bash
# List the discovered cases (no model calls)
uv run tools/skill-evals/run_evals.py --list

# Parse + materialize + print the prompt for each case (no model calls)
uv run tools/skill-evals/run_evals.py --dry-run

# Run every case (calls the claude CLI; needs auth)
uv run tools/skill-evals/run_evals.py

# Run one skill / one case, keep the working dir to inspect output
uv run tools/skill-evals/run_evals.py --skill add-feature-flags --case 01 --keep-workdir

# Mechanical checks only (skip the LLM judge); write a JSON report
uv run tools/skill-evals/run_evals.py --no-judge --out tools/skill-evals/.out/report.json

# Smooth over judge non-determinism: 3 runs, pass if >= 2/3 pass
uv run tools/skill-evals/run_evals.py --repeats 3 --pass-threshold 0.67
```

`uv` resolves the one dependency (`jsonschema`) from the script's PEP 723
header automatically. Without `uv`, run with any Python >= 3.11 that has
`jsonschema` installed: `python3 tools/skill-evals/run_evals.py --list`.

Requires the `claude` CLI on `PATH` and authenticated (or an
`ANTHROPIC_API_KEY`) for everything except `--list` / `--dry-run`.

## What a case looks like

Cases live at `plugins/<plugin>/skills/<skill>/evals/cases/NN-*.md` and are
self-contained markdown (see
`plugins/amplitude/skills/add-feature-flags/evals/`). The parser reads these
sections:

| Section | Use |
| --- | --- |
| `# Case NN — title → <Verdict>` | h1; verdict suffix is a fallback |
| `## Scenario` | passed to the run as context |
| `## Repo context` | the repo the diff applies to (stands in for a checked-out tree) |
| `## Input diff` (```diff fence) | the change under analysis — **ground truth**; touched paths bound the write check |
| `## Reviewer guidance` (``` fence) | optional; passed as the `<reviewer_guidance>` block |
| `## Expected` | the expected verdict (`**Verdict: …**`) + prose assertions the judge checks |

## How it runs one case

1. **Materialize** a temp working dir with `CASE_CONTEXT.md`, `pr.diff`, and
   (if present) `reviewer_guidance.txt`.
2. **Run the skill**: `claude -p` is pointed at the orchestrator `SKILL.md`
   and told to follow it against the diff, writing `.amplitude/feature-flags.json`
   (or the `no-flaggable-surfaces.md` marker) into the working dir. The diff and
   guidance are passed strictly as data.
3. **Grade** the output.

The runner points the CLI at the orchestrator `SKILL.md` by path rather than
relying on slash-command registration, so it works regardless of how the plugin
is installed.

## Grading

**Mechanical checks** (in-process, deterministic):

- `output_present` — a manifest or the marker was written.
- `verdict_match` — the verdict derived from the manifest/marker equals the
  case's expected verdict. (Derivation: `no_flaggable_surfaces → No flags
  needed`, else `advisory_only → Advisory-only`, else `Wrapped`.)
- `schema_valid` — the manifest validates against the JSON Schema named in the
  eval config (draft-07).
- `default_off` — every flag launches default-OFF.
- `write_boundary` — nothing was written outside the diff's touched paths and
  `.amplitude/`, and no dotfile-rooted path was written (catches the case-04
  `.env` injection).

**LLM judge** (a second `claude` call, skip with `--no-judge`): grades the
case-specific prose assertions in the `## Expected` section that aren't
mechanically checkable — `detected_integration` fields, `confidence` /
`confidence_reason`, `deployment.multiple_detected`, empty vs. surface-pointing
`wrap_locations`, injection containment, no-source-edits in advisory/no-flags
cases. It returns strict JSON.

A case **passes** when every mechanical check passes **and** the judge passes.
The process exits `0` if all selected cases pass, `1` if any fail, `2` on a
harness error (no cases found, bad filter). With `--repeats N`, a case passes
when its pass-rate across runs meets `--pass-threshold`.

## Per-skill config — `evals/eval.config.json`

Optional, sits next to a skill's `cases/` dir. Every field defaults to the
add-feature-flags contract, so a skill can ship cases with no config.

```json
{
  "orchestrator": "../SKILL.md",
  "trigger": "manual",
  "output": { "manifest": ".amplitude/feature-flags.json", "marker": ".amplitude/no-flaggable-surfaces.md" },
  "schema": "plugins/amplitude/skills/generate-flags-manifest/references/feature-flags.schema.json",
  "verdict_rules": "feature-flags"
}
```

`orchestrator` is relative to the `evals/` dir; `schema` is repo-root-relative.
`verdict_rules` selects the verdict-derivation logic — `feature-flags` is the
only built-in ruleset today; an unrecognized value defers the verdict entirely
to the judge.

## Adding a new skill's evals

1. Author `plugins/<plugin>/skills/<skill>/evals/cases/NN-*.md` following the
   section layout above.
2. If the skill's output contract differs from feature-flags, add an
   `evals/eval.config.json` (and, for a new manifest shape, a `verdict_rules`
   entry in `run_evals.py`).
3. `uv run tools/skill-evals/run_evals.py --skill <skill> --list` to confirm
   discovery, then drop `--list` to run.
