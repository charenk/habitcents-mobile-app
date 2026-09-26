/**
 * RemindersProvider wiring: the spec's nine-event reconciliation table
 * (ops docs/reminders-spec.md section 4) proven end to end against a
 * stateful expo-notifications fake, plus cold-start divergence, permission
 * gating, and the "silently dead feature" regression (Tier 2's global
 * default must be ENABLED so a single per-bill toggle actually delivers).
 *
 * The planner's own logic is pinned in __tests__/remindersPlan.test.ts and
 * the diff in __tests__/remindersSync.test.ts; this file proves the provider
 * turns store mutations, prefs changes, permission changes, hydration and
 * foreground events into converged scheduled state.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

jest.mock('expo-notifications', () => {
  const scheduled = new Map<string, { identifier: string; content: unknown; trigger: unknown }>();
  const state = { permission: 'granted', grantOnRequest: true };
  const toResponse = (p: string) => ({
    status: p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'undetermined',
    granted: p === 'granted',
    canAskAgain: p !== 'denied',
  });
  return {
    __scheduled: scheduled,
    __permissionState: state,
    SchedulableTriggerInputTypes: { DATE: 'date' },
    AndroidImportance: { DEFAULT: 3 },
    IosAuthorizationStatus: { NOT_DETERMINED: 0, DENIED: 1, AUTHORIZED: 2, PROVISIONAL: 3, EPHEMERAL: 4 },
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(async () => {}),
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
    getPermissionsAsync: jest.fn(async () => toResponse(state.permission)),
    requestPermissionsAsync: jest.fn(async () => {
      if (state.permission === 'undetermined' && state.grantOnRequest) state.permission = 'granted';
      return toResponse(state.permission);
    }),
  };
});

import React from 'react';
import { AppState, Button, Text } from 'react-native';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ExpensesProvider, useExpenses } from '@/contexts/ExpensesContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { RemindersProvider, useReminders } from '@/contexts/RemindersContext';
import { REMINDER_ID_PREFIX } from '@/utils/reminders/plan';
import { formatMoney } from '@/utils/currency';
import { saveExpenses } from '@/utils/storage';
import type { AddExpenseInput, Expense } from '@/types/expense';

const fake = Notifications as unknown as {
  __scheduled: Map<string, { identifier: string; content: { title?: string; body?: string; data?: Record<string, unknown> }; trigger: unknown }>;
  __permissionState: { permission: string; grantOnRequest: boolean };
};

beforeEach(async () => {
  await AsyncStorage.clear();
  fake.__scheduled.clear();
  fake.__permissionState.permission = 'granted';
  fake.__permissionState.grantOnRequest = true;
  jest.clearAllMocks();
  (AppState as unknown as { currentState: string }).currentState = 'active';
});

afterEach(cleanup);

function daysAhead(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9, 0, 0, 0);
  return d;
}

/** A bill on a 30-day custom cadence anchored `anchorDaysAhead` out, so the
 * first fire moment is always at least a week away regardless of what time
 * of day the suite runs. */
function billInput(overrides: Partial<AddExpenseInput> = {}): AddExpenseInput {
  return {
    title: 'Netflix',
    amount: 1499,
    category: 'Entertainment',
    date: daysAhead(10),
    isRecurring: true,
    recurrenceRule: { type: 'custom', everyNDays: 30 },
    reminderEnabled: true,
    ...overrides,
  };
}

/** Scheduled identifiers owned by the reminder feature. */
function ownedIds(): string[] {
  return Array.from(fake.__scheduled.keys()).filter((k) => k.startsWith(REMINDER_ID_PREFIX));
}

let added: Expense[] = [];
let removedForUndo: { expense: Expense; index: number } | null = null;

