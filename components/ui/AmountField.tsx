/**
 * AmountField (ADR 0023: amount entry moves to the native keyboard).
 *
 * Same look as AmountDisplay (Instrument Serif digits, tabular-nums, the
 * currency symbol at 0.6x in mist, a 1.5px underline that turns sage on
 * focus) but backed by a real TextInput on `keyboardType="decimal-pad"`
 * instead of a display paired with the retiring custom Keypad. Full width:
 * the underline spans the container, not just the digits.
 *
 * State ownership: the field keeps its own raw typed string internally
 * (typing "12." can't round-trip through toFixed(2) without losing the dot
 * on every keystroke) and reports cents upward via onChangeCents. valueCents
 * is a SEED, not a continuously-controlled value: the field resyncs its text
 * from valueCents only when the prop changes for a reason other than the
 * field's own last onChangeCents call, i.e. when a caller resets the sheet
 * (a fresh log) or prefills it (opening on an existing expense). On blur the
 * raw text reformats to the canonical two-decimal form, matching what
 * AmountDisplay would have shown all along.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { currencyMeta } from '@/utils/currency';
import { centsToKeypadValue, keypadValueToCents } from '@/utils/keypad';
import { sanitizeAmountInput } from '@/utils/amountInput';

/** Milliseconds after `autoFocus` flips true before the field claims focus,
 *  long enough to clear the Sheet's 220ms enter animation (constants/theme.ts
 *  motion.sheet) so iOS doesn't drop a focus request mid-transition. */
const AUTOFOCUS_DELAY_MS = 300;

export type AmountFieldProps = {
  valueCents: number;
  onChangeCents: (cents: number) => void;
  /** Claims focus (after the sheet's enter animation) whenever this flips to true. */
  autoFocus?: boolean;
  /** Numeral font size; the symbol renders at ~60% of this. Default 48. */
  size?: number;
  accessibilityLabel?: string;
};

export function AmountField({
  valueCents,
  onChangeCents,
  autoFocus = false,
  size = 48,
  accessibilityLabel,
}: AmountFieldProps): React.JSX.Element {
  const theme = useTheme();
  const { currency } = useCurrency();
  const meta = currencyMeta(currency);
  const inputRef = useRef<TextInput>(null);

  const [text, setText] = useState(() => centsToKeypadValue(valueCents));
  const [focused, setFocused] = useState(false);
  // Tracks the cents value THIS field last reported, so the resync effect
  // below can tell "the caller reset me" apart from "I caused this render".
  const lastReportedCents = useRef(valueCents);

  useEffect(() => {
    if (valueCents !== lastReportedCents.current) {
      lastReportedCents.current = valueCents;
      setText(centsToKeypadValue(valueCents));
    }
  }, [valueCents]);

  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => inputRef.current?.focus(), AUTOFOCUS_DELAY_MS);
    return () => clearTimeout(t);
  }, [autoFocus]);

  const handleChangeText = (raw: string) => {
    const sanitized = sanitizeAmountInput(raw);
    setText(sanitized);
    const cents = keypadValueToCents(sanitized);
    lastReportedCents.current = cents;
    onChangeCents(cents);
  };

  const handleBlur = () => {
    setFocused(false);
    // Reformats "12.5" -> "12.50", "12." -> "12.00", '' stays '' (placeholder).
    setText(centsToKeypadValue(keypadValueToCents(text)));
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        column: {
          width: '100%',
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
          // Nudges the symbol down to the numeral's baseline, matching
          // AmountDisplay's Text-sibling layout.
          paddingTop: Math.round(size * 0.08),
        },
        input: {
          flex: 1,
          fontFamily: theme.fonts.display,
          fontSize: size,
          color: theme.ink,
          fontVariant: ['tabular-nums'],
          includeFontPadding: false,
          padding: 0,
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
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={handleChangeText}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          keyboardType="decimal-pad"
          placeholder={(0).toFixed(meta.decimals)}
          placeholderTextColor={theme.mist}
          style={styles.input}
          allowFontScaling
          maxFontSizeMultiplier={1.3}
          accessibilityLabel={accessibilityLabel}
          selectionColor={theme.primary}
        />
      </View>
      <View style={styles.underline} />
    </View>
  );
}
