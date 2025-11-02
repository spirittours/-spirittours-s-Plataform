# 🔔 WebSocket Real-time Notifications System

## Overview

Complete WebSocket implementation for real-time bidirectional communication in Spirit Tours platform.

## Features

✅ **Connection Management**
- User-based connection pooling
- Multiple connections per user support
- Automatic reconnection with exponential backoff
- Heartbeat/ping-pong for connection health
- Connection metadata tracking

✅ **Messaging**
- Personal messages to specific users
- Broadcast to all users
- Room/channel-based messaging
- Message queuing for offline users
- Typed notification system

✅ **Notification Types**
- Booking notifications (created, confirmed, cancelled)
- Payment notifications (received, failed, refund)
- Tour notifications (starting soon, started, completed)
- Agent notifications (commission, tier upgrade)
- Chat notifications (new message, read)
- System notifications (alerts, maintenance)
- AI Agent notifications (response, workflow)

✅ **Frontend Integration**
- React hook (useWebSocket)
- TypeScript service with EventEmitter
- Notification bell component
- Browser notification support
- Auto-connect/reconnect

---

## Architecture

### Backend Components

```
backend/websocket/
├── __init__.py                 # Module exports
├── connection_manager.py       # Connection pooling (11KB)
├── notification_service.py     # Typed notifications (10KB)
└── websocket_routes.py         # FastAPI endpoints (8KB)
```

### Frontend Components

```
frontend/src/
├── services/
│   └── websocket.service.ts    # WebSocket client (6KB)
├── hooks/
│   └── useWebSocket.ts         # React hook (4KB)
└── components/Notifications/
    └── NotificationBell.tsx    # Bell component (7KB)
```

---

## Backend API

### WebSocket Endpoints

#### 1. Main Connection Endpoint
```
WS /ws/connect?user_id={user_id}&device_type={type}
```

**Query Parameters:**
- `user_id` (required): User identifier
- `device_type` (optional): Device type (mobile, desktop, tablet)
- `app_version` (optional): Application version

**Client -> Server Messages:**
```json
{
  "action": "subscribe|unsubscribe|message|ping",
  "room": "room_name",
  "data": {}
}
```

**Server -> Client Messages:**
```json
{
  "type": "notification|message|system|pong",
  "data": {}
}
```

#### 2. Notifications-Only Endpoint
```
WS /ws/notifications/{user_id}
```

Simpler endpoint for notifications only (no bidirectional messaging).

#### 3. REST Endpoints

**Get Statistics:**
```http
GET /ws/stats
```

Response:
```json
{
  "status": "online",
  "stats": {
    "total_connections": 150,
    "active_connections": 120,
    "messages_sent": 5420,
    "broadcasts": 23,
    "unique_users": 95,
    "total_rooms": 12,
    "queued_messages": 5
  },
  "online_users": ["user1", "user2"]
}
```

**Get Rooms:**
```http
GET /ws/rooms
```

**Get User Connections:**
```http
GET /ws/users/{user_id}/connections
```

**Broadcast Message:**
```http
POST /ws/broadcast
Body: { "title": "...", "message": "...", "priority": "high" }
```

**Broadcast to Room:**
```http
POST /ws/rooms/{room}/broadcast
Body: { "title": "...", "message": "..." }
```

---

## Connection Manager

### Features

**Connection Pooling:**
- Multiple connections per user
- Connection by user_id
- Room/channel subscriptions
- Connection metadata storage

**Message Delivery:**
- Personal messages to specific users
- Broadcast to all users
- Broadcast to specific rooms
- Queue messages for offline users

**Health Monitoring:**
- Ping/pong heartbeat
- Connection statistics
- Auto-cleanup disconnected WebSockets

### Usage Example

