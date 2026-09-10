/**
 * Provisional machine translation, needs human review.
 *
 * Locale: ja (Japanese). Plan item 4: `common` (except `keep`, held back
 * deliberately, see below), `sheets`, `tabs`, `screenTitles` (run 20), plus
 * `expenses`, `categories`, `categoryDetail`, `profile` (run 21), plus
 * `settings` minus `versionValue`/`supportEmail` (run 22, not localizable
 * content). Every other section is not yet translated and falls back to
 * English via mergeCatalog() in utils/i18n.ts. Function-valued keys
 * (pluralized or interpolated) are omitted throughout and inherit the
 * English function, per plan item 2's deferred ICU work. Trailing periods
 * on titles follow `screenTitles`'s existing precedent (a literal ".", not
 * "。"; run 20's note, a Charen-reviewable choice). Question marks use the
 * half-width "?" for the same reason (run 22, `settings.startOverConfirmTitle`).
 *
 * `common.keep` is withheld on purpose: it is close enough to the app's
 * locked vocabulary (leak/skip/kept/slip, ops CLAUDE.md) that this routine
 * will not guess at it. It stays English until Charen picks a translation;
 * see docs/routines/HANDOFF.md's DECISIONS NEEDED.
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
};
