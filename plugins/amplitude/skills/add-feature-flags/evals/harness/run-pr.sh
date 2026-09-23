#!/usr/bin/env bash
#
# run-pr.sh — run the /add-feature-flags workflow against one or more PRs, each
# in its OWN clean `claude -p` context (one OS process per PR = no cross-case
# contamination). Read-only / dry-run: the harness disallows Edit/Write and the
# prompt forbids file mutation.
#
# Usage:
#   ./run-pr.sh <pr-number> [<pr-number> ...]
#
# Env overrides:
#   FLAG_EVAL_REPO            default amplitude/javascript   (gh repo slug)
#   FLAG_EVAL_REPO_DIR        default $HOME/code/javascript  (local checkout, cwd for discovery)
#   FLAG_EVAL_MODEL           optional model (else inherits the CLI default)
#   FLAG_EVAL_PERMISSION_MODE default bypassPermissions      (non-interactive headless)
#   FLAG_EVAL_OUT             default <harness>/results       (per-PR output + summary.tsv)
#
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# plugins/amplitude/skills — derived so the harness is path-portable
SKILLS_DIR=$(cd "$SCRIPT_DIR/../../.." && pwd)
PROMPT_TEMPLATE="$SCRIPT_DIR/pipeline-prompt.md"

REPO="${FLAG_EVAL_REPO:-amplitude/javascript}"
JS_REPO_DIR="${FLAG_EVAL_REPO_DIR:-$HOME/code/javascript}"
MODEL="${FLAG_EVAL_MODEL:-}"
PERMISSION_MODE="${FLAG_EVAL_PERMISSION_MODE:-bypassPermissions}"
OUT_DIR="${FLAG_EVAL_OUT:-$SCRIPT_DIR/results}"

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <pr-number> [<pr-number> ...]" >&2
  exit 2
fi
if [ ! -d "$JS_REPO_DIR" ]; then
  echo "error: repo checkout not found at $JS_REPO_DIR (set FLAG_EVAL_REPO_DIR)" >&2
  exit 1
fi
command -v claude >/dev/null || { echo "error: claude CLI not on PATH" >&2; exit 1; }
command -v gh >/dev/null || { echo "error: gh CLI not on PATH" >&2; exit 1; }

mkdir -p "$OUT_DIR"
SUMMARY="$OUT_DIR/summary.tsv"
printf 'pr\tverdict\n' > "$SUMMARY"

for PR in "$@"; do
  echo "=== PR #$PR — clean context ==="
  OUT="$OUT_DIR/pr-$PR.md"

  prompt=$(sed \
    -e "s|__SKILLS_DIR__|$SKILLS_DIR|g" \
    -e "s|__REPO__|$REPO|g" \
    -e "s|__PR__|$PR|g" \
    "$PROMPT_TEMPLATE")

  # Each invocation is a fresh process => clean context. cwd = repo checkout so
  # discovery can grep the working tree; --add-dir exposes the skill files.
  (
    cd "$JS_REPO_DIR"
    claude -p "$prompt" \
      ${MODEL:+--model "$MODEL"} \
      --permission-mode "$PERMISSION_MODE" \
      --add-dir "$SKILLS_DIR" \
      --allowedTools Bash Read Grep Glob \
      --disallowedTools Edit Write NotebookEdit
  ) > "$OUT" 2>&1 || echo "  (claude exited non-zero — see $OUT)"

  verdict=$(awk '/===RESULT===/{f=1} f' "$OUT" | grep -m1 '"verdict"' \
            | sed -E 's/.*"verdict"[: ]+"([^"]*)".*/\1/' || true)
  echo "  verdict: ${verdict:-<unparsed — see $OUT>}"
  printf '%s\t%s\n' "$PR" "${verdict:-UNPARSED}" >> "$SUMMARY"
done

echo
echo "Per-PR output: $OUT_DIR/pr-<N>.md"
echo "Summary:       $SUMMARY"
