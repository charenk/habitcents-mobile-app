/**
 * Types and mock data for Upcoming expenses and calendar events.
 */

export type UpcomingItemType = 'expense' | 'income';
export type CalendarEventType = 'rent' | 'income' | 'car';

export type UpcomingItem = {
  id: string;
  title: string;
  amount: string;
  amountValue: number;
  frequency: string;
  dueInDays: number;
  type: UpcomingItemType;
  icon: 'car' | 'building' | 'arrow-down';
  iconBg: string;
  iconColor: string;
};

export type CalendarEvent = {
  date: number; // day of month 1-31
  month: number;
  year: number;
  type: CalendarEventType;
};

const now = new Date();
const currentMonth = now.getMonth();
const currentYear = now.getFullYear();

export const MOCK_UPCOMING_ITEMS: UpcomingItem[] = [
  {
    id: '1',
    title: 'Car finance',
    amount: '-$290.00',
    amountValue: 290,
    frequency: 'Every two weeks',
    dueInDays: 6,
    type: 'expense',
    icon: 'car',
    iconBg: '#FFF3E0',
    iconColor: '#FFA726',
  },
  {
    id: '2',
    title: 'Apartment rent',
    amount: '-$1700',
    amountValue: 1700,
    frequency: 'Monthly',
    dueInDays: 18,
    type: 'expense',
    icon: 'building',
    iconBg: '#E8E0F5',
    iconColor: '#7E57C2',
  },
  {
    id: '3',
    title: 'Salary',
    amount: '+$3200',
    amountValue: 3200,
    frequency: 'Monthly',
    dueInDays: 5,
    type: 'income',
    icon: 'arrow-down',
    iconBg: '#E8F5E9',
    iconColor: '#4CAF50',
  },
];

/** Events to show on the calendar: rent (home), income (arrow), car. */
export const MOCK_CALENDAR_EVENTS: CalendarEvent[] = [
  { date: 2, month: currentMonth, year: currentYear, type: 'rent' },
  { date: 10, month: currentMonth, year: currentYear, type: 'income' },
  { date: 11, month: currentMonth, year: currentYear, type: 'car' },
  { date: 24, month: currentMonth, year: currentYear, type: 'income' },
  { date: 25, month: currentMonth, year: currentYear, type: 'car' },
];

export const UPCOMING_TYPE_FILTERS = ['All', 'Income', 'Recurring expenses'] as const;
export type UpcomingTypeFilter = (typeof UPCOMING_TYPE_FILTERS)[number];

export function getFilteredUpcomingItems(
  filter: UpcomingTypeFilter
): UpcomingItem[] {
  if (filter === 'All') return MOCK_UPCOMING_ITEMS;
  if (filter === 'Income') return MOCK_UPCOMING_ITEMS.filter((i) => i.type === 'income');
  return MOCK_UPCOMING_ITEMS.filter((i) => i.type === 'expense');
}

export function getFilteredCalendarEvents(
  filter: UpcomingTypeFilter
): CalendarEvent[] {
  if (filter === 'All') return MOCK_CALENDAR_EVENTS;
  if (filter === 'Income') return MOCK_CALENDAR_EVENTS.filter((e) => e.type === 'income');
  return MOCK_CALENDAR_EVENTS.filter((e) => e.type === 'rent' || e.type === 'car');
}

/** Total of upcoming expenses only (positive number for display). */
export function getTotalUpcomingExpenses(items: UpcomingItem[]): number {
  return items
    .filter((i) => i.type === 'expense')
    .reduce((sum, i) => sum + i.amountValue, 0);
}

/** Formatted total for panel: expenses as positive sum, income as positive sum when filter is Income. */
export function getTotalForDisplay(items: UpcomingItem[], filter: UpcomingTypeFilter): number {
  if (filter === 'Income') {
    return items.filter((i) => i.type === 'income').reduce((sum, i) => sum + i.amountValue, 0);
  }
  return getTotalUpcomingExpenses(items);
}
