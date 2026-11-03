const { SmithyRpcV2CborProtocol, loadSmithyRpcV2CborErrorCode } = require("@smithy/core/cbor");
const { TypeRegistry, NormalizedSchema, deref } = require("@smithy/core/schema");
const { decorateServiceException, getValueFromTextNode } = require("@smithy/core/client");
const { RpcProtocol, JsonCodec2, loadJsonRpcErrorCode, HttpBindingProtocol, HttpInterceptingShapeSerializer, HttpInterceptingShapeDeserializer, loadRestJsonErrorCode, FromStringShapeDeserializer, determineTimestampFormat, extendedEncodeURIComponent, collectBody } = require("@smithy/core/protocols");
const { JsonCodec, JsonShapeDeserializer, JsonShapeDeserializer2, JsonShapeSerializer, JsonShapeSerializer2, parseJsonBody, parseJsonErrorBody } = require("@smithy/core/protocols");
exports.JsonCodec = JsonCodec;
exports.JsonCodec2 = JsonCodec2;
exports.JsonShapeDeserializer = JsonShapeDeserializer;
exports.JsonShapeDeserializer2 = JsonShapeDeserializer2;
exports.JsonShapeSerializer = JsonShapeSerializer;
exports.JsonShapeSerializer2 = JsonShapeSerializer2;
exports.loadJsonRpcErrorCode = loadJsonRpcErrorCode;
exports.loadRestJsonErrorCode = loadRestJsonErrorCode;
exports.parseJsonBody = parseJsonBody;
exports.parseJsonErrorBody = parseJsonErrorBody;
const { parseXML, XmlNode, XmlText } = require("@aws-sdk/xml-builder");
const { toUtf8, toBase64, generateIdempotencyToken, NumericValue, dateToUtcString, fromBase64, expectUnion } = require("@smithy/core/serde");

class ProtocolLib {
    queryCompat;
    errorRegistry;
    constructor(queryCompat = false) {
        this.queryCompat = queryCompat;
    }
    resolveRestContentType(defaultContentType, inputSchema) {
        const members = inputSchema.getMemberSchemas();
        const httpPayloadMember = Object.values(members).find((m) => {
            return !!m.getMergedTraits().httpPayload;
        });
        if (httpPayloadMember) {
            const mediaType = httpPayloadMember.getMergedTraits().mediaType;
            if (mediaType) {
                return mediaType;
            }
            else if (httpPayloadMember.isStringSchema()) {
                return "text/plain";
            }
            else if (httpPayloadMember.isBlobSchema()) {
                return "application/octet-stream";
            }
            else {
                return defaultContentType;
            }
        }
        else if (!inputSchema.isUnitSchema()) {
            const hasBody = Object.values(members).find((m) => {
                const { httpQuery, httpQueryParams, httpHeader, httpLabel, httpPrefixHeaders } = m.getMergedTraits();
                const noPrefixHeaders = httpPrefixHeaders === void 0;
                return !httpQuery && !httpQueryParams && !httpHeader && !httpLabel && noPrefixHeaders;
            });
            if (hasBody) {
                return defaultContentType;
            }
        }
    }
    async getErrorSchemaOrThrowBaseException(errorIdentifier, defaultNamespace, response, dataObject, metadata, getErrorSchema) {
        let errorName = errorIdentifier;
        if (errorIdentifier.includes("#")) {
            [, errorName] = errorIdentifier.split("#");
        }
        const errorMetadata = {
            $metadata: metadata,
            $fault: response.statusCode < 500 ? "client" : "server",
        };
        if (!this.errorRegistry) {
            throw new Error("@aws-sdk/core/protocols - error handler not initialized.");
        }
        try {
            const errorSchema = getErrorSchema?.(this.errorRegistry, errorName) ??
                this.errorRegistry.getSchema(errorIdentifier);
            return { errorSchema, errorMetadata };
        }
        catch (e) {
            dataObject.message = dataObject.message ?? dataObject.Message ?? "UnknownError";
            const synthetic = this.errorRegistry;
            const baseExceptionSchema = synthetic.getBaseException();
            if (baseExceptionSchema) {
                const ErrorCtor = synthetic.getErrorCtor(baseExceptionSchema) ?? Error;
                throw this.decorateServiceException(Object.assign(new ErrorCtor({ name: errorName }), errorMetadata), dataObject);
            }
            const d = dataObject;
            const message = d?.message ?? d?.Message ?? d?.Error?.Message ?? d?.Error?.message;
            throw this.decorateServiceException(Object.assign(new Error(message), {
                name: errorName,
            }, errorMetadata), dataObject);
        }
    }
    compose(composite, errorIdentifier, defaultNamespace) {
        let namespace = defaultNamespace;
        if (errorIdentifier.includes("#")) {
            [namespace] = errorIdentifier.split("#");
        }
        const staticRegistry = TypeRegistry.for(namespace);
        const defaultSyntheticRegistry = TypeRegistry.for("smithy.ts.sdk.synthetic." + defaultNamespace);
        composite.copyFrom(staticRegistry);
        composite.copyFrom(defaultSyntheticRegistry);
        this.errorRegistry = composite;
    }
    decorateServiceException(exception, additions = {}) {
        if (this.queryCompat) {
            const msg = exception.Message ?? additions.Message;
            const error = decorateServiceException(exception, additions);
            if (msg) {
                error.message = msg;
            }
            const errorObj = error.Error ?? {};
            errorObj.Type = error.Error?.Type;
            errorObj.Code = error.Error?.Code;
            errorObj.Message = error.Error?.message ?? error.Error?.Message ?? msg;
            error.Error = errorObj;
            const reqId = error.$metadata.requestId;
            if (reqId) {
                error.RequestId = reqId;
            }
            return error;
        }
        return decorateServiceException(exception, additions);
    }
    setQueryCompatError(output, response) {
        const queryErrorHeader = response.headers?.["x-amzn-query-error"];
        if (output !== undefined && queryErrorHeader != null) {
            const [Code, Type] = queryErrorHeader.split(";");
            const keys = Object.keys(output);
            const Error = {
                Code,
                Type,
            };
            output.Code = Code;
            output.Type = Type;
            for (let i = 0; i < keys.length; i++) {
                const k = keys[i];
                Error[k === "message" ? "Message" : k] = output[k];
            }
            delete Error.__type;
            output.Error = Error;
        }
    }
    queryCompatOutput(queryCompatErrorData, errorData) {
        if (queryCompatErrorData.Error) {
            errorData.Error = queryCompatErrorData.Error;
        }
        if (queryCompatErrorData.Type) {
            errorData.Type = queryCompatErrorData.Type;
        }
        if (queryCompatErrorData.Code) {
            errorData.Code = queryCompatErrorData.Code;
        }
    }
    findQueryCompatibleError(registry, errorName) {
        try {
            return registry.getSchema(errorName);
        }
        catch (e) {
            return registry.find((schema) => NormalizedSchema.of(schema).getMergedTraits().awsQueryError?.[0] === errorName);
        }
    }
}

