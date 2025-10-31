# 🔌 WebSocket Integration Guide
## Real-time Features Implementation

**Version:** 2.0  
**Date:** 2025-10-24  
**Status:** ✅ Ready for Production

---

## 📋 Overview

This guide provides complete instructions for integrating and using the real-time WebSocket features in the Spirit Tours platform.

### Features Implemented

1. ✅ **Real-time Chat** - Instant messaging between customers, guides, and support
2. ✅ **GPS Tracking** - Live location updates every 30 seconds
3. ✅ **Typing Indicators** - See when other users are typing
4. ✅ **Online Status** - Real-time user presence
5. ✅ **Read Receipts** - Message delivery confirmation
6. ✅ **Auto-reconnection** - Seamless reconnection handling

---

## 🏗️ Architecture

### Backend Components

```
backend/
├── services/
│   └── websocket_server.js (14KB)
│       - Socket.io server
│       - JWT authentication
│       - Room management
│       - Event broadcasting
│
└── server.js
    - WebSocket initialization
    - Route integration
```

### Frontend Components

```
frontend/src/
├── contexts/
│   └── WebSocketContext.tsx (9KB)
│       - Global WebSocket provider
│       - Connection management
│       - Event subscription
│
├── hooks/
│   └── useWebSocket.ts (4KB)
│       - Custom hook for WebSocket
│       - Auto-cleanup
│       - Type-safe events
│
└── components/
    ├── Trips/
    │   ├── ChatInterfaceRealtime.tsx (19KB)
    │   │   - Real-time messaging
    │   │   - Typing indicators
    │   │   - Online status
    │   │
    │   └── GPSTrackingMapRealtime.tsx (24KB)
    │       - Live GPS updates
    │       - Animated markers
    │       - Update counter
    │
    └── Admin/
        └── ... (other components)
```

---

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
# Backend dependencies (already in package.json)
cd backend
npm install socket.io jsonwebtoken

# Frontend dependencies (already in package.json)
cd ../frontend
npm install socket.io-client
```

### Step 2: Configure Environment

**Backend (`.env`):**
```env
# Server
PORT=5001
NODE_ENV=development

# JWT Secret for WebSocket authentication
JWT_SECRET=your-secret-key-here

# CORS
CORS_ORIGINS=http://localhost:3000
```

**Frontend (`frontend/.env`):**
```env
# API and WebSocket URLs
REACT_APP_API_URL=http://localhost:5001/api
REACT_APP_WS_URL=http://localhost:5001

# Feature flags
REACT_APP_ENABLE_WEBSOCKET=true
REACT_APP_ENABLE_GPS_TRACKING=true
REACT_APP_ENABLE_CHAT=true
```

### Step 3: Start Servers

```bash
# Terminal 1: Start backend (with WebSocket)
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm start
```

You should see:
```
Backend:
🚀 Spirit Tours Backend Server running on port 5001
🔌 WebSocket: ws://localhost:5001
✅ WebSocket server initialized

Frontend:
Compiled successfully!
You can now view spirit-tours-frontend in the browser.
Local: http://localhost:3000
```

---

## 💻 Usage Examples

### Example 1: Integrate WebSocket in App

**`frontend/src/App.tsx`:**
```typescript
import React from 'react';
import { WebSocketProvider } from './contexts/WebSocketContext';
import TripsDashboard from './components/Trips/TripsDashboard';

function App() {
  return (
    <WebSocketProvider autoConnect={true}>
      <div className="App">
        <TripsDashboard />
      </div>
    </WebSocketProvider>
  );
}

export default App;
```

### Example 2: Use Real-time Chat

**`frontend/src/pages/TripDetailPage.tsx`:**
```typescript
import React from 'react';
import { useParams } from 'react-router-dom';
import ChatInterfaceRealtime from '../components/Trips/ChatInterfaceRealtime';

