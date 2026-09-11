# Content Log

Append-only log of content moments found at end of session (/eos). Never edit past entries.
Tone source: `../docs/content-agent-spec.md` (CONTENT_PROMPT.md does not exist yet; create it to formalize pillar definitions).

---

## 2026-08-13: Full UX/UI audit and remediation shipped as TestFlight build 13

### Session scan

**Scope:** end of session (multi-day session, 08-12 to 08-13)
**Built this session:** Ran a full UX/UI debt audit of the mobile app (74 findings, file:line evidence, an interactive triage viewer) using parallel agents plus a dedicated adversarial reviewer per phase, then executed seven remediation phases: honesty and correctness bugs, WCAG contrast fixes, a ratified type and spacing scale, performance (memoization, first React.memo, list virtualization), and an accessibility-flow pass that made the core loop and the leak-scan flow speak for the first time. Merged to main and shipped as TestFlight build 13.
**Pillar scores:** P1: None · P2: Strong · P3: Weak (already logged 2026-08-07, same underlying Metro/worktree constraint rediscovered with new detail, not a new pattern) · P4: Strong · P5: Strong
**P6:** not generated (no explicit request; day of week not confirmed as Friday)

---

### P2 ITERATION WITH RATIONALE: Fixed the button, then found it broken five more times

**TWITTER POST**
Fixed the worst accessibility bug in my app: a green button with white text failing contrast (2.71:1, needs 4.5). Kept the brand green, flipped the label to dark text (6.24:1). Shipped it. Then a second AI pass, told to find what's wrong instead of confirm what's right, found five other buttons across the app still running the broken version, including the app's main paywall button. Fixing the shared component doesn't reach code that copy pasted the pattern instead of using it.

VISUAL NOTE: before/after of the "Get started" button, white label vs the corrected dark label, same green.

---

**TWITTER THREAD**
Tweet 1: I fixed the worst accessibility bug in my app. Then found it five more times.
Tweet 2: The bug: a bright green call-to-action button with white text. Contrast ratio 2.71 to 1. WCAG needs 4.5. Every primary button in the app failed it.
Tweet 3: The fix: keep the brand green exactly as is, flip the label from white to dark ink. New ratio: 6.24 to 1. Comfortable pass. Updated the shared button component. Called it done.
Tweet 4: A second review pass, a different AI agent whose only job was to try to disprove the fix, found five buttons that had rolled their own version of the button instead of using the shared one, including the main call-to-action on the paywall screen. None of them had inherited the fix.
Final tweet: "Fixed in the shared component" is not the same claim as "fixed." Grep for every place someone copy pasted the pattern instead of reusing it, every time.

VISUAL NOTE: tweet 2, a screenshot of the contrast checker showing 2.71:1 fail; tweet 4, the paywall's main button before the second pass caught it.

---

**LINKEDIN POST**
I fixed the worst accessibility bug in my app this week. Then I found it five more times.

The bug was simple: the primary call to action button across HabitCents used white text on the brand green. Measured contrast: 2.71 to 1. WCAG AA needs 4.5. Every green button in the app failed it, including the button people tap to start a free trial.

The fix looked simple too. Keep the exact brand green, no change there. Flip the label from white to a dark ink. New ratio: 6.24 to 1, a comfortable pass. I updated the shared Button component and marked the finding resolved.

Then I ran a second pass with a different instruction: don't confirm this is fixed, try to prove it isn't. That pass found five buttons across the app, including the app's main paywall call to action, that had never gone through the shared component at all. Someone, at some point, had copy pasted the visual style instead of importing the button. All five still shipped the broken white-on-green text.

The lesson I am keeping: a design system fix only reaches the places that actually use the design system. Every hand rolled copy of a pattern is a silent exception, and you will not find it by re-reading the component you just fixed. You find it by asking a second, skeptical pass to go looking for exactly that.

All five are fixed now, verified with the same contrast math, shipped in build 13.

VISUAL NOTE: a small before/after grid of all five buttons found in the second pass.

---

CASE STUDY MOMENT
The token-fix-doesn't-reach-hand-rolled-copies pattern, caught by a dedicated adversarial review pass, is a strong anchor for a case study on how multi-agent review actually changes outcomes versus a single confident pass.

---

### P4 PRODUCT AND DESIGN JUDGMENT: The empty app hid the worst bugs

**TWITTER POST**
My AI-run audit read every line of my app's code and found real bugs. It also missed two of the worst ones, because the app was empty. A category screen quietly labeled an all-time spending total as "this month." A leak-detection feature told a user their $1,200 rent "costs you about $4,000.00 a month." Both only showed up once I put real data in and actually ran it.

VISUAL NOTE: the leak-scan biggest-leak card claiming "$4,000.00 a month" next to the true $1,200 figure from the underlying data.

---

**TWITTER THREAD**
Tweet 1: My AI code audit was thorough. It still missed two of the app's worst bugs, because the app was empty.
Tweet 2: The audit read every file, computed every color contrast ratio by hand, found 74 real issues. All correct. All found by reading source code on a fresh install with zero data.
Tweet 3: What it missed: a Categories screen that labeled an all-time spending total "this month" on every row. And a leak-detection card that told a user their $1,200 a month rent "costs you about $4,000.00 a month."
Tweet 4: Both bugs live in arithmetic, not markup. You cannot see a wrong number by reading the code that produces it. You have to actually compute it and look at the screen.
Final tweet: I seeded the app with a demo history and ran a real bank statement through the import flow. Both bugs surfaced in under five minutes. Code review finds what's written wrong. Only running the product with real data finds what's computed wrong.

VISUAL NOTE: tweet 3, split screenshot of both bugs; tweet 4/final, the seeded Categories screen with correct monthly totals after the fix.

---

**LINKEDIN POST**
My AI-run UX audit of HabitCents was genuinely thorough. It read every file in the app, computed WCAG contrast ratios by hand for every color pair, and surfaced 74 real findings. All of that happened on a fresh install with zero user data.

It still missed two of the worst bugs in the product.

The first: the Categories screen showed a spending total under every category, labeled "this month." The number was actually an all-time sum. Nobody had ever tested it against a full month of real expenses, because there weren't any.

The second, worse one: HabitCents has a feature that scans a real bank statement and finds your biggest recurring expense. I ran one of my own real exports through it. It found my rent, correctly. Then it told me: "Park costs you about $4,000.00 a month." My actual rent is $1,200. The math that turns "three payments over some number of days" into "a monthly rate" was dividing by the wrong denominator, and it had never been checked against real numbers because nobody had ever run a real statement through it during the audit.

Neither bug is a typo you can catch by reading code. They are arithmetic bugs that only exist once you compute them and look at the number on screen.

The fix wasn't more code review. It was seeding the app with a demo history and running one real CSV through the actual pipeline. Both bugs surfaced in minutes.

A code audit tells you what's written wrong. Running the product with real data tells you what's computed wrong. A finance app needs both, and I am filing the rent bug as its own priority fix rather than letting a thorough-looking report stand in for having actually checked the math.

VISUAL NOTE: the leak-scan "biggest leak" card, before and after seeding, ideally with the real dollar figures visible.

---

CASE STUDY MOMENT
"The audit that read code versus the pass that ran the app with real data" is a strong before/after for a case study on the limits of static AI code review in a product where correctness means a specific dollar figure, not just a passing test.

---

### P5 BUILDING WITH AI HONESTLY: The audit that caught its own wrong math

**TWITTER POST**
The AI-written audit of my app published a wrong number, then caught its own mistake in the same document. It claimed a proposed color fix passed accessibility contrast at 4.54. Real value: 4.37. It fails. A second AI agent, told to verify every claim rather than trust it, recomputed it and the report now says so in bold at the top: "Correction, read this first."

VISUAL NOTE: screenshot of the "Correction, read this first" callout in the published audit report.

---

**TWITTER THREAD**
Tweet 1: The AI audit of my app published a wrong number. Then it caught itself, in writing, in the same report.
Tweet 2: The claim: a proposed color fix for a failing contrast ratio would score 4.54, a pass. The real number, recomputed independently: 4.37. It fails.
Tweet 3: A second AI agent's whole job on that pass was to verify every number in the report, not trust it. It recomputed every contrast ratio from scratch and caught the miss.
Tweet 4: Two more from the same session: one AI agent blamed a broken test on "pre-existing, unrelated" code, when the actual cause was a change made two steps earlier in the same session, only caught by checking git history instead of trusting the explanation. And I coined a tracking id in a commit message without ever logging it in the actual document, which caused a real mismatch between shipped code and the report describing it, and needed its own separate fix.
Final tweet: AI reviewing AI only works if the reviewer's job is explicitly to disprove, not confirm. And even then, you still have to spot check the reviewer. I did, three separate times this session, and every time it was right.

VISUAL NOTE: tweet 2/3, the published correction note; tweet 4, none, this one is a narrated beat, not a screenshot.

---

**LINKEDIN POST**
This week's audit of my app's design system caught something I did not expect: itself, being wrong.

The report claimed a proposed replacement color would fix a failing contrast ratio, scoring 4.54, a pass. That number was false. Recomputed independently, the real ratio is 4.37. It fails the same 4.5 floor the report itself was citing as the standard.

What caught it was not a human reading closely. It was a second AI pass whose entire job was to verify every claim in the first pass's output rather than trust it, recomputing every color contrast ratio from raw values instead of reading the stated conclusion. It found the error, and rather than quietly editing the number, the report now carries a visible correction at the top: what was wrong, what the real number is, and why it matters that a document meant to catch mistakes had shipped one of its own.

That was not the only place a second pass caught the first. In the same session: an AI agent explained away a broken test as "pre-existing, unrelated to this change," and it was wrong, the actual cause was a change made two steps earlier in the same session, only caught by checking git history instead of accepting the explanation. And I made my own mistake: I referenced a tracking id in a code comment and a commit message without ever logging that finding in the actual audit document, which meant the published report and the shipped code disagreed about what that id meant. Fixing it took a dedicated pass of its own.

None of this is an argument against building with AI. It's the actual shape of doing it honestly: parallel agents doing the work, a separate agent per phase whose only job is trying to disprove what the first one produced, and me spot checking the strongest claims myself before anything ships. Three genuine catches in one session, plus one mistake that was mine, not the model's, and needed a human to say "go check your own work here."

The audit is public inside the repo, correction note and all. That felt more honest than quietly fixing the number and moving on.

VISUAL NOTE: the full "Correction, read this first" section of the report, unedited.

---

CASE STUDY MOMENT
A single session containing three separate self-corrections, one factual (contrast math), one diagnostic (misattributed test failure), one process (a tracking-id collision the AI itself caused) is the strongest material yet for a case study on what disciplined multi-agent review actually looks like, mistakes included.

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

---

## 2026-07-13 — Session close: context refresh only, no code

### Session scan

**Scope:** end of session
**Built this session:** No code. Reviewed project state, corrected a stale status picture, refreshed the mobile-app lifecycle files (primer, agent-memory) that had drifted 10 days behind the actual repo state. Note: since ADR 0010, primary content drafting flows through the Notion Content queue via scribe; this log remains the per-repo scan record.
**Pillar scores:** P1: None · P2: None · P3: None · P4: None · P5: Weak (stale-context lesson: a resumed agent session confidently reported a 10-day-old project state until it checked the repo; grounding beats memory. Below the bar for a post on its own.)

No strong signals. Next session is the first TestFlight build with Charen (runbook ready): that is a natural P5 moment (solo founder + agent team getting a real app onto a real phone) and likely a P3 moment (EAS/TestFlight pipeline specifics). Capture screenshots of the first install.

---

## 2026-07-13 (session 2) — Connected habitcents.com, shipped a web foundation sprint with a team of agents

### Session scan

**Scope:** end of session
**Built this session:** Connected habitcents.com to the correct Vercel project after it turned out the domain was stuck linked to a different Vercel account, then ran a foundation sprint as parallel agents: legal pages, domain standardization, an accessibility pass that took the site from 91 to 100, and a rebuilt Open Graph share card that generates itself from the landing page so it can never go stale. Nine PRs merged across three repos in one session.
**Pillar scores:** P1: None · P2: Strong (why I rebuilt the share card as code, not an image) · P3: Strong (a domain stuck in another Vercel account, and the deterministic way out) · P4: Weak · P5: Strong (orchestrating a team of models, one planning, several cheap ones building in parallel)

---

### PLATFORM PATTERN — A domain that would not leave the other Vercel account

**TWITTER POST**
My marketing site was serving the wrong build and I could not figure out why. The domain resolved fine, it just pointed at an old Vercel project. Turned out the domain was linked to a different Vercel account entirely, and its nameservers kept the DNS zone hostage there. Removing it from the old project did nothing.

VISUAL NOTE: the Vercel "this domain is linked to another Vercel account" verification banner.

---

