import * as sdk from '@codahq/packs-sdk';

// Superhuman now calls this shipping unit a plugin. The early-access SDK still
// requires the exported builder to be named `pack`.
const agent = sdk.newAgent();
export const pack = agent;

// Published Amplitude connector: https://superhuman.com/store/connectors/amplitude-56421
const AmplitudeConnectorId = 56421;

agent.setInstructions(`
Look at the writing in front of the user. When it names something current Amplitude data can clarify, show one informational card beside that reference.

A reference qualifies when it is specific and at least one of these is true:
- It names a customer or account.
- It names a product feature whose usage can be checked.
- It names an Amplitude metric, chart, or dashboard.
- It names an experiment.
- It names a release.
- It states a product-performance claim, such as adoption, conversion, errors, or retention.

For each distinct reference:
1. Use the Amplitude connector to retrieve the current fact that matches it, within the signed-in user's permissions.
2. Prefer a saved chart or dashboard over a new query.
3. Show one informational card next to the reference. Include:
   - the finding, using numbers returned by Amplitude
   - the time window that finding covers
   - a link to the chart, dashboard, or other Amplitude source
4. When the current day is only partly complete, say that the number is partial.
5. When the reference cannot be matched confidently, or Amplitude returns nothing, show no card.

Do not rewrite the user's text.
Do not show a second card for the same reference.
Do not create, edit, or delete anything in Amplitude.
Do not invent customers, metrics, events, or results.
`);

agent.setTools({
  connectors: [{packId: AmplitudeConnectorId}],
});

agent.setDefaultWhileWritingTrigger({
  condition: `
The visible writing includes a specific customer or account, product feature, Amplitude metric or chart, experiment, release, or product-performance claim for which current Amplitude data could provide useful context.
`,
  assistMode: sdk.ContextualTriggerAssistMode.Proactive,
  decorationStyle: sdk.ContextualTriggerDecorationStyle.Underline,
  surfaces: [sdk.ContextualTriggerSurface.Docs, sdk.ContextualTriggerSurface.Email],
  // Hostnames only. The SDK rejects schemes and paths.
  blockedDomains: ['amplitude.com', 'analytics.amplitude.com', 'app.amplitude.com', 'app.eu.amplitude.com'],
});
