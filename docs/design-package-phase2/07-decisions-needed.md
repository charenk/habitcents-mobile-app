# Decisions needed from Charen

Everything in this file is a Charen-level call. Each item has a recommendation and the tradeoff. Answer every line; the rest of the package assumes the recommendations unless you overrule.

## 1. Category taxonomy (blocks Leak Scan Stage 7 mapping)

**Proposed final list, 10 user-facing spend categories:**

1. Mortgage/Rent (rename of Mortgage; same icon and color, same id, display-name change only)
2. Car
3. Food
4. Shopping
5. Utilities
6. Healthcare
7. Transportation
8. Entertainment
9. Software & Subscriptions (new; icon `card-outline`, color #26A69A teal)
10. Other

**Non-spend classes, not user categories:** Transfers, Income, Cash untracked. These live as a `class` field on rows (`spend | transfer | income | cash`), never in the category picker, never in spend totals. The Leak Scan writes them; manual logs are always `spend`.

**Migration mapping:** existing expenses keep their category ids; Mortgage renders as Mortgage/Rent; no data migration needed beyond adding Software & Subscriptions to `DEFAULT_CATEGORIES`. Leak Scan keyword sets map: streaming, SaaS, app-store recurring → Software & Subscriptions; rent keywords → Mortgage/Rent.

**Recommendation:** adopt as proposed.
**Tradeoff:** 10 chips is one more than today on the log form; ordering by usage keeps the form fast. The alternative (folding subscriptions into Entertainment/Utilities) breaks the Leak Scan's most valuable detection class.

**Answer:** **Adopted as proposed** (Charen, 2026-07-04). Recorded as ADR 0006.

## 2. Dark-mode toggle (P2-4)

**Recommendation:** remove the Appearance row for v1. The dark theme code stays in `constants/theme.ts` behind `ThemeMode` so v1.x restores it by re-adding one Settings row (revert path documented in `05-p2-4-design-unification.md`).
**Tradeoff:** users who set Dark today would be forced to light on update; current user count is effectively zero, so the cost is now, not later.

**Answer:** **Remove for v1** (Charen, 2026-07-04). Dark theme code stays behind `ThemeMode` with the documented revert path. Recorded as ADR 0005.

## 3. Visual direction pick (P2-4b)

The three prototypes and comparison board are ready in `06-p2-4b-direction/` (`Direction Comparison Board.html`, columns left to right: A refined native, B dimensional accent, C native + motion).
**Recommendation:** C. It contains A, and it spends its distinctiveness entirely on the skip and log-save moments, which is where the product promise lives. B's tile treatment can be adopted later as a category-icon accent inside C once real icon art exists. Downstream specs (05, 03, 04) are token-based and survive any pick.
**Tradeoff:** C costs motion engineering polish (reanimated + haptics) and looks identical to A in stills; B costs a custom icon asset system and risks the gradient-tile trope.

**Answer:** **C locked** (Charen, 2026-07-04). Downstream specs (05, 03, 04) are written against C: Direction A tokens + the motion layer at the log-save and skip moments.

## 4. Free-tier touchpoint on the pick-one sheet

When a free user taps Break it on a second leak, the sheet shows a quiet "1 habit on the free plan" note with the trial CTA placeholder (paywall itself is Phase 3).
**Recommendation:** quiet note + disabled Start, enabled after removing the first habit or upgrading.
**Tradeoff:** a hard block risks frustration; a soft "swap which habit you're breaking" flow is friendlier but adds a swap surface to v1 scope.

**Answer:** **Quiet note + disabled Start** (Charen, 2026-07-04). Start enables after removing the first habit or upgrading; paywall stays Phase 3. Recorded as ADR 0007.

## 5. Onboarding preset prices and the vice set (P2-1)

The Leak Audit ships a preset table (money/taste call): subscriptions Video streaming ~$12, Music ~$11, Cloud storage ~$3, Gaming ~$10, News ~$8, Fitness ~$15, Dating ~$20, plus "Something else"; vices Coffee or tea out ~$6 each, Food delivery ~$18 each, Impulse buys ~$15 each, bands Never / 1-2 / 3-5 / Daily. Presets are defined per supported currency in config, never converted at runtime.
**Recommendation:** adopt as proposed (full spec in `02-p2-1-onboarding-leak-audit.md` sections 3.3 to 3.4).
**Tradeoff:** any fixed preset is wrong for someone; the inline tap-to-edit covers precision without taxing the fast path. More chips would raise coverage but push past the 90-second gate.

**Answer:** **Adopted as proposed** (Charen, 2026-07-04). Recorded as ADR 0007.

## 6. Behavior gaps found while designing (flag, not change)

None so far against `leak-scan-spec.md`. This section will collect any found while designing 03.
