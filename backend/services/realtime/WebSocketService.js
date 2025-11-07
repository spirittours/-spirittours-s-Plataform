/**
 * WebSocket Service - SPRINT 4.1
 * Real-time bidirectional communication using native WebSocket (ws)
 */

const WebSocket = require('ws');
const logger = require('../../utils/logger');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // userId -> WebSocket connections
    this.rooms = new Map(); // roomId -> Set of userIds
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });
    
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    logger.info('✅ WebSocket service initialized');
  }

  handleConnection(ws, req) {
    const userId = this.extractUserId(req);
    
    if (userId) {
      this.clients.set(userId, ws);
      logger.info(`WebSocket connected: user ${userId}`);
    }

    ws.on('message', (message) => {
      this.handleMessage(ws, userId, message);
    });

    ws.on('close', () => {
      if (userId) {
        this.clients.delete(userId);
        logger.info(`WebSocket disconnected: user ${userId}`);
      }
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });
  }

  handleMessage(ws, userId, message) {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'join_room':
          this.joinRoom(userId, data.roomId);
          break;
        case 'leave_room':
          this.leaveRoom(userId, data.roomId);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        default:
          logger.warn(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      logger.error('Error handling message:', error);
    }
  }

  extractUserId(req) {
    // Extract from query params or headers
    const url = new URL(req.url, 'http://localhost');
    return url.searchParams.get('userId');
  }

  joinRoom(userId, roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId).add(userId);
  }

  leaveRoom(userId, roomId) {
    if (this.rooms.has(roomId)) {
      this.rooms.get(roomId).delete(userId);
    }
  }

  // Send to specific user
  sendToUser(userId, event, data) {
    const ws = this.clients.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event, data }));
      return true;
    }
    return false;
  }

  // Broadcast to room
  broadcastToRoom(roomId, event, data) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.forEach(userId => {
        this.sendToUser(userId, event, data);
      });
    }
  }

  // Broadcast to all
  broadcast(event, data) {
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event, data }));
      }
    });
  }

  // Get WebSocket statistics
  getStats() {
    const connectedUsers = this.clients.size;
    const activeRooms = this.rooms.size;
    
    // Count trip and workspace rooms
    let activeTripRooms = 0;
    let activeWorkspaceRooms = 0;
    
    this.rooms.forEach((users, roomId) => {
      if (roomId.startsWith('trip_')) {
        activeTripRooms++;
      } else if (roomId.startsWith('workspace_')) {
        activeWorkspaceRooms++;
      }
    });

    return {
      connected_users: connectedUsers,
      active_rooms: activeRooms,
      active_trip_rooms: activeTripRooms,
      active_workspace_rooms: activeWorkspaceRooms,
      total_rooms: this.rooms.size
    };
  }

  // Get connection status
  isConnected() {
    return this.wss !== null;
  }

  // Close all connections
  closeAll() {
    this.clients.forEach((ws) => {
      ws.close();
    });
    this.clients.clear();
    this.rooms.clear();
    logger.info('All WebSocket connections closed');
  }
}

module.exports = new WebSocketService();
