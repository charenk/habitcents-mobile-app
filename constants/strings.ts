// Centralized user-facing UI strings.
// Pure relocation: values must match the exact original wording. Do not reword.
// Import with: import { strings } from '@/constants/strings';

export const strings = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    ok: 'OK',
    back: 'Back',
    keep: 'Keep',
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
    weekOf: (dateLabel: string) => `Week of ${dateLabel}`,
  },
  settings: {
    title: 'Settings',
    preferences: 'Preferences',
    currency: 'Currency',
    about: 'About',
    privacyPolicy: 'Privacy policy',
    termsOfService: 'Terms of service',
    restorePurchases: 'Restore purchases',
    version: 'Version',
    versionValue: '1.0.0',
    // Currency alert
    currencyAlertTitle: 'Currency',
    currencyAlertMessage: 'Choose your currency',
    currencyOption: (name: string, symbol: string) => `${name} (${symbol})`,
    // Restore purchases (BET-004, mock mode). No purchases exist to restore yet.
    restoreAlertTitle: 'Restore purchases',
    restoreNoneMessage: 'No previous purchases to restore.',
    restoreDoneMessage: 'Your purchases have been restored.',
    // Settings bottom sheet (redesign step 02). Settings is no longer a tab;
    // the gear on Today opens this sheet.
    sheetTitle: 'Settings.',
    planFree: 'Free plan · 1 habit',
    groupPreferences: 'Preferences',
    groupAbout: 'About',
    premiumRow: 'Premium',
    restoreRow: 'Restore purchases',
    signOutRow: 'Sign out',
    signOutHint: 'data stays on this device',
    signOutToast: 'Signed out. Your data stays on this device.',
    versionRow: 'Version',
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
    // 3.1 Welcome (redesign step 03, screen 1)
    brandName: 'HabitCents',
    welcomeHeadline: "Your money has a story. Let's read it.",
    // The three value props, stated up front rather than teased.
    valuePropLog: 'Log expenses in 10 seconds.',
    valuePropSee: 'See where your money goes.',
    valuePropBreak: 'Break the habit that costs you most.',
    welcomeSub: 'Everything stays on your phone. No bank login. No account.',
    getStarted: 'Get started',
    howItWorks: 'How it works',
    howItWorksRows: [
      'Log expenses in 10 seconds.',
      'We spot the habit that leaks the most.',
      'Every time you skip it, we count the money you kept.',
    ],
    // 3.2 Intent picker (redesign step 03, screen 2; replaces the two-door fork)
    intentTitle: 'What brings you here?',
    intentSub: 'Pick one. You can do all three later.',
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
    intentBreakDescription: 'A 90-second audit finds the leak quietly costing you the most.',
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
    guidedLogToast: 'Logged. Nice, that took ten seconds.',
    // 3.7 Success
    // Serif screen titles end with a period in the redesign (spec 05).
    leakMapReady: 'Your leak map is ready.',
    biggestLeakCaption: (monthTotal: string) => `about ${monthTotal} a month · your biggest leak`,
    breakIt: 'Break it',
    trialQuietNote: "1 habit free, always. Premium trial available when you're ready.",
    seePremium: 'See what Premium adds',
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
    reminderTimeLabel: 'Reminder time',
    // Intake
    intakeTitle: 'Scan your statement.',
    intakeSubtitle: 'CSV files only. Everything stays on this device.',
    chooseFiles: 'Choose CSV files',
    filesChosenCount: (n: number) => `${n} file${n === 1 ? '' : 's'} selected`,
    startScan: 'Start scan',
    scanningTitle: 'Reading your files',
    scanningSubtitle: 'On this device. Usually a few seconds.',
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
    enterAmountFirst: 'Enter an amount first.',
    addedToUpcoming: 'Added to upcoming.',
    stoppedHistoryKept: 'Stopped. Your history is kept.',
    trialStarted: 'Trial started. 14 days free.',
    skipValueSaved: (skipValue: string) => `Saved. One skip keeps ${skipValue}.`,
    keptBack: (amount: string) => `+${amount} kept back.`,
    yesterdayCounted: (skipValue: string) => `Yesterday counted. +${skipValue} kept.`,
    yesterdayNoted: 'Yesterday noted.',
  },

  // Today tab (spec 04 "Today").
  today: {
    settingsButtonLabel: 'Settings',
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
    loggedTodayEyebrow: 'Logged today',
    loggedTodayEmpty: 'Nothing logged today yet.',
    editExpenseLabel: (title: string, amountLabel: string) => `Edit ${title}, ${amountLabel}`,
  },

  // Log and edit expense sheets (spec 04 "Log / Edit sheets").
  expenseSheet: {
    logEyebrow: 'Log expense',
    editEyebrow: 'Edit expense',
    categoryEyebrow: 'Category',
    saveExpense: 'Save expense',
    saveChanges: 'Save changes',
    deleteExpense: 'Delete expense',
    amountLabel: (formattedAmount: string) => `Amount, ${formattedAmount}`,
    closeLabel: 'Close',
  },

  // Money tab (spec 04 "Money").
  money: {
    segmentSpent: 'Spent',
    segmentUpcoming: 'Upcoming',
    segmentLabel: 'Money view',
    // Spent
    spentGroupHeader: (dayLabel: string, total: string) => `${dayLabel} · ${total}`,
    spentToday: 'Today',
    spentYesterday: 'Yesterday',
    spentEditHint: 'Tap a row to edit or delete it.',
    spentEmptyTitle: 'Nothing logged yet',
    spentEmptyBody: 'Log your first in about 10 seconds. Amount first, then tap a category.',
    // Upcoming
    upcomingWindowEyebrow: (days: number) => `Next ${days} days`,
    upcomingScheduledCount: (n: number) => `${n} scheduled`,
    upcomingAddAffordance: 'Add an upcoming expense',
    upcomingListEyebrow: 'Scheduled',
    upcomingEmptyBody: 'Mark an expense as repeating and its next date shows up here.',
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

  // Add-upcoming sheet (spec 04 "Add-upcoming sheet").
  addUpcoming: {
    title: 'Add upcoming.',
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
  },

  // Insights tab (spec 04 "Insights").
  insights: {
    leaksTitle: 'Your leaks',
    leakSummary: (monthTotal: string, buys: number) =>
      `${monthTotal} a month · ${buys} buy${buys === 1 ? '' : 's'}`,
    leakActionBreak: 'Break it',
    leakActionBreaking: 'Breaking',
    leakActionWatch: 'Watch',
    leaksEmptyTitle: 'No leaks found yet',
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
