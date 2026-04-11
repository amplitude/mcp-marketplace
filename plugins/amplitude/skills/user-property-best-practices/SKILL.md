---
name: user-property
description: >
  Source of truth for Amplitude user property best practices, naming conventions,
  and selection standards. Use when an agent needs to suggest, validate, or review
  user properties for a tracking plan. Covers what makes a good user property,
  default properties to avoid duplicating, naming rules, common categories,
  and quality standards for suggestions.
---

# User Property Best Practices

## When to Use

- Agent is generating user property suggestions for a tracking plan
- Agent needs to validate proposed user properties against best practices
- Agent is reviewing existing user properties for quality or naming issues
- User asks about what user properties to track or how to name them

---

# What Are User Properties?

User properties are attributes that describe **who a user is**, not what they did. They attach
to every event a user triggers and persist until explicitly updated. When a value changes, the
new value applies to all future events — it is **never applied retroactively** to historical data.

User properties are distinct from **event properties**, which describe the attributes of a
specific action at the moment it occurred.

---

# Default User Properties (Already Tracked by Amplitude SDKs)

Do **NOT** suggest any of the following — Amplitude tracks these automatically via its
client-side SDKs:

- Platform (iOS, Android, Web)
- Device Type / Device Family
- Country, City, Region, DMA (derived from IP via GeoIP)
- Language
- OS (name + version)
- Carrier
- Start Version / Version
- Library
- IP Address, Latitude, Longitude
- Device ID, User ID, Amplitude ID
- Paying (auto-set to `true` on first revenue event)
- Cohort (behavioral cohort membership)
- UTM Source, UTM Campaign, UTM Term

If the user's product sends data server-side only (no client SDK), note that these default
properties will NOT be auto-tracked and may need to be set explicitly.

---

# What Makes a Good Custom User Property?

## 1. Intrinsic to the User or Their Device

The property should describe a characteristic or trait of the user themselves, not a transient action.

- Good: `plan type`, `signup method`, `company size`
- Bad: `Last Button Clicked` (that's an event property)

## 2. Analytically Useful for Segmentation

The property should enable meaningful comparisons across user groups — for example, comparing
retention of "Pro" vs "Free" users, or behavior of users from different referral sources.

## 3. Relatively Stable Over Time

User properties are relied on for state changes and used for breakdowns/filters. Properties
that change on every event are better modeled as event properties. If a value changes, Amplitude
will show the user in both old and new segments for the day the change occurs.

## 4. Low Cardinality When Possible

Properties with a manageable number of distinct values (e.g., plan tiers, account types, regions)
are far more useful for grouping and segmentation than high-cardinality properties (e.g.,
free-text fields).

## 5. Not Duplicative of Defaults

Don't suggest properties already covered by Amplitude's automatic tracking (listed above),
including UTM parameters.

## 6. Does Not Require Excessive Computation

Only suggest properties whose value is **straightforward to set** — pulling data from a single
source and setting it directly. If a property requires aggregating events, running queries,
or deriving a value from multiple data points, it is NOT a good user property.

- Good: `email` (read directly from user record)
- Good: `authentication source` (known at login time)
- Bad: `Most Viewed Product` (requires aggregating event history)
- Bad: `Preferred Category` (requires ranking logic over event data)
- Bad: `Purchase Frequency Bracket` (requires counting purchases over a time window)
- Bad: `Preferred Department` (requires analyzing which department the user buys from most)

## 7. Named Clearly Using Lower Case

Use concise, descriptive names in lower case with spaces. Avoid abbreviations that aren't universally understood.

- Good: `subscription tier`, `is verified`
- Bad: `sub_t`, `acctAge`, `Subscription Tier`, `SUBSCRIPTION_TIER`, `subscription_tier`

---

# Common Custom User Property Categories

Draw suggestions from these categories as appropriate for the product:

## Account / Subscription

- Plan type, billing cycle, trial status, account start date, seats purchased
- Examples: `subscription tier`, `billing cycle`, `trial status`, `account start date`, `seats purchased`

## Acquisition

- Signup method (email, SSO, social)
- Examples: `signup method`

## Demographics / Profile

- Role, job title, industry, company name, company size, timezone
- Examples: `role`, `job title`, `industry`, `company name`, `company size`

## Engagement Maturity

- Onboarding status, activation milestone reached, power user flag
- Examples: `onboarding status`, `activation milestone`, `is power user`

## Product Configuration

- Preferred language/locale, theme preference, enabled integrations, feature flags
- Examples: `preferred locale`, `theme preference`, `enabled integrations`

## Monetization

- Payment method, most recent purchase date, coupon used at signup, currency preference
- Examples: `payment method`, `most recent purchase date`, `signup coupon`, `currency preference`

## Finance Platform

- Account type, linked bank, default funding source, KYC verification status
- Examples: `account type`, `linked bank`, `default funding source`, `kyc status`

## Industry-Agnostic Properties

These are well-formatted user properties useful across any product:

- **Experiment variants**: Use the experiment name as the key and the user's variant as the value
  (e.g., key: `experiment name a`, value: `"Control"` or `"Variant 1"`)
- **Feature flag variants**: Use the flag name as the key and the user's variant as the value
  (e.g., key: `flag name b`, value: `"On"` or `"Off"`)
- **Beta / early access flags**: Use the program name as the key and enrollment status as the value
  (e.g., key: `beta program x`, value: `"Enrolled"` or `"Not Enrolled"`)

---

# Quality Rules for Suggestions

1. **Tailored**: Every suggested property must be relevant to the specific business context —
   do not suggest B2B firmographic properties for a consumer media app
2. **Actionable**: Each property must enable a meaningful segmentation or cohort analysis
3. **Example values**: Always include 2-5 realistic example values that match the business
4. **Not duplicative of defaults**: Never suggest properties already auto-tracked by Amplitude SDKs
5. **No excessive computation**: Only suggest properties whose value can be pulled from a single
   source and set directly (no `Most Viewed Product`, `Preferred Category`, `Purchase Frequency Bracket`, etc.)
6. **Non-redundant**: Do not suggest properties that duplicate event properties or each other
7. **Low cardinality preferred**: Favor properties with a manageable number of distinct values

---

# Response Format

When providing user property suggestions, return each property with:

1. **Property Name**: lower case name
2. **Description**: What this property represents and when/how it should be set
3. **Example Values**: 2-5 realistic example values specific to the business

Suggest 5-15 user properties tailored to the specific business. Keep responses concise and
actionable. Focus on properties that will be most valuable for the specific business described
in the input.
