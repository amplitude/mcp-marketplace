import {AllowedAgentIdsSchema} from './connector_access';
import type {ArgumentsCamelCase} from 'yargs';
import type {ConnectorAccessArgs} from './connector_access';
import {ConnectorAccessOptions} from './connector_access';
import type {Options} from 'yargs';
import type {PublicApiPack} from '../helpers/external-api/v1';
import {PublicApiPackAssetType} from '../helpers/external-api/v1';
import {PublicApiPackEntrypoint} from '../helpers/external-api/v1';
import type {PublicApiUpdatePackRequest} from '../helpers/external-api/v1';
import type {UploadedImageSchema} from './pack_settings_schemas';
import {assertApiToken} from './helpers';
import {assertPackId} from './helpers';
import {assertPackIdOrUrl} from './helpers';
import {confirmOrFail} from './confirm';
import {createCodaClient} from './helpers';
import {createHash} from 'crypto';
import {formatEndpoint} from './helpers';
import {formatError} from './errors';
import {formatResponseError} from './errors';
import fs from 'fs';
import {isResponseError} from '../helpers/external-api/coda';
import {parseConnectorAccess} from './connector_access';
import path from 'path';
import {printAndExit} from '../testing/helpers';
import {z} from 'zod';

interface PackSettingsArgs {
  packIdOrUrl?: string;
  manifestFile?: string;
  apiEndpoint: string;
  apiToken?: string;
}

const ImageMimeTypes: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const ImageFileSchema = z
  .string()
  .min(1)
  .refine(file => Object.hasOwn(ImageMimeTypes, path.extname(file).toLowerCase()), {
    message: 'Use a PNG, JPEG, GIF, WebP, or SVG file.',
  })
  .refine(file => fs.existsSync(file), {message: 'File not found.'});

// Only the listing fields that Superhuman Go and the Superhuman Store show. Pack Studio edits the rest.
type OmittedField =
  | 'overallRateLimit'
  | 'perConnectionRateLimit'
  | 'cover'
  | 'exampleImages'
  | 'sourceCodeVisibility'
  | 'description'
  | 'shortDescription';

// Keep these fields consistent with PublicApiUpdatePackSchema in the public API.
const PackSettingsUpdateFields = {
  allowedAgentIds: AllowedAgentIdsSchema.nullable(),
  name: z.string().min(1).max(128).describe('Pack name.'),
  logo: ImageFileSchema.describe('Path to the icon image. The CLI uploads it.'),
  agentImages: z
    .array(ImageFileSchema)
    .describe(
      'Paths to images shown in Superhuman Go, which replace the current ones. With no paths, removes them all.',
    ),
  agentShortDescription: z
    .string()
    .min(1)
    .max(256)
    .describe(
      'Tagline shown in Superhuman Go. When unset, Go uses --description, and connectors then fall back to the Docs tagline set in Pack Studio.',
    ),
  agentDescription: z
    .string()
    .max(8192)
    .describe(
      'Description shown in Superhuman Go. When unset, connectors fall back to the Docs description set in Pack Studio. Use an empty string to clear it.',
    ),
  packEntrypoints: z
    .tuple([z.enum(PublicApiPackEntrypoint)])
    .rest(z.enum(PublicApiPackEntrypoint))
    .describe('Where the Pack is available: go, docs, or both.'),
  supportEmail: z.string().min(1).max(512).describe('Support email address.'),
  termsOfServiceUrl: z.string().min(1).max(512).describe('Terms of Service URL.'),
  privacyPolicyUrl: z.string().min(1).max(512).describe('Privacy Policy URL.'),
} satisfies Record<Exclude<keyof PublicApiUpdatePackRequest, OmittedField>, z.ZodType>;

// Flags use the names shown in the Go listing editor where they differ from the API.
const FlagNames = {
  logo: 'icon',
  agentImages: 'images',
  agentShortDescription: 'tagline',
  agentDescription: 'description',
  packEntrypoints: 'entrypoints',
} as const satisfies Partial<Record<keyof PublicApiUpdatePackRequest, string>>;
type FlagName<K extends keyof PublicApiUpdatePackRequest> = K extends keyof typeof FlagNames
  ? (typeof FlagNames)[K]
  : K;

function flagName(field: string): string {
  return Reflect.get(FlagNames, field) ?? field;
}

const ListFields = new Set<string>(['agentImages', 'packEntrypoints']);

export const PackSettingsUpdateOptions = {
  ...ConnectorAccessOptions,
  ...Object.fromEntries(
    Object.entries(PackSettingsUpdateFields)
      .filter(([field]) => field !== 'allowedAgentIds')
      .map(([field, schema]) => [
        flagName(field),
        ListFields.has(field)
          ? {array: true, string: true, describe: schema.description}
          : {string: true, requiresArg: true, describe: schema.description},
      ]),
  ),
} satisfies Record<string, Options>;

