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
  // Pressed/hover fill and small sage text links. Nudged one step darker
  // (was #2E7D55) so it clears 4.5:1 on sageLight, where it sits in the
  // tierSolid badge and the KeptHero eyebrow: 4.48 -> 4.79. UX-048.
  sageDark: '#2C7851',
  // Pressed fill for the primary button ONLY. The button now carries an ink
  // label, and ink on sageDark is 3.15:1, so the press cannot simply reuse
  // sageDark without the label going illegible mid-tap. This darkens enough
  // to read as a press while keeping ink at 4.86:1. Swapping the label colour
  // on press instead would flash a different colour under the user's thumb.
  sagePressed: '#3D9A6E',
  sageLight: '#E8F5EE', // kept band, selected chips, coach slots, tinted cards
  // neutrals (carry ~90% of UI)
  ink: '#1A1D23', // primary text
  slate: '#4A5568', // secondary text
  // Decorative fills ONLY (spend bar fill, hairline-adjacent tints). At 2.80:1
  // on snow this cannot legally carry text; use mistText for anything a user
  // has to read. UX-003.
  mist: '#8898AA',
  // Tertiary TEXT and any meaning-bearing icon. Same hue as mist, scaled down
  // until it clears the 4.5:1 floor the design context declares: 4.78 on
  // white, 4.53 on snow. UX-003.
  mistText: '#677481',
  cloud: '#E8EDF2', // hairline borders, slip dot fill, disabled fill
  cloudDashed: '#D6DEE8', // one step darker than cloud, so a 1.5px dashed edge still reads
  snow: '#F7F9FC', // page background (never pure white pages)
  white: '#FFFFFF', // cards, sheets, tab bar
  hairlineSubtle: '#F1F4F8', // row separators inside cards
  // semantic
  lavender: '#8E7CF3', // habit arc, chapter pills, milestones, premium
  // The premium hero gradient's start stop. Full-strength lavender under white
  // text is 3.32:1; this carries white at 5.29:1 while staying the same
  // violet family, so the one sanctioned premium gradient does not have to be
  // faked with an alpha composite over ink. UX-006.
  lavenderDeep: '#6B54E0',
  amber: '#F5A623', // upcoming bills, 3-payment flags
  // Amber text on amberBg. Darkened (was #B26A00) because every use is a
  // 10.5-11pt pill on the 14% tint, where it read 3.66:1. Now 5.51 on that
  // tint over white, 5.23 on it over snow, and 5.73 on the 8% fixed-tip
  // card. UX-002.
  amberInk: '#8F5500',
  // Destructive only (delete, stop breaking, undo import). Darkened (was
  // #F05A5A) because it failed BOTH directions at 3.33:1: as a label on white
  // and as the destructive fill under a white label. Now 5.03 either way.
  // Note pulseRamp keeps the lighter coral hue; it is a heat scale, not a
  // destructive signal, and ink already passes on every step. UX-047.
  coral: '#C93B3B',
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
  textTertiary: palette.mistText,
  chipActiveBg: palette.sage,
  // Ink, not white: white on sage is 2.71:1. Charen's call (2026-08-12) was to
  // keep the brand green exactly and darken the label instead, which reads
  // 6.24:1. UX-001.
  chipActiveText: palette.ink,
  chipInactiveBg: palette.white,
  chipInactiveText: palette.slate,
  chipBorder: palette.cloud,
  iconBgGreen: palette.sageLight,
  iconBgYellow: withAlpha(palette.amber, 0.14),
  iconOrange: palette.amber,
  // Day-of-week letters and out-of-month numerals are read, so they take the
  // text-grade neutral. UX-003.
  calendarDow: palette.mistText,
  calendarOtherMonth: palette.mistText,
  calendarBg: palette.snow,
  calendarCellBg: palette.white,
  calendarOtherMonthBg: palette.snow,
  primaryDark: palette.sageDark,
  primaryPressedBg: palette.sagePressed,
  border: palette.cloud,
  white: palette.white,
  // An inactive tab icon is a meaning-bearing control, so it takes the 3:1
  // non-text floor; mist missed it at 2.95. UX-003.
  tabIconDefault: palette.mistText,
  danger: palette.coral,
  // Habit logging v2 (docs/design-package-phase2/01-habit-logging-spec.md,
  // section 2). A slip is neutral, never red/danger and never green/primary;
  // these are its own token family used only for the slip day-state.
  slip: palette.mistText,
  slipWeekFill: palette.cloud,
  slipWeekDot: palette.mistText,
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
  mistText: palette.mistText,
  cloud: palette.cloud,
  cloudDashed: palette.cloudDashed,
  snow: palette.snow,
  hairlineSubtle: palette.hairlineSubtle,
  primaryLight: palette.sageLight,
  lavender: palette.lavender,
  lavenderDeep: palette.lavenderDeep,
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
    // Added U2 (config fix: Transportation shared Car's emoji + transport
    // blue). A muted brown, matching the identity the legacy
    // DEFAULT_CATEGORIES table (types/category.ts) already assigns
    // Transportation on the category detail screen, just not wired into the
    // shared categoryEmoji.ts lookup before now.
    transit: '#8D6E63',
    // Added U2 (Utilities borrowed Entertainment's amber). Indigo: distinct
    // from housing's lighter lavender-purple and transport's sky blue.
    utility: '#5C6BC0',
    // Added U2 (Other borrowed transport blue, colliding with both Car and
    // Transportation). A neutral slate-family tint rather than a hue that
    // means something elsewhere in the palette.
    neutral: '#64748B',
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

export type CategoryColorKey =
  | 'food'
  | 'groceries'
  | 'transport'
  | 'housing'
  | 'entertainment'
  | 'shopping'
  | 'subscriptions'
  | 'health'
  | 'transit'
  | 'utility'
  | 'neutral';

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
  primaryPressedBg: string;
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
  mistText: string;
  cloud: string;
  cloudDashed: string;
  snow: string;
  hairlineSubtle: string;
  primaryLight: string;
  lavender: string;
  lavenderDeep: string;
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
  // Form-field text (ui/TextField): sits between secondary and body so a
  // typed value reads a touch smaller than prose but never as fine print.
  control: 13.5,
  secondary: 13,
  caption: 12.5,
  eyebrow: 11,
  eyebrowLetterSpacing: 0.88,
} as const;
