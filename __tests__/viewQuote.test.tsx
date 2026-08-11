/**
 * ViewQuote (U6, components/today/ViewQuote.tsx): the rotating quote block
 * that opens Kept or closes Spent on Today. Isolated component test, no
 * screen-level wiring -- __tests__/todayQuoteRibbonPlacement.test.tsx covers
 * placement and rotation in the full Today screen.
 */
import React from 'react';
import { cleanup, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ViewQuote } from '@/components/today/ViewQuote';
import type { TodayQuote } from '@/constants/strings';

// render() returns a promise in this RTL version; an async wrapper that
// simply returns it flattens automatically, so callers `await renderQuote(...)`
// for the resolved query object (same trick __tests__/spentList.test.tsx's
// renderSpent uses).
async function renderQuote(quote: TodayQuote) {
  return render(
    <ThemeProvider>
      <ViewQuote quote={quote} />
    </ThemeProvider>
  );
}

afterEach(cleanup);

describe('ViewQuote', () => {
  it('wraps the quote text in real curly double quotes', async () => {
    const view = await renderQuote({ text: 'A skipped purchase is the quietest way to get paid.' });
    expect(view.getByText('“A skipped purchase is the quietest way to get paid.”')).toBeTruthy();
  });

  it('renders the attribution line when by is present', async () => {
    const view = await renderQuote({ text: 'Whatever you have, spend less.', by: 'Samuel Johnson' });
    expect(view.getByText('Samuel Johnson')).toBeTruthy();
  });

  it('renders no attribution line when by is absent', async () => {
    const view = await renderQuote({ text: "The cheapest thing you'll buy today is the one you don't." });
    expect(view.queryByText('Samuel Johnson')).toBeNull();
  });

  it('the accessible label is the quote text plus the attribution when present', async () => {
    const view = await renderQuote({
      text: 'Take care of the pence, and the pounds will take care of themselves.',
      by: 'William Lowndes',
    });
    expect(
      view.getByLabelText(
        'Take care of the pence, and the pounds will take care of themselves., William Lowndes'
      )
    ).toBeTruthy();
  });

  it('the accessible label is just the quote text when there is no attribution', async () => {
    const view = await renderQuote({ text: "A habit doesn't feel expensive. That's how it stays one." });
    expect(view.getByLabelText("A habit doesn't feel expensive. That's how it stays one.")).toBeTruthy();
  });

  it('renders the whole block as one accessibility element, not two', async () => {
    // The quote + attribution wrapper carries accessible + accessibilityLabel
    // together (FirstRunRibbon's message-wrapper grammar); querying by the
    // combined label proves it collapses to a single stop rather than two.
    const view = await renderQuote({ text: 'Habit is a cable; we weave a thread of it each day.', by: 'Horace Mann' });
    const node = view.getByLabelText('Habit is a cable; we weave a thread of it each day., Horace Mann');
    expect(node.props.accessible).toBe(true);
  });
});
