/**
 * Custom WebSocket Hook
 * 
 * Provides easy access to WebSocket functionality with automatic
 * event cleanup and subscription management.
 * 
 * Features:
 * - Auto-subscribe/unsubscribe on mount/unmount
 * - Type-safe event handling
 * - Automatic cleanup
 * - Connection status monitoring
 * 
 * Usage:
 * const { connected, emit, subscribe } = useWebSocketHook();
 */

import { useEffect, useCallback, useRef } from 'react';
import { useWebSocket as useWSContext } from '../contexts/WebSocketContext';

interface UseWebSocketOptions {
  autoJoinTrip?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
}

interface UseWebSocketReturn {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  emit: (event: string, data: any) => void;
  subscribe: (event: string, callback: (...args: any[]) => void) => void;
  unsubscribe: (event: string, callback?: (...args: any[]) => void) => void;
  joinTrip: (tripId: string) => void;
  leaveTrip: (tripId: string) => void;
  sendMessage: (tripId: string, message: string, type?: string) => void;
  sendLocationUpdate: (tripId: string, latitude: number, longitude: number, speed?: number, heading?: number) => void;
}

/**
 * Custom hook for WebSocket functionality
 */
export const useWebSocketHook = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const {
    autoJoinTrip,
    onConnect,
    onDisconnect,
    onError
  } = options;

  const {
    socket,
    connected,
    connecting,
    error,
    emit,
    on,
    off,
    joinTrip,
    leaveTrip,
    sendMessage,
    sendLocationUpdate
  } = useWSContext();

  // Track subscribed events for cleanup
  const subscribedEventsRef = useRef<Map<string, (...args: any[]) => void>>(new Map());

  /**
   * Subscribe to event with automatic cleanup
   */
  const subscribe = useCallback((event: string, callback: (...args: any[]) => void) => {
    // Store callback reference for cleanup
    subscribedEventsRef.current.set(event, callback);
    
    // Subscribe to event
    on(event, callback);
  }, [on]);

  /**
   * Unsubscribe from event
   */
  const unsubscribe = useCallback((event: string, callback?: (...args: any[]) => void) => {
    const storedCallback = subscribedEventsRef.current.get(event);
    
    if (storedCallback || callback) {
      off(event, callback || storedCallback);
      subscribedEventsRef.current.delete(event);
    }
  }, [off]);

  // Handle connection state changes
  useEffect(() => {
    if (connected && onConnect) {
      onConnect();
    }
  }, [connected, onConnect]);

  useEffect(() => {
    if (!connected && !connecting && onDisconnect) {
      onDisconnect();
    }
  }, [connected, connecting, onDisconnect]);

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Auto-join trip on mount
  useEffect(() => {
    if (connected && autoJoinTrip) {
      console.log('🚗 Auto-joining trip:', autoJoinTrip);
      joinTrip(autoJoinTrip);

      return () => {
        console.log('🚪 Auto-leaving trip:', autoJoinTrip);
        leaveTrip(autoJoinTrip);
      };
    }
  }, [connected, autoJoinTrip, joinTrip, leaveTrip]);

  // Cleanup all subscriptions on unmount
  useEffect(() => {
    return () => {
      subscribedEventsRef.current.forEach((callback, event) => {
        off(event, callback);
      });
      subscribedEventsRef.current.clear();
    };
  }, [off]);

  return {
    connected,
    connecting,
    error,
    emit,
    subscribe,
    unsubscribe,
    joinTrip,
    leaveTrip,
    sendMessage,
    sendLocationUpdate
  };
};

export default useWebSocketHook;
