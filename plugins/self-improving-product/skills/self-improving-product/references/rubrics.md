# Rubrics

Decision rules for the `self-improving-product` skill. Follow these rather than
improvising the metric, experiment, and conflict calls.

## 1. Metric selection (metric-first, instrument last)

Pick the metric to track an opportunity's outcome in this strict order. Stop at the first
that applies.

1. **Use the opportunity's own target metric.** If a `TARGETS_METRIC` relation or a metric
   in the opportunity metadata already exists, use it as-is.
2. **Find the closest existing signal.** Search what's already tracked and trusted:
   `get_charts`, `get_events`, `search`. Prefer a metric/event already used on an official
   dashboard or chart over anything bespoke. A "good enough" existing metric beats a
   perfect new one.
3. **Recommend instrumentation — only if necessary.** If, and only if, no existing signal
   can measure the outcome and measurement is essential, raise a recommendation:
   `add_opportunity_comment` describing the gap and the minimal event/property needed, and
   add an acceptance criterion noting "measurement pending instrumentation".
   **Do not create events, properties, or metrics automatically.** Let the customer opt in.

Once selected (steps 1–2), record it with `create_relation TARGETS_METRIC` after checking
`get_relations` for an existing link.

## 2. Experiment vs. direct ship

Decide during implementation (Phase 5), because an experiment requires flag-gating the
code in the same PR.

**Lean toward an experiment when most of these hold:**

- The change is a **behavioral bet** (UX, copy, flow, algorithm) whose effect on the
  target metric is uncertain.
- There is **enough traffic** on the affected surface to reach significance in a
  reasonable window (sanity-check volume with `query_chart`/`query_dataset`; weigh against
  the metric's minimum detectable effect).
- The change is **reversible** and safe to expose to a fraction of users.
- A wrong call is **costly** to detect or undo after a full ship.

**Lean toward a direct ship when:**

- It's a **bug fix** or correctness change with an obviously-right behavior.
- Traffic is **too low** to power a test (an experiment would never conclude).
- It's **infrastructure / non-user-facing**, or a tiny copy/config tweak.
- It's **not safely reversible** at the variant level.

If experimenting: gate the behavior behind a flag now (`create_flags`), and in Phase 7
*prepare* the experiment with `create_experiment` — a primary **success** metric plus at
least one **guardrail** metric, control/treatment variants, and the right deployment.
**Launching to real traffic is a human gate.** Never start it yourself.

## 3. Concurrency & staleness

Opportunities are shared. Before claiming, read `status`, `assignments`, and the
`INVESTIGATED_BY` / `IMPLEMENTED_BY` / `DELIVERED_VIA` relations via `get_relations`.

**Defer** (pick the next candidate) when any signal of *active* work is fresh:

- An `INVESTIGATED_BY` lease whose `expires_at` is still in the future
  (plus `staleLeaseGraceMinutes`).
- A `DELIVERED_VIA` PR that is **open with commits within `stalePrInactivityDays`**.
- Status `IN_PROGRESS` / `FOR_REVIEW` with a recent `updated_at`.

**Take over** only when the work is **stale**:

- The lease has expired, **or**
- The linked PR is closed-unmerged, **or** open with no commits for
  `stalePrInactivityDays`+, **or**
- There's no linked PR and the item has sat `IN_PROGRESS` past the stale threshold.

On takeover, `add_opportunity_comment` with the evidence before claiming. The
`INVESTIGATED_BY` lease is a **soft** claim — the server does not block concurrent claims —
so always re-read after claiming and defer if you lost the race. Never silently stomp
active work.

## 4. RICE recap (for ranking)

**Score = (Reach × Impact × Confidence%) / Effort** — higher is better ROI.

- **Reach** — users/events affected per quarter (absolute count).
- **Impact** — expected per-user effect on the target metric (0.25 minimal → 3 massive).
- **Confidence** — 0–100%; high only with multi-source evidence.
- **Effort** — person-months; discount the pure-coding portion (agents compress it) but
  keep review, testing, rollout, and coordination.

Use the score only to **rank** the workable backlog. It does not override the conflict
check (§3) or the kill switch in Phase 3.
