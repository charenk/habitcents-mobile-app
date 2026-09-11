/**
 * UpcomingList (U8: Money Upcoming redesign).
 *
 * Covers the four behavioral decisions the redesign made: the summary block
 * is left-aligned (style assertion on the text block, matching Spent's and
 * Habits' left-aligned eyebrows), the window picker calls back with the
 * preset tapped, the count line agrees with what the total actually sums
 * (payments, not distinct bills -- U8's fix for the two numbers disagreeing),
 * and a row press opens edit rather than doing nothing.
 *
 * Items are built directly as UpcomingItem fixtures rather than routed
 * through computeUpcoming, since this component is presentational and takes
 * the projection as a prop; the projection math itself is covered in
 * recurring.test.ts / recurrenceRule.test.ts.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { StyleSheet } from 'react-native';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { UpcomingList } from '@/components/money/UpcomingList';
import { strings } from '@/constants/strings';
import type { Expense } from '@/types/expense';
import { shortDate, type UpcomingItem } from '@/utils/recurring';
import { upcomingWindowEnd } from '@/utils/upcomingWindow';

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CurrencyProvider>{children}</CurrencyProvider>
    </ThemeProvider>
  );
}

function makeExpense(overrides: Partial<Expense> & { id: string }): Expense {
  return {
    title: 'Rent',
    amount: 500,
    category: 'Mortgage',
    date: new Date('2026-08-15T00:00:00'),
    time: '9:00 AM',
    isRecurring: true,
    recurrence: 'weekly',
    recurrenceRule: { type: 'weekly', weekday: 6 },
    reminderEnabled: false,
    iconVariant: 'green',
    ...overrides,
  };
}

/** One occurrence per day starting `from`, ascending. */
function occurrences(from: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(from);
    d.setDate(d.getDate() + i * 7);
    return d;
  });
}

function itemFor(expense: Expense, occurrenceCount: number): UpcomingItem {
  const occ = occurrences(expense.date, occurrenceCount);
  return {
    expense,
    nextDate: occ[0],
    daysUntil: 3,
    occurrencesInWindow: occ,
  };
}

// One item due once, one due twice: total sums 1 + 2 = 3 payments across 2 bills.
const singleItem = itemFor(makeExpense({ id: 'rent', amount: 50000 }), 1);
const doubleItem = itemFor(
  makeExpense({ id: 'gym', title: 'Gym', amount: 3000, category: 'Entertainment' }),
  2
);
const items: UpcomingItem[] = [singleItem, doubleItem];

const noop = () => {};

async function renderList(overrides: Partial<React.ComponentProps<typeof UpcomingList>> = {}) {
  const view = render(
    <Providers>
      <UpcomingList
        items={items}
        windowDays={14}
        onWindowDaysChange={noop}
        onAdd={noop}
        onEditItem={noop}
        onMarkPaid={noop}
        // Every fixture here has at least one recurring expense somewhere
        // (the window-empty case below is "no items in THIS window", not
        // "nothing recurs at all"); override to false to hit the true-zero
        // fill state instead.
        hasAnyRecurring={true}
        {...overrides}
      />
    </Providers>
  );
  return view;
}

afterEach(cleanup);

