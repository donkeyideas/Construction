import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

const isExpoGo = Constants.appOwnership === 'expo';

let Notifications: typeof import('expo-notifications') | null = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Notifications!.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    /* expo-notifications not available */
  }
}

/**
 * Register for push notifications and store token directly in Supabase.
 * Uses getDevicePushTokenAsync() for native FCM/APNs tokens.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }

  // Get native FCM/APNs token (NOT Expo push token — that hangs on Android)
  const tokenData = await Notifications.getDevicePushTokenAsync();
  const pushToken = tokenData.data as string;
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.log('No authenticated user for push registration');
    return null;
  }

  // Store directly via Supabase (avoids API URL redirect issues)
  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: user.id,
      token: pushToken,
      platform,
    },
    { onConflict: 'user_id,token' }
  );

  if (error) {
    console.log('Push token save failed:', error.message);
  }

  return pushToken;
}

/**
 * Remove push token from Supabase (call on sign-out).
 */
export async function unregisterPushToken(token: string): Promise<void> {
  await supabase.from('push_tokens').delete().eq('token', token);
}

/**
 * Add a listener for when user taps a notification.
 */
export function addNotificationResponseListener(
  callback: (response: import('expo-notifications').NotificationResponse) => void
) {
  if (!Notifications) return () => {};
  const subscription =
    Notifications.addNotificationResponseReceivedListener(callback);
  return () => subscription.remove();
}

/**
 * Add a listener for notifications received while app is open.
 */
export function addNotificationReceivedListener(
  callback: (notification: import('expo-notifications').Notification) => void
) {
  if (!Notifications) return () => {};
  const subscription = Notifications.addNotificationReceivedListener(callback);
  return () => subscription.remove();
}
