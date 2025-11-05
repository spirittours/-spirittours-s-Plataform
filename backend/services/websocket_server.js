/**
 * WebSocket Server for Real-time Communication
 * 
 * Provides real-time features:
 * - Chat messaging with instant delivery
 * - Typing indicators
 * - Online/offline status
 * - GPS location updates in real-time
 * - Notification delivery status
 * - Trip status updates
 * 
 * Uses Socket.io for WebSocket connections with fallback to long polling
 * 
 * Events:
 * - connection: New client connects
 * - join_trip: Client joins a trip room
 * - send_message: Send chat message
 * - typing: User is typing
 * - stop_typing: User stopped typing
 * - location_update: GPS location changed
 * - disconnect: Client disconnects
 */

const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

class WebSocketServer {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // user_id -> socket_id
    this.tripRooms = new Map(); // trip_id -> Set of socket_ids
    this.typingUsers = new Map(); // trip_id -> Set of user_ids
    this.workspaceRooms = new Map(); // workspace_id -> Set of socket_ids
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    this.io = socketIO(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        socket.userId = decoded.user_id;
        socket.userRole = decoded.role;

        next();
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket) => {
      console.log(`✅ User connected: ${socket.userId} (${socket.id})`);
      
      this.handleConnection(socket);
      this.setupEventHandlers(socket);
    });

    console.log('🚀 WebSocket server initialized');
  }

  /**
   * Handle new connection
   */
  handleConnection(socket) {
    // Store connected user
    this.connectedUsers.set(socket.userId, socket.id);

    // Send connection confirmation
    socket.emit('connected', {
      user_id: socket.userId,
      timestamp: new Date().toISOString()
    });

    // Broadcast user online status to relevant rooms
    this.broadcastUserStatus(socket.userId, true);
  }

  /**
   * Setup event handlers for socket
   */
  setupEventHandlers(socket) {
    // Join workspace room
    socket.on('join_workspace', async (data) => {
      await this.handleJoinWorkspace(socket, data);
    });

    // Leave workspace room
    socket.on('leave_workspace', async (data) => {
      await this.handleLeaveWorkspace(socket, data);
    });

    // Join trip room
    socket.on('join_trip', async (data) => {
      await this.handleJoinTrip(socket, data);
    });

    // Leave trip room
    socket.on('leave_trip', async (data) => {
      await this.handleLeaveTrip(socket, data);
    });

    // Send chat message
    socket.on('send_message', async (data) => {
      await this.handleSendMessage(socket, data);
    });

    // Typing indicator
    socket.on('typing', (data) => {
      this.handleTyping(socket, data);
    });

    // Stop typing
    socket.on('stop_typing', (data) => {
      this.handleStopTyping(socket, data);
    });

    // GPS location update
    socket.on('location_update', async (data) => {
      await this.handleLocationUpdate(socket, data);
    });

    // Mark messages as read
    socket.on('mark_read', async (data) => {
      await this.handleMarkRead(socket, data);
    });

    // Request trip participants
    socket.on('get_participants', async (data) => {
      await this.handleGetParticipants(socket, data);
    });

    // Disconnect
    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });
  }

  /**
   * Handle join workspace room
   */
  async handleJoinWorkspace(socket, data) {
    try {
      const { workspaceId } = data;

      // Join workspace room for notifications
      socket.join(`workspace_${workspaceId}`);
      socket.join(`user_${socket.userId}`); // Personal room for user-specific notifications

      // Track room membership
      if (!this.workspaceRooms.has(workspaceId)) {
        this.workspaceRooms.set(workspaceId, new Set());
      }
      this.workspaceRooms.get(workspaceId).add(socket.id);

      console.log(`🏢 User ${socket.userId} joined workspace ${workspaceId}`);

      // Send confirmation
      socket.emit('joined_workspace', {
        workspaceId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error joining workspace:', error);
      socket.emit('error', { message: 'Failed to join workspace room' });
    }
  }

  /**
   * Handle leave workspace room
   */
  async handleLeaveWorkspace(socket, data) {
    try {
      const { workspaceId } = data;

      socket.leave(`workspace_${workspaceId}`);

      // Remove from room tracking
      if (this.workspaceRooms.has(workspaceId)) {
        this.workspaceRooms.get(workspaceId).delete(socket.id);
        if (this.workspaceRooms.get(workspaceId).size === 0) {
          this.workspaceRooms.delete(workspaceId);
        }
      }

      console.log(`🏢 User ${socket.userId} left workspace ${workspaceId}`);
    } catch (error) {
      console.error('Error leaving workspace:', error);
    }
  }

  /**
   * Handle join trip room
   */
  async handleJoinTrip(socket, data) {
    try {
      const { trip_id } = data;

      // Verify user has access to this trip
      const accessCheck = await pool.query(
        `SELECT COUNT(*) as count FROM trips 
         WHERE trip_id = $1 AND (
           customer_id = $2 OR 
           guide_id = $2 OR 
           EXISTS (SELECT 1 FROM users WHERE user_id = $2 AND role = 'admin')
         )`,
        [trip_id, socket.userId]
      );

      if (accessCheck.rows[0].count === 0) {
        socket.emit('error', { message: 'Access denied to this trip' });
        return;
      }

      // Join room
      socket.join(`trip_${trip_id}`);

      // Track room membership
      if (!this.tripRooms.has(trip_id)) {
        this.tripRooms.set(trip_id, new Set());
      }
      this.tripRooms.get(trip_id).add(socket.id);

      console.log(`📍 User ${socket.userId} joined trip ${trip_id}`);

      // Notify other participants
      socket.to(`trip_${trip_id}`).emit('user_joined', {
        user_id: socket.userId,
        trip_id: trip_id,
        timestamp: new Date().toISOString()
      });

      // Send room info to user
      socket.emit('joined_trip', {
        trip_id: trip_id,
        participants_count: this.tripRooms.get(trip_id).size,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error joining trip:', error);
      socket.emit('error', { message: 'Failed to join trip room' });
    }
  }

  /**
   * Handle leave trip room
   */
  async handleLeaveTrip(socket, data) {
    try {
      const { trip_id } = data;

      socket.leave(`trip_${trip_id}`);

      // Remove from room tracking
      if (this.tripRooms.has(trip_id)) {
        this.tripRooms.get(trip_id).delete(socket.id);
        if (this.tripRooms.get(trip_id).size === 0) {
          this.tripRooms.delete(trip_id);
        }
      }

      // Notify other participants
      socket.to(`trip_${trip_id}`).emit('user_left', {
        user_id: socket.userId,
        trip_id: trip_id,
        timestamp: new Date().toISOString()
      });

      console.log(`📍 User ${socket.userId} left trip ${trip_id}`);
    } catch (error) {
      console.error('Error leaving trip:', error);
    }
  }

  /**
   * Handle send chat message
   */
  async handleSendMessage(socket, data) {
    try {
      const { trip_id, message_text, message_type = 'text', attachment_url, location_lat, location_lon } = data;

      // Get user info
      const userQuery = await pool.query(
        'SELECT name, role FROM users WHERE user_id = $1',
        [socket.userId]
      );

      if (userQuery.rows.length === 0) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      const user = userQuery.rows[0];

      // Save message to database
      const messageQuery = await pool.query(
        `INSERT INTO trip_chat (
          trip_id, sender_id, sender_type, sender_name, message_text, 
          message_type, attachment_url, location_lat, location_lon
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING message_id, created_at`,
        [
          trip_id, 
          socket.userId, 
          user.role, 
          user.name, 
          message_text,
          message_type,
          attachment_url || null,
          location_lat || null,
          location_lon || null
        ]
      );

      const savedMessage = messageQuery.rows[0];

      // Broadcast message to trip room
      const messageData = {
        message_id: savedMessage.message_id,
        trip_id: trip_id,
        sender_id: socket.userId,
        sender_type: user.role,
        sender_name: user.name,
        message_text: message_text,
        message_type: message_type,
        attachment_url: attachment_url,
        location_lat: location_lat,
        location_lon: location_lon,
        is_read: false,
        created_at: savedMessage.created_at
      };

      // Send to all users in the trip room including sender
      this.io.to(`trip_${trip_id}`).emit('new_message', messageData);

      console.log(`💬 Message sent in trip ${trip_id} by ${socket.userId}`);

      // Clear typing indicator
      this.handleStopTyping(socket, { trip_id });
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * Handle typing indicator
   */
  handleTyping(socket, data) {
    const { trip_id } = data;

    if (!this.typingUsers.has(trip_id)) {
      this.typingUsers.set(trip_id, new Set());
    }
    this.typingUsers.get(trip_id).add(socket.userId);

    // Broadcast to others in the room
    socket.to(`trip_${trip_id}`).emit('user_typing', {
      user_id: socket.userId,
      trip_id: trip_id
    });
  }

  /**
   * Handle stop typing
   */
  handleStopTyping(socket, data) {
    const { trip_id } = data;

    if (this.typingUsers.has(trip_id)) {
      this.typingUsers.get(trip_id).delete(socket.userId);
      if (this.typingUsers.get(trip_id).size === 0) {
        this.typingUsers.delete(trip_id);
      }
    }

    // Broadcast to others in the room
    socket.to(`trip_${trip_id}`).emit('user_stop_typing', {
      user_id: socket.userId,
      trip_id: trip_id
    });
  }

  /**
   * Handle GPS location update
   */
  async handleLocationUpdate(socket, data) {
    try {
      const { trip_id, latitude, longitude, speed, heading, accuracy } = data;

      // Update location in database
      await pool.query(
        `UPDATE trips 
         SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
             last_location_update = NOW()
         WHERE trip_id = $3`,
        [longitude, latitude, trip_id]
      );

      // Save to location history
      await pool.query(
        `INSERT INTO trip_location_history (trip_id, latitude, longitude, speed, heading, accuracy)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [trip_id, latitude, longitude, speed || null, heading || null, accuracy || null]
      );

      // Broadcast location update to trip room
      this.io.to(`trip_${trip_id}`).emit('location_update', {
        trip_id: trip_id,
        latitude: latitude,
        longitude: longitude,
        speed: speed,
        heading: heading,
        accuracy: accuracy,
        timestamp: new Date().toISOString()
      });

      console.log(`📍 Location updated for trip ${trip_id}: ${latitude}, ${longitude}`);
    } catch (error) {
      console.error('Error updating location:', error);
      socket.emit('error', { message: 'Failed to update location' });
    }
  }

  /**
   * Handle mark messages as read
   */
  async handleMarkRead(socket, data) {
    try {
      const { trip_id, message_ids } = data;

      // Update messages as read
      await pool.query(
        `UPDATE trip_chat 
         SET is_read = true 
         WHERE trip_id = $1 AND message_id = ANY($2::uuid[])`,
        [trip_id, message_ids]
      );

      // Broadcast read status to trip room
      socket.to(`trip_${trip_id}`).emit('messages_read', {
        trip_id: trip_id,
        message_ids: message_ids,
        read_by: socket.userId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  /**
   * Handle get participants
   */
  async handleGetParticipants(socket, data) {
    try {
      const { trip_id } = data;

      // Get trip participants
      const participantsQuery = await pool.query(
        `SELECT DISTINCT u.user_id, u.name, u.role, u.avatar_url
         FROM users u
         INNER JOIN trips t ON (
           u.user_id = t.customer_id OR 
           u.user_id = t.guide_id OR
           u.role = 'admin'
         )
         WHERE t.trip_id = $1`,
        [trip_id]
      );

      // Add online status
      const participants = participantsQuery.rows.map(p => ({
        ...p,
        online: this.connectedUsers.has(p.user_id)
      }));

      socket.emit('participants_list', {
        trip_id: trip_id,
        participants: participants
      });
    } catch (error) {
      console.error('Error getting participants:', error);
      socket.emit('error', { message: 'Failed to get participants' });
    }
  }

  /**
   * Handle disconnect
   */
  handleDisconnect(socket) {
    console.log(`❌ User disconnected: ${socket.userId} (${socket.id})`);

    // Remove from connected users
    this.connectedUsers.delete(socket.userId);

    // Remove from all trip rooms
    this.tripRooms.forEach((sockets, tripId) => {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);
        
        // Notify others in the room
        socket.to(`trip_${tripId}`).emit('user_left', {
          user_id: socket.userId,
          trip_id: tripId,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Broadcast user offline status
    this.broadcastUserStatus(socket.userId, false);
  }

  /**
   * Broadcast user online/offline status
   */
  broadcastUserStatus(userId, online) {
    this.io.emit('user_status', {
      user_id: userId,
      online: online,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send notification to specific user
   */
  sendNotificationToUser(userId, notification) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('notification', notification);
    }
  }

  /**
   * Send notification to user's personal room
   */
  sendNotificationToUserRoom(userId, notification) {
    if (this.io) {
      this.io.to(`user_${userId}`).emit('notification', notification);
    }
  }

  /**
   * Send notification to workspace room
   */
  sendNotificationToWorkspace(workspaceId, notification) {
    if (this.io) {
      this.io.to(`workspace_${workspaceId}`).emit('workspace_notification', notification);
    }
  }

  /**
   * Broadcast trip status update
   */
  broadcastTripUpdate(tripId, update) {
    this.io.to(`trip_${tripId}`).emit('trip_update', {
      trip_id: tripId,
      ...update,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Get active trip rooms count
   */
  getActiveTripRoomsCount() {
    return this.tripRooms.size;
  }

  /**
   * Get server stats
   */
  getStats() {
    return {
      connected_users: this.connectedUsers.size,
      active_trip_rooms: this.tripRooms.size,
      active_workspace_rooms: this.workspaceRooms.size,
      total_connections: this.io ? this.io.engine.clientsCount : 0,
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const websocketServer = new WebSocketServer();

module.exports = websocketServer;
