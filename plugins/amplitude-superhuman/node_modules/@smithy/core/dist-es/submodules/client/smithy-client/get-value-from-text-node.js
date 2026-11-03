import { hasOwn } from "@smithy/core/transport";
export const getValueFromTextNode = (obj) => {
    const textNodeName = "#text";
    for (const key in obj) {
        if (!hasOwn(obj, key))
            continue;
        if (obj[key][textNodeName] !== undefined) {
            obj[key] = obj[key][textNodeName];
        }
        else if (typeof obj[key] === "object" && obj[key] !== null) {
            obj[key] = getValueFromTextNode(obj[key]);
        }
    }
    return obj;
};
