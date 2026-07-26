/**
 * Icon: thin wrapper over lucide-react-native.
 *
 * Single source of truth for icon rendering. All app icons resolve through the
 * GLYPHS record so the strict size/stroke rules can evolve in one place. Stroke
 * width is 1.5 by default; the redesign size whitelist (14/16/18/20/22) is
 * enforced in a later step, so callers still pass their existing sizes.
 */
import {
  ArrowLeft,
  Bus,
  Car,
  ChartColumn,
  ChartLine,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheck,
  CircleDot,
  Coffee,
  CreditCard,
  Dumbbell,
  Ellipsis,
  Film,
  Flag,
  Folder,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Info,
  LayoutGrid,
  Minus,
  PawPrint,
  Pencil,
  Plane,
  Plus,
  Repeat,
  Settings2,
  Shirt,
  ShoppingCart,
  Sprout,
  SquarePen,
  Store,
  TrendingDown,
  TrendingUp,
  Trash2,
  Utensils,
  Wallet,
  X,
  Zap,
} from 'lucide-react-native';
import type { SvgProps } from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';
import type { CategoryIcon } from '@/types/category';

const GLYPHS = {
  Check,
  CircleCheck,
  // Radio controls: filled dot for on, empty circle for off (paywall plan picker).
  CircleDot,
  Circle,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Pencil,
  SquarePen,
  Trash2,
  Store,
  Repeat,
  Wallet,
  ChartColumn,
  LayoutGrid,
  Settings2,
  Info,
  Flag,
  Folder,
  Sprout,
  Coffee,
  ChartLine,
  TrendingUp,
  TrendingDown,
  Minus,
  House,
  Car,
  Film,
  Utensils,
  ShoppingCart,
  Zap,
  HeartPulse,
  Plane,
  Dumbbell,
  GraduationCap,
  Gift,
  PawPrint,
  Gamepad2,
  Bus,
  Shirt,
  CreditCard,
  Ellipsis,
} as const;

export type IconName = keyof typeof GLYPHS;

// Extra props (style, accessibility flags) pass straight through to the lucide
// glyph so existing call sites keep their layout and a11y behavior unchanged.
type IconProps = Omit<SvgProps, 'color'> & {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function Icon({ name, size = 18, color, strokeWidth = 1.5, ...rest }: IconProps) {
  const theme = useTheme();
  const resolvedColor = color ?? theme.ink;
  const Glyph = GLYPHS[name];
  return <Glyph size={size} color={resolvedColor} strokeWidth={strokeWidth} {...rest} />;
}

/**
 * Maps each stored category.icon string (the legacy CategoryIcon union) to
 * a lucide glyph. Kept 1:1 with the visual meaning of the old icon. Judgment
 * calls: fast-food-outline maps to Utensils (closest generic food glyph, lucide
 * has no burger); flash-outline (utilities) maps to Zap; ellipsis-horizontal-outline
 * (Other) maps to Ellipsis.
 */
export const CATEGORY_ICON_MAP: Record<CategoryIcon, IconName> = {
  'home-outline': 'House',
  'car-outline': 'Car',
  'film-outline': 'Film',
  'fast-food-outline': 'Utensils',
  'cart-outline': 'ShoppingCart',
  'flash-outline': 'Zap',
  'medical-outline': 'HeartPulse',
  'airplane-outline': 'Plane',
  'fitness-outline': 'Dumbbell',
  'school-outline': 'GraduationCap',
  'gift-outline': 'Gift',
  'paw-outline': 'PawPrint',
  'game-controller-outline': 'Gamepad2',
  'cafe-outline': 'Coffee',
  'bus-outline': 'Bus',
  'shirt-outline': 'Shirt',
  'wallet-outline': 'Wallet',
  'card-outline': 'CreditCard',
  'ellipsis-horizontal-outline': 'Ellipsis',
};
