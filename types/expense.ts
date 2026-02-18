/**
 * Type definitions for expense data model.
 */

export type ExpenseCategory = 'Mortgage' | 'Car' | 'Entertainment' | 'Food' | 'Shopping' | 'Utilities' | 'Healthcare' | 'Transportation' | 'Other';

export type Expense = {
  id: string;
  title: string;
  amount: number;           // Cents (integer)
  amountDisplay: string;    // "-$5.00"
  category: ExpenseCategory;
  categoryId?: string;      // Reference to Category.id
  merchant?: string;        // Merchant name for habit detection
  date: Date;
  time: string;             // "9:30 AM"
  isRecurring: boolean;
  reminderEnabled: boolean;
  reminderTime?: string;    // "1h before"
  iconVariant: 'yellow' | 'green';
};

export type ExpenseSection = {
  title: string;            // "Feb 14", "Feb 13 - Yesterday"
  data: Expense[];
};

export type AddExpenseInput = {
  title: string;
  amount: number;           // Cents
  category: ExpenseCategory;
  categoryId?: string;      // Reference to Category.id
  merchant?: string;        // Merchant name for habit detection
  date: Date;
  isRecurring: boolean;
  reminderEnabled: boolean;
  reminderTime?: string;
};
