/**
 * Type definitions for category data model.
 */

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

export const COLOR_OPTIONS: string[] = [
  '#7E57C2', // Purple
  '#FFA726', // Orange
  '#42A5F5', // Blue
  '#66BB6A', // Green
  '#EC407A', // Pink
  '#26C6DA', // Cyan
  '#EF5350', // Red
  '#8D6E63', // Brown
  '#9E9E9E', // Grey
  '#FFD54F', // Yellow
  '#AB47BC', // Deep Purple
  '#26A69A', // Teal
];
