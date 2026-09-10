/**
 * Provisional machine translation, needs human review.
 *
 * Locale: fr (French). Plan item 4: `common` (except `keep`, held back
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
  expenses: {
    recent: 'Récent',
    upcoming: 'À venir',
    merchantPlaceholder: 'Commerçant (p. ex. Starbucks)',
    merchantFieldLabel: 'Commerçant',
    noteFieldLabel: 'Note',
    amountHint: 'Appuyez deux fois pour saisir un montant',
    notePlaceholder: 'Note (facultatif)',
    saveExpense: 'Enregistrer la dépense',
    savedConfirmation: 'Enregistré',
    all: 'Tous',
  },
  categories: {
    title: 'Catégories',
    defaultCategories: 'Catégories par défaut',
    customCategories: 'Catégories personnalisées',
    loading: 'Chargement.',
    emptyTitle: 'Regroupez vos dépenses à votre façon',
    emptySubtitle: 'Les groupes rendent les tendances plus faciles à voir.',
    emptyCta: 'Ajoutez votre première catégorie',
    deleteMessage:
      'Vos dépenses existantes sont conservées ; elles n’afficheront simplement plus cette catégorie.',
    deleteConfirmCta: 'Supprimer la catégorie',
    deleteCancel: 'Conserver la catégorie',
    addCategoryLabel: 'Ajouter une catégorie',
    eyebrowDefault: 'Par défaut',
    eyebrowCustom: 'Personnalisée',
  },
  categoryDetail: {
    notFound: 'Catégorie introuvable',
    editCategoryLabel: 'Modifier la catégorie',
    thisMonth: 'ce mois-ci',
    logsStat: 'entrées',
    averageStat: 'moyenne',
    sixMonthTrend: 'Tendance sur 6 mois',
    topMerchants: 'Principaux commerçants',
    recentLogs: 'Entrées récentes',
    noExpensesLogged: 'Rien d’enregistré dans cette catégorie pour l’instant.',
    trendEmpty: 'Aucune dépense à représenter pour l’instant.',
  },
  habitDetail: {
    notFound: 'Habitude introuvable',
  },
  reports: {
    loading: 'Chargement.',
  },
  profile: {
    title: 'Profil.',
    headerLabel: 'Profil',
    supportRow: 'Assistance',
  },
  settings: {
    opensInBrowserHint: 'S’ouvre dans votre navigateur.',
    preferences: 'Préférences',
    currency: 'Devise',
    about: 'À propos',
    privacyPolicy: 'Politique de confidentialité',
    termsOfService: 'Conditions d’utilisation',
    restorePurchases: 'Restaurer les achats',
    version: 'Version',
    currencySheetTitle: 'Devise.',
    language: 'Langue',
    languageSheetTitle: 'Langue.',
    languageSystemDefault: 'Système par défaut',
    restoreNoneMessage: 'Aucun achat précédent à restaurer.',
    restoreDoneMessage: 'Vos achats ont été restaurés.',
    groupGeneral: 'Général',
    groupMore: 'Plus',
    subscriptionRow: 'Abonnement',
    subscriptionValueFree: 'Gratuit',
    subscriptionValuePremium: 'Premium',
    startOverRow: 'Recommencer',
    startOverHint: 'les données restent sur cet appareil',
    startOverConfirmTitle: 'Recommencer ?',
    startOverConfirmBody:
      'Vous ramène aux écrans de départ. Vos données restent sur cet appareil.',
    startOverConfirmCta: 'Recommencer',
    startOverConfirmCancel: 'Continuer',
    startOverToast: 'Redémarrage en cours. Vos données restent sur cet appareil.',
    linkOpenFailed: 'Impossible d’ouvrir le lien.',
    mailOpenFailed: 'Impossible d’ouvrir la messagerie.',
  },
  addCategoryModal: {
    editCategory: 'Modifier la catégorie.',
    newCategory: 'Nouvelle catégorie.',
    categoryNamePreview: 'Nom de la catégorie',
    name: 'Nom',
    namePlaceholder: 'Saisissez le nom de la catégorie',
    icon: 'Icône',
    color: 'Couleur',
  },
  expenseSheet: {
    logEyebrow: 'Consigner une dépense',
    editEyebrow: 'Modifier la dépense',
    categoryEyebrow: 'Catégorie',
    whereEyebrow: 'Où',
    saveExpense: 'Enregistrer',
    saveChanges: 'Enregistrer',
    deleteExpense: 'Supprimer la dépense',
    keyboardDone: 'Terminé',
  },
  toasts: {
    logged: 'Consigné.',
    saved: 'Enregistré.',
    deleted: 'Supprimé.',
    undo: 'Annuler',
    restored: 'Restauré.',
    addedToUpcoming: 'Ajouté à la liste À venir.',
    trialStarted: 'Essai commencé. 14 jours gratuits.',
    startHabitFailed: 'Cela n’a pas pu démarrer. Réessayez.',
    logFailed: 'Cela n’a pas été enregistré. Réessayez.',
    saveFailed: 'Cela n’a pas été enregistré. Réessayez.',
    deleteFailed: 'Cela n’a pas été supprimé. Réessayez.',
    restoreFailed: 'Cela n’est pas revenu. Réessayez.',
    addUpcomingFailed: 'Cela n’a pas été enregistré. Réessayez.',
    checkInFailed: 'Cela n’a pas été enregistré. Réessayez.',
    stopHabitFailed: 'Cela ne s’est pas arrêté. Réessayez.',
    skipValueFailed: 'Cela n’a pas été enregistré. Réessayez.',
    dismissLeakFailed: 'Cela n’a pas été enregistré. Réessayez.',
    categoryFailed: 'Cela n’a pas été enregistré. Réessayez.',
    currencyFailed: 'Cela n’a pas été enregistré. Réessayez.',
    languageFailed: 'Cela n’a pas été enregistré. Réessayez.',
    startOverFailed: 'Cela n’a pas pu recommencer. Réessayez.',
    importFailed: 'Cela n’a pas été enregistré. Rien n’a été importé. Réessayez.',
  },
};
