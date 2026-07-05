/**
 * Stage 7: merchant normalization & categorization (taxonomy v2, ADR 0006).
 *
 * Normalize a raw description to a merchant stem, then categorize in tiers:
 *  - solid: personal-rule hit or known-chain exact match
 *  - likely: keyword/pattern token match
 *  - needs-review: no match
 *
 * The 10 spend categories plus the non-spend row classes. Transfers/Income/Cash are
 * classes on the row, never categories, and never enter spend totals.
 */

import type { ExpenseCategory, ExpenseClass } from '@/types/expense';
import type { ConfidenceTier } from './types';
import type { ScanRules } from '@/utils/scanRules';

export type CategoryResult = {
  category: ExpenseCategory;
  tier: ConfidenceTier;
  rowClass: ExpenseClass;
};

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

const LOCATION_SUFFIX = /\b([A-Z][a-z]+\s+)?(on|bc|ab|qc|mb|sk|ns|nb|pe|nl|nt|yt|nu|ca|us|usa|uk)\s*$/i;
const PAYMENT_METHOD = /\((apple pay|google pay|paypal|visa|mastercard|amex|debit|interac)\)/gi;
const PHONE = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const STORE_NUMBER = /#\s*\d+|\bstore\s*\d+\b/gi;
const URL_TAIL = /\.[a-z]{2,}(\/\S*)?\s*$/i;

/**
 * Normalize a raw transaction description into a merchant stem: uppercase-fold,
 * strip location/payment-method suffixes, phone numbers, store numbers, and URL
 * tails, then collapse to a lowercase alphanumeric stem for clustering.
 */
export function normalizeMerchant(raw: string): string {
  let s = (raw || '').trim();
  if (!s) return '';
  // Remove neutralized-formula quote if present.
  if (s.startsWith("'")) s = s.slice(1);

  s = s.replace(PAYMENT_METHOD, ' ');
  s = s.replace(PHONE, ' ');
  s = s.replace(STORE_NUMBER, ' ');
  s = s.replace(URL_TAIL, ' ');
  s = s.replace(LOCATION_SUFFIX, ' ');

  // Keep intra-word hyphens/dots joined so "e-transfer" and "netflix.com" stay one
  // token, then keep letters/digits/spaces only, collapse whitespace, lowercase.
  s = s
    .replace(/([\p{L}])[-.]([\p{L}])/gu, '$1$2')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const tokens = s.split(' ').filter(Boolean);
  if (tokens.length === 0) return '';

  // Merchant stem = the leading BRAND token, which is what clusters and categorizes
  // (stemKey and the built-in ruleset both key on the first token). A single distinctive
  // token collapses location/city noise ("biryaniwalla cambridge cambridge on" ->
  // "biryaniwalla", "walmart supercenter #123/#456" -> "walmart") so all a merchant's
  // rows group together regardless of trailing store/city variation. Generic lead
  // words (the/a/an) and very short lead tokens borrow the next token so the brand
  // survives ("e transfer" would otherwise collapse to "e").
  const GENERIC_LEAD = new Set(['the', 'a', 'an']);
  let idx = 0;
  if (GENERIC_LEAD.has(tokens[idx]) && tokens.length > idx + 1) idx++;
  let brand = tokens[idx];
  if (brand.length <= 2 && tokens.length > idx + 1) {
    brand = `${brand} ${tokens[idx + 1]}`;
  }
  return brand;
}

/** Cluster key: the first token of the stem (prefix match), for exact+prefix grouping. */
export function stemKey(stem: string): string {
  return stem.split(' ')[0] ?? stem;
}

// ---------------------------------------------------------------------------
// Built-in ruleset
// ---------------------------------------------------------------------------

// Known chains -> solid tier (exact/prefix match on the stem key).
const KNOWN_CHAINS: Record<string, ExpenseCategory> = {
  walmart: 'Shopping',
  costco: 'Shopping',
  amazon: 'Shopping',
  target: 'Shopping',
  uber: 'Transportation',
  lyft: 'Transportation',
  shell: 'Car',
  esso: 'Car',
  petro: 'Car',
  netflix: 'Software & Subscriptions',
  spotify: 'Software & Subscriptions',
  disney: 'Software & Subscriptions',
  apple: 'Software & Subscriptions',
  google: 'Software & Subscriptions',
  microsoft: 'Software & Subscriptions',
  adobe: 'Software & Subscriptions',
  starbucks: 'Food',
  mcdonalds: 'Food',
  tim: 'Food', // tim hortons
  ubereats: 'Food',
  doordash: 'Food',
  skip: 'Food', // skip the dishes
};

