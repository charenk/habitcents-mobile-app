/**
 * Scan scope (PRD v3.1 sect 7.1, phase 2).
 *
 * The user declares where to look, so the app never has to claim it knows what
 * is essential. That inversion is what lets the scan stay honest without a
 * server-side merchant taxonomy: no classifier, no privacy compromise, just a
 * stated boundary the pipeline respects.
 *
 * Scope filters CANDIDATES, never rows. Spend is sorted, not thrown away: the
 * KPI row, the category breakdown, and the pulse still describe every dollar
 * the statement held. What scope decides is narrower and more consequential,
 * which spending the app is willing to PROPOSE you break.
 *
 * This is layer 1 of the five-layer essential guarantee
 * (design/onboarding-v3/DECISIONS-NEEDED.md, D6). The others are the
 * governability class, the behavioral rate gate, merchant suppression, and
 * cadence routing.
 */

import type { ExpenseCategory } from '@/types/expense';
import type { HabitCandidate, ScanResult } from './types';

/**
 * Where a category sits in the scope screen.
 *
 * `locked` is not "off by default", it is not offerable at all: the tier is
 * rendered with its reason so the exclusion reads as judgment rather than
 * omission, and no toggle can turn it on.
 */
export type ScopeTier = 'locked' | 'available-off' | 'available-on';

/**
 * Tier per category.
 *
 * KNOWN LIMITATION, and the honest reason this table is not exactly the PRD's.
 * The PRD's tiers assume a finer taxonomy than the app ships (ADR 0006, ten
 * categories):
 *
 * - The PRD puts groceries off and coffee/eating out/delivery on. All four are
 *   `Food` here, and Food is where the behavioral leaks live, so Food is on.
 * - The PRD puts transit off and rideshare on. Both are `Transportation` here,
 *   so it fails closed and is off; a rideshare user can turn it on in one tap.
 * - Childcare, education, insurance, and debt have no category at all. They
 *   land in `Other` (off by default) and are additionally caught by
 *   ESSENTIAL_MERCHANT below, which ignores scope entirely.
 *
 * Splitting Food and Transportation is a taxonomy change with migration cost
 * across the category picker and stored data; it is filed as a punchlist item
 * rather than smuggled in here.
 */
export const CATEGORY_TIERS: Record<ExpenseCategory, ScopeTier> = {
  // Never searched, never offered. The PRD's locked list, as far as the
  // taxonomy can express it.
  Mortgage: 'locked',
  Healthcare: 'locked',

  // Available, off by default. Fail closed: an unmapped merchant is exactly
  // where a misread pharmacy charge lands, so `Other` in particular starts off.
  Utilities: 'available-off',
  Car: 'available-off',
  Transportation: 'available-off',
  Other: 'available-off',

  // Available, on by default. The discretionary signature the deck exists for.
  Food: 'available-on',
  Entertainment: 'available-on',
  Shopping: 'available-on',
  'Software & Subscriptions': 'available-on',
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_TIERS) as ExpenseCategory[];

export function categoriesInTier(tier: ScopeTier): ExpenseCategory[] {
  return ALL_CATEGORIES.filter((c) => CATEGORY_TIERS[c] === tier);
}

export function isLocked(category: ExpenseCategory): boolean {
  return CATEGORY_TIERS[category] === 'locked';
}

/**
 * Merchant terms that are never a habit proposal, whatever the scope says.
 *
 * The PRD's locked tier names childcare, education, insurance, and debt
 * payments, none of which have a category in this taxonomy. Without this guard
 * a daycare or tuition merchant would land in `Other`, and a user who turned
 * `Other` on (perfectly reasonable, that is where their real leaks might hide)
 * would be offered "break your childcare habit". Scope is the user's boundary;
 * this is the app's own, and it is not negotiable.
 *
 * Tuned for PRECISION, not recall, and deliberately so. Monthly essentials
 * already fail the behavioral rate gate and get caught by the governability
 * class, so this layer is redundancy rather than the primary defence. That
 * makes a false positive the more expensive error: it silently deletes a real
 * leak the user might have wanted. Terms rejected for exactly that reason:
 * bare "school" and "college" (Old School Pizza, College Street Bar), "campus"
 * and "university" (campus coffee shops are a classic student leak), "nursery"
 * (garden centres), "premium payment" (YouTube Premium), and bare "debt".
 */
export const ESSENTIAL_MERCHANT =
  /\b(daycare|day ?care|childcare|child care|preschool|pre-school|babysitt?\w*|nanny|tuition|school fees?|student loan|insurance|life ins\b|health ins\b|loan payment|mortgage|landlord|property mgmt|credit card payment|line of credit)\b/i;

