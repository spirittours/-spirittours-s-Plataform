/**
 * WebSocket Context Provider
 * 
 * Provides WebSocket connection management across the entire app:
 * - Automatic connection with JWT authentication
 * - Reconnection handling
 * - Event subscription/unsubscription
 * - Connection state management
 * - Error handling
 * 
 * Usage:
 * import { useWebSocket } from '../contexts/WebSocketContext';
 * const { socket, connected, emit, on, off } = useWebSocket();
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// WebSocket server URL
const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:5001';

// Types
interface WebSocketContextType {
  socket: Socket | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  emit: (event: string, data: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  joinTrip: (tripId: string) => void;
  leaveTrip: (tripId: string) => void;
  sendMessage: (tripId: string, message: string, type?: string) => void;
  sendLocationUpdate: (tripId: string, latitude: number, longitude: number, speed?: number, heading?: number) => void;
  getConnectionStats: () => ConnectionStats;
}

interface ConnectionStats {
  connected: boolean;
  reconnectAttempts: number;
  lastConnected: Date | null;
  uptime: number;
}

// Create context
const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// Provider props
interface WebSocketProviderProps {
  children: React.ReactNode;
  autoConnect?: boolean;
}

/**
 * WebSocket Provider Component
 */
export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children, 
  autoConnect = true 
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const [lastConnected, setLastConnected] = useState<Date | null>(null);
  const [connectedAt, setConnectedAt] = useState<Date | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Initialize WebSocket connection
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('🔌 Already connected to WebSocket');
      return;
    }

    // Get authentication token
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      console.error('❌ No auth token found, cannot connect to WebSocket');
      setError('Authentication required');
      return;
    }

    console.log('🔌 Connecting to WebSocket:', WS_URL);
    setConnecting(true);
    setError(null);

    // Create Socket.io connection
    const newSocket = io(WS_URL, {
      auth: {
        token: token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 20000,
      transports: ['websocket', 'polling']
    });

    // Connection successful
    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected:', newSocket.id);
      setConnected(true);
      setConnecting(false);
      setError(null);
      setReconnectAttempts(0);
      setLastConnected(new Date());
      setConnectedAt(new Date());
    });

    // Connection confirmation from server
    newSocket.on('connected', (data) => {
      console.log('✅ Server confirmed connection:', data);
    });

    // Connection error
    newSocket.on('connect_error', (err) => {
      console.error('❌ WebSocket connection error:', err.message);
      setConnecting(false);
      setError(err.message);
      
      // Retry connection
      setReconnectAttempts(prev => prev + 1);
    });

    // Disconnected
    newSocket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      setConnected(false);
      setConnectedAt(null);

      if (reason === 'io server disconnect') {
        // Server disconnected, reconnect manually
        newSocket.connect();
      }
    });

    // Reconnecting
    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
      setReconnectAttempts(attemptNumber);
    });

    // Reconnection successful
    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      setReconnectAttempts(0);
    });

    // Reconnection failed
    newSocket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed');
      setError('Failed to reconnect to server');
    });

    // Error event
    newSocket.on('error', (err) => {
      console.error('❌ WebSocket error:', err);
      setError(err.message || 'WebSocket error');
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  }, []);

  /**
   * Disconnect WebSocket
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Disconnecting WebSocket...');
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
      setConnecting(false);
    }
  }, []);

  /**
   * Emit event to server
   */
  const emit = useCallback((event: string, data: any) => {
    if (!socketRef.current?.connected) {
      console.warn('⚠️ Cannot emit, socket not connected');
      return;
    }

    socketRef.current.emit(event, data);
    console.log('📤 Emitted:', event, data);
  }, []);

  /**
   * Subscribe to event
   */
  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (!socketRef.current) {
      console.warn('⚠️ Cannot subscribe, socket not initialized');
      return;
    }

    socketRef.current.on(event, callback);
    console.log('👂 Subscribed to:', event);
  }, []);

  /**
   * Unsubscribe from event
   */
  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (!socketRef.current) {
      return;
    }

    if (callback) {
      socketRef.current.off(event, callback);
    } else {
      socketRef.current.off(event);
    }
    console.log('🔇 Unsubscribed from:', event);
  }, []);

  /**
   * Join trip room
   */
  const joinTrip = useCallback((tripId: string) => {
    emit('join_trip', { trip_id: tripId });
  }, [emit]);

  /**
   * Leave trip room
   */
  const leaveTrip = useCallback((tripId: string) => {
    emit('leave_trip', { trip_id: tripId });
  }, [emit]);

  /**
   * Send chat message
   */
  const sendMessage = useCallback((tripId: string, message: string, type: string = 'text') => {
    emit('send_message', {
      trip_id: tripId,
      message_text: message,
      message_type: type
    });
  }, [emit]);

  /**
   * Send GPS location update
   */
  const sendLocationUpdate = useCallback((
    tripId: string, 
    latitude: number, 
    longitude: number, 
    speed?: number, 
    heading?: number
  ) => {
    emit('location_update', {
      trip_id: tripId,
      latitude,
      longitude,
      speed,
      heading,
      accuracy: 10 // meters
    });
  }, [emit]);

  /**
   * Get connection statistics
   */
  const getConnectionStats = useCallback((): ConnectionStats => {
    const uptime = connectedAt ? Date.now() - connectedAt.getTime() : 0;

    return {
      connected,
      reconnectAttempts,
      lastConnected,
      uptime
    };
  }, [connected, reconnectAttempts, lastConnected, connectedAt]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [autoConnect, connect, disconnect]);

  // Context value
  const value: WebSocketContextType = {
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
    sendLocationUpdate,
    getConnectionStats
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

/**
 * Custom hook to use WebSocket context
 */
export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  
  return context;
};

export default WebSocketContext;
