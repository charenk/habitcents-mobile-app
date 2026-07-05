# P2-1b Leak Scan: results-screen visual design

- **Date:** 2026-07-04
- **Status:** visual spec (behavior is owned by `leak-scan-spec.md`; this designs only the components in its section 5)
- **Direction:** C (refined-native tokens + motion at money moments). Motion here is minimal: the scan is data, not a win.
- **Companion board:** `prototypes/Leak Scan Visuals Options.html` (tier-badge options, SpendPulse options, recommendation, Final row)
- **Do not** re-specify behavior. Any behavior gap goes to `07-decisions-needed.md` section 6, not into this file.

---

## 1. Principles

1. **Coverage honesty is visible, not footnoted.** Every insight carries its evidence window inline. Out-of-coverage is a distinct hatched treatment, never confused with zero.
2. **Tiers, never percentages.** Confidence renders as one of three named badges (solid / likely / needs review). A raw number never appears (spec §4).
3. **Half-right money is worse than none.** Below the confidence floor the screen shows the graceful-failure state, not dimmed numbers.
4. **Correctable everywhere.** Any category chip, merchant, or pairing is tap-to-correct; corrections read as calm, not as the app being wrong at you.
5. **A 60-second task, never homework.** The review queue is capped at 10, ranked by dollar impact, and framed as almost-done.
6. **One number system.** Every amount renders through `useCurrency().format`; the tilde is mandatory on any annualized or projected figure.

## 2. Tier badge system (defined once, reused everywhere)

Three tiers, one visual grammar: a small pill with a dot glyph + label. Never a percentage, never a color-only signal (label always present for a11y and color-blind users).

| Tier | Label | Dot | Pill fill / ink | Meaning (from spec §4) |
|---|---|---|---|---|
| solid | "Solid" | filled disc | `#EDF7EE` fill / `#2E7D32` ink | personal-rule hit or known-chain exact match |
| likely | "Likely" | half disc | `#FFF3E0` fill / `#B26A00` ink | keyword/pattern token match |
| needs review | "Needs review" | hollow ring | `#F1F3F5` fill / `#616161` ink | no match |

- Green here is a *confidence* solid, not the brand-win green; it uses the darker `#2E7D32` on a muted fill so it never competes with the Kept green or reads as a positive-action button. Amber `likely` reuses the sanctioned amber pair (§05 color rules). `needs review` is strictly neutral, never red: an unknown is not an error.
- Placement: KPI cards carry the badge of their weakest input (spec §5.1); category rows, habit cards, and projection lines each carry their own. Size: 22px tall pill, 11px label, 44pt tap target when it is tappable (opens a one-line "what this means" sheet).

## 3. KPI row (spec §5.1)

Three stat cards in a row, each: big number (`useCurrency().format`), label, subtitle = evidence window, tier badge top-right.

- **Total spent** — subtitle "Jul 1 to Jun 30 · 3 accounts". Net of internal transfers and reversals (spec computes; visual just shows the net with a small "net of transfers" caption on tap).
- **Per day** — subtitle "over {covered} covered days".
- **Transactions** — subtitle "{x.x} purchases/day".
- Cards use the standard C card (white, 0.5px border, soft shadow). Numbers are `tabular-nums`, 26px, `#212121`. No motion.

## 4. Categories, top 3 + View more (spec §5.2)

- Section title "Where it went" + evidence-window caption.
- Three rows, each: category name, amount, % of total, tier badge, and a horizontal bar (track `#F1F3F5`, fill `#9E9E9E` neutral, never green: spend is not a win). Bar width = % of total.
- "View more" text button expands the full list (fires `scan_categories_expanded`). Row tap opens the category's transaction list; every category chip there is tap-to-correct (spec §8).
- Bars are neutral gray on purpose: green would read as "good to spend here". Green is reserved for Kept.

## 5. SpendPulse grid (spec §5.3)

The load-bearing coverage-honesty component. Reusable `<SpendPulse granularity>`.

