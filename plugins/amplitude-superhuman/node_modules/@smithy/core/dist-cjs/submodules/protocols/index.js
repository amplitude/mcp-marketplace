const { Uint8ArrayBlobAdapter, sdkStreamMixin, splitEvery, splitHeader, fromBase64, _parseEpochTimestamp, _parseRfc7231DateTime, _parseRfc3339DateTimeWithOffset, LazyJsonString, NumericValue, toUtf8, fromUtf8, generateIdempotencyToken, toBase64, dateToUtcString, quoteHeader, parseEpochTimestamp, parseRfc7231DateTime, parseRfc3339DateTimeWithOffset } = require("@smithy/core/serde");
const { HttpRequest, HttpResponse, hasOwn, isValidHostname, getSmithyContext } = require("@smithy/core/transport");
const { parseQueryString, parseUrl } = require("@smithy/core/transport");
exports.HttpRequest = HttpRequest;
exports.HttpResponse = HttpResponse;
exports.isValidHostname = isValidHostname;
exports.parseQueryString = parseQueryString;
exports.parseUrl = parseUrl;
const { TypeRegistry, NormalizedSchema, translateTraits, deref } = require("@smithy/core/schema");
const { FieldPosition } = require("@smithy/types");

const collectBody = async (streamBody = new Uint8Array(), context) => {
    if (streamBody instanceof Uint8Array) {
        return Uint8ArrayBlobAdapter.mutate(streamBody);
    }
    if (!streamBody) {
        return Uint8ArrayBlobAdapter.mutate(new Uint8Array());
    }
    const fromContext = context.streamCollector(streamBody);
    return Uint8ArrayBlobAdapter.mutate(await fromContext);
};

function extendedEncodeURIComponent(str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
        return "%" + c.charCodeAt(0).toString(16).toUpperCase();
    });
}

class SerdeContext {
    serdeContext;
    setSerdeContext(serdeContext) {
        this.serdeContext = serdeContext;
    }
}

class HttpProtocol extends SerdeContext {
    options;
    compositeErrorRegistry;
    constructor(options) {
        super();
        this.options = options;
        this.compositeErrorRegistry = new TypeRegistry(options.defaultNamespace);
        for (const etr of options.errorTypeRegistries ?? []) {
            this.compositeErrorRegistry.copyFrom(etr);
        }
    }
    getRequestType() {
        return HttpRequest;
    }
    getResponseType() {
        return HttpResponse;
    }
    setSerdeContext(serdeContext) {
        this.serdeContext = serdeContext;
        this.serializer.setSerdeContext(serdeContext);
        this.deserializer.setSerdeContext(serdeContext);
        if (this.getPayloadCodec()) {
            this.getPayloadCodec().setSerdeContext(serdeContext);
        }
    }
    updateServiceEndpoint(request, endpoint) {
        if ("url" in endpoint) {
            request.protocol = endpoint.url.protocol;
            request.hostname = endpoint.url.hostname;
            request.port = endpoint.url.port ? Number(endpoint.url.port) : undefined;
            request.path = endpoint.url.pathname;
            request.fragment = endpoint.url.hash || void 0;
            request.username = endpoint.url.username || void 0;
            request.password = endpoint.url.password || void 0;
            if (!request.query) {
                request.query = {};
            }
            for (const [k, v] of endpoint.url.searchParams.entries()) {
                request.query[k] = v;
            }
            if (endpoint.headers) {
                for (const name in endpoint.headers) {
                    if (!hasOwn(endpoint.headers, name))
                        continue;
                    request.headers[name] = endpoint.headers[name].join(", ");
                }
            }
            return request;
        }
        else {
            request.protocol = endpoint.protocol;
            request.hostname = endpoint.hostname;
            request.port = endpoint.port ? Number(endpoint.port) : undefined;
            request.path = endpoint.path;
            request.query = {
                ...endpoint.query,
            };
            if (endpoint.headers) {
                for (const name in endpoint.headers) {
                    if (!hasOwn(endpoint.headers, name))
                        continue;
                    request.headers[name] = endpoint.headers[name];
                }
            }
            return request;
        }
    }
    setHostPrefix(request, operationSchema, input) {
        if (this.serdeContext?.disableHostPrefix) {
            return;
        }
        const inputNs = NormalizedSchema.of(operationSchema.input);
        const opTraits = translateTraits(operationSchema.traits ?? {});
        if (opTraits.endpoint) {
            let hostPrefix = opTraits.endpoint?.[0];
            if (typeof hostPrefix === "string") {
                for (const [name, member] of inputNs.structIterator()) {
                    if (!member.getMergedTraits().hostLabel) {
                        continue;
                    }
                    const replacement = input[name];
                    if (typeof replacement !== "string") {
                        throw new Error(`@smithy/core/schema - ${name} in input must be a string as hostLabel.`);
                    }
                    hostPrefix = hostPrefix.replace(`{${name}}`, replacement);
                }
                request.hostname = hostPrefix + request.hostname;
                if (!isValidHostname(request.hostname)) {
                    throw new Error(`[${request.hostname}] is not a valid hostname.`);
                }
            }
        }
    }
    deserializeMetadata(output) {
        return {
            httpStatusCode: output.statusCode,
            requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
            extendedRequestId: output.headers["x-amz-id-2"],
            cfId: output.headers["x-amz-cf-id"],
        };
    }
    resolveError(name, namespaces, registries) {
        const defaultErrorSchema = [-3, "", "Error", 0, [], [], 0];
        let schema;
        for (const registry of registries) {
            for (const ns of namespaces) {
                try {
                    if (ns === "*") {
                        schema = registry.getSchema(name);
                    }
                    else {
                        schema = registry.getSchema(ns + "#" + name);
                    }
                    const errorCtor = registry.getErrorCtor(schema);
                    if (errorCtor) {
                        return [schema, errorCtor, "modeled"];
                    }
                    else {
                        const syntheticErrorSchema = registry.getBaseException();
                        if (syntheticErrorSchema) {
                            const syntheticErrorCtor = registry.getErrorCtor(syntheticErrorSchema);
                            if (syntheticErrorCtor) {
                                return [schema, syntheticErrorCtor, "synthetic"];
                            }
                        }
                    }
                }
                catch (ignored) {
                }
            }
        }
        for (const registry of registries) {
            const syntheticErrorSchema = registry.getBaseException();
            if (syntheticErrorSchema) {
                const syntheticErrorCtor = registry.getErrorCtor(syntheticErrorSchema);
                if (syntheticErrorCtor) {
                    return [syntheticErrorSchema, syntheticErrorCtor, "synthetic"];
                }
            }
        }
        return [defaultErrorSchema, Error, "native"];
    }
    async serializeEventStream({ eventStream, requestSchema, initialRequest, }) {
        const eventStreamSerde = await this.loadEventStreamCapability();
        return eventStreamSerde.serializeEventStream({
            eventStream,
            requestSchema,
            initialRequest,
        });
    }
    async deserializeEventStream({ response, responseSchema, initialResponseContainer, }) {
        const eventStreamSerde = await this.loadEventStreamCapability();
        return eventStreamSerde.deserializeEventStream({
            response,
            responseSchema,
            initialResponseContainer,
        });
    }
    async loadEventStreamCapability() {
        const { EventStreamSerde, eventStreamSerdeProvider } = require('@smithy/core/event-streams');
        const marshaller = this.resolveEventStreamMarshaller(eventStreamSerdeProvider);
        return new EventStreamSerde({
            marshaller,
            serializer: this.serializer,
            deserializer: this.deserializer,
            serdeContext: this.serdeContext,
            defaultContentType: this.getDefaultContentType(),
            compositeErrorRegistry: this.compositeErrorRegistry,
        });
    }
    getDefaultContentType() {
        throw new Error(`@smithy/core/protocols - ${this.constructor.name} getDefaultContentType() implementation missing.`);
    }
    async deserializeHttpMessage(schema, context, response, arg4, arg5) {
        return [];
    }
    getEventStreamMarshaller() {
        const context = this.serdeContext;
        if (!context.eventStreamMarshaller) {
            throw new Error("@smithy/core - HttpProtocol: eventStreamMarshaller missing in serdeContext.");
        }
        return context.eventStreamMarshaller;
    }
    resolveEventStreamMarshaller(importedProvider) {
        const context = this.serdeContext;
        if (context.eventStreamMarshaller) {
            return context.eventStreamMarshaller;
        }
        return importedProvider(this.serdeContext);
    }
}

