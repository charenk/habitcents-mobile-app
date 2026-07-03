# HabitCents - Finance Habit Tracking App

> **DIRECTION LOCK (2026-07-02).** The canonical direction lives in the umbrella repo: `../docs/habitcents-goals-v2.md` (North Star), `../docs/habitcents-plan-v2.html` (roadmap P0-x..P6-x with keep/cut/fix verdicts), `../docs/agent-execution-guide.md` (working rules), `../docs/decisions/` (ADRs). Where this file conflicts with those, they win. Key locked facts: name **habitcents**, bundle ID **com.habitcents.app**, scheme **habitcents**, light mode only, repair not rebuild, no network calls in app source, no em dashes in any output.
>
> **PHASE 2 IN PROGRESS (2026-07-03).** P2-3 analytics instrumentation landed: an env-gated PostHog layer in `utils/analytics.ts` (anonymous device-id mode, PII stripped, amounts coarse-bucketed) wired into the context choke points (onboarding funnel, expense log/edit/delete, detection/skip/tracking/milestone) and app lifecycle in `app/_layout.tsx`. It is a complete no-op with zero network calls unless `EXPO_PUBLIC_POSTHOG_API_KEY` is set (see `.env.example`); this is the single sanctioned exception to the no-network rule. NEEDS CHAREN to finish P2-3: supply a PostHog key + run a device build to confirm events flow (only step not doable headless). Remaining Phase 2 (design-gated, escalated to Charen): P2-1 onboarding two-door + Leak Audit, P2-2 Coach Moments, P2-4/P2-4b design pass (prototype approval first), P2-5 a11y, P2-6 multi-currency.
>
> **PHASE 1 COMPLETE (2026-07-02).** Core-loop repair done and browser-verified (P0-1, P0-5, P1-1..P1-7). What now works for real: correct habit-detection math, a live dollars-kept counter, real streak history, merchant-based detection, real categories + merchant field on the add form, expense edit/delete, and a **real Upcoming view** (recurring weekly/monthly expenses → projected next occurrences; brought back as a genuine feature after the initial fake version was cut). Storage is hardened against corruption/data-loss; tests live in `__tests__/` (run `npm test`). STILL CUT / do not re-add as fakes: mic/voice FAB, reminder-time no-ops, budgets, Reports widget edit mode, progressive reveals, lessons library. Notifications/reminders and a calendar for Upcoming are deferred to v1.x (real implementations only). Dev-only demo seeding lives on the `dev/seed-data` branch (flag-gated), never on `main`.

## Project Overview

HabitCents is an Atomic Habits-inspired personal finance app that helps users track spending, discover spending patterns, and build better financial habits. Core loop: log a spend in under 10 seconds, detect the leak, break one habit, count the dollars kept.

**Tech Stack:**
- React Native with Expo SDK 54
- TypeScript
- Expo Router (file-based routing)
- AsyncStorage for persistence
- No external charting libraries (custom chart components)

## Project Structure

```
FinanceHabitApp/
├── app/                      # Expo Router screens
│   ├── (tabs)/              # Tab navigation screens
│   │   ├── finance.tsx      # Main expense tracking
│   │   ├── reports.tsx      # Dashboard with widgets
│   │   ├── categories.tsx   # Category management
│   │   ├── habits.tsx       # Habit tracking & learning
│   │   └── settings.tsx     # App settings
│   ├── onboarding/          # PLG onboarding flow
│   ├── habit/[id].tsx       # Habit detail screen
│   └── category/[id].tsx    # Category detail screen
├── components/              # Reusable UI components
├── contexts/                # React Context providers
│   ├── ThemeContext.tsx     # Theme (light/dark)
│   ├── CategoriesContext.tsx
│   ├── ExpensesContext.tsx
│   ├── HabitsContext.tsx
│   ├── ReportsContext.tsx
│   └── OnboardingContext.tsx
├── types/                   # TypeScript type definitions
│   ├── expense.ts
│   ├── category.ts
│   ├── habit.ts
│   ├── report.ts
│   └── onboarding.ts
├── utils/                   # Utility functions
│   ├── storage.ts           # AsyncStorage helpers
│   └── habitDetection.ts    # Spending pattern analysis
├── constants/               # Theme colors
└── data/                    # Mock data & helpers
```

## Key Features Implemented

### 1. Categories System
- Default + custom categories
- Icon and color customization
- Monthly budget support
- Category detail with spending trends

### 2. Habits System (Core Innovation)
- **Auto-detection**: Analyzes spending patterns to identify habits
- **Atomic Habits Framework**: Cue-Routine-Reward loop analysis
- **Streak Tracking**: Visual calendar with streak counters
- **Milestones**: Gamified progression (1, 3, 7, 14, 30, 66 days)
- **Micro-lessons**: 7 lessons on habit psychology
- **Savings Tracking**: Track money saved from changed habits

### 3. Reports System
- Configurable dashboard with 4 widget types:
  - Spending by Category (bar chart)
  - Spending Over Time (sparkline)
  - Habit Streaks
  - Monthly Projection
- Drag-to-reorder widgets
- Time range selection (7D, 30D, 3M, 1Y)

### 4. PLG Onboarding
- Goal: First expense added in <30 seconds
- Flow: Welcome → Value Props → First Expense → Success
- Progressive feature reveal based on engagement

## Coding Patterns

### Style Pattern
```typescript
import { useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

export function MyComponent() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  // ...
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({ /* ... */ });
}
```

### Context Usage
All contexts are composed in `app/_layout.tsx`:
```
ThemeProvider > CategoriesProvider > ExpensesProvider > HabitsProvider > ReportsProvider > OnboardingProvider
```

### Storage Keys
All AsyncStorage keys prefixed with `@habitcents_` (renamed from `@habitcent_` in P0-1, commit 7abfd34; all keys live in `utils/storage.ts`):
- `@habitcents_expenses`
- `@habitcents_categories`
- `@habitcents_habits`
- `@habitcents_habit_goals`
- `@habitcents_dashboard`
- `@habitcents_onboarding_state`
- `@habitcents_progressive_features`

## Running the App

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Type check
npx tsc --noEmit
```

## Current Status (Feb 2026)

### Completed
- [x] All type definitions
- [x] All context providers
- [x] Habit detection algorithm
- [x] Categories screen with CRUD
- [x] Habits screen with insights, tracking, learning
- [x] Reports screen with widgets
- [x] Onboarding flow
- [x] Habit detail screen
- [x] Category detail screen
- [x] Custom chart components (PieChart, LineChart, ProgressRing)

### Next Steps
- [ ] Add expense deletion/editing UI
- [ ] Implement goal creation modal
- [ ] Add celebration animations for milestones
- [ ] Voice input for FAB button
- [ ] Export data functionality
- [ ] Push notifications for reminders
- [ ] Performance optimization
- [ ] Unit tests

## Design Philosophy

- **Mobile-First**: Primary actions in thumb zone (bottom 40%)
- **Atomic Habits Integration**:
  - Make It Obvious: Prominent habit cards
  - Make It Attractive: Celebration animations
  - Make It Easy: One-tap streak logging
  - Make It Satisfying: Immediate feedback, savings counters
- **Progressive Disclosure**: Features unlock as user engages

## Important Notes

- Amounts stored in cents (integers) internally
- Dates reconstructed from ISO strings when loading from storage
- Theme supports both light and dark modes
- No external chart dependencies - all charts are custom Views
