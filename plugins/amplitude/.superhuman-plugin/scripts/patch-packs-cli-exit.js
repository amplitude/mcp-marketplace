const fs = require('fs');
const path = require('path');

// Node 24 on Windows aborts in libuv if process.exit() runs while the CLI's
// HTTP socket is still closing. https://github.com/nodejs/node/issues/56645
const target = path.join(
  __dirname,
  '..',
  'node_modules',
  '@codahq',
  'packs-sdk',
  'dist',
  'testing',
  'helpers.js',
);
const original = `function printAndExit(msg, exitCode = 1) {
    (0, exports.print)(msg);
    return process.exit(exitCode);
}`;
const patched = `function printAndExit(msg, exitCode = 1) {
    (0, exports.print)(msg);
    if (process.platform === 'win32') {
        setTimeout(() => process.exit(exitCode), 250);
        return;
    }
    return process.exit(exitCode);
}`;

const source = fs.readFileSync(target, 'utf8');
if (source.includes(patched)) {
  process.exit(0);
}
if (!source.includes(original)) {
  console.error(`Could not patch ${target}: printAndExit no longer matches the expected source.`);
  process.exit(1);
}
fs.writeFileSync(target, source.replace(original, patched));
