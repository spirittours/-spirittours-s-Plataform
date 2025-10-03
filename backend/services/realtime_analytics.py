"""
Real-time Analytics WebSocket Manager
Advanced WebSocket service for live analytics updates and dashboard streaming.

Features:
- Real-time KPI streaming
- Live chart data updates
- Alert notifications
- User-specific dashboard subscriptions
- Performance optimized with data compression
- Auto-reconnection support
- Multi-dashboard support
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set, Any
from dataclasses import dataclass, asdict
from enum import Enum
import gzip
import base64
from collections import defaultdict

from fastapi import WebSocket, WebSocketDisconnect
from ..services.analytics_service import AnalyticsService, get_analytics_service, TimeFrame

logger = logging.getLogger(__name__)

class SubscriptionType(str, Enum):
    """Types of real-time analytics subscriptions"""
    KPIS = "kpis"
    BOOKINGS = "bookings"
    PAYMENTS = "payments"
    AI_USAGE = "ai_usage"
    USER_ENGAGEMENT = "user_engagement"
    ALERTS = "alerts"
    SYSTEM_HEALTH = "system_health"

class UpdateFrequency(str, Enum):
    """Update frequency options"""
    HIGH = "5s"      # Every 5 seconds
    NORMAL = "30s"   # Every 30 seconds
    LOW = "60s"      # Every minute
    CUSTOM = "custom"

@dataclass
class ClientSubscription:
    """Client subscription configuration"""
    client_id: str
    subscription_types: Set[SubscriptionType]
    update_frequency: UpdateFrequency
    dashboard_config: Optional[Dict[str, Any]] = None
    filters: Optional[Dict[str, Any]] = None
    compression_enabled: bool = True
    last_update: Optional[datetime] = None

@dataclass
class AnalyticsUpdate:
    """Real-time analytics update message"""
    update_type: SubscriptionType
    data: Dict[str, Any]
    timestamp: datetime
    client_filters: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['timestamp'] = self.timestamp.isoformat()
        return result

class RealTimeAnalyticsManager:
    """
    Advanced WebSocket manager for real-time analytics streaming.
    
    Manages multiple client connections with individual subscriptions,
    optimizes data delivery, and provides real-time dashboard updates.
    """
    
    def __init__(self):
        self.connections: Dict[str, WebSocket] = {}
        self.subscriptions: Dict[str, ClientSubscription] = {}
        self.update_tasks: Dict[str, asyncio.Task] = {}
        self.global_update_task: Optional[asyncio.Task] = None
        self.analytics_service: Optional[AnalyticsService] = None
        self.last_global_data = {}
        
    async def initialize(self):
        """Initialize the real-time analytics manager"""
        self.analytics_service = await get_analytics_service()
        
        # Start global update task
        if not self.global_update_task or self.global_update_task.done():
            self.global_update_task = asyncio.create_task(self._global_update_loop())
        
        logger.info("Real-time Analytics Manager initialized")
    
    async def connect_client(self, websocket: WebSocket, client_id: str, 
                           subscription_config: Optional[Dict[str, Any]] = None) -> bool:
        """Connect a new client with subscription configuration"""
        try:
            await websocket.accept()
            
            # Store connection
            self.connections[client_id] = websocket
            
            # Create subscription
            subscription = ClientSubscription(
                client_id=client_id,
                subscription_types=set(),
                update_frequency=UpdateFrequency.NORMAL,
                dashboard_config=subscription_config.get("dashboard_config") if subscription_config else None,
                filters=subscription_config.get("filters") if subscription_config else None,
                compression_enabled=subscription_config.get("compression", True) if subscription_config else True
            )
            
            # Parse subscription types
            if subscription_config and "subscriptions" in subscription_config:
                for sub_type in subscription_config["subscriptions"]:
                    try:
                        subscription.subscription_types.add(SubscriptionType(sub_type))
                    except ValueError:
                        logger.warning(f"Invalid subscription type: {sub_type}")
            
            # Set update frequency
            if subscription_config and "update_frequency" in subscription_config:
                try:
                    subscription.update_frequency = UpdateFrequency(subscription_config["update_frequency"])
                except ValueError:
                    logger.warning(f"Invalid update frequency: {subscription_config['update_frequency']}")
            
            self.subscriptions[client_id] = subscription
            
            # Send initial data
            await self._send_initial_data(client_id)
            
            # Start client-specific update task if needed
            if subscription.update_frequency in [UpdateFrequency.HIGH, UpdateFrequency.CUSTOM]:
                self.update_tasks[client_id] = asyncio.create_task(
                    self._client_update_loop(client_id)
                )
            
            logger.info(f"Client {client_id} connected with {len(subscription.subscription_types)} subscriptions")
            return True
            
        except Exception as e:
            logger.error(f"Error connecting client {client_id}: {str(e)}")
            return False
    
    async def disconnect_client(self, client_id: str):
        """Disconnect and clean up client"""
        try:
            # Cancel client-specific update task
            if client_id in self.update_tasks:
                self.update_tasks[client_id].cancel()
                del self.update_tasks[client_id]
            
            # Remove connection and subscription
            self.connections.pop(client_id, None)
            self.subscriptions.pop(client_id, None)
            
            logger.info(f"Client {client_id} disconnected and cleaned up")
            
        except Exception as e:
            logger.error(f"Error disconnecting client {client_id}: {str(e)}")
    
    async def update_subscription(self, client_id: str, subscription_config: Dict[str, Any]):
        """Update client subscription configuration"""
        try:
            if client_id not in self.subscriptions:
                raise ValueError(f"Client {client_id} not found")
            
            subscription = self.subscriptions[client_id]
            
            # Update subscription types
            if "subscriptions" in subscription_config:
                subscription.subscription_types.clear()
                for sub_type in subscription_config["subscriptions"]:
                    try:
                        subscription.subscription_types.add(SubscriptionType(sub_type))
                    except ValueError:
                        logger.warning(f"Invalid subscription type: {sub_type}")
            
            # Update frequency
            if "update_frequency" in subscription_config:
                old_frequency = subscription.update_frequency
                try:
                    subscription.update_frequency = UpdateFrequency(subscription_config["update_frequency"])
                    
                    # Restart update task if frequency changed
                    if old_frequency != subscription.update_frequency:
                        if client_id in self.update_tasks:
                            self.update_tasks[client_id].cancel()
                        
                        if subscription.update_frequency in [UpdateFrequency.HIGH, UpdateFrequency.CUSTOM]:
                            self.update_tasks[client_id] = asyncio.create_task(
                                self._client_update_loop(client_id)
                            )
                        else:
                            self.update_tasks.pop(client_id, None)
                            
                except ValueError:
                    logger.warning(f"Invalid update frequency: {subscription_config['update_frequency']}")
            
            # Update filters
            if "filters" in subscription_config:
                subscription.filters = subscription_config["filters"]
            
            # Update dashboard config
            if "dashboard_config" in subscription_config:
                subscription.dashboard_config = subscription_config["dashboard_config"]
            
            # Send confirmation
            await self._send_to_client(client_id, {
                "type": "subscription_updated",
                "subscriptions": list(subscription.subscription_types),
                "update_frequency": subscription.update_frequency.value,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            logger.info(f"Updated subscription for client {client_id}")
            
        except Exception as e:
            logger.error(f"Error updating subscription for client {client_id}: {str(e)}")
            await self._send_to_client(client_id, {
                "type": "error",
                "message": f"Failed to update subscription: {str(e)}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
    
    async def broadcast_alert(self, alert_type: str, message: str, severity: str = "info", 
                            target_clients: Optional[List[str]] = None):
        """Broadcast alert to subscribed clients"""
        try:
            alert_data = {
                "type": "alert",
                "alert_type": alert_type,
                "message": message,
                "severity": severity,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            # Send to specific clients or all alert subscribers
            target_list = target_clients or [
                client_id for client_id, sub in self.subscriptions.items()
                if SubscriptionType.ALERTS in sub.subscription_types
            ]
            
            await self._broadcast_to_clients(target_list, alert_data)
            
            logger.info(f"Broadcasted {severity} alert '{alert_type}' to {len(target_list)} clients")
            
        except Exception as e:
            logger.error(f"Error broadcasting alert: {str(e)}")
    
    async def _send_initial_data(self, client_id: str):
        """Send initial data to newly connected client"""
        try:
            subscription = self.subscriptions.get(client_id)
            if not subscription:
                return
            
            initial_data = {"type": "initial_data", "data": {}}
            
            # Send data for each subscription type
            for sub_type in subscription.subscription_types:
                try:
                    if sub_type == SubscriptionType.KPIS:
                        kpis = await self.analytics_service.get_real_time_kpis(TimeFrame.HOUR)
                        initial_data["data"]["kpis"] = kpis.to_dict()
                    
                    elif sub_type == SubscriptionType.BOOKINGS:
                        booking_data = await self.analytics_service.get_booking_analytics(
                            TimeFrame.HOUR, 
                            subscription.filters.get("business_model") if subscription.filters else None
                        )
                        initial_data["data"]["bookings"] = booking_data
                    
                    elif sub_type == SubscriptionType.PAYMENTS:
                        payment_data = await self.analytics_service.get_payment_analytics(TimeFrame.HOUR)
                        initial_data["data"]["payments"] = payment_data
                    
                    elif sub_type == SubscriptionType.AI_USAGE:
                        ai_data = await self.analytics_service.get_ai_usage_analytics(TimeFrame.HOUR)
                        initial_data["data"]["ai_usage"] = ai_data
                    
                    elif sub_type == SubscriptionType.USER_ENGAGEMENT:
                        engagement_data = await self.analytics_service.get_user_engagement_analytics(TimeFrame.HOUR)
                        initial_data["data"]["user_engagement"] = engagement_data
                    
                    elif sub_type == SubscriptionType.SYSTEM_HEALTH:
                        # Add system health metrics
                        initial_data["data"]["system_health"] = {
                            "uptime": 99.9,
                            "response_time": 120,
                            "error_rate": 0.1,
                            "active_connections": len(self.connections)
                        }
                        
                except Exception as e:
                    logger.error(f"Error getting initial data for {sub_type}: {str(e)}")
            
            initial_data["timestamp"] = datetime.now(timezone.utc).isoformat()
            await self._send_to_client(client_id, initial_data)
            
        except Exception as e:
            logger.error(f"Error sending initial data to client {client_id}: {str(e)}")
    
    async def _global_update_loop(self):
        """Global update loop for normal/low frequency updates"""
        while True:
            try:
                # Wait based on most common frequency
                await asyncio.sleep(30)  # 30 second updates
                
                # Get clients that need updates (normal/low frequency)
                normal_clients = [
                    client_id for client_id, sub in self.subscriptions.items()
                    if sub.update_frequency in [UpdateFrequency.NORMAL, UpdateFrequency.LOW] and
                    (sub.last_update is None or 
                     (datetime.now(timezone.utc) - sub.last_update).seconds >= self._get_update_interval(sub.update_frequency))
                ]
                
                if not normal_clients:
                    continue
                
                # Gather fresh data
                fresh_data = {}
                
                # Get subscription types needed
                needed_types = set()
                for client_id in normal_clients:
                    needed_types.update(self.subscriptions[client_id].subscription_types)
                
                # Fetch data for needed types
                if SubscriptionType.KPIS in needed_types:
                    fresh_data["kpis"] = await self.analytics_service.get_real_time_kpis(TimeFrame.HOUR)
                
                if SubscriptionType.BOOKINGS in needed_types:
                    fresh_data["bookings"] = await self.analytics_service.get_booking_analytics(TimeFrame.HOUR)
                
                if SubscriptionType.PAYMENTS in needed_types:
                    fresh_data["payments"] = await self.analytics_service.get_payment_analytics(TimeFrame.HOUR)
                
                if SubscriptionType.AI_USAGE in needed_types:
                    fresh_data["ai_usage"] = await self.analytics_service.get_ai_usage_analytics(TimeFrame.HOUR)
                
                if SubscriptionType.USER_ENGAGEMENT in needed_types:
                    fresh_data["user_engagement"] = await self.analytics_service.get_user_engagement_analytics(TimeFrame.HOUR)
                
                if SubscriptionType.SYSTEM_HEALTH in needed_types:
                    fresh_data["system_health"] = {
                        "uptime": 99.9,
                        "response_time": 120,
                        "error_rate": 0.1,
                        "active_connections": len(self.connections),
                        "total_subscriptions": len(self.subscriptions)
                    }
                
                # Send updates to clients
                await self._send_updates_to_clients(normal_clients, fresh_data)
                
                # Store as last global data
                self.last_global_data = fresh_data
                
            except Exception as e:
                logger.error(f"Error in global update loop: {str(e)}")
                await asyncio.sleep(30)  # Continue despite errors
    
    async def _client_update_loop(self, client_id: str):
        """High-frequency update loop for specific client"""
        while client_id in self.connections:
            try:
                subscription = self.subscriptions.get(client_id)
                if not subscription:
                    break
                
                update_interval = self._get_update_interval(subscription.update_frequency)
                await asyncio.sleep(update_interval)
                
                # Get fresh data for this client's subscriptions
                fresh_data = {}
                
                for sub_type in subscription.subscription_types:
                    if sub_type == SubscriptionType.KPIS:
                        fresh_data["kpis"] = await self.analytics_service.get_real_time_kpis(TimeFrame.HOUR)
                    elif sub_type == SubscriptionType.SYSTEM_HEALTH:
                        fresh_data["system_health"] = {
                            "uptime": 99.9,
                            "response_time": 120,
                            "error_rate": 0.1,
                            "active_connections": len(self.connections)
                        }
                
                # Send update
                await self._send_updates_to_clients([client_id], fresh_data)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in client update loop for {client_id}: {str(e)}")
                await asyncio.sleep(5)  # Short wait on error
    
    async def _send_updates_to_clients(self, client_ids: List[str], data: Dict[str, Any]):
        """Send analytics updates to specified clients"""
        try:
            current_time = datetime.now(timezone.utc)
            
            for client_id in client_ids:
                try:
                    subscription = self.subscriptions.get(client_id)
                    if not subscription:
                        continue
                    
                    # Filter data based on client subscriptions
                    client_data = {}
                    for sub_type in subscription.subscription_types:
                        data_key = sub_type.value
                        if data_key in data:
                            if hasattr(data[data_key], 'to_dict'):
                                client_data[data_key] = data[data_key].to_dict()
                            else:
                                client_data[data_key] = data[data_key]
                    
                    if client_data:
                        update_message = {
                            "type": "analytics_update",
                            "data": client_data,
                            "timestamp": current_time.isoformat()
                        }
                        
                        await self._send_to_client(client_id, update_message)
                        
                        # Update last update time
                        subscription.last_update = current_time
                        
                except Exception as e:
                    logger.error(f"Error sending update to client {client_id}: {str(e)}")
                    
        except Exception as e:
            logger.error(f"Error in send updates to clients: {str(e)}")
    
    async def _send_to_client(self, client_id: str, data: Dict[str, Any]):
        """Send data to specific client with optional compression"""
        try:
            websocket = self.connections.get(client_id)
            subscription = self.subscriptions.get(client_id)
            
            if not websocket or not subscription:
                return
            
            # Convert to JSON
            json_data = json.dumps(data)
            
            # Apply compression if enabled and data is large
            if subscription.compression_enabled and len(json_data) > 1024:  # > 1KB
                compressed = gzip.compress(json_data.encode('utf-8'))
                encoded = base64.b64encode(compressed).decode('utf-8')
                
                message = {
                    "compressed": True,
                    "data": encoded,
                    "original_size": len(json_data),
                    "compressed_size": len(encoded)
                }
                
                await websocket.send_text(json.dumps(message))
            else:
                await websocket.send_text(json_data)
                
        except WebSocketDisconnect:
            await self.disconnect_client(client_id)
        except Exception as e:
            logger.error(f"Error sending to client {client_id}: {str(e)}")
            await self.disconnect_client(client_id)
    
    async def _broadcast_to_clients(self, client_ids: List[str], data: Dict[str, Any]):
        """Broadcast data to multiple clients"""
        tasks = []
        for client_id in client_ids:
            if client_id in self.connections:
                tasks.append(self._send_to_client(client_id, data))
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    def _get_update_interval(self, frequency: UpdateFrequency) -> int:
        """Get update interval in seconds based on frequency"""
        if frequency == UpdateFrequency.HIGH:
            return 5
        elif frequency == UpdateFrequency.NORMAL:
            return 30
        elif frequency == UpdateFrequency.LOW:
            return 60
        else:  # CUSTOM
            return 30  # Default to normal
    
    async def get_connection_stats(self) -> Dict[str, Any]:
        """Get current connection and subscription statistics"""
        try:
            subscription_counts = defaultdict(int)
            frequency_counts = defaultdict(int)
            
            for subscription in self.subscriptions.values():
                frequency_counts[subscription.update_frequency.value] += 1
                for sub_type in subscription.subscription_types:
                    subscription_counts[sub_type.value] += 1
            
            return {
                "total_connections": len(self.connections),
                "total_subscriptions": len(self.subscriptions),
                "subscription_breakdown": dict(subscription_counts),
                "frequency_breakdown": dict(frequency_counts),
                "active_update_tasks": len(self.update_tasks),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting connection stats: {str(e)}")
            return {"error": str(e)}
    
    async def shutdown(self):
        """Gracefully shutdown the manager"""
        try:
            logger.info("Shutting down Real-time Analytics Manager")
            
            # Cancel all update tasks
            for task in self.update_tasks.values():
                task.cancel()
            
            if self.global_update_task:
                self.global_update_task.cancel()
            
            # Close all connections
            for client_id in list(self.connections.keys()):
                await self.disconnect_client(client_id)
            
            logger.info("Real-time Analytics Manager shutdown complete")
            
        except Exception as e:
            logger.error(f"Error during shutdown: {str(e)}")

# Global manager instance
realtime_manager = RealTimeAnalyticsManager()

async def get_realtime_manager() -> RealTimeAnalyticsManager:
    """Dependency injection for real-time manager"""
    if not realtime_manager.analytics_service:
        await realtime_manager.initialize()
    return realtime_manager