```python
from websocket import manager

# Send personal message
await manager.send_personal_message(
    message={'type': 'notification', 'data': {...}},
    user_id='user123'
)

# Broadcast to all
await manager.broadcast(
    message={'type': 'system_alert', 'message': '...'}
)

# Broadcast to room
await manager.broadcast_to_room(
    message={'type': 'tour_update', 'data': {...}},
    room='tour_456'
)

# Room management
manager.join_room('user123', 'tour_456')
manager.leave_room('user123', 'tour_456')
```

---

## Notification Service

### Notification Types

```python
class NotificationType(str, Enum):
    # Booking
    BOOKING_CREATED = "booking_created"
    BOOKING_CONFIRMED = "booking_confirmed"
    BOOKING_CANCELLED = "booking_cancelled"
    
    # Payment
    PAYMENT_RECEIVED = "payment_received"
    PAYMENT_FAILED = "payment_failed"
    
    # Tour
    TOUR_STARTING_SOON = "tour_starting_soon"
    TOUR_STARTED = "tour_started"
    
    # Agent
    NEW_COMMISSION = "new_commission"
    TIER_UPGRADED = "tier_upgraded"
    
    # System
    SYSTEM_ALERT = "system_alert"
```

### Usage Example

```python
from websocket import notification_service

# Booking notification
await notification_service.notify_booking_created(
    user_id='user123',
    booking_id='book456',
    tour_name='Jerusalem Day Tour',
    tour_date='2024-02-15',
    total_amount=250.00
)

# Payment notification
await notification_service.notify_payment_received(
    user_id='user123',
    booking_id='book456',
    amount=250.00,
    payment_method='Credit Card'
)

# Agent notification
await notification_service.notify_new_commission(
    agent_id='agent789',
    booking_id='book456',
    commission_amount=25.00,
    tier='Gold'
)

# System broadcast
await notification_service.broadcast_system_message(
    title='System Maintenance',
    message='Scheduled maintenance tonight at 2 AM',
    priority=NotificationPriority.HIGH
)
```

---

## Frontend Integration

### WebSocket Service

```typescript
import { getWebSocketService } from './services/websocket.service';

const ws = getWebSocketService(
  'ws://localhost:8000',
  'user123',
  'desktop'
);

// Connect
ws.connect();

// Listen for notifications
ws.on('notification', (notification) => {
  console.log('New notification:', notification);
});

// Subscribe to room
ws.subscribe('tour_456');

// Send message
ws.send('message', { text: 'Hello' });

// Disconnect
ws.disconnect();
```

### React Hook

```typescript
import { useWebSocket } from './hooks/useWebSocket';

function MyComponent() {
  const {
    isConnected,
    notifications,
    subscribe,
    unsubscribe,
    clearNotifications,
  } = useWebSocket('user123', {
    autoConnect: true,
    onNotification: (notification) => {
      console.log('New notification:', notification);
    },
  });

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <p>Notifications: {notifications.length}</p>
      <button onClick={() => subscribe('tour_123')}>
        Subscribe to Tour
      </button>
    </div>
  );
}
```

### Notification Bell Component

```typescript
import NotificationBell from './components/Notifications/NotificationBell';

function Header() {
  return (
    <AppBar>
      <Toolbar>
        <NotificationBell userId="user123" />
      </Toolbar>
    </AppBar>
  );
}
```

---

## Notification Format

### Standard Notification

```json
{
  "type": "notification",
  "notification_type": "booking_confirmed",
  "priority": "high",
  "title": "Booking Confirmed!",
  "message": "Your booking for 'Jerusalem Tour' is confirmed",
  "data": {
    "booking_id": "book456",
    "tour_name": "Jerusalem Tour",
    "confirmation_code": "ABC123"
  },
  "action_url": "/bookings/book456",
  "timestamp": "2024-01-15T10:30:00Z",
  "read": false
}
```

### Priority Levels

- **urgent**: Critical notifications (tour starting soon, payment issues)
- **high**: Important notifications (booking confirmed, commission earned)
- **medium**: Regular notifications (general updates)
- **low**: Informational notifications (tips, suggestions)