class AwsSmithyRpcV2CborProtocol extends SmithyRpcV2CborProtocol {
    awsQueryCompatible;
    mixin;
    constructor({ defaultNamespace, errorTypeRegistries, awsQueryCompatible, }) {
        super({ defaultNamespace, errorTypeRegistries });
        this.awsQueryCompatible = !!awsQueryCompatible;
        this.mixin = new ProtocolLib(this.awsQueryCompatible);
    }
    async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        if (this.awsQueryCompatible) {
            request.headers["x-amzn-query-mode"] = "true";
        }
        return request;
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
        if (this.awsQueryCompatible) {
            this.mixin.setQueryCompatError(dataObject, response);
        }
        const errorName = (() => {
            const compatHeader = response.headers["x-amzn-query-error"];
            if (compatHeader && this.awsQueryCompatible) {
                return compatHeader.split(";")[0];
            }
            return loadSmithyRpcV2CborErrorCode(response, dataObject) ?? "Unknown";
        })();
        this.mixin.compose(this.compositeErrorRegistry, errorName, this.options.defaultNamespace);
        const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorName, this.options.defaultNamespace, response, dataObject, metadata, this.awsQueryCompatible ? this.mixin.findQueryCompatibleError : undefined);
        const ns = NormalizedSchema.of(errorSchema);
        const message = dataObject.message ?? dataObject.Message ?? "UnknownError";
        const ErrorCtor = this.compositeErrorRegistry.getErrorCtor(errorSchema) ?? Error;
        const exception = new ErrorCtor({});
        const output = {};
        for (const [name, member] of ns.structIterator()) {
            if (dataObject[name] != null) {
                output[name] = this.deserializer.readValue(member, dataObject[name]);
            }
        }
        if (this.awsQueryCompatible) {
            this.mixin.queryCompatOutput(dataObject, output);
        }
        throw this.mixin.decorateServiceException(Object.assign(exception, errorMetadata, {
            $fault: ns.getMergedTraits().error,
            message,
        }, output), dataObject);
    }
}

class AwsJsonRpcProtocol extends RpcProtocol {
    serializer;
    deserializer;
    serviceTarget;
    codec;
    mixin;
    awsQueryCompatible;
    constructor({ defaultNamespace, errorTypeRegistries, serviceTarget, awsQueryCompatible, jsonCodec, }) {
        super({
            defaultNamespace,
            errorTypeRegistries,
        });
        this.serviceTarget = serviceTarget;
        this.codec =
            jsonCodec ??
                new JsonCodec2({
                    timestampFormat: {
                        useTrait: true,
                        default: 7,
                    },
                    jsonName: false,
                });
        this.serializer = this.codec.createSerializer();
        this.deserializer = this.codec.createDeserializer();
        this.awsQueryCompatible = !!awsQueryCompatible;
        this.mixin = new ProtocolLib(this.awsQueryCompatible);
    }
    async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        if (!request.path.endsWith("/")) {
            request.path += "/";
        }
        request.headers["content-type"] = `application/x-amz-json-${this.getJsonRpcVersion()}`;
        request.headers["x-amz-target"] = `${this.serviceTarget}.${operationSchema.name}`;
        if (this.awsQueryCompatible) {
            request.headers["x-amzn-query-mode"] = "true";
        }
        if (deref(operationSchema.input) === "unit" || !request.body) {
            request.body = "{}";
        }
        return request;
    }
    getPayloadCodec() {
        return this.codec;
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
        const { awsQueryCompatible } = this;
        if (awsQueryCompatible) {
            this.mixin.setQueryCompatError(dataObject, response);
        }
        const errorIdentifier = loadJsonRpcErrorCode(response, dataObject, awsQueryCompatible) ?? "Unknown";
        this.mixin.compose(this.compositeErrorRegistry, errorIdentifier, this.options.defaultNamespace);
        const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorIdentifier, this.options.defaultNamespace, response, dataObject, metadata, awsQueryCompatible ? this.mixin.findQueryCompatibleError : undefined);
        const ns = NormalizedSchema.of(errorSchema);
        const message = dataObject.message ?? dataObject.Message ?? "UnknownError";
        const ErrorCtor = this.compositeErrorRegistry.getErrorCtor(errorSchema) ?? Error;
        const exception = new ErrorCtor({});
        const output = {};
        const errorDeserializer = this.codec.createDeserializer();
        for (const [name, member] of ns.structIterator()) {
            if (dataObject[name] != null) {
                output[name] = errorDeserializer.readObject(member, dataObject[name]);
            }
        }
        if (awsQueryCompatible) {
            this.mixin.queryCompatOutput(dataObject, output);
        }
        throw this.mixin.decorateServiceException(Object.assign(exception, errorMetadata, {
            $fault: ns.getMergedTraits().error,
            message,
        }, output), dataObject);
    }
}

class AwsJson1_0Protocol extends AwsJsonRpcProtocol {
    constructor({ defaultNamespace, errorTypeRegistries, serviceTarget, awsQueryCompatible, jsonCodec, }) {
        super({
            defaultNamespace,
            errorTypeRegistries,
            serviceTarget,
            awsQueryCompatible,
            jsonCodec,
        });
    }
    getShapeId() {
        return "aws.protocols#awsJson1_0";
    }
    getJsonRpcVersion() {
        return "1.0";
    }
    getDefaultContentType() {
        return "application/x-amz-json-1.0";
    }
}

class AwsJson1_1Protocol extends AwsJsonRpcProtocol {
    constructor({ defaultNamespace, errorTypeRegistries, serviceTarget, awsQueryCompatible, jsonCodec, }) {
        super({
            defaultNamespace,
            errorTypeRegistries,
            serviceTarget,
            awsQueryCompatible,
            jsonCodec,
        });
    }
    getShapeId() {
        return "aws.protocols#awsJson1_1";
    }
    getJsonRpcVersion() {
        return "1.1";
    }
    getDefaultContentType() {
        return "application/x-amz-json-1.1";
    }
}

