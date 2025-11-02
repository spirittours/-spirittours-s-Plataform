"""
WebSocket API Routes

FastAPI WebSocket endpoints for real-time communication.
"""

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from typing import Optional
import json

from .connection_manager import manager
from .notification_service import notification_service


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/connect")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str = Query(..., description="User ID"),
    device_type: Optional[str] = Query(None, description="Device type"),
    app_version: Optional[str] = Query(None, description="App version")
):
    """
    Main WebSocket endpoint for real-time communication.
    
    Query Parameters:
        user_id: User identifier (required)
        device_type: Device type (mobile, desktop, tablet)
        app_version: Application version
    
    Message Format (Client -> Server):
    ```json
    {
        "action": "subscribe"|"unsubscribe"|"message"|"ping",
        "room": "room_name",  // For subscribe/unsubscribe
        "data": {...}         // For message
    }
    ```
    
    Message Format (Server -> Client):
    ```json
    {
        "type": "notification"|"message"|"system"|"pong",
        "data": {...}
    }
    ```
    """
    # Connect
    metadata = {
        'device_type': device_type,
        'app_version': app_version,
    }
    await manager.connect(websocket, user_id, metadata)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                action = message.get('action')
                
                if action == 'subscribe':
                    # Subscribe to room/channel
                    room = message.get('room')
                    if room:
                        manager.join_room(user_id, room)
                        await manager.send_personal_message(
                            {
                                'type': 'subscribed',
                                'room': room,
                                'message': f'Subscribed to {room}',
                            },
                            user_id
                        )
                
                elif action == 'unsubscribe':
                    # Unsubscribe from room/channel
                    room = message.get('room')
                    if room:
                        manager.leave_room(user_id, room)
                        await manager.send_personal_message(
                            {
                                'type': 'unsubscribed',
                                'room': room,
                                'message': f'Unsubscribed from {room}',
                            },
                            user_id
                        )
                
                elif action == 'message':
                    # Echo message back (can be extended for chat)
                    await manager.send_personal_message(
                        {
                            'type': 'message_received',
                            'data': message.get('data', {}),
                        },
                        user_id
                    )
                
                elif action == 'ping':
                    # Respond to ping
                    await manager.send_personal_message(
                        {'type': 'pong'},
                        user_id
                    )
                
                else:
                    # Unknown action
                    await manager.send_personal_message(
                        {
                            'type': 'error',
                            'message': f'Unknown action: {action}',
                        },
                        user_id
                    )
            
            except json.JSONDecodeError:
                await manager.send_personal_message(
                    {
                        'type': 'error',
                        'message': 'Invalid JSON format',
                    },
                    user_id
                )
            except Exception as e:
                logger.error(f"Error processing message from user {user_id}: {str(e)}")
                await manager.send_personal_message(
                    {
                        'type': 'error',
                        'message': 'Internal server error',
                    },
                    user_id
                )
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        logger.info(f"User {user_id} disconnected normally")
    
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {str(e)}")
        manager.disconnect(websocket, user_id)


@router.websocket("/notifications/{user_id}")
async def notifications_endpoint(
    websocket: WebSocket,
    user_id: str
):
    """
    Dedicated WebSocket endpoint for notifications only.
    
    Simpler endpoint that only receives notifications,
    no bidirectional communication.
    """
    await manager.connect(websocket, user_id)
    
    try:
        while True:
            # Just keep connection alive, only send notifications
            await websocket.receive_text()
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"Notification WebSocket error: {str(e)}")
        manager.disconnect(websocket, user_id)


@router.get("/stats")
async def get_websocket_stats():
    """
    Get WebSocket connection statistics.
    
    Returns:
        Statistics about active connections, rooms, messages, etc.
    """
    return {
        'status': 'online',
        'stats': manager.get_stats(),
        'online_users': manager.get_online_users(),
    }


@router.get("/rooms")
async def get_rooms():
    """
    Get list of active rooms and their users.
    
    Returns:
        Dictionary of rooms with user counts
    """
    rooms = {}
    for room in manager.rooms.keys():
        rooms[room] = {
            'user_count': len(manager.rooms[room]),
            'users': list(manager.rooms[room]),
        }
    
    return {'rooms': rooms}


@router.get("/users/{user_id}/connections")
async def get_user_connections(user_id: str):
    """
    Get connection count for a specific user.
    
    Args:
        user_id: User identifier
    
    Returns:
        Connection information
    """
    return {
        'user_id': user_id,
        'connection_count': manager.get_user_connection_count(user_id),
        'is_online': user_id in manager.get_online_users(),
    }


@router.post("/broadcast")
async def broadcast_message(
    title: str,
    message: str,
    priority: str = "medium"
):
    """
    Broadcast a message to all connected users.
    
    Args:
        title: Message title
        message: Message content
        priority: Priority level (low, medium, high, urgent)
    
    Returns:
        Broadcast confirmation
    """
    await notification_service.broadcast_system_message(
        title=title,
        message=message,
        priority=priority
    )
    
    return {
        'status': 'success',
        'message': 'Broadcast sent',
        'recipients': len(manager.get_online_users()),
    }


@router.post("/rooms/{room}/broadcast")
async def broadcast_to_room(
    room: str,
    title: str,
    message: str
):
    """
    Broadcast a message to a specific room.
    
    Args:
        room: Room name
        title: Message title
        message: Message content
    
    Returns:
        Broadcast confirmation
    """
    await manager.broadcast_to_room(
        {
            'type': 'room_broadcast',
            'room': room,
            'title': title,
            'message': message,
        },
        room
    )
    
    return {
        'status': 'success',
        'room': room,
        'recipients': len(manager.get_room_users(room)),
    }
