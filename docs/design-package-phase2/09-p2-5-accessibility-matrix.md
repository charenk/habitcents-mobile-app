# P2-5 accessibility baseline

- **Date:** 2026-07-04
- **Status:** requirements matrix, written against the final designs in this package (executed last so the audit lands on final screens, per scope §5.6)
- **Sources:** `habitcents-design-scope-phase2.md` section 5.6, and every spec in this package (01 to 05)
- **Goal:** VoiceOver completes log, track, and skip; no critical Accessibility Inspector issues on core screens.

---

## 1. Baseline rules (apply everywhere)

1. **Every control has a label.** No icon-only control ships without an `accessibilityLabel`. This includes the FAB, chevrons, the eye/trash icons, month pagers, overflow menus, and tier badges.
2. **44pt minimum target.** Every tappable element is ≥ 44×44pt, including chips, band segments, calendar cells (tap target, not just the dot), and text links that act as buttons.
3. **Every swipe action has a button fallback.** No action is swipe-only. Leak cards already use visible buttons (`01` §4.10); any list swipe (delete, edit) also exposes a button or long-press menu.
4. **Color is never the sole signal.** Day-states, tier badges, and class badges all carry shape or text in addition to color (`01` §2, `03` §2).
5. **Contrast floor 4.5:1** for all informational text. Tertiary `#9E9E9E` is restricted to non-essential glyphs; informational captions use `#757575` (`05` §6).
6. **Dynamic Type:** core screens reflow to at least the XL accessibility size; the money numbers and the two answer buttons never truncate (they scale; surrounding chrome wraps).

## 2. Per-component matrix

| Component | Labels / roles | Targets | Dynamic Type | Focus order |
|---|---|---|---|---|
| **Kept hero** (01 §4.1) | "Kept so far, {amount}, money you didn't spend" as one label; count-up announced only on settle, not per frame | n/a | number scales, never truncates | first on Habits tab |
| **Check-in card** (01 §4.2) | buttons "Skipped it, keeps {amount}" and "I bought it"; week strip each dot "{day}, {skipped/slipped/no log/today}"; summary line read as text | both answer buttons ≥ 44pt | question + buttons scale; buttons stack vertically past XL | card header → week strip → question → primary → secondary |
| **Confirmation + Coach slot** (01 §4.4, 04) | confirmation line read first; coach card read as text after; milestone headline "{n} skips, {chapter}" | Change-answer link ≥ 44pt | text wraps | confirmation → coach → Change answer |
| **Pick-one sheet** (01 §4.3) | title, evidence sentence, "One skip keeps" field labeled with current value; Start / Cancel | field + buttons ≥ 44pt | reflows; sheet grows | title → evidence → field → Start → Cancel |
| **Long arc** (01 §4.6) | ring "{total} of 66 skips, {chapter}"; identity line as text; chapter track as one summary "chapter {name}" | n/a (display) | scales | after stats row |
| **History calendar** (01 §4.9) | each cell "{month} {day}, {state}"; month pager "previous/next month" | cell tap target ≥ 44pt even at 26px dot | grid holds; labels scale | pager → cells row-major |
| **Log form** (02 §3.6, 05) | keypad keys labeled digits + "delete"; category chips "{name}, {selected}"; merchant field labeled; Save | keys and chips ≥ 44pt | amount scales; keypad fixed | amount → categories → merchant → keypad → Save |
| **Onboarding chips + bands** (02 §3.3-3.4) | chip "{name}, about {preset} a month, {selected}"; edited "{name}, {exact}, your price"; band as adjustable "how often, {value}"; inline editor traps focus, ✕ "Keep the preset price" | chips + segments ≥ 44pt | reflows; grid wraps | eyebrow → title → chips → running total → Continue → skip |
| **Reveal** (02 §3.5) | number announced as one utterance "about {yearly} a year leaking, about {monthly} a month"; breakdown rows as text | CTAs ≥ 44pt | number scales | number → breakdown → primary → secondary |
| **Tier badges** (03 §2) | "{tier name}" spoken; tappable ones open a one-line explainer | 44pt when tappable | label scales | inline with parent |
| **SpendPulse** (03 §5) | cell "{date}, {amount spent / no spend / outside your files}"; legend read as text | cell tap ≥ 44pt | legend wraps | toggle → grid → caption |
| **Habit cards** (03 §6) | "rank {n}, {class}, {tier}"; stats as text; CTA "Track this leak / Monitor"; overflow "more options" | CTA + overflow ≥ 44pt | card reflows | rank/badges → title → stats → pace → CTA → overflow |
| **Projection** (03 §7) | groups labeled; 3-payment flag "3 payments in {month}"; Save; per-item "remind me the day before, {on/off}" | toggles ≥ 44pt | rows wrap | groups → Save |
| **Graceful failure** (03 §9) | heading + body read; three actions as buttons | ≥ 44pt | text wraps | heading → body → action 1 → 2 → 3 |
| **Review queue** (03 §10) | item "{merchant}, we guessed {category}, {tier}"; chip row to correct; progress "{done} of {n}"; exit | chips ≥ 44pt | wraps | progress → item → chips → next/exit |
| **Settings** (05 §3) | each row labeled with value ("Currency, US dollar"); no dead rows to announce | rows ≥ 44pt | rows grow | Currency → privacy → version |
| **Privacy overlay** (05 §7) | announces nothing sensitive; the cover is decorative (wordmark only) | n/a | n/a | not in focus flow |

## 3. The three critical VoiceOver flows (must complete end to end)

1. **Log an expense:** open Expenses → focus amount → enter digits → pick category → Save → hear "expense saved". Every step reachable and labeled; no trap.
2. **Track a leak:** on a leak/habit card → activate "Break it" / "Track this leak" → pick-one sheet → edit or accept "One skip keeps" → "Start breaking it" → land on the breaking-now card. Sheet focus starts at the title and returns to the new card on dismiss.
3. **Skip / slip:** on the check-in card → activate "Skipped it, keeps {amount}" (or "I bought it") → hear the confirmation → hear the coach line. The count-up is announced once on settle, not per animation frame.

## 4. Reduced motion

- Direction C's motion (log-save morph, skip ring, hero pulse + count-up, card enter) all collapse to instant swaps under `prefers-reduced-motion`. The prototypes in this package already gate on it; the build inherits the rule.
- No information is conveyed by motion alone: the Kept number's new value, the filled week dot, and the confirmation text all persist statically.

## 5. Rollup and acceptance

- **Acceptance (from scope §5.6):** VoiceOver completes the three flows in section 3; Accessibility Inspector reports no critical issues on Expenses, Habits, habit detail, onboarding, and the Leak Scan results screen.
- **Contrast sweep:** every informational text token verified ≥ 4.5:1 on its background; the tertiary-usage restriction from `05` §6 applied.
- **Target sweep:** every control audited to ≥ 44pt, including small-looking ones (calendar dots, tier badges, band segments) whose tap target must exceed their visual size.
- **Build note:** this matrix is executed once, after the P2-4 apply pass, so it lands on final screens (scope working order step 6).

## 6. Decided vs open

**Decided here:** the baseline rules; the per-component label/target/Dynamic-Type/focus matrix; the three must-pass VoiceOver flows; the reduced-motion collapse; the contrast and target sweeps. **Open:** none blocking; this spec is written against the final designs and is ready for the build session to execute mechanically.
