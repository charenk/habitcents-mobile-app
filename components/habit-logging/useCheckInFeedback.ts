import { useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import { hapticError, hapticSuccess } from '@/utils/motion';
import { strings } from '@/constants/strings';

/**
 * Feedback for a check-in answer, owned by the screen that owns the write.
 *
 * CheckInCard used to fire the success haptic itself, on tap, before the
 * persist had even started: a skip that failed to save still felt like a kept
 * dollar, and the answer was gone at the next launch. The card cannot know the
 * outcome, so it cannot honestly report one. This hook wraps the context call
 * instead, and only celebrates once the write has resolved.
 *
 * The wait is an AsyncStorage round trip rather than a network one, so the
 * moment stays well inside the ADR 0004-0007 motion budget. The in-flight ref
 * is released in `finally`, so a double tap cannot record two answers while
 * the first is still in the air, and a failure never leaves the card wedged.
 */
export function useCheckInFeedback(): (answer: () => void | Promise<void>) => void {
  const { show } = useToast();
  const inFlightRef = useRef(false);

  return useCallback((answer: () => void | Promise<void>) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    void (async () => {
      try {
        await answer();
        hapticSuccess();
      } catch (error) {
        console.error('Error recording check-in answer:', error);
        hapticError();
        show(strings.toasts.checkInFailed);
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [show]);
}
