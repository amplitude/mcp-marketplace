import * as sdk from "@codahq/packs-sdk";

export const pack = sdk.newPack();

pack.addMCPServer({
  name: "Amplitude",
  endpointUrl: "https://mcp.amplitude.com/mcp",
});

pack.addNetworkDomain("amplitude.com");

pack.setUserAuthentication({
  type: sdk.AuthenticationType.OAuth2,
  useDynamicClientRegistration: true,
  useProofKeyForCodeExchange: true,  // Amplitude supports S256
  scopes: ["mcp:read", "mcp:write", "offline_access"],
});