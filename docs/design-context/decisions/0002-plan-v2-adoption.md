# 0002. Plan v2 adoption: goal, identity, pricing, scope, and operating decisions (D-1 to D-10)

- **Date:** 2026-07-02
- **Status:** Accepted
- **Area:** Product
- **Deciders:** Charen (with Fable 5 analysis: 3 audits + market research, see docs/habitcents-plan-v2.html)

## Context
Three deep audits (mobile codebase, website/funnel, market research) showed the build had inverted PRD v1.0, the core loop was mechanically broken, and the $5k/mo year-one goal had a ~1-in-10 base rate. The plan v2 HTML report posed 10 blocking decisions. Charen answered all 10 on 2026-07-02.

## Decision
1. **D-1 Goal:** Evidence-based trajectory. $1-2k MRR by month 12; $5k MRR is the long-term (month ~24) goal, with stretch upside engineered via shareable counter, Apple featuring pitch, and content cadence.
2. **D-2 Identity:** "habitcents" everywhere (domain registered). Bundle ID: `com.habitcents.app` (iOS + Android), URL scheme `habitcents`.
3. **D-3 Pricing:** $3.99/mo, $29.99/yr annual-first, $49.99 lifetime, 14-day trial at onboarding. Supersedes PRD v1.0 pricing ($7.99/$59.99) and website copy ($48/yr).
4. **D-4 Repair, not rebuild** for both mobile app and website. Addendum: a design-excellence track is added (structural layout/component cleanup + modern visual direction) targeting Apple-Design-Award-level quality; direction to be prototyped and approved by Charen before implementation.
5. **D-5 Coaching:** Coach Moments redesign accepted (kill the lessons library, keep the content as ~20 contextual cards on 5 trigger events), conditional on a clear end-to-end wiring map showing coaching flowing naturally through app + marketing.
6. **D-6 Theme:** Light mode only for v1. Dark mode is a v1.x design-pass item.
7. **D-7 Content commitment (set by Fable 5 per Charen's delegation):** X/Twitter 3/wk, TikTok 1-2 videos/wk, LinkedIn 1/wk (repurposed), blog 2/mo, Reddit 2 value-first comments/wk. Founder time ~3-4h/wk; a content-scout agent system drafts, catalogs, screenshots, and flags video-worthy moments (spec: docs/content-agent-spec.md).
8. **D-8 Waitlist backend:** Resend (free tier: 3,000 emails/mo, 1,000 audience contacts) for storage + confirmation + future TestFlight invites. One vendor, one key, fully integrable in-session.
9. **D-9 Analytics posture:** PostHog in anonymous-device-ID mode: stable random per-install distinct_id (funnels, retention, new-vs-returning all work) with no name/email/identity linkage, text inputs masked, no ATT framework. Privacy label declares Identifiers + Usage Data, "not linked to identity", when PostHog ships.
10. **D-10 Onboarding:** Two doors (Start fresh Leak Audit / CSV import with hard scope bounds), concierge onboarding via TestFlight email only.

## Alternatives considered
- $5k-in-year-one as the committed goal: rejected as a ~1-in-10 base-rate outcome; kept as engineered stretch.
- Rebuild the mobile app: rejected; audits showed defects are wiring, the hard parts are built and good.
- Kill coaching entirely: rejected; the habit-psychology angle is the differentiator, only the library shape was wrong.
- Fully identified analytics: rejected; breaks the privacy moat and the "not linked to identity" label story.
- Airtable / Vercel Postgres for waitlist: rejected; Resend needed for email anyway, one vendor suffices.

## Consequences
- Unblocks Phase 0 (P0-1 identity fixes now have concrete values) and every downstream phase.
- Timeline ~11-13 weeks to App Store; Phase 2 carries the CSV import addition.
- Design-excellence track (D-4 addendum) needs a direction prototype before P2-4 executes.
- North Star v2 document is pending Charen's separate review; these decisions are inputs to it.
- Revisit pricing upward only after real trial-to-paid data exists.
