/**
 * The recurring-money materializer (ADR 0024, U11).
 *
 * Old model: one stored row per recurring expense, dated at its FIRST
 * occurrence. Money > Spent showed the row once its date passed; Upcoming
 * projected the next occurrence from the same row. The two predicates
 * overlapped on the due date (the row appeared in both tabs), and after that
 * day passed the row stranded at its original date forever -- occurrences
 * 2..n were never recorded, so history was understated.
 *
 * New model (ADR 0024): a due occurrence becomes a REAL written expense
 * record, source 'recurring', carrying `parentId`. Money > Spent is the
 * single source of truth for user-added plus scheduled-come-due money.
 *
 * This file is PURE planning only: `planMaterialization` never touches
 * storage or ExpensesContext. The only write path is
 * ExpensesContext.addExpense, same as every other mutation in this app (see
 * the runner in contexts/ExpensesContext.tsx, which calls this at hydration
 * and on every foreground).
 *
 * IDEMPOTENCY: a planned child is keyed by (parentId, occurrence date). A
 * date is skipped if EITHER:
 *   1. a materialized child for that exact (parentId, date) pair already
 *      exists in `expenses` (any row with a `parentId`, keyed by its own
 *      `date`), or
 *   2. that pair is tombstoned.
 *
 * Tombstone vs. "plan only forward from the newest child": the newest-child
 * approach was considered and rejected. It breaks the moment the NEWEST
 * child is the one the user deletes -- planning forward from the new
 * "newest" (now older) child would regenerate exactly the occurrence just
 * removed, violating "deleting a child must not be rewritten" for that one
 * position in the sequence. A tombstone remembers the deletion regardless of
 * where it falls in the history, so every delete-child case is correct, not
 * just the ones that happen to not be the latest. The tombstone set is a
 * small array of composite keys in AsyncStorage (utils/storage.ts
 * getRecurringTombstones/saveRecurringTombstones); ExpensesContext.
 * deleteExpense adds an entry when the deleted row is itself a materialized
 * child.
 *
 * MIGRATION: no separate migration step exists or is needed. The first run
 * under this engine sees a recurring parent with zero materialized children
 * and walks its schedule from the parent's own date to today, producing
 * every missed occurrence in one pass -- the exact same code path a normal
 * catch-up run takes after the app was simply closed for a while. Legacy
 * flat `isRecurring` + `recurrence` rows (no `recurrenceRule`, e.g. rows
 * data/devSeed.ts writes) plan identically: `resolveRule`'s legacy mapping
 * (utils/recurring.ts) normalizes them before this file ever sees them.
 *
 * EDIT-MID-HISTORY: editing a parent's schedule (AddUpcomingSheet) rewrites
 * its own `date`/`recurrenceRule` in place but never touches previously
 * materialized children -- they are real history and stay exactly as
 * written. The next planning pass reads the PARENT'S CURRENT date/rule via
 * `resolveRule` and walks forward from there; any date it computes that
 * happens to coincide with an already-materialized child is skipped by rule
 * 1 above, and any date that doesn't coincide is simply new. Nothing here
 * ever rewrites or deletes an existing row.
 */
import type { AddExpenseInput, Expense } from '@/types/expense';
import { occurrencesToMaterialize } from '@/utils/recurring';

export type MaterializedChildPlan = {
  parent: Expense;
  date: Date;
};

/** Local 'YYYY-MM-DD', matching utils/recurring.ts's own localISODate: built
 *  from local calendar parts so it never shifts a day across a UTC offset. */
function localISODate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** The dedupe/tombstone key for one (parentId, occurrence date) pair. */
export function occurrenceKey(parentId: string, date: Date): string {
  return `${parentId}|${localISODate(date)}`;
}

/**
 * The child expense records to write, given the full current expense list,
 * the tombstoned (parentId, date) pairs, and today. Pure: same inputs -> same
 * plan, every time, including calling this twice in a row with the SAME
 * `expenses` (idempotent by construction) -- a caller that writes plan A and
 * then replans without first merging plan A's children back into `expenses`
 * would get plan A again, not an empty plan. ExpensesContext's runner avoids
 * that by committing each plan's children before any later run can start
 * (see its materialize serialization).
 */
export function planMaterialization(
  expenses: Expense[],
  tombstones: ReadonlySet<string>,
  today: Date = new Date()
): MaterializedChildPlan[] {
  // Parents: recurring rows that are not themselves materialized children.
  // Belt-and-suspenders only -- a materialized child never carries
  // isRecurring/recurrenceRule (see toChildInput below), so
  // occurrencesToMaterialize already returns [] for one on its own; this
  // filter just skips the resolveRule call and documents the invariant.
  const parents = expenses.filter((e) => e.source !== 'recurring');

  // Already-materialized (parentId, date) pairs, so a second planning pass
  // over the same data can never duplicate a child.
  const existingKeys = new Set<string>();
  for (const e of expenses) {
    if (e.parentId) existingKeys.add(occurrenceKey(e.parentId, e.date));
  }

  const out: MaterializedChildPlan[] = [];
  for (const parent of parents) {
    for (const date of occurrencesToMaterialize(parent, today)) {
      const key = occurrenceKey(parent.id, date);
      if (existingKeys.has(key) || tombstones.has(key)) continue;
      out.push({ parent, date });
      existingKeys.add(key); // a corrupt/degenerate rule could otherwise repeat a date
    }
  }
  return out;
}

/**
 * A planned child, shaped as the AddExpenseInput ExpensesContext.addExpense
 * writes through. NEVER carries isRecurring/recurrenceRule: a materialized
 * child is a plain dated spend, not itself a schedule -- treating it as one
 * would make planMaterialization loop over its own output. Amount/category/
 * merchant are read from the parent's CURRENT fields at planning time, so an
 * edited parent's later occurrences reflect the edit while earlier
 * materialized children (already written) keep whatever the parent looked
 * like when THEY were planned.
 */
export function toChildInput(plan: MaterializedChildPlan): AddExpenseInput {
  const { parent, date } = plan;
  return {
    title: parent.title,
    amount: parent.amount,
    category: parent.category,
    categoryId: parent.categoryId,
    merchant: parent.merchant,
    date,
    isRecurring: false,
    reminderEnabled: false,
    source: 'recurring',
    parentId: parent.id,
  };
}
