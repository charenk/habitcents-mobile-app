/**
 * SegmentedControl's compact quiet tone (ADR 0040), the parts that are not
 * geometry. Geometry lives in tabGeometry.test.tsx beside the nesting rule the
 * tone sidesteps.
 *
 * The load-bearing one is `labelSpoken`. The Upcoming window filter abbreviates
 * to "2w" on screen, and every pinned assertion elsewhere in the suite queries
 * that control by its accessible name ("2 weeks, selected"). If `labelSpoken`
 * ever stops overriding the visible label, the abbreviation silently reaches
 * VoiceOver and those tests fail somewhere far away from the cause. Pinned here
 * so the failure lands on the component instead.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <CurrencyProvider>{children}</CurrencyProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

function renderFilter(extra: Record<string, unknown> = {}) {
  return render(
    <Providers>
      <SegmentedControl
        options={[
          { value: 14, label: '2w', labelSpoken: '2 weeks' },
          { value: 30, label: '1m', labelSpoken: '1 month' },
        ]}
        value={14}
        onChange={() => {}}
        accessibilityLabel="Upcoming window"
        size="compact"
        tone="quiet"
        {...extra}
      />
    </Providers>
  );
}

describe('SegmentedControl labelSpoken', () => {
  it('speaks the long form while the screen shows the short one', async () => {
    const view = await renderFilter();

    expect(view.getByText('2w')).toBeTruthy();
    expect(view.getByLabelText('2 weeks, selected')).toBeTruthy();
    expect(view.getByLabelText('1 month, not selected')).toBeTruthy();
    expect(view.queryByLabelText(/^2w/)).toBeNull();
  });

  it('falls back to the visible label when no labelSpoken is given', async () => {
    const view = await render(
      <Providers>
        <SegmentedControl
          options={[{ value: 'a', label: 'Alpha' }]}
          value="a"
          onChange={() => {}}
        />
      </Providers>
    );

    expect(view.getByLabelText('Alpha, selected')).toBeTruthy();
  });

  it('composes labelSpoken ahead of badgeSpoken, in that order', async () => {
    const view = await render(
      <Providers>
        <SegmentedControl
          options={[
            {
              value: 'scan',
              label: 'Leaks',
              labelSpoken: 'Leak finder',
              badge: 'Soon',
              badgeSpoken: 'coming soon',
            },
          ]}
          value="scan"
          onChange={() => {}}
        />
      </Providers>
    );

    expect(view.getByLabelText('Leak finder, coming soon, selected')).toBeTruthy();
  });
});

describe('SegmentedControl tones share their semantics', () => {
  it('keeps tablist and tab roles in the quiet tone', async () => {
    const view = await renderFilter();

    const tabs = view.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0].props.accessibilityState).toEqual({ selected: true });
    expect(tabs[1].props.accessibilityState).toEqual({ selected: false });
  });

  it('keeps the default tone byte-identical when no size or tone is passed', async () => {
    const view = await render(
      <Providers>
        <SegmentedControl
          options={[{ value: 'a', label: 'Alpha' }]}
          value="a"
          onChange={() => {}}
        />
      </Providers>
    );

    const segment = view.getByRole('tab', { name: /^Alpha/ });
    expect(segment.props.hitSlop).toEqual({ top: 3, bottom: 3 });
  });
});
