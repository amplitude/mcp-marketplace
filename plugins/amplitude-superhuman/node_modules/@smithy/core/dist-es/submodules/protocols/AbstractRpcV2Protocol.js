import { deref } from "@smithy/core/schema";
import { getSmithyContext } from "@smithy/core/transport";
import { RpcProtocol } from "./RpcProtocol";
export class AbstractRpcV2Protocol extends RpcProtocol {
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
