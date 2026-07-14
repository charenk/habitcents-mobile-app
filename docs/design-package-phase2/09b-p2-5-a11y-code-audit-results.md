# P2-5 / BET-005 accessibility code audit: results

- **Date:** 2026-07-14
- **Bet:** BET-005 (VoiceOver accessibility audit + fixes), P4, foundation.
- **Scope of this pass:** the code-level half of the audit, executed against the requirements matrix in `09-p2-5-accessibility-matrix.md` ("spec 09"). Additive only: accessibility props (`accessibilityLabel` / `accessibilityRole` / `accessibilityState` / `accessibilityViewIsModal` / `accessibilityElementsHidden`), `hitSlop` for touch targets, and a contrast-token reclassification. No layout, copy, or logic changes. Spoken wording reuses the tested builders in `utils/a11y.ts`.
- **Deferred to the first TestFlight build (ADR 0008):** the on-device VoiceOver walk of the three critical flows and the Accessibility Inspector sweep. This pass makes those land on already-correct screens.

## Baseline rules (spec 09 §1) status

| Rule | Status |
|---|---|
| §1.1 every control labeled | Fixed. Icon-only controls (back, edit, trash, FAB, overflow, chevrons-as-buttons, month pagers, tier badges, time-range segments) now carry labels or are grouped into one labeled node; decorative glyphs are hidden from the tree. |
| §1.2 44pt minimum target | Fixed. `hitSlop` added to under-sized controls (40pt chips, ~22pt segments, 26px calendar dots, text-link buttons, small icon buttons). One known limit: SpendPulse at year granularity (53 columns) cannot reach 44pt without overlapping neighbors, same tradeoff spec 09 already accepts for the calendar dot; VoiceOver labels are present. |
| §1.3 every swipe has a button fallback | Pass. No swipe-only actions exist; delete/edit are visible buttons. |
| §1.4 color never the sole signal | Pass. Day-states, tier badges, and class badges already carry shape or text alongside color (verified, unchanged). |
| §1.5 contrast floor 4.5:1 | Fixed. Informational text on `textTertiary` (#9E9E9E, ~2.85:1) reclassified to `textSecondary` (the spec's caption token): onboarding step eyebrows, preset/vice price + edit captions, WidgetCard sparkline axis labels. Kept on `textTertiary` (exempt): disabled Save state (WCAG 1.4.3 inactive-control exception), decorative glyphs, placeholders. |
| §1.6 Dynamic Type | Verified. Money numbers and the two answer buttons carry no `numberOfLines={1}`; the only truncation guards are on bar labels / streak names, not protected text. Full XL sweep is part of the deferred device pass. |

## Per-component matrix

| Component | Labels | Targets | Focus | Notes |
|---|---|---|---|---|
| AmountInput | fixed | ✓ | n/a | button label announces symbol + value; hidden input labeled "Amount in dollars" |
| AddExpenseSection | fixed | fixed | ✓ | category chips selectableLabel + selected state; merchant/note labeled; suggestions labeled |
| TodayExpensesPanel | fixed | fixed | ✓ | expense row role button; filter chips selectableLabel + hitSlop |
| WidgetCard | fixed | fixed | ✓ | time-range segments speak full words; sparkline labels contrast-fixed |
| RecurrenceField | ✓ (toggle) | fixed | ✓ | frequency chips selected state + hitSlop |
| CategoryRow | fixed | ✓ | n/a | row grouped into one label (name + spent + trend); trash labeled; chevron/icon decorative |
| AddCategoryModal | fixed | ✓ | ✓ | icon/color options role button + selected state + label; Save disabled state |
| ToggleRow | fixed | ✓ | n/a | Switch labeled; secondary row labeled |
| categories (tab) | fixed | ✓ | ✓ | add-category FAB labeled |
| category/[id] | fixed | fixed | ✓ | back + edit buttons labeled, hitSlop to 44pt |
| expenses (tab) | fixed | fixed | ✓ | Recent/Upcoming tabs selected state + hitSlop |
| habits (tab) | fixed | ✓ | ✓ | decorative empty-state icon hidden; CTAs already compliant |
| settings (tab) | fixed | ✓ | ✓ | rows use settingsRowLabel(label, value); Version grouped as one node (no false button role) |
| EditExpenseModal | fixed | fixed | ✓ | chips selectableLabel; inputs labeled; decorative icons hidden; delete flow role buttons |
| habit/[id] | fixed | fixed | ✓ | back buttons labeled; CTAs role button; EditSkip sheet focus-trapped |
| CheckInCard | ✓ | fixed | ✓ | hitSlop on change-answer / partial-slip / backfill; order matches spec |
| HistoryCalendar | fixed | fixed | ✓ | cells reuse calendarCellLabel; 44pt hitSlop; pagers already labeled |
| PickOneSheet | ✓ | fixed | fixed | accessibilityViewIsModal focus trap; free-tier CTA hitSlop |
| PartialSlipSheet | ✓ | ✓ | fixed | accessibilityViewIsModal focus trap |
| LeakCard | ✓ | ✓ | ✓ | already compliant, no change |
| HabitCard | fixed | fixed | ✓ | rank + class + tier grouped via habitCardLabel; overflow/CTA/menu hitSlop |
| SpendPulse | fixed | fixed* | ✓ | reuse pulseCellLabel; toggle + cell hitSlop; *year-granularity density limit |
| ReviewQueueSheet | fixed | fixed | ✓ | item grouped label per spec phrasing; correction chips hitSlop |
| CategoryList | ✓ | fixed | ✓ | "View more" hitSlop |
| CategoryTransactionsSheet | ✓ | fixed | ✓ | chip + correction-chip hitSlop |
| ResultsFooter | ✓ | fixed | ✓ | "Undo this import" hitSlop |
| QuestionCard, ResultsScreen, ProjectionSection, GracefulFailure, IntakeScreen, PulseDayDetailSheet | ✓ | ✓ | ✓ | already compliant, no change |

## Verification
- `npx tsc --noEmit`: clean.
- `npm test`: 282/282 passing, 18 suites. Test count unchanged (no behavior change); every `utils/a11y.ts` builder relied on here is already covered by `__tests__/a11y.test.ts`.
- Device VoiceOver walk of the three critical flows (spec §3) + Accessibility Inspector on Expenses / Habits / habit detail / onboarding / Leak Scan results: deferred to the first TestFlight build (ADR 0008).
