/**
 * CategoryChipRow: the one-row, sideways-scrolling category rail that
 * replaces CategoryTilePicker inside ExpenseSheet (U2, the expense drawer
 * rebuild). CategoryTilePicker itself stays in the codebase; AddUpcomingSheet
 * still renders its emoji-tile grid unchanged (git grep verified before this
 * file was written), so only its stored-name helpers (`toExpenseCategory`,
 * `isCategorySelected`) are reused here, not the grid component.
 *
 * Chips read emoji + label, radius 999, min 44pt touch height. Selected uses
 * Chip's `tone="soft"` (sage-light fill + sage border + ink text) rather than
 * the app's usual solid-sage selection, so the label under it never has to
 * fight a sage background for legibility, and so it matches the drawer's
 * recent-merchant chips, which take the same tone (ExpenseSheet.tsx).
 *
 * The right-edge fade is a deliberate second gradient in the app (the
 * PATTERN_VOCABULARY.md rule: "the only gradient in the app is the premium
 * upsell card's" predates this build's approved spec, which calls for the
 * fade explicitly). Named here and in the PR body rather than silently
 * breaking the rule.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { type LayoutChangeEvent, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Chip } from '@/components/ui/Chip';
import { categoryEmoji } from '@/constants/categoryEmoji';
import type { AppTheme } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import type { Category } from '@/types/category';
import type { ExpenseCategory } from '@/types/expense';
import { withAlpha } from '@/utils/color';
import { isCategorySelected, toExpenseCategory } from './CategoryTilePicker';

const EDGE_FADE_WIDTH = 28;
/** Left margin the auto-scroll leaves before the selected chip, so it isn't
 *  flush against the sheet's gutter once it scrolls into view. */
const SCROLL_LEAD_IN = 20;

export type CategoryChipRowProps = {
  categories: Category[];
  value: ExpenseCategory | null;
  onChange: (next: ExpenseCategory) => void;
  /**
   * Scrolls the selected chip into view once per true->false->true edge.
   * ExpenseSheet passes `visible && mode === 'edit'`, so a fresh log open
   * never auto-scrolls (there is usually nothing selected yet to scroll to).
   */
  scrollToSelected?: boolean;
};

export function CategoryChipRow({
  categories,
  value,
  onChange,
  scrollToSelected = false,
}: CategoryChipRowProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const scrollRef = useRef<ScrollView>(null);
  const positions = useRef<Map<string, number>>(new Map());
  const didAutoScroll = useRef(false);

  useEffect(() => {
    if (!scrollToSelected) {
      // Reset for the next time the sheet opens on an edit.
      didAutoScroll.current = false;
      return;
    }
    if (didAutoScroll.current || !value) return;
    const selected = categories.find((c) => toExpenseCategory(c.name) === value);
    if (!selected) return;
    const x = positions.current.get(selected.id);
    if (x == null) return;
    didAutoScroll.current = true;
    scrollRef.current?.scrollTo({ x: Math.max(0, x - SCROLL_LEAD_IN), animated: false });
  }, [scrollToSelected, value, categories]);

  const recordPosition = useCallback(
    (id: string) => (e: LayoutChangeEvent) => {
      positions.current.set(id, e.nativeEvent.layout.x);
    },
    []
  );

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {categories.map((category) => {
          const selected = isCategorySelected(category, value);
          return (
            <View key={category.id} onLayout={recordPosition(category.id)}>
              <Chip
                label={category.name}
                emoji={categoryEmoji(category.name)}
                selected={selected}
                tone="soft"
                pill
                onPress={() => onChange(toExpenseCategory(category.name))}
              />
            </View>
          );
        })}
      </ScrollView>
      <LinearGradient
        colors={[withAlpha(theme.white, 0), theme.white]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        pointerEvents="none"
        style={styles.fade}
      />
    </View>
  );
}

function createStyles(_theme: AppTheme) {
  return StyleSheet.create({
    wrap: {
      position: 'relative',
    },
    content: {
      flexDirection: 'row',
      gap: 8,
      paddingRight: EDGE_FADE_WIDTH + 12,
    },
    fade: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: EDGE_FADE_WIDTH,
    },
  });
}
