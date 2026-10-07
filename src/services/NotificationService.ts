/**
 * NotificationService — local notifications only (no push server needed).
 * Used for: long-running agent tasks finishing while the app is backgrounded,
 * and download completions. Permission is requested lazily and politely.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let permissionAsked = false;

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    if (!cur.canAskAgain || permissionAsked) return false;
    permissionAsked = true;
    const req = await Notifications.requestPermissionsAsync();
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('tasks', {
        name: 'Task updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#3B82F6',
      });
    }
    return req.granted;
  } catch {
    return false;
  }
}

export async function notifyLocal(title: string, body: string): Promise<void> {
  const ok = await ensureNotificationPermission();
  if (!ok) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: Platform.OS === 'android' ? 'tasks' : undefined,
      },
    });
  } catch {
    /* non-fatal */
  }
}