class AwsRestJsonProtocol extends HttpBindingProtocol {
    serializer;
    deserializer;
    codec;
    mixin = new ProtocolLib();
    constructor({ defaultNamespace, errorTypeRegistries, jsonCodec, }) {
        super({
            defaultNamespace,
            errorTypeRegistries,
        });
        const settings = {
            timestampFormat: {
                useTrait: true,
                default: 7,
            },
            httpBindings: true,
            jsonName: true,
        };
        this.codec = jsonCodec ?? new JsonCodec2(settings);
        this.serializer = new HttpInterceptingShapeSerializer(this.codec.createSerializer(), settings);
        this.deserializer = new HttpInterceptingShapeDeserializer(this.codec.createDeserializer(), settings);
    }
    getShapeId() {
        return "aws.protocols#restJson1";
    }
    getPayloadCodec() {
        return this.codec;
    }
    setSerdeContext(serdeContext) {
        this.codec.setSerdeContext(serdeContext);
        super.setSerdeContext(serdeContext);
    }
    async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        const inputSchema = NormalizedSchema.of(operationSchema.input);
        if (!request.headers["content-type"]) {
            const contentType = this.mixin.resolveRestContentType(this.getDefaultContentType(), inputSchema);
            if (contentType) {
                request.headers["content-type"] = contentType;
            }
        }
        if (request.body == null && request.headers["content-type"] === this.getDefaultContentType()) {
            request.body = "{}";
        }
        return request;
    }
    async deserializeResponse(operationSchema, context, response) {
        const output = await super.deserializeResponse(operationSchema, context, response);
        const outputSchema = NormalizedSchema.of(operationSchema.output);
        for (const [name, member] of outputSchema.structIterator()) {
            if (member.getMemberTraits().httpPayload && !(name in output)) {
                output[name] = null;
            }
        }
        return output;
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
        const errorIdentifier = loadRestJsonErrorCode(response, dataObject) ?? "Unknown";
        this.mixin.compose(this.compositeErrorRegistry, errorIdentifier, this.options.defaultNamespace);
        const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorIdentifier, this.options.defaultNamespace, response, dataObject, metadata);
        const ns = NormalizedSchema.of(errorSchema);
        const message = dataObject.message ?? dataObject.Message ?? "UnknownError";
        const ErrorCtor = this.compositeErrorRegistry.getErrorCtor(errorSchema) ?? Error;
        const exception = new ErrorCtor({});
        await this.deserializeHttpMessage(errorSchema, context, response, dataObject);
        const output = {};
        const errorDeserializer = this.codec.createDeserializer();
        for (const [name, member] of ns.structIterator()) {
            const target = member.getMergedTraits().jsonName ?? name;
            output[name] = errorDeserializer.readObject(member, dataObject[target]);
        }
        throw this.mixin.decorateServiceException(Object.assign(exception, errorMetadata, {
            $fault: ns.getMergedTraits().error,
            message,
        }, output), dataObject);
    }
    getDefaultContentType() {
        return "application/json";
    }
}

class SerdeContextConfig {
    serdeContext;
    setSerdeContext(serdeContext) {
        this.serdeContext = serdeContext;
    }
}

class UnionSerde {
    from;
    to;
    keys;
    constructor(from, to) {
        this.from = from;
        this.to = to;
        const keys = Object.keys(this.from);
        const set = new Set(keys);
        set.delete("__type");
        this.keys = set;
    }
    mark(key) {
        this.keys.delete(key);
    }
    hasUnknown() {
        return this.keys.size === 1 && Object.keys(this.to).length === 0;
    }
    writeUnknown() {
        if (this.hasUnknown()) {
            const k = this.keys.values().next().value;
            const v = this.from[k];
            this.to.$unknown = [k, v];
        }
    }
}

function writeKey(obj) {
    Object.defineProperty(obj, "__proto__", { value: undefined, writable: true, enumerable: true, configurable: true });
}

class XmlShapeDeserializer extends SerdeContextConfig {
    settings;
    stringDeserializer;
    constructor(settings) {
        super();
        this.settings = settings;
        this.stringDeserializer = new FromStringShapeDeserializer(settings);
    }
    setSerdeContext(serdeContext) {
        this.serdeContext = serdeContext;
        this.stringDeserializer.setSerdeContext(serdeContext);
    }
    read(schema, bytes, key) {
        const ns = NormalizedSchema.of(schema);
        const memberSchemas = ns.getMemberSchemas();
        const isEventPayload = ns.isStructSchema() &&
            ns.isMemberSchema() &&
            !!Object.values(memberSchemas).find((memberNs) => {
                return !!memberNs.getMemberTraits().eventPayload;
            });
        if (isEventPayload) {
            const output = {};
            const memberName = Object.keys(memberSchemas)[0];
            const eventMemberSchema = memberSchemas[memberName];
            if (eventMemberSchema.isBlobSchema()) {
                output[memberName] = bytes;
            }
            else {
                output[memberName] = this.read(memberSchemas[memberName], bytes);
            }
            return output;
        }
        const xmlString = (this.serdeContext?.utf8Encoder ?? toUtf8)(bytes);
        const parsedObject = this.parseXml(xmlString);
        return this.readSchema(schema, key ? parsedObject[key] : parsedObject);
    }
    readSchema(_schema, value) {
        const ns = NormalizedSchema.of(_schema);
        if (ns.isUnitSchema()) {
            return;
        }
        const traits = ns.getMergedTraits();
        if (ns.isListSchema() && !Array.isArray(value)) {
            return this.readSchema(ns, [value]);
        }
        if (value == null) {
            return value;
        }
        if (typeof value === "object") {
            const flat = !!traits.xmlFlattened;
            if (ns.isListSchema()) {
                const listValue = ns.getValueSchema();
                const buffer = [];
                const sourceKey = listValue.getMergedTraits().xmlName ?? "member";
                const source = flat ? value : (value[0] ?? value)[sourceKey];
                if (source == null) {
                    return buffer;
                }
                const sourceArray = Array.isArray(source) ? source : [source];
                for (const v of sourceArray) {
                    buffer.push(this.readSchema(listValue, v));
                }
                return buffer;
            }
            const buffer = {};
            if (ns.isMapSchema()) {
                const keyNs = ns.getKeySchema();
                const memberNs = ns.getValueSchema();
                let entries;
                if (flat) {
                    entries = Array.isArray(value) ? value : [value];
                }
                else {
                    entries = Array.isArray(value.entry) ? value.entry : [value.entry];
                }
                const keyProperty = keyNs.getMergedTraits().xmlName ?? "key";
                const valueProperty = memberNs.getMergedTraits().xmlName ?? "value";
                for (const entry of entries) {
                    const key = entry[keyProperty];
                    const value = entry[valueProperty];
                    if (key === "__proto__") {
                        writeKey(buffer);
                    }
                    buffer[key] = this.readSchema(memberNs, value);
                }
                return buffer;
            }
            if (ns.isStructSchema()) {
                const union = ns.isUnionSchema();
                let unionSerde;
                if (union) {
                    unionSerde = new UnionSerde(value, buffer);
                }
                for (const [memberName, memberSchema] of ns.structIterator()) {
                    const memberTraits = memberSchema.getMergedTraits();
                    const xmlObjectKey = !memberTraits.httpPayload
                        ? (memberSchema.getMemberTraits().xmlName ?? memberName)
                        : (memberTraits.xmlName ?? memberSchema.getName());
                    if (union) {
                        unionSerde.mark(xmlObjectKey);
                    }
                    if (value[xmlObjectKey] != null) {
                        buffer[memberName] = this.readSchema(memberSchema, value[xmlObjectKey]);
                    }
                }
                if (union) {
                    unionSerde.writeUnknown();
                }
                return buffer;
            }
            if (ns.isDocumentSchema()) {
                return value;
            }
            throw new Error(`@aws-sdk/core/protocols - xml deserializer unhandled schema type for ${ns.getName(true)}`);
        }
        if (ns.isListSchema()) {
            return [];
        }
        if (ns.isMapSchema() || ns.isStructSchema()) {
            return {};
        }
        return this.stringDeserializer.read(ns, value);
    }
    parseXml(xml) {
        if (xml.length) {
            let parsedObj;
            try {
                parsedObj = parseXML(xml);
            }
            catch (e) {
                if (e && typeof e === "object") {
                    Object.defineProperty(e, "$responseBodyText", {
                        value: xml,
                    });
                }
                throw e;
            }
            const textNodeName = "#text";
            const key = Object.keys(parsedObj)[0];
            const parsedObjToReturn = parsedObj[key];
            if (parsedObjToReturn[textNodeName]) {
                parsedObjToReturn[key] = parsedObjToReturn[textNodeName];
                delete parsedObjToReturn[textNodeName];
            }
            return getValueFromTextNode(parsedObjToReturn);
        }
        return {};
    }
}