describe('UpcomingList summary block', () => {
  // 2026-09-11: the card became three rows, so this pins the AMOUNT's own row
  // rather than a three-line block. The testID moved with the meaning.
  it('left-aligns the total', async () => {
    const view = await renderList();
    const block = view.getByTestId('upcoming-total-text');
    expect(StyleSheet.flatten(block.props.style).alignItems).toBe('flex-start');
  });

  /**
   * The card states the window's SPAN now, not its duration: the duration is
   * already in the filter beside it. Built through `upcomingWindowEnd` rather
   * than a literal date, so this proves the label and the projection engine
   * agree rather than pinning today's calendar.
   */
  it('shows the window span for the selected preset', async () => {
    const view = await renderList({ windowDays: 30 });
    const expected = strings.money.upcomingWindowRange(shortDate(upcomingWindowEnd(30)));
    expect(view.getByText(expected)).toBeTruthy();
  });

  // Retirement pinned, matching the upcomingListEyebrow precedent.
  it('no longer states the window as a duration', async () => {
    const view = await renderList({ windowDays: 30 });
    expect(view.queryByText(strings.money.upcomingWindowEyebrow(30))).toBeNull();
  });

  it('total sums every occurrence, and the count line agrees (payments, not bills)', async () => {
    const view = await renderList();
    // 500.00 (1x) + 30.00*2 = 560.00
    expect(view.getByText('$560.00')).toBeTruthy();
    expect(view.getByText(strings.money.upcomingPaymentsCount(3, 2))).toBeTruthy();
    expect(view.getByText('3 payments from 2 bills')).toBeTruthy();
  });

  it('drops the "from N bills" clause when payments and bills agree', async () => {
    const view = await renderList({ items: [singleItem] });
    expect(view.getByText('1 payment')).toBeTruthy();
  });

  /**
   * The card keeps its full shape when the window is empty, which is a layout
   * decision with a behavioural reason: the filter lives in row 1, so a row
   * that collapsed here would shrink the card under the finger that tapped it
   * and shove the list up. $0.00 over "0 payments" is also just true, and the
   * body line under the card says why.
   */
  it('holds its shape on an empty window, at an honest zero', async () => {
    const view = await renderList({ items: [] });
    expect(view.getByTestId('upcoming-total-text')).toBeTruthy();
    expect(view.getByText('$0.00')).toBeTruthy();
    expect(view.getByText('0 payments')).toBeTruthy();
  });
});

describe('UpcomingList window picker', () => {
  it('renders the three presets and calls back with the one tapped', async () => {
    const onWindowDaysChange = jest.fn();
    const view = await renderList({ onWindowDaysChange });

    expect(view.getByRole('tab', { name: /2 weeks/ })).toBeTruthy();
    expect(view.getByRole('tab', { name: /1 month/ })).toBeTruthy();
    expect(view.getByRole('tab', { name: /3 months/ })).toBeTruthy();

    fireEvent.press(view.getByRole('tab', { name: /3 months/ }));
    expect(onWindowDaysChange).toHaveBeenCalledWith(90);
  });
});

