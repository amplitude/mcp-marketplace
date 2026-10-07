# Amplitude context plugin

Developer-facing Superhuman plugin for the Amplitude context agent. The agent watches Email and Docs while someone is writing. When the text names a customer, feature, metric, chart, experiment, release, or product-performance claim, it shows one informational card with current Amplitude data.

The Amplitude connector is already published and is not defined in this directory:

- Listing: https://superhuman.com/store/connectors/amplitude-56421
- Connector ID: `56421`

This directory is the shipping unit. Superhuman calls that unit a plugin. It contains the agent and declares the connector the agent may use.

## Legacy SDK names

The early-access toolchain still uses the former "pack" vocabulary. Those names stay only where the SDK requires them:

| In this repository | Required by the current SDK |
| --- | --- |
| `plugin.ts` | `export const pack` |
| Amplitude connector ID `56421` | `packId` |
| `npx packs …` | `@codahq/packs-sdk` and the `packs` command |
| Server link created by `packs create` | `.coda-pack.json` |

## Requirements

- Node.js 22 or newer
- A Superhuman account that can create plugins
- The Amplitude connector connected in Superhuman Go after the agent is installed

## Local checks

From this directory:

```bash
npm install
npm run validate
npm run build
```

`validate` imports the agent and checks the SDK definition. `build` compiles it locally. Neither command contacts Amplitude or runs the while-writing behavior.

## Publish

Register a token once in this directory. The command stores it in `.coda.json`, which is gitignored.

```bash
npx packs register --open
```

Create the remote plugin once. The CLI writes `.coda-pack.json` with the new plugin's server ID. Commit that file so later uploads target the same plugin.

```bash
npx packs create plugin.ts \
  --name "Amplitude Context" \
  --description "Shows current Amplitude context beside customer, metric, experiment, and product claims while you write."
```

Upload a revision after each change to `plugin.ts`. Each upload creates a new version.

```bash
npx packs upload plugin.ts --notes "Initial version."
```

Installed copies keep the triggers and tool grants they received at install time. After an upload changes the trigger or the connector grant, reinstall the agent to pick up that change.

## Install

1. Open https://go.superhuman.com.
2. In the Agents section, browse agents and search for **Amplitude Context**.
3. Open it and install it.
4. On the agent settings screen, connect the Amplitude connector.

## Manual testing

Superhuman does not execute this README. After the agent is uploaded and installed, a person runs these scenarios in a writing surface and compares the result with the expected behavior.

`npm run validate` and `npm run build` do not perform this check. Behavioral testing starts only after install, with the Amplitude connector connected and a project the signed-in user can read.

Use https://textarea.org, or an Email or Docs surface. If underlines do not appear, open the Superhuman Go writing-suggestions panel and confirm **Amplitude Context** is listed. Agent logs show which connector tools ran.

### A named account produces one card

Input:

```text
Acme's adoption looks healthy this quarter.
```

Expected:

- The agent runs without a chat request.
- The account name is underlined.
- One card states a sourced Amplitude finding, the time window, and a link.
- The sentence is unchanged.

### A named metric or chart produces one card

Input:

```text
Weekly active users dropped after yesterday's release.
```

Expected:

- One card cites the matching metric or chart from Amplitude.
- The card includes the time window and a source link.
- The sentence is unchanged.

### An experiment reference produces one card

Input:

```text
The onboarding experiment should be ready to call.
```

Expected:

- One card reports the experiment status returned by Amplitude.
- The card does not claim a winner unless Amplitude returned that result.

### Unresolvable writing produces no card

Input:

```text
I will send the notes after lunch.
```

Expected:

- No underline.
- No card.
- No Amplitude write.

### A repeated reference produces one card

Input:

```text
Acme renewed. I still need to confirm Acme's usage before the call.
```

Expected:

- One card for Acme, not two.

### Partial current-day data is labeled partial

Use a metric whose current day is still in progress.

Expected:

- The card does not treat the incomplete day as a full day.
- The card says the number is partial.

### Amplitude pages stay quiet

Open a page on `app.amplitude.com` or `app.eu.amplitude.com` and write a sentence that would otherwise qualify.

Expected:

- The while-writing trigger does not run. Those hosts are listed in `blockedDomains`.

### Writes do not run

For any scenario above, confirm in the agent log that the connector was not asked to create, edit, or delete Amplitude content. A confirmation dialog during the unprompted pass means a mutating tool was called, which this agent is instructed not to do.
