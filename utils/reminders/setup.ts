/**
 * One-time notification runtime setup. Imported for its side effect from
 * app/_layout.tsx (the SplashScreen.preventAutoHideAsync precedent for
 * module-scope setup at the root), plus one mount-time call for the Android
 * channel. One of the three modules allowed to import expo-notifications
 * (see utils/reminders/sync.ts).
 *
 * DELIBERATELY NOT in app.json's plugins: the expo-notifications config
 * plugin unconditionally injects the iOS `aps-environment` entitlement,
 * which is remote-push (APS) machinery this local-only feature never uses,
 * and it broke the 2026-09-25 internal build against a provisioning profile
 * that (rightly) carries no push capability. Local notifications need no
 * entitlement, the native module is autolinked without the plugin, and the
 * plugin's other jobs are covered here at runtime (the Android channel) or
 * unused (custom sounds, a custom Android icon). If remote push is ever
 * wanted, that is a strategy change with a privacy-label consequence, not a
 * plugins-array entry.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { strings } from '@/constants/strings';

// How a reminder presents while the app is FOREGROUND: banner and list, no
// sound, no badge. The app being open means the user is already where the
// reminder points, so the quiet form is the honest one. (SDK 53+ shape:
// shouldShowBanner/shouldShowList, not the retired shouldShowAlert.)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const REMINDER_CHANNEL_ID = 'bill-reminders';

/**
 * Android 8+ drops notifications without a named channel; iOS has no
 * channels. Safe to call every launch (setting an existing channel is a
 * no-op update). Failures degrade with a log: a channel error must not take
 * down the provider mount, and the next launch retries.
 */
export async function ensureAndroidChannelAsync(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: strings.reminders.channelName,
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch (error) {
    console.error('Error creating reminder notification channel:', error);
  }
}
