/**
 * Provisional machine translation, needs human review.
 *
 * Locale: nl (Dutch). Plan item 4: `common` (except `keep`, held back
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
  profile: {
    title: 'Profiel.',
    headerLabel: 'Profiel',
    supportRow: 'Ondersteuning',
  },
};
