/**
 * Sheet (spec 01 section 5). Base bottom sheet: white panel with rounded top
 * corners, a grab handle, and a dimmed scrim, sliding up over 220ms. Built on a
 * transparent RN Modal with animationType="none" so we drive the motion
 * ourselves (Animated + Easing, not reanimated: reanimated inside a Modal is
 * unreliable under the New Architecture).
 *
 * Motion honors prefers-reduced-motion: default is translateY(panelHeight)->0
 * plus a scrim fade; under reduced motion the panel does not translate and only
 * the opacity animates.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, radii, shadows } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { useReducedMotion } from '@/utils/motion';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  avoidKeyboard?: boolean;
  dismissOnScrim?: boolean;
  accessibilityLabel?: string;
};

export function Sheet({
  visible,
  onClose,
  children,
  avoidKeyboard,
  dismissOnScrim,
  accessibilityLabel,
}: SheetProps): React.JSX.Element | null {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // Keep the Modal mounted through the exit animation before unmounting.
  const [rendered, setRendered] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  // Panel height, measured on layout; drives the slide distance. Start with a
  // generous fallback so the first frame is off-screen, not mid-panel.
  const panelHeight = useRef(new Animated.Value(600)).current;
  const measuredHeight = useRef(600);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: motion.sheet,
        easing: Easing.bezier(...motion.easing),
        useNativeDriver: true,
      }).start();
    } else if (rendered) {
      Animated.timing(progress, {
        toValue: 0,
        duration: motion.sheet,
        easing: Easing.bezier(...motion.easing),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!rendered) return null;

  const onPanelLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && h !== measuredHeight.current) {
      measuredHeight.current = h;
      panelHeight.setValue(h);
    }
  };

  const translateY = Animated.multiply(
    panelHeight,
    progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
  );
  const panelAnimatedStyle = reduceMotion
    ? { opacity: progress }
    : { opacity: progress, transform: [{ translateY }] };

  const handleScrimPress = () => {
    if (dismissOnScrim !== false) onClose();
  };

  const panel = (
    <Animated.View
      style={[styles.panel, { paddingBottom: insets.bottom }, panelAnimatedStyle]}
      onLayout={onPanelLayout}
      accessibilityViewIsModal
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.handle} />
      {children}
    </Animated.View>
  );

  return (
    <Modal
      transparent
      statusBarTranslucent
      animationType="none"
      visible
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.scrim, { opacity: progress }]}
          pointerEvents="box-none"
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleScrimPress}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>
        {avoidKeyboard ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            pointerEvents="box-none"
          >
            {panel}
          </KeyboardAvoidingView>
        ) : (
          panel
        )}
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.scrim,
    },
    panel: {
      backgroundColor: theme.white,
      borderTopLeftRadius: radii.feature,
      borderTopRightRadius: radii.feature,
      alignItems: 'stretch',
      ...shadows.sheet,
    },
    handle: {
      width: 36,
      height: 5,
      borderRadius: 999,
      backgroundColor: theme.cloud,
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 4,
    },
  });
}
