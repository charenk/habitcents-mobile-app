import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Retired by the carousel (PRD v3.1 sect 4, ADR 0026): the intent picker's
 * three cards became the carousel's three beats, on the welcome route.
 *
 * The route stays REGISTERED rather than deleted, and that is the whole point
 * of this file. Installs carry a persisted `currentStep`, and the resume table
 * that used to route those steps pointed here; a device upgrading mid-flow
 * would otherwise navigate to a screen that no longer exists. That is exactly
 * how build 5 crashed (docs/runs.log: a stale persisted value routing to gone
 * code), and the cost of preventing it a second time is this eight-line file.
 *
 * Redirect, not push, so the retired step cannot stack a dead entry behind the
 * carousel.
 */
export default function OnboardingIntentScreen() {
  return <Redirect href="/onboarding/welcome" />;
}