- **Granularity auto-select:** ≤ 45 days daily squares; ≤ 14 months monthly squares; year view = 7×53 micro-grid only when coverage ≥ 10 months. User toggle Day / Month / Year overrides.
- **Cell states, three visually distinct fills:**
  - **spend:** single red ramp, sqrt-scaled to session max. Red here is a heat ramp (`#FDE7E7` → `#DC2626`), the one sanctioned non-alarm use of the danger hue, because intensity mapping needs a saturated ramp and spend is genuinely the thing being scrutinized. Labeled in legend as "more spent", not "bad".
  - **zero-spend:** neutral flat fill `#F1F3F5`. A covered day with no spend.
  - **out-of-coverage:** diagonal hatch (1px lines, `#D8DCE0` on transparent), never a flat fill. This is the rule: a hatched cell is "we have no data here", a flat neutral cell is "we have data, you spent nothing". They must never look alike.
- Cell tap opens a detail sheet (date, total, merchant list); fires `scan_pulse_day_opened`.
- Caption below the grid: "You transacted on {n} of {covered} days." Legend row: three swatches labeled "more spent" (ramp), "no spend" (neutral), "outside your files" (hatch).
- **Distinct-from-habit-calendar note:** shares grid grammar with the habit streak calendar but the semantics differ (spend intensity vs skip/slip/no-log) and so do the fills (heat ramp vs the three day-states). Never let a user read a red pulse cell as a slip.

## 6. Habit cards (spec §5.4, max 10)

Card anatomy, top to bottom:
1. Header: rank number, **class badge** (Govern / Influence / Fixed), tier badge.
2. Title (plain-language habit name).
3. Stats row: "{orders} orders · {days}/{coveredDays} days · {monthTotal} in {month}".
4. One-sentence description naming top merchants.
5. **Yearly pace pill:** "≈ {annualized}/yr pace" (tilde mandatory), amber pair, right-aligned.
6. Class-dependent CTA (section 6.1).
7. Overflow menu (⋯): "Not a habit" (suppression rule + `scan_habit_dismissed`) and "Wrong details" (correction sheet).

### 6.1 Class badges and CTAs

