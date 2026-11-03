import { timing } from "./timing";
const DEFER_EVENT_LISTENER_TIME = 3000;
export const setSocketTimeout = (request, reject, timeoutInMs = 0, destroyResponseBodyOnTimeout = false) => {
    let response;
    if (destroyResponseBodyOnTimeout) {
        request.once("response", (res) => (response = res));
    }
    const registerTimeout = (offset) => {
        const timeout = timeoutInMs - offset;
        const onTimeout = () => {
            const error = Object.assign(new Error(`@smithy/node-http-handler - the request socket timed out after ${timeoutInMs} ms of inactivity (${destroyResponseBodyOnTimeout ? "service default socket timeout" : "configured by client requestHandler"}).`), { name: "TimeoutError" });
            if (destroyResponseBodyOnTimeout) {
                response?.destroy(error);
            }
            request.destroy();
            reject(error);
        };
        if (request.socket) {
            request.socket.setTimeout(timeout, onTimeout);
            request.on("close", () => request.socket?.removeListener("timeout", onTimeout));
        }
        else {
            request.setTimeout(timeout, onTimeout);
        }
    };
    if (0 < timeoutInMs && timeoutInMs < 6000) {
        registerTimeout(0);
        return 0;
    }
    const deferralId = timing.setTimeout(registerTimeout.bind(null, timeoutInMs === 0 ? 0 : DEFER_EVENT_LISTENER_TIME), DEFER_EVENT_LISTENER_TIME);
    if (destroyResponseBodyOnTimeout) {
        request.once("close", () => timing.clearTimeout(deferralId));
        return 0;
    }
    return deferralId;
};
