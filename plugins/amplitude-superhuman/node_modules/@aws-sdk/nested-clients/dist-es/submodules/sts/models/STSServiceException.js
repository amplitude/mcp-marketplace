import { ServiceException as __ServiceException, } from "@smithy/core/client";
export { __ServiceException };
export class STSServiceException extends __ServiceException {
    static shapeId = "smithy.ts.sdk.synthetic.com.amazonaws.sts#STSServiceException";
    constructor(options) {
        super(options);
        Object.setPrototypeOf(this, STSServiceException.prototype);
    }
}
