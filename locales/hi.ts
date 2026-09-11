/**
 * Provisional machine translation, needs human review.
 *
 * Locale: hi (Hindi). Plan item 4: `common` (except `keep`, held back
 * deliberately, see below), `sheets`, `tabs`, `screenTitles` (run 20), plus
 * `expenses`, `categories`, `categoryDetail`, `profile` (run 21), plus
 * `settings` minus `versionValue`/`supportEmail` (run 22, not localizable
 * content), plus `addCategoryModal`, `expenseSheet` minus the function-
 * valued `amountLabel` (run 23). Every other section is not yet translated
 * and falls back to English via mergeCatalog() in utils/i18n.ts.
 * Function-valued keys (pluralized or interpolated) are omitted
 * throughout and inherit the English function, per plan item 2's
 * deferred ICU work.
 *
 * `common.keep` is withheld on purpose: it is close enough to the app's
 * locked vocabulary (leak/skip/kept/slip, ops CLAUDE.md) that this routine
 * will not guess at it. It stays English until Charen picks a translation;
 * see docs/routines/HANDOFF.md's DECISIONS NEEDED.
 *
 * Run 24 added: `habitDetail.notFound` (its other four keys are dead code,
 * confirmed unused anywhere in the app); `reports.loading` (dead-code
 * audited section, only this key and the function-valued `weekOf` are
 * actually rendered); `toasts` minus `stoppedHistoryKept`/`leakDismissed`
 * (locked-vocabulary gated), `yesterdayNoted` (dead code), and every
 * function-valued key (deferred ICU work, same as every other section).
 * Extending this file's existing short-label-vs-full-sentence punctuation
 * split (literal "." on short/title-style strings like `loading`, the
 * Devanagari "।" on full sentences like `restoreDoneMessage`): the short
 * one-word confirmation toasts (`logged`/`saved`/`deleted`/`restored`/
 * `addedToUpcoming`) keep the literal ".", the two-clause failure toasts
 * and `trialStarted` use "।".
 *
 * Run 26 added: `addUpcoming` (all string keys; `everyNDaysValue`/
 * `amountLabel` stay omitted, both function-valued). Real render path
 * confirmed via `components/money/AddUpcomingSheet.tsx`, already
 * `useStrings()`-converted. `whenNextWeek`/`startingNextWeek` share one
 * translation, matching the English source reusing "Next week" in both
 * places. `title`/`editTitle`/`deleteUpcoming` stay on the short-label "."
 * side of this file's punctuation split, same as `addCategoryModal`'s
 * equivalent titles. `onThe`, the label above the day-of-month chips
 * (1st/15th/30th/Last day), has no clean standalone Hindi preposition
 * equivalent, so it reads as the field's own name ("तारीख", date) instead
 * of a literal "on the" connector.
 */
import type { LocaleOverlay } from '@/utils/i18n';

