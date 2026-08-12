import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { currencyMeta } from '@/utils/currency';

type AmountDisplayProps = {
  valueCents: number;
  /** Sage underline + treatment for an active/focused-looking state. */
  focused?: boolean;
  /** Numeral font size; the symbol renders at ~60% of this. Default 48. */
  size?: number;
  /** Render a zero amount in the placeholder (mist) color. */
  zeroAsPlaceholder?: boolean;
  /**
   * Stretch to the parent's full width instead of shrink-wrapping the
   * digits, so the underline spans the container (matching AmountField)
   * while the digits themselves stay left-aligned. Default false preserves
   * every existing consumer pixel-identical.
   */
  fullWidth?: boolean;
};

/**
 * The shared amount-first display look: a currency symbol plus a serif tabular
 * number over a 1.5px underline (design/redesign-handoff/01-tokens-and-
 * foundations.md, §5). Display only, never a TextInput.
 *
 * ADR 0023 retired this component's editable pairing (AmountDisplay + the
 * custom Keypad) in favor of AmountField, a real TextInput on the native
 * decimal pad, across every amount-entry surface. QuickLogRow (components/
 * money/QuickLogRow.tsx) is the one remaining consumer, and it is
 * display-only there too: a tappable card that opens the log sheet, not
 * paired with any keypad. QuickLogRow passes fullWidth so the underline
 * spans the card instead of hugging the digits.
 */
export function AmountDisplay({
  valueCents,
  focused = false,
  size = 48,
  zeroAsPlaceholder = false,
  fullWidth = false,
}: AmountDisplayProps) {
  const theme = useTheme();
  const { currency } = useCurrency();
  const meta = currencyMeta(currency);

  const isZero = !Number.isFinite(valueCents) || valueCents === 0;
  const placeholder = isZero && zeroAsPlaceholder;

  const major = (Number.isFinite(valueCents) ? valueCents : 0) / 100;
  const numberText = Math.abs(major).toFixed(meta.decimals);

  const numberColor = placeholder ? theme.mistText : theme.ink;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        column: {
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        row: {
          flexDirection: 'row',
          alignItems: 'flex-start',
        },
        symbol: {
          fontFamily: theme.fonts.display,
          fontSize: Math.round(size * 0.6),
          color: theme.mistText,
          marginRight: 2,
          includeFontPadding: false,
        },
        number: {
          fontFamily: theme.fonts.display,
          fontSize: size,
          fontVariant: ['tabular-nums'],
          includeFontPadding: false,
        },
        underline: {
          height: 1.5,
          marginTop: 6,
          backgroundColor: focused ? theme.primary : theme.cloud,
          borderRadius: 999,
        },
      }),
    [theme, size, focused, fullWidth]
  );

  return (
    <View style={styles.column}>
      <View style={styles.row}>
        <Text style={styles.symbol} allowFontScaling>
          {meta.symbol}
        </Text>
        <Text style={[styles.number, { color: numberColor }]} allowFontScaling>
          {numberText}
        </Text>
      </View>
      <View style={styles.underline} />
    </View>
  );
}
