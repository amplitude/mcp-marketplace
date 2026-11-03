import requestSchema from './schemas/suggestion-request.json';
import responseSchema from './schemas/suggestion-response.json';

/**
 * JSON Schema for requests to HTTP suggestion providers.
 * @hidden Experimental early access; the shape may change.
 */
export const SuggestionEndpointRequestJsonSchema: Record<string, unknown> = requestSchema;

/**
 * JSON Schema for responses from HTTP suggestion providers. Validate offsets against the request text as well.
 * @hidden Experimental early access; the shape may change.
 */
export const SuggestionEndpointResponseJsonSchema: Record<string, unknown> = responseSchema;
