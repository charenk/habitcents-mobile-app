/**
 * Light and dark theme palettes for the app.
 *
 * The redesign (design/redesign-handoff/01-tokens-and-foundations.md) remaps
 * the legacy light token values onto the new palette. Token NAMES are
 * unchanged so existing consumers keep compiling; only the values moved.
 */

import { withAlpha } from '@/utils/color';

/**
 * Raw new palette. Every light-theme value derives from these; the legacy
 * token names below just point at the new hues.
 */
const palette = {
  // brand
  sage: '#4CAF82', // CTA, kept number, active tab, skip confirm
  sageDark: '#2E7D55', // hover/pressed, small sage text links
  sageLight: '#E8F5EE', // kept band, selected chips, coach slots, tinted cards
  // neutrals (carry ~90% of UI)
  ink: '#1A1D23', // primary text
  slate: '#4A5568', // secondary text
  mist: '#8898AA', // tertiary text, placeholder, spend bar fill
  cloud: '#E8EDF2', // hairline borders, slip dot fill, disabled fill
  snow: '#F7F9FC', // page background (never pure white pages)
  white: '#FFFFFF', // cards, sheets, tab bar
  hairlineSubtle: '#F1F4F8', // row separators inside cards
  // semantic
  lavender: '#8E7CF3', // habit arc, chapter pills, milestones, premium
  amber: '#F5A623', // upcoming bills, 3-payment flags
  amberInk: '#B26A00', // amber text on amberBg
  coral: '#F05A5A', // destructive only (delete, stop breaking, undo import)
  toastAction: '#7FD4A8', // toast action link on the ink pill
} as const;

export const lightTheme = {
  // Sage brand green: CTA, kept numeral, active tab, skip confirm.
  primary: palette.sage,
  // Decorative celebration green: same sage hue (redesign uses one green).
  primaryBright: palette.sage,
  primaryMuted: palette.sageLight,
  background: palette.snow,
  surface: palette.white,
  text: palette.ink,
  textSecondary: palette.slate,
  textTertiary: palette.mist,
  chipActiveBg: palette.sage,
  chipActiveText: palette.white,
  chipInactiveBg: palette.white,
  chipInactiveText: palette.slate,
  chipBorder: palette.cloud,
  iconBgGreen: palette.sageLight,
  iconBgYellow: withAlpha(palette.amber, 0.14),
  iconOrange: palette.amber,
  calendarDow: palette.mist,
  calendarOtherMonth: palette.mist,
  calendarBg: palette.snow,
  calendarCellBg: palette.white,
  calendarOtherMonthBg: palette.snow,
  primaryDark: palette.sageDark,
  border: palette.cloud,
  white: palette.white,
  tabIconDefault: palette.mist,
  danger: palette.coral,
  // Habit logging v2 (docs/design-package-phase2/01-habit-logging-spec.md,
  // section 2). A slip is neutral, never red/danger and never green/primary;
  // these are its own token family used only for the slip day-state.
  slip: palette.mist,
  slipWeekFill: palette.cloud,
  slipWeekDot: palette.mist,
  coachMomentBg: palette.snow,
  coachMomentMilestoneBg: withAlpha(palette.lavender, 0.14),
  // Leak Scan (docs/design-package-phase2/03-p2-1b-leak-scan-visuals.md).
  // Tier badges: three visually distinct pills (shape + label, never color
  // alone). "Solid" is the confidence-green, deliberately darker than the
  // brand/Kept green so it never reads as a positive-action button.
  tierSolidBg: palette.sageLight,
  tierSolidInk: palette.sageDark,
  tierLikelyBg: withAlpha(palette.amber, 0.14),
  tierLikelyInk: palette.amberInk,
  tierReviewBg: palette.hairlineSubtle,
  tierReviewInk: palette.slate,
  tierReviewRing: palette.mist,
  // SpendPulse: the sanctioned heat-ramp use of the coral hue (spend
  // intensity only, never a slip/error signal), a flat neutral for a covered
  // zero-spend day, and a hatch pattern for out-of-coverage (never a flat fill).
  pulseRamp: ['#F1F4F8', '#FDEBEB', '#F9CACA', '#F2A1A1', '#EB7A7A', '#F05A5A'] as const,
  pulseZeroSpend: palette.hairlineSubtle,
  pulseHatchLine: palette.cloud,
  pulseHatchBorder: palette.hairlineSubtle,
  // Category bars (results 5.2): always neutral mist, never green (spend is
  // not a win).
  categoryBarTrack: palette.snow,
  categoryBarFill: palette.mist,
  // Habit-card class badges (results 5.4 / visual spec 6.1). Only Govern's
  // CTA is green; Influence is neutral; Fixed has no CTA and lives on a warm
  // tip-card background.
  classGovernBg: palette.sageLight,
  classGovernInk: palette.sageDark,
  classInfluenceBg: palette.hairlineSubtle,
  classInfluenceInk: palette.slate,
  classFixedBg: withAlpha(palette.amber, 0.14),
  classFixedInk: palette.amberInk,
  fixedTipCardBg: withAlpha(palette.amber, 0.08),
  fixedTipCardBorder: withAlpha(palette.amber, 0.35),

  // New redesign spec tokens (first-class keys).
  ink: palette.ink,
  slate: palette.slate,
  mist: palette.mist,
  cloud: palette.cloud,
  snow: palette.snow,
  hairlineSubtle: palette.hairlineSubtle,
  primaryLight: palette.sageLight,
  lavender: palette.lavender,
  amber: palette.amber,
  amberBg: withAlpha(palette.amber, 0.14),
  amberInk: palette.amberInk,
  coral: palette.coral,
  scrim: withAlpha(palette.ink, 0.4),
  toastBg: palette.ink,
  toastAction: palette.toastAction,

  // Category identity colors. Rendered as a 12% alpha tile behind the emoji
  // (see EmojiTile); the raw hex is the source both for the tint and any
  // solid accent.
  categoryColors: {
    food: '#FF6B6B',
    groceries: '#FF9F43',
    transport: '#4A90D9',
    housing: '#8E7CF3',
    entertainment: '#F5A623',
    shopping: '#EC4899',
    subscriptions: '#06B6D4',
    health: '#34C39A',
  },

  // Type families. Instrument Serif is display-only (screen titles, hero and
  // stat numerals); Inter carries everything else.
  fonts: {
    display: 'InstrumentSerif_400Regular',
    displayItalic: 'InstrumentSerif_400Regular_Italic',
    ui: 'Inter_400Regular',
    uiMedium: 'Inter_500Medium',
    uiSemibold: 'Inter_600SemiBold',
    uiBold: 'Inter_700Bold',
  },
} as const;

