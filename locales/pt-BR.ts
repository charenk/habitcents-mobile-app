/**
 * Provisional machine translation, needs human review.
 *
 * Locale: pt-BR (Portuguese, Brazil). Plan item 4: `common` (except `keep`,
 * held back deliberately, see below), `sheets`, `tabs`, `screenTitles` (run
 * 20), plus `expenses`, `categories`, `categoryDetail`, `profile` (run 21).
 * Every other section is not yet translated and falls back to English via
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
  expenses: {
    recent: 'Recentes',
    upcoming: 'Próximas',
    merchantPlaceholder: 'Estabelecimento (ex.: Starbucks)',
    merchantFieldLabel: 'Estabelecimento',
    noteFieldLabel: 'Nota',
    amountHint: 'Toque duas vezes para inserir um valor',
    notePlaceholder: 'Nota (opcional)',
    saveExpense: 'Salvar despesa',
    savedConfirmation: 'Salvo',
    all: 'Todas',
  },
  categories: {
    title: 'Categorias',
    defaultCategories: 'Categorias padrão',
    customCategories: 'Categorias personalizadas',
    loading: 'Carregando.',
    emptyTitle: 'Agrupe seus gastos do seu jeito',
    emptySubtitle: 'Grupos facilitam ver os padrões.',
    emptyCta: 'Adicione sua primeira categoria',
    deleteMessage: 'Suas despesas existentes são mantidas; elas só deixarão de mostrar esta categoria.',
    deleteConfirmCta: 'Excluir categoria',
    deleteCancel: 'Manter categoria',
    addCategoryLabel: 'Adicionar categoria',
    eyebrowDefault: 'Padrão',
    eyebrowCustom: 'Personalizada',
  },
  categoryDetail: {
    notFound: 'Categoria não encontrada',
    editCategoryLabel: 'Editar categoria',
    thisMonth: 'este mês',
    logsStat: 'registros',
    averageStat: 'média',
    sixMonthTrend: 'Tendência de 6 meses',
    topMerchants: 'Principais estabelecimentos',
    recentLogs: 'Registros recentes',
    noExpensesLogged: 'Nada registrado nesta categoria ainda.',
    trendEmpty: 'Ainda não há gastos para exibir no gráfico.',
  },
  profile: {
    title: 'Perfil.',
    headerLabel: 'Perfil',
    supportRow: 'Suporte',
  },
};
