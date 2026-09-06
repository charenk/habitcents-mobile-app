/**
 * Money's segment pager (2026-09-06).
 *
 * Money's three segments became pages of a horizontal pager, so they can be
 * swiped between as well as tapped. This file pins the swipe half: that a
 * settle selects the landed segment, that both settle events are honoured,
 * and that a settle on the page already showing reports nothing. The tap half
 * is covered by the existing segment tests in moneyHabitsTab and
 * moneyUpcomingTab, which drive the control by role.
 *
 * Modelled on todaySpentKept's pager tests, which cover the same hook on the
 * screen it came from.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import React from 'react';
import { Dimensions } from 'react-native';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { CategoriesProvider } from '@/contexts/CategoriesContext';
import { ExpensesProvider } from '@/contexts/ExpensesContext';
import { HabitsProvider } from '@/contexts/HabitsContext';
import { ToastProvider } from '@/components/ui/Toast';
import MoneyScreen from '@/app/(tabs)/money';
import { track } from '@/utils/analytics';
import { strings } from '@/constants/strings';

const mockTrack = track as jest.MockedFunction<typeof track>;

/** Matches what useWindowDimensions reads, so a page offset is one screen. */
const windowWidth = Dimensions.get('window').width;

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <CurrencyProvider>
          <CategoriesProvider>
            <ExpensesProvider>
              <HabitsProvider>
                <ToastProvider>
                  <OnboardingProvider>{children}</OnboardingProvider>
                </ToastProvider>
              </HabitsProvider>
            </ExpensesProvider>
          </CategoriesProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

type View = Awaited<ReturnType<typeof render>>;

async function renderMoney(): Promise<View> {
  const view = await render(
    <Providers>
      <MoneyScreen />
    </Providers>
  );
  await act(async () => {});
  return view;
}

/** Mirrors a real swipe: the pager has already physically settled on the
 *  page's offset by the time the event fires. */
async function settle(view: View, page: number, event = 'momentumScrollEnd'): Promise<void> {
  await act(async () => {
    fireEvent(view.getByTestId('money-pager'), event, {
      nativeEvent: { contentOffset: { x: page * windowWidth } },
    });
  });
}

function selected(view: View, label: string): boolean {
  return view.getByRole('tab', { name: new RegExp(`^${label},`) }).props
    .accessibilityState?.selected === true;
}

beforeEach(() => {
  mockTrack.mockClear();
});

afterEach(cleanup);

describe('Money: the segment pager', () => {
  it('selects Upcoming when a swipe settles on the second page', async () => {
    const view = await renderMoney();
    await settle(view, 1);

    expect(selected(view, strings.money.segmentUpcoming)).toBe(true);
    expect(selected(view, strings.money.segmentSpent)).toBe(false);
    expect(mockTrack).toHaveBeenCalledWith('money_view_switched', {
      to: 'upcoming',
      method: 'swipe',
    });
  });

  // Three pages, unlike Today's two: the last one is only reachable by
  // rounding an offset of two screen widths, which is the arithmetic a
  // two-page pager never exercised.
  it('selects Habits when a swipe settles on the third page', async () => {
    const view = await renderMoney();
    await settle(view, 2);

    expect(selected(view, strings.money.segmentHabits)).toBe(true);
    expect(mockTrack).toHaveBeenCalledWith('money_view_switched', {
      to: 'habits',
      method: 'swipe',
    });
  });

  it('reports nothing when a settle lands on the page already showing', async () => {
    const view = await renderMoney();
    await settle(view, 0);

    expect(selected(view, strings.money.segmentSpent)).toBe(true);
    // Scoped to the switch event: the screen fires an unrelated
    // recurring_expense_count on mount.
    expect(
      mockTrack.mock.calls.filter(([event]) => event === 'money_view_switched')
    ).toHaveLength(0);
  });

  // A drag released with no velocity never produces momentum, so the pager
  // reads scrollEndDrag too. The momentum event a faster release would also
  // deliver lands on the page already selected and drops.
  it('honours a drag that settles without momentum, and counts it once', async () => {
    const view = await renderMoney();
    await settle(view, 1, 'scrollEndDrag');
    await settle(view, 1);

    expect(selected(view, strings.money.segmentUpcoming)).toBe(true);
    expect(
      mockTrack.mock.calls.filter(([event]) => event === 'money_view_switched')
    ).toHaveLength(1);
  });

  // The off-screen panes stay mounted so each keeps its own scroll position,
  // which is exactly why they have to be hidden from assistive tech.
  it('keeps every pane mounted and hides the ones off screen', async () => {
    const view = await renderMoney();

    for (const pane of ['money-pane-spent', 'money-pane-upcoming', 'money-pane-habits']) {
      expect(view.getByTestId(pane, { includeHiddenElements: true })).toBeTruthy();
    }

    const hiddenOf = (id: string) =>
      view.getByTestId(id, { includeHiddenElements: true }).props.accessibilityElementsHidden;

    expect(hiddenOf('money-pane-spent')).toBe(false);
    expect(hiddenOf('money-pane-upcoming')).toBe(true);
    expect(hiddenOf('money-pane-habits')).toBe(true);

    await settle(view, 2);

    expect(hiddenOf('money-pane-spent')).toBe(true);
    expect(hiddenOf('money-pane-habits')).toBe(false);
  });
});
