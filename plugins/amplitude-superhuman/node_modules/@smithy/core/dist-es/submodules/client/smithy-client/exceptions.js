export class ServiceException extends Error {
    static shapeId = "smithy.ts.sdk.synthetic.nonamespace.client#ServiceException";
    $fault;
    $response;
    $retryable;
    $metadata;
    constructor(options) {
        super(options.message);
        Object.setPrototypeOf(this, Object.getPrototypeOf(this).constructor.prototype);
        this.name = options.name;
        this.$fault = options.$fault;
        this.$metadata = options.$metadata;
    }
    static isInstance(value) {
        if (!value)
            return false;
        const candidate = value;
        return (ServiceException.prototype.isPrototypeOf(candidate) ||
            (Boolean(candidate.$fault) &&
                Boolean(candidate.$metadata) &&
                (candidate.$fault === "client" || candidate.$fault === "server")));
    }
    static [Symbol.hasInstance](instance) {
        if (!instance)
            return false;
        const candidate = instance;
        if (this === ServiceException) {
            return ServiceException.isInstance(instance);
        }
        if (ServiceException.isInstance(instance)) {
            if (this.prototype.isPrototypeOf(instance)) {
                return true;
            }
            const targetId = Object.prototype.hasOwnProperty.call(this, "shapeId")
                ? this.shapeId
                : undefined;
            let candidateHasShapeId = false;
            if (targetId) {
                let proto = Object.getPrototypeOf(candidate);
                while (proto && proto !== Object.prototype) {
                    const ctor = proto.constructor;
                    const candidateId = ctor !== ServiceException && Object.prototype.hasOwnProperty.call(ctor, "shapeId")
                        ? ctor?.shapeId
                        : undefined;
                    if (candidateId) {
                        candidateHasShapeId = true;
                        if (candidateId === targetId) {
                            return true;
                        }
                    }
                    proto = Object.getPrototypeOf(proto);
                }
            }
            if (targetId && candidateHasShapeId) {
                return false;
            }
            const targetName = this.name;
            if (targetName && targetName.length >= 6) {
                if (candidate.name === targetName) {
                    return true;
                }
                let proto = Object.getPrototypeOf(candidate);
                while (proto && proto !== Object.prototype) {
                    const ctorName = proto.constructor?.name;
                    if (ctorName && ctorName !== "Error" && ctorName === targetName) {
                        return true;
                    }
                    proto = Object.getPrototypeOf(proto);
                }
            }
        }
        return false;
    }
}
export const decorateServiceException = (exception, additions = {}) => {
    Object.entries(additions)
        .filter(([, v]) => v !== undefined)
        .forEach(([k, v]) => {
        if (exception[k] == undefined || exception[k] === "") {
            exception[k] = v;
        }
    });
    const message = exception.message || exception.Message || "UnknownError";
    exception.message = message;
    delete exception.Message;
    return exception;
};
