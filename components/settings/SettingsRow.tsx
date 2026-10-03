/**
 * One 48pt settings row, lifted out of app/profile.tsx (formerly
 * components/SettingsSheet.tsx) verbatim so the developer menu section can
 * reuse it without importing the page back into itself (a require cycle).
 * Styling still lives in the page's createStyles and is passed in, so there
 * is exactly one place that defines how a row looks.
 *
 * Interactive rows are buttons; a static row (Version, Build) stays a labelled,
 * non-actionable element so VoiceOver never offers a dead activation.
 *
 * Trailing affordance vocabulary (design/row-affordances, design/PATTERN_
 * VOCABULARY.md "Rows"): the trailing slot can carry a status value (13pt
 * slate) and exactly one of chevron (in-app destination: a screen or a sheet)
 * or externalLink (leaves the app for the browser). A value can instead be a
 * shown mail address (Support): no chevron, no externalLink, but the address
 * itself promises a mail action, opening the device's mail composer. A row
 * whose value is a plain status, or that has no value at all, and carries
 * neither chevron nor externalLink is an in-place action; it still gets a
 * pressed state, but nothing in the trailing slot promises where the tap
 * goes. Passing both chevron and externalLink is a caller error the type
 * system does not currently forbid; don't do it.
 *
 * Label tone (design/profile-restructure U9, a named deviation from PATTERN_
 * VOCABULARY.md's Rows section, which does not yet cover label color tiers):
 * `muted` steps the label down to slate for a visually quieter group (e.g.
 * Profile's "More" tier), separate from `destructive`'s coral. The two are
 * mutually exclusive; pass at most one.
 */
import React from 'react';
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useStrings } from '@/utils/i18n';
import type { AppTheme } from '@/constants/theme';

/**
 * The subset of the settings sheet's stylesheet a row needs. Structural, so the
 * sheet can keep owning createStyles and just hand the result over.
 */
export type SettingsRowStyles = {
  row: StyleProp<ViewStyle>;
  rowLast: StyleProp<ViewStyle>;
  rowPressed: StyleProp<ViewStyle>;
  rowLabel: StyleProp<TextStyle>;
  rowLabelDestructive: StyleProp<TextStyle>;
  rowLabelMuted: StyleProp<TextStyle>;
  rowTrailing: StyleProp<ViewStyle>;
  rowValue: StyleProp<TextStyle>;
  rowHint: StyleProp<TextStyle>;
};

export type SettingsRowProps = {
  styles: SettingsRowStyles;
  theme: AppTheme;
  label: string;
  /** Trailing value, e.g. the currency code or the app version. */
  value?: string;
  /** Trailing hint in small mist type, e.g. the sign-out reassurance. */
  hint?: string;
  onPress?: () => void;
  /** In-app destination: pushes a screen or opens a sheet. */
  chevron?: boolean;
  /** Leaves the app for the browser. Mutually exclusive with chevron. */
  externalLink?: boolean;
  destructive?: boolean;
  /** Steps the label down to slate for a visually quieter group. Mutually exclusive with destructive. */
  muted?: boolean;
  /** Last row in its group: no separator below it. */
  last?: boolean;
  accessibilityLabel?: string;
  /**
   * VoiceOver hint spoken after the label/value. Callers only need this for
   * a bespoke case; the externalLink row's own hint (strings.settings.
   * opensInBrowserHint, "opens in your browser") is applied automatically
   * below rather than repeated at every call site, so an explicit value
   * passed here overrides that default instead of being dropped.
   */
  accessibilityHint?: string;
};

export function SettingsRow({
  styles,
  theme,
  label,
  value,
  hint,
  onPress,
  chevron,
  externalLink,
  destructive,
  muted,
  last,
  accessibilityLabel,
  accessibilityHint,
}: SettingsRowProps): React.JSX.Element {
  const strings = useStrings();
  const rowStyle: StyleProp<ViewStyle> = [styles.row, last ? styles.rowLast : null];
  // UX-029: hint (the reassurance line, e.g. "data stays on this device") used
  // to be silently dropped whenever a caller relied on the default label
  // instead of passing an explicit accessibilityLabel, because the fallback
  // below was bare `label`. Fold hint into the default so it is never
  // spoken-over unless a caller deliberately overrides the whole label.
  const defaultAccessibilityLabel = hint ? `${label}, ${hint}` : label;
  // UX-029/UX-052: an externalLink row leaves the app for the browser; the
  // ExternalLink icon tells sighted users that, but VoiceOver needs the same
  // information said aloud. Applied here once for every externalLink row
  // instead of at each call site, so a caller can still override it with an
  // explicit accessibilityHint when a row needs bespoke wording.
  const effectiveAccessibilityHint =
    accessibilityHint ?? (externalLink ? strings.settings.opensInBrowserHint : undefined);
  const body = (
    <>
      <Text
        style={[
          styles.rowLabel,
          muted ? styles.rowLabelMuted : null,
          destructive ? styles.rowLabelDestructive : null,
        ]}
      >
        {label}
      </Text>
      <View style={styles.rowTrailing}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
        {chevron ? <Icon name="ChevronRight" size={16} color={theme.mistText} /> : null}
        {externalLink ? <Icon name="ExternalLink" size={16} color={theme.mistText} /> : null}
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View
        style={rowStyle}
        accessible
        accessibilityLabel={accessibilityLabel ?? defaultAccessibilityLabel}
      >
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? defaultAccessibilityLabel}
      accessibilityHint={effectiveAccessibilityHint}
      style={({ pressed }) => [rowStyle, pressed ? styles.rowPressed : null]}
    >
      {body}
    </Pressable>
  );
}
