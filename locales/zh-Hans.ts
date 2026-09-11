/**
 * Provisional machine translation, needs human review.
 *
 * Locale: zh-Hans (Chinese, Simplified). Plan item 4: `common` (except
 * `keep`, held back deliberately, see below), `sheets`, `tabs`,
 * `screenTitles` (run 20), plus `expenses`, `categories`, `categoryDetail`,
 * `profile` (run 21), plus `settings` minus `versionValue`/`supportEmail`
 * (run 22, not localizable content), plus `addCategoryModal`,
 * `expenseSheet` minus the function-valued `amountLabel` (run 23). Every
 * other section is not yet translated and falls back to English via
 * mergeCatalog() in utils/i18n.ts. Function-valued keys (pluralized or
 * interpolated) are omitted throughout and inherit the English function,
 * per plan item 2's deferred ICU work.
 *
 * `common.keep` is withheld on purpose: it is close enough to the app's
 * locked vocabulary (leak/skip/kept/slip, ops CLAUDE.md) that this routine
 * will not guess at it. It stays English until Charen picks a translation;
 * see docs/routines/HANDOFF.md's DECISIONS NEEDED.
 *
 * Run 24 fixed, per the 2026-09-10 orchestrator review: `deleteMessage`
 * had a stray ASCII comma mid-sentence ("保留,只是") where the rest of its
 * own sentence uses full-width punctuation; now a full-width "，".
 *
 * Run 24 added: `habitDetail.notFound` (its other four keys are dead code,
 * confirmed unused anywhere in the app); `reports.loading` (dead-code
 * audited section, only this key and the function-valued `weekOf` are
 * actually rendered); `toasts` minus `stoppedHistoryKept`/`leakDismissed`
 * (locked-vocabulary gated), `yesterdayNoted` (dead code), and every
 * function-valued key (deferred ICU work, same as every other section).
 * Extending this file's existing short-label-vs-full-sentence punctuation
 * split (literal "." on short/title-style strings like `loading`, native
 * "。" on full sentences like `deleteMessage`): the short one-word
 * confirmation toasts (`logged`/`saved`/`deleted`/`restored`/
 * `addedToUpcoming`) keep the literal ".", the two-clause failure toasts
 * and `trialStarted` use "。".
 *
 * Run 26 added: `addUpcoming` (all string keys; `everyNDaysValue`/
 * `amountLabel` stay omitted, both function-valued). Real render path
 * confirmed via `components/money/AddUpcomingSheet.tsx`, already
 * `useStrings()`-converted. `whenNextWeek`/`startingNextWeek` share one
 * translation, matching the English source reusing "Next week" in both
 * places. `title`/`editTitle`/`deleteUpcoming` stay on the short-label "."
 * side of this file's punctuation split. The field-prompt questions
 * (`whatIsIt`, `when`, `onWhichDay`) are treated as real sentence
 * questions rather than short labels, same class as
 * `settings.startOverConfirmTitle` above, so they take native "？"; `onThe`
 * (the connector above the day-of-month chips) has no natural standalone
 * Chinese equivalent, so it reads as the field's own name ("日期", date)
 * instead. `onWhichDay` (weekly/biweekly recurrence only, confirmed in
 * `AddUpcomingSheet.tsx`) asks for a day of the WEEK, so it uses "星期几"
 * rather than the more ambiguous "哪一天".
 *
 * Run 27 added: `money` minus `habitsEmptyTitle`/`habitsEmptyBody` (locked-
 * vocabulary gated: "leak"/漏洞) and every function-valued key (deferred
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
 */
import type { LocaleOverlay } from '@/utils/i18n';