class HttpBindingProtocol extends HttpProtocol {
    async serializeRequest(operationSchema, _input, context) {
        const input = _input && typeof _input === "object" ? _input : {};
        const serializer = this.serializer;
        const query = {};
        const headers = {};
        const endpoint = await context.endpoint();
        const ns = NormalizedSchema.of(operationSchema?.input);
        const payloadMemberNames = [];
        const payloadMemberSchemas = [];
        let hasNonHttpBindingMember = false;
        let payload;
        const request = new HttpRequest({
            protocol: "",
            hostname: "",
            port: undefined,
            path: "",
            fragment: undefined,
            query: query,
            headers: headers,
            body: undefined,
        });
        if (endpoint) {
            this.updateServiceEndpoint(request, endpoint);
            this.setHostPrefix(request, operationSchema, input);
            const opTraits = translateTraits(operationSchema.traits);
            if (opTraits.http) {
                request.method = opTraits.http[0];
                const [path, search] = opTraits.http[1].split("?");
                if (request.path == "/") {
                    request.path = path;
                }
                else {
                    request.path += path;
                }
                const traitSearchParams = new URLSearchParams(search ?? "");
                for (const [key, value] of traitSearchParams) {
                    query[key] = value;
                }
            }
        }
        for (const [memberName, memberNs] of ns.structIterator()) {
            const memberTraits = memberNs.getMergedTraits() ?? {};
            const inputMemberValue = input[memberName];
            if (inputMemberValue == null && !memberNs.isIdempotencyToken()) {
                if (memberTraits.httpLabel) {
                    if (request.path.includes(`{${memberName}+}`) || request.path.includes(`{${memberName}}`)) {
                        throw new Error(`No value provided for input HTTP label: ${memberName}.`);
                    }
                }
                continue;
            }
            if (memberTraits.httpPayload) {
                const isStreaming = memberNs.isStreaming();
                if (isStreaming) {
                    const isEventStream = memberNs.isStructSchema();
                    if (isEventStream) {
                        if (input[memberName]) {
                            payload = await this.serializeEventStream({
                                eventStream: input[memberName],
                                requestSchema: ns,
                            });
                        }
                    }
                    else {
                        payload = inputMemberValue;
                    }
                }
                else {
                    serializer.write(memberNs, inputMemberValue);
                    payload = serializer.flush();
                }
            }
            else if (memberTraits.httpLabel) {
                serializer.write(memberNs, inputMemberValue);
                const replacement = serializer.flush();
                if (request.path.includes(`{${memberName}+}`)) {
                    request.path = request.path.replace(`{${memberName}+}`, replacement.split("/").map(extendedEncodeURIComponent).join("/"));
                }
                else if (request.path.includes(`{${memberName}}`)) {
                    request.path = request.path.replace(`{${memberName}}`, extendedEncodeURIComponent(replacement));
                }
            }
            else if (memberTraits.httpHeader) {
                serializer.write(memberNs, inputMemberValue);
                headers[memberTraits.httpHeader.toLowerCase()] = String(serializer.flush());
            }
            else if (typeof memberTraits.httpPrefixHeaders === "string") {
                for (const key in inputMemberValue) {
                    if (!hasOwn(inputMemberValue, key))
                        continue;
                    const val = inputMemberValue[key];
                    const amalgam = memberTraits.httpPrefixHeaders + key;
                    serializer.write([memberNs.getValueSchema(), { httpHeader: amalgam }], val);
                    headers[amalgam.toLowerCase()] = serializer.flush();
                }
            }
            else if (memberTraits.httpQuery || memberTraits.httpQueryParams) {
                this.serializeQuery(memberNs, inputMemberValue, query);
            }
            else {
                hasNonHttpBindingMember = true;
                payloadMemberNames.push(memberName);
                payloadMemberSchemas.push(memberNs);
            }
        }
        if (hasNonHttpBindingMember && input) {
            const [namespace, name] = (ns.getName(true) ?? "#Unknown").split("#");
            const requiredMembers = ns.getSchema()[6];
            const payloadSchema = [
                3,
                namespace,
                name,
                ns.getMergedTraits(),
                payloadMemberNames,
                payloadMemberSchemas,
                undefined,
            ];
            if (requiredMembers) {
                payloadSchema[6] = requiredMembers;
            }
            else {
                payloadSchema.pop();
            }
            serializer.write(payloadSchema, input);
            payload = serializer.flush();
        }
        request.headers = headers;
        request.query = query;
        request.body = payload;
        return request;
    }
    serializeQuery(ns, data, query) {
        const serializer = this.serializer;
        const traits = ns.getMergedTraits();
        if (traits.httpQueryParams) {
            for (const key in data) {
                if (!hasOwn(data, key))
                    continue;
                if (!(key in query)) {
                    const val = data[key];
                    const valueSchema = ns.getValueSchema();
                    Object.assign(valueSchema.getMergedTraits(), {
                        ...traits,
                        httpQuery: key,
                        httpQueryParams: undefined,
                    });
                    this.serializeQuery(valueSchema, val, query);
                }
            }
            return;
        }
        if (ns.isListSchema()) {
            const sparse = !!ns.getMergedTraits().sparse;
            const buffer = [];
            for (const item of data) {
                serializer.write([ns.getValueSchema(), traits], item);
                const serializable = serializer.flush();
                if (sparse || serializable !== undefined) {
                    buffer.push(serializable);
                }
            }
            query[traits.httpQuery] = buffer;
        }
        else {
            serializer.write([ns, traits], data);
            query[traits.httpQuery] = serializer.flush();
        }
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
            throw new Error("@smithy/core/protocols - HTTP Protocol error handler failed to throw.");
        }
        for (const header in response.headers) {
            if (!hasOwn(response.headers, header))
                continue;
            const value = response.headers[header];
            delete response.headers[header];
            response.headers[header.toLowerCase()] = value;
        }
        const nonHttpBindingMembers = await this.deserializeHttpMessage(ns, context, response, dataObject);
        if (nonHttpBindingMembers.length) {
            const bytes = await collectBody(response.body, context);
            if (bytes.byteLength > 0) {
                const dataFromBody = await deserializer.read(ns, bytes);
                for (const member of nonHttpBindingMembers) {
                    if (dataFromBody[member] != null) {
                        dataObject[member] = dataFromBody[member];
                    }
                }
            }
        }
        else if (nonHttpBindingMembers.discardResponseBody) {
            await collectBody(response.body, context);
        }
        dataObject.$metadata = this.deserializeMetadata(response);
        return dataObject;
    }
    async deserializeHttpMessage(schema, context, response, arg4, arg5) {
        let dataObject;
        if (arg4 instanceof Set) {
            dataObject = arg5;
        }
        else {
            dataObject = arg4;
        }
        let discardResponseBody = true;
        const deserializer = this.deserializer;
        const ns = NormalizedSchema.of(schema);
        const nonHttpBindingMembers = [];
        for (const [memberName, memberSchema] of ns.structIterator()) {
            const memberTraits = memberSchema.getMemberTraits();
            if (memberTraits.httpPayload) {
                discardResponseBody = false;
                const isStreaming = memberSchema.isStreaming();
                if (isStreaming) {
                    const isEventStream = memberSchema.isStructSchema();
                    if (isEventStream) {
                        dataObject[memberName] = await this.deserializeEventStream({
                            response,
                            responseSchema: ns,
                        });
                    }
                    else {
                        dataObject[memberName] = sdkStreamMixin(response.body);
                    }
                }
                else if (response.body) {
                    const bytes = await collectBody(response.body, context);
                    if (bytes.byteLength > 0) {
                        dataObject[memberName] = await deserializer.read(memberSchema, bytes);
                    }
                }
            }
            else if (memberTraits.httpHeader) {
                const key = String(memberTraits.httpHeader).toLowerCase();
                const value = response.headers[key];
                if (null != value) {
                    if (memberSchema.isListSchema()) {
                        const headerListValueSchema = memberSchema.getValueSchema();
                        headerListValueSchema.getMergedTraits().httpHeader = key;
                        let sections;
                        if (headerListValueSchema.isTimestampSchema() &&
                            headerListValueSchema.getSchema() === 4) {
                            sections = splitEvery(value, ",", 2);
                        }
                        else {
                            sections = splitHeader(value);
                        }
                        const list = [];
                        for (const section of sections) {
                            list.push(await deserializer.read(headerListValueSchema, section.trim()));
                        }
                        dataObject[memberName] = list;
                    }
                    else {
                        dataObject[memberName] = await deserializer.read(memberSchema, value);
                    }
                }
            }
            else if (memberTraits.httpPrefixHeaders !== undefined) {
                dataObject[memberName] = {};
                for (const header in response.headers) {
                    if (!hasOwn(response.headers, header))
                        continue;
                    if (header.startsWith(memberTraits.httpPrefixHeaders)) {
                        const value = response.headers[header];
                        const valueSchema = memberSchema.getValueSchema();
                        valueSchema.getMergedTraits().httpHeader = header;
                        dataObject[memberName][header.slice(memberTraits.httpPrefixHeaders.length)] = await deserializer.read(valueSchema, value);
                    }
                }
            }
            else if (memberTraits.httpResponseCode) {
                dataObject[memberName] = response.statusCode;
            }
            else {
                nonHttpBindingMembers.push(memberName);
            }
        }
        nonHttpBindingMembers.discardResponseBody = discardResponseBody;
        return nonHttpBindingMembers;
    }
}

class RpcProtocol extends HttpProtocol {
    async serializeRequest(operationSchema, _input, context) {
        const serializer = this.serializer;
        const query = {};
        const headers = {};
        const endpoint = await context.endpoint();
        const ns = NormalizedSchema.of(operationSchema?.input);
        const schema = ns.getSchema();
        let payload;
        const input = _input && typeof _input === "object" ? _input : {};
        const request = new HttpRequest({
            protocol: "",
            hostname: "",
            port: undefined,
            path: "/",
            fragment: undefined,
            query: query,
            headers: headers,
            body: undefined,
        });
        if (endpoint) {
            this.updateServiceEndpoint(request, endpoint);
            this.setHostPrefix(request, operationSchema, input);
        }
        if (input) {
            const eventStreamMember = ns.getEventStreamMember();
            if (eventStreamMember) {
                if (input[eventStreamMember]) {
                    const initialRequest = {};
                    for (const [memberName] of ns.structIterator()) {
                        if (memberName !== eventStreamMember && input[memberName] != null) {
                            initialRequest[memberName] = input[memberName];
                        }
                    }
                    payload = await this.serializeEventStream({
                        eventStream: input[eventStreamMember],
                        requestSchema: ns,
                        initialRequest,
                    });
                }
            }
            else {
                serializer.write(schema, input);
                payload = serializer.flush();
            }
        }
        request.headers = Object.assign(request.headers, headers);
        request.query = query;
        request.body = payload;
        request.method = "POST";
        return request;
    }
    async deserializeResponse(operationSchema, context, response) {
        const deserializer = this.deserializer;
        const ns = NormalizedSchema.of(operationSchema.output);
        const dataObject = {};
        if (this.isErrorResponse(response.statusCode)) {
            const bytes = await collectBody(response.body, context);
            if (bytes.byteLength > 0) {
                Object.assign(dataObject, await deserializer.read(15, bytes));
            }
            await this.handleError(operationSchema, context, response, dataObject, this.deserializeMetadata(response));
            throw new Error("@smithy/core/protocols - RPC Protocol error handler failed to throw.");
        }
        for (const header in response.headers) {
            if (!hasOwn(response.headers, header))
                continue;
            const value = response.headers[header];
            delete response.headers[header];
            response.headers[header.toLowerCase()] = value;
        }
        const eventStreamMember = ns.getEventStreamMember();
        if (eventStreamMember) {
            dataObject[eventStreamMember] = await this.deserializeEventStream({
                response,
                responseSchema: ns,
                initialResponseContainer: dataObject,
            });
        }
        else {
            const bytes = await collectBody(response.body, context);
            if (bytes.byteLength > 0) {
                Object.assign(dataObject, await deserializer.read(ns, bytes));
            }
        }
        dataObject.$metadata = this.deserializeMetadata(response);
        return dataObject;
    }
    isErrorResponse(statusCode) {
        return statusCode >= 300;
    }
}

class AbstractRpcV2Protocol extends RpcProtocol {
    constructor({ defaultNamespace, errorTypeRegistries, }) {
        super({ defaultNamespace, errorTypeRegistries });
    }
    async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        Object.assign(request.headers, {
            "content-type": this.getDefaultContentType(),
            "smithy-protocol": this.getSmithyProtocolHeaderValue(),
            accept: this.getDefaultContentType(),
        });
        if (deref(operationSchema.input) === "unit") {
            delete request.body;
            delete request.headers["content-type"];
        }
        else {
            this.applyEmptyBody(request);
        }
        const { service, operation } = getSmithyContext(context);
        const path = `/service/${service}/operation/${operation}`;
        if (request.path.endsWith("/")) {
            request.path += path.slice(1);
        }
        else {
            request.path += path;
        }
        return request;
    }
    isErrorResponse(statusCode) {
        return statusCode !== 200;
    }
}

