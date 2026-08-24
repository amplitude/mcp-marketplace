# Skill Design Checklist

Apply when adding or changing a Wave skill.

- Description is third-person and says both what the skill does and when it triggers.
- Trigger language does not overlap ambiguously with sibling skills.
- Skill owns one job; orchestration references other skills instead of copying them.
- `SKILL.md` contains only Wave-specific goals, constraints, workflow, output, and gotchas.
- Detailed contracts and rubrics are linked directly from `SKILL.md`.
- Judgment steps allow contextual freedom; fragile writes use exact preconditions.
- Output contract defines what done means.
- Gotchas capture observed failure modes.
- Negative boundaries state where the skill stops.
- Consequential workflows use explicit invocation and human gates.
- IDs are discovered, never guessed.
- Writes are reconcile-first and idempotent.
- Skill remains under 500 lines.
- Natural-language and explicit invocation are represented in test scenarios.
