# HabitCents

Mobile app for personal expense tracking and habit building. Designed and engineered end to end  -  product, UI, and React Native implementation.

**Stack:** Expo · React Native · Expo Router · TypeScript  
**Platforms:** iOS, Android, web

## Why it exists

Most money apps are either too heavy or too vague. HabitCents starts with a simple question: what did you spend, and can you see the pattern early enough to change it?

The product focus today is **expenses-first**: quick logging, an upcoming calendar, light insights (“leaks,” where it went, pace), and habits that sit next to the money  -  not in a separate silo.

## Design decisions

- **Expenses before dashboards.** Capture is cheap; insight comes after you have real data.
- **Upcoming as a calendar, not a list dump.** Timing matters as much as totals.
- **Accessibility as a first-class track.** See `ada-audit/` for the ongoing audit and fixes.
- **Themeable light/dark.** Tokens live in `constants/theme.ts`; `ThemeProvider` wraps the app.

## What’s in the repo

| Area | Notes |
|------|--------|
| `app/` | Expo Router screens (Today, Money, Insights, Categories, onboarding) |
| `components/` | Calendar, upcoming panel, expense cards |
| `design/` / `design_reference/` | Design references used while building |
| `ada-audit/` | Accessibility audit artifacts |
| `__tests__/` | Jest tests (including leak-scan eval) |
| `.github/` | CI |

## Run locally

```bash
npm install
npx expo start
```

- `i`  -  iOS Simulator  
- `a`  -  Android emulator  
- `w`  -  web  
- Or scan the QR code with Expo Go on a phone  

Node 18+. If port 8081 is busy: `npx expo start --port 8082`.

```bash
npm test
npm run typecheck
```

## Status

Active MVP. Screenshots and a public TestFlight / Expo link will land here as the release path firms up.

Built by [Charen Koneti](https://charen.online).
