import { hasOwn } from "@smithy/core/transport";
export class DefaultIdentityProviderConfig {
    authSchemes = new Map();
    constructor(config) {
        for (const key in config) {
            if (!hasOwn(config, key))
                continue;
            const value = config[key];
            if (value !== undefined) {
                this.authSchemes.set(key, value);
            }
        }
    }
    getIdentityProvider(schemeId) {
        return this.authSchemes.get(schemeId);
    }
}
