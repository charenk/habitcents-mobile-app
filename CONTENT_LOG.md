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

