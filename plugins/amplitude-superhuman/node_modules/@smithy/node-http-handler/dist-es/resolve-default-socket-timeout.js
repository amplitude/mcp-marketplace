export const resolveDefaultSocketTimeout = (config) => {
    const value = config?.defaultSocketTimeout;
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
};
