# Vendored skills: emilkowalski/skills

UI craft and animation skills by Emil Kowalski, checked in so every session and
scheduled routine in this repo loads them cold. State lives in git, never in a
chat session.

- Upstream: https://github.com/emilkowalski/skills
- Commit vendored: `78761e1` (2026-08-10)
- Vendored: 2026-08-17
- License: MIT, `LICENSE.emilkowalski` in this folder. Copyright (c) 2026 Emil Kowalski.

## What is here

| Skill | Auto-fires? | Use it for |
|---|---|---|
| `emil-design-eng` | yes | The main skill. UI polish, component design, animation judgment. |
| `animate` | yes | Building one animation from scratch, decisions in the order that matters. |
| `apple-design` | yes | Gesture-driven UI, springs, sheets, momentum, interruptible transitions. |
| `find-animation-opportunities` | yes | Sweeping a surface for motion that would earn its place, and rejecting the rest. |
| `improve-animations` | yes | Auditing all motion in the app, producing prioritized plans other agents execute. |
| `animation-vocabulary` | yes | Naming an effect you can only describe loosely. |
| `review-animations` | invoke by name | Strict review of motion code. Approval is earned. |
| `prototype` | invoke by name | Several genuinely different versions behind a picker. |
| `pick-ui-library` | invoke by name | Curated library picks. Web packages, see the caveat below. |
| `ask-sonner` | invoke by name | Sonner, a React DOM toast library. Reference only, cannot run here. |

## Reading these in a React Native codebase

Every example upstream is web: CSS, `motion/react`, Framer Motion, DOM APIs,
Tailwind. There is not one React Native reference in the whole set. The
judgment transfers, the code does not. Translate, never paste.

**Transfers as-is.** The should-it-animate frequency table, easing decision
order (never `ease-in` on UI, `ease-out` for enter and exit), the sub-300ms
duration budget, never scaling from zero, subtle press feedback, springs for
anything a user can grab or reverse, momentum-over-threshold dismissal,
boundary damping, 30 to 80ms stagger, asymmetric timing, motion cohesion with
the component's personality, and the debugging habits (slow it 2 to 5x, test
gestures on a real device, look again the next day).

**Needs translation.** Durations and cubic beziers become `withTiming(v, {
duration, easing: Easing.bezier(...) })`; spring params become `withSpring`.
Reanimated runs on the UI thread, so the upstream warnings about main-thread
frame drops and hardware acceleration do not map. Build shared motion in
`utils/motion.ts` rather than inline.

**Does not apply.** `@starting-style`, WAAPI, `clip-path`, CSS variable
inheritance, `transform-origin` strings, `:hover` and pointer-media gating
(this is a touch app), Tailwind class advice, and every named web library in
`pick-ui-library`.

## Where HabitCents rules win

These skills are advisory. Ours are binding, and on conflict ours win:

- **Reduced motion.** Use `useReducedMotion()` from `utils/motion.ts`, never a
  web hook. Haptics keep firing when motion is reduced; they are not visual.
- **Motion budget.** ADR 0004 to 0007 concentrate motion on the two money
  moments, the log save and the skip. "Could animate" is not "should animate,"
  and `find-animation-opportunities` is built to agree.
- **Palette.** ADR 0027 locks the primary to `#2C7851` with white on it. Take
  no colour suggestion from these skills without re-checking contrast.
- **Save convention.** ADR 0028 disables a primary action until input is valid.
- **Content rules.** Sentence case, no em dashes, locked vocabulary leak, skip,
  kept, slip. The vendored files themselves are full of em dashes because they
  are upstream text left unedited; that rule governs what we write and ship,
  not third-party reference material.
- **PR flow.** ADR 0012 still applies to anything these skills produce.

## Local deltas

Only one, so updates stay cheap:

- `ask-sonner/SKILL.md`: added `disable-model-invocation: true` plus a comment
  saying why. The app has its own toasts, and without the gate a question about
  ours would pull in a React DOM guide.

## Updating

```bash
git clone --depth 1 https://github.com/emilkowalski/skills /tmp/emil-skills
cp -R /tmp/emil-skills/skills/. .claude/skills/
```

Then re-apply the local delta above, bump the commit and date in this file, and
open a Lane 1 PR. Upstream ships new skills periodically; the newsletter at
animations.dev/skills announces them.
