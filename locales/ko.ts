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
 *
 * Run 24 added: `habitDetail.notFound` (its other four keys are dead code,
 * confirmed unused anywhere in the app); `reports.loading` (dead-code
 * audited section, only this key and the function-valued `weekOf` are
 * actually rendered); `toasts` minus `stoppedHistoryKept`/`leakDismissed`
 * (locked-vocabulary gated), `yesterdayNoted` (dead code), and every
 * function-valued key (deferred ICU work, same as every other section).
 * The short one-word confirmation toasts (`logged`/`saved`/`deleted`/
 * `restored`/`addedToUpcoming`/`trialStarted`) use the terse noun+됨 toast
 * style Korean apps use for status notifications; the failure toasts use
 * the conversational -어요/-세요 register already established in
 * `settings.restoreDoneMessage`/`saveHintAmount`.
 *
 * Run 26 added: `addUpcoming` (all string keys; `everyNDaysValue`/
 * `amountLabel` stay omitted, both function-valued). Real render path
 * confirmed via `components/money/AddUpcomingSheet.tsx`, already
 * `useStrings()`-converted. `whenNextWeek`/`startingNextWeek` share one
 * translation, matching the English source reusing "Next week" in both
 * places. The field-prompt questions (`whatIsIt`, `when`, `onWhichDay`)
 * use the conversational -가요 register, same family as this file's
 * established -어요/-세요 register; `onThe` (the connector above the
 * day-of-month chips) has no natural standalone Korean equivalent, so it
 * reads as the field's own name ("날짜", date) instead.
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
  habitDetail: {
    notFound: '습관을 찾을 수 없습니다',
  },
  reports: {
    loading: '불러오는 중.',
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
  toasts: {
    logged: '기록됨.',
    saved: '저장됨.',
    deleted: '삭제됨.',
    undo: '실행 취소',
    restored: '복원됨.',
    addedToUpcoming: '예정에 추가됨.',
    trialStarted: '체험 시작됨. 14일 무료.',
    startHabitFailed: '시작하지 못했어요. 다시 시도해 주세요.',
    logFailed: '저장하지 못했어요. 다시 시도해 주세요.',
    saveFailed: '저장하지 못했어요. 다시 시도해 주세요.',
    deleteFailed: '삭제하지 못했어요. 다시 시도해 주세요.',
    restoreFailed: '다시 돌아오지 못했어요. 다시 시도해 주세요.',
    addUpcomingFailed: '저장하지 못했어요. 다시 시도해 주세요.',
    checkInFailed: '저장하지 못했어요. 다시 시도해 주세요.',
    stopHabitFailed: '중지하지 못했어요. 다시 시도해 주세요.',
    skipValueFailed: '저장하지 못했어요. 다시 시도해 주세요.',
    dismissLeakFailed: '저장하지 못했어요. 다시 시도해 주세요.',
    categoryFailed: '저장하지 못했어요. 다시 시도해 주세요.',
    currencyFailed: '저장하지 못했어요. 다시 시도해 주세요.',
    languageFailed: '저장하지 못했어요. 다시 시도해 주세요.',
    startOverFailed: '초기화하지 못했어요. 다시 시도해 주세요.',
    importFailed: '저장하지 못했어요. 아무것도 가져오지 못했어요. 다시 시도해 주세요.',
  },
  addUpcoming: {
    title: '예정된 지출 추가.',
    editTitle: '예정된 지출 편집.',
    saveChanges: '저장',
    deleteUpcoming: '예정된 지출 삭제',
    whatIsIt: '무엇인가요?',
    namePlaceholder: '이름 짓기',
    nameFieldLabel: '이름',
    nameRent: '월세',
    nameInternet: '인터넷',
    namePhone: '전화',
    nameGym: '헬스장',
    nameInsurance: '보험',
    nameUtilities: '공과금',
    schedule: '일정',
    oneTime: '한 번',
    repeats: '반복',
    scheduleSegmentLabel: '일정 유형',
    when: '언제인가요?',
    whenTomorrow: '내일',
    whenNextWeek: '다음 주',
    whenInTwoWeeks: '2주 후',
    whenNextMonth: '다음 달',
    frequencyWeekly: '매주',
    frequencyBiweekly: '격주',
    frequencyMonthly: '매월',
    frequencyCustom: '사용자 지정',
    frequencyAnnual: '매년',
    onWhichDay: '어느 요일인가요?',
    starting: '시작',
    startingThisWeek: '이번 주',
    startingNextWeek: '다음 주',
    onThe: '날짜',
    monthDayFirst: '1일',
    monthDayFifteenth: '15일',
    monthDayThirtieth: '30일',
    monthDayLast: '마지막 날',
    everyNDaysLabel: 'N일마다',
    everyNDaysDecrease: '일수 줄이기',
    everyNDaysIncrease: '일수 늘리기',
    save: '저장',
  },
};