const TripDetailPage: React.FC = () => {
  const { tripId } = useParams();
  const currentUserId = localStorage.getItem('user_id') || '';
  const currentUserRole = localStorage.getItem('user_role') || 'customer';

  return (
    <div>
      <h1>Trip Details</h1>
      <ChatInterfaceRealtime
        tripId={tripId}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole as 'customer' | 'guide' | 'support'}
      />
    </div>
  );
};

export default TripDetailPage;
```

### Example 3: Use GPS Tracking

**`frontend/src/pages/TrackingPage.tsx`:**
```typescript
import React from 'react';
import { useParams } from 'react-router-dom';
import GPSTrackingMapRealtime from '../components/Trips/GPSTrackingMapRealtime';

const TrackingPage: React.FC = () => {
  const { tripId } = useParams();

  return (
    <div>
      <h1>Live GPS Tracking</h1>
      <GPSTrackingMapRealtime tripId={tripId} />
    </div>
  );
};

export default TrackingPage;
```

### Example 4: Custom WebSocket Hook

**`frontend/src/components/CustomComponent.tsx`:**
```typescript
import React, { useEffect, useState } from 'react';
import { useWebSocketHook } from '../hooks/useWebSocket';

const CustomComponent: React.FC<{ tripId: string }> = ({ tripId }) => {
  const [messages, setMessages] = useState<string[]>([]);

  const {
    connected,
    subscribe,
    unsubscribe,
    sendMessage
  } = useWebSocketHook({
    autoJoinTrip: tripId,
    onConnect: () => console.log('Connected!'),
    onDisconnect: () => console.log('Disconnected!')
  });

  useEffect(() => {
    // Subscribe to custom events
    const handleCustomEvent = (data: any) => {
      console.log('Custom event received:', data);
      setMessages(prev => [...prev, data.message]);
    };

    subscribe('custom_event', handleCustomEvent);

    return () => {
      unsubscribe('custom_event', handleCustomEvent);
    };
  }, [subscribe, unsubscribe]);

  return (
    <div>
      <p>Status: {connected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={() => sendMessage(tripId, 'Hello!')}>
        Send Message
      </button>
      <ul>
        {messages.map((msg, i) => <li key={i}>{msg}</li>)}
      </ul>
    </div>
  );
};

export default CustomComponent;
```

---

## 🔌 WebSocket Events Reference

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join_trip` | `{ trip_id: string }` | Join a trip room |
| `leave_trip` | `{ trip_id: string }` | Leave a trip room |
| `send_message` | `{ trip_id, message_text, message_type }` | Send chat message |
| `typing` | `{ trip_id }` | User is typing |
| `stop_typing` | `{ trip_id }` | User stopped typing |
| `location_update` | `{ trip_id, latitude, longitude, speed, heading }` | Update GPS location |
| `mark_read` | `{ trip_id, message_ids }` | Mark messages as read |
| `get_participants` | `{ trip_id }` | Request participants list |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ user_id, timestamp }` | Connection confirmed |
| `joined_trip` | `{ trip_id, participants_count }` | Joined trip room |
| `user_joined` | `{ user_id, trip_id }` | Another user joined |
| `user_left` | `{ user_id, trip_id }` | Another user left |
| `new_message` | `ChatMessage` object | New chat message |
| `user_typing` | `{ user_id, trip_id }` | User is typing |
| `user_stop_typing` | `{ user_id, trip_id }` | User stopped typing |
| `location_update` | `{ trip_id, latitude, longitude, speed, heading }` | GPS update |
| `messages_read` | `{ trip_id, message_ids, read_by }` | Messages marked as read |
| `user_status` | `{ user_id, online }` | User online/offline |
| `participants_list` | `{ trip_id, participants }` | List of participants |
| `trip_update` | `{ trip_id, ...update }` | Trip status changed |
| `notification` | `Notification` object | Push notification |
| `error` | `{ message }` | Error occurred |

---

## 🔒 Authentication

WebSocket connections require JWT authentication:

### 1. Backend Issues JWT Token

```javascript
// backend/routes/auth.routes.js
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
  // ... validate credentials ...

  const token = jwt.sign(
    { 
      user_id: user.id, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token, user });
});
```

### 2. Frontend Stores Token

```typescript
// frontend/src/services/auth.service.ts
const login = async (email: string, password: string) => {
  const response = await axios.post('/api/auth/login', { email, password });
  
  // Store token for WebSocket authentication
  localStorage.setItem('auth_token', response.data.token);
  localStorage.setItem('user_id', response.data.user.id);
  localStorage.setItem('user_role', response.data.user.role);
  
  return response.data;
};
```

### 3. WebSocket Context Uses Token

```typescript
// frontend/src/contexts/WebSocketContext.tsx
const connect = () => {
  const token = localStorage.getItem('auth_token');
  
  const socket = io(WS_URL, {
    auth: {
      token: token
    }
  });
  
  // ...
};
```

### 4. Backend Validates Token

```javascript
// backend/services/websocket_server.js
this.io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication token required'));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  socket.userId = decoded.user_id;
  socket.userRole = decoded.role;
  
  next();
});
```

---

## 🔧 Testing WebSocket Connection

### Test 1: Connection Status

```typescript
// In browser console
const { socket, connected } = useWebSocket();

