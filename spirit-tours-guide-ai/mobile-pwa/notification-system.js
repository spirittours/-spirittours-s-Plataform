/**
 * PWA Notification System
 * Sistema granular de notificaciones push con permisos configurables
 */

class NotificationSystem {
  constructor() {
    this.swRegistration = null;
    this.permissions = {
      global: false,
      group: false,
      individual: false
    };
    this.currentTourId = null;
    this.userRole = 'passenger'; // passenger, guide, coordinator, admin
    this.notificationQueue = [];
  }

  /**
   * Inicializa el Service Worker y solicita permisos
   */
  async initialize(options = {}) {
    const {
      vapidPublicKey,
      apiUrl = '/api',
      tourId = null,
      userRole = 'passenger'
    } = options;

    this.currentTourId = tourId;
    this.userRole = userRole;

    try {
      // Verificar soporte de Service Worker
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker no soportado en este navegador');
      }

      // Verificar soporte de notificaciones
      if (!('Notification' in window)) {
        throw new Error('Notificaciones no soportadas en este navegador');
      }

      // Registrar Service Worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrado:', this.swRegistration);

      // Solicitar permisos de notificación
      const permission = await this.requestPermission();
      
      if (permission === 'granted') {
        // Suscribirse a notificaciones push
        await this.subscribeToPushNotifications(vapidPublicKey);
        
        // Configurar permisos según rol
        this.configurePermissions();
        
        return { success: true, permission: 'granted' };
      } else {
        return { success: false, permission };
      }

    } catch (error) {
      console.error('Error inicializando notificaciones:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Solicita permiso para mostrar notificaciones
   */
  async requestPermission() {
    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Se suscribe a notificaciones push
   */
  async subscribeToPushNotifications(vapidPublicKey) {
    try {
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });

      // Enviar suscripción al servidor
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription,
          tourId: this.currentTourId,
          userRole: this.userRole
        })
      });

      console.log('Suscrito a notificaciones push');
      return subscription;

    } catch (error) {
      console.error('Error suscribiendo a push:', error);
      throw error;
    }
  }

  /**
   * Configura permisos según el rol del usuario
   */
  configurePermissions() {
    switch (this.userRole) {
      case 'admin':
        this.permissions = {
          global: true,
          group: true,
          individual: true,
          canDelegate: true
        };
        break;

      case 'coordinator':
        this.permissions = {
          global: false,
          group: true, // Solo sus grupos asignados
          individual: true,
          canDelegate: false
        };
        break;

      case 'guide':
        this.permissions = {
          global: false,
          group: true, // Solo su grupo activo
          individual: true,
          canDelegate: false
        };
        break;

      case 'passenger':
      default:
        this.permissions = {
          global: false,
          group: false,
          individual: false,
          canDelegate: false
        };
        break;
    }
  }

  /**
   * Envía una notificación
   */
  async sendNotification(notificationData) {
    const {
      title,
      message,
      type = 'info', // info, success, warning, alert, location, event
      priority = 'medium', // low, medium, high, urgent
      target = 'individual', // individual, group, global
      tourId = this.currentTourId,
      recipients = [],
      actions = [],
      data = {},
      icon,
      image,
      badge,
      vibrate = [200, 100, 200],
      requireInteraction = false,
      silent = false,
      scheduledTime = null
    } = notificationData;

    // Verificar permisos según target
    if (target === 'global' && !this.permissions.global) {
      throw new Error('No tienes permisos para enviar notificaciones globales');
    }

    if (target === 'group' && !this.permissions.group) {
      throw new Error('No tienes permisos para enviar notificaciones a grupos');
    }

    const notification = {
      id: this.generateNotificationId(),
      title,
      body: message,
      type,
      priority,
      target,
      tourId,
      recipients,
      icon: icon || this.getIconByType(type),
      image,
      badge: badge || '/icons/badge.png',
      vibrate,
      requireInteraction: priority === 'urgent' || requireInteraction,
      silent,
      actions,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        sentBy: this.userRole,
        type
      },
      timestamp: new Date()
    };

    // Si está programada, agregarla a la cola
    if (scheduledTime) {
      notification.scheduledTime = scheduledTime;
      this.notificationQueue.push(notification);
      this.scheduleNotification(notification);
      return notification;
    }

    // Enviar inmediatamente
    return await this._sendNotification(notification);
  }

  /**
   * Envía la notificación al servidor y la muestra localmente
   */
  async _sendNotification(notification) {
    try {
      // Enviar al servidor para distribución
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notification)
      });

      if (!response.ok) {
        throw new Error('Error enviando notificación al servidor');
      }

      // Mostrar notificación local si es para este usuario
      if (this.shouldShowNotification(notification)) {
        await this.showLocalNotification(notification);
      }

      return notification;

    } catch (error) {
      console.error('Error enviando notificación:', error);
      throw error;
    }
  }

  /**
   * Muestra notificación local
   */
  async showLocalNotification(notification) {
    if (Notification.permission !== 'granted') {
      return;
    }

    const options = {
      body: notification.body,
      icon: notification.icon,
      image: notification.image,
      badge: notification.badge,
      vibrate: notification.vibrate,
      requireInteraction: notification.requireInteraction,
      silent: notification.silent,
      actions: notification.actions,
      data: notification.data,
      tag: notification.id
    };

    if (this.swRegistration) {
      await this.swRegistration.showNotification(notification.title, options);
    } else {
      new Notification(notification.title, options);
    }
  }

  /**
   * Programa una notificación para el futuro
   */
  scheduleNotification(notification) {
    const delay = new Date(notification.scheduledTime) - new Date();
    
    if (delay <= 0) {
      this._sendNotification(notification);
      return;
    }

    setTimeout(() => {
      this._sendNotification(notification);
      this.notificationQueue = this.notificationQueue.filter(
        n => n.id !== notification.id
      );
    }, delay);
  }

  /**
   * Notificaciones predefinidas por tipo de evento
   */
  async notifyWaypointReached(waypoint, tourData) {
    return await this.sendNotification({
      title: `📍 Llegamos a ${waypoint.name}`,
      message: `${waypoint.description}. Duración estimada: ${waypoint.duration} minutos.`,
      type: 'location',
      priority: 'medium',
      target: 'group',
      tourId: tourData.tourId,
      data: {
        waypointId: waypoint.id,
        waypointName: waypoint.name
      }
    });
  }

  async notifyRouteDeviation(deviation, tourData) {
    return await this.sendNotification({
      title: '🔄 Pequeño desvío en la ruta',
      message: 'Estamos tomando una ruta alternativa. Mientras tanto, aquí hay algo interesante...',
      type: 'info',
      priority: 'low',
      target: 'group',
      tourId: tourData.tourId,
      data: {
        deviation,
        suggestedContent: deviation.suggestedContent
      }
    });
  }

  async notifyETAUpdate(eta, tourData) {
    return await this.sendNotification({
      title: '⏰ Actualización de llegada',
      message: `Llegada estimada al siguiente punto: ${eta.minutes} minutos`,
      type: 'info',
      priority: 'low',
      target: 'group',
      tourId: tourData.tourId,
      silent: true,
      data: { eta }
    });
  }

  async notifyTourStart(tourData) {
    return await this.sendNotification({
      title: '🚀 ¡El tour ha comenzado!',
      message: `Bienvenidos a ${tourData.route.name}. Disfruten del viaje.`,
      type: 'event',
      priority: 'high',
      target: 'group',
      tourId: tourData.tourId,
      requireInteraction: true
    });
  }

  async notifyTourEnd(tourData) {
    return await this.sendNotification({
      title: '🎉 ¡Tour completado!',
      message: 'Gracias por visitarnos. Por favor, comparte tu experiencia y síguenos en redes sociales.',
      type: 'success',
      priority: 'high',
      target: 'group',
      tourId: tourData.tourId,
      actions: [
        { action: 'rate', title: '⭐ Calificar' },
        { action: 'share', title: '📤 Compartir' }
      ]
    });
  }

  async notifyEmergency(message, location) {
    return await this.sendNotification({
      title: '🚨 ALERTA DE EMERGENCIA',
      message,
      type: 'alert',
      priority: 'urgent',
      target: 'global',
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      data: {
        emergency: true,
        location
      }
    });
  }

  async notifySocialEngagement() {
    return await this.sendNotification({
      title: '❤️ ¡Ayúdanos a crecer!',
      message: 'Si te gustó la experiencia, síguenos y comparte en redes sociales',
      type: 'event',
      priority: 'low',
      target: 'group',
      tourId: this.currentTourId,
      actions: [
        { action: 'like', title: '👍 Like' },
        { action: 'follow', title: '➕ Seguir' },
        { action: 'share', title: '📤 Compartir' }
      ]
    });
  }

  /**
   * Determina si debe mostrar la notificación para este usuario
   */
  shouldShowNotification(notification) {
    if (notification.target === 'global') {
      return true;
    }

    if (notification.target === 'group' && notification.tourId === this.currentTourId) {
      return true;
    }

    if (notification.target === 'individual' && notification.recipients.includes(this.userId)) {
      return true;
    }

    return false;
  }

  /**
   * Obtiene icono según tipo de notificación
   */
  getIconByType(type) {
    const icons = {
      info: '/icons/info.png',
      success: '/icons/success.png',
      warning: '/icons/warning.png',
      alert: '/icons/alert.png',
      location: '/icons/location.png',
      event: '/icons/event.png'
    };
    return icons[type] || icons.info;
  }

  /**
   * Genera ID único para notificación
   */
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convierte VAPID key a Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Obtiene notificaciones pendientes
   */
  getPendingNotifications() {
    return this.notificationQueue;
  }

  /**
   * Limpia todas las notificaciones
   */
  async clearAllNotifications() {
    if (this.swRegistration) {
      const notifications = await this.swRegistration.getNotifications();
      notifications.forEach(notification => notification.close());
    }
  }

  /**
   * Desuscribirse de notificaciones push
   */
  async unsubscribe() {
    if (this.swRegistration) {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        
        // Notificar al servidor
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ subscription })
        });
      }
    }
  }

  /**
   * Obtiene estadísticas de notificaciones
   */
  getStats() {
    return {
      permissions: this.permissions,
      userRole: this.userRole,
      currentTourId: this.currentTourId,
      pendingNotifications: this.notificationQueue.length,
      notificationPermission: Notification.permission
    };
  }
}

// Exportar instancia singleton
const notificationSystem = new NotificationSystem();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = notificationSystem;
}

export default notificationSystem;
