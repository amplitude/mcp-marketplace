"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUpdatePackSettings = exports.handleGetPackSettings = exports.parsePackSettingsUpdate = exports.PackSettingsUpdateOptions = void 0;
const connector_access_1 = require("./connector_access");
const connector_access_2 = require("./connector_access");
const v1_1 = require("../helpers/external-api/v1");
const v1_2 = require("../helpers/external-api/v1");
const helpers_1 = require("./helpers");
const helpers_2 = require("./helpers");
const helpers_3 = require("./helpers");
const confirm_1 = require("./confirm");
const helpers_4 = require("./helpers");
const crypto_1 = require("crypto");
const helpers_5 = require("./helpers");
const errors_1 = require("./errors");
const errors_2 = require("./errors");
const fs_1 = __importDefault(require("fs"));
const coda_1 = require("../helpers/external-api/coda");
const connector_access_3 = require("./connector_access");
const path_1 = __importDefault(require("path"));
const helpers_6 = require("../testing/helpers");
const zod_1 = require("zod");
const ImageMimeTypes = {
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
};
const ImageFileSchema = zod_1.z
    .string()
    .min(1)
    .refine(file => Object.hasOwn(ImageMimeTypes, path_1.default.extname(file).toLowerCase()), {
    message: 'Use a PNG, JPEG, GIF, WebP, or SVG file.',
})
    .refine(file => fs_1.default.existsSync(file), { message: 'File not found.' });
