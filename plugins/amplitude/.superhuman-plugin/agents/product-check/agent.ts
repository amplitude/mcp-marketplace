// ------------------------------------------------------------------------------------------------
// OVERVIEW
// ------------------------------------------------------------------------------------------------
// This agent is designed to act as a helpful assistant who provides just-in-time
// context-aware information in response to a user's writing. The scope of this context is limited
// to questions that can be confidently answered via Amplitude.
// ------------------------------------------------------------------------------------------------

// Import necessary modules.
import * as sdk from '@superhuman/plugins-sdk';

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
  - Assertions about common product analytics metrics (conversion rate, retention rate, user count, etc.)
  - Assertions about product features (new feature adoption, feature usage, feature effectiveness, etc.)
  - Assertions about Amplitude metrics, charts, or dashboards
  - Assertions about experiments or releases
`,
  assistMode: sdk.ContextualTriggerAssistMode.Proactive,
  decorationStyle: sdk.ContextualTriggerDecorationStyle.Underline,
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
// not overlap with triggers so as to avoid conflicts.
// ------------------------------------------------------------------------------------------------

// Set instructions for what the agent should do when triggered.
agent.setInstructions(`
Obey the following ground rules at all times:
  - Do not rewrite the user's text.
  - Do not create, edit, or delete anything in Amplitude.
  - Do not fabricate customers, metrics, events, results, or insights.
  - Do not include partial data from incomplete days in any analysis.

Respond to the user's writing with the following steps:
  1. Identify the claim made in the user's writing.
  2. Identify the relevant Amplitude project. If the user has access to only a single project, then this project is the relevant project. If the user has access to multiple projects, attempt to use contextual clues to identify the relevant project. Specifically, check the user's writing for mentions of a specific Amplitude project name or numeric project ID. A close match sufficiently disambiguates the relevant project.
  3. If it's unclear which Amplitude project to use, return the following message: "This seems like a claim that could be supported or refuted by your product usage data. However, I'm unsure which Amplitude project to use. Please clarify." Do not proceed further until the project is clarified.
  4. Search the relevant Amplitude project for evidence that supports or contradicts the claim. Contradictory evidence need not present a clear counter-narrative, but can merely poke holes in the user's claim. Prioritize evidence from official/popular sources over evidence from unofficial/unpopular sources.
  5. Assess your confidence that the evidence you gathered is correct, accurate, complete, and reliable. Official/popular content should be considered more trustworthy than unofficial/unpopular content. (Note: some users may choose to test with an Amplitude sandbox environment, which should not be disregarded as "unofficial" by default.) Score your confidence in your analysis of the evidence from 0% to 100%.
  6. If you are less than 85% confident, do nothing. If you are at least 85% confident, return a written explanation detailing:
     (1) Your analysis. What does the evidence show and why is it relevant?
     (2) Your methodology. How did you analyze the evidence? Cite the Amplitude project name and ID that you used.
     (3) Your confidence. What is your confidence score and how did you arrive at it?
`);