| Class | Badge | Ink / fill | CTA |
|---|---|---|---|
| Govern | "Govern" | `#2E7D32` / `#EDF7EE` | **Track this leak** (filled green button; opens the Decision-1 pick-one sheet from `01` §4.3, prefilled: evidence, editable per-skip value from the user's own average, cadence routing) |
| Influence | "Influence" | `#616161` / `#F1F3F5` | **Monitor** (bordered neutral button; creates a monitor-only habit, no skip loop) |
| Fixed | "Fixed" | `#B26A00` / `#FFF3E0` | no tracking CTA; a tip card only: "July is a 3-payment month for this loan. Plan for the extra {amount}." |

- Only the Govern CTA is green (it leads to the win). Monitor is neutral. Fixed has no button. This keeps green = positive-action honest across the results screen.
- The Track CTA is the single bridge from Door 2 into the habit loop; it must open the identical pick-one sheet Door 1 uses.

## 7. Next-month projection (spec §5.5)

- Renders only when coverage ≥ 1 full calendar month; otherwise the pre-coverage placeholder from `05` §5.3.
- Three labeled groups:
  - **Locked in** (recurring): each row merchant + next expected date + amount; biweekly items show payment count; a **3-payment month** row carries the amber ⚠ flag pill "3 payments in {month}".
  - **Run rate** (variable): per governable/influence category, median of covered months; tier `likely` badge when it falls back to a single month.
  - **Buffer:** one line "+12% · irregulars & annual renewals".
- Primary CTA **Save to HabitCents** (writes recurring items, `source: 'import'`; fires `scan_projection_saved`). Per-item secondary toggle **Remind me the day before** (v1 intent capture only; persists `remindBefore`; fires `scan_reminder_intent_set`; no notification scheduled in v1).

## 8. Footer (spec §5.6)

- Per-file rows: "{read} of {total} rows read · {skipped} skipped · {dupes} merged · {transfers} netted".
- **Undo this import** — plain destructive-labeled text button (danger ink, with the word "Undo", never color alone); transactional via `importId`; fires `scan_undone`. A confirm step ("This removes everything this import added.") because it erases.

## 9. Graceful failure, "This one's on us" (spec §7)

- Full-screen, calm, no red alarm. Centered wordmark mark, then the exact spec copy: "**This one's on us.** We couldn't read this file confidently enough to trust the numbers, and half-right money math is worse than none. Your data is fine; our reader just isn't fluent in this format yet."
- Three stacked next-best actions in spec order: **Try a different export** (with the hint text), **Start with the 90-second Leak Audit** (Door 1, primed with anything the scan confidently found: those items land as pre-selected chips at exact values per `02` §7), **Log your first expense by hand**.
- Tone: it's-us framing, `#212121` on `#F8F8F8`, no error iconography, no red. This is the one screen where a warm, apologetic voice matters most.

## 10. Merchant review queue (spec §7 task, spec §2.7)

- Header framed as almost-done: "Quick check: {n} merchants we weren't sure about" + progress ("{done} of {n}").
- Each item: raw merchant stem, our guessed category (tier badge), and a one-tap category chip row to correct. Correcting writes a persistent rule (spec §8) and advances; fires `scan_correction {stage, fromTier}` (structural only).
- Capped at 10 by dollar impact; everything below defaults to Other, correctable later from any transaction row. A persistent "Done" / "Skip the rest" exit; never a wall the user cannot leave.

## 11. The two permitted questions (spec §3, §4)

Rendered as one-tap chip pairs inline, never modal walls:
- DD/MM ambiguity: "Is 03/04 March 4th or April 3rd?" → two chips [March 4] [April 3]. Asked once per session; answer stored as a rule.
- Sign confirmation: "Purchases in this file look like negative numbers, right?" → [Yes] [No]. Only shown when confidence < 0.8.
- Chip pairs sit on a plain card with the question in `#212121`; 44pt targets; `scan_question_shown {type}` fires.

## 12. Post-scan handoff (spec §5 post-scan)

- Continue CTA **Bring in your last 15 days** (seeds the log with recent categorized rows; fires `scan_seed15_applied`). Then route to habit pick (max 2 recommended) → the Decision-1 pick-one sheet → done.
- The Door-2 exit and the Door-1 exit land on the same Habits tab (Kept primed), so the two onboarding doors converge on one screen.

## 13. Acceptance criteria

1. The three tiers are visually distinct by shape + label, not color alone, and never show a percentage.
2. In SpendPulse, spend / zero-spend / out-of-coverage are three distinct fills; out-of-coverage is hatched and never reads as zero.
3. The spend heat ramp is never mistaken for the habit calendar's day-states (different fills, labeled legend).
4. Every amount renders via the currency formatter; every annualized/projected number shows a tilde.
5. Only the Govern habit CTA is green; Monitor is neutral; Fixed has no CTA.
6. The Track CTA opens the identical Decision-1 pick-one sheet used by Door 1.
7. The graceful-failure screen shows no red, no error icon, and the three ordered actions.
8. The review queue is capped at 10, exitable at any point, and each correction fires `scan_correction` with structural properties only.
9. Undo is confirm-gated and labeled with the word "Undo".
10. Every event named in `leak-scan-spec.md` §8 fires from its component here.

## 14. Decided vs open

**Decided here:** the tier-badge system (shape + label + muted fills, reused across KPI/category/habit/projection); the SpendPulse three-fill treatment with the hatched out-of-coverage rule and the sanctioned heat ramp; habit-card class badges and green-only-for-Govern CTA rule; projection group styling with the amber 3-payment flag; the calm no-red graceful-failure and review-queue framing; the two permitted questions as chip pairs.

**Open, routed to `07-decisions-needed.md`:**
- Category set on the review-queue chips depends on the taxonomy answer (07 item 1).
- Section 6 (behavior gaps): none found against `leak-scan-spec.md` while designing these visuals.
