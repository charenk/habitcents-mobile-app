# HabitCents — Onboarding v3.1 · PRD

**Status:** Decisions locked through review round 2 · ready for build planning
**Supersedes:** PRD v3.0 and `habitcents-onboarding-flow-v2.md` where they conflict
**Companion artifacts:** `src/onboarding/` (RN module, implements v2) · FigJam board *Updated flow — pending review* · `habitcents-onboarding-preview.jsx` (web harness)

---

## 1. Why this revision exists

v2 shipped a working three-beat onboarding, but beat 2 — statement scanning — had two unresolved problems:

1. **Extraction is unreliable and the user had no way to contain it.** A miscategorised transaction could surface anywhere, including as a proposed habit.
2. **Essential spending could be proposed as a habit.** Rent, medical, childcare, and education are not behaviours anyone should be nudged to skip.

The obvious fix — a classifier distinguishing essential from discretionary spending — was **rejected**: doing it well requires a server-side merchant taxonomy, which contradicts the privacy commitment made three times before the user reaches that screen.

**The chosen approach inverts the problem: the user declares scope, so the app never has to claim it knows what is essential.** Once spending is sorted rather than filtered, the excluded half routes to the Upcoming expenses feature. Beat 2 becomes the first screen where both halves of the positioning are visible at once: leaks go to habits, bills go to Upcoming, nothing is thrown away.

---

## 2. Goals

- Contain bad extraction without asking the user to audit it line by line
- Make it structurally impossible to propose an essential expense as a habit
- Preserve the one-import-to-activation promise implied by the beat 2 CTA
- Keep the privacy commitment intact — no merchant taxonomy, no server-side classification
- Resolve the beat 1 duplication problem without breaking single-route navigation

## 3. Non-goals

- Full expense triage or category management during onboarding — post-activation, in-app
- Deciding the premium gate for recurring expenses — deferred to post-launch data
- Any notification permission request anywhere in this flow

---

## 4. The flow

```
Launch (flat brand colour — OS splash cannot animate)
   ↓ handoff when animation complete AND data ready
Carousel — 3 beats, one mini device frame, simulated UI
   Beat 1  "Log it in ten seconds."           → Amount pad (onboarding-owned)
   Beat 2  "See where it all goes."           → Scan sequence
   Beat 3  "Start with my habit"              → Habit sequence
   Ghost   "I'll explore on my own"           → App home (nudge-rich empty states)
   ↓ (any route)
        ═══ ACTIVATION ═══
   habit exists · has a $ value · one instance recorded
   ↓
Payoff (gold if skipped, quiet green if not)
   ↓
[scan route only] Bills → Upcoming offer
   ↓
Today page, populated
```

---

## 5. Skip *(decided)*

**"I'll explore on my own" goes directly to the app's landing page.** The app's empty states carry the onboarding burden from there — each designed with enough nudge to kickstart self-serve.

This **replaces** v2's rule *"skip never lands on an empty screen"* with its successor:

> **Every empty state a skipper can reach is an onboarding surface.** Today, habits, reports, and Upcoming empty states must each contain a concrete first action, not a blank illustration.

Consequence: skip has no in-flow route to activation. That is deliberate — the self-serve path is the app itself. `carousel_skipped` remains the event; activation for skippers is attributed to whichever in-app surface converts them (see §11 instrumentation).

**New dependency:** the empty states are now part of onboarding scope. They are currently undesigned. See §13.

---

## 6. Beat 1 — amount pad

**Onboarding owns its own amount pad screen. It does not route into the app's Today page.**

One shared component, two hosts:

```
components/AmountPad.tsx     presentational — keypad, amount, category chips
app/today/LogDrawer.tsx      app host → real store
onboarding/LogExpenseRoute   onboarding host → onboarding store → regular-thing sheet
```

Drift is impossible because there is nothing to keep in sync. Beat 1 teaches *the hand*; a pad that differs from the real one teaches the wrong procedure. The onboarding pad matches the app's **presentation** — same drawer height, entry animation, dismiss gesture — not just its layout.

Today-page orientation moves to **after the payoff**, where the user lands on a populated screen.

Behaviour otherwise unchanged from v2: amount is the only required field; save opens the load-bearing **"Is this a regular thing?"** sheet; *Track it* → activation; *Not this one* → logged-only (not an activation, must not fire the event).

---

## 7. Beat 2 — scan sequence

### Sequence

```
Trust pre-prompt → Permission → On-device extraction
   → Scope selection → Habit deck (≤3 cards)
   → ACTIVATION → Payoff → Bills → Upcoming offer
```

### 7.1 Scope selection

The screen asks **where should we look?** — not *review what we found*.

| Tier | Categories | Default |
|---|---|---|
| **Never searched, never offered** | Health & medical, childcare, education, rent/mortgage, insurance, debt payments | Locked, visible |
| **Available** | Groceries, transport, utilities, Others | Off |
| **Available** | Coffee, eating out, delivery, rideshare, entertainment, subscriptions, shopping | On |

