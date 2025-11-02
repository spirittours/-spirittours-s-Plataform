"""
WebSocket Connection Manager

Manages WebSocket connections, broadcasts, and targeted messaging.
"""

import asyncio
import json
import logging
from typing import Dict, List, Set, Optional, Any
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
from collections import defaultdict


logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections and message broadcasting.
    
    Features:
    - Connection pooling by user/room
    - Broadcast to all/specific users/rooms
    - Heartbeat/ping-pong for connection health
    - Message queuing for offline users
    - Connection state tracking
    """
    
    def __init__(self):
        # Active connections by user_id
        self.active_connections: Dict[str, List[WebSocket]] = defaultdict(list)
        
        # Connections by room/channel
        self.rooms: Dict[str, Set[str]] = defaultdict(set)
        
        # Message queue for offline users
        self.offline_messages: Dict[str, List[Dict]] = defaultdict(list)
        
        # Connection metadata
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}
        
        # Statistics
        self.stats = {
            'total_connections': 0,
            'active_connections': 0,
            'messages_sent': 0,
            'broadcasts': 0,
        }
        
        logger.info("ConnectionManager initialized")
    
    async def connect(
        self,
        websocket: WebSocket,
        user_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Accept and register a new WebSocket connection.
        
        Args:
            websocket: WebSocket instance
            user_id: User identifier
            metadata: Optional connection metadata (device, location, etc.)
        """
        await websocket.accept()
        
        # Add to active connections
        self.active_connections[user_id].append(websocket)
        
        # Store metadata
        connection_id = id(websocket)
        self.connection_metadata[str(connection_id)] = {
            'user_id': user_id,
            'connected_at': datetime.utcnow().isoformat(),
            'metadata': metadata or {},
        }
        
        # Update stats
        self.stats['total_connections'] += 1
        self.stats['active_connections'] = sum(
            len(conns) for conns in self.active_connections.values()
        )
        
        logger.info(f"User {user_id} connected (connection #{connection_id})")
        
        # Send queued offline messages
        await self._send_queued_messages(user_id, websocket)
        
        # Notify connection established
        await self.send_personal_message(
            {
                'type': 'connection_established',
                'user_id': user_id,
                'timestamp': datetime.utcnow().isoformat(),
            },
            user_id
        )
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        """
        Remove a WebSocket connection.
        
        Args:
            websocket: WebSocket instance to remove
            user_id: User identifier
        """
        # Remove from active connections
        if user_id in self.active_connections:
            try:
                self.active_connections[user_id].remove(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            except ValueError:
                pass
        
        # Remove metadata
        connection_id = str(id(websocket))
        if connection_id in self.connection_metadata:
            del self.connection_metadata[connection_id]
        
        # Update stats
        self.stats['active_connections'] = sum(
            len(conns) for conns in self.active_connections.values()
        )
        
        logger.info(f"User {user_id} disconnected")
    
    async def send_personal_message(
        self,
        message: Dict[str, Any],
        user_id: str
    ) -> bool:
        """
        Send message to specific user.
        
        Args:
            message: Message data
            user_id: Target user ID
            
        Returns:
            True if message was sent, False if user offline
        """
        if user_id not in self.active_connections:
            # Queue message for offline user
            self.offline_messages[user_id].append({
                **message,
                'queued_at': datetime.utcnow().isoformat(),
            })
            logger.debug(f"Message queued for offline user {user_id}")
            return False
        
        # Send to all user connections
        message_json = json.dumps(message)
        disconnected = []
        
        for websocket in self.active_connections[user_id]:
            try:
                await websocket.send_text(message_json)
                self.stats['messages_sent'] += 1
            except Exception as e:
                logger.error(f"Error sending to user {user_id}: {str(e)}")
                disconnected.append(websocket)
        
        # Clean up disconnected websockets
        for ws in disconnected:
            self.disconnect(ws, user_id)
        
        return True
    
    async def broadcast(
        self,
        message: Dict[str, Any],
        exclude_users: Optional[List[str]] = None
    ):
        """
        Broadcast message to all connected users.
        
        Args:
            message: Message to broadcast
            exclude_users: Optional list of user IDs to exclude
        """
        exclude_users = exclude_users or []
        message_json = json.dumps(message)
        
        for user_id, connections in list(self.active_connections.items()):
            if user_id in exclude_users:
                continue
                
            disconnected = []
            for websocket in connections:
                try:
                    await websocket.send_text(message_json)
                    self.stats['messages_sent'] += 1
                except Exception as e:
                    logger.error(f"Error broadcasting to user {user_id}: {str(e)}")
                    disconnected.append(websocket)
            
            # Clean up disconnected
            for ws in disconnected:
                self.disconnect(ws, user_id)
        
        self.stats['broadcasts'] += 1
        logger.info(f"Broadcast sent to {len(self.active_connections)} users")
    
    async def broadcast_to_room(
        self,
        message: Dict[str, Any],
        room: str
    ):
        """
        Broadcast message to all users in a room.
        
        Args:
            message: Message to send
            room: Room/channel name
        """
        if room not in self.rooms:
            logger.warning(f"Room {room} not found")
            return
        
        message_json = json.dumps(message)
        
        for user_id in self.rooms[room]:
            if user_id not in self.active_connections:
                continue
                
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_text(message_json)
                    self.stats['messages_sent'] += 1
                except Exception as e:
                    logger.error(f"Error sending to user {user_id} in room {room}: {str(e)}")
        
        logger.info(f"Broadcast sent to room {room} ({len(self.rooms[room])} users)")
    
    def join_room(self, user_id: str, room: str):
        """
        Add user to a room/channel.
        
        Args:
            user_id: User ID
            room: Room name
        """
        self.rooms[room].add(user_id)
        logger.info(f"User {user_id} joined room {room}")
    
    def leave_room(self, user_id: str, room: str):
        """
        Remove user from a room/channel.
        
        Args:
            user_id: User ID
            room: Room name
        """
        if room in self.rooms:
            self.rooms[room].discard(user_id)
            if not self.rooms[room]:
                del self.rooms[room]
        logger.info(f"User {user_id} left room {room}")
    
    async def _send_queued_messages(self, user_id: str, websocket: WebSocket):
        """
        Send queued offline messages to user.
        
        Args:
            user_id: User ID
            websocket: WebSocket connection
        """
        if user_id not in self.offline_messages:
            return
        
        messages = self.offline_messages[user_id]
        if not messages:
            return
        
        logger.info(f"Sending {len(messages)} queued messages to user {user_id}")
        
        for message in messages:
            try:
                await websocket.send_text(json.dumps(message))
                self.stats['messages_sent'] += 1
            except Exception as e:
                logger.error(f"Error sending queued message: {str(e)}")
                break
        
        # Clear queue
        del self.offline_messages[user_id]
    
    def get_online_users(self) -> List[str]:
        """
        Get list of currently online user IDs.
        
        Returns:
            List of user IDs
        """
        return list(self.active_connections.keys())
    
    def get_user_connection_count(self, user_id: str) -> int:
        """
        Get number of active connections for user.
        
        Args:
            user_id: User ID
            
        Returns:
            Connection count
        """
        return len(self.active_connections.get(user_id, []))
    
    def get_room_users(self, room: str) -> List[str]:
        """
        Get list of users in a room.
        
        Args:
            room: Room name
            
        Returns:
            List of user IDs
        """
        return list(self.rooms.get(room, set()))
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get connection statistics.
        
        Returns:
            Statistics dictionary
        """
        return {
            **self.stats,
            'unique_users': len(self.active_connections),
            'total_rooms': len(self.rooms),
            'queued_messages': sum(
                len(msgs) for msgs in self.offline_messages.values()
            ),
        }
    
    async def ping_all(self):
        """Send ping to all connections to check health."""
        ping_message = json.dumps({'type': 'ping', 'timestamp': datetime.utcnow().isoformat()})
        
        for user_id, connections in list(self.active_connections.items()):
            disconnected = []
            for websocket in connections:
                try:
                    await websocket.send_text(ping_message)
                except Exception:
                    disconnected.append(websocket)
            
            for ws in disconnected:
                self.disconnect(ws, user_id)


# Singleton instance
manager = ConnectionManager()
