"""
Notification Service

High-level service for sending typed notifications through WebSocket.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum
from .connection_manager import manager


logger = logging.getLogger(__name__)


class NotificationType(str, Enum):
    """Notification types"""
    # Booking notifications
    BOOKING_CREATED = "booking_created"
    BOOKING_CONFIRMED = "booking_confirmed"
    BOOKING_CANCELLED = "booking_cancelled"
    BOOKING_UPDATED = "booking_updated"
    
    # Payment notifications
    PAYMENT_RECEIVED = "payment_received"
    PAYMENT_FAILED = "payment_failed"
    REFUND_PROCESSED = "refund_processed"
    
    # Tour notifications
    TOUR_STARTING_SOON = "tour_starting_soon"
    TOUR_STARTED = "tour_started"
    TOUR_COMPLETED = "tour_completed"
    TOUR_CANCELLED = "tour_cancelled"
    
    # Agent notifications
    NEW_COMMISSION = "new_commission"
    COMMISSION_PAID = "commission_paid"
    TIER_UPGRADED = "tier_upgraded"
    
    # Chat notifications
    NEW_MESSAGE = "new_message"
    MESSAGE_READ = "message_read"
    
    # System notifications
    SYSTEM_ALERT = "system_alert"
    MAINTENANCE_SCHEDULED = "maintenance_scheduled"
    
    # AI Agent notifications
    AGENT_RESPONSE = "agent_response"
    WORKFLOW_COMPLETED = "workflow_completed"


class NotificationPriority(str, Enum):
    """Notification priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class NotificationService:
    """
    High-level notification service with typed notifications.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    async def send_notification(
        self,
        user_id: str,
        notification_type: NotificationType,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        action_url: Optional[str] = None
    ) -> bool:
        """
        Send a typed notification to a user.
        
        Args:
            user_id: Target user ID
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            data: Additional data
            priority: Priority level
            action_url: Optional URL for action button
            
        Returns:
            True if sent successfully
        """
        notification = {
            'type': 'notification',
            'notification_type': notification_type.value,
            'priority': priority.value,
            'title': title,
            'message': message,
            'data': data or {},
            'action_url': action_url,
            'timestamp': datetime.utcnow().isoformat(),
            'read': False,
        }
        
        success = await manager.send_personal_message(notification, user_id)
        
        if success:
            self.logger.info(
                f"Notification sent to user {user_id}: {notification_type.value}"
            )
        else:
            self.logger.warning(
                f"User {user_id} offline, notification queued: {notification_type.value}"
            )
        
        return success
    
    async def notify_booking_created(
        self,
        user_id: str,
        booking_id: str,
        tour_name: str,
        tour_date: str,
        total_amount: float
    ):
        """Notify user about booking creation."""
        await self.send_notification(
            user_id=user_id,
            notification_type=NotificationType.BOOKING_CREATED,
            title="Booking Created",
            message=f"Your booking for '{tour_name}' has been created!",
            data={
                'booking_id': booking_id,
                'tour_name': tour_name,
                'tour_date': tour_date,
                'total_amount': total_amount,
            },
            priority=NotificationPriority.HIGH,
            action_url=f"/bookings/{booking_id}"
        )
    
    async def notify_booking_confirmed(
        self,
        user_id: str,
        booking_id: str,
        tour_name: str,
        confirmation_code: str
    ):
        """Notify user about booking confirmation."""
        await self.send_notification(
            user_id=user_id,
            notification_type=NotificationType.BOOKING_CONFIRMED,
            title="Booking Confirmed!",
            message=f"Your booking for '{tour_name}' is confirmed. Confirmation code: {confirmation_code}",
            data={
                'booking_id': booking_id,
                'tour_name': tour_name,
                'confirmation_code': confirmation_code,
            },
            priority=NotificationPriority.HIGH,
            action_url=f"/bookings/{booking_id}"
        )
    
    async def notify_payment_received(
        self,
        user_id: str,
        booking_id: str,
        amount: float,
        payment_method: str
    ):
        """Notify user about payment received."""
        await self.send_notification(
            user_id=user_id,
            notification_type=NotificationType.PAYMENT_RECEIVED,
            title="Payment Received",
            message=f"Payment of ${amount:.2f} received via {payment_method}",
            data={
                'booking_id': booking_id,
                'amount': amount,
                'payment_method': payment_method,
            },
            priority=NotificationPriority.MEDIUM,
            action_url=f"/bookings/{booking_id}/payment"
        )
    
    async def notify_tour_starting_soon(
        self,
        user_id: str,
        booking_id: str,
        tour_name: str,
        start_time: str,
        meeting_point: str
    ):
        """Notify user that tour starts soon."""
        await self.send_notification(
            user_id=user_id,
            notification_type=NotificationType.TOUR_STARTING_SOON,
            title="Tour Starting Soon!",
            message=f"Your tour '{tour_name}' starts in 1 hour. Meeting point: {meeting_point}",
            data={
                'booking_id': booking_id,
                'tour_name': tour_name,
                'start_time': start_time,
                'meeting_point': meeting_point,
            },
            priority=NotificationPriority.URGENT,
            action_url=f"/bookings/{booking_id}"
        )
    
    async def notify_new_commission(
        self,
        agent_id: str,
        booking_id: str,
        commission_amount: float,
        tier: str
    ):
        """Notify agent about new commission."""
        await self.send_notification(
            user_id=agent_id,
            notification_type=NotificationType.NEW_COMMISSION,
            title="New Commission Earned!",
            message=f"You earned ${commission_amount:.2f} commission (Tier: {tier})",
            data={
                'booking_id': booking_id,
                'commission_amount': commission_amount,
                'tier': tier,
            },
            priority=NotificationPriority.MEDIUM,
            action_url="/agent/commissions"
        )
    
    async def notify_tier_upgraded(
        self,
        agent_id: str,
        old_tier: str,
        new_tier: str,
        new_commission_rate: float
    ):
        """Notify agent about tier upgrade."""
        await self.send_notification(
            user_id=agent_id,
            notification_type=NotificationType.TIER_UPGRADED,
            title="Tier Upgraded! 🎉",
            message=f"Congratulations! You've been upgraded from {old_tier} to {new_tier}. New commission rate: {new_commission_rate}%",
            data={
                'old_tier': old_tier,
                'new_tier': new_tier,
                'new_commission_rate': new_commission_rate,
            },
            priority=NotificationPriority.HIGH,
            action_url="/agent/profile"
        )
    
    async def notify_agent_response(
        self,
        user_id: str,
        agent_name: str,
        response: Dict[str, Any],
        execution_time: float
    ):
        """Notify user about AI agent response."""
        await self.send_notification(
            user_id=user_id,
            notification_type=NotificationType.AGENT_RESPONSE,
            title=f"Response from {agent_name}",
            message=f"{agent_name} completed your request in {execution_time:.2f}ms",
            data={
                'agent_name': agent_name,
                'response': response,
                'execution_time': execution_time,
            },
            priority=NotificationPriority.MEDIUM,
            action_url="/agents/dashboard"
        )
    
    async def notify_system_alert(
        self,
        user_ids: List[str],
        title: str,
        message: str,
        alert_type: str = "info"
    ):
        """Send system alert to multiple users."""
        for user_id in user_ids:
            await self.send_notification(
                user_id=user_id,
                notification_type=NotificationType.SYSTEM_ALERT,
                title=title,
                message=message,
                data={'alert_type': alert_type},
                priority=NotificationPriority.HIGH
            )
    
    async def broadcast_system_message(
        self,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.MEDIUM
    ):
        """Broadcast system message to all connected users."""
        notification = {
            'type': 'system_broadcast',
            'title': title,
            'message': message,
            'priority': priority.value,
            'timestamp': datetime.utcnow().isoformat(),
        }
        
        await manager.broadcast(notification)
        self.logger.info(f"System broadcast sent: {title}")


# Singleton instance
notification_service = NotificationService()