**TWITTER THREAD**
Tweet 1: Spent an hour on a domain that resolved perfectly but served the wrong site. The fix was not where I was looking.
Tweet 2: The site was live on habitcents.com, 200 on every route, but old routes 404'd and new ones were missing. The domain was pointed at a stale Vercel project.
Tweet 3: Real cause: the domain was still claimed by a different Vercel account, and its nameservers (ns1/ns2.vercel-dns.com) meant that account, not me, controlled the DNS zone. Deleting the project mapping did not release it.
Tweet 4: Deterministic fix that needs zero access to the other account: at the registrar, switch nameservers from the custom Vercel ones to the registrar's own DNS. Now I own the zone. Add the _vercel TXT records, verify, done.
Final tweet: When a platform tells you a resource is "linked to another account," stop trying to remove it from the wrong side. Take control at the layer you actually own. For domains that is always the registrar.

VISUAL NOTE: tweet 4, the registrar nameserver dropdown switching to the registrar default.

---

**LINKEDIN POST**
A small infrastructure puzzle that cost an hour and taught a clean lesson.

My website was live at its domain and returning 200 on every page, but it was serving a stale build. The domain was pointed at an old project on my hosting platform. The platform kept telling me the domain was "linked to another account," and no amount of removing it from the old project changed anything.

The missing piece: the domain's nameservers were delegated to that other account, so that account owned the DNS zone. The mapping I kept deleting was not the thing holding it.

The fix did not require getting back into the other account at all. I switched the nameservers at the registrar, the one layer I definitely control, back to the registrar's own DNS. That made my registrar authoritative, I added the ownership-verification records, and the platform released the domain.

The principle I am keeping: when a system says a resource belongs to someone else, take control at the layer you own outright, not the one you are fighting over.

