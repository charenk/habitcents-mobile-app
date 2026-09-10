/**
 * Provisional machine translation, needs human review.
 *
 * Locale: ja (Japanese). Plan item 4: `common` (except `keep`, held back
 * deliberately, see below), `sheets`, `tabs`, `screenTitles` (run 20), plus
 * `expenses`, `categories`, `categoryDetail`, `profile` (run 21), plus
 * `settings` minus `versionValue`/`supportEmail` (run 22, not localizable
 * content), plus `addCategoryModal`, `expenseSheet` minus the function-
 * valued `amountLabel` (run 23). Every other section is not yet translated
 * and falls back to English via mergeCatalog() in utils/i18n.ts.
 * Function-valued keys (pluralized or interpolated) are omitted
 * throughout and inherit the English function, per plan item 2's
 * deferred ICU work. Trailing periods
 * on titles follow `screenTitles`'s existing precedent (a literal ".", not
 * "。"; run 20's note, a Charen-reviewable choice). Question marks use the
 * half-width "?" for the same reason (run 22, `settings.startOverConfirmTitle`).
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
 * Extending the short-label-vs-full-sentence punctuation split this file
 * already carries (literal "." on short/title-style strings like
 * `loading`, native "。" on full sentences like `deleteMessage`): the
 * short one-word confirmation toasts (`logged`/`saved`/`deleted`/
 * `restored`/`addedToUpcoming`) keep the literal ".", the two-clause
 * failure toasts and `trialStarted` use "。".
 */
import type { LocaleOverlay } from '@/utils/i18n';

export const ja: LocaleOverlay = {
  common: {
    save: '保存',
    cancel: 'キャンセル',
    delete: '削除',
    ok: 'OK',
    back: '戻る',
    close: '閉じる',
    dismiss: '消す',
  },
  sheets: {
    saveHintAmount: '先に金額を入力してください',
    saveHintCategoryName: '先にカテゴリ名を入力してください',
  },
  tabs: {
    today: '今日',
    money: 'お金',
    insights: 'インサイト',
    categories: 'カテゴリー',
  },
  screenTitles: {
    today: '今日.',
    money: 'お金.',
    insights: 'インサイト.',
    categories: 'カテゴリー.',
  },
  expenses: {
    recent: '最近',
    upcoming: '今後の予定',
    merchantPlaceholder: '店舗(例: スターバックス)',
    merchantFieldLabel: '店舗',
    noteFieldLabel: 'メモ',
    amountHint: 'ダブルタップして金額を入力',
    notePlaceholder: 'メモ(任意)',
    saveExpense: '支出を保存',
    savedConfirmation: '保存しました',
    all: 'すべて',
  },
  categories: {
    title: 'カテゴリー',
    defaultCategories: 'デフォルトカテゴリー',
    customCategories: 'カスタムカテゴリー',
    loading: '読み込み中.',
    emptyTitle: '自分に合った分け方でグループ化',
    emptySubtitle: 'グループにするとパターンが見やすくなります。',
    emptyCta: '最初のカテゴリーを追加',
    deleteMessage: '既存の支出はそのまま残ります。このカテゴリーが表示されなくなるだけです。',
    deleteConfirmCta: 'カテゴリーを削除',
    deleteCancel: 'カテゴリーを残す',
    addCategoryLabel: 'カテゴリーを追加',
    eyebrowDefault: 'デフォルト',
    eyebrowCustom: 'カスタム',
  },
  categoryDetail: {
    notFound: 'カテゴリーが見つかりません',
    editCategoryLabel: 'カテゴリーを編集',
    thisMonth: '今月',
    logsStat: '記録',
    averageStat: '平均',
    sixMonthTrend: '6か月の推移',
    topMerchants: 'よく利用する店舗',
    recentLogs: '最近の記録',
    noExpensesLogged: 'このカテゴリーにはまだ何も記録されていません。',
    trendEmpty: 'グラフに表示する支出がまだありません。',
  },
  habitDetail: {
    notFound: '習慣が見つかりません',
  },
  reports: {
    loading: '読み込み中.',
  },
  profile: {
    title: 'プロフィール.',
    headerLabel: 'プロフィール',
    supportRow: 'サポート',
  },
  settings: {
    opensInBrowserHint: 'ブラウザで開きます。',
    preferences: '設定',
    currency: '通貨',
    about: '情報',
    privacyPolicy: 'プライバシーポリシー',
    termsOfService: '利用規約',
    restorePurchases: '購入を復元',
    version: 'バージョン',
    currencySheetTitle: '通貨.',
    language: '言語',
    languageSheetTitle: '言語.',
    languageSystemDefault: 'システムのデフォルト',
    restoreNoneMessage: '復元できる購入履歴がありません。',
    restoreDoneMessage: '購入が復元されました。',
    groupGeneral: '一般',
    groupMore: 'その他',
    subscriptionRow: 'サブスクリプション',
    subscriptionValueFree: '無料',
    subscriptionValuePremium: 'プレミアム',
    startOverRow: '最初からやり直す',
    startOverHint: 'データはこの端末に残ります',
    startOverConfirmTitle: '最初からやり直しますか?',
    startOverConfirmBody: '最初の画面に戻ります。データはこの端末に残ります。',
    startOverConfirmCta: '最初からやり直す',
    startOverConfirmCancel: '続ける',
    startOverToast: 'やり直しています。データはこの端末に残ります。',
    linkOpenFailed: 'リンクを開けませんでした。',
    mailOpenFailed: 'メールを開けませんでした。',
  },
  addCategoryModal: {
    editCategory: 'カテゴリーを編集.',
    newCategory: '新しいカテゴリー.',
    categoryNamePreview: 'カテゴリー名',
    name: '名前',
    namePlaceholder: 'カテゴリー名を入力',
    icon: 'アイコン',
    color: '色',
  },
  expenseSheet: {
    logEyebrow: '支出を記録',
    editEyebrow: '支出を編集',
    categoryEyebrow: 'カテゴリー',
    whereEyebrow: 'どこで',
    saveExpense: '保存',
    saveChanges: '保存',
    deleteExpense: '支出を削除',
    keyboardDone: '完了',
  },
  toasts: {
    logged: '記録済み.',
    saved: '保存済み.',
    deleted: '削除済み.',
    undo: '元に戻す',
    restored: '復元済み.',
    addedToUpcoming: '今後の予定に追加済み.',
    trialStarted: '体験期間を開始しました。14日間無料。',
    startHabitFailed: '開始できませんでした。もう一度お試しください。',
    logFailed: '保存できませんでした。もう一度お試しください。',
    saveFailed: '保存できませんでした。もう一度お試しください。',
    deleteFailed: '削除できませんでした。もう一度お試しください。',
    restoreFailed: '元に戻せませんでした。もう一度お試しください。',
    addUpcomingFailed: '保存できませんでした。もう一度お試しください。',
    checkInFailed: '保存できませんでした。もう一度お試しください。',
    stopHabitFailed: '停止できませんでした。もう一度お試しください。',
    skipValueFailed: '保存できませんでした。もう一度お試しください。',
    dismissLeakFailed: '保存できませんでした。もう一度お試しください。',
    categoryFailed: '保存できませんでした。もう一度お試しください。',
    currencyFailed: '保存できませんでした。もう一度お試しください。',
    languageFailed: '保存できませんでした。もう一度お試しください。',
    startOverFailed: 'リセットできませんでした。もう一度お試しください。',
    importFailed: '保存できませんでした。何もインポートされていません。もう一度お試しください。',
  },
};