/** True when a candidate must never be proposed, whatever the user selected. */
export function isEssentialCandidate(candidate: HabitCandidate): boolean {
  if (isLocked(candidate.category)) return true;
  if (ESSENTIAL_MERCHANT.test(candidate.merchantStem)) return true;
  if (ESSENTIAL_MERCHANT.test(candidate.merchantDisplay)) return true;
  return candidate.topMerchants.some((m) => ESSENTIAL_MERCHANT.test(m));
}

/**
 * The user's answer to "where should we look?": category -> searched.
 * Locked categories are absent from this map by construction; a stored `true`
 * for one is ignored by `isInScope` rather than trusted.
 */
export type ScanScope = Partial<Record<ExpenseCategory, boolean>>;

/**
 * The scope to apply given the persisted rule store.
 *
 * `scopeAnswered` is what separates "confirmed nothing" from "never asked": an
 * empty map means the defaults, but a CONFIRMED empty map means the user really
 * did turn everything off and must be honoured. Every caller that filters
 * candidates goes through here so the two cases can never drift apart.
 */
export function scopeFromRules(rules: { scope: Record<string, boolean>; scopeAnswered: boolean }): ScanScope {
  if (!rules.scopeAnswered) return defaultScope();
  return rules.scope as ScanScope;
}

/** The fail-closed default: only the discretionary tier is on. */
export function defaultScope(): ScanScope {
  const scope: ScanScope = {};
  for (const category of ALL_CATEGORIES) {
    if (CATEGORY_TIERS[category] === 'locked') continue;
    scope[category] = CATEGORY_TIERS[category] === 'available-on';
  }
  return scope;
}

/** True when `scope` matches the defaults exactly (the `used_defaults` signal). */
export function isDefaultScope(scope: ScanScope): boolean {
  const defaults = defaultScope();
  return ALL_CATEGORIES.every((c) => {
    if (CATEGORY_TIERS[c] === 'locked') return true;
    return !!scope[c] === !!defaults[c];
  });
}

/** Toggle one category, ignoring any attempt to turn a locked one on. */
export function toggleScope(scope: ScanScope, category: ExpenseCategory): ScanScope {
  if (isLocked(category)) return scope;
  return { ...scope, [category]: !scope[category] };
}

/** Categories the user is searching, for the analytics payload. */
export function selectedCategories(scope: ScanScope): ExpenseCategory[] {
  return ALL_CATEGORIES.filter((c) => !isLocked(c) && !!scope[c]);
}

/** Available categories the user is NOT searching (locked ones are not a choice). */
export function unselectedCategories(scope: ScanScope): ExpenseCategory[] {
  return ALL_CATEGORIES.filter((c) => !isLocked(c) && !scope[c]);
}

/**
 * Stable short codes for the analytics payload.
 *
 * `sanitizeProps` silently drops any string over 64 characters, and the full
 * category names blow past that as soon as most of the taxonomy is on
 * ("Utilities,Car,Transportation,Other,Food,..." is 87). A dropped property
 * looks exactly like a property nobody sent, so the codes are not cosmetic:
 * they are what keeps `scope_selected` readable at all. Never renumber them,
 * the dashboards key on these values.
 */
export const SCOPE_CODE: Record<ExpenseCategory, string> = {
  Mortgage: 'rent',
  Healthcare: 'health',
  Utilities: 'util',
  Car: 'car',
  Transportation: 'transit',
  Other: 'other',
  Food: 'food',
  Entertainment: 'ent',
  Shopping: 'shop',
  'Software & Subscriptions': 'subs',
};

/** Comma-joined short codes, safe for the 64-character analytics ceiling. */
export function scopeCodes(categories: ExpenseCategory[]): string {
  return categories.map((c) => SCOPE_CODE[c]).join(',');
}

/** True when this candidate survives both the user's scope and the app's own guard. */
export function isInScope(candidate: HabitCandidate, scope: ScanScope): boolean {
  if (isEssentialCandidate(candidate)) return false;
  return !!scope[candidate.category];
}

/**
 * Apply scope to a finished scan.
 *
 * Only `habits` changes. Rows, coverage, recurrence, transfers, and refunds are
 * untouched, so the dashboard still accounts for every dollar and the bills
 * offer still has the full recurring set to draw from. Pure: safe to re-apply
 * after a rule-correction re-run, which is exactly when it must not be
 * forgotten (a re-run rebuilds `habits` from scratch and would otherwise
 * resurrect everything the scope excluded).
 */
export function applyScope(result: ScanResult, scope: ScanScope): ScanResult {
  return { ...result, habits: result.habits.filter((h) => isInScope(h, scope)) };
}
