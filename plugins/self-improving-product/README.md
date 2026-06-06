# Self-Improving Product (experimental)

Closes the Amplitude **Opportunity Manager** loop. Pull the latest opportunities, validate
and sharpen each plan against fresh data, implement the change in your repo, and drive the
PR to a ship-ready "for review" state — then measure the outcome after it ships and feed
the learnings back so the next cycle is smarter.

This plugin is **self-contained** — it doesn't depend on any other plugin in this
marketplace. It ships its own configuration for the Amplitude MCP server.

> ⚠️ **Experimental.** It opens PRs and prepares experiments autonomously. **Merging** and
> **launching experiments to real traffic** are always left to a human.

## What it does

`self-improving-product` runs the loop for each opportunity:

1. **Pull & rank** the `NEW`/`PLANNED` backlog by RICE score.
2. **Conflict-check & claim** — opportunities are shared; it defers to active work and
   takes over only when work is demonstrably stale.
3. **Validate & sharpen** the plan against fresh analytics; dismiss it if the data no
   longer supports it.
4. **Pick the metric, metric-first** — reuse an existing metric/event; recommend new
   instrumentation only when measurement is otherwise impossible (never auto-added).
5. **Implement** the change, deciding experiment-vs-ship and flag-gating when needed.
6. **Drive to ready-for-review** — tests/lint/build, acceptance criteria, a verification
   artifact, the PR, and `FOR_REVIEW`.
7. **Stop at the human gates** — merge and experiment launch.

`measure-outcome` runs days later: it reads the target metric or experiment, sets the
opportunity to `MEASURED`, attaches a before/after artifact, and records learnings.

## Skills

| Skill | Purpose |
|---|---|
| `self-improving-product` | The end-to-end shipping loop (pull → claim → validate → implement → review-ready). |
| `measure-outcome` | The async post-ship readout that closes opportunities to `MEASURED`. |

## Invocation

The same skill runs two ways:

- **Manually** in your ADE — e.g. "work the opportunity backlog", or pointed at one
  opportunity.
- **On a schedule** via Cursor/Codex automations or Claude scheduled tasks. In unattended
  mode it never blocks on a prompt: it parks each opportunity at its gate, leaves a comment
  with what a human needs to decide, and respects per-run caps.

## Configuration

Copy `config/repo-registry.example.json` to `repo-registry.json` in your workspace root (or
`.amplitude/`) and set your `projectId`, the target repo(s) with their base branch and
`setup`/`test`/`lint`/`build` commands, the hard gates (`allowMerge`,
`allowExperimentLaunch` — both default off), staleness thresholds, and per-run caps. If no
config is present, the skill asks for the essentials and defaults to the safest settings.

## Authentication

Authenticate with Amplitude when prompted (the same MCP server as the `amplitude` plugin).
The plugin also needs your ADE's normal repo/PR access to open pull requests.
