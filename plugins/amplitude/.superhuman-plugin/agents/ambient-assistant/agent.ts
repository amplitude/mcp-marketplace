// ------------------------------------------------------------------------------------------------
// OVERVIEW
// ------------------------------------------------------------------------------------------------
// This agent is designed to act as a helpful assistant who provides just-in-time
// context-aware information in response to a user's writing. The scope of this context is limited
// to questions that can be confidently answered via Amplitude.
// ------------------------------------------------------------------------------------------------

// Import necessary modules.
import * as sdk from '@codahq/packs-sdk';

// Instantiate a new agent.
const agent = sdk.newAgent();

// Export the agent. The early-access SDK still requires the exported builder to be named `pack`.
export const pack = agent;


// ------------------------------------------------------------------------------------------------
// TOOLS
// ------------------------------------------------------------------------------------------------
// To be effective, an agent needs access to tools that it can use to react to the user's writing.
// Available tools include Superhuman Docs, Superhuman Mail, Superhuman MCP connectors, and web
// search. Some tools (Superhuman Docs, Superhuman Mail) double as trigger surfaces -- see below.
// ------------------------------------------------------------------------------------------------

// Enumerate the necessary tools that the agent needs access to.
agent.setTools({
  connectors: [
    {packId: 56421} // https://superhuman.com/store/connectors/amplitude-56421
  ]
});


// ------------------------------------------------------------------------------------------------
// TRIGGERS
// ------------------------------------------------------------------------------------------------
// This agent is designed to act in response to the user's writing instead of at the user's
// direction. Watching and waiting for an opportunity to share information that the user did not
// know to ask for is how this agent adds value.
// ------------------------------------------------------------------------------------------------

// Set an ambient always-on trigger. Take care to avoid fatiguing the user with low-value context.
agent.setDefaultWhileWritingTrigger({
  condition: `
The visible writing includes a claim that can be confidently fact-checked with Amplitude data. Such claims include:
  - Assertions about common product analytics metrics (conversion rate, retention rate, active user count, etc.)
  - Assertions about product features (new feature adoption, feature usage, feature effectiveness, etc.)
  - Assertions about Amplitude metrics, charts, or dashboards
  - Assertions about experiments or releases
`,
  assistMode: sdk.ContextualTriggerAssistMode.Proactive,
  decorationStyle: sdk.ContextualTriggerDecorationStyle.Underline,
  surfaces: [
    sdk.ContextualTriggerSurface.Docs,
    sdk.ContextualTriggerSurface.Email
  ],
  blockedDomains: [ // Don't trigger on Amplitude properties. Hostnames only; the SDK rejects schemes and paths.
    'amplitude.com',
    'analytics.amplitude.com',
    'app.amplitude.com',
    'app.eu.amplitude.com'
  ]
});


// ------------------------------------------------------------------------------------------------
// INSTRUCTIONS
// ------------------------------------------------------------------------------------------------
// Once triggered, the agent needs to know what to do. Instructions should be written carefully to
// not overlap with triggers so as to avoid conflicts
// ------------------------------------------------------------------------------------------------

// Set instructions for what the agent should do when triggered.
agent.setInstructions(`
Obey the following ground rules at all times:
  - Do not rewrite the user's text.
  - Do not create, edit, or delete anything in Amplitude.
  - Do not fabricate customers, metrics, events, results, or insights.

Respond to the user's writing with the following steps:
  1. Identify the claim made in the user's writing.
  2. Search Amplitude for evidence that supports or refutes the claim. Evidence should be prioritized as follows:
      i. Official preconfigured pages. These include the following wildcard Amplitude URLs:
          - */analytics/{org}/space/product-analytics/*
          - */analytics/{org}/space/web-analytics/*
          - */analytics/{org}/space/ecommerce-analytics/*
          - */agent-analytics/{org}/*
          - */analytics/{org}/session-replay/*
          - */ai-feedback/{org}/*
          - */experiment/{org}/*
          - */guides-surveys/{org}/*
      ii.Content that has been marked as official. I.e., content that appears in the following Amplitude search URL: */analytics/{org}/search?official+content=true
      iii. Governed metrics. I.e., metrics from the following Amplitude URL: */analytics/{org}/metrics
      iv. Popular content.
      v. Everything else.
  3. Assess your confidence in the evidence you gathered. Score your confidence from 0% to 100%.
  4. If you are less than 85% confident, do nothing. If you are at least 85% confident, return a summary of the evidence you gathered along with your confidence score.
`);