const resolvedPath = (resolvedPath, input, memberName, labelValueProvider, uriLabel, isGreedyLabel) => {
    if (input != null && input[memberName] !== undefined) {
        const labelValue = labelValueProvider();
        if (labelValue == null || labelValue.length <= 0) {
            throw new Error("Empty value provided for input HTTP label: " + memberName + ".");
        }
        resolvedPath = resolvedPath.replace(uriLabel, isGreedyLabel
            ? labelValue
                .split("/")
                .map((segment) => extendedEncodeURIComponent(segment))
                .join("/")
            : extendedEncodeURIComponent(labelValue));
    }
    else {
        throw new Error("No value provided for input HTTP label: " + memberName + ".");
    }
    return resolvedPath;
};

function requestBuilder(input, context) {
    return new RequestBuilder(input, context);
}
class RequestBuilder {
    input;
    context;
    query = {};
    method = "";
    headers = {};
    path = "";
    body = null;
    hostname = "";
    resolvePathStack = [];
    constructor(input, context) {
        this.input = input;
        this.context = context;
    }
    async build() {
        const { hostname, protocol = "https", port, path: basePath } = await this.context.endpoint();
        this.path = basePath;
        for (const resolvePath of this.resolvePathStack) {
            resolvePath(this.path);
        }
        return new HttpRequest({
            protocol,
            hostname: this.hostname || hostname,
            port,
            method: this.method,
            path: this.path,
            query: this.query,
            body: this.body,
            headers: this.headers,
        });
    }
    hn(hostname) {
        this.hostname = hostname;
        return this;
    }
    bp(uriLabel) {
        this.resolvePathStack.push((basePath) => {
            this.path = `${basePath?.endsWith("/") ? basePath.slice(0, -1) : basePath || ""}` + uriLabel;
        });
        return this;
    }
    p(memberName, labelValueProvider, uriLabel, isGreedyLabel) {
        this.resolvePathStack.push((path) => {
            this.path = resolvedPath(path, this.input, memberName, labelValueProvider, uriLabel, isGreedyLabel);
        });
        return this;
    }
    h(headers) {
        this.headers = headers;
        return this;
    }
    q(query) {
        this.query = query;
        return this;
    }
    b(body) {
        this.body = body;
        return this;
    }
    m(method) {
        this.method = method;
        return this;
    }
}

function determineTimestampFormat(ns, settings) {
    if (settings.timestampFormat.useTrait) {
        if (ns.isTimestampSchema() &&
            (ns.getSchema() === 5 ||
                ns.getSchema() === 6 ||
                ns.getSchema() === 7)) {
            return ns.getSchema();
        }
    }
    const { httpLabel, httpPrefixHeaders, httpHeader, httpQuery } = ns.getMergedTraits();
    const bindingFormat = settings.httpBindings
        ? typeof httpPrefixHeaders === "string" || Boolean(httpHeader)
            ? 6
            : Boolean(httpQuery) || Boolean(httpLabel)
                ? 5
                : undefined
        : undefined;
    return bindingFormat ?? settings.timestampFormat.default;
}

class FromStringShapeDeserializer extends SerdeContext {
    settings;
    constructor(settings) {
        super();
        this.settings = settings;
    }
    read(_schema, data) {
        const ns = NormalizedSchema.of(_schema);
        if (ns.isListSchema()) {
            return splitHeader(data).map((item) => this.read(ns.getValueSchema(), item));
        }
        if (ns.isBlobSchema()) {
            return (this.serdeContext?.base64Decoder ?? fromBase64)(data);
        }
        if (ns.isTimestampSchema()) {
            const format = determineTimestampFormat(ns, this.settings);
            switch (format) {
                case 5:
                    return _parseRfc3339DateTimeWithOffset(data);
                case 6:
                    return _parseRfc7231DateTime(data);
                case 7:
                    return _parseEpochTimestamp(data);
                default:
                    console.warn("Missing timestamp format, parsing value with Date constructor:", data);
                    return new Date(data);
            }
        }
        if (ns.isStringSchema()) {
            const mediaType = ns.getMergedTraits().mediaType;
            let intermediateValue = data;
            if (mediaType) {
                if (ns.getMergedTraits().httpHeader) {
                    intermediateValue = this.base64ToUtf8(intermediateValue);
                }
                const isJson = mediaType === "application/json" || mediaType.endsWith("+json");
                if (isJson) {
                    intermediateValue = LazyJsonString.from(intermediateValue);
                }
                return intermediateValue;
            }
        }
        if (ns.isNumericSchema()) {
            return Number(data);
        }
        if (ns.isBigIntegerSchema()) {
            return BigInt(data);
        }
        if (ns.isBigDecimalSchema()) {
            return new NumericValue(data, "bigDecimal");
        }
        if (ns.isBooleanSchema()) {
            return String(data).toLowerCase() === "true";
        }
        return data;
    }
    base64ToUtf8(base64String) {
        return (this.serdeContext?.utf8Encoder ?? toUtf8)((this.serdeContext?.base64Decoder ?? fromBase64)(base64String));
    }
}

class HttpInterceptingShapeDeserializer extends SerdeContext {
    codecDeserializer;
    stringDeserializer;
    constructor(codecDeserializer, codecSettings) {
        super();
        this.codecDeserializer = codecDeserializer;
        this.stringDeserializer = new FromStringShapeDeserializer(codecSettings);
    }
    setSerdeContext(serdeContext) {
        this.stringDeserializer.setSerdeContext(serdeContext);
        this.codecDeserializer.setSerdeContext(serdeContext);
        this.serdeContext = serdeContext;
    }
    read(schema, data) {
        const ns = NormalizedSchema.of(schema);
        const traits = ns.getMergedTraits();
        const toString = this.serdeContext?.utf8Encoder ?? toUtf8;
        if (traits.httpHeader || traits.httpResponseCode) {
            return this.stringDeserializer.read(ns, toString(data));
        }
        if (traits.httpPayload) {
            if (ns.isBlobSchema()) {
                const toBytes = this.serdeContext?.utf8Decoder ?? fromUtf8;
                if (typeof data === "string") {
                    return toBytes(data);
                }
                return data;
            }
            else if (ns.isStringSchema()) {
                if ("byteLength" in data) {
                    return toString(data);
                }
                return data;
            }
        }
        return this.codecDeserializer.read(ns, data);
    }
}

class ToStringShapeSerializer extends SerdeContext {
    settings;
    stringBuffer = "";
    constructor(settings) {
        super();
        this.settings = settings;
    }
    write(schema, value) {
        const ns = NormalizedSchema.of(schema);
        switch (typeof value) {
            case "object":
                if (value === null) {
                    this.stringBuffer = "null";
                    return;
                }
                if (ns.isTimestampSchema()) {
                    if (!(value instanceof Date)) {
                        throw new Error(`@smithy/core/protocols - received non-Date value ${value} when schema expected Date in ${ns.getName(true)}`);
                    }
                    const format = determineTimestampFormat(ns, this.settings);
                    switch (format) {
                        case 5:
                            this.stringBuffer = value.toISOString().replace(".000Z", "Z");
                            break;
                        case 6:
                            this.stringBuffer = dateToUtcString(value);
                            break;
                        case 7:
                            this.stringBuffer = String(value.getTime() / 1000);
                            break;
                        default:
                            console.warn("Missing timestamp format, using epoch seconds", value);
                            this.stringBuffer = String(value.getTime() / 1000);
                    }
                    return;
                }
                if (ns.isBlobSchema() && "byteLength" in value) {
                    this.stringBuffer = (this.serdeContext?.base64Encoder ?? toBase64)(value);
                    return;
                }
                if (ns.isListSchema() && Array.isArray(value)) {
                    let buffer = "";
                    for (const item of value) {
                        this.write([ns.getValueSchema(), ns.getMergedTraits()], item);
                        const headerItem = this.flush();
                        const serialized = ns.getValueSchema().isTimestampSchema() ? headerItem : quoteHeader(headerItem);
                        if (buffer !== "") {
                            buffer += ", ";
                        }
                        buffer += serialized;
                    }
                    this.stringBuffer = buffer;
                    return;
                }
                this.stringBuffer = JSON.stringify(value, null, 2);
                break;
            case "string":
                const mediaType = ns.getMergedTraits().mediaType;
                let intermediateValue = value;
                if (mediaType) {
                    const isJson = mediaType === "application/json" || mediaType.endsWith("+json");
                    if (isJson) {
                        intermediateValue = LazyJsonString.from(intermediateValue);
                    }
                    if (ns.getMergedTraits().httpHeader) {
                        this.stringBuffer = (this.serdeContext?.base64Encoder ?? toBase64)(intermediateValue.toString());
                        return;
                    }
                }
                this.stringBuffer = value;
                break;
            default:
                if (ns.isIdempotencyToken()) {
                    this.stringBuffer = generateIdempotencyToken();
                }
                else {
                    this.stringBuffer = String(value);
                }
        }
    }
    flush() {
        const buffer = this.stringBuffer;
        this.stringBuffer = "";
        return buffer;
    }
}

class HttpInterceptingShapeSerializer {
    codecSerializer;
    stringSerializer;
    buffer;
    constructor(codecSerializer, codecSettings, stringSerializer = new ToStringShapeSerializer(codecSettings)) {
        this.codecSerializer = codecSerializer;
        this.stringSerializer = stringSerializer;
    }
    setSerdeContext(serdeContext) {
        this.codecSerializer.setSerdeContext(serdeContext);
        this.stringSerializer.setSerdeContext(serdeContext);
    }
    write(schema, value) {
        const ns = NormalizedSchema.of(schema);
        const traits = ns.getMergedTraits();
        if (traits.httpHeader || traits.httpLabel || traits.httpQuery) {
            this.stringSerializer.write(ns, value);
            this.buffer = this.stringSerializer.flush();
            return;
        }
        return this.codecSerializer.write(ns, value);
    }
    flush() {
        if (this.buffer !== undefined) {
            const buffer = this.buffer;
            this.buffer = undefined;
            return buffer;
        }
        return this.codecSerializer.flush();
    }
}

