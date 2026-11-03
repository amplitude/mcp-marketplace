import type {AgentChatMessage} from '../cli/agent_chat';
import type {AgentChatState} from '../cli/config_storage';
import type {AgentTool} from '../types';
import type {PackVersionDefinition} from '../types';
import {PublicApiPackLogType} from '../helpers/external-api/v1';
import {PublicApiType} from '../helpers/external-api/v1';
import {ResponseError} from '../helpers/external-api/coda';
import {ToolType} from '../types';
import {buildAgentChatMessagesUrl} from '../cli/agent_chat';
import {buildAgentInstallCommand} from '../cli/index';
import {buildAgentInstallUrl} from '../cli/agent_install';
import {buildAgentRouteUrl} from '../cli/agent_api';
import {buildAgentRunStatusUrl} from '../cli/agent_chat';
import {buildInstalledAgentUrl} from '../cli/agent_api';
import {buildTriggerAgentUrl} from '../cli/agent_chat';
import {checkAgentConnectorListings} from '../cli/validate';
import * as cliHelpers from '../cli/helpers';
import {compilePackBundle} from '../testing/compile';
import {compilePackMetadata} from '../helpers/metadata';
import * as configStorage from '../cli/config_storage';
import {describeAge} from '../cli/agent_chat';
import {describeRunReason} from '../cli/agent_chat';
import {firstSessionId} from '../cli/agent_logs';
import {formatAgentLog} from '../cli/agent_logs';
import {formatWhoami} from '../cli/whoami';
import fs from 'fs-extra';
import {getApiTokenCreationUrl} from '../cli/register';
import {getConnectorPackIds} from '../cli/validate';
import {handleAgentChat} from '../cli/agent_chat';
import {importManifest} from '../cli/helpers';
import {joinAssistantTexts} from '../cli/agent_chat';
import {parsePackIdOrUrl} from '../cli/link';
import path from 'path';
import {redactSecrets} from '../cli/agent_logs';
import {renderAgentPackTemplate} from '../cli/agent_template';
import sinon from 'sinon';
import * as testingHelpers from '../testing/helpers';
import yargs from 'yargs';

