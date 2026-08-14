/**
 * Empty states as onboarding surfaces (PRD v3.1 sect 5, phase 7).
 *
 * Sect 5 sends skippers straight into the app with no in-flow route to
 * activation, and pays for that by making every empty state they can reach an
 * onboarding surface: each must carry a CONCRETE FIRST ACTION, not a blank
 * illustration. These tests pin that promise where it is easy to lose, which is
 * the next time someone tidies an empty state and drops the button.
 *
 * Also pinned: the two empty states deliberately left WITHOUT a CTA. Pace and
 * Where-it-went resolve with time and data, not with a tap, so a button there
 * would be a lie about what the user can do. That absence is a decision, not an
 * oversight, and it is asserted so it reads as one.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { EmptyState } from '@/components/ui';
import { SpentList } from '@/components/money/SpentList';
import { UpcomingList } from '@/components/money/UpcomingList';
import { HabitsList } from '@/components/money/HabitsList';
import { LeaksCard } from '@/components/insights/LeaksCard';
import { PaceCard } from '@/components/insights/PaceCard';
import { WhereItWentCard } from '@/components/insights/WhereItWentCard';
import { useEmptyStateAction } from '@/components/onboarding/useEmptyStateAction';
import { strings } from '@/constants/strings';
import { track } from '@/utils/analytics';

const trackMock = track as jest.MockedFunction<typeof track>;

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <CurrencyProvider>
          <OnboardingProvider>{children}</OnboardingProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

async function renderWith(node: React.ReactElement) {
  const view = await render(<Providers>{node}</Providers>);
  await act(async () => {});
  return view;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  trackMock.mockClear();
});
afterEach(cleanup);

describe('every reachable empty state offers a first action', () => {
  it('Money > Spent offers logging', async () => {
    const onLogExpense = jest.fn();
    const view = await renderWith(
      <SpentList sections={[]} onEditExpense={jest.fn()} onLogExpense={onLogExpense} />
    );

    fireEvent.press(view.getByRole('button', { name: strings.money.spentEmptyCta }));
    expect(onLogExpense).toHaveBeenCalledTimes(1);
  });

  it('Money > Upcoming offers adding one', async () => {
    const onEmptyAdd = jest.fn();
    const view = await renderWith(
      <UpcomingList
        items={[]}
        windowDays={14}
        onWindowDaysChange={jest.fn()}
        onAdd={jest.fn()}
        onEmptyAdd={onEmptyAdd}
        onEditItem={jest.fn()}
      />
    );

    // Two controls share this label (the header affordance and the empty
    // state's CTA); the empty state's is the one that reports a surface.
    const buttons = view.getAllByRole('button', { name: strings.money.upcomingAddAffordance });
    fireEvent.press(buttons[buttons.length - 1]);
    expect(onEmptyAdd).toHaveBeenCalledTimes(1);
  });

  it('Money > Habits offers breaking one directly', async () => {
    const onBreakHabit = jest.fn();
    const view = await renderWith(
      <HabitsList
        rows={[]}
        managedMonthlyTotal={0}
        onBreak={jest.fn()}
        onOpenHabit={jest.fn()}
        onBreakHabit={onBreakHabit}
      />
    );

    fireEvent.press(view.getByRole('button', { name: strings.money.habitsEmptyCta }));
    expect(onBreakHabit).toHaveBeenCalledTimes(1);
  });

  it('Insights > Leaks offers logging, because detection needs logs first', async () => {
    const onLogExpense = jest.fn();
    const view = await renderWith(
      <LeaksCard rows={[]} onBreak={jest.fn()} onOpenHabit={jest.fn()} onLogExpense={onLogExpense} />
    );

    fireEvent.press(view.getByRole('button', { name: strings.insights.leaksEmptyCta }));
    expect(onLogExpense).toHaveBeenCalledTimes(1);
  });

  it('Categories offers adding one', async () => {
    const onPress = jest.fn();
    const view = await renderWith(
      <EmptyState
        title={strings.categories.emptyTitle}
        body={strings.categories.emptySubtitle}
        cta={{ label: strings.categories.emptyCta, onPress }}
      />
    );

    fireEvent.press(view.getByRole('button', { name: strings.categories.emptyCta }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('the empty states deliberately left without a CTA', () => {
  // Pace is empty until a month of data exists. No button can shorten that, so
  // offering one would promise something the tap cannot deliver.
  it('Pace explains the wait instead of offering a button', async () => {
    // projection null is exactly the "not a full month yet" state.
    const view = await renderWith(
      <PaceCard monthLabel="August" projection={null} comparison={null} />
    );

    expect(view.getByText(strings.insights.pacePlaceholder)).toBeTruthy();
    expect(view.queryByRole('button')).toBeNull();
  });

  // Where-it-went is empty for the CHOSEN RANGE, not for all time. The fix is
  // usually widening the range, which the card does not own, so a "log an
  // expense" button here would answer a question the user did not ask.
  it('Where it went states the range is empty instead of offering a button', async () => {
    const view = await renderWith(<WhereItWentCard rows={[]} rangeLabel="Last 7 days" />);

    expect(view.getByText(strings.insights.whereItWentEmpty)).toBeTruthy();
    expect(view.queryByRole('button')).toBeNull();
  });
});

describe('skip_activation', () => {
  function Probe({ onPress }: { onPress: () => void }) {
    const handler = useEmptyStateAction('money_spent', onPress);
    return <EmptyState body="body" cta={{ label: 'Do it', onPress: handler }} />;
  }

  async function seedDoor(doorChosen: 'skip' | 'fresh'): Promise<void> {
    await AsyncStorage.setItem(
      '@habitcents_onboarding_state',
      JSON.stringify({
        currentStep: 'fork',
        hasSeenWelcome: true,
        hasSeenValueProps: false,
        hasAddedFirstExpense: false,
        skippedSteps: [],
        doorChosen,
      })
    );
  }

  function surfacesReported() {
    return trackMock.mock.calls
      .filter(([event]) => event === 'skip_activation')
      .map(([, props]) => (props as { surface: string }).surface);
  }

  it('reports the surface when a skipper acts', async () => {
    await seedDoor('skip');
    const view = await renderWith(<Probe onPress={jest.fn()} />);

    fireEvent.press(view.getByRole('button', { name: 'Do it' }));

    expect(surfacesReported()).toEqual(['money_spent']);
  });

  // Someone who completed a route already had their first action. Counting
  // them here would drown the signal the event exists to carry.
  it('stays silent for a user who did not skip', async () => {
    await seedDoor('fresh');
    const view = await renderWith(<Probe onPress={jest.fn()} />);

    fireEvent.press(view.getByRole('button', { name: 'Do it' }));

    expect(surfacesReported()).toEqual([]);
  });

  it('always runs the action, reported or not', async () => {
    const onPress = jest.fn();
    const view = await renderWith(<Probe onPress={onPress} />);

    fireEvent.press(view.getByRole('button', { name: 'Do it' }));

    // The measurement must never be able to swallow the user's tap.
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
