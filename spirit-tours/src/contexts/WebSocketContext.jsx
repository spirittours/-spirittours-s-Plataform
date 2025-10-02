import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext({});

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({});
  const [lastActivity, setLastActivity] = useState(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const messageHandlers = useRef(new Map());

  // Configuración del WebSocket
  const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';
  const RECONNECT_DELAY = 3000;
  const PING_INTERVAL = 30000;

  // Conectar WebSocket
  const connect = useCallback(() => {
    if (socket?.readyState === WebSocket.OPEN) return;

    console.log('Connecting to WebSocket...');
    const ws = new WebSocket(`${WS_URL}?token=${token}`);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setSocket(ws);
      
      // Enviar información del usuario
      if (user) {
        ws.send(JSON.stringify({
          type: 'user_connected',
          data: {
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            role: user.role
          }
        }));
      }

      // Configurar ping para mantener la conexión viva
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, PING_INTERVAL);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setSocket(null);

      // Limpiar ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      // Intentar reconectar
      if (user && token) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, RECONNECT_DELAY);
      }
    };

    setSocket(ws);
  }, [user, token, WS_URL]);

  // Desconectar WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (socket) {
      socket.close();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  // Manejar mensajes entrantes
  const handleMessage = useCallback((message) => {
    console.log('Received message:', message);
    setLastActivity(new Date());

    switch (message.type) {
      case 'notification':
        handleNotification(message.data);
        break;
      
      case 'user_online':
        setOnlineUsers(prev => new Set([...prev, message.data.userId]));
        break;
      
      case 'user_offline':
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(message.data.userId);
          return newSet;
        });
        break;
      
      case 'users_online':
        setOnlineUsers(new Set(message.data.users));
        break;
      
      case 'typing_start':
        setTypingUsers(prev => ({
          ...prev,
          [message.data.channelId]: [
            ...(prev[message.data.channelId] || []),
            message.data.userId
          ]
        }));
        break;
      
      case 'typing_stop':
        setTypingUsers(prev => ({
          ...prev,
          [message.data.channelId]: (prev[message.data.channelId] || [])
            .filter(id => id !== message.data.userId)
        }));
        break;
      
      case 'booking_update':
        handleBookingUpdate(message.data);
        break;
      
      case 'chat_message':
        handleChatMessage(message.data);
        break;
      
      case 'agent_response':
        handleAgentResponse(message.data);
        break;
      
      case 'pong':
        // Respuesta al ping, no hacer nada
        break;
      
      default:
        // Manejar mensajes personalizados
        const handlers = messageHandlers.current.get(message.type);
        if (handlers) {
          handlers.forEach(handler => handler(message.data));
        }
        break;
    }
  }, []);

  // Manejar notificaciones
  const handleNotification = useCallback((data) => {
    const notification = {
      id: data.id || Date.now(),
      title: data.title,
      message: data.message,
      type: data.type || 'info', // info, success, warning, error
      timestamp: new Date(),
      read: false,
      action: data.action,
      data: data.extra
    };

    setNotifications(prev => [notification, ...prev]);

    // Mostrar notificación del navegador si está permitido
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotif = new Notification(notification.title, {
        body: notification.message,
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [200, 100, 200]
      });

      browserNotif.onclick = () => {
        window.focus();
        if (notification.action) {
          window.location.href = notification.action;
        }
      };
    }
  }, []);

  // Manejar actualización de reservas
  const handleBookingUpdate = useCallback((data) => {
    const notification = {
      id: Date.now(),
      title: 'Actualización de Reserva',
      message: data.message || 'Tu reserva ha sido actualizada',
      type: data.status === 'confirmed' ? 'success' : 'info',
      timestamp: new Date(),
      read: false,
      action: `/booking/${data.bookingId}`,
      data: data
    };

    setNotifications(prev => [notification, ...prev]);
  }, []);

  // Manejar mensajes de chat
  const handleChatMessage = useCallback((data) => {
    const notification = {
      id: Date.now(),
      title: `Mensaje de ${data.senderName}`,
      message: data.message,
      type: 'info',
      timestamp: new Date(),
      read: false,
      action: `/chat/${data.channelId}`,
      data: data
    };

    setNotifications(prev => [notification, ...prev]);
  }, []);

  // Manejar respuestas de agentes IA
  const handleAgentResponse = useCallback((data) => {
    const notification = {
      id: Date.now(),
      title: `${data.agentName} respondió`,
      message: data.response,
      type: 'info',
      timestamp: new Date(),
      read: false,
      data: data
    };

    setNotifications(prev => [notification, ...prev]);
  }, []);

  // Enviar mensaje a través del WebSocket
  const sendMessage = useCallback((type, data) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type,
        data,
        timestamp: new Date().toISOString()
      }));
      return true;
    }
    console.error('WebSocket not connected');
    return false;
  }, [socket]);

  // Suscribirse a mensajes específicos
  const subscribe = useCallback((messageType, handler) => {
    if (!messageHandlers.current.has(messageType)) {
      messageHandlers.current.set(messageType, []);
    }
    messageHandlers.current.get(messageType).push(handler);

    // Retornar función de desuscripción
    return () => {
      const handlers = messageHandlers.current.get(messageType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }, []);

  // Marcar notificación como leída
  const markNotificationAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
  }, []);

  // Marcar todas las notificaciones como leídas
  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  }, []);

  // Limpiar notificación
  const clearNotification = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.filter(notif => notif.id !== notificationId)
    );
  }, []);

  // Limpiar todas las notificaciones
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Solicitar permisos de notificación
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  // Enviar indicador de escritura
  const sendTypingIndicator = useCallback((channelId, isTyping) => {
    sendMessage(isTyping ? 'typing_start' : 'typing_stop', {
      channelId,
      userId: user?.id
    });
  }, [sendMessage, user]);

  // Efectos
  useEffect(() => {
    if (user && token) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user, token, connect, disconnect]);

  // Solicitar permisos de notificación al montar
  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  const value = {
    // Estado
    socket,
    isConnected,
    notifications,
    onlineUsers,
    typingUsers,
    lastActivity,
    
    // Métodos
    sendMessage,
    subscribe,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotification,
    clearAllNotifications,
    requestNotificationPermission,
    sendTypingIndicator,
    
    // Conexión
    connect,
    disconnect,
    
    // Contadores útiles
    unreadNotificationsCount: notifications.filter(n => !n.read).length,
    totalNotifications: notifications.length
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;