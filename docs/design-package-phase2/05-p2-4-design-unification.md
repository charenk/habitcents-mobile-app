# P2-4 design unification pass (against Direction C)

- **Date:** 2026-07-04
- **Status:** decision spec, written against the locked visual direction (C: refined-native tokens + motion layer at the log-save and skip moments)
- **Sources:** `habitcents-design-scope-phase2.md` section 5.4, `phase-2-next-steps.md` items 6 to 7, `constants/theme.ts`, `constants/strings.ts`, `06-p2-4b-direction/comparison.md`
- **Purpose:** the screen-by-screen checklist a build session executes mechanically. Every item is a decision with before/after and reasoning.

---

## 1. Principles

1. **One product, one dialect.** Every surface uses the same tokens, card shape, and motion budget. No screen keeps a bespoke treatment.
2. **Green means positive, only.** #4CAF50 is reserved for the win (skip, Kept, brand). It never appears on a neutral control, a chevron, or a non-positive state.
3. **A slip is honest, not an error.** Danger red is never used for a slip. Red has one job (section 4).
4. **Remove before you restyle.** Dead rows and stale screens are deleted, not re-skinned. Less surface to keep consistent.
5. **States are designed, never blank.** Every list and result screen has an empty, first-run, and out-of-coverage form.

## 2. Dark-mode toggle (decision: remove for v1)

**Decision:** remove the Appearance row and force light mode for v1. Keep the dark theme code intact in `constants/theme.ts`.

- **Before:** Settings → Preferences → Appearance row opens a Light / Dark / System sheet; `ThemeMode` drives `useTheme()`.
- **After:** the Appearance row is gone. `useTheme()` returns `lightTheme` unconditionally. `ThemeMode`, `darkTheme`, and the theme plumbing stay in the codebase, unreferenced by UI.
- **Reasoning:** D-6 ships light only; a visible toggle that flips into an unsupported, unpolished dark surface is a broken promise. Current user count is effectively zero, so the migration cost (any Dark user is forced to light on update) is paid now, when it is free.

**v1.x revert path (document, do not build):**
1. Re-add one Settings row "Appearance" in the Preferences section, wired to the existing `ThemeMode` sheet.
2. Restore `useTheme()` to read the stored mode and select `darkTheme`.
3. Audit dark tokens against the P2-4 color-semantics rules (section 4): the dark `danger` is `#EF5350`, dark `primary` `#66BB6A`; verify green-only and slip-neutral hold in dark before shipping.
4. No data migration: the mode preference key is preserved across v1 even though the UI to change it is absent.

## 3. Settings final layout

Sections and rows, top to bottom. Everything not listed is removed.

| Section | Row | State | Notes |
|---|---|---|---|
| Preferences | Currency | **Keep** | Opens the existing currency picker; the one real preference in v1. |
| About | Privacy policy | **Keep** | External link. Replaces the dead in-app "Privacy" row's intent honestly. |
| About | Version | **Keep** | `1.0.0`, static, no chevron. |

**Removed rows and why:**
- **Account → Profile:** no accounts in v1 (privacy-first, on-device). Dead row.
- **Account → Notifications:** notification delivery is v1.x (leak-scan-spec §10, brief §2). No settings for a feature that does not deliver.
- **Preferences → Appearance:** section 2.
- **Privacy (row):** replaced by the About → Privacy policy link. The in-app "Privacy" row pointed nowhere.
- **Developer section (entire), incl. Reset Onboarding:** debug surface, never ships. Reset Onboarding moves to a dev-only build flag, not a user row.
- The **Account** section header disappears (no rows left under it).

**Copy:** all rows sentence case. Section headers keep the existing `strings.settings` keys where the row survives (`currency`, `about`, `version`); remove `profile`, `notifications`, `appearance`, `privacy`, `developer`, `resetOnboarding`, and the appearance/reset alert strings from `strings.ts`.

**Result:** two visible sections (Preferences, About), three rows. A calm, honest Settings that matches the product's on-device story.

## 4. Color semantics audit

The rule set the build session applies everywhere.

| Token | Value (light) | May be used for | Never used for |
|---|---|---|---|
| primary green | `#4CAF50` | the skip button, the Kept number and hero, the brand mark, filled skip day-states, positive confirmations, chapter fills | chevrons, neutral controls, category accents, generic "active" states, links that are not the win |
| primaryMuted | `#B2DFB6` | milestone slot tint (30%), subtle positive fills | text, borders on neutral cards |
| danger | `#DC2626` | destructive confirmation only: delete expense, stop breaking a habit, undo-that-erases. Always paired with a text label, never color alone | a slip, a slipped day, a "you bought it" button, any coaching, low-confidence tiers |
| slip neutral | `#757575` text / `#ECEFF1` fill | the slipped day-state, "I bought it" secondary button (bordered neutral), recorded-loss copy | anything implying error or alarm |
| text / secondary / tertiary | `#212121` / `#757575` / `#9E9E9E` | type hierarchy | see §6 for the tertiary-on-background contrast fix |
| amber | `#FFB74D` on `#FFF3E0` | non-urgent flags only: the 3-payment-month projection callout, "looks cut off" truncation banner | success, errors, or as a third brand accent |

**The slip is the load-bearing rule:** a slipped day, the "I bought it" button, and every slip confirmation use the neutral pair, never `danger`. Red appearing on a slip would reframe an honest answer as a failure, which the whole logging model exists to prevent (`01-habit-logging-spec.md` principle 4).

## 5. Empty and system states

Each written in Direction C tokens; motion only where noted (C concentrates motion on the money moments, so these are still).

