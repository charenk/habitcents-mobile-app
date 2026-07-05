# Starter prompt for the Phase 2 build/planning session (Claude Code)

**How to use:** copy the package folder into the repo first (step 0), then paste everything below the line into a fresh Claude Code session opened at the repo root.

**Step 0 (you, before the session):** copy this whole `design-package-phase2/` folder into the repo at `docs/design-package-phase2/` (and mirror to the umbrella `HabitCents/docs/` per the mirroring rule in `docs/design-context/README.md`). Commit it on a branch like `docs/p2-design-package` so the session can read it.

---

You are the Phase 2 planning-and-execution session for HabitCents (repo root = this Expo/React Native app). The Phase 2 DESIGN session is complete: every open design question is answered in `docs/design-package-phase2/`. Your job is to convert that package into ADRs and working code. Do not redesign anything; where a spec and your instinct disagree, the spec wins. Flag genuine spec conflicts back to Charen instead of resolving them silently.

## Read first, in this order
1. `docs/design-context/habitcents-design-scope-phase2.md` (the mission doc; its section 3 lists locked decisions)
2. `docs/design-package-phase2/08-handoff-package.md` (the consolidated build input: order, sizes, risks, reading list)
3. `docs/design-package-phase2/07-decisions-needed.md` (Charen's answers; Direction C is locked; if any line is still blank, ask Charen before touching the item it blocks)
4. Per work item, the spec files listed in 08 section 4
5. `docs/design-context/leak-scan-spec.md` (behavior for the scan pipeline; the package's 03 covers only visuals)
6. `mobile-app/CLAUDE.md`, `constants/theme.ts`, `constants/strings.ts`, `types/habit.ts`, `utils/analytics.ts`

## Working mode (locked)
- Spec-first is done; you are the build. For each item: write the ADR (0004+) recording the spec's decisions, then build on a task branch, then PR. Merges to `main` require Charen's explicit per-PR authorization.
- Update the roadmap status banner as items land.
- Never commit real bank statements; Leak Scan tests use synthetic fixtures only.
- Dev seeding stays on `dev/seed-data`, never main.

## Build order (from 08 section 2; 1 and 2 can run in parallel)
1. Habit-logging surfaces (spec 01): pick-one sheet, check-in card with week strip, long arc + chapters (10/30/50/66 total skips), 3-state calendar. Size L.
2. Leak Scan pipeline stages 0-9 as pure utils + the 14 acceptance tests (leak-scan-spec.md). Branch `task/p2-1b-leak-scan-pipeline`. Size XL.
3. Leak Scan results screen + rule store (specs 03 + leak-scan-spec 5-8). Needs 1 and 2. Size L.
4. P2-1 onboarding (spec 02): routing fix (index → /onboarding/welcome, delete stale welcome.tsx), two-door fork, Door 1 Leak Audit with the inline price editor, seeding, funnel events. Size L.
5. Coach Moments (spec 04): card in the confirmation slot, trigger matrix, copy set; remove MICRO_LESSONS and the Learning section. Needs 1. Size M.
6. P2-4 unification apply pass (spec 05): Direction C tokens + motion layer (log save + skip only), dark-toggle removal, Settings cleanup, empty states, privacy overlay, hardcoded-hex sweep. Runs after the surfaces exist. Size L.
7. P2-5 accessibility (spec 09): execute the matrix, verify the three VoiceOver flows. Last. Size M.

## Hard rules that apply to every line of code and copy
- Vocabulary: leak / skip / kept / slip, used identically everywhere. The skip is the win; a slip never subtracts from Kept.
- No em dashes anywhere. Sentence case for all UI copy. Every amount renders through `useCurrency().format`; never hardcode "$" or two decimals (JPY is zero-decimal).
- Green #4CAF50 = brand/positive only. A slip is neutral, never red. Danger red = destructive confirmation only.
- Analytics are anonymous and structural only (D-9): no amounts, merchant strings, habit names, or file contents in any event.
- Light mode only in v1; dark theme code stays but is unreferenced by UI (revert path in spec 05 section 2).
- Motion: concentrated on the log-save and skip moments per Direction C; everything honors prefers-reduced-motion.
- Anti-goals (reject on sight): "I did the habit" framing, hidden slip paths, streak freezes, budgets/bank linking/accounts/notification delivery, gradient blobs/glassmorphism/confetti.

## Definition of done (Phase 2 exit criteria)
1. Fresh install reaches its leak number in under 90 seconds, every funnel step instrumented.
2. One visual language (Direction C), no placeholder content anywhere.
3. Privacy overlay hides amounts in the app switcher.
4. VoiceOver completes log, track, and skip; no critical Accessibility Inspector issues on core screens.
5. All 14 Leak Scan acceptance tests pass on synthetic fixtures.

Start by reading the files in the order above, then produce: (a) ADR drafts for the package's decisions, (b) the branch plan for build items 1 and 2, and (c) any questions that genuinely block item 1. Then wait for Charen's go before writing code.
