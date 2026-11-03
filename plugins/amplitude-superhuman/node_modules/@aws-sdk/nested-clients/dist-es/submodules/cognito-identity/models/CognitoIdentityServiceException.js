import { ServiceException as __ServiceException, } from "@smithy/core/client";
export { __ServiceException };
export class CognitoIdentityServiceException extends __ServiceException {
    static shapeId = "smithy.ts.sdk.synthetic.com.amazonaws.cognitoidentity#CognitoIdentityServiceException";
    constructor(options) {
        super(options);
        Object.setPrototypeOf(this, CognitoIdentityServiceException.prototype);
    }
}
