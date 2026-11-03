import type {Options} from 'yargs';
import {printAndExit} from '../testing/helpers';
import {z} from 'zod';

export interface ConnectorAccessArgs {
  allowedAgents?: number[];
  allowAllAgents?: boolean;
}

// Matches maxItems on allowedAgentIds in the Pack API schema.
const MaxAllowedAgentIds = 100;

export const AllowedAgentIdsSchema = z
  .array(z.number().int().min(1).max(2147483647))
  .max(MaxAllowedAgentIds)
  .refine(ids => new Set(ids).size === ids.length, 'Use each agent Pack ID only once.');

export const ConnectorAccessOptions = {
  allowedAgents: {
    array: true,
    number: true,
    describe:
      'Agent Pack IDs that can use the connector. This replaces the whole list. With no IDs, no agents can use it.',
  },
  allowAllAgents: {
    boolean: true,
    describe: 'Let every agent use the connector.',
  },
} satisfies Record<string, Options>;

export function parseConnectorAccess(args: ConnectorAccessArgs): number[] | null | undefined {
  const {allowedAgents, allowAllAgents} = args;
  if (allowAllAgents && allowedAgents !== undefined) {
    return printAndExit('Error: Use either --allowedAgents or --allowAllAgents, not both.');
  }
  if (allowAllAgents) {
    return null;
  }
  if (allowedAgents === undefined) {
    return undefined;
  }
  const result = AllowedAgentIdsSchema.safeParse(allowedAgents);
  if (!result.success) {
    return printAndExit(
      `Error: --allowedAgents must contain at most ${MaxAllowedAgentIds} unique integer Pack IDs from 1 to 2147483647.`,
    );
  }
  return result.data;
}
