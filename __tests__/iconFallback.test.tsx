import React from 'react';
import { render } from '@testing-library/react-native';
import { Icon, categoryIconName, CATEGORY_ICON_MAP } from '@/components/ui/Icon';
import { ThemeProvider } from '@/contexts/ThemeContext';
import type { IconName } from '@/components/ui/Icon';

// Stored category.icon strings are not type-checked at runtime, so a lookup
// can miss. A miss used to render undefined as a React element, which throws
// "Element type is invalid" and takes the screen down instead of degrading.
function renderIcon(name: IconName) {
  return render(
    <ThemeProvider>
      <Icon name={name} accessibilityLabel="glyph" />
    </ThemeProvider>
  );
}

describe('Icon fallback', () => {
  it('renders a known glyph', async () => {
    await expect(Promise.resolve(renderIcon('Check'))).resolves.toBeDefined();
  });

  it('does not throw on a name with no glyph', async () => {
    await expect(
      Promise.resolve(renderIcon('NotARealGlyph' as IconName))
    ).resolves.toBeDefined();
  });
});

describe('categoryIconName', () => {
  it('maps every name in the current union', () => {
    for (const [stored, expected] of Object.entries(CATEGORY_ICON_MAP)) {
      expect(categoryIconName(stored)).toBe(expected);
    }
  });

  it('falls back to Ellipsis for a name outside the union', () => {
    expect(categoryIconName('bitcoin-outline')).toBe('Ellipsis');
    expect(categoryIconName('')).toBe('Ellipsis');
    expect(categoryIconName('home')).toBe('Ellipsis');
  });

  it('never returns undefined for arbitrary stored strings', () => {
    for (const stored of ['legacy-icon', 'renamed-later', 'HOME-OUTLINE']) {
      expect(categoryIconName(stored)).toBeDefined();
    }
  });
});
