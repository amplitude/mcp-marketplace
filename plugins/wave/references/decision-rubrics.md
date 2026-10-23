# Wave Decision Rubrics

Use these rules for decisions that should remain consistent across skills.

## Codebase validation

An opportunity is current when the described user-visible behavior or missing capability
still follows from the present code and no merged/in-flight change resolves it.

Check, in order:

1. Referenced repository and files exist.
2. Current code still contains the relevant path, behavior, or gap.
3. Recent commits and linked/open PRs have not fixed it.
4. Cited analytics, feedback, or replay evidence still supports the problem when fresh
   evidence is accessible.

Code proves implementation state; product evidence proves impact. A code-only mismatch
usually calls for a corrected plan, not dismissal.

## Verdict

| Finding | Verdict |
|---|---|
| Problem real; plan fits | `APPROVE` |
| Problem real; plan/repo/ACs need correction | `NEEDS_REPLAN`, then improve it |
| Problem plausible; product/security judgment needed | `NEEDS_HUMAN_REVIEW` |
| Problem demonstrably obsolete or invalid | `DISMISS` |

Do not dismiss because the proposed solution is bad. Replace the solution and preserve
the evidence-backed problem. `DISMISS` becomes status `DISMISSED` only after explicit
human confirmation; unattended runs park the proposal.

## RICE

`score = (reach × impact × confidence) / effort`

Use RICE to rank workable opportunities, not to determine whether a real problem exists.
Agent-compressed coding effort may be lower, but review, rollout, coordination, and
measurement effort remain.

## Experiment versus direct ship

Lean toward an experiment when most are true:

- It is a behavioral bet whose metric effect is uncertain.
- The affected surface has enough traffic to decide in a useful window.
- It is reversible and safe to expose to a fraction of users.
- A wrong full-rollout decision would be costly.
- A primary success metric and at least one guardrail are available.

Lean toward direct ship when any decisive condition applies:

- Correctness, security, accessibility, or reliability has an obviously right outcome.
- Traffic is too low to power a useful test.
- The change is infrastructure-only or not safely reversible by variant.
- Delaying the fix to experiment would harm users.

When experimenting, flag-gate the implementation in the PR. Prefer an existing flag
already linked in code/opportunity context. Prepare the experiment with:

- control and treatment variants,
- primary recommendation metric,
- at least one guardrail,
- deployment,
- a proxy exposure event at the tested surface when available.

Never enable real traffic without explicit human approval.

## Metric selection

Stop at the first valid option:

1. Existing metric linked by the opportunity.
2. Closest trusted existing metric, chart, or event used by the product area.
3. Minimal new metric definition over existing events/properties.
4. Instrumentation recommendation when no existing signal can measure the outcome.

Discover event/property names through taxonomy tools; never guess. Creating new tracking
or taxonomy is a separate, explicit user decision.

## Concurrency and staleness

Defer when any work signal is fresh:

- unexpired `INVESTIGATED_BY` lease,
- open linked PR with recent commits,
- active implementation agent relation,
- recent `IN_PROGRESS` / `FOR_REVIEW` update.

Take over only with evidence:

- lease expired beyond configured grace,
- PR closed without merge,
- open PR inactive beyond `stalePrInactivityDays`,
- no PR and status stale beyond the configured threshold.

Comment with takeover evidence before claiming. Re-read after the soft claim and defer if
another fresh claim won.

## Measurement readiness

Move `SHIPPED` to `MEASURED` only when one is true:

- Experiment has a decision and guardrails were checked.
- Direct-ship target metric has an adequate before/after readout with caveats.
- Explicit fallback records that measurement is impossible/pending, why, and what signal
  is missing.

Never present direct-ship correlation as causal proof.
