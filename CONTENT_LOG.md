# Content Log

Append-only log of content moments found at end of session (/eos). Never edit past entries.
Tone source: `../docs/content-agent-spec.md` (CONTENT_PROMPT.md does not exist yet; create it to formalize pillar definitions).

---

## 2026-07-04 — Phase 2 half shipped: analytics + multi-currency live; Leak Scan specified; design scope packaged

### Session scan

**Scope:** end of session (multi-day session, 07-02 to 07-04)
**Built this session:** Shipped and device-verified the anonymous analytics layer (P2-3) and multi-currency plus strings centralization (P2-6); fixed the unreachable Save button and the corrupt app icons that broke iOS builds. Integrated the externally-solutioned Leak Scan spec (ADR 0003), locked a spec-first working mode after rolling back a premature build start, and packaged the full Phase 2 design scope for a GitHub-linked design session.
**Pillar scores:** P1: Strong · P2: Strong · P3: Strong · P4: Strong · P5: Strong
**P6:** not generated (2026-07-04 is a Saturday; no explicit request)

---

### P1 CONCEPT DISCOVERED — The app was celebrating the wrong verb

**TWITTER POST**
My habit app's math was right and its words were wrong. The code rewards skipping a $6 coffee, but the button says "Log Today" with a plus icon, which reads as "yes, I bought it." Same tap, opposite meanings. The win must look like the win. New model: ask the user "Did you skip it today?"

VISUAL NOTE: side-by-side screenshot: old "Log Today" card vs the new check-in prototype card with "Skipped it +$6.00".

---

**TWITTER THREAD**
Tweet 1: I found a bug with zero broken code: my app celebrates the wrong verb.
Tweet 2: HabitCents helps you break a spending habit. The daily win is skipping the spend. The counter, streaks, and dollar math all reward the skip. The mechanics are correct.
Tweet 3: But the button says "Log Today" with a plus icon. In a money app "log" means "record a purchase." So the win button reads like confessing the loss. And there was no button for the loss at all.
Tweet 4: The fix is not a new feature. It is language: "Did you skip it today?" with "Skipped it +$6.00" as the celebrated primary and "I bought it" as an always-visible, shame-free secondary.
Final tweet: Your data model has a direction of positivity. If the UI points the other way, users cannot tell winning from losing. Audit the verbs, not just the logic.

VISUAL NOTE: tweet 3, screenshot of the old Habits tab card; tweet 4, the prototype's question card.

---

**LINKEDIN POST**
I spent this week on a bug with no broken code.

My app, HabitCents, helps people break one spending habit. Skip the daily coffee, watch the dollars you kept add up. The detection math, the streaks, the counter: all correct.

But in testing on my own phone, I could not tell what I was logging. The daily button said "Log Today" with a plus icon. In a finance app, that reads as "I bought it." It actually recorded the opposite. And if you did buy the coffee, there was no honest button to press at all.

The lesson that is now pinned above my desk: a product's mental model lives in its verbs. Users never see your data model. They see a button label, and they decide in one glance what your product thinks a win is.

The redesign is one question: "Did you skip it today?" The win is a filled green button that adds real dollars. The slip is a calm, visible alternative that never subtracts what you already kept.

Design the celebration around the behavior you want. Then make sure the words agree with the math.

VISUAL NOTE: before/after of the habit card, old vs prototype.

---

CASE STUDY MOMENT
The core-loop language inversion (correct math, inverted verbs) is the anchor story for a portfolio case study on designing the daily logging model.

---

### P2 ITERATION WITH RATIONALE — The column mapper died on contact with real bank files

**TWITTER POST**
I specced a CSV column-mapper wizard for bank imports. Then I tested 3 real exports from ONE bank: chequing marks debits negative, the credit card marks them positive, and one file opens with a filter-settings row where data should be. A mapper fixes none of that. New spec: infer everything, ask at most 2 questions.

VISUAL NOTE: redacted or synthetic screenshot of two CSVs with opposite sign conventions highlighted. NONE if too fiddly.

---

**LINKEDIN POST**
I killed my own spec this week.

Version 1 of CSV import for HabitCents was a column-mapper wizard: upload a bank export, tap which column is the date, which is the amount. Reasonable, standard, shippable.

Then I ran three real exports from a single bank through my assumptions. The chequing file marks spending as negative. The card file marks it positive. One file has a settings row injected above the header. One export silently truncates at 100 rows. A refund pair looks like two transactions unless you net them.

A column mapper solves the one problem users could have solved themselves, and none of the problems that actually corrupt the numbers.

