import { EndpointBearer, HandlerExecutionContext, HttpRequest as IHttpRequest, OperationSchema, SerdeFunctions } from "@smithy/types";
import { TypeRegistry } from "@smithy/core/schema";
import { RpcProtocol } from "./RpcProtocol";
/**
 * Shared abstract base for the Smithy RPC v2 client protocols (JSON and CBOR).
 *
 * Factors out the request-framing flow and response status handling that are
 * identical across both RPC v2 protocols. Concrete protocols supply their
 * codec, error handling, content type, shape id, and the two per-protocol
 * request details via {@link getSmithyProtocolHeaderValue} and
 * {@link applyEmptyBody}.
 *
 * @internal
 */
export declare abstract class AbstractRpcV2Protocol extends RpcProtocol {
    /**
     * @override
     */
    protected compositeErrorRegistry: TypeRegistry;
    constructor({ defaultNamespace, errorTypeRegistries, }: {
        defaultNamespace: string;
        errorTypeRegistries?: TypeRegistry[];
    });
    serializeRequest<Input extends object>(operationSchema: OperationSchema, input: Input, context: HandlerExecutionContext & SerdeFunctions & EndpointBearer): Promise<IHttpRequest>;
    /**
     * @override
     *
     * Per the Smithy RPC v2 specification, the only successful response status
     * code is 200; any other status code MUST be handled as an error.
     */
    protected isErrorResponse(statusCode: number): boolean;
    /**
     * @returns the value of the `smithy-protocol` header for this protocol,
     * e.g. `rpc-v2-json` or `rpc-v2-cbor`.
     */
    protected abstract getSmithyProtocolHeaderValue(): string;
    /**
     * Applies this protocol's representation of an empty request body when the
     * operation has a non-unit input but produced no serialized body. Called
     * only for non-unit inputs.
     *
     * @param request - the request being serialized, mutated in place.
     */
    protected abstract applyEmptyBody(request: IHttpRequest): void;
}