The locked tier is shown with a reason — *rent, medical, and childcare go to Upcoming, not to habits* — so exclusion reads as judgment, not omission. **Defaults fail closed**; `Others` defaults off because an unmapped merchant is exactly where a misread pharmacy charge lands.

### 7.2 Defence in depth, no classifier

- **≥8-instance threshold** excludes monthly essentials structurally — rent, insurance, car payments have one instance and cannot reach the deck.
- **Merchant-level suppression list** applied after categorisation — a second gate, not a classifier.
- **Per-card "not a habit" dismissal** — the honest failure path when the system is wrong.

Known limitation: scoping limits blast radius, it does not eliminate it. A pharmacy charge filed under Shopping is caught by the suppression list or the dismissal, not by category exclusion.

### 7.3 Habit deck

Maximum **three cards**. Each: track it, or dismiss.

**Ranking *(decided)*: frequency first, per-instance cost as tiebreak.** High frequency × small ticket is the discretionary signature — coffee at 14×$6 outranks a weekly big-box run at 4×$40. Ranking by total spend was rejected because it surfaces exactly the semi-essential spending this redesign exists to keep out of the deck. Essentials never enter ranking at all; they are excluded upstream by scope, threshold, and suppression.

The card may *display* projected monthly savings, but ranking and headline are independent numbers. (Savings-forward framing as the primary presentation → punchlist, §12.)

**Two distinct fallbacks:**

| Condition | Fallback |
|---|---|
| No candidates found | Habit template grid |
| Three cards shown, all rejected | Full list of in-scope extracted items |

**One fallback hop, never a fallback of a fallback.** The list is terminal; rejection there exits via the ghost.

### 7.4 Dismissal behaviour *(decided)*

A dismissed merchant is **never re-proposed** in this deck or by future habit discovery — but it is **not deleted**. All extraction results, including dismissed candidates and their dismissed status, persist as the **First scan** snapshot under the app's Insights page. The user can revisit what the system found and manually create a habit from any item there; *never propose* ≠ *never allow*.

Dismissals recorded during onboarding are the first input to the post-launch habit-discovery feature and must be stored in a form that feature can read.

**New dependency:** the Insights page and its First scan tab are referenced here but not in the MVP scope. See §13.

### 7.5 Import closes activation

**The import is the instance.** When a card is tracked: habit exists, per-instance cost is derived from the statement ($84 ÷ 14 = $6.00), and the extracted occurrences are recorded instances (`skipped: false`). No "did you do it today?" step — the statement already answered it.

> **Scan activation certifies setup, not engagement. Engagement is measured by first-kept, for all routes.** *(approved)*

The payoff is the **quiet green** variant — nothing has been kept yet. It is also the strongest version of that screen, because it carries real history: *"Coffee, 14 times, $84 last month. Skip it once and $6 comes back."*

### 7.6 Moved out of onboarding

Item-level triage, cross-category moves, and category creation live in-app, post-activation. Miscategorisation only matters when it crosses the scope boundary; a coffee filed under Food is still found when Food is in scope.

### 7.7 Effort claim

Trust → permission → extract → scope → cards: four steps to the deck. The CTA promise — **"2–3 minutes · nothing uploads"** — holds unmodified. The goal is one import, not complete setup.

---

## 8. Bills → Upcoming

Essential and out-of-scope recurring expenses route to Upcoming instead of being discarded.

- **After the payoff, never before it** — bookkeeping must not stand between the user and the moment the product exists to deliver.
- **Propose, don't ask** — cadence pre-answered from extraction, one **Add to Upcoming** confirm, per-row untick.
- **Skippable**, one screen.
- **Instrumented separately** (`bills_offered` / `bills_imported`) — must not inflate `activation`.

Governing rule: **tracking an essential is fine, proposing you skip it is not.** Same data, different verb.

---

## 9. Free tier

**Recurring expenses: 3 → 10.** The 3-cap contradicted *premium unlocks depth, never core tracking*; 10 removes the import-grandfathering problem and leaves a measurable ceiling that unlimited would not. Gating deferred; instrument `recurring_expense_count`, read at month 3 and 6. **The number hardens at launch.** Premium now rests on the habit cap (1 free / 5 premium) and history — the habit cap is load-bearing and should not be loosened.

---

## 10. Rules that don't bend

Carried forward:

- No notification prompt anywhere in this flow — ask after first activation, in context, with a stated reason.
- No auto-advance in the carousel; rubber-band at both ends.
- Reduce motion honoured everywhere — static frames, crossfades, no count-ups or particles.
- **Gold = money kept**, appearing nowhere before beat 3's scene and the skipped payoff. **Rose = money leaking.** They meet only in the leak-to-kept narrative.
- All targets ≥44pt / 48dp; Dynamic Type through XXL reflows, never truncates.
- Money is integer cents everywhere.

Changed in v3.1:

- **System back is two-level** *(decided — replaces "system back exits onboarding entirely")*:
  - On a **route screen** (pad, scan, habit): system back returns to the carousel — mirroring the in-screen chevron. Coherent for Android predictive back and iOS edge-swipe because routes are dedicated onboarding screens within one flow.
  - On the **carousel itself**: system back exits onboarding to the app.
  - Within the carousel, back never steps between beats — beat navigation remains swipe and dots only.
