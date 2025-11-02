"""
Notification API Endpoints for Enterprise Booking Platform
Provides comprehensive notification management capabilities
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging

from config.database import get_db
from services.notification_service import (
    NotificationService, NotificationConfig, NotificationRequest,
    BulkNotificationRequest, NotificationResponse, NotificationType,
    NotificationPriority, NotificationStatus, NotificationTemplate,
    NotificationLog, send_booking_confirmation_email, send_booking_reminder_sms
)
from auth.dependencies import get_current_user
from pydantic import BaseModel, Field

# Configure logging
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/api/notifications", tags=["notifications"])

# Pydantic response models
class TemplateResponse(BaseModel):
    id: int
    name: str
    type: NotificationType
    subject_template: Optional[str]
    body_template: str
    variables: List[str]
    language: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

class NotificationLogResponse(BaseModel):
    id: int
    recipient: str
    type: NotificationType
    template_name: Optional[str]
    subject: Optional[str]
    status: NotificationStatus
    priority: NotificationPriority
    provider: Optional[str]
    error_message: Optional[str]
    sent_at: Optional[datetime]
    delivered_at: Optional[datetime]
    created_at: datetime

class CreateTemplateRequest(BaseModel):
    name: str = Field(..., description="Unique template name")
    type: NotificationType
    subject_template: Optional[str] = Field(None, description="Subject template (for emails)")
    body_template: str = Field(..., description="Body template content")
    variables: List[str] = Field(default_factory=list, description="Expected template variables")
    language: str = Field(default="en", description="Template language")

class UpdateTemplateRequest(BaseModel):
    subject_template: Optional[str] = None
    body_template: Optional[str] = None
    variables: Optional[List[str]] = None
    is_active: Optional[bool] = None

class NotificationStatsResponse(BaseModel):
    total_notifications: int
    success_rate: float
    by_status: Dict[str, int]
    by_type: Dict[str, int]
    by_provider: Dict[str, int]
    period_days: int

class BulkNotificationResponse(BaseModel):
    total_recipients: int
    successful_sends: int
    failed_sends: int
    success_rate: float
    results: List[Dict[str, Any]]

class BookingNotificationRequest(BaseModel):
    booking_id: str
    customer_email: str
    customer_phone: Optional[str] = None
    customer_name: str
    destination: str
    check_in_date: str
    check_out_date: str
    total_amount: float
    currency: str = "USD"
    notification_types: List[NotificationType] = Field(default=[NotificationType.EMAIL])

# Dependency to get notification service
def get_notification_service(db: Session = Depends(get_db)) -> NotificationService:
    """Get notification service with configuration"""
    
    # Load configuration from environment variables or database
    config = NotificationConfig(
        # These should be loaded from environment variables in production
        smtp_host="smtp.gmail.com",
        smtp_port=587,
        smtp_username="your-email@gmail.com",  # Configure in environment
        smtp_password="your-password",  # Configure in environment
        sendgrid_api_key="",  # Configure if using SendGrid
        twilio_account_sid="",  # Configure if using Twilio
        twilio_auth_token="",  # Configure if using Twilio
        twilio_phone_number=""  # Configure if using Twilio
    )
    
    return NotificationService(config, db)

# Template Management Endpoints
@router.post("/templates", response_model=Dict[str, Any])
async def create_template(
    template_data: CreateTemplateRequest,
    current_user: dict = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Create a new notification template"""
    
    try:
        success = service.create_template(
            name=template_data.name,
            type=template_data.type,
            subject_template=template_data.subject_template,
            body_template=template_data.body_template,
            variables=template_data.variables,
            language=template_data.language
        )
        
        if success:
            logger.info(f"Template '{template_data.name}' created by user {current_user.get('user_id')}")
            return {
                "success": True,
                "message": f"Template '{template_data.name}' created successfully"
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to create template")
            
    except Exception as e:
        logger.error(f"Template creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates", response_model=List[TemplateResponse])
async def get_templates(
    type: Optional[NotificationType] = Query(None),
    language: str = Query("en"),
    active_only: bool = Query(True),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notification templates"""
    
    try:
        query = db.query(NotificationTemplate)
        
        if type:
            query = query.filter(NotificationTemplate.type == type)
        
        query = query.filter(NotificationTemplate.language == language)
        
        if active_only:
            query = query.filter(NotificationTemplate.is_active == True)
        
        templates = query.all()
        
        return [
            TemplateResponse(
                id=template.id,
                name=template.name,
                type=template.type,
                subject_template=template.subject_template,
                body_template=template.body_template,
                variables=template.variables or [],
                language=template.language,
                is_active=template.is_active,
                created_at=template.created_at,
                updated_at=template.updated_at
            )
            for template in templates
        ]
        
    except Exception as e:
        logger.error(f"Failed to get templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/templates/{template_id}")
async def update_template(
    template_id: int,
    update_data: UpdateTemplateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a notification template"""
    
    try:
        template = db.query(NotificationTemplate).filter(
            NotificationTemplate.id == template_id
        ).first()
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Update fields
        if update_data.subject_template is not None:
            template.subject_template = update_data.subject_template
        
        if update_data.body_template is not None:
            template.body_template = update_data.body_template
        
        if update_data.variables is not None:
            template.variables = update_data.variables
        
        if update_data.is_active is not None:
            template.is_active = update_data.is_active
        
        template.updated_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"Template {template_id} updated by user {current_user.get('user_id')}")
        
        return {
            "success": True,
            "message": f"Template '{template.name}' updated successfully"
        }
        
    except Exception as e:
        logger.error(f"Template update failed: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a notification template"""
    
    try:
        template = db.query(NotificationTemplate).filter(
            NotificationTemplate.id == template_id
        ).first()
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Soft delete by deactivating
        template.is_active = False
        template.updated_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"Template {template_id} deleted by user {current_user.get('user_id')}")
        
        return {
            "success": True,
            "message": f"Template '{template.name}' deleted successfully"
        }
        
    except Exception as e:
        logger.error(f"Template deletion failed: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Notification Sending Endpoints
@router.post("/send", response_model=NotificationResponse)
async def send_notification(
    notification_request: NotificationRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Send a single notification"""
    
    try:
        # Add user context to metadata
        notification_request.metadata["sent_by_user_id"] = current_user.get("user_id")
        
        # Send notification
        if notification_request.scheduled_at and notification_request.scheduled_at > datetime.utcnow():
            # Schedule for later processing
            background_tasks.add_task(
                _process_scheduled_notification,
                service,
                notification_request
            )
            
            return NotificationResponse(
                success=True,
                message=f"Notification scheduled for {notification_request.scheduled_at}"
            )
        else:
            # Send immediately
            response = await service.send_notification(notification_request)
            
            logger.info(
                f"Notification sent by user {current_user.get('user_id')}: "
                f"Type={notification_request.type}, Recipient={notification_request.recipient}, "
                f"Success={response.success}"
            )
            
            return response
            
    except Exception as e:
        logger.error(f"Notification send failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send-bulk", response_model=BulkNotificationResponse)
async def send_bulk_notifications(
    bulk_request: BulkNotificationRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Send notifications to multiple recipients"""
    
    try:
        # Process bulk notifications in background
        background_tasks.add_task(
            _process_bulk_notifications,
            service,
            bulk_request,
            current_user.get("user_id")
        )
        
        logger.info(
            f"Bulk notification job started by user {current_user.get('user_id')}: "
            f"Type={bulk_request.type}, Recipients={len(bulk_request.recipients)}"
        )
        
        return BulkNotificationResponse(
            total_recipients=len(bulk_request.recipients),
            successful_sends=0,
            failed_sends=0,
            success_rate=0.0,
            results=[{
                "success": True,
                "message": "Bulk notification job started. Check logs for progress."
            }]
        )
        
    except Exception as e:
        logger.error(f"Bulk notification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Booking-specific notification endpoints
@router.post("/booking/confirmation")
async def send_booking_confirmation(
    booking_data: BookingNotificationRequest,
    current_user: dict = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Send booking confirmation notifications"""
    
    try:
        results = []
        
        # Send email confirmation if requested
        if NotificationType.EMAIL in booking_data.notification_types:
            email_response = await send_booking_confirmation_email(
                service,
                booking_data.dict()
            )
            results.append({
                "type": "email",
                "success": email_response.success,
                "message": email_response.message,
                "notification_id": email_response.notification_id
            })
        
        # Send SMS confirmation if requested and phone available
        if (NotificationType.SMS in booking_data.notification_types and 
            booking_data.customer_phone):
            sms_response = await send_booking_reminder_sms(
                service,
                booking_data.dict()
            )
            results.append({
                "type": "sms",
                "success": sms_response.success,
                "message": sms_response.message,
                "notification_id": sms_response.notification_id
            })
        
        logger.info(
            f"Booking confirmation sent for booking {booking_data.booking_id} "
            f"by user {current_user.get('user_id')}"
        )
        
        return {
            "success": True,
            "message": "Booking confirmation notifications processed",
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Booking confirmation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Notification history and monitoring endpoints
@router.get("/logs", response_model=List[NotificationLogResponse])
async def get_notification_logs(
    recipient: Optional[str] = Query(None),
    type: Optional[NotificationType] = Query(None),
    status: Optional[NotificationStatus] = Query(None),
    days: int = Query(7, ge=1, le=90),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notification logs with filters"""
    
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        query = db.query(NotificationLog).filter(
            NotificationLog.created_at >= start_date
        )
        
        if recipient:
            query = query.filter(NotificationLog.recipient.ilike(f"%{recipient}%"))
        
        if type:
            query = query.filter(NotificationLog.type == type)
        
        if status:
            query = query.filter(NotificationLog.status == status)
        
        query = query.order_by(NotificationLog.created_at.desc())
        query = query.offset(offset).limit(limit)
        
        logs = query.all()
        
        return [
            NotificationLogResponse(
                id=log.id,
                recipient=log.recipient,
                type=log.type,
                template_name=log.template_name,
                subject=log.subject,
                status=log.status,
                priority=log.priority,
                provider=log.provider,
                error_message=log.error_message,
                sent_at=log.sent_at,
                delivered_at=log.delivered_at,
                created_at=log.created_at
            )
            for log in logs
        ]
        
    except Exception as e:
        logger.error(f"Failed to get notification logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statistics", response_model=NotificationStatsResponse)
async def get_notification_statistics(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Get notification statistics"""
    
    try:
        stats = service.get_notification_statistics(days)
        
        return NotificationStatsResponse(
            total_notifications=stats["total_notifications"],
            success_rate=stats["success_rate"],
            by_status=stats["by_status"],
            by_type=stats["by_type"],
            by_provider=stats["by_provider"],
            period_days=stats["period_days"]
        )
        
    except Exception as e:
        logger.error(f"Failed to get notification statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def notification_service_health(
    service: NotificationService = Depends(get_notification_service)
):
    """Check notification service health"""
    
    try:
        # Test database connection
        recent_logs = service.db.query(NotificationLog).limit(1).all()
        
        # Check provider configuration
        providers_status = {
            "email_smtp": bool(service.config.smtp_host and service.config.smtp_username),
            "email_sendgrid": bool(service.config.sendgrid_api_key),
            "sms_twilio": bool(service.config.twilio_account_sid and service.config.twilio_auth_token),
            "whatsapp": bool(service.config.whatsapp_phone_number_id and service.config.whatsapp_access_token)
        }
        
        return {
            "status": "healthy",
            "database_connection": True,
            "providers_configured": providers_status,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

# Background task functions
async def _process_scheduled_notification(
    service: NotificationService,
    notification_request: NotificationRequest
):
    """Process scheduled notification"""
    
    try:
        # Wait until scheduled time
        if notification_request.scheduled_at:
            wait_seconds = (notification_request.scheduled_at - datetime.utcnow()).total_seconds()
            if wait_seconds > 0:
                await asyncio.sleep(wait_seconds)
        
        # Send notification
        response = await service.send_notification(notification_request)
        
        logger.info(
            f"Scheduled notification processed: "
            f"Type={notification_request.type}, Success={response.success}"
        )
        
    except Exception as e:
        logger.error(f"Scheduled notification processing failed: {str(e)}")

async def _process_bulk_notifications(
    service: NotificationService,
    bulk_request: BulkNotificationRequest,
    user_id: str
):
    """Process bulk notifications in background"""
    
    try:
        result = await service.send_bulk_notifications(bulk_request)
        
        logger.info(
            f"Bulk notification completed by user {user_id}: "
            f"Total={result['total_recipients']}, "
            f"Success={result['successful_sends']}, "
            f"Failed={result['failed_sends']}, "
            f"Success Rate={result['success_rate']:.2f}%"
        )
        
    except Exception as e:
        logger.error(f"Bulk notification processing failed: {str(e)}")

# Create default templates
async def create_default_templates(service: NotificationService):
    """Create default notification templates"""
    
    templates = [
        {
            "name": "booking_confirmation",
            "type": NotificationType.EMAIL,
            "subject_template": "Booking Confirmation - {{booking_id}}",
            "body_template": """
            <html>
            <body>
                <h2>Booking Confirmation</h2>
                <p>Dear {{customer_name}},</p>
                
                <p>Your booking has been confirmed! Here are the details:</p>
                
                <ul>
                    <li><strong>Booking ID:</strong> {{booking_id}}</li>
                    <li><strong>Destination:</strong> {{destination}}</li>
                    <li><strong>Check-in:</strong> {{check_in_date}}</li>
                    <li><strong>Check-out:</strong> {{check_out_date}}</li>
                    <li><strong>Total Amount:</strong> {{total_amount}} {{currency}}</li>
                </ul>
                
                <p>Thank you for choosing our services!</p>
                
                <p>Best regards,<br>Travel Booking Team</p>
            </body>
            </html>
            """,
            "variables": ["customer_name", "booking_id", "destination", "check_in_date", "check_out_date", "total_amount", "currency"]
        },
        {
            "name": "booking_reminder",
            "type": NotificationType.SMS,
            "subject_template": None,
            "body_template": "Hi {{customer_name}}! Reminder: Your trip to {{destination}} starts on {{check_in_date}}. Have a great journey!",
            "variables": ["customer_name", "destination", "check_in_date"]
        }
    ]
    
    for template_data in templates:
        service.create_template(
            name=template_data["name"],
            type=template_data["type"],
            subject_template=template_data["subject_template"],
            body_template=template_data["body_template"],
            variables=template_data["variables"]
        )

# Export router
__all__ = ["router", "create_default_templates"]