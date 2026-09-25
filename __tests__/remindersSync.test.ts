/**
 * The reminder reconciler's effectful half (utils/reminders/sync.ts): the
 * cancel/schedule diff against a stateful expo-notifications fake, the
 * prefix-ownership rule (never touch a notification the feature does not
 * own), and the content-based diff that survives iOS's trigger read-back
 * divergence (a request scheduled with a date trigger comes back with a
 * calendar-components shape, so the diff must never introspect the trigger).
 */

jest.mock('expo-notifications', () => {
  const scheduled = new Map<string, { identifier: string; content: unknown; trigger: unknown }>();
  return {
    __scheduled: scheduled,
    SchedulableTriggerInputTypes: { DATE: 'date' },
    getAllScheduledNotificationsAsync: jest.fn(async () => Array.from(scheduled.values())),
    scheduleNotificationAsync: jest.fn(
      async ({ identifier, content, trigger }: { identifier?: string; content: unknown; trigger: unknown }) => {
        const id = identifier ?? `auto-${scheduled.size}`;
        scheduled.set(id, { identifier: id, content, trigger });
        return id;
      }
    ),
    cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
      scheduled.delete(id);
    }),
  };
});

import * as Notifications from 'expo-notifications';
import { syncReminders } from '@/utils/reminders/sync';
import { REMINDER_ID_PREFIX, type DesiredReminder } from '@/utils/reminders/plan';

const fake = Notifications as unknown as {
  __scheduled: Map<string, { identifier: string; content: { title?: string; body?: string; data?: Record<string, unknown> }; trigger: unknown }>;
};

function desired(overrides: Partial<DesiredReminder> = {}): DesiredReminder {
  const fireDate = overrides.fireDate ?? new Date(2026, 8, 30, 9, 0, 0, 0);
  return {
    identifier: `${REMINDER_ID_PREFIX}bill-1:2026-10-01`,
    fireDate,
    title: 'Netflix',
    body: 'AMT(1499) due tomorrow.',
    billId: 'bill-1',
    occDate: '2026-10-01',
    ...overrides,
  };
}

/** Seed the fake's scheduled set the way syncReminders itself would write. */
function seedScheduled(d: DesiredReminder, trigger: unknown = { type: 'date', date: d.fireDate }) {
  fake.__scheduled.set(d.identifier, {
    identifier: d.identifier,
    content: {
      title: d.title,
      body: d.body,
      sound: 'default',
      data: { fireTs: d.fireDate.getTime(), billId: d.billId, occDate: d.occDate },
    } as never,
    trigger,
  });
}

beforeEach(() => {
  fake.__scheduled.clear();
  jest.clearAllMocks();
});

describe('scheduling', () => {
  it('schedules a missing desired reminder with the stamped data and a typed date trigger', async () => {
    const want = desired();
    await syncReminders([want]);

    const stored = fake.__scheduled.get(want.identifier);
    expect(stored).toBeDefined();
    expect(stored?.content.data).toEqual({
      fireTs: want.fireDate.getTime(),
      billId: 'bill-1',
      occDate: '2026-10-01',
    });
    expect(stored?.trigger).toEqual({ type: 'date', date: want.fireDate });
  });

  it('an already-matching reminder is left alone: no cancel, no reschedule', async () => {
    const want = desired();
    seedScheduled(want);

    await syncReminders([want]);

    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('the iOS trigger read-back divergence does not force a reschedule: the diff reads only stamped content', async () => {
    const want = desired();
    // What iOS hands back for a date trigger: calendar components, not the
    // DateTriggerInput it was scheduled with.
    seedScheduled(want, { type: 'calendar', dateComponents: { month: 9, day: 30, hour: 9 } });

    await syncReminders([want]);

    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('cancelling', () => {
  it('cancels an owned reminder that is no longer desired', async () => {
    seedScheduled(desired());

    await syncReminders([]);

    expect(fake.__scheduled.size).toBe(0);
  });

  it('NEVER touches identifiers outside its prefix', async () => {
    fake.__scheduled.set('other-feature:1', {
      identifier: 'other-feature:1',
      content: { title: 'Foreign' } as never,
      trigger: null,
    });

    await syncReminders([]);

    expect(fake.__scheduled.has('other-feature:1')).toBe(true);
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });

  it('a changed fire time cancels and reschedules under the same identifier', async () => {
    const old = desired();
    seedScheduled(old);
    const moved = desired({ fireDate: new Date(2026, 8, 30, 20, 0, 0, 0) });

    await syncReminders([moved]);

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(old.identifier);
    const stored = fake.__scheduled.get(moved.identifier);
    expect(stored?.content.data?.fireTs).toBe(moved.fireDate.getTime());
  });

  it('a changed body (amount edit) reschedules; an untouched sibling bill survives', async () => {
    const editing = desired();
    const sibling = desired({
      identifier: `${REMINDER_ID_PREFIX}bill-2:2026-10-05`,
      billId: 'bill-2',
      occDate: '2026-10-05',
      title: 'Gym',
      body: 'AMT(2500) due tomorrow.',
      fireDate: new Date(2026, 9, 4, 9, 0, 0, 0),
    });
    seedScheduled(editing);
    seedScheduled(sibling);

    const reworded = desired({ body: 'AMT(1599) due tomorrow.' });
    await syncReminders([reworded, sibling]);

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(editing.identifier);
    expect(fake.__scheduled.get(editing.identifier)?.content.body).toBe('AMT(1599) due tomorrow.');
    expect(fake.__scheduled.get(sibling.identifier)?.content.body).toBe('AMT(2500) due tomorrow.');
  });

  it('cold-start divergence: one stale cancelled, one missing scheduled, in one pass', async () => {
    const stale = desired({
      identifier: `${REMINDER_ID_PREFIX}deleted-bill:2026-10-01`,
      billId: 'deleted-bill',
    });
    seedScheduled(stale);
    const missing = desired();

    await syncReminders([missing]);

    expect(fake.__scheduled.has(stale.identifier)).toBe(false);
    expect(fake.__scheduled.has(missing.identifier)).toBe(true);
    expect(fake.__scheduled.size).toBe(1);
  });
});
