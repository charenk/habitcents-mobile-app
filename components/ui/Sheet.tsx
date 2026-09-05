/**
 * Sheet (spec 01 section 5). Base bottom sheet: white panel with rounded top
 * corners, a grab handle, and a dimmed scrim, sliding up over 220ms. Built on a
 * transparent RN Modal with animationType="none" so we drive the motion
 * ourselves (Animated + Easing, not reanimated: reanimated inside a Modal is
 * unreliable under the New Architecture).
 *
 * Structure (Charen, 2026-09-10, the pattern for every drawer): pinned title
 * area inside the drag zone, a scrolling body, a pinned footer. The panel is
 * clamped to at most 80% of the window, and with the software keyboard up it
 * is clamped to the visible strip above the keyboard (utils/sheetLayout.ts)
 * instead of being pushed off the top the way the old KeyboardAvoidingView
 * wrapper did. The keyboard lift is plain layout (marginBottom) on a wrapper
 * node: `progress` and its native-driver translateY stay the single animation
 * driver on the panel's transform, untouched.
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
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  findNodeHandle,
  useWindowDimensions,
  type LayoutChangeEvent,
  type PanResponderGestureState,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, radii, shadows } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { useReducedMotion } from '@/utils/motion';
import { useKeyboardHeight } from '@/utils/keyboard';
import { sheetMaxHeight } from '@/utils/sheetLayout';
import { ScrollFade } from '@/components/ui/ScrollFade';
import { useStrings } from '@/utils/i18n';

/**
 * Shorter than the Today panes' 36: that fade covers a 24pt end padding, this
 * one only has to carry a glyph's height across the header's hairline, and a
 * tall fade over a form would wash out the first field.
 */
