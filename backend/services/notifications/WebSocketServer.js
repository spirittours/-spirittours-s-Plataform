/**
 * WebSocket Server for Real-time Notifications
 */

const WebSocket = require('ws');
const { getNotificationService } = require('./NotificationService');

class WebSocketServer {
  constructor(server, config = {}) {
    this.wss = new WebSocket.Server({ 
      server,
      path: config.path || '/ws',
      clientTracking: true
    });

    this.notificationService = getNotificationService();
    this.setupHandlers();
  }

  setupHandlers() {
    this.wss.on('connection', (ws, req) => {
      const userId = this.extractUserId(req);
      
      if (!userId) {
        ws.close(1008, 'Authentication required');
        return;
      }

      // Register client
      this.notificationService.registerWSClient(userId, ws);
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        userId,
        timestamp: new Date()
      }));

      // Handle messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(userId, data, ws);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      // Handle close
      ws.on('close', () => {
        this.notificationService.unregisterWSClient(userId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      // Ping/pong for keepalive
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });
    });

    // Heartbeat interval
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  extractUserId(req) {
    // Extract from query string or cookie
    const url = new URL(req.url, `http://${req.headers.host}`);
    return url.searchParams.get('userId');
  }

  handleMessage(userId, data, ws) {
    switch (data.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
        break;
      case 'subscribe':
        // Handle subscription logic
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  broadcast(message) {
    return this.notificationService.broadcast(message);
  }

  getStats() {
    return {
      clients: this.wss.clients.size,
      ...this.notificationService.getStatistics()
    };
  }
}

module.exports = WebSocketServer;
