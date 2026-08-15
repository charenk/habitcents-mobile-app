/**
 * The retired intent route (PRD v3.1 sect 4, ADR 0026).
 *
 * app/onboarding/intent.tsx exists for exactly one reason: installs carry a
 * persisted onboarding step, and the resume table that used to route those
 * steps pointed at this path. A device upgrading mid-flow would otherwise
 * navigate to a screen that no longer exists, which is precisely how build 5
 * crashed (docs/runs.log).
 *
 * That guard had NO coverage after the intentPicker suite was deleted with the
 * screen it tested (review round 3, P2-k). Nothing would have noticed the route
 * being removed, or the Redirect turning into a push and stacking a dead entry
 * behind the carousel.
 */
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: (props: { href: string }) => {
    mockRedirect(props.href);
    return null;
  },
}));

import React from 'react';
import { render, cleanup } from '@testing-library/react-native';
import OnboardingIntentScreen from '@/app/onboarding/intent';

beforeEach(() => mockRedirect.mockClear());
afterEach(cleanup);

describe('the retired intent route', () => {
  it('redirects to the carousel', async () => {
    await render(<OnboardingIntentScreen />);

    expect(mockRedirect).toHaveBeenCalledWith('/onboarding/welcome');
  });

  it('renders nothing of its own, so no dead picker can flash', async () => {
    const view = await render(<OnboardingIntentScreen />);

    expect(view.toJSON()).toBeNull();
  });
});
