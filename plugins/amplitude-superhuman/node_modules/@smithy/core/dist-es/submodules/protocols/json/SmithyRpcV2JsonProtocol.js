import { AbstractRpcV2Protocol } from "../AbstractRpcV2Protocol";
import { NormalizedSchema, TypeRegistry } from "@smithy/core/schema";
import { JsonCodec2 } from "./codec-v2/JsonCodec2";
import { loadSmithyRpcV2JsonErrorCode } from "./parseJsonBody";
export class SmithyRpcV2JsonProtocol extends AbstractRpcV2Protocol {
    codec = new JsonCodec2({
        timestampFormat: {
            useTrait: false,
            default: 7,
        },
        jsonName: false,
        bigNumberAsString: true,
    });
    serializer = this.codec.createSerializer();
    deserializer = this.codec.createDeserializer();
    getShapeId() {
        return "smithy.protocols#rpcv2Json";
    }
    getPayloadCodec() {
        return this.codec;
    }
    getSmithyProtocolHeaderValue() {
        return "rpc-v2-json";
    }
    applyEmptyBody(request) {
        if (!request.body) {
            request.body = "{}";
        }
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
        const errorName = loadSmithyRpcV2JsonErrorCode(response, dataObject) ?? "Unknown";
        const errorMetadata = {
            $metadata: metadata,
            $fault: response.statusCode <= 500 ? "client" : "server",
        };
        let namespace = this.options.defaultNamespace;
        if (errorName.includes("#")) {
            [namespace] = errorName.split("#");
        }
        const registry = this.compositeErrorRegistry;
        const nsRegistry = TypeRegistry.for(namespace);
        registry.copyFrom(nsRegistry);
        let errorSchema;
        try {
            errorSchema = registry.getSchema(errorName);
        }
        catch (ignored) {
            if (dataObject.Message) {
                dataObject.message = dataObject.Message;
            }
            const syntheticRegistry = TypeRegistry.for("smithy.ts.sdk.synthetic." + namespace);
            registry.copyFrom(syntheticRegistry);
            const baseExceptionSchema = registry.getBaseException();
            if (baseExceptionSchema) {
                const ErrorCtor = registry.getErrorCtor(baseExceptionSchema);
                throw Object.assign(new ErrorCtor({ name: errorName }), errorMetadata, dataObject);
            }
            throw Object.assign(new Error(errorName), errorMetadata, dataObject);
        }
        const ns = NormalizedSchema.of(errorSchema);
        const ErrorCtor = registry.getErrorCtor(errorSchema);
        const message = dataObject.message ?? dataObject.Message ?? "Unknown";
        const exception = new ErrorCtor({});
        const output = {};
        const errorDeserializer = this.codec.createDeserializer();
        for (const [name, member] of ns.structIterator()) {
            if (dataObject[name] != null) {
                output[name] = errorDeserializer.readObject(member, dataObject[name]);
            }
        }
        throw Object.assign(exception, errorMetadata, {
            $fault: ns.getMergedTraits().error,
            message,
        }, output);
    }
    getDefaultContentType() {
        return "application/json";
    }
}