Version 2 inverts the design: the parser proves the sign convention from the balance column, detects the header, nets transfers and refunds, and asks the user at most two questions. Below a confidence floor it refuses to show numbers at all, because half-right money math is worse than none.

Test your spec against real artifacts before you build it. Three CSV files saved me weeks.

VISUAL NOTE: the confidence-tier diagram (solid / likely / needs review) from the spec, mocked as a simple graphic.

---

CASE STUDY MOMENT
Mapper-to-inference supersession, driven by three real bank files, is the engineering half of the import case study.

---

### P3 PLATFORM PATTERN — `file` says PNG, Expo says no

**TWITTER POST**
expo run:ios died with "Unsupported critical chunk type" and a garbage character. Sounded like a parser bug. It was my app icon: a 560-byte "256x256 PNG" that `file` calls valid and every real decoder rejects. `file` reads headers, not truth. Validate assets with xxd or an actual decode, then commit.

VISUAL NOTE: terminal screenshot: the prebuild error next to the xxd hexdump of the broken chunk.

---

**LINKEDIN POST**
Debugging story from this week: my iOS build failed with "Unsupported critical chunk type" deep inside Expo's prebuild.

Every instinct said toolchain bug. The truth: my committed app icons were 560-byte PNGs with a malformed color-profile chunk. The `file` command called them valid PNGs. macOS's own sips could not decode them. Neither could Expo's image pipeline.

Two lessons I am keeping:
1. Header-based validation is not validation. `file` checks magic bytes; only a real decode proves an asset is usable.
2. Cryptic build errors deserve five minutes of "what asset did this touch" before an hour of "what tool is broken."

Replaced with clean 1024px icons, build green.

VISUAL NOTE: the error message screenshot. NONE acceptable.

---

### P4 PRODUCT JUDGMENT — Confessing must be the cheapest action in the app

**TWITTER POST**
Design rule I locked in this week: recording a failure never subtracts from the win counter. Bought the coffee anyway? Your streak resets, but the $42.50 you kept stays yours, and the app says so out loud. If confessing costs money, users stop confessing, and then every number in your product is fiction.

VISUAL NOTE: prototype screenshot of the slip confirmation copy ("Your $42.50 kept stays yours. Fresh start tomorrow.").

---

**LINKEDIN POST**
The most important design decision in my habit app is about the moment the user fails.

HabitCents counts the money you keep by skipping a habit. The tempting design is loss-aversion: slip up, lose progress, feel the sting. It tests well in the demo and dies in week two, because users who feel punished stop reporting slips. They do not stop slipping. They stop telling you. Then the streaks are fake, the kept-dollars number is fiction, and the product's one shareable artifact cannot be trusted.

So the rule is: a slip resets the streak, never the money. The copy says it explicitly: "Your $42.50 kept stays yours. Fresh start tomorrow." Honesty has to be the cheapest action in the interface.

If your product depends on self-reported data, price the confession at zero.

VISUAL NOTE: the slip confirmation state from the prototype.

---

### P5 BUILDING WITH AI HONESTLY — "Proceed as per the plan" meant two different plans

**TWITTER POST**
My AI agent heard "proceed as per the plan" and started writing code. The plan was to write specs. Caught it early, rolled back clean: branch deleted, dependency uninstalled, zero code kept. The fix was not a better prompt. We wrote "spec-first: no code until the spec lands" into the repo docs, where no future session can misread it.

VISUAL NOTE: NONE, or a screenshot of the WORKING MODE block in CLAUDE.md.

---

**TWITTER THREAD**
Tweet 1: An honest AI-pairing failure from this week, and the fix that actually worked.
Tweet 2: Context: I run a spec-first process. Open questions get solutioned into markdown specs; code starts only after a spec lands. My words to the agent: "proceed as per the plan."
Tweet 3: The agent's plan and my plan were different documents. It spun up a build agent, created a branch, installed a dependency. Technically obedient. Directionally wrong.
Tweet 4: Rollback was clean because the workflow already isolates work: everything on a branch, nothing merged without my explicit approval. Branch deleted, dependency removed, zero residue.
Final tweet: The durable fix was not prompting harder. We wrote the working mode into the repository itself, in the direction-lock docs every session must read. Ambiguity you tolerate in conversation must not survive in your docs.

VISUAL NOTE: tweet 5, screenshot of the spec-first paragraph in the repo docs.

---

CASE STUDY MOMENT
The rollback and the resulting spec-first lock is the process chapter of the build-in-public story: guardrails beat prompts.

---