export const hi: LocaleOverlay = {
  common: {
    save: 'सहेजें',
    cancel: 'रद्द करें',
    delete: 'हटाएं',
    ok: 'ठीक है',
    back: 'वापस',
    close: 'बंद करें',
    dismiss: 'खारिज करें',
  },
  sheets: {
    saveHintAmount: 'पहले एक राशि दर्ज करें',
    saveHintCategoryName: 'पहले एक श्रेणी नाम दर्ज करें',
  },
  tabs: {
    today: 'आज',
    money: 'पैसा',
    insights: 'जानकारी',
    categories: 'श्रेणियाँ',
  },
  screenTitles: {
    today: 'आज.',
    money: 'पैसा.',
    insights: 'जानकारी.',
    categories: 'श्रेणियाँ.',
  },
  expenses: {
    recent: 'हाल का',
    upcoming: 'आगामी',
    merchantPlaceholder: 'दुकान (जैसे, Starbucks)',
    merchantFieldLabel: 'दुकान',
    noteFieldLabel: 'नोट',
    amountHint: 'राशि दर्ज करने के लिए डबल टैप करें',
    notePlaceholder: 'नोट (वैकल्पिक)',
    saveExpense: 'खर्च सहेजें',
    savedConfirmation: 'सहेजा गया',
    all: 'सभी',
  },
  categories: {
    title: 'श्रेणियाँ',
    defaultCategories: 'डिफ़ॉल्ट श्रेणियाँ',
    customCategories: 'कस्टम श्रेणियाँ',
    loading: 'लोड हो रहा है.',
    emptyTitle: 'अपने तरीके से खर्च को समूहित करें',
    emptySubtitle: 'समूह बनाने से पैटर्न देखना आसान हो जाता है।',
    emptyCta: 'अपनी पहली श्रेणी जोड़ें',
    deleteMessage: 'आपके मौजूदा खर्च बने रहेंगे; बस अब वे इस श्रेणी में नहीं दिखेंगे।',
    deleteConfirmCta: 'श्रेणी हटाएं',
    deleteCancel: 'श्रेणी रखें',
    addCategoryLabel: 'श्रेणी जोड़ें',
    eyebrowDefault: 'डिफ़ॉल्ट',
    eyebrowCustom: 'कस्टम',
  },
  categoryDetail: {
    notFound: 'श्रेणी नहीं मिली',
    editCategoryLabel: 'श्रेणी संपादित करें',
    thisMonth: 'इस महीने',
    logsStat: 'लॉग',
    averageStat: 'औसत',
    sixMonthTrend: '6 महीने का रुझान',
    topMerchants: 'शीर्ष दुकानें',
    recentLogs: 'हाल के लॉग',
    noExpensesLogged: 'इस श्रेणी में अभी तक कुछ भी दर्ज नहीं हुआ है।',
    trendEmpty: 'चार्ट के लिए अभी तक कोई खर्च नहीं है।',
  },
  habitDetail: {
    notFound: 'आदत नहीं मिली',
  },
  reports: {
    loading: 'लोड हो रहा है.',
  },
  profile: {
    title: 'प्रोफ़ाइल.',
    headerLabel: 'प्रोफ़ाइल',
    supportRow: 'सहायता',
  },
  settings: {
    opensInBrowserHint: 'आपके ब्राउज़र में खुलता है।',
    preferences: 'प्राथमिकताएं',
    currency: 'मुद्रा',
    about: 'जानकारी',
    privacyPolicy: 'गोपनीयता नीति',
    termsOfService: 'सेवा की शर्तें',
    restorePurchases: 'खरीदारी पुनर्स्थापित करें',
    version: 'संस्करण',
    currencySheetTitle: 'मुद्रा.',
    language: 'भाषा',
    languageSheetTitle: 'भाषा.',
    languageSystemDefault: 'सिस्टम डिफ़ॉल्ट',
    restoreNoneMessage: 'पुनर्स्थापित करने के लिए कोई पुरानी खरीदारी नहीं है।',
    restoreDoneMessage: 'आपकी खरीदारी पुनर्स्थापित कर दी गई है।',
    groupGeneral: 'सामान्य',
    groupMore: 'अधिक',
    subscriptionRow: 'सदस्यता',
    subscriptionValueFree: 'फ़्री',
    subscriptionValuePremium: 'प्रीमियम',
    startOverRow: 'फिर से शुरू करें',
    startOverHint: 'डेटा इस डिवाइस पर रहता है',
    startOverConfirmTitle: 'फिर से शुरू करें?',
    startOverConfirmBody: 'आपको शुरुआती स्क्रीन पर ले जाता है। आपका डेटा इस डिवाइस पर रहता है।',
    startOverConfirmCta: 'फिर से शुरू करें',
    startOverConfirmCancel: 'जारी रखें',
    startOverToast: 'फिर से शुरू किया जा रहा है। आपका डेटा इस डिवाइस पर रहता है।',
    linkOpenFailed: 'लिंक नहीं खोला जा सका।',
    mailOpenFailed: 'मेल नहीं खोला जा सका।',
  },
  addCategoryModal: {
    editCategory: 'श्रेणी संपादित करें.',
    newCategory: 'नई श्रेणी.',
    categoryNamePreview: 'श्रेणी का नाम',
    name: 'नाम',
    namePlaceholder: 'श्रेणी का नाम दर्ज करें',
    icon: 'आइकन',
    color: 'रंग',
  },
  expenseSheet: {
    logEyebrow: 'खर्च दर्ज करें',
    editEyebrow: 'खर्च संपादित करें',
    categoryEyebrow: 'श्रेणी',
    whereEyebrow: 'कहाँ',
    saveExpense: 'सहेजें',
    saveChanges: 'सहेजें',
    deleteExpense: 'खर्च हटाएं',
    keyboardDone: 'पूर्ण',
  },
  toasts: {
    logged: 'दर्ज किया गया.',
    saved: 'सहेजा गया.',
    deleted: 'हटा दिया गया.',
    undo: 'पूर्ववत करें',
    restored: 'पुनर्स्थापित किया गया.',
    addedToUpcoming: 'आगामी में जोड़ा गया.',
    trialStarted: 'ट्रायल शुरू हुआ। 14 दिन मुफ़्त।',
    startHabitFailed: 'वह शुरू नहीं हो सका। फिर से कोशिश करें।',
    logFailed: 'वह सहेजा नहीं जा सका। फिर से कोशिश करें।',
    saveFailed: 'वह सहेजा नहीं जा सका। फिर से कोशिश करें।',
    deleteFailed: 'वह हटाया नहीं जा सका। फिर से कोशिश करें।',
    restoreFailed: 'वह वापस नहीं आया। फिर से कोशिश करें।',
    addUpcomingFailed: 'वह सहेजा नहीं जा सका। फिर से कोशिश करें।',
    checkInFailed: 'वह सहेजा नहीं जा सका। फिर से कोशिश करें।',
    stopHabitFailed: 'वह रुका नहीं। फिर से कोशिश करें।',
    skipValueFailed: 'वह सहेजा नहीं जा सका। फिर से कोशिश करें।',
    dismissLeakFailed: 'वह सहेजा नहीं जा सका। फिर से कोशिश करें।',
    categoryFailed: 'वह सहेजा नहीं जा सका। फिर से कोशिश करें।',
    currencyFailed: 'वह सहेजा नहीं जा सका। फिर से कोशिश करें।',
    languageFailed: 'वह सहेजा नहीं जा सका। फिर से कोशिश करें।',
    startOverFailed: 'वह रीसेट नहीं हो सका। फिर से कोशिश करें।',
    importFailed: 'वह सहेजा नहीं जा सका। कुछ भी आयात नहीं हुआ। फिर से कोशिश करें।',
  },
  addUpcoming: {
    title: 'आगामी खर्च जोड़ें.',
    editTitle: 'आगामी खर्च संपादित करें.',
    saveChanges: 'सहेजें',
    deleteUpcoming: 'आगामी खर्च हटाएं',
    whatIsIt: 'यह क्या है?',
    namePlaceholder: 'नाम दें',
    nameFieldLabel: 'नाम',
    nameRent: 'किराया',
    nameInternet: 'इंटरनेट',
    namePhone: 'फोन',
    nameGym: 'जिम',
    nameInsurance: 'बीमा',
    nameUtilities: 'उपयोगिताएं',
    schedule: 'शेड्यूल',
    oneTime: 'एक बार',
    repeats: 'दोहराता है',
    scheduleSegmentLabel: 'शेड्यूल प्रकार',
    when: 'कब?',
    whenTomorrow: 'कल',
    whenNextWeek: 'अगले सप्ताह',
    whenInTwoWeeks: 'दो सप्ताह में',
    whenNextMonth: 'अगले महीने',
    frequencyWeekly: 'साप्ताहिक',
    frequencyBiweekly: 'पाक्षिक',
    frequencyMonthly: 'मासिक',
    frequencyCustom: 'अनुकूलित',
    frequencyAnnual: 'वार्षिक',
    onWhichDay: 'किस दिन?',
    starting: 'शुरुआत',
    startingThisWeek: 'इस सप्ताह',
    startingNextWeek: 'अगले सप्ताह',
    onThe: 'तारीख',
    monthDayFirst: '1',
    monthDayFifteenth: '15',
    monthDayThirtieth: '30',
    monthDayLast: 'आखिरी दिन',
    everyNDaysLabel: 'हर N दिन',
    everyNDaysDecrease: 'कम दिन',
    everyNDaysIncrease: 'अधिक दिन',
    save: 'सहेजें',
  },
};