class QueryShapeSerializer extends SerdeContextConfig {
    settings;
    buffer;
    constructor(settings) {
        super();
        this.settings = settings;
    }
    write(schema, value, prefix = "") {
        if (this.buffer === undefined) {
            this.buffer = "";
        }
        const ns = NormalizedSchema.of(schema);
        if (prefix && !prefix.endsWith(".")) {
            prefix += ".";
        }
        if (ns.isBlobSchema()) {
            if (typeof value === "string" || value instanceof Uint8Array) {
                this.writeKey(prefix);
                this.writeValue((this.serdeContext?.base64Encoder ?? toBase64)(value));
            }
        }
        else if (ns.isBooleanSchema() || ns.isNumericSchema() || ns.isStringSchema()) {
            if (value != null) {
                this.writeKey(prefix);
                this.writeValue(String(value));
            }
            else if (ns.isIdempotencyToken()) {
                this.writeKey(prefix);
                this.writeValue(generateIdempotencyToken());
            }
        }
        else if (ns.isBigIntegerSchema()) {
            if (value != null) {
                this.writeKey(prefix);
                this.writeValue(String(value));
            }
        }
        else if (ns.isBigDecimalSchema()) {
            if (value != null) {
                this.writeKey(prefix);
                this.writeValue(value instanceof NumericValue ? value.string : String(value));
            }
        }
        else if (ns.isTimestampSchema()) {
            if (value instanceof Date) {
                this.writeKey(prefix);
                const format = determineTimestampFormat(ns, this.settings);
                switch (format) {
                    case 5:
                        this.writeValue(value.toISOString().replace(".000Z", "Z"));
                        break;
                    case 6:
                        this.writeValue(dateToUtcString(value));
                        break;
                    case 7:
                        this.writeValue(String(value.getTime() / 1000));
                        break;
                }
            }
        }
        else if (ns.isDocumentSchema()) {
            if (Array.isArray(value)) {
                this.write(64 | 15, value, prefix);
            }
            else if (value instanceof Date) {
                this.write(4, value, prefix);
            }
            else if (value instanceof Uint8Array) {
                this.write(21, value, prefix);
            }
            else if (value && typeof value === "object") {
                this.write(128 | 15, value, prefix);
            }
            else {
                this.writeKey(prefix);
                this.writeValue(String(value));
            }
        }
        else if (ns.isListSchema()) {
            if (Array.isArray(value)) {
                if (value.length === 0) {
                    if (this.settings.serializeEmptyLists) {
                        this.writeKey(prefix);
                        this.writeValue("");
                    }
                }
                else {
                    const member = ns.getValueSchema();
                    const flat = this.settings.flattenLists || ns.getMergedTraits().xmlFlattened;
                    let i = 1;
                    for (const item of value) {
                        if (item == null) {
                            continue;
                        }
                        const traits = member.getMergedTraits();
                        const suffix = this.getKey("member", traits.xmlName, traits.ec2QueryName);
                        const key = flat ? `${prefix}${i}` : `${prefix}${suffix}.${i}`;
                        this.write(member, item, key);
                        ++i;
                    }
                }
            }
        }
        else if (ns.isMapSchema()) {
            if (value && typeof value === "object") {
                const keySchema = ns.getKeySchema();
                const memberSchema = ns.getValueSchema();
                const flat = ns.getMergedTraits().xmlFlattened;
                let i = 1;
                for (const k in value) {
                    const v = value[k];
                    if (v == null) {
                        continue;
                    }
                    const keyTraits = keySchema.getMergedTraits();
                    const keySuffix = this.getKey("key", keyTraits.xmlName, keyTraits.ec2QueryName);
                    const key = flat ? `${prefix}${i}.${keySuffix}` : `${prefix}entry.${i}.${keySuffix}`;
                    const valTraits = memberSchema.getMergedTraits();
                    const valueSuffix = this.getKey("value", valTraits.xmlName, valTraits.ec2QueryName);
                    const valueKey = flat ? `${prefix}${i}.${valueSuffix}` : `${prefix}entry.${i}.${valueSuffix}`;
                    this.write(keySchema, k, key);
                    this.write(memberSchema, v, valueKey);
                    ++i;
                }
            }
        }
        else if (ns.isStructSchema()) {
            if (value && typeof value === "object") {
                let didWriteMember = false;
                for (const [memberName, member] of ns.structIterator()) {
                    if (value[memberName] == null && !member.isIdempotencyToken()) {
                        continue;
                    }
                    const traits = member.getMergedTraits();
                    const suffix = this.getKey(memberName, traits.xmlName, traits.ec2QueryName, "struct");
                    const key = `${prefix}${suffix}`;
                    this.write(member, value[memberName], key);
                    didWriteMember = true;
                }
                if (!didWriteMember && ns.isUnionSchema()) {
                    const { $unknown } = value;
                    if (Array.isArray($unknown)) {
                        const [k, v] = $unknown;
                        const key = `${prefix}${k}`;
                        this.write(15, v, key);
                    }
                }
            }
        }
        else if (ns.isUnitSchema()) ;
        else {
            throw new Error(`@aws-sdk/core/protocols - QuerySerializer unrecognized schema type ${ns.getName(true)}`);
        }
    }
    flush() {
        if (this.buffer === undefined) {
            throw new Error("@aws-sdk/core/protocols - QuerySerializer cannot flush with nothing written to buffer.");
        }
        const str = this.buffer;
        delete this.buffer;
        return str;
    }
    getKey(memberName, xmlName, ec2QueryName, keySource) {
        const { ec2, capitalizeKeys } = this.settings;
        if (ec2 && ec2QueryName) {
            return ec2QueryName;
        }
        const key = xmlName ?? memberName;
        if (capitalizeKeys && keySource === "struct") {
            return key[0].toUpperCase() + key.slice(1);
        }
        return key;
    }
    writeKey(key) {
        if (key.endsWith(".")) {
            key = key.slice(0, key.length - 1);
        }
        this.buffer += `&${extendedEncodeURIComponent(key)}=`;
    }
    writeValue(value) {
        this.buffer += extendedEncodeURIComponent(value);
    }
}

