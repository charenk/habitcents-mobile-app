/**
 * Provisional machine translation, needs human review.
 *
 * Locale: pt-BR (Portuguese, Brazil). Plan item 4: `common` (except `keep`,
 * held back deliberately, see below), `sheets`, `tabs`, `screenTitles` (run
 * 20), plus `expenses`, `categories`, `categoryDetail`, `profile` (run 21),
 * plus `settings` minus `versionValue`/`supportEmail` (run 22, not
 * localizable content), plus `addCategoryModal`, `expenseSheet` minus the
 * function-valued `amountLabel` (run 23). Every other section is not yet
 * translated and falls back to English via mergeCatalog() in
 * utils/i18n.ts. Function-valued keys (pluralized or interpolated) are
 * omitted throughout and inherit the English function, per plan item 2's
 * deferred ICU work.
 *
 * `common.keep` is withheld on purpose: it is close enough to the app's
 * locked vocabulary (leak/skip/kept/slip, ops CLAUDE.md) that this routine
 * will not guess at it. It stays English until Charen picks a translation;
 * see docs/routines/HANDOFF.md's DECISIONS NEEDED.
 *
 * Run 24 added: `habitDetail.notFound` (its other four keys are dead code,
 * confirmed unused anywhere in the app); `reports.loading` (dead-code
 * audited section, only this key and the function-valued `weekOf` are
 * actually rendered); `toasts` minus `stoppedHistoryKept`/`leakDismissed`
 * (locked-vocabulary gated), `yesterdayNoted` (dead code), and every
 * function-valued key (deferred ICU work, same as every other section).
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
  habitDetail: {
    notFound: 'Hábito não encontrado',
  },
  reports: {
    loading: 'Carregando.',
  },
  profile: {
    title: 'Perfil.',
    headerLabel: 'Perfil',
    supportRow: 'Suporte',
  },
  settings: {
    opensInBrowserHint: 'Abre no seu navegador.',
    preferences: 'Preferências',
    currency: 'Moeda',
    about: 'Sobre',
    privacyPolicy: 'Política de privacidade',
    termsOfService: 'Termos de serviço',
    restorePurchases: 'Restaurar compras',
    version: 'Versão',
    currencySheetTitle: 'Moeda.',
    language: 'Idioma',
    languageSheetTitle: 'Idioma.',
    languageSystemDefault: 'Padrão do sistema',
    restoreNoneMessage: 'Nenhuma compra anterior para restaurar.',
    restoreDoneMessage: 'Suas compras foram restauradas.',
    groupGeneral: 'Geral',
    groupMore: 'Mais',
    subscriptionRow: 'Assinatura',
    subscriptionValueFree: 'Grátis',
    subscriptionValuePremium: 'Premium',
    startOverRow: 'Recomeçar',
    startOverHint: 'os dados permanecem neste dispositivo',
    startOverConfirmTitle: 'Recomeçar?',
    startOverConfirmBody: 'Leva você de volta às telas iniciais. Seus dados permanecem neste dispositivo.',
    startOverConfirmCta: 'Recomeçar',
    startOverConfirmCancel: 'Continuar',
    startOverToast: 'Recomeçando. Seus dados permanecem neste dispositivo.',
    linkOpenFailed: 'Não foi possível abrir o link.',
    mailOpenFailed: 'Não foi possível abrir o e-mail.',
  },
  addCategoryModal: {
    editCategory: 'Editar categoria.',
    newCategory: 'Nova categoria.',
    categoryNamePreview: 'Nome da categoria',
    name: 'Nome',
    namePlaceholder: 'Insira o nome da categoria',
    icon: 'Ícone',
    color: 'Cor',
  },
  expenseSheet: {
    logEyebrow: 'Registrar despesa',
    editEyebrow: 'Editar despesa',
    categoryEyebrow: 'Categoria',
    whereEyebrow: 'Onde',
    saveExpense: 'Salvar',
    saveChanges: 'Salvar',
    deleteExpense: 'Excluir despesa',
    keyboardDone: 'Concluído',
  },
  toasts: {
    logged: 'Registrado.',
    saved: 'Salvo.',
    deleted: 'Excluído.',
    undo: 'Desfazer',
    restored: 'Restaurado.',
    addedToUpcoming: 'Adicionado a Próximas.',
    trialStarted: 'Teste iniciado. 14 dias grátis.',
    startHabitFailed: 'Isso não pôde ser iniciado. Tente novamente.',
    logFailed: 'Isso não foi salvo. Tente novamente.',
    saveFailed: 'Isso não foi salvo. Tente novamente.',
    deleteFailed: 'Isso não foi excluído. Tente novamente.',
    restoreFailed: 'Isso não voltou. Tente novamente.',
    addUpcomingFailed: 'Isso não foi salvo. Tente novamente.',
    checkInFailed: 'Isso não foi salvo. Tente novamente.',
    stopHabitFailed: 'Isso não foi interrompido. Tente novamente.',
    skipValueFailed: 'Isso não foi salvo. Tente novamente.',
    dismissLeakFailed: 'Isso não foi salvo. Tente novamente.',
    categoryFailed: 'Isso não foi salvo. Tente novamente.',
    currencyFailed: 'Isso não foi salvo. Tente novamente.',
    languageFailed: 'Isso não foi salvo. Tente novamente.',
    startOverFailed: 'Isso não foi reiniciado. Tente novamente.',
    importFailed: 'Isso não foi salvo. Nada foi importado. Tente novamente.',
  },
};
