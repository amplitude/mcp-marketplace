import { AbstractRpcV2Protocol } from "../AbstractRpcV2Protocol";
import { HandlerExecutionContext, HttpRequest as IHttpRequest, HttpResponse as IHttpResponse, OperationSchema, ResponseMetadata, SerdeFunctions, ShapeDeserializer, ShapeSerializer } from "@smithy/types";
import { JsonCodec2 } from "./codec-v2/JsonCodec2";
/**
 * Client protocol for Smithy RPCv2 JSON.
 *
 * @public
 */
export declare class SmithyRpcV2JsonProtocol extends AbstractRpcV2Protocol {
    private codec;
    protected serializer: ShapeSerializer<string | Uint8Array>;
    protected deserializer: ShapeDeserializer<string | Uint8Array>;
    getShapeId(): string;
    getPayloadCodec(): JsonCodec2;
    protected getSmithyProtocolHeaderValue(): string;
    protected applyEmptyBody(request: IHttpRequest): void;
    protected handleError(operationSchema: OperationSchema, context: HandlerExecutionContext & SerdeFunctions, response: IHttpResponse, dataObject: any, metadata: ResponseMetadata): Promise<never>;
    protected getDefaultContentType(): string;
}
