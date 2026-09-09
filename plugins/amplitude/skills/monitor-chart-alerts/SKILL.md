---
name: monitor-chart-alerts
description: Reads and manages Amplitude chart alert monitors with use_amplitude_chart_monitors — recent alert firings, monitor configuration and subscribers, the config audit trail, subscribing or unsubscribing, and enabling or disabling a monitor. Use when asked what alerted, who is subscribed, why a monitor changed, or to turn one on or off.
x-amp-flags: [mcp-consolidate-charts]
---

# Monitor Chart Alerts

`use_amplitude_chart_monitors` is one tool with six actions on `action`. The
older `get_chart_alerts` and `get_chart_monitor` tools are folded into it.

## Actions

| `action` | Answers | Requires |
|---|---|---|
| `get_alerts` (default) | What has alerted recently? | `projectId` or `chartId` |
| `get_config` | What is the monitor set to, and who is subscribed? | `chartId` |
| `history` | Who changed this monitor, and when? | `monitorId` or `chartId` |
| `subscribe` / `unsubscribe` | Add or remove a recipient | `monitorId`, `deliveryMethod` |
| `update` | Turn a monitor on or off | `monitorId`, `enabled` |

## The two mistakes that produce almost every failure

**1. Not every chart has a monitor.** A chart with no alerting configured is
the normal case, not an error state. Calling `get_config` on an arbitrary chart
id returns `Chart monitor not found` far more often than it returns a config —
this is the single most common failure on this tool. Start from
`get_alerts` for the project to see which charts actually alert, and only then
ask for a specific chart's config. If `get_config` says not found, report that
the chart has no monitor and stop; do not retry with a different id spelling
or fall back to the deprecated tools.

**2. Chart monitors are a licensed feature.** `Chart monitors feature is not
enabled` means the org does not have alerting, so no action on this tool can
succeed. Say so plainly and move on — retrying, switching action, or trying
`get_chart_alerts` will all return the same thing.

## Resolving a monitorId

`subscribe`, `unsubscribe`, and `update` need a `monitorId`, and there is no
way to guess one. Always resolve it first:

```jsonc
// 1. chartId → monitor config, which carries the monitorId and subscribers
{ "action": "get_config", "chartId": "abc123" }

// 2. act on the monitorId that came back
{ "action": "update", "monitorId": "mon_123", "enabled": false }
```

`history` is the exception — it accepts `chartId` directly and resolves the
monitor itself.

## Alerts vs history

These sound alike and get swapped. `get_alerts` returns **anomalies the
monitor fired on** — the data crossed a threshold. `history` returns **changes
to the monitor's own configuration** — someone edited the threshold, or
enabled it. "Why did we get paged?" is `get_alerts`; "who turned this off?" is
`history`.

## Scoping

For `get_alerts`, `projectId` is optional only when you have access to exactly
one project; with several, pass it explicitly or the call cannot be resolved.
Add `chartId` to narrow to a single chart, `limit` (1–100, default 20) to cap
the volume, and the unseen-only filter when triaging what is new.

## Subscriptions

Email subscriptions apply to **the current user only** — you cannot subscribe a
colleague by email through this tool. For a Slack or Teams destination pass
`deliveryChannel`, plus `deliveryWorkspaceId` when the org has more than one
workspace connected.

## Not this tool

Reading the chart's actual data is `get_amplitude_charts` with
`include: 'data'`, or `query_amplitude_data`. This tool only covers the
alerting layer on top of a chart.
