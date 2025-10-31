import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

// Notification types
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'booking' | 'payment' | 'system';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action_url?: string;
  action_label?: string;
  metadata?: {
    booking_id?: string;
    payment_id?: string;
    user_id?: string;
    amount?: number;
    [key: string]: any;
  };
}

export interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  notification_types: {
    booking: boolean;
    payment: boolean;
    system: boolean;
    marketing: boolean;
  };
  quiet_hours: {
    enabled: boolean;
    start_time: string; // "22:00"
    end_time: string; // "08:00"
  };
}

export interface NotificationStats {
  total: number;
  unread: number;
  by_type: Record<NotificationType, number>;
  by_priority: Record<NotificationPriority, number>;
}

// WebSocket connection manager
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private messageHandlers: ((notification: Notification) => void)[] = [];
  private connectionHandlers: ((connected: boolean) => void)[] = [];

  connect(token: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      const wsUrl = `${WS_BASE_URL}/notifications?token=${token}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected successfully');
        this.reconnectAttempts = 0;
        this.notifyConnectionHandlers(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const notification: Notification = JSON.parse(event.data);
          this.notifyMessageHandlers(notification);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.notifyConnectionHandlers(false);
        this.attemptReconnect(token);
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    }
  }

  private attemptReconnect(token: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect(token);
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  onMessage(handler: (notification: Notification) => void): () => void {
    this.messageHandlers.push(handler);
    // Return unsubscribe function
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  onConnectionChange(handler: (connected: boolean) => void): () => void {
    this.connectionHandlers.push(handler);
    // Return unsubscribe function
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter(h => h !== handler);
    };
  }

  private notifyMessageHandlers(notification: Notification): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(notification);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        console.error('Error in connection handler:', error);
      }
    });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

class NotificationsService {
  private api: AxiosInstance;
  private wsManager: WebSocketManager;

  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/notifications`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token interceptor
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.wsManager = new WebSocketManager();
  }

  // WebSocket methods
  connectWebSocket(): void {
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.wsManager.connect(token);
    } else {
      console.error('No auth token found for WebSocket connection');
    }
  }

  disconnectWebSocket(): void {
    this.wsManager.disconnect();
  }

  onNotification(handler: (notification: Notification) => void): () => void {
    return this.wsManager.onMessage(handler);
  }

  onConnectionChange(handler: (connected: boolean) => void): () => void {
    return this.wsManager.onConnectionChange(handler);
  }

  isWebSocketConnected(): boolean {
    return this.wsManager.isConnected();
  }

  // REST API methods
  async getNotifications(
    limit: number = 50,
    offset: number = 0,
    unread_only: boolean = false
  ): Promise<{ notifications: Notification[]; total: number }> {
    const response = await this.api.get('/', {
      params: { limit, offset, unread_only },
    });
    return response.data;
  }

  async getNotification(notificationId: string): Promise<Notification> {
    const response = await this.api.get(`/${notificationId}`);
    return response.data;
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.api.patch(`/${notificationId}/read`);
  }

  async markAllAsRead(): Promise<void> {
    await this.api.post('/mark-all-read');
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await this.api.delete(`/${notificationId}`);
  }

  async deleteAllRead(): Promise<void> {
    await this.api.delete('/read');
  }

  async getStats(): Promise<NotificationStats> {
    const response = await this.api.get('/stats');
    return response.data;
  }

  async getPreferences(): Promise<NotificationPreferences> {
    const response = await this.api.get('/preferences');
    return response.data;
  }

  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const response = await this.api.patch('/preferences', preferences);
    return response.data;
  }

  async testNotification(type: NotificationType = 'info'): Promise<void> {
    await this.api.post('/test', { type });
  }

  // Mock data for demonstration
  getMockNotifications(): Notification[] {
    return [
      {
        id: '1',
        type: 'booking',
        priority: 'high',
        title: 'New Booking Received',
        message: 'Sarah Johnson has booked "Machu Picchu Adventure" for 4 guests',
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
        read: false,
        action_url: '/crm/bookings/BK-2024-001',
        action_label: 'View Booking',
        metadata: {
          booking_id: 'BK-2024-001',
          user_id: 'USR-123',
          amount: 4800,
        },
      },
      {
        id: '2',
        type: 'payment',
        priority: 'high',
        title: 'Payment Received',
        message: '$2,500 payment received from Michael Chen',
        timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
        read: false,
        action_url: '/payments/transactions/PAY-2024-042',
        action_label: 'View Payment',
        metadata: {
          payment_id: 'PAY-2024-042',
          user_id: 'USR-456',
          amount: 2500,
        },
      },
      {
        id: '3',
        type: 'system',
        priority: 'medium',
        title: 'System Update Available',
        message: 'A new version of Spirit Tours CRM is available (v2.5.0)',
        timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
        read: true,
        action_url: '/crm/system-config',
        action_label: 'Update Now',
      },
      {
        id: '4',
        type: 'success',
        priority: 'low',
        title: 'Backup Completed',
        message: 'Daily database backup completed successfully',
        timestamp: new Date(Date.now() - 3 * 60 * 60000).toISOString(),
        read: true,
      },
      {
        id: '5',
        type: 'warning',
        priority: 'medium',
        title: 'Low Inventory Alert',
        message: 'Adventure gear inventory running low for Patagonia tours',
        timestamp: new Date(Date.now() - 5 * 60 * 60000).toISOString(),
        read: false,
        action_url: '/crm/inventory',
        action_label: 'Check Inventory',
      },
      {
        id: '6',
        type: 'info',
        priority: 'low',
        title: 'New Customer Review',
        message: 'Emily Rodriguez left a 5-star review for "Amazon Rainforest Expedition"',
        timestamp: new Date(Date.now() - 24 * 60 * 60000).toISOString(),
        read: true,
        action_url: '/crm/reviews',
        action_label: 'View Review',
      },
    ];
  }

  getMockPreferences(): NotificationPreferences {
    return {
      email_enabled: true,
      push_enabled: true,
      sms_enabled: false,
      notification_types: {
        booking: true,
        payment: true,
        system: true,
        marketing: false,
      },
      quiet_hours: {
        enabled: true,
        start_time: '22:00',
        end_time: '08:00',
      },
    };
  }

  getMockStats(): NotificationStats {
    return {
      total: 6,
      unread: 3,
      by_type: {
        info: 1,
        success: 1,
        warning: 1,
        error: 0,
        booking: 1,
        payment: 1,
        system: 1,
      },
      by_priority: {
        low: 2,
        medium: 2,
        high: 2,
        urgent: 0,
      },
    };
  }
}

// Export singleton instance
const notificationsService = new NotificationsService();
export default notificationsService;
