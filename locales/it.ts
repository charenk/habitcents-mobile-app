/**
 * Provisional machine translation, needs human review.
 *
 * Locale: it (Italian). Plan item 4: `common` (except `keep`, held back
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
 * places. `whatIsIt` uses the typographic apostrophe (’) so it stays
 * single-quoted.
 */
import type { LocaleOverlay } from '@/utils/i18n';

export const it: LocaleOverlay = {
  common: {
    save: 'Salva',
    cancel: 'Annulla',
    delete: 'Elimina',
    ok: 'OK',
    back: 'Indietro',
    close: 'Chiudi',
    dismiss: 'Ignora',
  },
  sheets: {
    saveHintAmount: 'Inserisci prima un importo',
    saveHintCategoryName: 'Inserisci prima un nome categoria',
  },
  tabs: {
    today: 'Oggi',
    money: 'Soldi',
    insights: 'Analisi',
    categories: 'Categorie',
  },
  screenTitles: {
    today: 'Oggi.',
    money: 'Soldi.',
    insights: 'Analisi.',
    categories: 'Categorie.',
  },
  expenses: {
    recent: 'Recenti',
    upcoming: 'Prossime',
    merchantPlaceholder: 'Esercente (es. Starbucks)',
    merchantFieldLabel: 'Esercente',
    noteFieldLabel: 'Nota',
    amountHint: 'Tocca due volte per inserire un importo',
    notePlaceholder: 'Nota (opzionale)',
    saveExpense: 'Salva spesa',
    savedConfirmation: 'Salvato',
    all: 'Tutte',
  },
  categories: {
    title: 'Categorie',
    defaultCategories: 'Categorie predefinite',
    customCategories: 'Categorie personalizzate',
    loading: 'Caricamento.',
    emptyTitle: 'Raggruppa le spese a modo tuo',
    emptySubtitle: 'I gruppi rendono più facile vedere gli schemi.',
    emptyCta: 'Aggiungi la tua prima categoria',
    deleteMessage:
      'Le tue spese esistenti vengono mantenute; semplicemente non mostreranno più questa categoria.',
    deleteConfirmCta: 'Elimina categoria',
    deleteCancel: 'Mantieni categoria',
    addCategoryLabel: 'Aggiungi categoria',
    eyebrowDefault: 'Predefinita',
    eyebrowCustom: 'Personalizzata',
  },
  categoryDetail: {
    notFound: 'Categoria non trovata',
    editCategoryLabel: 'Modifica categoria',
    thisMonth: 'questo mese',
    logsStat: 'registri',
    averageStat: 'media',
    sixMonthTrend: 'Andamento di 6 mesi',
    topMerchants: 'Principali esercenti',
    recentLogs: 'Registri recenti',
    noExpensesLogged: 'Ancora nulla registrato in questa categoria.',
    trendEmpty: 'Ancora nessuna spesa da mostrare nel grafico.',
  },
  habitDetail: {
    notFound: 'Abitudine non trovata',
  },
  reports: {
    loading: 'Caricamento.',
  },
  profile: {
    title: 'Profilo.',
    headerLabel: 'Profilo',
    supportRow: 'Assistenza',
  },
  settings: {
    opensInBrowserHint: 'Si apre nel tuo browser.',
    preferences: 'Preferenze',
    currency: 'Valuta',
    about: 'Informazioni',
    privacyPolicy: 'Informativa sulla privacy',
    termsOfService: 'Termini di servizio',
    restorePurchases: 'Ripristina acquisti',
    version: 'Versione',
    currencySheetTitle: 'Valuta.',
    language: 'Lingua',
    languageSheetTitle: 'Lingua.',
    languageSystemDefault: 'Predefinita di sistema',
    restoreNoneMessage: 'Nessun acquisto precedente da ripristinare.',
    restoreDoneMessage: 'I tuoi acquisti sono stati ripristinati.',
    groupGeneral: 'Generale',
    groupMore: 'Altro',
    subscriptionRow: 'Abbonamento',
    subscriptionValueFree: 'Gratuito',
    subscriptionValuePremium: 'Premium',
    startOverRow: 'Ricomincia',
    startOverHint: 'i dati restano su questo dispositivo',
    startOverConfirmTitle: 'Ricominciare?',
    startOverConfirmBody: 'Ti riporta alle schermate iniziali. I tuoi dati restano su questo dispositivo.',
    startOverConfirmCta: 'Ricomincia',
    startOverConfirmCancel: 'Continua',
    startOverToast: 'Ricomincio in corso. I tuoi dati restano su questo dispositivo.',
    linkOpenFailed: 'Non è stato possibile aprire il link.',
    mailOpenFailed: 'Non è stato possibile aprire la posta.',
  },
  addCategoryModal: {
    editCategory: 'Modifica categoria.',
    newCategory: 'Nuova categoria.',
    categoryNamePreview: 'Nome della categoria',
    name: 'Nome',
    namePlaceholder: 'Inserisci il nome della categoria',
    icon: 'Icona',
    color: 'Colore',
  },
  expenseSheet: {
    logEyebrow: 'Registra spesa',
    editEyebrow: 'Modifica spesa',
    categoryEyebrow: 'Categoria',
    whereEyebrow: 'Dove',
    saveExpense: 'Salva',
    saveChanges: 'Salva',
    deleteExpense: 'Elimina spesa',
    keyboardDone: 'Fine',
  },
  toasts: {
    logged: 'Registrato.',
    saved: 'Salvato.',
    deleted: 'Eliminato.',
    undo: 'Annulla',
    restored: 'Ripristinato.',
    addedToUpcoming: 'Aggiunto a Prossime.',
    trialStarted: 'Prova iniziata. 14 giorni gratis.',
    startHabitFailed: 'Non è stato possibile avviarlo. Riprova.',
    logFailed: 'Non è stato salvato. Riprova.',
    saveFailed: 'Non è stato salvato. Riprova.',
    deleteFailed: 'Non è stato eliminato. Riprova.',
    restoreFailed: 'Non è tornato indietro. Riprova.',
    addUpcomingFailed: 'Non è stato salvato. Riprova.',
    checkInFailed: 'Non è stato salvato. Riprova.',
    stopHabitFailed: 'Non si è fermato. Riprova.',
    skipValueFailed: 'Non è stato salvato. Riprova.',
    dismissLeakFailed: 'Non è stato salvato. Riprova.',
    categoryFailed: 'Non è stato salvato. Riprova.',
    currencyFailed: 'Non è stato salvato. Riprova.',
    languageFailed: 'Non è stato salvato. Riprova.',
    startOverFailed: 'Non è stato possibile ricominciare. Riprova.',
    importFailed: 'Non è stato salvato. Non è stato importato nulla. Riprova.',
  },
  addUpcoming: {
    title: 'Aggiungi prossima spesa.',
    editTitle: 'Modifica prossima spesa.',
    saveChanges: 'Salva',
    deleteUpcoming: 'Elimina prossima spesa',
    whatIsIt: 'Cos’è?',
    namePlaceholder: 'Dagli un nome',
    nameFieldLabel: 'Nome',
    nameRent: 'Affitto',
    nameInternet: 'Internet',
    namePhone: 'Telefono',
    nameGym: 'Palestra',
    nameInsurance: 'Assicurazione',
    nameUtilities: 'Utenze',
    schedule: 'Pianificazione',
    oneTime: 'Una tantum',
    repeats: 'Si ripete',
    scheduleSegmentLabel: 'Tipo di pianificazione',
    when: 'Quando?',
    whenTomorrow: 'Domani',
    whenNextWeek: 'La prossima settimana',
    whenInTwoWeeks: 'Tra due settimane',
    whenNextMonth: 'Il prossimo mese',
    frequencyWeekly: 'Settimanale',
    frequencyBiweekly: 'Ogni due settimane',
    frequencyMonthly: 'Mensile',
    frequencyCustom: 'Personalizzato',
    frequencyAnnual: 'Annuale',
    onWhichDay: 'Quale giorno?',
    starting: 'A partire da',
    startingThisWeek: 'Questa settimana',
    startingNextWeek: 'La prossima settimana',
    onThe: 'Il',
    monthDayFirst: '1°',
    monthDayFifteenth: '15',
    monthDayThirtieth: '30',
    monthDayLast: 'Ultimo giorno',
    everyNDaysLabel: 'Ogni N giorni',
    everyNDaysDecrease: 'Meno giorni',
    everyNDaysIncrease: 'Più giorni',
    save: 'Salva',
  },
};