VISUAL NOTE: before/after of the domain serving the wrong vs right build (curl of a route that 404'd, then 200).

---

CASE STUDY MOMENT
The domain handoff is the unglamorous half of "launch": the site was done for days, but nobody could see the real one until the DNS ownership was untangled.

---

### ITERATION WITH RATIONALE — I deleted the share image and made it a function

**TWITTER POST**
An agent built me a nice Open Graph card as a PNG. I almost shipped it, then realized: the moment I change the hero headline, that image is a lie. So I threw it out and rebuilt the card as a route that generates itself from the same headline constant the homepage uses. It cannot drift now.

VISUAL NOTE: the generated share card next to the live hero, same words.

---

**LINKEDIN POST**
A build agent handed me a polished social share image for the site. It looked great. I almost merged it.

Then I asked the boring question: what happens the next time I change the landing page headline? Answer: the share card silently becomes wrong, and I would never notice until someone pasted the link and saw last month's copy.

So I closed that PR and had it rebuilt as code instead. The share card is now a route that reads the exact same headline constant the homepage renders, and draws the image at build time. Change the headline once, both update together. I proved it by changing the constant, rebuilding, and watching the card's text change, then reverting.

The lesson is not about Open Graph tags. It is that any asset which duplicates a source of truth will eventually drift from it. The durable fix is to derive it, not copy it.

VISUAL NOTE: NONE

---

### BUILDING WITH AI HONESTLY — A team of models, not one assistant

**TWITTER POST**
Today's session was one planning model deciding the work, then a handful of cheaper models building it in parallel, each on its own branch. Nine PRs merged across three repos. The safe, boring ones merged themselves; anything a user could see waited for me. I mostly reviewed and unblocked.

VISUAL NOTE: the merged PR list for the session (numbers and titles).

---

**TWITTER THREAD**
Tweet 1: I shipped nine pull requests today across three repositories. I wrote almost none of the code. Here is the actual shape of it.
Tweet 2: One expensive model plans and orchestrates. It does not build. It splits the work into units, routes each to the cheapest model that can do it well, and reviews what comes back.
Tweet 3: The cheap models build in parallel, each in its own isolated worktree so they cannot step on each other. Mechanical edits go to the cheapest tier, real UI work to a mid tier.
Tweet 4: Merging is a two-lane rule, not a vibe. Invisible changes (infra, docs, string fixes) auto-merge when CI is green. Anything a user can see or feel waits for my review. Debatable defaults to waiting.
Tweet 5: The quality did not come from one clever prompt. A QA agent audited the live site and found the accessibility score was 91, not the 95 I needed, then a fix agent took it to 100. Adversarial checking, not trust.
Final tweet: The founder's job shifts from typing code to designing the system that types it: the routing, the isolation, the merge gates, the checks. Build the assembly line, then review the output.

VISUAL NOTE: tweet 5, the Lighthouse accessibility score going from 91 to 100.

---

**LINKEDIN POST**
I merged nine pull requests across three repositories in a single session today, and I wrote almost none of the code myself. I want to describe the setup honestly, because "AI wrote it" hides the part that actually matters.

It is not one assistant. It is a team with roles.

One capable model plans and orchestrates. Its job is to break the work into units, route each to the cheapest model that can do it well, and review what returns. It does not write features.

Several cheaper models do the building, in parallel, each in an isolated copy of the repo so concurrent work cannot collide. A mechanical find-and-replace goes to the cheapest tier. A new set of pages or an accessibility fix goes to a mid tier.

Merging is governed by an explicit rule, not judgment in the moment. Changes with zero user-visible effect merge automatically once tests pass. Anything a person could see or feel waits for me. When in doubt, it waits.

And quality comes from adversarial checking, not trust. A separate agent audited the live site and reported the accessibility score was below my bar. Another fixed it to a perfect score. I saw the number move.

My role was not smaller, it was different: design the routing, the isolation, the merge gates, and the checks, then review the output and unblock. The craft moved up a level, from writing the code to designing the system that writes it.

VISUAL NOTE: the session's merged PR list, and the 91 to 100 accessibility jump.

---

CASE STUDY MOMENT
This session is the clearest example yet of the operating model: a solo founder running a small fleet of role-specialized agents through a two-lane merge policy, shipping foundation work while staying the only human in the loop on anything user-facing.

---

---

## 2026-07-15 — Brand refresh shipped live + full-state audit + merged the backlog

### Session scan

**Scope:** end of session (long, cross-repo)
**Built this session:** Wave 0 account handoffs (Resend live, RevenueCat chain to SDK key, App Store Connect record), the blog auto-publish pipeline (ADR 0014), a full-state audit that reconciled Notion/PUNCHLIST/roadmap and caught a real bug, and a brand refresh (favicon, theme-adaptive nav/footer logo, mobile app-icon system) now live on habitcents.com. Merged all 5 open PRs.
**Pillar scores:** P1: None · P2: Weak · P3: Strong (currentColor theme-adaptive logo) · P4: Strong (mode-matched icons, assets-only restraint) · P5: Strong (audit caught an AI-authored bug)

---

### P3 PLATFORM PATTERN — One SVG, both themes, no JavaScript

**TWITTER POST**
Needed my logo to work in dark and light mode. The lazy way: ship two files and swap them with JS. The right way for a CSS-variable theme: inline the SVG, set the tile and text to `currentColor`, hardcode only the brand-green mark. One asset. Zero theme-detection code. It flips exactly like the body text does.

VISUAL NOTE: side-by-side of the nav logo in dark vs light theme (already captured this session).

---

### P5 BUILDING WITH AI HONESTLY — The audit caught its own mistake

**TWITTER POST**
Ran a full state-of-project audit across three repos. It found a Slack signup notification that could never fire: an earlier agent-authored PR added the feature to the library but never forwarded the env var in the API route. Tests passed because they injected the env directly. The lesson: verify the wiring, not just the unit. Fixed in one line.

VISUAL NOTE: NONE (or the one-line diff adding the env forward).

---

CASE STUDY MOMENT
Shipping a brand refresh across a web app and a mobile app from a single set of designer exports, deriving every icon/favicon variant programmatically (Node + sharp), eyeballing each before commit because the app can't be built locally, then merging a five-PR backlog including a hand-resolved conflict between the payments feature and the accessibility pass.

---

---

## 2026-07-24 — Drove the first TestFlight build onto a real iPhone, and found a P0 crash there

### Session scan

**Scope:** end of session
**Built this session:** Drove BET-002 end to end: bound the EAS project (mobile PR #27), set the build-time env vars, ran the production iOS build and App Store Connect submission, and got HabitCents installed on Charen's phone via TestFlight. On device, the app icons passed (Test A), and tapping the Habits tab surfaced a hard crash that no dev or web run had shown, which blocks the paywall and VoiceOver tests.
**Pillar scores:** P1: None · P2: None · P3: Strong (EAS/TestFlight gotchas) · P4: Weak (place-labeled guide artifact) · P5: Strong (credential boundary + a self-corrected wrong bug call)

---

### P3 PLATFORM PATTERN — The first TestFlight build, and the gotchas nobody warns you about

**TWITTER POST**
Shipped my first TestFlight build today. The EAS part was smooth. The confusing part was everything Apple: TestFlight has no login of its own (it uses your App Store account, which is often a different Apple ID than iCloud), internal testers need no redeem code and no review, and "Ready to Submit" does not block internal testing. Once those clicked, the app was on my phone.

VISUAL NOTE: screen recording of the TestFlight home going from empty to HabitCents with an Install button.

---

**TWITTER THREAD**
Tweet 1: My first TestFlight build is on my phone. The build itself was one EAS command. The hour of confusion was all Apple-side. A field guide for the next person:
Tweet 2: EAS handles the scary parts for you. First build offers to generate your distribution certificate and provisioning profile. First submit auto-creates an App Store Connect API key (App Manager) and stores it. You never hand-manage a .p8.
Tweet 3: The "Expo Go is not recommended for production" warning during the build is a red herring. It is a dev-mode heuristic. Your standalone build is fine. Set EAS_BUILD_NO_EXPO_GO_WARNING=true and move on.
Tweet 4: Why TestFlight said "no invites" even after everything succeeded: TestFlight has no login. It reads your device's App Store Apple ID, which was not the account I enrolled as a tester. Match those two and the build appears. No redeem code needed for internal testers.
Final tweet: Principle: the tool you are learning is rarely where you are stuck. The build pipeline was easy. The account model underneath it was the real lesson. Read the model, not just the CLI output.

VISUAL NOTE: Tweet 4, a shot of the App Store profile email next to the TestFlight tester email.

---

**LINKEDIN POST**
Today I got the first build of my app onto a real iPhone through TestFlight.

The build itself was almost anticlimactic: one EAS command, and the cloud did the rest. It even created and stored my signing certificate and my App Store Connect API key so I never had to touch a .p8 file.

The real learning was the layer underneath. I lost the better part of an hour to TestFlight showing "a developer has to invite you" even though every step had succeeded. The cause: TestFlight does not have its own login. It quietly uses whichever Apple ID your App Store is signed into, and that was not the account I had enrolled as a tester. A few other things that are obvious in hindsight: internal testers need no redeem code and no review, and a build marked "Ready to Submit" is still fully testable internally.

The takeaway I keep relearning: when you are blocked, it is usually not the new tool you are learning. It is the model underneath it that nobody drew for you. Read the model.

VISUAL NOTE: the TestFlight home screen with HabitCents installed, or the empty-then-filled before/after.

---

### P5 BUILDING WITH AI HONESTLY — The AI can't type my password, and it caught itself calling a bug that wasn't

**TWITTER POST**
Two honest moments pairing with an AI on a release today. One: it flat out cannot type my Apple password or sit at an interactive prompt, so we split the work. It ran the deterministic setup, I ran the sign-in, and it coached every prompt. Two: it saw my dark-mode icon, said "this looks like a bug", then opened the actual asset files, and corrected itself: the icon was right. Verify before you alarm.

VISUAL NOTE: the dark-mode app icon next to the source icon-dark.png, showing they match.

---

**LINKEDIN POST**
Two things happened while I paired with an AI to ship my first mobile build, and both are worth being honest about.

First, the boundary. Parts of an app release are interactive and credential-bearing: signing into Apple, typing a two-factor code. An AI should never type your password, and in a normal terminal it cannot sit at those prompts anyway. So we divided the work deliberately. It ran the deterministic, non-interactive setup and opened the code change. I ran the Apple sign-in in my own terminal. It read my output and told me exactly what to answer next. The division was the design, not a workaround.

Second, the correction. When it saw my dark-mode app icon, it initially flagged it as possibly wrong. Then it did the right thing: it opened the actual icon files that shipped and compared them. The icon was correct. It said so plainly and moved on.

Both moments point at the same standard: an assistant that knows what it must not do, and checks the source before it raises an alarm, is far more useful than one that is confidently wrong or quietly oversteps.

VISUAL NOTE: NONE, or the side-by-side of the on-device dark icon and the source asset.

---

CASE STUDY MOMENT
On-device testing earned its keep in one tap: the app that passed every unit test and ran clean on web and simulator hard-crashed the moment a real user opened the Habits tab on a fresh install, a release-only failure that only a build on a real phone could surface.

---

---

## 2026-08-07 — Phase DI built end to end: chrome, Today scoreboard, onboarding doors v2, scan engine fixed on real bank data

### Session scan

**Scope:** end of session (multi-day live session, 08-04 to 08-07)
**Built this session:** Turned Charen's annotated build 6 screenshots into a ratified two-batch plan, then built all of it as 16 Lane 2 PRs: unified headers, a Profile page, Today's Spent/Kept scoreboard, a Money Habits segment, and an onboarding redesign that deletes four screens so every door lands in the real app. An eval harness proved the bank-statement scanner parsed 1 row in 99 on real exports, and the fix took it to 100%.
**Pillar scores:** P1: Strong · P2: Strong · P3: Strong · P4: Strong · P5: Strong
**P6:** generated (Friday)

---

### P1 CONCEPT DISCOVERED — The app is the onboarding

**TWITTER POST**
I deleted four onboarding screens this week: the practice-log screen, two audit steps, the success ceremony. They taught users an interface that stops existing the moment onboarding ends. Now every door drops you into the real app with one line of coaching. The first log IS the thousandth log.

VISUAL NOTE: side by side: the old guided practice screen vs the real log sheet opening over Today with the coach line.

---

**TWITTER THREAD**
Tweet 1: Onboarding screens are a promise that the real app will be worse.
Tweet 2: My app had a practice-log screen, a two-step audit, and a success ceremony. Users learned all three, then arrived in the actual app as strangers. The practice log even wrote data the detection engine could not use.
Tweet 3: The redesign principle: the app is the onboarding. Door 1 opens the REAL log sheet over the REAL home screen with one coach line. Door 3 is a bottom sheet over the habit view; closing it reveals your first check-in, already waiting.
Tweet 4: The success screen became a single dismissible ribbon: "Logged for real. A few more like this and we'll spot your first leak." Context, not ceremony.
Final tweet: Count the screens a new user sees exactly once. Each one is training for an interface that does not exist. Delete them and coach the real one.

VISUAL NOTE: tweet 3, the break sheet over the dimmed Kept view; final tweet, the ribbon on Today.

---

**LINKEDIN POST**
This week I deleted a third of my app's onboarding, on purpose.

HabitCents had a careful onboarding: a practice logging screen, a 90-second audit across two steps, a success screen with a primed counter. Each one polished. Each one a parallel copy of an interface the user would never see again.

Watching the flows end to end on the simulator made the cost obvious. Users finished onboarding as experts in screens that had just ceased to exist, and strangers to the app they landed in. Worse, the practice log wrote throwaway data the habit-detection engine could not use.

The replacement principle fits in a sentence: the app is the onboarding. Every path now lands on real components with one line of coaching. The first expense is logged in the real sheet over the real home screen. Naming a habit to break happens in a bottom sheet, and closing it reveals your first daily check-in already waiting. The ceremony screen became one dismissible line.

Four screens deleted, and the tutorial cannot drift out of sync with the product, because the tutorial is the product.

VISUAL NOTE: three-frame strip: door tap, real sheet over home, ribbon on arrival.

---

CASE STUDY MOMENT
The app-is-the-onboarding rewrite (four screens deleted, flows landing on real components) anchors the onboarding chapter of the portfolio case study.

---

### P2 ITERATION WITH RATIONALE — Shipped faithfully in the morning, redesigned by evening

**TWITTER POST**
Morning: shipped the exact control from my own mockup. Two outlined stat tiles that switch views. Evening: lived with it on the simulator, realized nothing about it says "tap me," and rebuilt it as the app's existing segmented control grown to scoreboard scale. The mockup was the hypothesis. The built thing was the test.

VISUAL NOTE: before/after of the Today header: v1 ring tiles vs the track-and-thumb scoreboard.

---

**LINKEDIN POST**
I shipped a control at 10am and replaced it by dinner, and I think that was the fastest correct path.

The morning version was faithful to my annotated mockup: two outlined value tiles for the Today screen, a colored ring marking the active view. Tests green, pixel-accurate to the sketch.

Then I used it. On the simulator, next to real cards, the tiles read as statistics, not as a switcher. The ring was a whisper. And two near-identical green money labels stacked within an inch of each other.

Instead of iterating in code, I built an interactive HTML prototype comparing the shipped version against a refinement that reuses the segmented control my app already teaches on another tab, at larger scale. Same information, borrowed muscle memory. My reviewer approved it from the prototype in minutes, and the swap was one component's internals.

Two lessons I keep relearning. A mockup is a hypothesis; only the built thing running next to real neighbors tells the truth. And when you refine, reach for a pattern the product already owns before inventing a third one.

VISUAL NOTE: the comparison artifact screenshot with both phone frames.

---

### P3 PLATFORM PATTERN — A swipe pager with zero new dependencies

**TWITTER POST**
RN swipe-between-views without react-native-pager-view or gesture-handler: a horizontal ScrollView with pagingEnabled. Native scrolling, no JS animation drivers, so it cannot reproduce the release-only crash class that burned me twice. One catch nobody mentions: both panes stay mounted, so hide the off-screen one from VoiceOver (accessibilityElementsHidden / importantForAccessibility) or screen-reader users walk into invisible content.

VISUAL NOTE: 3-second screen recording of the swipe with the thumb syncing. NONE if fiddly.

---

**LINKEDIN POST**
Small React Native pattern that saved me a native dependency and a class of crashes.

I needed swipe-between-views on my app's home screen. The reflex is react-native-pager-view or a gesture-handler setup. But my app has release-build crash scars from mixed animation drivers, and every new native dependency means a fresh native build through the release gate.

The boring answer: a horizontal ScrollView with pagingEnabled. Chip tap calls scrollTo; onMomentumScrollEnd syncs state back after a swipe. Native scrolling physics, zero new dependencies, nothing for the animation system to crash.

The non-obvious part: with both pages permanently mounted, assistive tech can reach the off-screen page. VoiceOver users swipe into content the eye cannot see. The fix is two props per page, toggled by the active view: accessibilityElementsHidden on iOS, importantForAccessibility no-hide-descendants on Android.

Reduced motion: the tap jumps without animating; the user's own swipe is their gesture, so it stays.

VISUAL NOTE: short recording, or NONE.

---

### P4 PRODUCT AND DESIGN JUDGMENT — No invented totals, ever

**TWITTER POST**
My cofounder-of-one asked the best design question of the week: our welcome screen showed "$149.50 kept" as a sample. In a finance app, whose money is that? New structural rule: the only accumulated total the app ever renders is the user's own. Sample dollars appear only as marked example prices: "for example: one skipped coffee keeps $6.50." A price is arithmetic. Only totals can lie.

VISUAL NOTE: the honest-zero welcome: real $0.00 hero with the rotating example line under it.

---

**LINKEDIN POST**
The sharpest design review note I got this week was seven words: "isn't showing money that isn't theirs a risk?"

My welcome screen mockup had a lovely animated counter: $149.50 kept, ticking upward. Pure marketing. And in a personal finance app, indistinguishable from a claim. Either the user reads it as typical results, or worse, as THEIR counter, which then "resets" to zero after signup. Both spend trust we have not earned.

The fix was not a disclaimer label. It was a structural rule now written into the design system: the app never renders an invented total. The welcome hero is the user's real counter, showing a real $0.00 with its honest caption: "your first skip starts this counter." The liveliness comes from unit prices cycling beneath it, explicitly marked: "for example: one skipped coffee keeps $6.50."

A price is arithmetic anyone can verify. A total is a history, and fabricated history is exactly what a money app cannot afford.

Bonus property we got free: an existing user who revisits the welcome screen sees their own true total there. The honest version is also the more personal one.

VISUAL NOTE: before/after: fake $149.50 counter vs honest-zero hero.

---

### P5 BUILDING WITH AI HONESTLY — Measure before you polish

**TWITTER POST**
User feedback said our bank-statement scanner "hardly had any value." Before letting AI agents redesign the results screen, I had one build an eval harness and run my real bank exports through it. Result: 1 row parsed out of 99. The beautiful results UI would have been paint on a broken engine. Fix the column-inference bug first; files now parse 100%. Harness before polish, always.

VISUAL NOTE: the before/after score table from the PR (aggregates only).

---

**TWITTER THREAD**
Tweet 1: My AI agents were one prompt away from polishing a feature that did not work. A test harness saved us.
Tweet 2: The plan said: redesign the statement-scan results screen. User feedback said the scan felt worthless. Two explanations: bad presentation, or bad engine. Only one is fixable with UI.
Tweet 3: So the first agent built an eval harness instead: fixture CSVs plus expected-outcome manifests, scored on parse rate, categorization, and detection recall. Then we fed it my real bank exports (gitignored, never committed).
Tweet 4: Score: 1 row parsed out of 99. A sparse metadata column was beating the real Amount column in the inference heuristic. Every downstream number was garbage. No results screen could have fixed that.
Tweet 5: The fix scored evidence properly (pure-numeric share, decimal shape, coverage) and the same files now parse 100%, with cross-account transfers netting correctly.
Final tweet: Agents will confidently build whatever you ask for. Ask for the measurement first, and make the polish wait for the numbers.
VISUAL NOTE: tweet 4, the harness score table.

---

**LINKEDIN POST**
This week an AI agent's most valuable output was a table proving our feature didn't work.

The roadmap said: redesign the bank-statement scan results screen. The user feedback behind it said the scan "hardly had any value." I nearly pointed the build agents straight at the UI.

Instead, the first unit of work was an evaluation harness: fixture bank files with expected-outcome manifests, scoring the pipeline on parse rate, categorization coverage, and habit-detection recall. Then we ran my own real bank exports through it, from a gitignored folder that never touches version control.

The baseline: 1 row parsed out of 99. A sparse metadata column was outscoring the real amount column inside the inference heuristic, and its tiebreak favored the wrong one. Every number downstream of that was noise. The prettiest results screen in the world would have been paint on a broken engine.

With the defect measured, the fix was surgical, and the same files now parse at 100% with cross-account payment transfers netting correctly. The redesigned results screen ships after the engine that feeds it, in that order, enforced by the numbers.

Working with AI agents daily, this is the discipline that matters most: they will build exactly what you ask for, with total confidence, whether or not it should exist yet. Make the measurement the first deliverable.

VISUAL NOTE: the before/after harness table.

---

### P6 WEEKLY SUMMARY — From annotated screenshots to 16 pull requests

**LINKEDIN POST**
This week on HabitCents, solo with an AI team:

Monday started with annotated screenshots of everything that bothered me about build 6: titles that jumped between tabs, settings hidden on one screen, a home page that buried expense logging, habits invisible on the Money tab.

By Friday: 16 pull requests, each with simulator captures and a test checklist. A shared header. A Profile page. The home screen split into a Spent/Kept scoreboard. An onboarding rewrite that deleted four screens because the app itself is the better tutorial. And a bank-statement scanner that went from parsing 1 row of my real exports to all of them, because we measured before we polished.

The process that made it work: annotate honestly, plan as decision records, build mockup-faithful first, then refine against the running thing on the same day, and let a prototype settle every design argument before code.

Nothing merges until it passes my hands on a real device. That pile is my weekend.

VISUAL NOTE: 2x2 grid: scoreboard, break sheet, honest-zero welcome, harness score table.

---

CASE STUDY MOMENT
One session turned an annotated design review into a fully-built two-batch redesign with an evidence-gated pipeline fix: the end-to-end story for the "designing with an AI team" case study.

---

## 2026-09-04 — Design refresh shipped to TestFlight; three worker routines + an orchestrator went live

### Session scan

**Scope:** end of session
**Built this session:** Merged seven PRs to main and shipped TestFlight build 18: first-time-empty states, "not-started is not zero" chips, one shared sheet header with top-right save across every form sheet, category renames (Home, Subscriptions) that surfaced and fixed a latent spend-matching bug, and a category detail refresh (gutter back arrow, one stat band, honest trend bars, unified list rows). Then stood up three recurring cloud workers (localization, iPad, core P3) on long-lived branches with a Fable 5 orchestrator reviewing them daily.
**Pillar scores:** P1: None · P2: Strong · P3: Weak (findNodeHandle web guard + hidden-pane RAF freeze, logged in memory, too niche for a post) · P4: Strong · P5: Strong
**P6:** not generated (not Friday)

---

### P2 ITERATION WITH RATIONALE — The chart was lying politely

**TWITTER POST**
Our 6-month trend chart drew a full-height ghost track behind every month. Looked "designed". Read as data: six tall gray columns, even for months with zero spend.

Fix: bars rise from a shared baseline. A zero month gets a 4px tick, because zero is a measurement, not missing data.

VISUAL NOTE: before/after crop of the trend card (ghost tracks vs baseline bars).

---

**LINKEDIN POST**
A small chart lesson from this week.

Our category screen shows a 6-month spending trend. The first version drew a light full-height "track" behind every month's bar, a pattern borrowed from progress bars, where the track means something: the remaining part of a whole.

In a month-by-month chart there is no whole. The tracks were decoration that read as data: every month looked tall, including months with zero spending.

The fix was mostly deletion. Bars now rise from a shared baseline. A month with zero spend draws a quiet 4px tick, because zero is a real measurement and deserves a mark, just not a monument. Tiny amounts keep a 6% height floor so they stay visible next to the biggest month.

The principle: every pixel that looks like data will be read as data. If it is not data, delete it.

VISUAL NOTE: side-by-side of the old ghost-track chart and the new baseline version.

---

### P4 PRODUCT AND DESIGN JUDGMENT — A save is not a start

**TWITTER POST**
We moved Save to the top-right of every form sheet in our app. One shared header component, disabled until valid, no Cancel button.

But "Start breaking this habit" stayed at the bottom, in the thumb zone.

A save commits a form. A start commits a decision. Different moments, different placement.

VISUAL NOTE: two screenshots side by side, a form sheet with header save vs the decision sheet with its bottom CTA.

---

**LINKEDIN POST**
We just unified the save pattern across our finance app, and the most useful part was deciding what NOT to unify.

Every form sheet (log an expense, add a category, edit a value) now shares one header: title on the left, Save on the top-right, disabled until the form is valid, with the reason read out to screen readers. The in-sheet Cancel buttons are gone; the sheet itself already dismisses three ways.

But two sheets kept their big bottom buttons: the ones where you commit to breaking a spending habit. We wrote the distinction into the decision record: a save commits a form, a start commits a decision. Decision moments earn thumb-zone prominence and a bigger title; utility moments get quiet, consistent chrome.

Consistency is not sameness. It is the same reasoning applied everywhere, which sometimes produces different designs.

VISUAL NOTE: the ADR excerpt with the form-vs-decision vocabulary, over the two sheet screenshots.

---

### P5 BUILDING WITH AI HONESTLY — The rename that found a bug, and the bots now on payroll

**TWITTER POST**
Renamed two categories today ("Mortgage/Rent" -> "Home"). The rename surfaced a latent bug: spend totals matched expenses by comparing STORED values against DISPLAY names. Equal strings by coincidence. The old name had been silently missing rows for weeks.

Renames are free audits.

VISUAL NOTE: NONE

---

**LINKEDIN POST**
Two honest notes from today's session with Claude.

First: a "trivial" rename was not. Changing "Mortgage/Rent" to "Home" surfaced a latent bug: our category screens matched expenses by comparing stored database values against display names, which only worked when the two happened to be equal strings. The old display name had been silently missing every stored row for weeks. The fix is a proper mapping layer with a test that pins the leak paths, including the one where a user names a custom category "Home" and would otherwise inherit the default's spending. Renames are free audits: they break every coincidence that was holding the system together.

Second: I put agents on a schedule. Three workers now run every six hours on their own branches (localization for 10 languages, iPad adaptation, monetization and legal prep), and a stronger model reviews all of them once a day: reads their commits, writes fix-it feedback into their handoff files, maintains a status board, and queues the decisions that are mine to make (like how "kept" translates into Japanese). None of them can merge. The interesting design constraint was not the automation, it was deciding which decisions must never be automated.

VISUAL NOTE: screenshot of the routine status board issue once the orchestrator seeds it.

CASE STUDY MOMENT
The form-vs-decision sheet vocabulary (ADR 0031) and the not-started-is-not-zero chips (ADR 0030) both came from user feedback screenshots and ended as named, reusable design rules: good material for a design-systems case study.


---

## 2026-09-06: Wrapped a half-finished feature as coming soon, and found the promise we could not keep

### Session scan

**Scope:** end of session
**Built this session:** Wrapped the CSV leak scan as "coming soon" rather than shipping it rough: one build-time gate makes the whole feature dormant while every line of it stays compiled and tested, the Insights segment became "Leak finder" with a Soon badge and a teaser that recruits people to help rebuild it, and onboarding dropped from three beats to two. Then a second pass fixed the state a returning opted-in user landed on, and checking whether we could actually honour the offer turned up an entitlement gap that blocks the feature's eventual ship.
**Pillar scores:** P1: Strong · P2: Strong · P3: Strong · P4: Strong · P5: Weak

---

### P1 CONCEPT DISCOVERED: an anonymous app cannot run a giveaway

**TWITTER POST**
Our app never calls identify(). Anonymous analytics, by design, on principle.

Then we shipped a "join the research, you could win six months" button and I realised: we can count how many hands went up. We can never know whose.

The privacy posture ate the growth mechanic.

VISUAL NOTE: the teaser screen with the reward line, next to the one-line analytics event definition showing an empty payload.

---

**LINKEDIN POST**
We put a research sign-up inside our app last week. Tap a button, help us rebuild a feature, you could win six months free.

Then I went to build the part that contacts people, and found there was nothing to build with.

Our analytics runs in anonymous device-ID mode as a deliberate privacy choice. We never call identify(). The event that fires when someone opts in carries no payload at all. That was a decision we were proud of.

It also means we can count how many people raised their hand and never learn whose hand it was. No draw can be run. No winner can be told. Each device knows only about itself.

So the offer changed shape. Not "you could win", but "everyone who opts in gets it", because that is the only version the product can actually deliver without a backend and without knowing who anyone is.

The privacy posture you choose early quietly decides which growth mechanics are available to you later. Worth knowing that before you write the copy.

VISUAL NOTE: NONE

---

CASE STUDY MOMENT
A privacy decision made months earlier silently invalidated a growth mechanic, and the fix was to change the promise rather than weaken the principle.

---

### P2 ITERATION WITH RATIONALE: the screen that kept inviting people who had already joined

**TWITTER POST**
Shipped an opt-in. Tap "Count me in", get a confirmation.

Came back to it and the invitation was still sitting there above the confirmation. "Join the research" on top of "you're on the list".

The pane was asking someone to join a thing they had already joined.

VISUAL NOTE: before and after of the teaser's confirmed state, invitation visible in the before.

---

**LINKEDIN POST**
A small bug that was not a bug, and what it taught me about states.

We built an opt-in: a button, and a confirmation once you tap it. Tested it, shipped it. Both states worked exactly as written.

Then I looked at what a returning user actually reads. The invitation line ("join the research, you could win six months") was still rendered above the confirmation, because nothing said to remove it. So the screen said, in order: here is an offer to join, and also you have joined.

Two states, each individually correct, composing into something slightly absurd.

The fix was to treat them as one slot rather than two elements. Before opting in the pane asks. After, it answers, and the answer carries the offer. The confirmation went from "thanks, this will land in this tab first" to "you're in, your six months is saved".

Most state bugs I find are not a state rendering wrong. They are two states that were never asked to sit in the same room.

VISUAL NOTE: side by side of the two confirmed states.

---

### P3 PLATFORM PATTERN: retiring a feature without deleting it, in Expo Router

**TWITTER POST**
Shelving a feature in Expo Router: deleting the screen is the wrong move.

Routes are file-based, so the deep link keeps resolving from anywhere that stored it. Keep the file, gate the default export, redirect when off.

The feature sleeps. The URL still answers.

VISUAL NOTE: the gated default export, ~8 lines, beside the deep link redirecting in the simulator.

---

**TWITTER THREAD**
Tweet 1: We shelved a whole feature this week: a CSV parser, its pipeline, its results screens, 273 tests. Deleted none of it. Here is the shape that made that safe.

Tweet 2: One build-time flag, and the rule that nothing may test the env var directly. Every gate imports the same constant, so one grep prints the complete list of places the feature can wake up. Stolen from our dev-menu gate.

Tweet 3: We left __DEV__ out of the condition on purpose. The dev menu wants to exist locally. A half-finished feature wants the opposite: what a developer sees running the bundler should be what a TestFlight user sees, or you reason about a flow nobody else has.

Tweet 4: The route itself keeps the whole flow compiled and its default export became a gate. Flag off, it redirects. Because file-based routing means the URL resolves whether or not anything links to it, and a route rendering half a retired flow is a crash we have already shipped once.

Tweet 5: Last piece, the one people skip: the shelved feature's own tests run with the gate mocked ON. Otherwise the code you carefully preserved quietly rots behind the flag and you find out months later.

Final tweet: Shelving is a design problem, not a deletion problem. Keep it compiled, keep it tested, make one grep tell you where it lives, and make waking it up a one-line change.

VISUAL NOTE: tweet 2, the grep output listing every gate.

---

**LINKEDIN POST**
We shelved a feature this week without deleting a line of it. The reasoning is worth writing down.

The feature was a bank-statement scanner: a nine-stage pipeline, an intake flow, a results screen, a rule store, 273 tests. It works, mostly. It also has problems that need real time, and it sat on the path a brand new user walks first. Shipping it rough was the worst option. Deleting it and rebuilding later was the second worst.

So it went dormant instead:

One build-time flag gates it, and nothing anywhere is allowed to test the environment variable directly. Everything imports the same constant, so a single grep prints every place the feature can wake up.

We deliberately left the development check out of that condition. Our dev-menu gate includes one, because the dev menu should exist locally. This is the opposite case: a developer running the app should see what a tester sees, or you spend a week reasoning about a flow no user can reach.

The route keeps the whole flow compiled, and its entry point became a gate that redirects when the flag is off. In a file-based router the URL resolves whether or not anything links to it, and a screen that renders half a retired flow is a crash we have shipped before.

And the part that is easy to skip: the shelved feature's own tests still run, with the gate mocked on. Preserved code that nothing exercises is not preserved, it is just code that has not failed yet.

Waking it up is one line in a local env file.

VISUAL NOTE: the grep output showing the complete gate list.

---

CASE STUDY MOMENT
A feature was taken off every user-facing path in one change while remaining fully compiled and tested, so the eventual rework starts from working code rather than from scratch.

---

### P4 PRODUCT AND DESIGN JUDGMENT: the primitive we refused to widen

**TWITTER POST**
Our empty-state component is deliberately three things: art, one line, a text link.

The new screen needed six. Explanation, invitation, reward, remembered confirmation.

Widening the primitive would have made "one line" negotiable for every other screen. So it got its own component.

VISUAL NOTE: the component's design record showing the rule and the exception logged beneath it.

---

**LINKEDIN POST**
We have a rule that every empty state in our app is exactly three things: a piece of art, one line of copy, and a text link. It took a full design pass to get there, because before that we had four different treatments and two icon sizes.

This week a screen needed more. It had to explain a feature that does not exist yet, invite people into research, name an offer, and remember that you had accepted so it never asks twice. Six parts, not three.

The tempting move is to add props to the shared component. It is one exception, the code already nearly supports it, and nobody would notice.

What you actually spend, doing that, is the rule. Once the primitive can carry six things, "one line" becomes a preference rather than a constraint, and the next screen only has to be a slightly smaller exception to justify itself. The drift we removed comes back through the component that was supposed to prevent it.

So it became its own component, borrowing the shared proportions so the screens still feel like one family, with the exception written into the design record where the next person will see it.

A constraint survives exactly as long as you are willing to build the awkward thing instead of relaxing it.

VISUAL NOTE: the two screens side by side, showing they still read as the same family.

---

---

## 2026-09-06: Tab bar traded its pill for filled icons, Money and Insights learned to swipe, and four "unmerged" branches turned out to be nothing

### Session scan

**Scope:** end of session
**Built this session:** Two navigation changes, merged as PR #143. The bottom tab bar's selected state stopped being a bordered pill and became a filled glyph, which meant hand-authoring filled SVG variants for the two icons lucide cannot fill. Then Today's pane swipe was extracted into a shared hook and given to Money and Insights, which fixed a latent desync bug on the way. A proposed cross-page swipe was challenged and dropped. Afterwards, audited five branches that git reported as unmerged and deleted four of them.
**Pillar scores:** P1: Weak (the squash-merge illusion is a real concept but it is the same story as P5, logged there instead) · P2: Strong · P3: Strong · P4: Strong · P5: Strong
**P6:** not generated (not Friday, not requested)

---

### P2 ITERATION WITH RATIONALE: The design doc had already written the fix, a month before anyone asked for it

**TWITTER POST**
My tab bar marked the selected tab with a soft green pill. I was asked to make it look like iOS instead: filled icon, no background. Before touching it I read the component's design record, and found a line from the last person who worked on it: "if the border reads heavy at arm's length, fill-only is a one-line change." They had predicted the complaint and written down the escape hatch. The fix turned out to be bigger than their one line, the whole surface went rather than just its border, but they had already done the thinking.

VISUAL NOTE: the design record open beside the before/after tab bar, with that sentence highlighted.

---

**TWITTER THREAD**
Tweet 1: The best code comment I read this week was a prediction of a bug report that hadn't happened yet.
Tweet 2: My app's bottom tab bar marks the selected tab with a pale green pill behind the icon. My designer's note: the pill is ugly, make it a filled icon like iOS.
Tweet 3: Before changing it I read the component's design record. Every component in this app has one: what it is for, what was decided, what was rejected, what is still open.
Tweet 4: Under "Open" was this: "The pill's fill is 1.12:1 on white, so on its own it is faint; the border and the two weight changes carry most of the load. If the border reads heavy at arm's length, fill-only is a one-line change."
Tweet 5: They had already spotted the weakness, already known which direction the complaint would come from, and already scoped the fix. Written weeks before anyone objected.
Tweet 6: The record also told me what I was NOT allowed to break. The pill exists because active green and inactive grey measure 1.12:1 against each other. Colour alone cannot carry the selected state. Whatever replaced it had to survive being desaturated.
Tweet 7: So I removed the whole surface, not just the border, and made the selected glyph filled instead of outlined. Then I screenshotted the bar and desaturated it to check the selection was still obvious with no colour at all. It was, more obvious than the pill had been.
Final tweet: Design docs are usually written for the person who arrives with no context. The good ones are written for the person who arrives with a complaint.

VISUAL NOTE: tweet 7, the desaturated tab bar screenshot, solid glyph unmistakable against three outlines.

---

**LINKEDIN POST**
I was asked to change one visual detail in my app: the bottom navigation bar marked the selected tab with a pale green pill behind the icon, and it looked heavy. Make it a filled icon instead, like iOS.

Before I touched it I read the component's design record. In this codebase every component has one, listing what it is for, what was decided and why, what was rejected, and what is still unresolved.

Under "Open" I found a line written weeks earlier by whoever last worked on it: "if the border reads heavy at arm's length, fill-only is a one-line change."

They had predicted the exact complaint, from the exact direction it came, and pre-scoped the fix.

The same record also told me what I could not break. The pill was not decoration. Active green and inactive grey measure 1.12 to 1 against each other, so colour alone cannot signal which tab is selected, which matters for anyone with red-green colour blindness. The pill was there to carry the state without relying on hue.

So the constraint survived even though the solution did not. I removed the whole surface rather than just its border, made the selected icon filled and the others outlined, then took a screenshot and desaturated it to prove the selection was still obvious with no colour at all. It was clearer than the pill had ever been.

Documentation usually gets written for the newcomer who lacks context. The most useful documentation I have read lately was written for the person who would arrive with an objection.

VISUAL NOTE: three-panel image, the old pill, the new filled glyph, and the desaturated version proving the state survives.

---

CASE STUDY MOMENT
A living design record predicted its own component's redesign, scoped the fix, and preserved the accessibility constraint that would otherwise have been lost with the thing being replaced.

---

### P3 PLATFORM PATTERN: Half your icon set cannot be filled, and it fails silently

**TWITTER POST**
React Native tip that cost me an hour. lucide icons take a `fill` prop and forward it to every path. On a closed shape (a circle, a rect) you get exactly the filled version you wanted. On an open path, the renderer implicitly closes the shape first, so a wallet outline collapses into lumps and a trend arrow becomes two wedges. No warning, no error, just a wrong-looking icon. Two of my four tab icons had to be hand-drawn as filled variants.

VISUAL NOTE: side by side, the naive fill on Wallet and TrendingUp (broken blobs) next to the hand-authored versions.

---

**LINKEDIN POST**
A small platform lesson worth writing down.

I wanted my app's selected navigation tab to show a filled icon instead of an outlined one. The icon library supports this: pass a fill colour and it forwards it to every path in the glyph.

For two of my four icons that worked perfectly. A sun's centre is a circle and a grid is four rectangles, so filling them produced exactly the solid shapes I wanted, using the library's own geometry, which guaranteed the silhouette matched.

For the other two it produced garbage. A wallet and a trending-up arrow are drawn as open paths, lines rather than enclosed regions. When you fill an open path the renderer closes it first, so the wallet collapsed into two lumps and the arrow became a pair of wedges.

Nothing warned me. No error, no console message. Just an icon that looked wrong.

The fix was to hand-author filled variants for those two, tracing the library's own vertices so that switching between states changes the icon's weight and never its shape. The other two kept using the library's fill, because using its real geometry is strictly safer than redrawing it.

The general lesson: when a library offers one API across a set of assets, check whether the assets are actually uniform. Mine were not, and the failure mode was silent rather than loud.

VISUAL NOTE: the four tab icons in both states, with the two broken naive fills shown as the rejected attempt.

---

CASE STUDY MOMENT
An icon library's fill API worked on half a set and silently deformed the other half, because the underlying paths were open rather than closed.

---

### P4 PRODUCT AND DESIGN JUDGMENT: The feature I talked my client out of

**TWITTER POST**
My designer asked for swipe navigation: swipe past the last tab on a page and you move to the next page. It sounds obvious. I argued against it and he dropped it. The reason: a swipe would sometimes mean "next view of this page" and sometimes mean "you just left the page", with nothing on screen telling you which. And each page has a different number of views, so you can never learn where the cliff is. The bounce at the end is honest. Leaving is a surprise.

VISUAL NOTE: NONE.

---

**TWITTER THREAD**
Tweet 1: I spent an hour talking someone out of a feature they asked me to build. Writing down why, because saying no well is harder than building.
Tweet 2: The ask: my app has pages, and some pages have segments you swipe between. Swipe past the last segment and you should land on the next page. Continuous swipe navigation. It sounds obvious.
Tweet 3: Problem one. The same gesture would mean two different things depending on invisible state. Usually "next segment", occasionally "you have left this page entirely". Nothing on screen tells you which one your next swipe does.
Tweet 4: Problem two. Every page has a different number of segments. Two, three, two, none. So you can never build muscle memory for where the edge is. One swipe too many is a navigation error rather than a bounce.
Tweet 5: Problem three. Swiping right from near the left edge is the iOS back gesture. A right-swipe on the first segment would sit directly on top of a system habit.
Tweet 6: Problem four, the one that decided it. Building it properly needs a gesture library this codebase deliberately does not import, after two release crashes traced to the animation layer whose cause was never found.
Tweet 7: And who benefits? It saves one thumb-move for power users. It costs unpredictable page exits for everyone else, and screen reader users get nothing, since they navigate by the tab bar regardless.
Final tweet: The rubber-band bounce at the end of a list already tells the truth: that is all there is. Replacing an honest bounce with a surprise is not an upgrade.

VISUAL NOTE: tweet 8, a short screen recording of the swipe hitting the last segment and bouncing.

---

**LINKEDIN POST**
Part of doing this work well is occasionally declining to build what you were asked to build, and being able to explain why in terms the person who asked actually cares about.

The request was reasonable on its face. My app has pages, and several pages have segments you swipe between. Why not let a swipe past the last segment carry you into the next page? Continuous navigation, fewer taps.

I argued against it, for four reasons.

The gesture would become ambiguous. The same swipe would usually mean "show me the next segment" and occasionally mean "you have left this page", with nothing visible indicating which. Ambiguity in a gesture is not a small cost, because the user cannot check before committing.

There is no way to learn the boundary. The pages have two, three, two and zero segments. Muscle memory cannot form against an edge that moves.

It collides with a system gesture. Swiping right from the left edge is how iOS goes back. Users have that reflex already.

And building it properly required an animation library this codebase deliberately avoids, after two release-build crashes traced to that layer whose root cause was never confirmed. Adding it back for a convenience feature, on the navigation chrome of every screen, is a bad trade.

The last question settled it: who gains? Power users save one thumb movement. Everyone else risks unexpected page exits. Screen reader users gain nothing, because they navigate by the tab bar regardless.

The existing behaviour, a rubber-band bounce at the end, already communicates honestly that there is nothing further. We shipped the part that was clearly good, giving the remaining pages the same in-page swipe, and dropped the rest. The reasoning went into the design record so nobody re-proposes it without the context.

VISUAL NOTE: NONE.

---

CASE STUDY MOMENT
Challenged a requested navigation feature on usability, platform-convention and risk grounds, shipped the valuable half, and recorded the rejection so the idea cannot return uninformed.

---

### P5 BUILDING WITH AI HONESTLY: Four branches that looked like lost work, and my own miscount

**TWITTER POST**
Git told me four branches had unmerged commits. All four were fine. One was byte-identical to what had already merged, because squashing gives the work a new identity and leaves the original looking permanently unmerged. Two held only screenshots. The fourth had real code: an accessibility fix taking a green from 2.78:1 to 5.13:1, never merged, genuinely good. It was still safe to delete, because the palette moved on and the shipped colour now hits 5.37:1. Its goal arrived without it.

VISUAL NOTE: the three greens side by side as buttons, old, proposed, shipped, with contrast ratios.

---

**LINKEDIN POST**
A cleanup task turned into a lesson about trusting the tool that reports your state.

I asked git which branches held work that had never reached the main line. It named four. The instinct is to treat that as four pieces of work at risk.

Checking each one properly gave four different answers, and none of them was "lost work".

One was byte-identical to code already shipped. When you squash a branch on merge, the result is a new commit with a new identity, so the original branch keeps reporting that it is unmerged forever. The question git answers is about commit ancestry. The question I actually had was about content, which needs a different comparison.

Two contained only screenshots, three image files and no code at all.

The fourth was the interesting one. It held genuine, never-merged work: an accessibility fix taking an interactive green from 2.78:1 contrast up to 5.13:1, which is a real problem properly solved. It was still safe to delete, because the palette had since been reworked entirely and the colour that shipped clears 5.37:1. The goal arrived by another route, better than the branch that was opened for it.

Two things I would carry forward. First, when a tool reports a problem, confirm you and the tool are answering the same question. Second, I reported "four branches" to my collaborator, and after deleting them the same check surfaced eight more that my original framing had simply not covered. I had presented a scoped finding as if it were complete. Saying so afterwards was uncomfortable and necessary, because a cleanup that quietly leaves most of the mess is worse than one that names what remains.

VISUAL NOTE: the audit canvas, four branch cards each with its verdict, plus the greens comparison.

---

CASE STUDY MOMENT
An "unmerged work" alarm resolved to zero real risk, and the initial report was itself incomplete, which had to be corrected to the person relying on it.

---

---

## 2026-09-07: Cut 46 words to 17, and lost half an hour to a simulator that was lying

### Session scan

**Scope:** end of session
**Built this session:** Trimmed the Leak finder teaser body to one line on Charen's annotation, and rejected the alternative he offered (a drawer behind "Count me in") with the reasoning written into the component record. Published it to the installed TestFlight build as an OTA after checking the runtime matched. Then spent half an hour on a bug that was not a bug: a simulator showing old copy because its bundler had died.
**Pillar scores:** P1: Weak · P2: Strong · P3: Strong · P4: Strong · P5: None

---

### P2 ITERATION WITH RATIONALE: the option I was offered and turned down

**TWITTER POST**
Design feedback gave me two options: shorten the text, or move it into a drawer behind the button.

Took the shortening. The drawer would have made a one-tap action two taps, and added a third category to a sheet system that deliberately has two.

Cheaper answer, same problem solved.

VISUAL NOTE: the annotated screenshot with both options written on it, beside the shipped result.

---

**LINKEDIN POST**
The best design feedback gives you options. This week I got two and deliberately took the smaller one.

The screen was a coming-soon teaser with too much text under a large illustration. The note said: make this shorter, or move the detail into a drawer that opens when someone taps the button.

The drawer is the more interesting build. It keeps the screen clean, gives the explanation room to breathe, and turns the opt-in into a proper moment.

I turned it down for two reasons. It makes a one-tap action into two taps, on an action where the whole ask is "this is easy, just tap it". And our sheet system has exactly two families, forms that save something and decisions that confirm something. An explainer sheet is neither, so building one is not applying an existing pattern, it is adding a third category that every future screen can then point at.

Cutting the copy from 46 words to 17 solved the same problem for free.

I wrote the rejected option into the component's record with the reasoning, because in three months someone will look at that screen and have the drawer idea again. They should find the argument, not repeat it.

VISUAL NOTE: before and after of the pane.

---

CASE STUDY MOMENT
A design note offered a build and a copy edit as alternatives; choosing the copy edit avoided permanently widening a component taxonomy for one screen.

---

### P3 PLATFORM PATTERN: a dead dev server does not look like a dead dev server

**TWITTER POST**
"I see the old version in the simulator."

The bundler that simulator was pointed at had been dead for hours. React Native doesn't error when Metro dies. It just keeps rendering the last bundle it loaded. Forever. Silently.

You are reviewing a screenshot from the past.

VISUAL NOTE: the two simulators side by side, same screen, different copy.

---

**TWITTER THREAD**
Tweet 1: Shipped a copy change, verified it on the simulator, merged it. Then got told "I still see the old text". Both of us were right, and the reason is worth knowing if you run React Native.

Tweet 2: There were two simulators. Mine was pointed at a live bundler on one port. The one being looked at was pointed at a different port, from an earlier session, whose server had been shut down hours before.

Tweet 3: Here is the part that makes this expensive: a dead bundler does not produce an error, a blank screen, or a warning. The app keeps rendering the JS it already has in memory. It looks completely healthy. You are reviewing a screenshot from the past.

Tweet 4: Worse, my first instinct for checking was to grep the process list for the dev server. That returned matches. It was matching my own shell command containing the search string. The process count lied too.

Tweet 5: The only honest check is the port: does anything actually hold a listener on it. Not "is there a process that looks right".

Final tweet: If a UI change seems not to have landed, verify the pipe before you debug the code. Half an hour on a bug that was never in the code.

VISUAL NOTE: tweet 5, the port check returning nothing while the app on screen looks fine.

---

**LINKEDIN POST**
A debugging story with a lesson that generalises past mobile development.

I made a copy change, verified it on a simulator, merged it, and shipped it. Then I was told the old text was still showing. I had a screenshot proving it worked. So did they, proving it did not.

Two simulators were running. Mine talked to a live bundler. Theirs was pointed at a different port from an earlier session, and that server had been shut down hours earlier.

When a React Native bundler dies, the app does not error, blank out, or warn. It keeps rendering the JavaScript it already loaded, indefinitely. It looks perfectly healthy. You are looking at a screenshot from the past with no indication that time has passed.

My first diagnostic instinct made it worse. I searched the process list for the dev server and got matches, which felt like proof it was alive. It was matching my own search command. The tool I reached for to check reality was reporting itself back to me.

The reliable check was the port: is anything actually listening. Not "does a process exist that looks like the right one".

The generalisable lesson: when output seems stale, verify the pipe before you debug the thing at the end of it. Stale-but-plausible is a far more expensive failure than loud-and-broken, because nothing prompts you to distrust what you are seeing. It is now written into our project memory as a named trap, because the setup that caused it (two working copies, two simulators) is our normal way of working.

VISUAL NOTE: NONE

---

CASE STUDY MOMENT
A "the change did not land" report turned out to be a silently stale dev server; the diagnosis is now a named trap in project memory because the multi-worktree setup that causes it is standard here.

---

### P4 PRODUCT AND DESIGN JUDGMENT: which sentence survives the cut

**TWITTER POST**
Cutting a paragraph to one line, the question is not "what is shortest". It is "what does this sentence carry that nothing else does".

Kept: "Nothing uploads, ever." Every other surface that used to say it is now behind a feature flag.

Cut the rest.

VISUAL NOTE: the old paragraph with the surviving sentence highlighted.

---

**LINKEDIN POST**
Cutting copy is usually framed as trimming fat. It is more useful to treat it as an audit of where each promise lives.

I had a 46-word paragraph to get down to one line. Three things were in it: what the feature does, a privacy promise, and an invitation to help build it.

The invitation went, because the very next line on screen already said "join the research".

The timing signal went, because there is a "Soon" badge four inches above it.

The privacy promise stayed, and not because it was the most persuasive. Because when I checked where else the app says "nothing uploads, ever", the answer was nowhere. The two screens that used to repeat it are both behind a feature flag now, dormant. That sentence had quietly become load-bearing on this one pane while nobody was watching.

That is the real question when cutting: not which sentence is best, but which one is the only place something is said. The rest is duplication you can afford to lose.

VISUAL NOTE: the before and after, with the surviving sentence marked.

---

---

## 2026-09-07: Two docks became one shape in two voices, the explainer moved behind a link, every zero state learned to centre, and the log stopped cutting off

### Session scan

**Scope:** end of session
**Built this session:** Three PRs on Today, each from Charen's annotated screenshots. The two bottom docks became one structure at one fixed height, then got two skins when the solid version read as a duplicate composer on the device. The Kept zero state dropped its three-step explainer and its log CTA for a single underlined link that opens a how-it-works sheet. EmptyState's fill mode gained real centring and a block-height floor so illustrations stop jumping between panes. A static SVG fade now dissolves long lists into the dock, and the "Kept so far" band left Today. TestFlight build 22 went out from main.
**Pillar scores:** P1: Strong · P2: Strong · P3: Strong · P4: Strong · P5: Strong
**P6:** not generated (not Friday, not requested)

---

### P1 CONCEPT DISCOVERED: Centring a stack does not anchor the picture

**TWITTER POST**
Bug that looked like a spacing nudge and was not. Three tabs each show an illustration, a title, a link, centred in the pane. Swipe between them and the illustration jumps. Why: centring centres the whole stack, and a one-line title makes a shorter stack than a two-line one, so the picture lands higher or lower depending on the words under it. Fix was not "align the art", it was "give every block the same minimum height". Same words, same y, forever.

VISUAL NOTE: three-pane strip, before (art at three heights) and after (one height), with the title line counts labelled.

---

**LINKEDIN POST**
A small layout lesson that took me a morning to see properly.

Three panes in my app each show a zero state: an illustration, a one-line hook, a text link, vertically centred. My designer swiped between them and the illustration visibly hopped up and down. The obvious fix is to nudge the art until it lines up.

The real cause was that "centred" centres the whole stack. One pane's hook fits on one line, another wraps to two, so the stacks are different heights, so the centre point moves, so the picture moves with it. Nothing was misaligned. The maths was doing exactly what it was told.

The fix was to stop centring the stack and start flooring the block: every zero state gets the same minimum height, sized for the tallest normal case, with the art pinned to the block's top. Now the stack can be a line taller or shorter and the picture never moves. Under large accessibility text the block grows past the floor, which is fine, because a floor is a minimum, never a clip.

What I keep from it: when the same element lands in different places on sibling screens, ask what the layout is centring, not where the element is.

VISUAL NOTE: two diagrams, "centred stack" with the art at two heights, "floored block" with the art at one.

---

CASE STUDY MOMENT
Replaced per-pane centring with a shared block-height floor so the illustration stays put across a swipe, and pinned it with a geometry test.

---

### P2 ITERATION WITH RATIONALE: One shape, two voices

**TWITTER POST**
Morning: my designer asked for the two buttons at the bottom of a screen to be structurally identical. I made them one component, same shell, same height. Afternoon, on the phone: the second one now read as a duplicate of the first. Same designer: keep the structure, change the skin. Dashed edge instead of solid, a quiet plus instead of a filled one. The reversal was not a mistake. You cannot judge a skin until the structure underneath it is settled.

VISUAL NOTE: three states of the Kept dock in a row, dashed original, solid midday, dashed-with-plain-plus final.

---

**TWITTER THREAD**
Tweet 1: I shipped a design change at noon and reversed half of it by four. Both halves were right. Here is why.
Tweet 2: The screen has two bottom docks, one swipe apart. One held an amount field and a filled green plus. The other was a dashed pill with an icon and text. Different shapes, different heights. The designer wanted them structurally the same.
Tweet 3: So I built one shell: a pill, a fixed-height field, a round button, and put both docks on it. Same height to the point. The swipe stopped jumping. Shipped.
Tweet 4: Then the designer used it on the phone. "Break your first habit" now looked exactly like "add an expense". Same shell, same green, same weight. Two different actions, one voice.
Tweet 5: The fix was not to undo the morning. The structure was right; the skin was wrong. The second dock got its dashed edge back and a plain plus instead of a filled one. Same field, same button, same 74pt.
Tweet 6: One detail: the dashed edge is 1.5pt where the solid edge is 1pt. That would have made the second dock one point taller, which is a visible jump across a swipe. So the dashed version pays the half point out of its padding, and a test pins both totals equal.
Final tweet: Structure and skin are two decisions. You can only judge the second once the first is settled, and the only place to judge it is in your hand.

VISUAL NOTE: tweet 5, the two docks side by side, solid and dashed, at identical height.

---

**LINKEDIN POST**
I reversed part of my own work within four hours today, and I think the sequence was correct.

Morning brief: two bottom docks on the same screen, one swipe apart, looked like they came from different apps. One was a card with an amount field and a filled green button. The other was a dashed pill with an icon and two lines of text. Different shapes, different heights. Make them structurally consistent.

So I built one shell and put both docks on it: a pill container, a field at a fixed height, a round button. The heights matched to the point, and swiping between the panes no longer moved the chrome. Shipped.

Then the designer picked up the phone. With both docks solid and green, "Break your first habit" read as a second copy of the add-expense composer. Same shell, same colour, same weight, two different jobs.

The reversal was surgical. The structure stayed. The second dock got its dashed edge back, which is what this app uses to mean "add another", and a plain plus instead of a filled one. Same field, same button, same height. One shape, two voices.

The part I would not have got right without shipping the first version: a 1.5pt dashed edge against a 1pt solid one would have made the second dock a point taller, which is exactly the jump we had just removed. So the dashed skin pays that half point out of its padding, and a test derives both totals and pins them equal.

Structure and skin are separate decisions, and you cannot evaluate the second until the first is settled. The place to evaluate it is in someone's hand, not in a mockup.

VISUAL NOTE: the two final docks side by side with their heights annotated.

---

CASE STUDY MOMENT
Same-day reversal of a dock skin after the structural change proved right in the hand, with height parity preserved by construction.

---

### P3 PLATFORM PATTERN: The gradient library was the wrong one for the first screen

**TWITTER POST**
Needed a fade at the bottom of a list. The obvious library was already installed and already used elsewhere in the app. I used a different one on purpose. Reason: an unexplained launch crash from a past release, whose only native change was two modules. One of them already renders on the first screen (every tab icon). The other renders only inside things you open. A fade on the first screen must not be what adds a new module to the launch path. Same pixels, different risk.

VISUAL NOTE: NONE.

---

**LINKEDIN POST**
A choice between two libraries that produce identical pixels, decided by something that is not in either library's docs.

I needed a small vertical fade so a long list dissolves into the bar below it instead of cutting off. The app already had a gradient library installed, already used on two screens. Reaching for it would have taken five minutes.

I reached for the SVG library instead, which is more verbose and needs a workaround for gradient ids. Here is why.

Months ago a release build crashed on launch and the cause was never confirmed. The only native difference between the last good build and the bad one was those two libraries being added. One of them, the SVG one, already renders on the first screen today, in every tab bar icon. The other, the gradient one, renders only inside things a user opens: a paywall, a sheet. It has never rendered in the launch path.

A fade on the first screen would change that. If the crash ever came back, the first question would be "what changed about launch", and the answer would be me, for a fade.

Two smaller things fell out of the SVG route. Gradient ids in that library are global across every SVG on screen, so two fades on two mounted panes need distinct ids. And the testing library cannot see gradient stops at all, because the library folds them into a native array before the host tree exists, so the contract had to be tested at the component level rather than the rendered one.

The general shape: when two tools give the same output, the difference is in what they touch that you cannot see.

VISUAL NOTE: NONE.

---

CASE STUDY MOMENT
Chose the SVG library over the installed gradient library for a first-screen fade to keep the launch render path's native module set unchanged while an incident stays open.

---

### P4 PRODUCT AND DESIGN JUDGMENT: The nicer version was the wrong version

**TWITTER POST**
Two ways to build a bottom fade. Static: always on, sized so the last row stays readable when you reach the end. Dynamic: dissolves as you scroll to the end, which looks better. I recommended static, and the reason was not effort. The dynamic one would be this app's first scroll-driven UI, in a codebase that deliberately has none after two release crashes in the animation layer. A feature is not just what it does. It is what it opens the door to.

VISUAL NOTE: short clip of the static fade over a long list, scrolled to the end, last row readable.

---

**LINKEDIN POST**
The better-looking option lost today, and I argued for the loss.

I was adding a fade at the bottom of a scrolling list so it dissolves into the bar beneath it. There are two ways. A static fade is always there, and you size it against the list's end padding so the final row is still readable when you scroll to the bottom. A dynamic fade tracks the scroll position and disappears as you reach the end. The dynamic one is nicer. Every polished app does it.

I recommended the static one, and the designer took it.

The reason was not the extra work. This codebase has no scroll-driven UI at all, on purpose. Two release builds crashed in the animation layer, the root cause was never found, and since then every animation follows a short list of rules and the dock component's own record says scroll-driven behaviour needs its own decision record and a release-build boot walk before it ships. The dynamic fade would have been the first exception, on the first screen, for a visual nicety.

So the static fade ships now, sized so nothing readable is ever under the dark part of it, and the dynamic version is written down as the follow-up, with the conditions it has to meet.

The judgment I keep coming back to: a feature is not only what it does on screen. It is also what it makes easier to do next. The first scroll-driven effect is a much bigger decision than the second one.

VISUAL NOTE: NONE.

---

CASE STUDY MOMENT
Shipped the static fade over the scroll-aware one to avoid introducing the app's first scroll-driven UI under an open crash incident, and recorded the dynamic version as a gated follow-up.

---

### P5 BUILDING WITH AI HONESTLY: The screen stopped matching my taps, and I merged one thing too early

**TWITTER POST**
Two confessions from today. My simulator taps started landing as small drags after a connection reset, so pages flipped and tabs changed without me asking, and for a while I was reasoning about a screen state I no longer had. The fix was to stop guessing, screenshot for ground truth, and switch to explicit touch paths. Second: I merged one pull request the moment it was mergeable, and the CI check had not registered yet. It passed on main afterwards. The order was still wrong, and I changed it for the next two.

VISUAL NOTE: NONE.

---

**TWITTER THREAD**
Tweet 1: Two things went sideways today that I would rather write down than tidy away.
Tweet 2: First, the tooling. After one tap timed out, every tap the simulator tool sent afterwards carried a phantom drag from the previous touch. A tap on a segment moved the pager a page. A tap on a tab landed on the next tab over.
Tweet 3: For several turns I explained the screenshots to myself instead of doubting the tool. "Money must have remembered its last pane." "That swipe must have bounced." Each story fit one screenshot and broke on the next.
Tweet 4: What ended it was refusing to reason further and taking one screenshot for ground truth. Then explicit touch paths, down and up at the same point, which delivered cleanly every time. Later the tool lost its port entirely and the app's own deep link got me to the pane instead.
Tweet 5: Second, process. I merged a pull request the instant GitHub called it mergeable. The CI check had not registered yet; it takes about twenty seconds after a push. The check then ran on the merge commit and passed.
Tweet 6: Passed is not the point. The rule is merge on green, and I merged on "no red yet". For the next two pull requests I polled until a check existed, watched it, and merged only on pass.
Final tweet: Both were the same mistake in different clothes: acting on the absence of a signal as if it were the signal.

VISUAL NOTE: NONE.

---

**LINKEDIN POST**
Two honest notes from a productive day, because the productive part is easy to write about and these are not.

The first is about tools. Partway through a verification pass, one simulator tap timed out with a connection reset. Every tap after that quietly carried a small drag from wherever the previous touch had been. A tap meant to select a segment moved a pager. A tap on one tab landed on its neighbour. For several steps I explained each surprising screenshot with a plausible story about app state, and each story broke on the next screenshot. What actually resolved it was refusing to reason further, taking a single screenshot for ground truth, and switching to explicit touch paths that specify the down and the up. Later the tool lost its connection to the device entirely, and the app's own deep link did the navigation instead. I wrote the whole thing down so the next session does not lose the same hour.

The second is about process. The rule on this project is that a pull request merges when its checks are green. I merged one the moment GitHub reported it mergeable, and the CI check had not registered yet, because it takes about twenty seconds after a push to appear. The check then ran on the merge commit and passed. That does not make the order right. For the next two pull requests I polled until a check existed, watched it to completion, and merged only on a pass.

Both are the same error wearing different clothes: treating the absence of a signal as if it were the signal. No warning is not the same as all clear.

VISUAL NOTE: NONE.

---

CASE STUDY MOMENT
Recognised tool-input drift from contradictory screenshots, fell back to ground-truth captures and explicit touch paths, and corrected a merge-before-CI ordering on the next two pull requests.

---

---

## 2026-09-10 — Sheet platform clamp, break sheet redesign, card simplification, and the leak funnel that stopped promising

### Session scan

**Scope:** end of session
**Built this session:** Three annotation sets from the designer became two merged PRs in one day: a platform-wide bottom-sheet rule (never past 80% of the screen, keyboard included, pinned title and footer), a redesigned break-habit sheet with mandatory names for impulse habits, a check-in card stripped to its habit loop with a new dollar-dot language, and a leak funnel where candidate rows replace a numeric progress meter. Also found and fixed a device bug a parallel session had flagged: starting a habit erased the habit while saving its goal.
**Pillar scores:** P1: Strong · P2: Weak · P3: Strong · P4: Strong · P5: Strong

---

### P1 CONCEPT DISCOVERED — The progress bar that could not keep its promise

**TWITTER POST**
We killed a progress bar today. It said "2 of 4 logs at the same place" and filled toward a leak detection. The problem: the count and the detection disagree. Detection also applies a confidence floor and a minimum monthly spend, so the bar could reach 4 of 4, sit at 100%, and say "keep logging" forever. A progress bar is a promise about what happens at the end. If the system cannot keep that promise, the bar is not simplification, it is a lie with good typography. We replaced it with evidence: rows that show your actual buys and grow a Break button only when detection really fires.

VISUAL NOTE: Before/after pair: the full "4 of 4 logs" meter next to the new candidate row with its 7-day strip.

---

**TWITTER THREAD**
Tweet 1: We shipped a progress bar that could reach 100% and stay there forever. Today we killed it, and the reason generalizes.
Tweet 2: The bar counted logs at one merchant: "2 of 4 logs at the same place." Four logs was the detection threshold, so the bar filled toward a promised moment: your leak gets found.
Tweet 3: Except the count was not the whole gate. Detection also applies a confidence floor (four scattered logs score 0.45 against a 0.5 floor) and a minimum monthly spend. And dismissing a found leak removes it permanently, which drops you back onto a full bar.
Tweet 4: So the honest states of that bar included "100%, nothing happened, keep logging." A user cannot tell that apart from "broken." We could not fix the copy, because the copy was not the problem. The promise was.
Tweet 5: The replacement makes no promise. A merchant with two logs becomes a row showing real evidence: which of the last 7 days had a buy, how much so far. When detection actually fires, the same row grows a Break button in place.
Final tweet: A progress bar is a contract about its own last pixel. If any hidden gate sits between 100% and the payoff, show evidence instead of progress.

VISUAL NOTE: Tweet 3 wants the two-line math: 4 logs, confidence 0.45, floor 0.5.

---

**LINKEDIN POST**
Today we deleted a well-meaning progress bar, and I think the reasoning applies to most product funnels.

The bar counted how many times you had logged spending at one merchant: "2 of 4 logs at the same place," filling toward the moment the app names your leak. Four was the real detection threshold, so this looked like honest progress.

It was not, because the count was not the whole gate. Detection also applies a confidence floor that exactly four scattered logs cannot pass, and a minimum monthly spend. Dismissing a found leak removes it permanently, which lands you back on a full bar. So the bar had a reachable state that read "100%, keep logging" and meant nothing. The designer flagged it from screenshots before any of us traced the code; the code trace showed it was worse than the screenshots suggested.

The fix was not better copy. It was withdrawing the promise. A merchant now earns a compact row at its second log, showing evidence rather than progress: which of the last seven days had a buy, and the observed total. When detection genuinely fires, that same row grows its Break button in place. Nothing counts toward a moment the system might not deliver.

The principle I took away: a progress bar is a contract about what happens at its last pixel. If any hidden gate sits between 100% and the payoff, show the user their own evidence instead.

VISUAL NOTE: The before/after pair, meter versus candidate row.

---

CASE STUDY MOMENT
Replaced a numeric detection meter, whose full-bar state was reachable and permanent, with evidence rows that graduate into the action only when the system can actually deliver it.

---

### P3 PLATFORM PATTERN — One height rule for every drawer

**TWITTER POST**
Audit finding: eight bottom sheets each carried their own max-height cap (0.82 or 0.86 of the window), five had no cap at all, and every cap measured the full window, so the software keyboard still pushed tall sheets off the top of the screen with the drag handle invisible. The fix was one pure function: a sheet is at most 80% of the window, and with the keyboard up, at most the visible strip above it. The keyboard height comes from where its top edge lands, not from trusting a resize event, so the same math holds on iOS and Android. Fifteen call sites deleted their local rules.

VISUAL NOTE: The break sheet with the keyboard up, handle and title still visible above it.

---

**LINKEDIN POST**
A platform lesson from this week: when the same constant appears eight times with two different values, neither value is the design.

Our bottom sheets each capped their own height: some at 82% of the window, some at 86%, five not at all. Every cap measured the full window height, which the software keyboard does not respect, so a tall sheet with the keyboard open slid off the top of the screen and took its drag handle with it. The designer's screenshot of that state is what opened the whole audit.

The replacement is one pure function in one file: a sheet never exceeds 80% of the window, and with the keyboard up it is clamped to the visible strip above the keyboard, with a floor so landscape cannot crush it. Keyboard height is derived from where the keyboard's top edge lands on screen rather than from trusting a resize event, which makes the same arithmetic correct on both platforms, including inside a translucent modal that Android never resizes. Because it is a pure function, the height rule has unit tests, which none of the eight scattered constants ever had.

The structural half of the same change: the sheet primitive now owns the body scroll and a pinned footer slot, so titles stay visible, buttons stay reachable, and a negative-margin hack that one sheet used to stick its keyboard bar in place got deleted rather than documented.

Fifteen call sites migrated. The pattern: when a rule matters, it should exist exactly once, in a form a test can hold.

VISUAL NOTE: NONE.

---

CASE STUDY MOMENT
Replaced eight per-sheet height caps and five uncapped sheets with one keyboard-aware, unit-tested height rule in the sheet primitive, then migrated all fifteen usages.

---

### P4 PRODUCT AND DESIGN JUDGMENT — Green is for the win, so the mock's legend got inverted

**TWITTER POST**
The designer proposed dollar-sign dots for the habit card: green dollar for a day you spent, gray for a day you skipped. I pushed back on the colors, not the glyph. This app has one hard palette rule: green marks the win, never the spend. So we shipped the inverse of the mock's legend: green dollar for money KEPT on the habit card, neutral gray dollar for spend evidence on the leak rows. Now the whole app reads as one sentence: gray dollars are money leaving, green dollars are money you decided to keep.

VISUAL NOTE: The two strips side by side: leak row (gray dollars) above the habit card (green dollars).

---

**LINKEDIN POST**
A small design decision I want to remember, because it is the kind that compounds.

The designer sketched a new visual for habit tracking: seven circles for the week, a dollar sign in each, green when filled. In the sketch, green meant "you spent that day." The glyph was right, and the instinct to unify the visual language across the tracking card and the leak list was right. The colors could not ship, because this product has one locked palette rule: green is positive only. Green is the brand, the kept total, the win. A green dot celebrating a purchase would quietly teach users the opposite of what the product stands for.

So we shipped the inverse of the sketch's legend. On the habit card, a green dollar fills a day you skipped: money kept. On the leak rows, a muted gray dollar marks a day you bought: evidence, not judgment, and definitely not a reward. Slips stay flat and neutral, never red, because a slip is information.

What I like about the outcome is that the whole app now speaks one sentence with color: gray dollars are money leaving, green dollars are money you decided to keep. The designer took the inversion immediately once the rule was named. Consistency rules earn their keep on exactly these days: they turn a taste argument into a lookup.

VISUAL NOTE: The two strips side by side.

---

CASE STUDY MOMENT
Adopted the designer's dollar-dot proposal but inverted its color legend to honor the green-positive-only rule, producing one consistent money-color language across tracking and evidence surfaces.

---

### P5 BUILDING WITH AI HONESTLY — Two agents, one repo, one simulator

**TWITTER POST**
Honest notes from a day with two AI sessions on one codebase. Main moved five PRs while I built, including a refactor that relocated the exact function I was editing; the rebase meant re-applying my change inside their new shared hook. Our shared simulator kept dialing the other session's bundler no matter what I wrote to its config; the durable fix was claiming a separate device and naming it on every single tool call, because one screenshot tool defaulted to the other session's screen and I briefly debugged their app believing it was mine. And the best catch was not mine: the other session left a note that a green test suite was hiding a broken device flow. It was right.

VISUAL NOTE: NONE.

---

**TWITTER THREAD**
Tweet 1: Ran two AI coding sessions against one repo and one Mac today. What broke was never the code. It was every assumption about what "my environment" meant.
Tweet 2: Main moved five pull requests while I worked, one of which extracted the exact code path I was modifying into a new shared hook. The rebase was fine because both sides changed things for stated reasons; my edit moved into their hook rather than fighting it.
Tweet 3: The simulator was worse. The app on our shared device kept fetching JavaScript from the other session's bundler port, even after I rewrote the setting that controls it and cold-started the app. A clean reinstall fixed it once. Then it reverted.
Tweet 4: I stopped fighting for the device and claimed a different one. And started passing the device id on every tool call, because the screenshot tool defaults to some booted device, and one of my screenshots was silently the other session's screen. I reasoned about it as mine for a full step.
Tweet 5: The redeeming part: the other session had left a written note that a habit-creation flow was broken on device while its test suite stayed green, because the tests mock the data layer. The note was exactly right, and it saved me an hour of disbelief when I hit the same wall.
Final tweet: Multi-agent coding works when the agents leave each other evidence: notes, records, regression tests against real providers. It fails when they share mutable state silently, like a simulator, a port, or an assumption.

VISUAL NOTE: NONE.

---

**LINKEDIN POST**
Notes from running two AI coding sessions against one repository, because the failure modes were not where I expected.

The code part went fine. Main absorbed five pull requests from the other session while I built mine, including a refactor that moved the exact function I was editing into a new shared hook. The rebase resolved cleanly because both sides had written down why they changed what they changed, and my edit belonged inside their new structure rather than beside it.

The environment part is where the honesty goes. The two sessions shared one iOS simulator, and the app on it kept loading code from the other session's bundler even after I rewrote the setting that points it at mine and cold-started it. A clean reinstall fixed it exactly once. The durable fix was to stop sharing: boot a dedicated device, and pass its identifier on every single tool call, because the screenshot tool falls back to some booted device and one of my screenshots was silently the other session's screen. I spent a step reasoning about an app state that was never mine.

The best moment belonged to the other session. It had left a written warning that a habit-creation flow wrote its goal but lost the habit on a real device while the test suite stayed green, because those tests mock the data layer. The warning was precise and correct. I reproduced it live, traced it to a stale closure overwriting freshly written state, fixed it, and pinned the regression against the real provider so a mock can never hide it again.

Multi-agent development seems to work on one condition: the agents leave each other evidence. Written findings, decision records, regression tests that touch real code paths. What breaks it is silently shared mutable state, whether that is a simulator, a port, or an untested assumption.

VISUAL NOTE: NONE.

---

CASE STUDY MOMENT
Reproduced and fixed a device-only data-loss bug flagged by a parallel session, pinned the regression against the real provider, and established dedicated-device discipline for multi-session simulator work.

---

---

## 2026-09-11 ## 2026-09-11: The app was making the user invent a number, and then reading it back to them as a prediction

### Session scan

**Scope:** end of session
**Built this session:** Money > Upcoming rebuilt across eight stacked PRs (#165 to #172), all merged to main the same day and all OTA-eligible. The pane's arithmetic now reconciles at three levels; the engine learned `datePrecision` so a bill can know its month but not its day; Yearly got a month and day anchor; a bill can carry its own glyph; and an unknown-day bill reaches the ledger by asking the user rather than guessing. 120 suites, 1325 tests, tsc clean, lint 0 errors. TestFlight build 25 started from main.
**Pillar scores:** P1: Strong · P2: Strong · P3: Strong · P4: Strong · P5: Strong

---

### P4 PRODUCT AND DESIGN JUDGMENT: The date field that forced a lie

**TWITTER POST**

My user told me the bug: "I didn't know when the bill was due, so I picked "in 15 days". Later the list read like it really was happening in 15 days."

The app forced a date. So it made them invent a number, then rendered the invention back at them as a confident prediction.

VISUAL NOTE: the Upcoming row before and after, showing "next Sep 26" vs the row with no date under a SEPTEMBER header.

---

**TWITTER THREAD**

Tweet 1: My user found a bug I'd have never written a test for. The form forced a date. He didn't know the date. So they guessed, and the app read that guess back to them as a prediction.

Tweet 2: Every other screen in this app refuses to invent numbers. I'd spent the whole week removing fabricated figures from this exact pane. And here it was outsourcing the fabrication to the user.

Tweet 3: Their framing is what made it fixable: the cadence does the bucketing, only the day is unknown. A monthly bill still lands in every month. It still counts. It just doesn't claim a day.

Tweet 4: So precision became a field. 'day' or 'month'. Not a sentinel date, because a sentinel puts the meaning in a value every date comparison silently participates in. A named field means an untaught consumer fails at review, not at runtime.

Final tweet: A form that won't let you say "I don't know" doesn't collect better data. It collects confident garbage.

VISUAL NOTE: tweet 3, the "I don't know" chip sitting beside 1st / 15th / 30th / Last day.

---

**LINKEDIN POST**

A user told me about a bug that no test would have caught.

Adding an upcoming bill, they didn't know the exact date it would land. The form required one. So they picked "in 15 days" more or less at random. Later, scanning the list, they read that row back as a real prediction, because that is exactly what it looked like.

The app had made them invent a number, and then presented the invention to them as a fact.

What made it solvable was their own framing: the cadence does the bucketing, and only the day is unknown. A monthly bill still lands in every month and still counts toward the total. It just does not claim a particular day.

So date precision became an explicit field rather than a guess encoded in the date itself. The alternative, a sentinel date, would have hidden the meaning inside a value that every date comparison in the app silently participates in. A named field means the next screen that has not been taught about precision breaks in code review instead of in production.

The lesson I keep relearning: a form that will not let someone say "I don't know" does not get better data. It gets confident garbage.

VISUAL NOTE: the sheet with the "I don't know" chip, and the resulting row with no date under a month header.

---

CASE STUDY MOMENT
A user's workaround (picking an arbitrary date) exposed that the product was manufacturing false confidence, and the fix was a new data concept rather than a new control.

---

### P1 CONCEPT DISCOVERED: Precision is a property of a value, not a value

**TWITTER POST**

"I know the month but not the day" is not a missing date. It is a date at a different resolution.

Once I stopped trying to encode that IN the date and gave it its own field, four guards fell out of it and the grouping code needed no change at all.

VISUAL NOTE: NONE

---

**TWITTER THREAD**

Tweet 1: Spent today learning that "I don't know exactly when" is not missing data. It's data at a coarser resolution. Those need very different code.

Tweet 2: My first instinct was a sentinel date. Far future, treat it as unknown. That's a landmine: the meaning now lives in a value that every date comparison in the app silently participates in.

Tweet 3: A named field instead. datePrecision: 'day' | 'month'. Optional, absent means 'day', so every stored row was already correct and there was no migration.

Tweet 4: The payoff is that it fails loudly. A screen that hasn't been taught about precision doesn't quietly render an anchor as a claim. It shows up in review as a place that reads .date without asking.

Final tweet: Sentinels make every consumer accidentally correct. Named fields make the uninformed consumer visibly wrong. Prefer visibly wrong.

VISUAL NOTE: NONE

---

**LINKEDIN POST**

A small modelling decision I think is worth sharing.

A user needed to record a bill where they knew the month but not the day. My first instinct was a sentinel: store a placeholder date and treat it as "unknown" everywhere.

That would have been a mistake. A sentinel puts the meaning inside a value that every date comparison in the codebase silently participates in. Every consumer becomes accidentally correct, until one of them isn't, and nothing tells you which.

So precision became its own field: 'day' or 'month', optional, absent meaning 'day'. Every existing row was already correct, so there was no migration. Four places in the projection engine now consult it explicitly, and each one is a line you can point at in review.

The property I care about most: a screen that has not been taught about precision now fails visibly rather than quietly rendering a storage anchor as a claim to the user.

Sentinels make the uninformed consumer accidentally right. Named fields make it visibly wrong. Visibly wrong is worth a lot.

VISUAL NOTE: NONE

---

### P2 ITERATION WITH RATIONALE: I placed it from a description. They corrected it on the device.

**TWITTER POST**

I described a layout in words. My designer picked from the description. I built it.

Then they saw it on a phone and moved it immediately.

A layout choice made from a description is a guess until it's on a screen. Writing that one down.

VISUAL NOTE: the row with the badge in the left column vs under the amount, side by side.

---

**LINKEDIN POST**

I asked my designer where a small label should sit, and I asked it in words. They picked an option. I built exactly what they picked.

Then they ran it on their phone and moved it within seconds.

In the description, "under the date" sounded balanced. On the device it put three lines in the left column and dropped the widest element onto the row's bottom edge, and with roughly forty rows in view the cost compounded. Moved beside the amount, the two columns balance and every row gets about 20pt shorter.

Neither of us was wrong in the conversation. The conversation was just the wrong medium for the question.

I have started writing this into the project's design records as a standing note: a layout choice made from a description is a guess until it is on a screen. Some questions are cheap to answer in prose, and some only have real answers in hand.

VISUAL NOTE: before and after screenshots of the row.

---

### P3 PLATFORM PATTERN: Two typography traps in React Native

**TWITTER POST**

Two React Native things that cost me real time today:

1. numberOfLines={1} on text that has outgrown its line box CROPS it. It doesn't shrink it. At XXXL my label rendered as a band of half-glyphs.

2. justifyContent: 'center' centres the text's BOX. The descender space is in that box, so a word without descenders sits visibly high.

VISUAL NOTE: the cropped half-glyph label at XXXL, and the badge with its text riding high.

---

**TWITTER THREAD**

Tweet 1: Two typography traps in React Native, both of which looked like my mistake and were actually the platform being literal.

Tweet 2: numberOfLines={1} does not mean "keep this to one line". It means "clip after one line box". Text that has grown past its line box under Dynamic Type gets cropped through the middle of the glyphs. You get a band of half-letters.

Tweet 3: The fix isn't a better clamp, it's letting the row grow and capping the SCALE instead. Chrome caps at 1.5x. The content, the number the user actually came for, stays uncapped.

Tweet 4: Second one: a label rode high inside its pill. justifyContent: 'center' centres the text's box, and the box reserves descender space. "Monthly" has one descender, so the visible ink sits above centre.

Final tweet: Fix was to size the pill from padding around a tightened line height, rather than centring inside a fixed height. Bonus: padding still grows with Dynamic Type, so it doesn't break the "minHeight, never height" rule.

VISUAL NOTE: tweet 2, the cropped label. Tweet 4, the badge before and after.

---

**LINKEDIN POST**

Two React Native typography traps from today, both of which looked like my bug and were really the platform being precise about something I was being vague about.

First: numberOfLines={1} does not mean "keep this to one line". It means "clip after one line box". When Dynamic Type grows text past that box, you do not get shrinking, you get cropping, and at the largest accessibility sizes my label rendered as a band of half-glyphs. The fix was not a better clamp. It was letting the row grow and capping the text scale instead, and capping only the chrome: the number the user actually came to read stays uncapped, because capping content would invert the whole point of Dynamic Type.

Second: a label sat visibly high inside its pill. justifyContent: 'center' centres the text's box, and that box reserves space for descenders. A word whose ink does not reach the descender line therefore sits above the optical centre. The fix was to size the pill from padding around a tightened line height instead of centring inside a fixed height, which also keeps the container growing with Dynamic Type.

Both are small. Both were invisible until a real device at a real accessibility setting showed them.

VISUAL NOTE: the cropped label at XXXL, and the badge before and after.

---

### P5 BUILDING WITH AI HONESTLY: My merge script closed two of my own pull requests

**TWITTER POST**

I wrote a loop to merge an 8-deep PR stack bottom-up, waiting for each child to retarget to main.

It never retargeted. GitHub CLOSES a child PR when its base branch is deleted.

My loop then merged one PR into the wrong branch and closed another. Nothing lost, but I wrote the wrong thing confidently.

VISUAL NOTE: the PR list showing two CLOSED and one merged into a non-main base.

---

**TWITTER THREAD**

Tweet 1: I had 8 stacked PRs, all green. I wrote a loop: merge the bottom one, delete its branch, wait for the child to retarget to main, repeat. Clean idea. Built on a wrong assumption.

Tweet 2: GitHub does not retarget a child PR when you delete its base branch. It CLOSES it. My "wait for retarget" step timed out, and my loop moved on anyway.

Tweet 3: So PR #167 got merged into the still-open intermediate branch instead of main, and deleting THAT branch closed #168. Two PRs closed, one merged into the wrong base.

Tweet 4: Nothing was actually lost, because the stack was strictly linear and every branch was a superset of the one below. I checked that before touching anything else, which is the only reason this was a 20-minute recovery.

Tweet 5: The recovery is non-obvious: you cannot reopen a PR whose base branch is gone. You have to push the deleted ref back first, then reopen, then retarget.

Final tweet: The lesson isn't "be careful with scripts". It's that I asserted a platform behaviour I had not verified, inside a loop that would act on it 8 times. Verify the assumption once before you automate it 8 times.

VISUAL NOTE: tweet 3, the PR list with the wrong base visible.

---

**LINKEDIN POST**

I broke my own pull requests today, and the interesting part is why.

I had eight stacked pull requests, each based on the one below, all with green CI. I wrote a short script to merge them bottom-up: merge, delete the branch, wait for the child to retarget to main, repeat.

The assumption was that GitHub retargets a child pull request when its base branch is deleted. It does not. It closes it.

So my "wait for retarget" step timed out, and the loop continued anyway. One pull request got merged into the intermediate branch instead of main, and deleting that branch closed another. Two closed, one merged into the wrong base.

Nothing was lost, and the reason is worth naming: before doing anything else I verified that the stack was still strictly linear and that every branch still contained the one below it. That check turned a potential mess into a twenty minute recovery. The recovery itself is non-obvious, because a pull request whose base branch no longer exists cannot be reopened at all. You have to push the deleted branch reference back first.

The lesson I took is not "be careful with automation". It is narrower and more useful: I asserted a platform behaviour I had not verified, and then put it inside a loop that would act on it eight times. Verify the assumption once before you automate it eight times.

VISUAL NOTE: the pull request list showing the two closed entries and the one merged into a non-main base.

---

CASE STUDY MOMENT
An incorrect assumption about GitHub's stacked-PR behaviour, caught and recovered without data loss because the first move after the failure was to verify the underlying git state rather than to retry the tooling.

---
