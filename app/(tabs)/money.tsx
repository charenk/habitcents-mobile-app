/**
 * Money tab (design/redesign-handoff/04-screens.md, "Money" R7/R22).
 *
 * Two views behind one segmented control: what has already been spent, and
 * what is coming. The screen owns the split and the sheets; the two lists are
 * presentational.
 *
 * The correctness rule this screen exists to enforce: an expense scheduled for
 * next month is NOT money spent. Storage keeps scheduled items as ordinary
 * expense rows dated at their first occurrence, so Spent filters to rows dated
 * on or before the end of today before it groups anything. Without that filter
 * a rent bill authored today for the 1st would appear as a spend the user
 * never made.
 */
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AddUpcomingSheet } from '@/components/money/AddUpcomingSheet';
import { EditExpenseSheet } from '@/components/money/EditExpenseSheet';
import { SpentList } from '@/components/money/SpentList';
import { UpcomingList } from '@/components/money/UpcomingList';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { strings } from '@/constants/strings';
import type { AppTheme } from '@/constants/theme';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Expense } from '@/types/expense';
import { groupExpensesByDate } from '@/data/expensesMock';
import { computeUpcoming } from '@/utils/recurring';

const UPCOMING_WINDOW_DAYS = 60;

type MoneyView = 'spent' | 'upcoming';

export default function MoneyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { expenses } = useExpenses();

  const [view, setView] = useState<MoneyView>('spent');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [addUpcomingVisible, setAddUpcomingVisible] = useState(false);

  // Spent is history only: everything dated after the end of today belongs to
  // Upcoming, where the projection engine owns it.
  const sections = useMemo(() => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return groupExpensesByDate(
      expenses.filter((e) => e.date.getTime() <= endOfToday.getTime())
    );
  }, [expenses]);

  const upcoming = useMemo(
    () => computeUpcoming(expenses, UPCOMING_WINDOW_DAYS),
    [expenses]
  );

  const segments = useMemo(
    () =>
      [
        { value: 'spent' as const, label: strings.money.segmentSpent },
        { value: 'upcoming' as const, label: strings.money.segmentUpcoming },
      ] as const,
    []
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={strings.screenTitles.money}
        actions={[
          { icon: 'CircleUser', label: strings.profile.headerLabel, onPress: () => router.push('/profile') },
        ]}
      />
      <View style={styles.segments}>
        <SegmentedControl<MoneyView>
          options={segments}
          value={view}
          onChange={setView}
          accessibilityLabel={strings.money.segmentLabel}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {view === 'spent' ? (
          <SpentList sections={sections} onEditExpense={setEditing} />
        ) : (
          <UpcomingList
            items={upcoming}
            windowDays={UPCOMING_WINDOW_DAYS}
            onAdd={() => setAddUpcomingVisible(true)}
          />
        )}
      </ScrollView>

      <EditExpenseSheet
        visible={editing !== null}
        expense={editing}
        onClose={() => setEditing(null)}
      />
      <AddUpcomingSheet
        visible={addUpcomingVisible}
        onClose={() => setAddUpcomingVisible(false)}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    // ScreenHeader already ends in a 4pt paddingBottom, so an 8pt top margin
    // here reproduces the 12pt gap the old single header block had between
    // the title and the segmented control.
    segments: {
      paddingHorizontal: 20,
      marginTop: 8,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 24,
    },
  });
}
