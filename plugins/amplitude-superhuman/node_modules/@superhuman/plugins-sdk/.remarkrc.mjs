import {createRequire} from 'node:module';
import remarkLintNoSmartQuotes from './documentation/scripts/remark_lint_no_smart_quotes.mjs';

const require = createRequire(import.meta.url);
const {lintTypeScriptFences} = require('./documentation/remark_lint_code_plugin.js');

export default {
  "plugins": [
    "remark-frontmatter",
    lintTypeScriptFences,
    [
      "remark-lint-no-undefined-references",
      {
        "allow": [
          "x",
          "^1",
          "^2",
          "^3",
          "^4",
          "^5"
        ]
      }
    ],
    [
      "@julian_cataldo/remark-lint-frontmatter-schema",
      {
        "schemas": {
          "./documentation/schemas/frontmatter.yaml": [
            "**/*.md"
          ]
        }
      }
    ],
    [remarkLintNoSmartQuotes],
  ]
};
