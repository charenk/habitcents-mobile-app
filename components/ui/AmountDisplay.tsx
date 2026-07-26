import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { currencyMeta } from '@/utils/currency';

type AmountDisplayProps = {
  valueCents: number;
  /** Sage underline + treatment while the paired keypad is active. */
  focused?: boolean;
  /** Numeral font size; the symbol renders at ~60% of this. Default 48. */
  size?: number;
  /** Render a zero amount in the placeholder (mist) color. */
  zeroAsPlaceholder?: boolean;
};

/**
 * The shared amount-first display look: a currency symbol plus a serif tabular
 * number over a 1.5px underline (design/redesign-handoff/01-tokens-and-
 * foundations.md, §5). Display only, never a TextInput; a Keypad drives it.
 */
export function AmountDisplay({
  valueCents,
  focused = false,
  size = 48,
  zeroAsPlaceholder = false,
}: AmountDisplayProps) {
  const theme = useTheme();
  const { currency } = useCurrency();
  const meta = currencyMeta(currency);

  const isZero = !Number.isFinite(valueCents) || valueCents === 0;
  const placeholder = isZero && zeroAsPlaceholder;

  const major = (Number.isFinite(valueCents) ? valueCents : 0) / 100;
  const numberText = Math.abs(major).toFixed(meta.decimals);

  const numberColor = placeholder ? theme.mist : theme.ink;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        column: {
          alignSelf: 'flex-start',
        },
        row: {
          flexDirection: 'row',
          alignItems: 'flex-start',
        },
        symbol: {
          fontFamily: theme.fonts.display,
          fontSize: Math.round(size * 0.6),
          color: theme.mist,
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
    [theme, size, focused]
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
