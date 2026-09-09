/**
 * Provisional machine translation, needs human review.
 *
 * Locale: it (Italian). Plan item 4's proof-of-pattern slice: `common`
 * (except `keep`, held back deliberately, see below), `sheets`, `tabs`, and
 * `screenTitles`. Every other section is not yet translated and falls back
 * to English via mergeCatalog() in utils/i18n.ts.
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
};
