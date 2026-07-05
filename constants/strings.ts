// Centralized user-facing UI strings.
// Pure relocation: values must match the exact original wording. Do not reword.
// Import with: import { strings } from '@/constants/strings';

export const strings = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    ok: 'OK',
    keep: 'Keep',
  },
  tabs: {
    expenses: 'Expenses',
    reports: 'Reports',
    categories: 'Categories',
    habits: 'Habits',
  },
  expenses: {
    recent: 'Recent',
    upcoming: 'Upcoming',
    merchantPlaceholder: 'Merchant (e.g. Starbucks)',
    notePlaceholder: 'Note (optional)',
    saveExpense: 'Save Expense',
    all: 'All',
    editAccessibilityLabel: (title: string, amountLabel: string) => `Edit ${title}, ${amountLabel}`,
    // Zero-expense empty state (spec 05 section 5.1).
    emptyTitle: 'No expenses yet',
    emptyBody: 'Log your first in about 10 seconds. Amount first, then tap a category.',
    emptyCta: 'Add an expense',
  },
  upcoming: {
    emptyTitle: 'Nothing upcoming',
    emptySubtitle:
      'Mark an expense as recurring (weekly or monthly) and its next occurrence shows up here.',
    totalLabel: (windowDays: number) => `NEXT ${windowDays} DAYS`,
    recurringCount: (count: number) =>
      `${count} recurring ${count === 1 ? 'expense' : 'expenses'}`,
  },
  habits: {
    title: 'Your Habits',
    loading: 'Analyzing your spending patterns...',
    // Pre-detection progress state (spec 05 section 5.2): shown on the Habits
    // tab empty state once logging has started but no leak has been detected
    // yet.
    spottingYourLeak: 'Spotting your leak',
    logsAtSamePlace: (n: number, threshold: number) => `${n} of ${threshold} logs`,
    logsAtSamePlaceBody: 'Around 4 logs at one merchant is enough to see a pattern. Keep logging.',
  },
  // Habit logging v2 (docs/design-package-phase2/01-habit-logging-spec.md).
  // Vocabulary is load-bearing: skip is the win, slip is neutral and never
  // subtracts from Kept. Never reword to streak/success/completed language.
  habitLogging: {
    // Kept hero (4.1)
    keptSoFar: 'KEPT SO FAR',
    keptCaption: "money you didn't spend",
    // Leaks found section + leak card (4.10, unchanged from v1)
    leaksFoundSection: 'Leaks found',
    breakingNowSection: 'Breaking now',
    breakIt: 'Break it',
    notThisOne: 'Not this one',
    leakEvidence: (name: string, monthTotal: string, occurrences: number) =>
      `${name} costs you about ${monthTotal} a month. You bought it ${occurrences} times in the last 30 days.`,
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
    pickOneCadenceDaily: 'A daily leak',
    pickOneCadenceWeekly: 'A weekly leak',
    pickOneCadenceMonthly: 'A monthly leak',
    pickOneValueLine: 'Each time you skip it, we count the money as kept.',
    pickOneFieldLabel: 'One skip keeps',
    pickOneCadenceNoteDaily: "We'll ask each day: did you skip it?",
    pickOneCadenceNoteEvent: 'Tap I skipped one whenever you skip. No daily check-in.',
    startBreakingIt: 'Start breaking it',
    freeTierNote: '1 habit on the free plan',
    freeTierTrialCta: 'Start a free trial',
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
    eventSkippedOne: (skipValue: string) => `Skipped one · +${skipValue}`,
    eventBoughtIt: 'Bought it',
    eventBoughtItPartial: (difference: string) => `Bought it · ${difference} kept`,
    // Empty states (4.10)
    emptyLeaksTitle: 'No leaks found yet',
    emptyLeaksSubtitle: 'Keep logging expenses. Around 4 logs at the same place is enough to spot a pattern.',
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
    perMonth: 'per month',
    perDay: 'day',
    perWeek: 'week',
    perMonthUnit: 'month',
    perUnit: (unit: string) => `per ${unit}`,
    whenDoesThisHappen: 'When Does This Happen?',
    confidence: (percent: number) => `${percent}% confidence`,
    yourProgress: 'Your Progress',
    savingsProgress: 'Savings Progress',
    ofGoal: (goal: string) => `of ${goal} goal`,
    milestones: 'Milestones',
    dayStreak: (target: number) => `${target} day streak`,
    suggestions: 'Suggestions',
    suggestionCoffee: 'Try preparing coffee at home to save on coffee shop visits.',
    suggestionReminder: 'Set a reminder before your usual spending time.',
    startTracking: 'Start Tracking This Habit',
    logging: 'Logging...',
    logTodayAsSuccess: 'Log Today as Success',
    slippedToday: 'I slipped today',
  },
  categories: {
    title: 'Categories',
    defaultCategories: 'Default Categories',
    customCategories: 'Custom Categories',
    loading: 'Loading categories...',
    emptyTitle: 'No categories yet',
    emptySubtitle: 'Tap the + button to add your first category',
    deleteTitle: 'Delete Category',
    deleteMessage: (name: string) =>
      `Are you sure you want to delete "${name}"? Your existing expenses are kept; they'll just no longer show this category.`,
    thisMonthSuffix: (amount: string) => `${amount} this month`,
  },
  categoryDetail: {
    notFound: 'Category not found',
    budget: (amount: string) => `Budget: ${amount}/month`,
    thisMonth: 'this month',
    vsLastMonth: (percent: number) => `${percent}% vs last month`,
    transactions: 'transactions',
    avgTransaction: 'avg transaction',
    sixMonthTrend: '6-Month Trend',
    topMerchants: 'Top Merchants',
    transactionCount: (count: number) => `${count} transaction${count !== 1 ? 's' : ''}`,
    recentTransactions: 'Recent Transactions',
    noTransactions: 'No transactions yet',
    transactionDate: (date: string, time: string) => `${date} at ${time}`,
  },
  reports: {
    title: 'Reports',
    subtitle: 'Your financial insights',
    loading: 'Loading reports...',
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
  },
  settings: {
    preferences: 'Preferences',
    currency: 'Currency',
    about: 'About',
    privacyPolicy: 'Privacy policy',
    version: 'Version',
    versionValue: '1.0.0',
    // Currency alert
    currencyAlertTitle: 'Currency',
    currencyAlertMessage: 'Choose your currency',
    currencyOption: (name: string, symbol: string) => `${name} (${symbol})`,
  },
  addCategoryModal: {
    editCategory: 'Edit Category',
    newCategory: 'New Category',
    categoryNamePreview: 'Category Name',
    name: 'Name',
    namePlaceholder: 'Enter category name',
    icon: 'Icon',
    color: 'Color',
    monthlyBudget: 'Monthly Budget (Optional)',
    budgetPlaceholder: '0',
  },
  editExpenseModal: {
    cancelAccessibilityLabel: 'Cancel editing',
    title: 'Edit Expense',
    saveAccessibilityLabel: 'Save expense',
    category: 'Category',
    merchant: 'Merchant',
    merchantPlaceholder: 'Merchant (e.g. Starbucks)',
    note: 'Note',
    notePlaceholder: 'Note (optional)',
    keep: 'Keep',
    deleteExpense: 'Delete expense',
    confirmDeleteAccessibilityLabel: 'Confirm delete expense',
    deleteAccessibilityLabel: 'Delete expense',
  },
  // Onboarding (P2-1, docs/design-package-phase2/02-p2-1-onboarding-leak-audit.md).
  // Two-door fork + Door 1 Leak Audit, the v1 ship gate. Sentence case, no em
  // dashes; every amount below is a display example only, real amounts always
  // render via useCurrency().format.
  onboarding: {
    // 3.1 Welcome
    welcomeHeadline: (amount: string) => `Find the spending habit quietly costing you ${amount} a month`,
    welcomeSub: 'Everything stays on your phone. No bank login. No account.',
    findMyLeak: 'Find my leak',
    howItWorks: 'How it works',
    howItWorksSheet: "Log expenses in 10 seconds. We spot the habit that leaks the most. Every time you skip it, we count the money you kept.",
    // 3.2 Two-door fork
    forkTitle: 'How do you want to start?',
    forkSub: 'Both stay on this device.',
    doorFreshTag: 'About a minute',
    doorFreshName: 'Start fresh',
    doorFreshDescription: 'Tap through what you pay for. We estimate your leak from your answers.',
    doorStatementsTag: '2 to 3 minutes',
    doorStatementsName: 'Bring your statements',
    doorStatementsDescription: 'Import a bank CSV. We scan it on your phone. Nothing uploads, ever.',
    skipForNow: 'Skip for now',
    // 3.3 Step 1: auto-pilot charges
    step1Eyebrow: 'Step 1 of 2 · about 30 seconds',
    step1Title: 'Which of these charge you on auto-pilot?',
    step1Sub: "Tap the ones that ring a bell, we'll watch them for you. A quick scan, not a full inventory. Tap a price to make it exact.",
    somethingElse: 'Something else',
    somethingElseYouSetIt: 'you set it',
    somethingElseNamePlaceholder: 'What is it called?',
    runningTotalMonth: (total: string) => `${total} a month so far`,
    continueButton: 'Continue',
    noneOfThese: 'None of these',
    editorRealPrice: (chipName: string) => `${chipName} · your real price`,
    editorPresetCaption: (preset: string) =>
      `Preset was ${preset}. Set saves your exact price, ✕ keeps the preset.`,
    editorSet: 'Set',
    editorCancelLabel: 'Keep the preset price',
    // 3.4 Step 2: everyday rhythm
    step2Eyebrow: 'Step 2 of 2 · about 30 seconds',
    step2Title: 'And the everyday stuff?',
    step2Sub: 'Roughly how often in a typical week. No amounts to add up. Tap a price if yours differs.',
    eachAmount: (amount: string) => `about ${amount} each`,
    bandNever: 'Never',
    bandOneToTwo: '1-2',
    bandThreeToFive: '3-5',
    bandDaily: 'Daily',
    runningWeekly: (weekly: string) => `adds ${weekly} a week`,
    seeMyLeak: 'See my leak',
    skipThisStep: 'Skip this step',
    // 3.5 The reveal
    revealYearly: (yearly: string) => `~${yearly}`,
    revealCaption: (monthly: string) => `leaking a year. That's about ${monthly} a month.`,
    revealCaptionSubsOnly: (monthly: string) =>
      `leaking a year from your subscriptions so far. That's about ${monthly} a month.`,
    breakdownLine: (source: string, amount: string) => `${source} · ~${amount}/yr`,
    revealHonesty: 'A starting estimate from one minute of taps, not a judgment. Real logs sharpen it from here.',
    plugBiggestLeak: 'Plug the biggest leak',
    justStartLogging: 'Just start logging',
    revealAnnouncement: (yearly: string, monthly: string) =>
      `About ${yearly} a year leaking, about ${monthly} a month`,
    // Both-empty edge case (section 8)
    noNumberYetTitle: "We'll find your leak from your real logs.",
    noNumberYetSubtitle: 'Around 4 logs at the same place is enough to spot a pattern.',
    // 3.6 Guided first log
    guidedLogHint: "One practice log and you're done. Try today's coffee. Amount first.",
    guidedLogLater: 'Later',
    // 3.7 Success
    leakMapReady: 'Your leak map is ready',
    biggestLeakCaption: (monthTotal: string) => `about ${monthTotal} a month · your biggest leak`,
    breakIt: 'Break it',
    trialQuietNote: "1 habit free, always. Premium trial available when you're ready.",
    continueToHabits: 'Continue',
    // Re-entry (section 7, Habits empty-state link)
    reAuditLink: 'Take the 90-second leak audit',
    // Door 2 graceful-failure re-entry (section 8.6): scan-found chips are
    // pre-selected at exact values, no tilde, annotated.
    fromYourStatements: 'from your statements',
  },
  // --- Leak Scan (P2-1b). Canonical behavior: docs/design-context/leak-scan-spec.md.
  // Canonical visuals: docs/design-package-phase2/03-p2-1b-leak-scan-visuals.md.
  // Vocabulary is load-bearing: tiers are solid/likely/needs review, never a
  // percentage; leak/skip/kept vocabulary elsewhere is untouched by this screen.
  leakScan: {
    // Intake
    intakeTitle: 'Scan your statement',
    intakeSubtitle: 'CSV files only. Everything stays on this device.',
    chooseFiles: 'Choose CSV files',
    filesChosenCount: (n: number) => `${n} file${n === 1 ? '' : 's'} selected`,
    startScan: 'Start scan',
    scanningTitle: 'Reading your file',
    scanningSubtitle: 'This usually takes a few seconds.',
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
    kpiOverCoveredDays: (days: number) => `over ${days} covered days`,
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
    pulseCaption: (n: number, covered: number) => `You transacted on ${n} of ${covered} days.`,
    // Habit cards (spec 5.4, visual spec 6)
    classGovern: 'Govern',
    classInfluence: 'Influence',
    classFixed: 'Fixed',
    habitStatsRow: (orders: number, days: number, coveredDays: number, monthTotal: string, month: string) =>
      `${orders} orders · ${days}/${coveredDays} days · ${monthTotal} in ${month}`,
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
    projectionBuffer: '+12% · irregulars & annual renewals',
    threePaymentMonth: (month: string) => `3 payments in ${month}`,
    saveToHabitCents: 'Save to HabitCents',
    remindDayBefore: 'Remind me the day before',
    // Footer (spec 5.6, visual spec 8)
    footerRowsSummary: (read: number, total: number, skipped: number, dupes: number, transfers: number) =>
      `${read} of ${total} rows read · ${skipped} skipped · ${dupes} merged · ${transfers} netted`,
    undoImport: 'Undo this import',
    undoConfirmTitle: 'Undo this import?',
    undoConfirmMessage: 'This removes everything this import added.',
    // Post-scan handoff (spec 5 post-scan, visual spec 12)
    bringIn15Days: 'Bring in your last 15 days',
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
} as const;