export const zhHans: LocaleOverlay = {
  common: {
    save: '保存',
    cancel: '取消',
    delete: '删除',
    ok: '确定',
    back: '返回',
    close: '关闭',
    dismiss: '忽略',
  },
  sheets: {
    saveHintAmount: '请先输入金额',
    saveHintCategoryName: '请先输入分类名称',
  },
  tabs: {
    today: '今天',
    money: '资金',
    insights: '洞察',
    categories: '分类',
  },
  screenTitles: {
    today: '今天.',
    money: '资金.',
    insights: '洞察.',
    categories: '分类.',
  },
  expenses: {
    recent: '最近',
    upcoming: '即将到来',
    merchantPlaceholder: '商家(如星巴克)',
    merchantFieldLabel: '商家',
    noteFieldLabel: '备注',
    amountHint: '双击输入金额',
    notePlaceholder: '备注(可选)',
    saveExpense: '保存支出',
    savedConfirmation: '已保存',
    all: '全部',
  },
  categories: {
    title: '分类',
    defaultCategories: '默认分类',
    customCategories: '自定义分类',
    loading: '加载中.',
    emptyTitle: '按你自己的方式对支出分组',
    emptySubtitle: '分组能让模式更容易被看到。',
    emptyCta: '添加你的第一个分类',
    deleteMessage: '你现有的支出会被保留，只是不再显示这个分类。',
    deleteConfirmCta: '删除分类',
    deleteCancel: '保留分类',
    addCategoryLabel: '添加分类',
    eyebrowDefault: '默认',
    eyebrowCustom: '自定义',
  },
  categoryDetail: {
    notFound: '未找到该分类',
    editCategoryLabel: '编辑分类',
    thisMonth: '本月',
    logsStat: '记录',
    averageStat: '平均',
    sixMonthTrend: '6个月趋势',
    topMerchants: '主要商家',
    recentLogs: '最近记录',
    noExpensesLogged: '这个分类下还没有任何记录。',
    trendEmpty: '暂时没有可显示的支出图表。',
  },
  habitDetail: {
    notFound: '未找到该习惯',
  },
  reports: {
    loading: '加载中.',
  },
  profile: {
    title: '个人资料.',
    headerLabel: '个人资料',
    supportRow: '支持',
  },
  settings: {
    opensInBrowserHint: '将在你的浏览器中打开。',
    preferences: '偏好设置',
    currency: '货币',
    about: '关于',
    privacyPolicy: '隐私政策',
    termsOfService: '服务条款',
    restorePurchases: '恢复购买',
    version: '版本',
    currencySheetTitle: '货币.',
    language: '语言',
    languageSheetTitle: '语言.',
    languageSystemDefault: '系统默认',
    restoreNoneMessage: '没有可恢复的历史购买。',
    restoreDoneMessage: '你的购买已恢复。',
    groupGeneral: '通用',
    groupMore: '更多',
    subscriptionRow: '订阅',
    subscriptionValueFree: '免费',
    subscriptionValuePremium: '高级版',
    startOverRow: '重新开始',
    startOverHint: '数据仍保留在此设备上',
    startOverConfirmTitle: '要重新开始吗？',
    startOverConfirmBody: '将带你回到起始界面。你的数据仍保留在此设备上。',
    startOverConfirmCta: '重新开始',
    startOverConfirmCancel: '继续',
    startOverToast: '正在重新开始。你的数据仍保留在此设备上。',
    linkOpenFailed: '无法打开该链接。',
    mailOpenFailed: '无法打开邮件。',
  },
  addCategoryModal: {
    editCategory: '编辑分类.',
    newCategory: '新建分类.',
    categoryNamePreview: '分类名称',
    name: '名称',
    namePlaceholder: '输入分类名称',
    icon: '图标',
    color: '颜色',
  },
  expenseSheet: {
    logEyebrow: '记录支出',
    editEyebrow: '编辑支出',
    categoryEyebrow: '分类',
    whereEyebrow: '在哪里',
    saveExpense: '保存',
    saveChanges: '保存',
    deleteExpense: '删除支出',
    keyboardDone: '完成',
  },
  toasts: {
    logged: '已记录.',
    saved: '已保存.',
    deleted: '已删除.',
    undo: '撤销',
    restored: '已恢复.',
    addedToUpcoming: '已添加到即将到来.',
    trialStarted: '试用已开始。14天免费。',
    startHabitFailed: '未能开始。请重试。',
    logFailed: '未能保存。请重试。',
    saveFailed: '未能保存。请重试。',
    deleteFailed: '未能删除。请重试。',
    restoreFailed: '未能恢复。请重试。',
    addUpcomingFailed: '未能保存。请重试。',
    checkInFailed: '未能保存。请重试。',
    stopHabitFailed: '未能停止。请重试。',
    skipValueFailed: '未能保存。请重试。',
    dismissLeakFailed: '未能保存。请重试。',
    categoryFailed: '未能保存。请重试。',
    currencyFailed: '未能保存。请重试。',
    languageFailed: '未能保存。请重试。',
    startOverFailed: '未能重置。请重试。',
    importFailed: '未能保存。没有导入任何内容。请重试。',
  },
  addUpcoming: {
    title: '添加即将到来的支出.',
    editTitle: '编辑即将到来的支出.',
    saveChanges: '保存',
    deleteUpcoming: '删除即将到来的支出',
    whatIsIt: '这是什么？',
    namePlaceholder: '起个名字',
    nameFieldLabel: '名称',
    nameRent: '房租',
    nameInternet: '网络',
    namePhone: '话费',
    nameGym: '健身房',
    nameInsurance: '保险',
    nameUtilities: '水电费',
    schedule: '计划',
    oneTime: '一次性',
    repeats: '重复',
    scheduleSegmentLabel: '计划类型',
    when: '什么时候？',
    whenTomorrow: '明天',
    whenNextWeek: '下周',
    whenInTwoWeeks: '两周后',
    whenNextMonth: '下个月',
    frequencyWeekly: '每周',
    frequencyBiweekly: '每两周',
    frequencyMonthly: '每月',
    frequencyCustom: '自定义',
    frequencyAnnual: '每年',
    onWhichDay: '星期几？',
    starting: '开始',
    startingThisWeek: '本周',
    startingNextWeek: '下周',
    onThe: '日期',
    monthDayFirst: '1日',
    monthDayFifteenth: '15日',
    monthDayThirtieth: '30日',
    monthDayLast: '最后一天',
    everyNDaysLabel: '每N天',
    everyNDaysDecrease: '减少天数',
    everyNDaysIncrease: '增加天数',
    save: '保存',
  },
  money: {
    segmentSpent: '已花费',
    segmentUpcoming: '即将到来',
    segmentHabits: '习惯',
    segmentLabel: '资金视图',
    spentToday: '今天',
    spentYesterday: '昨天',
    spentTodayEmpty: '今天还没有记录。如果花了钱就添加，没花就好好享受吧。',
    spentEditHint: '点击一行即可编辑或删除。',
    recurringRowSuffix: '定期',
    spentEmptyTitle: '所有支出集中在一处',
    upcomingWindowSegmentLabel: '即将到来的时间范围',
    upcomingWindowTwoWeeks: '2周',
    upcomingWindowOneMonth: '1个月',
    upcomingWindowThreeMonths: '3个月',
    upcomingAddAffordance: '添加一笔即将到来的支出',
    spentEmptyCta: '记录支出',
    habitsEmptyCta: '戒掉一个习惯',
    upcomingListEyebrow: '已安排',
    upcomingEmptyTitle: '提前了解即将发生的支出',
    upcomingWindowEmptyBody: '你的定期支出都不在这个时间范围内。',
    upcomingEmptyCta: '添加一笔即将到来的支出',
    scheduleOneTime: '一次性',
    scheduleWeekly: '每周',
    scheduleBiweekly: '每2周',
    scheduleMonthly: '每月',
    scheduleAnnual: '每年',
  },
};
