import { JsonCodec2, RpcProtocol } from "@smithy/core/protocols";
import { JsonCodec } from "@smithy/core/protocols";
import { TypeRegistry } from "@smithy/core/schema";
import {
  EndpointBearer,
  HandlerExecutionContext,
  HttpRequest,
  HttpResponse,
  OperationSchema,
  ResponseMetadata,
  SerdeFunctions,
  ShapeDeserializer,
  ShapeSerializer,
} from "@smithy/types";
export declare abstract class AwsJsonRpcProtocol extends RpcProtocol {
  protected serializer: ShapeSerializer<string | Uint8Array>;
  protected deserializer: ShapeDeserializer<string | Uint8Array>;
  protected serviceTarget: string;
  private readonly codec;
  private readonly mixin;
  private readonly awsQueryCompatible;
  protected constructor({
    defaultNamespace,
    errorTypeRegistries,
    serviceTarget,
    awsQueryCompatible,
    jsonCodec,
  }: {
    defaultNamespace: string;
    errorTypeRegistries?: TypeRegistry[];
    serviceTarget: string;
    awsQueryCompatible?: boolean;
    jsonCodec?: JsonCodec | JsonCodec2;
  });
  serializeRequest<Input extends object>(
    operationSchema: OperationSchema,
    input: Input,
    context: HandlerExecutionContext & SerdeFunctions & EndpointBearer,
  ): Promise<HttpRequest>;
  getPayloadCodec(): JsonCodec | JsonCodec2;
  protected abstract getJsonRpcVersion(): "1.1" | "1.0";
  protected handleError(
    operationSchema: OperationSchema,
    context: HandlerExecutionContext & SerdeFunctions,
    response: HttpResponse,
    dataObject: any,
    metadata: ResponseMetadata,
  ): Promise<never>;
}
