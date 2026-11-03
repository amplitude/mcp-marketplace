import * as sdk from "@superhuman/plugins-sdk";

const pack = sdk.newPack();

// BEGIN

pack.setUserAuthentication({
  type: sdk.AuthenticationType.CodaApiHeaderBearerToken,
});
