import { SigninServiceException as __BaseException } from "./SigninServiceException";
export class AccessDeniedException extends __BaseException {
    static shapeId = "com.amazonaws.signin#AccessDeniedException";
    name = "AccessDeniedException";
    $fault = "client";
    error;
    constructor(opts) {
        super({
            name: "AccessDeniedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, AccessDeniedException.prototype);
        this.error = opts.error;
    }
}
export class InternalServerException extends __BaseException {
    static shapeId = "com.amazonaws.signin#InternalServerException";
    name = "InternalServerException";
    $fault = "server";
    error;
    constructor(opts) {
        super({
            name: "InternalServerException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, InternalServerException.prototype);
        this.error = opts.error;
    }
}
export class TooManyRequestsError extends __BaseException {
    static shapeId = "com.amazonaws.signin#TooManyRequestsError";
    name = "TooManyRequestsError";
    $fault = "client";
    error;
    constructor(opts) {
        super({
            name: "TooManyRequestsError",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, TooManyRequestsError.prototype);
        this.error = opts.error;
    }
}
export class ValidationException extends __BaseException {
    static shapeId = "com.amazonaws.signin#ValidationException";
    name = "ValidationException";
    $fault = "client";
    error;
    constructor(opts) {
        super({
            name: "ValidationException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ValidationException.prototype);
        this.error = opts.error;
    }
}
