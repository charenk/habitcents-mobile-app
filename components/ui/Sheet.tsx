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
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  findNodeHandle,
  type LayoutChangeEvent,
  type PanResponderGestureState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, radii, shadows } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { useReducedMotion } from '@/utils/motion';
import { useStrings } from '@/utils/i18n';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  avoidKeyboard?: boolean;
  dismissOnScrim?: boolean;
  accessibilityLabel?: string;
  /**
   * Pinned header (usually ui/SheetHeader) rendered inside the drag zone,
   * directly under the grab handle. Drawer feedback (Charen, 2026-09-04):
   * the drag used to live on the 36x5 handle alone, so a finger on the
   * title row moved nothing. With the header in the same zone the whole
   * top of the sheet tracks the finger; the body below stays free for its
   * own ScrollView.
   */
  header?: React.ReactNode;
};

export function Sheet({
  visible,
  onClose,
  children,
  avoidKeyboard,
  dismissOnScrim,
  accessibilityLabel,
  header,
}: SheetProps): React.JSX.Element | null {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const strings = useStrings();
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

  // UX-041: swipe-to-dismiss. The PanResponder is created once (useRef) so it
  // must not close over render-scoped values that change; onClose and the
  // reduce-motion flag are mirrored into refs read live inside the handlers.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;
  // progress at the instant the drag began, so the finger tracks from wherever
  // the panel actually is (e.g. grabbed mid open-animation), not from a
  // presumed fully-open state.
  const dragStartProgress = useRef(1);

  // The gesture drives the SAME `progress` value that the open/close timings
  // drive, and only ever through setValue (during the drag) or a native-driver
  // Animated.spring/timing (on release). There is never a second animation
  // driver on the panel's translate node: translateY is derived from
  // `progress` (native) and `panelHeight` (setValue only), so the single-driver
  // rule from INCIDENT-build5-launch-crash / PATTERN_VOCABULARY holds.
  const panResponder = useRef(
    PanResponder.create({
      // Do not claim on touch-down: a tap on the handle strip should still let
      // its children (and the scrim) behave normally.
      onStartShouldSetPanResponder: () => false,
      // Claim only a clearly-downward drag. Attached to the handle strip only
      // (see render), so a scroll inside the sheet body never reaches here.
      onMoveShouldSetPanResponder: (_evt, g) =>
        g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        // Interruptible: read the live presentation value and start from it.
        progress.stopAnimation((v) => {
          dragStartProgress.current = typeof v === 'number' ? v : 1;
        });
      },
      onPanResponderMove: (_evt, g) => {
        const h = measuredHeight.current || 1;
        // Downward only (clamp upward past the open position): negative dy is
        // ignored so the panel cannot be dragged above open.
        const dyDown = Math.max(0, g.dy);
        const next = dragStartProgress.current - dyDown / h;
        progress.setValue(Math.max(0, Math.min(1, next)));
      },
      onPanResponderRelease: (_evt, g: PanResponderGestureState) => {
        const h = measuredHeight.current || 1;
        const draggedFraction = Math.max(0, g.dy) / h;
        // Dismiss on distance past ~25% OR a downward flick past ~0.5 px/ms.
        const shouldClose = draggedFraction > 0.25 || g.vy > 0.5;
        if (shouldClose) {
          // Reuse the existing close animation: calling onClose flips `visible`
          // false, and the effect below runs the same 220ms native-driver
          // timing from the current dragged position to 0. No extra driver.
          onCloseRef.current();
        } else {
          settleOpen(g.vy, h);
        }
      },
      onPanResponderTerminate: () => settleOpen(0, measuredHeight.current || 1),
    })
  ).current;

  // Spring the panel back to fully open after a released-but-not-dismissed
  // drag. Momentum interaction, so a touch of bounce under normal motion; under
  // reduced motion, a plain timing with no overshoot. Both use the native
  // driver, keeping `progress` single-driver.
  const settleOpen = (releaseVy: number, h: number) => {
    if (reduceMotionRef.current) {
      Animated.timing(progress, {
        toValue: 1,
        duration: motion.sheet,
        easing: Easing.bezier(...motion.easing),
        useNativeDriver: true,
      }).start();
      return;
    }
    // Hand off the finger's velocity. gesture vy is px/ms downward-positive;
    // progress increases as the panel closes the gap upward, so the sign flips
    // and it is scaled into progress-units per second.
    const velocity = (-releaseVy * 1000) / h;
    Animated.spring(progress, {
      toValue: 1,
      velocity,
      damping: 22,
      stiffness: 240,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  };

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
      // Native only: findNodeHandle throws on web ("not supported on web"),
      // which crashed the expo web dev overlay on every sheet open whenever
      // the environment reported a screen reader; web screen readers land on
      // the modal panel through accessibilityViewIsModal on their own.
      if (Platform.OS !== 'web') {
        AccessibilityInfo.isScreenReaderEnabled()
          .then((enabled) => {
            if (!enabled) return;
            setTimeout(() => {
              const node = panelRef.current ? findNodeHandle(panelRef.current) : null;
              if (node) AccessibilityInfo.setAccessibilityFocus(node);
            }, motion.sheet);
          })
          .catch(() => {});
      }
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
       * UX-041 (resolved): the grab handle now backs its promise. The
       * PanResponder above lives on this handle strip only, so a downward drag
       * here tracks the finger and dismisses past threshold, while a scroll in
       * the sheet body is never intercepted. onAccessibilityEscape below still
       * carries screen-reader dismissal.
       */}
      <View
        style={styles.dragZone}
        hitSlop={{ top: 8 }}
        testID="sheet-drag-zone"
        {...panResponder.panHandlers}
      >
        <View style={styles.handleZone}>
          <View style={styles.handle} />
        </View>
        {header}
      </View>
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
    // The one PanResponder lives here: grab handle plus the optional pinned
    // header, so the drag starts anywhere across the top of the sheet.
    dragZone: {
      alignSelf: 'stretch',
    },
    handleZone: {
      alignSelf: 'stretch',
      alignItems: 'center',
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
