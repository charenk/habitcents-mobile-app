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
import { LocaleProvider } from '@/contexts/LocaleContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { EmptyState } from '@/components/ui';
import { EMPTY_ART } from '@/constants/emptyArt';
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
        <LocaleProvider>
          <CurrencyProvider>
            <OnboardingProvider>{children}</OnboardingProvider>
          </CurrencyProvider>
        </LocaleProvider>
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

  it('Money > Upcoming offers adding one (true zero-data: no recurring expense at all)', async () => {
    const onEmptyAdd = jest.fn();
    const view = await renderWith(
      <UpcomingList
        items={[]}
        windowDays={14}
        onWindowDaysChange={jest.fn()}
        onAdd={jest.fn()}
        onEmptyAdd={onEmptyAdd}
        onEditItem={jest.fn()}
        hasAnyRecurring={false}
      />
    );

    // upcomingEmptyCta is its own key now (empty-state unification pass), so
    // this no longer shares a label with the header affordance and needs no
    // index-based disambiguation.
    fireEvent.press(view.getByRole('button', { name: strings.money.upcomingEmptyCta }));
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

    // HabitsList no longer reuses insights.leaksEmptyTitle (empty-state
    // unification pass): it has its own money.habitsEmptyTitle key. The body
    // key still exists in strings.ts for the localization migration but is no
    // longer rendered anywhere; one hook line is the standard (ADR 0037).
    expect(view.getByText(strings.money.habitsEmptyTitle)).toBeTruthy();
    expect(view.queryByText(strings.money.habitsEmptyBody)).toBeNull();

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

  // Categories lives in its own suite (categoriesEmptyState.test.tsx) because
  // it needs the REAL screen: CategoriesContext re-seeds defaults on empty, so
  // the emptiness has to come from the data source. Rendering a bare
  // EmptyState here was a tautology that asserted nothing about the screen.
});

