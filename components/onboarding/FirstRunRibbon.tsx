/**
 * FirstRunRibbon (W2, "the app is the onboarding"): the first-run message
 * band under Today's log. The component itself became the shared
 * ui/InfoRibbon pattern (Charen's Today annotations, 2026-09-04); this file
 * stays as the door-flow name for it so the onboarding units and their
 * tests keep reading naturally. Same props, same look, dismissible variant.
 */
export { InfoRibbon as FirstRunRibbon } from '@/components/ui/InfoRibbon';
export type { InfoRibbonProps as FirstRunRibbonProps } from '@/components/ui/InfoRibbon';
