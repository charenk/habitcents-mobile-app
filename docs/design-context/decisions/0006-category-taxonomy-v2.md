# 0006. Category taxonomy v2: 10 spend categories plus non-spend row classes

- **Date:** 2026-07-04
- **Status:** Accepted
- **Area:** Product / Engineering
- **Deciders:** Charen (adopted as proposed, 2026-07-04; `docs/design-package-phase2/07-decisions-needed.md` item 1)

## Context
The Leak Scan's Stage 7 category mapping and the onboarding Leak Audit seeding both write categories, so the taxonomy had to land before either build starts to avoid a migration. The app had 9 categories and no way to represent transfers, income, or untracked cash without polluting spend totals.

## Decision
1. **10 user-facing spend categories:** Mortgage/Rent (display rename of Mortgage, same id, icon, color), Car, Food, Shopping, Utilities, Healthcare, Transportation, Entertainment, Software & Subscriptions (new; icon `card-outline`, color #26A69A teal), Other.
2. **Non-spend classes are a `class` field on rows** (`spend | transfer | income | cash`), never categories: they never appear in the category picker and never count in spend totals. The Leak Scan writes them; manual logs are always `spend`.
3. **Migration:** none beyond adding Software & Subscriptions to `DEFAULT_CATEGORIES`; existing expenses keep their category ids. Leak Scan keyword mapping: streaming, SaaS, and app-store recurring go to Software & Subscriptions; rent keywords go to Mortgage/Rent.

## Alternatives considered
- Folding subscriptions into Entertainment/Utilities: keeps 9 chips but destroys the Leak Scan's most valuable detection class (recurring software spend).
- Making Transfers/Income full categories: they would corrupt spend totals and the category picker for zero user benefit.

## Consequences
- Easier: Leak Scan Stage 7 has an unambiguous target list; onboarding subscription presets seed directly into Software & Subscriptions.
- Harder / cost: 10 chips is one more than today on the log form; usage-based ordering keeps the form fast. `ExpenseCategory` type and `DEFAULT_CATEGORIES` need the addition; row `class` needs a type extension defaulting to `spend`.
