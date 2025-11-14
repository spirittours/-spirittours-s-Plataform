"""
Email Notification API Routes
Handles all email notification endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
import logging

from .email_service import email_service
from auth.jwt import get_current_user
from auth.models import User

# Configure logging
logger = logging.getLogger(__name__)

# Create router with prefix and tags
router = APIRouter(
    prefix="/api/v1/notifications",
    tags=["📧 Email Notifications"]
)


# Pydantic models for request/response
class WelcomeEmailRequest(BaseModel):
    """Request model for sending welcome email"""
    to_email: EmailStr
    full_name: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "to_email": "john@example.com",
                "full_name": "John Doe"
            }
        }


class BookingConfirmationRequest(BaseModel):
    """Request model for booking confirmation email"""
    to_email: EmailStr
    booking_id: str
    tour_name: str
    travel_date: str
    participants: int = Field(..., gt=0)
    total_amount: float = Field(..., gt=0)
    customer_name: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "to_email": "john@example.com",
                "booking_id": "BK-2024-001",
                "tour_name": "Machu Picchu Adventure",
                "travel_date": "2024-06-15",
                "participants": 2,
                "total_amount": 599.99,
                "customer_name": "John Doe"
            }
        }


class PaymentReceiptRequest(BaseModel):
    """Request model for payment receipt email"""
    to_email: EmailStr
    payment_id: str
    amount: float = Field(..., gt=0)
    currency: str = Field(default="usd")
    booking_id: str
    payment_date: str
    customer_name: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "to_email": "john@example.com",
                "payment_id": "pi_1234567890abcdef",
                "amount": 599.99,
                "currency": "usd",
                "booking_id": "BK-2024-001",
                "payment_date": "2024-03-15 14:30:00",
                "customer_name": "John Doe"
            }
        }


class TourReminderRequest(BaseModel):
    """Request model for tour reminder email"""
    to_email: EmailStr
    tour_name: str
    travel_date: str
    meeting_point: str
    meeting_time: str
    customer_name: str
    booking_id: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "to_email": "john@example.com",
                "tour_name": "Machu Picchu Adventure",
                "travel_date": "2024-06-15",
                "meeting_point": "Cusco Central Plaza",
                "meeting_time": "07:00 AM",
                "customer_name": "John Doe",
                "booking_id": "BK-2024-001"
            }
        }


class CustomEmailRequest(BaseModel):
    """Request model for custom email"""
    to_email: EmailStr
    subject: str
    html_content: str
    plain_text: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "to_email": "john@example.com",
                "subject": "Special Offer for You!",
                "html_content": "<h1>Hello!</h1><p>We have a special offer...</p>"
            }
        }


class BulkEmailRequest(BaseModel):
    """Request model for bulk emails"""
    recipients: List[EmailStr]
    subject: str
    html_content: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "recipients": ["user1@example.com", "user2@example.com"],
                "subject": "Newsletter - March 2024",
                "html_content": "<h1>Newsletter</h1><p>Latest updates...</p>"
            }
        }


class EmailResponse(BaseModel):
    """Response model for email operations"""
    success: bool
    message: str


class BulkEmailResponse(BaseModel):
    """Response model for bulk email operations"""
    total: int
    success: int
    failed: int
    message: str


# ==================== EMAIL ENDPOINTS ====================

@router.post("/welcome", response_model=EmailResponse)
async def send_welcome_email(
    request: WelcomeEmailRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Send welcome email to new user
    
    - **Protected endpoint** - Requires authentication
    - Beautiful HTML template with branding
    - Includes getting started guide
    """
    try:
        success = await email_service.send_welcome_email(
            to_email=request.to_email,
            full_name=request.full_name
        )
        
        if success:
            return EmailResponse(
                success=True,
                message=f"Welcome email sent to {request.to_email}"
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to send welcome email")
            
    except Exception as e:
        logger.error(f"❌ Error sending welcome email: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send welcome email")


@router.post("/booking-confirmation", response_model=EmailResponse)
async def send_booking_confirmation(
    request: BookingConfirmationRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Send booking confirmation email
    
    - **Protected endpoint** - Requires authentication
    - Includes all booking details
    - Professional receipt format
    """
    try:
        success = await email_service.send_booking_confirmation(
            to_email=request.to_email,
            booking_id=request.booking_id,
            tour_name=request.tour_name,
            travel_date=request.travel_date,
            participants=request.participants,
            total_amount=request.total_amount,
            customer_name=request.customer_name
        )
        
        if success:
            return EmailResponse(
                success=True,
                message=f"Booking confirmation sent to {request.to_email}"
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to send booking confirmation")
            
    except Exception as e:
        logger.error(f"❌ Error sending booking confirmation: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send booking confirmation")


@router.post("/payment-receipt", response_model=EmailResponse)
async def send_payment_receipt(
    request: PaymentReceiptRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Send payment receipt email
    
    - **Protected endpoint** - Requires authentication
    - Professional invoice format
    - Includes payment details and booking reference
    """
    try:
        success = await email_service.send_payment_receipt(
            to_email=request.to_email,
            payment_id=request.payment_id,
            amount=request.amount,
            currency=request.currency,
            booking_id=request.booking_id,
            payment_date=request.payment_date,
            customer_name=request.customer_name
        )
        
        if success:
            return EmailResponse(
                success=True,
                message=f"Payment receipt sent to {request.to_email}"
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to send payment receipt")
            
    except Exception as e:
        logger.error(f"❌ Error sending payment receipt: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send payment receipt")


@router.post("/tour-reminder", response_model=EmailResponse)
async def send_tour_reminder(
    request: TourReminderRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Send tour reminder email (typically 3 days before)
    
    - **Protected endpoint** - Requires authentication
    - Includes meeting point and time
    - Pre-tour checklist
    """
    try:
        success = await email_service.send_tour_reminder(
            to_email=request.to_email,
            tour_name=request.tour_name,
            travel_date=request.travel_date,
            meeting_point=request.meeting_point,
            meeting_time=request.meeting_time,
            customer_name=request.customer_name,
            booking_id=request.booking_id
        )
        
        if success:
            return EmailResponse(
                success=True,
                message=f"Tour reminder sent to {request.to_email}"
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to send tour reminder")
            
    except Exception as e:
        logger.error(f"❌ Error sending tour reminder: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send tour reminder")


@router.post("/custom", response_model=EmailResponse)
async def send_custom_email(
    request: CustomEmailRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Send custom email with HTML content
    
    - **Protected endpoint** - Requires authentication
    - Allows custom HTML content
    - Optional plain text fallback
    """
    try:
        # TODO: Add admin role check in production
        # if current_user.role != "admin":
        #     raise HTTPException(status_code=403, detail="Admin access required")
        
        success = await email_service.send_email(
            to_email=request.to_email,
            subject=request.subject,
            html_content=request.html_content,
            plain_text=request.plain_text
        )
        
        if success:
            return EmailResponse(
                success=True,
                message=f"Custom email sent to {request.to_email}"
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to send custom email")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error sending custom email: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send custom email")


@router.post("/bulk", response_model=BulkEmailResponse)
async def send_bulk_emails(
    request: BulkEmailRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Send bulk emails to multiple recipients
    
    - **Protected endpoint** - Requires authentication
    - **Admin only** in production
    - Useful for newsletters and announcements
    """
    try:
        # TODO: Add admin role check in production
        # if current_user.role != "admin":
        #     raise HTTPException(status_code=403, detail="Admin access required")
        
        if len(request.recipients) > 100:
            raise HTTPException(
                status_code=400,
                detail="Maximum 100 recipients per bulk send"
            )
        
        result = await email_service.send_bulk_emails(
            recipients=request.recipients,
            subject=request.subject,
            html_content=request.html_content
        )
        
        return BulkEmailResponse(
            total=result["total"],
            success=result["success"],
            failed=result["failed"],
            message=f"Bulk email completed: {result['success']} sent, {result['failed']} failed"
        )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error sending bulk emails: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send bulk emails")


# ==================== HEALTH CHECK ====================

@router.get("/health")
async def email_health_check():
    """
    Email service health check
    
    - **Public endpoint** - No authentication required
    - Returns service status
    """
    return {
        "service": "email_notifications",
        "status": "healthy",
        "provider": "SendGrid",
        "version": "1.0.0"
    }
