/**
 * MonthDayPicker: a month and a day, built from Chips (2026-09-11).
 *
 * Money > Upcoming's Yearly frequency had no anchor at all, so a bill renewing
 * on 14 March was unexpressible: the sheet always wrote "same date as today,
 * one year out". The one-time path had the same hole from the other side, with
 * four relative chips topping out at "next month". Both ask for exactly a month
 * and a day, so both get this.
 *
 * Built from `Chip` on purpose. There is no date picker anywhere in this repo,
 * and adding `@react-native-community/datetimepicker` would touch
 * `package.json`, which `scripts/ota-eligible.sh` treats as a native change:
 * the whole feature would then need an App Store round trip instead of an
 * `eas update`. A JS-only control is not the compromise here, it is the only
 * version that ships this week.
 *
 * Month labels are derived, never catalogued: `formatDate(ref, { month:
 * 'short' })` off a mid-month reference date, the same trick `weekdayShortLabel`
 * uses in AddUpcomingSheet, so twelve locales come free and no string needs
 * translating (ADA-008).
 *
 * Days past the selected month's length render DISABLED rather than hidden, so
 * the grid never reflows under a finger that is already moving toward a cell.
 * February shows 29 live and 30/31 dimmed rather than collapsing a row.
 */
import { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { strings } from '@/constants/strings';
import { typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { formatDate } from '@/utils/dates';

/** Mid-month, so no timezone shift can roll the reference into a neighbour. */
const MONTH_REFERENCE = new Date(2024, 0, 15);

const MONTHS: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const DAYS: readonly number[] = Array.from({ length: 31 }, (_, i) => i + 1);

/**
 * Seven columns, the week being the mental model a user already has for "the
 * 14th". 7 x 42 plus six 6pt gaps is 330, inside the sheet's ~353pt of usable
 * width. Fixed, because chips normally size to their label and "1" beside "10"
 * makes a wrapping grid ragged rather than countable.
 */
const DAY_CELL = 42;

/** "Mar" in the device locale. */
export function monthShortLabel(month: number): string {
  const d = new Date(MONTH_REFERENCE);
  d.setMonth(month);
  return formatDate(d, { month: 'short' });
}

/** "March" in the device locale. */
export function monthLongLabel(month: number): string {
  const d = new Date(MONTH_REFERENCE);
  d.setMonth(month);
  return formatDate(d, { month: 'long' });
}

/** Days in a month, leap years included. Day 0 of the next month is this one's last. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export type MonthDayPickerProps = {
  month: number;
  day: number;
  onChangeMonth: (month: number) => void;
  onChangeDay: (day: number) => void;
  /** Hides the day grid and the echo: the month is known, the day is not. */
  dayUnknown?: boolean;
  /** Year used only to decide February's length. */
  year?: number;
};

export function MonthDayPicker({
  month,
  day,
  onChangeMonth,
  onChangeDay,
  dayUnknown = false,
  year = new Date().getFullYear(),
}: MonthDayPickerProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const railRef = useRef<ScrollView | null>(null);

  const lastDay = daysInMonth(year, month);

  // A December anchor sits off the right edge of a twelve-chip rail, so the
  // rail opens on the selected month rather than on January. Same reasoning as
  // CategoryChipRow's scrollToSelected.
  useEffect(() => {
    const CHIP_WIDTH = 62;
    railRef.current?.scrollTo({ x: Math.max(0, (month - 1) * CHIP_WIDTH), animated: false });
    // Only on mount: scrolling on every change would fight the user's own drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Text style={styles.subLabel}>{strings.addUpcoming.onWhichMonth}</Text>
      <ScrollView
        ref={railRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.rail}
        style={styles.railScroll}
      >
        {MONTHS.map((m) => (
          <Chip
            key={m}
            label={monthShortLabel(m)}
            selected={m === month}
            onPress={() => onChangeMonth(m)}
          />
        ))}
      </ScrollView>

      {dayUnknown ? null : (
        <>
          <Text style={styles.subLabel}>{strings.addUpcoming.onWhichDay}</Text>
          <View style={styles.dayGrid}>
            {DAYS.map((d) => (
              <Chip
                key={d}
                label={String(d)}
                width={DAY_CELL}
                selected={d === day && d <= lastDay}
                disabled={d > lastDay}
                onPress={() => onChangeDay(d)}
              />
            ))}
          </View>
          {/* The sheet echoing the date it is about to write. AddUpcomingSheet's
              record calls this "the first place either sheet echoes the date it
              is about to write, which is what made this defect invisible". */}
          <Text style={styles.echo}>
            {strings.addUpcoming.monthDayEcho(monthLongLabel(month), Math.min(day, lastDay))}
          </Text>
        </>
      )}
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    subLabel: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      color: theme.slate,
      marginTop: 12,
      marginBottom: 8,
    },
    railScroll: {
      marginBottom: 4,
    },
    rail: {
      flexDirection: 'row',
      gap: 6,
    },
    dayGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    echo: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      color: theme.mistText,
      marginTop: 8,
      lineHeight: 17,
    },
  });
}
