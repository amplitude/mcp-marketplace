import {confirmOrFail} from './confirm';
import fs from 'fs-extra';
import {isTestCommand} from './helpers';
import path from 'path';
import {printAndExit} from '../testing/helpers';
import {renderAgentPackTemplate} from './agent_template';
import {spawnProcess} from './helpers';

const PluginsSdkPackageName = '@superhuman/plugins-sdk';
const LegacySdkPackageName = '@codahq/packs-sdk';
const PluginsExamplesPackageName = '@superhuman/plugins-examples';
const PluginsExamplesRepositoryUrl = 'https://github.com/superhuman/plugins-examples.git';
const PluginsExamplesDirectory = `node_modules/${PluginsExamplesPackageName}`;

const GitIgnore = `.coda.json
.coda-credentials.json
`;

function updateMoldSourceMap() {
  // unfortuanately Windows has no grep.
  const packageFileName = 'node_modules/mold-source-map/package.json';
  const lines = fs.readFileSync(packageFileName).toString().split('\n');
  const validLines = lines.filter(line => !line.includes('"main":'));
  fs.writeFileSync(packageFileName, validLines.join('\n'));
}

function addPatches() {
  spawnProcess(`npm set-script postinstall "npx patch-package"`);

  updateMoldSourceMap();

  spawnProcess(`npx patch-package --exclude 'nothing' mold-source-map`);
}

function isGitAvailable(): boolean {
  return spawnProcess('git --version').status === 0;
}

// By no means comprehensive, just an attempt to cover characters that can appear in a package.json declaration.
function escapeShellCmd(cmd: string): string {
  return cmd.replace('>', '\\>').replace('<', '\\<');
}

// Warn before clobbering an existing pack.ts, since init copies the template over it.
function confirmPackOverwrite({yes, example}: {yes?: boolean; example: string}) {
  if (fs.existsSync(path.join(process.cwd(), 'pack.ts'))) {
    confirmOrFail({
      yes,
      prompt: 'A pack.ts file already exists. Do you want to overwrite it? (y/N)?',
      example,
    });
  }
}

async function getCliSdkVersion(): Promise<string> {
  // Since package.json isn't in dist, we grab it from the root directory instead.
  const packageJson = await import(isTestCommand() ? '../package.json' : '../../package.json');
  return packageJson.version as string;
}

// Installs the SDK when missing. A pinned version keeps a stale pre-agent SDK
// from shadowing the scaffold with `sdk.newAgent is not a function`.
async function ensurePluginsSdkInstalled(version?: string) {
  if (spawnProcess(`npm list ${PluginsSdkPackageName} --depth=0`).status !== 0) {
    spawnProcess(`npm install --save ${PluginsSdkPackageName}${version ? `@${version}` : ''}`);
  }
}

async function ensureLegacySdkAliasInstalled() {
  const version = await getCliSdkVersion();
  const packageNames = [PluginsSdkPackageName, LegacySdkPackageName];
  const installed = spawnProcess(`npm list ${packageNames.join(' ')} --depth=0 --json --long`, {stdio: 'pipe'});
  const dependencies = installed.status === 0 ? JSON.parse(installed.stdout.toString()).dependencies : undefined;
  const pluginsSdk = dependencies?.[PluginsSdkPackageName];
  const legacyAlias = dependencies?.[LegacySdkPackageName];
  const hasPluginsSdk = pluginsSdk?.name === PluginsSdkPackageName && pluginsSdk.version === version;
  const hasLegacyAlias = legacyAlias?.name === PluginsSdkPackageName && legacyAlias.version === version;

  if (!hasPluginsSdk || !hasLegacyAlias) {
    // Skip audit here to avoid npm's crash on aliases in unnamed projects (npm/cli#6864).
    spawnProcess(
      `npm install --save-exact ${PluginsSdkPackageName}@${version} ` +
        `${LegacySdkPackageName}@npm:${PluginsSdkPackageName}@${version} --no-audit`,
    );
  }
}

function appendGitIgnore() {
  fs.appendFileSync(path.join(process.cwd(), '.gitignore'), GitIgnore);
}

export async function handleInit({
  yes,
  agent,
  name,
  legacySdkAlias,
}: {yes?: boolean; agent?: boolean; name?: string; legacySdkAlias?: boolean} = {}) {
  if (agent) {
    return handleAgentInit({yes, name});
  }
  confirmPackOverwrite({yes, example: 'packs init --yes'});

  // stdout looks like `8.1.2\n`.
  const npmVersion = parseInt(spawnProcess('npm -v', {stdio: 'pipe'}).stdout.toString().trim().split('.', 1)[0], 10);
  if (npmVersion < 7) {
    // need npm 7 to support "npm set-script"
    throw new Error(`Your npm version is older than 7. Please upgrade npm to at least 7 with "npm install -g npm@7"`);
  }

  let isPluginsExamplesInstalled: boolean;
  try {
    const listNpmPackages = spawnProcess(`npm list ${PluginsExamplesPackageName}`);
    isPluginsExamplesInstalled = listNpmPackages.status === 0;
  } catch (error: any) {
    isPluginsExamplesInstalled = false;
  }

  if (!isPluginsExamplesInstalled) {
    if (!isGitAvailable()) {
      return printAndExit(
        'The packs init command requires git to be installed and available in your path. ' +
          'See https://git-scm.com/downloads for suggested ways to install.',
      );
    }
    const installCommand = `npm install ${PluginsExamplesRepositoryUrl}`;
    spawnProcess(installCommand);
  }

  const packageJson = JSON.parse(fs.readFileSync(path.join(PluginsExamplesDirectory, 'package.json'), 'utf-8'));
  const devDependencies = packageJson.devDependencies;
  const devDependencyPackages = Object.keys(devDependencies)
    .map(dependency => `${dependency}@${devDependencies[dependency]}`)
    .join(' ');
  spawnProcess(escapeShellCmd(`npm install --save-dev ${devDependencyPackages}`));
  if (legacySdkAlias) {
    await ensureLegacySdkAliasInstalled();
  } else {
    await ensurePluginsSdkInstalled();
  }

  // developers may run in NodeJs 16 where some packages need to be patched to avoid warnings.
  addPatches();

  fs.copySync(`${PluginsExamplesDirectory}/examples/template`, process.cwd());
  // npm removes .gitignore files when installing a package, so we can't simply put the .gitignore
  // in the template example alongside the other files. So we just create it explicitly
  // here as part of the init step.
  appendGitIgnore();

  if (!isPluginsExamplesInstalled) {
    const uninstallCommand = `npm uninstall ${PluginsExamplesPackageName}`;
    spawnProcess(uninstallCommand);
  }
}

async function handleAgentInit({yes, name}: {yes?: boolean; name?: string}) {
  const agentName = name ?? path.basename(process.cwd());
  const packPath = path.join(process.cwd(), 'pack.ts');
  confirmPackOverwrite({yes, example: 'packs init --agent --yes'});

  // Agent scaffolding is vendored in this package. Unlike the default path it
  // never shells out to git or github.com, so it works on machines with
  // neither.
  await ensurePluginsSdkInstalled(await getCliSdkVersion());

  fs.writeFileSync(packPath, renderAgentPackTemplate(agentName));
  appendGitIgnore();

  printAndExit(`Scaffolded agent "${agentName}" in pack.ts. Next: packs validate pack.ts`, 0);
}
