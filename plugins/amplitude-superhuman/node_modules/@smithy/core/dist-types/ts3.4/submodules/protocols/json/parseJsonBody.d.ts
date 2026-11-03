import { HttpResponse, Schema, SerdeFunctions } from "@smithy/types";
/**
 * @deprecated new calls to parseJsonBody must pass schema.
 * @internal
 */
export declare function parseJsonBody(streamBody: any, context: SerdeFunctions): Promise<any>;
/**
 * @internal
 */
export declare function parseJsonBody(streamBody: any, context: SerdeFunctions, schema: Schema): Promise<any>;
/**
 * @internal
 */
export declare const parseJsonErrorBody: (errorBody: any, context: SerdeFunctions) => Promise<any>;
/**
 * @internal
 */
export declare const loadRestJsonErrorCode: (output: HttpResponse, data: any) => string | undefined;
/**
 * @internal
 */
export declare const loadJsonRpcErrorCode: (output: HttpResponse, data: any, queryCompat?: boolean) => string | undefined;
/**
 * Smithy RPCv2 JSON error identifier loader.
 *
 * Unlike {@link loadJsonRpcErrorCode} (used by AWS JSON 1.0/1.1 and restJson1),
 * this preserves the ABSOLUTE shape id carried in `__type`. The RPCv2 JSON SEP
 * requires `__type` to contain the fully-qualified shape id, and the protocol
 * resolves errors by that absolute id to avoid ambiguous resolution when the
 * same shape name exists in more than one namespace.
 *
 * It trims the Smithy-specific `,` fault/tag suffix and the `:` suffix, but does
 * NOT strip the `#` namespace separator:
 *   "com.a.b#Error:Sender,tag" -> "com.a.b#Error"
 *
 * @internal
 */
export declare const loadSmithyRpcV2JsonErrorCode: (output: HttpResponse, data: any) => string | undefined;
