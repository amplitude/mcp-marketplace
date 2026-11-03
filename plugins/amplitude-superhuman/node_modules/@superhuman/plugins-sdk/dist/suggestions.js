"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuggestionEndpointResponseJsonSchema = exports.SuggestionEndpointRequestJsonSchema = void 0;
const zod_1 = require("zod");
// Runtime constraints and published JSON Schemas for the public payload types.
const SuggestionEndpointRequestSchema = zod_1.z.strictObject({
    text: zod_1.z.string().describe('The exact, complete text to check, without trimming or Unicode normalization.'),
});
// .int() adds JavaScript's safe-integer ceiling, not a text-size limit.
// Consumers must also validate each range and original against the request text.
const SuggestionSchema = zod_1.z.strictObject({
    startOffset: zod_1.z.number().int().nonnegative().describe('Inclusive start position in UTF-16 code units; zero-based.'),
    endOffset: zod_1.z
        .number()
        .int()
        .positive()
        .describe('Exclusive end position in UTF-16 code units; greater than startOffset.'),
    original: zod_1.z.string().min(1).describe('The exact portion of the request text between the two offsets.'),
    title: zod_1.z.string().min(1).describe('Short heading displayed on the suggestion card.'),
    explanation: zod_1.z.string().min(1).describe('Explanation displayed on the suggestion card.'),
    replacement: zod_1.z
        .string()
        .optional()
        .describe('Plain-text replacement. Omit for advice only; an empty string deletes the selected text.'),
});
const SuggestionEndpointResponseSchema = zod_1.z.union([
    zod_1.z.strictObject({
        suggestions: zod_1.z.array(SuggestionSchema).max(500),
    }),
    zod_1.z.strictObject({
        suggestions: zod_1.z.array(zod_1.z.unknown()).length(0),
        unavailable: zod_1.z
            .string()
            .min(1)
            .max(200)
            .regex(/\S/u)
            .describe('Provider could not assess text. Use a brief non-sensitive reason; never display, forward, or retain it.'),
    }),
]);
/**
 * JSON Schema for an HTTP suggestion request, generated from the Zod validator.
 * @hidden Experimental early access; the shape may change.
 */
exports.SuggestionEndpointRequestJsonSchema = zod_1.z.toJSONSchema(SuggestionEndpointRequestSchema, { io: 'input' });
/**
 * JSON Schema for an HTTP suggestion response. Offsets and original text also require runtime checks.
 * @hidden Experimental early access; the shape may change.
 */
exports.SuggestionEndpointResponseJsonSchema = zod_1.z.toJSONSchema(SuggestionEndpointResponseSchema, { io: 'input' });
