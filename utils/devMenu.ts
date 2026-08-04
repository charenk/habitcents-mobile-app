/**
 * The one gate for every developer-only affordance in the app.
 *
 * Why this exists: `__DEV__` is false in the `preview` and `production` EAS
 * profiles, so anything gated on it does not exist in the builds Charen
 * actually tests on device. Device testing needs the debug controls, the App
 * Store build must not have them, so the gate has to be a build-time flag we
 * can set per profile rather than a runtime toggle.
 *
 * How it is set: `EXPO_PUBLIC_DEV_MENU` is inlined by Metro at build time, so
 * `process.env.EXPO_PUBLIC_DEV_MENU` becomes a string literal in the bundle and
 * this whole expression folds to a constant. eas.json sets it to "1" on the
 * `internal` profile and to "0" on `production`, so a store build can never
 * carry a live gate even if a stray shell var is set on the build machine.
 *
 * Rule: nothing dev-only may test `__DEV__` or the env var itself. Every dev
 * surface imports DEV_MENU_ENABLED from here, so `grep -rn DEV_MENU_ENABLED`
 * lists the complete set of gates.
 */
import { DevSettings } from 'react-native';
import * as Updates from 'expo-updates';

/** Name of the build-time flag, surfaced in the menu's build-info row. */
export const DEV_MENU_FLAG = 'EXPO_PUBLIC_DEV_MENU';

/**
 * True in local development and in builds made with the `internal` profile.
 * False in `preview` and `production`, where the dev section renders nothing
 * and no dev code path can run.
 */
export const DEV_MENU_ENABLED: boolean =
  __DEV__ || process.env.EXPO_PUBLIC_DEV_MENU === '1';

/**
 * Restart the JS runtime so every provider re-hydrates from storage.
 *
 * `DevSettings.reload()` is a no-op outside a debug build, which is exactly
 * where this menu now has to work, so a release build reloads through
 * expo-updates instead. Falls back to DevSettings if that is unavailable.
 */
export async function reloadApp(): Promise<void> {
  if (__DEV__) {
    DevSettings.reload();
    return;
  }
  try {
    await Updates.reloadAsync();
  } catch {
    DevSettings.reload();
  }
}

export type DevBuildInfo = {
  /** EAS Update channel of this build, or a stand-in when there is none. */
  channel: string;
  /** Whether the gate above is on. */
  devMenu: boolean;
};

/** Which build is in hand, so a tester can tell internal from production. */
export function devBuildInfo(): DevBuildInfo {
  let channel = 'none';
  try {
    channel = Updates.channel || (__DEV__ ? 'development' : 'none');
  } catch {
    channel = 'unknown';
  }
  return { channel, devMenu: DEV_MENU_ENABLED };
}
