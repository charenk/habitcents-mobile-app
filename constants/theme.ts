/**
 * Light and dark theme palettes for the app.
 */

export const lightTheme = {
  primary: '#4CAF50',
  primaryMuted: '#B2DFB6',
  background: '#F8F8F8',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  textTertiary: '#9E9E9E',
  chipActiveBg: '#000000',
  chipActiveText: '#FFFFFF',
  chipInactiveBg: '#FFFFFF',
  chipInactiveText: '#757575',
  chipBorder: '#E0E0E0',
  iconBgGreen: '#B2DFB6',
  iconBgYellow: '#FFF3E0',
  iconOrange: '#FFA726',
  fabGradientStart: '#81C784',
  fabGradientEnd: '#4DD0E1',
  calendarDow: '#B8860B',
  calendarOtherMonth: '#BDBDBD',
  calendarBg: '#F0F0F0',
  calendarCellBg: '#FFFFFF',
  calendarOtherMonthBg: '#FAFAFA',
  primaryDark: '#388E3C',
  border: '#E5E7EB',
  white: '#FFFFFF',
  tabIconDefault: '#9E9E9E',
  danger: '#DC2626',
} as const;

export const darkTheme = {
  primary: '#66BB6A',
  primaryMuted: '#2E7D32',
  background: '#121212',
  surface: '#1E1E1E',
  text: '#E0E0E0',
  textSecondary: '#B0B0B0',
  textTertiary: '#9E9E9E',
  chipActiveBg: '#424242',
  chipActiveText: '#FFFFFF',
  chipInactiveBg: '#2B2B2B',
  chipInactiveText: '#B0B0B0',
  chipBorder: '#404040',
  iconBgGreen: '#2E7D32',
  iconBgYellow: '#5D4E37',
  iconOrange: '#FFB74D',
  fabGradientStart: '#388E3C',
  fabGradientEnd: '#00897B',
  calendarDow: '#FFD54F',
  calendarOtherMonth: '#616161',
  calendarBg: '#252525',
  calendarCellBg: '#2B2B2B',
  calendarOtherMonthBg: '#1E1E1E',
  primaryDark: '#2E7D32',
  border: '#404040',
  white: '#FFFFFF',
  tabIconDefault: '#9E9E9E',
  danger: '#EF5350',
} as const;

export type AppTheme = typeof lightTheme;

export type ThemeMode = 'light' | 'dark' | 'system';
