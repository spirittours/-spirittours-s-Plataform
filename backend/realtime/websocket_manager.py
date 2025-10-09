"""
WebSocket Manager for Real-time Notifications
Spirit Tours Platform - Real-time System
"""

import json
import asyncio
import logging
from typing import Dict, List, Set, Optional, Any
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import redis.asyncio as redis
from enum import Enum
import uuid

logger = logging.getLogger(__name__)


class NotificationType(Enum):
    """Notification types"""
    BOOKING_CONFIRMATION = "booking_confirmation"
    BOOKING_UPDATE = "booking_update"
    PAYMENT_SUCCESS = "payment_success"
    PAYMENT_FAILURE = "payment_failure"
    TOUR_UPDATE = "tour_update"
    TOUR_REMINDER = "tour_reminder"
    MESSAGE = "message"
    ALERT = "alert"
    SYSTEM = "system"
    PROMOTION = "promotion"
    CHAT = "chat"


class ConnectionManager:
    """Manages WebSocket connections and message broadcasting"""
    
    def __init__(self):
        # Store active connections by user_id
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Store connection metadata
        self.connection_metadata: Dict[WebSocket, Dict] = {}
        # Store user subscriptions to channels
        self.user_subscriptions: Dict[str, Set[str]] = {}
        # Redis client for pub/sub
        self.redis_client: Optional[redis.Redis] = None
        self.pubsub: Optional[redis.client.PubSub] = None
        self._lock = asyncio.Lock()
        
    async def initialize_redis(self, redis_url: str = "redis://localhost:6379"):
        """Initialize Redis connection for pub/sub"""
        try:
            self.redis_client = await redis.from_url(redis_url, decode_responses=True)
            self.pubsub = self.redis_client.pubsub()
            logger.info("Redis connection initialized for WebSocket manager")
        except Exception as e:
            logger.error(f"Failed to initialize Redis: {e}")
    
    async def connect(self, websocket: WebSocket, user_id: str, metadata: Dict = None):
        """Accept new WebSocket connection"""
        await websocket.accept()
        
        async with self._lock:
            # Add to active connections
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            self.active_connections[user_id].append(websocket)
            
            # Store metadata
            self.connection_metadata[websocket] = {
                "user_id": user_id,
                "connected_at": datetime.utcnow().isoformat(),
                "client_ip": websocket.client.host,
                "session_id": str(uuid.uuid4()),
                **(metadata or {})
            }
            
            # Initialize user subscriptions
            if user_id not in self.user_subscriptions:
                self.user_subscriptions[user_id] = set()
                # Auto-subscribe to personal channel
                self.user_subscriptions[user_id].add(f"user:{user_id}")
            
            logger.info(f"User {user_id} connected via WebSocket from {websocket.client.host}")
            
            # Send connection confirmation
            await self.send_personal_message(
                user_id,
                {
                    "type": NotificationType.SYSTEM.value,
                    "message": "Connected to real-time notifications",
                    "session_id": self.connection_metadata[websocket]["session_id"],
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
    
    async def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove WebSocket connection"""
        async with self._lock:
            # Remove from active connections
            if user_id in self.active_connections:
                if websocket in self.active_connections[user_id]:
                    self.active_connections[user_id].remove(websocket)
                    
                # Clean up if no more connections for this user
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            
            # Remove metadata
            if websocket in self.connection_metadata:
                del self.connection_metadata[websocket]
            
            logger.info(f"User {user_id} disconnected from WebSocket")
    
    async def send_personal_message(self, user_id: str, message: Dict[str, Any]):
        """Send message to specific user (all their connections)"""
        if user_id in self.active_connections:
            # Send to all user's active connections
            disconnected = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    disconnected.append(connection)
            
            # Clean up disconnected connections
            for conn in disconnected:
                await self.disconnect(conn, user_id)
    
    async def broadcast(self, message: Dict[str, Any], channel: str = None):
        """Broadcast message to all connected users or specific channel"""
        if channel:
            # Broadcast to specific channel subscribers
            users_to_notify = [
                user_id for user_id, channels in self.user_subscriptions.items()
                if channel in channels
            ]
            for user_id in users_to_notify:
                await self.send_personal_message(user_id, message)
        else:
            # Broadcast to all connected users
            for user_id in list(self.active_connections.keys()):
                await self.send_personal_message(user_id, message)
    
    async def subscribe_to_channel(self, user_id: str, channel: str):
        """Subscribe user to a channel"""
        if user_id in self.user_subscriptions:
            self.user_subscriptions[user_id].add(channel)
            logger.info(f"User {user_id} subscribed to channel {channel}")
            
            # Notify user of subscription
            await self.send_personal_message(
                user_id,
                {
                    "type": NotificationType.SYSTEM.value,
                    "message": f"Subscribed to channel: {channel}",
                    "channel": channel,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
    
    async def unsubscribe_from_channel(self, user_id: str, channel: str):
        """Unsubscribe user from a channel"""
        if user_id in self.user_subscriptions:
            self.user_subscriptions[user_id].discard(channel)
            logger.info(f"User {user_id} unsubscribed from channel {channel}")
            
            # Notify user of unsubscription
            await self.send_personal_message(
                user_id,
                {
                    "type": NotificationType.SYSTEM.value,
                    "message": f"Unsubscribed from channel: {channel}",
                    "channel": channel,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
    
    def get_connection_info(self, user_id: str) -> Dict:
        """Get connection information for a user"""
        connections = []
        if user_id in self.active_connections:
            for conn in self.active_connections[user_id]:
                if conn in self.connection_metadata:
                    connections.append(self.connection_metadata[conn])
        
        return {
            "user_id": user_id,
            "active_connections": len(connections),
            "connections": connections,
            "subscriptions": list(self.user_subscriptions.get(user_id, set()))
        }
    
    def get_all_connections(self) -> Dict:
        """Get all active connections information"""
        return {
            "total_users": len(self.active_connections),
            "total_connections": sum(len(conns) for conns in self.active_connections.values()),
            "users": list(self.active_connections.keys())
        }


class NotificationService:
    """Service for sending notifications through WebSocket"""
    
    def __init__(self, connection_manager: ConnectionManager):
        self.connection_manager = connection_manager
        
    async def send_booking_confirmation(self, user_id: str, booking_data: Dict):
        """Send booking confirmation notification"""
        notification = {
            "type": NotificationType.BOOKING_CONFIRMATION.value,
            "title": "Booking Confirmed!",
            "message": f"Your booking for {booking_data.get('tour_name')} has been confirmed",
            "data": booking_data,
            "timestamp": datetime.utcnow().isoformat(),
            "action_url": f"/bookings/{booking_data.get('booking_id')}"
        }
        await self.connection_manager.send_personal_message(user_id, notification)
    
    async def send_booking_update(self, user_id: str, booking_id: str, update_data: Dict):
        """Send booking update notification"""
        notification = {
            "type": NotificationType.BOOKING_UPDATE.value,
            "title": "Booking Updated",
            "message": f"Your booking #{booking_id} has been updated",
            "data": update_data,
            "timestamp": datetime.utcnow().isoformat(),
            "action_url": f"/bookings/{booking_id}"
        }
        await self.connection_manager.send_personal_message(user_id, notification)
    
    async def send_payment_success(self, user_id: str, payment_data: Dict):
        """Send payment success notification"""
        notification = {
            "type": NotificationType.PAYMENT_SUCCESS.value,
            "title": "Payment Successful",
            "message": f"Payment of {payment_data.get('amount')} {payment_data.get('currency', 'USD')} processed successfully",
            "data": payment_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.connection_manager.send_personal_message(user_id, notification)
    
    async def send_payment_failure(self, user_id: str, payment_data: Dict):
        """Send payment failure notification"""
        notification = {
            "type": NotificationType.PAYMENT_FAILURE.value,
            "title": "Payment Failed",
            "message": f"Payment processing failed. Please try again.",
            "data": payment_data,
            "timestamp": datetime.utcnow().isoformat(),
            "action_required": True,
            "action_url": "/payment/retry"
        }
        await self.connection_manager.send_personal_message(user_id, notification)
    
    async def send_tour_reminder(self, user_id: str, tour_data: Dict):
        """Send tour reminder notification"""
        notification = {
            "type": NotificationType.TOUR_REMINDER.value,
            "title": "Tour Reminder",
            "message": f"Your tour '{tour_data.get('tour_name')}' starts in {tour_data.get('hours_until', 24)} hours",
            "data": tour_data,
            "timestamp": datetime.utcnow().isoformat(),
            "action_url": f"/tours/{tour_data.get('tour_id')}"
        }
        await self.connection_manager.send_personal_message(user_id, notification)
    
    async def send_tour_update(self, tour_id: str, update_data: Dict):
        """Send tour update to all subscribers"""
        notification = {
            "type": NotificationType.TOUR_UPDATE.value,
            "title": "Tour Update",
            "message": f"Tour information has been updated",
            "data": update_data,
            "timestamp": datetime.utcnow().isoformat(),
            "tour_id": tour_id
        }
        # Broadcast to tour channel
        await self.connection_manager.broadcast(notification, channel=f"tour:{tour_id}")
    
    async def send_promotion(self, promotion_data: Dict, target_users: List[str] = None):
        """Send promotion notification"""
        notification = {
            "type": NotificationType.PROMOTION.value,
            "title": promotion_data.get("title", "Special Offer!"),
            "message": promotion_data.get("message"),
            "data": promotion_data,
            "timestamp": datetime.utcnow().isoformat(),
            "action_url": promotion_data.get("action_url", "/promotions")
        }
        
        if target_users:
            # Send to specific users
            for user_id in target_users:
                await self.connection_manager.send_personal_message(user_id, notification)
        else:
            # Broadcast to all
            await self.connection_manager.broadcast(notification)
    
    async def send_chat_message(self, chat_data: Dict):
        """Send chat message to participants"""
        notification = {
            "type": NotificationType.CHAT.value,
            "data": chat_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send to chat participants
        for participant_id in chat_data.get("participants", []):
            await self.connection_manager.send_personal_message(participant_id, notification)
    
    async def send_system_alert(self, alert_data: Dict, severity: str = "info"):
        """Send system alert to all users"""
        notification = {
            "type": NotificationType.ALERT.value,
            "title": "System Alert",
            "message": alert_data.get("message"),
            "severity": severity,  # info, warning, error, critical
            "data": alert_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.connection_manager.broadcast(notification)


# Global instances
manager = ConnectionManager()
notification_service = NotificationService(manager)


# WebSocket endpoint handler
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: Optional[str] = None
):
    """WebSocket endpoint for real-time notifications"""
    
    # Validate token if provided
    # TODO: Implement token validation
    
    await manager.connect(websocket, user_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            
            # Handle different message types
            if data.get("action") == "subscribe":
                channel = data.get("channel")
                if channel:
                    await manager.subscribe_to_channel(user_id, channel)
            
            elif data.get("action") == "unsubscribe":
                channel = data.get("channel")
                if channel:
                    await manager.unsubscribe_from_channel(user_id, channel)
            
            elif data.get("action") == "ping":
                # Respond to ping
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            elif data.get("action") == "message":
                # Handle custom message
                # Process based on your business logic
                pass
                
    except WebSocketDisconnect:
        await manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        await manager.disconnect(websocket, user_id)