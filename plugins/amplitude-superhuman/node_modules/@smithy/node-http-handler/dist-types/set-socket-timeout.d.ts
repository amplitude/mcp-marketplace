import type { ClientRequest } from "node:http";
/**
 * @internal
 * @param destroyResponseBodyOnTimeout - set by the service default. On timeout the response
 * body is destroyed with the TimeoutError, and the timeout stays armed through the body.
 */
export declare const setSocketTimeout: (request: ClientRequest, reject: (err: Error) => void, timeoutInMs?: number, destroyResponseBodyOnTimeout?: boolean) => NodeJS.Timeout | number;
