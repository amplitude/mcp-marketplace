import './test_helper';
import {SuggestionEndpointRequestJsonSchema} from '../suggestion_schemas';
import {SuggestionEndpointResponseJsonSchema} from '../suggestion_schemas';
import * as fs from 'fs';
import {SuggestionEndpointRequestJsonSchema as generatedRequestSchema} from '../suggestions';
import {SuggestionEndpointResponseJsonSchema as generatedResponseSchema} from '../suggestions';
import {join} from 'path';
import * as ts from 'typescript';
import * as vm from 'vm';
import {z} from 'zod';

describe('published suggestion SDK', () => {
  it('preserves Balanced in the browser bundle', () => {
    const module = {exports: {}};
    vm.runInNewContext(fs.readFileSync(join(__dirname, '../dist/bundle.js'), 'utf8'), {
      module,
      Buffer,
      TextEncoder,
      TextDecoder,
    });
    assert.equal((module.exports as any).ContextualTriggerAssistMode.Balanced, 'balanced');
  });

  it('preserves MCP selection and Balanced mode in consumer declarations', () => {
    const filename = join(__dirname, 'consumer_probe.ts');
    const source = `import {ContextualTriggerAssistMode, newPack, SuggestionProviderType, SuggestionEndpointRequestJsonSchema, SuggestionEndpointResponseJsonSchema} from '../dist';
      import type {AgentTool, AgentConnectorMcpTool} from '../dist/types';
      const mcp: AgentConnectorMcpTool = {toolName: 'search'};
      const tools: AgentTool[] = [{type: 'Pack' as any, packId: 1, mcpTools: [mcp]}];
      const balanced = ContextualTriggerAssistMode.Balanced;
      const request: import('../dist').SuggestionRequest = {text: 'Text'};
      const unavailable: import('../dist').SuggestionResponse = {suggestions: [], unavailable: 'Unsupported'};
      const suggestion: import('../dist').Suggestion = {startOffset: 0, endOffset: 1, original: 'X', title: 'Title', explanation: 'Why'};
      const completed: import('../dist').SuggestionResponse = {suggestions: [suggestion]};
      const nonemptyUnavailable = {suggestions: [suggestion], unavailable: 'Unsupported'};
      // @ts-expect-error An unavailable response cannot contain suggestions, including through a variable.
      const contradictory: import('../dist').SuggestionResponse = nonemptyUnavailable;
      // @ts-expect-error Summary is not part of the published response contract.
      const withSummary: import('../dist').SuggestionResponse = {suggestions: [], summary: {title: 'Clear'}};
      void completed; void contradictory; void withSummary;
      newPack().addSuggestionProvider({type: SuggestionProviderType.Endpoint, name: 'Check', endpointUrl: 'https://example.com/check'});
      void request; void unavailable; void SuggestionEndpointRequestJsonSchema; void SuggestionEndpointResponseJsonSchema;
      void tools; void balanced;`;
    const options: ts.CompilerOptions = {
      noEmit: true,
      strict: true,
      skipLibCheck: false,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      esModuleInterop: true,
      types: [],
    };
    const host = ts.createCompilerHost(options);
    const getSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (path, languageVersion, onError) =>
      path === filename
        ? ts.createSourceFile(path, source, languageVersion)
        : getSourceFile(path, languageVersion, onError);
    const program = ts.createProgram([filename], options, host);
    const errors = ts.getPreEmitDiagnostics(program);
    assert.deepEqual(
      errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n')),
      [],
    );
  });
});

