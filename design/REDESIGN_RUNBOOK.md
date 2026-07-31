# HabitCents redesign runbook

**ALL 5 STEPS MERGED to main as of 2026-07-31.** The only thing still owed is the on-device upgrade test of the recurrence migration, before the next TestFlight build. Living tracker for the 5-step visual redesign. Any session (or scheduled routine) can resume cold by reading this file plus the numbered spec for the current step, then checking `git log` on main for the last merged step. The full spec package lives in `design/redesign-handoff/` (README + `01`..`05` + the `.dc.html` prototypes; open `App Prototype.dc.html`, right phone / badge 3a, for behavior).

## What this is

Ground-up visual redesign: one sage green + calm neutrals, Instrument Serif + Inter, lucide icons, restructured tabs (Today / Money / Insights / Categories), intent-first onboarding, confirmation toasts, an add-upcoming-expense flow. Product logic is unchanged.

## Product truths (never violate)

- Skip is the win. A slip is neutral: never red, never subtracts from Kept.
- Kept is the only cross-habit aggregate number, and it only counts up.
- ~66 skips rewires a habit. Chapters: Deciding 0-10, Rhythm 10-30, Cruising 30-50, Rewired 50-66. The arc never decreases.
- Everything on-device. No bank login, no account. "Sign out" resets the local session only.
- Detection needs ~4 logs at one merchant. Free tier = 1 habit.
- Leak-scan confidence tiers (Solid / Likely / Needs review) always shape + label, never color alone.

## Decisions (ratified with Charen, 2026-07-26)

- **Per-step PRs to main**, each Lane 2 (needs-user-test). Steps ship independently; main will briefly show the new palette under old layouts between steps 1 and 2, which is accepted.
- **Each step is gated on Charen's review.** A step ends as a waiting PR with simulator captures; Charen approves and merges, then says "go" (or the dispatcher routine picks up the next step once the previous PR is merged). No autonomous multi-step loop.
- **Model routing:** Opus build workers, Opus reviewer, Haiku for purely mechanical parts. Fable only when Charen explicitly asks (weekly Fable quota is tight).
- **Categories stays in the tab bar** (Charen, 2026-07-30, overrides spec 02). The handoff moved category management behind the settings sheet; Charen wants the current Categories nav kept and restyled to the redesign language instead. Tab set becomes **Today / Money / Insights / Categories** (4 tabs). Spec 02's "Categories row under Preferences -> app/categories.tsx stack route" is dropped; the settings sheet itself still ships as specced otherwise. Step 02 builds the tab (lucide `layout-grid`, new tab bar styling); step 04 restyles the Categories screen content (serif "Categories." title, EmojiTile rows, card styling) alongside the other screens.

## Step tracker

| Step | Branch | Status |
|---|---|---|
| 01 tokens + foundations | `redesign/01-tokens` | merged (PR #42) |
| 02 navigation (4 tabs incl. Categories, settings sheet) | `redesign/02-navigation` | MERGED (PR #43) |
| 03 intent-first onboarding (3a variant) | `redesign/03-onboarding` | MERGED (PR #44) |
| 04 screens (Today/Money/Insights/Categories/detail/sheets/paywall + recurrence model) | `redesign/04-screens` | MERGED (PR #45); reviewer blockers fixed; on-device upgrade test still outstanding |
| 05 copy (strings.ts replacement + dead-code cleanup) | `redesign/05-copy` | MERGED (PR #47) |

## Per-step definition of done

1. `npx tsc --noEmit` clean and `npm test` fully green (all existing tests plus any new ones).
2. App boots via a dev build on the iOS simulator; the step's screens render correctly with no unintended layout drift; fonts load behind the splash with no flash.
3. Opus reviewer subagent signs off against the step's numbered spec (every exact hex/px/radius/size/copy value) and the repo rules in `mobile-app/CLAUDE.md`.
4. PR to main using the repo template, labeled needs-user-test (Lane 2), with simulator captures and a what-to-test checklist. Update this tracker. Stop and show Charen.

## Repo rules that bite (from mobile-app/CLAUDE.md)

No em dashes anywhere (UI, code, comments). Sentence case. Keep the leak / skip / kept / slip vocabulary. Amounts always via `useCurrency().format`. Green is positive-only. Honor prefers-reduced-motion. Synthetic Leak Scan fixtures only. Never commit to main; branch per ADR 0012.

## How to run a step (worker + review pattern)

1. Create the worktree + branch: `git -C <mobile-app> worktree add .claude/worktrees/redesign-0N-<slug> -b redesign/0N-<slug>`, then `npm install`.
2. Read the numbered spec. Decompose into disjoint work packages (by file set) so Opus workers run in parallel without conflict; a serial package lands first if others depend on its interface.
3. Workers write files but do NOT commit (the orchestrator commits at integration to avoid races on the same worktree).
4. Integration: barrel/exports, resolve conflicts, `npx tsc --noEmit`, `npm test`, dev build + simulator pass.
5. Opus reviewer subagent diffs the branch against the spec and repo rules.
6. Open the Lane 2 PR, update this tracker, stop for Charen.

## Foundations reference (shipped in step 01)

- Tokens: `constants/theme.ts` (legacy names remapped to new values; new tokens ink/slate/mist/cloud/snow/hairlineSubtle/primaryLight/lavender/amber/coral/scrim/toastBg/toastAction; `categoryColors`; `fonts`). Standalone exports: `radii`, `shadows`, `motion`, `typeScale`. Helper `utils/color.ts` `withAlpha`.
- Fonts: loaded in `app/_layout.tsx` (Instrument Serif + Inter 400/500/600/700), used via `theme.fonts.*`.
- Icons: `components/ui/Icon.tsx` wrapper over lucide-react-native (stroke 1.5), plus `CATEGORY_ICON_MAP` for stored category icons. `@expo/vector-icons` stays installed until step 05 cleanup.
- Primitives: `components/ui/` EmojiTile, AmountDisplay, Keypad (+ `utils/keypad.ts`), Button, Toast (ToastProvider/useToast), Sheet. Barrel `components/ui/index.ts`.
