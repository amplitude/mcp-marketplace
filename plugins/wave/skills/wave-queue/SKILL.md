---
name: wave-queue
description: Reviews and ranks Amplitude Wave Opportunity Manager work by product area, status, evidence, and existing execution state. Use when users ask what Wave opportunity to work on, request a morning opportunity queue, want the top product improvements, or need to find an existing Wave opportunity. Not for evaluating code or starting implementation.
---

# Wave Queue

Produce a read-only, ranked Wave work queue. Do not change opportunity state.

Read:

- [Wave pipeline contract](../../references/wave-pipeline-contract.md)
- [Output contracts](../../references/output-contracts.md)

## Workflow

1. Call `get_amplitude_context` without a project ID. Resolve ambiguity with the user;
   never guess. Call it again with the selected numeric project ID for product context.
2. Call `query_wave_product_areas` `list`. If the user named an area, match it to a real
   product-area ID and fetch it with `get`.
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
7. Return no more than ten queue items using the queue-item output contract. Recommend
   `wave-evaluate`, `wave-babysit`, or `wave-close-out` for each.

## Done

The user receives:

- product/project scope,
- backlog count and filters,
- ranked items with evidence and existing-work state,
- one recommended next action per item,
- a concise digest suitable for Cursor chat, Slack drafting, or an automation log.

## Gotchas

- Wave opportunities are not CRM or sales opportunities.
- List/search descriptions are snippets; never rank a finalist without `get`.
- Do not treat `FOR_REVIEW` as proof a PR exists—inspect relations.
- Do not mutate, claim, dismiss, or submit ideas from this skill.