class AwsQueryProtocol extends RpcProtocol {
    options;
    serializer;
    deserializer;
    mixin = new ProtocolLib();
    constructor(options) {
        super({
            defaultNamespace: options.defaultNamespace,
            errorTypeRegistries: options.errorTypeRegistries,
        });
        this.options = options;
        const settings = {
            timestampFormat: {
                useTrait: true,
                default: 5,
            },
            httpBindings: false,
            xmlNamespace: options.xmlNamespace,
            serviceNamespace: options.defaultNamespace,
            serializeEmptyLists: true,
        };
        this.serializer = new QueryShapeSerializer(settings);
        this.deserializer = new XmlShapeDeserializer(settings);
    }
    getShapeId() {
        return "aws.protocols#awsQuery";
    }
    setSerdeContext(serdeContext) {
        this.serializer.setSerdeContext(serdeContext);
        this.deserializer.setSerdeContext(serdeContext);
    }
    getPayloadCodec() {
        throw new Error("AWSQuery protocol has no payload codec.");
    }
    async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        if (!request.path.endsWith("/")) {
            request.path += "/";
        }
        request.headers["content-type"] = "application/x-www-form-urlencoded";
        if (deref(operationSchema.input) === "unit" || !request.body) {
            request.body = "";
        }
        const action = operationSchema.name.split("#")[1] ?? operationSchema.name;
        request.body = `Action=${action}&Version=${this.options.version}` + request.body;
        if (request.body.endsWith("&")) {
            request.body = request.body.slice(-1);
        }
        return request;
    }
    async deserializeResponse(operationSchema, context, response) {
        const deserializer = this.deserializer;
        const ns = NormalizedSchema.of(operationSchema.output);
        const dataObject = {};
        if (response.statusCode >= 300) {
            const bytes = await collectBody(response.body, context);
            if (bytes.byteLength > 0) {
                Object.assign(dataObject, await deserializer.read(15, bytes));
            }
            await this.handleError(operationSchema, context, response, dataObject, this.deserializeMetadata(response));
        }
        for (const header in response.headers) {
            const value = response.headers[header];
            delete response.headers[header];
            response.headers[header.toLowerCase()] = value;
        }
        const shortName = operationSchema.name.split("#")[1] ?? operationSchema.name;
        const awsQueryResultKey = ns.isStructSchema() && this.useNestedResult() ? shortName + "Result" : undefined;
        const bytes = await collectBody(response.body, context);
        if (bytes.byteLength > 0) {
            Object.assign(dataObject, await deserializer.read(ns, bytes, awsQueryResultKey));
        }
        dataObject.$metadata = this.deserializeMetadata(response);
        return dataObject;
    }
    useNestedResult() {
        return true;
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
        const errorIdentifier = this.loadQueryErrorCode(response, dataObject) ?? "Unknown";
        this.mixin.compose(this.compositeErrorRegistry, errorIdentifier, this.options.defaultNamespace);
        const errorData = this.loadQueryError(dataObject) ?? {};
        const message = this.loadQueryErrorMessage(dataObject);
        errorData.message = message;
        errorData.Error = {
            Type: errorData.Type,
            Code: errorData.Code,
            Message: message,
        };
        const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorIdentifier, this.options.defaultNamespace, response, errorData, metadata, this.mixin.findQueryCompatibleError);
        const ns = NormalizedSchema.of(errorSchema);
        const ErrorCtor = this.compositeErrorRegistry.getErrorCtor(errorSchema) ?? Error;
        const exception = new ErrorCtor({});
        const output = {
            Type: errorData.Error.Type,
            Code: errorData.Error.Code,
            Error: errorData.Error,
        };
        for (const [name, member] of ns.structIterator()) {
            const target = member.getMergedTraits().xmlName ?? name;
            const value = errorData[target] ?? dataObject[target];
            output[name] = this.deserializer.readSchema(member, value);
        }
        throw this.mixin.decorateServiceException(Object.assign(exception, errorMetadata, {
            $fault: ns.getMergedTraits().error,
            message,
        }, output), dataObject);
    }
    loadQueryErrorCode(output, data) {
        const code = (data.Errors?.[0]?.Error ?? data.Errors?.Error ?? data.Error)?.Code;
        if (code !== undefined) {
            return code;
        }
        if (output.statusCode == 404) {
            return "NotFound";
        }
    }
    loadQueryError(data) {
        return data.Errors?.[0]?.Error ?? data.Errors?.Error ?? data.Error;
    }
    loadQueryErrorMessage(data) {
        const errorData = this.loadQueryError(data);
        return errorData?.message ?? errorData?.Message ?? data.message ?? data.Message ?? "Unknown";
    }
    getDefaultContentType() {
        return "application/x-www-form-urlencoded";
    }
}

class AwsEc2QueryProtocol extends AwsQueryProtocol {
    options;
    constructor(options) {
        super(options);
        this.options = options;
        const ec2Settings = {
            capitalizeKeys: true,
            flattenLists: true,
            serializeEmptyLists: false,
            ec2: true,
        };
        Object.assign(this.serializer.settings, ec2Settings);
    }
    getShapeId() {
        return "aws.protocols#ec2Query";
    }
    useNestedResult() {
        return false;
    }
}

