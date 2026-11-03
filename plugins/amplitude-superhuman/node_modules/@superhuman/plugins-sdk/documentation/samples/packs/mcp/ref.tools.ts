import * as coda from "@superhuman/plugins-sdk";

export const pack = coda.newPack();

pack.addMCPServer({
  name: "Ref_tools",
  endpointUrl: "https://api.ref.tools/mcp",
});

pack.setUserAuthentication({
  type: coda.AuthenticationType.CustomHeaderToken,
  headerName: "x-ref-api-key",
  instructionsUrl: "https://ref.tools/keys",
});

pack.addNetworkDomain("ref.tools");
