# Amplitude x Superhuman

This directory is the Amplitude plugin for Superhuman. A plugin is the developer-facing shipping unit. It is not a user-facing product surface.

The plugin holds one or more agents. Each agent is a sibling directory with its own instructions, trigger, and server ID. Agents in this plugin use the published Amplitude connector:

- Listing: https://superhuman.com/store/connectors/amplitude-56421
- Connector ID: `56421`

`ambient-assistant/` is the agent that exists today. It watches Email and Docs while someone is writing. When the text names a customer, feature, metric, chart, experiment, release, or product-performance claim, it shows one informational card with current Amplitude data.

Add another agent as a sibling directory with its own `agent.ts`. One upload registers one agent.

## Superhuman lexicon

Superhuman uses three names:

| Term | Meaning |
| --- | --- |
| Plugin | Developer-facing package that bundles connectors, agents, or both. This directory is the plugin. |
| Agent | A workflow with instructions and triggers. `ambient-assistant/` is one agent. |
| Connector | Tools an agent can call. This plugin uses the Amplitude connector and does not define a new one. |

**Pack** is the retired name for this shipping unit. The early-access toolchain has not finished the rename, so these identifiers remain:

| Current meaning | Identifier the SDK still requires |
| --- | --- |
| Agent source | `export const pack` inside `agent.ts` |
| Connector ID `56421` | `packId` |
| The CLI | `npx packs` and `@codahq/packs-sdk` |
| An agent's server ID | `.coda-pack.json` |

`.coda.json` is the API token file. It is a credential, not the agent's server ID.

## Local development

Requirements:

- Node.js 22 or newer
- A Superhuman account that can create agents

From this directory:

```bash
npm install
npx packs validate ambient-assistant/agent.ts
npx packs build ambient-assistant/agent.ts
```

`validate` checks the agent definition. `build` compiles it. Neither command contacts Amplitude or runs the while-writing trigger. Installing the agent in Superhuman Go happens after deployment.

## Manual testing

These checks apply to `ambient-assistant` after it has been uploaded and installed in Superhuman Go with the Amplitude connector connected. The signed-in user needs access to an Amplitude project.

Use Email, Docs, or https://textarea.org. If no underline appears, open the Superhuman Go writing-suggestions panel and confirm **Ambient Assistant** is listed. The agent log shows which connector tools ran.

| Scenario | Input | Expectation |
| --- | --- | --- |
| Named account | `Acme's adoption looks healthy this quarter.` | The agent runs without a chat request. The account name is underlined. One card states a sourced finding, the time window, and a link. The sentence is unchanged. |
| Named metric or chart | `Weekly active users dropped after yesterday's release.` | One card cites the matching metric or chart, with the time window and a source link. The sentence is unchanged. |
| Experiment | `The onboarding experiment should be ready to call.` | One card reports the experiment status returned by Amplitude. It does not claim a winner unless Amplitude returned that result. |
| Unresolvable writing | `I will send the notes after lunch.` | No underline, no card, and no Amplitude write. |
| Repeated reference | `Acme renewed. I still need to confirm Acme's usage before the call.` | One card for Acme, not two. |
| Partial current day | A metric whose current day is still in progress. | The card says the number is partial and does not treat the day as complete. |
| Amplitude host | On `app.amplitude.com` or `app.eu.amplitude.com`, write a sentence that names a customer or metric. | The while-writing trigger does not run. Those hosts are listed in `blockedDomains`. |
| No writes | Any scenario above. Inspect the agent log. | The connector is not asked to create, edit, or delete Amplitude content. A confirmation dialog means a mutating tool was called. |

## Manual deployment

Run these commands from this directory. The first registration stores the API token in `.coda.json` here. `packs create` writes `.coda-pack.json` next to the `agent.ts` it uploads.

Register once:

```bash
npx packs register --open
```

In the browser dialog, name the token and generate it. Do not set a Pack ID. Paste the token back into the CLI.

### Add a new agent

Create the agent on the server once, then upload its source:

```bash
npx packs create ambient-assistant/agent.ts \
  --name "Ambient Assistant" \
  --description "Shows current Amplitude context beside customer, metric, experiment, and product claims while you write."

npx packs upload ambient-assistant/agent.ts --notes "Initial version."
```

For another agent, use that agent's `agent.ts` path and its own name and description. Run `packs create` once per agent. A second run stores a different server ID in `.coda-pack.json`.

Commit the new `.coda-pack.json`.

Open https://go.superhuman.com, browse agents, and install **Ambient Assistant**. On the agent settings screen, connect the Amplitude connector.

### Update an existing agent

```bash
npx packs upload ambient-assistant/agent.ts --notes "Describe the change."
```

Do not run `packs create` again.

Reinstall the agent in Superhuman Go when the upload changes its trigger or the connector it is allowed to call. An installed copy keeps the trigger and connector grant it received at install time.
