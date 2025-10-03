/**
 * Notification Service
 * Handles push notifications and local notifications
 */

import PushNotification, { Importance } from 'react-native-push-notification';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationServiceClass {
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    // Create notification channel (Android)
    PushNotification.createChannel(
      {
        channelId: 'spirit-tours-channel',
        channelName: 'Spirit Tours',
        channelDescription: 'Spirit Tours notifications',
        importance: Importance.HIGH,
        vibrate: true,
      },
      created => console.log(`Channel created: ${created}`)
    );

    // Configure push notifications
    PushNotification.configure({
      onRegister: token => {
        console.log('FCM Token:', token);
        this.saveFCMToken(token.token);
      },

      onNotification: notification => {
        console.log('Notification:', notification);
        // Handle notification tap
        if (notification.userInteraction) {
          this.handleNotificationTap(notification);
        }
      },

      onAction: notification => {
        console.log('Action:', notification.action);
      },

      onRegistrationError: err => {
        console.error('Registration error:', err);
      },

      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: true,
    });

    // Request permission for iOS
    await this.requestPermission();

    // Listen for foreground messages
    messaging().onMessage(async remoteMessage => {
      console.log('Foreground message:', remoteMessage);
      this.showLocalNotification(remoteMessage);
    });

    // Handle background messages
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Background message:', remoteMessage);
    });

    this.initialized = true;
  }

  async requestPermission(): Promise<boolean> {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Notification permission granted');
    }

    return enabled;
  }

  async getFCMToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      await this.saveFCMToken(token);
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  private async saveFCMToken(token: string) {
    try {
      await AsyncStorage.setItem('fcm_token', token);
      // Send token to backend
      // await apiClient.post('/api/notifications/register-device', { token });
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  showLocalNotification(message: any) {
    PushNotification.localNotification({
      channelId: 'spirit-tours-channel',
      title: message.notification?.title || 'Spirit Tours',
      message: message.notification?.body || '',
      playSound: true,
      soundName: 'default',
      userInfo: message.data,
    });
  }

  scheduleNotification(title: string, message: string, date: Date) {
    PushNotification.localNotificationSchedule({
      channelId: 'spirit-tours-channel',
      title,
      message,
      date,
      playSound: true,
      soundName: 'default',
    });
  }

  cancelAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
  }

  handleNotificationTap(notification: any) {
    // Navigate based on notification data
    const { type, id } = notification.data || {};
    
    switch (type) {
      case 'booking':
        // Navigate to booking details
        break;
      case 'payment':
        // Navigate to payment screen
        break;
      case 'reminder':
        // Navigate to trip details
        break;
      default:
        // Navigate to home
        break;
    }
  }
}

export const NotificationService = new NotificationServiceClass();
