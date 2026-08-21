import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  getExpenses,
  saveExpenses,
  getRecurringTombstones,
  saveRecurringTombstones,
} from '@/utils/storage';
import type { Expense, AddExpenseInput, ExpenseCategory } from '@/types/expense';
import { track } from '@/utils/analytics';
import { formatTime as formatTimeLocalized } from '@/utils/dates';
import { occurrenceKey, planMaterialization, toChildInput } from '@/utils/materializer';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function formatTime(date: Date): string {
  // Device locale decides 12h vs 24h (ADA-008); do not force hour12.
  return formatTimeLocalized(date, { hour: 'numeric', minute: '2-digit' });
}

type ExpensesContextValue = {
  expenses: Expense[];
  isLoading: boolean;
  addExpense: (input: AddExpenseInput) => Promise<Expense>;
  /**
   * Write many expenses in one commit. The leak-scan imports used to loop over
   * addExpense, which re-serialized the whole array once per row: 30 writes for
   * one user action, and a failure on row 17 left 16 rows on disk with no
   * honest way to describe what happened. One commit means the import either
   * lands whole or rolls back whole. Fires no per-expense analytics; the
   * import surfaces own that (scan_seed_applied, bills_imported).
   */
  addExpenses: (inputs: AddExpenseInput[]) => Promise<Expense[]>;
  updateExpense: (id: string, updates: Partial<Omit<Expense, 'id'>>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  /**
   * Put a just-deleted expense back where it was (redesign step 04: the
   * "Deleted." toast's Undo action). Position matters because the list is the
   * user's own ordering, so undo must be visually identical to never having
   * deleted. Not a new mutation in analytics terms: it reverses one, so it
   * deliberately fires no event.
   */
  restoreExpense: (expense: Expense, index: number) => Promise<void>;
  getExpenseById: (id: string) => Expense | undefined;
  getExpensesByCategory: (category: ExpenseCategory | 'All') => Expense[];
  getExpensesByDateRange: (start: Date, end: Date) => Expense[];
  getTotalByCategory: (category: ExpenseCategory) => number;
  getTotalSpent: (startDate?: Date, endDate?: Date) => number;
  getExpenseCount: () => number;
};

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

function createExpense(input: AddExpenseInput): Expense {
  const iconVariant = ['Mortgage', 'Utilities', 'Healthcare'].includes(input.category)
    ? 'green'
    : 'yellow';

  return {
    id: generateId(),
    title: input.title,
    amount: input.amount,
    category: input.category,
    categoryId: input.categoryId,
    merchant: input.merchant,
    date: input.date,
    time: formatTime(input.date),
    isRecurring: input.isRecurring,
    recurrence: input.recurrence,
    // Structured recurrence (redesign step 04). Written alongside the legacy
    // isRecurring/recurrence mirrors so old readers keep working; the read path
    // normalizes through utils/recurring resolveRule.
    recurrenceRule: input.recurrenceRule,
    reminderEnabled: input.reminderEnabled,
    reminderTime: input.reminderTime,
    source: input.source ?? 'manual',
    // Leak Scan import undo (importId) and the materializer's own child rows
    // (parentId, ADR 0024 U11) both need to survive the write, not just the
    // fields a manual log ever sets.
    importId: input.importId,
    parentId: input.parentId,
    iconVariant,
  };
}

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mutations read/write through this ref (always the latest committed list)
  // rather than the render closure, so rapid successive edits (double-tap Save,
  // edit-then-delete) each build on the previous result, not a stale copy.
  const expensesRef = useRef<Expense[]>([]);
  const loadedRef = useRef(false);
  // Recurring materializer state (ADR 0024, U11). tombstonesRef mirrors
  // expensesRef's pattern: in-memory source of truth, persisted on write,
  // loaded once at hydration. materializeChainRef serializes overlapping
  // materialize() calls (mount + a foreground event landing close together,
  // or two foreground events in a row) onto ONE queue, so a second call
  // always plans against the first call's already-committed result rather
  // than the same pre-commit snapshot -- the mechanism that makes "same-tick
  // double invocation" produce zero duplicates rather than relying on luck.
  const tombstonesRef = useRef<Set<string>>(new Set());
  const materializeChainRef = useRef<Promise<void>>(Promise.resolve());
  const appStateRef = useRef(AppState.currentState);

  /**
   * The single write funnel. State moves first so the UI stays instant, but a
   * failed persist puts it straight back and rethrows: the list a user is
   * looking at must never contain a row that is not on disk, because these
   * contexts rehydrate from storage on the next cold start and the row would
   * simply vanish. Callers that report success are required to await this.
   */
  const commit = useCallback(async (next: Expense[]): Promise<void> => {
    const previous = expensesRef.current;
    expensesRef.current = next;
    setExpenses(next);
    try {
      await saveExpenses(next);
    } catch (error) {
      expensesRef.current = previous;
      setExpenses(previous);
      throw error;
    }
  }, []);

  // Plans and writes every due-but-unmaterialized recurring occurrence
  // (ADR 0024, U11: utils/materializer.ts). Safe to call as often as it
  // likes -- planMaterialization is a no-op once everything through `today`
  // is already written -- so both the hydration call below and the
  // foreground listener just call it unconditionally rather than trying to
  // decide "is it worth checking".
  const runMaterializer = useCallback(async (): Promise<void> => {
    const prior = materializeChainRef.current;
    const run = prior
      .then(async () => {
        if (!loadedRef.current) return;
        const plan = planMaterialization(expensesRef.current, tombstonesRef.current, new Date());
        if (plan.length === 0) return;
        const children = plan.map((p) => createExpense(toChildInput(p)));
        await commit([...expensesRef.current, ...children]);
      })
      .catch((error) => {
        // Deliberate exception to the speak-up rule now that writes reject
        // (utils/storage.ts write policy): nobody asked for this pass, it has
        // no moment to interrupt, and commit has already rolled the list back.
        // The next foreground or cold start simply replans the same dates.
        console.error('Error running recurring materializer:', error);
      });
    materializeChainRef.current = run;
    await run;
  }, [commit]);

  useEffect(() => {
    async function loadExpenses() {
      const [stored, tombstones] = await Promise.all([getExpenses(), getRecurringTombstones()]);
      expensesRef.current = stored;
      tombstonesRef.current = new Set(tombstones);
      loadedRef.current = true;
      // Runs before the first paint of stored data: catch-up materialization
      // is part of what "loaded" means under ADR 0024, not a second pass that
      // flashes a pre-materialized Spent list first. runMaterializer's own
      // commit() call already does the setExpenses when it writes anything;
      // the explicit setExpenses below covers the (usual) case where nothing
      // was due, since commit is never called in that branch.
      await runMaterializer();
      setExpenses(expensesRef.current);
      setIsLoading(false);
      // Once per session, after hydration, so the count is the real stored one
      // rather than an empty pre-load snapshot (PRD sect 9 / 11). Parents only:
      // materialized children (source 'recurring') are occurrences of a
      // schedule, not schedules, so counting them would inflate this against
      // the very cap decision it exists to inform.
      track('recurring_expense_count', {
        count: expensesRef.current.filter((e) => e.isRecurring && e.source !== 'recurring').length,
      });
    }
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-run on every background -> active transition (mirrors
  // app/_layout.tsx's AnalyticsLifecycle AppState pattern): the day can have
  // turned over while the app was backgrounded, and a relaunch alone
  // wouldn't otherwise catch that until the next cold start.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (prev.match(/inactive|background/) && next === 'active') {
        void runMaterializer();
      }
    });
    return () => sub.remove();
  }, [runMaterializer]);

  const addExpense = useCallback(async (input: AddExpenseInput): Promise<Expense> => {
    const newExpense = createExpense(input);
    // Guard against adding before hydration finished, which would persist a
    // 1-item array over the user's stored history.
    if (!loadedRef.current) {
      expensesRef.current = await getExpenses();
      loadedRef.current = true;
    }
    await commit([newExpense, ...expensesRef.current]);
    track('expense_logged', {
      category: newExpense.category,
      has_merchant: !!newExpense.merchant,
      is_recurring: !!newExpense.isRecurring,
    });
    return newExpense;
  }, [commit]);

  const addExpenses = useCallback(async (inputs: AddExpenseInput[]): Promise<Expense[]> => {
    if (inputs.length === 0) return [];
    // Same hydration guard as addExpense: writing before the stored history
    // has loaded would persist the import over the top of it.
    if (!loadedRef.current) {
      expensesRef.current = await getExpenses();
      loadedRef.current = true;
    }
    const created = inputs.map(createExpense);
    // Newest-first, matching addExpense's single-row ordering.
    await commit([...created.slice().reverse(), ...expensesRef.current]);
    return created;
  }, [commit]);

  const updateExpense = useCallback(async (
    id: string,
    updates: Partial<Omit<Expense, 'id'>>
  ): Promise<void> => {
    const updated = expensesRef.current.map(exp => {
      if (exp.id !== id) return exp;
      return { ...exp, ...updates };
    });
    await commit(updated);
    track('expense_edited', { fields_changed: Object.keys(updates).length });
  }, [commit]);

  const deleteExpense = useCallback(async (id: string): Promise<void> => {
    // A materialized child (ADR 0024, U11) gets tombstoned before it's
    // removed: without this, the next materializer run would recompute the
    // exact same (parentId, date) occurrence from the parent's schedule and
    // silently resurrect the row the user just deleted.
    const target = expensesRef.current.find((exp) => exp.id === id);
    const previousTombstones = tombstonesRef.current;
    if (target?.source === 'recurring' && target.parentId) {
      const key = occurrenceKey(target.parentId, target.date);
      const next = new Set(tombstonesRef.current);
      next.add(key);
      tombstonesRef.current = next;
      // Awaited, not floated: if the tombstone does not land, the next
      // materializer run resurrects the row the user just deleted. Better to
      // fail the delete loudly than to un-delete it silently an hour later.
      try {
        await saveRecurringTombstones(Array.from(next));
      } catch (error) {
        tombstonesRef.current = previousTombstones;
        throw error;
      }
    }
    await commit(expensesRef.current.filter(exp => exp.id !== id));
    track('expense_deleted', {});
  }, [commit]);

  // Undo for deleteExpense. Splices through the same commit ref every other
  // mutation uses, so a restore that lands between two rapid edits still builds
  // on the latest committed list rather than a stale render closure. The index
  // is clamped: the list can legitimately have shrunk while the toast was up.
  const restoreExpense = useCallback(async (
    expense: Expense,
    index: number
  ): Promise<void> => {
    const next = [...expensesRef.current];
    const at = Math.max(0, Math.min(Math.trunc(index), next.length));
    next.splice(at, 0, expense);
    await commit(next);
  }, [commit]);

  const getExpenseById = useCallback((id: string): Expense | undefined => {
    return expenses.find(e => e.id === id);
  }, [expenses]);

  const getExpensesByCategory = useCallback((category: ExpenseCategory | 'All'): Expense[] => {
    if (category === 'All') return expenses;
    return expenses.filter(e => e.category === category);
  }, [expenses]);

  const getExpensesByDateRange = useCallback((start: Date, end: Date): Expense[] => {
    return expenses.filter(e => e.date >= start && e.date <= end);
  }, [expenses]);

  const getTotalByCategory = useCallback((category: ExpenseCategory): number => {
    return expenses
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const getTotalSpent = useCallback((startDate?: Date, endDate?: Date): number => {
    let filtered = expenses;
    if (startDate) {
      filtered = filtered.filter(e => e.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(e => e.date <= endDate);
    }
    return filtered.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const getExpenseCount = useCallback((): number => {
    return expenses.length;
  }, [expenses]);

  const value = useMemo(() => ({
    expenses,
    isLoading,
    addExpense,
    addExpenses,
    updateExpense,
    deleteExpense,
    restoreExpense,
    getExpenseById,
    getExpensesByCategory,
    getExpensesByDateRange,
    getTotalByCategory,
    getTotalSpent,
    getExpenseCount,
  }), [
    expenses, isLoading, addExpense, addExpenses, updateExpense, deleteExpense, restoreExpense,
    getExpenseById, getExpensesByCategory, getExpensesByDateRange,
    getTotalByCategory, getTotalSpent, getExpenseCount,
  ]);

  return (
    <ExpensesContext.Provider value={value}>
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpenses(): ExpensesContextValue {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error('useExpenses must be used within ExpensesProvider');
  return ctx;
}