const collectBodyString = (streamBody, context) => collectBody(streamBody, context).then((body) => (context?.utf8Encoder ?? toUtf8)(body));

const parseXmlBody = (streamBody, context) => collectBodyString(streamBody, context).then((encoded) => {
    if (encoded.length) {
        let parsedObj;
        try {
            parsedObj = parseXML(encoded);
        }
        catch (e) {
            if (e && typeof e === "object") {
                Object.defineProperty(e, "$responseBodyText", {
                    value: encoded,
                });
            }
            throw e;
        }
        const textNodeName = "#text";
        const key = Object.keys(parsedObj)[0];
        const parsedObjToReturn = parsedObj[key];
        if (parsedObjToReturn[textNodeName]) {
            parsedObjToReturn[key] = parsedObjToReturn[textNodeName];
            delete parsedObjToReturn[textNodeName];
        }
        return getValueFromTextNode(parsedObjToReturn);
    }
    return {};
});
const parseXmlErrorBody = async (errorBody, context) => {
    const value = await parseXmlBody(errorBody, context);
    if (value.Error) {
        value.Error.message = value.Error.message ?? value.Error.Message;
    }
    return value;
};
const loadRestXmlErrorCode = (output, data) => {
    if (data?.Error?.Code !== undefined) {
        return data.Error.Code;
    }
    if (data?.Code !== undefined) {
        return data.Code;
    }
    if (output.statusCode == 404) {
        return "NotFound";
    }
};

