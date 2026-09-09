/**
 * Provisional machine translation, needs human review.
 *
 * Locale: hi (Hindi). Plan item 4's proof-of-pattern slice: `common`
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
};
