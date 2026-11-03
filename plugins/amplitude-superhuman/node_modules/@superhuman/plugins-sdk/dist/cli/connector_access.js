"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseConnectorAccess = exports.ConnectorAccessOptions = exports.AllowedAgentIdsSchema = void 0;
const helpers_1 = require("../testing/helpers");
const zod_1 = require("zod");
// Matches maxItems on allowedAgentIds in the Pack API schema.
const MaxAllowedAgentIds = 100;
exports.AllowedAgentIdsSchema = zod_1.z
    .array(zod_1.z.number().int().min(1).max(2147483647))
    .max(MaxAllowedAgentIds)
    .refine(ids => new Set(ids).size === ids.length, 'Use each agent Pack ID only once.');
exports.ConnectorAccessOptions = {
    allowedAgents: {
        array: true,
        number: true,
        describe: 'Agent Pack IDs that can use the connector. This replaces the whole list. With no IDs, no agents can use it.',
    },
    allowAllAgents: {
        boolean: true,
        describe: 'Let every agent use the connector.',
    },
};
function parseConnectorAccess(args) {
    const { allowedAgents, allowAllAgents } = args;
    if (allowAllAgents && allowedAgents !== undefined) {
        return (0, helpers_1.printAndExit)('Error: Use either --allowedAgents or --allowAllAgents, not both.');
    }
    if (allowAllAgents) {
        return null;
    }
    if (allowedAgents === undefined) {
        return undefined;
    }
    const result = exports.AllowedAgentIdsSchema.safeParse(allowedAgents);
    if (!result.success) {
        return (0, helpers_1.printAndExit)(`Error: --allowedAgents must contain at most ${MaxAllowedAgentIds} unique integer Pack IDs from 1 to 2147483647.`);
    }
    return result.data;
}
exports.parseConnectorAccess = parseConnectorAccess;
