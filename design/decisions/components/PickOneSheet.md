# PickOneSheet (components/habit-logging/PickOneSheet.tsx)

## Direction (current)
The commitment moment for breaking a leak: name, evidence, one skip-value number, "Start breaking it". PROPS ARE FROZEN in spirit (five call sites render it: Today, habit detail, Insights, Money, the scan results ladder) but grow by optional addition when a real gap needs it, never by breaking an existing caller.

## States
Ungated (amount entry, live Start), gated free tier (habit-limit reached on the free plan: leak still visible, upgrade CTA, "Maybe later"), gated premium-at-ceiling (habit-limit reached on premium: leak still visible, no upgrade CTA, single dismiss). Reach the gated states via the habit-limit gate on any of the five call sites.

## Decisions
- 2026-09-05 (routine/core-p3 run 4): added an optional `entitlement?: Entitlement` prop so the gated state can tell a free user from a premium user already at the real 5-habit ceiling. Before this, a premium user hitting the ceiling saw the identical free-tier upsell pitch (price, "See Premium"), which is dishonest (they are already paying) and pitches nothing they can buy. Rejected: a second sheet component, since the only change is which strings and buttons render inside the same gated layout.

## Open
None open from this change; the gate is entitlement-driven and unit-tested for both branches (__tests__/pickOneSheet.test.tsx).

## Iterations
- 2026-09-05: gated state splits on `entitlement` (premium-at-ceiling gets `ceilingTitle`/`ceilingBody`/`ceilingDismiss`, no price line, no upgrade CTA). All five call sites (Today, Money, Insights, habit detail, useTrackLeak) pass the reactive `useEntitlement()` value through.
