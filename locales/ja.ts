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
 * "。"; run 20's note, a Charen-reviewable choice), extended to every
 * other short/title-style string in this file (sheet titles, tab labels,
 * the short one-word confirmation toasts). Run 22 also used a half-width
 * "?" on `settings.startOverConfirmTitle`, but the 2026-09-10 orchestrator
 * review caught that as a real inconsistency (zh-Hans used full-width
 * "？" there) rather than another title-style exception: a confirm-sheet
 * question is a full sentence, not a short label, so it takes native "？"
 * like every other real sentence in this file. Fixed run 24.
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
 *
 * Run 26 added: `addUpcoming` (all string keys; `everyNDaysValue`/
 * `amountLabel` stay omitted, both function-valued). Real render path
 * confirmed via `components/money/AddUpcomingSheet.tsx`, already
 * `useStrings()`-converted. `whenNextWeek`/`startingNextWeek` share one
 * translation, matching the English source reusing "Next week" in both
 * places. `title`/`editTitle`/`deleteUpcoming` stay on the short-label
 * "." side of this file's punctuation split. The field-prompt questions
 * (`whatIsIt`, `when`, `onWhichDay`) are treated as real sentence
 * questions rather than short labels, same class as
 * `settings.startOverConfirmTitle` above, so they take native "？"; `onThe`
 * (the connector above the day-of-month chips) has no natural standalone
 * Japanese equivalent, so it reads as the field's own name ("日付", date)
 * instead.
 *
 * Run 27 added: `money` minus `habitsEmptyTitle`/`habitsEmptyBody` (locked-
 * vocabulary gated: "leak"/漏れ) and every function-valued key (deferred
 * ICU work). `spentEmptyBody`/`upcomingEmptyBody` confirmed dead code
 * (never rendered, same RETIRED treatment as elsewhere) and left
 * untranslated. `scheduleSeparator` (a plain " · " middle-dot punctuation
 * mark, no linguistic content) stays omitted like a function-valued key.
 * `scheduleOneTime`/`scheduleWeekly`/`scheduleMonthly`/`scheduleAnnual`
 * reuse `addUpcoming`'s matching frequency translations (same English
 * source word); `scheduleBiweekly` ('Every 2 weeks') is translated fresh
 * since its English source differs from `addUpcoming.frequencyBiweekly`
 * ('Bi-weekly'). `spentTodayEmpty`/`spentEditHint`/`upcomingWindowEmptyBody`
 * (real sentences) take native "。"; every short label/title stays
 * unpunctuated, matching this file's short-label-vs-full-sentence split.
 *
 * Run 35 added: `habits.loading`, reusing the same "Loading." translation
 * as `categories.loading`/`reports.loading`. This section's other four keys
 * (`title`, `spottingYourLeak`, `logsAtSamePlace`, `logsAtSamePlaceSuffix`,
 * `logsAtSamePlaceBody`) are dead code, confirmed via grep with zero real
 * call sites anywhere outside constants/strings.ts; left untranslated, same
 * treatment as habitDetail's/reports' own dead keys.
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
  habits: {
    loading: '読み込み中.',
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
    startOverConfirmTitle: '最初からやり直しますか？',
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
  addUpcoming: {
    title: '今後の支出を追加.',
    editTitle: '今後の支出を編集.',
    saveChanges: '保存',
    deleteUpcoming: '今後の支出を削除',
    whatIsIt: '何ですか？',
    namePlaceholder: '名前を付ける',
    nameFieldLabel: '名前',
    nameRent: '家賃',
    nameInternet: 'インターネット',
    namePhone: '電話',
    nameGym: 'ジム',
    nameInsurance: '保険',
    nameUtilities: '光熱費',
    schedule: 'スケジュール',
    oneTime: '1回のみ',
    repeats: '繰り返す',
    scheduleSegmentLabel: 'スケジュールの種類',
    when: 'いつ？',
    whenTomorrow: '明日',
    whenNextWeek: '来週',
    whenInTwoWeeks: '2週間後',
    whenNextMonth: '来月',
    frequencyWeekly: '毎週',
    frequencyBiweekly: '隔週',
    frequencyMonthly: '毎月',
    frequencyCustom: 'カスタム',
    frequencyAnnual: '毎年',
    onWhichDay: '何曜日ですか？',
    starting: '開始',
    startingThisWeek: '今週',
    startingNextWeek: '来週',
    onThe: '日付',
    monthDayFirst: '1日',
    monthDayFifteenth: '15日',
    monthDayThirtieth: '30日',
    monthDayLast: '最終日',
    everyNDaysLabel: 'N日ごと',
    everyNDaysDecrease: '日数を減らす',
    everyNDaysIncrease: '日数を増やす',
    save: '保存',
  },
  money: {
    segmentSpent: '支出',
    segmentUpcoming: '今後の予定',
    segmentHabits: '習慣',
    segmentLabel: 'お金の表示',
    spentToday: '今日',
    spentYesterday: '昨日',
    spentTodayEmpty: '今日はまだ何もありません。使ったら追加して、使わなかったら楽しんでください。',
    spentEditHint: '行をタップして編集または削除します。',
    recurringRowSuffix: '定期',
    spentEmptyTitle: 'すべての支出を1か所に',
    upcomingWindowSegmentLabel: '今後の期間',
    upcomingWindowTwoWeeks: '2週間',
    upcomingWindowOneMonth: '1か月',
    upcomingWindowThreeMonths: '3か月',
    upcomingAddAffordance: '今後の支出を追加',
    spentEmptyCta: '支出を記録',
    habitsEmptyCta: '習慣をやめる',
    upcomingListEyebrow: '予定',
    upcomingEmptyTitle: '次に来るものを、来る前に知っておこう',
    upcomingWindowEmptyBody: 'この期間に該当する定期支出はありません。',
    upcomingEmptyCta: '今後の支出を追加',
    scheduleOneTime: '1回のみ',
    scheduleWeekly: '毎週',
    scheduleBiweekly: '2週間ごと',
    scheduleMonthly: '毎月',
    scheduleAnnual: '毎年',
  },
};
