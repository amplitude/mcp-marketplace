import { z } from 'zod';
/**
 * JSON Schema for an HTTP suggestion request, generated from the Zod validator.
 * @hidden Experimental early access; the shape may change.
 */
export declare const SuggestionEndpointRequestJsonSchema: z.core.JSONSchema.JSONSchema;
/**
 * JSON Schema for an HTTP suggestion response. Offsets and original text also require runtime checks.
 * @hidden Experimental early access; the shape may change.
 */
export declare const SuggestionEndpointResponseJsonSchema: z.core.JSONSchema.JSONSchema;
