/**
 * Tab/switcher geometry (design/PATTERN_VOCABULARY.md, Charen's 2026-08-16
 * call): SegmentedControl and SpentKeptChips are one switching pattern at
 * two scales, a cloud track with a raised white thumb, and both now follow
 * the same nesting rule:
 *
 *     track radius = thumb (segment) radius + track padding
 *
 * Nothing previously pinned either component's radii, so a future edit
 * could reintroduce a mismatched pair (like the old derived
 * `radii.feature - 3` on SpentKeptChips) without any test noticing. These
 * tests read the actual rendered styles and check the relationship itself,
 * not just two hardcoded numbers that would still pass if both values
 * drifted together.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SpentKeptChips } from '@/components/habit-logging/SpentKeptChips';
import { radii } from '@/constants/theme';

const TRACK_PADDING = 3;

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <CurrencyProvider>{children}</CurrencyProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

describe('SegmentedControl geometry (text scale)', () => {
  it('nests the track radius around the segment radius by exactly the track padding', async () => {
    const view = await render(
      <Providers>
        <SegmentedControl
          options={[
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Beta' },
          ]}
          value="a"
          onChange={() => {}}
          accessibilityLabel="Test switcher"
        />
      </Providers>
    );

    const segment = view.getByRole('tab', { name: /^Alpha/ });
    // The tablist View has no accessible={true} of its own (only its
    // Pressable children do), so RNTL's role query can't find it directly;
    // walk up from the segment instead.
    const track = segment.parent;

    const trackRadius = StyleSheet.flatten(track?.props.style).borderRadius;
    const segmentRadius = StyleSheet.flatten(segment.props.style).borderRadius;

    expect(segmentRadius).toBe(radii.card);
    expect(trackRadius).toBe(segmentRadius + TRACK_PADDING);
  });
});

describe('SpentKeptChips geometry (value scale)', () => {
  it('nests the track radius around the segment radius by exactly the track padding', async () => {
    const view = await render(
      <Providers>
        <SpentKeptChips spentCents={500} keptCents={700} value="spent" onChange={() => {}} />
      </Providers>
    );

    const spentChip = view.getByTestId('spent-chip');
    // Same reasoning as the SegmentedControl test above: reach the track via
    // the segment's parent rather than a direct role query.
    const track = spentChip.parent;

    const trackRadius = StyleSheet.flatten(track?.props.style).borderRadius;
    const segmentRadius = StyleSheet.flatten(spentChip.props.style).borderRadius;

    expect(segmentRadius).toBe(radii.feature);
    expect(trackRadius).toBe(segmentRadius + TRACK_PADDING);
  });
});