// Keyword/token patterns -> likely tier. Order matters: earlier wins.
const KEYWORD_PATTERNS: { re: RegExp; category: ExpenseCategory }[] = [
  { re: /\b(rent|landlord|property mgmt|mortgage|apartment)\b/i, category: 'Mortgage' },
  { re: /\b(netflix|spotify|hulu|disney\+?|prime video|youtube premium|app ?store|google play|saas|subscription|dropbox|icloud|adobe|patreon|substack)\b/i, category: 'Software & Subscriptions' },
  { re: /\b(gas|fuel|petro|shell|esso|chevron|auto|mechanic|car wash|parking|insurance.*auto)\b/i, category: 'Car' },
  { re: /(restaurant|cafe|café|coffee|shawarma|biryani|pizza|burger|grill|bistro|eats|\bfood\b|grocery|supermarket|bakery|kitchen|diner)/i, category: 'Food' },
  { re: /\b(hydro|electric|water|gas bill|internet|telecom|rogers|bell|telus|utility|phone bill|wireless|fee|interest charge)\b/i, category: 'Utilities' },
  { re: /\b(pharmacy|clinic|dental|dentist|doctor|hospital|medical|health|optical|physio)\b/i, category: 'Healthcare' },
  { re: /\b(uber|lyft|transit|metro|bus|train|subway|taxi|go transit|presto|airline|flight)\b/i, category: 'Transportation' },
  { re: /\b(cinema|movie|theatre|theater|concert|game|steam|playstation|xbox|nintendo|bar|pub|entertainment)\b/i, category: 'Entertainment' },
  { re: /\b(store|shop|mall|retail|clothing|amazon|walmart|costco|target|best buy|ikea)\b/i, category: 'Shopping' },
];

// Row-class signals (non-spend). These win over category assignment.
const TRANSFER_KEYWORDS = /\b(transfer|e-?transfer|etransfer|interac|payment to|payment from|credit card payment|loc pay|line of credit|cc payment|internal)\b/i;
const INCOME_KEYWORDS = /\b(payroll|salary|deposit|direct dep|refund|rebate|interest paid|dividend|reimbursement|cashback|cash back)\b/i;
const CASH_KEYWORDS = /\b(atm|cash withdrawal|withdrawal|abm)\b/i;

/**
 * Classify a row into a non-spend class from its description, or 'spend' by default.
 * Called before categorization; a non-spend class routes to a class-appropriate
 * placeholder category and is excluded from spend totals downstream.
 */
export function classifyRow(rawDescription: string): ExpenseClass {
  const d = rawDescription || '';
  if (TRANSFER_KEYWORDS.test(d)) return 'transfer';
  if (CASH_KEYWORDS.test(d)) return 'cash';
  if (INCOME_KEYWORDS.test(d)) return 'income';
  return 'spend';
}

/**
 * Categorize a row. Personal rules (spec 6) are applied first and outrank built-ins.
 * `signedCents` lets income detection prefer inflows: a positive amount with an
 * income keyword is Income; a negative one is treated as spend.
 */
export function categorize(
  rawDescription: string,
  merchantStem: string,
  signedCents: number,
  rules: ScanRules
): CategoryResult {
  const key = stemKey(merchantStem);

  // 1. Personal rule hit -> solid, always spend class (a user-corrected merchant is a
  //    real spend category by definition).
  const ruleCategory = rules.merchantCategory[merchantStem] ?? rules.merchantCategory[key];
  if (ruleCategory) {
    return { category: ruleCategory, tier: 'solid', rowClass: 'spend' };
  }

  // 2. Row class (non-spend). Income only when the amount is actually an inflow.
  const rawClass = classifyRow(rawDescription);
  if (rawClass === 'transfer') {
    return { category: 'Other', tier: 'likely', rowClass: 'transfer' };
  }
  if (rawClass === 'cash') {
    return { category: 'Other', tier: 'likely', rowClass: 'cash' };
  }
  if (rawClass === 'income' && signedCents > 0) {
    return { category: 'Other', tier: 'likely', rowClass: 'income' };
  }

  // 3. Known chain -> solid.
  const chain = KNOWN_CHAINS[key];
  if (chain) {
    return { category: chain, tier: 'solid', rowClass: 'spend' };
  }

  // 4. Keyword pattern -> likely.
  for (const { re, category } of KEYWORD_PATTERNS) {
    if (re.test(rawDescription) || re.test(merchantStem)) {
      return { category, tier: 'likely', rowClass: 'spend' };
    }
  }

  // 5. No match -> needs-review, defaults to Other.
  return { category: 'Other', tier: 'needs-review', rowClass: 'spend' };
}

/** Resolve the display name for a merchant stem, applying rename rules (spec 6). */
export function displayName(merchantStem: string, rules: ScanRules): string {
  const key = stemKey(merchantStem);
  const rename = rules.merchantRename[merchantStem] ?? rules.merchantRename[key];
  if (rename) return rename;
  // Title-case the stem for display.
  return merchantStem
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}
