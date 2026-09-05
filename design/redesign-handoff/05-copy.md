# 05 · Copy

Update `constants/strings.ts`. Voice: knowledgeable honest friend. Sentence case everywhere (no Title Case, no ALL CAPS outside eyebrows). Lead with the number. Plain verbs. No em dashes. No "journey", no hype words. Descriptive dismisses.

## Replacement table (shipped → new)
| Where | Old | New |
|---|---|---|
| Welcome headline | "Find the spending habit quietly costing you $100 a month" | "Your money has a story. Let's read it." |
| Welcome CTA | "Find my leak" | "Get started" |
| Fork title | "How do you want to start?" | (screen replaced) "What brings you here?" + "Pick one. You can do all three later." |
| Tab labels | Expenses / Reports / Categories / Habits | Today / Money / Insights |
| Habits title | "Your Habits" | "Today." (screen title) |
| Kept sub | "your first skip starts this counter" | unchanged |
| Save confirm | button morph "Saved" | toast "Logged." (new expense) / "Saved." (edits) |
| Delete confirm | native alert | toast "Deleted." + Undo |
| Edit modal title | "Edit Expense" | "Edit expense" (sheet eyebrow) |
| Upcoming empty | "Nothing upcoming…" | True zero: "Know what's coming before it lands" + add affordance (one hook, ADR 0037). Window-empty only: "None of your repeating expenses land in this window." (ADR 0039 review) |
| Stop habit alert | native alert | sheet "Stop breaking this habit?" / "Your history is kept. You can start breaking it again any time." / "Stop breaking it" / "Keep going" |
| Paywall dismiss | close ✕ only | + "Stay on free plan" |

## New strings (exact)
- Value props: "Log expenses in 10 seconds." · "See where your money goes." · "Break the habit that costs you most."
- Intent cards: ("10 seconds to start") "Just track my spending" / "Amount first, one tap per expense. Patterns show up on their own." · ("2 to 3 minutes") "See where it all goes" / "Scan a bank statement on your phone. Nothing uploads, ever." · ("About a minute") "Break an expensive habit" / "A 90-second audit finds the leak quietly costing you the most."
- Skip: "Skipped it · keeps $6.50" · "+$6.50 kept." · "That's 4 of 5 days this week."
- Slip: "Bought it" · "Logged." · "Still 3 of 5 days this week. Your kept stays yours." · "Spent less than usual?"
- Partial slip: "How much did it cost?" / "You usually spend about $6.50. Anything under that counts as kept." / "Keep it as answered" · toast "+$3.25 kept back."
- Backfill: "Missed yesterday? Answer for it:" · toasts "Yesterday counted. +$6.50 kept." / "Yesterday noted."
- Detection: "Spotting your leak" · "2 of 4 logs at the same place" · "Around 4 logs at one merchant is enough to see a pattern. Keep logging."
- Add upcoming: "Add an upcoming expense" · "Add upcoming." · "What is it?" · "Schedule" · "One-time" / "Repeats" · "On which day?" · "Starting" · "On the" · "Every N days" · "Add to upcoming" · toast "Added to upcoming."
- Scan: "Scan your statement." · "CSV files only. Everything stays on this device." · "Reading your files" · "Your statements, read." · "Your leaks, ranked" · "Continue to the app" · toast "Saved to HabitCents."
- Sign out row: "Sign out" + hint "data stays on this device" · toast "Signed out. Your data stays on this device."
- Guided log toast: "Logged. Nice, that took ten seconds."
- Validation toast: "Enter an amount first."
- Coach moments (unchanged from shipped strings.ts): FL-1, DT-1, skip/slip/milestone lines — keep verbatim.

## Keep verbatim (do not reword)
All existing audit copy (audit-subs, audit-vices, reveal honesty line), graceful-failure copy, coach moments, and the "Break it / Not this one" pair — these are already in the shipped `strings.ts` and match the new voice.
