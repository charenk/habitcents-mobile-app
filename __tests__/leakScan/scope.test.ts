/**
 * Scan scope (PRD v3.1 sect 7.1, phase 2).
 *
 * Scope is layer 1 of the five-layer guarantee that essential spending is never
 * proposed as a habit (design/onboarding-v3/DECISIONS-NEEDED.md, D6). These
 * tests pin the two properties that make it worth having: it fails closed, and
 * the locked tier cannot be opened by any path, including a corrupted or
 * hand-edited rule store.
 */
import type { HabitCandidate, ScanResult } from '@/utils/leakScan/types';
import type { ExpenseCategory } from '@/types/expense';
import {
  ALL_CATEGORIES,
  CATEGORY_TIERS,
  ESSENTIAL_MERCHANT,
  applyScope,
  categoriesInTier,
  defaultScope,
  isDefaultScope,
  isEssentialCandidate,
  isInScope,
  isLocked,
  scopeCodes,
  scopeFromRules,
  selectedCategories,
  toggleScope,
  unselectedCategories,
  type ScanScope,
} from '@/utils/leakScan/scope';

function candidate(overrides: Partial<HabitCandidate> = {}): HabitCandidate {
  return {
    merchantStem: 'starbucks',
    merchantDisplay: 'Starbucks',
    category: 'Food',
    governClass: 'govern',
    tier: 'solid',
    occurrences: 12,
    activeDays: 10,
    totalCents: 7000,
    annualizedLeakCents: 84000,
    rankScore: 84000,
    topMerchants: ['Starbucks'],
    // Default fixture is an ordinary behavioral leak, the deck's own shape.
    isBehavioral: true,
    isSubscription: false,
    ...overrides,
  };
}

function scanResult(habits: HabitCandidate[]): ScanResult {
  return {
    importId: 'imp-1',
    status: 'ok',
    files: [],
    rows: [],
    questions: [],
    transfers: [],
    refunds: [],
    duplicatesMerged: 0,
    recurring: [],
    habits,
    coverage: { startISO: '2026-01-01', endISO: '2026-01-30', spanDays: 30, coveredDays: 20 },
    tier: 'solid',
    gracefulFailure: false,
  };
}

describe('scope tiers', () => {
  it('assigns every category exactly one tier', () => {
    expect(ALL_CATEGORIES).toHaveLength(10);
    for (const c of ALL_CATEGORIES) {
      expect(['locked', 'available-off', 'available-on']).toContain(CATEGORY_TIERS[c]);
    }
  });

  it('locks the categories the PRD says are never searched', () => {
    expect(categoriesInTier('locked').sort()).toEqual(['Healthcare', 'Mortgage']);
  });

  it('defaults the discretionary tier on and everything else off', () => {
    const scope = defaultScope();
    expect(selectedCategories(scope).sort()).toEqual([
      'Entertainment',
      'Food',
      'Shopping',
      'Software & Subscriptions',
    ]);
    // Fail closed: Other in particular, which is where a misread pharmacy
    // charge lands.
    expect(unselectedCategories(scope).sort()).toEqual([
      'Car',
      'Other',
      'Transportation',
      'Utilities',
    ]);
  });

  it('never puts a locked category in the scope map', () => {
    const scope = defaultScope();
    expect(scope.Mortgage).toBeUndefined();
    expect(scope.Healthcare).toBeUndefined();
  });

  it('recognises the default scope, and an edit away from it', () => {
    expect(isDefaultScope(defaultScope())).toBe(true);
    expect(isDefaultScope(toggleScope(defaultScope(), 'Other'))).toBe(false);
  });
});

describe('locked categories cannot be opened', () => {
  it('ignores a toggle on a locked category', () => {
    const scope = toggleScope(defaultScope(), 'Mortgage');
    expect(scope.Mortgage).toBeUndefined();
    expect(isLocked('Mortgage')).toBe(true);
  });

  // The rule store is JSON on disk. A hand-edited or corrupted file must not be
  // able to grant something the UI never offered.
  it('ignores a stored true for a locked category', () => {
    const tampered = { ...defaultScope(), Mortgage: true } as ScanScope;
    const rent = candidate({ category: 'Mortgage', merchantStem: 'acme', merchantDisplay: 'Acme', topMerchants: ['Acme'] });
    expect(isInScope(rent, tampered)).toBe(false);
    expect(selectedCategories(tampered)).not.toContain('Mortgage');
  });
});

