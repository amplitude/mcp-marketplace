import { ServiceException as __ServiceException, } from "@smithy/core/client";
export { __ServiceException };
export class SSOServiceException extends __ServiceException {
    static shapeId = "smithy.ts.sdk.synthetic.com.amazonaws.sso#SSOServiceException";
    constructor(options) {
        super(options);
        Object.setPrototypeOf(this, SSOServiceException.prototype);
    }
}
