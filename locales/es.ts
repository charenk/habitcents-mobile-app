/**
 * Provisional machine translation, needs human review.
 *
 * Locale: es (Spanish). Plan item 4: `common` (except `keep`, held back
 * deliberately, see below), `sheets`, `tabs`, `screenTitles` (run 20), plus
 * `expenses`, `categories`, `categoryDetail`, `profile` (run 21), plus
 * `settings` minus `versionValue`/`supportEmail` (run 22, not localizable
 * content), plus `addCategoryModal`, `expenseSheet` minus the function-
 * valued `amountLabel` (run 23). Every other section is not yet translated
 * and falls back to English via mergeCatalog() in utils/i18n.ts.
 * Function-valued keys (pluralized or interpolated) are omitted
 * throughout and inherit the English function, per plan item 2's
 * deferred ICU work.
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
  expenses: {
    recent: 'Reciente',
    upcoming: 'Próximos',
    merchantPlaceholder: 'Comercio (p. ej. Starbucks)',
    merchantFieldLabel: 'Comercio',
    noteFieldLabel: 'Nota',
    amountHint: 'Toca dos veces para ingresar un monto',
    notePlaceholder: 'Nota (opcional)',
    saveExpense: 'Guardar gasto',
    savedConfirmation: 'Guardado',
    all: 'Todos',
  },
  categories: {
    title: 'Categorías',
    defaultCategories: 'Categorías predeterminadas',
    customCategories: 'Categorías personalizadas',
    loading: 'Cargando.',
    emptyTitle: 'Agrupa tus gastos a tu manera',
    emptySubtitle: 'Los grupos facilitan ver los patrones.',
    emptyCta: 'Agrega tu primera categoría',
    deleteMessage: 'Tus gastos existentes se conservan; solo dejarán de mostrar esta categoría.',
    deleteConfirmCta: 'Eliminar categoría',
    deleteCancel: 'Conservar categoría',
    addCategoryLabel: 'Agregar categoría',
    eyebrowDefault: 'Predeterminada',
    eyebrowCustom: 'Personalizada',
  },
  categoryDetail: {
    notFound: 'Categoría no encontrada',
    editCategoryLabel: 'Editar categoría',
    thisMonth: 'este mes',
    logsStat: 'registros',
    averageStat: 'promedio',
    sixMonthTrend: 'Tendencia de 6 meses',
    topMerchants: 'Comercios principales',
    recentLogs: 'Registros recientes',
    noExpensesLogged: 'Nada registrado en esta categoría todavía.',
    trendEmpty: 'Aún no hay gastos para graficar.',
  },
  profile: {
    title: 'Perfil.',
    headerLabel: 'Perfil',
    supportRow: 'Soporte',
  },
  settings: {
    opensInBrowserHint: 'Se abre en tu navegador.',
    preferences: 'Preferencias',
    currency: 'Moneda',
    about: 'Acerca de',
    privacyPolicy: 'Política de privacidad',
    termsOfService: 'Términos de servicio',
    restorePurchases: 'Restaurar compras',
    version: 'Versión',
    currencySheetTitle: 'Moneda.',
    language: 'Idioma',
    languageSheetTitle: 'Idioma.',
    languageSystemDefault: 'Predeterminado del sistema',
    restoreNoneMessage: 'No hay compras anteriores para restaurar.',
    restoreDoneMessage: 'Tus compras se han restaurado.',
    groupGeneral: 'General',
    groupMore: 'Más',
    subscriptionRow: 'Suscripción',
    subscriptionValueFree: 'Gratis',
    subscriptionValuePremium: 'Premium',
    startOverRow: 'Empezar de nuevo',
    startOverHint: 'los datos permanecen en este dispositivo',
    startOverConfirmTitle: '¿Empezar de nuevo?',
    startOverConfirmBody:
      'Te lleva de vuelta a las pantallas iniciales. Tus datos permanecen en este dispositivo.',
    startOverConfirmCta: 'Empezar de nuevo',
    startOverConfirmCancel: 'Seguir',
    startOverToast: 'Empezando de nuevo. Tus datos permanecen en este dispositivo.',
    linkOpenFailed: 'No se pudo abrir el enlace.',
    mailOpenFailed: 'No se pudo abrir el correo.',
  },
  addCategoryModal: {
    editCategory: 'Editar categoría.',
    newCategory: 'Nueva categoría.',
    categoryNamePreview: 'Nombre de la categoría',
    name: 'Nombre',
    namePlaceholder: 'Ingresa el nombre de la categoría',
    icon: 'Icono',
    color: 'Color',
  },
  expenseSheet: {
    logEyebrow: 'Registrar gasto',
    editEyebrow: 'Editar gasto',
    categoryEyebrow: 'Categoría',
    whereEyebrow: 'Dónde',
    saveExpense: 'Guardar',
    saveChanges: 'Guardar',
    deleteExpense: 'Eliminar gasto',
    keyboardDone: 'Listo',
  },
};
