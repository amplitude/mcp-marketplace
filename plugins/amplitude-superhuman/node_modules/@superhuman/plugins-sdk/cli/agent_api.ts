import type {Client} from '../helpers/external-api/coda';
import {assertApiToken} from './helpers';
import {assertPackId} from './helpers';
import {createCodaClient} from './helpers';
import {formatEndpoint} from './helpers';
import {formatResponseError} from './errors';
import {isResponseError} from '../helpers/external-api/coda';
import * as path from 'path';
import {printAndExit} from '../testing/helpers';
import {tryParseSystemError} from './errors';

export interface AgentContextArgs {
  manifestPath: string;
  version?: string;
  apiToken?: string;
  apiEndpoint: string;
}

export interface ResolvedAgentContext {
  packId: number;
  resolvedVersion: string;
  apiToken: string;
}

export async function resolveAgentVersion(
  client: Client,
  packId: number,
  requested?: string,
): Promise<string | undefined> {
  if (requested) {
    return requested;
  }
  const {items} = await client.listPackVersions(packId, {limit: 1});
  return items[0]?.packVersion;
}

export async function resolveAgentContext({
  manifestPath,
  version,
  apiToken,
  apiEndpoint,
}: AgentContextArgs): Promise<ResolvedAgentContext> {
  const manifestDir = path.dirname(manifestPath);
  const formattedEndpoint = formatEndpoint(apiEndpoint);
  const token = assertApiToken(apiEndpoint, apiToken);
  const packId = assertPackId(manifestDir, apiEndpoint);
  const client = createCodaClient(token, formattedEndpoint);

  let resolvedVersion: string | undefined;
  try {
    resolvedVersion = await resolveAgentVersion(client, packId, version);
  } catch (err: any) {
    if (isResponseError(err)) {
      return printAndExit(`Error while resolving pack version: ${await formatResponseError(err)}`);
    }
    throw err;
  }
  if (!resolvedVersion) {
    return printAndExit('Error: this pack has no uploaded versions yet.\n  packs upload <manifestFile>');
  }
  return {packId, resolvedVersion, apiToken: token};
}

export function buildAgentRouteUrl(apiEndpoint: string, packId: number, version: string, route: string): string {
  return `${formatEndpoint(apiEndpoint)}/apis/v1/packs/${packId}/versions/${version}/${route}`;
}

export function isApiErrorBody(bodyText: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return false;
  }
  return (
    typeof parsed === 'object' && parsed !== null && typeof (parsed as {statusCode?: unknown}).statusCode === 'number'
  );
}

export interface PostAgentRouteArgs {
  apiToken: string;
  apiEndpoint: string;
  packId: number;
  version: string;
  progressVerb: string;
  commandNoun: string;
  missingRouteMessage: (url: string) => string;
  accept?: string;
  signal?: AbortSignal;
}

export async function postAgentRoute(route: string, args: PostAgentRouteArgs, body: unknown): Promise<Response> {
  const url = buildAgentRouteUrl(args.apiEndpoint, args.packId, args.version, route);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${args.apiToken}`,
        'Content-Type': 'application/json',
        ...(args.accept ? {Accept: args.accept} : {}),
      },
      body: JSON.stringify(body),
      ...(args.signal ? {signal: args.signal} : {}),
    });
  } catch (err: any) {
    const errors = [`Error while ${args.progressVerb}: ${err}`, tryParseSystemError(err)];
    return printAndExit(errors.join('\n'));
  }

  if (!response.ok) {
    const bodyText = await response.text();
    if (response.status === 404 && !isApiErrorBody(bodyText)) {
      return printAndExit(args.missingRouteMessage(url));
    }
    return printAndExit(`Agent ${args.commandNoun} failed: ${response.status} ${response.statusText}`);
  }
  return response;
}

export interface InstalledAgent {
  agentInstanceId: string;
  tenantId: string;
}

export type InstalledAgentLookup =
  | {status: 'found'; agent: InstalledAgent}
  | {status: 'missing'}
  | {status: 'unavailable'}
  | {status: 'error'; message: string};

export function buildInstalledAgentUrl(apiEndpoint: string, packId: number): string {
  return `${formatEndpoint(apiEndpoint)}/apis/v1/packs/${packId}/agentInstance`;
}

export function codaTypeOf(bodyText: string): string | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return undefined;
  }
  const codaType = (parsed as {codaType?: unknown}).codaType;
  return typeof codaType === 'string' ? codaType : undefined;
}

function lookupError(message: string): InstalledAgentLookup {
  return {status: 'error', message};
}

export async function lookupInstalledAgent(args: {
  apiToken: string;
  apiEndpoint: string;
  packId: number;
}): Promise<InstalledAgentLookup> {
  const url = buildInstalledAgentUrl(args.apiEndpoint, args.packId);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {Authorization: `Bearer ${args.apiToken}`},
      signal: AbortSignal.timeout(30000),
    });
  } catch (err: any) {
    const errors = [`Error while looking up the installed agent: ${err}`, tryParseSystemError(err)];
    return lookupError(errors.join('\n'));
  }

  const bodyText = await response.text();
  if (response.status === 404 && !isApiErrorBody(bodyText)) {
    return {status: 'unavailable'};
  }
  if (response.status === 404 && codaTypeOf(bodyText) === 'AgentInstanceNotFound') {
    return {status: 'missing'};
  }
  if (response.status === 404) {
    return lookupError('Could not look up the installed agent.');
  }
  if (!response.ok) {
    return lookupError(`Could not look up the installed agent: ${response.status} ${response.statusText}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch (err: any) {
    return lookupError(`Installed agent lookup failed: the server response was not JSON. ${err}`);
  }
  const record = parsed as {agentInstanceId?: unknown; tenantId?: unknown};
  if (typeof record.agentInstanceId !== 'string' || record.agentInstanceId.trim() === '') {
    return lookupError('Installed agent lookup failed: the server response did not include an agent instance id.');
  }
  if (typeof record.tenantId !== 'string' || record.tenantId.trim() === '') {
    return lookupError('Installed agent lookup failed: the server response did not include a tenant id.');
  }
  return {
    status: 'found',
    agent: {agentInstanceId: record.agentInstanceId, tenantId: record.tenantId},
  };
}

export function installedAgentLookupError(
  lookup: Exclude<InstalledAgentLookup, {status: 'found'}>,
  kind: 'chat' | 'logs',
): string {
  if (lookup.status === 'error') {
    return lookup.message;
  }
  if (lookup.status === 'unavailable') {
    const override = kind === 'chat' ? '--agentInstanceId' : '--tenant and --instance';
    return `The installed-agent lookup is not available on this server yet.\n  Pass ${override}.`;
  }
  if (kind === 'chat') {
    return (
      'Error: agent chat needs an installed agent instance.\n' +
      '  packs agent install pack.ts\n' +
      '  Or pass --agentInstanceId.'
    );
  }
  return (
    'Error: agent logs need a tenant and an agent instance.\n' +
    '  packs agent install pack.ts\n' +
    '  Or pass --tenant and --instance.'
  );
}