class XmlShapeSerializer extends SerdeContextConfig {
    settings;
    stringBuffer;
    byteBuffer;
    buffer;
    constructor(settings) {
        super();
        this.settings = settings;
    }
    write(schema, value) {
        const ns = NormalizedSchema.of(schema);
        if (ns.isStringSchema() && typeof value === "string") {
            this.stringBuffer = value;
        }
        else if (ns.isBlobSchema()) {
            this.byteBuffer =
                "byteLength" in value
                    ? value
                    : (this.serdeContext?.base64Decoder ?? fromBase64)(value);
        }
        else {
            this.buffer = this.writeStruct(ns, value, undefined);
            const traits = ns.getMergedTraits();
            if (traits.httpPayload && !traits.xmlName) {
                this.buffer.withName(ns.getName());
            }
        }
    }
    flush() {
        if (this.byteBuffer !== undefined) {
            const bytes = this.byteBuffer;
            delete this.byteBuffer;
            return bytes;
        }
        if (this.stringBuffer !== undefined) {
            const str = this.stringBuffer;
            delete this.stringBuffer;
            return str;
        }
        const buffer = this.buffer;
        if (this.settings.xmlNamespace) {
            if (!buffer?.attributes?.["xmlns"]) {
                buffer.addAttribute("xmlns", this.settings.xmlNamespace);
            }
        }
        delete this.buffer;
        return buffer.toString();
    }
    writeStruct(ns, value, parentXmlns) {
        const traits = ns.getMergedTraits();
        const name = ns.isMemberSchema() && !traits.httpPayload
            ? (ns.getMemberTraits().xmlName ?? ns.getMemberName())
            : (traits.xmlName ?? ns.getName());
        if (!name || !ns.isStructSchema()) {
            throw new Error(`@aws-sdk/core/protocols - xml serializer, cannot write struct with empty name or non-struct, schema=${ns.getName(true)}.`);
        }
        const structXmlNode = XmlNode.of(name);
        const [xmlnsAttr, xmlns] = this.getXmlnsAttribute(ns, parentXmlns);
        for (const [memberName, memberSchema] of ns.structIterator()) {
            const val = value[memberName];
            if (val != null || memberSchema.isIdempotencyToken()) {
                if (memberSchema.getMergedTraits().xmlAttribute) {
                    structXmlNode.addAttribute(memberSchema.getMergedTraits().xmlName ?? memberName, this.writeSimple(memberSchema, val));
                    continue;
                }
                if (memberSchema.isListSchema()) {
                    this.writeList(memberSchema, val, structXmlNode, xmlns);
                }
                else if (memberSchema.isMapSchema()) {
                    this.writeMap(memberSchema, val, structXmlNode, xmlns);
                }
                else if (memberSchema.isStructSchema()) {
                    structXmlNode.addChildNode(this.writeStruct(memberSchema, val, xmlns));
                }
                else {
                    const memberNode = XmlNode.of(memberSchema.getMergedTraits().xmlName ?? memberSchema.getMemberName());
                    this.writeSimpleInto(memberSchema, val, memberNode, xmlns);
                    structXmlNode.addChildNode(memberNode);
                }
            }
        }
        const { $unknown } = value;
        if ($unknown && ns.isUnionSchema() && Array.isArray($unknown) && Object.keys(value).length === 1) {
            const [k, v] = $unknown;
            const node = XmlNode.of(k);
            if (typeof v !== "string") {
                if (value instanceof XmlNode || value instanceof XmlText) {
                    structXmlNode.addChildNode(value);
                }
                else {
                    throw new Error(`@aws-sdk - $unknown union member in XML requires ` +
                        `value of type string, @aws-sdk/xml-builder::XmlNode or XmlText.`);
                }
            }
            this.writeSimpleInto(0, v, node, xmlns);
            structXmlNode.addChildNode(node);
        }
        if (xmlns) {
            structXmlNode.addAttribute(xmlnsAttr, xmlns);
        }
        return structXmlNode;
    }
    writeList(listMember, array, container, parentXmlns) {
        if (!listMember.isMemberSchema()) {
            throw new Error(`@aws-sdk/core/protocols - xml serializer, cannot write non-member list: ${listMember.getName(true)}`);
        }
        const listTraits = listMember.getMergedTraits();
        const listValueSchema = listMember.getValueSchema();
        const listValueTraits = listValueSchema.getMergedTraits();
        const sparse = !!listValueTraits.sparse;
        const flat = !!listTraits.xmlFlattened;
        const [xmlnsAttr, xmlns] = this.getXmlnsAttribute(listMember, parentXmlns);
        const writeItem = (container, value) => {
            if (listValueSchema.isListSchema()) {
                this.writeList(listValueSchema, Array.isArray(value) ? value : [value], container, xmlns);
            }
            else if (listValueSchema.isMapSchema()) {
                this.writeMap(listValueSchema, value, container, xmlns);
            }
            else if (listValueSchema.isStructSchema()) {
                const struct = this.writeStruct(listValueSchema, value, xmlns);
                container.addChildNode(struct.withName(flat ? (listTraits.xmlName ?? listMember.getMemberName()) : (listValueTraits.xmlName ?? "member")));
            }
            else {
                const listItemNode = XmlNode.of(flat ? (listTraits.xmlName ?? listMember.getMemberName()) : (listValueTraits.xmlName ?? "member"));
                this.writeSimpleInto(listValueSchema, value, listItemNode, xmlns);
                container.addChildNode(listItemNode);
            }
        };
        if (flat) {
            for (const value of array) {
                if (sparse || value != null) {
                    writeItem(container, value);
                }
            }
        }
        else {
            const listNode = XmlNode.of(listTraits.xmlName ?? listMember.getMemberName());
            if (xmlns) {
                listNode.addAttribute(xmlnsAttr, xmlns);
            }
            for (const value of array) {
                if (sparse || value != null) {
                    writeItem(listNode, value);
                }
            }
            container.addChildNode(listNode);
        }
    }
    writeMap(mapMember, map, container, parentXmlns, containerIsMap = false) {
        if (!mapMember.isMemberSchema()) {
            throw new Error(`@aws-sdk/core/protocols - xml serializer, cannot write non-member map: ${mapMember.getName(true)}`);
        }
        const mapTraits = mapMember.getMergedTraits();
        const mapKeySchema = mapMember.getKeySchema();
        const mapKeyTraits = mapKeySchema.getMergedTraits();
        const keyTag = mapKeyTraits.xmlName ?? "key";
        const mapValueSchema = mapMember.getValueSchema();
        const mapValueTraits = mapValueSchema.getMergedTraits();
        const valueTag = mapValueTraits.xmlName ?? "value";
        const sparse = !!mapValueTraits.sparse;
        const flat = !!mapTraits.xmlFlattened;
        const [xmlnsAttr, xmlns] = this.getXmlnsAttribute(mapMember, parentXmlns);
        const addKeyValue = (entry, key, val) => {
            const keyNode = XmlNode.of(keyTag, key);
            const [keyXmlnsAttr, keyXmlns] = this.getXmlnsAttribute(mapKeySchema, xmlns);
            if (keyXmlns) {
                keyNode.addAttribute(keyXmlnsAttr, keyXmlns);
            }
            entry.addChildNode(keyNode);
            let valueNode = XmlNode.of(valueTag);
            if (mapValueSchema.isListSchema()) {
                this.writeList(mapValueSchema, val, valueNode, xmlns);
            }
            else if (mapValueSchema.isMapSchema()) {
                this.writeMap(mapValueSchema, val, valueNode, xmlns, true);
            }
            else if (mapValueSchema.isStructSchema()) {
                valueNode = this.writeStruct(mapValueSchema, val, xmlns);
            }
            else {
                this.writeSimpleInto(mapValueSchema, val, valueNode, xmlns);
            }
            entry.addChildNode(valueNode);
        };
        if (flat) {
            for (const key in map) {
                const val = map[key];
                if (sparse || val != null) {
                    const entry = XmlNode.of(mapTraits.xmlName ?? mapMember.getMemberName());
                    addKeyValue(entry, key, val);
                    container.addChildNode(entry);
                }
            }
        }
        else {
            let mapNode;
            if (!containerIsMap) {
                mapNode = XmlNode.of(mapTraits.xmlName ?? mapMember.getMemberName());
                if (xmlns) {
                    mapNode.addAttribute(xmlnsAttr, xmlns);
                }
                container.addChildNode(mapNode);
            }
            for (const key in map) {
                const val = map[key];
                if (sparse || val != null) {
                    const entry = XmlNode.of("entry");
                    addKeyValue(entry, key, val);
                    (containerIsMap ? container : mapNode).addChildNode(entry);
                }
            }
        }
    }
    writeSimple(_schema, value) {
        if (null === value) {
            throw new Error("@aws-sdk/core/protocols - (XML serializer) cannot write null value.");
        }
        const ns = NormalizedSchema.of(_schema);
        let nodeContents = null;
        if (value && typeof value === "object") {
            if (ns.isBlobSchema()) {
                nodeContents = (this.serdeContext?.base64Encoder ?? toBase64)(value);
            }
            else if (ns.isTimestampSchema() && value instanceof Date) {
                const format = determineTimestampFormat(ns, this.settings);
                switch (format) {
                    case 5:
                        nodeContents = value.toISOString().replace(".000Z", "Z");
                        break;
                    case 6:
                        nodeContents = dateToUtcString(value);
                        break;
                    case 7:
                        nodeContents = String(value.getTime() / 1000);
                        break;
                    default:
                        console.warn("Missing timestamp format, using http date", value);
                        nodeContents = dateToUtcString(value);
                        break;
                }
            }
            else if (ns.isBigDecimalSchema() && value) {
                if (value instanceof NumericValue) {
                    return value.string;
                }
                return String(value);
            }
            else if (ns.isMapSchema() || ns.isListSchema()) {
                throw new Error("@aws-sdk/core/protocols - xml serializer, cannot call _write() on List/Map schema, call writeList or writeMap() instead.");
            }
            else {
                throw new Error(`@aws-sdk/core/protocols - xml serializer, unhandled schema type for object value and schema: ${ns.getName(true)}`);
            }
        }
        if (ns.isBooleanSchema() || ns.isNumericSchema() || ns.isBigIntegerSchema() || ns.isBigDecimalSchema()) {
            nodeContents = String(value);
        }
        if (ns.isStringSchema()) {
            if (value === undefined && ns.isIdempotencyToken()) {
                nodeContents = generateIdempotencyToken();
            }
            else {
                nodeContents = String(value);
            }
        }
        if (nodeContents === null) {
            throw new Error(`Unhandled schema-value pair ${ns.getName(true)}=${value}`);
        }
        return nodeContents;
    }
    writeSimpleInto(_schema, value, into, parentXmlns) {
        const nodeContents = this.writeSimple(_schema, value);
        const ns = NormalizedSchema.of(_schema);
        const content = new XmlText(nodeContents);
        const [xmlnsAttr, xmlns] = this.getXmlnsAttribute(ns, parentXmlns);
        if (xmlns) {
            into.addAttribute(xmlnsAttr, xmlns);
        }
        into.addChildNode(content);
    }
    getXmlnsAttribute(ns, parentXmlns) {
        const traits = ns.getMergedTraits();
        const [prefix, xmlns] = traits.xmlNamespace ?? [];
        if (xmlns && xmlns !== parentXmlns) {
            return [prefix ? `xmlns:${prefix}` : "xmlns", xmlns];
        }
        return [void 0, void 0];
    }
}

