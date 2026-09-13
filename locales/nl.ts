/**
 * Provisional machine translation, needs human review.
 *
 * Locale: nl (Dutch). Plan item 4: `common` (except `keep`, held back
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
 *
 * Run 26 added: `addUpcoming` (all string keys; `everyNDaysValue`/
 * `amountLabel` stay omitted, both function-valued). Real render path
 * confirmed via `components/money/AddUpcomingSheet.tsx`, already
 * `useStrings()`-converted. `whenNextWeek`/`startingNextWeek` share one
 * translation, matching the English source reusing "Next week" in both
 * places.
 *
 * Run 27 added: `money` minus `habitsEmptyTitle`/`habitsEmptyBody` (locked-
 * vocabulary gated: "leak") and every function-valued key (deferred ICU
 * work). `spentEmptyBody`/`upcomingEmptyBody` confirmed dead code (never
 * rendered, same RETIRED treatment as elsewhere) and left untranslated.
 * `scheduleSeparator` (a plain " \u00b7 " middle-dot punctuation mark, no
 * linguistic content) stays omitted like a function-valued key.
 * `scheduleOneTime`/`scheduleWeekly`/`scheduleMonthly`/`scheduleAnnual`
 * reuse `addUpcoming`'s matching frequency translations (same English
 * source word); `scheduleBiweekly` ('Every 2 weeks') is translated fresh
 * since its English source differs from `addUpcoming.frequencyBiweekly`
 * ('Bi-weekly').
 *
 * Run 35 added: `habits.loading`, reusing the same "Loading." translation
 * as `categories.loading`/`reports.loading`. This section's other four keys
 * (`title`, `spottingYourLeak`, `logsAtSamePlace`, `logsAtSamePlaceSuffix`,
 * `logsAtSamePlaceBody`) are dead code, confirmed via grep with zero real
 * call sites anywhere outside constants/strings.ts; left untranslated, same
 * treatment as habitDetail's/reports' own dead keys.
 */
import type { LocaleOverlay } from '@/utils/i18n';

