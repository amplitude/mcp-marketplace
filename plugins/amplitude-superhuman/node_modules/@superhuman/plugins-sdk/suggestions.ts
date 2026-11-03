import type {Suggestion} from './suggestion_types';
import type {SuggestionRequest} from './suggestion_types';
import type {SuggestionResponse} from './suggestion_types';
import {z} from 'zod';

// Runtime constraints and published JSON Schemas for the public payload types.
const SuggestionEndpointRequestSchema = z.strictObject({
  text: z.string().describe('The exact, complete text to check, without trimming or Unicode normalization.'),
} satisfies {[K in keyof SuggestionRequest]-?: z.ZodType<SuggestionRequest[K]>});

// .int() adds JavaScript's safe-integer ceiling, not a text-size limit.
// Consumers must also validate each range and original against the request text.
const SuggestionSchema = z.strictObject({
  startOffset: z.number().int().nonnegative().describe('Inclusive start position in UTF-16 code units; zero-based.'),
  endOffset: z
    .number()
    .int()
    .positive()
    .describe('Exclusive end position in UTF-16 code units; greater than startOffset.'),
  original: z.string().min(1).describe('The exact portion of the request text between the two offsets.'),
  title: z.string().min(1).describe('Short heading displayed on the suggestion card.'),
  explanation: z.string().min(1).describe('Explanation displayed on the suggestion card.'),
  replacement: z
    .string()
    .optional()
    .describe('Plain-text replacement. Omit for advice only; an empty string deletes the selected text.'),
} satisfies {[K in keyof Suggestion]-?: z.ZodType<Suggestion[K]>});

const SuggestionEndpointResponseSchema = z.union([
  z.strictObject({
    suggestions: z.array(SuggestionSchema).max(500),
  } satisfies {[K in keyof Omit<SuggestionResponse, 'unavailable'>]-?: z.ZodType<SuggestionResponse[K]>}),
  z.strictObject({
    suggestions: z.array(z.unknown()).length(0),
    unavailable: z
      .string()
      .min(1)
      .max(200)
      .regex(/\S/u)
      .describe(
        'Provider could not assess text. Use a brief non-sensitive reason; never display, forward, or retain it.',
      ),
  } satisfies {[K in keyof Required<SuggestionResponse>]: z.ZodType<unknown>}),
]);

/**
 * JSON Schema for an HTTP suggestion request, generated from the Zod validator.
 * @hidden Experimental early access; the shape may change.
 */
export const SuggestionEndpointRequestJsonSchema: z.core.JSONSchema.JSONSchema = z.toJSONSchema(
  SuggestionEndpointRequestSchema,
  {io: 'input'},
);

/**
 * JSON Schema for an HTTP suggestion response. Offsets and original text also require runtime checks.
 * @hidden Experimental early access; the shape may change.
 */
export const SuggestionEndpointResponseJsonSchema: z.core.JSONSchema.JSONSchema = z.toJSONSchema(
  SuggestionEndpointResponseSchema,
  {io: 'input'},
);
