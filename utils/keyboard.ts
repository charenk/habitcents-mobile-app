/**
 * Shared software-keyboard height, as the keyboard's overlap with the
 * current window (0 when hidden).
 *
 * Why overlap math instead of trusting the event's height field: the app's
 * sheets live in a transparent Modal with statusBarTranslucent, which on
 * Android ignores adjustResize, so the keyboard overlaps without resizing
 * the window. Computing `windowHeight - endCoordinates.screenY` is correct
 * there, and it self-corrects to ~0 if some configuration does resize the
 * window (useWindowDimensions shrinks with it).
 *
 * iOS subscribes keyboardWillChangeFrame so QuickType/accessory-bar frame
 * changes and the floating iPad keyboard are covered, not just show/hide.
 * Android has no will* events; did* is what exists, and the visual jump it
 * implies is hidden behind the keyboard's own animation.
 *
 * This replaces ExpenseSheet's local iOS-only useKeyboardVisible hook and is
 * the one keyboard subscription the Sheet primitive relies on.
 */
import { useEffect, useState } from 'react';
import { Keyboard, Platform, useWindowDimensions, type KeyboardEvent } from 'react-native';

export function keyboardOverlap(windowHeight: number, screenY: number): number {
  return Math.max(0, Math.round(windowHeight - screenY));
}

export function useKeyboardHeight(): number {
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const onFrame = (e: KeyboardEvent) => {
      setKeyboardHeight(keyboardOverlap(windowHeight, e.endCoordinates.screenY));
    };
    const onHide = () => setKeyboardHeight(0);

    const subscriptions =
      Platform.OS === 'ios'
        ? [Keyboard.addListener('keyboardWillChangeFrame', onFrame)]
        : [
            Keyboard.addListener('keyboardDidShow', onFrame),
            Keyboard.addListener('keyboardDidHide', onHide),
          ];
    return () => {
      for (const sub of subscriptions) sub.remove();
    };
  }, [windowHeight]);

  return keyboardHeight;
}
