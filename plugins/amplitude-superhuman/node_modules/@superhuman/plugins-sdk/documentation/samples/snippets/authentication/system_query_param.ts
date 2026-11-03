import * as sdk from "@superhuman/plugins-sdk";

const pack = sdk.newPack();

// BEGIN

pack.setSystemAuthentication({
  type: sdk.AuthenticationType.QueryParamToken,
  paramName: "${1:myToken}",
});
