import { AbstractRpcV2Protocol } from "@smithy/core/protocols";
import { HandlerExecutionContext, HttpRequest as IHttpRequest, HttpResponse as IHttpResponse, OperationSchema, ResponseMetadata, SerdeFunctions } from "@smithy/types";
import { CborCodec } from "./CborCodec";
/**
 * Client protocol for Smithy RPCv2 CBOR.
 *
 * @public
 */
export declare class SmithyRpcV2CborProtocol extends AbstractRpcV2Protocol {
    private codec;
    protected serializer: import(".").CborShapeSerializer2;
    protected deserializer: import(".").CborShapeDeserializer2;
    getShapeId(): string;
    getPayloadCodec(): CborCodec;
    protected getSmithyProtocolHeaderValue(): string;
    protected applyEmptyBody(request: IHttpRequest): void;
    protected handleError(operationSchema: OperationSchema, context: HandlerExecutionContext & SerdeFunctions, response: IHttpResponse, dataObject: any, metadata: ResponseMetadata): Promise<never>;
    protected getDefaultContentType(): string;
}
