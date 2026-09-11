/**
 * SheetTitle: the pinned title block for DECISION sheets (pick one, break
 * habit, confirm, currency, how it works). Passed through Sheet's `header`
 * slot so the serif title joins the drag zone and stays visible while the
 * body scrolls under it (Charen, 2026-09-10: sticky title, scrollable middle,
 * sticky footer, on every drawer).
 *
 * Deliberately NOT a mode of ui/SheetHeader: the two sheet families stay two
 * components (drawers.md). SheetHeader is "title left, Save right" for form
 * sheets; this is the displayMid decision-moment title with an optional one
 * line caption and no actions, no border, keeping the flowing look those
 * sheets already had in-body.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';

export type SheetTitleProps = {
  title: string;
  caption?: string;
};

export function SheetTitle({ title, caption }: SheetTitleProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.block}>
      <Text
        style={styles.title}
        accessibilityRole="header"
        maxFontSizeMultiplier={1.5}
      >
        {title}
      </Text>
      {caption ? (
        <Text style={styles.caption} maxFontSizeMultiplier={1.5}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    block: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 4,
    },
    title: {
      fontFamily: theme.fonts.display,
      fontSize: typeScale.displayMid,
      lineHeight: 38,
      color: theme.ink,
    },
    caption: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.label,
      lineHeight: 20,
      color: theme.slate,
      marginTop: 4,
    },
  });
}