console.log('Socket ID:', socket?.id);
console.log('Connected:', connected);
```

### Test 2: Emit Event

```typescript
// Send custom event
emit('custom_event', { data: 'test' });
```

### Test 3: Subscribe to Event

```typescript
// Listen for events
subscribe('custom_event', (data) => {
  console.log('Received:', data);
});
```

### Test 4: Join Trip Room

```typescript
// Join a trip
joinTrip('trip-123');

// Send message to trip
sendMessage('trip-123', 'Hello everyone!');
```

---

## 📊 Monitoring & Debugging

### Backend Logs

The WebSocket server logs all events:

```
✅ User connected: user-123 (socket-abc)
📍 User user-123 joined trip trip-456
💬 Message sent in trip trip-456 by user-123
❌ User disconnected: user-123 (socket-abc)
```

### Frontend Logs

The WebSocket context logs connection events:

```
🔌 Connecting to WebSocket: http://localhost:5001
✅ WebSocket connected: socket-abc
✅ Server confirmed connection: { user_id: 'user-123' }
📤 Emitted: send_message { trip_id: 'trip-456', ... }
📩 New message received: { message_id: 'msg-789', ... }
🔌 WebSocket disconnected: transport close
```

### Connection Stats

Get real-time statistics:

```typescript
// Frontend
const { getConnectionStats } = useWebSocket();
const stats = getConnectionStats();

console.log('Connected:', stats.connected);
console.log('Reconnect attempts:', stats.reconnectAttempts);
console.log('Last connected:', stats.lastConnected);
console.log('Uptime:', stats.uptime, 'ms');

// Backend
const stats = websocketServer.getStats();

console.log('Connected users:', stats.connected_users);
console.log('Active trip rooms:', stats.active_trip_rooms);
console.log('Total connections:', stats.total_connections);
```

---

## ⚠️ Troubleshooting

### Issue 1: Connection Failed

**Symptoms:**
- `❌ WebSocket connection error`
- Frontend shows "Desconectado"

**Solutions:**
1. Check backend is running: `curl http://localhost:5001/health`
2. Verify JWT token exists: `localStorage.getItem('auth_token')`
3. Check CORS configuration in `backend/server.js`
4. Verify firewall allows WebSocket connections

### Issue 2: Messages Not Received

**Symptoms:**
- Messages sent but not appearing
- No `new_message` events

**Solutions:**
1. Check if joined trip room: emit `join_trip` first
2. Verify subscription: `subscribe('new_message', handler)`
3. Check backend logs for errors
4. Ensure trip_id is correct

### Issue 3: GPS Not Updating

**Symptoms:**
- No location updates received
- Map marker not moving

