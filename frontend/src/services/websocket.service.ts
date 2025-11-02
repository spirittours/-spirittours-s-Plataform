/**
 * WebSocket Service
 * 
 * Client-side WebSocket service for real-time notifications.
 */

import { EventEmitter } from 'events';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface NotificationData {
  notification_type: string;
  priority: string;
  title: string;
  message: string;
  data?: any;
  action_url?: string;
  timestamp: string;
  read: boolean;
}

export class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private shouldReconnect = true;

  constructor(
    private baseUrl: string,
    private userId: string,
    private deviceType: string = 'desktop'
  ) {
    super();
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    const wsUrl = `${this.baseUrl}/ws/connect?user_id=${this.userId}&device_type=${this.deviceType}&app_version=1.0.0`;

    console.log('Connecting to WebSocket:', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected');
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.isConnecting = false;
        this.stopHeartbeat();
        this.emit('disconnected');

        // Attempt reconnection if not closed intentionally
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnect();
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.isConnecting = false;
      this.emit('error', error);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Reconnect with exponential backoff
   */
  private reconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(message: WebSocketMessage): void {
    console.log('WebSocket message received:', message.type);

    switch (message.type) {
      case 'connection_established':
        console.log('Connection established:', message);
        break;

      case 'notification':
        this.emit('notification', message as NotificationData);
        break;

      case 'system_broadcast':
        this.emit('system_broadcast', message);
        break;

      case 'subscribed':
        this.emit('subscribed', message.room);
        break;

      case 'unsubscribed':
        this.emit('unsubscribed', message.room);
        break;

      case 'pong':
        // Heartbeat response
        break;

      case 'error':
        console.error('Server error:', message.message);
        this.emit('server_error', message.message);
        break;

      default:
        this.emit('message', message);
    }
  }

  /**
   * Send message to server
   */
  send(action: string, data: any = {}): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send message');
      return;
    }

    const message = {
      action,
      ...data,
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Subscribe to a room/channel
   */
  subscribe(room: string): void {
    this.send('subscribe', { room });
  }

  /**
   * Unsubscribe from a room/channel
   */
  unsubscribe(room: string): void {
    this.send('unsubscribe', { room });
  }

  /**
   * Start heartbeat/ping mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send('ping');
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  getState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }
}

// Singleton instance
let wsService: WebSocketService | null = null;

/**
 * Get or create WebSocket service instance
 */
export function getWebSocketService(
  baseUrl: string,
  userId: string,
  deviceType: string = 'desktop'
): WebSocketService {
  if (!wsService) {
    wsService = new WebSocketService(baseUrl, userId, deviceType);
  }
  return wsService;
}

/**
 * Reset WebSocket service (for logout, etc.)
 */
export function resetWebSocketService(): void {
  if (wsService) {
    wsService.disconnect();
    wsService = null;
  }
}
