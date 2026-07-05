# 0007. Onboarding final: Door 1 Leak Audit pattern, preset table, free-tier touchpoint

- **Date:** 2026-07-04
- **Status:** Accepted
- **Area:** Product / UX
- **Deciders:** Charen (presets and free-tier note adopted as proposed, 2026-07-04; spec at `docs/design-package-phase2/02-p2-1-onboarding-leak-audit.md`)

## Context
P2-1 is the v1 ship gate: a fresh install must see its leak number in under 90 seconds. D-10 (ADR 0002) fixed the two-door shape; the design session resolved the input pattern, the preset economics, and how the free tier surfaces on the pick-one sheet.

## Decision
1. **Door 1 Leak Audit final = A chips + B inline edit, recognition framing:** preset chips the user recognizes and taps, with tap-to-edit inline price precision. Projection framed honestly ("about", tilde). Routing fix ships with it: index routes to /onboarding/welcome and the stale welcome.tsx is deleted.
2. **Preset table adopted as proposed:** subscriptions Video streaming ~$12, Music ~$11, Cloud storage ~$3, Gaming ~$10, News ~$8, Fitness ~$15, Dating ~$20, plus "Something else"; vices Coffee or tea out ~$6, Food delivery ~$18, Impulse buys ~$15, frequency bands Never / 1-2 / 3-5 / Daily. Presets are defined per supported currency in config and never converted at runtime.
3. **Free-tier touchpoint:** when a free user taps Break it on a second leak, the pick-one sheet shows a quiet "1 habit on the free plan" note with the trial CTA placeholder and a disabled Start, enabled after removing the first habit or upgrading. The paywall itself stays Phase 3.
4. Audit items seed recurring expenses; every funnel step emits the D-9-compliant analytics events named in spec 02.

## Alternatives considered
- Steppers or sliders for estimation: slower than chip recognition on the 90-second gate.
- More preset chips: raises coverage but pushes past the gate; inline edit plus "Something else" covers the tail.
- Hard block or swap flow at the free-tier gate: a hard block frustrates; a swap flow is friendlier but adds a whole surface to v1 scope.

## Consequences
- Easier: Door 1 is independent of the Leak Scan pipeline, so it can build in parallel with the habit surfaces.
- Harder / cost: the per-currency preset table is a config artifact to maintain per supported currency (7 today).
- Revisit at beta: preset amounts against observed edits; free-tier note wording against Phase 3 paywall copy.
