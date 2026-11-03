/** @hidden In early access, live in production but the shape may change. */
export interface SuggestionRequest {
  /**
   * The exact, complete text to check, without trimming or Unicode normalization.
   */
  text: string;
}

/** @hidden In early access, live in production but the shape may change. */
interface SuggestionEndpointSuccessResponse {
  /** At most 500 suggestions from a completed check. */
  suggestions: Suggestion[];
}
/** @hidden In early access, live in production but the shape may change. */
export interface Suggestion {
  /**
   * Inclusive start position in UTF-16 code units; zero-based.
   */
  startOffset: number;
  /**
   * Exclusive end position in UTF-16 code units; greater than startOffset.
   */
  endOffset: number;
  /**
   * The exact portion of the request text between the two offsets.
   */
  original: string;
  /**
   * Short heading displayed on the suggestion card.
   */
  title: string;
  /**
   * Explanation displayed on the suggestion card.
   */
  explanation: string;
  /**
   * Plain-text replacement. Omit for advice only; an empty string deletes the selected text.
   */
  replacement?: string;
}

/** @hidden In early access, live in production but the shape may change. */
interface SuggestionEndpointUnavailableResponse {
  /** An unavailable check returns no suggestions. */
  suggestions: [];
  /**
   * Provider could not assess text. Existing suggestions are preserved without an LLM fallback.
   * Use a brief, non-sensitive reason without request text; never display, forward, or retain it.
   * Use non-2xx HTTP responses for service failures.
   */
  unavailable: string;
}

/** @hidden In early access, live in production but the shape may change. */
export type SuggestionResponse =
  | (SuggestionEndpointSuccessResponse & {unavailable?: never})
  | SuggestionEndpointUnavailableResponse;
