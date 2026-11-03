"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAgentInstall = exports.buildAgentInstallUrl = void 0;
const agent_api_1 = require("./agent_api");
const confirm_1 = require("./confirm");
const agent_api_2 = require("./agent_api");
const helpers_1 = require("../testing/helpers");
const helpers_2 = require("../testing/helpers");
const agent_api_3 = require("./agent_api");
function buildAgentInstallUrl(apiEndpoint, packId, version) {
    return (0, agent_api_1.buildAgentRouteUrl)(apiEndpoint, packId, version, 'agentInstall');
}
exports.buildAgentInstallUrl = buildAgentInstallUrl;
function missingInstallRouteMessage(url) {
    return ('The agent install endpoint is not available on this server.\n' +
        `  attempted: POST ${url}\n` +
        'The server needs a token-authed install route that binds a pack version to your account.\n' +
        'Until then: open the agent directory, search the agent by name, and click Open → install agent.');
}
function readInstallResponse(body) {
    if (typeof body !== 'object' || body === null) {
        return;
    }
    const record = body;
    if (typeof record.agentInstanceId !== 'string' || record.agentInstanceId.trim() === '') {
        return;
    }
    const tenantId = typeof record.tenantId === 'string' && record.tenantId.trim() !== '' ? record.tenantId : undefined;
    return {
        agentInstanceId: record.agentInstanceId,
        tenantId,
        alreadyInstalled: record.alreadyInstalled === true,
    };
}
function formatInstallResult({ reinstall, alreadyInstalled, resolvedVersion, packId, agentInstanceId, tenantId, }) {
    const identity = [`  agent instance: ${agentInstanceId}`];
    if (tenantId) {
        identity.push(`  tenant: ${tenantId}`);
    }
    const ids = identity.join('\n');
    if (reinstall) {
        return (`Reinstalled agent version ${resolvedVersion} of pack ${packId}.\n` +
            `${ids}\n` +
            'Tool grants and triggers rebound to this version.');
    }
    if (alreadyInstalled) {
        return (`Agent version ${resolvedVersion} of pack ${packId} is already installed.\n` +
            `${ids}\n` +
            'Reinstall to rebind tool grants and triggers after changing them.');
    }
    return (`Installed agent version ${resolvedVersion} of pack ${packId}.\n` +
        `${ids}\n` +
        'Triggers and tool grants copied at install time — reinstall after changing tools or triggers.');
}
async function handleAgentInstall({ manifestPath, version, reinstall, yes, apiToken, apiEndpoint, }) {
    const { packId, resolvedVersion, apiToken: token, } = await (0, agent_api_3.resolveAgentContext)({
        manifestPath,
        version,
        apiToken,
        apiEndpoint,
    });
    if (reinstall) {
        (0, confirm_1.confirmOrFail)({
            yes,
            prompt: `Reinstall version ${resolvedVersion}? This rebinds tool grants and triggers (y/N)? `,
            example: 'packs agent install pack.ts --reinstall --yes',
        });
    }
    const response = await (0, agent_api_2.postAgentRoute)('agentInstall', {
        apiToken: token,
        apiEndpoint,
        packId,
        version: resolvedVersion,
        progressVerb: 'installing the agent',
        commandNoun: 'install',
        missingRouteMessage: missingInstallRouteMessage,
    }, { reinstall: reinstall !== null && reinstall !== void 0 ? reinstall : false });
    let body;
    try {
        body = await response.json();
    }
    catch (err) {
        return (0, helpers_2.printAndExit)(`Agent install failed: the server response was not JSON. ${err}`);
    }
    const install = readInstallResponse(body);
    if (!install) {
        return (0, helpers_2.printAndExit)('Agent install failed: the server response did not include an agent instance id.');
    }
    (0, helpers_1.print)(formatInstallResult({
        reinstall: reinstall !== null && reinstall !== void 0 ? reinstall : false,
        alreadyInstalled: install.alreadyInstalled,
        resolvedVersion,
        packId,
        agentInstanceId: install.agentInstanceId,
        tenantId: install.tenantId,
    }));
}
exports.handleAgentInstall = handleAgentInstall;