describe('CLI', () => {
  describe('compile pack metadata', () => {
    it('compiles undefined formulas, formats, and synctables into empty arrays', () => {
      const packDef: PackVersionDefinition = {
        version: '1',
      };
      const metadata = compilePackMetadata(packDef as any); // Cast due to overload confusion.
      assert.deepEqual(metadata.formulas, []);
      assert.deepEqual(metadata.syncTables, []);
      assert.deepEqual(metadata.formats, []);
    });
  });

  describe('parse pack ID or URL', () => {
    it('correctly parses valid IDs', () => {
      assert.equal(parsePackIdOrUrl('1234'), 1234);
      assert.equal(parsePackIdOrUrl('https://coda.io/p/1234'), 1234);

      // This in invalid but the regex allows it for now.
      assert.equal(parsePackIdOrUrl('https://coda.io/p/1234/5678'), 1234);

      assert.equal(parsePackIdOrUrl('https://coda.io/p/1234?section=listing'), 1234);
      assert.equal(parsePackIdOrUrl('https://subdomain.coda.io:6780/p/1234?section=listing'), 1234);
      assert.equal(parsePackIdOrUrl('https://coda.io/packs/foo-1234'), 1234);
      assert.equal(parsePackIdOrUrl('https://subdomain.coda.io:6789/packs/foo-1234'), 1234);

      assert.equal(parsePackIdOrUrl('https://coda.io/packs/foo-bar-1234-5678'), 5678);
    });

    it('rejects bad IDs', () => {
      assert.equal(parsePackIdOrUrl('not a number'), null);
      assert.equal(parsePackIdOrUrl('12 34'), null);
      assert.equal(parsePackIdOrUrl(''), null);
      assert.equal(parsePackIdOrUrl('-10'), null);
      assert.equal(parsePackIdOrUrl('https://coda.io/d/1234'), null);
      assert.equal(parsePackIdOrUrl('https://codadoc.io/p/1234'), null);
      assert.equal(parsePackIdOrUrl('https://coda.io/packs/foo'), null);
      assert.equal(parsePackIdOrUrl('https://coda.io/packs/foo-1234/5678'), null);
    });
  });

  describe('API token creation URL', () => {
    it('uses Superhuman Docs for the default API endpoint', () => {
      assert.equal(
        getApiTokenCreationUrl('https://coda.io'),
        'https://docs.superhuman.com/account?openDialog=CREATE_API_TOKEN&scopeType=pack#apiSettings',
      );
      assert.equal(
        getApiTokenCreationUrl('https://coda.io/'),
        'https://docs.superhuman.com/account?openDialog=CREATE_API_TOKEN&scopeType=pack#apiSettings',
      );
    });

    it('preserves custom API endpoints', () => {
      assert.equal(
        getApiTokenCreationUrl('https://tenant.example.com/'),
        'https://tenant.example.com/account?openDialog=CREATE_API_TOKEN&scopeType=pack#apiSettings',
      );
    });
  });

  describe('format whoami result', () => {
    it('represents the token', () => {
      const nonScopedToken = {
        name: 'Some Name',
        loginId: 'email@example.com',
        scoped: false,
        tokenName: "This Token's Name",
        type: PublicApiType.User as const,
        href: 'some link',
        workspace: {
          id: 'abc',
          type: PublicApiType.Workspace as const,
          browserLink: 'browser link',
        },
      };
      assert.equal(
        formatWhoami(nonScopedToken),
        `You are Some Name (email@example.com) using non-scoped token "This Token's Name"`,
      );

      assert.equal(
        formatWhoami({...nonScopedToken, scoped: true}),
        `You are Some Name (email@example.com) using scoped token "This Token's Name"`,
      );
    });
  });

  describe('agent template', () => {
    it('renders an agent pack with instructions, tools, and a schedule trigger', () => {
      const template = renderAgentPackTemplate('standup-bot');
      assert.include(template, 'sdk.newAgent()');
      assert.include(template, 'pack.setInstructions(');
      assert.include(template, 'standup-bot');
      assert.include(template, 'pack.setTools({');
      assert.include(template, 'pack.setDefaultScheduleTrigger({');
    });

    it('renders a template that compiles with quotes and backslashes in the name', async () => {
      const agentName = 'bot "the \\ builder"';
      // The template imports the published package name, which does not resolve inside this repo,
      // so point it at the local source for the compile check. Everything else stays verbatim.
      const template = renderAgentPackTemplate(agentName).replace('@superhuman/plugins-sdk', '../../../index');
      const dir = fs.mkdtempSync(path.join(__dirname, 'packs', '.tmp-agent-template-'));
      try {
        const manifestPath = path.join(dir, 'pack.ts');
        fs.writeFileSync(manifestPath, template);
        const {bundlePath} = await compilePackBundle({manifestPath, minify: false});
        const manifest = await importManifest<PackVersionDefinition>(bundlePath);
        assert.equal(manifest.agent?.instructions, `You are ${agentName}. Keep replies short.`);
      } finally {
        fs.removeSync(dir);
      }
    });
  });

  describe('agent connector pack ids', () => {
    it('collects connector pack ids and skips built-in tools', () => {
      const tools: AgentTool[] = [
        {type: ToolType.CodaDocsAndTables},
        {type: ToolType.Pack, packId: 1234},
        {type: ToolType.WebSearch},
      ];
      assert.deepEqual(getConnectorPackIds(tools), [1234]);
    });

    it('returns empty for no tools', () => {
      assert.deepEqual(getConnectorPackIds([]), []);
    });
  });

  describe('agent connector listings', () => {
    it('warns on listings that fail to load and passes on success', async () => {
      const missing = new ResponseError(
        new Response(JSON.stringify({statusCode: 404, message: 'Not found'}), {status: 404}),
      );
      const client = {
        getPackListing: async (packId: number) => {
          if (packId === 1234) {
            return {id: packId};
          }
          throw missing;
        },
      };
      const warnings = await checkAgentConnectorListings(client as any, [1234, 9999]);
      assert.lengthOf(warnings, 1);
      assert.include(warnings[0], '9999');
      assert.include(warnings[0], 'superhuman.com/store/connectors');
      assert.deepEqual(await checkAgentConnectorListings(client as any, []), []);
    });

    it('warns instead of throwing when verification fails outright', async () => {
      const client = {
        getPackListing: async () => {
          throw new TypeError('fetch failed');
        },
      };
      const warnings = await checkAgentConnectorListings(client as any, [1234]);
      assert.lengthOf(warnings, 1);
      assert.include(warnings[0], 'Could not verify connector pack 1234');
    });
  });

  describe('agent chat urls', () => {
    it('targets the trigger route', () => {
      assert.equal(buildTriggerAgentUrl('https://coda.io'), 'https://coda.io/apis/v1/agents/trigger');
    });

    it('targets the chat-scoped routes', () => {
      assert.equal(
        buildAgentRunStatusUrl('https://coda.io', 'bt-1', 'agent-1', 'chat-1', 'evt-api-1'),
        'https://coda.io/apis/v1/go/tenants/bt-1/agentInstances/agent-1/chats/chat-1/runStatus?executionId=evt-api-1',
      );
      assert.equal(
        buildAgentChatMessagesUrl('https://coda.io', 'bt-1', 'agent-1', 'chat-1'),
        'https://coda.io/apis/v1/go/tenants/bt-1/agentInstances/agent-1/chats/chat-1/messages',
      );
    });

    it('encodes the execution id for status polling', () => {
      const executionId = 'evt-api?event=one&agent=two';
      const statusUrl = new URL(buildAgentRunStatusUrl('https://coda.io', 'bt-1', 'agent-1', 'chat-1', executionId));
      assert.equal(statusUrl.searchParams.get('executionId'), executionId);
      assert.equal([...statusUrl.searchParams].length, 1);
    });

    it('adds https to bare endpoints', () => {
      assert.equal(buildTriggerAgentUrl('tenant.example.com'), 'https://tenant.example.com/apis/v1/agents/trigger');
    });
  });

  describe('agent chat polling', () => {
    let clock: sinon.SinonFakeTimers;
    let fetchStub: sinon.SinonStub;
    let printStub: sinon.SinonStub;
    let exitStub: sinon.SinonStub;
    let getChatStub: sinon.SinonStub;
    let storeChatStub: sinon.SinonStub;
    let clearChatStub: sinon.SinonStub;
    const args = {
      _: [],
      $0: 'packs',
      manifestPath: '/tmp/pack.ts',
      prompt: 'hello',
      agentInstanceId: 'agent-1',
      apiToken: 'token',
      apiEndpoint: 'https://coda.io',
    };
    const triggerBody = {
      executionId: 'execution-1',
      chatId: 'chat-1',
      agentInstanceId: 'agent-1',
      tenantId: 'bt-1',
      packId: 1234,
    };

    function jsonResponse(body: unknown, status = 200): Response {
      return new Response(JSON.stringify(body), {status});
    }

    function finishRunAt(callIndex: number) {
      fetchStub.onCall(callIndex).resolves(jsonResponse({status: 'done', chatId: 'chat-1'}));
      fetchStub.onCall(callIndex + 1).resolves(
        jsonResponse({
          messages: [
            {id: 'm1', messageType: 'assistant', text: 'reply', isComplete: true, createdAt: '2026-01-01T00:00:00Z'},
          ],
        }),
      );
    }

    beforeEach(() => {
      clock = sinon.useFakeTimers({now: 0, toFake: ['Date', 'setTimeout', 'clearTimeout']});
      sinon.stub(cliHelpers, 'assertPackId').returns(1234);
      getChatStub = sinon.stub(configStorage, 'getAgentChat').returns(undefined);
      storeChatStub = sinon.stub(configStorage, 'storeAgentChat');
      clearChatStub = sinon.stub(configStorage, 'clearAgentChat');
      fetchStub = sinon.stub(global, 'fetch');
      fetchStub.onFirstCall().resolves(jsonResponse(triggerBody));
      printStub = sinon.stub(testingHelpers, 'print');
      exitStub = sinon.stub(testingHelpers, 'printAndExit');
    });

    afterEach(() => {
      sinon.restore();
    });

    it('waits through idle gaps before and after running until confirmed done', async () => {
      for (const [index, status] of ['queued', 'idle', 'running', 'idle'].entries()) {
        fetchStub.onCall(index + 1).resolves(jsonResponse({status, chatId: 'chat-1'}));
      }
      finishRunAt(5);
      const polling = handleAgentChat(args);
      await clock.runAllAsync();
      await polling;
      sinon.assert.callCount(fetchStub, 7);
      sinon.assert.calledWithExactly(printStub, 'reply');
      sinon.assert.notCalled(exitStub);
      const statusUrl = new URL(fetchStub.getCall(1).args[0]);
      assert.equal(statusUrl.searchParams.get('executionId'), 'execution-1');
    });

    it('retries dropped connections, poll timeouts, and transient HTTP failures with backoff', async () => {
      fetchStub.onCall(1).rejects(new TypeError('connection dropped'));
      fetchStub.onCall(2).rejects(new DOMException('request timed out', 'TimeoutError'));
      fetchStub.onCall(3).resolves(jsonResponse({}, 429));
      fetchStub.onCall(4).resolves(jsonResponse({}, 503));
      finishRunAt(5);
      const polling = handleAgentChat(args);
      await clock.runAllAsync();
      await polling;
      assert.equal(clock.now, 15000);
      sinon.assert.calledWithExactly(printStub, 'reply');
      sinon.assert.notCalled(exitStub);
    });

    it('stops retrying at the configured deadline', async () => {
      fetchStub.rejects(new TypeError('connection dropped'));
      fetchStub.onFirstCall().resolves(jsonResponse(triggerBody));
      const polling = handleAgentChat({...args, timeout: 2.5});
      await clock.runAllAsync();
      await polling;
      assert.equal(clock.now, 2500);
      sinon.assert.callCount(fetchStub, 3);
      sinon.assert.calledOnceWithMatch(exitStub, 'Timed out waiting for the agent reply after 2.5s.');
    });

    it('limits an in-flight poll timeout to the remaining deadline', async () => {
      const timeoutStub = sinon.stub(AbortSignal, 'timeout').callsFake(ms => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), ms);
        return controller.signal;
      });
      fetchStub.onCall(1).callsFake(async (_url: string, options: RequestInit) => {
        return new Promise((_resolve, reject) =>
          options.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
        );
      });
      const polling = handleAgentChat({...args, timeout: 0.5});
      await clock.tickAsync(500);
      await polling;
      sinon.assert.calledWithExactly(timeoutStub, 500);
      sinon.assert.callCount(fetchStub, 2);
      sinon.assert.calledOnceWithMatch(exitStub, 'Timed out waiting for the agent reply after 0.5s.');
    });

    it('fails on a malformed status payload without retrying', async () => {
      fetchStub.onCall(1).resolves(jsonResponse({chatId: 'chat-1'}));
      await handleAgentChat(args);
      sinon.assert.callCount(fetchStub, 2);
      sinon.assert.calledOnceWithMatch(exitStub, 'Status response had an unexpected shape.');
    });

    it('identifies the already queued run when the instance belongs to another pack', async () => {
      fetchStub.onFirstCall().resolves(jsonResponse({...triggerBody, packId: 9876}));
      await handleAgentChat(args);
      sinon.assert.calledOnce(fetchStub);
      const message = exitStub.firstCall.args[0];
      assert.include(message, 'belongs to pack 9876, not pack 1234');
      assert.include(message, 'A run has already been queued');
      assert.include(message, 'execution: execution-1');
      assert.include(message, 'chat: chat-1');
    });

    it('looks up the installed instance when --agentInstanceId is omitted', async () => {
      fetchStub.resetBehavior();
      fetchStub.onCall(0).resolves(jsonResponse({agentInstanceId: 'agent-1', tenantId: 'bt-saved', packId: 1234}));
      fetchStub.onCall(1).resolves(jsonResponse(triggerBody));
      finishRunAt(2);
      const {agentInstanceId: _agentInstanceId, ...withoutFlag} = args;
      const polling = handleAgentChat(withoutFlag);
      await clock.runAllAsync();
      await polling;
      assert.equal(String(fetchStub.firstCall.args[0]), 'https://coda.io/apis/v1/packs/1234/agentInstance');
      assert.instanceOf(fetchStub.firstCall.args[1].signal, AbortSignal);
      const triggerRequest = JSON.parse(String(fetchStub.secondCall.args[1].body));
      assert.equal(triggerRequest.agentInstanceId, 'agent-1');
      sinon.assert.calledWithExactly(printStub, 'reply');
    });

    describe('chat threads', () => {
      const saved: AgentChatState = {agentInstanceId: 'agent-1', chatId: 'chat-saved'};

      function triggerRequest() {
        return JSON.parse(String(fetchStub.firstCall.args[1].body));
      }

      it('saves the chat id so the next prompt can continue it', async () => {
        finishRunAt(1);
        const polling = handleAgentChat(args);
        await clock.runAllAsync();
        await polling;
        assert.notProperty(triggerRequest(), 'chatId');
        sinon.assert.calledOnceWithExactly(storeChatStub, '/tmp', 'https://coda.io', {
          agentInstanceId: 'agent-1',
          chatId: 'chat-1',
        });
      });

      it('sends the saved chat id for the same instance', async () => {
        getChatStub.returns(saved);
        fetchStub.onFirstCall().resolves(jsonResponse({...triggerBody, chatId: 'chat-saved'}));
        finishRunAt(1);
        const polling = handleAgentChat(args);
        await clock.runAllAsync();
        await polling;
        assert.deepInclude(triggerRequest(), {agentInstanceId: 'agent-1', chatId: 'chat-saved'});
        sinon.assert.calledWithExactly(printStub, 'Continuing chat chat-saved. Pass --new to start a new chat.');
      });

      const hoursAgo = (hours: number) => new Date(-hours * 3600 * 1000).toISOString();

      it('says how long ago the continued chat was last used', async () => {
        getChatStub.returns({...saved, lastUsedAt: hoursAgo(3)});
        finishRunAt(1);
        const polling = handleAgentChat(args);
        await clock.runAllAsync();
        await polling;
        assert.equal(triggerRequest().chatId, 'chat-saved');
        sinon.assert.calledWithExactly(
          printStub,
          'Continuing chat chat-saved, last used 3 hours ago. Pass --new to start a new chat.',
        );
      });

      it('starts a new chat when the saved one has been idle over a day', async () => {
        getChatStub.returns({...saved, lastUsedAt: hoursAgo(49)});
        finishRunAt(1);
        const polling = handleAgentChat(args);
        await clock.runAllAsync();
        await polling;
        assert.notProperty(triggerRequest(), 'chatId');
        sinon.assert.calledWithExactly(
          printStub,
          'Your last chat was used 2 days ago, so this starts a new one. Pass --chatId chat-saved to continue the old chat.',
        );
      });

      it('still continues a chat idle over a day when --chatId names it', async () => {
        getChatStub.returns({...saved, lastUsedAt: hoursAgo(49)});
        fetchStub.onFirstCall().resolves(jsonResponse({...triggerBody, chatId: 'chat-saved'}));
        finishRunAt(1);
        const polling = handleAgentChat({...args, chatId: 'chat-saved'});
        await clock.runAllAsync();
        await polling;
        assert.equal(triggerRequest().chatId, 'chat-saved');
        sinon.assert.calledWithExactly(printStub, 'Continuing chat chat-saved.');
      });

      it('ignores a saved chat that belongs to another instance', async () => {
        getChatStub.returns({agentInstanceId: 'agent-old', chatId: 'chat-saved'});
        finishRunAt(1);
        const polling = handleAgentChat(args);
        await clock.runAllAsync();
        await polling;
        assert.notProperty(triggerRequest(), 'chatId');
      });

      it('starts a new chat with --new even when one is saved', async () => {
        getChatStub.returns(saved);
        finishRunAt(1);
        const polling = handleAgentChat({...args, new: true});
        await clock.runAllAsync();
        await polling;
        assert.notProperty(triggerRequest(), 'chatId');
        sinon.assert.calledOnceWithMatch(storeChatStub, '/tmp', 'https://coda.io', {chatId: 'chat-1'});
      });

      it('sends --chatId alone and lets the server pick the agent', async () => {
        const {agentInstanceId: _agentInstanceId, ...withoutFlag} = args;
        fetchStub.onFirstCall().resolves(jsonResponse({...triggerBody, chatId: 'chat-explicit'}));
        finishRunAt(1);
        const polling = handleAgentChat({...withoutFlag, chatId: 'chat-explicit'});
        await clock.runAllAsync();
        await polling;
        assert.deepEqual(triggerRequest(), {input: 'hello', chatId: 'chat-explicit'});
        assert.include(String(fetchStub.secondCall.args[0]), '/agentInstances/agent-1/chats/chat-explicit/');
      });

      it('rejects --new together with --chatId', async () => {
        await handleAgentChat({...args, new: true, chatId: 'chat-explicit'});
        sinon.assert.notCalled(fetchStub);
        sinon.assert.calledOnceWithMatch(exitStub, 'Pass --new or --chatId, not both.');
      });

      it('explains a missing chat by codaType and clears the saved one', async () => {
        getChatStub.returns(saved);
        fetchStub
          .onFirstCall()
          .resolves(
            jsonResponse({statusCode: 404, message: 'Chat not found for this agent.', codaType: 'ChatNotFound'}, 404),
          );
        await handleAgentChat(args);
        sinon.assert.calledOnceWithExactly(clearChatStub, '/tmp', 'https://coda.io');
        const message = String(exitStub.firstCall.args[0]);
        assert.include(message, 'That chat is gone');
        assert.include(message, '--new');
        sinon.assert.notCalled(storeChatStub);
      });

      it('keeps the saved chat when an explicit --chatId is not found', async () => {
        getChatStub.returns(saved);
        fetchStub.onFirstCall().resolves(jsonResponse({statusCode: 404, message: 'x', codaType: 'ChatNotFound'}, 404));
        await handleAgentChat({...args, chatId: 'chat-other'});
        sinon.assert.notCalled(clearChatStub);
        sinon.assert.calledOnceWithMatch(exitStub, 'That chat is gone');
      });
    });

    it('tells you to install when this pack has no instance', async () => {
      fetchStub.resetBehavior();
      fetchStub.resolves(jsonResponse({statusCode: 404, message: 'Not Found', codaType: 'AgentInstanceNotFound'}, 404));
      const {agentInstanceId: _agentInstanceId, ...withoutFlag} = args;
      await handleAgentChat(withoutFlag);
      sinon.assert.calledOnce(fetchStub);
      sinon.assert.calledOnceWithMatch(exitStub, 'packs agent install pack.ts');
    });

    it('does not suggest install when the lookup 404 is not a missing instance', async () => {
      fetchStub.resetBehavior();
      fetchStub.resolves(jsonResponse({statusCode: 404, message: 'Not Found'}, 404));
      const {agentInstanceId: _agentInstanceId, ...withoutFlag} = args;
      await handleAgentChat(withoutFlag);
      const message = String(exitStub.firstCall.args[0]);
      assert.include(message, 'Could not look up the installed agent.');
      assert.notInclude(message, 'packs agent install pack.ts');
    });

    it('tells you to pass the instance id when lookup is not deployed', async () => {
      fetchStub.resetBehavior();
      fetchStub.resolves(new Response('<html>missing</html>', {status: 404, statusText: 'Not Found'}));
      const {agentInstanceId: _agentInstanceId, ...withoutFlag} = args;
      await handleAgentChat(withoutFlag);
      sinon.assert.calledOnce(fetchStub);
      sinon.assert.calledOnceWithMatch(exitStub, 'Pass --agentInstanceId.');
    });
  });

  describe('agent chat reply', () => {
    function message(overrides: Partial<AgentChatMessage>): AgentChatMessage {
      return {
        id: 'm1',
        messageType: 'assistant',
        text: 'reply',
        isComplete: true,
        createdAt: '2026-01-01T00:00:01.000Z',
        ...overrides,
      };
    }

    it('joins completed assistant replies chronologically', () => {
      const messages = [
        message({id: 'last', createdAt: '2026-01-01T00:00:02.000Z', text: 'last reply'}),
        message({id: 'user', messageType: 'user', text: 'question', createdAt: '2026-01-01T00:00:00.000Z'}),
        message({id: 'empty', text: ''}),
        message({id: 'incomplete', isComplete: false, text: 'unfinished'}),
        message({id: 'first', createdAt: '2026-01-01T00:00:01.000Z', text: 'first reply'}),
      ];
      assert.equal(joinAssistantTexts(messages), 'first reply\n\nlast reply');
    });

    it('returns only the latest turn of a multi-turn transcript', () => {
      const at = (second: number) => `2026-01-01T00:00:0${second}.000Z`;
      const messages = [
        message({id: 'u1', messageType: 'user', text: 'first question', createdAt: at(0)}),
        message({id: 'a1', text: 'first answer', createdAt: at(1)}),
        message({id: 'u2', messageType: 'user', text: 'follow-up', createdAt: at(2)}),
        message({id: 'a2', text: 'working on it', createdAt: at(3)}),
        message({id: 'a3', text: 'follow-up answer', createdAt: at(4)}),
      ];
      assert.equal(joinAssistantTexts(messages), 'working on it\n\nfollow-up answer');
    });

    it('describes idle time in minutes, hours and days', () => {
      assert.equal(describeAge(30 * 1000), 'just now');
      assert.equal(describeAge(60 * 1000), '1 minute ago');
      assert.equal(describeAge(5 * 3600 * 1000), '5 hours ago');
      assert.equal(describeAge(2 * 24 * 3600 * 1000), '2 days ago');
    });

    it('returns undefined when no complete assistant text arrived', () => {
      assert.isUndefined(joinAssistantTexts([]));
      assert.isUndefined(joinAssistantTexts([message({isComplete: false}), message({text: ''})]));
    });

    it('describes terminal reasons', () => {
      assert.include(describeRunReason('failed', 'quota_exceeded'), 'quota');
      assert.include(describeRunReason('failed', undefined), 'failed');
      assert.include(describeRunReason('needs_input', 'step_limit'), 'step limit');
      assert.include(describeRunReason('needs_input', undefined), 'browser');
    });
  });

  describe('agent install url', () => {
    it('targets the versioned install route', () => {
      assert.equal(
        buildAgentInstallUrl('https://coda.io', 1234, '3'),
        'https://coda.io/apis/v1/packs/1234/versions/3/agentInstall',
      );
    });

    it('builds versioned routes for any agent route', () => {
      assert.equal(
        buildAgentRouteUrl('https://coda.io', 1234, '3', 'agentInstall'),
        'https://coda.io/apis/v1/packs/1234/versions/3/agentInstall',
      );
    });

    it('looks up the installed agent by pack id', () => {
      assert.equal(buildInstalledAgentUrl('https://coda.io', 1234), 'https://coda.io/apis/v1/packs/1234/agentInstance');
    });
  });

  describe('agent install version flag', () => {
    it('keeps --version as the pack version', () => {
      const warnings: string[] = [];
      const emitWarning = process.emitWarning;
      process.emitWarning = ((warning: string | Error, ...rest: any[]) => {
        warnings.push(typeof warning === 'string' ? warning : warning.message);
        return emitWarning.call(process, warning as any, ...rest);
      }) as typeof process.emitWarning;
      try {
        const parsed = buildAgentInstallCommand(yargs().scriptName('packs').exitProcess(false)).parseSync([
          '--version',
          '1',
        ]);
        assert.equal(parsed.version, '1');
        assert.isFalse(warnings.some(warning => warning.includes('reserved word')));
      } finally {
        process.emitWarning = emitWarning;
      }
    });
  });

  describe('agent logs formatting', () => {
    it('redacts bearer tokens and api keys', () => {
      assert.equal(redactSecrets('Authorization: Bearer abc123'), 'Authorization: Bearer [redacted]');
      assert.equal(redactSecrets('api_key=secret-value here'), 'api_key=[redacted] here');
      assert.equal(redactSecrets('plain text passes through'), 'plain text passes through');
    });

    it('summarizes agent runtime turns', () => {
      const log = {
        type: PublicApiPackLogType.AgentRuntime,
        context: {
          docId: 'd',
          packId: '1',
          packVersion: '2',
          formulaName: 'f',
          userId: 'u',
          connectionId: 'c',
          requestId: 'r',
          createdAt: '2026-01-01',
          logId: 'l',
        },
        turnType: 'chat',
        fromAgent: 'a',
        toAgent: 'b',
        model: 'm',
        durationMs: 120,
      };
      assert.equal(formatAgentLog(log as any), 'chat (a → b) via m 120ms');
    });

    it('falls back to the log type for other logs', () => {
      assert.equal(formatAgentLog({type: PublicApiPackLogType.Fetcher} as any), '[fetcher]');
    });

    it('takes the session from the first listed row', () => {
      assert.isUndefined(firstSessionId([]));
      const rows = [{context: {agentSessionId: 's-1'}}];
      assert.equal(firstSessionId(rows as any), 's-1');
    });
  });
});
