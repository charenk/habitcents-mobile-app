/**
 * Insights' segment pager (2026-09-06).
 *
 * This month and First scan became pages of a horizontal pager, so they can be
 * swiped between as well as tapped. This file pins the swipe half; the tap
 * half is covered by insightsFirstScan, which drives the control by label.
 *
 * The one thing here that Money and Today do not have is the isLoading early
 * return: Insights renders no segmented control and no pager at all until the
 * reports context settles, so the pager mounts late. Its first positioning is
 * silent by design, which is what keeps that late mount from animating a page
 * into view.
 *
 * Provider wiring and the storage/router mocks mirror insightsFirstScan.
 */
jest.setTimeout(20000);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

const mockPush = jest.fn();
const mockNavigate = jest.fn();
jest.mock('expo-router', () => {
  const react = require('react');
  return {
    useRouter: () => ({ push: mockPush, navigate: mockNavigate }),
    useFocusEffect: (callback: () => void | (() => void)) => {
      react.useEffect(() => {
        return callback();
      }, []);
    },
  };
});

const mockGetScanSummary = jest.fn();
jest.mock('@/utils/storage', () => {
  const actual = jest.requireActual('@/utils/storage');
  return { ...actual, getScanSummary: (...args: unknown[]) => mockGetScanSummary(...args) };
});

import React from 'react';
import { Dimensions } from 'react-native';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ToastProvider } from '@/components/ui/Toast';
import { CategoriesProvider } from '@/contexts/CategoriesContext';
import { ExpensesProvider } from '@/contexts/ExpensesContext';
import { HabitsProvider } from '@/contexts/HabitsContext';
import { ReportsProvider } from '@/contexts/ReportsContext';
import InsightsScreen from '@/app/(tabs)/insights';
import { track } from '@/utils/analytics';
import { strings } from '@/constants/strings';
import { selectableLabel } from '@/utils/a11y';

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
          <ToastProvider>
            <CategoriesProvider>
              <ExpensesProvider>
                <HabitsProvider>
                  <ReportsProvider>
                    <OnboardingProvider>{children}</OnboardingProvider>
                  </ReportsProvider>
                </HabitsProvider>
              </ExpensesProvider>
            </CategoriesProvider>
          </ToastProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

type View = Awaited<ReturnType<typeof render>>;

async function renderInsights(): Promise<View> {
  const view = await render(
    <Providers>
      <InsightsScreen />
    </Providers>
  );
  await act(async () => {});
  return view;
}

/** Mirrors a real swipe: the pager has already physically settled on the
 *  page's offset by the time the event fires. */
async function settle(view: View, page: number, event = 'momentumScrollEnd'): Promise<void> {
  await act(async () => {
    fireEvent(view.getByTestId('insights-pager'), event, {
      nativeEvent: { contentOffset: { x: page * windowWidth } },
    });
  });
}

function isSelected(view: View, label: string, selected: boolean): boolean {
  return view.queryByLabelText(selectableLabel(label, selected)) !== null;
}

beforeEach(() => {
  mockTrack.mockClear();
  mockGetScanSummary.mockResolvedValue(null);
});

afterEach(cleanup);

describe('Insights: the segment pager', () => {
  it('mounts once loading clears, defaulting to This month', async () => {
    const view = await renderInsights();

    expect(view.getByTestId('insights-pager')).toBeTruthy();
    expect(isSelected(view, strings.insights.monthSegment, true)).toBe(true);
    expect(isSelected(view, strings.insights.scanSegment, false)).toBe(true);
  });

  it('selects First scan when a swipe settles on the second page', async () => {
    const view = await renderInsights();
    await settle(view, 1);

    expect(isSelected(view, strings.insights.scanSegment, true)).toBe(true);
    expect(mockTrack).toHaveBeenCalledWith('insights_view_switched', {
      to: 'scan',
      method: 'swipe',
    });
  });

  it('reports nothing when a settle lands on the page already showing', async () => {
    const view = await renderInsights();
    await settle(view, 0);

    expect(isSelected(view, strings.insights.monthSegment, true)).toBe(true);
    expect(
      mockTrack.mock.calls.filter(([event]) => event === 'insights_view_switched')
    ).toHaveLength(0);
  });

  // A drag released with no velocity never produces momentum, so the pager
  // reads scrollEndDrag too, and the momentum event a faster release would
  // also deliver drops as a duplicate.
  it('honours a drag that settles without momentum, and counts it once', async () => {
    const view = await renderInsights();
    await settle(view, 1, 'scrollEndDrag');
    await settle(view, 1);

    expect(isSelected(view, strings.insights.scanSegment, true)).toBe(true);
    expect(
      mockTrack.mock.calls.filter(([event]) => event === 'insights_view_switched')
    ).toHaveLength(1);
  });

  it('keeps both panes mounted and hides the one off screen', async () => {
    const view = await renderInsights();
    const hiddenOf = (id: string) =>
      view.getByTestId(id, { includeHiddenElements: true }).props.accessibilityElementsHidden;

    expect(hiddenOf('insights-pane-month')).toBe(false);
    expect(hiddenOf('insights-pane-scan')).toBe(true);

    await settle(view, 1);

    expect(hiddenOf('insights-pane-month')).toBe(true);
    expect(hiddenOf('insights-pane-scan')).toBe(false);
  });
});
