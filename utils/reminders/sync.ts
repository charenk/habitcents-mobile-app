/**
 * Converge the OS's scheduled-notification set onto the planner's answer.
 *
 * This file, permission.ts and setup.ts are the ONLY modules that import
 * expo-notifications; everything upstream is pure (utils/reminders/plan.ts).
 *
 * Ownership rule: only identifiers carrying REMINDER_ID_PREFIX are ever read
 * into the diff or cancelled, so nothing else the app or a library schedules
 * can be collateral damage. Never call cancelAllScheduledNotificationsAsync.
 *
 * Diff rule: match on identifier plus the content we stamped at schedule time
 * (data.fireTs, title, body), NEVER the read-back trigger. iOS returns a
 * calendar-components shape for date triggers, so the trigger a request was
 * scheduled with is not the trigger that comes back.
 */

import * as Notifications from 'expo-notifications';
import { REMINDER_ID_PREFIX, type DesiredReminder } from '@/utils/reminders/plan';

/** What the reconciler needs to know about one scheduled request. */
type OwnedRequest = {
  identifier: string;
  fireTs: number | null;
  title: string | null;
  body: string | null;
};

function toOwnedRequest(req: Notifications.NotificationRequest): OwnedRequest {
  const data = req.content?.data as Record<string, unknown> | undefined;
  const fireTs = typeof data?.fireTs === 'number' ? data.fireTs : null;
  return {
    identifier: req.identifier,
    fireTs,
    title: req.content?.title ?? null,
    body: req.content?.body ?? null,
  };
}

/**
 * Cancel every owned notification that should not exist (or whose fire time
 * or wording changed), then schedule every desired one that is missing.
 * Throws on native failure; the caller's serialized chain catches and logs
 * (the materializer's degrade-with-a-comment precedent: nobody asked for
 * this pass, and the next reconcile replans the same set).
 */
export async function syncReminders(desired: DesiredReminder[]): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const owned = new Map<string, OwnedRequest>();
  for (const req of all) {
    if (req.identifier?.startsWith(REMINDER_ID_PREFIX)) {
      owned.set(req.identifier, toOwnedRequest(req));
    }
  }

  const wanted = new Map(desired.map((d) => [d.identifier, d]));

  for (const [identifier, existing] of owned) {
    const want = wanted.get(identifier);
    const matches =
      want !== undefined &&
      existing.fireTs === want.fireDate.getTime() &&
      existing.title === want.title &&
      existing.body === want.body;
    if (!matches) {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      owned.delete(identifier);
    }
  }

  for (const want of desired) {
    if (owned.has(want.identifier)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: want.identifier,
      content: {
        title: want.title,
        body: want.body,
        sound: 'default',
        data: {
          fireTs: want.fireDate.getTime(),
          billId: want.billId,
          occDate: want.occDate,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: want.fireDate,
      },
    });
  }
}