- **Every skipper-reachable empty state is an onboarding surface** *(replaces "skip never lands on an empty screen")* — each must contain a concrete first action.

New in v3.1:

- **Never propose an essential expense as a habit** — health/medical, childcare, education, housing, insurance, debt are never searched for candidates, regardless of user selection.
- **Scoping defaults fail closed.**
- **One fallback hop.**
- **Dismissals are permanent for proposals, preserved for discovery** (§7.4).

---

## 11. Instrumentation & success criteria

Events carried from v2: `splash_shown`, `beat_viewed`, `beat_swipe`, `intent_selected`, `carousel_skipped`, `route_milestone`, `activation`, `permission_prompted`.

New:

```
scope_selected      { categories_on, categories_off, used_defaults }
deck_card_shown     { position, merchant_category, instances, total_cents }
deck_card_result    { position, result }        ← tracked / dismissed
deck_exhausted      { fallback }                ← template_grid / full_list
bills_offered       { count_proposed }
bills_imported      { count_accepted }
skip_activation     { surface }                 ← which empty state converted a skipper
```

User property: `recurring_expense_count`.

### Success criteria *(agreed — month-3 checkpoint)*

Framing: this launch is exploratory. The real success is measuring behaviour per path and adapting toward the highest-engagement cohorts. Each criterion maps to exactly one design decision, so a miss identifies what to fix:

| Criterion | Target | Tests |
|---|---|---|
| Scan-route first-kept vs habit-route first-kept | within 20% | Import-as-instance (§7.5) |
| Deck position-1 track rate | ≥40% | Ranking signal (§7.3) |
| `bills_imported / bills_offered` | ≥50% | The second payoff (§8) |
| `scope_selected.used_defaults` | ≥70% | Tier assignments (§7.1) |

Targets are starting guesses in the same spirit as the ≥8 threshold. Read `used_defaults` first: heavy editing means the defaults are wrong before any classifier conversation reopens.

---

## 12. Punchlist — deferred bets

Captured so they are not lost; none block v3.1.

1. **Savings-forward deck framing** — rank by frequency, but lead each card with projected monthly savings as the headline number. Revisit after position-1 track rate data exists.
2. Locale-seeded template amounts beyond CA/US.
3. Locale review of the tier taxonomy itself (the essential list is CA/US-shaped).
4. Dark-mode onboarding surfaces (blocks the dark splash pre-shift target).
5. Text-only wordmark export (tile glyph currently cropped via viewBox offset).
6. Beat 1 loop pacing — validate the first cycle reads at a glance.

---

## 13. Open items & new dependencies

| # | Item | Status |
|---|---|---|
| 1 | **Beat 2 in the MVP?** | Reframed as a conditional: **in the MVP if the on-device extractor lands under N days of effort, else deferred with `SCAN_ROUTE_ENABLED=false`.** N to be set during build planning in the repo, where the estimate is real. The carousel degrades cleanly to two beats. |
| 2 | **Insights page / First scan tab** | Referenced by §7.4 but absent from the MVP scope in the goals doc. Either it enters MVP scope, or dismissal storage ships now with the surface deferred — decide during build planning. |
| 3 | **Empty-state designs** | §5 makes them onboarding surface. Undesigned. Must exist before skip-to-home ships, or skip lands on blank screens in violation of §10. |
| 4 | **Upcoming feature readiness** | §8 depends on it. If it slips, decide: bills offer stubs, or the locked-tier copy changes. |

Resolved this round (recorded for the changelog): skip destination (§5) · deck ranking (§7.3) · dismissal behaviour (§7.4) · success criteria (§11) · system back semantics (§10) · beat 3 CTA = **"Start with my habit"**, with "create" living in the grid's screen title.

---

## 14. Build impact

| Item | Effort | Notes |
|---|---|---|
| Extract `AmountPad`, rehost both places | ~1h | Onboarding host exists |
| Scope selection screen | New | Chip grid, three tiers, locked row |
| Habit deck + frequency ranking | New | Replaces single proposal |
| Two-exit fallback wiring | Small | Both destinations exist |
| Import-as-instance | Small | Store already models instances |
| Dismissal persistence (First scan format) | Small–medium | Schema must serve future habit discovery |
| Bills → Upcoming screen | New | Blocked on Upcoming (§13.4) |
| Empty-state nudge designs | New | Blocked on design (§13.3) |
| System back two-level handling | Small | BackHandler branches on screen |
| Free tier 3 → 10 | Trivial | Config |
| **On-device extractor** | **Largest unknown** | Still stubbed. **If §13.1 resolves to "in," this is the critical path of the entire MVP** — two new screens and a deck now sit on top of it inside the 8-week window. |

The RN module and the FigJam board both still implement v2. Neither reflects this document.

---

*Document version: 3.1 · All review-round-2 decisions incorporated*