class Field {
    name;
    kind;
    values;
    constructor({ name, kind = FieldPosition.HEADER, values = [] }) {
        this.name = name;
        this.kind = kind;
        this.values = values;
    }
    add(value) {
        this.values.push(value);
    }
    set(values) {
        this.values = values;
    }
    remove(value) {
        this.values = this.values.filter((v) => v !== value);
    }
    toString() {
        return this.values.map((v) => (v.includes(",") || v.includes(" ") ? `"${v}"` : v)).join(", ");
    }
    get() {
        return this.values;
    }
}

class Fields {
    entries = {};
    encoding;
    constructor({ fields = [], encoding = "utf-8" }) {
        fields.forEach(this.setField.bind(this));
        this.encoding = encoding;
    }
    setField(field) {
        this.entries[field.name.toLowerCase()] = field;
    }
    getField(name) {
        return this.entries[name.toLowerCase()];
    }
    removeField(name) {
        delete this.entries[name.toLowerCase()];
    }
    getByType(kind) {
        return Object.values(this.entries).filter((field) => field.kind === kind);
    }
}

const getHttpHandlerExtensionConfiguration = (runtimeConfig) => {
    if (runtimeConfig.logger && runtimeConfig.logger.constructor?.name !== "NoOpLogger") {
        runtimeConfig.requestHandler?.updateHttpClientConfig?.(Symbol.for("logger"), runtimeConfig.logger);
    }
    return {
        setHttpHandler(handler) {
            runtimeConfig.requestHandler = handler;
        },
        httpHandler() {
            return runtimeConfig.requestHandler;
        },
        updateHttpClientConfig(key, value) {
            runtimeConfig.requestHandler?.updateHttpClientConfig(key, value);
        },
        httpHandlerConfigs() {
            return runtimeConfig.requestHandler.httpHandlerConfigs();
        },
    };
};
const resolveHttpHandlerRuntimeConfig = (httpHandlerExtensionConfiguration) => {
    return {
        requestHandler: httpHandlerExtensionConfiguration.httpHandler(),
    };
};

const CONTENT_LENGTH_HEADER = "content-length";
function contentLengthMiddleware(bodyLengthChecker) {
    return (next) => async (args) => {
        const request = args.request;
        if (HttpRequest.isInstance(request)) {
            const { body, headers } = request;
            if (body &&
                Object.keys(headers)
                    .map((str) => str.toLowerCase())
                    .indexOf(CONTENT_LENGTH_HEADER) === -1) {
                try {
                    const length = bodyLengthChecker(body);
                    if (length != null) {
                        request.headers = {
                            ...request.headers,
                            [CONTENT_LENGTH_HEADER]: String(length),
                        };
                    }
                }
                catch (ignored) {
                }
            }
        }
        return next({
            ...args,
            request,
        });
    };
}
const contentLengthMiddlewareOptions = {
    step: "build",
    tags: ["SET_CONTENT_LENGTH", "CONTENT_LENGTH"],
    name: "contentLengthMiddleware",
    override: true,
};
const getContentLengthPlugin = (options) => ({
    applyToStack: (clientStack) => {
        clientStack.add(contentLengthMiddleware(options.bodyLengthChecker), contentLengthMiddlewareOptions);
    },
});

