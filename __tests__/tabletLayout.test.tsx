/**
 * routine/ipad plan items 2 and 3: the shared content-column cap and the
 * Sheet panel cap.
 *
 * Jest cannot run RN's flexbox layout engine, so these do not measure actual
 * pixel widths (see dynamicType.test.tsx's own note on the same limit).
 * What they pin instead: the shared style contract itself (`contentMaxWidth`
 * stays 600, `contentColumnStyle` stays `width: '100%'` so phones get no
 * change), and that Sheet's panel actually carries the cap. A real iPad
 * width check is a device-pass item (docs/routines/HANDOFF.md).
 */
import React from 'react';
import { Text } from 'react-native';
import { cleanup, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Sheet } from '@/components/ui/Sheet';
import { contentColumnStyle, layout } from '@/constants/theme';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

function flattenStyle(style: unknown): Record<string, unknown> {
  const styles = Array.isArray(style) ? style.flat(Infinity) : [style];
  return Object.assign({}, ...styles.filter((s): s is Record<string, unknown> => !!s && typeof s === 'object'));
}

afterEach(cleanup);

describe('shared tablet content column (constants/theme.ts)', () => {
  it('caps at 600pt and is a pass-through width below the cap', () => {
    expect(layout.contentMaxWidth).toBe(600);
    expect(contentColumnStyle.width).toBe('100%');
    expect(contentColumnStyle.maxWidth).toBe(layout.contentMaxWidth);
    expect(contentColumnStyle.alignSelf).toBe('center');
  });
});

describe('Sheet panel width (components/ui/Sheet.tsx)', () => {
  it('carries the same cap and centering as the shared content column', async () => {
    const view = await render(
      <Providers>
        <Sheet visible onClose={() => {}} accessibilityLabel="test-sheet-panel">
          <Text>sheet content</Text>
        </Sheet>
      </Providers>
    );

    const panel = view.getByLabelText('test-sheet-panel');
    const flat = flattenStyle(panel.props.style);

    expect(flat.width).toBe('100%');
    expect(flat.maxWidth).toBe(layout.contentMaxWidth);
    expect(flat.alignSelf).toBe('center');
  });
});
