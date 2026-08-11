# Amplitude Wave

Use Amplitude Wave from Cursor, Claude Code, Codex, and other AI coding tools to run the
self-improving product loop:

**queue → codebase validation → implementation → PR verification → experiment/direct ship
→ outcome measurement → workflow refinement**

The plugin composes the existing Amplitude MCP Wave, analytics, flag, experiment, and
metric tools. It does not duplicate or proxy MCP APIs.

## Installation

### Claude Code

```text
claude plugin install wave
```

Or run `/plugin install wave`, then `/reload-plugins`.

### Cursor

Install **Amplitude Wave** from the Cursor Marketplace or add the Amplitude marketplace
in Cursor Settings → Plugins.

### Codex

Add `amplitude/mcp-marketplace`, run `/plugins`, select **Amplitude Wave**, and install.

Authenticate the bundled Amplitude MCP connection when prompted.

## Safety

- Pull requests are never merged automatically.
- Experiments and flags are never launched to real traffic without explicit human
  approval in the current run.
- Evaluation improves real opportunities and dismisses only demonstrably obsolete or
  invalid problem statements, with human confirmation.
- Writes are reconcile-first and idempotent.
- Unattended runs are capped and park human decisions instead of blocking or guessing.

## Skills

| Skill | Job | Invocation |
|---|---|---|
| `wave-queue` | Read-only ranked queue and next-action routing | Natural language |
| `wave-evaluate` | Confirm the problem in current code and improve its plan | Natural language; confirms writes |
| `wave-dispatch-handoff` | Claim and launch isolated coding work | Explicit |
| `wave-babysit` | Drive linked PRs through CI, review, and verification | Explicit |
| `wave-close-out` | Measure shipped outcomes and record learning | Explicit or scheduled |
| `wave-intake` | Configure product areas and submit deduplicated ideas | Explicit |
| `wave-experiment` | Prepare, link, and monitor opportunity experiments | Explicit |
| `wave-autopilot` | Orchestrate the complete bounded loop | Explicit or scheduled |
| `wave-refine` | Audit pipeline quality and propose improvements | Natural language/read-only |

“Optional experiment” means optional for a particular opportunity, not omitted from the
plugin. `wave-autopilot` includes the experiment decision and preparation path.

## Prerequisites

- Access to Amplitude Wave and an Amplitude project.
- Local or cloud access to the target source repository.
- GitHub/SCM credentials when the workflow should create or update pull requests.
- Amplitude Experiment access when using `wave-experiment`.

All IDs and project-specific taxonomy are discovered from the authenticated customer's
Amplitude environment. The plugin contains no customer-specific IDs, repositories, event
names, or personal skill dependencies.

## Configuration

Copy `config/wave-config.example.json` to either:

- `wave-config.json` at the target code workspace root, or
- `.amplitude/wave-config.json`.

Set the Amplitude project ID, repositories, base branches, and available setup/test/lint/
build commands. Merge and live experiment launch are hard-coded human gates rather than
configuration switches.

If config is absent, attended skills ask for required context. Unattended autopilot runs
only read-only reconciliation, parks the setup gap, and stops.

## Example prompts

```text
Show me the top Wave opportunities for onboarding and what should happen next.
```

```text
Evaluate Wave opportunity 1a2b3c4d against this codebase and improve its plan.
```

```text
Dispatch the approved Wave opportunity to a coding agent and stop at a PR-ready gate.
```

```text
Prepare an Amplitude experiment for this Wave opportunity, but do not launch traffic.
```

```text
Run Wave autopilot unattended for product area <id>, maximum two opportunities.
```

```text
Measure Wave opportunities that shipped at least 14 days ago.
```

## Scheduled autopilot

Use a Cursor/Codex automation or Claude scheduled task to start a fresh agent session:

```text
Run wave-autopilot in unattended mode. Reconcile existing work first. Scope to product
area <id>, process at most 2 opportunities with at most 2 concurrent agents, never merge,
never launch experiment traffic, and return the wave_run summary.
```

The automation starts the session; MCP itself does not launch sessions.

## Local development

From the marketplace repository:

```bash
claude --plugin-dir ./plugins/wave
python3 plugins/wave/scripts/validate_plugin.py
```

The validator checks manifests, skill metadata, line limits, references, current tool
names, hard gates, generic configuration, and scenario coverage without dependencies.
