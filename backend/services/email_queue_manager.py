"""
Email Queue Manager - Celery-based Email Queue Processing
Gestión de cola de emails con Celery para procesamiento asíncrono

Features:
- Priority-based email queuing (urgent, high, normal, low)
- Automatic retry with exponential backoff
- Scheduled email sending
- Bulk email processing
- Provider failover on failures
- Rate limiting and throttling
- Email tracking and analytics
- Template rendering with Jinja2

Author: Spirit Tours Development Team
Created: October 18, 2025
"""

import asyncio
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from jinja2 import Template
import uuid

from backend.models.email_system_models import (
    EmailQueue, EmailLog, EmailProvider, EmailTemplate, EmailBounce,
    EmailQueueStatus, EmailPriority, EmailEventType, BounceType
)
from backend.services.email_provider_router import EmailProviderRouter
from backend.celery_config import celery_app

logger = logging.getLogger(__name__)


class EmailQueueManager:
    """
    Manager for email queue operations
    
    Handles:
    - Adding emails to queue
    - Processing queue with Celery
    - Priority management
    - Retry logic
    - Scheduled sending
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.router = EmailProviderRouter(db)
    
    def add_to_queue(
        self,
        to_email: str,
        subject: str,
        body_html: Optional[str] = None,
        body_text: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        to_name: Optional[str] = None,
        reply_to_email: Optional[str] = None,
        priority: EmailPriority = EmailPriority.NORMAL,
        scheduled_at: Optional[datetime] = None,
        template_id: Optional[str] = None,
        template_variables: Optional[Dict[str, Any]] = None,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        provider_preference: Optional[List[str]] = None,
        tracking_enabled: bool = True,
        created_by_id: Optional[str] = None
    ) -> EmailQueue:
        """
        Add an email to the queue
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            body_html: HTML body (if not using template)
            body_text: Plain text body
            from_email: Sender email (optional, uses provider default)
            from_name: Sender name
            to_name: Recipient name
            reply_to_email: Reply-to address
            priority: Email priority (urgent, high, normal, low)
            scheduled_at: When to send (None = send immediately)
            template_id: Email template to use
            template_variables: Variables for template rendering
            category: Email category (transactional, marketing, etc.)
            tags: Tags for organization
            metadata: Additional metadata
            provider_preference: Preferred providers in order
            tracking_enabled: Enable open/click tracking
            created_by_id: User who created the email
        
        Returns:
            EmailQueue object
        """
        try:
            # Check if email is in bounce list
            bounce = self.db.query(EmailBounce).filter(
                EmailBounce.email_address == to_email,
                EmailBounce.is_suppressed == True
            ).first()
            
            if bounce:
                logger.warning(
                    f"Email {to_email} is in bounce suppression list. Skipping."
                )
                # Still create queue entry but mark as cancelled
                status = EmailQueueStatus.CANCELLED
            else:
                status = EmailQueueStatus.PENDING if not scheduled_at else EmailQueueStatus.SCHEDULED
            
            # Generate tracking ID
            tracking_id = str(uuid.uuid4())
            
            # Create queue entry
            email_queue = EmailQueue(
                to_email=to_email,
                to_name=to_name,
                from_email=from_email,
                from_name=from_name,
                reply_to_email=reply_to_email,
                subject=subject,
                body_html=body_html,
                body_text=body_text,
                template_id=uuid.UUID(template_id) if template_id else None,
                template_variables=template_variables,
                priority=priority,
                status=status,
                scheduled_at=scheduled_at,
                provider_preference=provider_preference,
                tracking_enabled=tracking_enabled,
                tracking_id=tracking_id,
                category=category,
                tags=tags,
                metadata=metadata,
                created_by_id=uuid.UUID(created_by_id) if created_by_id else None,
                max_retries=3
            )
            
            self.db.add(email_queue)
            self.db.commit()
            self.db.refresh(email_queue)
            
            # Log queued event
            self._log_event(
                email_queue=email_queue,
                event_type=EmailEventType.QUEUED,
                success=True
            )
            
            # If not scheduled, trigger immediate send
            if not scheduled_at and status == EmailQueueStatus.PENDING:
                # Dispatch to Celery based on priority
                self._dispatch_to_celery(email_queue)
            
            logger.info(
                f"Email queued: {email_queue.id} to {to_email} "
                f"(priority: {priority.value}, status: {status.value})"
            )
            
            return email_queue
            
        except Exception as e:
            logger.error(f"Error adding email to queue: {str(e)}", exc_info=True)
            self.db.rollback()
            raise
    
    def _dispatch_to_celery(self, email_queue: EmailQueue):
        """
        Dispatch email to appropriate Celery queue based on priority
        """
        try:
            # Map priority to Celery queue
            queue_mapping = {
                EmailPriority.URGENT: 'email_urgent',
                EmailPriority.HIGH: 'email_high',
                EmailPriority.NORMAL: 'email_normal',
                EmailPriority.LOW: 'email_low'
            }
            
            celery_queue = queue_mapping.get(email_queue.priority, 'email_normal')
            
            # Dispatch task
            send_email_task.apply_async(
                args=[str(email_queue.id)],
                queue=celery_queue,
                priority=self._get_celery_priority(email_queue.priority)
            )
            
            logger.debug(
                f"Email {email_queue.id} dispatched to Celery queue: {celery_queue}"
            )
            
        except Exception as e:
            logger.error(f"Error dispatching to Celery: {str(e)}")
            # Mark as failed
            email_queue.status = EmailQueueStatus.FAILED
            email_queue.last_error = str(e)
            self.db.commit()
    
    @staticmethod
    def _get_celery_priority(priority: EmailPriority) -> int:
        """Convert EmailPriority to Celery priority (0-9, higher = more urgent)"""
        priority_map = {
            EmailPriority.URGENT: 9,
            EmailPriority.HIGH: 7,
            EmailPriority.NORMAL: 5,
            EmailPriority.LOW: 3
        }
        return priority_map.get(priority, 5)
    
    async def process_email(self, email_queue_id: str) -> bool:
        """
        Process a single email from the queue
        
        Args:
            email_queue_id: UUID of email in queue
        
        Returns:
            True if sent successfully, False otherwise
        """
        start_time = datetime.now(timezone.utc)
        
        try:
            # Load email from queue
            email_queue = self.db.query(EmailQueue).filter(
                EmailQueue.id == uuid.UUID(email_queue_id)
            ).first()
            
            if not email_queue:
                logger.error(f"Email {email_queue_id} not found in queue")
                return False
            
            # Update status to processing
            email_queue.status = EmailQueueStatus.PROCESSING
            self.db.commit()
            
            # Check if email is suppressed
            if await self._is_email_suppressed(email_queue.to_email):
                email_queue.status = EmailQueueStatus.CANCELLED
                email_queue.last_error = "Email address is suppressed (bounce/spam)"
                self.db.commit()
                return False
            
            # Render template if needed
            if email_queue.template_id:
                await self._render_template(email_queue)
            
            # Select provider
            provider = await self.router.select_provider(
                email_priority=email_queue.priority,
                preferred_provider_ids=email_queue.provider_preference,
                email_category=email_queue.category
            )
            
            if not provider:
                logger.error("No email provider available")
                email_queue.status = EmailQueueStatus.RETRY
                email_queue.next_retry_at = self._calculate_next_retry(email_queue)
                email_queue.last_error = "No provider available"
                self.db.commit()
                return False
            
            # Set provider
            email_queue.provider_id = provider.id
            self.db.commit()
            
            # Send email
            success = await self._send_email(email_queue, provider)
            
            # Calculate send time
            send_time_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
            
            if success:
                # Update queue status
                email_queue.status = EmailQueueStatus.SENT
                email_queue.sent_at = datetime.now(timezone.utc)
                self.db.commit()
                
                # Record success with provider
                self.router.record_provider_success(provider, send_time_ms)
                
                # Log sent event
                self._log_event(
                    email_queue=email_queue,
                    event_type=EmailEventType.SENT,
                    success=True,
                    provider=provider,
                    send_duration_ms=send_time_ms
                )
                
                logger.info(
                    f"Email {email_queue.id} sent successfully via {provider.name} "
                    f"in {send_time_ms}ms"
                )
                
                return True
            else:
                # Handle failure
                return await self._handle_send_failure(email_queue, provider, send_time_ms)
                
        except Exception as e:
            logger.error(f"Error processing email {email_queue_id}: {str(e)}", exc_info=True)
            
            # Update queue with error
            if 'email_queue' in locals():
                email_queue.status = EmailQueueStatus.RETRY
                email_queue.retry_count += 1
                email_queue.next_retry_at = self._calculate_next_retry(email_queue)
                email_queue.last_error = str(e)
                email_queue.error_details = {'exception': str(e), 'type': type(e).__name__}
                self.db.commit()
            
            return False
    
    async def _send_email(self, email_queue: EmailQueue, provider: EmailProvider) -> bool:
        """
        Actually send the email via the selected provider
        
        Returns:
            True if sent successfully, False otherwise
        """
        try:
            # Prepare email data
            from_email = email_queue.from_email or provider.from_email
            from_name = email_queue.from_name or provider.from_name
            reply_to = email_queue.reply_to_email or provider.reply_to_email
            
            # Send based on provider type
            if provider.provider_type.value.startswith('smtp'):
                return await self._send_via_smtp(
                    provider, email_queue, from_email, from_name, reply_to
                )
            elif provider.provider_type.value == 'sendgrid':
                return await self._send_via_sendgrid(
                    provider, email_queue, from_email, from_name, reply_to
                )
            elif provider.provider_type.value == 'mailgun':
                return await self._send_via_mailgun(
                    provider, email_queue, from_email, from_name, reply_to
                )
            elif provider.provider_type.value == 'aws_ses':
                return await self._send_via_aws_ses(
                    provider, email_queue, from_email, from_name, reply_to
                )
            else:
                logger.error(f"Unknown provider type: {provider.provider_type}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending email: {str(e)}", exc_info=True)
            return False
    
    async def _send_via_smtp(
        self,
        provider: EmailProvider,
        email_queue: EmailQueue,
        from_email: str,
        from_name: str,
        reply_to: Optional[str]
    ) -> bool:
        """Send email via SMTP"""
        try:
            import aiosmtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = email_queue.subject
            msg['From'] = f"{from_name} <{from_email}>"
            msg['To'] = f"{email_queue.to_name} <{email_queue.to_email}>" if email_queue.to_name else email_queue.to_email
            if reply_to:
                msg['Reply-To'] = reply_to
            
            # Add tracking ID as custom header
            if email_queue.tracking_enabled:
                msg['X-Spirit-Tours-Tracking-ID'] = email_queue.tracking_id
            
            # Add body
            if email_queue.body_text:
                text_part = MIMEText(email_queue.body_text, 'plain', 'utf-8')
                msg.attach(text_part)
            
            if email_queue.body_html:
                # Add tracking pixel if enabled
                html_body = email_queue.body_html
                if email_queue.tracking_enabled:
                    tracking_pixel = f'<img src="https://track.spirit-tours.com/open/{email_queue.tracking_id}" width="1" height="1" />'
                    html_body = html_body.replace('</body>', f'{tracking_pixel}</body>')
                
                html_part = MIMEText(html_body, 'html', 'utf-8')
                msg.attach(html_part)
            
            # Connect and send
            if provider.smtp_use_ssl:
                smtp = aiosmtplib.SMTP(
                    hostname=provider.smtp_host,
                    port=provider.smtp_port,
                    use_tls=False,
                    timeout=30
                )
            else:
                smtp = aiosmtplib.SMTP(
                    hostname=provider.smtp_host,
                    port=provider.smtp_port,
                    use_tls=provider.smtp_use_tls,
                    timeout=30
                )
            
            await smtp.connect()
            
            # Login if credentials provided
            if provider.smtp_username and provider.smtp_password_encrypted:
                # TODO: Decrypt password
                # password = decrypt(provider.smtp_password_encrypted)
                # await smtp.login(provider.smtp_username, password)
                pass
            
            await smtp.send_message(msg)
            await smtp.quit()
            
            return True
            
        except Exception as e:
            logger.error(f"SMTP send failed: {str(e)}")
            return False
    
    async def _send_via_sendgrid(
        self,
        provider: EmailProvider,
        email_queue: EmailQueue,
        from_email: str,
        from_name: str,
        reply_to: Optional[str]
    ) -> bool:
        """Send email via SendGrid API"""
        try:
            import aiohttp
            
            # TODO: Decrypt API key
            # api_key = decrypt(provider.api_key_encrypted)
            api_key = "PLACEHOLDER"  # Will be decrypted in production
            
            url = "https://api.sendgrid.com/v3/mail/send"
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            
            # Build payload
            payload = {
                'personalizations': [{
                    'to': [{'email': email_queue.to_email, 'name': email_queue.to_name}],
                    'subject': email_queue.subject
                }],
                'from': {'email': from_email, 'name': from_name},
                'content': []
            }
            
            if reply_to:
                payload['reply_to'] = {'email': reply_to}
            
            if email_queue.body_text:
                payload['content'].append({
                    'type': 'text/plain',
                    'value': email_queue.body_text
                })
            
            if email_queue.body_html:
                payload['content'].append({
                    'type': 'text/html',
                    'value': email_queue.body_html
                })
            
            # Add tracking
            if email_queue.tracking_enabled:
                payload['tracking_settings'] = {
                    'click_tracking': {'enable': True},
                    'open_tracking': {'enable': True}
                }
                payload['custom_args'] = {
                    'tracking_id': email_queue.tracking_id
                }
            
            # Send request
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, headers=headers, timeout=30) as response:
                    if response.status in [200, 202]:
                        return True
                    else:
                        error_text = await response.text()
                        logger.error(f"SendGrid error {response.status}: {error_text}")
                        return False
                        
        except Exception as e:
            logger.error(f"SendGrid send failed: {str(e)}")
            return False
    
    async def _send_via_mailgun(
        self,
        provider: EmailProvider,
        email_queue: EmailQueue,
        from_email: str,
        from_name: str,
        reply_to: Optional[str]
    ) -> bool:
        """Send email via Mailgun API"""
        # TODO: Implement Mailgun sending
        logger.warning("Mailgun sending not yet implemented")
        return False
    
    async def _send_via_aws_ses(
        self,
        provider: EmailProvider,
        email_queue: EmailQueue,
        from_email: str,
        from_name: str,
        reply_to: Optional[str]
    ) -> bool:
        """Send email via AWS SES"""
        # TODO: Implement AWS SES sending
        logger.warning("AWS SES sending not yet implemented")
        return False
    
    async def _handle_send_failure(
        self,
        email_queue: EmailQueue,
        provider: EmailProvider,
        send_time_ms: int
    ) -> bool:
        """
        Handle email send failure
        
        - Record failure with provider
        - Check if should retry
        - Try fallback provider if available
        """
        error_msg = email_queue.last_error or "Unknown send error"
        
        # Record failure with provider
        self.router.record_provider_failure(
            provider,
            error_msg,
            email_queue.error_details
        )
        
        # Log failed event
        self._log_event(
            email_queue=email_queue,
            event_type=EmailEventType.FAILED,
            success=False,
            provider=provider,
            error_message=error_msg,
            send_duration_ms=send_time_ms
        )
        
        # Check if should retry
        if email_queue.retry_count < email_queue.max_retries:
            # Try fallback provider
            fallback_provider = await self.router.get_fallback_provider(
                provider,
                [str(provider.id)]
            )
            
            if fallback_provider:
                logger.info(
                    f"Attempting fallback provider: {fallback_provider.name} "
                    f"for email {email_queue.id}"
                )
                email_queue.provider_id = fallback_provider.id
                email_queue.status = EmailQueueStatus.RETRY
                email_queue.retry_count += 1
                email_queue.next_retry_at = self._calculate_next_retry(email_queue)
                self.db.commit()
                
                # Dispatch retry
                self._dispatch_to_celery(email_queue)
                return False
            else:
                # No fallback, schedule retry
                email_queue.status = EmailQueueStatus.RETRY
                email_queue.retry_count += 1
                email_queue.next_retry_at = self._calculate_next_retry(email_queue)
                self.db.commit()
                return False
        else:
            # Max retries reached
            email_queue.status = EmailQueueStatus.FAILED
            self.db.commit()
            logger.error(
                f"Email {email_queue.id} failed after {email_queue.retry_count} retries"
            )
            return False
    
    def _calculate_next_retry(self, email_queue: EmailQueue) -> datetime:
        """
        Calculate next retry time with exponential backoff
        
        Retry schedule:
        - 1st retry: 5 minutes
        - 2nd retry: 15 minutes
        - 3rd retry: 30 minutes
        """
        retry_delays = [5, 15, 30]  # minutes
        retry_index = min(email_queue.retry_count, len(retry_delays) - 1)
        delay_minutes = retry_delays[retry_index]
        
        return datetime.now(timezone.utc) + timedelta(minutes=delay_minutes)
    
    async def _render_template(self, email_queue: EmailQueue):
        """
        Render email template with variables
        """
        try:
            # Load template
            template = self.db.query(EmailTemplate).filter(
                EmailTemplate.id == email_queue.template_id
            ).first()
            
            if not template:
                raise ValueError(f"Template {email_queue.template_id} not found")
            
            # Render subject
            subject_template = Template(template.subject)
            email_queue.subject = subject_template.render(
                **(email_queue.template_variables or {})
            )
            
            # Render HTML body
            if template.body_html:
                html_template = Template(template.body_html)
                email_queue.body_html = html_template.render(
                    **(email_queue.template_variables or {})
                )
            
            # Render text body
            if template.body_text:
                text_template = Template(template.body_text)
                email_queue.body_text = text_template.render(
                    **(email_queue.template_variables or {})
                )
            
            # Update template usage stats
            template.times_used += 1
            template.last_used_at = datetime.now(timezone.utc)
            
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error rendering template: {str(e)}")
            raise
    
    async def _is_email_suppressed(self, email_address: str) -> bool:
        """Check if email is in suppression list"""
        bounce = self.db.query(EmailBounce).filter(
            EmailBounce.email_address == email_address,
            EmailBounce.is_suppressed == True
        ).first()
        
        return bounce is not None
    
    def _log_event(
        self,
        email_queue: EmailQueue,
        event_type: EmailEventType,
        success: bool,
        provider: Optional[EmailProvider] = None,
        error_message: Optional[str] = None,
        send_duration_ms: Optional[int] = None
    ):
        """Log email event"""
        try:
            log_entry = EmailLog(
                email_queue_id=email_queue.id,
                tracking_id=email_queue.tracking_id,
                event_type=event_type,
                provider_id=provider.id if provider else None,
                to_email=email_queue.to_email,
                from_email=email_queue.from_email,
                subject=email_queue.subject,
                success=success,
                error_message=error_message,
                send_duration_ms=send_duration_ms
            )
            
            self.db.add(log_entry)
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error logging event: {str(e)}")
            self.db.rollback()


# ============================================================================
# CELERY TASKS
# ============================================================================

@celery_app.task(
    name='send_email_task',
    bind=True,
    max_retries=3,
    default_retry_delay=300  # 5 minutes
)
def send_email_task(self, email_queue_id: str):
    """
    Celery task to send a single email
    
    Args:
        email_queue_id: UUID of email in queue
    """
    from backend.database import get_db
    
    try:
        db = next(get_db())
        manager = EmailQueueManager(db)
        
        # Process email asynchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        success = loop.run_until_complete(manager.process_email(email_queue_id))
        loop.close()
        
        if not success:
            # Retry if failed
            raise self.retry(exc=Exception("Email send failed"))
        
        return {'success': True, 'email_id': email_queue_id}
        
    except Exception as exc:
        logger.error(f"Error in send_email_task: {str(exc)}")
        raise self.retry(exc=exc)


@celery_app.task(name='process_scheduled_emails')
def process_scheduled_emails():
    """
    Process emails scheduled for sending
    Run every minute via Celery Beat
    """
    from backend.database import get_db
    
    try:
        db = next(get_db())
        
        # Find scheduled emails that are due
        now = datetime.now(timezone.utc)
        scheduled_emails = db.query(EmailQueue).filter(
            EmailQueue.status == EmailQueueStatus.SCHEDULED,
            EmailQueue.scheduled_at <= now
        ).all()
        
        logger.info(f"Found {len(scheduled_emails)} scheduled emails to process")
        
        manager = EmailQueueManager(db)
        
        for email in scheduled_emails:
            # Update status and dispatch
            email.status = EmailQueueStatus.PENDING
            db.commit()
            manager._dispatch_to_celery(email)
        
        return {'processed': len(scheduled_emails)}
        
    except Exception as e:
        logger.error(f"Error processing scheduled emails: {str(e)}")
        return {'error': str(e)}


@celery_app.task(name='process_retry_emails')
def process_retry_emails():
    """
    Process emails marked for retry
    Run every 5 minutes via Celery Beat
    """
    from backend.database import get_db
    
    try:
        db = next(get_db())
        
        # Find emails ready for retry
        now = datetime.now(timezone.utc)
        retry_emails = db.query(EmailQueue).filter(
            EmailQueue.status == EmailQueueStatus.RETRY,
            EmailQueue.next_retry_at <= now
        ).all()
        
        logger.info(f"Found {len(retry_emails)} emails to retry")
        
        manager = EmailQueueManager(db)
        
        for email in retry_emails:
            # Update status and dispatch
            email.status = EmailQueueStatus.PENDING
            db.commit()
            manager._dispatch_to_celery(email)
        
        return {'processed': len(retry_emails)}
        
    except Exception as e:
        logger.error(f"Error processing retry emails: {str(e)}")
        return {'error': str(e)}


@celery_app.task(name='cleanup_old_emails')
def cleanup_old_emails(days_to_keep: int = 30):
    """
    Clean up old sent/failed emails from queue
    Run daily via Celery Beat
    """
    from backend.database import get_db
    
    try:
        db = next(get_db())
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
        
        # Delete old sent emails
        deleted_count = db.query(EmailQueue).filter(
            EmailQueue.status.in_([EmailQueueStatus.SENT, EmailQueueStatus.FAILED]),
            EmailQueue.updated_at < cutoff_date
        ).delete()
        
        db.commit()
        
        logger.info(f"Cleaned up {deleted_count} old emails")
        return {'deleted': deleted_count}
        
    except Exception as e:
        logger.error(f"Error cleaning up old emails: {str(e)}")
        db.rollback()
        return {'error': str(e)}
