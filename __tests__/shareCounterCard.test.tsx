/**
 * ShareCounterCard (P4-3, components/ShareCounterCard.tsx): the branded card
 * captured for the native share sheet. Isolated render test only; the
 * capture + share wiring lives in app/share-card.tsx and is covered by
 * __tests__/shareCardScreen.test.tsx.
 */
import React from 'react';
import { cleanup, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ShareCounterCard } from '@/components/ShareCounterCard';

afterEach(cleanup);

async function renderCard(amount: string, days: number) {
  return render(
    <ThemeProvider>
      <ShareCounterCard amount={amount} days={days} />
    </ThemeProvider>
  );
}

describe('ShareCounterCard', () => {
  it('renders the exact "I kept $X in Y days" headline', async () => {
    const view = await renderCard('$12.00', 30);
    expect(view.getByText('I kept $12.00 in 30 days.')).toBeTruthy();
  });

  it('renders the wordmark', async () => {
    const view = await renderCard('$5.00', 1);
    expect(view.getByText('habitcents')).toBeTruthy();
  });

  it('pluralizes "day" correctly for a single-day count', async () => {
    const view = await renderCard('$5.00', 1);
    expect(view.getByText('I kept $5.00 in 1 day.')).toBeTruthy();
  });
});