describe('the empty states deliberately left without a CTA', () => {
  // Pace is empty until a month of data exists. No button can shorten that, so
  // offering one would promise something the tap cannot deliver. Empty-state
  // unification pass note: this is now reachable only as a PARTIAL-data
  // state (Insights' "This month" true-zero case renders one fill EmptyState
  // instead of the three-card stack, so PaceCard's own empty never appears
  // then); the "no button" rule stated above is unchanged either way.
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
  // Empty-state unification pass note: same partial-data caveat as Pace
  // above -- this card's own empty only renders once Insights' "This month"
  // segment has cleared monthHasData.
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

// Empty-state unification pass (design/empty-state-unification): finishing
// the EmptyState primitive's rollout so every zero-data surface renders the
// same pane-level treatment (layout="fill") -- centered icon, hook title,
// short body, secondary CTA.
describe('layout="fill" renders the icon on every pane-level surface', () => {
  // The icon is accessibility-hidden by design (EmptyState.tsx), and RNTL
  // excludes hidden elements from queries by default; `{ hidden: true }`
  // opts back in, the same option name the icon's own accessibility state
  // documents itself with (accessibilityElementsHidden).
  const HIDDEN = { hidden: true };

  it('Money > Spent (SpentList, neverLogged)', async () => {
    const view = await renderWith(
      <SpentList sections={[]} onEditExpense={jest.fn()} onLogExpense={jest.fn()} />
    );
    expect(view.getByTestId('empty-state-icon', HIDDEN)).toBeTruthy();
  });

  it('Money > Upcoming (true zero-data)', async () => {
    const view = await renderWith(
      <UpcomingList
        items={[]}
        windowDays={14}
        onWindowDaysChange={jest.fn()}
        onAdd={jest.fn()}
        onEditItem={jest.fn()}
        hasAnyRecurring={false}
      />
    );
    expect(view.getByTestId('empty-state-icon', HIDDEN)).toBeTruthy();
  });

  it('Money > Habits', async () => {
    const view = await renderWith(
      <HabitsList rows={[]} managedMonthlyTotal={0} onBreak={jest.fn()} onOpenHabit={jest.fn()} />
    );
    expect(view.getByTestId('empty-state-icon', HIDDEN)).toBeTruthy();
  });

  // Falls back to the default ChartLine icon: no icon prop is passed.
  it('fill mode defaults the icon even when the caller supplies none', async () => {
    const view = await renderWith(<EmptyState layout="fill" body="body" />);
    expect(view.getByTestId('empty-state-icon', HIDDEN)).toBeTruthy();
  });

  // Inline (the default layout) must NOT gain a default icon: that would
  // shift every existing inline call site that renders no icon today.
  it('inline mode stays icon-less when the caller supplies none', async () => {
    const view = await renderWith(<EmptyState body="body" />);
    expect(view.queryByTestId('empty-state-icon', HIDDEN)).toBeNull();
  });
});

// Zero-state illustrations (ADR 0036). The art replaced a single shared
// ChartLine glyph that seven surfaces rendered identically; these pin the
// three properties that made the swap safe rather than the art itself, which
// is expected to be re-sourced.
describe('illustration', () => {
  const HIDDEN = { hidden: true };

  // Deliberately NOT gated on layout="fill". Today's two zero states are
  // inline (fill's top padding is their quote-to-hook gap), so a layout gate
  // would have left Today on a 28pt glyph beside 96pt siblings.
  it('renders on inline layout, not only on fill', async () => {
    const view = await renderWith(<EmptyState illustration="today-kept" title="t" />);
    expect(view.getByTestId('empty-state-art', HIDDEN)).toBeTruthy();
  });

  // The pinned contract in this file is "a zero state carries a visual mark".
  // Both branches satisfy it, so both answer to the same testID and a caller
  // swapping a glyph for art does not silently drop the mark.
  it('keeps the empty-state-icon contract that the glyph branch satisfies', async () => {
    const view = await renderWith(<EmptyState layout="fill" illustration="money-spent" />);
    expect(view.getByTestId('empty-state-icon', HIDDEN)).toBeTruthy();
  });

  // One mark, never two: art wins and the fill default does not sneak back in
  // underneath it.
  it('suppresses the glyph, including fill mode\'s ChartLine default', async () => {
    const view = await renderWith(
      <EmptyState layout="fill" illustration="insights-scan" icon="Folder" />
    );
    expect(view.getAllByTestId('empty-state-art', HIDDEN)).toHaveLength(1);
    expect(view.getByTestId('empty-state-icon', HIDDEN)).toBeTruthy();
  });

  // Decorative: the title and CTA carry every word a screen reader needs, so
  // the art adds no utterance (same convention as EmojiTile's decorative mode
  // and the glyph it replaced).
  it('is hidden from assistive tech', async () => {
    const view = await renderWith(<EmptyState illustration="money-habits" title="t" />);
    expect(view.queryByTestId('empty-state-art')).toBeNull();
    expect(view.getByTestId('empty-state-art', HIDDEN)).toBeTruthy();
  });

  // Every name in the registry resolves to a real bundled asset. Guards the
  // swap path: replacing one piece of art must not leave a dangling require.
  it('resolves every registered name to a source', async () => {
    const names = Object.keys(EMPTY_ART) as (keyof typeof EMPTY_ART)[];
    expect(names).toHaveLength(7);
    for (const name of names) {
      expect(EMPTY_ART[name]).toBeTruthy();
    }
  });
});

describe('SpentList true zero-data (neverLogged)', () => {
  it('renders no day header at all, only the fill empty state', async () => {
    const view = await renderWith(
      <SpentList sections={[]} onEditExpense={jest.fn()} onLogExpense={jest.fn()} />
    );

    expect(view.getByText(strings.money.spentEmptyTitle)).toBeTruthy();
    // No synthesized "Today" section header, and no day label from any real
    // section either -- there is nothing to group.
    expect(view.queryByText(strings.money.spentToday, { exact: false })).toBeNull();
    expect(view.queryByRole('header')).toBeNull();
  });
});

describe('UpcomingList: true zero-data vs window-empty are two different empties', () => {
  it('true zero-data (no recurring expense at all) hides the total/summary card', async () => {
    const view = await renderWith(
      <UpcomingList
        items={[]}
        windowDays={14}
        onWindowDaysChange={jest.fn()}
        onAdd={jest.fn()}
        onEditItem={jest.fn()}
        hasAnyRecurring={false}
      />
    );

    expect(view.getByText(strings.money.upcomingEmptyTitle)).toBeTruthy();
    expect(view.queryByTestId('upcoming-total-text')).toBeNull();
    expect(view.queryByLabelText(strings.money.upcomingWindowSegmentLabel)).toBeNull();
  });

  it('window-empty (something recurs, just not in this window) keeps the total card', async () => {
    const view = await renderWith(
      <UpcomingList
        items={[]}
        windowDays={14}
        onWindowDaysChange={jest.fn()}
        onAdd={jest.fn()}
        onEditItem={jest.fn()}
        hasAnyRecurring={true}
      />
    );

    expect(view.getByTestId('upcoming-total-text')).toBeTruthy();
    expect(view.getByLabelText(strings.money.upcomingWindowSegmentLabel)).toBeTruthy();
    expect(view.getByText(strings.money.upcomingWindowEmptyBody)).toBeTruthy();
    expect(view.queryByText(strings.money.upcomingEmptyTitle)).toBeNull();
  });
});
