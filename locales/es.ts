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
 *
 * Run 24 added: `habitDetail.notFound` (its other four keys are dead code,
 * confirmed unused anywhere in the app); `reports.loading` (dead-code
 * audited section, only this key and the function-valued `weekOf` are
 * actually rendered); `toasts` minus `stoppedHistoryKept`/`leakDismissed`
 * (locked-vocabulary gated), `yesterdayNoted` (dead code), and every
 * function-valued key (deferred ICU work, same as every other section).
 *
 * Run 26 added: `addUpcoming` (all string keys; `everyNDaysValue`/
 * `amountLabel` stay omitted, both function-valued). Real render path
 * confirmed via `components/money/AddUpcomingSheet.tsx`, already
 * `useStrings()`-converted. `whenNextWeek`/`startingNextWeek` share one
 * translation, matching the English source reusing "Next week" in both
 * places.
 *
 * Run 27 added: `money` minus `habitsEmptyTitle`/`habitsEmptyBody` (locked-
 * vocabulary gated: "leak") and every function-valued key (deferred ICU
 * work). `spentEmptyBody`/`upcomingEmptyBody` confirmed dead code (never
 * rendered, same RETIRED treatment as elsewhere) and left untranslated.
 * `scheduleSeparator` (a plain " \u00b7 " middle-dot punctuation mark, no
 * linguistic content) stays omitted like a function-valued key.
 * `scheduleOneTime`/`scheduleWeekly`/`scheduleMonthly`/`scheduleAnnual`
 * reuse `addUpcoming`'s matching frequency translations (same English
 * source word); `scheduleBiweekly` ('Every 2 weeks') is translated fresh
 * since its English source differs from `addUpcoming.frequencyBiweekly`
 * ('Bi-weekly').
 *
 * Run 35 added: `habits.loading`, reusing the same "Loading." translation
 * as `categories.loading`/`reports.loading`. This section's other four keys
 * (`title`, `spottingYourLeak`, `logsAtSamePlace`, `logsAtSamePlaceSuffix`,
 * `logsAtSamePlaceBody`) are dead code, confirmed via grep with zero real
 * call sites anywhere outside constants/strings.ts; left untranslated, same
 * treatment as habitDetail's/reports' own dead keys.
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
  habits: {
    loading: 'Cargando.',
  },
  habitDetail: {
    notFound: 'Hábito no encontrado',
  },
  reports: {
    loading: 'Cargando.',
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
  toasts: {
    logged: 'Registrado.',
    saved: 'Guardado.',
    deleted: 'Eliminado.',
    undo: 'Deshacer',
    restored: 'Restaurado.',
    addedToUpcoming: 'Añadido a Próximos.',
    trialStarted: 'Prueba iniciada. 14 días gratis.',
    startHabitFailed: 'Eso no se pudo iniciar. Inténtalo de nuevo.',
    logFailed: 'Eso no se guardó. Inténtalo de nuevo.',
    saveFailed: 'Eso no se guardó. Inténtalo de nuevo.',
    deleteFailed: 'Eso no se eliminó. Inténtalo de nuevo.',
    restoreFailed: 'Eso no volvió. Inténtalo de nuevo.',
    addUpcomingFailed: 'Eso no se guardó. Inténtalo de nuevo.',
    checkInFailed: 'Eso no se guardó. Inténtalo de nuevo.',
    stopHabitFailed: 'Eso no se detuvo. Inténtalo de nuevo.',
    skipValueFailed: 'Eso no se guardó. Inténtalo de nuevo.',
    dismissLeakFailed: 'Eso no se guardó. Inténtalo de nuevo.',
    categoryFailed: 'Eso no se guardó. Inténtalo de nuevo.',
    currencyFailed: 'Eso no se guardó. Inténtalo de nuevo.',
    languageFailed: 'Eso no se guardó. Inténtalo de nuevo.',
    startOverFailed: 'Eso no se reinició. Inténtalo de nuevo.',
    importFailed: 'Eso no se guardó. No se importó nada. Inténtalo de nuevo.',
  },
  addUpcoming: {
    title: 'Añadir gasto próximo.',
    editTitle: 'Editar gasto próximo.',
    saveChanges: 'Guardar',
    deleteUpcoming: 'Eliminar gasto próximo',
    whatIsIt: '¿Qué es?',
    namePlaceholder: 'Ponle un nombre',
    nameFieldLabel: 'Nombre',
    nameRent: 'Alquiler',
    nameInternet: 'Internet',
    namePhone: 'Teléfono',
    nameGym: 'Gimnasio',
    nameInsurance: 'Seguro',
    nameUtilities: 'Servicios',
    schedule: 'Programación',
    oneTime: 'Una vez',
    repeats: 'Se repite',
    scheduleSegmentLabel: 'Tipo de programación',
    when: '¿Cuándo?',
    whenTomorrow: 'Mañana',
    whenNextWeek: 'La próxima semana',
    whenInTwoWeeks: 'En dos semanas',
    whenNextMonth: 'El próximo mes',
    frequencyWeekly: 'Semanal',
    frequencyBiweekly: 'Quincenal',
    frequencyMonthly: 'Mensual',
    frequencyCustom: 'Personalizado',
    frequencyAnnual: 'Anual',
    onWhichDay: '¿Qué día?',
    starting: 'Comenzando',
    startingThisWeek: 'Esta semana',
    startingNextWeek: 'La próxima semana',
    onThe: 'El',
    monthDayFirst: '1',
    monthDayFifteenth: '15',
    monthDayThirtieth: '30',
    monthDayLast: 'Último día',
    everyNDaysLabel: 'Cada N días',
    everyNDaysDecrease: 'Menos días',
    everyNDaysIncrease: 'Más días',
    save: 'Guardar',
  },
  money: {
    segmentSpent: 'Gastado',
    segmentUpcoming: 'Próximos',
    segmentHabits: 'Hábitos',
    segmentLabel: 'Vista de dinero',
    spentToday: 'Hoy',
    spentYesterday: 'Ayer',
    spentTodayEmpty: 'Nada todavía hoy. Agrégalo si gastaste, y disfrútalo si no.',
    spentEditHint: 'Toca una fila para editarla o eliminarla.',
    recurringRowSuffix: 'recurrente',
    spentEmptyTitle: 'Todos tus gastos en un solo lugar',
    upcomingWindowSegmentLabel: 'Ventana de próximos',
    upcomingWindowTwoWeeks: '2 semanas',
    upcomingWindowOneMonth: '1 mes',
    upcomingWindowThreeMonths: '3 meses',
    upcomingAddAffordance: 'Agregar un gasto próximo',
    spentEmptyCta: 'Registrar un gasto',
    habitsEmptyCta: 'Romper un hábito',
    upcomingListEyebrow: 'Programado',
    upcomingEmptyTitle: 'Entérate de lo que viene antes de que llegue',
    upcomingWindowEmptyBody: 'Ninguno de tus gastos recurrentes cae en esta ventana.',
    upcomingEmptyCta: 'Agregar un gasto próximo',
    scheduleOneTime: 'Una vez',
    scheduleWeekly: 'Semanal',
    scheduleBiweekly: 'Cada 2 semanas',
    scheduleMonthly: 'Mensual',
    scheduleAnnual: 'Anual',
  },
};
