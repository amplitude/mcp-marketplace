import { TypeRegistry } from "@smithy/core/schema";
import { JsonCodec, JsonCodec2 } from "@smithy/core/protocols";
import { AwsJsonRpcProtocol } from "./AwsJsonRpcProtocol";
export declare class AwsJson1_0Protocol extends AwsJsonRpcProtocol {
  constructor({
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
  getShapeId(): string;
  protected getJsonRpcVersion(): "1.0";
  protected getDefaultContentType(): string;
}
