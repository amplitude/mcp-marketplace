import { ServiceException as __ServiceException, } from "@smithy/core/client";
export { __ServiceException };
export class SigninServiceException extends __ServiceException {
    static shapeId = "smithy.ts.sdk.synthetic.com.amazonaws.signin#SigninServiceException";
    constructor(options) {
        super(options);
        Object.setPrototypeOf(this, SigninServiceException.prototype);
    }
}