// Keep these fields consistent with PublicApiUpdatePackSchema in the public API.
const PackSettingsUpdateFields = {
    allowedAgentIds: connector_access_1.AllowedAgentIdsSchema.nullable(),
    name: zod_1.z.string().min(1).max(128).describe('Pack name.'),
    logo: ImageFileSchema.describe('Path to the icon image. The CLI uploads it.'),
    agentImages: zod_1.z
        .array(ImageFileSchema)
        .describe('Paths to images shown in Superhuman Go, which replace the current ones. With no paths, removes them all.'),
    agentShortDescription: zod_1.z
        .string()
        .min(1)
        .max(256)
        .describe('Tagline shown in Superhuman Go. When unset, Go uses --description, and connectors then fall back to the Docs tagline set in Pack Studio.'),
    agentDescription: zod_1.z
        .string()
        .max(8192)
        .describe('Description shown in Superhuman Go. When unset, connectors fall back to the Docs description set in Pack Studio. Use an empty string to clear it.'),
    packEntrypoints: zod_1.z
        .tuple([zod_1.z.enum(v1_2.PublicApiPackEntrypoint)])
        .rest(zod_1.z.enum(v1_2.PublicApiPackEntrypoint))
        .describe('Where the Pack is available: go, docs, or both.'),
    supportEmail: zod_1.z.string().min(1).max(512).describe('Support email address.'),
    termsOfServiceUrl: zod_1.z.string().min(1).max(512).describe('Terms of Service URL.'),
    privacyPolicyUrl: zod_1.z.string().min(1).max(512).describe('Privacy Policy URL.'),
};
// Flags use the names shown in the Go listing editor where they differ from the API.
const FlagNames = {
    logo: 'icon',
    agentImages: 'images',
    agentShortDescription: 'tagline',
    agentDescription: 'description',
    packEntrypoints: 'entrypoints',
};
function flagName(field) {
    var _a;
    return (_a = Reflect.get(FlagNames, field)) !== null && _a !== void 0 ? _a : field;
}
const ListFields = new Set(['agentImages', 'packEntrypoints']);
exports.PackSettingsUpdateOptions = {
    ...connector_access_2.ConnectorAccessOptions,
    ...Object.fromEntries(Object.entries(PackSettingsUpdateFields)
        .filter(([field]) => field !== 'allowedAgentIds')
        .map(([field, schema]) => [
        flagName(field),
        ListFields.has(field)
            ? { array: true, string: true, describe: schema.description }
            : { string: true, requiresArg: true, describe: schema.description },
    ])),
};
function packSettingsInputSchema() {
    return zod_1.z.object(PackSettingsUpdateFields).partial();
}
function parsePackSettingsUpdate(args) {
    const allowedAgentIds = (0, connector_access_3.parseConnectorAccess)(args);
    const fields = Object.fromEntries(Object.keys(PackSettingsUpdateFields)
        .filter(key => key !== 'allowedAgentIds' && Reflect.get(args, flagName(key)) !== undefined)
        .map(key => [key, Reflect.get(args, flagName(key))]));
    if (allowedAgentIds !== undefined) {
        fields.allowedAgentIds = allowedAgentIds;
    }
    if (Object.keys(fields).length === 0) {
        return (0, helpers_6.printAndExit)('Error: Specify at least one Pack setting to update.');
    }
    const result = packSettingsInputSchema().safeParse(fields);
    if (!result.success) {
        const issue = result.error.issues[0];
        const [field, ...rest] = issue.path.map(String);
        return (0, helpers_6.printAndExit)(`Error: --${[flagName(field), ...rest].join('.')}: ${issue.message}`);
    }
    return result.data;
}
exports.parsePackSettingsUpdate = parsePackSettingsUpdate;
function formatPackSettings(pack) {
    return JSON.stringify({ id: pack.id, workspaceId: pack.workspaceId, ...readPackSettings(pack, Object.keys(PackSettingsUpdateFields)) }, null, 2);
}
async function handleGetPackSettings({ packIdOrUrl, manifestFile = 'pack.ts', apiEndpoint, apiToken, }) {
    const id = packIdOrUrl === undefined ? (0, helpers_2.assertPackId)(path_1.default.dirname(manifestFile), apiEndpoint) : (0, helpers_3.assertPackIdOrUrl)(packIdOrUrl);
    const client = (0, helpers_4.createCodaClient)((0, helpers_1.assertApiToken)(apiEndpoint, apiToken), (0, helpers_5.formatEndpoint)(apiEndpoint));
    let pack;
    try {
        pack = await client.getPack(id);
    }
    catch (error) {
        return reportPackError('read', error);
    }
    return (0, helpers_6.printAndExit)(formatPackSettings(pack), 0);
}
exports.handleGetPackSettings = handleGetPackSettings;
async function handleUpdatePackSettings(args) {
    const { packIdOrUrl, manifestFile = 'pack.ts', apiEndpoint, apiToken, yes } = args;
    const payload = parsePackSettingsUpdate(args);
    const id = packIdOrUrl === undefined ? (0, helpers_2.assertPackId)(path_1.default.dirname(manifestFile), apiEndpoint) : (0, helpers_3.assertPackIdOrUrl)(packIdOrUrl);
    const client = (0, helpers_4.createCodaClient)((0, helpers_1.assertApiToken)(apiEndpoint, apiToken), (0, helpers_5.formatEndpoint)(apiEndpoint));
    // The current values only feed the confirmation prompt, so --yes skips the read.
    if (!yes) {
        let currentPack;
        try {
            currentPack = await client.getPack(id);
        }
        catch (error) {
            return (0, helpers_6.printAndExit)(`Unable to read Pack ${id}, so no changes were made. ` +
                `Check the Pack ID and that your API token can edit this Pack.\n${await formatPackError(error)}`);
        }
        process.stderr.write(`Current values:\n${JSON.stringify(pickCurrentValues(currentPack, payload), null, 2)}\n`);
        const accessWarning = describeAccessChange(currentPack.allowedAgentIds, payload.allowedAgentIds);
        if (accessWarning) {
            process.stderr.write(`${accessWarning}\n`);
        }
    }
    const proposedValues = Object.fromEntries(Object.entries(payload).map(([key, value]) => [flagName(key), value]));
    process.stderr.write(`Proposed values:\n${JSON.stringify(proposedValues, null, 2)}\n`);
    const options = Object.keys(payload)
        .map(key => {
        var _a;
        if (key === 'allowedAgentIds') {
            return payload.allowedAgentIds === null
                ? '--allowAllAgents'
                : ['--allowedAgents', ...((_a = payload.allowedAgentIds) !== null && _a !== void 0 ? _a : [])].join(' ');
        }
        return formatOption(flagName(key), Reflect.get(args, flagName(key)));
    })
        .join(' ');
    (0, confirm_1.confirmOrFail)({
        yes,
        prompt: `Update Pack ${id}? (y/N): `,
        example: `packs settings update --packIdOrUrl ${id} ${options} --yes`,
    });
    let request;
    try {
        request = await buildUpdateRequest(client, id, payload);
    }
    catch (error) {
        return (0, helpers_6.printAndExit)(`Unable to upload images for Pack ${id}, so no changes were made: ${await formatPackError(error)}`);
    }
    let updatedPack;
    try {
        updatedPack = await client.updatePack(id, {}, request);
    }
    catch (error) {
        return (0, helpers_6.printAndExit)(`Unable to update Pack ${id}: ${await formatPackError(error)}\n${await describeValuesAfterFailure(client, id, payload)}`);
    }
    return (0, helpers_6.printAndExit)(formatPackSettings(updatedPack), 0);
}
exports.handleUpdatePackSettings = handleUpdatePackSettings;
function formatOption(key, value) {
    const quote = (text) => `'${text.replaceAll("'", "'\"'\"'")}'`;
    return Array.isArray(value)
        ? [`--${key}`, ...value.map(String).map(quote)].join(' ')
        : `--${key} ${quote(String(value))}`;
}
/** Uploads the image files named in the input, then returns the request for the Pack update API. */
async function buildUpdateRequest(client, packId, { logo, agentImages, ...fields }) {
    return {
        ...fields,
        ...(logo !== undefined && { logo: await uploadPackImage(client, packId, v1_1.PublicApiPackAssetType.Logo, logo) }),
        ...(agentImages !== undefined && {
            agentImages: agentImages.length === 0
                ? null
                : await Promise.all(agentImages.map(file => uploadPackImage(client, packId, v1_1.PublicApiPackAssetType.AgentImage, file))),
        }),
    };
}
const MutationPollIntervalMs = 1000;
const MutationTimeoutMs = 60000;
async function uploadPackImage(client, packId, packAssetType, file) {
    var _a;
    const content = fs_1.default.readFileSync(file);
    const filename = path_1.default.basename(file);
    const mimeType = ImageMimeTypes[path_1.default.extname(file).toLowerCase()];
    const { uploadUrl, headers, packAssetUploadedPathName } = await client.uploadPackAsset(packId, {}, { packAssetType, imageHash: (0, crypto_1.createHash)('sha256').update(content).digest('hex'), mimeType, filename });
    const uploadResponse = await fetch(uploadUrl, { method: 'PUT', headers, body: content });
    if (!uploadResponse.ok) {
        throw new Error(`Uploading ${filename} failed with status ${uploadResponse.status}.`);
    }
    // The upload response names the completion path rather than the asset ID.
    const assetId = (_a = /\/assets\/([^/]+)\/assetType\//.exec(packAssetUploadedPathName)) === null || _a === void 0 ? void 0 : _a[1];
    if (!assetId) {
        throw new Error(`The upload of ${filename} did not return an asset ID.`);
    }
    const { requestId } = await client.packAssetUploadComplete(packId, assetId, packAssetType);
    const deadline = Date.now() + MutationTimeoutMs;
    while (!(await client.getMutationStatus(requestId)).completed) {
        if (Date.now() > deadline) {
            throw new Error(`Processing ${filename} did not finish in time.`);
        }
        await new Promise(resolve => setTimeout(resolve, MutationPollIntervalMs));
    }
    return { assetId, filename, mimeType };
}
function describeAccessChange(current, next) {
    if (next === null && current) {
        return 'Warning: This makes the connector public. Every agent will be able to use it.';
    }
    if (next && !current) {
        return 'Warning: This makes the connector private. Its synced Knowledge will be deleted, and this cannot be undone.';
    }
    return undefined;
}
// The Pack response returns uploaded images as URLs under different keys than the update request.
const PackReadKeys = {
    logo: 'logoUrl',
};
function readPackSettings(pack, fields) {
    return Object.fromEntries(fields.map(field => {
        var _a;
        return [
            flagName(field),
            Reflect.get(pack, (_a = PackReadKeys[field]) !== null && _a !== void 0 ? _a : field),
        ];
    }));
}
function pickCurrentValues(pack, payload) {
    return Object.fromEntries(Object.entries(readPackSettings(pack, Object.keys(payload))).map(([key, value]) => [key, value !== null && value !== void 0 ? value : null]));
}
// The server saves image assets before the other fields, so a failed update can still apply some changes.
async function describeValuesAfterFailure(client, id, payload) {
    try {
        const pack = await client.getPack(id);
        return `Some changes may have been applied. Current values:\n${JSON.stringify(pickCurrentValues(pack, payload), null, 2)}`;
    }
    catch {
        return 'Some changes may have been applied. Run `packs settings get` to check the current values.';
    }
}
async function formatPackError(error) {
    return (0, coda_1.isResponseError)(error) ? (0, errors_2.formatResponseError)(error) : (0, errors_1.formatError)(error);
}
async function reportPackError(operation, error) {
    return (0, helpers_6.printAndExit)(`Unable to ${operation} Pack: ${await formatPackError(error)}`);
}
