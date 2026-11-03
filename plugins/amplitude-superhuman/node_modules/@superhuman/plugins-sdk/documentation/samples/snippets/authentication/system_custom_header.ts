import * as sdk from "@superhuman/plugins-sdk";

const pack = sdk.newPack();

// BEGIN

pack.setSystemAuthentication({
  type: sdk.AuthenticationType.CustomHeaderToken,
  headerName: "${1:MyToken}",
});
