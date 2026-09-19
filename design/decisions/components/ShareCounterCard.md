# ShareCounterCard (components/ShareCounterCard.tsx)

## Direction (current)
The branded image captured for the native share sheet (roadmap P4-3). A standalone sage-light square card: "I kept $X in Y days." in the display serif, a small "habitcents" wordmark. Reuses KeptHero's palette and type (theme.primaryLight/primaryDark, fonts.display) rather than inventing a new look, but is its own component: it renders for react-native-view-shot to capture, never as live app chrome.

## States
Only ever renders with a real, positive kept total and a real day count (utils/shareCard.ts's computeShareCardStats returns null otherwise); app/share-card.tsx shows EmptyState instead when there is nothing honest to share.

## Decisions
- 2026-09-05: "days" is the elapsed calendar span since the earliest habit's trackingStart, inclusive, not a streak (which resets) and not totalSkips (a skip count, not a span). Chosen so the headline is never a fabricated statistic.
- 2026-09-05: entry point is a Profile row ("Share your kept total"), not a change to Today/KeptHero. Keeps this addition off the heavily-audited Today surface.

## Open
- No real-device capture verification yet (Jest mocks react-native-view-shot and expo-sharing). Needs a device/TestFlight pass once a native build carries this dependency.
- Card visual is v1: no app icon/mark image embedded, text only. A future pass could add the icon asset once cropped for a square card.

## Iterations
- 2026-09-05: initial build, mobile PR #132 (routine/core-p3 run 3). New deps `react-native-view-shot` + `expo-sharing`; new screen `app/share-card.tsx`; analytics `share_card_opened` / `share_card_shared`.