describe('UpcomingList add affordance', () => {
  it('calls onAdd when the compact add control is tapped', async () => {
    const onAdd = jest.fn();
    const view = await renderList({ onAdd });
    fireEvent.press(view.getByLabelText(strings.money.upcomingAddAffordance));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('still shows the add control and window picker when there are no items', async () => {
    const view = await renderList({ items: [] });
    expect(view.getByLabelText(strings.money.upcomingAddAffordance)).toBeTruthy();
    expect(view.getByRole('tab', { name: /2 weeks/ })).toBeTruthy();
    expect(view.getByText(strings.money.upcomingWindowEmptyBody)).toBeTruthy();
  });

  // One affordance, not two. The window-empty body used to carry a CTA saying
  // the same words as the dashed plus sitting 40pt above it. Asserted by
  // count, because the surviving plus answers to the same accessible name:
  // "there is exactly one of these" is the decision, not "there are none".
  it('offers no second add CTA in the window-empty state', async () => {
    const view = await renderList({ items: [] });
    expect(
      view.getAllByRole('button', { name: strings.money.upcomingAddAffordance })
    ).toHaveLength(1);
    // The plus is an icon; only the retired CTA drew those words on screen.
    expect(view.queryByText(strings.money.upcomingAddAffordance)).toBeNull();
  });
});

describe('UpcomingList month grouping', () => {
  const sep = (day: number) => new Date(`2026-09-${String(day).padStart(2, '0')}T00:00:00`);
  const oct = (day: number) => new Date(`2026-10-${String(day).padStart(2, '0')}T00:00:00`);

  /** Rent at $500.00 landing in September, October and November. */
  const acrossMonths: UpcomingItem = {
    expense: makeExpense({ id: 'rent', amount: 50000 }),
    nextDate: sep(29),
    daysUntil: 18,
    occurrencesInWindow: [sep(29), oct(29), new Date('2026-11-29T00:00:00')],
  };

  it('renders one header per month, in order, each with its own subtotal', async () => {
    const view = await renderList({ items: [acrossMonths] });
    const headers = view.getAllByRole('header');
    const texts = headers.map((h) => h.props.children as string);

    // The card's total is also a header, so filter to the section ones.
    const sections = texts.filter((t) => typeof t === 'string' && t.includes('\u00B7'));
    expect(sections).toHaveLength(3);
    // Each header carries that month's cost, not the window's.
    for (const section of sections) expect(section).toContain('$500.00');
  });

  /**
   * The scope rule. A bill landing in three months is three rows, each showing
   * that month's cost. A single row showing $1,500.00 under a September header
   * would be the unreconcilable pair this whole redesign removed.
   */
  it('splits a bill into one row per month, each scoped to that month', async () => {
    const view = await renderList({ items: [acrossMonths] });
    const rows = view.getAllByLabelText(/^Rent,/);

    expect(rows).toHaveLength(3);
    // Every row speaks its own month's cost, never the window's $1,500.00.
    for (const row of rows) {
      expect(row.props.accessibilityLabel as string).toContain('$500.00');
      expect(row.props.accessibilityLabel as string).not.toContain('$1,500.00');
    }
  });

  it('keeps a bill that lands twice in one month on one row, with its multiplier', async () => {
    const twiceInSeptember: UpcomingItem = {
      expense: makeExpense({ id: 'gym', title: 'Gym', amount: 3000 }),
      nextDate: sep(4),
      daysUntil: 3,
      occurrencesInWindow: [sep(4), sep(18)],
    };
    const view = await renderList({ items: [twiceInSeptember] });

    expect(view.getAllByLabelText(/^Gym,/)).toHaveLength(1);
    expect(view.getByText(strings.money.upcomingRowMultiplier(2, '$30.00'))).toBeTruthy();
    // The reconciliation, with one month and one bill in it: the card's total
    // and the row are both $60.00, and the header composes the same figure
    // into its own string.
    expect(view.getAllByText('$60.00')).toHaveLength(2);
    expect(view.getByText(/\u00B7 \$60\.00$/)).toBeTruthy();
  });

  it('renders no header at all when the window is empty', async () => {
    const view = await renderList({ items: [] });
    const headers = view.getAllByRole('header');
    const sections = headers
      .map((h) => h.props.children)
      .filter((t) => typeof t === 'string' && (t as string).includes('\u00B7'));
    expect(sections).toHaveLength(0);
  });
});

describe('UpcomingList section eyebrow', () => {
  // Retired 2026-09-11: a heading over the only list on the pane, under a card
  // that already says what the pane is. Pinned so it is not quietly restored.
  it('renders no "Scheduled" heading above the rows', async () => {
    const view = await renderList();
    expect(view.queryByText(strings.money.upcomingListEyebrow)).toBeNull();
  });
});

describe('UpcomingList row multiplier', () => {
  /**
   * S1, stated as arithmetic rather than as layout. The card used to count
   * occurrences while the rows counted bills, so a headline of $560.00 sat
   * above rows summing to $530.00 with nothing on screen reconciling them.
   * A row's number is now its windowed subtotal, which is what makes the
   * column add up to the headline.
   */
  it('sums the row numbers to exactly the card headline', async () => {
    const view = await renderList();
    // Rent 500.00 once, Gym 30.00 twice: 500.00 + 60.00 = 560.00.
    expect(view.getByText('$560.00')).toBeTruthy();
    expect(view.getByText('$500.00')).toBeTruthy();
    expect(view.getByText('$60.00')).toBeTruthy();
  });

  it('names the unit price under a bill that lands more than once', async () => {
    const view = await renderList();
    expect(view.getByText(strings.money.upcomingRowMultiplier(2, '$30.00'))).toBeTruthy();
    expect(view.getByText('\u00D72 \u00B7 $30.00')).toBeTruthy();
  });

  // What it says when the count is 1: nothing. At the narrow windows, where
  // nothing repeats, the row is exactly what it was before this change.
  it('renders no multiplier at all for a bill that lands once', async () => {
    const view = await renderList({ items: [singleItem] });
    expect(view.queryByText(/\u00D7/)).toBeNull();
  });

  it('speaks the multiplier between the amount and the schedule line', async () => {
    const view = await renderList();
    const label = view.getByLabelText(/^Gym,/).props.accessibilityLabel as string;
    expect(label).toContain('$60.00, 2 payments of $30.00, ');
  });

  // C5: the row stated its timing twice, once relative and once absolute.
  it('states each row timing once, not twice', async () => {
    const view = await renderList();
    expect(view.queryByText('in 3 days')).toBeNull();
  });
});

describe('UpcomingList row anatomy', () => {
  /**
   * 2026-09-11: the row stopped drawing describeSchedule's sentence. The
   * cadence became a badge and "next" became an elbow arrow, so the row draws
   * `scheduleParts` and SPEAKS `describeSchedule`. These pin both halves,
   * because losing the spoken half is the silent failure.
   */
  it('draws the cadence as a badge, not as words in a line', async () => {
    const view = await renderList();
    expect(view.getAllByText('Weekly').length).toBeGreaterThan(0);
  });

  it('draws the date without the word "next"', async () => {
    const view = await renderList();
    expect(view.queryByText(/next /)).toBeNull();
    expect(view.queryByText(/Weekly \u00B7 /)).toBeNull();
  });

  it('still speaks the whole sentence, weekday included', async () => {
    const view = await renderList();
    const label = view.getByLabelText(/^Gym,/).props.accessibilityLabel as string;
    // The badge shows "Weekly"; the qualifier the badge drops survives here.
    expect(label).toContain('Weekly');
    expect(label).toContain('Saturdays');
    expect(label).toContain('next ');
  });

  it('names the weekday on the date, since the badge cannot hold it', async () => {
    const view = await renderList();
    // "Sat, Aug 15" rather than a bare "Aug 15" for a weekly rule.
    expect(view.getAllByText(/^Sat, /).length).toBeGreaterThan(0);
  });
});

describe('UpcomingList month precision', () => {
  /** The last day of the month we are actually in, so the row is settleable. */
  function endOfThisMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  const unknownDay: UpcomingItem = {
    expense: makeExpense({
      id: 'water',
      title: 'Water',
      amount: 4200,
      datePrecision: 'month',
      recurrenceRule: { type: 'monthly', monthDay: 'last' },
      recurrence: 'monthly',
    }),
    nextDate: new Date('2026-09-30T00:00:00'),
    daysUntil: 19,
    occurrencesInWindow: [new Date('2026-09-30T00:00:00')],
  };

  // Charen, 2026-09-11: no date and no arrow. The row sits under a month header
  // that already carries the month.
  it('draws no date at all when the day is unknown', async () => {
    const view = await renderList({ items: [unknownDay] });

    expect(view.queryByText(/^Sep /)).toBeNull();
    expect(view.queryByText('September')).toBeNull();
    expect(view.getByText('Water')).toBeTruthy();
  });

  /**
   * The anchor must not leak. "Last day" is storage, not something the user
   * said, and this is the assertion standing between the two.
   */
  it('speaks the month and never the stored anchor', async () => {
    const view = await renderList({ items: [unknownDay] });
    const label = view.getByLabelText(/^Water,/).props.accessibilityLabel as string;

    expect(label).toContain('sometime in September');
    expect(label).not.toContain('Last day');
    expect(label).not.toContain('next ');
  });

  /**
   * The escape hatch. The materializer will never write this bill into Spent,
   * so without an affordance the money simply never reaches the ledger.
   */
  it('offers "mark as paid" on an unknown-day bill in the current month', async () => {
    const onMarkPaid = jest.fn();
    const thisMonth: UpcomingItem = {
      ...unknownDay,
      nextDate: endOfThisMonth(),
      occurrencesInWindow: [endOfThisMonth()],
    };
    const view = await renderList({ items: [thisMonth], onMarkPaid });

    await fireEvent.press(view.getByLabelText(strings.money.upcomingMarkPaid('Water')));
    expect(onMarkPaid).toHaveBeenCalledWith(thisMonth.expense);
  });

  it('offers nothing of the kind on a bill whose day is known', async () => {
    const view = await renderList();
    expect(view.queryByLabelText(/Mark .* as paid/)).toBeNull();
  });

  it('still groups and still counts', async () => {
    const view = await renderList({ items: [unknownDay] });
    // Its money is real, so it reaches the card and its own month header.
    expect(view.getAllByText('$42.00').length).toBeGreaterThanOrEqual(2);
  });
});

describe('UpcomingList rows', () => {
  it('opens edit for the row that was pressed', async () => {
    const onEditItem = jest.fn();
    const view = await renderList({ onEditItem });

    fireEvent.press(view.getByLabelText(/^Gym,/));
    expect(onEditItem).toHaveBeenCalledWith(doubleItem.expense);
  });
});
