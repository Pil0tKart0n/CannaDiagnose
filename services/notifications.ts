import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const NOTIFICATION_IDS_KEY = 'cannadiagnose_notification_ids';

// ── Notification handler (how notifications appear when app is in foreground) ──

export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ── Permission handling ──

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ── Schedule a follow-up reminder ──

export async function scheduleFollowUpReminder(
  plantName: string,
  followUpDays: number,
  entryId: string,
): Promise<boolean> {
  // Request permission (only when actually needed)
  const granted = await requestPermissions();
  if (!granted) return false;

  // Cancel any existing reminder for this entry
  await cancelReminder(entryId);

  const triggerSeconds = followUpDays * 24 * 60 * 60;

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Follow-up fällig für ${plantName}`,
        body: 'Zeit für ein neues Foto deiner Pflanze',
        data: { entryId, plantName },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: triggerSeconds,
        repeats: false,
      },
    });

    // Store the notification ID mapped to the entry ID
    await saveNotificationId(entryId, notificationId);
    return true;
  } catch (error) {
    console.warn('Failed to schedule notification:', error);
    return false;
  }
}

// ── Cancel a reminder by entry ID ──

export async function cancelReminder(entryId: string): Promise<void> {
  const mapping = await getNotificationMapping();
  const notificationId = mapping[entryId];
  if (notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
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
