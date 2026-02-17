# HabitCent – Design & Architecture Notes

This document captures the main contextual and design decisions made while building the HabitCent app.

---

## 1. Product context

- **App name:** HabitCent  
- **Target user:** People who want a quick understanding of where their money goes, and who want to log spending continuously (voice or text).
- **MVP goal:** Give users a **clear picture of where their money is going**, prioritising:
  - Fast capture of expenses.
  - Simple, legible views of upcoming and recent spending.

---

## 2. Navigation & onboarding

### 2.1 Navigation model

- Uses **Expo Router** with:
  - A root `Stack` (`app/_layout.tsx`) that:
    - Wraps the app in `ThemeProvider`.
    - Hides native headers in favour of custom ones.
  - A `(tabs)` group for:
    - `finance` → **Expenses** (primary landing screen).
    - `habits`  → Habits (currently a placeholder).
    - `settings` → Settings (including Appearance).

### 2.2 Onboarding flow

Files:
- `app/index.tsx`
- `app/welcome.tsx`
- `utils/storage.ts` (onboarding flag)

Decisions:

- On app start, `index.tsx` checks a persisted flag `@habitcent_onboarded`:
  - If **not set**, the user is redirected to `/welcome`.
  - If **set**, the user is redirected directly to `/(tabs)/finance` (Expenses tab).
- On the welcome screen:
  - “Get Started” and “Skip for now” both:
    - Mark onboarding as completed (`setHasOnboarded()`).
    - Navigate to `/(tabs)/finance`.
- Settings includes a **Developer → Reset Onboarding** option so you can re‑visit the welcome flow without reinstalling the app.

Rationale:

- Keeps onboarding **simple and optional**, while still giving a first‑run explanation.
- The onboarding gate is implemented in a single place (`index.tsx`), avoiding scattered checks across tabs.

---

## 3. Expenses tab – Today vs Upcoming

File: `app/(tabs)/finance.tsx`

The Expenses tab is the main landing experience. It has two modes:

1. **Today** (current “Recent” view – implemented first).
2. **Upcoming** (calendar + upcoming recurring/forecasted items).

The component uses `activeDay: 'today' | 'upcoming'` state:

- When `activeDay === 'today'`:
  - Shows a header with date pill and **Today / Upcoming** segment.
  - Shows category chips (All, Mortgage, Car, Entertainment, Other).
  - Renders a mock list of “recent” transactions via `SectionList`.

- When `activeDay === 'upcoming'`:
  - Renders `<UpcomingView onRecentPress={() => setActiveDay('today')} />`.
  - The Upcoming view has its own **Recent / Upcoming** segment where “Upcoming” is active.

Rationale:

- Keeps **Today** and **Upcoming** as two distinct layouts under one tab, but with a shared mental model (same header area, same tab).
- Allows iterative build‑out: Today view can stay simple while Upcoming becomes more complex (calendar + bottom sheet).

---

## 4. Upcoming view – calendar and upcoming panel

Files:
- `components/UpcomingView.tsx`
- `components/CalendarMonth.tsx`
- `components/UpcomingExpensesPanel.tsx`
- `components/UpcomingExpenseCard.tsx`
- `data/upcomingMock.ts`

### 4.1 Data model (mock)

`data/upcomingMock.ts` defines:

- `UpcomingItem` – a single upcoming line item:
  - `id`, `title`, `amount`, `amountValue`
  - `frequency` (e.g. “Every two weeks”, “Monthly”)
  - `dueInDays`
  - `type: 'expense' | 'income'`
  - `icon` and visual metadata (`iconBg`, `iconColor`)
- `CalendarEvent` – a small marker placed on a specific date:
  - `date`, `month`, `year`
  - `type: 'rent' | 'income' | 'car'`
- Helpers:
  - `getFilteredUpcomingItems(filter)` – filters by **All / Income / Recurring expenses**.
  - `getFilteredCalendarEvents(filter)` – returns only the relevant calendar icons for the chosen filter.
  - `getTotalUpcomingExpenses(items)` and `getTotalForDisplay(items, filter)` – compute the displayed total.

This is currently **mock data**, but it mirrors likely future real data structures for recurring bills and income.

### 4.2 Filters

In `UpcomingView`:

- **Type filters**: `All`, `Income`, `Recurring expenses`.
- Behaviour:
  - **All**:
    - Calendar icons: rent + car + income.
    - List: all upcoming items.
    - Total: sum of upcoming expenses (positive amount, e.g. 1,990).
  - **Income**:
    - Calendar icons: only income arrows.
    - List: only income items.
    - Total: sum of income values (e.g. 3,200).
  - **Recurring expenses**:
    - Calendar icons: rent and car icons only.
    - List: recurring expense items.
    - Total: sum of recurring expenses.

Rationale:

