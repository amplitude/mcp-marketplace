import * as sdk from "@superhuman/plugins-sdk";

let parameters = [
  // BEGIN
  sdk.makeParameter({
    type: sdk.ParameterType.NumberArray,
    name: "${1:myParameter}",
    description: "${2:My description.}",
  }),
  // END
];
