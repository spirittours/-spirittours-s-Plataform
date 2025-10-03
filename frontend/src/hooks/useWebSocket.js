/**
 * Advanced WebSocket Hook
 * Comprehensive WebSocket hook for real-time analytics and notifications.
 * 
 * Features:
 * - Auto-reconnection with exponential backoff
 * - Message compression/decompression
 * - Connection status monitoring
 * - Error handling and recovery
 * - Subscription management
 * - Performance optimization
 */

import { useEffect, useRef, useState, useCallback } from 'react';

const WEBSOCKET_STATES = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

const DEFAULT_OPTIONS = {
  enabled: true,
  reconnectAttempts: 5,
  reconnectInterval: 1000,
  maxReconnectInterval: 30000,
  reconnectDecay: 1.5,
  onOpen: null,
  onMessage: null,
  onError: null,
  onClose: null,
  protocols: [],
  compressionEnabled: true
};

export const useWebSocket = (url, options = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionStats, setConnectionStats] = useState({
    attempts: 0,
    lastConnected: null,
    totalMessages: 0,
    totalErrors: 0
  });

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectIntervalRef = useRef(config.reconnectInterval);
  const messageQueueRef = useRef([]);
  const statsRef = useRef(connectionStats);

  // Update stats helper
  const updateStats = useCallback((update) => {
    statsRef.current = { ...statsRef.current, ...update };
    setConnectionStats(statsRef.current);
  }, []);

  // Decompress message if needed
  const decompressMessage = useCallback((messageData) => {
    try {
      if (messageData.compressed && config.compressionEnabled) {
        // Decode base64 compressed data
        const compressedData = atob(messageData.data);
        const uint8Array = new Uint8Array(compressedData.length);
        for (let i = 0; i < compressedData.length; i++) {
          uint8Array[i] = compressedData.charCodeAt(i);
        }
        
        // Use browser's built-in decompression if available
        if (typeof DecompressionStream !== 'undefined') {
          const stream = new DecompressionStream('gzip');
          const writer = stream.writable.getWriter();
          const reader = stream.readable.getReader();
          
          writer.write(uint8Array);
          writer.close();
          
          return reader.read().then(({ value }) => {
            const decompressed = new TextDecoder().decode(value);
            return JSON.parse(decompressed);
          });
        } else {
          // Fallback: assume it's already decompressed JSON
          console.warn('Compression not supported, treating as plain JSON');
          return JSON.parse(messageData.data);
        }
      } else {
        return messageData;
      }
    } catch (error) {
      console.error('Error decompressing message:', error);
      return messageData;
    }
  }, [config.compressionEnabled]);

  // Handle incoming messages
  const handleMessage = useCallback(async (event) => {
    try {
      const rawData = JSON.parse(event.data);
      const messageData = await decompressMessage(rawData);
      
      setLastMessage(messageData);
      updateStats({ totalMessages: statsRef.current.totalMessages + 1 });
      
      if (config.onMessage) {
        config.onMessage(messageData);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      setError('Failed to parse message');
      updateStats({ totalErrors: statsRef.current.totalErrors + 1 });
    }
  }, [config.onMessage, decompressMessage, updateStats]);

  // Handle connection open
  const handleOpen = useCallback(() => {
    console.log('WebSocket connected to:', url);
    setConnected(true);
    setConnecting(false);
    setError(null);
    reconnectAttemptsRef.current = 0;
    reconnectIntervalRef.current = config.reconnectInterval;
    
    updateStats({ 
      lastConnected: new Date().toISOString(),
      attempts: statsRef.current.attempts + 1
    });

    // Send queued messages
    while (messageQueueRef.current.length > 0) {
      const queuedMessage = messageQueueRef.current.shift();
      if (wsRef.current?.readyState === WEBSOCKET_STATES.OPEN) {
        wsRef.current.send(queuedMessage);
      }
    }

    if (config.onOpen) {
      config.onOpen();
    }
  }, [url, config.onOpen, config.reconnectInterval, updateStats]);

  // Handle connection close
  const handleClose = useCallback((event) => {
    console.log('WebSocket disconnected:', event.code, event.reason);
    setConnected(false);
    setConnecting(false);

    if (!event.wasClean && config.enabled) {
      setError(`Connection closed unexpectedly: ${event.reason || 'Unknown reason'}`);
      
      // Attempt reconnection
      if (reconnectAttemptsRef.current < config.reconnectAttempts) {
        reconnectAttemptsRef.current++;
        
        console.log(`Attempting reconnection ${reconnectAttemptsRef.current}/${config.reconnectAttempts} in ${reconnectIntervalRef.current}ms`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
          reconnectIntervalRef.current = Math.min(
            reconnectIntervalRef.current * config.reconnectDecay,
            config.maxReconnectInterval
          );
        }, reconnectIntervalRef.current);
        
      } else {
        setError('Maximum reconnection attempts reached');
        updateStats({ totalErrors: statsRef.current.totalErrors + 1 });
      }
    }

    if (config.onClose) {
      config.onClose(event);
    }
  }, [config.enabled, config.reconnectAttempts, config.reconnectDecay, config.maxReconnectInterval, config.onClose, updateStats]);

  // Handle connection error
  const handleError = useCallback((error) => {
    console.error('WebSocket error:', error);
    setError('Connection error occurred');
    updateStats({ totalErrors: statsRef.current.totalErrors + 1 });

    if (config.onError) {
      config.onError(error);
    }
  }, [config.onError, updateStats]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!config.enabled) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.removeEventListener('open', handleOpen);
      wsRef.current.removeEventListener('message', handleMessage);
      wsRef.current.removeEventListener('close', handleClose);
      wsRef.current.removeEventListener('error', handleError);
      
      if (wsRef.current.readyState === WEBSOCKET_STATES.OPEN) {
        wsRef.current.close();
      }
    }

    setConnecting(true);
    setError(null);

    try {
      // Create WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = url.startsWith('ws') ? url : `${protocol}//${window.location.host}${url}`;
      
      wsRef.current = new WebSocket(wsUrl, config.protocols);

      // Set up event listeners
      wsRef.current.addEventListener('open', handleOpen);
      wsRef.current.addEventListener('message', handleMessage);
      wsRef.current.addEventListener('close', handleClose);
      wsRef.current.addEventListener('error', handleError);

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnecting(false);
      setError('Failed to create connection');
      handleError(error);
    }
  }, [url, config.enabled, config.protocols, handleOpen, handleMessage, handleClose, handleError]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.removeEventListener('open', handleOpen);
      wsRef.current.removeEventListener('message', handleMessage);
      wsRef.current.removeEventListener('close', handleClose);
      wsRef.current.removeEventListener('error', handleError);
      
      if (wsRef.current.readyState === WEBSOCKET_STATES.OPEN) {
        wsRef.current.close(1000, 'Client disconnect');
      }
      wsRef.current = null;
    }

    setConnected(false);
    setConnecting(false);
  }, [handleOpen, handleMessage, handleClose, handleError]);

  // Send message
  const send = useCallback((data) => {
    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      
      if (wsRef.current?.readyState === WEBSOCKET_STATES.OPEN) {
        wsRef.current.send(message);
        return true;
      } else {
        // Queue message for when connection is restored
        messageQueueRef.current.push(message);
        
        // Attempt to connect if not already connected
        if (!connected && !connecting && config.enabled) {
          connect();
        }
        
        return false;
      }
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      setError('Failed to send message');
      return false;
    }
  }, [connected, connecting, config.enabled, connect]);

  // Subscribe to specific analytics types
  const subscribe = useCallback((subscriptions, updateFrequency = 'normal') => {
    const subscriptionMessage = {
      type: 'subscribe',
      subscriptions: Array.isArray(subscriptions) ? subscriptions : [subscriptions],
      update_frequency: updateFrequency,
      compression: config.compressionEnabled
    };
    
    return send(subscriptionMessage);
  }, [send, config.compressionEnabled]);

  // Unsubscribe from analytics types
  const unsubscribe = useCallback((subscriptions) => {
    const unsubscriptionMessage = {
      type: 'unsubscribe',
      subscriptions: Array.isArray(subscriptions) ? subscriptions : [subscriptions]
    };
    
    return send(unsubscriptionMessage);
  }, [send]);

  // Get connection info
  const getConnectionInfo = useCallback(() => {
    return {
      connected,
      connecting,
      error,
      readyState: wsRef.current?.readyState,
      url: wsRef.current?.url,
      protocol: wsRef.current?.protocol,
      stats: connectionStats
    };
  }, [connected, connecting, error, connectionStats]);

  // Effect to handle connection lifecycle
  useEffect(() => {
    if (config.enabled) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [config.enabled, connect, disconnect]);

  // Effect to handle URL changes
  useEffect(() => {
    if (config.enabled && connected) {
      // Reconnect if URL changed while connected
      disconnect();
      setTimeout(() => connect(), 100);
    }
  }, [url]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    connected,
    connecting,
    error,
    lastMessage,
    connectionStats,
    send,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
    getConnectionInfo
  };
};