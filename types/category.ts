/**
 * Type definitions for category data model.
 */
import { lightTheme } from '@/constants/theme';

export type CategoryIcon =
  | 'home-outline'
  | 'car-outline'
  | 'film-outline'
  | 'fast-food-outline'
  | 'cart-outline'
  | 'flash-outline'
  | 'medical-outline'
  | 'airplane-outline'
  | 'fitness-outline'
  | 'school-outline'
  | 'gift-outline'
  | 'paw-outline'
  | 'game-controller-outline'
  | 'cafe-outline'
  | 'bus-outline'
  | 'shirt-outline'
  | 'wallet-outline'
  | 'card-outline'
  | 'ellipsis-horizontal-outline';

export type Category = {
  id: string;
  name: string;
  icon: CategoryIcon;
  color: string;
  isDefault: boolean;
  isHidden: boolean;
  createdAt: Date;
  monthlyBudget?: number;
};

export type CategorySpendingSummary = {
  categoryId: string;
  totalSpent: number;
  transactionCount: number;
  percentageOfTotal: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
};

// Taxonomy v2 (ADR 0006): 10 spend categories. 'Mortgage/Rent' is a display rename
// of the former 'Mortgage' seed (same icon and color). 'Software & Subscriptions'
// is the one added category. Existing stored categories keep their persisted names.
export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'createdAt'>[] = [
  { name: 'Mortgage/Rent', icon: 'home-outline', color: '#7E57C2', isDefault: true, isHidden: false },
  { name: 'Car', icon: 'car-outline', color: '#FFA726', isDefault: true, isHidden: false },
  { name: 'Entertainment', icon: 'film-outline', color: '#42A5F5', isDefault: true, isHidden: false },
  { name: 'Food', icon: 'fast-food-outline', color: '#66BB6A', isDefault: true, isHidden: false },
  { name: 'Shopping', icon: 'cart-outline', color: '#EC407A', isDefault: true, isHidden: false },
  { name: 'Utilities', icon: 'flash-outline', color: '#26C6DA', isDefault: true, isHidden: false },
  { name: 'Healthcare', icon: 'medical-outline', color: '#EF5350', isDefault: true, isHidden: false },
  { name: 'Transportation', icon: 'bus-outline', color: '#8D6E63', isDefault: true, isHidden: false },
  { name: 'Software & Subscriptions', icon: 'card-outline', color: '#26A69A', isDefault: true, isHidden: false },
  { name: 'Other', icon: 'ellipsis-horizontal-outline', color: '#9E9E9E', isDefault: true, isHidden: false },
];

export const ICON_OPTIONS: CategoryIcon[] = [
  'home-outline',
  'car-outline',
  'film-outline',
  'fast-food-outline',
  'cart-outline',
  'flash-outline',
  'medical-outline',
  'airplane-outline',
  'fitness-outline',
  'school-outline',
  'gift-outline',
  'paw-outline',
  'game-controller-outline',
  'cafe-outline',
  'bus-outline',
  'shirt-outline',
  'wallet-outline',
  'card-outline',
  'ellipsis-horizontal-outline',
];

// Category picker palette (design/textfield-palette, build 12): replaces the
// legacy Material-palette swatches with 12 colors drawn from the house
// families (constants/theme.ts categoryColors, plus lavender and amber),
// distinct and calm. Sage is excluded on purpose: sage means a kept outcome
// (PATTERN_VOCABULARY.md "Color"), never a category identity. Stored custom
// categories keep whatever hex they already picked; only the offered set
// changes here.
export const COLOR_OPTIONS: string[] = [
  lightTheme.categoryColors.food, // coral red
  lightTheme.categoryColors.groceries, // orange
  lightTheme.categoryColors.transport, // sky blue
  lightTheme.lavender, // lavender purple (also housing's identity)
  lightTheme.amber, // amber (also entertainment's identity)
  lightTheme.categoryColors.shopping, // pink
  lightTheme.categoryColors.subscriptions, // cyan
  lightTheme.categoryColors.health, // teal green
  lightTheme.categoryColors.transit, // brown
  lightTheme.categoryColors.utility, // indigo
  lightTheme.categoryColors.neutral, // slate grey
  lightTheme.amberInk, // deep amber/bronze
];
