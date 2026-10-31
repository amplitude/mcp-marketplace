# Amplitude x Superhuman

This directory contains multiple plugins (connectors and agents) that intersect Amplitude with Superhuman.

## Prerequisites

- A Superhuman account provisioned with developer capabilities
- An Amplitude project with MCP enabled
- A local install of Node.js 22 (Node 23 and newer abort on Windows when the packs CLI exits)

## Lexicon & Reserved Files

Superhuman imbues the following terms with specific meaning:

| Term | Meaning |
| :--- | :--- |
| Plugin | Developer-facing package that constitutes either a connector or an agent. Plugins are intersection points between Superhuman and third parties like Amplitude. |
| Connector | A connector an MCP server.  Superhuman serves as the MCP client. |
| Agent | A workflow with instructions and triggers. |
| Pack | The [former term](https://docs.superhuman.com/packs/build/latest/blog/2026/10/22/packs-to-plugins/) for a plugin. This term is still used throughout the SDK. |

Superhuman generates the following files (which cannot be renamed) when building and publishing packs:
- `.coda.json` is an API token file. It should be gitignored.
- `.coda-pack.json` identifies that pack once it has been pushed to Superhuman's server. It lives in the same directory as the Typscript file from which it was generated.

## Installing the SDK

Run the following commands on your local machine to install Superhuman's SDK.

```bash
mkdir {plugin-directory}
cd {plugin-directory}
npm init -y
npm install --save-dev @superhuman/plugins-sdk@latest
npx packs init
```

## Developing a New Plugin

1. Write a typscript file that constitutes either a [connector](https://docs.superhuman.com/packs/build/latest/tutorials/build/mcp/#write-the-code) or an [agent](https://docs.superhuman.com/@hector/go-agent-development-guide/sdk-documentation-31).
1. Compile the plugin locally.
   ```bash
   npx packs validate {plugin-filepath}.ts
   npx packs build {plugin-filepath}.ts
   ```
   `validate` checks the agent definition and `build` compiles it locally. Neither command contacts Amplitude, triggers the agent, or pushes the agent to Superhuman's server.
1. Register an API token.
   ```bash
   npx packs register --open
   ```
   In the browser dialog, name the token and generate it. Do not set a Pack ID. Paste the token back into the CLI. This creates a `.coda.json` file containing the API key, which should be gitignored.
1. Create the plugin on Superhuman's server then upload its source.
   ```bash
   npx packs create {plugin-filepath}.ts --name "{Friendly Name}" --description "{Description}"
   npx packs upload {plugin-filepath}.ts --notes "{Version Notes}"
   ```
   This creates a `.coda-pack.ts` file in the same directory.  Do not modify this file, as it's used to identify the plugin on Superhuman's server.

## Testing a Plugin

To test a connector:
1. Add the connector to [Superhuman Go](https://go.superhuman.com/connectors).
1. Start a new chat and ask a question that is answerable by the connector.

To test an agent:
1. Add the agent in Superhuman Go from the [agent directory](https://go.superhuman.com/agent-directory).
1. Attempt to trigger the agent from Superhuman Mail or https://textarea.org.  Superhuman Docs does not currently support the while-writing trigger, so it is not a good testing surface.
1. If the agent does not trigger, open the Superhuman Go writing-suggestions panel and ensure that the agent is active.
1. If the agent is active but not triggering, [test directly](https://go.superhuman.com/agents/70949) in Superhuman Go.  This allows you to circumvent the trigger condition to test prompting the agent.

After testing, review the session logs at `https://docs.superhuman.com/brain/agent/setup/<packId>`.  See Superhuman's [troubleshooting tips](https://docs.superhuman.com/@hector/go-agent-development-guide/troubleshooting-34) for additional testing advice.

## Updating an Existing Plugin

1. Modify the local plugin file as necessary.  Do not modify its corresponding `coda-pack.json` file since it is used to identify the plugin on Superhuman's server.
1. Re-upload the plugin. Uploading a plugin also verifies it, so no need to run a separate verify command. Do not run `npx packs create`, since this will create a new plugin instead of recreating the existing plugin.
   ```bash
    npx packs upload {plugin-filepath}.ts --notes "{Describe the change}"
   ```
1. If you previously added the plugin in Superhuman, modify the pack maker settings to use the most recent version instead of the most recent release.  See [Superhuman's documentation](https://coda.io/packs/build/latest/development/versions/) for the distinction between versions and releases.
1. Iteratively test and modify.

## Releasing a Plugin

1. Navigate to the plugin history at `https://docs.superhuman.com/p/<packId>?section=history`.
1. Release the latest version via the GUI. The ability to release via the CLI is on Superhuman's roadmap.
1. Users' existing installs will be upgraded automatically.  See [Superhuman's documentation](https://coda.io/packs/build/latest/development/versions/#rollout) for details.