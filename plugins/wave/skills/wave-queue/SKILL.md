---
name: wave-queue
description: Ranks existing Amplitude Wave Opportunity Manager records and names the next Wave skill for each. Use when the user asks what Wave work to do next, wants a morning Wave queue, or needs to find a Wave opportunity. Not for discovering new opportunities from analytics, evaluating code, implementing, measuring shipped outcomes, or mutating Wave records.
---

# Wave Queue

Produce a read-only, ranked Wave work queue. Do not change opportunity state. Name the
next skill; do not start it unless the user asks to continue.

Read:

- [Wave pipeline contract](../../references/wave-pipeline-contract.md)
- [Output contracts](../../references/output-contracts.md)

## Workflow

1. Call `get_amplitude_context` without a project ID. Resolve ambiguity with the user;
   never guess. Call it again with the selected numeric project ID for product context.
2. Call `query_wave_product_areas` `list`. If the user named an area, match it to a real
   product-area ID and fetch it with `get`. Use the area description plus recent
   approve/replan/dismiss/outcome comments as a short "team taste" brief for ranking
   only—never to override fresh code or product evidence.
3. Query opportunities:
   - named topic → `search` with the topic and product-area scope when known;
   - morning queue → `list` with relevant statuses, product area, and a bounded limit;
   - exact item → `get` by full ID or unique 8+ character prefix.
4. Do not paginate the full backlog. Report first-page coverage and `totalCount`, then
   narrow the query if needed.
5. For likely candidates, call `get` for full detail and `get_relations` to detect PRs,
   agents, blockers, parent/child work, charts, and metrics.
6. Normalize records using the shared contract. Rank:
   - resume active/review work before starting duplicates;
   - otherwise prefer high-impact, code-addressable, unblocked opportunities;
   - use RICE as a ranking signal, not as proof the problem is valid.
7. Return no more than ten queue items. Set `recommendedNextSkill` with the first match:

   | Condition | Next skill |
   |---|---|
   | Open/fresh linked PR, or `FOR_REVIEW` with a real PR | `wave-babysit` |
   | `SHIPPED` and the measurement window is ready | `wave-close-out` |
   | Approved, experiment recommended, no prepared experiment/flag | `wave-experiment` |
   | Approved (`agent-approved` or `wave_handoff` verdict `APPROVE`), no fresh PR | `wave-dispatch-handoff` |
   | `needs-human-review` or parked `wave_gate` | say the decision needed; do not dispatch |
   | Anything else (`NEW`/`PLANNED`, weak/missing plan, `needs-replan`) | `wave-evaluate` |

## Done

The user receives:

- product/project scope,
- backlog count and filters,
- ranked items with evidence and existing-work state,
- one recommended next skill per item,
- a concise digest suitable for Cursor chat or an automation log.

## Gotchas

- Wave opportunities are not CRM or sales opportunities, and not analytics-discovered ideas.
- List/search descriptions are snippets; never rank a finalist without `get`.
- Do not treat `FOR_REVIEW` as proof a PR exists—inspect relations.
- Do not mutate, claim, dismiss, implement, or submit ideas from this skill.
