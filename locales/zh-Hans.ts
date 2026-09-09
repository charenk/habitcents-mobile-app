/**
 * Provisional machine translation, needs human review.
 *
 * Locale: zh-Hans (Chinese, Simplified). Plan item 4's proof-of-pattern
 * slice: `common` (except `keep`, held back deliberately, see below),
 * `sheets`, `tabs`, and `screenTitles`. Every other section is not yet
 * translated and falls back to English via mergeCatalog() in
 * utils/i18n.ts.
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
};
