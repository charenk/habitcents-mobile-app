/**
 * The recurring-money materializer, planning layer (ADR 0024, U11).
 * utils/materializer.ts is pure; this suite drives it directly (no
 * ExpensesContext/storage involved) so every case is a plain function call.
 * Provider-level wiring (hydration, AppState foreground, tombstone
 * persistence, totals) is covered separately in
 * __tests__/expensesContextMaterializer.test.tsx.
 */
import {
  occurrenceKey,
  planMaterialization,
  toChildInput,
  type MaterializedChildPlan,
} from '@/utils/materializer';
import { occurrencesToMaterialize } from '@/utils/recurring';
import type { Expense } from '@/types/expense';

let seq = 0;
function expense(overrides: Partial<Expense> = {}): Expense {
  seq += 1;
  return {
    id: `parent-${seq}`,
    title: 'Netflix',
    amount: 1599,
    category: 'Software & Subscriptions',
    date: new Date('2026-06-01T00:00:00'),
    time: '12:00 AM',
    isRecurring: false,
    reminderEnabled: false,
    iconVariant: 'yellow',
    ...overrides,
  };
}

function monthly(date: string, overrides: Partial<Expense> = {}): Expense {
  return expense({
    date: new Date(date),
    isRecurring: true,
    recurrence: 'monthly',
    ...overrides,
  });
}

function weekly(date: string, overrides: Partial<Expense> = {}): Expense {
  return expense({
    date: new Date(date),
    isRecurring: true,
    recurrence: 'weekly',
    ...overrides,
  });
}

function child(parent: Expense, date: Date, overrides: Partial<Expense> = {}): Expense {
  return {
    ...expense({ date }),
    id: `child-${parent.id}-${date.toISOString()}`,
    source: 'recurring',
    parentId: parent.id,
    isRecurring: false,
    recurrence: undefined,
    recurrenceRule: undefined,
    ...overrides,
  };
}

describe('occurrencesToMaterialize', () => {
  it('returns nothing for a non-recurring expense', () => {
    expect(occurrencesToMaterialize(expense(), new Date('2026-08-01'))).toEqual([]);
  });

  it("returns nothing for a 'once' schedule", () => {
    const e = expense({ recurrenceRule: { type: 'once' }, date: new Date('2026-07-01') });
    expect(occurrencesToMaterialize(e, new Date('2026-08-01'))).toEqual([]);
  });

  it('returns nothing when the parent has no occurrence yet due (future first date)', () => {
    const e = weekly('2026-09-01'); // in the future relative to `today` below
    expect(occurrencesToMaterialize(e, new Date('2026-08-01'))).toEqual([]);
  });

  it('materializes several missed periods at once (catch-up)', () => {
    // Weekly starting Jun 1 (Mon); today Jul 6 is 5 weeks later.
    const e = weekly('2026-06-01T00:00:00');
    const occ = occurrencesToMaterialize(e, new Date('2026-07-06T12:00:00'));
    expect(occ.map((d) => d.toISOString().slice(0, 10))).toEqual([
      '2026-06-08',
      '2026-06-15',
      '2026-06-22',
      '2026-06-29',
      '2026-07-06',
    ]);
  });

  it('includes an occurrence due exactly today', () => {
    const e = monthly('2026-06-15T00:00:00');
    const occ = occurrencesToMaterialize(e, new Date('2026-07-15T00:00:00'));
    expect(occ).toHaveLength(1);
    expect(occ[0].toISOString().slice(0, 10)).toBe('2026-07-15');
  });

  it('never includes the parent row own first date', () => {
    const e = monthly('2026-06-15T00:00:00');
    const occ = occurrencesToMaterialize(e, new Date('2026-06-15T00:00:00'));
    expect(occ).toEqual([]);
  });

  it('rolls a Jan 31 monthly anchor the same way advance()/nextOccurrence do (Jan 31 -> Mar 3)', () => {
    const e = monthly('2026-01-31T00:00:00'); // legacy monthly: JS overflow roll
    const occ = occurrencesToMaterialize(e, new Date('2026-03-10T00:00:00'));
    const iso = occ.map((d) => d.toISOString().slice(0, 10));
    expect(iso).toContain('2026-03-03'); // Jan 31 + 1 month overflows to Mar 3
    expect(iso[0]).toBe('2026-03-03');
  });

  it('steps a fixed monthDay anchor cleanly through February (last day)', () => {
    const e = expense({
      date: new Date('2026-01-31T00:00:00'),
      recurrenceRule: { type: 'monthly', monthDay: 'last' },
    });
    const occ = occurrencesToMaterialize(e, new Date('2026-04-01T00:00:00'));
    const iso = occ.map((d) => d.toISOString().slice(0, 10));
    // Feb 2026 (not a leap year) -> 28th; Mar -> 31st.
    expect(iso).toEqual(['2026-02-28', '2026-03-31']);
  });

  it('steps an annual expense by full years', () => {
    const e = expense({
      date: new Date('2023-07-15T00:00:00'),
      isRecurring: true,
      recurrence: 'annual',
    });
    const occ = occurrencesToMaterialize(e, new Date('2026-08-01T00:00:00'));
    const iso = occ.map((d) => d.toISOString().slice(0, 10));
    expect(iso).toEqual(['2024-07-15', '2025-07-15', '2026-07-15']);
  });
});

