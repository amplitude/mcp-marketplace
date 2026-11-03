import './test_helper';
import {PublicApiPackEntrypoint} from '../helpers/external-api/v1';
import {ResponseError} from '../helpers/external-api/coda';
import {commands} from '../cli';
import * as configStorage from '../cli/config_storage';
import * as confirm from '../cli/confirm';
import {confirmOrFail} from '../cli/confirm';
import {createHash} from 'crypto';
import fsExtra from 'fs-extra';
import * as gitHelpers from '../cli/git_helpers';
import {handleAgentInstall} from '../cli/agent_install';
import {handleAgentLogs} from '../cli/agent_logs';
import {handleClone} from '../cli/clone';
import {handleCreate} from '../cli/create';
import {handleGetPackSettings} from '../cli/pack_settings';
import {handleInit} from '../cli/init';
import {handleRegister} from '../cli/register';
import {handleRelease} from '../cli/release';
import {handleUpdatePackSettings} from '../cli/pack_settings';
import {handleValidate} from '../cli/validate';
import * as helpers from '../cli/helpers';
import mockFs from 'mock-fs';
import os from 'os';
import {parsePackSettingsUpdate} from '../cli/pack_settings';
import path from 'path';
import sinon from 'sinon';
import * as testingHelpers from '../testing/helpers';
import {tmpdir} from 'os';
import yargs from 'yargs/yargs';

