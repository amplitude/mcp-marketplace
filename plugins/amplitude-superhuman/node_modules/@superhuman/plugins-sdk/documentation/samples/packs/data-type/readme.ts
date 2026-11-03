import * as sdk from "@superhuman/plugins-sdk";
export const pack = sdk.newPack();

// Returns the contents of GitHub repo's README.md file as markdown.
pack.addFormula({
  name: "GetReadme",
  description: "Gets the content of a GitHub repo's README.md file.",
  parameters: [
    sdk.makeParameter({
      type: sdk.ParameterType.String,
      name: "repo",
      description: "The repo to read from.",
      suggestedValue: "superhuman/plugins-sdk",
    }),
  ],
  resultType: sdk.ValueType.String,
  codaType: sdk.ValueHintType.Markdown,
  execute: async function ([repo], context) {
    let url = `https://raw.githubusercontent.com/${repo}/HEAD/README.md`;
    let result = await context.fetcher.fetch({
      method: "GET",
      url: url,
    });
    return result.body;
  },
});

pack.addNetworkDomain("raw.githubusercontent.com");