export const darkTheme = {
  primary: '#66BB6A',
  // Untuned mirror of lightTheme.primaryBright (dark is dead code, ADR 0017).
  primaryBright: '#66BB6A',
  primaryMuted: '#2E7D32',
  background: '#121212',
  surface: '#1E1E1E',
  text: '#E0E0E0',
  textSecondary: '#B0B0B0',
  textTertiary: '#9E9E9E',
  chipActiveBg: '#424242',
  chipActiveText: '#FFFFFF',
  chipInactiveBg: '#2B2B2B',
  chipInactiveText: '#B0B0B0',
  chipBorder: '#404040',
  iconBgGreen: '#2E7D32',
  iconBgYellow: '#5D4E37',
  iconOrange: '#FFB74D',
  calendarDow: '#FFD54F',
  calendarOtherMonth: '#616161',
  calendarBg: '#252525',
  calendarCellBg: '#2B2B2B',
  calendarOtherMonthBg: '#1E1E1E',
  primaryDark: '#2E7D32',
  border: '#404040',
  white: '#FFFFFF',
  tabIconDefault: '#9E9E9E',
  danger: '#EF5350',
  // Not part of the v1 build (light mode only); kept for AppTheme parity only.
  slip: '#9E9E9E',
  slipWeekFill: '#37474F',
  slipWeekDot: '#90A4AE',
  coachMomentBg: '#252525',
  coachMomentMilestoneBg: 'rgba(46, 125, 50, 0.3)',
  // Leak Scan tokens: not part of the v1 build (light mode only); kept for
  // AppTheme parity only, same values as light (no dark-mode tuning pass).
  tierSolidBg: '#EDF7EE',
  tierSolidInk: '#2E7D32',
  tierLikelyBg: '#FFF3E0',
  tierLikelyInk: '#B26A00',
  tierReviewBg: '#F1F3F5',
  tierReviewInk: '#616161',
  tierReviewRing: '#9AA0A6',
  pulseRamp: ['#F1F3F5', '#FDE7E7', '#F9C7C7', '#F1A0A0', '#E56B6B', '#DC2626'] as const,
  pulseZeroSpend: '#F1F3F5',
  pulseHatchLine: '#D8DCE0',
  pulseHatchBorder: '#E9ECEF',
  categoryBarTrack: '#F1F3F5',
  categoryBarFill: '#9E9E9E',
  classGovernBg: '#EDF7EE',
  classGovernInk: '#2E7D32',
  classInfluenceBg: '#F1F3F5',
  classInfluenceInk: '#616161',
  classFixedBg: '#FFF3E0',
  classFixedInk: '#B26A00',
  fixedTipCardBg: '#FFF9F0',
  fixedTipCardBorder: '#FFE0B2',
  // New redesign spec tokens: mirror the LIGHT values for type parity only;
  // dark stays unwired and untuned (ADR 0017).
  ink: lightTheme.ink,
  slate: lightTheme.slate,
  mist: lightTheme.mist,
  cloud: lightTheme.cloud,
  snow: lightTheme.snow,
  hairlineSubtle: lightTheme.hairlineSubtle,
  primaryLight: lightTheme.primaryLight,
  lavender: lightTheme.lavender,
  amber: lightTheme.amber,
  amberBg: lightTheme.amberBg,
  amberInk: lightTheme.amberInk,
  coral: lightTheme.coral,
  scrim: lightTheme.scrim,
  toastBg: lightTheme.toastBg,
  toastAction: lightTheme.toastAction,
  categoryColors: lightTheme.categoryColors,
  fonts: lightTheme.fonts,
} as const;

