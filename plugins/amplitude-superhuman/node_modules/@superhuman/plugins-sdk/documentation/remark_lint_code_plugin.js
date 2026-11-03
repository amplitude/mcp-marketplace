// remark-lint-code does not await handlers, so snippet linting must be synchronous.
// Oxlint 1.83 cannot lint text from stdin, and each --type-aware process spends
// most of its time starting up. Queue every fence and lint them in one process
// per config when messages are read, after remark has parsed every file.
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const sdkRoot = path.resolve(__dirname, '..');
const oxlintBin = path.join(sdkRoot, 'node_modules/.bin/oxlint');
const pendingSnippets = [];
const armedFiles = new WeakSet();
let flushingPending = false;

const styleConfigs = {
  sample: '.oxlintrc.docs.jsonc',
  source: '.oxlintrc.docs-source.jsonc',
};

module.exports = function () {
  return function (node, file) {
    if (skipped(node)) return;
    lintSnippets([{node, file, code: node.value}]);
  };
};

// Attacher for .remarkrc.mjs. Replaces remark-lint-code for ```ts fences.
function lintTypeScriptFences() {
  return function (tree, file) {
    armFile(file);
    visitCodeNodes(tree, node => {
      if (node.lang !== 'ts' || skipped(node)) return;
      pendingSnippets.push({node, file, code: node.value});
    });
  };
}
module.exports.lintTypeScriptFences = lintTypeScriptFences;

function armFile(file) {
  if (armedFiles.has(file)) return;
  armedFiles.add(file);
  const messages = Array.isArray(file.messages) ? file.messages : [];
  // Bind push so later rules can record messages without starting oxlint.
  // `vfile-statistics` reads `length` after each file, before the rest are parsed.
  // The reporter iterates the list once every file has been queued.
  file.messages = new Proxy(messages, {
    get(target, property, receiver) {
      if (property === 'push') return target.push.bind(target);
      if (property === Symbol.iterator) flushPendingSnippets();
      return Reflect.get(target, property, receiver);
    },
  });
}

function flushPendingSnippets() {
  if (flushingPending || pendingSnippets.length === 0) return;
  flushingPending = true;
  const items = pendingSnippets.splice(0, pendingSnippets.length);
  try {
    lintSnippets(items);
  } finally {
    flushingPending = false;
  }
}

function visitCodeNodes(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'code') {
    visit(node);
    return;
  }
  if (!Array.isArray(node.children)) return;
  for (const child of node.children) visitCodeNodes(child, visit);
}

function lintSnippets(items) {
  if (items.length === 0) return;
  withTempDir(root => {
    const groups = new Map();
    for (const item of items) {
      const style = isSourceStyle(item.file) ? 'source' : 'sample';
      const group = groups.get(style);
      if (group) group.push(item);
      else groups.set(style, [item]);
    }
    for (const [style, group] of groups) {
      const byPath = new Map();
      const files = group.map((item, index) => {
        // A separate tsconfig keeps each fence its own program, matching the
        // old per-fence lint. One oxlint process still type-checks them all.
        const folder = path.join(root, `${style}_${index}`);
        fs.mkdirSync(folder);
        const snippet = path.join(folder, 'snippet.ts');
        fs.writeFileSync(snippet, fixCode(item.code));
        fs.writeFileSync(path.join(folder, 'tsconfig.json'), JSON.stringify({
          extends: path.relative(folder, path.join(sdkRoot, 'tsconfig.json')),
          include: ['snippet.ts'],
          exclude: [],
        }));
        byPath.set(path.resolve(snippet), item);
        return snippet;
      });
      applyDiagnostics(runOxlint(files, styleConfigs[style], root), byPath, root);
    }
  });
}

function runOxlint(files, config, cwd) {
  let output;
  try {
    output = execFileSync(oxlintBin, [
      '--config', path.join(sdkRoot, config),
      '--disable-nested-config', '--type-aware', '--format', 'json', ...files,
    ], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (error) {
    if (error.status !== 1 || !error.stdout) throw error;
    output = error.stdout;
  }
  const result = JSON.parse(output);
  if (!Array.isArray(result.diagnostics)) throw new Error('Missing oxlint diagnostics.');
  return result.diagnostics;
}

function applyDiagnostics(diagnostics, byPath, cwd) {
  for (const message of diagnostics) {
    if (message.message.startsWith('Error running JS plugin.')) throw new Error(message.message);
    const item = byPath.get(path.resolve(cwd, message.filename));
    if (!item) throw new Error(`Unexpected oxlint file: ${message.filename}`);
    const span = message.labels?.find(label => label.span)?.span;
    const pos = {
      line: item.node.position.start.line + (span?.line ?? 1),
      column: span?.column ?? 1,
    };
    const text = `${message.message} [${message.code ?? 'oxlint'}]`;
    if (message.severity === 'warning') {
      item.file.message(text, pos);
    } else {
      try {
        item.file.fail(text, pos);
      } catch (error) {
        // VFile records the failure before throwing; report every diagnostic.
      }
    }
  }
}

function isSourceStyle(file) {
  return [
    'docs/development/testing.md',
    'docs/development/libraries.md',
  ].some(relative => path.resolve(file.path) === path.join(sdkRoot, relative));
}

function skipped(node) {
  return node.meta?.split(/\s+/).includes('no_lint');
}

function withTempDir(callback) {
  const directory = fs.mkdtempSync(path.join(sdkRoot, '.oxlint-'));
  try {
    return callback(directory);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

function fixCode(code) {
  return code
    .replaceAll('{% raw %}', '')
    .replaceAll('{% endraw %}', '')
    .trim()
    .replace(/^\w+\:(.*),$/ms, '// oxlint-disable-next-line func-style\nlet value = $1;')
    .replace(/^--8<-- ".*"$/ms, '');
}
