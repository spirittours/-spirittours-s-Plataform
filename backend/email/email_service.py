"""
Email Service

Main service for sending emails with support for multiple providers.
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from backend.email.email_config import email_config
from backend.models.email_models import (
    Email, EmailStatus, EmailPriority, EmailProvider,
    EmailAttachment as EmailAttachmentModel
)


logger = logging.getLogger(__name__)


class EmailAttachment:
    """Email attachment data class"""
    def __init__(
        self,
        filename: str,
        content: bytes,
        content_type: str = 'application/octet-stream',
        is_inline: bool = False,
        content_id: Optional[str] = None
    ):
        self.filename = filename
        self.content = content
        self.content_type = content_type
        self.is_inline = is_inline
        self.content_id = content_id or f"<{uuid.uuid4()}@spirittours.com>"


class EmailService:
    """
    Email service for sending emails through various providers.
    
    Supports:
    - SMTP
    - SendGrid
    - AWS SES
    - Mailgun
    """
    
    def __init__(self):
        self.config = email_config
        self.provider = self._get_provider()
    
    def _get_provider(self) -> EmailProvider:
        """Get the configured email provider"""
        provider_map = {
            'smtp': EmailProvider.SMTP,
            'sendgrid': EmailProvider.SENDGRID,
            'aws_ses': EmailProvider.AWS_SES,
            'mailgun': EmailProvider.MAILGUN,
        }
        return provider_map.get(
            self.config.EMAIL_PROVIDER.lower(),
            EmailProvider.SMTP
        )
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: Optional[str] = None,
        text_body: Optional[str] = None,
        to_name: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        reply_to: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[EmailAttachment]] = None,
        priority: EmailPriority = EmailPriority.NORMAL,
        template_id: Optional[int] = None,
        template_variables: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Send an email.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text email body
            to_name: Recipient name
            from_email: Sender email (defaults to config)
            from_name: Sender name (defaults to config)
            reply_to: Reply-to email address
            cc: List of CC recipients
            bcc: List of BCC recipients
            attachments: List of email attachments
            priority: Email priority
            template_id: Email template ID (if using template)
            template_variables: Variables for template rendering
            metadata: Additional metadata
            
        Returns:
            Dictionary with send result
        """
        try:
            # Use defaults if not provided
            from_email = from_email or self.config.DEFAULT_FROM_EMAIL
            from_name = from_name or self.config.DEFAULT_FROM_NAME
            reply_to = reply_to or self.config.DEFAULT_REPLY_TO
            
            # Test mode override
            if self.config.EMAIL_TEST_MODE and self.config.EMAIL_TEST_RECIPIENT:
                logger.info(f"Test mode: Redirecting email to {self.config.EMAIL_TEST_RECIPIENT}")
                to_email = self.config.EMAIL_TEST_RECIPIENT
            
            # Send based on provider
            if self.provider == EmailProvider.SMTP:
                result = await self._send_smtp(
                    to_email=to_email,
                    subject=subject,
                    html_body=html_body,
                    text_body=text_body,
                    to_name=to_name,
                    from_email=from_email,
                    from_name=from_name,
                    reply_to=reply_to,
                    cc=cc,
                    bcc=bcc,
                    attachments=attachments
                )
            elif self.provider == EmailProvider.SENDGRID:
                result = await self._send_sendgrid(
                    to_email=to_email,
                    subject=subject,
                    html_body=html_body,
                    text_body=text_body,
                    to_name=to_name,
                    from_email=from_email,
                    from_name=from_name,
                    reply_to=reply_to,
                    cc=cc,
                    bcc=bcc,
                    attachments=attachments
                )
            else:
                raise ValueError(f"Unsupported email provider: {self.provider}")
            
            return {
                'success': True,
                'message_id': result.get('message_id'),
                'provider': self.provider.value,
                'to_email': to_email,
                'sent_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'provider': self.provider.value,
                'to_email': to_email
            }
    
    async def _send_smtp(
        self,
        to_email: str,
        subject: str,
        html_body: Optional[str] = None,
        text_body: Optional[str] = None,
        to_name: Optional[str] = None,
        from_email: str = None,
        from_name: str = None,
        reply_to: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[EmailAttachment]] = None
    ) -> Dict[str, Any]:
        """Send email via SMTP"""
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f'{from_name} <{from_email}>' if from_name else from_email
        msg['To'] = f'{to_name} <{to_email}>' if to_name else to_email
        
        if reply_to:
            msg['Reply-To'] = reply_to
        
        if cc:
            msg['Cc'] = ', '.join(cc)
        
        # Add plain text part
        if text_body:
            text_part = MIMEText(text_body, 'plain', 'utf-8')
            msg.attach(text_part)
        
        # Add HTML part
        if html_body:
            html_part = MIMEText(html_body, 'html', 'utf-8')
            msg.attach(html_part)
        
        # Add attachments
        if attachments:
            for attachment in attachments:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(attachment.content)
                encoders.encode_base64(part)
                part.add_header(
                    'Content-Disposition',
                    f'attachment; filename={attachment.filename}'
                )
                if attachment.is_inline:
                    part.add_header('Content-ID', attachment.content_id)
                msg.attach(part)
        
        # Build recipient list
        recipients = [to_email]
        if cc:
            recipients.extend(cc)
        if bcc:
            recipients.extend(bcc)
        
        # Connect and send
        try:
            if self.config.SMTP_USE_SSL:
                server = smtplib.SMTP_SSL(
                    self.config.SMTP_HOST,
                    self.config.SMTP_PORT
                )
            else:
                server = smtplib.SMTP(
                    self.config.SMTP_HOST,
                    self.config.SMTP_PORT
                )
                if self.config.SMTP_USE_TLS:
                    server.starttls()
            
            # Login if credentials provided
            if self.config.SMTP_USERNAME and self.config.SMTP_PASSWORD:
                server.login(
                    self.config.SMTP_USERNAME,
                    self.config.SMTP_PASSWORD
                )
            
            # Send email
            server.send_message(msg, from_email, recipients)
            server.quit()
            
            # Generate message ID
            message_id = msg.get('Message-ID') or f"<{uuid.uuid4()}@spirittours.com>"
            
            logger.info(f"Email sent via SMTP to {to_email}")
            
            return {
                'message_id': message_id,
                'status': 'sent'
            }
            
        except Exception as e:
            logger.error(f"SMTP error: {str(e)}")
            raise
    
    async def _send_sendgrid(
        self,
        to_email: str,
        subject: str,
        html_body: Optional[str] = None,
        text_body: Optional[str] = None,
        to_name: Optional[str] = None,
        from_email: str = None,
        from_name: str = None,
        reply_to: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[EmailAttachment]] = None
    ) -> Dict[str, Any]:
        """Send email via SendGrid API"""
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import (
                Mail, Email, To, Content, Attachment,
                FileContent, FileName, FileType, Disposition
            )
            import base64
            
            # Create message
            message = Mail(
                from_email=Email(from_email, from_name),
                to_emails=To(to_email, to_name),
                subject=subject
            )
            
            # Add content
            if text_body:
                message.content = Content("text/plain", text_body)
            
            if html_body:
                message.content = Content("text/html", html_body)
            
            # Add reply-to
            if reply_to:
                message.reply_to = Email(reply_to)
            
            # Add CC
            if cc:
                for cc_email in cc:
                    message.add_cc(Email(cc_email))
            
            # Add BCC
            if bcc:
                for bcc_email in bcc:
                    message.add_bcc(Email(bcc_email))
            
            # Add attachments
            if attachments:
                for attachment in attachments:
                    encoded = base64.b64encode(attachment.content).decode()
                    sg_attachment = Attachment(
                        FileContent(encoded),
                        FileName(attachment.filename),
                        FileType(attachment.content_type),
                        Disposition('inline' if attachment.is_inline else 'attachment')
                    )
                    if attachment.is_inline:
                        sg_attachment.content_id = attachment.content_id
                    message.add_attachment(sg_attachment)
            
            # Send email
            sg = SendGridAPIClient(self.config.SENDGRID_API_KEY)
            response = sg.send(message)
            
            logger.info(f"Email sent via SendGrid to {to_email}")
            
            return {
                'message_id': response.headers.get('X-Message-Id'),
                'status': 'sent'
            }
            
        except Exception as e:
            logger.error(f"SendGrid error: {str(e)}")
            raise
    
    async def send_bulk_emails(
        self,
        recipients: List[Dict[str, Any]],
        subject: str,
        html_body: Optional[str] = None,
        text_body: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        template_id: Optional[int] = None,
        batch_size: int = 100
    ) -> Dict[str, Any]:
        """
        Send bulk emails to multiple recipients.
        
        Args:
            recipients: List of recipient dictionaries with 'email' and optional 'name'
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text email body
            from_email: Sender email
            from_name: Sender name
            template_id: Email template ID
            batch_size: Number of emails to send per batch
            
        Returns:
            Dictionary with bulk send results
        """
        results = {
            'total': len(recipients),
            'sent': 0,
            'failed': 0,
            'errors': []
        }
        
        # Process in batches
        for i in range(0, len(recipients), batch_size):
            batch = recipients[i:i + batch_size]
            
            for recipient in batch:
                try:
                    result = await self.send_email(
                        to_email=recipient['email'],
                        to_name=recipient.get('name'),
                        subject=subject,
                        html_body=html_body,
                        text_body=text_body,
                        from_email=from_email,
                        from_name=from_name,
                        template_id=template_id
                    )
                    
                    if result['success']:
                        results['sent'] += 1
                    else:
                        results['failed'] += 1
                        results['errors'].append({
                            'email': recipient['email'],
                            'error': result.get('error')
                        })
                        
                except Exception as e:
                    results['failed'] += 1
                    results['errors'].append({
                        'email': recipient['email'],
                        'error': str(e)
                    })
        
        return results


# Global email service instance
email_service = EmailService()
