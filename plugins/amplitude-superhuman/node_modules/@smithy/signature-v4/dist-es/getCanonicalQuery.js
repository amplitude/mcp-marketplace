import { hasOwn } from "@smithy/core/serde";
import { escapeUri } from "@smithy/core/protocols";
import { SIGNATURE_HEADER } from "./constants";
export const getCanonicalQuery = ({ query = {} }) => {
    const keys = [];
    const serialized = {};
    for (const key in query) {
        if (!hasOwn(query, key))
            continue;
        if (key.toLowerCase() === SIGNATURE_HEADER) {
            continue;
        }
        const encodedKey = escapeUri(key);
        keys.push(encodedKey);
        const value = query[key];
        if (typeof value === "string") {
            serialized[encodedKey] = `${encodedKey}=${escapeUri(value)}`;
        }
        else if (Array.isArray(value)) {
            serialized[encodedKey] = value
                .slice(0)
                .reduce((encoded, value) => encoded.concat([`${encodedKey}=${escapeUri(value)}`]), [])
                .sort()
                .join("&");
        }
    }
    return keys
        .sort()
        .map((key) => serialized[key])
        .filter((serialized) => serialized)
        .join("&");
};
