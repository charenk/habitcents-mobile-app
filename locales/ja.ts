/**
 * Provisional machine translation, needs human review.
 *
 * Locale: ja (Japanese). Plan item 4's proof-of-pattern slice: `common`
 * (except `keep`, held back deliberately, see below), `sheets`, `tabs`, and
 * `screenTitles`. Every other section is not yet translated and falls back
 * to English via mergeCatalog() in utils/i18n.ts.
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
};
