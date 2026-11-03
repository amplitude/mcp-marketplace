import { z } from 'zod';
export interface ConnectorAccessArgs {
    allowedAgents?: number[];
    allowAllAgents?: boolean;
}
export declare const AllowedAgentIdsSchema: z.ZodArray<z.ZodNumber>;
export declare const ConnectorAccessOptions: {
    allowedAgents: {
        array: true;
        number: true;
        describe: string;
    };
    allowAllAgents: {
        boolean: true;
        describe: string;
    };
};
export declare function parseConnectorAccess(args: ConnectorAccessArgs): number[] | null | undefined;
