---
name: wave-intake
description: Creates or updates Amplitude Wave product areas and submits deduplicated product-improvement ideas for Wave AI investigation. Use when users ask to add an idea to Wave, submit a product opportunity, configure a Wave product area, or replenish an empty Wave backlog. Not for CRM opportunities or directly creating implementation-ready records.
disable-model-invocation: true
---

# Wave Intake

Submit a clear problem signal to the right Wave product area and start Wave's AI
investigation. Do not bypass investigation by pretending an idea is implementation-ready.

Read [Wave pipeline contract](../../references/wave-pipeline-contract.md).

## Product-area setup

1. Resolve the project through `get_amplitude_context`.
2. Call `query_wave_product_areas` `list`.
3. Reuse an existing area when its purpose fits.
4. If none fits, propose title, description, owner, success metrics, product surface, and
   repository context. Obtain confirmation before `manage_wave_product_areas` `create`.
5. Before `update`, fetch the area and show the exact field changes. Preserve unrelated
   metadata.

Product-area descriptions should explain:

- users and job-to-be-done,
- product surfaces and relevant repositories,
- outcome metrics and guardrails,
- strategic constraints,
- known team preferences or learnings.

## Submit an idea

1. Frame the input as a user/product problem, not a preselected solution.
2. Semantic-search opportunities in the target product area with several concise problem
   phrasings. Do not paginate the backlog.
3. If a close match exists, fetch it and add new evidence/context only after user
   confirmation. Do not submit a duplicate.
4. For a new idea, propose:
   - title,
   - product-area ID,
   - short problem/evidence description.
5. Obtain confirmation, then call `manage_wave_opportunities` `submit_idea` with
   `productAreaId` and title. This starts AI investigation.
6. Fetch the created opportunity when an ID is returned. Add supporting context as one
   idempotent comment if it was not captured by submission.

## Backlog replenishment

Automated replenishment is permitted only inside explicitly invoked `wave-autopilot`,
when no workable opportunities remain and `maxNewIdeasPerRun` is positive:

- search before every submission;
- use accumulated measured learnings, not random ideation;
- never exceed the configured cap;
- unattended mode parks uncertain ideas instead of submitting them.

## Done

The idea is attached to a real product area and Wave investigation has started, or
existing opportunity context was enriched without duplication.

## Gotchas

- This is never for Salesforce, CRM, or sales opportunities.
- `submit_idea` is not generic CRUD; it starts AI investigation.
- Product-area IDs must come from the current project.
- Do not create a product area merely because terminology differs slightly.
- Do not mass-submit an idea list.
