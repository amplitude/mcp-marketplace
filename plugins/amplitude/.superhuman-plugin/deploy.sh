#!/usr/bin/env bash
# Create or update one Amplitude agent in this Superhuman plugin.
# Usage:
#   ./deploy.sh validate <agent>
#   ./deploy.sh build <agent>
#   ./deploy.sh create <agent>
#   ./deploy.sh update <agent> <notes>

set -euo pipefail

ROOT=$(cd "$(dirname "$0")" && pwd)
COMMAND=${1:-}
AGENT=${2:-}
NOTES=${3:-}

usage() {
  cat <<EOF
Usage:
  ./deploy.sh validate <agent>
  ./deploy.sh build <agent>
  ./deploy.sh create <agent>
  ./deploy.sh update <agent> <notes>

<agent> is a directory under .superhuman-plugin, such as ambient-assistant.
EOF
}

die() {
  echo "$1" >&2
  exit 1
}

require_agent() {
  [[ -n "$AGENT" ]] || die "Name the agent directory.$(echo; usage)"
  [[ "$AGENT" != */* && "$AGENT" != .* ]] || die "Agent must be a single directory name."
  AGENT_DIR="$ROOT/$AGENT"
  [[ -d "$AGENT_DIR" ]] || die "No agent directory at $AGENT_DIR."
  [[ -f "$AGENT_DIR/agent.ts" ]] || die "$AGENT is missing agent.ts."
  [[ -f "$AGENT_DIR/agent.json" ]] || die "$AGENT is missing agent.json."
}

read_listing() {
  NAME=$(node -e "const listing = require(process.argv[1]); if (!listing.name || !listing.description) process.exit(2); process.stdout.write(listing.name)" "$AGENT_DIR/agent.json") || die "$AGENT/agent.json needs name and description."
  DESCRIPTION=$(node -e "process.stdout.write(require(process.argv[1]).description)" "$AGENT_DIR/agent.json")
}

ensure_dependencies() {
  if [[ ! -d "$ROOT/node_modules/@codahq/packs-sdk" ]]; then
    (cd "$ROOT" && npm install)
  fi
}

ensure_token() {
  if [[ -f "$ROOT/.coda.json" ]]; then
    return
  fi
  echo "No Superhuman token at $ROOT/.coda.json."
  [[ -t 0 ]] || die "Run ./deploy.sh from a terminal so the token registration can open a browser."
  (cd "$ROOT" && npx packs register --open)
  [[ -f "$ROOT/.coda.json" ]] || die "Token registration did not write .coda.json."
}

run_packs() {
  (cd "$AGENT_DIR" && npx packs "$@")
}

validate_agent() {
  run_packs validate agent.ts
}

build_agent() {
  run_packs build agent.ts
}

case "$COMMAND" in
  validate)
    require_agent
    ensure_dependencies
    validate_agent
    ;;
  build)
    require_agent
    ensure_dependencies
    build_agent
    ;;
  create)
    require_agent
    [[ -z "$NOTES" ]] || die "create does not take notes. Use update to upload a later version."
    if [[ -f "$AGENT_DIR/.coda-pack.json" ]]; then
      die "$AGENT already has .coda-pack.json. Run ./deploy.sh update $AGENT \"notes\" instead of create."
    fi
    read_listing
    ensure_dependencies
    ensure_token
    validate_agent
    build_agent
    run_packs create agent.ts --name "$NAME" --description "$DESCRIPTION"
    run_packs upload agent.ts --notes "Initial version."
    echo "Created $AGENT. Commit $AGENT/.coda-pack.json."
    echo "Install the agent in Superhuman Go and connect the Amplitude connector."
    ;;
  update)
    require_agent
    [[ -n "$NOTES" ]] || die "update requires notes. Example: ./deploy.sh update $AGENT \"Describe the change.\""
    [[ -f "$AGENT_DIR/.coda-pack.json" ]] || die "$AGENT has no .coda-pack.json. Run ./deploy.sh create $AGENT first."
    ensure_dependencies
    ensure_token
    validate_agent
    build_agent
    run_packs upload agent.ts --notes "$NOTES"
    echo "Uploaded a new version of $AGENT."
    echo "Reinstall the agent in Superhuman Go if this change alters its trigger or connector grant."
    ;;
  *)
    usage
    exit 1
    ;;
esac