type PackSettingsUpdateArgs = Partial<
  Record<FlagName<Exclude<keyof PublicApiUpdatePackRequest, OmittedField | 'allowedAgentIds'>>, string | string[]>
> &
  ConnectorAccessArgs;
type UpdatePackSettingsArgs = PackSettingsArgs & PackSettingsUpdateArgs & {yes?: boolean};
type PackSettingsInput = z.infer<ReturnType<typeof packSettingsInputSchema>>;

function packSettingsInputSchema() {
  return z.object(PackSettingsUpdateFields).partial();
}

export function parsePackSettingsUpdate(args: PackSettingsUpdateArgs): PackSettingsInput {
  const allowedAgentIds = parseConnectorAccess(args);
  const fields = Object.fromEntries(
    Object.keys(PackSettingsUpdateFields)
      .filter(key => key !== 'allowedAgentIds' && Reflect.get(args, flagName(key)) !== undefined)
      .map(key => [key, Reflect.get(args, flagName(key))]),
  );
  if (allowedAgentIds !== undefined) {
    fields.allowedAgentIds = allowedAgentIds;
  }
  if (Object.keys(fields).length === 0) {
    return printAndExit('Error: Specify at least one Pack setting to update.');
  }
  const result = packSettingsInputSchema().safeParse(fields);
  if (!result.success) {
    const issue = result.error.issues[0];
    const [field, ...rest] = issue.path.map(String);
    return printAndExit(`Error: --${[flagName(field), ...rest].join('.')}: ${issue.message}`);
  }
  return result.data;
}

function formatPackSettings(pack: PublicApiPack): string {
  return JSON.stringify(
    {id: pack.id, workspaceId: pack.workspaceId, ...readPackSettings(pack, Object.keys(PackSettingsUpdateFields))},
    null,
    2,
  );
}

export async function handleGetPackSettings({
  packIdOrUrl,
  manifestFile = 'pack.ts',
  apiEndpoint,
  apiToken,
}: ArgumentsCamelCase<PackSettingsArgs>) {
  const id =
    packIdOrUrl === undefined ? assertPackId(path.dirname(manifestFile), apiEndpoint) : assertPackIdOrUrl(packIdOrUrl);
  const client = createCodaClient(assertApiToken(apiEndpoint, apiToken), formatEndpoint(apiEndpoint));
  let pack: PublicApiPack;
  try {
    pack = await client.getPack(id);
  } catch (error) {
    return reportPackError('read', error);
  }
  return printAndExit(formatPackSettings(pack), 0);
}

export async function handleUpdatePackSettings(args: ArgumentsCamelCase<UpdatePackSettingsArgs>) {
  const {packIdOrUrl, manifestFile = 'pack.ts', apiEndpoint, apiToken, yes} = args;
  const payload = parsePackSettingsUpdate(args);
  const id =
    packIdOrUrl === undefined ? assertPackId(path.dirname(manifestFile), apiEndpoint) : assertPackIdOrUrl(packIdOrUrl);
  const client = createCodaClient(assertApiToken(apiEndpoint, apiToken), formatEndpoint(apiEndpoint));
  // The current values only feed the confirmation prompt, so --yes skips the read.
  if (!yes) {
    let currentPack: PublicApiPack;
    try {
      currentPack = await client.getPack(id);
    } catch (error) {
      return printAndExit(
        `Unable to read Pack ${id}, so no changes were made. ` +
          `Check the Pack ID and that your API token can edit this Pack.\n${await formatPackError(error)}`,
      );
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
      if (key === 'allowedAgentIds') {
        return payload.allowedAgentIds === null
          ? '--allowAllAgents'
          : ['--allowedAgents', ...(payload.allowedAgentIds ?? [])].join(' ');
      }
      return formatOption(flagName(key), Reflect.get(args, flagName(key)));
    })
    .join(' ');
  confirmOrFail({
    yes,
    prompt: `Update Pack ${id}? (y/N): `,
    example: `packs settings update --packIdOrUrl ${id} ${options} --yes`,
  });

  let request: PublicApiUpdatePackRequest;
  try {
    request = await buildUpdateRequest(client, id, payload);
  } catch (error) {
    return printAndExit(
      `Unable to upload images for Pack ${id}, so no changes were made: ${await formatPackError(error)}`,
    );
  }

  let updatedPack: PublicApiPack;
  try {
    updatedPack = await client.updatePack(id, {}, request);
  } catch (error) {
    return printAndExit(
      `Unable to update Pack ${id}: ${await formatPackError(error)}\n${await describeValuesAfterFailure(client, id, payload)}`,
    );
  }
  return printAndExit(formatPackSettings(updatedPack), 0);
}

