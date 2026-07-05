# 0008. On-device accessibility verification moves from the Phase 2 exit gate to Phase 4 beta

- **Date:** 2026-07-05
- **Status:** Accepted
- **Area:** Product / Process
- **Deciders:** Charen

## Context
Phase 2's exit criteria (design scope section, mirrored in `08-handoff-package.md` section 5) required VoiceOver to complete the log, track, and skip flows with no critical Accessibility Inspector issues. All seven Phase 2 build items are merged, including Build 7 (P2-5), which shipped the accessibility code: the label matrix, tested label builders (`utils/a11y.ts`), the settle-only kept-hero announcement, the contrast sweep, and 44pt targets. The only remaining step was the human on-device pass, which requires Charen, a physical device, and unhurried time.

## Decision
Phase 2 is complete without the on-device verification. The VoiceOver walk and Accessibility Inspector audit move to Phase 4 (TestFlight beta), where Charen is on real devices systematically anyway. The step-by-step script is saved at `docs/accessibility-test-with-voiceover.md` and becomes a Phase 4 checklist item. It must still pass before App Store submission.

## Alternatives considered
- Keep it as a Phase 2 blocker: gates Phase 3 (monetization, legal, website) on a manual task with no code dependency; nothing in Phase 3 touches the accessibility surfaces.
- Drop the verification entirely: rejected; the audit still runs, just later, and unlabeled controls or focus traps found at beta are cheap to fix then.

## Consequences
- Easier: Phase 3 starts now; the verification happens once on final beta builds instead of possibly twice.
- Risk accepted: an accessibility defect shipped in Phase 2 code is discovered at beta rather than now; mitigated by Build 7 having implemented the matrix spec-by-spec with unit-tested labels.
- The P0-4 splash eyeball (one boot) rides along at the same beta session or any earlier device run.
