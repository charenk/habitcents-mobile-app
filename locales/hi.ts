/**
 * Provisional machine translation, needs human review.
 *
 * Locale: hi (Hindi). Plan item 4: `common` (except `keep`, held back
 * deliberately, see below), `sheets`, `tabs`, `screenTitles` (run 20), plus
 * `expenses`, `categories`, `categoryDetail`, `profile` (run 21), plus
 * `settings` minus `versionValue`/`supportEmail` (run 22, not localizable
 * content). Every other section is not yet translated and falls back to
 * English via mergeCatalog() in utils/i18n.ts. Function-valued keys
 * (pluralized or interpolated) are omitted throughout and inherit the
 * English function, per plan item 2's deferred ICU work.
 *
 * `common.keep` is withheld on purpose: it is close enough to the app's
 * locked vocabulary (leak/skip/kept/slip, ops CLAUDE.md) that this routine
 * will not guess at it. It stays English until Charen picks a translation;
 * see docs/routines/HANDOFF.md's DECISIONS NEEDED.
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
};
