/**
 * Provisional machine translation, needs human review.
 *
 * Locale: zh-Hans (Chinese, Simplified). Plan item 4: `common` (except
 * `keep`, held back deliberately, see below), `sheets`, `tabs`,
 * `screenTitles` (run 20), plus `expenses`, `categories`, `categoryDetail`,
 * `profile` (run 21), plus `settings` minus `versionValue`/`supportEmail`
 * (run 22, not localizable content). Every other section is not yet
 * translated and falls back to English via mergeCatalog() in
 * utils/i18n.ts. Function-valued keys (pluralized or interpolated) are
 * omitted throughout and inherit the English function, per plan item 2's
 * deferred ICU work.
 *
 * `common.keep` is withheld on purpose: it is close enough to the app's
 * locked vocabulary (leak/skip/kept/slip, ops CLAUDE.md) that this routine
 * will not guess at it. It stays English until Charen picks a translation;
 * see docs/routines/HANDOFF.md's DECISIONS NEEDED.
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
    deleteMessage: '你现有的支出会被保留,只是不再显示这个分类。',
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
};
