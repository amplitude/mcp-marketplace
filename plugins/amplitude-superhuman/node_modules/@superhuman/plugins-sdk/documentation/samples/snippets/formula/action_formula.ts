import * as sdk from "@superhuman/plugins-sdk";

const pack = sdk.newPack();

// BEGIN

pack.addFormula({
  name: "${1:MyAction}",
  description: "${2:My description.}",
  parameters: [
    // TODO: Add parameters.
  ],
  resultType: sdk.ValueType.String,
  isAction: true,
  execute: async function (args, context) {
    // TODO: Unpack the parameter values.
    let [] = args;
    // TODO: Do something.
    return "OK";
  },
});
