import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useNavigate } from 'react-router-dom';
import {
  FaBell,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTimesCircle,
  FaTimes,
  FaCheck,
  FaTrash,
  FaExternalLinkAlt,
  FaClock,
  FaWifi,
  FaWifiSlash,
  FaEnvelope,
  FaEnvelopeOpen
} from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const NotificationCenter = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadNotificationsCount,
    isConnected,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotification,
    clearAllNotifications
  } = useWebSocket();
  
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const dropdownRef = useRef(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar notificaciones
  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'read') return notif.read;
    return true;
  });

  // Obtener icono según tipo de notificación
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className="text-green-500" />;
      case 'warning':
        return <FaExclamationTriangle className="text-yellow-500" />;
      case 'error':
        return <FaTimesCircle className="text-red-500" />;
      default:
        return <FaInfoCircle className="text-blue-500" />;
    }
  };

  // Obtener color de fondo según tipo
  const getNotificationBg = (type, read) => {
    if (read) return 'bg-gray-50';
    
    switch (type) {
      case 'success':
        return 'bg-green-50';
      case 'warning':
        return 'bg-yellow-50';
      case 'error':
        return 'bg-red-50';
      default:
        return 'bg-blue-50';
    }
  };

  // Manejar clic en notificación
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markNotificationAsRead(notification.id);
    }
    
    if (notification.action) {
      setIsOpen(false);
      navigate(notification.action);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de notificaciones */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 transition"
      >
        <FaBell className="text-xl" />
        
        {/* Badge con contador */}
        {unreadNotificationsCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
          </span>
        )}
        
        {/* Indicador de conexión */}
        <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-gray-400'
        }`} />
      </button>

      {/* Dropdown de notificaciones */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Notificaciones</h3>
              <div className="flex items-center space-x-2">
                {/* Estado de conexión */}
                <div className="flex items-center space-x-1 text-xs">
                  {isConnected ? (
                    <>
                      <FaWifi className="text-green-500" />
                      <span className="text-green-600">Conectado</span>
                    </>
                  ) : (
                    <>
                      <FaWifiSlash className="text-gray-400" />
                      <span className="text-gray-500">Desconectado</span>
                    </>
                  )}
                </div>
                
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
            
            {/* Filtros */}
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm rounded-full transition ${
                  filter === 'all'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todas ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 text-sm rounded-full transition ${
                  filter === 'unread'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                No leídas ({unreadNotificationsCount})
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-3 py-1 text-sm rounded-full transition ${
                  filter === 'read'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Leídas ({notifications.length - unreadNotificationsCount})
              </button>
            </div>
          </div>

          {/* Lista de notificaciones */}
          <div className="max-h-96 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FaBell className="text-4xl mx-auto mb-3 text-gray-300" />
                <p className="text-sm">
                  {filter === 'unread' 
                    ? 'No tienes notificaciones sin leer'
                    : filter === 'read'
                      ? 'No tienes notificaciones leídas'
                      : 'No tienes notificaciones'
                  }
                </p>
              </div>
            ) : (
              filteredNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer ${
                    getNotificationBg(notification.type, notification.read)
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    {/* Icono */}
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${
                            notification.read ? 'text-gray-700' : 'text-gray-900'
                          }`}>
                            {notification.title}
                          </p>
                          <p className={`text-sm mt-1 ${
                            notification.read ? 'text-gray-500' : 'text-gray-700'
                          }`}>
                            {notification.message}
                          </p>
                        </div>
                        
                        {/* Indicador de no leído */}
                        {!notification.read && (
                          <div className="ml-2">
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <FaClock />
                          <span>
                            {formatDistanceToNow(notification.timestamp, {
                              addSuffix: true,
                              locale: es
                            })}
                          </span>
                          
                          {notification.action && (
                            <>
                              <span className="text-gray-400">•</span>
                              <FaExternalLinkAlt className="text-indigo-500" />
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markNotificationAsRead(notification.id);
                              }}
                              className="p-1 text-gray-400 hover:text-green-600 transition"
                              title="Marcar como leída"
                            >
                              <FaEnvelopeOpen className="text-sm" />
                            </button>
                          )}
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearNotification(notification.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition"
                            title="Eliminar"
                          >
                            <FaTrash className="text-sm" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer con acciones */}
          {filteredNotifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => {
                  markAllNotificationsAsRead();
                }}
                className="text-sm text-indigo-600 hover:text-indigo-700 transition flex items-center space-x-1"
              >
                <FaCheck />
                <span>Marcar todas como leídas</span>
              </button>
              
              <button
                onClick={() => {
                  if (window.confirm('¿Eliminar todas las notificaciones?')) {
                    clearAllNotifications();
                  }
                }}
                className="text-sm text-red-600 hover:text-red-700 transition flex items-center space-x-1"
              >
                <FaTrash />
                <span>Limpiar todas</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Componente de notificación toast
export const NotificationToast = () => {
  const { notifications } = useWebSocket();
  const [toasts, setToasts] = useState([]);
  const [lastNotificationId, setLastNotificationId] = useState(null);

  useEffect(() => {
    // Mostrar toast para nuevas notificaciones
    if (notifications.length > 0) {
      const latestNotification = notifications[0];
      if (latestNotification.id !== lastNotificationId) {
        setLastNotificationId(latestNotification.id);
        
        const newToast = {
          ...latestNotification,
          toastId: Date.now()
        };
        
        setToasts(prev => [newToast, ...prev].slice(0, 3)); // Máximo 3 toasts
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.toastId !== newToast.toastId));
        }, 5000);
      }
    }
  }, [notifications, lastNotificationId]);

  const removeToast = (toastId) => {
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  };

  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      default:
        return 'bg-indigo-500 text-white';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.toastId}
          className={`${getToastStyles(toast.type)} rounded-lg shadow-lg p-4 min-w-[300px] max-w-md transform transition-all duration-300 ease-in-out animate-slide-in-left`}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {toast.type === 'success' && <FaCheckCircle className="text-xl" />}
              {toast.type === 'warning' && <FaExclamationTriangle className="text-xl" />}
              {toast.type === 'error' && <FaTimesCircle className="text-xl" />}
              {toast.type === 'info' && <FaInfoCircle className="text-xl" />}
            </div>
            
            <div className="flex-1">
              <p className="font-semibold">{toast.title}</p>
              <p className="text-sm mt-1 opacity-90">{toast.message}</p>
            </div>
            
            <button
              onClick={() => removeToast(toast.toastId)}
              className="flex-shrink-0 ml-2 hover:opacity-80 transition"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationCenter;