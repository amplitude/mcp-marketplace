---
name: analyze-mcp-servers
description: Analyzes MCP servers instrumented with Amplitude MCP Analytics through `run_amp`, from usage topics down to individual episodes and their tool calls. Use when the user asks how their MCP server is used, which tools or topics fail or thrash, why an MCP session went wrong, or which MCP clients and auth types hit errors.
x-amp-flags: [mcp-run-amp]
---

# Analyze MCP Servers

MCP Analytics groups each instrumented MCP server's sessions into **episodes**, meaning one task an agent tried to complete. It then clusters episodes into a tree of **topics**. All reads go through `run_amp` with the `mcp-analytics` commands. Every command needs `project`, and nothing here writes.

## Before you start

- **Project:** use the project the MCP Analytics SDK sends events to. Call `get_amplitude_context` when it isn't known, and ask the user rather than guessing.
- **Parameters:** check them before the first call of each command, for example `{"command": ["help", "mcp-analytics", "episodes", "list"]}`.

## Drill down

1. **Servers:** `["mcp-analytics", "servers", "list"]` returns each server's `id` and `name`. An empty `data` array means the project has no instrumented servers; say so and stop.
2. **Topic tree:** `["mcp-analytics", "taxonomy", "get"]` with `server`.
   - Leave out `parent` to get every node. Use `parent: "root"` for the top level, or a topic `id` for its direct children.
   - Each topic has `episode_count`, `share`, `hard_error_rate`, `thrashing_rate` and `mean_calls`. Rates are null when there isn't enough data.
   - Null `run_id` and empty `nodes` mean no taxonomy is pinned for the server yet. Topic and episode commands won't return anything useful, so tell the user and fall back to the raw events below.
3. **One topic:** `["mcp-analytics", "topics", "get"]` with `server` and `topic` returns the topic's stats and up to eight example episodes. This is a sample, not a page.
4. **Episodes:** `["mcp-analytics", "episodes", "list"]` with `server` and `topic`.
   - Filters: `has-error: "true"`, `is-thrash: "true"`, `client-name`, `auth-type`, `lane`, and `started-after` / `started-before` as RFC 3339 timestamps. Client, auth type and lane must match a stored value exactly, so copy them from earlier results.
   - Pages hold 25 episodes by default, up to 100 with `limit`. Pass `pagination.next_cursor` as `cursor` and keep the same filters.
5. **One episode:** `["mcp-analytics", "episodes", "get"]` with `episode` adds the `auth_type` and the topic `breadcrumb` from the root.
6. **Tool calls:** `["mcp-analytics", "calls", "list"]` with `episode` returns every call in order. Each call has `tool_name`, `is_error`, `error_type`, `error_message`, `error_code`, `error_http_status`, `duration_ms`, the agent's `rationale`, and the recorded `properties`.

## What to look for

- **Priorities:** topics with a high `share` and a high `hard_error_rate` or `thrashing_rate` come first. A low-share topic with a high error rate is a gap worth noting, not the headline.
- **Thrash:** `is_thrash` marks episodes classified as thrashing. Read the call sequence and each call's `rationale` to see what the agent was trying to do and where it stopped making progress.
- **Root cause:** look for the first failing call in an episode, not the last. Group failures by `tool_name` plus `error_type` or `error_code`.
- **Segments:** compare `client-name` and `auth-type` on the same topic to tell a server bug from a client-specific problem.
- **Privacy:** call `properties` and `rationale` may contain user input. Quote only what supports a finding, and never repeat tokens, emails or other personal data.

## Trends and counts

The commands above are for drilling down. For volumes and trends over time, chart the raw SDK events with the chart query tools in the same project.

- **Events:** `[MCP] Tool Call Response` (one per tool call), `[MCP] Tool Call Rejected`, `[MCP] Tools Listed`, `[MCP] Session Initialized`, `[MCP] Session Ended`, `[MCP] Feedback Submitted`.
- **Common properties:** `[MCP] Server Name`, `[MCP] Tool Name`, `[MCP] Is Error`, `[MCP] Error Type`, `[MCP] Response Duration`, `[MCP] Client Name`, `[MCP] Auth Type`. Servers that capture parameters also send `[MCP] Param: <name>`.
- Confirm the names with `get_events` and `get_properties` before you filter on them, because a server may not send every event.

## Report

Lead with the two or three topics that most need work, each with its share, error or thrash rate, and the main failing tool and error. Then add one or two example episodes with the call sequence that shows the problem. End with the next fix to try.