function Harness() {
  const { expenses, isLoading, addExpense, updateExpense, deleteExpense, restoreExpense } = useExpenses();
  const { prefs, permission, requestPermission, setGlobalEnabled, setReminderTime } = useReminders();

  return (
    <>
      <Text testID="loading">{isLoading ? 'yes' : 'no'}</Text>
      <Text testID="permission">{permission ?? 'null'}</Text>
      <Text testID="globalEnabled">{prefs.enabled ? 'on' : 'off'}</Text>
      <Text testID="expenseCount">{expenses.length}</Text>
      <Button
        title="add-bill"
        onPress={() => {
          void addExpense(billInput()).then((e) => added.push(e));
        }}
      />
      <Button
        title="add-second-bill"
        onPress={() => {
          void addExpense(billInput({ title: 'Gym', amount: 2500, date: daysAhead(12) })).then((e) =>
            added.push(e)
          );
        }}
      />
      <Button
        title="edit-amount"
        onPress={() => {
          void updateExpense(added[0].id, { amount: 1599 });
        }}
      />
      <Button
        title="edit-date"
        onPress={() => {
          void updateExpense(added[0].id, { date: daysAhead(15) });
        }}
      />
      <Button
        title="toggle-off-first"
        onPress={() => {
          void updateExpense(added[0].id, { reminderEnabled: false });
        }}
      />
      <Button
        title="delete-first"
        onPress={() => {
          const index = expenses.findIndex((e) => e.id === added[0].id);
          removedForUndo = { expense: expenses[index], index };
          void deleteExpense(added[0].id);
        }}
      />
      <Button
        title="restore-deleted"
        onPress={() => {
          if (removedForUndo) void restoreExpense(removedForUndo.expense, removedForUndo.index);
        }}
      />
      <Button
        title="mark-paid-child"
        onPress={() => {
          // handleMarkPaid's exact child shape (app/(tabs)/money.tsx): a spend
          // dated today against the month-precision parent seeded in storage.
          void addExpense({
            title: 'Water bill',
            amount: 4000,
            category: 'Utilities',
            date: new Date(),
            isRecurring: false,
            reminderEnabled: false,
            source: 'recurring',
            parentId: 'month-parent',
          });
        }}
      />
      <Button title="global-off" onPress={() => void setGlobalEnabled(false)} />
      <Button title="global-on" onPress={() => void setGlobalEnabled(true)} />
      <Button title="time-evening" onPress={() => void setReminderTime(20, 0)} />
      <Button title="request-permission" onPress={() => void requestPermission()} />
    </>
  );
}

// Event dispatch happens INSIDE an awaited act, with one settling act after
// (the expensesContextMaterializer.test.tsx rhythm): firing outside act and
// flushing afterwards produces React's "overlapping act() calls" error
// followed by an empty re-render, which is exactly the trap that file's
// unmount comment records.
async function settle() {
  await act(async () => {});
  await act(async () => {});
}

async function renderHarness() {
  const view = await render(
    <LocaleProvider>
      <CurrencyProvider>
        <ExpensesProvider>
          <RemindersProvider>
            <Harness />
          </RemindersProvider>
        </ExpensesProvider>
      </CurrencyProvider>
    </LocaleProvider>
  );
  await settle();
  await waitFor(() => expect(view.getByTestId('loading').props.children).toBe('no'));
  await waitFor(() => expect(view.getByTestId('permission').props.children).not.toBe('null'));
  await settle();
  return view;
}

async function press(view: Awaited<ReturnType<typeof render>>, title: string) {
  await act(async () => {
    fireEvent.press(view.getByText(title));
    await Promise.resolve();
  });
  await settle();
}

beforeEach(() => {
  added = [];
  removedForUndo = null;
});

describe('event 1: bill created with reminders on', () => {
  // 30s timeout: the file's first test pays the suite's one-time render and
  // Intl warmup (~17s on CI-class hardware), not any slowness of its own.
  it('schedules the next three occurrences, day before at 9:00, body in the active currency', async () => {
    const view = await renderHarness();
    await press(view, 'add-bill');

    const ids = ownedIds();
    expect(ids).toHaveLength(3);
    expect(ids.every((id) => id.includes(added[0].id))).toBe(true);

    const first = fake.__scheduled.get(ids[0])!;
    const expectedFire = daysAhead(10);
    expectedFire.setDate(expectedFire.getDate() - 1);
    expectedFire.setHours(9, 0, 0, 0);
    expect(first.content.data?.fireTs).toBe(expectedFire.getTime());
    expect(first.content.body).toBe(`${formatMoney(1499, 'USD')} due tomorrow.`);
    expect(first.content.title).toBe('Netflix');
  }, 30000);

  it('the silently-dead-feature regression: fresh storage (no prefs ever written), one toggle, permission granted, delivery scheduled', async () => {
    // No reminder-prefs key exists; the stored default MUST read enabled.
    const view = await renderHarness();
    expect(view.getByTestId('globalEnabled').props.children).toBe('on');

    await press(view, 'add-bill');
    expect(ownedIds()).toHaveLength(3);
  });
});

