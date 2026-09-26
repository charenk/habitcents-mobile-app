/**
 * Share counter card v1 (roadmap P4-3): "share sheet exports a branded card;
 * PostHog tracks shares." Reachable from Profile's General group.
 *
 * The branded ShareCounterCard renders on-screen (never off-screen: no
 * layout pass is needed to capture a mounted, visible view), react-native-
 * view-shot captures it to a local PNG, and expo-sharing hands that file to
 * the native share sheet. Nothing here leaves the device except through that
 * OS-level share action, same posture as the rest of the app (no network
 * calls in app source).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useToast } from '@/components/ui/Toast';
import { ShareCounterCard } from '@/components/ShareCounterCard';
import { spacing, layout, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useHabits } from '@/contexts/HabitsContext';
import { useTheme } from '@/contexts/ThemeContext';
import { hapticError, hapticSelection } from '@/utils/motion';
import { computeShareCardStats } from '@/utils/shareCard';
import { track } from '@/utils/analytics';

export default function ShareCardScreen(): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { show } = useToast();
  const { format } = useCurrency();
  const { goals } = useHabits();
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const stats = useMemo(() => computeShareCardStats(goals, new Date()), [goals]);

  useEffect(() => {
    track('share_card_opened', {});
  }, []);

  const handleShare = async () => {
    if (!cardRef.current || sharing) return;
    hapticSelection();
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        hapticError();
        show(strings.shareCard.shareFailed);
        return;
      }
      await Sharing.shareAsync(uri);
      track('share_card_shared', {});
    } catch {
      hapticError();
      show(strings.shareCard.shareFailed);
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={strings.shareCard.title} onBack={() => router.back()} />
      {stats ? (
        <View style={styles.content}>
          <ShareCounterCard
            ref={cardRef}
            amount={format(stats.keptCents)}
            days={stats.days}
          />
          <Button
            label={strings.shareCard.shareCta}
            onPress={() => {
              void handleShare();
            }}
            disabled={sharing}
            style={styles.shareButton}
          />
        </View>
      ) : (
        <View style={styles.empty}>
          <EmptyState
            title={strings.shareCard.emptyTitle}
            body={strings.shareCard.emptyBody}
            icon="Share2"
            layout="fill"
          />
        </View>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.gutter,
      paddingBottom: layout.screenBottomClearance,
      gap: spacing.xxl,
    },
    shareButton: {
      alignSelf: 'stretch',
    },
    empty: {
      flex: 1,
    },
  });
}
