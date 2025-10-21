/**
 * Notification Service
 * 
 * Manages push notifications and local notifications
 */

import PushNotification, { Importance } from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_PERMISSION_KEY = 'notification_permission_granted';

export interface NotificationData {
  title: string;
  message: string;
  data?: any;
  userInfo?: any;
  playSound?: boolean;
  soundName?: string;
  vibrate?: boolean;
  priority?: 'high' | 'low' | 'default';
}

/**
 * Initialize push notifications
 */
export function setupPushNotifications(): void {
  console.log('[NotificationService] Setting up push notifications...');

  // Configure push notifications
  PushNotification.configure({
    // Called when token is generated (iOS and Android)
    onRegister: function (token) {
      console.log('[NotificationService] FCM Token:', token);
      saveDeviceToken(token.token);
    },

    // Called when a remote notification is received
    onNotification: function (notification) {
      console.log('[NotificationService] Notification received:', notification);

      // Process notification based on app state
      if (notification.userInteraction) {
        // User tapped on notification
        handleNotificationTap(notification);
      } else {
        // Notification received while app is in foreground
        showLocalNotification({
          title: notification.title || 'Spirit Tours',
          message: notification.message || notification.body || '',
          data: notification.data,
        });
      }

      // Required on iOS only
      if (Platform.OS === 'ios') {
        notification.finish(PushNotificationIOS.FetchResult.NoData);
      }
    },

    // Called when a remote notification action is clicked
    onAction: function (notification) {
      console.log('[NotificationService] Action:', notification.action);
      console.log('[NotificationService] Notification:', notification);
    },

    // Should the initial notification be popped automatically
    popInitialNotification: true,

    // Requested permissions (iOS)
    permissions: {
      alert: true,
      badge: true,
      sound: true,
    },

    // Request permissions on app start
    requestPermissions: Platform.OS === 'ios',
  });

  // Create default notification channel (Android)
  if (Platform.OS === 'android') {
    PushNotification.createChannel(
      {
        channelId: 'spirit-tours-default',
        channelName: 'Spirit Tours Notifications',
        channelDescription: 'Default notification channel',
        playSound: true,
        soundName: 'default',
        importance: Importance.HIGH,
        vibrate: true,
      },
      (created) => {
        console.log(`[NotificationService] Channel created: ${created}`);
      }
    );

    // Booking notifications channel
    PushNotification.createChannel(
      {
        channelId: 'spirit-tours-bookings',
        channelName: 'Booking Updates',
        channelDescription: 'Notifications about your bookings',
        playSound: true,
        soundName: 'default',
        importance: Importance.HIGH,
        vibrate: true,
      },
      (created) => {
        console.log(`[NotificationService] Bookings channel created: ${created}`);
      }
    );

    // Promotions channel
    PushNotification.createChannel(
      {
        channelId: 'spirit-tours-promotions',
        channelName: 'Promotions & Offers',
        channelDescription: 'Special offers and promotions',
        playSound: false,
        importance: Importance.DEFAULT,
        vibrate: false,
      },
      (created) => {
        console.log(`[NotificationService] Promotions channel created: ${created}`);
      }
    );
  }

  console.log('[NotificationService] Setup complete');
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const permissions = await PushNotificationIOS.requestPermissions({
        alert: true,
        badge: true,
        sound: true,
      });
      
      const granted = permissions.alert && permissions.badge;
      await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, granted.toString());
      
      return granted;
    } else {
      // Android permissions are handled automatically
      await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
      return true;
    }
  } catch (error) {
    console.error('[NotificationService] Permission request failed:', error);
    return false;
  }
}

/**
 * Check notification permission status
 */
export async function checkNotificationPermission(): Promise<boolean> {
  try {
    const permission = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_KEY);
    return permission === 'true';
  } catch (error) {
    console.error('[NotificationService] Permission check failed:', error);
    return false;
  }
}

/**
 * Show local notification
 */
export function showLocalNotification(data: NotificationData): void {
  const channelId = determineChannelId(data);

  PushNotification.localNotification({
    channelId: channelId,
    title: data.title,
    message: data.message,
    playSound: data.playSound !== false,
    soundName: data.soundName || 'default',
    vibrate: data.vibrate !== false,
    vibration: 300,
    priority: data.priority || 'high',
    userInfo: data.data || {},
    
    // iOS specific
    ...(Platform.OS === 'ios' && {
      alertAction: 'Ver',
    }),
  });

  console.log('[NotificationService] Local notification shown:', data.title);
}

/**
 * Schedule notification for later
 */
