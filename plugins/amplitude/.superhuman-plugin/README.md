# Amplitude x Superhuman

This directory is the Amplitude plugin for Superhuman. A plugin is the developer-facing shipping unit that bundles connectors and agents; it is not a user-facing product surface.

## Lexicon & Reserved Files

Superhuman imbues the following terms with specific meaning:

| Term | Meaning |
| :--- | :--- |
| Plugin | Developer-facing package that bundles connectors and agents. This directory is the plugin. |
| Connector | Tools an agent can call. This plugin uses the Amplitude connector and does not define a new one. |
| Agent | A workflow with instructions and triggers. |
| Pack | A Typscript file that defines either a connector or an agent. |

Superhuman generates the following files (which cannot be renamed) when building and publishing packs:
- `.coda.json` is an API token file. It should be gitignored.
- `.coda-pack.json` identifies that pack once it has been pushed to Superhuman's server. It lives in the same directory as the Typscript file from which it was generated.

## Create & Deploy

Prerequisites:
- Node.js 22. Node 23 and newer abort on Windows when the packs CLI exits.
- A Superhuman account that can create agents

Instructions:
1. Compile the agent locally.
   ```bash
   npm install
   npx packs validate {pack-filepath}.ts
   npx packs build {pack-filepath}.ts
   ```
   `validate` checks the agent definition and `build` compiles it locally. Neither command contacts Amplitude, triggers the agent, or pushes the agent to Superhuman's server.
2. Register an API token.
   ```bash
   npx packs register --open
   ```
   In the browser dialog, name the token and generate it. Do not set a Pack ID. Paste the token back into the CLI. This creates a `.coda.json` file containing the API key, which should be gitignored.
3. Create the agent on Superhuman's server then upload its source.
   ```bash
   npx packs create agents/{pack-filepath}.ts --name "{Friendly Name}" --description "{Description}."
   npx packs upload agents/{pack-filepath}.ts --use-latest --notes "{Version Notes}."
   ```
   This creates a `.coda-pack.ts` file in the same directory.

## Test

These checks apply to `ambient-assistant` after it has been uploaded and installed in Superhuman Go with the Amplitude connector connected. The signed-in user needs access to an Amplitude project.

Use Email, Docs, or https://textarea.org. If no underline appears, open the Superhuman Go writing-suggestions panel and confirm **Ambient Assistant** is listed. The agent log shows which connector tools ran.

| Scenario | Input | Expectation |
| --- | --- | --- |
| Named metric or chart | Weekly active users dropped after yesterday's release. | One card cites the matching metric or chart, with the time window and a source link. The sentence is unchanged. |
| Experiment | The onboarding experiment should be ready to call. | One card reports the experiment status returned by Amplitude. It does not claim a winner unless Amplitude returned that result. |
| Unresolvable writing | I will send the notes after lunch. | No underline, no card, and no Amplitude write. |
| Amplitude host | On `app.amplitude.com` or `app.eu.amplitude.com`, write a sentence that names a customer or metric. | The while-writing trigger does not run. Those hosts are listed in `blockedDomains`. |
| No writes | Any scenario above. Inspect the agent log. | The connector is not asked to create, edit, or delete Amplitude content. A confirmation dialog means a mutating tool was called. |

## Update

To update an existing agent:
1. Repeat the upload step.
   ```bash
   npx packs upload agents/{pack-filepath}.ts --use-latest --notes "Describe the change."
   ```
   Do not run `npx packs create` again.
2. Reinstall the agent in Superhuman Go when the upload changes its trigger or the connector it is allowed to call. An installed copy keeps the trigger and connector grant it received at install time.
