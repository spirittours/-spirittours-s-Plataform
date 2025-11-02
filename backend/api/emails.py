"""
Email Management API

API endpoints for managing emails, templates, and campaigns.
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import base64

from backend.database import get_db
from backend.email.notification_service import notification_service
from backend.email.tracking_service import tracking_service
from backend.email.template_engine import template_engine
from backend.models.email_models import (
    Email, EmailTemplate, EmailStatus, EmailTemplateType,
    EmailPriority
)


router = APIRouter(prefix='/api/emails', tags=['emails'])


# Request/Response Models
class SendEmailRequest(BaseModel):
    """Request to send an email"""
    to_email: EmailStr
    to_name: Optional[str] = None
    subject: str
    html_body: Optional[str] = None
    text_body: Optional[str] = None
    priority: EmailPriority = EmailPriority.NORMAL
    
    class Config:
        json_schema_extra = {
            "example": {
                "to_email": "user@example.com",
                "to_name": "John Doe",
                "subject": "Welcome to Spirit Tours",
                "html_body": "<h1>Welcome!</h1>",
                "priority": "normal"
            }
        }


class EmailStatusResponse(BaseModel):
    """Email status response"""
    email_id: str
    status: str
    to_email: str
    subject: str
    sent_at: Optional[str]
    opened_at: Optional[str]
    clicked_at: Optional[str]


# API Endpoints
@router.post('/send')
async def send_email(
    request: SendEmailRequest,
    db: Session = Depends(get_db)
):
    """Send an email"""
    from backend.email.email_service import email_service
    
    result = await email_service.send_email(
        to_email=request.to_email,
        to_name=request.to_name,
        subject=request.subject,
        html_body=request.html_body,
        text_body=request.text_body,
        priority=request.priority
    )
    
    if not result['success']:
        raise HTTPException(status_code=500, detail=result.get('error'))
    
    return result


@router.get('/{email_id}/status')
async def get_email_status(
    email_id: str,
    db: Session = Depends(get_db)
):
    """Get email delivery status"""
    email = db.query(Email).filter(Email.email_id == email_id).first()
    
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    
    return EmailStatusResponse(
        email_id=email.email_id,
        status=email.status.value,
        to_email=email.to_email,
        subject=email.subject,
        sent_at=email.sent_at.isoformat() if email.sent_at else None,
        opened_at=email.opened_at.isoformat() if email.opened_at else None,
        clicked_at=email.clicked_at.isoformat() if email.clicked_at else None
    )


@router.get('/{email_id}/analytics')
async def get_email_analytics(
    email_id: str,
    db: Session = Depends(get_db)
):
    """Get email analytics"""
    result = await tracking_service.get_email_analytics(db, email_id)
    
    if not result['success']:
        raise HTTPException(status_code=404, detail=result.get('error'))
    
    return result['analytics']


@router.get('/track/open/{email_id}')
async def track_email_open(
    email_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Track email open (tracking pixel endpoint)"""
    user_agent = request.headers.get('user-agent')
    ip_address = request.client.host
    
    await tracking_service.track_open(db, email_id, user_agent, ip_address)
    
    # Return 1x1 transparent pixel
    pixel = base64.b64decode(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    )
    return Response(content=pixel, media_type='image/gif')


@router.get('/track/click/{email_id}')
async def track_email_click(
    email_id: str,
    url: str,
    label: Optional[str] = None,
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Track email click and redirect"""
    # Decode URL
    try:
        original_url = base64.urlsafe_b64decode(url.encode()).decode()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid URL")
    
    # Decode label if provided
    decoded_label = None
    if label:
        try:
            decoded_label = base64.urlsafe_b64decode(label.encode()).decode()
        except Exception:
            pass
    
    # Track click
    user_agent = request.headers.get('user-agent')
    ip_address = request.client.host
    
    await tracking_service.track_click(
        db, email_id, original_url, decoded_label, user_agent, ip_address
    )
    
    # Redirect to original URL
    return RedirectResponse(url=original_url)


@router.post('/queue/process')
async def process_email_queue(
    batch_size: int = Query(default=100, le=1000),
    db: Session = Depends(get_db)
):
    """Process queued emails"""
    result = await notification_service.process_email_queue(db, batch_size)
    return result


@router.get('/templates')
async def list_email_templates(
    template_type: Optional[EmailTemplateType] = None,
    language: str = Query(default='en'),
    is_active: bool = Query(default=True),
    db: Session = Depends(get_db)
):
    """List email templates"""
    query = db.query(EmailTemplate)
    
    if template_type:
        query = query.filter(EmailTemplate.type == template_type)
    
    query = query.filter(
        EmailTemplate.language == language,
        EmailTemplate.is_active == is_active
    )
    
    templates = query.all()
    
    return {
        'templates': [
            {
                'id': t.id,
                'template_id': t.template_id,
                'name': t.name,
                'type': t.type.value,
                'language': t.language,
                'subject': t.subject
            }
            for t in templates
        ],
        'total': len(templates)
    }


@router.get('/health')
async def email_health_check():
    """Email service health check"""
    return {
        'status': 'healthy',
        'service': 'email',
        'features': {
            'smtp': True,
            'sendgrid': True,
            'tracking': True,
            'templates': True,
            'queue': True
        }
    }