function formatOption(key: string, value: unknown): string {
  const quote = (text: string) => `'${text.replaceAll("'", "'\"'\"'")}'`;
  return Array.isArray(value)
    ? [`--${key}`, ...value.map(String).map(quote)].join(' ')
    : `--${key} ${quote(String(value))}`;
}

type CodaClient = ReturnType<typeof createCodaClient>;
type UploadedImage = z.infer<typeof UploadedImageSchema>;

/** Uploads the image files named in the input, then returns the request for the Pack update API. */
async function buildUpdateRequest(
  client: CodaClient,
  packId: number,
  {logo, agentImages, ...fields}: PackSettingsInput,
): Promise<PublicApiUpdatePackRequest> {
  return {
    ...fields,
    ...(logo !== undefined && {logo: await uploadPackImage(client, packId, PublicApiPackAssetType.Logo, logo)}),
    ...(agentImages !== undefined && {
      agentImages:
        agentImages.length === 0
          ? null
          : await Promise.all(
              agentImages.map(file => uploadPackImage(client, packId, PublicApiPackAssetType.AgentImage, file)),
            ),
    }),
  };
}

const MutationPollIntervalMs = 1000;
const MutationTimeoutMs = 60_000;

async function uploadPackImage(
  client: CodaClient,
  packId: number,
  packAssetType: PublicApiPackAssetType,
  file: string,
): Promise<UploadedImage> {
  const content = fs.readFileSync(file);
  const filename = path.basename(file);
  const mimeType = ImageMimeTypes[path.extname(file).toLowerCase()];
  const {uploadUrl, headers, packAssetUploadedPathName} = await client.uploadPackAsset(
    packId,
    {},
    {packAssetType, imageHash: createHash('sha256').update(content).digest('hex'), mimeType, filename},
  );
  const uploadResponse = await fetch(uploadUrl, {method: 'PUT', headers, body: content});
  if (!uploadResponse.ok) {
    throw new Error(`Uploading ${filename} failed with status ${uploadResponse.status}.`);
  }
  // The upload response names the completion path rather than the asset ID.
  const assetId = /\/assets\/([^/]+)\/assetType\//.exec(packAssetUploadedPathName)?.[1];
  if (!assetId) {
    throw new Error(`The upload of ${filename} did not return an asset ID.`);
  }
  const {requestId} = await client.packAssetUploadComplete(packId, assetId, packAssetType);
  const deadline = Date.now() + MutationTimeoutMs;
  while (!(await client.getMutationStatus(requestId)).completed) {
    if (Date.now() > deadline) {
      throw new Error(`Processing ${filename} did not finish in time.`);
    }
    await new Promise(resolve => setTimeout(resolve, MutationPollIntervalMs));
  }
  return {assetId, filename, mimeType};
}

function describeAccessChange(
  current: number[] | null | undefined,
  next: number[] | null | undefined,
): string | undefined {
  if (next === null && current) {
    return 'Warning: This makes the connector public. Every agent will be able to use it.';
  }
  if (next && !current) {
    return 'Warning: This makes the connector private. Its synced Knowledge will be deleted, and this cannot be undone.';
  }
  return undefined;
}

// The Pack response returns uploaded images as URLs under different keys than the update request.
const PackReadKeys: Partial<Record<keyof PublicApiUpdatePackRequest, keyof PublicApiPack>> = {
  logo: 'logoUrl',
};

function readPackSettings(pack: PublicApiPack, fields: string[]): Record<string, unknown> {
  return Object.fromEntries(
    fields.map(field => [
      flagName(field),
      Reflect.get(pack, PackReadKeys[field as keyof PublicApiUpdatePackRequest] ?? field),
    ]),
  );
}

function pickCurrentValues(pack: PublicApiPack, payload: PackSettingsInput): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(readPackSettings(pack, Object.keys(payload))).map(([key, value]) => [key, value ?? null]),
  );
}

// The server saves image assets before the other fields, so a failed update can still apply some changes.
async function describeValuesAfterFailure(client: CodaClient, id: number, payload: PackSettingsInput): Promise<string> {
  try {
    const pack = await client.getPack(id);
    return `Some changes may have been applied. Current values:\n${JSON.stringify(pickCurrentValues(pack, payload), null, 2)}`;
  } catch {
    return 'Some changes may have been applied. Run `packs settings get` to check the current values.';
  }
}

async function formatPackError(error: unknown): Promise<string> {
  return isResponseError(error) ? formatResponseError(error) : formatError(error);
}

async function reportPackError(operation: string, error: unknown): Promise<never> {
  return printAndExit(`Unable to ${operation} Pack: ${await formatPackError(error)}`);
}