class XmlCodec extends SerdeContextConfig {
    settings;
    constructor(settings) {
        super();
        this.settings = settings;
    }
    createSerializer() {
        const serializer = new XmlShapeSerializer(this.settings);
        serializer.setSerdeContext(this.serdeContext);
        return serializer;
    }
    createDeserializer() {
        const deserializer = new XmlShapeDeserializer(this.settings);
        deserializer.setSerdeContext(this.serdeContext);
        return deserializer;
    }
}

class AwsRestXmlProtocol extends HttpBindingProtocol {
    codec;
    serializer;
    deserializer;
    mixin = new ProtocolLib();
    constructor(options) {
        super(options);
        const settings = {
            timestampFormat: {
                useTrait: true,
                default: 5,
            },
            httpBindings: true,
            xmlNamespace: options.xmlNamespace,
            serviceNamespace: options.defaultNamespace,
        };
        this.codec = new XmlCodec(settings);
        this.serializer = new HttpInterceptingShapeSerializer(this.codec.createSerializer(), settings);
        this.deserializer = new HttpInterceptingShapeDeserializer(this.codec.createDeserializer(), settings);
    }
    getPayloadCodec() {
        return this.codec;
    }
    getShapeId() {
        return "aws.protocols#restXml";
    }
    async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        const inputSchema = NormalizedSchema.of(operationSchema.input);
        if (!request.headers["content-type"]) {
            const contentType = this.mixin.resolveRestContentType(this.getDefaultContentType(), inputSchema);
            if (contentType) {
                request.headers["content-type"] = contentType;
            }
        }
        if (typeof request.body === "string" &&
            request.headers["content-type"] === this.getDefaultContentType() &&
            !request.body.startsWith("<?xml ") &&
            !this.hasUnstructuredPayloadBinding(inputSchema)) {
            request.body = '<?xml version="1.0" encoding="UTF-8"?>' + request.body;
        }
        return request;
    }
    async deserializeResponse(operationSchema, context, response) {
        return super.deserializeResponse(operationSchema, context, response);
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
        const errorIdentifier = loadRestXmlErrorCode(response, dataObject) ?? "Unknown";
        this.mixin.compose(this.compositeErrorRegistry, errorIdentifier, this.options.defaultNamespace);
        if (dataObject.Error && typeof dataObject.Error === "object") {
            for (const key of Object.keys(dataObject.Error)) {
                dataObject[key] = dataObject.Error[key];
                if (key.toLowerCase() === "message") {
                    dataObject.message = dataObject.Error[key];
                }
            }
        }
        if (dataObject.RequestId && !metadata.requestId) {
            metadata.requestId = dataObject.RequestId;
        }
        const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorIdentifier, this.options.defaultNamespace, response, dataObject, metadata);
        const ns = NormalizedSchema.of(errorSchema);
        const message = dataObject.Error?.message ??
            dataObject.Error?.Message ??
            dataObject.message ??
            dataObject.Message ??
            "UnknownError";
        const ErrorCtor = this.compositeErrorRegistry.getErrorCtor(errorSchema) ?? Error;
        const exception = new ErrorCtor({});
        await this.deserializeHttpMessage(errorSchema, context, response, dataObject);
        const output = {};
        const errorDeserializer = this.codec.createDeserializer();
        for (const [name, member] of ns.structIterator()) {
            const target = member.getMergedTraits().xmlName ?? name;
            const value = dataObject.Error?.[target] ?? dataObject[target];
            output[name] = errorDeserializer.readSchema(member, value);
        }
        throw this.mixin.decorateServiceException(Object.assign(exception, errorMetadata, {
            $fault: ns.getMergedTraits().error,
            message,
        }, output), dataObject);
    }
    getDefaultContentType() {
        return "application/xml";
    }
    hasUnstructuredPayloadBinding(ns) {
        for (const [, member] of ns.structIterator()) {
            if (member.getMergedTraits().httpPayload) {
                return !(member.isStructSchema() || member.isMapSchema() || member.isListSchema());
            }
        }
        return false;
    }
}

const awsExpectUnion = (value) => {
    if (value == null) {
        return undefined;
    }
    if (typeof value === "object" && "__type" in value) {
        delete value.__type;
    }
    return expectUnion(value);
};

const _toStr = (val) => {
    if (val == null) {
        return val;
    }
    if (typeof val === "number" || typeof val === "bigint") {
        const warning = new Error(`Received number ${val} where a string was expected.`);
        warning.name = "Warning";
        console.warn(warning);
        return String(val);
    }
    if (typeof val === "boolean") {
        const warning = new Error(`Received boolean ${val} where a string was expected.`);
        warning.name = "Warning";
        console.warn(warning);
        return String(val);
    }
    return val;
};
const _toBool = (val) => {
    if (val == null) {
        return val;
    }
    if (typeof val === "string") {
        const lowercase = val.toLowerCase();
        if (val !== "" && lowercase !== "false" && lowercase !== "true") {
            const warning = new Error(`Received string "${val}" where a boolean was expected.`);
            warning.name = "Warning";
            console.warn(warning);
        }
        return val !== "" && lowercase !== "false";
    }
    return val;
};
const _toNum = (val) => {
    if (val == null) {
        return val;
    }
    if (typeof val === "string") {
        const num = Number(val);
        if (num.toString() !== val) {
            const warning = new Error(`Received string "${val}" where a number was expected.`);
            warning.name = "Warning";
            console.warn(warning);
            return val;
        }
        return num;
    }
    return val;
};

exports.AwsEc2QueryProtocol = AwsEc2QueryProtocol;
exports.AwsJson1_0Protocol = AwsJson1_0Protocol;
exports.AwsJson1_1Protocol = AwsJson1_1Protocol;
exports.AwsJsonRpcProtocol = AwsJsonRpcProtocol;
exports.AwsQueryProtocol = AwsQueryProtocol;
exports.AwsRestJsonProtocol = AwsRestJsonProtocol;
exports.AwsRestXmlProtocol = AwsRestXmlProtocol;
exports.AwsSmithyRpcV2CborProtocol = AwsSmithyRpcV2CborProtocol;
exports.QueryShapeSerializer = QueryShapeSerializer;
exports.XmlCodec = XmlCodec;
exports.XmlShapeDeserializer = XmlShapeDeserializer;
exports.XmlShapeSerializer = XmlShapeSerializer;
exports._toBool = _toBool;
exports._toNum = _toNum;
exports._toStr = _toStr;
exports.awsExpectUnion = awsExpectUnion;
exports.loadRestXmlErrorCode = loadRestXmlErrorCode;
exports.parseXmlBody = parseXmlBody;
exports.parseXmlErrorBody = parseXmlErrorBody;
