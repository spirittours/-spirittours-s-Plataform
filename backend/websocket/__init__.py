"""
WebSocket Real-time Notifications System

Provides real-time bidirectional communication for:
- Booking updates
- Agent notifications
- System alerts
- Chat messages
- Live tour updates
"""

from .connection_manager import ConnectionManager
from .notification_service import NotificationService
from .websocket_routes import router

__all__ = ['ConnectionManager', 'NotificationService', 'router']
