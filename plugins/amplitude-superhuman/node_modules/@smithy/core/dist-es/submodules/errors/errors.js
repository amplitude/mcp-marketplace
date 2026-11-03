export class SmithyError extends Error {
    name = "SmithyError";
    $source = errors.$source;
}
export class SmithyTypeError extends TypeError {
    name = "SmithyTypeError";
    $source = errors.$source;
}
export class SmithyRangeError extends RangeError {
    name = "SmithyRangeError";
    $source = errors.$source;
}
export const errors = {
    $source: "smithy",
    Error: SmithyError,
    TypeError: SmithyTypeError,
    RangeError: SmithyRangeError,
};