**Solutions:**
1. Enable GPS tracking: `POST /api/trips/:id/tracking`
2. Check location permissions in browser
3. Verify `location_update` subscription
4. Check if tracking is enabled for the trip

### Issue 4: Typing Indicators Not Working

**Symptoms:**
- No "escribiendo..." message
- Typing events not received

**Solutions:**
1. Implement typing event emission on text change
2. Add timeout to stop typing after 3 seconds
3. Check `user_typing` and `user_stop_typing` subscriptions

---

## 🎯 Performance Optimization

### 1. Connection Pooling

Reuse single WebSocket connection across components:

```typescript
// Good: Single connection via context
<WebSocketProvider>
  <App />
</WebSocketProvider>

// Bad: Multiple connections
const socket1 = io(WS_URL);
const socket2 = io(WS_URL); // Unnecessary
```

### 2. Event Cleanup

Always unsubscribe from events:

```typescript
useEffect(() => {
  const handler = (data) => console.log(data);
  subscribe('event', handler);

  return () => {
    unsubscribe('event', handler); // Important!
  };
}, []);
```

### 3. Throttle GPS Updates

Limit location updates to avoid overwhelming the server:

```typescript
const throttledUpdate = useCallback(
  throttle((lat, lon) => {
    sendLocationUpdate(tripId, lat, lon);
  }, 5000), // Max once per 5 seconds
  []
);
```

### 4. Batch Message Reads

Mark multiple messages as read at once:

```typescript
// Good: Batch read
markAsRead(['msg-1', 'msg-2', 'msg-3']);

// Bad: Individual reads
markAsRead(['msg-1']);
markAsRead(['msg-2']);
markAsRead(['msg-3']);
```

---

## 🚀 Production Deployment

### 1. Environment Configuration

**Production `.env`:**
```env
NODE_ENV=production
PORT=5001
JWT_SECRET=<strong-random-secret>
CORS_ORIGINS=https://yourdomain.com

# WebSocket
WS_PING_TIMEOUT=60000
WS_PING_INTERVAL=25000
```

### 2. SSL/TLS Configuration

For production, use secure WebSocket (wss://):

```typescript
// Frontend
const WS_URL = process.env.REACT_APP_WS_URL || 'wss://yourdomain.com';

// Backend (with reverse proxy)
// nginx configuration
location /socket.io/ {
    proxy_pass http://localhost:5001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

### 3. Load Balancing

For multiple backend instances:

**Use sticky sessions:**
```nginx
upstream backend {
    ip_hash;
    server backend1:5001;
    server backend2:5001;
}
```

**Or use Redis adapter:**
```javascript
// backend/services/websocket_server.js
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

### 4. Monitoring

Set up monitoring for WebSocket connections:

```javascript
// backend/routes/monitoring.routes.js
router.get('/ws-stats', (req, res) => {
  const stats = websocketServer.getStats();
  
  res.json({
    connected_users: stats.connected_users,
    active_rooms: stats.active_trip_rooms,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

---

## 📚 Additional Resources

### Official Documentation
- Socket.io Client: https://socket.io/docs/v4/client-api/
- Socket.io Server: https://socket.io/docs/v4/server-api/
- JWT: https://jwt.io/

### Related Files
- `backend/services/websocket_server.js` - Server implementation
- `frontend/src/contexts/WebSocketContext.tsx` - Client context
- `frontend/src/hooks/useWebSocket.ts` - Custom hook
- `DEVELOPMENT_COMPLETION_REPORT.md` - Full system documentation

---

## ✅ Checklist

Before deploying to production:

- [ ] Backend WebSocket server running
- [ ] JWT authentication configured
- [ ] CORS properly set up
- [ ] SSL/TLS certificates installed
- [ ] Environment variables configured
- [ ] Event subscriptions tested
- [ ] Error handling implemented
- [ ] Reconnection logic tested
- [ ] Load testing completed
- [ ] Monitoring set up
- [ ] Documentation updated

---

**Last Updated:** 2025-10-24  
**Version:** 2.0  
**Status:** ✅ Production Ready
