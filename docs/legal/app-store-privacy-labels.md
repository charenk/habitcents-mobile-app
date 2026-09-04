# App Store privacy-nutrition-label worksheet (P3-2)

- **Date:** 2026-09-04
- **Author:** core-worker routine, from a live read of `utils/analytics.ts`, `utils/purchases.ts`,
  `utils/leakScan/`, `utils/storage.ts`, and `package.json` in this repo.
- **Status:** draft for Charen to transcribe into App Store Connect's App Privacy
  questionnaire (com.habitcents.app). Not submitted anywhere; this session has no App
  Store Connect access. Recommendations are flagged where a judgment call is needed;
  everything else is read directly off the code.
- **Companions:** `../decisions/0001-feedback-and-instrumentation-stack.md`, D-9 in
  `../../../habitcents-ops/docs/habitcents-plan-v2.html`, `phase-3-scope.md` section 6
  (decision 2, already resolved: PostHog ships **on** in production, "Usage Data, not
  linked to you, not used for tracking").

## 1. How to read this

Apple's question is narrower than "what does the app store": it asks what is
**collected**, meaning gathered and transmitted off the device (to HabitCents or a
third party), linked or not. Data that lives only in `AsyncStorage` on the user's
device and is never transmitted is **not** "collected" under Apple's definition, even
though the app clearly uses it. That is the load-bearing fact behind most of the "Not
collected" rows below: HabitCents has no accounts and no backend; the on-device
expense/habit/category data (`utils/storage.ts`) never leaves the phone.

The one thing that does leave the device today is anonymous PostHog analytics, and
only when `EXPO_PUBLIC_POSTHOG_API_KEY` is set (it is, in the `production` EAS
environment, per the punch list's 2026-08-16 "analytics is live" entry). Everything
else in this worksheet follows from what that one pipe carries.

## 2. Data type answers (Apple's standard categories)

| Apple category | Collected? | Detail | Linked to identity? | Used to track you? |
|---|---|---|---|---|
| Contact Info (name, email, phone, address) | **No** | No accounts; the in-app Support row opens the device's own mail client (`mailto:support@habitcents.com`), which is the OS handing off to Mail, not the app collecting an address. | N/A | N/A |
| Health & Fitness | **No** | Not applicable to this app. | N/A | N/A |
| Financial Info | **No*** | See section 3, this is the one judgment call. Raw expense amounts, categories, merchant names never leave the device. | N/A | N/A |
| Location | **No** | No location APIs used anywhere in the app. | N/A | N/A |
| Sensitive Info | **No** | Not applicable. | N/A | N/A |
| Contacts | **No** | Not applicable. | N/A | N/A |
| User Content (photos, videos, files, audio) | **No** | The Leak Scan CSV picked via `expo-document-picker` is parsed entirely on-device (`utils/leakScan/`) and never uploaded; file contents are explicitly excluded from analytics per D-9 (see `utils/analytics.ts` comment above `scan_started`). | N/A | N/A |
| Browsing / Search History | **No** | Not applicable. | N/A | N/A |
| Identifiers (User ID, Device ID) | **Yes** | PostHog's auto-generated anonymous device ID. `identify()` is never called (`utils/analytics.ts` line 5); no HabitCents-issued user ID exists. | **No** | **No** |
| Purchases | **No, today** | `react-native-purchases` is now a `package.json` dependency (2026-09-04), but `utils/purchases.ts` only dynamically imports and configures it when `EXPO_PUBLIC_REVENUECAT_API_KEY` is set, which it is not anywhere this app is currently built or tested; mock mode (no data leaves the device) stays the default. **This answer must be revisited before the first build that ships a real key**; see section 4. | N/A | N/A |
| Usage Data (product interaction) | **Yes** | The structural event catalog in `utils/analytics.ts` (`AnalyticsEventMap`): screen views, taps, counts, booleans, coarse buckets. `sanitizeProps`/`bucketCents`/`bucketCount` strip free text, merchant names, and raw amounts before anything is sent. | **No** (tied only to the anonymous device ID, never to a person) | **No** (no cross-app/cross-site tracking, no ad SDK, no data sold or used for advertising) |
| Diagnostics (crash/performance data) | **No** | No crash-reporting or performance-monitoring SDK is in `package.json` (checked for Sentry, Bugsnag, Crashlytics; none present). | N/A | N/A |
| Other Data | **No** | Nothing else leaves the device. | N/A | N/A |

\* Financial Info is the one row worth a second look; see section 3.

## 3. The judgment call: coarse-bucketed amounts and "Financial Info"

`bucketCents()` turns a raw amount into a range string (e.g. `"100-250"`) before it
ever reaches an analytics prop, and several events carry one (`deck_card_shown`'s
`total_cents_bucket`, for instance). Apple's own examples for "Financial Info" are
things like account balances, credit scores, and payment/transaction records tied to
a person; a bucketed range with no merchant, no category-specific tie to a real
expense, and no link to an identity does not match that pattern.

**Recommendation:** answer "Financial Info: Not collected" and let the bucketed
figures fall under "Usage Data" instead, consistent with how they are used (product
interaction/funnel measurement, never account state). This is the more conservative
reading in the sense that it does not overclaim what is collected, but it is a real
privacy-label decision, not a fact read off the code, so it belongs to Charen to
accept or override before submission.

## 4. What changes this worksheet (must be redone before the affected submission)

1. **Live RevenueCat / `react-native-purchases`.** The dependency itself was added
   2026-09-04 (still inert; row 43 above already reflects this), but the day a real
   `EXPO_PUBLIC_REVENUECAT_API_KEY` ships in a build (see `utils/purchases.ts`'s
   "Activation (Charen, later)" note), the Purchases row flips to "Collected" and
   RevenueCat's own SDK data-collection disclosure needs to be folded in (RevenueCat
   publishes its own Apple-privacy-manifest guidance; check their current docs at
   activation time rather than trusting this worksheet's date).
2. **Any new SDK.** Adding a crash reporter, a different analytics vendor, or an ad
   SDK invalidates the Diagnostics/Usage Data/Purchases rows respectively.
3. **PostHog IP handling.** The current PostHog init (`utils/analytics.ts`,
   `initAnalytics()`) does not explicitly configure IP capture or stripping.
   PostHog's default behavior may retain IP address server-side for geolocation
   before discarding it. **Unverified by this worksheet.** Confirm PostHog's current
   IP-handling default and whether it is configured here, then decide whether
   "Identifiers: Device ID" needs a "Coarse Location" companion row. Flagging rather
   than asserting either way, since inventing an answer here would be worse than
   leaving it open.

## 5. Suggested top-line label

Given the table above and the recommendation in section 3: **"Data Not Linked to
You"**, with a single disclosed category (Usage Data, tied to an anonymous
identifier, not used for tracking). This matches Phase 3 decision 2's resolution
(`phase-3-scope.md` section 6, already implemented: PostHog ships anonymous and on in
production). It is one tier stricter than "Data Used to Track You" and one tier
looser than "Data Not Collected", which is not honestly claimable once any network
call fires by default in production.

## 6. What Charen still needs to do

- Transcribe section 2's table into App Store Connect's App Privacy questionnaire for
  `com.habitcents.app`.
- Decide section 3 (accept or override the Financial Info recommendation).
- Resolve section 4 item 3 (PostHog IP handling) before submitting, or accept the
  conservative "Identifiers only" answer with that caveat noted internally.
- Revisit this whole worksheet the day live RevenueCat purchases ship (section 4 item 1).
