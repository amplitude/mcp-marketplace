import type {Argv} from 'yargs';
import type {CommandBuilder} from 'yargs';
import type {CommandModule} from 'yargs';
import * as Handlebars from 'handlebars';
import type {Options} from 'yargs';
import {commands} from '../../cli';
import * as fs from 'fs';
import path from 'path';

const BaseDir = path.join(__dirname, '../../');
const DocumentationRoot = path.join(BaseDir, 'documentation');
const OutputFile = path.join(BaseDir, 'docs/reference/cli/index.md');
const Template = Handlebars.compile(
  fs.readFileSync(path.join(DocumentationRoot, 'cli_reference_template.md'), 'utf8'),
);

function getOptionType(opt: Options): string {
  if (opt.boolean) {
    return 'boolean';
  }
  if (opt.number) {
    return 'number';
  }
  return 'string';
}

// Add <br> before each newline to preserve line breaks.
function preserveLineBreaks(text: string): string {
  return text.replace(/\n/g, '<br>\n');
}

function formatDefault(value: any): string {
  if (value === undefined) {
    return '';
  }
  return String(value);
}

// Overrides for options whose defaults are dynamic and can't be resolved
// statically at generation time. Keyed by "commandName.optionName", where
// commandName includes subcommands (for example "agent install.version").
const DefaultOverrides: Record<string, string> = {
  'execute.vm': '',
};

interface TemplateCommand {
  name: string;
  command: string;
  describe: string;
  options: object[];
}

// Function builders register subcommands and options by calling methods on a
// yargs instance. Replay those calls so nested commands like `agent install`
// are included alongside top-level commands.
interface ArgvRecorder {
  command(
    commandOrModule: string | CommandModule,
    describe?: CommandModule['describe'],
    builder?: CommandBuilder,
    handler?: CommandModule['handler'],
  ): ArgvRecorder;
  options(defs: Record<string, Options>): ArgvRecorder;
  option(name: string, def: Options): ArgvRecorder;
}

function createArgvRecorder(): {
  argv: ArgvRecorder;
  optionDefs: Record<string, Options>;
  nestedCommands: CommandModule[];
  requiresSubcommand: () => boolean;
} {
  const optionDefs: Record<string, Options> = {};
  const nestedCommands: CommandModule[] = [];
  let requiresSubcommand = false;
  const argv: ArgvRecorder = new Proxy({} as ArgvRecorder, {
    get(_target, prop) {
      if (prop === 'command') {
        return (
          commandOrModule: string | CommandModule,
          describe?: CommandModule['describe'],
          builder?: CommandBuilder,
          handler?: CommandModule['handler'],
        ) => {
          if (typeof commandOrModule === 'string') {
            nestedCommands.push({
              command: commandOrModule,
              describe,
              builder,
              handler: handler ?? (() => {}),
            });
          } else {
            nestedCommands.push(commandOrModule);
          }
          return argv;
        };
      }
      if (prop === 'options') {
        return (defs: Record<string, Options>) => {
          Object.assign(optionDefs, defs);
          return argv;
        };
      }
      if (prop === 'option') {
        return (name: string, def: Options) => {
          optionDefs[name] = def;
          return argv;
        };
      }
      // demandCommand() with no args, or a minimum of at least 1, means this
      // command cannot be invoked on its own.
      if (prop === 'demandCommand') {
        return (min?: number) => {
          if (min === undefined || min >= 1) {
            requiresSubcommand = true;
          }
          return argv;
        };
      }
      return () => argv;
    },
  });
  return {argv, optionDefs, nestedCommands, requiresSubcommand: () => requiresSubcommand};
}

function commandText(command: CommandModule['command']): string {
  if (typeof command === 'string') {
    return command;
  }
  if (command?.length && typeof command[0] === 'string') {
    return command[0];
  }
  return '';
}

// Drop positionals (`<manifestPath>`, `[params..]`) so the heading is the command path.
function commandName(command: string): string {
  return command
    .split(/\s+/)
    .filter(part => part && !part.startsWith('<') && !part.startsWith('['))
    .join(' ');
}

function readBuilder(builder: CommandBuilder | undefined): {
  options: Record<string, Options>;
  subcommands: CommandModule[];
  requiresSubcommand: boolean;
} {
  // CommandBuilder is an option map or a function. A function registers nested
  // commands on the yargs instance, so replay it against the recorder.
  if (typeof builder === 'function') {
    const recorded = createArgvRecorder();
    void builder(recorded.argv as Argv);
    return {
      options: recorded.optionDefs,
      subcommands: recorded.nestedCommands,
      requiresSubcommand: recorded.requiresSubcommand(),
    };
  }
  if (builder) {
    return {options: builder, subcommands: [], requiresSubcommand: false};
  }
  return {options: {}, subcommands: [], requiresSubcommand: false};
}

// Grouping commands, such as `agent`, only dispatch to subcommands.
function isGroupOnly(cmd: CommandModule, subcommands: readonly CommandModule[], requiresSubcommand: boolean): boolean {
  return subcommands.length > 0 && (requiresSubcommand || isEmptyHandler(cmd.handler));
}

function isEmptyHandler(handler: CommandModule['handler']): boolean {
  const source = handler.toString().replace(/\s+/g, '');
  return source === '()=>{}' || source === 'function(){}' || source === 'async()=>{}';
}

function formatAlias(alias: Options['alias']): string {
  const name = typeof alias === 'string' ? alias : alias?.[0];
  if (!name) {
    return '';
  }
  const prefix = name.length > 1 ? '--' : '-';
  return `${prefix}${name}`;
}

function formatOptions(defs: Record<string, Options>, commandKey: string): object[] {
  return Object.entries(defs)
    .filter(([_, opt]) => !opt.hidden)
    .map(([optName, opt]) => {
      const aliasStr = formatAlias(opt.alias);
      const type = getOptionType(opt);
      const overrideKey = `${commandKey}.${optName}`;
      const defaultVal = overrideKey in DefaultOverrides ? DefaultOverrides[overrideKey] : formatDefault(opt.default);
      const description = preserveLineBreaks(opt.desc || opt.describe || '');

      return {
        name: optName,
        aliasStr,
        description,
        type,
        defaultVal,
        required: Boolean(opt.demandOption),
      };
    });
}

function flattenCommands(modules: readonly CommandModule[], parentPath = ''): TemplateCommand[] {
  const flattened: TemplateCommand[] = [];
  for (const cmd of modules) {
    // yargs hides commands whose describe is false.
    if (cmd.describe === false) {
      continue;
    }
    const text = commandText(cmd.command);
    if (!text) {
      continue;
    }
    const name = commandName(text);
    const fullName = parentPath ? `${parentPath} ${name}` : name;
    const fullCommand = parentPath ? `${parentPath} ${text}` : text;
    const {options, subcommands, requiresSubcommand} = readBuilder(cmd.builder);
    if (!isGroupOnly(cmd, subcommands, requiresSubcommand)) {
      flattened.push({
        name: fullName,
        command: fullCommand,
        describe: preserveLineBreaks(cmd.describe ?? ''),
        options: formatOptions(options, fullName),
      });
    }
    flattened.push(...flattenCommands(subcommands, fullName));
  }
  return flattened;
}

function buildTemplateData() {
  return {
    commands: flattenCommands(commands).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

const data = buildTemplateData();
const content = Template(data);
fs.mkdirSync(path.dirname(OutputFile), {recursive: true});
fs.writeFileSync(OutputFile, content);
