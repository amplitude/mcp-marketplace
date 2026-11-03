import type * as sdk from "@superhuman/plugins-sdk";

async function snippet(context: sdk.ExecutionContext) {
  // BEGIN
  let response = await context.fetcher.fetch({
    method: "GET",
    url: "${1:https://example.com}",
  });
  let data = response.body;
  // END
}
