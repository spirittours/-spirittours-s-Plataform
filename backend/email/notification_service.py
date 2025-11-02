"""
Email Notification Service

Service for triggering and managing email notifications based on events.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import uuid

from backend.models.email_models import (
    Email, EmailStatus, EmailPriority, EmailQueue,
    EmailTemplateType, EmailProvider
)
from backend.email.email_service import email_service
from backend.email.template_engine import template_engine
from backend.email.email_config import email_config


logger = logging.getLogger(__name__)


class NotificationService:
    """
    Notification service for managing email notifications.
    
    Features:
    - Event-based triggers
    - Queue management
    - Priority handling
    - Scheduled sending
    - Batch processing
    """
    
    def __init__(self):
        self.config = email_config
    
    async def send_booking_confirmation(
        self,
        db: Session,
        user_email: str,
        user_name: str,
        booking_data: Dict[str, Any],
        language: str = 'en'
    ) -> Dict[str, Any]:
        """
        Send booking confirmation email.
        
        Args:
            db: Database session
            user_email: Recipient email
            user_name: Recipient name
            booking_data: Booking information
            language: Language code
            
        Returns:
            Send result dictionary
        """
        try:
            # Render template
            rendered = template_engine.render_by_type(
                db=db,
                template_type=EmailTemplateType.BOOKING_CONFIRMATION,
                variables={
                    'user_name': user_name,
                    'booking_reference': booking_data.get('reference'),
                    'tour_name': booking_data.get('tour_name'),
                    'booking_date': booking_data.get('date'),
                    'booking_time': booking_data.get('time'),
                    'tour_duration': booking_data.get('duration'),
                    'guest_count': booking_data.get('guest_count'),
                    'meeting_point': booking_data.get('meeting_point'),
                    'subtotal': booking_data.get('subtotal'),
                    'discount': booking_data.get('discount', 0),
                    'tax': booking_data.get('tax', 0),
                    'total_amount': booking_data.get('total'),
                    'currency': booking_data.get('currency', 'USD'),
                    'booking_details_url': booking_data.get('details_url'),
                    'unsubscribe_url': booking_data.get('unsubscribe_url'),
                    'current_year': datetime.utcnow().year
                },
                language=language
            )
            
            # Send email
            result = await email_service.send_email(
                to_email=user_email,
                to_name=user_name,
                subject=rendered['subject'],
                html_body=rendered['html_body'],
                text_body=rendered['text_body'],
                priority=EmailPriority.HIGH,
                metadata={
                    'type': 'booking_confirmation',
                    'booking_id': booking_data.get('id')
                }
            )
            
            # Save to database
            if result['success']:
                email = Email(
                    email_id=str(uuid.uuid4()),
                    message_id=result.get('message_id'),
                    to_email=user_email,
                    to_name=user_name,
                    from_email=self.config.DEFAULT_FROM_EMAIL,
                    from_name=self.config.DEFAULT_FROM_NAME,
                    subject=rendered['subject'],
                    html_body=rendered['html_body'],
                    text_body=rendered['text_body'],
                    status=EmailStatus.SENT,
                    priority=EmailPriority.HIGH,
                    provider=EmailProvider.SMTP,
                    sent_at=datetime.utcnow(),
                    metadata={'type': 'booking_confirmation'}
                )
                db.add(email)
                db.commit()
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to send booking confirmation: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def send_payment_receipt(
        self,
        db: Session,
        user_email: str,
        user_name: str,
        payment_data: Dict[str, Any],
        language: str = 'en'
    ) -> Dict[str, Any]:
        """Send payment receipt email"""
        try:
            rendered = template_engine.render_by_type(
                db=db,
                template_type=EmailTemplateType.PAYMENT_RECEIPT,
                variables={
                    'user_name': user_name,
                    'booking_reference': payment_data.get('booking_reference'),
                    'transaction_id': payment_data.get('transaction_id'),
                    'payment_date': payment_data.get('date'),
                    'payment_method': payment_data.get('method'),
                    'amount': payment_data.get('amount'),
                    'currency': payment_data.get('currency', 'USD'),
                    'tour_name': payment_data.get('tour_name'),
                    'booking_date': payment_data.get('booking_date'),
                    'guest_count': payment_data.get('guest_count'),
                    'receipt_pdf_url': payment_data.get('pdf_url'),
                    'unsubscribe_url': payment_data.get('unsubscribe_url'),
                    'current_year': datetime.utcnow().year
                },
                language=language
            )
            
            result = await email_service.send_email(
                to_email=user_email,
                to_name=user_name,
                subject=rendered['subject'],
                html_body=rendered['html_body'],
                text_body=rendered['text_body'],
                priority=EmailPriority.HIGH
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to send payment receipt: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def send_welcome_email(
        self,
        db: Session,
        user_email: str,
        user_name: str,
        user_data: Dict[str, Any],
        language: str = 'en'
    ) -> Dict[str, Any]:
        """Send welcome email to new users"""
        try:
            rendered = template_engine.render_by_type(
                db=db,
                template_type=EmailTemplateType.WELCOME_EMAIL,
                variables={
                    'user_name': user_name,
                    'browse_tours_url': user_data.get('browse_url'),
                    'profile_url': user_data.get('profile_url'),
                    'popular_tours': user_data.get('popular_tours', []),
                    'currency': user_data.get('currency', 'USD'),
                    'facebook_icon_url': user_data.get('facebook_icon'),
                    'instagram_icon_url': user_data.get('instagram_icon'),
                    'twitter_icon_url': user_data.get('twitter_icon'),
                    'unsubscribe_url': user_data.get('unsubscribe_url'),
                    'current_year': datetime.utcnow().year
                },
                language=language
            )
            
            result = await email_service.send_email(
                to_email=user_email,
                to_name=user_name,
                subject=rendered['subject'],
                html_body=rendered['html_body'],
                text_body=rendered['text_body'],
                priority=EmailPriority.NORMAL
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to send welcome email: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def send_password_reset(
        self,
        db: Session,
        user_email: str,
        user_name: str,
        reset_data: Dict[str, Any],
        language: str = 'en'
    ) -> Dict[str, Any]:
        """Send password reset email"""
        try:
            rendered = template_engine.render_by_type(
                db=db,
                template_type=EmailTemplateType.PASSWORD_RESET,
                variables={
                    'user_name': user_name,
                    'user_email': user_email,
                    'reset_url': reset_data.get('reset_url'),
                    'expiry_hours': reset_data.get('expiry_hours', 24),
                    'expiry_date': reset_data.get('expiry_date'),
                    'unsubscribe_url': reset_data.get('unsubscribe_url'),
                    'current_year': datetime.utcnow().year
                },
                language=language
            )
            
            result = await email_service.send_email(
                to_email=user_email,
                to_name=user_name,
                subject=rendered['subject'],
                html_body=rendered['html_body'],
                text_body=rendered['text_body'],
                priority=EmailPriority.URGENT
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to send password reset: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def queue_email(
        self,
        db: Session,
        email_data: Dict[str, Any],
        priority: EmailPriority = EmailPriority.NORMAL,
        scheduled_at: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Add email to queue for later processing.
        
        Args:
            db: Database session
            email_data: Email information
            priority: Email priority
            scheduled_at: When to send (None = immediate)
            
        Returns:
            Queue result dictionary
        """
        try:
            # Create email record
            email = Email(
                email_id=str(uuid.uuid4()),
                to_email=email_data['to_email'],
                to_name=email_data.get('to_name'),
                from_email=email_data.get('from_email', self.config.DEFAULT_FROM_EMAIL),
                from_name=email_data.get('from_name', self.config.DEFAULT_FROM_NAME),
                subject=email_data['subject'],
                html_body=email_data.get('html_body'),
                text_body=email_data.get('text_body'),
                status=EmailStatus.QUEUED,
                priority=priority,
                scheduled_at=scheduled_at,
                metadata=email_data.get('metadata')
            )
            db.add(email)
            db.flush()
            
            # Add to queue
            queue_item = EmailQueue(
                queue_id=str(uuid.uuid4()),
                email_id=email.id,
                priority=priority,
                scheduled_at=scheduled_at,
                is_processed=False
            )
            db.add(queue_item)
            db.commit()
            
            logger.info(f"Email queued: {email.email_id}")
            
            return {
                'success': True,
                'email_id': email.email_id,
                'queue_id': queue_item.queue_id,
                'scheduled_at': scheduled_at
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to queue email: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def process_email_queue(
        self,
        db: Session,
        batch_size: int = 100
    ) -> Dict[str, Any]:
        """
        Process queued emails.
        
        Args:
            db: Database session
            batch_size: Number of emails to process
            
        Returns:
            Processing result dictionary
        """
        try:
            # Get pending emails from queue
            now = datetime.utcnow()
            queue_items = db.query(EmailQueue).filter(
                EmailQueue.is_processed == False,
                (EmailQueue.scheduled_at == None) | (EmailQueue.scheduled_at <= now)
            ).order_by(
                EmailQueue.priority.desc(),
                EmailQueue.created_at.asc()
            ).limit(batch_size).all()
            
            results = {
                'total': len(queue_items),
                'sent': 0,
                'failed': 0,
                'errors': []
            }
            
            for queue_item in queue_items:
                try:
                    email = db.query(Email).filter(
                        Email.id == queue_item.email_id
                    ).first()
                    
                    if not email:
                        continue
                    
                    # Update status
                    email.status = EmailStatus.SENDING
                    db.commit()
                    
                    # Send email
                    result = await email_service.send_email(
                        to_email=email.to_email,
                        to_name=email.to_name,
                        subject=email.subject,
                        html_body=email.html_body,
                        text_body=email.text_body,
                        from_email=email.from_email,
                        from_name=email.from_name,
                        priority=email.priority
                    )
                    
                    if result['success']:
                        # Update email status
                        email.status = EmailStatus.SENT
                        email.message_id = result.get('message_id')
                        email.sent_at = datetime.utcnow()
                        
                        # Mark queue item as processed
                        queue_item.is_processed = True
                        queue_item.processed_at = datetime.utcnow()
                        
                        results['sent'] += 1
                    else:
                        # Handle failure
                        email.status = EmailStatus.FAILED
                        email.error_message = result.get('error')
                        email.retry_count += 1
                        
                        # Retry logic
                        if email.retry_count < email.max_retries:
                            queue_item.retry_count += 1
                            queue_item.last_retry_at = datetime.utcnow()
                            queue_item.next_retry_at = datetime.utcnow() + timedelta(
                                seconds=self.config.EMAIL_RETRY_DELAY
                            )
                        else:
                            queue_item.is_processed = True
                            queue_item.processed_at = datetime.utcnow()
                        
                        results['failed'] += 1
                        results['errors'].append({
                            'email_id': email.email_id,
                            'error': result.get('error')
                        })
                    
                    db.commit()
                    
                except Exception as e:
                    logger.error(f"Error processing queue item {queue_item.id}: {str(e)}")
                    db.rollback()
                    results['failed'] += 1
                    results['errors'].append({
                        'queue_id': queue_item.queue_id,
                        'error': str(e)
                    })
            
            logger.info(
                f"Processed {results['total']} emails: "
                f"{results['sent']} sent, {results['failed']} failed"
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to process email queue: {str(e)}")
            return {'success': False, 'error': str(e)}


# Global notification service instance
notification_service = NotificationService()
