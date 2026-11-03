import { hasOwn } from "@smithy/core/serde";
import { HttpRequest } from "@smithy/core/protocols";
export const moveHeadersToQuery = (request, options = {}) => {
    const { headers, query = {} } = HttpRequest.clone(request);
    for (const name in headers) {
        if (!hasOwn(headers, name))
            continue;
        const lname = name.toLowerCase();
        if ((lname.slice(0, 6) === "x-amz-" && !options.unhoistableHeaders?.has(lname)) ||
            options.hoistableHeaders?.has(lname)) {
            query[name] = headers[name];
            delete headers[name];
        }
    }
    return {
        ...request,
        headers,
        query,
    };
};
