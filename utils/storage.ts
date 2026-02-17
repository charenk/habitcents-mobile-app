import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeMode } from '@/constants/theme';

const ONBOARDING_KEY = '@habitcent_onboarded';
const THEME_MODE_KEY = '@habitcent_theme_mode';

/**
 * Check if user has completed onboarding
 */
export async function getHasOnboarded(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error reading onboarding state:', error);
    return false;
  }
}

/**
 * Mark user as having completed onboarding
 */
export async function setHasOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  } catch (error) {
    console.error('Error saving onboarding state:', error);
  }
}

/**
 * Clear onboarding state (useful for testing)
 */
export async function clearOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
  } catch (error) {
    console.error('Error clearing onboarding state:', error);
  }
}

/**
 * Get persisted theme mode (light, dark, or system)
 */
export async function getThemeMode(): Promise<ThemeMode> {
  try {
    const value = await AsyncStorage.getItem(THEME_MODE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') return value;
    return 'system';
  } catch (error) {
    console.error('Error reading theme mode:', error);
    return 'system';
  }
}

/**
 * Persist theme mode
 */
export async function setThemeMode(mode: ThemeMode): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_MODE_KEY, mode);
  } catch (error) {
    console.error('Error saving theme mode:', error);
  }
}
