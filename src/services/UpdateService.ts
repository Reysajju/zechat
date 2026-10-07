/**
 * UpdateService — OTA updates (expo-updates) + forced store-update dialog
 * driven by remote config `minVersion` (spec §4: in-app update check).
 */
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Alert, Linking, Platform } from 'react-native';
import { compareVersions } from '../utils/version';
import { track } from './Analytics';

export const STORE_LISTING_ANDROID = 'https://play.google.com/store/apps/details?id=com.zedchat.app';
export const STORE_LISTING_IOS = 'https://apps.apple.com/app/zed-chat/id000000000';

export async function checkForUpdates(onProgress?: (msg: string) => void): Promise<void> {
  if (__DEV__ || Updates.channel === undefined) {
    // Still run the minVersion gate in dev for testing.
  }
  try {
    if (!__DEV__) {
      const check = await Updates.checkForUpdateAsync();
      if (check.isAvailable) {
        onProgress?.('Downloading update…');
        await Updates.fetchUpdateAsync();
        onProgress?.('');
        track('ota_available');
        Alert.alert(
          'Update ready',
          'A new version has been downloaded. Reload to apply it now?',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Reload', onPress: () => void Updates.reloadAsync() },
          ],
        );
        return;
      }
    }
  } catch {
    /* OTA failures are silent by design */
  }
  maybeForceStoreUpdate();
}

/** Remote config can force older installs toward the store. */
export function maybeForceStoreUpdate(): void {
  const current = Constants.expoConfig?.version ?? '0.0.0';
  const min = (Constants.expoConfig?.extra as { minVersion?: string } | undefined)?.minVersion;
  if (!min) return;
  if (compareVersions(current, min) < 0) {
    Alert.alert(
      'Update required',
      `This version (${current}) is no longer supported. Please update the app to continue.`,
      [
        Platform.OS === 'android'
          ? { text: 'Update on Google Play', onPress: () => void Linking.openURL(`market://details?id=com.zedchat.app`) }
          : { text: 'Update on the App Store', onPress: () => void Linking.openURL(STORE_LISTING_IOS) },
      ],
      { cancelable: false },
    );
  }
}
