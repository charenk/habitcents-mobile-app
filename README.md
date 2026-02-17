# HabitCent (FinanceHabitApp)

Expo React Native app for quick expense tracking and habits, built to run on iOS, Android, and web using **Expo Router**.

The current focus is an **Expenses-first** experience with a simple onboarding flow and a rich Upcoming calendar view.

---

## Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- iOS Simulator (Xcode) or Expo Go on a physical iPhone

---

## Install

```bash
npm install
```

---

## Run (development)

```bash
npx expo start
```

Then:

- Press `i` to open in the **iOS Simulator**
- Press `a` to open in an **Android emulator**
- Press `w` to open in the **web browser**

### Run on physical iPhone

1. Install **Expo Go** from the App Store.
2. Run `npx expo start`.
3. Scan the QR code with your iPhone camera (or open with Expo Go).

> If port `8081` is already in use, you can run `npx expo start --port 8082` instead.

---

## Project Structure (high level)

```text
app/
  _layout.tsx           # Root layout, wraps app with ThemeProvider + StatusBar
  index.tsx             # Entry – onboarding gate → tabs
  welcome.tsx           # Onboarding / welcome screen
  (tabs)/
    _layout.tsx         # Tab navigator config (Expenses, Habits, Settings)
    finance.tsx         # Expenses tab: Today & Upcoming views
    habits.tsx          # Habits tab
    settings.tsx        # Settings tab (incl. Appearance)

components/
  CalendarMonth.tsx         # Month calendar grid used in Upcoming view
  UpcomingView.tsx          # Expenses → Upcoming tab content
  UpcomingExpensesPanel.tsx # Draggable upcoming-expenses bottom panel
  UpcomingExpenseCard.tsx   # Row for a single upcoming item

constants/
  theme.ts              # lightTheme / darkTheme and AppTheme definition
  Colors.ts             # Re-export of lightTheme for legacy imports

contexts/
  ThemeContext.tsx      # ThemeProvider, useTheme, useThemeMode, useIsDark

data/
  upcomingMock.ts       # Mock data + helpers for upcoming expenses & calendar icons

utils/
  storage.ts            # AsyncStorage helpers (onboarding + theme mode)
```

See `docs/DESIGN.md` for more detailed design notes.

---

## Key Features

- **Onboarding flow**
  - Simple welcome screen (`app/welcome.tsx`) explaining the value proposition.
  - On first launch, user is sent to the welcome screen; after completing or skipping, they go to the **Expenses** tab.
  - Onboarding completion is persisted with `AsyncStorage` (see `utils/storage.ts`).

- **Expenses tab – Today view**
  - Top segment: **Today | Upcoming**.
  - Category chips (All, Mortgage, Car, Entertainment, Other).
  - Simple mock list of recent expenses (can be replaced with real data later).

- **Expenses tab – Upcoming view**
  - Accessed by tapping **Upcoming** on the Expenses tab.
  - Filters: **All**, **Income**, **Recurring expenses**, plus an add (`+`) button placeholder.
  - **CalendarMonth** component:
    - Full-month grid with square day cells and clear borders.
    - Today is highlighted with a green block + “Today” label.
    - Icons per day:
      - Home → rent/mortgage.
      - Down arrow → income.
      - Car → car finance.
    - Icons are filtered based on the selected filter (All / Income / Recurring).
  - **Slidable “All upcoming expenses” panel**:
    - Bottom sheet that can be dragged up to cover the calendar or down to reveal it.
    - Shows total upcoming amount and a list of upcoming items (Car finance, Apartment rent, Salary, etc.).
    - Uses `Animated` + `PanResponder` (no extra bottom-sheet dependency).

- **Settings**
  - **Appearance** row under *Preferences*:
    - Shows current mode (Light / Dark / System).
    - Tapping opens a picker to change theme.
  - **Developer** section with *Reset Onboarding* to force the welcome screen again.

- **Habits tab**
  - Currently a simple placeholder with “Today” card and “Coming soon” message.

---

## Theming & Dark Mode

The app uses a simple theme system with **light** and **dark** palettes and an optional **System** mode.

- Theme definitions live in [`constants/theme.ts`](constants/theme.ts):
  - `lightTheme` – original light design (white surfaces, light background).
  - `darkTheme` – dark backgrounds, light text, and tuned accent colors.
- Theme context in [`contexts/ThemeContext.tsx`](contexts/ThemeContext.tsx):
  - `ThemeProvider` wraps the app in `app/_layout.tsx`.
  - `useTheme()` returns the resolved `AppTheme`.
  - `useThemeMode()` exposes `{ themeMode, setThemeMode }` for Light/Dark/System.
  - `useIsDark()` is used by `StatusBar` to choose light/dark content.
- User preference is stored in `AsyncStorage` under `@habitcent_theme_mode`
  via `getThemeMode` / `setThemeMode` in `utils/storage.ts`.
- All major screens/components read colors from `useTheme()` and
  generate styles with a `createStyles(theme)` helper, so they respond
  immediately when the theme changes.

**Appearance setting**

- Located in `app/(tabs)/settings.tsx` as the **Appearance** row.
- Shows the current mode (Light, Dark, or System) on the right.
- On press, an alert presents:
  - **Light** – forces light theme.
  - **Dark** – forces dark theme.
  - **System** – follows the device’s light/dark setting (`useColorScheme()`).

---

## Design Decisions (high-level)

- **Expo Router and tabs**
  - Uses file-based routing with the `(tabs)` group to organise Expenses, Habits, and Settings.
  - Root layout hides native headers and uses custom headers inside screens when needed.

- **Onboarding as a simple gate**
  - On launch, `app/index.tsx` checks onboarding state and:
    - Redirects to `/welcome` if not completed.
    - Redirects to `/(tabs)/finance` otherwise.
  - This keeps all tab navigation logic in one place and allows onboarding to be reset from Settings.

- **Theming via context (not per-component flags)**
  - Rather than sprinkling `useColorScheme()` calls across the app, a single `ThemeProvider` supplies a palette object to all consumers.
  - Styles are built from `theme` so light/dark concerns are centralised and easy to adjust.

More detailed UX and interaction notes are captured in `docs/DESIGN.md`.

