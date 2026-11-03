import { ServiceException as __ServiceException, } from "@smithy/core/client";
export { __ServiceException };
export class SSOOIDCServiceException extends __ServiceException {
    static shapeId = "smithy.ts.sdk.synthetic.com.amazonaws.ssooidc#SSOOIDCServiceException";
    constructor(options) {
        super(options);
        Object.setPrototypeOf(this, SSOOIDCServiceException.prototype);
    }
}
