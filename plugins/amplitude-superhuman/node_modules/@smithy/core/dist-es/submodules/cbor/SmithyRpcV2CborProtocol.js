import { AbstractRpcV2Protocol } from "@smithy/core/protocols";
import { NormalizedSchema, TypeRegistry } from "@smithy/core/schema";
import { CborCodec } from "./CborCodec";
import { loadSmithyRpcV2CborErrorCode } from "./parseCborBody";
export class SmithyRpcV2CborProtocol extends AbstractRpcV2Protocol {
    codec = new CborCodec();
    serializer = this.codec.createSerializer();
    deserializer = this.codec.createDeserializer();
    getShapeId() {
        return "smithy.protocols#rpcv2Cbor";
    }
    getPayloadCodec() {
        return this.codec;
    }
    getSmithyProtocolHeaderValue() {
        return "rpc-v2-cbor";
    }
    applyEmptyBody(request) {
        if (!request.body) {
            this.serializer.write(15, {});
            request.body = this.serializer.flush();
        }
        if (request.body instanceof Uint8Array) {
            request.headers["content-length"] = String(request.body.byteLength);
        }
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
        const errorIdentifier = loadSmithyRpcV2CborErrorCode(response, dataObject) ?? "Unknown";
        const preferredNamespaces = ["*"];
        const { defaultNamespace } = this.options;
        preferredNamespaces.unshift(defaultNamespace);
        const [namespace, errorShapeName] = (() => {
            if (errorIdentifier.includes("#")) {
                return errorIdentifier.split("#");
            }
            return [undefined, errorIdentifier];
        })();
        if (namespace) {
            preferredNamespaces.unshift(namespace);
        }
        const errorMetadata = {
            $metadata: metadata,
            $fault: response.statusCode < 500 ? "client" : "server",
        };
        const preferredRegistries = [this.compositeErrorRegistry];
        if (namespace) {
            preferredRegistries.push(TypeRegistry.for(namespace));
        }
        preferredRegistries.push(TypeRegistry.for(defaultNamespace));
        const [errorSchema, ErrorCtor, errorMode] = this.resolveError(errorShapeName, preferredNamespaces, preferredRegistries);
        if (errorMode === "native" || errorMode === "synthetic") {
            if (dataObject.Message) {
                dataObject.message = dataObject.Message;
            }
            const error = errorMode === "synthetic" ? new ErrorCtor({ name: errorShapeName }) : new Error(errorShapeName);
            throw Object.assign(error, errorMetadata, dataObject);
        }
        const ns = NormalizedSchema.of(errorSchema);
        const message = dataObject.message ?? dataObject.Message ?? "Unknown";
        const exception = new ErrorCtor({});
        const output = {};
        for (const [name, member] of ns.structIterator()) {
            output[name] = this.deserializer.readValue(member, dataObject[name]);
        }
        throw Object.assign(exception, errorMetadata, {
            $fault: ns.getMergedTraits().error,
            message,
        }, output);
    }
    getDefaultContentType() {
        return "application/cbor";
    }
}
