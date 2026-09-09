/**
 * Provisional machine translation, needs human review.
 *
 * Locale: fr (French). Plan item 4's proof-of-pattern slice: `common`
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

export const fr: LocaleOverlay = {
  common: {
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    ok: 'OK',
    back: 'Retour',
    close: 'Fermer',
    dismiss: 'Ignorer',
  },
  sheets: {
    saveHintAmount: 'Entrez d’abord un montant',
    saveHintCategoryName: 'Entrez d’abord un nom de catégorie',
  },
  tabs: {
    today: 'Aujourd’hui',
    money: 'Argent',
    insights: 'Aperçus',
    categories: 'Catégories',
  },
  screenTitles: {
    today: 'Aujourd’hui.',
    money: 'Argent.',
    insights: 'Aperçus.',
    categories: 'Catégories.',
  },
};
