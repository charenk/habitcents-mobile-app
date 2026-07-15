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