const escapeUri = (uri) => encodeURIComponent(uri).replace(/[!'()*]/g, hexEncode);
const hexEncode = (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`;

const escapeUriPath = (uri) => uri.split("/").map(escapeUri).join("/");

function buildQueryString(query) {
    const parts = [];
    for (let key of Object.keys(query).sort()) {
        const value = query[key];
        key = escapeUri(key);
        if (Array.isArray(value)) {
            for (let i = 0, iLen = value.length; i < iLen; i++) {
                parts.push(`${key}=${escapeUri(value[i])}`);
            }
        }
        else {
            let qsEntry = key;
            if (value || typeof value === "string") {
                qsEntry += `=${escapeUri(value)}`;
            }
            parts.push(qsEntry);
        }
    }
    return parts.join("&");
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

let canParseBuffer;
function detectBufferParsing() {
    if (canParseBuffer === undefined) {
        try {
            if (typeof Buffer !== "function") {
                canParseBuffer = false;
            }
            else {
                const result = JSON.parse(Buffer.from([0x7b, 0x7d]));
                canParseBuffer = result !== null && typeof result === "object";
            }
        }
        catch {
            canParseBuffer = false;
        }
    }
    return canParseBuffer;
}

function jsonReviver(key, value, context) {
    if (context?.source) {
        const numericString = context.source;
        if (typeof value === "number") {
            const inSafeRange = value <= Number.MAX_SAFE_INTEGER && value >= Number.MIN_SAFE_INTEGER;
            if (inSafeRange) {
                if (isRepresentable(numericString, value)) {
                    return value;
                }
                return new NumericValue(numericString, "bigDecimal");
            }
            else {
                if (isFractionalBigNumeric(numericString)) {
                    return new NumericValue(numericString, "bigDecimal");
                }
                if (/[eE]/.test(numericString)) {
                    return expandExponentToBigInt(numericString);
                }
                return BigInt(numericString);
            }
        }
    }
    return value;
}
function isFractionalBigNumeric(s) {
    const dotIndex = s.indexOf(".");
    if (dotIndex === -1) {
        return false;
    }
    const eIndex = s.search(/[eE]/);
    if (eIndex === -1) {
        return true;
    }
    const fracDigits = eIndex - dotIndex - 1;
    const exp = parseInt(s.slice(eIndex + 1), 10);
    return exp < fracDigits;
}
function isRepresentable(numericString, value) {
    if (numericString === String(value)) {
        return true;
    }
    if (Object.is(value, -0)) {
        return true;
    }
    if (/[eE]/.test(numericString)) {
        return expandToDecimal(numericString) === expandToDecimal(String(value));
    }
    const normalized = numericString.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
    const canonical = String(value);
    if (normalized === canonical) {
        return true;
    }
    if (/[eE]/.test(canonical)) {
        return normalized === expandToDecimal(canonical);
    }
    return false;
}
function expandToDecimal(s) {
    const negative = s.startsWith("-");
    const abs = negative ? s.slice(1) : s;
    const eIndex = abs.search(/[eE]/);
    let result;
    if (eIndex === -1) {
        result = abs;
    }
    else {
        const exp = parseInt(abs.slice(eIndex + 1), 10);
        const mantissa = abs.slice(0, eIndex);
        const dotIndex = mantissa.indexOf(".");
        let digits;
        let intLen;
        if (dotIndex === -1) {
            digits = mantissa;
            intLen = mantissa.length;
        }
        else {
            digits = mantissa.slice(0, dotIndex) + mantissa.slice(dotIndex + 1);
            intLen = dotIndex;
        }
        digits = digits.replace(/0+$/, "") || "0";
        const newDotPos = intLen + exp;
        if (digits === "0") {
            result = "0";
        }
        else if (newDotPos <= 0) {
            result = "0." + "0".repeat(-newDotPos) + digits;
        }
        else if (newDotPos >= digits.length) {
            result = digits + "0".repeat(newDotPos - digits.length);
        }
        else {
            result = digits.slice(0, newDotPos) + "." + digits.slice(newDotPos);
        }
    }
    if (result.includes(".")) {
        result = result.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
    }
    return (negative ? "-" : "") + result;
}
function expandExponentToBigInt(s) {
    const eIndex = s.search(/[eE]/);
    const exp = parseInt(s.slice(eIndex + 1), 10);
    const negative = s.startsWith("-");
    const mantissa = s.slice(negative ? 1 : 0, eIndex);
    const dotIndex = mantissa.indexOf(".");
    let digits;
    let shift;
    if (dotIndex === -1) {
        digits = mantissa;
        shift = exp;
    }
    else {
        digits = mantissa.slice(0, dotIndex) + mantissa.slice(dotIndex + 1);
        const fracDigits = mantissa.length - dotIndex - 1;
        shift = exp - fracDigits;
    }
    digits = digits.replace(/0+$/, "") || "0";
    const result = BigInt(digits) * 10n ** BigInt(shift + (mantissa.replace(".", "").length - digits.length));
    return negative ? -result : result;
}

const REVIVER_SYMBOL = Symbol.for("@aws-sdk/reviver");
function needsReviver(schema) {
    const ns = NormalizedSchema.of(schema);
    const raw = ns.getSchema();
    if (Array.isArray(raw) && ns.isStructSchema()) {
        if (REVIVER_SYMBOL in raw) {
            return raw[REVIVER_SYMBOL];
        }
        const result = _check(ns, new Set());
        raw[REVIVER_SYMBOL] = result;
        return result;
    }
    return _check(ns, new Set());
}
function _check(ns, seen) {
    const raw = ns.getSchema();
    if (seen.has(raw)) {
        return false;
    }
    seen.add(raw);
    if (ns.isBigIntegerSchema() || ns.isBigDecimalSchema()) {
        return true;
    }
    if (ns.isStructSchema()) {
        for (const [, memberSchema] of ns.structIterator()) {
            if (_check(memberSchema, seen)) {
                return true;
            }
        }
    }
    else if (ns.isListSchema() || ns.isMapSchema()) {
        if (_check(ns.getValueSchema(), seen)) {
            return true;
        }
    }
    else if (ns.isDocumentSchema()) {
        return true;
    }
    return false;
}

const collectBodyString = (streamBody, context) => collectBody(streamBody, context).then((body) => (context?.utf8Encoder ?? toUtf8)(body));

async function parseJsonBody(streamBody, context, schema) {
    let parsingInput;
    if (detectBufferParsing() && typeof streamBody?.[Symbol.asyncIterator] === "function") {
        const buffer = await collectBody(streamBody, context);
        if (typeof Buffer === "function") {
            if (Buffer.isBuffer(buffer)) {
                parsingInput = buffer;
            }
            else {
                parsingInput = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
            }
        }
    }
    if (!parsingInput) {
        parsingInput = await collectBodyString(streamBody, context);
    }
    if (parsingInput.length === 0) {
        return {};
    }
    const reviver = schema && needsReviver(schema) ? jsonReviver : undefined;
    try {
        return JSON.parse(parsingInput, reviver);
    }
    catch (e) {
        if (e?.name === "SyntaxError") {
            Object.defineProperty(e, "$responseBodyText", {
                value: typeof parsingInput === "string" ? parsingInput : parsingInput.toString("utf8"),
            });
        }
        throw e;
    }
}
const parseJsonErrorBody = async (errorBody, context) => {
    const value = await parseJsonBody(errorBody, context);
    value.message = value.message ?? value.Message;
    return value;
};
const findKey = (object, key) => Object.keys(object).find((k) => k.toLowerCase() === key.toLowerCase());
const sanitizeErrorCode = (rawValue) => {
    let cleanValue = rawValue;
    if (typeof cleanValue === "number") {
        cleanValue = cleanValue.toString();
    }
    if (cleanValue.indexOf(",") >= 0) {
        cleanValue = cleanValue.split(",")[0];
    }
    if (cleanValue.indexOf(":") >= 0) {
        cleanValue = cleanValue.split(":")[0];
    }
    if (cleanValue.indexOf("#") >= 0) {
        cleanValue = cleanValue.split("#")[1];
    }
    return cleanValue;
};
const loadRestJsonErrorCode = (output, data) => {
    return loadErrorCode(output, data, ["header", "code", "type"]);
};
const loadJsonRpcErrorCode = (output, data, queryCompat = false) => {
    return loadErrorCode(output, data, queryCompat ? ["code", "header", "type"] : ["type", "code", "header"]);
};
const loadSmithyRpcV2JsonErrorCode = (output, data) => {
    if (data?.__type !== undefined) {
        let cleanValue = data.__type;
        if (typeof cleanValue === "number") {
            cleanValue = cleanValue.toString();
        }
        if (cleanValue.indexOf(",") >= 0) {
            cleanValue = cleanValue.split(",")[0];
        }
        if (cleanValue.indexOf(":") >= 0) {
            cleanValue = cleanValue.split(":")[0];
        }
        return cleanValue;
    }
};
const loadErrorCode = ({ headers }, data, order) => {
    while (order.length > 0) {
        const location = order.shift();
        switch (location) {
            case "header":
                const headerKey = findKey(headers ?? {}, "x-amzn-errortype");
                if (headerKey !== undefined) {
                    return sanitizeErrorCode(headers[headerKey]);
                }
                break;
            case "code":
                const codeKey = findKey(data ?? {}, "code");
                if (codeKey && data[codeKey] !== undefined) {
                    return sanitizeErrorCode(data[codeKey]);
                }
                break;
            case "type":
                if (data?.__type !== undefined) {
                    return sanitizeErrorCode(data.__type);
                }
                break;
        }
    }
};

function writeKey(obj) {
    Object.defineProperty(obj, "__proto__", { value: undefined, writable: true, enumerable: true, configurable: true });
}

class JsonShapeDeserializer2 extends SerdeContextConfig {
    settings;
    constructor(settings) {
        super();
        this.settings = settings;
    }
    async read(schema, data) {
        const reviver = needsReviver(schema) ? jsonReviver : undefined;
        let parsed;
        if (typeof data === "string") {
            if (data.length === 0) {
                return {};
            }
            parsed = JSON.parse(data, reviver);
        }
        else if (data instanceof Uint8Array && detectBufferParsing()) {
            if (data.byteLength === 0) {
                return {};
            }
            const buf = Buffer.isBuffer(data) ? data : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
            parsed = JSON.parse(buf, reviver);
        }
        else {
            parsed = await parseJsonBody(data, this.serdeContext, schema);
        }
        return this._read(schema, parsed);
    }
    readObject(schema, data) {
        return this._read(schema, data);
    }
    _read(schema, value) {
        const isObject = value !== null && typeof value === "object";
        const ns = NormalizedSchema.of(schema);
        if (isObject) {
            if (ns.isStructSchema()) {
                return this._readStruct(ns, value);
            }
            if (Array.isArray(value) && ns.isListSchema()) {
                const listMember = ns.getValueSchema();
                if (this.needsTransform(listMember)) {
                    for (let i = 0; i < value.length; ++i) {
                        value[i] = this._read(listMember, value[i]);
                    }
                }
                return value;
            }
            if (ns.isMapSchema()) {
                const mapMember = ns.getValueSchema();
                const map = value;
                if (this.needsTransform(mapMember)) {
                    for (const k in map) {
                        if (!hasOwn(map, k))
                            continue;
                        if (k === "__proto__") {
                            writeKey(map);
                        }
                        map[k] = this._read(mapMember, map[k]);
                    }
                }
                return map;
            }
        }
        if (ns.isBlobSchema() && typeof value === "string") {
            return fromBase64(value);
        }
        const mediaType = ns.getMergedTraits().mediaType;
        if (ns.isStringSchema() && typeof value === "string" && mediaType) {
            const isJson = mediaType === "application/json" || mediaType.endsWith("+json");
            if (isJson) {
                return LazyJsonString.from(value);
            }
            return value;
        }
        if (ns.isTimestampSchema() && value != null) {
            const format = determineTimestampFormat(ns, this.settings);
            switch (format) {
                case 5:
                    return parseRfc3339DateTimeWithOffset(value);
                case 6:
                    return parseRfc7231DateTime(value);
                case 7:
                    return parseEpochTimestamp(value);
                default:
                    console.warn("Missing timestamp format, parsing value with Date constructor:", value);
                    return new Date(value);
            }
        }
        if (ns.isBigIntegerSchema() && (typeof value === "number" || typeof value === "string")) {
            return BigInt(value);
        }
        if (ns.isBigDecimalSchema() && value != undefined) {
            if (value instanceof NumericValue) {
                return value;
            }
            const untyped = value;
            if (untyped.type === "bigDecimal" && "string" in untyped) {
                return new NumericValue(untyped.string, untyped.type);
            }
            return new NumericValue(String(value), "bigDecimal");
        }
        if (ns.isNumericSchema() && typeof value === "string") {
            switch (value) {
                case "Infinity":
                    return Infinity;
                case "-Infinity":
                    return -Infinity;
                case "NaN":
                    return NaN;
            }
            return value;
        }
        if (ns.isDocumentSchema()) {
            if (isObject) {
                if (Array.isArray(value)) {
                    for (let i = 0; i < value.length; ++i) {
                        const v = value[i];
                        if (!(v instanceof NumericValue)) {
                            value[i] = this._read(ns, v);
                        }
                    }
                }
                else {
                    const doc = value;
                    for (const k in doc) {
                        if (!hasOwn(doc, k))
                            continue;
                        if (k === "__proto__") {
                            writeKey(doc);
                        }
                        const v = doc[k];
                        if (!(v instanceof NumericValue)) {
                            doc[k] = this._read(ns, v);
                        }
                    }
                }
            }
        }
        return value;
    }
    _readStruct(ns, record) {
        const union = ns.isUnionSchema();
        const out = {};
        let nameMap;
        const hasType = typeof record.__type === "string";
        const { jsonName } = this.settings;
        if (jsonName && hasType) {
            nameMap = {};
        }
        let unionSerde;
        if (union) {
            unionSerde = new UnionSerde(record, out);
        }
        for (const [memberName, memberSchema] of ns.structIterator()) {
            let fromKey = memberName;
            if (jsonName) {
                fromKey = memberSchema.getMergedTraits().jsonName ?? fromKey;
                if (hasType) {
                    nameMap[fromKey] = memberName;
                }
            }
            if (union) {
                unionSerde.mark(fromKey);
            }
            if (record[fromKey] != null) {
                out[memberName] = this._read(memberSchema, record[fromKey]);
            }
        }
        if (union) {
            unionSerde.writeUnknown();
        }
        else if (hasType) {
            for (const k in record) {
                if (!hasOwn(record, k))
                    continue;
                const v = record[k];
                const t = jsonName ? (nameMap[k] ?? k) : k;
                if (!(t in out)) {
                    out[t] = v;
                }
            }
        }
        return out;
    }
    needsTransform(ns) {
        if (ns.isBlobSchema() ||
            ns.isTimestampSchema() ||
            ns.isBigIntegerSchema() ||
            ns.isBigDecimalSchema() ||
            ns.isNumericSchema()) {
            return true;
        }
        if (ns.isDocumentSchema() || ns.isStructSchema() || ns.isListSchema() || ns.isMapSchema()) {
            return true;
        }
        if (ns.isStringSchema() && ns.getMergedTraits().mediaType) {
            return true;
        }
        return false;
    }
}

class JsonBytesStringAdapter extends Uint8Array {
    string = null;
    static allocUnsafe(bytes) {
        if (typeof Buffer === "function") {
            const buffer = Buffer.allocUnsafe(bytes);
            return new JsonBytesStringAdapter(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        }
        return new JsonBytesStringAdapter(bytes);
    }
    toString() {
        return this.s();
    }
    valueOf() {
        return this.s();
    }
    includes(searchString, position) {
        if (typeof searchString === "string") {
            return this.s().includes(searchString, position);
        }
        return Uint8Array.prototype.includes.call(this, searchString, position);
    }
    indexOf(searchString, position) {
        if (typeof searchString === "string") {
            return this.s().indexOf(searchString, position);
        }
        return Uint8Array.prototype.indexOf.call(this, searchString, position);
    }
    lastIndexOf(searchString, position) {
        if (typeof searchString === "string") {
            return this.s().lastIndexOf(searchString, position);
        }
        const fn = Uint8Array.prototype.lastIndexOf;
        if (position !== undefined) {
            return fn.call(this, searchString, position);
        }
        return fn.call(this, searchString);
    }
    startsWith(searchString, position) {
        return this.s().startsWith(searchString, position);
    }
    endsWith(searchString, endPosition) {
        return this.s().endsWith(searchString, endPosition);
    }
    match(regexp) {
        return this.s().match(regexp);
    }
    replace(searchValue, replaceValue) {
        return this.s().replace(searchValue, replaceValue);
    }
    search(regexp) {
        return this.s().search(regexp);
    }
    split(separator, limit) {
        return this.s().split(separator, limit);
    }
    substring(start, end) {
        return this.s().substring(start, end);
    }
    trim() {
        return this.s().trim();
    }
    trimStart() {
        return this.s().trimStart();
    }
    trimEnd() {
        return this.s().trimEnd();
    }
    charAt(pos) {
        return this.s().charAt(pos);
    }
    charCodeAt(index) {
        return this.s().charCodeAt(index);
    }
    padStart(maxLength, fillString) {
        return this.s().padStart(maxLength, fillString);
    }
    padEnd(maxLength, fillString) {
        return this.s().padEnd(maxLength, fillString);
    }
    repeat(count) {
        return this.s().repeat(count);
    }
    toUpperCase() {
        return this.s().toUpperCase();
    }
    toLowerCase() {
        return this.s().toLowerCase();
    }
    s() {
        if (this.string == null) {
            const n = Date.now();
            if (n > warned + 60_000) {
                console.warn("@aws-sdk/core/protocols - WARN - JsonCodec2: you have called a string method on a Uint8Array request body. " +
                    "It has been automatically converted to string. In a future version this will throw an error.");
                warned = n;
            }
            this.string = toUtf8(this);
        }
        return this.string;
    }
}
var warned = 0;

const encoder = new TextEncoder();
const OPEN_BRACE = 0x7b;
const CLOSE_BRACE = 0x7d;
const OPEN_BRACKET = 0x5b;
const CLOSE_BRACKET = 0x5d;
const QUOTE = 0x22;
const COLON = 0x3a;
const COMMA = 0x2c;
const BACKSLASH = 0x5c;
const TRUE = new Uint8Array([0x74, 0x72, 0x75, 0x65]);
const FALSE = new Uint8Array([0x66, 0x61, 0x6c, 0x73, 0x65]);
const NULL = new Uint8Array([0x6e, 0x75, 0x6c, 0x6c]);
const ESCAPE_TABLE = new Array(128).fill(null);
ESCAPE_TABLE[0x08] = "b";
ESCAPE_TABLE[0x09] = "t";
ESCAPE_TABLE[0x0a] = "n";
ESCAPE_TABLE[0x0c] = "f";
ESCAPE_TABLE[0x0d] = "r";
ESCAPE_TABLE[0x22] = '"';
ESCAPE_TABLE[0x5c] = "\\";
for (let i = 0; i < 0x20; i++) {
    if (ESCAPE_TABLE[i] === null) {
        ESCAPE_TABLE[i] = "u00" + i.toString(16).padStart(2, "0");
    }
}
const INITIAL_BUFFER_SIZE = 2048;
function alloc(size) {
    return JsonBytesStringAdapter.allocUnsafe(size);
}
class JsonShapeSerializer2 extends SerdeContextConfig {
    settings;
    json;
    i = 0;
    rootSchema;
    rawValue;
    passthrough = false;
    constructor(settings) {
        super();
        this.settings = settings;
        this.json = alloc(INITIAL_BUFFER_SIZE);
    }
    write(schema, value) {
        this.i = 0;
        this.rawValue = value;
        this.rootSchema = NormalizedSchema.of(schema);
        this.passthrough = this.rootSchema.isBlobSchema() || this.rootSchema.isStringSchema();
        if (!this.passthrough) {
            this.writeValue(this.rootSchema, value, undefined);
        }
    }
    writeDiscriminatedDocument(schema, value) {
        this.i = 0;
        this.rootSchema = NormalizedSchema.of(schema);
        const ns = this.rootSchema;
        if (ns.isStructSchema() && value != null && typeof value === "object") {
            this.writeValue(ns, value, undefined);
            const prefix = `"__type":"${ns.getName(true) ?? "Unknown"}",`;
            const z = prefix.length;
            this.ensure(z);
            this.json.copyWithin(1 + z, 1, this.i);
            encoder.encodeInto(prefix, this.json.subarray(1));
            this.i += z;
        }
        else {
            this.writeValue(ns, value, undefined);
        }
    }
    flush() {
        this.rootSchema = undefined;
        const finalPosition = this.i;
        this.i = 0;
        const raw = this.rawValue;
        this.rawValue = undefined;
        if (finalPosition === 0) {
            return raw;
        }
        const result = this.json.subarray(0, finalPosition);
        this.json = alloc(INITIAL_BUFFER_SIZE);
        return result;
    }
    ensure(byteCount) {
        const { i, json } = this;
        if (i + byteCount > json.length) {
            let newSize = json.length * 2;
            while (newSize < i + byteCount) {
                newSize *= 2;
            }
            const next = alloc(newSize);
            next.set(this.json);
            this.json = next;
        }
    }
    writeAscii(s) {
        const z = s.length;
        this.ensure(z);
        let { i, json } = this;
        for (let j = 0; j < z; ++j) {
            json[i] = s.charCodeAt(j);
            i += 1;
        }
        this.i = i;
    }
    writeAsciiQuoted(s) {
        const z = s.length;
        this.ensure(z + 4);
        let { json, i } = this;
        json[i++] = QUOTE;
        for (let j = 0; j < z; ++j) {
            json[i++] = s.charCodeAt(j);
        }
        json[i++] = QUOTE;
        this.i = i;
    }
    writeJsonString(s) {
        const z = s.length;
        this.ensure(z * 3 + 2);
        this.json[this.i++] = QUOTE;
        for (let j = 0; j < z; ++j) {
            const c = s.charCodeAt(j);
            if (c > 0x22 && c < 0x5c) {
                this.json[this.i++] = c;
            }
            else if (c < 0x80) {
                const esc = ESCAPE_TABLE[c];
                if (esc !== null) {
                    this.ensure(esc.length + 1 + (z - j - 1) * 3 + 1);
                    this.json[this.i++] = BACKSLASH;
                    for (let k = 0; k < esc.length; k++) {
                        this.json[this.i++] = esc.charCodeAt(k);
                    }
                }
                else {
                    this.json[this.i++] = c;
                }
            }
            else if (c >= 0xd800 && c <= 0xdbff) {
                const next = j + 1 < z ? s.charCodeAt(j + 1) : 0;
                if (next >= 0xdc00 && next <= 0xdfff) {
                    this.ensure(4);
                    const { written } = encoder.encodeInto(s.substring(j, j + 2), this.json.subarray(this.i));
                    this.i += written;
                    ++j;
                }
                else {
                    this.ensure(6 + (z - j - 1) * 3 + 1);
                    this.writeUnicodeEscape(c);
                }
            }
            else if (c >= 0xdc00 && c <= 0xdfff) {
                this.ensure(6 + (z - j - 1) * 3 + 1);
                this.writeUnicodeEscape(c);
            }
            else {
                let { i, json } = this;
                if (c < 0x800) {
                    json[i++] = 0xc0 | (c >> 6);
                    json[i++] = 0x80 | (c & 0x3f);
                }
                else {
                    json[i++] = 0xe0 | (c >> 12);
                    json[i++] = 0x80 | ((c >> 6) & 0x3f);
                    json[i++] = 0x80 | (c & 0x3f);
                }
                this.i = i;
            }
        }
        this.json[this.i++] = QUOTE;
    }
    writeUnicodeEscape(code) {
        let { json, i } = this;
        json[i++] = BACKSLASH;
        json[i++] = 0x75;
        const hex = code.toString(16).padStart(4, "0");
        for (let j = 0; j < 4; ++j) {
            json[i++] = hex.charCodeAt(j);
        }
        this.i = i;
    }
    static B64 = (() => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        const table = new Uint8Array(64);
        for (let i = 0; i < 64; ++i) {
            table[i] = chars.charCodeAt(i);
        }
        return table;
    })();
    writeBase64(data) {
        const b64Len = Math.ceil(data.length / 3) * 4;
        this.ensure(b64Len + 2);
        const json = this.json;
        const B64 = JsonShapeSerializer2.B64;
        let i = this.i;
        json[i++] = QUOTE;
        const len = data.length;
        const remainder = len % 3;
        const mainLen = len - remainder;
        for (let j = 0; j < mainLen; j += 3) {
            const a = data[j];
            const b = data[j + 1];
            const c = data[j + 2];
            json[i++] = B64[a >> 2];
            json[i++] = B64[((a & 0x03) << 4) | (b >> 4)];
            json[i++] = B64[((b & 0x0f) << 2) | (c >> 6)];
            json[i++] = B64[c & 0x3f];
        }
        if (remainder === 2) {
            const a = data[mainLen];
            const b = data[mainLen + 1];
            json[i++] = B64[a >> 2];
            json[i++] = B64[((a & 0x03) << 4) | (b >> 4)];
            json[i++] = B64[(b & 0x0f) << 2];
            json[i++] = 0x3d;
        }
        else if (remainder === 1) {
            const a = data[mainLen];
            json[i++] = B64[a >> 2];
            json[i++] = B64[(a & 0x03) << 4];
            json[i++] = 0x3d;
            json[i++] = 0x3d;
        }
        json[i++] = QUOTE;
        this.i = i;
    }
    writeValue(schema, value, container) {
        if (value == null) {
            if (container?.isStructSchema()) {
                if (value === undefined) {
                    const ns = NormalizedSchema.of(schema);
                    if (ns.isIdempotencyToken()) {
                        this.writeAsciiQuoted(generateIdempotencyToken());
                        return;
                    }
                }
                return;
            }
            this.ensure(4);
            this.json.set(NULL, this.i);
            this.i += 4;
            return;
        }
        const ns = NormalizedSchema.of(schema);
        const isObject = typeof value === "object";
        if (ns.isStringSchema()) {
            const mediaType = ns.getMergedTraits().mediaType;
            if (mediaType) {
                const isJson = mediaType === "application/json" || mediaType.endsWith("+json");
                if (isJson) {
                    this.writeJsonString(LazyJsonString.from(value).toString());
                    return;
                }
            }
        }
        if (this.settings.bigNumberAsString && value != null && (ns.isBigIntegerSchema() || ns.isBigDecimalSchema())) {
            const asString = value instanceof NumericValue ? value.string : String(value);
            this.writeAsciiQuoted(asString);
            return;
        }
        if (isObject) {
            if (ns.isStructSchema()) {
                this.writeStruct(ns, value);
                return;
            }
            if (Array.isArray(value) && (ns.isListSchema() || ns.isDocumentSchema())) {
                this.writeList(ns, value, ns.isDocumentSchema());
                return;
            }
            if (ns.isMapSchema()) {
                this.writeMap(ns, value, false);
                return;
            }
            if (value instanceof Uint8Array && (ns.isBlobSchema() || ns.isDocumentSchema())) {
                this.writeBase64(value);
                return;
            }
            if (value instanceof Date && (ns.isTimestampSchema() || ns.isDocumentSchema())) {
                this.writeTimestamp(ns, value);
                return;
            }
            if (value instanceof NumericValue) {
                this.writeAscii(value.string);
                return;
            }
            if (ns.isDocumentSchema()) {
                if (Array.isArray(value)) {
                    this.writeList(ns, value, true);
                }
                else {
                    this.writeMap(ns, value, true);
                }
                return;
            }
            const json = JSON.stringify(value);
            this.writeAscii(json);
            return;
        }
        if (typeof value === "string") {
            if (ns.isBlobSchema()) {
                const b64 = (this.serdeContext?.base64Encoder ?? toBase64)(value);
                this.writeAsciiQuoted(b64);
                return;
            }
            this.writeJsonString(value);
            return;
        }
        if (typeof value === "number") {
            if (Math.abs(value) === Infinity || Number.isNaN(value)) {
                this.writeAsciiQuoted(String(value));
                return;
            }
            const numStr = String(value);
            this.writeAscii(numStr);
            return;
        }
        if (typeof value === "boolean") {
            this.ensure(5);
            let { i, json } = this;
            if (value) {
                json.set(TRUE, i);
                i += 4;
            }
            else {
                json.set(FALSE, i);
                i += 5;
            }
            this.i = i;
            return;
        }
        if (typeof value === "bigint") {
            this.writeAscii(value.toString());
            return;
        }
        this.writeAscii(String(value));
    }
    writeStruct(ns, value) {
        this.ensure(2);
        this.json[this.i++] = OPEN_BRACE;
        let wroteAny = false;
        const hasType = typeof value.__type === "string";
        let writtenKeys;
        if (hasType) {
            writtenKeys = new Set();
        }
        for (const [memberName, memberSchema] of ns.structIterator()) {
            const item = value[memberName];
            if (item == null && !memberSchema.isIdempotencyToken()) {
                continue;
            }
            if (wroteAny) {
                this.ensure(1);
                this.json[this.i++] = COMMA;
            }
            wroteAny = true;
            const targetKey = this.settings.jsonName ? (memberSchema.getMergedTraits().jsonName ?? memberName) : memberName;
            if (writtenKeys) {
                writtenKeys.add(memberName);
                writtenKeys.add(targetKey);
            }
            this.writeAsciiQuoted(targetKey);
            this.json[this.i++] = COLON;
            this.writeValue(memberSchema, item, ns);
        }
        if (!wroteAny && ns.isUnionSchema()) {
            const { $unknown } = value;
            if (Array.isArray($unknown)) {
                const [k, v] = $unknown;
                this.writeAsciiQuoted(k);
                this.ensure(1);
                this.json[this.i++] = COLON;
                this.writeValue(15, v, ns);
            }
        }
        else if (hasType) {
            for (const k in value) {
                if (writtenKeys.has(k)) {
                    continue;
                }
                writtenKeys.add(k);
                const v = value[k];
                if (wroteAny) {
                    this.ensure(1);
                    this.json[this.i++] = COMMA;
                }
                wroteAny = true;
                this.writeAsciiQuoted(k);
                this.ensure(1);
                this.json[this.i++] = COLON;
                this.writeValue(15, v, undefined);
            }
        }
        this.ensure(1);
        this.json[this.i++] = CLOSE_BRACE;
    }
    writeList(ns, value, isDocument) {
        const sparse = !!ns.getMergedTraits().sparse;
        const valueSchema = ns.getValueSchema();
        if (!isDocument) {
            if (valueSchema.isStringSchema() || valueSchema.isNumericSchema() || valueSchema.isBooleanSchema()) {
                let hasSpecials = false;
                for (let i = 0; i < value.length; ++i) {
                    const v = value[i];
                    if (Number.isNaN(v) || v === Infinity || v === -Infinity || (v == null && !sparse)) {
                        hasSpecials = true;
                        break;
                    }
                }
                let json;
                if (!hasSpecials) {
                    json = JSON.stringify(value);
                }
                else {
                    const out = [];
                    for (let i = 0; i < value.length; ++i) {
                        const v = value[i];
                        if (v == null && !sparse)
                            continue;
                        if (Number.isNaN(v) || v === Infinity || v === -Infinity) {
                            out.push(String(v));
                        }
                        else {
                            out.push(v);
                        }
                    }
                    json = JSON.stringify(out);
                }
                this.ensure(json.length * 3);
                this.i += encoder.encodeInto(json, this.json.subarray(this.i)).written;
                return;
            }
        }
        this.ensure(2);
        this.json[this.i++] = OPEN_BRACKET;
        let wroteFirstItem = false;
        for (let i = 0; i < value.length; ++i) {
            const item = value[i];
            if (isDocument ? item === undefined : item == null && !sparse) {
                continue;
            }
            if (wroteFirstItem) {
                this.ensure(1);
                this.json[this.i++] = COMMA;
            }
            this.writeValue(valueSchema, item, undefined);
            wroteFirstItem = true;
        }
        this.ensure(1);
        this.json[this.i++] = CLOSE_BRACKET;
    }
    writeMap(ns, value, isDocument) {
        const sparse = !!ns.getMergedTraits().sparse;
        const valueSchema = ns.getValueSchema();
        if (!isDocument) {
            if (valueSchema.isStringSchema() || valueSchema.isNumericSchema() || valueSchema.isBooleanSchema()) {
                let modifications;
                for (const k in value) {
                    if (!hasOwn(value, k))
                        continue;
                    const v = value[k];
                    if (Number.isNaN(v) || v === Infinity || v === -Infinity) {
                        (modifications ??= {})[k] = v;
                        value[k] = String(v);
                    }
                    else if (v === null && !sparse) {
                        (modifications ??= {})[k] = null;
                        value[k] = undefined;
                    }
                }
                const json = JSON.stringify(value);
                if (modifications) {
                    Object.assign(value, modifications);
                }
                this.ensure(json.length * 3);
                this.i += encoder.encodeInto(json, this.json.subarray(this.i)).written;
                return;
            }
        }
        this.ensure(2);
        this.json[this.i++] = OPEN_BRACE;
        let first = true;
        for (const k in value) {
            if (!hasOwn(value, k))
                continue;
            const v = value[k];
            if (isDocument ? v === undefined : v == null && !sparse) {
                continue;
            }
            if (!first) {
                this.ensure(1);
                this.json[this.i++] = COMMA;
            }
            first = false;
            this.writeJsonString(k);
            this.ensure(1);
            this.json[this.i++] = COLON;
            this.writeValue(valueSchema, v, undefined);
        }
        this.ensure(1);
        this.json[this.i++] = CLOSE_BRACE;
    }
    writeTimestamp(ns, value) {
        const format = determineTimestampFormat(ns, this.settings);
        switch (format) {
            case 5: {
                const iso = value.toISOString().replace(".000Z", "Z");
                this.writeAsciiQuoted(iso);
                return;
            }
            case 6: {
                this.writeAsciiQuoted(dateToUtcString(value));
                return;
            }
            case 7: {
                const epochSecs = String(value.getTime() / 1000);
                this.writeAscii(epochSecs);
                return;
            }
            default: {
                const epochSecs = String(value.getTime() / 1000);
                this.writeAscii(epochSecs);
                return;
            }
        }
    }
}

class JsonCodec2 extends SerdeContextConfig {
    settings;
    constructor(settings) {
        super();
        this.settings = settings;
    }
    createSerializer() {
        const serializer = new JsonShapeSerializer2(this.settings);
        serializer.setSerdeContext(this.serdeContext);
        return serializer;
    }
    createDeserializer() {
        const deserializer = new JsonShapeDeserializer2(this.settings);
        deserializer.setSerdeContext(this.serdeContext);
        return deserializer;
    }
}

class SmithyRpcV2JsonProtocol extends AbstractRpcV2Protocol {
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

class JsonShapeDeserializer extends SerdeContextConfig {
    settings;
    constructor(settings) {
        super();
        this.settings = settings;
    }
    async read(schema, data) {
        const reviver = needsReviver(schema) ? jsonReviver : undefined;
        return this._read(schema, typeof data === "string" ? JSON.parse(data, reviver) : await parseJsonBody(data, this.serdeContext, schema));
    }
    readObject(schema, data) {
        return this._read(schema, data);
    }
    _read(schema, value) {
        const isObject = value !== null && typeof value === "object";
        const ns = NormalizedSchema.of(schema);
        if (isObject) {
            if (ns.isStructSchema()) {
                const record = value;
                const union = ns.isUnionSchema();
                const out = {};
                let nameMap = void 0;
                const { jsonName } = this.settings;
                if (jsonName) {
                    nameMap = {};
                }
                let unionSerde;
                if (union) {
                    unionSerde = new UnionSerde(record, out);
                }
                for (const [memberName, memberSchema] of ns.structIterator()) {
                    let fromKey = memberName;
                    if (jsonName) {
                        fromKey = memberSchema.getMergedTraits().jsonName ?? fromKey;
                        nameMap[fromKey] = memberName;
                    }
                    if (union) {
                        unionSerde.mark(fromKey);
                    }
                    if (record[fromKey] != null) {
                        out[memberName] = this._read(memberSchema, record[fromKey]);
                    }
                }
                if (union) {
                    unionSerde.writeUnknown();
                }
                else if (typeof record.__type === "string") {
                    for (const k in record) {
                        if (!hasOwn(record, k))
                            continue;
                        const v = record[k];
                        const t = jsonName ? (nameMap[k] ?? k) : k;
                        if (!(t in out)) {
                            out[t] = v;
                        }
                    }
                }
                return out;
            }
            if (Array.isArray(value) && ns.isListSchema()) {
                const listMember = ns.getValueSchema();
                const out = [];
                for (const item of value) {
                    out.push(this._read(listMember, item));
                }
                return out;
            }
            if (ns.isMapSchema()) {
                const mapMember = ns.getValueSchema();
                const out = {};
                for (const _k in value) {
                    if (!hasOwn(value, _k))
                        continue;
                    if (_k === "__proto__") {
                        writeKey(out);
                    }
                    out[_k] = this._read(mapMember, value[_k]);
                }
                return out;
            }
        }
        if (ns.isBlobSchema() && typeof value === "string") {
            return fromBase64(value);
        }
        const mediaType = ns.getMergedTraits().mediaType;
        if (ns.isStringSchema() && typeof value === "string" && mediaType) {
            const isJson = mediaType === "application/json" || mediaType.endsWith("+json");
            if (isJson) {
                return LazyJsonString.from(value);
            }
            return value;
        }
        if (ns.isTimestampSchema() && value != null) {
            const format = determineTimestampFormat(ns, this.settings);
            switch (format) {
                case 5:
                    return parseRfc3339DateTimeWithOffset(value);
                case 6:
                    return parseRfc7231DateTime(value);
                case 7:
                    return parseEpochTimestamp(value);
                default:
                    console.warn("Missing timestamp format, parsing value with Date constructor:", value);
                    return new Date(value);
            }
        }
        if (ns.isBigIntegerSchema() && (typeof value === "number" || typeof value === "string")) {
            return BigInt(value);
        }
        if (ns.isBigDecimalSchema() && value != undefined) {
            if (value instanceof NumericValue) {
                return value;
            }
            const untyped = value;
            if (untyped.type === "bigDecimal" && "string" in untyped) {
                return new NumericValue(untyped.string, untyped.type);
            }
            return new NumericValue(String(value), "bigDecimal");
        }
        if (ns.isNumericSchema() && typeof value === "string") {
            switch (value) {
                case "Infinity":
                    return Infinity;
                case "-Infinity":
                    return -Infinity;
                case "NaN":
                    return NaN;
            }
            return value;
        }
        if (ns.isDocumentSchema()) {
            if (isObject) {
                const out = Array.isArray(value) ? [] : {};
                for (const k in value) {
                    if (!hasOwn(value, k))
                        continue;
                    if (k === "__proto__") {
                        writeKey(out);
                    }
                    const v = value[k];
                    if (v instanceof NumericValue) {
                        out[k] = v;
                    }
                    else {
                        out[k] = this._read(ns, v);
                    }
                }
                return out;
            }
            else {
                return structuredClone(value);
            }
        }
        return value;
    }
}

const NUMERIC_CONTROL_CHAR = String.fromCharCode(925);
class JsonReplacer {
    values = new Map();
    counter = 0;
    stage = 0;
    createReplacer() {
        if (this.stage === 1) {
            throw new Error("@aws-sdk/core/protocols - JsonReplacer already created.");
        }
        if (this.stage === 2) {
            throw new Error("@aws-sdk/core/protocols - JsonReplacer exhausted.");
        }
        this.stage = 1;
        return (key, value) => {
            if (value instanceof NumericValue) {
                const v = `${NUMERIC_CONTROL_CHAR + "nv" + this.counter++}_` + value.string;
                this.values.set(`"${v}"`, value.string);
                return v;
            }
            if (typeof value === "bigint") {
                const s = value.toString();
                const v = `${NUMERIC_CONTROL_CHAR + "b" + this.counter++}_` + s;
                this.values.set(`"${v}"`, s);
                return v;
            }
            return value;
        };
    }
    replaceInJson(json) {
        if (this.stage === 0) {
            throw new Error("@aws-sdk/core/protocols - JsonReplacer not created yet.");
        }
        if (this.stage === 2) {
            throw new Error("@aws-sdk/core/protocols - JsonReplacer exhausted.");
        }
        this.stage = 2;
        if (this.counter === 0) {
            return json;
        }
        for (const [key, value] of this.values) {
            json = json.replace(key, value);
        }
        return json;
    }
}

class JsonShapeSerializer extends SerdeContextConfig {
    settings;
    buffer;
    useReplacer = false;
    rootSchema;
    constructor(settings) {
        super();
        this.settings = settings;
    }
    write(schema, value) {
        this.rootSchema = NormalizedSchema.of(schema);
        this.buffer = this._write(this.rootSchema, value);
    }
    flush() {
        const { rootSchema, useReplacer } = this;
        this.rootSchema = undefined;
        this.useReplacer = false;
        if (rootSchema?.isStructSchema() || rootSchema?.isDocumentSchema()) {
            if (!useReplacer) {
                return JSON.stringify(this.buffer);
            }
            const replacer = new JsonReplacer();
            return replacer.replaceInJson(JSON.stringify(this.buffer, replacer.createReplacer(), 0));
        }
        return this.buffer;
    }
    writeDiscriminatedDocument(schema, value) {
        this.write(schema, value);
        if (typeof this.buffer === "object") {
            this.buffer.__type = NormalizedSchema.of(schema).getName(true);
        }
    }
    _write(schema, value, container) {
        const isObject = value !== null && typeof value === "object";
        const ns = NormalizedSchema.of(schema);
        if (isObject) {
            if (ns.isStructSchema()) {
                const record = value;
                const out = {};
                const { jsonName } = this.settings;
                let nameMap = void 0;
                if (jsonName) {
                    nameMap = {};
                }
                let outCount = 0;
                for (const [memberName, memberSchema] of ns.structIterator()) {
                    const serializableValue = this._write(memberSchema, record[memberName], ns);
                    if (serializableValue !== undefined) {
                        let targetKey = memberName;
                        if (jsonName) {
                            targetKey = memberSchema.getMergedTraits().jsonName ?? memberName;
                            nameMap[memberName] = targetKey;
                        }
                        out[targetKey] = serializableValue;
                        outCount++;
                    }
                }
                if (ns.isUnionSchema() && outCount === 0) {
                    const { $unknown } = record;
                    if (Array.isArray($unknown)) {
                        const [k, v] = $unknown;
                        if (k === "__proto__") {
                            writeKey(out);
                        }
                        out[k] = this._write(15, v);
                    }
                }
                else if (typeof record.__type === "string") {
                    for (const k in record) {
                        if (!hasOwn(record, k))
                            continue;
                        const v = record[k];
                        const targetKey = jsonName ? (nameMap[k] ?? k) : k;
                        if (!(targetKey in out)) {
                            out[targetKey] = this._write(15, v);
                        }
                    }
                }
                return out;
            }
            if (Array.isArray(value) && ns.isListSchema()) {
                const listMember = ns.getValueSchema();
                const out = [];
                const sparse = !!ns.getMergedTraits().sparse;
                for (const item of value) {
                    if (sparse || item != null) {
                        out.push(this._write(listMember, item));
                    }
                }
                return out;
            }
            if (ns.isMapSchema()) {
                const mapMember = ns.getValueSchema();
                const out = {};
                const sparse = !!ns.getMergedTraits().sparse;
                for (const _k in value) {
                    if (!hasOwn(value, _k))
                        continue;
                    const _v = value[_k];
                    if (sparse || _v != null) {
                        if (_k === "__proto__") {
                            writeKey(out);
                        }
                        out[_k] = this._write(mapMember, _v);
                    }
                }
                return out;
            }
            if (value instanceof Uint8Array && ns.isBlobSchema()) {
                if (ns === this.rootSchema) {
                    return value;
                }
                return (this.serdeContext?.base64Encoder ?? toBase64)(value);
            }
            if (value instanceof Date && (ns.isTimestampSchema() || ns.isDocumentSchema())) {
                const format = determineTimestampFormat(ns, this.settings);
                switch (format) {
                    case 5:
                        return value.toISOString().replace(".000Z", "Z");
                    case 6:
                        return dateToUtcString(value);
                    case 7:
                        return value.getTime() / 1000;
                    default:
                        console.warn("Missing timestamp format, using epoch seconds", value);
                        return value.getTime() / 1000;
                }
            }
            if (value instanceof NumericValue) {
                this.useReplacer = true;
            }
        }
        if (value === null && container?.isStructSchema()) {
            return void 0;
        }
        if (ns.isStringSchema()) {
            if (typeof value === "undefined" && ns.isIdempotencyToken()) {
                return generateIdempotencyToken();
            }
            const mediaType = ns.getMergedTraits().mediaType;
            if (value != null && mediaType) {
                const isJson = mediaType === "application/json" || mediaType.endsWith("+json");
                if (isJson) {
                    return LazyJsonString.from(value);
                }
            }
            return value;
        }
        if (typeof value === "number") {
            if (Math.abs(value) === Infinity || isNaN(value)) {
                return String(value);
            }
            return value;
        }
        if (typeof value === "string" && ns.isBlobSchema()) {
            if (ns === this.rootSchema) {
                return value;
            }
            return (this.serdeContext?.base64Encoder ?? toBase64)(value);
        }
        if (typeof value === "bigint") {
            this.useReplacer = true;
        }
        if (ns.isDocumentSchema()) {
            if (isObject) {
                if (value instanceof Uint8Array) {
                    return (this.serdeContext?.base64Encoder ?? toBase64)(value);
                }
                const out = Array.isArray(value) ? [] : {};
                for (const k in value) {
                    if (!hasOwn(value, k))
                        continue;
                    const v = value[k];
                    if (k === "__proto__") {
                        writeKey(out);
                    }
                    if (v instanceof NumericValue) {
                        this.useReplacer = true;
                        out[k] = v;
                    }
                    else {
                        out[k] = this._write(ns, v);
                    }
                }
                return out;
            }
            else {
                return structuredClone(value);
            }
        }
        return value;
    }
}

class JsonCodec extends SerdeContextConfig {
    settings;
    constructor(settings) {
        super();
        this.settings = settings;
    }
    createSerializer() {
        const serializer = new JsonShapeSerializer(this.settings);
        serializer.setSerdeContext(this.serdeContext);
        return serializer;
    }
    createDeserializer() {
        const deserializer = new JsonShapeDeserializer(this.settings);
        deserializer.setSerdeContext(this.serdeContext);
        return deserializer;
    }
}

exports.AbstractRpcV2Protocol = AbstractRpcV2Protocol;
exports.Field = Field;
exports.Fields = Fields;
exports.FromStringShapeDeserializer = FromStringShapeDeserializer;
exports.HttpBindingProtocol = HttpBindingProtocol;
exports.HttpInterceptingShapeDeserializer = HttpInterceptingShapeDeserializer;
exports.HttpInterceptingShapeSerializer = HttpInterceptingShapeSerializer;
exports.HttpProtocol = HttpProtocol;
exports.JsonCodec = JsonCodec;
exports.JsonCodec2 = JsonCodec2;
exports.JsonShapeDeserializer = JsonShapeDeserializer;
exports.JsonShapeDeserializer2 = JsonShapeDeserializer2;
exports.JsonShapeSerializer = JsonShapeSerializer;
exports.JsonShapeSerializer2 = JsonShapeSerializer2;
exports.RequestBuilder = RequestBuilder;
exports.RpcProtocol = RpcProtocol;
exports.SerdeContext = SerdeContext;
exports.SmithyRpcV2JsonProtocol = SmithyRpcV2JsonProtocol;
exports.ToStringShapeSerializer = ToStringShapeSerializer;
exports.buildQueryString = buildQueryString;
exports.collectBody = collectBody;
exports.contentLengthMiddleware = contentLengthMiddleware;
exports.contentLengthMiddlewareOptions = contentLengthMiddlewareOptions;
exports.determineTimestampFormat = determineTimestampFormat;
exports.escapeUri = escapeUri;
exports.escapeUriPath = escapeUriPath;
exports.extendedEncodeURIComponent = extendedEncodeURIComponent;
exports.getContentLengthPlugin = getContentLengthPlugin;
exports.getHttpHandlerExtensionConfiguration = getHttpHandlerExtensionConfiguration;
exports.loadJsonRpcErrorCode = loadJsonRpcErrorCode;
exports.loadRestJsonErrorCode = loadRestJsonErrorCode;
exports.loadSmithyRpcV2JsonErrorCode = loadSmithyRpcV2JsonErrorCode;
exports.parseJsonBody = parseJsonBody;
exports.parseJsonErrorBody = parseJsonErrorBody;
exports.requestBuilder = requestBuilder;
exports.resolveHttpHandlerRuntimeConfig = resolveHttpHandlerRuntimeConfig;
exports.resolvedPath = resolvedPath;
