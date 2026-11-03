import type { ArgumentsCamelCase } from 'yargs';
import type { ConnectorAccessArgs } from './connector_access';
interface CreateArgs extends ConnectorAccessArgs {
    manifestFile: string;
    apiEndpoint: string;
    name?: string;
    description?: string;
    workspace?: string;
    apiToken?: string;
}
export declare function handleCreate({ manifestFile, apiEndpoint, name, description, workspace, allowedAgents, allowAllAgents, apiToken, }: ArgumentsCamelCase<CreateArgs>): Promise<void>;
export declare function createPack(manifestFile: string, apiEndpoint: string, { name, description, workspace, allowedAgentIds, }: {
    name?: string;
    description?: string;
    workspace?: string;
    allowedAgentIds?: number[] | null;
}, apiToken?: string): Promise<never>;
export {};
