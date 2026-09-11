/**
 * Provisional machine translation, needs human review.
 *
 * Locale: de (German). Plan item 4: `common` (except `keep`, held back
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
 */
import type { LocaleOverlay } from '@/utils/i18n';

export const de: LocaleOverlay = {
  common: {
    save: 'Speichern',
    cancel: 'Abbrechen',
    delete: 'Löschen',
    ok: 'OK',
    back: 'Zurück',
    close: 'Schließen',
    dismiss: 'Verwerfen',
  },
  sheets: {
    saveHintAmount: 'Gib zuerst einen Betrag ein',
    saveHintCategoryName: 'Gib zuerst einen Kategorienamen ein',
  },
  tabs: {
    today: 'Heute',
    money: 'Geld',
    insights: 'Einblicke',
    categories: 'Kategorien',
  },
  screenTitles: {
    today: 'Heute.',
    money: 'Geld.',
    insights: 'Einblicke.',
    categories: 'Kategorien.',
  },
  expenses: {
    recent: 'Kürzlich',
    upcoming: 'Bevorstehend',
    merchantPlaceholder: 'Händler (z. B. Starbucks)',
    merchantFieldLabel: 'Händler',
    noteFieldLabel: 'Notiz',
    amountHint: 'Doppelt tippen, um einen Betrag einzugeben',
    notePlaceholder: 'Notiz (optional)',
    saveExpense: 'Ausgabe speichern',
    savedConfirmation: 'Gespeichert',
    all: 'Alle',
  },
  categories: {
    title: 'Kategorien',
    defaultCategories: 'Standardkategorien',
    customCategories: 'Eigene Kategorien',
    loading: 'Wird geladen.',
    emptyTitle: 'Ordne deine Ausgaben auf deine Art',
    emptySubtitle: 'Gruppen machen Muster leichter erkennbar.',
    emptyCta: 'Erstelle deine erste Kategorie',
    deleteMessage:
      'Deine vorhandenen Ausgaben bleiben erhalten; sie zeigen diese Kategorie nur nicht mehr an.',
    deleteConfirmCta: 'Kategorie löschen',
    deleteCancel: 'Kategorie behalten',
    addCategoryLabel: 'Kategorie hinzufügen',
    eyebrowDefault: 'Standard',
    eyebrowCustom: 'Eigene',
  },
  categoryDetail: {
    notFound: 'Kategorie nicht gefunden',
    editCategoryLabel: 'Kategorie bearbeiten',
    thisMonth: 'diesen Monat',
    logsStat: 'Einträge',
    averageStat: 'Durchschnitt',
    sixMonthTrend: '6-Monats-Trend',
    topMerchants: 'Top-Händler',
    recentLogs: 'Letzte Einträge',
    noExpensesLogged: 'In dieser Kategorie ist noch nichts erfasst.',
    trendEmpty: 'Noch keine Ausgaben für ein Diagramm.',
  },
  habitDetail: {
    notFound: 'Gewohnheit nicht gefunden',
  },
  reports: {
    loading: 'Wird geladen.',
  },
  profile: {
    title: 'Profil.',
    headerLabel: 'Profil',
    supportRow: 'Support',
  },
  settings: {
    opensInBrowserHint: 'Öffnet sich in deinem Browser.',
    preferences: 'Einstellungen',
    currency: 'Währung',
    about: 'Info',
    privacyPolicy: 'Datenschutzrichtlinie',
    termsOfService: 'Nutzungsbedingungen',
    restorePurchases: 'Käufe wiederherstellen',
    version: 'Version',
    currencySheetTitle: 'Währung.',
    language: 'Sprache',
    languageSheetTitle: 'Sprache.',
    languageSystemDefault: 'Systemstandard',
    restoreNoneMessage: 'Keine früheren Käufe zum Wiederherstellen.',
    restoreDoneMessage: 'Deine Käufe wurden wiederhergestellt.',
    groupGeneral: 'Allgemein',
    groupMore: 'Mehr',
    subscriptionRow: 'Abo',
    subscriptionValueFree: 'Kostenlos',
    subscriptionValuePremium: 'Premium',
    startOverRow: 'Neu anfangen',
    startOverHint: 'Daten bleiben auf diesem Gerät',
    startOverConfirmTitle: 'Neu anfangen?',
    startOverConfirmBody:
      'Bringt dich zurück zu den Startbildschirmen. Deine Daten bleiben auf diesem Gerät.',
    startOverConfirmCta: 'Neu anfangen',
    startOverConfirmCancel: 'Weiter',
    startOverToast: 'Neustart läuft. Deine Daten bleiben auf diesem Gerät.',
    linkOpenFailed: 'Der Link konnte nicht geöffnet werden.',
    mailOpenFailed: 'Die Mail-App konnte nicht geöffnet werden.',
  },
  addCategoryModal: {
    editCategory: 'Kategorie bearbeiten.',
    newCategory: 'Neue Kategorie.',
    categoryNamePreview: 'Kategoriename',
    name: 'Name',
    namePlaceholder: 'Kategorienamen eingeben',
    icon: 'Symbol',
    color: 'Farbe',
  },
  expenseSheet: {
    logEyebrow: 'Ausgabe erfassen',
    editEyebrow: 'Ausgabe bearbeiten',
    categoryEyebrow: 'Kategorie',
    whereEyebrow: 'Wo',
    saveExpense: 'Speichern',
    saveChanges: 'Speichern',
    deleteExpense: 'Ausgabe löschen',
    keyboardDone: 'Fertig',
  },
  toasts: {
    logged: 'Erfasst.',
    saved: 'Gespeichert.',
    deleted: 'Gelöscht.',
    undo: 'Rückgängig',
    restored: 'Wiederhergestellt.',
    addedToUpcoming: 'Zu Bevorstehend hinzugefügt.',
    trialStarted: 'Testphase gestartet. 14 Tage kostenlos.',
    startHabitFailed: 'Das konnte nicht gestartet werden. Versuch es noch mal.',
    logFailed: 'Das wurde nicht gespeichert. Versuch es noch mal.',
    saveFailed: 'Das wurde nicht gespeichert. Versuch es noch mal.',
    deleteFailed: 'Das wurde nicht gelöscht. Versuch es noch mal.',
    restoreFailed: 'Das kam nicht zurück. Versuch es noch mal.',
    addUpcomingFailed: 'Das wurde nicht gespeichert. Versuch es noch mal.',
    checkInFailed: 'Das wurde nicht gespeichert. Versuch es noch mal.',
    stopHabitFailed: 'Das wurde nicht gestoppt. Versuch es noch mal.',
    skipValueFailed: 'Das wurde nicht gespeichert. Versuch es noch mal.',
    dismissLeakFailed: 'Das wurde nicht gespeichert. Versuch es noch mal.',
    categoryFailed: 'Das wurde nicht gespeichert. Versuch es noch mal.',
    currencyFailed: 'Das wurde nicht gespeichert. Versuch es noch mal.',
    languageFailed: 'Das wurde nicht gespeichert. Versuch es noch mal.',
    startOverFailed: 'Der Neustart hat nicht geklappt. Versuch es noch mal.',
    importFailed: 'Das wurde nicht gespeichert. Es wurde nichts importiert. Versuch es noch mal.',
  },
  addUpcoming: {
    title: 'Bevorstehende Ausgabe hinzufügen.',
    editTitle: 'Bevorstehende Ausgabe bearbeiten.',
    saveChanges: 'Speichern',
    deleteUpcoming: 'Bevorstehende Ausgabe löschen',
    whatIsIt: 'Was ist es?',
    namePlaceholder: 'Benenne es',
    nameFieldLabel: 'Name',
    nameRent: 'Miete',
    nameInternet: 'Internet',
    namePhone: 'Telefon',
    nameGym: 'Fitnessstudio',
    nameInsurance: 'Versicherung',
    nameUtilities: 'Nebenkosten',
    schedule: 'Zeitplan',
    oneTime: 'Einmalig',
    repeats: 'Wiederholt sich',
    scheduleSegmentLabel: 'Zeitplantyp',
    when: 'Wann?',
    whenTomorrow: 'Morgen',
    whenNextWeek: 'Nächste Woche',
    whenInTwoWeeks: 'In zwei Wochen',
    whenNextMonth: 'Nächsten Monat',
    frequencyWeekly: 'Wöchentlich',
    frequencyBiweekly: 'Alle zwei Wochen',
    frequencyMonthly: 'Monatlich',
    frequencyCustom: 'Benutzerdefiniert',
    frequencyAnnual: 'Jährlich',
    onWhichDay: 'An welchem Tag?',
    starting: 'Beginnend',
    startingThisWeek: 'Diese Woche',
    startingNextWeek: 'Nächste Woche',
    onThe: 'Am',
    monthDayFirst: '1.',
    monthDayFifteenth: '15.',
    monthDayThirtieth: '30.',
    monthDayLast: 'Letzter Tag',
    everyNDaysLabel: 'Alle N Tage',
    everyNDaysDecrease: 'Weniger Tage',
    everyNDaysIncrease: 'Mehr Tage',
    save: 'Speichern',
  },
  money: {
    segmentSpent: 'Ausgegeben',
    segmentUpcoming: 'Bevorstehend',
    segmentHabits: 'Gewohnheiten',
    segmentLabel: 'Geldansicht',
    spentToday: 'Heute',
    spentYesterday: 'Gestern',
    spentTodayEmpty: 'Heute noch nichts. Füge es hinzu, wenn du etwas ausgegeben hast, und genieße es, wenn nicht.',
    spentEditHint: 'Tippe eine Zeile an, um sie zu bearbeiten oder zu löschen.',
    recurringRowSuffix: 'wiederkehrend',
    spentEmptyTitle: 'Alle Ausgaben an einem Ort',
    upcomingWindowSegmentLabel: 'Bevorstehender Zeitraum',
    upcomingWindowTwoWeeks: '2 Wochen',
    upcomingWindowOneMonth: '1 Monat',
    upcomingWindowThreeMonths: '3 Monate',
    upcomingAddAffordance: 'Bevorstehende Ausgabe hinzufügen',
    spentEmptyCta: 'Ausgabe erfassen',
    habitsEmptyCta: 'Mit einer Gewohnheit brechen',
    upcomingListEyebrow: 'Geplant',
    upcomingEmptyTitle: 'Erfahre, was kommt, bevor es da ist',
    upcomingWindowEmptyBody: 'Keine deiner wiederkehrenden Ausgaben fällt in diesen Zeitraum.',
    upcomingEmptyCta: 'Bevorstehende Ausgabe hinzufügen',
    scheduleOneTime: 'Einmalig',
    scheduleWeekly: 'Wöchentlich',
    scheduleBiweekly: 'Alle 2 Wochen',
    scheduleMonthly: 'Monatlich',
    scheduleAnnual: 'Jährlich',
  },
};
