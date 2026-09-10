/**
 * Provisional machine translation, needs human review.
 *
 * Locale: ko (Korean). Plan item 4: `common` (except `keep`, held back
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
  expenses: {
    recent: '최근',
    upcoming: '예정',
    merchantPlaceholder: '가맹점 (예: 스타벅스)',
    merchantFieldLabel: '가맹점',
    noteFieldLabel: '메모',
    amountHint: '두 번 탭하여 금액 입력',
    notePlaceholder: '메모 (선택 사항)',
    saveExpense: '지출 저장',
    savedConfirmation: '저장됨',
    all: '전체',
  },
  categories: {
    title: '카테고리',
    defaultCategories: '기본 카테고리',
    customCategories: '사용자 지정 카테고리',
    loading: '불러오는 중.',
    emptyTitle: '내 방식대로 지출 그룹화하기',
    emptySubtitle: '그룹으로 묶으면 패턴을 더 쉽게 볼 수 있어요.',
    emptyCta: '첫 카테고리 추가하기',
    deleteMessage: '기존 지출 내역은 그대로 유지됩니다. 이 카테고리로 표시되지 않을 뿐입니다.',
    deleteConfirmCta: '카테고리 삭제',
    deleteCancel: '카테고리 유지',
    addCategoryLabel: '카테고리 추가',
    eyebrowDefault: '기본',
    eyebrowCustom: '사용자 지정',
  },
  categoryDetail: {
    notFound: '카테고리를 찾을 수 없습니다',
    editCategoryLabel: '카테고리 편집',
    thisMonth: '이번 달',
    logsStat: '기록',
    averageStat: '평균',
    sixMonthTrend: '6개월 추이',
    topMerchants: '주요 가맹점',
    recentLogs: '최근 기록',
    noExpensesLogged: '이 카테고리에 아직 기록된 내용이 없어요.',
    trendEmpty: '아직 표시할 지출이 없어요.',
  },
  profile: {
    title: '프로필.',
    headerLabel: '프로필',
    supportRow: '지원',
  },
  settings: {
    opensInBrowserHint: '브라우저에서 열립니다.',
    preferences: '환경설정',
    currency: '통화',
    about: '정보',
    privacyPolicy: '개인정보 보호정책',
    termsOfService: '서비스 이용약관',
    restorePurchases: '구매 복원',
    version: '버전',
    currencySheetTitle: '통화.',
    language: '언어',
    languageSheetTitle: '언어.',
    languageSystemDefault: '시스템 기본값',
    restoreNoneMessage: '복원할 이전 구매 내역이 없어요.',
    restoreDoneMessage: '구매 내역이 복원되었어요.',
    groupGeneral: '일반',
    groupMore: '더보기',
    subscriptionRow: '구독',
    subscriptionValueFree: '무료',
    subscriptionValuePremium: '프리미엄',
    startOverRow: '처음부터 다시 시작',
    startOverHint: '데이터는 이 기기에 남아요',
    startOverConfirmTitle: '처음부터 다시 시작할까요?',
    startOverConfirmBody: '시작 화면으로 돌아가요. 데이터는 이 기기에 남아요.',
    startOverConfirmCta: '처음부터 다시 시작',
    startOverConfirmCancel: '계속하기',
    startOverToast: '처음부터 다시 시작하는 중이에요. 데이터는 이 기기에 남아요.',
    linkOpenFailed: '링크를 열 수 없었어요.',
    mailOpenFailed: '메일을 열 수 없었어요.',
  },
  addCategoryModal: {
    editCategory: '카테고리 편집.',
    newCategory: '새 카테고리.',
    categoryNamePreview: '카테고리 이름',
    name: '이름',
    namePlaceholder: '카테고리 이름 입력',
    icon: '아이콘',
    color: '색상',
  },
  expenseSheet: {
    logEyebrow: '지출 기록',
    editEyebrow: '지출 편집',
    categoryEyebrow: '카테고리',
    whereEyebrow: '어디서',
    saveExpense: '저장',
    saveChanges: '저장',
    deleteExpense: '지출 삭제',
    keyboardDone: '완료',
  },
};
