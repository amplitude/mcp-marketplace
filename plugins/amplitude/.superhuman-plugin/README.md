# Amplitude x Superhuman

This directory is the Amplitude plugin for Superhuman. A plugin is the developer-facing shipping unit. It is not a user-facing product surface.

The plugin holds one or more agents. Each agent is a sibling directory with its own instructions, trigger, and server ID. Agents in this plugin use the published Amplitude connector:

- Listing: https://superhuman.com/store/connectors/amplitude-56421
- Connector ID: `56421`

`ambient-assistant/` is the agent that exists today. It watches Email and Docs while someone is writing. When the text names a customer, feature, metric, chart, experiment, release, or product-performance claim, it shows one informational card with current Amplitude data.

Add another agent by creating a sibling directory with `agent.ts` and `agent.json`, then running `./deploy.sh create <agent>`. Do not add a second agent to an existing `agent.ts`. One upload registers one agent.

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
| `./deploy.sh` | `npx packs` and `@codahq/packs-sdk` |
| An agent's server ID | `.coda-pack.json` |

`.coda.json` is the API token file. It is a credential, not the agent's server ID.

## Local development

Requirements:

- Node.js 22 or newer
- A Superhuman account that can create agents

From this directory:

```bash
npm install
./deploy.sh validate ambient-assistant
./deploy.sh build ambient-assistant
```

`validate` checks the agent definition. `build` compiles it. Neither command contacts Amplitude or runs the while-writing trigger. Installing the agent in Superhuman Go happens after deployment.

## Manual testing

These checks apply to `ambient-assistant` after `./deploy.sh create` or `./deploy.sh update`, and after the agent is installed in Superhuman Go with the Amplitude connector connected. The signed-in user needs access to an Amplitude project.

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

`./deploy.sh` reads the listing name and description from the agent's `agent.json`. It keeps the API token in `.coda.json` at this plugin root. Each agent's server ID stays in that agent's `.coda-pack.json`.

The first `create` opens a browser so you can register a Superhuman token. Later commands reuse `.coda.json`.

`./deploy.sh update` makes a new version available to the account that uploaded it. `npx packs release` is a separate step when that version should be installable more broadly. The script does not release.

### Add a new agent

1. Create a sibling directory containing `agent.ts` and `agent.json`.
2. `agent.json` must include `name` and `description`.
3. Run:

```bash
./deploy.sh create <agent>
```

The script validates, builds, runs `packs create` once, and uploads the initial version. It refuses to create an agent that already has `.coda-pack.json`.

4. Commit the new `.coda-pack.json`.
5. Open https://go.superhuman.com, browse agents, and install the agent by the name in `agent.json`.
6. On the agent settings screen, connect the Amplitude connector.

### Update an existing agent

1. Edit that agent's `agent.ts`.
2. Run:

```bash
./deploy.sh update <agent> "Describe the change."
```

The script validates, builds, and uploads a new version. It does not run `packs create`. Running `packs create` again would store a different server ID in `.coda-pack.json`.

3. Reinstall the agent in Superhuman Go when the upload changes its trigger or the connector it is allowed to call. An installed copy keeps the trigger and connector grant it received at install time.
