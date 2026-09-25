/**
 * OS notification permission, read and requested (spec section 4: permission
 * is a first-class state, not an error path). One of the three modules
 * allowed to import expo-notifications (see utils/reminders/sync.ts).
 *
 * The prompt fires only from requestReminderPermission, and callers invoke
 * that only at the moment a user first turns a reminder on: never at launch,
 * where the ask would explain nothing.
 */

import * as Notifications from 'expo-notifications';
import type { ReminderPermission } from '@/utils/reminders/plan';

function mapResponse(resp: Notifications.NotificationPermissionsStatus): ReminderPermission {
  if (resp.granted) return 'granted';
  // iOS provisional and ephemeral authorizations deliver quietly; for
  // scheduling purposes they are grants.
  const ios = resp.ios?.status;
  if (
    ios === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    ios === Notifications.IosAuthorizationStatus.EPHEMERAL
  ) {
    return 'granted';
  }
  if (resp.status === 'denied' && resp.canAskAgain) {
    // Android reports "denied" for the never-asked state; canAskAgain is what
    // distinguishes "not yet asked" from "asked and refused".
    return 'undetermined';
  }
  return resp.status === 'granted' ? 'granted' : resp.status === 'denied' ? 'denied' : 'undetermined';
}

/** Current permission without prompting. Read failures degrade to
 * 'undetermined' so a transient native error never renders a "denied" state
 * the user did not choose. */
export async function getReminderPermission(): Promise<ReminderPermission> {
  try {
    return mapResponse(await Notifications.getPermissionsAsync());
  } catch (error) {
    console.error('Error reading notification permission:', error);
    return 'undetermined';
  }
}

/** Prompt the OS (only meaningful while undetermined; iOS ignores repeats). */
export async function requestReminderPermission(): Promise<ReminderPermission> {
  try {
    return mapResponse(
      await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true, allowBadge: false },
      })
    );
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'undetermined';
  }
}
