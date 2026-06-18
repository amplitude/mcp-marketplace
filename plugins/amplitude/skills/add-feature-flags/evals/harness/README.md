# add-feature-flags eval harness

Runs the `/add-feature-flags` workflow against real PRs, **one clean context per
PR**. Each PR is analyzed in its own headless `claude -p` process — a separate OS
process with a fresh context window — so no test case contaminates another.

The clean run reads the actual skill files (`add-feature-flags`,
`discover-experiment-integration`, `define-feature-flags`, `wrap-code-in-experiment`,
`generate-flags-manifest` + the schema) as its operating instructions, so the
harness tests the **real** skills, not a paraphrase.

## Usage

```bash
./run-pr.sh 130906 130887 130736
```

Each PR produces `results/pr-<N>.md` (full reasoning + a `===RESULT===` JSON
block) and a row in `results/summary.tsv` (pr → verdict).

## Behavior

- **Read-only / dry-run.** The harness passes `--disallowedTools Edit Write
  NotebookEdit`, and the prompt forbids file mutation. Discovery greps the repo;
  the diff is fetched via `gh pr diff` (no checkout, no edits).
- **Clean context per case.** One `claude -p` per PR — nothing carries over.

## Configuration (env)

| Var | Default | Meaning |
|---|---|---|
| `FLAG_EVAL_REPO` | `amplitude/javascript` | `gh` repo slug for `gh pr diff/view` |
| `FLAG_EVAL_REPO_DIR` | `$HOME/code/javascript` | local checkout used as cwd for discovery |
| `FLAG_EVAL_MODEL` | (CLI default) | model override for the clean runs |
| `FLAG_EVAL_PERMISSION_MODE` | `bypassPermissions` | non-interactive permission mode for headless |
| `FLAG_EVAL_OUT` | `./results` | output dir |

## Requirements

`claude` and `gh` on PATH; `gh` authenticated for the target repo. `results/` is
git-ignored.

## Files

- `run-pr.sh` — the runner (one clean `claude -p` per PR)
- `pipeline-prompt.md` — the prompt template fed to each clean run (`__SKILLS_DIR__`/`__REPO__`/`__PR__` placeholders)
