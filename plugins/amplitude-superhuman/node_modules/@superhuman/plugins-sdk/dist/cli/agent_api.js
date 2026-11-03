"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installedAgentLookupError = exports.lookupInstalledAgent = exports.codaTypeOf = exports.buildInstalledAgentUrl = exports.postAgentRoute = exports.isApiErrorBody = exports.buildAgentRouteUrl = exports.resolveAgentContext = exports.resolveAgentVersion = void 0;
const helpers_1 = require("./helpers");
const helpers_2 = require("./helpers");
const helpers_3 = require("./helpers");
const helpers_4 = require("./helpers");
const errors_1 = require("./errors");
const coda_1 = require("../helpers/external-api/coda");
const path = __importStar(require("path"));
const helpers_5 = require("../testing/helpers");
const errors_2 = require("./errors");
async function resolveAgentVersion(client, packId, requested) {
    var _a;
    if (requested) {
        return requested;
    }
    const { items } = await client.listPackVersions(packId, { limit: 1 });
    return (_a = items[0]) === null || _a === void 0 ? void 0 : _a.packVersion;
}
exports.resolveAgentVersion = resolveAgentVersion;
async function resolveAgentContext({ manifestPath, version, apiToken, apiEndpoint, }) {
    const manifestDir = path.dirname(manifestPath);
    const formattedEndpoint = (0, helpers_4.formatEndpoint)(apiEndpoint);
    const token = (0, helpers_1.assertApiToken)(apiEndpoint, apiToken);
    const packId = (0, helpers_2.assertPackId)(manifestDir, apiEndpoint);
    const client = (0, helpers_3.createCodaClient)(token, formattedEndpoint);
    let resolvedVersion;
    try {
        resolvedVersion = await resolveAgentVersion(client, packId, version);
    }
    catch (err) {
        if ((0, coda_1.isResponseError)(err)) {
            return (0, helpers_5.printAndExit)(`Error while resolving pack version: ${await (0, errors_1.formatResponseError)(err)}`);
        }
        throw err;
    }
    if (!resolvedVersion) {
        return (0, helpers_5.printAndExit)('Error: this pack has no uploaded versions yet.\n  packs upload <manifestFile>');
    }
    return { packId, resolvedVersion, apiToken: token };
}
exports.resolveAgentContext = resolveAgentContext;
function buildAgentRouteUrl(apiEndpoint, packId, version, route) {
    return `${(0, helpers_4.formatEndpoint)(apiEndpoint)}/apis/v1/packs/${packId}/versions/${version}/${route}`;
}
exports.buildAgentRouteUrl = buildAgentRouteUrl;
function isApiErrorBody(bodyText) {
    let parsed;
    try {
        parsed = JSON.parse(bodyText);
    }
    catch {
        return false;
    }
    return (typeof parsed === 'object' && parsed !== null && typeof parsed.statusCode === 'number');
}
exports.isApiErrorBody = isApiErrorBody;
async function postAgentRoute(route, args, body) {
    const url = buildAgentRouteUrl(args.apiEndpoint, args.packId, args.version, route);
    let response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${args.apiToken}`,
                'Content-Type': 'application/json',
                ...(args.accept ? { Accept: args.accept } : {}),
            },
            body: JSON.stringify(body),
            ...(args.signal ? { signal: args.signal } : {}),
        });
    }
    catch (err) {
        const errors = [`Error while ${args.progressVerb}: ${err}`, (0, errors_2.tryParseSystemError)(err)];
        return (0, helpers_5.printAndExit)(errors.join('\n'));
    }
    if (!response.ok) {
        const bodyText = await response.text();
        if (response.status === 404 && !isApiErrorBody(bodyText)) {
            return (0, helpers_5.printAndExit)(args.missingRouteMessage(url));
        }
        return (0, helpers_5.printAndExit)(`Agent ${args.commandNoun} failed: ${response.status} ${response.statusText}`);
    }
    return response;
}
exports.postAgentRoute = postAgentRoute;
function buildInstalledAgentUrl(apiEndpoint, packId) {
    return `${(0, helpers_4.formatEndpoint)(apiEndpoint)}/apis/v1/packs/${packId}/agentInstance`;
}
exports.buildInstalledAgentUrl = buildInstalledAgentUrl;
function codaTypeOf(bodyText) {
    let parsed;
    try {
        parsed = JSON.parse(bodyText);
    }
    catch {
        return undefined;
    }
    if (typeof parsed !== 'object' || parsed === null) {
        return undefined;
    }
    const codaType = parsed.codaType;
    return typeof codaType === 'string' ? codaType : undefined;
}
exports.codaTypeOf = codaTypeOf;
function lookupError(message) {
    return { status: 'error', message };
}
async function lookupInstalledAgent(args) {
    const url = buildInstalledAgentUrl(args.apiEndpoint, args.packId);
    let response;
    try {
        response = await fetch(url, {
            method: 'GET',
            headers: { Authorization: `Bearer ${args.apiToken}` },
            signal: AbortSignal.timeout(30000),
        });
    }
    catch (err) {
        const errors = [`Error while looking up the installed agent: ${err}`, (0, errors_2.tryParseSystemError)(err)];
        return lookupError(errors.join('\n'));
    }
    const bodyText = await response.text();
    if (response.status === 404 && !isApiErrorBody(bodyText)) {
        return { status: 'unavailable' };
    }
    if (response.status === 404 && codaTypeOf(bodyText) === 'AgentInstanceNotFound') {
        return { status: 'missing' };
    }
    if (response.status === 404) {
        return lookupError('Could not look up the installed agent.');
    }
    if (!response.ok) {
        return lookupError(`Could not look up the installed agent: ${response.status} ${response.statusText}`);
    }
    let parsed;
    try {
        parsed = JSON.parse(bodyText);
    }
    catch (err) {
        return lookupError(`Installed agent lookup failed: the server response was not JSON. ${err}`);
    }
    const record = parsed;
    if (typeof record.agentInstanceId !== 'string' || record.agentInstanceId.trim() === '') {
        return lookupError('Installed agent lookup failed: the server response did not include an agent instance id.');
    }
    if (typeof record.tenantId !== 'string' || record.tenantId.trim() === '') {
        return lookupError('Installed agent lookup failed: the server response did not include a tenant id.');
    }
    return {
        status: 'found',
        agent: { agentInstanceId: record.agentInstanceId, tenantId: record.tenantId },
    };
}
exports.lookupInstalledAgent = lookupInstalledAgent;
function installedAgentLookupError(lookup, kind) {
    if (lookup.status === 'error') {
        return lookup.message;
    }
    if (lookup.status === 'unavailable') {
        const override = kind === 'chat' ? '--agentInstanceId' : '--tenant and --instance';
        return `The installed-agent lookup is not available on this server yet.\n  Pass ${override}.`;
    }
    if (kind === 'chat') {
        return ('Error: agent chat needs an installed agent instance.\n' +
            '  packs agent install pack.ts\n' +
            '  Or pass --agentInstanceId.');
    }
    return ('Error: agent logs need a tenant and an agent instance.\n' +
        '  packs agent install pack.ts\n' +
        '  Or pass --tenant and --instance.');
}
exports.installedAgentLookupError = installedAgentLookupError;
