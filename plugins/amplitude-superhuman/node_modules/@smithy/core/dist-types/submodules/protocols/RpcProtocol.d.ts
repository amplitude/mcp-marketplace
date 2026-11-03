import { type TypeRegistry } from "@smithy/core/schema";
import type { EndpointBearer, HandlerExecutionContext, HttpRequest as IHttpRequest, HttpResponse as IHttpResponse, MetadataBearer, OperationSchema, SerdeFunctions } from "@smithy/types";
import { HttpProtocol } from "./HttpProtocol";
/**
 * Abstract base for RPC-over-HTTP protocols.
 *
 * @public
 */
export declare abstract class RpcProtocol extends HttpProtocol {
    /**
     * @override
     */
    protected compositeErrorRegistry: TypeRegistry;
    serializeRequest<Input extends object>(operationSchema: OperationSchema, _input: Input, context: HandlerExecutionContext & SerdeFunctions & EndpointBearer): Promise<IHttpRequest>;
    deserializeResponse<Output extends MetadataBearer>(operationSchema: OperationSchema, context: HandlerExecutionContext & SerdeFunctions, response: IHttpResponse): Promise<Output>;
    /**
     * Determines whether a response status code indicates an error response that
     * should be routed to {@link handleError} rather than deserialized as output.
     *
     * The default treats any status code of 300 or greater as an error,
     * preserving the historical behavior for RPC-over-HTTP protocols. Subclasses
     * whose specification is stricter SHOULD override this.
     *
     * @param statusCode - the HTTP response status code.
     * @returns true if the response should be handled as an error.
     */
    protected isErrorResponse(statusCode: number): boolean;
}