describe('suggestion JSON Schemas', () => {
  const request = z.fromJSONSchema(SuggestionEndpointRequestJsonSchema as z.core.JSONSchema.JSONSchema);
  const response = z.fromJSONSchema(SuggestionEndpointResponseJsonSchema as z.core.JSONSchema.JSONSchema);

  it('publishes schemas generated from the current Zod validators', () => {
    for (const [name, generated, published] of [
      ['suggestion-request', generatedRequestSchema, SuggestionEndpointRequestJsonSchema],
      ['suggestion-response', generatedResponseSchema, SuggestionEndpointResponseJsonSchema],
    ] as const) {
      assert.deepEqual(published, generated);
      for (const directory of ['schemas', 'dist/schemas']) {
        assert.deepEqual(
          JSON.parse(fs.readFileSync(join(__dirname, '..', directory, name + '.json'), 'utf8')),
          generated,
        );
      }
    }
  });

  it('accepts exact request text without a protocol version', () => {
    assert.deepEqual(request.parse({text: '😀 Repeated. Repeated.\n'}), {text: '😀 Repeated. Repeated.\n'});
    assert.isFalse(request.safeParse({text: 'Text', protocolVersion: 1}).success);
  });

  it('publishes closed unavailable responses as standalone JSON', () => {
    const schema = JSON.parse(fs.readFileSync(join(__dirname, '../dist/schemas/suggestion-response.json'), 'utf8'));
    assert.deepEqual(schema, SuggestionEndpointResponseJsonSchema);
    assert.equal(schema.anyOf[1].properties.suggestions.maxItems, 0);
  });

  it('publishes the safe-integer ceiling for offsets without treating it as a text-size limit', () => {
    const schema = JSON.parse(fs.readFileSync(join(__dirname, '../dist/schemas/suggestion-response.json'), 'utf8'));
    const offsets = schema.anyOf[0].properties.suggestions.items.properties;
    // Inspect JSON directly: fromJSONSchema adds safe-integer bounds even when they are absent.
    assert.equal(offsets.startOffset.maximum, Number.MAX_SAFE_INTEGER);
    assert.equal(offsets.endOffset.maximum, Number.MAX_SAFE_INTEGER);
    const suggestion = {startOffset: 0, endOffset: 1, original: 'X', title: 'Title', explanation: 'Why'};
    for (const field of ['startOffset', 'endOffset']) {
      assert.isTrue(response.safeParse({suggestions: [{...suggestion, [field]: Number.MAX_SAFE_INTEGER}]}).success);
      assert.isFalse(
        response.safeParse({suggestions: [{...suggestion, [field]: Number.MAX_SAFE_INTEGER + 1}]}).success,
      );
      assert.isFalse(response.safeParse({suggestions: [{...suggestion, [field]: 0.5}]}).success);
    }
  });

  it('distinguishes clean checks and unavailable checks', () => {
    assert.deepEqual(response.parse({suggestions: []}), {suggestions: []});
    assert.deepEqual(response.parse({suggestions: [], unavailable: 'Unsupported language'}), {
      suggestions: [],
      unavailable: 'Unsupported language',
    });
  });

  for (const raw of [
    {suggestions: [], unavailable: ''},
    {suggestions: [], unavailable: '   '},
    {suggestions: [], unavailable: 'x'.repeat(201)},
    {suggestions: [], summary: {title: 'Clear'}},
    {
      suggestions: [{startOffset: 0, endOffset: 1, original: 'X', title: 'Title', explanation: 'Why'}],
      unavailable: 'Unsupported',
    },
    {suggestions: [], extra: true},
  ]) {
    it(`rejects contradictory or malformed responses: ${JSON.stringify(raw).slice(0, 80)}`, () => {
      assert.isFalse(response.safeParse(raw).success);
    });
  }

  it('documents and validates suggestion fields', () => {
    const suggestion = {
      startOffset: 3,
      endOffset: 12,
      original: 'Repeated.',
      title: 'Title',
      explanation: 'Why',
      replacement: '',
    };
    assert.deepEqual(response.parse({suggestions: [suggestion]}), {suggestions: [suggestion]});
    assert.isFalse(response.safeParse({suggestions: [{...suggestion, startOffset: -1}]}).success);
    assert.isFalse(response.safeParse({suggestions: [{...suggestion, importance: 'high'}]}).success);
  });
});