export const nl: LocaleOverlay = {
  common: {
    save: 'Opslaan',
    cancel: 'Annuleren',
    delete: 'Verwijderen',
    ok: 'OK',
    back: 'Terug',
    close: 'Sluiten',
    dismiss: 'Negeren',
  },
  sheets: {
    saveHintAmount: 'Voer eerst een bedrag in',
    saveHintCategoryName: 'Voer eerst een categorienaam in',
  },
  tabs: {
    today: 'Vandaag',
    money: 'Geld',
    insights: 'Inzichten',
    categories: 'Categorieën',
  },
  screenTitles: {
    today: 'Vandaag.',
    money: 'Geld.',
    insights: 'Inzichten.',
    categories: 'Categorieën.',
  },
  expenses: {
    recent: 'Recent',
    upcoming: 'Binnenkort',
    merchantPlaceholder: 'Winkel (bijv. Starbucks)',
    merchantFieldLabel: 'Winkel',
    noteFieldLabel: 'Notitie',
    amountHint: 'Dubbeltik om een bedrag in te voeren',
    notePlaceholder: 'Notitie (optioneel)',
    saveExpense: 'Uitgave opslaan',
    savedConfirmation: 'Opgeslagen',
    all: 'Alle',
  },
  categories: {
    title: 'Categorieën',
    defaultCategories: 'Standaardcategorieën',
    customCategories: 'Aangepaste categorieën',
    loading: 'Laden.',
    emptyTitle: 'Groepeer uitgaven op jouw manier',
    emptySubtitle: 'Groepen maken patronen makkelijker te zien.',
    emptyCta: 'Voeg je eerste categorie toe',
    deleteMessage: 'Je bestaande uitgaven blijven behouden; ze tonen deze categorie alleen niet meer.',
    deleteConfirmCta: 'Categorie verwijderen',
    deleteCancel: 'Categorie behouden',
    addCategoryLabel: 'Categorie toevoegen',
    eyebrowDefault: 'Standaard',
    eyebrowCustom: 'Aangepast',
  },
  categoryDetail: {
    notFound: 'Categorie niet gevonden',
    editCategoryLabel: 'Categorie bewerken',
    thisMonth: 'deze maand',
    logsStat: 'logs',
    averageStat: 'gemiddeld',
    sixMonthTrend: '6-maandstrend',
    topMerchants: 'Meest bezochte winkels',
    recentLogs: 'Recente logs',
    noExpensesLogged: 'Nog niets vastgelegd in deze categorie.',
    trendEmpty: 'Nog geen uitgaven om in een grafiek weer te geven.',
  },
  habits: {
    loading: 'Laden.',
  },
  habitDetail: {
    notFound: 'Gewoonte niet gevonden',
  },
  reports: {
    loading: 'Laden.',
  },
  profile: {
    title: 'Profiel.',
    headerLabel: 'Profiel',
    supportRow: 'Ondersteuning',
  },
  settings: {
    opensInBrowserHint: 'Opent in je browser.',
    preferences: 'Voorkeuren',
    currency: 'Valuta',
    about: 'Over',
    privacyPolicy: 'Privacybeleid',
    termsOfService: 'Gebruiksvoorwaarden',
    restorePurchases: 'Aankopen herstellen',
    version: 'Versie',
    currencySheetTitle: 'Valuta.',
    language: 'Taal',
    languageSheetTitle: 'Taal.',
    languageSystemDefault: 'Systeemstandaard',
    restoreNoneMessage: 'Geen eerdere aankopen om te herstellen.',
    restoreDoneMessage: 'Je aankopen zijn hersteld.',
    groupGeneral: 'Algemeen',
    groupMore: 'Meer',
    subscriptionRow: 'Abonnement',
    subscriptionValueFree: 'Gratis',
    subscriptionValuePremium: 'Premium',
    startOverRow: 'Opnieuw beginnen',
    startOverHint: 'gegevens blijven op dit apparaat',
    startOverConfirmTitle: 'Opnieuw beginnen?',
    startOverConfirmBody: 'Brengt je terug naar de startschermen. Je gegevens blijven op dit apparaat.',
    startOverConfirmCta: 'Opnieuw beginnen',
    startOverConfirmCancel: 'Doorgaan',
    startOverToast: 'Opnieuw beginnen. Je gegevens blijven op dit apparaat.',
    linkOpenFailed: 'De link kon niet worden geopend.',
    mailOpenFailed: 'Mail kon niet worden geopend.',
  },
  addCategoryModal: {
    editCategory: 'Categorie bewerken.',
    newCategory: 'Nieuwe categorie.',
    categoryNamePreview: 'Categorienaam',
    name: 'Naam',
    namePlaceholder: 'Categorienaam invoeren',
    icon: 'Icoon',
    color: 'Kleur',
  },
  expenseSheet: {
    logEyebrow: 'Uitgave registreren',
    editEyebrow: 'Uitgave bewerken',
    categoryEyebrow: 'Categorie',
    whereEyebrow: 'Waar',
    saveExpense: 'Opslaan',
    saveChanges: 'Opslaan',
    deleteExpense: 'Uitgave verwijderen',
    keyboardDone: 'Klaar',
  },
  toasts: {
    logged: 'Geregistreerd.',
    saved: 'Opgeslagen.',
    deleted: 'Verwijderd.',
    undo: 'Ongedaan maken',
    restored: 'Hersteld.',
    addedToUpcoming: 'Toegevoegd aan Binnenkort.',
    trialStarted: 'Proefperiode gestart. 14 dagen gratis.',
    startHabitFailed: 'Dat kon niet worden gestart. Probeer het opnieuw.',
    logFailed: 'Dat is niet opgeslagen. Probeer het opnieuw.',
    saveFailed: 'Dat is niet opgeslagen. Probeer het opnieuw.',
    deleteFailed: 'Dat is niet verwijderd. Probeer het opnieuw.',
    restoreFailed: 'Dat kwam niet terug. Probeer het opnieuw.',
    addUpcomingFailed: 'Dat is niet opgeslagen. Probeer het opnieuw.',
    checkInFailed: 'Dat is niet opgeslagen. Probeer het opnieuw.',
    stopHabitFailed: 'Dat is niet gestopt. Probeer het opnieuw.',
    skipValueFailed: 'Dat is niet opgeslagen. Probeer het opnieuw.',
    dismissLeakFailed: 'Dat is niet opgeslagen. Probeer het opnieuw.',
    categoryFailed: 'Dat is niet opgeslagen. Probeer het opnieuw.',
    currencyFailed: 'Dat is niet opgeslagen. Probeer het opnieuw.',
    languageFailed: 'Dat is niet opgeslagen. Probeer het opnieuw.',
    startOverFailed: 'Dat is niet gereset. Probeer het opnieuw.',
    importFailed: 'Dat is niet opgeslagen. Er is niets geïmporteerd. Probeer het opnieuw.',
  },
  addUpcoming: {
    title: 'Aankomende uitgave toevoegen.',
    editTitle: 'Aankomende uitgave bewerken.',
    saveChanges: 'Opslaan',
    deleteUpcoming: 'Aankomende uitgave verwijderen',
    whatIsIt: 'Wat is het?',
    namePlaceholder: 'Geef het een naam',
    nameFieldLabel: 'Naam',
    nameRent: 'Huur',
    nameInternet: 'Internet',
    namePhone: 'Telefoon',
    nameGym: 'Sportschool',
    nameInsurance: 'Verzekering',
    nameUtilities: 'Nutsvoorzieningen',
    schedule: 'Schema',
    oneTime: 'Eenmalig',
    repeats: 'Herhaalt',
    scheduleSegmentLabel: 'Schematype',
    when: 'Wanneer?',
    whenTomorrow: 'Morgen',
    whenNextWeek: 'Volgende week',
    whenInTwoWeeks: 'Over twee weken',
    whenNextMonth: 'Volgende maand',
    frequencyWeekly: 'Wekelijks',
    frequencyBiweekly: 'Tweewekelijks',
    frequencyMonthly: 'Maandelijks',
    frequencyCustom: 'Aangepast',
    frequencyAnnual: 'Jaarlijks',
    onWhichDay: 'Op welke dag?',
    starting: 'Beginnend',
    startingThisWeek: 'Deze week',
    startingNextWeek: 'Volgende week',
    onThe: 'Op de',
    monthDayFirst: '1e',
    monthDayFifteenth: '15e',
    monthDayThirtieth: '30e',
    monthDayLast: 'Laatste dag',
    everyNDaysLabel: 'Elke N dagen',
    everyNDaysDecrease: 'Minder dagen',
    everyNDaysIncrease: 'Meer dagen',
    save: 'Opslaan',
  },
  money: {
    segmentSpent: 'Uitgegeven',
    segmentUpcoming: 'Binnenkort',
    segmentHabits: 'Gewoontes',
    segmentLabel: 'Geldweergave',
    spentToday: 'Vandaag',
    spentYesterday: 'Gisteren',
    spentTodayEmpty: 'Nog niets vandaag. Voeg het toe als je iets uitgaf, en geniet ervan als je niets uitgaf.',
    spentEditHint: 'Tik op een rij om te bewerken of te verwijderen.',
    recurringRowSuffix: 'terugkerend',
    spentEmptyTitle: 'Alle uitgaven op één plek',
    upcomingWindowSegmentLabel: 'Periode voor binnenkort',
    upcomingWindowTwoWeeks: '2 weken',
    upcomingWindowOneMonth: '1 maand',
    upcomingWindowThreeMonths: '3 maanden',
    upcomingAddAffordance: 'Aankomende uitgave toevoegen',
    spentEmptyCta: 'Uitgave registreren',
    habitsEmptyCta: 'Een gewoonte doorbreken',
    upcomingListEyebrow: 'Gepland',
    upcomingEmptyTitle: 'Weet wat eraan komt voordat het er is',
    upcomingWindowEmptyBody: 'Geen van je terugkerende uitgaven valt in deze periode.',
    upcomingEmptyCta: 'Aankomende uitgave toevoegen',
    scheduleOneTime: 'Eenmalig',
    scheduleWeekly: 'Wekelijks',
    scheduleBiweekly: 'Elke 2 weken',
    scheduleMonthly: 'Maandelijks',
    scheduleAnnual: 'Jaarlijks',
  },
};
