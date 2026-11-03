import {SuggestionEndpointRequestJsonSchema} from '../suggestions';
import {SuggestionEndpointResponseJsonSchema} from '../suggestions';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..');
const schemas = [
  ['suggestion-request', SuggestionEndpointRequestJsonSchema],
  ['suggestion-response', SuggestionEndpointResponseJsonSchema],
] as const;
fs.mkdirSync(path.join(root, 'schemas'), {recursive: true});
for (const [name, schema] of schemas) {
  fs.writeFileSync(path.join(root, 'schemas', name + '.json'), JSON.stringify(schema, null, 2) + '\n');
}