describe('planMaterialization', () => {
  const TODAY = new Date('2026-07-06T09:00:00');

  it('plans one entry per missed occurrence for a single parent', () => {
    const parent = weekly('2026-06-01T00:00:00');
    const plan = planMaterialization([parent], new Set(), TODAY);
    expect(plan).toHaveLength(5);
    expect(plan.every((p) => p.parent.id === parent.id)).toBe(true);
  });

  it('ignores non-recurring rows entirely', () => {
    const plan = planMaterialization([expense()], new Set(), TODAY);
    expect(plan).toEqual([]);
  });

  it('skips a date that already has a materialized child (idempotent against existing children)', () => {
    const parent = weekly('2026-06-01T00:00:00');
    const already = child(parent, new Date('2026-06-08T00:00:00'));
    const plan = planMaterialization([parent, already], new Set(), TODAY);
    const iso = plan.map((p) => p.date.toISOString().slice(0, 10));
    expect(iso).not.toContain('2026-06-08');
    expect(iso).toEqual(['2026-06-15', '2026-06-22', '2026-06-29', '2026-07-06']);
  });

  it('produces the identical plan when called twice against the SAME unmodified list (pure, deterministic)', () => {
    const parent = weekly('2026-06-01T00:00:00');
    const planA = planMaterialization([parent], new Set(), TODAY);
    const planB = planMaterialization([parent], new Set(), TODAY);
    expect(planB.map((p) => p.date.getTime())).toEqual(planA.map((p) => p.date.getTime()));
  });

  it('plans nothing once every occurrence is already materialized (relaunch/foreground re-run)', () => {
    const parent = weekly('2026-06-01T00:00:00');
    const firstPlan = planMaterialization([parent], new Set(), TODAY);
    const children = firstPlan.map((p) => child(parent, p.date));
    const secondPlan = planMaterialization([parent, ...children], new Set(), TODAY);
    expect(secondPlan).toEqual([]);
  });

  it('skips a tombstoned (parentId, date) pair even though it is otherwise due', () => {
    const parent = weekly('2026-06-01T00:00:00');
    const tombstoned = occurrenceKey(parent.id, new Date('2026-06-22T00:00:00'));
    const plan = planMaterialization([parent], new Set([tombstoned]), TODAY);
    const iso = plan.map((p) => p.date.toISOString().slice(0, 10));
    expect(iso).not.toContain('2026-06-22');
    expect(iso).toEqual(['2026-06-08', '2026-06-15', '2026-06-29', '2026-07-06']);
  });

  it('deleting the NEWEST child and tombstoning it does not resurrect it on replan (the case "forward from newest child" would get wrong)', () => {
    const parent = weekly('2026-06-01T00:00:00');
    const firstPlan = planMaterialization([parent], new Set(), TODAY);
    const allChildren = firstPlan.map((p) => child(parent, p.date));
    // Delete the newest child (2026-07-06) and tombstone it, exactly what
    // ExpensesContext.deleteExpense does.
    const newest = allChildren[allChildren.length - 1];
    const remainingChildren = allChildren.filter((c) => c.id !== newest.id);
    const tombstones = new Set([occurrenceKey(parent.id, newest.date)]);

    const replan = planMaterialization([parent, ...remainingChildren], tombstones, TODAY);
    expect(replan).toEqual([]); // NOT regenerated, unlike forward-from-newest-child would do
  });

  it('deleting a MIDDLE child and tombstoning it does not resurrect it, and does not disturb later children', () => {
    const parent = weekly('2026-06-01T00:00:00');
    const firstPlan = planMaterialization([parent], new Set(), TODAY);
    const allChildren = firstPlan.map((p) => child(parent, p.date));
    const middle = allChildren[1]; // 2026-06-15
    const remainingChildren = allChildren.filter((c) => c.id !== middle.id);
    const tombstones = new Set([occurrenceKey(parent.id, middle.date)]);

    const replan = planMaterialization([parent, ...remainingChildren], tombstones, TODAY);
    expect(replan).toEqual([]);
  });

  it('deleting the parent stops future planning but the existing children are simply absent from the parent list, not touched', () => {
    const parent = weekly('2026-06-01T00:00:00');
    const firstPlan = planMaterialization([parent], new Set(), TODAY);
    const children = firstPlan.map((p) => child(parent, p.date));
    // Parent removed from the list (deleteExpense), children remain.
    const replan = planMaterialization(children, new Set(), TODAY);
    expect(replan).toEqual([]); // nothing to plan: no parent row to project from
  });

  it('migrates a legacy flat isRecurring/recurrence row (no recurrenceRule) exactly like a structured one', () => {
    // Shape data/devSeed.ts writes: isRecurring + recurrence, no recurrenceRule.
    const legacy = monthly('2026-04-13T09:00:00');
    const plan = planMaterialization([legacy], new Set(), TODAY);
    const iso = plan.map((p) => p.date.toISOString().slice(0, 10));
    expect(iso).toEqual(['2026-05-13', '2026-06-13']);
  });

  it('edit-mid-history: a rescheduled parent keeps existing children and plans forward from its NEW anchor', () => {
    const parent = weekly('2026-06-01T00:00:00');
    const firstPlan = planMaterialization([parent], new Set(), TODAY);
    const children = firstPlan.map((p) => child(parent, p.date));

    // AddUpcomingSheet's edit path: rewrites date + recurrenceRule in place.
    const edited: Expense = {
      ...parent,
      date: new Date('2026-07-20T00:00:00'),
      isRecurring: true,
      recurrence: 'monthly',
      recurrenceRule: { type: 'monthly', monthDay: '1' },
    };

    const laterToday = new Date('2026-09-05T00:00:00');
    const replan = planMaterialization([edited, ...children], new Set(), laterToday);
    const iso = replan.map((p) => p.date.toISOString().slice(0, 10));
    // New monthly-on-the-1st schedule from the new anchor: Aug 1, Sep 1. The
    // old weekly children are untouched (still in the list, not replanned).
    expect(iso).toEqual(['2026-08-01', '2026-09-01']);
  });

  it('a corrupt/degenerate rule that could repeat a date is still deduped within a single plan call', () => {
    // custom everyNDays clamps to >=2, so this can't truly repeat a date, but
    // the internal existingKeys guard (planMaterialization) should still hold
    // even if occurrencesToMaterialize ever returned a duplicate.
    const parent = expense({
      date: new Date('2026-06-01T00:00:00'),
      recurrenceRule: { type: 'custom', everyNDays: 2 },
    });
    const plan = planMaterialization([parent], new Set(), new Date('2026-06-10T00:00:00'));
    const keys = plan.map((p) => occurrenceKey(p.parent.id, p.date));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('toChildInput', () => {
  it('carries amount/category/merchant from the parent, never the parent schedule', () => {
    const parent = weekly('2026-06-01T00:00:00', {
      merchant: 'Acme Gym',
      category: 'Entertainment',
      amount: 4500,
    });
    const plan: MaterializedChildPlan = { parent, date: new Date('2026-06-08T00:00:00') };
    const input = toChildInput(plan);

    expect(input.amount).toBe(4500);
    expect(input.category).toBe('Entertainment');
    expect(input.merchant).toBe('Acme Gym');
    expect(input.date.getTime()).toBe(new Date('2026-06-08T00:00:00').getTime());
    expect(input.source).toBe('recurring');
    expect(input.parentId).toBe(parent.id);
    expect(input.isRecurring).toBe(false);
    expect(input.recurrenceRule).toBeUndefined();
    expect(input.recurrence).toBeUndefined();
  });
});

describe('occurrenceKey', () => {
  it('is stable across different Date instances for the same local calendar day', () => {
    const a = occurrenceKey('p1', new Date(2026, 5, 8, 3, 0, 0));
    const b = occurrenceKey('p1', new Date(2026, 5, 8, 23, 59, 0));
    expect(a).toBe(b);
  });

  it('differs by parentId', () => {
    const date = new Date('2026-06-08T00:00:00');
    expect(occurrenceKey('p1', date)).not.toBe(occurrenceKey('p2', date));
  });
});


describe('toChildInput import inheritance (queue2 review P2)', () => {
  it('children inherit the parent importId so import undo removes them too', () => {
    const parent = expense({
      id: 'p-import',
      date: new Date('2026-08-03T00:00:00'),
      isRecurring: true,
      recurrenceRule: { type: 'weekly', weekday: 1 },
      importId: 'import-42',
    });
    const plan = planMaterialization([parent], new Set(), new Date('2026-08-11T00:00:00'));
    expect(plan.length).toBeGreaterThan(0);
    expect(toChildInput(plan[0]).importId).toBe('import-42');
  });
});
