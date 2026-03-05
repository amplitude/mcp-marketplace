# Search Playbook: Finding Event Types in Code

Patterns and keyword strategies for locating event type strings in a repository.

## Search Order

For each event type string (e.g. `purchase_completed`):

### 1. Exact String Match

```
grep -r "purchase_completed" --include="*.{ts,tsx,js,jsx,py,java,kt,swift,go,rb}"
```

Search for both quoted and unquoted forms:
- `"purchase_completed"` (double-quoted)
- `'purchase_completed'` (single-quoted)
- `` `purchase_completed` `` (template literal)
- `purchase_completed` (bare, in constants/enums)

### 2. Casing Variants

Convert the event type to alternative casings:

| Original              | PascalCase          | camelCase           | SCREAMING_SNAKE     |
| --------------------- | ------------------- | ------------------- | ------------------- |
| `purchase_completed`  | `PurchaseCompleted` | `purchaseCompleted` | `PURCHASE_COMPLETED`|
| `Button Clicked`      | `ButtonClicked`     | `buttonClicked`     | `BUTTON_CLICKED`    |
| `page.viewed`         | `PageViewed`        | `pageViewed`        | `PAGE_VIEWED`       |

### 3. Constant/Enum Definitions

Search for where event names are defined as constants:

- `EventType.` or `EventName.` followed by a variant of the event name
- `enum` declarations containing event names
- Object literals mapping keys to event type strings
- Tracking plan or codegen output files

### 4. Partial/Substring Match

If exact and variant searches yield nothing, try distinctive substrings:

- For `purchase_completed`, try `purchase` in tracking-related files
- For `[Amplitude] Page Viewed`, try `Page Viewed`

## Where to Search

Priority order:

1. **Analytics/tracking modules**: files named `analytics`, `tracking`, `events`, `telemetry`
2. **Constants/enums**: files named `constants`, `enums`, `types`, `event-types`
3. **Feature code**: UI handlers, API routes, hooks
4. **Generated code**: `ampli/`, `generated/`, `codegen/`
5. **Config files**: YAML/JSON tracking plans or event schemas

## Where NOT to Search

Exclude these from results to reduce noise:

- `node_modules/`, `vendor/`, `.git/`
- `dist/`, `build/`, `.next/`, `out/`
- `*.min.js`, `*.map`, `*.lock`
- `coverage/`, `__snapshots__/`
- Non-English locale files (`ja-JP/`, `ko-KR/`)

## Two-Phase Search: Definition → Call Site

Most codebases separate event **definitions** (where the event string is declared) from event **call sites** (where the event is actually fired). Both are needed for good descriptions, but they serve different purposes:

| Phase | What you find | Why it matters |
|---|---|---|
| Definition | The event string literal, class, or enum member | Confirms the event exists in code and gives you the class/constant name to search for next |
| Call site | The `track()` / `ampli.` invocation in feature code | Tells you **when**, **where**, and **why** the event fires — this is what the description needs |

### Phase A: Find the Definition

This is the search described in steps 1–4 above. In Ampli-based codebases, the definition is typically a class in a generated `ampli/index.ts` file:

```typescript
export class ChartSave implements BaseEvent {
  event_type = 'chart: save';
}
```

Record the **class name** (e.g. `ChartSave`) — you need it for Phase B.

### Phase B: Find the Call Site

Search for where the class is instantiated or referenced in non-generated code:

```
new ChartSave(       ampli.chartSave(       track(new ChartSave
```

The call site lives in feature code (handlers, hooks, components) and is surrounded by the context you need for description generation. Read **20–30 lines** around the call site to understand:

- **The component or page** the user is interacting with
- **The specific user action** that triggers it (button click, form submit, navigation, etc.)
- **Conditions or guards** (e.g. only fires on save, not on auto-save; only for new charts)
- **Properties passed** and what they represent
- **The product surface** (Analytics, Experiment, Data, Audiences, etc.)

## Tracking Call Patterns

Common function signatures that indicate event tracking:

```
.track(            ampli.             analytics.track(
.logEvent(         trackEvent(        useTrack(
capture(           record(            logAnalyticsEvent(
sendEvent(         emit(              dispatch(
new EventClass(    ampli.eventName(
```

When you find a call site, read ~20-30 lines of surrounding context to understand:
- What triggers the event (user action, lifecycle, API response)
- What properties are passed and what they represent
- What component/feature owns it
- What page or product surface the user is on
- What conditions must be true for the event to fire