describe('event 2: bill edited', () => {
  it('an amount edit rewords every body under the same identifiers', async () => {
    const view = await renderHarness();
    await press(view, 'add-bill');
    const before = ownedIds();

    await press(view, 'edit-amount');

    expect(ownedIds()).toEqual(before);
    for (const id of before) {
      expect(fake.__scheduled.get(id)?.content.body).toBe(`${formatMoney(1599, 'USD')} due tomorrow.`);
    }
  });

  it('a date edit moves the occurrence set: old identifiers cancelled, new ones scheduled', async () => {
    const view = await renderHarness();
    await press(view, 'add-bill');
    const before = new Set(ownedIds());

    await press(view, 'edit-date');

    const after = ownedIds();
    expect(after).toHaveLength(3);
    for (const id of after) expect(before.has(id)).toBe(false);
  });
});

describe('events 3 and 4: delete, then undo', () => {
  it('delete cancels only that bill; undo regenerates the identical identifiers', async () => {
    const view = await renderHarness();
    await press(view, 'add-bill');
    await press(view, 'add-second-bill');
    expect(ownedIds()).toHaveLength(6);
    const firstBillIds = ownedIds().filter((id) => id.includes(added[0].id));

    await press(view, 'delete-first');
    expect(ownedIds()).toHaveLength(3);
    expect(ownedIds().some((id) => id.includes(added[0].id))).toBe(false);
    expect(ownedIds().filter((id) => id.includes(added[1].id))).toHaveLength(3);

    await press(view, 'restore-deleted');
    expect(ownedIds()).toHaveLength(6);
    for (const id of firstBillIds) expect(fake.__scheduled.has(id)).toBe(true);
  });
});

describe('event 5: occurrence materialized into Spent (ADR 0024)', () => {
  it('hydration materializes the due child, schedules only the parent’s future occurrences, and foreground re-runs stay converged', async () => {
    // A weekly bill 8 days old: exactly one occurrence is due (7 days back
    // from its anchor), which hydration materializes as a child row.
    await saveExpenses([
      {
        id: 'weekly-parent',
        title: 'Gym',
        amount: 2500,
        category: 'Entertainment',
        date: daysAgo(8),
        time: '9:00 AM',
        isRecurring: true,
        recurrence: 'weekly',
        reminderEnabled: true,
        iconVariant: 'yellow',
      },
    ]);

    const view = await renderHarness();

    // Parent plus one materialized child.
    expect(view.getByTestId('expenseCount').props.children).toBe(2);
    const ids = ownedIds();
    expect(ids).toHaveLength(3);
    expect(ids.every((id) => id.includes('weekly-parent'))).toBe(true);

    // Foreground twice: the scheduled set is already converged, so nothing
    // is rescheduled and nothing doubles.
    const scheduleCalls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls.length;
    const changeListeners = (AppState.addEventListener as jest.Mock).mock.calls
      .filter(([event]) => event === 'change')
      .map(([, listener]) => listener as (s: string) => void);
    await act(async () => {
      for (const l of changeListeners) l('background');
      for (const l of changeListeners) l('active');
      for (const l of changeListeners) l('background');
      for (const l of changeListeners) l('active');
    });
    await settle();

    expect(ownedIds()).toHaveLength(3);
    expect((Notifications.scheduleNotificationAsync as jest.Mock).mock.calls.length).toBe(scheduleCalls);
  });
});

describe('event 6: unknown-day bill marked paid (ADR 0042)', () => {
  it('a month-precision parent schedules nothing even with stored intent forced on, before and after mark-paid', async () => {
    // A state no UI can produce (the sheet refuses the toggle for unknown-day
    // bills); seeded directly so the scheduler-level refusal is proven
    // independent of the UI, per the spec's "assert both".
    const anchor = new Date();
    anchor.setMonth(anchor.getMonth(), 1);
    const lastOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    await saveExpenses([
      {
        id: 'month-parent',
        title: 'Water bill',
        amount: 4000,
        category: 'Utilities',
        date: lastOfMonth,
        time: '9:00 AM',
        isRecurring: true,
        recurrence: 'monthly',
        recurrenceRule: { type: 'monthly', monthDay: 'last' },
        datePrecision: 'month',
        reminderEnabled: true,
        iconVariant: 'yellow',
      },
    ]);

    const view = await renderHarness();
    expect(ownedIds()).toEqual([]);

    await press(view, 'mark-paid-child');
    expect(view.getByTestId('expenseCount').props.children).toBe(2);
    expect(ownedIds()).toEqual([]);
  });
});

