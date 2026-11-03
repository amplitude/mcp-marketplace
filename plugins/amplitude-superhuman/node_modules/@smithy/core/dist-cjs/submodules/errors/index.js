class SmithyError extends Error {
    name = "SmithyError";
    $source = errors.$source;
}
class SmithyTypeError extends TypeError {
    name = "SmithyTypeError";
    $source = errors.$source;
}
class SmithyRangeError extends RangeError {
    name = "SmithyRangeError";
    $source = errors.$source;
}
const errors = {
    $source: "smithy",
    Error: SmithyError,
    TypeError: SmithyTypeError,
    RangeError: SmithyRangeError,
};

exports.errors = errors;
