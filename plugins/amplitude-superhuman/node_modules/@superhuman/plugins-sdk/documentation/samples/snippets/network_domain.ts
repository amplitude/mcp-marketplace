import * as sdk from "@superhuman/plugins-sdk";

const pack = sdk.newPack();

// BEGIN
pack.addNetworkDomain("${1:example.com}");
