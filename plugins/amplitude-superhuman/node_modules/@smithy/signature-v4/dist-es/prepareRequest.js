import { hasOwn } from "@smithy/core/serde";
import { HttpRequest } from "@smithy/core/protocols";
import { GENERATED_HEADERS } from "./constants";
export const prepareRequest = (request) => {
    request = HttpRequest.clone(request);
    for (const headerName in request.headers) {
        if (!hasOwn(request.headers, headerName))
            continue;
        if (GENERATED_HEADERS.indexOf(headerName.toLowerCase()) > -1) {
            delete request.headers[headerName];
        }
    }
    return request;
};
