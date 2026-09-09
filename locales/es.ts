/**
 * Provisional machine translation, needs human review.
 *
 * Locale: es (Spanish). Plan item 4's proof-of-pattern slice: `common`
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

export const es: LocaleOverlay = {
  common: {
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    ok: 'Aceptar',
    back: 'Atrás',
    close: 'Cerrar',
    dismiss: 'Descartar',
  },
  sheets: {
    saveHintAmount: 'Ingresa un monto primero',
    saveHintCategoryName: 'Ingresa un nombre de categoría primero',
  },
  tabs: {
    today: 'Hoy',
    money: 'Dinero',
    insights: 'Estadísticas',
    categories: 'Categorías',
  },
  screenTitles: {
    today: 'Hoy.',
    money: 'Dinero.',
    insights: 'Estadísticas.',
    categories: 'Categorías.',
  },
};
