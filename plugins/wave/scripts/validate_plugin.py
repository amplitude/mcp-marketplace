#!/usr/bin/env python3
"""Validate the distributable Amplitude Wave plugin without dependencies."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXPECTED_SKILLS = {
    "wave-autopilot",
    "wave-babysit",
    "wave-close-out",
    "wave-dispatch-handoff",
    "wave-evaluate",
    "wave-experiment",
    "wave-intake",
    "wave-queue",
    "wave-refine",
}
MANUAL_SKILLS = {
    "wave-autopilot",
    "wave-babysit",
    "wave-dispatch-handoff",
    "wave-experiment",
    "wave-intake",
}
REQUIRED_SCENARIOS = {
    "already-fixed-problem",
    "close-out-evidence-gate",
    "direct-ship-correctness",
    "duplicate-write-prevention",
    "evaluate-repository-unavailable",
    "existing-in-flight-pr",
    "experiment-worthy-change",
    "frontend-verification",
    "intake-deduplication",
    "interrupted-run-resume",
    "queue-natural-language",
    "queue-routes-to-dispatch",
    "real-problem-weak-plan",
    "refine-read-only",
    "scheduled-human-decision",
    "unattended-missing-config",
}
LEGACY_TOOL_PATTERNS = {
    r"`get_context`": "get_amplitude_context",
    r"`get_project_context`": "get_amplitude_context",
    r"`list_objectives`": "query_wave_product_areas",
    r"`list_opportunities`": "query_wave_opportunities action list",
    r"`search_opportunities`": "query_wave_opportunities action search",
    r"`get_opportunity`": "query_wave_opportunities action get",
    r"`update_opportunity_status`": "manage_wave_opportunities action update",
    r"`update_opportunity`": "manage_wave_opportunities action update",
    r"`add_opportunity_comment`": "manage_wave_opportunities action add_comment",
    r"`create_relation`": "manage_wave_opportunities action add_opportunity_relation",
    r"`submit_opportunity_idea`": "manage_wave_opportunities action submit_idea",
    r"`create_flags`": "use_amp_flags action create",
    r"`create_experiment`": "use_amp_experiments action create",
    r"`query_experiment`": "use_amp_experiments action analyze",
}
SCENARIO_TEXT_ASSERTIONS = {
    "queue-natural-language": [
        ("skills/wave-queue/SKILL.md", "read-only"),
        ("skills/wave-queue/SKILL.md", "Do not paginate"),
        ("skills/wave-queue/SKILL.md", "call `get`"),
        ("skills/wave-queue/SKILL.md", "wave-dispatch-handoff"),
    ],
    "queue-routes-to-dispatch": [
        ("skills/wave-queue/SKILL.md", "wave-dispatch-handoff"),
        ("skills/wave-queue/SKILL.md", "wave-experiment"),
        ("references/output-contracts.md", "wave-dispatch-handoff"),
    ],
    "real-problem-weak-plan": [
        ("skills/wave-evaluate/SKILL.md", "NEEDS_REPLAN"),
        ("skills/wave-evaluate/SKILL.md", "Improve the plan"),
    ],
    "already-fixed-problem": [
        ("skills/wave-evaluate/SKILL.md", "transition to `DISMISSED`"),
        ("skills/wave-evaluate/SKILL.md", "Every dismissal requires explicit human confirmation"),
    ],
    "existing-in-flight-pr": [
        ("skills/wave-dispatch-handoff/SKILL.md", "duplicate agent for an open/fresh PR"),
        ("skills/wave-dispatch-handoff/SKILL.md", "do not code inline"),
    ],
    "experiment-worthy-change": [
        ("skills/wave-experiment/SKILL.md", "disabled"),
        ("skills/wave-experiment/SKILL.md", "Never enable a flag rollout"),
        ("skills/wave-experiment/SKILL.md", "projectIds"),
        ("skills/wave-experiment/SKILL.md", "enabled: false"),
    ],
    "direct-ship-correctness": [
        ("references/decision-rubrics.md", "Correctness, security, accessibility"),
    ],
    "interrupted-run-resume": [
        ("skills/wave-autopilot/SKILL.md", "Reconcile"),
        ("skills/wave-autopilot/SKILL.md", "Resume existing"),
    ],
    "duplicate-write-prevention": [
        ("references/wave-pipeline-contract.md", "Idempotent writes"),
    ],
    "frontend-verification": [
        ("skills/wave-babysit/SKILL.md", "screenshot or GIF"),
        ("skills/wave-babysit/SKILL.md", "Never mark `FOR_REVIEW` without"),
    ],
    "intake-deduplication": [
        ("skills/wave-intake/SKILL.md", "Do not submit a duplicate"),
    ],
    "refine-read-only": [
        ("skills/wave-refine/SKILL.md", "read-only by default"),
    ],
    "close-out-evidence-gate": [
        ("skills/wave-close-out/SKILL.md", "Transition to `MEASURED` only"),
    ],
    "unattended-missing-config": [
        ("skills/wave-autopilot/SKILL.md", "run read-only queue/reconcile"),
    ],
    "evaluate-repository-unavailable": [
        ("skills/wave-evaluate/SKILL.md", "NEEDS_HUMAN_REVIEW"),
    ],
    "scheduled-human-decision": [
        ("skills/wave-autopilot/SKILL.md", "Never block on a prompt"),
        ("skills/wave-autopilot/SKILL.md", "park"),
    ],
}


def parse_frontmatter(path: Path) -> tuple[dict[str, str], str]:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    if not lines or lines[0] != "---":
        raise ValueError("missing YAML frontmatter")
    try:
        end = lines.index("---", 1)
    except ValueError as error:
        raise ValueError("unterminated YAML frontmatter") from error

    fields: dict[str, str] = {}
    for line in lines[1:end]:
        match = re.match(r"^([a-zA-Z0-9_-]+):(?:\s*(.*))?$", line)
        if match:
            fields[match.group(1)] = (match.group(2) or "").strip()
    return fields, text


def validate_skills(errors: list[str]) -> None:
    found: set[str] = set()
    for path in sorted((ROOT / "skills").glob("*/SKILL.md")):
        relative = path.relative_to(ROOT)
        try:
            frontmatter, text = parse_frontmatter(path)
        except ValueError as error:
            errors.append(f"{relative}: {error}")
            continue

        name = frontmatter.get("name", "")
        description = frontmatter.get("description", "")
        found.add(name)
        if name != path.parent.name or not re.fullmatch(r"[a-z0-9-]{1,64}", name):
            errors.append(f"{relative}: invalid or mismatched skill name {name!r}")
        if not description or len(description) > 1024 or "Use when" not in description:
            errors.append(f"{relative}: description needs concrete 'Use when' triggers")
        if len(text.splitlines()) > 500:
            errors.append(f"{relative}: SKILL.md exceeds 500 lines")
        if name in MANUAL_SKILLS and frontmatter.get("disable-model-invocation") != "true":
            errors.append(f"{relative}: consequential skill must require explicit invocation")
        for pattern, replacement in LEGACY_TOOL_PATTERNS.items():
            if re.search(pattern, text):
                errors.append(f"{relative}: legacy {pattern!r}; use {replacement}")
        if "/Users/" in text or ".claude/skills" in text or ".cursor/skills" in text:
            errors.append(f"{relative}: contains a personal/local dependency")
        for target in re.findall(r"\]\(([^)]+\.md)\)", text):
            if not (path.parent / target).resolve().is_file():
                errors.append(f"{relative}: broken markdown reference {target}")

    if found != EXPECTED_SKILLS:
        errors.append(
            f"skill set mismatch; missing={sorted(EXPECTED_SKILLS - found)}, "
            f"extra={sorted(found - EXPECTED_SKILLS)}"
        )


def validate_manifests(errors: list[str]) -> None:
    try:
        claude = json.loads((ROOT / ".claude-plugin/plugin.json").read_text())
        cursor = json.loads((ROOT / ".cursor-plugin/plugin.json").read_text())
        codex = json.loads((ROOT / ".codex-plugin/plugin.json").read_text())
    except (OSError, json.JSONDecodeError) as error:
        errors.append(f"manifest: invalid JSON: {error}")
        return

    if claude != cursor:
        errors.append("Claude and Cursor plugin manifests must match")
    if {claude.get("name"), cursor.get("name"), codex.get("name")} != {"wave"}:
        errors.append("all plugin manifests must use name 'wave'")
    if codex.get("version") != "1.0.0":
        errors.append("Codex plugin version must be 1.0.0 for initial release")
    if codex.get("skills") != "./skills/" or codex.get("mcpServers") != "./.mcp.json":
        errors.append("Codex manifest must reference ./skills/ and ./.mcp.json")


def validate_config_and_scenarios(errors: list[str]) -> None:
    try:
        mcp = json.loads((ROOT / ".mcp.json").read_text())
        amplitude = mcp["mcpServers"]["amplitude"]
        if amplitude != {"type": "http", "url": "https://mcp.amplitude.com/mcp"}:
            errors.append(".mcp.json: unexpected Amplitude server configuration")
    except (OSError, KeyError, TypeError, json.JSONDecodeError) as error:
        errors.append(f".mcp.json: invalid config: {error}")

    try:
        config = json.loads((ROOT / "config/wave-config.example.json").read_text())
        defaults = config["defaults"]
        if config.get("projectId") != "YOUR_PROJECT_ID":
            errors.append("config: projectId must be a generic placeholder")
        if "allowMerge" in defaults or "allowExperimentLaunch" in defaults:
            errors.append("config: human gates must not be configurable")
        for cap in (
            "maxOpportunitiesPerRun",
            "maxConcurrentAgents",
            "maxNewIdeasPerRun",
            "maxRetriesPerStage",
            "minOpportunitiesForRefine",
        ):
            if not isinstance(defaults.get(cap), int) or defaults[cap] < 0:
                errors.append(f"config: {cap} must be a non-negative integer")
    except (OSError, KeyError, TypeError, json.JSONDecodeError) as error:
        errors.append(f"config: invalid example: {error}")

    try:
        scenarios = json.loads((ROOT / "tests/scenarios.json").read_text())["scenarios"]
        ids = {scenario["id"] for scenario in scenarios}
        if len(ids) != len(scenarios):
            errors.append("scenarios: IDs must be unique")
        if not REQUIRED_SCENARIOS.issubset(ids):
            errors.append(f"scenarios: missing {sorted(REQUIRED_SCENARIOS - ids)}")
        covered = {scenario["expectedSkill"] for scenario in scenarios}
        if covered != EXPECTED_SKILLS:
            errors.append(f"scenarios: skill coverage differs: {sorted(covered)}")
        for scenario_id, assertions in SCENARIO_TEXT_ASSERTIONS.items():
            if scenario_id not in ids:
                continue
            for relative, phrase in assertions:
                if phrase not in (ROOT / relative).read_text(encoding="utf-8"):
                    errors.append(f"scenario {scenario_id}: {relative} missing {phrase!r}")
    except (OSError, KeyError, TypeError, json.JSONDecodeError) as error:
        errors.append(f"scenarios: invalid fixture: {error}")


def validate() -> list[str]:
    errors: list[str] = []
    validate_skills(errors)
    validate_manifests(errors)
    validate_config_and_scenarios(errors)

    hard_gates = {
        "skills/wave-autopilot/SKILL.md": ["Never merge a PR", "Never enable rollout"],
        "skills/wave-experiment/SKILL.md": [
            "Never enable a flag rollout",
            "explicit human approval",
        ],
        "skills/wave-babysit/SKILL.md": ["Never merge"],
    }
    for relative, phrases in hard_gates.items():
        text = (ROOT / relative).read_text(encoding="utf-8")
        for phrase in phrases:
            if phrase not in text:
                errors.append(f"{relative}: missing hard gate {phrase!r}")
    return errors


def main() -> int:
    errors = validate()
    if errors:
        print("Amplitude Wave plugin validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1
    print(f"Amplitude Wave plugin validation passed ({len(EXPECTED_SKILLS)} skills).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