export function scheduleNotification(
  data: NotificationData,
  date: Date
): void {
  const channelId = determineChannelId(data);

  PushNotification.localNotificationSchedule({
    channelId: channelId,
    title: data.title,
    message: data.message,
    date: date,
    playSound: data.playSound !== false,
    soundName: data.soundName || 'default',
    vibrate: data.vibrate !== false,
    vibration: 300,
    priority: data.priority || 'high',
    userInfo: data.data || {},
    
    allowWhileIdle: true,
  });

  console.log(`[NotificationService] Notification scheduled for: ${date.toISOString()}`);
}

/**
 * Cancel scheduled notification
 */
export function cancelNotification(notificationId: string): void {
  PushNotification.cancelLocalNotification(notificationId);
  console.log(`[NotificationService] Notification cancelled: ${notificationId}`);
}

/**
 * Cancel all notifications
 */
export function cancelAllNotifications(): void {
  PushNotification.cancelAllLocalNotifications();
  console.log('[NotificationService] All notifications cancelled');
}

/**
 * Get badge count (iOS only)
 */
export function getBadgeCount(): Promise<number> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.getApplicationIconBadgeNumber((count) => {
        resolve(count);
      });
    } else {
      resolve(0);
    }
  });
}

/**
 * Set badge count
 */
export function setBadgeCount(count: number): void {
  if (Platform.OS === 'ios') {
    PushNotificationIOS.setApplicationIconBadgeNumber(count);
  } else {
    PushNotification.setApplicationIconBadgeNumber(count);
  }
  console.log(`[NotificationService] Badge count set to: ${count}`);
}

/**
 * Clear badge
 */
export function clearBadge(): void {
  setBadgeCount(0);
}

/**
 * Handle notification tap
 */
function handleNotificationTap(notification: any): void {
  console.log('[NotificationService] User tapped notification:', notification);

  // Extract deep link or action from notification
  const action = notification.data?.action;
  const deepLink = notification.data?.deepLink;

  if (deepLink) {
    // Handle deep link navigation
    // This would integrate with your navigation system
    console.log('[NotificationService] Deep link:', deepLink);
  }

  if (action) {
    // Handle specific action
    console.log('[NotificationService] Action:', action);
    
    switch (action) {
      case 'view_booking':
        // Navigate to booking details
        break;
      case 'view_offer':
        // Navigate to offer details
        break;
      default:
        console.log('[NotificationService] Unknown action:', action);
    }
  }
}

/**
 * Determine notification channel based on content
 */
function determineChannelId(data: NotificationData): string {
  if (Platform.OS !== 'android') {
    return 'default';
  }

  // Check data for channel hints
  if (data.data?.type === 'booking') {
    return 'spirit-tours-bookings';
  }
  
  if (data.data?.type === 'promotion') {
    return 'spirit-tours-promotions';
  }

  return 'spirit-tours-default';
}

/**
 * Save device token to backend
 */
async function saveDeviceToken(token: string): Promise<void> {
  try {
    // Store locally
    await AsyncStorage.setItem('device_push_token', token);
    
    // TODO: Send to backend
    // const { API } = await import('./ApiService');
    // await API.post('/users/device-token', { token, platform: Platform.OS });
    
    console.log('[NotificationService] Device token saved');
  } catch (error) {
    console.error('[NotificationService] Failed to save device token:', error);
  }
}

/**
 * Schedule booking reminder
 */
export function scheduleBookingReminder(
  bookingId: string,
  bookingDate: Date,
  destination: string
): void {
  // Schedule 24 hours before
  const reminderDate = new Date(bookingDate);
  reminderDate.setDate(reminderDate.getDate() - 1);

  scheduleNotification(
    {
      title: 'Recordatorio de Viaje',
      message: `Tu viaje a ${destination} es mañana. ¡Prepara tu equipaje!`,
      data: {
        type: 'booking_reminder',
        bookingId,
        action: 'view_booking',
      },
    },
    reminderDate
  );

  console.log(`[NotificationService] Booking reminder scheduled for: ${reminderDate.toISOString()}`);
}

/**
 * Send promotion notification
 */
export function sendPromotionNotification(
  title: string,
  message: string,
  offerId: string
): void {
  showLocalNotification({
    title,
    message,
    data: {
      type: 'promotion',
      offerId,
      action: 'view_offer',
    },
    priority: 'default',
  });
}

export default {
  setupPushNotifications,
  requestNotificationPermission,
  checkNotificationPermission,
  showLocalNotification,
  scheduleNotification,
  cancelNotification,
  cancelAllNotifications,
  getBadgeCount,
  setBadgeCount,
  clearBadge,
  scheduleBookingReminder,
  sendPromotionNotification,
};
