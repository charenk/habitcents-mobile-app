/**
 * Provisional machine translation, needs human review.
 *
 * Locale: ko (Korean). Plan item 4's proof-of-pattern slice: `common`
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

export const ko: LocaleOverlay = {
  common: {
    save: '저장',
    cancel: '취소',
    delete: '삭제',
    ok: '확인',
    back: '뒤로',
    close: '닫기',
    dismiss: '지우기',
  },
  sheets: {
    saveHintAmount: '먼저 금액을 입력하세요',
    saveHintCategoryName: '먼저 카테고리 이름을 입력하세요',
  },
  tabs: {
    today: '오늘',
    money: '자금',
    insights: '인사이트',
    categories: '카테고리',
  },
  screenTitles: {
    today: '오늘.',
    money: '자금.',
    insights: '인사이트.',
    categories: '카테고리.',
  },
};
