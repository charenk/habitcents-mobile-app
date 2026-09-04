/**
 * Category emoji + identity color lookup for EmojiTile
 * (design/redesign-handoff/01-tokens-and-foundations.md §3 and §5: "Category
 * identifiers are EMOJI in tinted tiles, not icons").
 *
 * Glyphs come from the redesign prototype's category table. Keys accept the
 * stored ExpenseCategory values, the current display names ("Home",
 * "Subscriptions"), and the retired display names ("Mortgage/Rent"), so a
 * Category.name and an Expense.category both resolve without the caller
 * normalizing first. Not user-facing copy: these are visual identifiers, so
 * they live here rather than in strings.ts.
 */
import { lightTheme } from './theme';

const EMOJI: Record<string, string> = {
  Food: '🍕',
  Shopping: '🛍',
  Entertainment: '🎬',
  // Bus, not Car's 🚗 (U2 config fix): the two used to share a glyph.
  Transportation: '🚌',
  Car: '🚗',
  Mortgage: '🏠',
  'Mortgage/Rent': '🏠',
  Home: '🏠',
  Utilities: '💡',
  Healthcare: '💊',
  'Software & Subscriptions': '📱',
  Subscriptions: '📱',
  Groceries: '🛒',
  Other: '💳',
};

const COLOR: Record<string, string> = {
  Food: lightTheme.categoryColors.food,
  Shopping: lightTheme.categoryColors.shopping,
  Entertainment: lightTheme.categoryColors.entertainment,
  // Own hue (U2 config fix): used to collide with Car and Other, both on
  // categoryColors.transport.
  Transportation: lightTheme.categoryColors.transit,
  Car: lightTheme.categoryColors.transport,
  Mortgage: lightTheme.categoryColors.housing,
  'Mortgage/Rent': lightTheme.categoryColors.housing,
  Home: lightTheme.categoryColors.housing,
  // Own hue (U2 config fix): used to borrow Entertainment's amber.
  Utilities: lightTheme.categoryColors.utility,
  Healthcare: lightTheme.categoryColors.health,
  'Software & Subscriptions': lightTheme.categoryColors.subscriptions,
  Subscriptions: lightTheme.categoryColors.subscriptions,
  Groceries: lightTheme.categoryColors.groceries,
  // Neutral slate tint (U2 config fix), not a hue that means something
  // elsewhere (this used to double up on Car/Transportation's transport blue).
  Other: lightTheme.categoryColors.neutral,
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
