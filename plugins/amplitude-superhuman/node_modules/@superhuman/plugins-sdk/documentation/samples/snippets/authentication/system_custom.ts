import * as sdk from "@superhuman/plugins-sdk";

const pack = sdk.newPack();

// BEGIN

pack.setSystemAuthentication({
  type: sdk.AuthenticationType.Custom,
  params: [
    {
      name: "${1:myToken}",
      description: "${2:My description}",
    },
    // TODO: Add more parameters, if needed.
  ],
});
