/**
 * Provisional machine translation, needs human review.
 *
 * Locale: pt-BR (Portuguese, Brazil). Plan item 4's proof-of-pattern slice:
 * `common` (except `keep`, held back deliberately, see below), `sheets`,
 * `tabs`, and `screenTitles`. Every other section is not yet translated and
 * falls back to English via mergeCatalog() in utils/i18n.ts.
 *
 * `common.keep` is withheld on purpose: it is close enough to the app's
 * locked vocabulary (leak/skip/kept/slip, ops CLAUDE.md) that this routine
 * will not guess at it. It stays English until Charen picks a translation;
 * see docs/routines/HANDOFF.md's DECISIONS NEEDED.
 */
import type { LocaleOverlay } from '@/utils/i18n';

export const ptBR: LocaleOverlay = {
  common: {
    save: 'Salvar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    ok: 'OK',
    back: 'Voltar',
    close: 'Fechar',
    dismiss: 'Dispensar',
  },
  sheets: {
    saveHintAmount: 'Insira um valor primeiro',
    saveHintCategoryName: 'Insira um nome de categoria primeiro',
  },
  tabs: {
    today: 'Hoje',
    money: 'Dinheiro',
    insights: 'Estatísticas',
    categories: 'Categorias',
  },
  screenTitles: {
    today: 'Hoje.',
    money: 'Dinheiro.',
    insights: 'Estatísticas.',
    categories: 'Categorias.',
  },
};
