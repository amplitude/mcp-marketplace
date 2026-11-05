---
name: edit-guides-surveys
description: Creates, edits, translates, and archives Amplitude Guides and Surveys through `run_amp`, including step content blocks, buttons, survey questions, and translations. Use before changing a guide's or survey's copy, steps, questions, buttons, targeting, settings, or translations.
x-amp-flags: [mcp-run-amp]
---

# Edit Guides and Surveys

All guide and survey reads and writes go through `run_amp`, which calls the Amplitude Developer API with the user's MCP credentials. Call them guides and surveys, not "nudges".

## Before you write

- **Project:** use `get_amplitude_context` when the project isn't known. Ask the user rather than guessing.
- **Parameters:** check them before the first call of each command, for example `{"command": ["help", "guides", "update"]}`. The help output includes the full step and content block schema.
- **Find the item:** `["guides", "list"]` or `["surveys", "list"]` with `project`. Filter with `platform`, `created_by`, `created_after` or `created_before`, and page with `limit` and `cursor`.
- **Read the draft:** `["guides", "get"]` with `project`, `guide` and `include-unpublished-changes: "true"`, or `["surveys", "get"]` with `survey`. Without that flag you get the live version, which may differ from the draft you're about to change.

## Writes

- **Draft only.** Every write changes the draft. Publishing happens in the Amplitude app, so say so and link the item's `url` from the response.
- **Update:** `["guides", "update"]` or `["surveys", "update"]`.
  - `latest-version` is required: pass `latest_version` from the get you just did.
  - A 409 means someone else changed the item since you read it. Get it again, reapply your change, and retry once.
- **Send only the fields you change.** To edit steps, send `variants` back with every variant and step `id` kept. An item without an `id` is created as new.
- **Create:** `["guides", "create"]` or `["surveys", "create"]` with `project` and `title`, plus optional `platform` and `variants`. New items are drafts.
- **Archive:** `["guides", "archive"]` or `["surveys", "archive"]`. This only works for items that were never published.
  - Run it with `dry-run: "true"` first.
  - Then run it with `allowDestructive: true`, after the user confirms.
- **Retries aren't safe.** A retried create makes a duplicate. After an ambiguous failure, list or get before you try again.
- **Objects and arrays as flags:** pass them as JSON strings, for example `"variants": "[...]"`.

## Step content

A step has a `title`, a `form_factor` (`modal`, `popover`, `tooltip`, `banner`, `pin`, `card`, `checklist`) and `content`, an array of blocks rendered top to bottom.

- **Block shape:** `{uuid, type, meta}`, with `meta` keys in camelCase.
- **Edit in place:** change the block you need and send the whole `content` array back.
- **Keep each block's `uuid`.** Survey responses are keyed by it. Give a new block a new v4 UUID.

| `type` | `meta` |
|---|---|
| `markdown` | `value` (Markdown; inline HTML is sanitized), optional `alignment` |
| `button` | `label`, `buttonType` (`primary`, `secondary`, `snooze`), `action` |
| `image` | `src`, `filename`, `size`, optional `altText` |
| `video` | `type: "url"`, `src` |
| `survey_text`, `survey_text_short` | `prompt` is the input's placeholder, not the question. Put the question in a `markdown` block or the step `title`. |
| `survey_list` | `options`, `listType` (`single`, `multiple`), `displayType` (`list`, `dropdown`, `grid`) |
| `survey_rating` | `type` (`stars`, `numbers`, `emojis`, `nps`), `options`, `lowerLabel`, `upperLabel`; `emojis` when the type is `emojis` |
| `survey_hidden` | `label`, `source` (`{type: "static", value}` or `{type: "event_property", property}`) |

**Question validation:** questions take an optional `validation.required: {value, message}`. A required question needs a `message`.

**Button actions:**
- `step_forward`, `step_back`, `complete`, `dismiss`
- `link` with `value` (the URL) and `operation` (`self` or `blank`)
- `go_to_step` with `value` (the step id)
- `snooze`
- `no_action`

A button's `actions` field is an action sequence that overrides `action`. If you change `action` on a button that has one, update `actions.navigation` to match, or remove `actions`. Leave action types you don't recognize unchanged.

## Translations

Translations are stored per variant, as locale → translation key → text. The default locale is the content itself. Edit it with the step content, not with translations.

- **Read first:** `get` with `include-unpublished-changes: "true"` and `include-translations: "true"`. The response adds:
  - `localization`: the project's `default_locale` and the `locales` you can write.
  - Per variant, `translations`: what is stored now.
  - Per variant, `translation_status.sources`: every translatable key with its default-locale text. Translate these values.
  - Per variant, `translation_status.locales.<locale>.missing` and `.outdated`: what is left to do. An outdated key was translated from text that has since changed.
- **Copy keys from `sources`.** Don't build them. They look like `display_title`, `steps[123].title` and `steps[123].blocks[<uuid>].content.markdown`.
- **Write only translations:** `update` with `latest-version` and `variants` set to `[{"id": "<variant id>", "translations": {"fr": {"<key>": "..."}, "de": {...}}}]`. Send only the variants and locales you change, and no `variant` key or content fields. Several locales can go in one call.
- **Merge rules:** keys you leave out keep their translation. `null` for a key clears it; `null` for a locale clears every key in it.
- **Values:** match the source. Keep Markdown and HTML structure, links and `{{...}}` placeholders. `content.survey_list` takes an array of option labels in the source order.
- **New content:** `create` doesn't take translations, and only existing steps and blocks can be translated. Create or edit the content first, read it again, then translate it.
- **Errors:**
  - A 400 names `variants.<i>.translations.<locale>.<key>`. The usual causes are a locale that isn't in `localization.locales` (the user adds languages in project settings), the default locale, or a key that isn't in `sources`.
  - If `localization.enabled` is false, localization is turned off in the project settings and writes return 400. Tell the user to enable it there; don't retry.
- **Confirm:** the update response includes `translation_status`. Report which locales still have `missing` or `outdated` keys.

## Block-builder steps

A step with `content_v2` was built in the block builder. The dashboard and SDK render that tree and ignore `title` and `content`. Unless `help` shows `content_v2` as a writable field, don't edit those steps through the API. Tell the user to edit them in the app.

## Confirm the result

Read the item again with `include-unpublished-changes: "true"`, then summarize what changed and link the `url`.