### 5.1 Zero expenses (Expenses tab, fresh install that skipped onboarding)
- Quiet centered card, no illustration. Title "No expenses yet". Body "Log your first in about 10 seconds. Amount first, then tap a category." CTA "Add an expense" focuses the amount field.
- A secondary plain link "Take the 90-second leak audit" re-enters onboarding Door 1 (`02` section 7, skip-for-now re-entry).

### 5.2 Pre-detection progress (Habits tab, logging started, no leak yet)
- Kept hero shows formatted zero, caption "your first skip starts this counter".
- Progress card, not an empty void: "Spotting your leak" with a segmented meter "**{n} of 4 logs** at the same place". Body "Around 4 logs at one merchant is enough to see a pattern. Keep logging." No fake habit cards.
- When `n` reaches 4 and detection runs, the card is replaced by the first leak card (`01` section 4.10).

### 5.3 Pre-coverage projection placeholder (Reports / Leak Scan projection)
- Where the next-month projection would render before one full calendar month exists: a single muted card "One full month of data unlocks your projection." No zeros, no empty bars, no fabricated numbers (honesty rule; ties to `leak-scan-spec.md` §5.5).

### 5.4 Loading and error
- Detection/scan loading: the existing "Analyzing your spending patterns" copy stays, on a plain card, no spinner theatrics.
- Any hard failure routes to the graceful-failure pattern owned by `03` (never a raw error dump).

## 6. Tertiary-text contrast fix

- **Problem:** `#9E9E9E` tertiary on `#F8F8F8` background measures ~2.0:1, below the 4.5:1 WCAG AA floor for normal text (flagged in scope §5.6).
- **Decision:** for any tertiary text that must be read (captions, metadata, legend labels), use `#757575` (secondary), which clears AA on both `#F8F8F8` and `#FFFFFF`. Reserve `#9E9E9E` strictly for non-essential, non-informational glyphs (inactive tab-bar icons, decorative separators) where it is not the sole carrier of meaning.
- **Build note:** this is a token-usage rule, not a token change. `textTertiary` stays defined; its *usage* is restricted. The a11y matrix (P2-5) lists the exact surfaces to sweep.

## 7. Privacy overlay (app-switcher cover)

- **Trigger:** app moves to background/inactive (iOS snapshot for the app switcher). Cover shown before the snapshot is taken, removed on foreground.
- **Treatment:** a full-screen opaque cover in `background` `#F8F8F8` with the centered HabitCents wordmark and the `¢` mark, nothing else. No amounts, no Kept number, no habit names, no last screen visible. Not a blur (blur can leak large numerals); a solid cover.
- **Motion:** none. Instant show/hide; the cover must exist before the snapshot, so animation is a risk, not a feature.
- **Reasoning:** the product's core promise is privacy; a Kept total or a habit name surfacing in the multitask switcher is the most visible possible breach. Solid cover over blur because the Kept hero is a large high-contrast number that survives blur.

## 8. Hardcoded-hex sweep checklist

The build session greps for literal hex values outside `constants/theme.ts` and replaces each with the token. Known offenders and the target token:

| Where to look | Literal | Replace with |
|---|---|---|
| Any `color: '#...'` / `backgroundColor: '#...'` in `app/` and `components/` | any | the matching `theme.*` token via `useTheme()` |
| Calendar cell / streak surfaces | inline greens/grays | `primary`, `slip` neutral pair, `border` |
| FAB gradient | `fabGradientStart/End` | keep as tokens (already named); verify no inline copy |
| Tab bar icons | inline `#9E9E9E` | `tabIconDefault` token |
| Onboarding screens | any inline brand green | `primary` |
| Slip / danger surfaces | any inline red | `danger` token, and only where §4 permits |

**Acceptance for the sweep:** `grep -rE "#[0-9A-Fa-f]{6}"` over `app/` and `components/` returns only matches inside `constants/theme.ts` (and any documented exception). Every color a user sees resolves through a token, so the v1.x dark revert is a token swap, not a hunt.

## 9. Screen-by-screen apply checklist

The mechanical list, in build order.

1. **Theme plumbing:** `useTheme()` returns light unconditionally; delete Appearance UI (§2).
2. **Settings:** rebuild to the §3 layout; remove dead rows, Developer section, and orphaned strings.
3. **Habits tab + detail:** apply `01` v2 (week strip, long arc, hero pulse) in C tokens; verify green-only and slip-neutral (§4); wire the skip/log motion layer.
4. **Expenses tab:** zero-expense empty state (§5.1); log-save motion (C); merchant field and keypad on tokens.
5. **Reports:** pre-coverage placeholder (§5.3); projection amber flag per §4.
6. **Onboarding:** brand green on tokens; success screen matches `02` section 3.7.
7. **App root:** mount the privacy overlay (§7).
8. **Global:** run the hex sweep (§8); apply the tertiary-contrast rule (§6).
9. **Leak Scan results:** styled per `03` once written (this pass sets the tokens it inherits).

## 10. Decided vs open

**Decided here:** remove the dark toggle with a documented revert path; the three-row Settings; the full color-semantics rule set with the slip-never-red load-bearing rule; the four system/empty states; the tertiary-contrast usage rule; the solid privacy cover; the hex-sweep acceptance test; the screen-by-screen apply order.

**Open, routed to `07-decisions-needed.md`:**
- Dark-toggle removal is item 2 (recommend remove; this spec assumes it).
- Nothing else blocking. Category-taxonomy (07 item 1) affects the category chips' set but not these rules.