- Keeps the **top filter row conceptually about “type of upcoming flow”** rather than arbitrary tags.
- Future data can simply map into these categories; UI already matches that mental model.

### 4.3 Calendar design

Implemented in `CalendarMonth.tsx`:

- Uses a **fixed grid**:
  - Computes the number of leading / trailing days needed to fill a full set of weeks.
  - Cell size is derived from screen width so 7 columns fit evenly.
- Each day renders as a **square block**:
  - Light theme:
    - `calendarBg` for the calendar container.
    - `calendarCellBg` for current‑month days.
    - `calendarOtherMonthBg` for leading/trailing days.
  - Borders:
    - All cells have a subtle border to visually segment the month.
    - Other‑month days use a **dotted border** and muted text colour.
  - Today:
    - Full cell background = `primaryMuted`.
    - Border = `primary`.
    - Number in bold, plus “Today” label below.
- **Icons per day**:
  - Home = rent/mortgage (e.g. day 2).
  - Down arrow = income (e.g. 10, 24).
  - Car = car finance (e.g. 11, 25).
- Filtering:
  - The parent passes **already filtered** events to the calendar; the calendar just renders what it’s given.

Rationale:

- Matches the Figma design: clear calendar blocks, obvious “today”, and icons used as subtle markers for commitments on particular days.
- Keeping filtering in the parent `UpcomingView` makes `CalendarMonth` a reusable dumb component.

### 4.4 Slidable “All upcoming expenses” panel

Implemented in `UpcomingExpensesPanel.tsx`:

- Behaviour:
  - Default position: about 45% of the screen height (calendar fully visible above).
  - Dragging up expands the panel to ~95% height, covering the calendar.
  - Dragging down collapses it back to the partial position.
- Implementation details:
  - Uses `Animated.Value` for the panel height.
  - `PanResponder` interprets vertical drags and snaps between partial and full positions.
  - The content is a `FlatList` of `UpcomingExpenseCard`s with a sticky header showing:
    - “All upcoming expenses”
    - Total (driven by `getTotalForDisplay`).

Rationale:

- Bottom‑sheet interaction felt central to the UX, but we avoided adding an extra dependency like `@gorhom/bottom-sheet` to keep the project lighter and avoid React Native Reanimated setup complexity.

---

## 5. Theming & dark mode

Files:
- `constants/theme.ts`
- `contexts/ThemeContext.tsx`
- `utils/storage.ts`
- various screens/components using `useTheme()`

### 5.1 Theme model

- `lightTheme` and `darkTheme` share the same keys:
  - Backgrounds: `background`, `surface`, `calendarBg`, `calendarCellBg`, `calendarOtherMonthBg`.
  - Text colours: `text`, `textSecondary`, `textTertiary`.
  - Accent: `primary`, `primaryMuted`, `primaryDark`.
  - UI elements: `chip*`, `border`, `tabIconDefault`, `danger`, calendar colours.
- `AppTheme` is the shape of a theme object.

### 5.2 Theme state and modes

- `ThemeMode` = `'light' | 'dark' | 'system'`.
- `ThemeProvider`:
  - Reads persisted mode on mount (via `getThemeMode()`).
  - Uses `useColorScheme()` when mode is `'system'`.
  - Resolves a boolean `isDark` and sets `theme` to `darkTheme` or `lightTheme` accordingly.
- Hooks:
  - `useTheme()` → `AppTheme`.
  - `useThemeMode()` → `{ themeMode, setThemeMode }`.
  - `useIsDark()` → `boolean`, used for StatusBar style.

### 5.3 Persistence + StatusBar

- Theme mode is stored under `@habitcent_theme_mode` using `getThemeMode` / `setThemeMode` in `utils/storage.ts`.
- `app/_layout.tsx` wraps the app in `ThemeProvider` and uses `useIsDark()` to configure `<StatusBar style={isDark ? 'light' : 'dark'} />`.

### 5.4 Screen migration strategy

- Instead of static `StyleSheet.create` with `Colors`, each screen/component now:
  - calls `const theme = useTheme();`
  - creates styles with a `createStyles(theme)` helper and `useMemo(() => createStyles(theme), [theme])`.
  - uses `theme` directly for dynamic colours (e.g. `theme.iconBgYellow`, `theme.primary`).
- Old `Colors` object is kept as a re‑export of `lightTheme` for backward compatibility but should not be used for new code.

Rationale:

- Centralises visual decisions and makes it easy to evolve the visual language for both light and dark without touching every component.

---

## 6. Future considerations

- Replace mock upcoming data (`data/upcomingMock.ts`) with real API/DB integration while preserving the same shape where possible.
- Implement:
  - Actual **expense capture** (voice and text).
  - Category management on the **Categories** tab (planned).
  - Richer **Report** tab (planned).
- Consider extracting a more formal design system (typography scale, spacing tokens) if the app grows in complexity.

