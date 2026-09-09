/**
 * Provisional machine translation, needs human review.
 *
 * Locale: it (Italian). Plan item 4: `common` (except `keep`, held back
 * deliberately, see below), `sheets`, `tabs`, `screenTitles` (run 20), plus
 * `expenses`, `categories`, `categoryDetail`, `profile` (run 21). Every
 * other section is not yet translated and falls back to English via
 * mergeCatalog() in utils/i18n.ts. Function-valued keys (pluralized or
 * interpolated) are omitted throughout and inherit the English function,
 * per plan item 2's deferred ICU work.
 *
 * `common.keep` is withheld on purpose: it is close enough to the app's
 * locked vocabulary (leak/skip/kept/slip, ops CLAUDE.md) that this routine
 * will not guess at it. It stays English until Charen picks a translation;
 * see docs/routines/HANDOFF.md's DECISIONS NEEDED.
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
  profile: {
    title: 'Profilo.',
    headerLabel: 'Profilo',
    supportRow: 'Assistenza',
  },
};
