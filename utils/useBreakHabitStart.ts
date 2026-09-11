/**
 * useBreakHabitStart: the writes behind BreakHabitSheet's Start button, in one
 * place, so more than one screen can host the sheet.
 *
 * Extracted from app/(tabs)/index.tsx on 2026-09-10 so Money can open the
 * break sheet where the user already is, the same way logging stopped jumping
 * to Today. What moved is the mechanical half: the in-flight guard, the chip
 * to category mapping, seedDiscoveredHabit, the already-breaking check,
 * startBreakingHabit, the optional bought-today expense, and the two toasts.
 *
 * What deliberately did NOT move is Today's door 3 onboarding claim. That
 * claim has to be latched before the awaits and released if they reject
 * (UX-021 and P2-5 review round 3), and getting the ordering wrong meant
 * onboarding could never complete by any route. It stays in Today, which owns
 * it: `door3CoachActive` is set only when Today opens the sheet via the
 * onboarding beat, so no other host can ever be in that state, and giving
 * this hook onboarding callbacks would have handed every future caller a
 * footgun for no benefit.
 *
 * The contract that makes that safe: `start` RESOLVES to whether the writes
 * went through, and never throws. A caller latching anything of its own can
 * latch before the call and release on a false result, which is exactly the
 * ordering the original had.
 */
import { useCallback, useRef } from 'react';
import { useCategories } from '@/contexts/CategoriesContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useHabits } from '@/contexts/HabitsContext';
import { useToast } from '@/components/ui/Toast';
import { strings } from '@/constants/strings';
import { VICE_CATEGORIES } from '@/constants/onboardingPresets';
import type { BreakHabitStartData } from '@/components/onboarding/BreakHabitSheet';
import type { ExpenseCategory } from '@/types/expense';

/** Monthly-equivalent multiplier for the seeded habit's totalMonthlySpend.
 *  The same approx-month convention the rest of the app uses (weekly * 52/12);
 *  the honest yearly line on the sheet itself uses exact 365/52/12 instead,
 *  since that is what is actually shown to the user. */
function monthlyMultiplier(cadence: BreakHabitStartData['cadence']): number {
  if (cadence === 'daily') return 30;
  if (cadence === 'weekly') return 52 / 12;
  return 1;
}

export function useBreakHabitStart() {
  const { seedDiscoveredHabit, startBreakingHabit } = useHabits();
  const { addExpense } = useExpenses();
  const { getCategoryByName } = useCategories();
  const { show } = useToast();

  // Two things this guards, both from the stack review:
  // 1. A double tap on the async Start button must not create two habits.
  // 2. A caller that latches its own state before calling can rely on exactly
  //    one run being in flight.
  const inFlightRef = useRef(false);

  /**
   * Runs the writes. Resolves true when the habit is running (including the
   * already-breaking case, where a habit is running either way), false when
   * a write rejected or a run was already in flight. Never throws.
   */
  const start = useCallback(
    async (data: BreakHabitStartData): Promise<boolean> => {
      if (inFlightRef.current) return false;
      inFlightRef.current = true;
      // UX-021: seedDiscoveredHabit, startBreakingHabit and addExpense are all
      // async writes and all can reject. Without try/finally a rejection left
      // the guard stuck true, which permanently disabled the Start button for
      // the rest of the session with no error surfaced.
      try {
        // Impulse habits are custom-like (Charen, 2026-09-10): the typed name
        // is the identity and the dedupe key, so a premium user can break
        // "Amazon" and "Target" as two habits. The glyph lookup misses for
        // them (habitLeakGlyph keys on the preset id) and falls back to the
        // category emoji; category itself stays the impulse preset's.
        const merchantPattern =
          data.chipId === 'custom' || data.chipId === 'impulse' ? data.name : data.chipId;
        const category: ExpenseCategory =
          data.chipId === 'custom' ? 'Other' : VICE_CATEGORIES[data.chipId];
        const categoryId =
          getCategoryByName(category)?.id ?? getCategoryByName('Other')?.id ?? 'Other';

        const habit = await seedDiscoveredHabit({
          merchantPattern,
          name: data.name,
          description: '',
          categoryId,
          averageAmount: data.amountCents,
          frequency: data.cadence,
          occurrencesPerPeriod: 1,
          totalMonthlySpend: Math.round(data.amountCents * monthlyMultiplier(data.cadence)),
        });

        // seedDiscoveredHabit protects live habits: re-picking one the user is
        // already breaking returns it unchanged. Starting it again would
        // append an orphan goal (stack review finding 2), so say so and stop.
        // A bought-today yes below still writes the expense, which is an
        // honest statement regardless.
        const alreadyBreaking = habit.status === 'changing' || habit.status === 'tracking';
        if (alreadyBreaking) {
          show(strings.today.alreadyBreakingToast);
        } else {
          await startBreakingHabit(habit.id, data.amountCents, data.valueEdited, 'onboarding');
        }

        if (data.boughtToday) {
          await addExpense({
            title: data.name,
            amount: data.amountCents,
            category,
            categoryId,
            merchant: data.name,
            date: new Date(),
            isRecurring: false,
            reminderEnabled: false,
          });
        }
        return true;
      } catch (error) {
        // The guard resets in finally, so the button comes back; this tells
        // the user why nothing happened instead of leaving a silent no-op
        // behind a button that just went live again.
        console.error('useBreakHabitStart failed', error);
        show(strings.toasts.startHabitFailed);
        return false;
      } finally {
        inFlightRef.current = false;
      }
    },
    [seedDiscoveredHabit, startBreakingHabit, addExpense, getCategoryByName, show]
  );

  return { start };
}