export type CategoryColorKey =
  | 'food'
  | 'groceries'
  | 'transport'
  | 'housing'
  | 'entertainment'
  | 'shopping'
  | 'subscriptions'
  | 'health';

export type AppFonts = {
  display: string;
  displayItalic: string;
  ui: string;
  uiMedium: string;
  uiSemibold: string;
  uiBold: string;
};

export type AppTheme = {
  primary: string;
  primaryBright: string;
  primaryMuted: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  chipActiveBg: string;
  chipActiveText: string;
  chipInactiveBg: string;
  chipInactiveText: string;
  chipBorder: string;
  iconBgGreen: string;
  iconBgYellow: string;
  iconOrange: string;
  calendarDow: string;
  calendarOtherMonth: string;
  calendarBg: string;
  calendarCellBg: string;
  calendarOtherMonthBg: string;
  primaryDark: string;
  border: string;
  white: string;
  tabIconDefault: string;
  danger: string;
  slip: string;
  slipWeekFill: string;
  slipWeekDot: string;
  coachMomentBg: string;
  coachMomentMilestoneBg: string;
  tierSolidBg: string;
  tierSolidInk: string;
  tierLikelyBg: string;
  tierLikelyInk: string;
  tierReviewBg: string;
  tierReviewInk: string;
  tierReviewRing: string;
  pulseRamp: readonly string[];
  pulseZeroSpend: string;
  pulseHatchLine: string;
  pulseHatchBorder: string;
  categoryBarTrack: string;
  categoryBarFill: string;
  classGovernBg: string;
  classGovernInk: string;
  classInfluenceBg: string;
  classInfluenceInk: string;
  classFixedBg: string;
  classFixedInk: string;
  fixedTipCardBg: string;
  fixedTipCardBorder: string;
  // Redesign spec tokens.
  ink: string;
  slate: string;
  mist: string;
  cloud: string;
  snow: string;
  hairlineSubtle: string;
  primaryLight: string;
  lavender: string;
  amber: string;
  amberBg: string;
  amberInk: string;
  coral: string;
  scrim: string;
  toastBg: string;
  toastAction: string;
  categoryColors: Record<CategoryColorKey, string>;
  fonts: AppFonts;
};

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Theme-invariant primitives (design/redesign-handoff/01-tokens-and-foundations.md,
 * section 4). Shape, depth, motion, and the type scale do not change between
 * light and dark, so they live here as standalone exports.
 */
export const radii = { control: 10, card: 14, feature: 20, frame: 28, pill: 999 } as const;

export const shadows = {
  card: { shadowColor: '#1A1D23', shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, shadowOpacity: 0.04, elevation: 2 },
  sheet: { shadowColor: '#1A1D23', shadowOffset: { width: 0, height: -8 }, shadowRadius: 32, shadowOpacity: 0.16, elevation: 16 },
  toast: { shadowColor: '#1A1D23', shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, shadowOpacity: 0.3, elevation: 12 },
} as const;

export const motion = { tap: 120, sheet: 220, toast: 220, screen: 360, pulse: 280, easing: [0.22, 1, 0.36, 1] as const } as const;

export const typeScale = {
  screenTitle: 34,
  keptHero: 42,
  statCard: 22,
  reveal: 64,
  body: 15,
  secondary: 13,
  caption: 12.5,
  eyebrow: 11,
  eyebrowLetterSpacing: 0.88,
} as const;
