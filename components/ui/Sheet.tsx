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
  AccessibilityInfo,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  findNodeHandle,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, radii, shadows } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { useReducedMotion } from '@/utils/motion';
import { strings } from '@/constants/strings';

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
  // The panel node, so VoiceOver focus can be moved onto the sheet when it
  // opens (spec 09 section 3 flow 2). accessibilityViewIsModal already stops
  // focus escaping to the screen behind, but nothing put it INSIDE: a screen
  // reader user opening a sheet was left wherever they had been, with no
  // announcement that anything had appeared. setAccessibilityFocus was used
  // nowhere in the app before this.
  const panelRef = useRef<View | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  // Panel height, measured on layout; drives the slide distance. Start with a
  // generous fallback so the first frame is off-screen, not mid-panel.
  const panelHeight = useRef(new Animated.Value(600)).current;
  const measuredHeight = useRef(600);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      // No setValue(0) here. Animated.timing already starts from the current
      // value, and slamming progress to 0 first made a reopen during the 220ms
      // close snap the panel off-screen before sliding it back up. Reachable on
      // the core loop: save a spend, then tap the field again to log a second
      // one while the sheet is still closing. After a completed close progress
      // is already 0, so the reset only ever cost the interrupt case.
      Animated.timing(progress, {
        toValue: 1,
        duration: motion.sheet,
        easing: Easing.bezier(...motion.easing),
        useNativeDriver: true,
      }).start();
      // After the enter animation, not before it: iOS drops a focus request
      // aimed at a node that is still off-screen. Guarded on the screen
      // reader being on so nothing changes for everyone else, and wrapped
      // because findNodeHandle returns null for an unmounted panel.
      AccessibilityInfo.isScreenReaderEnabled()
        .then((enabled) => {
          if (!enabled) return;
          setTimeout(() => {
            const node = panelRef.current ? findNodeHandle(panelRef.current) : null;
            if (node) AccessibilityInfo.setAccessibilityFocus(node);
          }, motion.sheet);
        })
        .catch(() => {});
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
      ref={panelRef}
      style={[styles.panel, { paddingBottom: insets.bottom }, panelAnimatedStyle]}
      onLayout={onPanelLayout}
      accessibilityViewIsModal
      accessibilityLabel={accessibilityLabel}
      // UX-024: accessibilityViewIsModal hides the sibling scrim "Close"
      // pressable from VoiceOver, so the two-finger-Z dismiss gesture is the
      // only way a screen-reader user can back out without that control.
      // Wire it to the same onClose the scrim uses.
      onAccessibilityEscape={onClose}
    >
      {/*
       * UX-041: this handle promises a swipe-to-dismiss gesture the sheet does
       * not implement (no PanResponder/gesture-handler wiring exists in this
       * file), and app/(tabs)/index.tsx documents "backdrop, swipe" as if both
       * dismiss paths exist. The pattern vocabulary mandates the handle but
       * not the gesture, so this is a real system gap, not a local bug. Do
       * not add a pan gesture here without an ADR (new motion behaviour);
       * this is flagged for Charen to pick: (a) add swipe-to-dismiss, or
       * (b) drop the handle since it currently over-promises.
       */}
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
            // UX-046: reuse the existing shared string instead of a hardcoded
            // literal.
            accessibilityLabel={strings.common.close}
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
