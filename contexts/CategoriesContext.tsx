import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { getCategories, saveCategories } from '@/utils/storage';
import type { Category, CategoryIcon } from '@/types/category';
import { DEFAULT_CATEGORIES } from '@/types/category';

type CategoriesContextValue = {
  categories: Category[];
  isLoading: boolean;
  addCategory: (name: string, icon: CategoryIcon, color: string, monthlyBudget?: number) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Omit<Category, 'id' | 'isDefault' | 'createdAt'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  hideCategory: (id: string) => Promise<void>;
  showCategory: (id: string) => Promise<void>;
  getCategoryById: (id: string) => Category | undefined;
  getCategoryByName: (name: string) => Category | undefined;
  getVisibleCategories: () => Category[];
  getDefaultCategories: () => Category[];
  getCustomCategories: () => Category[];
};

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

function generateId(): string {
  return `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function initializeDefaultCategories(): Category[] {
  return DEFAULT_CATEGORIES.map((cat, index) => ({
    ...cat,
    id: `default-${index}`,
    createdAt: new Date(),
  }));
}

// Display renames of DEFAULT seed rows (Charen, 2026-09-04): stored default
// categories carry the display name from whenever they were seeded, so a
// rename of DEFAULT_CATEGORIES only ever reaches fresh installs on its own.
// This map renames already-persisted default rows once at load. Applies to
// isDefault rows only; a custom category the user happened to give one of
// these names keeps it. Stored ExpenseCategory values are untouched
// ('Mortgage' / 'Software & Subscriptions' stay on the rows, ADR 0006).
const DEFAULT_RENAMES: Record<string, string> = {
  Mortgage: 'Home', // pre-taxonomy-v2 seeds never renamed to Mortgage/Rent
  'Mortgage/Rent': 'Home',
  'Software & Subscriptions': 'Subscriptions',
};

function renameStoredDefaults(stored: Category[]): { next: Category[]; changed: boolean } {
  let changed = false;
  const next = stored.map((cat) => {
    const newName = cat.isDefault ? DEFAULT_RENAMES[cat.name] : undefined;
    if (!newName) return cat;
    changed = true;
    return { ...cat, name: newName };
  });
  return { next, changed };
}

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UX-057: mirror of `categories` for same-tick read-after-write, same
  // commit pattern as ExpensesContext.expensesRef / commit(). A rapid add
  // followed immediately by a rename each ran off the `categories` render
  // closure before this: the rename's setCategories([...])  could commit
  // before React re-rendered the add's setCategories, so the rename's map()
  // (built from the pre-add closure) silently dropped the just-added
  // category when it persisted. Every mutator now reads/writes through
  // categoriesRef via commit(), so each call always builds on the previous
  // call's already-committed result.
  const categoriesRef = useRef<Category[]>([]);

  useEffect(() => {
    async function loadCategories() {
      const stored = await getCategories();
      if (stored.length === 0) {
        // Initialize with defaults
        const defaults = initializeDefaultCategories();
        // Hydration, not a user action: if the first-run seed cannot be
        // written there is no moment to interrupt and nothing to undo, so the
        // session runs on the in-memory defaults and the next launch retries.
        try {
          await saveCategories(defaults);
        } catch (error) {
          console.error('Error seeding default categories:', error);
        }
        categoriesRef.current = defaults;
        setCategories(defaults);
      } else {
        // One-time display rename of persisted default rows; hydration, not a
        // user action, so a failed persist just retries next launch while the
        // session runs on the renamed rows in memory (same policy as the seed
        // write above).
        const { next, changed } = renameStoredDefaults(stored);
        if (changed) {
          try {
            await saveCategories(next);
          } catch (error) {
            console.error('Error persisting default category renames:', error);
          }
        }
        categoriesRef.current = next;
        setCategories(next);
      }
      setIsLoading(false);
    }
    loadCategories();
  }, []);

  /**
   * Optimistic, then honest: state moves first so the UI stays instant, and a
   * failed persist puts it back and rethrows rather than leaving a category on
   * screen that would be gone at the next cold start. Same contract as
   * ExpensesContext's commit; see the write policy in utils/storage.ts.
   */
  const commit = useCallback(async (next: Category[]): Promise<void> => {
    const previous = categoriesRef.current;
    categoriesRef.current = next;
    setCategories(next);
    try {
      await saveCategories(next);
    } catch (error) {
      categoriesRef.current = previous;
      setCategories(previous);
      throw error;
    }
  }, []);

  const addCategory = useCallback(async (
    name: string,
    icon: CategoryIcon,
    color: string,
    monthlyBudget?: number
  ): Promise<Category> => {
    const newCategory: Category = {
      id: generateId(),
      name,
      icon,
      color,
      isDefault: false,
      isHidden: false,
      createdAt: new Date(),
      monthlyBudget,
    };
    const updated = [...categoriesRef.current, newCategory];
    await commit(updated);
    return newCategory;
  }, [commit]);

  const updateCategory = useCallback(async (
    id: string,
    updates: Partial<Omit<Category, 'id' | 'isDefault' | 'createdAt'>>
  ): Promise<void> => {
    const updated = categoriesRef.current.map(cat =>
      cat.id === id ? { ...cat, ...updates } : cat
    );
    await commit(updated);
  }, [commit]);

  const deleteCategory = useCallback(async (id: string): Promise<void> => {
    const category = categoriesRef.current.find(c => c.id === id);
    if (category?.isDefault) {
      throw new Error('Cannot delete default categories');
    }
    const updated = categoriesRef.current.filter(cat => cat.id !== id);
    await commit(updated);
  }, [commit]);

  const hideCategory = useCallback(async (id: string): Promise<void> => {
    await updateCategory(id, { isHidden: true });
  }, [updateCategory]);

  const showCategory = useCallback(async (id: string): Promise<void> => {
    await updateCategory(id, { isHidden: false });
  }, [updateCategory]);

  // Getters stay read-through-state (not the ref): they back render decisions
  // (e.g. list filters), so they should reflect the same `categories` value
  // the rest of a render sees, matching ExpensesContext's getExpenseById etc.
  const getCategoryById = useCallback((id: string): Category | undefined => {
    return categories.find(c => c.id === id);
  }, [categories]);

  const getCategoryByName = useCallback((name: string): Category | undefined => {
    return categories.find(c => c.name.toLowerCase() === name.toLowerCase());
  }, [categories]);

  const getVisibleCategories = useCallback((): Category[] => {
    return categories.filter(c => !c.isHidden);
  }, [categories]);

  const getDefaultCategories = useCallback((): Category[] => {
    return categories.filter(c => c.isDefault);
  }, [categories]);

  const getCustomCategories = useCallback((): Category[] => {
    return categories.filter(c => !c.isDefault);
  }, [categories]);

  const value = useMemo(() => ({
    categories,
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
    hideCategory,
    showCategory,
    getCategoryById,
    getCategoryByName,
    getVisibleCategories,
    getDefaultCategories,
    getCustomCategories,
  }), [
    categories, isLoading, addCategory, updateCategory, deleteCategory, hideCategory, showCategory,
    getCategoryById, getCategoryByName, getVisibleCategories, getDefaultCategories, getCustomCategories,
  ]);

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories(): CategoriesContextValue {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories must be used within CategoriesProvider');
  return ctx;
}
