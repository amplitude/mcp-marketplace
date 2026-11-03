const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const plugin = require('../../documentation/remark_lint_code_plugin.js');
const lint = plugin();
const {lintTypeScriptFences} = plugin;
const sdkRoot = path.resolve(__dirname, '../..');

function lintSnippet(value, relativePath = 'docs/development/testing.md', meta) {
  const messages = [];
  const report = (message, position) => messages.push({message, position});
  const result = lint({value, meta, position: {start: {line: 10}}}, {
    path: path.join(sdkRoot, relativePath),
    message: report,
    fail: report,
  });
  return {result, messages};
}

test('requires returned promises to be awaited inside try/catch', () => {
  const {messages} = lintSnippet('async function example() {\n  try {\n    return Promise.resolve(1);\n  } catch {\n    return 0;\n  }\n}');
  assert.ok(messages.some(({message}) => message.includes('typescript(return-await)')));
});

test('permits returned awaits inside try/catch but rejects them outside it', () => {
  const allowed = lintSnippet('async function example() {\n  try {\n    return await Promise.resolve(1);\n  } catch {\n    return 0;\n  }\n}');
  assert.deepEqual(allowed.messages, []);
  const rejected = lintSnippet('async function example() {\n  return await Promise.resolve(1);\n}');
  assert.ok(rejected.messages.some(({message}) => message.includes('typescript(return-await)')));
});

test('reports typed diagnostics synchronously at Markdown positions', () => {
  const {result, messages} = lintSnippet('\nPromise.resolve(1);');
  assert.equal(result, undefined);
  const diagnostic = messages.find(({message}) => message.includes('typescript(no-floating-promises)'));
  assert.ok(diagnostic);
  assert.deepEqual(diagnostic.position, {line: 11, column: 1});
});

test('uses single quotes in developer examples and double quotes in samples', () => {
  const single = 'let greeting = \'hello\';';
  const double = 'let greeting = "hello";';
  const quoteErrors = (code, relativePath) => lintSnippet(code, relativePath).messages
    .filter(({message}) => message.includes('stylistic(quotes)'));
  for (const relativePath of ['docs/development/testing.md', 'docs/development/libraries.md']) {
    assert.deepEqual(quoteErrors(single, relativePath), []);
    assert.ok(quoteErrors(double, relativePath).length > 0);
  }
  assert.deepEqual(quoteErrors(double, 'docs/samples/topic/parameter.md'), []);
  assert.ok(quoteErrors(single, 'docs/samples/topic/parameter.md').length > 0);
});

test('skips intentionally incomplete no_lint fences', () => {
  assert.deepEqual(lintSnippet('let value = ;', undefined, 'no_lint').messages, []);
});

test('cleans up temporary directories on success and thrown errors', () => {
  const directories = () => fs.readdirSync(sdkRoot).filter(name => name.startsWith('.oxlint-'));
  const before = directories();
  lintSnippet('let value = 1;');
  assert.deepEqual(directories(), before);
  const failure = new Error('forced failure');
  assert.throws(() => lint({value: '', position: {start: {line: 1}}}, {
    get path() {throw failure;},
  }), error => error === failure);
  assert.deepEqual(directories(), before);
});

test('lints every queued fence in one temporary directory', () => {
  const directories = () => fs.readdirSync(sdkRoot).filter(name => name.startsWith('.oxlint-'));
  const before = directories();
  const original = fs.mkdtempSync;
  let directoriesCreated = 0;
  fs.mkdtempSync = (...args) => {
    directoriesCreated += 1;
    return original.apply(fs, args);
  };
  const sample = fakeFile('docs/samples/topic/parameter.md');
  const source = fakeFile('docs/development/testing.md');
  try {
    lintTypeScriptFences()({
      type: 'root',
      children: [
        {type: 'code', lang: 'ts', meta: 'no_lint', value: 'let value = ;', position: {start: {line: 1}}},
        {type: 'code', lang: 'js', value: 'let =', position: {start: {line: 2}}},
        {type: 'code', lang: 'ts', value: 'Promise.resolve(1);', position: {start: {line: 3}}},
      ],
    }, sample);
    lintTypeScriptFences()({
      type: 'root',
      children: [
        {type: 'code', lang: 'ts', value: 'let greeting = "hello";', position: {start: {line: 4}}},
      ],
    }, source);
    sample.message('from a later plugin', {line: 1, column: 1});
    assert.equal(directoriesCreated, 0);
    const sampleMessages = [...sample.messages];
    const sourceMessages = [...source.messages];
    assert.equal(directoriesCreated, 1);
    assert.deepEqual(directories(), before);
    const floating = sampleMessages.find(({message}) => message.includes('typescript(no-floating-promises)'));
    assert.ok(floating);
    assert.deepEqual(floating.position, {line: 4, column: 1});
    assert.ok(sampleMessages.some(({message}) => message === 'from a later plugin'));
    assert.ok(!sampleMessages.some(({message}) => message.includes('Unexpected token')));
    assert.ok(sourceMessages.some(({message}) => message.includes('stylistic(quotes)')));
  } finally {
    fs.mkdtempSync = original;
    void [...sample.messages];
    void [...source.messages];
  }
});

function fakeFile(relativePath) {
  return {
    path: path.join(sdkRoot, relativePath),
    messages: [],
    message(message, position) {
      const entry = {message, position, fatal: false};
      this.messages.push(entry);
      return entry;
    },
    fail(message, position) {
      const entry = this.message(message, position);
      entry.fatal = true;
      throw entry;
    },
  };
}
