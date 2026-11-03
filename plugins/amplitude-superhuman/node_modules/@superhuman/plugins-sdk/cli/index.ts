#!/usr/bin/env node

import type {Argv} from 'yargs';
import {ConnectorAccessOptions} from './connector_access';
import {DEFAULT_API_ENDPOINT} from './config_storage';
import {DEFAULT_GIT_TAG} from './config_storage';
import {DEFAULT_MAX_ROWS} from '../testing/execution';
import {DEFAULT_OAUTH_SERVER_PORT} from '../testing/auth';
import {DEFAULT_TIMER_STRATEGY} from './config_storage';
import {PackSettingsUpdateOptions} from './pack_settings';
import {Tools} from './extensions';
import {backfillFromPackConfig} from './helpers';
import {handleAgentChat} from './agent_chat';
import {handleAgentInstall} from './agent_install';
import {handleAgentLogs} from './agent_logs';
import {handleAuth} from './auth';
import {handleBuild} from './build';
import {handleClone} from './clone';
import {handleCreate} from './create';
import {handleExecute} from './execute';
import {handleExtensions} from './extensions';
import {handleGetPackSettings} from './pack_settings';
import {handleInit} from './init';
import {handleLink} from './link';
import {handleRegister} from './register';
import {handleRelease} from './release';
import {handleSetOption} from './set_option';
import {handleUpdatePackSettings} from './pack_settings';
import {handleUpload} from './upload';
import {handleValidate} from './validate';
import {handleWhoami} from './whoami';
import {tryGetIvm} from '../testing/ivm_wrapper';
import yargs from 'yargs';

const ApiTokenArg = {
  string: true,
  alias: 't',
  desc: 'API token to use for the operation. Use the `register` command to define a default token.',
};

const ApiEndpointArg = {
  string: true,
  desc: `API endpoint to use for the operation (default: ${DEFAULT_API_ENDPOINT}). Required for single-tenant instances. Can also be set persistently via \`packs setOption <manifestFile> apiEndpoint <url>\`.`,
  alias: 'codaApiEndpoint',
};

const TimerStrategyArg = {
  string: true,
  desc: `Options: none, error, fake (default: ${DEFAULT_TIMER_STRATEGY}).`,
};

const YesArg = {
  boolean: true,
  alias: 'y',
  default: false,
  desc: 'Skip confirmation prompts. Required in non-interactive environments.',
};

const CommandExamples: Record<string, Array<[string, string]>> = {
  execute: [
    ['$0 execute pack.ts MyFormula "arg1"', 'Run a formula with mocked or live HTTP as configured.'],
    ['$0 execute pack.ts MySyncTable --maxRows 10', 'Sync a table and cap the number of rows.'],
  ],
  auth: [['$0 auth pack.ts', 'Start local auth setup for the Pack.']],
  init: [
    ['$0 init', 'Scaffold pack.ts and related starter files in the current directory.'],
    ['$0 init --yes', 'Skip the overwrite prompt (replaces pack.ts and other starter files).'],
  ],
  extensions: [['$0 extensions vscode', 'Install VS Code snippets for Packs.']],
  clone: [
    ['$0 clone 1234', 'Download the latest Pack Studio source into this directory.'],
    ['$0 clone https://coda.io/p/1234 --yes', 'Overwrite pack.ts without prompting.'],
  ],
  register: [
    ['$0 register --apiToken <token>', 'Validate and store a Pack API token.'],
    ['$0 register --open', 'Open the token creation page, then pass --apiToken to store it.'],
    ['$0 login --apiToken <token>', 'Alias for register: store the token without opening a browser.'],
  ],
  whoami: [['$0 whoami', 'Print the account and token currently registered.']],
  agent: [
    ['$0 agent chat pack.ts "what can you do?"', 'Run your installed agent and print its reply.'],
    ['$0 agent chat pack.ts --new "start over"', 'Start a new chat instead of continuing the last one.'],
    ['$0 agent install pack.ts', 'Install the latest uploaded agent version to your account.'],
    ['$0 agent logs pack.ts', 'Show recent logs for the installed agent.'],
  ],
  build: [
    ['$0 build pack.ts', 'Compile the Pack bundle locally.'],
    ['$0 build pack.ts --outputDir dist', 'Write the bundle to a directory.'],
  ],
  upload: [
    ['$0 upload pack.ts', 'Build and upload a new Pack version.'],
    ['$0 upload pack.ts --notes "Fix formula errors"', 'Upload with version notes.'],
  ],
  create: [
    ['$0 create pack.ts --name "My Pack"', 'Create a Pack and write its id to .coda-pack.json.'],
    ['$0 create pack.ts --allowedAgents', 'Create a connector that no agents can use.'],
    [
      '$0 create pack.ts --allowedAgents 1234 5678',
      'Create a connector that only the specified agent Pack IDs can use.',
    ],
    ['$0 create pack.ts --workspace ws-abc123', 'Create the Pack in a specific workspace.'],
  ],
  settings: [
    ['$0 settings get pack.ts', 'Read Pack settings from the server.'],
    ['$0 settings update pack.ts --name "My Pack"', 'Update Pack settings after confirmation.'],
    ['$0 settings get --packIdOrUrl 1234', 'Read settings for a specific Pack.'],
    [
      '$0 settings update pack.ts --allowedAgents 1234',
      'Replace the whole agent list. Agents not in the list lose access.',
    ],
    ['$0 settings update pack.ts --allowAllAgents', 'Let every agent use the connector.'],
  ],
  link: [
    ['$0 link . 1234', 'Associate this directory with an existing Pack.'],
    ['$0 link . 5678 --yes', 'Overwrite an existing Pack id without prompting.'],
  ],
  validate: [['$0 validate pack.ts', 'Validate the Pack definition without uploading.']],
  release: [
    ['$0 release pack.ts 1.2.3 --notes "Bug fixes"', 'Release a specific uploaded version.'],
    ['$0 release pack.ts --notes "Bug fixes" --yes', 'Release from a non-main branch without prompting.'],
    ['$0 release pack.ts --use-latest --notes "Bug fixes"', 'Release the latest uploaded version.'],
  ],
  setOption: [
    ['$0 setOption pack.ts gitTag true', 'Create git tags on future releases.'],
    ['$0 setOption pack.ts apiEndpoint https://my-company.coda.io', 'Pin a single-tenant API endpoint.'],
  ],
};

