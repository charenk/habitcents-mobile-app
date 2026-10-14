/**
 * Bill reminder planning (Tier 1, ops docs/reminders-spec.md).
 *
 * PURE. This module never imports expo-notifications or touches the device;
 * it answers one question: given the store, the preferences, and the
 * permission state, exactly which notifications should exist right now?
 * utils/reminders/sync.ts converges the OS's scheduled set onto this answer.
 * That declarative shape is the whole design: the spec's nine reconciliation
 * events (create, edit, delete, undo, materialize, mark paid, per-bill off,
 * global off, cold start) all collapse into "the inputs changed, replan",
 * so no event needs its own handler and cold start is not a special case.
 *
 * Refusals live here, not in the UI. A month-precision bill is skipped by
 * `precisionOf` (the same read the pane and the materializer use), so the
 * guarantee that no unknown-day bill ever schedules a notification does not
 * depend on the sheet being the only writer (spec section 7).
 */

import { nextOccurrence, precisionOf } from '@/utils/recurring';
import type { Catalog } from '@/utils/i18n';
import type { Expense } from '@/types/expense';

/** One scheduled-notification identifier namespace. The reconciler only ever
 * cancels identifiers carrying this prefix, so nothing else the app (or a
 * library) schedules can become collateral damage of a diff. */
export const REMINDER_ID_PREFIX = 'bill-reminder:';

/**
 * How many future occurrences per bill stay scheduled at once (Charen,
 * 2026-09-25, amending the spec's singular "next occurrence"): rescheduling
 * happens on app open, so a user who never opens the app between occurrences
 * would otherwise get exactly one reminder per bill, ever. Three covers about
 * a quarter of monthly bills unattended and stays far under the iOS cap.
 */
export const REMINDER_HORIZON = 3;

/** iOS keeps only the 64 soonest pending requests; cap deterministically so
 * Android behaves identically and the planner's output is the real set. */
export const MAX_SCHEDULED = 64;

export type ReminderPermission = 'granted' | 'denied' | 'undetermined';

/** Tier 2 preferences. `enabled` is the GLOBAL switch and defaults true in
 * storage: it is a master override, not a second opt-in (spec section 4). */
export type ReminderPrefs = {
  enabled: boolean;
  /** Local time of day the reminder fires, the day before the occurrence. */
  hour: number;
  minute: number;
};

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = { enabled: true, hour: 9, minute: 0 };

export type DesiredReminder = {
  /** `${REMINDER_ID_PREFIX}${billId}:${occISO}`: deterministic, so an
   * unchanged bill diffs to a no-op and an undone delete regenerates the
   * identical identifier. */
  identifier: string;
  /** The day before the occurrence, at prefs.hour:prefs.minute local. */
  fireDate: Date;
  title: string;
  body: string;
  billId: string;
  /** Local 'YYYY-MM-DD' of the occurrence this reminder announces. */
  occDate: string;
};

/** Local 'YYYY-MM-DD', matching utils/recurring.ts's own localISODate: built
 * from local parts so it never shifts a day across the date line. */
function localISODate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function atMidnight(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dayAfter(d: Date): Date {
  const next = atMidnight(d);
  next.setDate(next.getDate() + 1);
  return next;
}

/** The fire moment for one occurrence: the previous day at the preferred
 * time, built from local Y/M/D/h/m fields so DST days keep the wall clock. */
function fireDateFor(occurrence: Date, prefs: ReminderPrefs): Date {
  const fire = new Date(
    occurrence.getFullYear(),
    occurrence.getMonth(),
    occurrence.getDate() - 1,
    prefs.hour,
    prefs.minute,
    0,
    0
  );
  return fire;
}

/**
 * The complete set of notifications that should be scheduled right now.
 *
 * `format` is injected (useCurrency().format) so amounts render in the active
 * currency and this module stays pure and mock-free in tests.
 *
 * Per-bill rules, in refusal order: the global switch or a missing grant
 * empties the whole set; a bill must carry `reminderEnabled`; materialized
 * children (source 'recurring') are history, never schedules; a bill whose
 * day is not known (`precisionOf` !== 'day') is REFUSED here regardless of
 * what the UI stored, per ADR 0042's rule that the app never asserts a day
 * nobody claimed. Then up to REMINDER_HORIZON occurrences, starting tomorrow
 * (an occurrence today cannot be announced "tomorrow" by a reminder that has
 * not fired), each announced the day before at the preferred time. An
 * occurrence whose fire moment is already past is dropped, never fired late:
 * a late notification is a harder claim than silence, and the bill is
 * already visible in Upcoming. Only the first occurrence can hit that case;
 * for a 'once' bill it means no reminder at all.
 */
export function desiredReminders(
  expenses: Expense[],
  prefs: ReminderPrefs,
  permission: ReminderPermission,
  now: Date,
  format: (cents: number) => string,
  strings: Catalog
): DesiredReminder[] {
  if (!prefs.enabled || permission !== 'granted') return [];

  const out: DesiredReminder[] = [];
  const tomorrow = dayAfter(now);

  for (const expense of expenses) {
    if (!expense.reminderEnabled) continue;
    if (expense.source === 'recurring') continue;
    if (precisionOf(expense) !== 'day') continue;

    let from = tomorrow;
    let kept = 0;
    // Only the first occurrence can have a past fire moment (each later fire
    // is strictly later), so HORIZON + 1 probes always suffice; the bound is
    // belt and braces against a corrupt rule.
    for (let probes = 0; kept < REMINDER_HORIZON && probes < REMINDER_HORIZON + 2; probes++) {
      const occ = nextOccurrence(expense, from);
      if (!occ) break;
      from = dayAfter(occ);
      const fireDate = fireDateFor(occ, prefs);
      if (fireDate.getTime() <= now.getTime()) continue;
      out.push({
        identifier: `${REMINDER_ID_PREFIX}${expense.id}:${localISODate(occ)}`,
        fireDate,
        title: expense.title,
        body: strings.reminders.notifBody(format(expense.amount)),
        billId: expense.id,
        occDate: localISODate(occ),
      });
      kept += 1;
    }
  }

  out.sort((a, b) => a.fireDate.getTime() - b.fireDate.getTime());
  return out.slice(0, MAX_SCHEDULED);
}

/**
 * A cheap change marker over exactly the inputs that can alter the desired
 * set, so the provider can skip the native round trip when a commit changed
 * nothing reminders care about (logging a coffee must not re-read the OS's
 * scheduled set). Materialized children and reminder-off bills contribute
 * nothing, matching desiredReminders' own skips. Deliberately NOT sensitive
 * to `now`: the passage of time is handled by the unconditional reconciles
 * on cold start and foreground, which are also when time can have passed.
 */
export function reminderFingerprint(
  expenses: Expense[],
  prefs: ReminderPrefs,
  permission: ReminderPermission
): string {
  const rows: string[] = [];
  for (const e of expenses) {
    if (!e.reminderEnabled || e.source === 'recurring') continue;
    rows.push(
      [
        e.id,
        e.title,
        e.amount,
        new Date(e.date).getTime(),
        e.isRecurring ? 1 : 0,
        e.recurrence ?? '',
        JSON.stringify(e.recurrenceRule ?? null),
        e.datePrecision ?? 'day',
      ].join('|')
    );
  }
  rows.sort();
  return `${prefs.enabled ? 1 : 0}|${prefs.hour}:${prefs.minute}|${permission}::${rows.join(';;')}`;
}
