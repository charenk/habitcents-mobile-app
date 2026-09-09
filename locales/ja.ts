/**
 * Provisional machine translation, needs human review.
 *
 * Locale: ja (Japanese). Plan item 4: `common` (except `keep`, held back
 * deliberately, see below), `sheets`, `tabs`, `screenTitles` (run 20), plus
 * `expenses`, `categories`, `categoryDetail`, `profile` (run 21). Every
 * other section is not yet translated and falls back to English via
 * mergeCatalog() in utils/i18n.ts. Function-valued keys (pluralized or
 * interpolated) are omitted throughout and inherit the English function,
 * per plan item 2's deferred ICU work. Trailing periods on titles follow
 * `screenTitles`'s existing precedent (a literal ".", not "。"; run 20's
 * note, a Charen-reviewable choice).
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
};
