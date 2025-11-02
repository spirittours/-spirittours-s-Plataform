/**
 * useWebSocket Hook
 * 
 * React hook for WebSocket connection and notifications.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { getWebSocketService, NotificationData, resetWebSocketService } from '../services/websocket.service';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onNotification?: (notification: NotificationData) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: any) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  notifications: NotificationData[];
  connect: () => void;
  disconnect: () => void;
  subscribe: (room: string) => void;
  unsubscribe: (room: string) => void;
  clearNotifications: () => void;
  markAsRead: (index: number) => void;
}

export function useWebSocket(
  userId: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const {
    autoConnect = true,
    onNotification,
    onConnected,
    onDisconnected,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const wsServiceRef = useRef<ReturnType<typeof getWebSocketService> | null>(null);

  // Initialize WebSocket service
  useEffect(() => {
    if (!userId) return;

    const baseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    wsServiceRef.current = getWebSocketService(baseUrl, userId, 'desktop');

    // Set up event listeners
    const handleConnected = () => {
      setIsConnected(true);
      onConnected?.();
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      onDisconnected?.();
    };

    const handleNotification = (notification: NotificationData) => {
      setNotifications(prev => [notification, ...prev]);
      onNotification?.(notification);
      
      // Show browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: notification.notification_type,
        });
      }
    };

    const handleError = (error: any) => {
      console.error('WebSocket error:', error);
      onError?.(error);
    };

    wsServiceRef.current.on('connected', handleConnected);
    wsServiceRef.current.on('disconnected', handleDisconnected);
    wsServiceRef.current.on('notification', handleNotification);
    wsServiceRef.current.on('error', handleError);

    // Auto-connect if enabled
    if (autoConnect) {
      wsServiceRef.current.connect();
    }

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup
    return () => {
      if (wsServiceRef.current) {
        wsServiceRef.current.removeAllListeners();
        wsServiceRef.current.disconnect();
      }
    };
  }, [userId, autoConnect]);

  const connect = useCallback(() => {
    wsServiceRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    wsServiceRef.current?.disconnect();
  }, []);

  const subscribe = useCallback((room: string) => {
    wsServiceRef.current?.subscribe(room);
  }, []);

  const unsubscribe = useCallback((room: string) => {
    wsServiceRef.current?.unsubscribe(room);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const markAsRead = useCallback((index: number) => {
    setNotifications(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], read: true };
      }
      return updated;
    });
  }, []);

  return {
    isConnected,
    notifications,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    clearNotifications,
    markAsRead,
  };
}