describe('the essential-merchant guard', () => {
  const essentials = [
    'sunnyside daycare',
    'day care downtown',
    'bright childcare',
    'little preschool',
    'nanny payroll',
    'york university tuition',
    'student loan servicing',
    'sunlife insurance',
    'auto loan payment',
    'credit card payment',
    'line of credit',
  ];

  it.each(essentials)('never proposes %s', (merchant) => {
    // Category is deliberately one the user CAN turn on: the guard has to hold
    // regardless of scope, which is what "never searched, regardless of user
    // selection" means.
    const c = candidate({ category: 'Other', merchantStem: merchant, merchantDisplay: merchant, topMerchants: [merchant] });
    expect(isEssentialCandidate(c)).toBe(true);
    expect(isInScope(c, { ...defaultScope(), Other: true })).toBe(false);
  });

  // Tuned for precision on purpose: monthly essentials already fail the
  // behavioral rate gate, so a false positive here silently deletes a real
  // leak, which is the more expensive error.
  const notEssentials = [
    'old school pizza',
    'college street bar',
    'campus coffee',
    'university heights cafe',
    'youtube premium',
    'greenthumb nursery',
  ];

  it.each(notEssentials)('still proposes %s', (merchant) => {
    expect(ESSENTIAL_MERCHANT.test(merchant)).toBe(false);
  });

  it('checks the display name and the top merchants, not just the stem', () => {
    expect(
      isEssentialCandidate(
        candidate({ merchantStem: 'acme', merchantDisplay: 'Acme Insurance', topMerchants: ['Acme'] })
      )
    ).toBe(true);
    expect(
      isEssentialCandidate(
        candidate({ merchantStem: 'acme', merchantDisplay: 'Acme', topMerchants: ['Acme Daycare'] })
      )
    ).toBe(true);
  });
});

describe('applyScope', () => {
  it('keeps in-scope candidates and drops the rest', () => {
    const result = scanResult([
      candidate({ merchantStem: 'starbucks', category: 'Food' }),
      candidate({ merchantStem: 'petro', category: 'Car' }),
      candidate({ merchantStem: 'acme', category: 'Mortgage', merchantDisplay: 'Acme', topMerchants: ['Acme'] }),
    ]);

    const scoped = applyScope(result, defaultScope());

    expect(scoped.habits.map((h) => h.merchantStem)).toEqual(['starbucks']);
  });

  it('touches nothing but the candidates', () => {
    const result = scanResult([candidate({ category: 'Car' })]);
    const scoped = applyScope(result, defaultScope());

    // Spend is sorted, not thrown away: the dashboard still accounts for every
    // dollar even when nothing is proposed.
    expect(scoped.habits).toHaveLength(0);
    expect(scoped.rows).toBe(result.rows);
    expect(scoped.coverage).toBe(result.coverage);
    expect(scoped.recurring).toBe(result.recurring);
    expect(scoped.importId).toBe(result.importId);
  });

  it('does not mutate the result it is given', () => {
    const result = scanResult([candidate({ category: 'Car' })]);
    applyScope(result, defaultScope());
    expect(result.habits).toHaveLength(1);
  });

  it('is idempotent, so a re-run can safely re-apply it', () => {
    const result = scanResult([candidate({ category: 'Food' }), candidate({ category: 'Car' })]);
    const once = applyScope(result, defaultScope());
    const twice = applyScope(once, defaultScope());
    expect(twice.habits).toEqual(once.habits);
  });
});

describe('scopeFromRules', () => {
  it('falls back to the defaults when the user was never asked', () => {
    expect(scopeFromRules({ scope: {}, scopeAnswered: false })).toEqual(defaultScope());
  });

  it('ignores a stored scope that was never confirmed', () => {
    const stored = { Food: false, Car: true };
    expect(scopeFromRules({ scope: stored, scopeAnswered: false })).toEqual(defaultScope());
  });

  // The case that makes the flag necessary: a confirmed all-off scope is a real
  // answer and must not be read as "never asked" and silently reset.
  it('honours a confirmed empty scope', () => {
    const scope = scopeFromRules({ scope: {}, scopeAnswered: true });
    expect(selectedCategories(scope)).toEqual([]);
    const result = scanResult([candidate({ category: 'Food' })]);
    expect(applyScope(result, scope).habits).toHaveLength(0);
  });
});

describe('analytics codes', () => {
  it('has a code for every category', () => {
    for (const c of ALL_CATEGORIES) {
      expect(scopeCodes([c])).not.toBe('');
    }
  });

  // sanitizeProps drops any string over 64 characters, and a dropped property
  // is indistinguishable from one nobody sent.
  it('keeps the fullest possible payload under the analytics ceiling', () => {
    const every = ALL_CATEGORIES as ExpenseCategory[];
    expect(scopeCodes(every).length).toBeLessThanOrEqual(64);
  });
});
