# P2-4b visual direction: comparison and recommendation

- **Date:** 2026-07-04
- **Prototypes (this folder, single-file, tappable):** `Direction A Refined Native.html`, `Direction B Dimensional Accent.html`, `Direction C Motion Layer.html`
- **Board:** `Direction Comparison Board.html` (all three live side by side with stickies)
- Each applies its direction to the same four screens: expenses log form, Habits tab (Kept hero + v2 check-in card), habit detail (v2 long arc + 3-state calendar), onboarding success.

## The candidates

**A · Refined native.** System type, hairline geometric iconography at SF-Symbol weight, white cards on #F8F8F8 with 0.5px borders and soft shadows, current green kept. What it says about the brand: calm, honest, invisible craft. Cost: low (a token and shadow sweep, no assets). Risk: forgettable; the skip moment renders as quietly as a settings row.

**B · Dimensional accent.** Rounded type, gradient icon tiles with inner highlight and soft drop, borderless cards on deeper shadows, tinted Kept hero panel. What it says: friendly, warm, distinctive. Cost: high (a real custom icon asset system per category and habit, maintained forever). Risk: gradient tiles sit close to the tropes the ADA calibration warns against; with anything less than excellent icon art it reads casual-game next to money numbers.

**C · Native + motion layer (recommended).** Direction A's visuals untouched, plus a motion and haptics language concentrated on the two money moments only: the log save (key press springs, save button morphs to a check, success haptic) and the skip (button spring, expanding ring, week dot pop, Kept hero count-up with green pulse and 1.06 scale, success haptic). Reduced motion collapses everything to instant swaps. Cost: medium (reanimated + haptics at two moments, motion QA per release). Risk: motion quality is unforgiving, and stills look identical to A.

## Recommendation: C

1. C contains A, so the safe choice is included in the pick.
2. The product thesis is that a skip is a felt win worth real money. C spends its entire distinctiveness budget on that one beat, which is both the strongest behavioral reinforcement (the reward is immediate and dollar-shaped) and the honest reading of Apple-Design-Award restraint: quiet surfaces, purposeful motion.
3. B's memorability is real but is bought with the highest cost and the highest trope risk. If more visual heat is wanted later, B's tile treatment can be adopted for category icons only, as an accent inside C, once real icon art exists (P0-4). Do not adopt B's gradients on buttons or heroes.

## After the pick

The picked direction's tokens flow into `05-p2-4-design-unification.md`, `03-p2-1b-leak-scan-visuals.md`, and `04-p2-2-coach-moments.md`. All three are written token-based and survive any pick. A "Final" column gets appended to the comparison board once Charen decides (07-decisions-needed item 3).
