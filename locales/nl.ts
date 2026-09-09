/**
 * Provisional machine translation, needs human review.
 *
 * Locale: nl (Dutch). Plan item 4's proof-of-pattern slice: `common`
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
};
