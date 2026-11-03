import * as sdk from "@superhuman/plugins-sdk";

const pack = sdk.newPack();

// BEGIN

pack.addSkill({
  name: "${1:MySkill}",
  displayName: "${2:My skill}",
  description: "${3:My skill description.}",
  prompt: `
    $4$My prompt$
  `,
  tools: [
    // Optionally: Add tools.
  ],
});