describe('events 7 and 8: per-bill off, global off', () => {
  it('toggling one bill off cancels exactly that bill’s reminders', async () => {
    const view = await renderHarness();
    await press(view, 'add-bill');
    await press(view, 'add-second-bill');

    await press(view, 'toggle-off-first');

    const ids = ownedIds();
    expect(ids).toHaveLength(3);
    expect(ids.every((id) => id.includes(added[1].id))).toBe(true);
  });

  it('global off cancels all owned reminders, leaves foreign identifiers, and global on restores', async () => {
    const view = await renderHarness();
    await press(view, 'add-bill');
    fake.__scheduled.set('other-feature:1', {
      identifier: 'other-feature:1',
      content: { title: 'Foreign' },
      trigger: null,
    });

    await press(view, 'global-off');
    expect(ownedIds()).toEqual([]);
    expect(fake.__scheduled.has('other-feature:1')).toBe(true);

    await press(view, 'global-on');
    expect(ownedIds()).toHaveLength(3);
  });
});

describe('event 9: cold start reconciles the scheduled set against the store', () => {
  it('cancels a stale reminder for a bill no longer stored, schedules the missing ones, leaves foreign identifiers', async () => {
    await saveExpenses([
      {
        id: 'seed-bill',
        title: 'Netflix',
        amount: 1499,
        category: 'Entertainment',
        date: daysAhead(10),
        time: '9:00 AM',
        isRecurring: true,
        recurrenceRule: { type: 'custom', everyNDays: 30 },
        reminderEnabled: true,
        iconVariant: 'yellow',
      },
    ]);
    fake.__scheduled.set(`${REMINDER_ID_PREFIX}ghost-bill:2026-01-01`, {
      identifier: `${REMINDER_ID_PREFIX}ghost-bill:2026-01-01`,
      content: { title: 'Ghost', body: 'stale', data: { fireTs: 1 } },
      trigger: null,
    });
    fake.__scheduled.set('other-feature:1', {
      identifier: 'other-feature:1',
      content: { title: 'Foreign' },
      trigger: null,
    });

    await renderHarness();

    const ids = ownedIds();
    expect(ids).toHaveLength(3);
    expect(ids.every((id) => id.includes('seed-bill'))).toBe(true);
    expect(fake.__scheduled.has('other-feature:1')).toBe(true);
  });
});

describe('permission is a first-class state', () => {
  it('undetermined permission schedules nothing while intent persists; granting via requestPermission delivers with no further taps', async () => {
    fake.__permissionState.permission = 'undetermined';
    const view = await renderHarness();
    expect(view.getByTestId('permission').props.children).toBe('undetermined');

    await press(view, 'add-bill');
    expect(ownedIds()).toEqual([]);
    // The intent itself is stored (the field's whole history is intent capture).
    expect(added[0].reminderEnabled).toBe(true);

    await press(view, 'request-permission');
    expect(view.getByTestId('permission').props.children).toBe('granted');
    expect(ownedIds()).toHaveLength(3);
  });

  it('denied permission schedules nothing and requestPermission does not un-deny it', async () => {
    fake.__permissionState.permission = 'denied';
    const view = await renderHarness();
    await press(view, 'add-bill');
    await press(view, 'request-permission');

    expect(view.getByTestId('permission').props.children).toBe('denied');
    expect(ownedIds()).toEqual([]);
  });

  it('a permission flip in iOS Settings is picked up on foreground', async () => {
    fake.__permissionState.permission = 'denied';
    const view = await renderHarness();
    await press(view, 'add-bill');
    expect(ownedIds()).toEqual([]);

    fake.__permissionState.permission = 'granted';
    const changeListeners = (AppState.addEventListener as jest.Mock).mock.calls
      .filter(([event]) => event === 'change')
      .map(([, listener]) => listener as (s: string) => void);
    await act(async () => {
      for (const l of changeListeners) l('background');
      for (const l of changeListeners) l('active');
    });
    await settle();

    expect(view.getByTestId('permission').props.children).toBe('granted');
    expect(ownedIds()).toHaveLength(3);
  });
});

describe('Tier 2 default time', () => {
  it('changing the preferred time reschedules every reminder at the new hour', async () => {
    const view = await renderHarness();
    await press(view, 'add-bill');

    await press(view, 'time-evening');

    const ids = ownedIds();
    expect(ids).toHaveLength(3);
    for (const id of ids) {
      const fireTs = fake.__scheduled.get(id)?.content.data?.fireTs as number;
      expect(new Date(fireTs).getHours()).toBe(20);
    }
  });
});
