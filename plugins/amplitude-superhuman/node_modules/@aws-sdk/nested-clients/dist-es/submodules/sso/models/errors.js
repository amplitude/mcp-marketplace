import { SSOServiceException as __BaseException } from "./SSOServiceException";
export class InvalidRequestException extends __BaseException {
    static shapeId = "com.amazonaws.sso#InvalidRequestException";
    name = "InvalidRequestException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "InvalidRequestException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidRequestException.prototype);
    }
}
export class ResourceNotFoundException extends __BaseException {
    static shapeId = "com.amazonaws.sso#ResourceNotFoundException";
    name = "ResourceNotFoundException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ResourceNotFoundException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ResourceNotFoundException.prototype);
    }
}
export class TooManyRequestsException extends __BaseException {
    static shapeId = "com.amazonaws.sso#TooManyRequestsException";
    name = "TooManyRequestsException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "TooManyRequestsException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, TooManyRequestsException.prototype);
    }
}
export class UnauthorizedException extends __BaseException {
    static shapeId = "com.amazonaws.sso#UnauthorizedException";
    name = "UnauthorizedException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "UnauthorizedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, UnauthorizedException.prototype);
    }
}
