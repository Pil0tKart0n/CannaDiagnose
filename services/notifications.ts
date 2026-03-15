import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const NOTIFICATION_IDS_KEY = 'cannadiagnose_notification_ids';

// Lazy-load expo-notifications (may not be available in Expo Go)
let NotificationsModule: any = null;

async function getNotifications() {
  if (NotificationsModule) return NotificationsModule;
  try {
    NotificationsModule = require('expo-notifications');
    return NotificationsModule;
  } catch {
    return null;
  }
}

// ── Notification handler (call at app startup – safe if module missing) ──

export function setupNotificationHandler() {
  try {
    const N = require('expo-notifications');
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // expo-notifications not available (e.g. Expo Go) – skip silently
  }
}

// ── Permission handling ──

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const N = await getNotifications();
  if (!N) return false;

  const { status: existing } = await N.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await N.requestPermissionsAsync();
  return status === 'granted';
}

// ── Schedule a follow-up reminder ──

export async function scheduleFollowUpReminder(
  plantName: string,
  followUpDays: number,
  entryId: string,
): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;

  const granted = await requestPermissions();
  if (!granted) return false;

  await cancelReminder(entryId);

  const triggerSeconds = followUpDays * 24 * 60 * 60;

  try {
    const notificationId = await N.scheduleNotificationAsync({
      content: {
        title: `Follow-up fällig für ${plantName}`,
        body: 'Zeit für ein neues Foto deiner Pflanze',
        data: { entryId, plantName },
        sound: true,
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes?.TIME_INTERVAL ?? 'timeInterval',
        seconds: triggerSeconds,
        repeats: false,
      },
    });

    await saveNotificationId(entryId, notificationId);
    return true;
  } catch (error) {
    console.warn('Failed to schedule notification:', error);
    return false;
  }
}

// ── Cancel a reminder by entry ID ──

export async function cancelReminder(entryId: string): Promise<void> {
  const N = await getNotifications();
  if (!N) return;

  const mapping = await getNotificationMapping();
  const notificationId = mapping[entryId];
  if (notificationId) {
    try {
      await N.cancelScheduledNotificationAsync(notificationId);
    } catch {
      // Notification may already have fired or been dismissed
    }
    delete mapping[entryId];
    await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(mapping));
  }
}

// ── Internal helpers ──

async function getNotificationMapping(): Promise<Record<string, string>> {
  try {
    const data = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

async function saveNotificationId(entryId: string, notificationId: string): Promise<void> {
  const mapping = await getNotificationMapping();
  mapping[entryId] = notificationId;
  await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(mapping));
}
