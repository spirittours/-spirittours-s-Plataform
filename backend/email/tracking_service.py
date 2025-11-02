"""
Email Tracking Service

Service for tracking email opens, clicks, and other events.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
import uuid
import hashlib
import base64

from backend.models.email_models import (
    Email, EmailEvent, EmailStatus
)


logger = logging.getLogger(__name__)


class EmailTrackingService:
    """
    Email tracking service for monitoring email interactions.
    
    Features:
    - Open tracking with pixel
    - Click tracking with URL rewriting
    - Event logging
    - Analytics and reporting
    """
    
    def __init__(self, tracking_domain: Optional[str] = None):
        """
        Initialize tracking service.
        
        Args:
            tracking_domain: Domain for tracking URLs (e.g., 'track.spirittours.com')
        """
        self.tracking_domain = tracking_domain or 'localhost:8000'
    
    def generate_tracking_pixel(self, email_id: str) -> str:
        """
        Generate tracking pixel HTML for email open tracking.
        
        Args:
            email_id: Email ID to track
            
        Returns:
            HTML img tag with tracking pixel
        """
        tracking_url = f"https://{self.tracking_domain}/api/email/track/open/{email_id}"
        return f'<img src="{tracking_url}" width="1" height="1" alt="" style="display:none;" />'
    
    def add_tracking_pixel(self, html_content: str, email_id: str) -> str:
        """
        Add tracking pixel to HTML email content.
        
        Args:
            html_content: HTML email content
            email_id: Email ID to track
            
        Returns:
            HTML content with tracking pixel added
        """
        pixel = self.generate_tracking_pixel(email_id)
        
        # Add pixel before closing body tag
        if '</body>' in html_content:
            return html_content.replace('</body>', f'{pixel}</body>')
        else:
            # If no body tag, append at end
            return html_content + pixel
    
    def generate_tracking_url(
        self,
        email_id: str,
        original_url: str,
        link_label: Optional[str] = None
    ) -> str:
        """
        Generate tracking URL for link click tracking.
        
        Args:
            email_id: Email ID to track
            original_url: Original link URL
            link_label: Optional label for the link
            
        Returns:
            Tracking URL
        """
        # Encode original URL
        encoded_url = base64.urlsafe_b64encode(original_url.encode()).decode()
        
        # Generate tracking URL
        tracking_url = (
            f"https://{self.tracking_domain}/api/email/track/click/{email_id}"
            f"?url={encoded_url}"
        )
        
        if link_label:
            encoded_label = base64.urlsafe_b64encode(link_label.encode()).decode()
            tracking_url += f"&label={encoded_label}"
        
        return tracking_url
    
    def add_click_tracking(self, html_content: str, email_id: str) -> str:
        """
        Add click tracking to all links in HTML content.
        
        Args:
            html_content: HTML email content
            email_id: Email ID to track
            
        Returns:
            HTML content with tracking URLs
        """
        import re
        
        # Find all <a href="..."> tags
        pattern = r'<a\s+(?:[^>]*?\s+)?href="([^"]*)"'
        
        def replace_url(match):
            original_url = match.group(1)
            
            # Skip if already a tracking URL or mailto/tel links
            if original_url.startswith(('mailto:', 'tel:', '#')) or 'track/click' in original_url:
                return match.group(0)
            
            # Generate tracking URL
            tracking_url = self.generate_tracking_url(email_id, original_url)
            
            # Replace the href
            return match.group(0).replace(original_url, tracking_url)
        
        # Replace all hrefs with tracking URLs
        return re.sub(pattern, replace_url, html_content)
    
    async def track_open(
        self,
        db: Session,
        email_id: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Track email open event.
        
        Args:
            db: Database session
            email_id: Email ID
            user_agent: User agent string
            ip_address: IP address
            
        Returns:
            Tracking result dictionary
        """
        try:
            # Find email
            email = db.query(Email).filter(
                Email.email_id == email_id
            ).first()
            
            if not email:
                logger.warning(f"Email not found for tracking: {email_id}")
                return {'success': False, 'error': 'Email not found'}
            
            # Update email status if first open
            if email.status == EmailStatus.SENT:
                email.status = EmailStatus.OPENED
                email.opened_at = datetime.utcnow()
            
            # Increment open count
            email.open_count += 1
            
            # Create event
            event = EmailEvent(
                event_id=str(uuid.uuid4()),
                email_id=email.id,
                event_type='opened',
                user_agent=user_agent,
                ip_address=ip_address,
                occurred_at=datetime.utcnow()
            )
            db.add(event)
            db.commit()
            
            logger.info(f"Email opened: {email_id}")
            
            return {
                'success': True,
                'email_id': email_id,
                'open_count': email.open_count
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to track email open: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def track_click(
        self,
        db: Session,
        email_id: str,
        link_url: str,
        link_label: Optional[str] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Track email link click event.
        
        Args:
            db: Database session
            email_id: Email ID
            link_url: Clicked link URL
            link_label: Link label
            user_agent: User agent string
            ip_address: IP address
            
        Returns:
            Tracking result dictionary
        """
        try:
            # Find email
            email = db.query(Email).filter(
                Email.email_id == email_id
            ).first()
            
            if not email:
                logger.warning(f"Email not found for tracking: {email_id}")
                return {'success': False, 'error': 'Email not found'}
            
            # Update email status if first click
            if email.status in [EmailStatus.SENT, EmailStatus.OPENED]:
                email.status = EmailStatus.CLICKED
                email.clicked_at = datetime.utcnow()
            
            # Increment click count
            email.click_count += 1
            
            # Create event
            event = EmailEvent(
                event_id=str(uuid.uuid4()),
                email_id=email.id,
                event_type='clicked',
                link_url=link_url,
                link_label=link_label,
                user_agent=user_agent,
                ip_address=ip_address,
                occurred_at=datetime.utcnow()
            )
            db.add(event)
            db.commit()
            
            logger.info(f"Email link clicked: {email_id} -> {link_url}")
            
            return {
                'success': True,
                'email_id': email_id,
                'click_count': email.click_count,
                'redirect_url': link_url
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to track email click: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def track_bounce(
        self,
        db: Session,
        email_id: str,
        bounce_type: str,
        bounce_reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Track email bounce event.
        
        Args:
            db: Database session
            email_id: Email ID
            bounce_type: Type of bounce (hard/soft)
            bounce_reason: Bounce reason
            
        Returns:
            Tracking result dictionary
        """
        try:
            # Find email
            email = db.query(Email).filter(
                Email.email_id == email_id
            ).first()
            
            if not email:
                return {'success': False, 'error': 'Email not found'}
            
            # Update email status
            email.status = EmailStatus.BOUNCED
            email.bounced_at = datetime.utcnow()
            email.error_message = bounce_reason
            
            # Create event
            event = EmailEvent(
                event_id=str(uuid.uuid4()),
                email_id=email.id,
                event_type='bounced',
                event_data={'bounce_type': bounce_type, 'reason': bounce_reason},
                occurred_at=datetime.utcnow()
            )
            db.add(event)
            db.commit()
            
            logger.info(f"Email bounced: {email_id} ({bounce_type})")
            
            return {'success': True, 'email_id': email_id}
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to track email bounce: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_email_analytics(
        self,
        db: Session,
        email_id: str
    ) -> Dict[str, Any]:
        """
        Get analytics for a specific email.
        
        Args:
            db: Database session
            email_id: Email ID
            
        Returns:
            Analytics dictionary
        """
        try:
            # Find email
            email = db.query(Email).filter(
                Email.email_id == email_id
            ).first()
            
            if not email:
                return {'success': False, 'error': 'Email not found'}
            
            # Get events
            events = db.query(EmailEvent).filter(
                EmailEvent.email_id == email.id
            ).order_by(EmailEvent.occurred_at.desc()).all()
            
            # Compile analytics
            analytics = {
                'email_id': email.email_id,
                'to_email': email.to_email,
                'subject': email.subject,
                'status': email.status.value,
                'sent_at': email.sent_at.isoformat() if email.sent_at else None,
                'opened': email.opened_at is not None,
                'opened_at': email.opened_at.isoformat() if email.opened_at else None,
                'open_count': email.open_count,
                'clicked': email.clicked_at is not None,
                'clicked_at': email.clicked_at.isoformat() if email.clicked_at else None,
                'click_count': email.click_count,
                'bounced': email.bounced_at is not None,
                'bounced_at': email.bounced_at.isoformat() if email.bounced_at else None,
                'events': [
                    {
                        'type': event.event_type,
                        'occurred_at': event.occurred_at.isoformat(),
                        'link_url': event.link_url,
                        'user_agent': event.user_agent
                    }
                    for event in events
                ]
            }
            
            return {'success': True, 'analytics': analytics}
            
        except Exception as e:
            logger.error(f"Failed to get email analytics: {str(e)}")
            return {'success': False, 'error': str(e)}


# Global tracking service instance
tracking_service = EmailTrackingService()
