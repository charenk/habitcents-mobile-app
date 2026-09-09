/**
 * Provisional machine translation, needs human review.
 *
 * Locale: de (German). Plan item 4: `common` (except `keep`, held back
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
  profile: {
    title: 'Profil.',
    headerLabel: 'Profil',
    supportRow: 'Support',
  },
};
