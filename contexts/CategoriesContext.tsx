import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      const stored = await getCategories();
      if (stored.length === 0) {
        // Initialize with defaults
        const defaults = initializeDefaultCategories();
        await saveCategories(defaults);
        setCategories(defaults);
      } else {
        setCategories(stored);
      }
      setIsLoading(false);
    }
    loadCategories();
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
    const updated = [...categories, newCategory];
    setCategories(updated);
    await saveCategories(updated);
    return newCategory;
  }, [categories]);

  const updateCategory = useCallback(async (
    id: string,
    updates: Partial<Omit<Category, 'id' | 'isDefault' | 'createdAt'>>
  ): Promise<void> => {
    const updated = categories.map(cat =>
      cat.id === id ? { ...cat, ...updates } : cat
    );
    setCategories(updated);
    await saveCategories(updated);
  }, [categories]);

  const deleteCategory = useCallback(async (id: string): Promise<void> => {
    const category = categories.find(c => c.id === id);
    if (category?.isDefault) {
      throw new Error('Cannot delete default categories');
    }
    const updated = categories.filter(cat => cat.id !== id);
    setCategories(updated);
    await saveCategories(updated);
  }, [categories]);

  const hideCategory = useCallback(async (id: string): Promise<void> => {
    await updateCategory(id, { isHidden: true });
  }, [updateCategory]);

  const showCategory = useCallback(async (id: string): Promise<void> => {
    await updateCategory(id, { isHidden: false });
  }, [updateCategory]);

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

  return (
    <CategoriesContext.Provider
      value={{
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
      }}
    >
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories(): CategoriesContextValue {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories must be used within CategoriesProvider');
  return ctx;
}