---

## Integration Examples

### Example 1: Booking Workflow

```python
# Backend - After booking creation
from websocket import notification_service

# Notify customer
await notification_service.notify_booking_created(
    user_id=customer_id,
    booking_id=booking.id,
    tour_name=tour.name,
    tour_date=booking.tour_date,
    total_amount=booking.total_amount
)

# Notify agent (if referral)
if booking.agent_id:
    commission = calculate_commission(booking)
    await notification_service.notify_new_commission(
        agent_id=booking.agent_id,
        booking_id=booking.id,
        commission_amount=commission.amount,
        tier=commission.tier
    )
```

### Example 2: Tour Starting Soon

```python
# Celery scheduled task - 1 hour before tour
from websocket import notification_service

for booking in get_upcoming_tours(hours=1):
    await notification_service.notify_tour_starting_soon(
        user_id=booking.customer_id,
        booking_id=booking.id,
        tour_name=booking.tour.name,
        start_time=booking.tour.start_time,
        meeting_point=booking.tour.meeting_point
    )
```

### Example 3: AI Agent Response

```python
# After AI agent completes request
from websocket import notification_service

await notification_service.notify_agent_response(
    user_id=request.user_id,
    agent_name='itinerary_planner',
    response=agent_response.result,
    execution_time=agent_response.execution_time_ms
)
```

---

## Testing

### Manual Testing

```bash
# Install wscat for WebSocket testing
npm install -g wscat

# Connect to WebSocket
wscat -c "ws://localhost:8000/ws/connect?user_id=test123"

# Send subscribe message
{"action": "subscribe", "room": "tour_456"}

# Send ping
{"action": "ping"}
```

### Automated Testing

```python
# pytest test
async def test_websocket_connection():
    async with websockets.connect('ws://localhost:8000/ws/connect?user_id=test') as ws:
        # Receive connection message
        msg = await ws.recv()
        assert 'connection_established' in msg
        
        # Send ping
        await ws.send('{"action": "ping"}')
        
        # Receive pong
        msg = await ws.recv()
        assert 'pong' in msg
```

---

## Performance Considerations

**Connection Limits:**
- Max connections per user: Unlimited (tracked per device)
- Max total connections: Limited by server resources
- Recommended: 10,000 concurrent connections per server

**Message Queue:**
- Offline messages queued in memory
- Automatic delivery on reconnection
- Consider Redis for persistence in production

**Scalability:**
- Use Redis Pub/Sub for multi-server deployments
- Implement sticky sessions for load balancing
- Consider dedicated WebSocket servers

---

## Security

**Authentication:**
- User ID validated against session/JWT
- Connection metadata stored
- Rate limiting on connection attempts

**Message Validation:**
- JSON schema validation
- XSS prevention
- Maximum message size limits

**Best Practices:**
- Use WSS (WebSocket Secure) in production
- Implement CORS policies
- Monitor for abuse/spam

---

## Deployment

### Environment Variables

```bash
# Backend
WEBSOCKET_ENABLED=true
WEBSOCKET_MAX_CONNECTIONS=10000
WEBSOCKET_HEARTBEAT_INTERVAL=30

# Frontend
VITE_WS_URL=wss://api.spirit-tours.com
```

### Nginx Configuration

```nginx
location /ws {
    proxy_pass http://backend:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
}
```

---

## Statistics

- **Backend Code**: 29KB (3 files)
- **Frontend Code**: 17KB (3 files)
- **Documentation**: 10KB (this file)
- **Total**: 56KB

---

## Future Enhancements

- [ ] Redis integration for multi-server support
- [ ] Message persistence
- [ ] Advanced analytics dashboard
- [ ] Video/audio streaming support
- [ ] File transfer support
- [ ] End-to-end encryption

---

*WebSocket System v1.0.0 - Production Ready* 🚀