export function buildAgentInstallCommand(argv: Argv): Argv {
  // `--version` is the pack version. yargs treats that name as its own version flag unless this runs first.
  return argv.version(false).options({
    version: {
      string: true,
      desc: 'Agent version to install. Defaults to the latest upload.',
    },
    reinstall: {
      boolean: true,
      default: false,
      desc: 'Rebind even if already installed. Needed after changing tools or triggers.',
    },
    yes: YesArg,
    apiToken: ApiTokenArg,
    apiEndpoint: ApiEndpointArg,
  });
}

function withExamples(argv: Argv, examples: Array<[string, string]>): Argv {
  for (const [command, description] of examples) {
    argv.example(command, description);
  }
  return argv;
}

export const commands: yargs.CommandModule[] = [
  {
    command: 'execute <manifestPath> <formulaName> [params..]',
    describe: 'Execute a formula',
    handler: handleExecute as any,
    builder: {
      fetch: {
        boolean: true,
        desc: 'Actually fetch http requests instead of using mocks. Run "packs auth" first to set up credentials.',
        default: true,
      },
      vm: {
        boolean: true,
        desc:
          'Execute the requested command in a virtual machine that mimics the environment the platform uses to execute Packs.' +
          'This defaults to true if the isolated-vm package is installed, and to false if not.',
        default: Boolean(tryGetIvm()),
      },
      dynamicUrl: {
        string: true,
        desc: 'For a dynamic sync table with a variable source location, specify the URL to test here.',
      },
      timerStrategy: TimerStrategyArg,
      maxRows: {
        number: true,
        default: DEFAULT_MAX_ROWS,
        desc: 'For a sync table, the maximum number of rows to sync.',
      },
      allowMultipleNetworkDomains: {
        boolean: true,
        default: false,
        desc: 'Allow executing Packs that use multiple network domains. You must get approval from Superhuman before you can upload these Packs.',
      },
    },
  },
  {
    command: 'auth <manifestPath>',
    describe: 'Set up authentication for a Pack',
    handler: handleAuth as any,
    builder: {
      oauthServerPort: {
        alias: 'oauth_server_port',
        number: true,
        default: DEFAULT_OAUTH_SERVER_PORT,
        desc: 'Port to use for the local server that handles OAuth setup.',
      },
      extraOAuthScopes: {
        alias: 'extra_oauth_scopes',
        string: true,
        default: undefined,
        desc:
          `Scopes to request beyond those listed in the manifest, for specific formulas that ` +
          `need extra permissions. Example: --extra_oauth_scopes='first second third'`,
      },
    },
  },
  {
    command: 'init',
    describe: 'Scaffold a Pack in the current directory',
    builder: {
      yes: YesArg,
      agent: {
        boolean: true,
        default: false,
        desc: 'Scaffold an agent pack (sdk.newAgent()) instead of a formula pack. No git or network template install needed.',
      },
      name: {
        string: true,
        desc: 'Agent name used in the scaffolded pack.ts (with --agent). Defaults to the directory name.',
      },
    },
    handler: handleInit as any,
  },
  {
    command: 'extensions <tools..>',
    describe: 'Installs developer extensions for working with Packs.',
    builder: (yargs: Argv) => {
      yargs.positional('tools', {
        type: 'string',
        choices: Object.values(Tools),
        desc: 'Which tools to install extensions for.',
      });
      return yargs;
    },
    handler: handleExtensions as any,
  },
  {
    command: 'clone <packIdOrUrl>',
    describe: 'Clone an existing Pack that was created using Pack Studio',
    builder: {
      apiToken: ApiTokenArg,
      apiEndpoint: ApiEndpointArg,
      yes: YesArg,
    },
    handler: handleClone as any,
  },
  {
    command: 'register [apiToken]',
    aliases: ['login'],
    describe: 'Register API token to publish a Pack',
    builder: {
      apiEndpoint: ApiEndpointArg,
      open: {
        boolean: true,
        default: false,
        desc: 'Open the API token creation page in a browser.',
      },
      yes: YesArg,
    },
    handler: handleRegister as any,
  },
  {
    command: 'whoami [apiToken]',
    describe: 'Looks up information about the API token that is registered in this environment',
    builder: {
      apiEndpoint: ApiEndpointArg,
    },
    handler: handleWhoami as any,
  },
  {
    command: 'agent',
    describe: 'Build and run agents',
    builder: (yargs: Argv) =>
      yargs
        .command({
          command: 'chat <manifestPath> <prompt>',
          describe: 'Run your installed agent from the terminal and print its reply',
          builder: {
            agentInstanceId: {
              string: true,
              desc: "Installed agent instance to run. Defaults to this pack's install for the caller.",
            },
            tenantId: {
              string: true,
              desc: 'Brain tenant id for the agent install. Defaults to the trigger response.',
            },
            chatId: {
              string: true,
              conflicts: 'new',
              desc: 'Continue this chat instead of the last one. Its agent runs unless --agentInstanceId is set.',
            },
            new: {
              boolean: true,
              conflicts: 'chatId',
              desc: 'Start a new chat instead of continuing the last one.',
            },
            timeout: {
              number: true,
              default: 120,
              desc: 'Seconds to wait for a reply before giving up.',
            },
            apiToken: ApiTokenArg,
            apiEndpoint: ApiEndpointArg,
          },
          handler: handleAgentChat as any,
        })
        .command({
          command: 'install <manifestPath>',
          describe: 'Install an uploaded agent version to your account',
          builder: buildAgentInstallCommand,
          handler: handleAgentInstall as any,
        })
        .command({
          command: 'logs <manifestPath>',
          describe: 'Show recent logs for an installed agent instance',
          builder: {
            tenant: {
              string: true,
              desc: "Tenant id owning the agent instance. Defaults to the caller's tenant for this pack.",
            },
            instance: {
              string: true,
              desc: "Agent instance id. Defaults to this pack's install for the caller.",
            },
            session: {
              string: true,
              desc: 'Show only this agent session. Defaults to the latest session (tail follows new sessions).',
            },
            limit: {
              number: true,
              default: 20,
              desc: 'Maximum log records per fetch.',
            },
            tail: {
              boolean: true,
              default: false,
              desc: 'Keep polling for new logs for up to 5 minutes, then stop (re-run to continue, Ctrl-C exits).',
            },
            apiToken: ApiTokenArg,
            apiEndpoint: ApiEndpointArg,
          },
          handler: handleAgentLogs as any,
        })
        .demandCommand()
        .help(),
    handler: () => {},
  },
  {
    command: 'build <manifestFile>',
    describe: 'Build your Pack locally (not required; for debugging purposes only)',
    builder: {
      outputDir: {
        string: true,
        alias: 'o',
        default: undefined,
      },
      minify: {
        boolean: true,
        default: true,
      },
      timerStrategy: TimerStrategyArg,
      intermediateOutputDirectory: {
        string: true,
        default: undefined,
      },
    },
    handler: handleBuild as any,
  },
  {
    command: 'upload <manifestFile>',
    describe: 'Build and upload your Pack version to the server',
    builder: {
      notes: {
        string: true,
        alias: 'n',
        describe: 'Notes about the contents of this Pack version',
      },
      intermediateOutputDirectory: {
        string: true,
        alias: 'o',
        default: './_upload_build',
      },
      timerStrategy: TimerStrategyArg,
      apiToken: ApiTokenArg,
      apiEndpoint: ApiEndpointArg,
      allowOlderSdkVersion: {
        boolean: true,
        desc:
          'Not recommended. Allows uploading a Pack build that uses an older version of the ' +
          'SDK than the prior Pack build.',
        default: false,
      },
    },
    handler: handleUpload as any,
  },
  {
    command: 'create <manifestFile>',
    describe: 'Register a new Pack with the server',
    builder: {
      name: {
        string: true,
        alias: 'n',
        describe: 'The name of the Pack. Can be set later in the UI.',
      },
      description: {
        string: true,
        alias: 'd',
        describe: 'A description of the Pack. Can be set later in the UI.',
      },
      workspace: {
        string: true,
        alias: 'w',
        describe: 'The workspace ID, or workspace URL that you want your Pack to be created under.',
      },
      ...ConnectorAccessOptions,
      apiToken: ApiTokenArg,
      apiEndpoint: ApiEndpointArg,
    },
    handler: handleCreate as any,
  },
  {
    command: 'settings',
    describe:
      'Read and update the Pack listing fields used in the Superhuman Store and Go. To change the Docs and Coda Gallery listing, use Pack Studio.',
    builder: (yargs: Argv) =>
      yargs
        .command({
          command: 'get [manifestFile]',
          describe: 'Read Pack settings',
          builder: {
            manifestFile: {string: true, default: 'pack.ts', describe: 'Pack definition file.'},
            packIdOrUrl: {
              string: true,
              requiresArg: true,
              describe: 'Pack ID or URL. Overrides the ID in .coda-pack.json.',
            },
            apiToken: ApiTokenArg,
            apiEndpoint: ApiEndpointArg,
          },
          handler: handleGetPackSettings as any,
        })
        .command({
          command: 'update [manifestFile]',
          describe:
            'Update the Pack listing fields used in the Superhuman Store and Go. To change the Docs and Coda Gallery listing, use Pack Studio.',
          builder: {
            manifestFile: {string: true, default: 'pack.ts', describe: 'Pack definition file.'},
            packIdOrUrl: {
              string: true,
              requiresArg: true,
              describe: 'Pack ID or URL. Overrides the ID in .coda-pack.json.',
            },
            ...PackSettingsUpdateOptions,
            yes: YesArg,
            apiToken: ApiTokenArg,
            apiEndpoint: ApiEndpointArg,
          },
          handler: handleUpdatePackSettings as any,
        })
        .demandCommand(1),
    handler: () => {},
  },
  {
    command: 'link <manifestDir> <packIdOrUrl>',
    describe: 'Link to a pre-existing Pack ID on the server',
    builder: {
      apiToken: ApiTokenArg,
      apiEndpoint: ApiEndpointArg,
      yes: YesArg,
    },
    handler: handleLink as any,
  },
  {
    command: 'validate <manifestFile>',
    describe: 'Validate your Pack definition',
    builder: {
      checkDeprecationWarnings: {
        boolean: true,
        desc: 'Also check for warnings about deprecated properties and features that will become errors in a future SDK version.',
        default: true,
      },
      checkConnectors: {
        boolean: true,
        desc: 'For agent packs, check granted connector pack IDs against the server (needs a token). Pass --no-checkConnectors to skip.',
        default: true,
      },
      apiToken: ApiTokenArg,
      apiEndpoint: ApiEndpointArg,
    },
    handler: handleValidate as any,
  },
  {
    command: 'release <manifestFile> [packVersion]',
    describe:
      'Set the Pack version that is installable for users. You may specify a specific version, ' +
      'or omit a version to use the version currently in the manifest file. ' +
      'The version must always be higher than that of any previous release.',
    builder: {
      notes: {
        string: true,
        alias: 'n',
        describe: 'Notes about the contents of this Pack release',
        demandOption: 'Please provide release notes, which will be shown to Pack users to understand the release.',
      },
      gitTag: {
        boolean: true,
        alias: 'g',
        describe: `Create a git tag for this release (default: ${DEFAULT_GIT_TAG}). Can also be enabled by default via \`packs setOption <manifestFile> gitTag true\``,
      },
      apiToken: ApiTokenArg,
      apiEndpoint: ApiEndpointArg,
      yes: YesArg,
      useLatest: {
        boolean: true,
        default: false,
        desc: 'Release the latest uploaded version when the manifest has no version.',
      },
    },
    handler: handleRelease as any,
  },
  {
    command: 'setOption <manifestFile> <option> <value>',
    describe: 'Set a persistent build option for the pack (.coda-pack.json)',
    handler: handleSetOption as any,
  },
];

if (require.main === module) {
  let cli = yargs.parserConfiguration({'parse-numbers': false}).middleware(backfillFromPackConfig);
  for (const cmd of commands) {
    const name = (cmd.command as string).split(' ')[0];
    cli = cli.command({
      ...cmd,
      builder: (argv: Argv) => {
        let next = argv;
        if (typeof cmd.builder === 'function') {
          next = cmd.builder(argv) as Argv;
        } else if (cmd.builder) {
          next = argv.options(cmd.builder);
        }
        return withExamples(next, CommandExamples[name] ?? []);
      },
    });
  }
  void cli.demandCommand().strict().help().argv;
}