const SHEET_TOP_FADE_HEIGHT = 20;

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  dismissOnScrim?: boolean;
  accessibilityLabel?: string;
  /**
   * Pinned header rendered inside the drag zone, directly under the grab
   * handle: ui/SheetHeader for form sheets, ui/SheetTitle for decision
   * sheets. Drawer feedback (Charen, 2026-09-04): the drag used to live on
   * the 36x5 handle alone, so a finger on the title row moved nothing. With
   * the header in the same zone the whole top of the sheet tracks the
   * finger; the body below stays free for its own scroll.
   */
  header?: React.ReactNode;
  /**
   * Pinned below the body: the thumb-zone CTAs of a decision sheet, or the
   * expense sheet's iOS Done bar. Owns the bottom safe-area inset; the
   * keyboard supersedes that inset so the footer sits flush on it.
   */
  footer?: React.ReactNode;
  /**
   * The body is a Sheet-owned ScrollView by default so every sheet scrolls
   * under the clamp. Pass false when the children bring their own scroller
   * (a FlatList) - the body becomes a plain shrinkable View.
   */
  scrollable?: boolean;
  /** Forwarded to the internal ScrollView's contentContainerStyle. */
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export function Sheet({
  visible,
  onClose,
  children,
  dismissOnScrim,
  accessibilityLabel,
  header,
  footer,
  scrollable = true,
  contentContainerStyle,
}: SheetProps): React.JSX.Element | null {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { height: windowHeight } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight();
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
  const scrollRef = useRef<ScrollView | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  // Panel height, measured on layout; drives the slide distance. Start with a
  // generous fallback so the first frame is off-screen, not mid-panel. The
  // keyboard clamp changes the measured height; onPanelLayout re-fires and
  // the slide distance and drag threshold recompute from the new value.
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

  // Keep the focused input visible once the clamp lands. RN's scroll
  // responder does the measuring; the rAF lets the shrunken layout settle
  // first. Covers mid-body fields (the break sheet's name input); sheets that
  // lead with their amount field are already at content top.
  useEffect(() => {
    if (!scrollable || keyboardHeight <= 0) return;
    const input = TextInput.State.currentlyFocusedInput?.();
    const scrollNode = scrollRef.current;
    if (!input || !scrollNode) return;
    const responder = scrollNode.getScrollResponder?.();
    const raf = requestAnimationFrame(() => {
      responder?.scrollResponderScrollNativeHandleToKeyboard?.(
        input,
        12,
        !reduceMotionRef.current
      );
    });
    return () => cancelAnimationFrame(raf);
  }, [keyboardHeight, scrollable]);

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

  const maxHeight = sheetMaxHeight(windowHeight, insets.top, keyboardHeight);
  // The bottom-most fixed element owns the safe-area inset, and the keyboard
  // supersedes it (the keyboard IS the bottom edge then). This is what
  // retired ExpenseSheet's -insets.bottom Done-bar hack.
  const panelPaddingBottom = footer ? 0 : keyboardHeight > 0 ? 0 : insets.bottom;
  const footerPaddingBottom = keyboardHeight > 0 ? 12 : Math.max(insets.bottom, 12);

  const body = scrollable ? (
    <ScrollView
      ref={scrollRef}
      style={styles.body}
      contentContainerStyle={contentContainerStyle}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.body}>{children}</View>
  );

  // A pinned header slices whatever scrolls under it on its own hairline. On a
  // 40pt serif amount that reads as a rendering fault rather than as content
  // scrolling away (C9, seen on the edit-bill sheet). Same fade the Today
  // panes use against the dock, mirrored: opaque at the header, clear below.
  // Only with a header, only when the body actually scrolls, and only over the
  // sheet's own white, never the page background the fade defaults to.
  const bodyWithFade =
    header && scrollable ? (
      <View style={styles.bodyWrap}>
        {body}
        <ScrollFade edge="top" color={theme.white} height={SHEET_TOP_FADE_HEIGHT} />
      </View>
    ) : (
      body
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
        {/*
          The keyboard lift: plain layout on this wrapper, never a second
          driver on the panel's animated transform. On Android the translucent
          Modal ignores adjustResize, so the shared hook's overlap math is
          what moves the sheet.
        */}
        <View style={{ marginBottom: keyboardHeight }} pointerEvents="box-none">
          <Animated.View
            ref={panelRef}
            style={[
              styles.panel,
              { maxHeight, paddingBottom: panelPaddingBottom },
              panelAnimatedStyle,
            ]}
            onLayout={onPanelLayout}
            accessibilityViewIsModal
            accessibilityLabel={accessibilityLabel}
            // UX-024: accessibilityViewIsModal hides the sibling scrim "Close"
            // pressable from VoiceOver, so the two-finger-Z dismiss gesture is
            // the only way a screen-reader user can back out without that
            // control. Wire it to the same onClose the scrim uses.
            onAccessibilityEscape={onClose}
          >
            {/*
             * UX-041 (resolved): the grab handle now backs its promise. The
             * PanResponder above lives on this handle strip only, so a
             * downward drag here tracks the finger and dismisses past
             * threshold, while a scroll in the sheet body is never
             * intercepted. onAccessibilityEscape below still carries
             * screen-reader dismissal.
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
            {bodyWithFade}
            {footer ? (
              <View
                style={[styles.footer, { paddingBottom: footerPaddingBottom }]}
                testID="sheet-footer"
              >
                {footer}
              </View>
            ) : null}
          </Animated.View>
        </View>
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
    // Content-sized until the panel clamp binds, then it shrinks and scrolls.
    // flexGrow stays 0 so a short sheet never stretches to the cap.
    bodyWrap: {
      // The ScrollView keeps its own flex; this only gives the fade something
      // to anchor to without changing the panel's layout.
      flexShrink: 1,
    },
    body: {
      flexGrow: 0,
      flexShrink: 1,
      alignSelf: 'stretch',
    },
    // The scroll-under edge: a cloud hairline matching SheetHeader's bottom
    // edge, so content visibly slides beneath the pinned footer.
    footer: {
      alignSelf: 'stretch',
      paddingHorizontal: 20,
      paddingTop: 12,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: theme.cloud,
    },
  });
}
