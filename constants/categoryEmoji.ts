/**
 * Category emoji + identity color lookup for EmojiTile
 * (design/redesign-handoff/01-tokens-and-foundations.md §3 and §5: "Category
 * identifiers are EMOJI in tinted tiles, not icons").
 *
 * Glyphs come from the redesign prototype's category table. Keys accept both
 * the stored ExpenseCategory values and the taxonomy v2 display names
 * ("Mortgage" / "Mortgage/Rent"), so a Category.name and an Expense.category
 * both resolve without the caller normalizing first. Not user-facing copy:
 * these are visual identifiers, so they live here rather than in strings.ts.
 */
import { lightTheme } from './theme';

const EMOJI: Record<string, string> = {
  Food: '🍕',
  Shopping: '🛍',
  Entertainment: '🎬',
  Transportation: '🚗',
  Car: '🚗',
  Mortgage: '🏠',
  'Mortgage/Rent': '🏠',
  Utilities: '💡',
  Healthcare: '💊',
  'Software & Subscriptions': '📱',
  Groceries: '🛒',
  Other: '💳',
};

const COLOR: Record<string, string> = {
  Food: lightTheme.categoryColors.food,
  Shopping: lightTheme.categoryColors.shopping,
  Entertainment: lightTheme.categoryColors.entertainment,
  Transportation: lightTheme.categoryColors.transport,
  Car: lightTheme.categoryColors.transport,
  Mortgage: lightTheme.categoryColors.housing,
  'Mortgage/Rent': lightTheme.categoryColors.housing,
  Utilities: lightTheme.categoryColors.entertainment,
  Healthcare: lightTheme.categoryColors.health,
  'Software & Subscriptions': lightTheme.categoryColors.subscriptions,
  Groceries: lightTheme.categoryColors.groceries,
  Other: lightTheme.categoryColors.transport,
};

/** Emoji for a category name; falls back to the generic card glyph. */
export function categoryEmoji(name: string): string {
  return EMOJI[name] ?? EMOJI.Other;
}

/**
 * Identity color for a category name, used as the EmojiTile's 12% tint. Falls
 * back to the same neutral-blue the Other category uses.
 */
export function categoryIdentityColor(name: string): string {
  return COLOR[name] ?? COLOR.Other;
}