describe('Headless CLI', () => {
  let exitMessage: string | undefined;
  let exitCode: number | undefined;
  let printAndExitStub: sinon.SinonStub;

  beforeEach(() => {
    exitMessage = undefined;
    exitCode = undefined;
    sinon.stub(testingHelpers, 'print');
    printAndExitStub = sinon.stub(testingHelpers, 'printAndExit').callsFake((msg: string, code: number = 1) => {
      exitMessage = msg;
      exitCode = code;
      const error = new Error(msg);
      (error as any).exitCode = code;
      throw error;
    });
  });

  afterEach(() => {
    mockFs.restore();
    sinon.restore();
  });

  describe('confirmOrFail', () => {
    it('returns immediately when --yes is set', () => {
      confirmOrFail({
        yes: true,
        prompt: 'Overwrite? (y/N)',
        example: 'packs clone 1234 --yes',
        interactive: false,
      });
    });

    it('fails with an example invocation when not interactive', () => {
      try {
        confirmOrFail({
          yes: false,
          prompt: 'Overwrite pack.ts? (y/N)',
          example: 'packs clone 1234 --yes',
          interactive: false,
        });
        assert.fail('expected printAndExit');
      } catch {
        assert.equal(exitCode, 1);
        assert.include(exitMessage, 'Pass --yes to continue without a prompt.');
        assert.include(exitMessage, 'packs clone 1234 --yes');
      }
    });
  });

  describe('create', () => {
    for (const allowedAgentIds of [[], [1234, 5678], undefined]) {
      it(`sets connector access when allowedAgentIds is ${JSON.stringify(allowedAgentIds)}`, async () => {
        const manifestDir = await fsExtra.mkdtemp(path.join(tmpdir(), 'packs-create-'));
        const manifestFile = path.join(manifestDir, 'pack.ts');
        await fsExtra.writeFile(manifestFile, '');
        sinon.stub(configStorage, 'getPackId').returns(undefined);
        const storePackId = sinon.stub(configStorage, 'storePackId');
        const createPack = sinon.stub().resolves({packId: 1234});
        sinon.stub(helpers, 'createCodaClient').returns({createPack} as any);

        try {
          await handleCreate({
            manifestFile,
            name: 'Example',
            apiEndpoint: 'https://coda.io',
            apiToken: 'token',
            allowedAgents: allowedAgentIds,
            $0: '',
            _: [],
          });
        } catch {
          // printAndExit
        } finally {
          await fsExtra.remove(manifestDir);
        }

        assert.isTrue(createPack.calledOnce, exitMessage);
        const request = createPack.firstCall.args[1];
        if (allowedAgentIds !== undefined) {
          assert.deepEqual(Reflect.get(request, 'allowedAgentIds'), allowedAgentIds);
        } else {
          assert.notProperty(request, 'allowedAgentIds');
        }
        assert.isTrue(storePackId.calledOnceWithExactly(manifestDir, 1234, 'https://coda.io'));
      });
    }
  });

  for (const operation of ['create', 'update']) {
    for (const flags of [
      {allowedAgents: [0]},
      {allowedAgents: [-1]},
      {allowedAgents: [1.5]},
      {allowedAgents: [NaN]},
      {allowedAgents: [2147483648]},
      {allowedAgents: [1, 1]},
      {allowedAgents: Array.from({length: 101}, (_, index) => index + 1)},
      {allowAllAgents: true, allowedAgents: [1234]},
    ]) {
      it(`rejects invalid access IDs before ${operation}: ${JSON.stringify(flags)}`, async () => {
        const createClient = sinon.stub(helpers, 'createCodaClient');
        const storePackId = sinon.stub(configStorage, 'storePackId');
        try {
          const args = {
            ...flags,
            manifestFile: '/pack/pack.ts',
            packIdOrUrl: '1234',
            apiEndpoint: 'https://coda.io',
            apiToken: 'token',
            $0: '',
            _: [],
          };
          await (operation === 'create' ? handleCreate(args) : handleUpdatePackSettings(args));
        } catch {
          // printAndExit
        }
        assert.equal(exitCode, 1);
        assert.include(exitMessage, '--allowedAgents');
        assert.isFalse(createClient.called);
        assert.isFalse(storePackId.called);
      });
    }
  }

  for (const operation of ['create', 'update']) {
    for (const {flags, expected} of [
      {flags: [], expected: undefined},
      {flags: ['--allowedAgents'], expected: []},
      {flags: ['--allowedAgents', '1234'], expected: [1234]},
      {flags: ['--allowedAgents', '1234', '5678'], expected: [1234, 5678]},
      {flags: ['--allowedAgents', '1234', '--allowedAgents', '5678'], expected: [1234, 5678]},
      {flags: ['--allowed-agents', '2147483647'], expected: [2147483647]},
      {flags: ['--allowAllAgents'], expected: null},
    ]) {
      it(`parses connector access for ${operation}: ${flags.join(' ')}`, async () => {
        const manifestDir = await fsExtra.mkdtemp(path.join(tmpdir(), 'packs-access-'));
        const manifestFile = path.join(manifestDir, 'pack.ts');
        await fsExtra.writeFile(manifestFile, '');
        sinon.stub(configStorage, 'getPackId').returns(undefined);
        sinon.stub(configStorage, 'storePackId');
        sinon.stub(process.stderr, 'write');
        const createPack = sinon.stub().resolves({packId: 1234});
        const getPack = sinon.stub().resolves({id: 1234, allowedAgentIds: [9012]});
        const updatePack = sinon.stub().resolves({id: 1234});
        sinon.stub(helpers, 'createCodaClient').returns({createPack, getPack, updatePack} as any);
        const args =
          operation === 'create'
            ? ['create', manifestFile]
            : ['settings', 'update', manifestFile, '--packIdOrUrl', '1234', '--name', 'Example', '--yes'];
        try {
          await yargs()
            .parserConfiguration({'parse-numbers': false})
            .command(commands)
            .strict()
            .exitProcess(false)
            .parseAsync([...args, '--apiToken', 'token', '--apiEndpoint', 'https://coda.io', ...flags]);
        } catch {
          // printAndExit
        } finally {
          await fsExtra.remove(manifestDir);
        }
        // A successful exit throws in this test. The create handler then catches that test error.
        assert.equal(printAndExitStub.firstCall.args[1], 0, exitMessage);
        const request = operation === 'create' ? createPack.firstCall.args[1] : updatePack.firstCall.args[2];
        if (expected === undefined) {
          assert.notProperty(request, 'allowedAgentIds');
        } else {
          assert.deepEqual(request.allowedAgentIds, expected);
        }
      });
    }
  }

  describe('Pack settings', () => {
    const tempDirs: string[] = [];

    beforeEach(() => {
      sinon.stub(process.stderr, 'write');
    });

    afterEach(() => {
      for (const dir of tempDirs.splice(0)) {
        fsExtra.removeSync(dir);
      }
    });

    function answerPrompt(answer: string) {
      if (Object.prototype.hasOwnProperty.call(process.stdin, 'isTTY')) {
        sinon.replace(process.stdin, 'isTTY', true);
      } else {
        sinon.define(process.stdin, 'isTTY', true);
      }
      sinon.stub(testingHelpers, 'promptForInput').returns(answer);
    }
    it('reads a Pack by ID', async () => {
      const getPack = sinon.stub().resolves({id: 1234, name: 'Example'});
      sinon.stub(helpers, 'createCodaClient').returns({getPack} as any);

      try {
        await handleGetPackSettings({
          packIdOrUrl: '1234',
          apiEndpoint: 'https://coda.io',
          apiToken: 'token',
          $0: '',
          _: [],
        });
      } catch {
        // printAndExit
      }

      assert.isTrue(getPack.calledOnceWithExactly(1234));
      assert.equal(exitCode, 0);
      assert.deepEqual(JSON.parse(exitMessage || ''), {id: 1234, name: 'Example'});
    });

    it('shows only changed fields and sends the partial update after confirmation', async () => {
      const getPack = sinon.stub().resolves({id: 1234, name: 'Before', agentDescription: 'Keep'});
      const updatePack = sinon
        .stub()
        .resolves({id: 1234, name: 'After', agentDescription: 'Keep', shortDescription: 'Docs only', apiKey: 'secret'});
      sinon.stub(helpers, 'createCodaClient').returns({getPack, updatePack} as any);
      const preview = process.stderr.write as sinon.SinonStub;
      answerPrompt('yes');

      try {
        await handleUpdatePackSettings({
          packIdOrUrl: '1234',
          name: 'After',
          apiEndpoint: 'https://coda.io',
          apiToken: 'token',
          $0: '',
          _: [],
        });
      } catch {
        // printAndExit
      }

      assert.isTrue(getPack.calledOnceWithExactly(1234));
      assert.isTrue(updatePack.calledOnceWithExactly(1234, {}, {name: 'After'}));
      assert.include(preview.firstCall.firstArg, '"name": "Before"');
      assert.notInclude(preview.firstCall.firstArg, 'description');
      assert.equal(exitCode, 0);
      assert.isFalse((testingHelpers.print as sinon.SinonStub).called);
      assert.deepEqual(JSON.parse(exitMessage || ''), {id: 1234, name: 'After', description: 'Keep'});
    });

    for (const {name, current, flags, expected} of [
      {
        name: 'warns before making a private connector public',
        current: [42],
        flags: {allowAllAgents: true},
        expected: 'makes the connector public',
      },
      {
        name: 'warns that making a connector private deletes its Knowledge',
        current: null,
        flags: {allowedAgents: [42]},
        expected: 'synced Knowledge will be deleted',
      },
      {
        name: 'does not warn when a private allow list changes',
        current: [1],
        flags: {allowedAgents: [2]},
        expected: null,
      },
    ]) {
      it(name, async () => {
        const getPack = sinon.stub().resolves({id: 1234, allowedAgentIds: current});
        const updatePack = sinon.stub().resolves({id: 1234});
        sinon.stub(helpers, 'createCodaClient').returns({getPack, updatePack} as any);
        answerPrompt('yes');

        try {
          await handleUpdatePackSettings({
            packIdOrUrl: '1234',
            ...flags,
            apiEndpoint: 'https://coda.io',
            apiToken: 'token',
            $0: '',
            _: [],
          });
        } catch {
          // printAndExit
        }

        const output = (process.stderr.write as sinon.SinonStub).args.map(([text]) => String(text)).join('');
        if (expected) {
          assert.include(output, expected);
        } else {
          assert.notInclude(output, 'Warning:');
        }
        assert.isTrue(updatePack.calledOnce);
      });
    }

    it('skips the read with --yes and sends the update', async () => {
      const getPack = sinon.stub();
      const updatePack = sinon.stub().resolves({id: 1234, name: 'After'});
      sinon.stub(helpers, 'createCodaClient').returns({getPack, updatePack} as any);

      try {
        await handleUpdatePackSettings({
          packIdOrUrl: '1234',
          name: 'After',
          apiEndpoint: 'https://coda.io',
          apiToken: 'token',
          yes: true,
          $0: '',
          _: [],
        });
      } catch {
        // printAndExit
      }

      assert.isFalse(getPack.called);
      assert.isTrue(updatePack.calledOnceWithExactly(1234, {}, {name: 'After'}));
      assert.notInclude((process.stderr.write as sinon.SinonStub).firstCall.firstArg, 'Current values');
      assert.equal(exitCode, 0);
    });

    for (const allowedAgentIds of [[5678], [], null]) {
      it(`sends allowedAgentIds ${JSON.stringify(allowedAgentIds)} without changing it`, async () => {
        const confirmation = sinon.stub(confirm, 'confirmOrFail');
        const getPack = sinon.stub().resolves({id: 1234, allowedAgentIds: [9012]});
        const updatePack = sinon.stub().resolves({id: 1234, allowedAgentIds});
        sinon.stub(helpers, 'createCodaClient').returns({getPack, updatePack} as any);
        try {
          await handleUpdatePackSettings({
            packIdOrUrl: '1234',
            allowedAgents: allowedAgentIds ?? undefined,
            allowAllAgents: allowedAgentIds === null,
            apiEndpoint: 'https://coda.io',
            apiToken: 'token',
            yes: true,
            $0: '',
            _: [],
          });
        } catch {
          // printAndExit
        }
        assert.isTrue(updatePack.calledOnceWithExactly(1234, {}, {allowedAgentIds}));
        const accessFlags =
          allowedAgentIds === null
            ? '--allowAllAgents'
            : allowedAgentIds.length
              ? '--allowedAgents 5678'
              : '--allowedAgents';
        assert.include(confirmation.firstCall.firstArg.example, accessFlags);
        assert.include((process.stderr.write as sinon.SinonStub).firstCall.firstArg, '"allowedAgentIds"');
        assert.deepEqual(JSON.parse(exitMessage || ''), {id: 1234, allowedAgentIds});
      });
    }

    it('rejects an update with no settings before an API request', async () => {
      const createClient = sinon.stub(helpers, 'createCodaClient');
      try {
        await handleUpdatePackSettings({packIdOrUrl: '1234', apiEndpoint: 'https://coda.io', yes: true, $0: '', _: []});
      } catch {
        // printAndExit
      }
      assert.equal(exitCode, 1);
      assert.include(exitMessage, 'Specify at least one Pack setting');
      assert.isFalse(createClient.called);
    });

    it('maps the listing flag names to the public update API fields', () => {
      const img = writeImages({'logo.png': 'logo', 'agent.webp': 'agent'});
      assert.deepEqual(
        parsePackSettingsUpdate({
          name: 'Example',
          icon: img('logo.png'),
          images: [img('agent.webp')],
          tagline: 'Short agent description',
          description: '',
          entrypoints: ['go', 'docs'],
          supportEmail: 'support@example.com',
          termsOfServiceUrl: 'https://example.com/terms',
          privacyPolicyUrl: 'https://example.com/privacy',
        }),
        {
          name: 'Example',
          logo: img('logo.png'),
          agentImages: [img('agent.webp')],
          agentShortDescription: 'Short agent description',
          agentDescription: '',
          packEntrypoints: [PublicApiPackEntrypoint.Go, PublicApiPackEntrypoint.Docs],
          supportEmail: 'support@example.com',
          termsOfServiceUrl: 'https://example.com/terms',
          privacyPolicyUrl: 'https://example.com/privacy',
        },
      );
    });

    for (const input of [
      {name: ''},
      {name: 'x'.repeat(129)},
      {tagline: ''},
      {tagline: 'x'.repeat(257)},
      {description: 'x'.repeat(8193)},
      {supportEmail: ''},
      {termsOfServiceUrl: 'x'.repeat(513)},
      {privacyPolicyUrl: ''},
      {entrypoints: []},
      {entrypoints: ['other']},
      {icon: '/missing/logo.png'},
      {icon: 'logo.bmp'},
      {images: ['/missing/agent.png']},
      {images: ['agent.txt']},
    ]) {
      it(`rejects an invalid ${Object.keys(input)[0]} value before an API request`, async () => {
        const createClient = sinon.stub(helpers, 'createCodaClient');
        try {
          await handleUpdatePackSettings({
            packIdOrUrl: '1234',
            apiEndpoint: 'https://coda.io',
            ...input,
            yes: true,
            $0: '',
            _: [],
          });
        } catch {
          // printAndExit
        }
        assert.equal(exitCode, 1);
        assert.include(exitMessage, `--${Object.keys(input)[0]}`);
        assert.isFalse(createClient.called);
      });
    }

    it('prints only supported Pack settings from API responses', async () => {
      const getPack = sinon.stub().resolves({id: 1234, name: 'Example', authentication: {apiKey: 'secret'}});
      sinon.stub(helpers, 'createCodaClient').returns({getPack} as any);
      try {
        await handleGetPackSettings({
          packIdOrUrl: '1234',
          apiEndpoint: 'https://coda.io',
          apiToken: 'token',
          $0: '',
          _: [],
        });
      } catch {
        // printAndExit
      }
      assert.equal(exitCode, 0);
      assert.deepEqual(JSON.parse(exitMessage || ''), {id: 1234, name: 'Example'});
    });

    it('removes the images when no paths are given and shows a missing current value as null', async () => {
      const getPack = sinon.stub().resolves({id: 1234, name: 'Example'});
      const updatePack = sinon.stub().resolves({id: 1234});
      sinon.stub(helpers, 'createCodaClient').returns({getPack, updatePack} as any);
      answerPrompt('yes');
      try {
        await handleUpdatePackSettings({
          packIdOrUrl: '1234',
          images: [],
          apiEndpoint: 'https://coda.io',
          apiToken: 'token',
          $0: '',
          _: [],
        });
      } catch {
        // printAndExit
      }
      assert.include((process.stderr.write as sinon.SinonStub).firstCall.firstArg, '"images": null');
      assert.isTrue(updatePack.calledOnceWithExactly(1234, {}, {agentImages: null}));
    });

    function writeImages(files: Record<string, string>): (name: string) => string {
      const dir = fsExtra.mkdtempSync(path.join(os.tmpdir(), 'pack-settings-'));
      tempDirs.push(dir);
      for (const [name, content] of Object.entries(files)) {
        fsExtra.writeFileSync(path.join(dir, name), content);
      }
      return name => path.join(dir, name);
    }

    function stubImageUpload() {
      const uploadPackAsset = sinon.stub().callsFake(async (_packId, _params, {packAssetType, filename}) => ({
        uploadUrl: `https://upload.example/${filename}`,
        headers: {'x-upload-header': 'value'},
        packAssetUploadedPathName: `/apis/v1/packs/1234/assets/asset-${filename}/assetType/${packAssetType}/uploadComplete`,
      }));
      const packAssetUploadComplete = sinon
        .stub()
        .callsFake(async (_packId, assetId) => ({requestId: `request-${assetId}`, assetId}));
      const getMutationStatus = sinon.stub().resolves({completed: true});
      const putFile = sinon.stub(globalThis, 'fetch').resolves(new Response(null, {status: 200}));
      return {uploadPackAsset, packAssetUploadComplete, getMutationStatus, putFile};
    }

    it('uploads the --icon file as the Pack logo', async () => {
      const img = writeImages({'logo.png': 'logo bytes'});
      const upload = stubImageUpload();
      const getPack = sinon.stub().resolves({id: 1234});
      const updatePack = sinon.stub().resolves({id: 1234});
      sinon.stub(helpers, 'createCodaClient').returns({...upload, getPack, updatePack} as any);
      answerPrompt('yes');

      try {
        await handleUpdatePackSettings({
          packIdOrUrl: '1234',
          icon: img('logo.png'),
          apiEndpoint: 'https://coda.io',
          apiToken: 'token',
          $0: '',
          _: [],
        });
      } catch {
        // printAndExit
      }

      assert.equal(exitCode, 0, exitMessage);
      assert.include((process.stderr.write as sinon.SinonStub).secondCall.firstArg, `"icon": "${img('logo.png')}"`);
      assert.isTrue(
        upload.uploadPackAsset.calledOnceWithExactly(
          1234,
          {},
          {
            packAssetType: 'logo',
            imageHash: createHash('sha256').update('logo bytes').digest('hex'),
            mimeType: 'image/png',
            filename: 'logo.png',
          },
        ),
      );
      assert.equal(upload.putFile.firstCall.args[0], 'https://upload.example/logo.png');
      assert.include(upload.putFile.firstCall.args[1], {method: 'PUT'});
      assert.isTrue(upload.packAssetUploadComplete.calledOnceWithExactly(1234, 'asset-logo.png', 'logo'));
      assert.isTrue(upload.getMutationStatus.calledOnceWithExactly('request-asset-logo.png'));
      assert.isTrue(
        updatePack.calledOnceWithExactly(
          1234,
          {},
          {logo: {assetId: 'asset-logo.png', filename: 'logo.png', mimeType: 'image/png'}},
        ),
      );
    });

    it('stops before the update when an image upload fails', async () => {
      const img = writeImages({'logo.png': 'logo bytes'});
      const upload = stubImageUpload();
      upload.putFile.resolves(new Response(null, {status: 403}));
      const updatePack = sinon.stub();
      sinon.stub(helpers, 'createCodaClient').returns({...upload, updatePack} as any);

      try {
        await handleUpdatePackSettings({
          packIdOrUrl: '1234',
          icon: img('logo.png'),
          apiEndpoint: 'https://coda.io',
          apiToken: 'token',
          yes: true,
          $0: '',
          _: [],
        });
      } catch {
        // printAndExit
      }

      assert.equal(exitCode, 1);
      assert.include(exitMessage, 'no changes were made');
      assert.isFalse(updatePack.called);
    });

    it('rereads the logo URL after a failed update', async () => {
      const img = writeImages({'logo.png': 'logo bytes'});
      const getPack = sinon.stub().resolves({id: 1234, logoUrl: 'https://coda.io/new-logo.png'});
      const updatePack = sinon.stub().rejects(new ResponseError(new Response('Server error', {status: 500})));
      sinon.stub(helpers, 'createCodaClient').returns({...stubImageUpload(), getPack, updatePack} as any);
      try {
        await handleUpdatePackSettings({
          packIdOrUrl: '1234',
          icon: img('logo.png'),
          apiEndpoint: 'https://coda.io',
          apiToken: 'token',
          yes: true,
          $0: '',
          _: [],
        });
      } catch {
        // printAndExit
      }
      assert.equal(exitCode, 1);
      assert.include(exitMessage, '"icon": "https://coda.io/new-logo.png"');
    });

    async function runSettingsUpdate(...flags: string[]): Promise<string | undefined> {
      try {
        await yargs()
          .parserConfiguration({'parse-numbers': false})
          .command(commands)
          .strict()
          .fail((message, error) => {
            throw error ?? new Error(message);
          })
          .exitProcess(false)
          .parseAsync([
            'settings',
            'update',
            '--packIdOrUrl',
            '1234',
            '--apiEndpoint',
            'https://coda.io',
            '--apiToken',
            'token',
            ...flags,
            '--yes',
          ]);
      } catch (error) {
        return (error as Error).message;
      }
      return undefined;
    }

    it('sends --tagline and --entrypoints as the Go listing API fields', async () => {
      const updatePack = sinon.stub().resolves({id: 1234});
      sinon.stub(helpers, 'createCodaClient').returns({updatePack} as any);
      const error = await runSettingsUpdate('--tagline', 'Short', '--entrypoints', 'go', 'docs');
      assert.equal(exitCode, 0, error);
      assert.isTrue(
        updatePack.calledOnceWithExactly(1234, {}, {agentShortDescription: 'Short', packEntrypoints: ['go', 'docs']}),
      );
    });

    it('rejects a Docs-only listing flag', async () => {
      const createClient = sinon.stub(helpers, 'createCodaClient');
      assert.include(await runSettingsUpdate('--shortDescription', 'Docs'), 'Unknown argument: shortDescription');
      assert.isFalse(createClient.called);
    });

    for (const operation of ['get', 'update']) {
      for (const packId of [undefined, 'https://coda.io/p/5678']) {
        it(`uses the manifest Pack ID or its override for settings ${operation}`, async () => {
          const getPackId = sinon.stub(configStorage, 'getPackId').returns(1234);
          const getPack = sinon.stub().resolves({id: 1234, name: 'Example'});
          const updatePack = sinon.stub().resolves({id: 1234, name: 'After'});
          sinon.stub(helpers, 'createCodaClient').returns({getPack, updatePack} as any);
          const args = [
            'settings',
            operation,
            '/my-pack/pack.ts',
            '--apiEndpoint',
            'https://tenant.example.com',
            '--apiToken',
            'token',
          ];
          if (packId !== undefined) {
            args.push('--packIdOrUrl', packId);
          }
          if (operation === 'update') {
            args.push('--name', 'After', '--yes');
          }
          try {
            await yargs()
              .parserConfiguration({'parse-numbers': false})
              .command(commands)
              .strict()
              .exitProcess(false)
              .parseAsync(args);
          } catch {
            // printAndExit
          }
          assert.equal(exitCode, 0, exitMessage);
          const expectedPackId = packId === undefined ? 1234 : 5678;
          if (operation === 'get') {
            assert.isTrue(getPack.calledOnceWithExactly(expectedPackId));
          } else {
            assert.isTrue(updatePack.calledOnceWithExactly(expectedPackId, {}, {name: 'After'}));
          }
          if (packId === undefined) {
            assert.isTrue(getPackId.calledOnceWithExactly('/my-pack', 'https://tenant.example.com'));
          } else {
            assert.isFalse(getPackId.called);
          }
        });
      }
    }

    it('reads the saved endpoint and Pack ID from the manifest directory', async () => {
      sinon.stub(configStorage, 'getPackOptions').returns({apiEndpoint: 'https://tenant.example.com'});
      const getPackId = sinon.stub(configStorage, 'getPackId').returns(1234);
      const getPack = sinon.stub().resolves({id: 1234, name: 'Example'});
      const createClient = sinon.stub(helpers, 'createCodaClient').returns({getPack} as any);
      try {
        await yargs()
          .parserConfiguration({'parse-numbers': false})
          .middleware(helpers.backfillFromPackConfig)
          .command(commands)
          .strict()
          .exitProcess(false)
          .parseAsync(['settings', 'get', '/my-pack/pack.ts', '--apiToken', 'token']);
      } catch {
        // printAndExit
      }
      assert.equal(exitCode, 0, exitMessage);
      assert.isTrue(getPackId.calledOnceWithExactly('/my-pack', 'https://tenant.example.com'));
      assert.isTrue(createClient.calledOnceWithExactly('token', 'https://tenant.example.com'));
    });

    it('uses the Pack ID override without a manifest argument', async () => {
      const getPackId = sinon.stub(configStorage, 'getPackId');
      const getPack = sinon.stub().resolves({id: 5678, name: 'Example'});
      sinon.stub(helpers, 'createCodaClient').returns({getPack} as any);
      try {
        await yargs()
          .command(commands)
          .strict()
          .exitProcess(false)
          .parseAsync([
            'settings',
            'get',
            '--packIdOrUrl',
            '5678',
            '--apiToken',
            'token',
            '--apiEndpoint',
            'https://coda.io',
          ]);
      } catch {
        // printAndExit
      }
      assert.equal(exitCode, 0, exitMessage);
      assert.isTrue(getPack.calledOnceWithExactly(5678));
      assert.isFalse(getPackId.called);
    });

    for (const flag of ['data', 'authentication', 'unknown', 'allowlist', 'allowedAgentIds']) {
      it(`rejects the unsupported --${flag} option`, () => {
        const createClient = sinon.stub(helpers, 'createCodaClient');
        assert.throws(
          () =>
            yargs()
              .command(commands)
              .strict()
              .exitProcess(false)
              .parse(['settings', 'update', '--packIdOrUrl', '1234', `--${flag}`, '{}', '--yes']),
          `Unknown argument: ${flag}`,
        );
        assert.isFalse(createClient.called);
      });
    }

    it('stops before the update when Pack access fails', async () => {
      const getPack = sinon.stub().rejects(new ResponseError(new Response('No access', {status: 403})));
      const updatePack = sinon.stub();
      sinon.stub(helpers, 'createCodaClient').returns({getPack, updatePack} as any);
      answerPrompt('yes');

      try {
        await handleUpdatePackSettings({
          packIdOrUrl: '1234',
          name: 'After',
          apiEndpoint: 'https://coda.io',
          apiToken: 'token',
          $0: '',
          _: [],
        });
      } catch {
        // printAndExit
      }

      assert.isFalse(updatePack.called);
      assert.equal(exitCode, 1);
      assert.include(exitMessage, '403');
      assert.include(exitMessage, 'no changes were made');
    });

    for (const {name, rereadFails, expected} of [
      {name: 'reports the current values after a failed update', rereadFails: false, expected: '"name": "Partial"'},
      {
        name: 'points to settings get when the values cannot be reread',
        rereadFails: true,
        expected: 'packs settings get',
      },
    ]) {
      it(name, async () => {
        const getPack = rereadFails
          ? sinon.stub().rejects(new Error('network down'))
          : sinon.stub().resolves({id: 1234, name: 'Partial'});
        const updatePack = sinon.stub().rejects(new ResponseError(new Response('Server error', {status: 500})));
        sinon.stub(helpers, 'createCodaClient').returns({getPack, updatePack} as any);

        try {
          await handleUpdatePackSettings({
            packIdOrUrl: '1234',
            name: 'After',
            apiEndpoint: 'https://coda.io',
            apiToken: 'token',
            yes: true,
            $0: '',
            _: [],
          });
        } catch {
          // printAndExit
        }

        assert.equal(exitCode, 1);
        assert.include(exitMessage, 'Unable to update Pack 1234');
        assert.include(exitMessage, 'Some changes may have been applied');
        assert.include(exitMessage, expected);
      });
    }
  });

  describe('clone initialization', () => {
    let sdkVersion: string;
    let spawnStub: sinon.SinonStub;
    let getPackSourceCode: sinon.SinonStub;
    let originalDirectory: string;
    let projectDirectory: string;
    const templateSource = "import * as sdk from '@superhuman/plugins-sdk';\nexport const pack = sdk.newPack();\n";

    before(async () => {
      const packageJson = await import('' + '../package.json');
      sdkVersion = packageJson.version as string;
    });

    beforeEach(() => {
      originalDirectory = process.cwd();
      projectDirectory = fsExtra.mkdtempSync(path.join(tmpdir(), 'packs-clone-'));
      process.chdir(projectDirectory);
      fsExtra.outputJsonSync('node_modules/@superhuman/plugins-examples/package.json', {
        devDependencies: {typescript: '5.1.6'},
      });
      fsExtra.outputFileSync('node_modules/@superhuman/plugins-examples/examples/template/pack.ts', templateSource);
      fsExtra.outputFileSync('node_modules/mold-source-map/package.json', '{\n"main": "index.js"\n}');
      spawnStub = sinon.stub(helpers, 'spawnProcess').returns({status: 0} as any);
      spawnStub.withArgs('npm -v', {stdio: 'pipe'}).returns({status: 0, stdout: Buffer.from('10.0.0\n')} as any);
      spawnStub
        .withArgs('npm list @superhuman/plugins-sdk @codahq/packs-sdk --depth=0 --json --long', {stdio: 'pipe'})
        .returns({status: 1, stdout: Buffer.from('{}')} as any);
      sinon.stub(helpers, 'isTestCommand').returns(true);
      getPackSourceCode = sinon.stub().resolves({files: [{filename: 'pack.ts', url: 'https://example.com/pack.ts'}]});
      sinon.stub(helpers, 'createCodaClient').returns({
        listPackVersions: sinon.stub().resolves({items: [{packVersion: '1.0.0'}]}),
        getPackSourceCode,
      } as any);
      sinon.stub(configStorage, 'storePackId');
    });

    afterEach(() => {
      process.chdir(originalDirectory);
      fsExtra.removeSync(projectDirectory);
    });

    it('keeps an installed Plugins SDK and matching legacy alias without reinstalling', async () => {
      spawnStub
        .withArgs('npm list @superhuman/plugins-sdk @codahq/packs-sdk --depth=0 --json --long', {stdio: 'pipe'})
        .returns({
          status: 0,
          stdout: Buffer.from(
            JSON.stringify({
              dependencies: {
                '@superhuman/plugins-sdk': {name: '@superhuman/plugins-sdk', version: sdkVersion},
                '@codahq/packs-sdk': {name: '@superhuman/plugins-sdk', version: sdkVersion},
              },
            }),
          ),
        } as any);

      await handleInit({legacySdkAlias: true});

      assert.isFalse(spawnStub.args.some(args => args[0].startsWith('npm install --save-exact')));
    });

    for (const {description, packageName, installedPackage} of [
      {description: 'the Plugins SDK is missing', packageName: '@superhuman/plugins-sdk'},
      {description: 'the legacy alias is missing', packageName: '@codahq/packs-sdk'},
      {
        description: 'the Plugins SDK version differs',
        packageName: '@superhuman/plugins-sdk',
        installedPackage: {name: '@superhuman/plugins-sdk', version: '0.0.0'},
      },
      {
        description: 'the legacy alias version differs',
        packageName: '@codahq/packs-sdk',
        installedPackage: {name: '@superhuman/plugins-sdk', version: '0.0.0'},
      },
      {
        description: 'the legacy package is installed instead of the alias',
        packageName: '@codahq/packs-sdk',
        installedPackage: {name: '@codahq/packs-sdk', version: undefined},
      },
    ]) {
      it(`installs the matching SDK pair when ${description}`, async () => {
        const dependencies: Record<string, {name: string; version: string} | undefined> = {
          '@superhuman/plugins-sdk': {name: '@superhuman/plugins-sdk', version: sdkVersion},
          '@codahq/packs-sdk': {name: '@superhuman/plugins-sdk', version: sdkVersion},
        };
        dependencies[packageName] = installedPackage
          ? {...installedPackage, version: installedPackage.version ?? sdkVersion}
          : undefined;
        spawnStub
          .withArgs('npm list @superhuman/plugins-sdk @codahq/packs-sdk --depth=0 --json --long', {stdio: 'pipe'})
          .returns({status: 0, stdout: Buffer.from(JSON.stringify({dependencies}))} as any);

        await handleInit({legacySdkAlias: true});

        assert.isTrue(
          spawnStub.calledWithExactly(
            `npm install --save-exact @superhuman/plugins-sdk@${sdkVersion} ` +
              `@codahq/packs-sdk@npm:@superhuman/plugins-sdk@${sdkVersion} --no-audit`,
          ),
        );
      });
    }

    for (const {description, source} of [
      {
        description: 'legacy imports',
        source: "import * as sdk from '@codahq/packs-sdk';\nexport const pack = sdk.newPack();\n",
      },
      {description: 'new imports', source: templateSource},
      {description: 'no SDK imports', source: 'export const pack = {};\n'},
    ]) {
      it(`pins both SDK names to the same implementation and preserves source with ${description}`, async () => {
        sinon.stub(global, 'fetch').resolves({status: 200, text: async () => source} as Response);

        try {
          await handleClone({packIdOrUrl: '1234', apiEndpoint: 'https://coda.io', apiToken: 'token', $0: '', _: []});
        } catch (error) {
          if (exitCode !== 0) {
            throw error;
          }
          assert.propertyVal(error, 'exitCode', 0);
        }

        assert.equal(exitCode, 0, exitMessage);
        assert.equal(fsExtra.readFileSync('pack.ts', 'utf-8'), source);
        assert.isTrue(
          spawnStub.calledWithExactly(
            `npm install --save-exact @superhuman/plugins-sdk@${sdkVersion} ` +
              `@codahq/packs-sdk@npm:@superhuman/plugins-sdk@${sdkVersion} --no-audit`,
          ),
        );
        assert.include(
          (testingHelpers.print as sinon.SinonStub).args.map(args => args[0]).join('\n'),
          'Migrate imports to @superhuman/plugins-sdk',
        );
      });
    }

    for (const operation of ['init', 'clone fallback']) {
      it(`installs only the new SDK for ${operation}`, async () => {
        spawnStub.withArgs('npm list @superhuman/plugins-sdk --depth=0').returns({status: 1} as any);
        getPackSourceCode.resolves({files: []});

        if (operation === 'init') {
          await handleInit();
        } else {
          await handleClone({
            packIdOrUrl: '1234',
            apiEndpoint: 'https://coda.io',
            apiToken: 'token',
            yes: true,
            $0: '',
            _: [],
          });
        }

        assert.equal(fsExtra.readFileSync('pack.ts', 'utf-8'), templateSource);
        assert.isTrue(spawnStub.calledWithExactly('npm install --save @superhuman/plugins-sdk'));
        assert.isFalse(spawnStub.args.some(args => args[0].includes('@codahq/packs-sdk')));
      });
    }
  });

  describe('init', () => {
    // Sentinel thrown by the stubbed spawnProcess to prove execution got past the
    // overwrite guard without doing any real npm work.
    const SPAWN_SENTINEL = 'spawnProcess was called';

    it('aborts before doing any work when pack.ts already exists and is not confirmed', async () => {
      sinon.stub(fsExtra, 'existsSync').callsFake(p => String(p).endsWith('pack.ts'));
      sinon.stub(confirm, 'isInteractive').returns(false);
      const spawnStub = sinon.stub(helpers, 'spawnProcess');

      try {
        await handleInit();
        assert.fail('expected printAndExit');
      } catch {
        // printAndExit throws
      }

      assert.equal(exitCode, 1);
      assert.include(exitMessage, 'pack.ts file already exists');
      assert.isFalse(spawnStub.called, 'should not run npm work after aborting');
    });

    it('asks to confirm the overwrite and passes yes through when pack.ts exists', async () => {
      sinon.stub(fsExtra, 'existsSync').callsFake(p => String(p).endsWith('pack.ts'));
      const confirmStub = sinon.stub(confirm, 'confirmOrFail');
      sinon.stub(helpers, 'spawnProcess').throws(new Error(SPAWN_SENTINEL));

      try {
        await handleInit({yes: true});
      } catch {
        // sentinel thrown once execution proceeds past the guard
      }

      assert.isTrue(confirmStub.calledOnce);
      const args = confirmStub.firstCall.firstArg;
      assert.equal(args.yes, true);
      assert.include(args.prompt, 'pack.ts file already exists');
    });

    it('does not ask to confirm when pack.ts does not exist', async () => {
      sinon.stub(fsExtra, 'existsSync').returns(false);
      const confirmStub = sinon.stub(confirm, 'confirmOrFail');
      sinon.stub(helpers, 'spawnProcess').throws(new Error(SPAWN_SENTINEL));

      try {
        await handleInit();
      } catch {
        // sentinel thrown once execution proceeds past the guard
      }

      assert.isFalse(confirmStub.called);
    });
  });

  describe('register', () => {
    it('fails fast without a token in non-interactive mode', async () => {
      sinon.stub(confirm, 'isInteractive').returns(false);
      try {
        await handleRegister({
          apiEndpoint: 'https://coda.io',
          $0: 'packs',
          _: ['register'],
        });
      } catch {
        // printAndExit
      }
      assert.equal(exitCode, 1);
      assert.include(exitMessage, 'No API token specified.');
      assert.include(exitMessage, 'packs register --apiToken <token>');
    });
  });

  describe('release', () => {
    const PROJECT_DIR = '/myproject';
    const MANIFEST_FILE = `${PROJECT_DIR}/pack.ts`;

    beforeEach(() => {
      mockFs({
        [PROJECT_DIR]: {
          'pack.ts': 'export const pack = {};',
          '.coda-pack.json': JSON.stringify({packId: 12345}),
        },
      });
      sinon.stub(helpers, 'createCodaClient').returns({
        createPackRelease: sinon.stub().resolves({
          packId: 12345,
          packVersion: '1.0.0',
          releaseId: 42,
          releaseNotes: 'Test release',
        }),
        listPackVersions: sinon.stub().resolves({items: [{packVersion: '1.0.0'}]}),
      } as any);
    });

    it('requires --yes when releasing from a non-main branch without a TTY', async () => {
      sinon.stub(confirm, 'isInteractive').returns(false);
      sinon.stub(gitHelpers, 'getGitState').returns({
        isGitRepo: true,
        isDirty: false,
        currentBranch: 'feature',
        commitSha: 'abc123',
      });

      try {
        await handleRelease({
          manifestFile: MANIFEST_FILE,
          packVersion: '1.0.0',
          apiEndpoint: 'https://coda.io',
          notes: 'Test release',
          apiToken: 'test-token',
          gitTag: false,
          $0: '',
          _: [],
        });
      } catch {
        // printAndExit
      }

      assert.equal(exitCode, 1);
      assert.include(exitMessage, '--yes');
    });

    it('releases from a non-main branch when --yes is set', async () => {
      sinon.stub(gitHelpers, 'getGitState').returns({
        isGitRepo: true,
        isDirty: false,
        currentBranch: 'feature',
        commitSha: 'abc123',
      });

      try {
        await handleRelease({
          manifestFile: MANIFEST_FILE,
          packVersion: '1.0.0',
          apiEndpoint: 'https://coda.io',
          notes: 'Test release',
          apiToken: 'test-token',
          gitTag: false,
          yes: true,
          $0: '',
          _: [],
        });
      } catch {
        // printAndExit
      }

      assert.equal(exitCode, 0);
    });
  });

  describe('agent install', () => {
    const apiEndpoint = 'https://coda.io';
    const installBody = {
      agentInstanceId: 'ai-1',
      tenantId: 'bt-1',
      packId: 1234,
      version: '3',
      alreadyInstalled: false,
    };
    let manifestDir: string;
    let postedUrls: string[];
    let postedBodies: unknown[];

    function jsonResponse(body: unknown, status = 200, statusText = 'OK') {
      return {
        ok: status >= 200 && status < 300,
        status,
        statusText,
        json: async () => body,
        text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
      } as any;
    }

    beforeEach(() => {
      manifestDir = fsExtra.mkdtempSync(path.join(os.tmpdir(), 'agent-install-'));
      configStorage.storePackId(manifestDir, 1234, apiEndpoint);
      postedUrls = [];
      postedBodies = [];
      sinon.stub(configStorage, 'getPackId').returns(1234);
      sinon.stub(helpers, 'createCodaClient').returns({
        listPackVersions: async () => ({items: [{packVersion: '3'}]}),
      } as any);
      sinon.stub(global, 'fetch').callsFake(async (url: any, init: any) => {
        postedUrls.push(String(url));
        postedBodies.push(init?.body ? JSON.parse(String(init.body)) : undefined);
        return jsonResponse(installBody);
      });
    });

    afterEach(() => {
      fsExtra.removeSync(manifestDir);
    });

    async function install(args: Partial<Parameters<typeof handleAgentInstall>[0]>) {
      await handleAgentInstall({
        manifestPath: path.join(manifestDir, 'pack.ts'),
        apiEndpoint,
        apiToken: 'test-token',
        $0: '',
        _: [],
        ...args,
      } as any);
    }

    function printedOutput(): string {
      return (testingHelpers.print as unknown as sinon.SinonStub).args.map(call => String(call[0])).join('\n');
    }

    it('installs the latest version without confirming', async () => {
      const confirmStub = sinon.stub(confirm, 'confirmOrFail');
      await install({});

      sinon.assert.notCalled(confirmStub);
      assert.deepEqual(postedUrls, ['https://coda.io/apis/v1/packs/1234/versions/3/agentInstall']);
      assert.deepEqual(postedBodies, [{reinstall: false}]);
      assert.include(printedOutput(), 'Installed agent version 3 of pack 1234.');
      assert.include(printedOutput(), 'agent instance: ai-1');
      assert.include(printedOutput(), 'tenant: bt-1');
      assert.isFalse(fsExtra.existsSync(path.join(manifestDir, '.coda-agent.json')));
    });

    it('uses an explicit version and skips the version lookup', async () => {
      await install({version: '2'});

      assert.deepEqual(postedUrls, ['https://coda.io/apis/v1/packs/1234/versions/2/agentInstall']);
      assert.deepEqual(postedBodies, [{reinstall: false}]);
    });

    it('exits with guidance for a headless reinstall without --yes', async () => {
      sinon.stub(confirm, 'isInteractive').returns(false);
      try {
        await install({reinstall: true});
        assert.fail('expected printAndExit');
      } catch {
        // printAndExit throws
      }

      assert.equal(exitCode, 1);
      assert.include(exitMessage, '--reinstall --yes');
      assert.isEmpty(postedUrls);
    });

    it('sends reinstall true when --yes is set', async () => {
      await install({reinstall: true, yes: true});

      assert.deepEqual(postedBodies, [{reinstall: true}]);
      assert.include(printedOutput(), 'Reinstalled agent version 3 of pack 1234.');
      assert.include(printedOutput(), 'agent instance: ai-1');
    });

    it('says the agent is already installed', async () => {
      (global.fetch as unknown as sinon.SinonStub).callsFake(async (url: any, init: any) => {
        postedUrls.push(String(url));
        postedBodies.push(init?.body ? JSON.parse(String(init.body)) : undefined);
        return jsonResponse({...installBody, alreadyInstalled: true});
      });

      await install({});

      assert.include(printedOutput(), 'Agent version 3 of pack 1234 is already installed.');
      assert.notInclude(printedOutput(), 'Installed agent version');
      assert.isFalse(fsExtra.existsSync(path.join(manifestDir, '.coda-agent.json')));
    });

    it('exits without saving when the response has no agent instance id', async () => {
      (global.fetch as unknown as sinon.SinonStub).callsFake(async () => jsonResponse({}));
      try {
        await install({});
        assert.fail('expected printAndExit');
      } catch {
        // printAndExit throws
      }

      assert.equal(exitCode, 1);
      assert.include(exitMessage, 'did not include an agent instance id');
      assert.isFalse(fsExtra.existsSync(path.join(manifestDir, '.coda-agent.json')));
    });

    it('prints the attempted URL and browser fallback for a missing route', async () => {
      (global.fetch as unknown as sinon.SinonStub).callsFake(async (url: any) => {
        postedUrls.push(String(url));
        return {ok: false, status: 404, statusText: 'Not Found', text: async () => '<html>nope</html>'} as any;
      });
      try {
        await install({});
        assert.fail('expected printAndExit');
      } catch {
        // printAndExit throws
      }

      assert.equal(exitCode, 1);
      assert.include(exitMessage, 'https://coda.io/apis/v1/packs/1234/versions/3/agentInstall');
      assert.include(exitMessage, 'agent directory');
      assert.notInclude(printedOutput(), 'Installed agent version');
    });

    it('reports API failures instead of a missing route', async () => {
      (global.fetch as unknown as sinon.SinonStub).callsFake(async (url: any) => {
        postedUrls.push(String(url));
        return jsonResponse({statusCode: 404, message: 'nope'}, 404, 'Not Found');
      });
      try {
        await install({});
        assert.fail('expected printAndExit');
      } catch {
        // printAndExit throws
      }

      assert.equal(exitCode, 1);
      assert.include(exitMessage, 'Agent install failed: 404');
    });
  });

  describe('agent logs', () => {
    const apiEndpoint = 'https://coda.io';

    function logRow(id: string, sessionId: string, createdAt: string, type: string) {
      return {context: {logId: id, agentSessionId: sessionId, createdAt}, type};
    }

    function printedLines(): string[] {
      return (testingHelpers.print as unknown as sinon.SinonStub).args.map(call => String(call[0]));
    }

    it('follows new sessions without dropping or repeating their logs', async () => {
      sinon.stub(configStorage, 'getPackId').returns(1234);
      sinon.stub(helpers, 'createCodaClient').returns({
        listPackVersions: async () => ({items: []}),
        listAgentSessionIds: (() => {
          let calls = 0;
          return async () => {
            calls += 1;
            const rows =
              calls === 1
                ? [{context: {agentSessionId: 's-1'}}]
                : [{context: {agentSessionId: 's-1'}}, {context: {agentSessionId: 's-2'}}];
            return {items: rows};
          };
        })(),
        listAgentLogs: (async (_tenant: any, _instance: any, params: any) => {
          if (params?.agentSessionId === 's-1') {
            return {items: [logRow('a', 's-1', '2026-01-01T00:00:01Z', 'fetcher')]};
          }
          return {items: [logRow('b', 's-2', '2026-01-01T00:00:02Z', 'custom')]};
        }) as any,
      } as any);
      const clock = sinon.useFakeTimers();
      try {
        // 60 polls trip the 5-minute cap and end the loop; earlier polls exercise the follow logic.
        const done = handleAgentLogs({
          manifestPath: 'pack.ts',
          tenant: 'bt-1',
          instance: 'agent-1',
          tail: true,
          apiEndpoint,
          apiToken: 'test-token',
          $0: '',
          _: [],
        } as any);
        await clock.tickAsync(310000);
        await done;
      } finally {
        clock.restore();
      }

      const lines = printedLines();
      assert.include(lines.join('\n'), 'Following new session s-2.');
      assert.equal(lines.filter(line => line.includes('[fetcher]')).length, 1);
      assert.equal(lines.filter(line => line.includes('[custom]')).length, 1);
      assert.include(lines.join('\n'), 'Stopped polling after 5 minutes.');
    });

    it('looks up the install when tenant and instance are omitted', async () => {
      sinon.stub(configStorage, 'getPackId').returns(1234);
      sinon.stub(global, 'fetch').resolves(
        new Response(JSON.stringify({agentInstanceId: 'ai-saved', tenantId: 'bt-saved', packId: 1234}), {
          status: 200,
        }),
      );
      const listAgentSessionIds = sinon.stub().resolves({items: []});
      sinon.stub(helpers, 'createCodaClient').returns({
        listPackVersions: async () => ({items: []}),
        listAgentSessionIds,
      } as any);

      try {
        await handleAgentLogs({
          manifestPath: 'pack.ts',
          apiEndpoint,
          apiToken: 'test-token',
          $0: '',
          _: [],
        } as any);
        assert.fail('expected printAndExit');
      } catch {
        // printAndExit throws
      }

      sinon.assert.calledWith(listAgentSessionIds, 'bt-saved', 'ai-saved');
      assert.include(exitMessage, 'No agent runs yet');
    });

    it('points at install when this pack has no instance', async () => {
      sinon.stub(configStorage, 'getPackId').returns(1234);
      sinon.stub(global, 'fetch').resolves(
        new Response(JSON.stringify({statusCode: 404, message: 'Not Found', codaType: 'AgentInstanceNotFound'}), {
          status: 404,
        }),
      );
      const createClient = sinon.stub(helpers, 'createCodaClient');

      try {
        await handleAgentLogs({
          manifestPath: 'pack.ts',
          apiEndpoint,
          apiToken: 'test-token',
          $0: '',
          _: [],
        } as any);
        assert.fail('expected printAndExit');
      } catch {
        // printAndExit throws
      }

      sinon.assert.notCalled(createClient);
      assert.include(exitMessage, 'packs agent install pack.ts');
    });

    it('rejects a lone instance flag instead of pairing it with a looked-up tenant', async () => {
      sinon.stub(configStorage, 'getPackId').returns(1234);
      const fetchStub = sinon.stub(global, 'fetch');

      try {
        await handleAgentLogs({
          manifestPath: 'pack.ts',
          instance: 'agent-1',
          apiEndpoint,
          apiToken: 'test-token',
          $0: '',
          _: [],
        } as any);
        assert.fail('expected printAndExit');
      } catch {
        // printAndExit throws
      }

      sinon.assert.notCalled(fetchStub);
      assert.include(exitMessage, '--tenant and --instance');
    });
  });

  describe('validate connector check', () => {
    const apiEndpoint = 'https://coda.io';
    let dir: string;
    let manifestFile: string;
    let createdClientArgs: Array<{apiToken: string; endpoint: string}>;
    let listingBehavior: (packId: number) => Promise<unknown>;

    function writeAgentPack() {
      dir = fsExtra.mkdtempSync(path.join(__dirname, 'packs', '.tmp-validate-connectors-'));
      manifestFile = path.join(dir, 'pack.ts');
      fsExtra.writeFileSync(
        manifestFile,
        [
          "import * as sdk from '../../../index';",
          'export const pack = sdk.newAgent();',
          "pack.setInstructions('Hi.');",
          'pack.setTools({docs: true, connectors: [{packId: 1234}]});',
          '',
        ].join('\n'),
      );
    }

    function printedLines(): string[] {
      return (testingHelpers.print as unknown as sinon.SinonStub).args.map(call => String(call[0]));
    }

    beforeEach(() => {
      writeAgentPack();
      createdClientArgs = [];
      listingBehavior = async () => ({id: 1234});
      sinon.stub(helpers, 'isTestCommand').returns(true);
      sinon.stub(helpers, 'createCodaClient').callsFake(((apiToken: string, endpoint: string) => {
        createdClientArgs.push({apiToken, endpoint});
        return {getPackListing: listingBehavior};
      }) as any);
    });

    afterEach(() => {
      fsExtra.removeSync(dir);
    });

    async function validate(args: Record<string, unknown>) {
      await handleValidate({
        manifestFile,
        checkDeprecationWarnings: false,
        apiEndpoint,
        $0: '',
        _: [],
        ...args,
      } as any);
    }

    it('skips listing requests without a token and still passes', async () => {
      sinon.stub(configStorage, 'getApiKey').returns(undefined);
      let listed = false;
      listingBehavior = (async () => {
        listed = true;
        return {id: 1234};
      }) as any;
      await validate({});

      assert.isFalse(listed);
      assert.include(printedLines().join('\n'), 'Pack is valid.');
    });

    it('skips listing requests when checkConnectors is false', async () => {
      sinon.stub(configStorage, 'getApiKey').returns('saved-token');
      let listed = false;
      listingBehavior = (async () => {
        listed = true;
        return {id: 1234};
      }) as any;
      await validate({checkConnectors: false, apiToken: 'test-token'});

      assert.isFalse(listed);
      assert.include(printedLines().join('\n'), 'Pack is valid.');
    });

    it('checks using the saved token when the flag is omitted', async () => {
      sinon.stub(configStorage, 'getApiKey').returns('saved-token');
      await validate({});

      assert.deepEqual(createdClientArgs, [{apiToken: 'saved-token', endpoint: 'https://coda.io'}]);
      assert.include(printedLines().join('\n'), 'Pack is valid.');
    });

    it('prefers an explicit apiToken over stored credentials', async () => {
      const getApiKeyStub = sinon.stub(configStorage, 'getApiKey');
      await validate({apiToken: 'explicit-token'});

      sinon.assert.notCalled(getApiKeyStub);
      assert.deepEqual(createdClientArgs, [{apiToken: 'explicit-token', endpoint: 'https://coda.io'}]);
    });

    it('looks up credentials and builds the client for a bare endpoint', async () => {
      const getApiKeyStub = sinon.stub(configStorage, 'getApiKey').returns('saved-token');
      await validate({apiEndpoint: 'coda.io'});

      sinon.assert.calledWith(getApiKeyStub, 'https://coda.io');
      assert.deepEqual(createdClientArgs, [{apiToken: 'saved-token', endpoint: 'https://coda.io'}]);
    });

    it('warns on a 404 listing but still passes', async () => {
      sinon.stub(configStorage, 'getApiKey').returns('saved-token');
      listingBehavior = (async () => {
        throw new ResponseError({
          status: 404,
          statusText: 'Not Found',
          text: async () => JSON.stringify({statusCode: 404, message: 'nope'}),
        } as any);
      }) as any;
      await validate({});

      const lines = printedLines().join('\n');
      assert.include(lines, 'Connector pack 1234');
      assert.include(lines, 'superhuman.com/store/connectors');
      assert.include(lines, 'Pack is valid.');
    });

    it('warns instead of throwing when verification fails outright', async () => {
      sinon.stub(configStorage, 'getApiKey').returns('saved-token');
      listingBehavior = (async () => {
        throw new TypeError('fetch failed');
      }) as any;
      await validate({});

      const lines = printedLines().join('\n');
      assert.include(lines, 'Could not verify connector pack 1234');
      assert.include(lines, 'Pack is valid.');
    });
  });
});
