/**
 * Shared UI primitives for the redesign (spec 01, section 5).
 * Import from '@/components/ui' rather than the individual files.
 */
export { Icon, CATEGORY_ICON_MAP, categoryIconName } from './Icon';
export type { IconName } from './Icon';
export { EmojiTile } from './EmojiTile';
export { AmountDisplay } from './AmountDisplay';
export { AmountField } from './AmountField';
export { Keypad } from './Keypad';
export { Button } from './Button';
export { Sheet } from './Sheet';
export { ConfirmSheet } from './ConfirmSheet';
export type { ConfirmSheetProps } from './ConfirmSheet';
export { ToastProvider, useToast } from './Toast';
export { SegmentedControl } from './SegmentedControl';
export type { SegmentedControlProps } from './SegmentedControl';
export { Chip } from './Chip';
export type { ChipProps, ChipTone } from './Chip';
export { ScreenHeader } from './ScreenHeader';
export type { ScreenHeaderProps, ScreenHeaderAction } from './ScreenHeader';
export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';
