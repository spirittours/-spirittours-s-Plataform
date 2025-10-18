"""
Advanced WebSocket Manager with Privacy Filters
Handles real-time communication with complete price privacy controls
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, List, Set, Optional, Any
from enum import Enum
import aioredis
import websockets
from websockets.server import WebSocketServerProtocol
from dataclasses import dataclass, asdict
import jwt
from functools import wraps

logger = logging.getLogger(__name__)


class UserType(Enum):
    """Types of users in the system"""
    ADMIN = "admin"
    HOTEL = "hotel"
    AGENCY = "agency"
    CLIENT = "client"
    GUIDE = "guide"
    SUPPLIER = "supplier"


class MessageType(Enum):
    """WebSocket message types"""
    QUOTATION_UPDATE = "quotation.update"
    PRICE_UPDATE = "price.update"
    AVAILABILITY_CHANGE = "availability.change"
    BOOKING_CONFIRMATION = "booking.confirmation"
    NOTIFICATION = "notification"
    PRESENCE = "presence"
    TYPING = "typing"
    ERROR = "error"


@dataclass
class WebSocketConnection:
    """Represents a WebSocket connection"""
    id: str
    ws: WebSocketServerProtocol
    user_id: str
    user_type: UserType
    company_id: Optional[str] = None
    hotel_id: Optional[str] = None
    permissions: Dict[str, bool] = None
    rooms: Set[str] = None
    metadata: Dict[str, Any] = None
    connected_at: datetime = None

    def __post_init__(self):
        if self.permissions is None:
            self.permissions = {}
        if self.rooms is None:
            self.rooms = set()
        if self.metadata is None:
            self.metadata = {}
        if self.connected_at is None:
            self.connected_at = datetime.utcnow()


class PrivacyFilter:
    """Handles privacy filtering for messages"""
    
    @staticmethod
    def filter_quotation_data(data: Dict[str, Any], viewer: WebSocketConnection) -> Dict[str, Any]:
        """Filter quotation data based on viewer permissions"""
        filtered = data.copy()
        
        # Admin sees everything
        if viewer.user_type == UserType.ADMIN:
            return filtered
        
        # Hotel-specific filtering
        if viewer.user_type == UserType.HOTEL:
            # Check if hotel can see competitor prices
            can_see_competitor_prices = viewer.permissions.get('can_see_competitor_prices', False)
            
            if not can_see_competitor_prices and 'hotel_responses' in filtered:
                # Filter out competitor prices
                filtered_responses = []
                for response in filtered['hotel_responses']:
                    if response.get('hotel_id') == viewer.hotel_id:
                        # Hotel sees their own response fully
                        filtered_responses.append(response)
                    else:
                        # Hide competitor pricing details
                        filtered_response = {
                            'hotel_id': response['hotel_id'],
                            'hotel_name': response.get('hotel_name', 'Hotel'),
                            'status': response.get('status', 'pending'),
                            'responded_at': response.get('responded_at'),
                            # Hide sensitive pricing information
                            'price': '***HIDDEN***',
                            'total': '***HIDDEN***',
                            'commission': '***HIDDEN***',
                            'notes': '***HIDDEN***'
                        }
                        filtered_responses.append(filtered_response)
                
                filtered['hotel_responses'] = filtered_responses
            
            # Hide internal costs and margins
            if 'internal_cost' in filtered:
                del filtered['internal_cost']
            if 'profit_margin' in filtered:
                del filtered['profit_margin']
            if 'operational_costs' in filtered:
                del filtered['operational_costs']
        
        # Agency filtering
        elif viewer.user_type == UserType.AGENCY:
            # Agencies see prices but not internal costs
            if 'internal_cost' in filtered:
                del filtered['internal_cost']
            if 'hotel_commissions' in filtered:
                del filtered['hotel_commissions']
        
        # Client filtering
        elif viewer.user_type == UserType.CLIENT:
            # Clients only see final prices
            if 'hotel_responses' in filtered:
                filtered['hotel_responses'] = [{
                    'hotel_name': r.get('hotel_name'),
                    'total_price': r.get('total_price'),
                    'availability': r.get('availability')
                } for r in filtered['hotel_responses']]
            
            # Remove all internal information
            keys_to_remove = ['internal_cost', 'profit_margin', 'operational_costs', 
                            'commission_rates', 'hotel_costs', 'guide_costs']
            for key in keys_to_remove:
                if key in filtered:
                    del filtered[key]
        
        return filtered
    
    @staticmethod
    def can_access_room(connection: WebSocketConnection, room_id: str, room_type: str) -> bool:
        """Check if connection can access a specific room"""
        # Admin can access all rooms
        if connection.user_type == UserType.ADMIN:
            return True
        
        # Check room-specific permissions
        if room_type == "quotation":
            # Check if user is involved in this quotation
            return room_id in connection.rooms
        elif room_type == "hotel":
            # Hotel-specific room
            return connection.hotel_id and f"hotel_{connection.hotel_id}" == room_id
        elif room_type == "company":
            # Company-specific room
            return connection.company_id and f"company_{connection.company_id}" == room_id
        elif room_type == "public":
            # Public rooms are accessible to all
            return True
        
        return False


class AdvancedWebSocketManager:
    """Advanced WebSocket manager with privacy controls and room management"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.connections: Dict[str, WebSocketConnection] = {}
        self.rooms: Dict[str, Set[str]] = {}  # room_id -> set of connection_ids
        self.user_connections: Dict[str, Set[str]] = {}  # user_id -> set of connection_ids
        self.redis_url = redis_url
        self.redis = None
        self.privacy_filter = PrivacyFilter()
        self.message_queue: Dict[str, List[Dict]] = {}  # Store messages for offline users
        self.heartbeat_interval = 30  # seconds
        self.reconnect_window = 60  # seconds to allow reconnection
        
    async def initialize(self):
        """Initialize Redis connection and restore state"""
        self.redis = await aioredis.create_redis_pool(self.redis_url)
        await self._restore_message_queue()
        asyncio.create_task(self._heartbeat_loop())
        logger.info("WebSocket Manager initialized with Redis")
    
    async def _restore_message_queue(self):
        """Restore message queue from Redis"""
        try:
            queue_data = await self.redis.get('ws:message_queue')
            if queue_data:
                self.message_queue = json.loads(queue_data)
        except Exception as e:
            logger.error(f"Error restoring message queue: {e}")
    
    async def _persist_message_queue(self):
        """Persist message queue to Redis"""
        try:
            await self.redis.set('ws:message_queue', json.dumps(self.message_queue))
        except Exception as e:
            logger.error(f"Error persisting message queue: {e}")
    
    async def register_connection(
        self,
        ws: WebSocketServerProtocol,
        user_id: str,
        user_type: str,
        auth_token: str,
        **kwargs
    ) -> WebSocketConnection:
        """Register a new WebSocket connection"""
        try:
            # Validate auth token
            user_data = self._validate_token(auth_token)
            
            # Create connection object
            connection = WebSocketConnection(
                id=str(uuid.uuid4()),
                ws=ws,
                user_id=user_id,
                user_type=UserType(user_type),
                company_id=kwargs.get('company_id'),
                hotel_id=kwargs.get('hotel_id'),
                permissions=user_data.get('permissions', {}),
                metadata=kwargs
            )
            
            # Store connection
            self.connections[connection.id] = connection
            
            # Track user connections
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(connection.id)
            
            # Auto-join relevant rooms
            await self._auto_join_rooms(connection)
            
            # Send queued messages
            await self._send_queued_messages(connection)
            
            # Notify presence
            await self._broadcast_presence(connection, "online")
            
            logger.info(f"Connection registered: {connection.id} for user {user_id}")
            return connection
            
        except Exception as e:
            logger.error(f"Error registering connection: {e}")
            raise
    
    async def unregister_connection(self, connection_id: str):
        """Unregister a WebSocket connection"""
        if connection_id not in self.connections:
            return
        
        connection = self.connections[connection_id]
        
        # Remove from rooms
        for room_id in list(connection.rooms):
            await self.leave_room(connection_id, room_id)
        
        # Remove from user connections
        if connection.user_id in self.user_connections:
            self.user_connections[connection.user_id].discard(connection_id)
            if not self.user_connections[connection.user_id]:
                del self.user_connections[connection.user_id]
        
        # Notify presence
        await self._broadcast_presence(connection, "offline")
        
        # Remove connection
        del self.connections[connection_id]
        
        logger.info(f"Connection unregistered: {connection_id}")
    
    async def join_room(self, connection_id: str, room_id: str, room_type: str = "public"):
        """Join a connection to a room"""
        if connection_id not in self.connections:
            return False
        
        connection = self.connections[connection_id]
        
        # Check permissions
        if not self.privacy_filter.can_access_room(connection, room_id, room_type):
            logger.warning(f"Connection {connection_id} denied access to room {room_id}")
            return False
        
        # Add to room
        if room_id not in self.rooms:
            self.rooms[room_id] = set()
        self.rooms[room_id].add(connection_id)
        connection.rooms.add(room_id)
        
        # Persist room membership
        await self.redis.sadd(f'ws:room:{room_id}', connection_id)
        
        logger.info(f"Connection {connection_id} joined room {room_id}")
        return True
    
    async def leave_room(self, connection_id: str, room_id: str):
        """Remove a connection from a room"""
        if room_id in self.rooms:
            self.rooms[room_id].discard(connection_id)
            if not self.rooms[room_id]:
                del self.rooms[room_id]
        
        if connection_id in self.connections:
            self.connections[connection_id].rooms.discard(room_id)
        
        # Remove from Redis
        await self.redis.srem(f'ws:room:{room_id}', connection_id)
        
        logger.info(f"Connection {connection_id} left room {room_id}")
    
    async def broadcast_to_room(
        self,
        room_id: str,
        message: Dict[str, Any],
        sender_id: Optional[str] = None,
        exclude: Optional[Set[str]] = None
    ):
        """Broadcast message to all connections in a room with privacy filtering"""
        if room_id not in self.rooms:
            logger.warning(f"Attempting to broadcast to non-existent room: {room_id}")
            return
        
        exclude = exclude or set()
        if sender_id:
            exclude.add(sender_id)
        
        # Get message type for filtering
        message_type = message.get('type', MessageType.NOTIFICATION.value)
        
        for connection_id in self.rooms[room_id]:
            if connection_id in exclude:
                continue
            
            if connection_id not in self.connections:
                continue
            
            connection = self.connections[connection_id]
            
            # Apply privacy filters based on message type
            filtered_message = message.copy()
            if message_type in [MessageType.QUOTATION_UPDATE.value, MessageType.PRICE_UPDATE.value]:
                if 'data' in filtered_message:
                    filtered_message['data'] = self.privacy_filter.filter_quotation_data(
                        filtered_message['data'],
                        connection
                    )
            
            # Send message
            await self._send_to_connection(connection, filtered_message)
    
    async def send_to_user(self, user_id: str, message: Dict[str, Any]):
        """Send message to all connections of a specific user"""
        if user_id not in self.user_connections:
            # Queue message for offline user
            await self._queue_message(user_id, message)
            return
        
        for connection_id in self.user_connections[user_id]:
            if connection_id in self.connections:
                connection = self.connections[connection_id]
                
                # Apply privacy filters
                filtered_message = message.copy()
                if 'data' in filtered_message:
                    filtered_message['data'] = self.privacy_filter.filter_quotation_data(
                        filtered_message['data'],
                        connection
                    )
                
                await self._send_to_connection(connection, filtered_message)
    
    async def _send_to_connection(self, connection: WebSocketConnection, message: Dict[str, Any]):
        """Send message to a specific connection"""
        try:
            # Add metadata
            message['timestamp'] = datetime.utcnow().isoformat()
            message['connection_id'] = connection.id
            
            # Send message
            await connection.ws.send(json.dumps(message))
            
            # Log message
            await self._log_message(connection.id, message)
            
        except websockets.exceptions.ConnectionClosed:
            logger.warning(f"Connection {connection.id} is closed, queuing message")
            await self._queue_message(connection.user_id, message)
            await self.unregister_connection(connection.id)
        except Exception as e:
            logger.error(f"Error sending message to {connection.id}: {e}")
    
    async def _queue_message(self, user_id: str, message: Dict[str, Any]):
        """Queue message for offline user"""
        if user_id not in self.message_queue:
            self.message_queue[user_id] = []
        
        # Add timestamp
        message['queued_at'] = datetime.utcnow().isoformat()
        
        # Limit queue size
        if len(self.message_queue[user_id]) >= 100:
            self.message_queue[user_id].pop(0)
        
        self.message_queue[user_id].append(message)
        
        # Persist to Redis
        await self._persist_message_queue()
    
    async def _send_queued_messages(self, connection: WebSocketConnection):
        """Send queued messages to reconnected user"""
        user_id = connection.user_id
        if user_id not in self.message_queue:
            return
        
        messages = self.message_queue[user_id]
        for message in messages:
            # Apply privacy filters
            if 'data' in message:
                message['data'] = self.privacy_filter.filter_quotation_data(
                    message['data'],
                    connection
                )
            await self._send_to_connection(connection, message)
        
        # Clear queue
        del self.message_queue[user_id]
        await self._persist_message_queue()
    
    async def _auto_join_rooms(self, connection: WebSocketConnection):
        """Automatically join relevant rooms based on user type"""
        # Join user-specific room
        await self.join_room(connection.id, f"user_{connection.user_id}", "private")
        
        # Join company room if applicable
        if connection.company_id:
            await self.join_room(connection.id, f"company_{connection.company_id}", "company")
        
        # Join hotel room if applicable
        if connection.hotel_id:
            await self.join_room(connection.id, f"hotel_{connection.hotel_id}", "hotel")
        
        # Join role-based room
        await self.join_room(connection.id, f"role_{connection.user_type.value}", "role")
        
        # Join public announcements room
        await self.join_room(connection.id, "public_announcements", "public")
    
    async def _broadcast_presence(self, connection: WebSocketConnection, status: str):
        """Broadcast user presence update"""
        presence_message = {
            'type': MessageType.PRESENCE.value,
            'data': {
                'user_id': connection.user_id,
                'status': status,
                'user_type': connection.user_type.value,
                'timestamp': datetime.utcnow().isoformat()
            }
        }
        
        # Broadcast to relevant rooms
        for room_id in connection.rooms:
            await self.broadcast_to_room(room_id, presence_message, connection.id)
    
    async def _heartbeat_loop(self):
        """Send periodic heartbeat to all connections"""
        while True:
            await asyncio.sleep(self.heartbeat_interval)
            
            heartbeat_message = {
                'type': 'heartbeat',
                'timestamp': datetime.utcnow().isoformat()
            }
            
            disconnected = []
            for connection_id, connection in self.connections.items():
                try:
                    await connection.ws.send(json.dumps(heartbeat_message))
                except:
                    disconnected.append(connection_id)
            
            # Clean up disconnected connections
            for connection_id in disconnected:
                await self.unregister_connection(connection_id)
    
    def _validate_token(self, token: str) -> Dict[str, Any]:
        """Validate JWT token and extract user data"""
        try:
            # In production, use proper JWT secret
            payload = jwt.decode(token, 'your-secret-key', algorithms=['HS256'])
            return payload
        except jwt.ExpiredTokenError:
            raise ValueError("Token has expired")
        except jwt.InvalidTokenError:
            raise ValueError("Invalid token")
    
    async def _log_message(self, connection_id: str, message: Dict[str, Any]):
        """Log message for audit purposes"""
        log_entry = {
            'connection_id': connection_id,
            'message': message,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Store in Redis with TTL
        key = f"ws:log:{connection_id}:{datetime.utcnow().timestamp()}"
        await self.redis.setex(key, 86400, json.dumps(log_entry))  # 24 hour TTL
    
    async def handle_typing_indicator(self, connection_id: str, room_id: str, is_typing: bool):
        """Handle typing indicator for real-time feedback"""
        if connection_id not in self.connections:
            return
        
        connection = self.connections[connection_id]
        
        typing_message = {
            'type': MessageType.TYPING.value,
            'data': {
                'user_id': connection.user_id,
                'is_typing': is_typing,
                'room_id': room_id
            }
        }
        
        await self.broadcast_to_room(room_id, typing_message, connection_id)
    
    async def get_room_members(self, room_id: str) -> List[Dict[str, Any]]:
        """Get list of members in a room"""
        members = []
        
        if room_id not in self.rooms:
            return members
        
        for connection_id in self.rooms[room_id]:
            if connection_id in self.connections:
                connection = self.connections[connection_id]
                members.append({
                    'user_id': connection.user_id,
                    'user_type': connection.user_type.value,
                    'connected_at': connection.connected_at.isoformat(),
                    'status': 'online'
                })
        
        return members
    
    async def cleanup(self):
        """Cleanup resources"""
        # Close all connections
        for connection_id in list(self.connections.keys()):
            await self.unregister_connection(connection_id)
        
        # Close Redis connection
        if self.redis:
            self.redis.close()
            await self.redis.wait_closed()


# WebSocket server implementation
async def handle_websocket(websocket, path, manager: AdvancedWebSocketManager):
    """Handle individual WebSocket connection"""
    connection = None
    
    try:
        # Wait for authentication message
        auth_message = await websocket.recv()
        auth_data = json.loads(auth_message)
        
        if auth_data.get('type') != 'auth':
            await websocket.send(json.dumps({
                'type': MessageType.ERROR.value,
                'error': 'Authentication required'
            }))
            return
        
        # Register connection
        connection = await manager.register_connection(
            ws=websocket,
            user_id=auth_data['user_id'],
            user_type=auth_data['user_type'],
            auth_token=auth_data['token'],
            company_id=auth_data.get('company_id'),
            hotel_id=auth_data.get('hotel_id')
        )
        
        # Send success message
        await websocket.send(json.dumps({
            'type': 'auth_success',
            'connection_id': connection.id,
            'rooms': list(connection.rooms)
        }))
        
        # Handle incoming messages
        async for message in websocket:
            try:
                data = json.loads(message)
                message_type = data.get('type')
                
                if message_type == 'join_room':
                    success = await manager.join_room(
                        connection.id,
                        data['room_id'],
                        data.get('room_type', 'public')
                    )
                    await websocket.send(json.dumps({
                        'type': 'room_joined' if success else 'room_join_failed',
                        'room_id': data['room_id']
                    }))
                
                elif message_type == 'leave_room':
                    await manager.leave_room(connection.id, data['room_id'])
                    await websocket.send(json.dumps({
                        'type': 'room_left',
                        'room_id': data['room_id']
                    }))
                
                elif message_type == 'broadcast':
                    await manager.broadcast_to_room(
                        data['room_id'],
                        data['message'],
                        connection.id
                    )
                
                elif message_type == 'typing':
                    await manager.handle_typing_indicator(
                        connection.id,
                        data['room_id'],
                        data['is_typing']
                    )
                
                elif message_type == 'get_members':
                    members = await manager.get_room_members(data['room_id'])
                    await websocket.send(json.dumps({
                        'type': 'room_members',
                        'room_id': data['room_id'],
                        'members': members
                    }))
                
            except json.JSONDecodeError:
                await websocket.send(json.dumps({
                    'type': MessageType.ERROR.value,
                    'error': 'Invalid JSON'
                }))
            except Exception as e:
                logger.error(f"Error handling message: {e}")
                await websocket.send(json.dumps({
                    'type': MessageType.ERROR.value,
                    'error': str(e)
                }))
    
    except websockets.exceptions.ConnectionClosed:
        logger.info(f"WebSocket connection closed")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if connection:
            await manager.unregister_connection(connection.id)


# Start WebSocket server
async def start_websocket_server(host: str = '0.0.0.0', port: int = 8001):
    """Start the WebSocket server"""
    manager = AdvancedWebSocketManager()
    await manager.initialize()
    
    async with websockets.serve(
        lambda ws, path: handle_websocket(ws, path, manager),
        host,
        port
    ):
        logger.info(f"WebSocket server started on ws://{host}:{port}")
        await asyncio.Future()  # Run forever


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(start_websocket_server())