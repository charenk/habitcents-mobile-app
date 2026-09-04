// Centralized user-facing UI strings.
// Pure relocation: values must match the exact original wording. Do not reword.
// Import with: import { strings } from '@/constants/strings';

// Today quote rotation (U6): a single quote, plain text plus an optional
// attribution. `by` is omitted for the unattributed lines rather than set to
// an empty string, so ViewQuote's "attribution when present" check
// (components/today/ViewQuote.tsx) is a plain truthiness check.
export type TodayQuote = { text: string; by?: string };

export const strings = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    ok: 'OK',
    back: 'Back',
    keep: 'Keep',
    close: 'Close',
    dismiss: 'Dismiss',
  },
  // Shared sheet chrome for the disabled-until-valid Save/Start convention
  // (ops ADR 0028, 2026-08-16): a disabled primary action carries an
  // accessibilityHint naming what is missing, so VoiceOver hears why instead
  // of hitting a dead end. The amount hint is reused by every sheet whose
  // only requirement is a nonzero amount, rather than five copies of the
  // same sentence; the category-name hint joined when AddCategoryModal, the
  // last toast-instead-of-disabling holdout, converged (ADR 0031).
  sheets: {
    saveHintAmount: 'Enter an amount first',
    saveHintCategoryName: 'Enter a category name first',
  },
  // Tab bar (redesign step 02): Today / Money / Insights / Categories.
  tabs: {
    today: 'Today',
    money: 'Money',
    insights: 'Insights',
    categories: 'Categories',
  },
  // Serif screen titles. The trailing period is part of the redesign voice.
  screenTitles: {
    today: 'Today.',
    money: 'Money.',
    insights: 'Insights.',
    categories: 'Categories.',
  },
  expenses: {
    recent: 'Recent',
    upcoming: 'Upcoming',
    merchantPlaceholder: 'Merchant (e.g. Starbucks)',
    merchantFieldLabel: 'Merchant',
    noteFieldLabel: 'Note',
    amountHint: 'Double tap to enter an amount',
    notePlaceholder: 'Note (optional)',
    saveExpense: 'Save expense',
    // Log-save motion (Direction C, spec 05): the button label morphs to this
    // for a beat right after a successful save, then the form resets.
    savedConfirmation: 'Saved',
    all: 'All',
    editAccessibilityLabel: (title: string, amountLabel: string) => `Edit ${title}, ${amountLabel}`,
  },
  upcoming: {
    totalLabel: (windowDays: number) => `NEXT ${windowDays} DAYS`,
    recurringCount: (count: number) =>
      `${count} recurring ${count === 1 ? 'expense' : 'expenses'}`,
  },
  habits: {
    title: 'Your Habits',
    loading: 'Loading.',
    // Pre-detection progress state (spec 05 section 5.2): shown on the Habits
    // tab empty state once logging has started but no leak has been detected
    // yet.
    spottingYourLeak: 'Spotting your leak',
    logsAtSamePlace: (n: number, threshold: number) => `${n} of ${threshold} logs`,
    logsAtSamePlaceSuffix: ' at the same place',
    logsAtSamePlaceBody: 'Around 4 logs at one merchant is enough to see a pattern. Keep logging.',
  },
  // Habit logging v2 (docs/design-package-phase2/01-habit-logging-spec.md).
  // Vocabulary is load-bearing: skip is the win, slip is neutral and never
  // subtracts from Kept. Never reword to streak/success/completed language.
  habitLogging: {
    // Kept hero (4.1)
    keptSoFar: 'Kept so far',
    keptCaption: "money you didn't spend",
    // Leaks found section + leak card (4.10, unchanged from v1)
    leaksFoundSection: 'Leaks found',
    breakingNowSection: 'Breaking now',
    breakIt: 'Break it',
    notThisOne: 'Not this one',
    // Leak evidence, two builders (device feedback 2026-08-04). A monthly rate
    // is only claimed once the leak has been watched for MIN_SPAN_DAYS_FOR_RATE
    // (utils/habitDetection.ts); under that, we state what was observed and say
    // so. Both take observedCount, the REAL number of logs, never
    // occurrencesPerPeriod, which is a per-period rate that reads like a count.
    // The window here is 3 months because observedCount counts the whole
    // DETECTION_WINDOW_DAYS group (90 days), not a trailing month. Saying
    // "30 days" would undercount the window the number actually came from.
    leakEvidenceReliable: (name: string, monthTotal: string, observedCount: number) =>
      `${name} costs you about ${monthTotal} a month. You bought it ${observedCount} time${observedCount === 1 ? '' : 's'} in the last 3 months.`,
    leakEvidenceObserved: (name: string, observedTotal: string, observedCount: number) =>
      `${observedTotal} at ${name} across ${observedCount} buy${observedCount === 1 ? '' : 's'}.`,
    leakEvidenceKeepLogging: 'Keep logging to see the monthly pattern.',
    // Check-in card (4.2)
    dailyQuestion: 'Did you skip it today?',
    weeklyValueLine: (skipValue: string) => `Each skip keeps ${skipValue}.`,
    skipButton: (skipValue: string) => `Skipped it +${skipValue}`,
    skipOneButton: 'I skipped one',
    boughtItButton: 'I bought it',
    firstRunLine: 'Your first skip starts the counter.',
    weekSummaryBold: (n: number, m: number) => `${n} of ${m} days`,
    weekSummarySuffix: (weekKept: string | null) => ` skipped this week${weekKept ? ` · ${weekKept} kept` : ''}`,
    periodChip: (n: number) => `${n} skip${n === 1 ? '' : 's'} this week`,
    changeAnswer: 'Change answer',
    spentLessThanUsual: 'Spent less than usual?',
    // Confirmation slot (4.4)
    skipConfirmationDaily: (skipValue: string, n: number, m: number) =>
      `+${skipValue} kept. That's ${n} of ${m} days this week.`,
    skipConfirmationFirstEver: (skipValue: string) => `+${skipValue} kept. Your counter is running.`,
    skipConfirmationWeekly: (skipValue: string, n: number) => `+${skipValue} kept. ${n} skips this week.`,
    slipConfirmationDaily: (n: number, m: number, keptTotal: string) =>
      `Logged. Still ${n} of ${m} days this week. Your ${keptTotal} kept stays yours.`,
    slipConfirmationZero: 'Logged. Tomorrow is a fresh start.',
    slipConfirmationWeekly: (keptTotal: string) => `Logged. Your ${keptTotal} kept stays yours.`,
    changeToSlipConfirmation: (skipValue: string) =>
      `Corrected. Today is a slip, so ${skipValue} came off your kept total. It was never spent money, just today's answer.`,
    // Backfill (3.6)
    missedYesterday: 'Missed yesterday? Answer for it:',
    backfillSkip: 'Skipped it',
    backfillBought: 'Bought it',
    backfillYesterdaySkipped: (skipValue: string) => `Yesterday: skipped, +${skipValue} kept.`,
    backfillYesterdaySlipped: 'Yesterday: bought it. Recorded.',
    // Milestone / coach moment slot headline (4.5). Card body text now comes
    // from the coachMoments section below (P2-2), selected by the trigger
    // engine in utils/coachMoments.ts.
    milestoneHeadline: (n: number, chapter: string) => `${n} total skips · ${chapter}`,
    // Pick-one sheet (4.3)
    // The subtitle now names the moment ("New leak detected"); the cadence word
    // moves to a secondary line so daily vs weekly is still legible.
    pickOneNewLeak: 'New leak detected',
    pickOneCadenceDaily: 'A daily leak',
    pickOneCadenceWeekly: 'A weekly leak',
    pickOneCadenceMonthly: 'A monthly leak',
    pickOneValueLine: 'Each time you skip it, we count the money as kept.',
    pickOneFieldLabel: 'One skip keeps',
    // Range hint under the skip-value field: the prefill is the median buy, so
    // the spread it came from is stated rather than implied.
    pickOneRangeHint: (min: string, max: string) => `Your buys ranged ${min} to ${max}.`,
    pickOneCadenceNoteDaily: "We'll ask each day: did you skip it?",
    pickOneCadenceNoteEvent: 'Tap I skipped one whenever you skip. No daily check-in.',
    startBreakingIt: 'Start breaking it',
    // Habit gate (ADR 0007, free = 1 habit). The gated sheet states the
    // situation and the price instead of showing an inert keypad behind a
    // disabled button.
    freeTierNote: '1 habit on the free plan',
    gateTitle: "You're already breaking one habit",
    gateBody: (monthlyPrice: string) =>
      `Free keeps 1 habit, always. Premium breaks up to 5 at once, from ${monthlyPrice} a month.`,
    gateUpgradeCta: 'See Premium',
    gateMaybeLater: 'Maybe later',
    // Partial slip sheet (4.7)
    partialSheetTitle: 'How much did it cost?',
    partialSheetSubtitle: (skipValue: string) =>
      `You usually spend about ${skipValue}. Anything under that counts as kept.`,
    partialAmountLabel: 'Amount spent',
    partialConfirmation: (amount: string, skipValue: string, difference: string) =>
      `Logged. You spent ${amount} instead of ${skipValue}, so ${difference} counts as kept.`,
    partialConfirmationFreshStart: 'Logged. Fresh start tomorrow.',
    // Long arc (4.6)
    longArcTitle: 'The long arc',
    arcOf66: (total: number) => `${total}`,
    arcOf66Label: 'OF 66',
    arcSupportLine: (total: number) => `${total} skips toward the ~66 it takes to rewire a habit. Slips never subtract.`,
    chapterDeciding: 'Deciding',
    chapterRhythm: 'Rhythm',
    chapterCruising: 'Cruising',
    chapterRewiring: 'Rewiring',
    chapterRewired: 'Rewired',
    identityDeciding: "You're deciding where your money goes.",
    identityRhythm: "You're finding your rhythm.",
    identityCruising: "You're cruising. The habit is losing its grip.",
    identityRewiring: "You're almost rewired.",
    identityRewired: "Rewired. This habit doesn't run you anymore.",
    // Detail screen stats row (4.8)
    statKept: 'Kept',
    statThisWeek: 'This week',
    statThisWeekWeekly: (n: number) => `${n} skips`,
    statTotalSkips: 'Total skips',
    editSkipValue: (skipValue: string) => `Edit one skip keeps (${skipValue})`,
    stopBreakingHabit: 'Stop breaking this habit',
    stopBreakingConfirmTitle: 'Stop breaking this habit?',
    stopBreakingConfirmMessage: 'Your history is kept. You can start breaking it again any time.',
    // History calendar (4.9)
    legendSkipped: 'Skipped',
    legendSlipped: 'Slipped',
    legendNoLog: 'No log',
    // UX-046: was hardcoded on the TouchableOpacity labels directly.
    calendarPreviousMonth: 'Previous month',
    calendarNextMonth: 'Next month',
    // UX-054: today's cell is the only calendar cell that does anything on
    // tap (it opens change-answer); the hint says so instead of leaving a
    // VoiceOver user to guess what activating it does.
    calendarTodayCellHint: 'Opens change answer',
    eventSkippedOne: (skipValue: string) => `Skipped one · +${skipValue}`,
    eventBoughtIt: 'Bought it',
    eventBoughtItPartial: (difference: string) => `Bought it · ${difference} kept`,
    // UX-058: EventHistory caps its list rather than rendering every event a
    // long-running weekly/monthly habit has ever logged.
    eventHistoryShowAll: (count: number) => `Show all ${count}`,
    // Empty states (4.10): the leaks-empty title/body live once at
    // insights.leaksEmptyTitle/leaksEmptyBody now (was duplicated here
    // byte-for-byte; collapsed in the empty-state pattern pass).
    logAnExpense: 'Log an expense',
    keptZeroCaption: 'your first skip starts this counter',
  },
  // ---------------------------------------------------------------------
  // Coach Moments (docs/design-package-phase2/04-p2-2-coach-moments.md).
  // Additions only: the 17 card copies, verbatim from spec section 4.
  // Sentence case, no em dashes, product vocabulary (leak/skip/kept/slip).
  // Never reword; this is the single source of truth for card text.
  // ---------------------------------------------------------------------
  coachMoments: {
    // First log (spec §4, "First log")
    fl1: "That took about ten seconds. Do this a few more times and we'll show you the habit quietly costing you the most.",
    // Detection (spec §4, "Detection")
    dt1: "Here's your leak. You don't have to quit it, just decide, one day at a time, whether it's worth it.",
    // Skip (spec §4, "Skip")
    sk0: 'Your counter is running. Every skip from here is money you decided to keep.',
    sk1: 'The urge passes in a few minutes. The money you kept stays all day.',
    sk2: "You didn't resist a purchase. You chose where your money goes. That's the whole game.",
    sk3: "Skipping is easier the second time, and easier again the third. You're wearing a new path.",
    sk4: 'Small skips add up faster than they feel like they should. Watch the kept number, not the clock.',
    sk5: 'The habit needed a cue, a routine, and a reward. You just interrupted the routine.',
    sk6: "Nothing dramatic happened, and that's the point. Boring skips are what breaking a habit actually looks like.",
    // Milestone / chapter crossings (spec §4, "Milestone")
    ms10: "Ten skips in. You're finding your rhythm, and this only ever counts up. Slips never subtract from here.",
    ms30: "Thirty skips. You're cruising, and the habit is losing its grip. You're becoming someone who decides where money goes.",
    ms50: "Fifty skips. You're almost rewired. What used to be a decision is starting to be automatic.",
    ms66: "Sixty-six skips. That's the number it takes to rewire a habit. This one doesn't run you anymore.",
    // Broken streak / slip (spec §4, "Broken streak / slip")
    br1: 'Missing once is an accident. Missing twice starts a new habit, so tomorrow matters more than today did.',
    br2: 'Your kept money is still yours. A slip records what happened; it never takes anything back.',
    br3: "One slip is a data point, not a verdict. The path you've worn is still there tomorrow.",
    br4: 'Bought it? Noted, no judgment. Making it easy to be honest is how the numbers stay true.',
  },
  habitDetail: {
    notFound: 'Habit not found',
    sentimentHabit: (sentiment: string) => `${sentiment} Habit`,
    perDay: 'day',
    perWeek: 'week',
    perMonthUnit: 'month',
    perUnit: (unit: string) => `per ${unit}`,
    suggestions: 'Suggestions',
  },
  categories: {
    title: 'Categories',
    defaultCategories: 'Default Categories',
    customCategories: 'Custom Categories',
    loading: 'Loading.',
    emptyTitle: 'No categories yet',
    // Was "Tap Add category at the top", which described an action instead of
    // offering one; the CTA below now IS the action (PRD v3.1 sect 5).
    emptySubtitle: 'Group your spending so the patterns are easier to see.',
    // Distinct from addCategoryLabel below on purpose: both buttons are on
    // screen together in the empty state, and two controls reading "Add
    // category" is a needless ambiguity for anyone navigating by button.
    emptyCta: 'Add your first category',
    // Delete confirm sheet (design/selection-sheets U3), replacing the native
    // alert. deleteConfirmCta and deleteCancel are the sheet's two buttons.
    deleteTitle: (name: string) => `Delete ${name}?`,
    deleteMessage: "Your existing expenses are kept; they'll just no longer show this category.",
    deleteConfirmCta: 'Delete category',
    deleteCancel: 'Keep category',
    thisMonthSuffix: (amount: string) => `${amount} this month`,
    addCategoryLabel: 'Add category',
    // Redesign step 04: serif "Categories." title plus two eyebrow-labelled
    // white cards. Eyebrows are stored sentence case and uppercased by the
    // style so VoiceOver reads them as words, not letters.
    eyebrowDefault: 'Default',
    eyebrowCustom: 'Custom',
    openCategoryLabel: (name: string) => `${name}, view details`,
  },
  categoryDetail: {
    notFound: 'Category not found',
    editCategoryLabel: 'Edit category',
    thisMonth: 'this month',
    vsLastMonth: (percent: number) => `${percent}% vs last month`,
    // U12b: off "transactions" (house rule: the app calls things "expenses"
    // or "logs", never "transactions"). The count stat reads "logs"; the
    // mean-amount stat reads "average" ("average log" read oddly paired with
    // a dollar figure, so the noun was dropped).
    logsStat: 'logs',
    averageStat: 'average',
    // Eyebrows (section headers below): all-caps via the style, sentence
    // case here so VoiceOver reads them as words (design/PATTERN_VOCABULARY.md).
    sixMonthTrend: '6-month trend',
    topMerchants: 'Top merchants',
    logCount: (count: number) => `${count} log${count !== 1 ? 's' : ''}`,
    recentLogs: 'Recent logs',
    // UX-023: the list caps at 10, so the eyebrow names what is shown out of
    // what exists. The mirror never hides evidence without saying so.
    recentLogsCount: (shown: number, total: number) => `${shown} of ${total}`,
    // Rewritten off "transactions" (house rule: the app calls things
    // "expenses" or "logs", never "transactions").
    noExpensesLogged: 'Nothing logged in this category yet.',
    trendEmpty: 'No spending to chart yet.',
    logTimestamp: (date: string, time: string) => `${date} at ${time}`,
  },
  reports: {
    title: 'Reports',
    subtitle: 'Your financial insights',
    loading: 'Loading.',
    total: 'Total',
    noSpendingData: 'No spending data',
    noActiveHabits: 'No active habits',
    projectedThisMonth: 'projected this month',
    spent: (amount: string) => `${amount} spent`,
    daysLeft: (days: number) => `${days} days left`,
    timeRangeWeek: '7D',
    timeRangeMonth: '30D',
    timeRangeQuarter: '3M',
    timeRangeYear: '1Y',
    weekOf: (dateLabel: string) => `Week of ${dateLabel}`,
  },
  settings: {
    // UX-052: the external-link icon tells sighted users the row leaves the
    // app; without this hint VoiceOver users got strictly less information.
    opensInBrowserHint: 'Opens in your browser.',
    preferences: 'Preferences',
    currency: 'Currency',
    about: 'About',
    privacyPolicy: 'Privacy policy',
    termsOfService: 'Terms of service',
    restorePurchases: 'Restore purchases',
    version: 'Version',
    versionValue: '1.0.0',
    // Currency sheet (design/selection-sheets U3): replaces the native alert.
    // Row copy speaks the same vocabulary as the Profile row it opens from
    // (the code, e.g. USD), not the symbol.
    currencySheetTitle: 'Currency.',
    currencyRowLabel: (name: string, code: string) => `${name} (${code})`,
    // Restore purchases (BET-004, mock mode). No purchases exist to restore yet.
    // The row itself moved off Profile onto the paywall footer (design/
    // profile-restructure U9); these two outcome messages stay here because
    // the paywall's restore action still reads them.
    restoreNoneMessage: 'No previous purchases to restore.',
    restoreDoneMessage: 'Your purchases have been restored.',
    // Profile grouping (design/profile-restructure U9): weight follows
    // importance. General carries the rows with a status the user checks
    // (currency, plan, support); More is the quieter tier for legal links and
    // the start-over action.
    groupGeneral: 'General',
    groupMore: 'More',
    subscriptionRow: 'Subscription',
    subscriptionValueFree: 'Free',
    // Gating audit (build 12): the row used to hardcode Free regardless of
    // getEntitlement(), so a completed mock purchase left Profile still
    // claiming Free. This is the honest counterpart, shown once premium.
    subscriptionValuePremium: 'Premium',
    // Start over (design/profile-restructure U9) replaces Sign out: there are
    // no accounts, so nothing is signed out of. Slate, never coral: coral
    // stays reserved for actions that destroy data, and this keeps all of it.
    startOverRow: 'Start over',
    startOverHint: 'data stays on this device',
    startOverConfirmTitle: 'Start over?',
    startOverConfirmBody: 'Takes you back to the start screens. Your data stays on this device.',
    startOverConfirmCta: 'Start over',
    startOverConfirmCancel: 'Keep going',
    startOverToast: 'Starting over. Your data stays on this device.',
    // Row affordance vocabulary (design/row-affordances): legal rows leave the
    // app for the browser; a failed Linking.openURL now surfaces a toast
    // instead of failing silently.
    linkOpenFailed: 'Could not open the link.',
    mailOpenFailed: 'Could not open mail.',
    supportEmail: 'support@habitcents.com',
    // Version footer (design/profile-restructure U9): no longer a row, a
    // single muted centered line under the More card.
    versionFooter: (value: string) => `Version ${value}`,
  },
  // Profile page (design/header-unification U4, ADR 0019). Settings moved from
  // a bottom sheet behind Today's gear to a pushed route reachable from every
  // tab. Only net-new strings live here; every row still reads from
  // strings.settings.* above so nothing is duplicated.
  profile: {
    title: 'Profile.',
    headerLabel: 'Profile',
    supportRow: 'Support',
  },
  addCategoryModal: {
    // Sheet titles carry the trailing period, matching every other sheet
    // (design/selection-sheets U3; converted off the raw Modal + budget
    // field per D10, budgets removed from MVP).
    editCategory: 'Edit category.',
    newCategory: 'New category.',
    categoryNamePreview: 'Category name',
    name: 'Name',
    namePlaceholder: 'Enter category name',
    icon: 'Icon',
    color: 'Color',
  },
  editExpenseModal: {
    cancelAccessibilityLabel: 'Cancel editing',
    title: 'Edit Expense',
    saveAccessibilityLabel: 'Save expense',
    category: 'Category',
    merchant: 'Merchant',
    merchantPlaceholder: 'Merchant (e.g. Starbucks)',
    merchantFieldLabel: 'Merchant',
    noteFieldLabel: 'Note',
    amountHint: 'Double tap to enter an amount',
    note: 'Note',
    notePlaceholder: 'Note (optional)',
    keep: 'Keep',
    deleteExpense: 'Delete expense',
    confirmDeleteAccessibilityLabel: 'Confirm delete expense',
    deleteAccessibilityLabel: 'Delete expense',
  },
  // Onboarding (P2-1, docs/design-package-phase2/02-p2-1-onboarding-leak-audit.md;
  // welcome + intent picker rewritten by design/redesign-handoff/03-onboarding.md
  // and 05-copy.md). Sentence case, no em dashes; every amount below is a
  // display example only, real amounts always render via useCurrency().format.
  onboarding: {
    // 3.1 Welcome (redesign step 03, screen 1; W1/ADR 0020+0022 replaces the
    // outcome carousel with the honest-zero hero: the real KeptHero at
    // cents=0 plus two value rows. A finance app never shows an invented
    // total, so the only accumulated total this screen ever renders is the
    // user's own ($0.00). valuePropLog is one of the two value-prop rows;
    // valuePropSee/valuePropBreak were retired with the pre-carousel list.
    brandName: 'HabitCents',
    welcomeHeadline: "Your money has a story. Let's read it.",
    valuePropLog: 'Log expenses in 10 seconds.',
    welcomeSub: 'Everything stays on your phone. No bank login. No account.',
    getStarted: 'Get started',
    // ---------------------------------------------------------------------
    // Carousel beats (PRD v3.1 sect 4, ADR 0026). Three beats, one per real
    // workflow. Each shows a RECORDING of the app doing the thing, with a hook
    // below and a CTA that triggers the real workflow, never a simulation of
    // it. Beat order matches the intent order the picker used, so the funnel
    // stays comparable across the change.
    // ---------------------------------------------------------------------
    beatTrackHeadline: 'Log it in ten seconds.',
    beatTrackHook: 'Amount first, one tap. The patterns show up on their own.',
    beatTrackCta: 'Log my first expense',
    beatScanHeadline: 'See where it all goes.',
    beatScanHook: 'Scan a bank statement on your phone. Nothing uploads, ever.',
    beatScanCta: 'Scan my statement',
    beatBreakHeadline: 'Break the one that costs most.',
    beatBreakHook: 'Name it, price it, start today.',
    // Ratified CTA wording (PRD sect 13, resolved round 2).
    beatBreakCta: 'Start with my habit',
    beatProgress: (n: number, total: number) => `Step ${n} of ${total}`,
    // Shown in the media frame until the real captures land. Says what is
    // missing rather than showing a mock-up of the app, which is the whole
    // point of ADR 0026.
    beatMediaPending: 'Preview coming soon',
    // Rescued from the retired How-it-works sheet's third row; now the
    // second honest-zero value row under the hero.
    outcomeKeptCounts: 'Every time you skip it, we count the money you kept.',
    // Example fragments under the hero (W1): per-skip example prices only,
    // explicitly marked "for example", never an accumulated total. Rotates
    // decoratively; never routed through useCurrency().format, these are
    // fixed mockup content, same as a static design comp.
    exampleSkipPrefix: 'for example:',
    exampleSkips: [
      'one skipped coffee keeps $6.50',
      'one skipped delivery keeps $18.00',
      'one skipped impulse buy keeps $12.50',
    ],
    // 3.2 Intent picker (redesign step 03, screen 2; replaces the two-door fork)
    // Build 8 decision: action-framed title ("How would you like to start?"
    // replaces "What brings you here?"); subtitle drops "You can do all three
    // later." entirely. This title is a question, not a statement, so it
    // keeps its question mark rather than taking the serif screen-title
    // period (PATTERN_VOCABULARY.md's period rule assumes a declarative
    // title; it does not apply to an interrogative one).
    intentTitle: 'How would you like to start?',
    intentSub: 'Pick one.',
    // Eyebrows are stored sentence case and rendered uppercase by the style, so
    // screen readers announce them as sentences.
    intentTrackEyebrow: '10 seconds to start',
    intentTrackTitle: 'Just track my spending',
    intentTrackDescription: 'Amount first, one tap per expense. Patterns show up on their own.',
    intentScanEyebrow: '2 to 3 minutes',
    intentScanTitle: 'See where it all goes',
    intentScanDescription: 'Scan a bank statement on your phone. Nothing uploads, ever.',
    intentBreakEyebrow: 'About a minute',
    intentBreakTitle: 'Break an expensive habit',
    intentBreakDescription: 'Name it, price it, start today.',
    // Ratified inviting phrasing (Charen, 2026-08-04); replaces 'Skip for now'.
    skipForNow: "I'll explore on my own",
    // "Something else" is shared: the intent picker's audit chips used to own
    // it, and the Door 3 break sheet (below) reuses it rather than duplicating.
    somethingElse: 'Something else',
    somethingElseNamePlaceholder: 'What is it called?',
    // ---------------------------------------------------------------------
    // Door 3 break sheet (W3, "the app is the onboarding" complete, ADR 0020
    // + 0022). The audit/reveal/success screens this used to lead to are
    // deleted; breaking a habit now happens in one sheet over the real app.
    // Locked vocabulary: leak/skip/kept/slip, "break a habit" never "create a
    // goal". The amount/CTA copy below is deliberately identical to the
    // pick-one sheet's (strings.habitLogging), reused rather than duplicated.
    // ---------------------------------------------------------------------
    breakSheetTitle: 'Break an expensive habit.',
    breakSheetCaption: 'Pick one or name your own. One is free, always.',
    breakSheetCadenceLabel: 'How often',
    breakSheetCadenceMostDays: 'Most days',
    breakSheetCadenceWeekly: 'Weekly',
    breakSheetCadenceMonthly: 'Monthly',
    // Pure arithmetic from the amount the user just typed (365/52/12 by
    // cadence), never an invented rate; full sentences per cadence rather than
    // composed word fragments, so each reads naturally.
    breakSheetYearlyLineDaily: (amount: string) => `Skipping it most days keeps about ${amount} a year.`,
    breakSheetYearlyLineWeekly: (amount: string) => `Skipping it every week keeps about ${amount} a year.`,
    breakSheetYearlyLineMonthly: (amount: string) => `Skipping it every month keeps about ${amount} a year.`,
    breakSheetBoughtTodayLabel: 'Did you buy it today?',
    breakSheetBoughtYes: 'Yes, log it',
    breakSheetBoughtNo: 'Not today',
    // Disabled-Start hints (ops ADR 0028, 2026-08-16): named in the order
    // canStart actually checks, so the hint always names the FIRST thing
    // missing rather than every gap at once. The amount gap reuses
    // sheets.saveHintAmount rather than a fourth copy of that sentence.
    breakSheetHintPickHabit: 'Pick a habit first',
    breakSheetHintNameIt: 'Name it first',
  },
  // --- Leak Scan (P2-1b). Canonical behavior: docs/design-context/leak-scan-spec.md.
  // Canonical visuals: docs/design-package-phase2/03-p2-1b-leak-scan-visuals.md.
  // Vocabulary is load-bearing: tiers are solid/likely/needs review, never a
  // percentage; leak/skip/kept vocabulary elsewhere is untouched by this screen.
  leakScan: {
    reminderTimeLabel: 'Reminder time',
    // Intake
    intakeTitle: 'Scan your statement.',
    intakeSubtitle: 'CSV files only. Everything stays on this device.',
    chooseFiles: 'Choose CSV files',
    // Scope selection (PRD v3.1 sect 7.1). The question is where to look, not
    // "review what we found": the user draws the boundary so the app never has
    // to claim it knows what is essential.
    scopeTitle: 'Where should we look?',
    scopeSubtitle: 'Pick the spending you want habit ideas from. You can change this on your next scan.',
    scopeLockedHeading: 'Never searched',
    // Reads as judgment, not omission (sect 7.1).
    scopeLockedReason: 'Rent, medical, childcare, and insurance go to Upcoming, not to habits.',
    scopeAvailableHeading: 'Search these',
    scopeConfirm: 'Show my leaks',
    scopeSelectedCount: (n: number) => (n === 1 ? '1 category selected' : `${n} categories selected`),
    // Confirming with nothing selected is allowed: the dashboard still shows
    // every dollar, there are simply no habit proposals.
    scopeNoneSelected: 'No habit ideas, just the breakdown',
    scopeLockedHint: 'Always excluded',
    scopeOn: 'Searching',
    scopeOff: 'Not searching',
    // Habit deck (PRD v3.1 sect 7.3). At most three cards, each a decision
    // rather than a reading assignment.
    deckTitle: 'Start with one.',
    deckSubtitle: 'These showed up most often in your statement. Break one now, or say which are not habits.',
    // Card 1 keeps the biggest-leak eyebrow; the rest are simply also-rans.
    deckAlsoEyebrow: 'Also showing up',
    // Terminal exit and the all-dismissed fallback both land on the full
    // breakdown. One hop, never a fallback of a fallback.
    deckSeeEverything: 'See the full breakdown',
    // Payoff (PRD v3.1 sect 7.5, phase 4; revives the screen ADR 0020 retired,
    // per ADR 0026). The quiet variant: nothing has been kept yet, and the
    // screen says so honestly rather than celebrating a number the user has
    // not earned.
    payoffTitle: 'You have a habit to break.',
    // Every figure here is observed, never extrapolated: a count, a total, and
    // a per-buy price. "in your statement" rather than "last month" because
    // the evidence window is whatever the user's export covered, which is
    // frequently not a month (UX-073's lesson, stated in copy).
    payoffEvidence: (name: string, count: number, total: string, perSkip: string) =>
      `${name}, ${count} time${count === 1 ? '' : 's'}, ${total} in your statement. Skip it once and ${perSkip} comes back.`,
    payoffCaption: 'We will ask you about it. Every skip you log adds to the counter above.',
    payoffContinue: 'Continue',
    // Bills offer (PRD v3.1 sect 8). "Tracking an essential is fine, proposing
    // you skip it is not": same data, different verb. This is the screen where
    // both halves of the positioning show at once.
    billsTitle: 'The rest of your money.',
    billsSubtitle: 'These repeat on a schedule. We can keep an eye on them in Upcoming, no habits, no nudges.',
    billsGroupBills: 'Bills',
    billsGroupSubscriptions: 'Subscriptions',
    // Cadence is pre-answered from the statement, so the row states it rather
    // than asking (propose, do not ask).
    billsCadenceWeekly: 'Every week',
    billsCadenceBiweekly: 'Every two weeks',
    billsCadenceMonthly: 'Every month',
    billsCadenceAnnual: 'Every year',
    billsConfirm: (n: number) => (n === 1 ? 'Add 1 to Upcoming' : `Add ${n} to Upcoming`),
    billsConfirmNone: 'Not right now',
    billsSkip: 'Skip this',
    billsAddedToast: (n: number) =>
      n === 1 ? 'Added 1 to Upcoming.' : `Added ${n} to Upcoming.`,
    billsRowOn: 'Will be added',
    billsRowOff: 'Will not be added',
    filesChosenCount: (n: number) => `${n} file${n === 1 ? '' : 's'} selected`,
    startScan: 'Start scan',
    scanningTitle: 'Reading your files',
    scanningSubtitle: 'On this device. Usually a few seconds.',
    // UX-037: the spend pulse's granularity switcher is now the ratified
    // SegmentedControl, which needs an accessible name for its tablist.
    pulseGranularityLabel: 'Spend view',
    // UX-046: strings that were living as literals in components.
    moreOptionsLabel: 'More options',
    reviewQueueGuessedCaption: (category: string) => `Guessed: ${category}`,
    reviewQueueGuessedLabel: (merchant: string, category: string, tier: string) =>
      `${merchant}, we guessed ${category}, ${tier}`,
    // UX-014: the intake hook sets these two error codes but nothing rendered
    // them, so a failed pick bounced back to idle with no explanation.
    errorNoValidFiles: 'None of those files could be read. CSV files only.',
    errorPickFailed: 'That did not open. Try choosing the files again.',
    // Results (spec 03 path B, copy from 05-copy.md)
    resultsTitle: 'Your statements, read.',
    leaksRankedTitle: 'Your leaks, ranked',
    fileTooLarge: (name: string) => `${name} is larger than 10 MB and was skipped.`,
    tooManyFiles: 'Up to 5 files per scan; the rest were skipped.',
    // The two permitted questions (spec section 3, 4; visual spec section 11)
    dateOrderQuestion: 'Is 03/04 March 4th or April 3rd?',
    dateOrderChipMarch: 'March 4',
    dateOrderChipApril: 'April 3',
    signConfirmationQuestion: 'Purchases in this file look like negative numbers, right?',
    signConfirmationYes: 'Yes',
    signConfirmationNo: 'No',
    // Tier badges (visual spec section 2)
    tierSolid: 'Solid',
    tierLikely: 'Likely',
    tierReview: 'Needs review',
    // KPI row (spec 5.1, visual spec 3)
    kpiTotalSpent: 'Total spent',
    kpiPerDay: 'Per day',
    kpiTransactions: 'Transactions',
    kpiNetOfTransfers: 'Net of transfers',
    kpiPurchasesPerDay: (rate: string) => `${rate} purchases/day`,
    // UX-073: "covered days" counted only days that carried a transaction, so
    // this line disagreed with the evidence-window eyebrow directly above it.
    // It now prints the calendar span, the same window every rate divides by.
    kpiOverSpanDays: (days: number) => `over ${days} days`,
    kpiEvidenceWindow: (start: string, end: string, accounts: number) =>
      `${start} to ${end} · ${accounts} account${accounts === 1 ? '' : 's'}`,
    // Categories (spec 5.2, visual spec 4)
    categoriesTitle: 'Where it went',
    viewMore: 'View more',
    percentOfTotal: (pct: number) => `${pct}% of total`,
    // SpendPulse (spec 5.3, visual spec 5)
    pulseGranularityDay: 'Day',
    pulseGranularityMonth: 'Month',
    pulseGranularityYear: 'Year',
    pulseLegendSpend: 'more spent',
    pulseLegendZero: 'no spend',
    pulseLegendOutOfCoverage: 'outside your files',
    // Density line: transacted days out of the window's calendar length. Both
    // arguments used to be distinct-transacted-day counts, so this read
    // "You transacted on 27 of 27 days" (UX-073).
    pulseCaption: (n: number, spanDays: number) => `You transacted on ${n} of ${spanDays} days.`,
    // Finding-first ladder (ADR 0020, W4 redesign step, Charen 2026-08-04):
    // results lead with one BiggestLeakCard before the dashboard, which stays
    // collapsed behind this dashed expander until tapped.
    biggestLeakEyebrow: 'Your biggest leak',
    seeFullPicture: "See the full picture: categories, pulse, next month's projection",
    // Habit cards (spec 5.4, visual spec 6)
    classGovern: 'Govern',
    classInfluence: 'Influence',
    classFixed: 'Fixed',
    habitStatsRow: (orders: number, days: number, spanDays: number, monthTotal: string, month: string) =>
      `${orders} orders · ${days}/${spanDays} days · ${monthTotal} in ${month}`,
    yearlyPacePill: (amount: string) => `≈ ${amount}/yr pace`,
    trackThisLeak: 'Track this leak',
    monitorHabit: 'Monitor',
    fixedTipCard: (month: string, amount: string) =>
      `${month} is a 3-payment month for this loan. Plan for the extra ${amount}.`,
    notAHabit: 'Not a habit',
    wrongDetails: 'Wrong details',
    // Next-month projection (spec 5.5, visual spec 7)
    projectionTitle: 'Next month',
    projectionPlaceholder: 'One full month of data unlocks your projection.',
    projectionLockedIn: 'Recurring: locked in',
    projectionRunRate: 'Variable: run rate',
    // UX-049: named as an estimate. The buffer is a convention, not observed
    // evidence, and the label has to say which it is.
    projectionBuffer: '+12% estimated buffer · irregulars & annual renewals',
    threePaymentMonth: (month: string) => `3 payments in ${month}`,
    saveToHabitCents: 'Save to HabitCents',
    remindDayBefore: 'Remind me the day before',
    // Footer (spec 5.6, visual spec 8)
    footerRowsSummary: (read: number, total: number, skipped: number, dupes: number, transfers: number) =>
      `${read} of ${total} rows read · ${skipped} skipped · ${dupes} merged · ${transfers} netted`,
    undoImport: 'Undo this import',
    undoConfirmTitle: 'Undo this import?',
    undoConfirmMessage: 'This removes everything this import added.',
    // Post-undo exit (U12a dead-end fix): this used to be a bare confirmation
    // with no way out except the invisible iOS edge swipe.
    undoneMessage: 'This import has been undone.',
    undoneContinue: 'Continue to HabitCents',
    // Post-scan handoff (spec 5 post-scan, visual spec 12).
    // Spec 05 proposed "Continue to the app" here. Kept as a write-labeled verb
    // deliberately (Charen, 2026-07-31): this button writes expenses before it
    // navigates, and a navigation verb would hide a data write. The spec's
    // confirmation toast still applies and fires on success. Window widened
    // 15 -> 30 days and promoted to the primary CTA (ADR 0020, W4 finding-first
    // ladder, Charen 2026-08-04); this closes the leak-scan CTA punch-list item.
    bringInLastDays: (days: number) => `Bring in your last ${days} days`,
    savedToHabitCents: 'Saved to HabitCents.',
    // Re-scan dedup (review fix, build 12 re-scan entry): honest disclosure
    // when filterAlreadyImported (utils/leakScan/importWrite.ts) drops rows
    // that were already brought in by an earlier import.
    skippedAlreadyImported: (n: number) => `${n} already imported earlier, skipped.`,
    // Merchant review queue (spec 6/7, visual spec 10)
    reviewQueueTitle: (n: number) => `Quick check: ${n} merchant${n === 1 ? '' : 's'} we weren't sure about`,
    reviewQueueProgress: (done: number, n: number) => `${done} of ${n}`,
    reviewQueueDone: 'Done',
    reviewQueueSkipRest: 'Skip the rest',
    // Graceful failure (spec 7, visual spec 9)
    failureTitle: "This one's on us.",
    failureBody:
      "We couldn't read this file confidently enough to trust the numbers, and half-right money math is worse than none. Your data is fine; our reader just isn't fluent in this format yet.",
    failureTryDifferentExport: 'Try a different export',
    failureTryDifferentExportHint:
      'Banks usually offer a few download formats. CSV works best; a shorter date range sometimes exports cleaner.',
    failureStartLeakAudit: 'Start with the 90-second Leak Audit',
    failureLogByHand: 'Log your first expense by hand',
  },
  // Paywall (BET-004, Phase 3). PLANNED prices, pending Charen's design and
  // final pricing sign-off. Copy frames prices as not-yet-live.
  paywall: {
    title: 'Break more than one habit',
    subtitle: 'Free keeps 1 habit, always. Premium lets you break up to 5 at once.',
    plannedBanner: 'Planned pricing. In-app purchases are not live yet, so nothing is charged.',
    feature1: 'Break up to 5 habits at once',
    feature2: 'Keep counting every dollar, no caps',
    feature3: 'Back a solo, privacy-first app',
    planYearlyName: 'Yearly',
    planYearlyPrice: '$29.99',
    planYearlyPeriod: 'per year',
    planYearlyCaption: 'about $2.50 a month',
    planYearlyBadge: 'Best value',
    planMonthlyName: 'Monthly',
    planMonthlyPrice: '$3.99',
    planMonthlyPeriod: 'per month',
    planLifetimeName: 'Lifetime',
    planLifetimePrice: '$49.99',
    planLifetimePeriod: 'once',
    planLifetimeCaption: 'pay once, keep it forever',
    trialLine: 'Start with a 14-day free trial. Cancel anytime before it ends.',
    startTrialCta: 'Start free trial',
    restoreCta: 'Restore purchases',
    closeLabel: 'Close',
    // Redesign step 04 (spec 04 "Paywall"). The gradient hero eyebrow, and the
    // descriptive dismiss that replaces a bare close. Never "No thanks".
    heroEyebrow: 'Premium',
    stayOnFreePlan: 'Stay on free plan',
    planSelectedLabel: (name: string, price: string, selected: boolean) =>
      `${name}, ${price}, ${selected ? 'selected' : 'not selected'}`,
  },

  // =====================================================================
  // Redesign step 04 (design/redesign-handoff/04-screens.md + 05-copy.md).
  // Sentence case; middots, never dashes. Eyebrow values are stored sentence
  // case and uppercased by the style so screen readers announce words.
  // Amounts are always passed in already formatted by useCurrency().format.
  // =====================================================================

  // Every mutating action fires exactly one toast (spec 01 section 5).
  toasts: {
    logged: 'Logged.',
    saved: 'Saved.',
    deleted: 'Deleted.',
    undo: 'Undo',
    restored: 'Restored.',
    addedToUpcoming: 'Added to upcoming.',
    stoppedHistoryKept: 'Stopped. Your history is kept.',
    trialStarted: 'Trial started. 14 days free.',
    skipValueSaved: (skipValue: string) => `Saved. One skip keeps ${skipValue}.`,
    keptBack: (amount: string) => `+${amount} kept back.`,
    yesterdayCounted: (skipValue: string) => `Yesterday counted. +${skipValue} kept.`,
    yesterdayNoted: 'Yesterday noted.',
    // UX-022: dismissing a detected leak is a mutating action, so it fires a
    // toast with an undo like every other one.
    leakDismissed: 'Leak set aside.',
    // UX-021: the start path can throw. Say so plainly and invite a retry;
    // never leave the button dead with no explanation.
    startHabitFailed: 'That did not start. Try again.',
    // Storage write failures. Until the write policy in utils/storage.ts was
    // inverted, a failed persist still produced "Logged." and a success
    // haptic; these are what the app says instead. Plain, specific about what
    // did not happen, and always an invitation to retry -- the user's input is
    // still on screen, so a retry costs one tap.
    logFailed: 'That did not save. Try again.',
    saveFailed: 'That did not save. Try again.',
    deleteFailed: 'That did not delete. Try again.',
    restoreFailed: 'That did not come back. Try again.',
    addUpcomingFailed: 'That did not save. Try again.',
    checkInFailed: 'That did not save. Try again.',
    stopHabitFailed: 'That did not stop. Try again.',
    skipValueFailed: 'That did not save. Try again.',
    dismissLeakFailed: 'That did not save. Try again.',
    categoryFailed: 'That did not save. Try again.',
    currencyFailed: 'That did not save. Try again.',
    startOverFailed: 'That did not reset. Try again.',
    importFailed: 'That did not save. Nothing was imported. Try again.',
    // enterCategoryNameFirst removed (ADR 0031): the last of the
    // toast-instead-of-disabling family died when AddCategoryModal converged
    // on disabled-until-valid; the guidance lives in
    // sheets.saveHintCategoryName now.
  },

  // Today tab (spec 04 "Today").
  today: {
    // Spent/Kept chips (redesign U5, ADR 0019, DI-5): the two value chips that
    // ARE the Today tab control. Sentence case, uppercased in-component.
    spentChipLabel: 'Spent today',
    keptChipLabel: 'Kept today',
    spentKeptTabsLabel: 'Today view',
    checkInPendingA11y: 'check-in waiting',
    // First-run chip placeholders (Charen, 2026-09-03): before the activity
    // exists, $0.00 would read as a measured verdict ("you kept nothing")
    // when the truth is not-started, so the amount slot carries these words
    // instead. Deliberately no numbers; "logs" and "skips" teach the
    // mechanic in the locked vocabulary. Amounts return for good after the
    // first expense log / first habit break, including an honest $0.00.
    spentChipNoLogs: 'No logs yet',
    keptChipNoSkips: 'No skips yet',
    // Kept band. The eyebrow and caption already live in habitLogging
    // (keptSoFar, keptCaption, keptZeroCaption); nothing is duplicated here.
    // Check-in card
    openHabitLabel: (name: string) => `${name}, view habit details`,
    skipWithValue: (skipValue: string) => `Skipped it · keeps ${skipValue}`,
    skipOneWithValue: (skipValue: string) => `I skipped one · keeps ${skipValue}`,
    boughtIt: 'Bought it',
    skippedIt: 'Skipped it',
    keptAdded: (skipValue: string) => `+${skipValue} kept.`,
    daysThisWeek: (n: number, m: number) => `That's ${n} of ${m} days this week.`,
    slipLogged: 'Logged.',
    slipKeptStays: (n: number, m: number) =>
      `Still ${n} of ${m} days this week. Your kept stays yours.`,
    weekSummarySkipped: (n: number, m: number) => `${n} of ${m} days`,
    weekSummaryTail: (weekKept: string) => ` skipped this week · ${weekKept} kept`,
    // Weekly-cadence habit (second habit shape, spec 04 "Today" 3.7)
    weeklyPill: 'weekly',
    monthlyPill: 'monthly',
    weeklyNoCheckIn: 'No daily check-in. Tap whenever you skip an order.',
    // Stopped habit
    breakItAgain: 'Break it again',
    // Quick log card
    quickLogEyebrow: 'Quick log',
    quickLogHint: 'amount first',
    quickLogOpenLabel: 'Log an expense',
    quickLogMoreLabel: 'More categories',
    quickLogCategoryLabel: (name: string) => `Log a ${name} expense`,
    // Logged today list
    // Renamed (decision D3, U6): "Logged today" -> "Today's log". Component
    // uppercases it (components/money/LoggedTodayList.tsx).
    loggedTodayEyebrow: "Today's log",
    // View all (U6, decided fix c): trailing link on the Today's log eyebrow
    // row, navigating to Money's Spent segment. Shown only when today has at
    // least one logged expense (LoggedTodayList's onViewAll prop).
    loggedTodayViewAll: 'View all',
    loggedTodayEmpty: 'A quiet day so far. Anything you log lands here.',
    // Spent pane, true zero state (no expenses ever, not just today):
    // replaces the logged-today list entirely rather than showing it empty.
    spentEmptyTitle: 'Start with what you just spent',
    spentEmptyBody: 'Amount first, then a category. About ten seconds.',
    spentEmptyCta: 'Log an expense',
    // Kept pane, true zero state. Deliberately the same visible words as
    // insights.leaksEmptyTitle/Body/Cta (kept has its own keys so the two
    // surfaces stop sharing one string).
    keptEmptyTitle: 'Your leaks will show up here',
    keptEmptyBody: 'Keep logging expenses. Around 4 logs at the same place is enough to spot a pattern.',
    keptEmptyCta: 'Log an expense',
    alreadyBreakingToast: "You're already breaking this habit.",
    editExpenseLabel: (title: string, amountLabel: string) => `Edit ${title}, ${amountLabel}`,
    // Break-another affordance (DI-6, ADR 0019): quiet, always-present at the
    // bottom of the Kept view. The caption reuses habitLogging.freeTierNote
    // (the same gate copy PickOneSheet's locked sheet already states) rather
    // than inventing a new pricing line.
    breakAnotherHabitCta: 'Break another habit',
    // Door 1 real-app first run (W2, ratified onboarding redesign): Door 1 no
    // longer passes through a practice log screen, it opens the real
    // LogExpenseSheet in place. The hint copy voice carries over from the
    // retired guided-log screen (onboarding.guidedLogHint).
    firstLogCoachLine: "The real thing, not a practice run. Amount first.",
    // FirstRunRibbon messages (components/onboarding/FirstRunRibbon.tsx),
    // keyed by messageKey in the persisted record. Saved: the log went
    // through. Gentle: the sheet was closed before saving, so onboarding
    // still completes but nothing is claimed to have happened yet.
    firstRunRibbonSaved: "Logged for real. A few more like this and we'll spot your first leak.",
    firstRunRibbonGentle: "Log your first expense whenever you're ready.",
    // Door 3 first-run ribbon (W3): same FirstRunRibbon component and hook as
    // door1's above, keyed 'door3' instead. Started: a habit exists, so point
    // at the check-in card that's now on the page. Gentle: nothing was
    // started, so nothing is claimed to have happened yet.
    door3RibbonStarted: 'Your habit is set. Your first check-in is below.',
    door3RibbonGentle: "Break a habit whenever you're ready.",
    // Watch-nudge (W2 item 3): a dashed, UpcomingList-style affordance under
    // the just-logged row, offered only when that log carries a merchant.
    // Accepting seeds a discovered, honestly-observed leak (one log, no
    // stated cadence); it never claims to "create a habit".
    watchLeakNudgeLabel: 'Buy this often? Watch it as a leak',
    watchLeakNudgeDismiss: 'not now',
    // Quote rotation (U6, components/today/ViewQuote.tsx + useViewQuote.ts).
    // Spent view closes with one of these, Kept view opens with one of
    // these; each array rotates independently (its own persisted counter).
    // Historical quotes keep their own original capitalization and
    // punctuation; nothing here is reworded. No em dash appears in any of
    // them, by the house content rule.
    spentQuotes: [
      { text: 'Beware of little expenses; a small leak will sink a great ship.', by: 'Benjamin Franklin' },
      { text: 'Whatever you have, spend less.', by: 'Samuel Johnson' },
      { text: 'Take care of the pence, and the pounds will take care of themselves.', by: 'William Lowndes' },
      { text: "The cheapest thing you'll buy today is the one you don't." },
      { text: "A habit doesn't feel expensive. That's how it stays one." },
    ] as TodayQuote[],
    keptQuotes: [
      { text: 'What you skip today is still yours tomorrow.' },
      { text: 'A skipped purchase is the quietest way to get paid.' },
      { text: "If you know how to spend less than you get, you have the philosopher's stone.", by: 'Benjamin Franklin' },
      { text: 'Habit is a cable; we weave a thread of it each day.', by: 'Horace Mann' },
    ] as TodayQuote[],
  },

  // Log and edit expense sheets (spec 04 "Log / Edit sheets"). Merged into one
  // ExpenseSheet component (U2, the expense drawer rebuild); the mode
  // ('log' | 'edit') only changes the eyebrow, this coach line, the primary
  // button label, and edit's added delete row.
  //
  // Expense-sheet workflow redesign (Charen, 2026-08-16): Save now lives in a
  // pinned header next to the title and is disabled until an amount is
  // entered (cents > 0), replacing the old always-live button that toasted
  // "Enter an amount first." on an empty tap. This was the first sheet
  // converted to the disabled-until-valid convention (ops ADR 0028), and its
  // header became the shared ui/SheetHeader that every form sheet now uses
  // (ADR 0031): title left, Save top-right, no in-sheet Cancel. Nothing in
  // the app toasts on an empty required field anymore.
  expenseSheet: {
    logEyebrow: 'Log expense',
    editEyebrow: 'Edit expense',
    categoryEyebrow: 'Category',
    // Optional merchant capture (Charen, 2026-08-04). Detection groups on
    // expense.merchant, so this field is the only way the app's own logging
    // flow can ever produce a leak. The field label and placeholder are the
    // ones the old form used (strings.expenses.merchant*), reused as is.
    whereEyebrow: 'Where',
    saveExpense: 'Save expense',
    saveChanges: 'Save changes',
    deleteExpense: 'Delete expense',
    amountLabel: (formattedAmount: string) => `Amount, ${formattedAmount}`,
    // Expense-sheet workflow redesign (2026-08-16): label for the Done bar
    // that dismisses the iOS decimal pad, which has no return key of its own.
    keyboardDone: 'Done',
  },

  // Money tab (spec 04 "Money").
  money: {
    segmentSpent: 'Spent',
    segmentUpcoming: 'Upcoming',
    segmentHabits: 'Habits',
    segmentLabel: 'Money view',
    // Habits (management surface for every leak and habit, ADR 0019 DI-8).
    // count is ACTIVE habits (status tracking or changing) only, so the total
    // is never claimed for a leak nobody has started breaking yet.
    habitsManagedSummary: (count: number, formattedTotal: string) =>
      `${count} habit${count === 1 ? '' : 's'} managed · about ${formattedTotal} a month`,
    // Shown instead when every row is still a discovered-not-started leak, so
    // the line never reads "0 habits managed" over a real dollar figure.
    habitsDiscoveredSummary: (count: number) =>
      `${count} leak${count === 1 ? '' : 's'} found, none managed yet`,
    // Spent
    spentGroupHeader: (dayLabel: string, total: string) => `${dayLabel} · ${total}`,
    // "Today" / "Yesterday" combined with a formatted date for the eyebrow,
    // e.g. "Today · Aug 10" (SpentList dayLabelFor is the one place this runs).
    spentDayLabel: (dayLabel: string, date: string) => `${dayLabel} · ${date}`,
    spentToday: 'Today',
    spentYesterday: 'Yesterday',
    // Today section, no rows yet. Deliberately compact, one line, not the
    // full EmptyState primitive, so past days stay visible below it.
    spentTodayEmpty: "Nothing yet today. Add it if you spent, and enjoy it if you didn't.",
    spentEditHint: 'Tap a row to edit or delete it.',
    // Cycle indicator (ADR 0024, U11): appended to a Spent/Today row's own
    // accessible label so the glyph's meaning survives VoiceOver rather than
    // relying on shape alone being noticed.
    recurringRowSuffix: 'recurring',
    spentEmptyTitle: 'Nothing logged yet',
    // Every expense you log lands in this list; the empty state says so
    // rather than restating "log your first" (that's the CTA's job).
    spentEmptyBody: 'Every expense you log lands here, newest first.',
    // Upcoming
    upcomingWindowEyebrow: (days: number) => `Next ${days} days`,
    // U8: the window presets picker (2 weeks / 1 month / 3 months).
    upcomingWindowSegmentLabel: 'Upcoming window',
    upcomingWindowTwoWeeks: '2 weeks',
    upcomingWindowOneMonth: '1 month',
    upcomingWindowThreeMonths: '3 months',
    // The total sums every occurrence in the window (upcomingWindowTotal), so
    // this line counts the same thing: payments, not distinct bills. When a
    // bill repeats inside the window the two numbers differ ("11 payments
    // from 3 bills"); when nothing repeats they're the same count, so the
    // second number would only repeat the first ("3 payments").
    upcomingPaymentsCount: (payments: number, bills: number) => {
      const paymentLabel = `${payments} payment${payments === 1 ? '' : 's'}`;
      if (payments === bills) return paymentLabel;
      return `${paymentLabel} from ${bills} bill${bills === 1 ? '' : 's'}`;
    },
    upcomingAddAffordance: 'Add an upcoming expense',
    // Empty-state first actions (PRD v3.1 sect 5). Every empty state a skipper
    // can reach has to offer something to DO, not just explain itself.
    spentEmptyCta: 'Log an expense',
    habitsEmptyCta: 'Break a habit',
    habitsEmptyTitle: 'No leaks spotted yet',
    habitsEmptyBody: 'Keep logging and patterns surface on their own. Or pick a habit to break yourself.',
    upcomingListEyebrow: 'Scheduled',
    // True zero-data state (no recurring expense exists at all), distinct
    // from the window-empty state below (a recurring expense exists, just
    // none fall in the current window).
    upcomingEmptyTitle: 'Nothing repeating yet',
    upcomingEmptyBody: "Mark an expense as repeating and we'll show its next date here.",
    // Same words as upcomingAddAffordance (the header affordance), its own key
    // so the true-zero empty state's CTA can be targeted unambiguously.
    upcomingEmptyCta: 'Add an upcoming expense',
    multiPaymentPill: (count: number, monthLabel: string) => `${count} payments in ${monthLabel}`,
    // Schedule line under an upcoming row, assembled in utils/recurring.ts:
    // "Monthly · 1st · next Aug 1", "Every 2 weeks · next Aug 14".
    scheduleSeparator: ' · ',
    scheduleOneTime: 'One-time',
    scheduleWeekly: 'Weekly',
    scheduleBiweekly: 'Every 2 weeks',
    scheduleMonthly: 'Monthly',
    scheduleAnnual: 'Yearly',
    scheduleEveryNDays: (n: number) => `Every ${n} days`,
    scheduleWeekdayPlural: (weekday: string) => `${weekday}s`,
    scheduleNext: (date: string) => `next ${date}`,
  },

  // Add-upcoming sheet (spec 04 "Add-upcoming sheet"; U8 added edit mode,
  // mirroring ExpenseSheet's log/edit split).
  addUpcoming: {
    title: 'Add upcoming.',
    editTitle: 'Edit upcoming.',
    saveChanges: 'Save changes',
    deleteUpcoming: 'Delete upcoming expense',
    whatIsIt: 'What is it?',
    namePlaceholder: 'Name it',
    nameFieldLabel: 'Name',
    nameRent: 'Rent',
    nameInternet: 'Internet',
    namePhone: 'Phone',
    nameGym: 'Gym',
    nameInsurance: 'Insurance',
    nameUtilities: 'Utilities',
    schedule: 'Schedule',
    oneTime: 'One-time',
    repeats: 'Repeats',
    scheduleSegmentLabel: 'Schedule type',
    // One-time
    when: 'When?',
    whenTomorrow: 'Tomorrow',
    whenNextWeek: 'Next week',
    whenInTwoWeeks: 'In two weeks',
    whenNextMonth: 'Next month',
    // Repeats
    frequencyWeekly: 'Weekly',
    frequencyBiweekly: 'Bi-weekly',
    frequencyMonthly: 'Monthly',
    frequencyCustom: 'Custom',
    // Yearly (U8): only reachable by editing an item Leak Scan imported with
    // an annual rule (recurring.ts advance()) -- the add flow's chip row
    // exposes it too now, so an edit round-trips without losing the cadence.
    frequencyAnnual: 'Yearly',
    onWhichDay: 'On which day?',
    starting: 'Starting',
    startingThisWeek: 'This week',
    startingNextWeek: 'Next week',
    onThe: 'On the',
    monthDayFirst: '1st',
    monthDayFifteenth: '15th',
    monthDayThirtieth: '30th',
    monthDayLast: 'Last day',
    everyNDaysLabel: 'Every N days',
    everyNDaysValue: (n: number) => `Every ${n} days`,
    everyNDaysDecrease: 'Fewer days',
    everyNDaysIncrease: 'More days',
    save: 'Add to upcoming',
    // ADR 0023: AmountField's accessibility label, same shape as
    // strings.expenseSheet.amountLabel.
    amountLabel: (formattedAmount: string) => `Amount, ${formattedAmount}`,
  },

  // Insights tab (spec 04 "Insights").
  insights: {
    leaksTitle: 'Your leaks',
    leakSummary: (monthTotal: string, buys: number) =>
      `${monthTotal} a month · ${buys} buy${buys === 1 ? '' : 's'}`,
    // Same row, thin observation: the total we watched, never a monthly rate.
    leakSummaryObserved: (observedTotal: string, buys: number) =>
      `${observedTotal} so far · ${buys} buy${buys === 1 ? '' : 's'}`,
    leakActionBreak: 'Break it',
    leakActionBreaking: 'Breaking',
    leakActionWatch: 'Watch',
    // Shared across LeaksCard, HabitsList, and the Today Kept view's no-leaks
    // state (was duplicated as habitLogging.emptyLeaksTitle/Subtitle;
    // collapsed to this one key). Body keeps the honest detection threshold
    // verbatim (house rule: real detection window, not a rounded claim).
    leaksEmptyTitle: 'Your leaks will show up here',
    leaksEmptyCta: 'Log an expense',
    leaksEmptyBody:
      'Keep logging expenses. Around 4 logs at the same place is enough to spot a pattern.',
    whereItWentTitle: 'Where it went',
    whereItWentRange: (days: number) => `Last ${days} days`,
    whereItWentEmpty: 'No spending in this range yet.',
    paceTitle: (monthLabel: string) => `${monthLabel} pace`,
    paceProjectedCaption: (daysLeft: number) =>
      `projected · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`,
    paceSpentUnder: (spent: string, difference: string, monthLabel: string) =>
      `${spent} spent · ${difference} under ${monthLabel}`,
    paceSpentOver: (spent: string, difference: string, monthLabel: string) =>
      `${spent} spent · ${difference} over ${monthLabel}`,
    paceSpentOnly: (spent: string) => `${spent} spent`,
    pacePlaceholder: 'One full month of data unlocks your pace.',
    // This month segment, true zero state (no expenses and no leak rows at
    // all): replaces the three-card stack entirely rather than showing three
    // empty cards stacked on top of each other.
    monthEmptyTitle: 'Your first insights are a few logs away',
    monthEmptyBody:
      'Log what you spend and this fills in: where it went, and which leaks are worth breaking.',
    monthEmptyCta: 'Log an expense',

    // First scan segment (W5, OB-6 Insights half, ADR 0020: summary shown
    // until replaced, no expiry). Conditional on a persisted ScanSummary.
    monthSegment: 'This month',
    scanSegment: 'First scan',
    scanSegmentControlLabel: 'Insights view',
    // Loaded, no scan on file yet (scanSummary resolved to null).
    scanEmptyTitle: 'Find the leaks you already have',
    // The privacy line is quoted verbatim from the app's existing scan copy
    // (onboarding.beatScanHook / intentScanDescription).
    scanEmptyBody: 'Scan a bank statement on your phone. Nothing uploads, ever.',
    scanEmptyCta: 'Scan my statement',
    scanSnapshotEyebrow: (date: string) => `First scan · ${date}`,
    // Evidence line under the eyebrow: what this snapshot covers, honestly.
    // windowLabel is omitted when the scan carried no coverage window.
    scanEvidenceLine: (fileCount: number, rowCount: number, windowLabel?: string | null) =>
      windowLabel
        ? `${fileCount} file${fileCount === 1 ? '' : 's'} · ${windowLabel} · ${rowCount} row${rowCount === 1 ? '' : 's'}`
        : `${fileCount} file${fileCount === 1 ? '' : 's'} · ${rowCount} row${rowCount === 1 ? '' : 's'}`,
    // Leak rows here are display-only; the app has no dedicated habit-
    // management surface other than the leaks card in This month, above.
    scanLeaksCaption: 'Manage leaks from This month, above.',
    scanProjectionLockedInCaption: (amount: string) => `${amount} locked in from recurring`,
    scanUpdatedCaption: 'Updated when you run a new scan.',
    // Re-scan entry (build 12): the footer caption above was informational
    // only, with no path back to /leak-scan once onboarding finished. This
    // is that path, a 44pt tertiary control below the caption.
    scanRerunAction: 'Run a new scan',
  },

  // Habit detail redesign (spec 04 "Habit detail"). The arc, chapter and
  // identity copy already live in habitLogging; only the new lines are here.
  habitDetailV2: {
    backLabel: 'Back',
    subtitle: (merchant: string, timesPerMonth: number) =>
      `${merchant}, about ${timesPerMonth} times a month.`,
    subtitleNoMerchant: (timesPerMonth: number) => `About ${timesPerMonth} times a month.`,
    eventHistoryEmpty: 'Nothing logged yet.',
    arcPill: (total: number, chapter: string) => `${total} of 66 · ${chapter}`,
    skipValueSheetTitle: 'One skip keeps',
    skipValueSave: 'Save',
    stopConfirmCta: 'Stop breaking it',
    stopConfirmKeepGoing: 'Keep going',
  },
} as const;
