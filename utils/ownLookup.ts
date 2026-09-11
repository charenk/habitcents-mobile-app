/**
 * Safe lookup in a plain-object table keyed by text the user's own data
 * supplies.
 *
 * A plain object's `map[key]` walks the prototype chain when the key is
 * absent, so a merchant stem of "constructor" returns the Object constructor,
 * which is truthy. A caller that tests the result for truth then carries a
 * FUNCTION on as a category, a rename or a suppression. Merchant stems come
 * straight off bank-statement text (see normalizeMerchant in
 * utils/leakScan/categorize.ts), so the key space belongs to the user, and
 * "constructor", "toString", "valueOf" and "hasOwnProperty" are all reachable
 * merchant names.
 *
 * Guarding the read rather than the construction is deliberate. A rule map can
 * be built by emptyScanRules, by reviveRules after a JSON.parse, or by any
 * rule-writer spreading into a fresh object literal, so there is no single
 * place to strip the prototype. The same read also covers the built-in tables
 * keyed by that same user text, such as KNOWN_CHAINS, which have nothing to do
 * with the rule store but exactly the same exposure.
 *
 * This module deliberately imports nothing. It is used by categorize,
 * recurrence, netting and habitDetection, none of which otherwise touch
 * storage; putting the helper in utils/scanRules.ts would pull AsyncStorage
 * into all of them through a value import.
 */

/** First key present as an OWN property of `map`, or undefined. */
export function lookupOwn<V>(map: Record<string, V>, ...keys: string[]): V | undefined {
  for (const key of keys) {
    if (Object.hasOwn(map, key)) return map[key];
  }
  return undefined;
}
