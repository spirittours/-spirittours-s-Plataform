"""
Email Service for Spirit Tours Intelligent Email System
Handles email fetching, processing, analytics, and response management

Author: Spirit Tours Development Team
Created: 2025-10-04
Phase: 1 - Email Foundation
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload

from backend.models.email_models import (
    EmailAccount, EmailMessage, EmailClassification, EmailResponse,
    EmailAnalytics, EmailTemplate, EmailCategory, EmailIntent,
    EmailPriority, EmailStatus, ResponseType, EmailLanguage
)
from backend.services.email_classifier import EmailClassifier

logger = logging.getLogger(__name__)


class EmailService:
    """
    Main email service for managing email operations
    Handles fetching, classification, analytics, and responses
    """
    
    def __init__(self, db: AsyncSession):
        """
        Initialize email service
        
        Args:
            db: Database session
        """
        self.db = db
        self.classifier = EmailClassifier(db)
    
    # ========================================================================
    # EMAIL ACCOUNT MANAGEMENT
    # ========================================================================
    
    async def get_email_accounts(
        self,
        active_only: bool = True
    ) -> List[EmailAccount]:
        """
        Get all email accounts
        
        Args:
            active_only: Return only active accounts
            
        Returns:
            List of EmailAccount objects
        """
        try:
            query = select(EmailAccount)
            
            if active_only:
                query = query.where(EmailAccount.is_active == True)
            
            query = query.order_by(EmailAccount.email_address)
            
            result = await self.db.execute(query)
            accounts = result.scalars().all()
            
            return list(accounts)
            
        except Exception as e:
            logger.error(f"Failed to get email accounts: {str(e)}")
            return []
    
    async def get_email_account(
        self,
        account_id: str
    ) -> Optional[EmailAccount]:
        """
        Get specific email account
        
        Args:
            account_id: Account UUID
            
        Returns:
            EmailAccount or None
        """
        try:
            result = await self.db.execute(
                select(EmailAccount).where(EmailAccount.id == account_id)
            )
            return result.scalar_one_or_none()
            
        except Exception as e:
            logger.error(f"Failed to get email account {account_id}: {str(e)}")
            return None
    
    async def create_email_account(
        self,
        email_address: str,
        display_name: str,
        category: EmailCategory,
        provider: str = "gmail",
        description: Optional[str] = None,
        **kwargs
    ) -> EmailAccount:
        """
        Create new email account
        
        Args:
            email_address: Email address
            display_name: Display name
            category: Email category
            provider: Email provider (gmail, microsoft365)
            description: Optional description
            **kwargs: Additional configuration
            
        Returns:
            Created EmailAccount
        """
        try:
            account = EmailAccount(
                email_address=email_address,
                display_name=display_name,
                category=category,
                provider=provider,
                description=description,
                **kwargs
            )
            
            self.db.add(account)
            await self.db.commit()
            await self.db.refresh(account)
            
            logger.info(f"Created email account: {email_address}")
            
            return account
            
        except Exception as e:
            logger.error(f"Failed to create email account: {str(e)}")
            await self.db.rollback()
            raise
    
    # ========================================================================
    # EMAIL MESSAGE MANAGEMENT
    # ========================================================================
    
    async def get_emails(
        self,
        account_id: Optional[str] = None,
        category: Optional[EmailCategory] = None,
        status: Optional[EmailStatus] = None,
        priority: Optional[EmailPriority] = None,
        assigned_user_id: Optional[str] = None,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[EmailMessage], int]:
        """
        Get emails with filters
        
        Args:
            account_id: Filter by account
            category: Filter by category
            status: Filter by status
            priority: Filter by priority
            assigned_user_id: Filter by assigned user
            unread_only: Show only unread emails
            limit: Max results
            offset: Pagination offset
            
        Returns:
            Tuple of (emails list, total count)
        """
        try:
            # Build query
            query = select(EmailMessage)
            count_query = select(func.count(EmailMessage.id))
            
            # Apply filters
            conditions = []
            
            if account_id:
                conditions.append(EmailMessage.account_id == account_id)
            
            if category:
                conditions.append(EmailMessage.category == category)
            
            if status:
                conditions.append(EmailMessage.status == status)
            
            if priority:
                conditions.append(EmailMessage.priority == priority)
            
            if assigned_user_id:
                conditions.append(EmailMessage.assigned_user_id == assigned_user_id)
            
            if unread_only:
                conditions.append(EmailMessage.is_read == False)
            
            if conditions:
                query = query.where(and_(*conditions))
                count_query = count_query.where(and_(*conditions))
            
            # Get total count
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()
            
            # Apply ordering, limit, and offset
            query = query.order_by(desc(EmailMessage.received_at))
            query = query.limit(limit).offset(offset)
            
            # Execute query
            result = await self.db.execute(query)
            emails = result.scalars().all()
            
            return list(emails), total
            
        except Exception as e:
            logger.error(f"Failed to get emails: {str(e)}")
            return [], 0
    
    async def get_email(self, email_id: str) -> Optional[EmailMessage]:
        """
        Get specific email with relationships
        
        Args:
            email_id: Email UUID
            
        Returns:
            EmailMessage or None
        """
        try:
            query = select(EmailMessage).where(EmailMessage.id == email_id)
            query = query.options(
                selectinload(EmailMessage.classifications),
                selectinload(EmailMessage.responses)
            )
            
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
            
        except Exception as e:
            logger.error(f"Failed to get email {email_id}: {str(e)}")
            return None
    
    async def create_email(
        self,
        account_id: str,
        message_id: str,
        from_email: str,
        to_emails: List[str],
        subject: str,
        body_text: Optional[str] = None,
        body_html: Optional[str] = None,
        received_at: Optional[datetime] = None,
        **kwargs
    ) -> EmailMessage:
        """
        Create new email message
        
        Args:
            account_id: Email account ID
            message_id: External message ID
            from_email: Sender email
            to_emails: Recipient emails
            subject: Email subject
            body_text: Plain text body
            body_html: HTML body
            received_at: Received timestamp
            **kwargs: Additional fields
            
        Returns:
            Created EmailMessage
        """
        try:
            email = EmailMessage(
                account_id=account_id,
                message_id=message_id,
                from_email=from_email,
                to_emails=to_emails,
                subject=subject,
                body_text=body_text,
                body_html=body_html,
                received_at=received_at or datetime.utcnow(),
                **kwargs
            )
            
            self.db.add(email)
            await self.db.commit()
            await self.db.refresh(email)
            
            logger.info(f"Created email: {email.id} from {from_email}")
            
            return email
            
        except Exception as e:
            logger.error(f"Failed to create email: {str(e)}")
            await self.db.rollback()
            raise
    
    async def update_email_status(
        self,
        email_id: str,
        status: EmailStatus
    ) -> bool:
        """
        Update email status
        
        Args:
            email_id: Email UUID
            status: New status
            
        Returns:
            Success boolean
        """
        try:
            email = await self.get_email(email_id)
            if not email:
                return False
            
            email.status = status
            email.updated_at = datetime.utcnow()
            
            # Set closed timestamp if closing
            if status == EmailStatus.CLOSED:
                email.closed_at = datetime.utcnow()
            
            await self.db.commit()
            
            logger.info(f"Updated email {email_id} status to {status.value}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to update email status: {str(e)}")
            await self.db.rollback()
            return False
    
    async def mark_as_read(self, email_id: str) -> bool:
        """Mark email as read"""
        try:
            email = await self.get_email(email_id)
            if not email:
                return False
            
            email.is_read = True
            email.updated_at = datetime.utcnow()
            
            await self.db.commit()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to mark email as read: {str(e)}")
            await self.db.rollback()
            return False
    
    async def assign_email(
        self,
        email_id: str,
        user_id: str
    ) -> bool:
        """
        Assign email to user
        
        Args:
            email_id: Email UUID
            user_id: User UUID to assign to
            
        Returns:
            Success boolean
        """
        try:
            email = await self.get_email(email_id)
            if not email:
                return False
            
            email.assigned_user_id = user_id
            email.status = EmailStatus.ASSIGNED
            email.updated_at = datetime.utcnow()
            
            await self.db.commit()
            
            logger.info(f"Assigned email {email_id} to user {user_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to assign email: {str(e)}")
            await self.db.rollback()
            return False
    
    # ========================================================================
    # EMAIL CLASSIFICATION
    # ========================================================================
    
    async def classify_email(self, email_id: str) -> Dict[str, Any]:
        """
        Classify email using EmailClassifier
        
        Args:
            email_id: Email UUID
            
        Returns:
            Classification results
        """
        try:
            email = await self.get_email(email_id)
            if not email:
                return {
                    'success': False,
                    'error': 'Email not found'
                }
            
            result = await self.classifier.classify_email(email)
            
            # Update email status
            if result['success']:
                email.status = EmailStatus.CLASSIFIED
            
            await self.db.commit()
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to classify email: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    # ========================================================================
    # EMAIL ANALYTICS
    # ========================================================================
    
    async def get_dashboard_stats(
        self,
        account_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get email dashboard statistics
        
        Args:
            account_id: Optional account filter
            user_id: Optional user filter for assigned emails
            
        Returns:
            Dict with dashboard statistics
        """
        try:
            today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Base query conditions
            conditions = [EmailMessage.received_at >= today]
            
            if account_id:
                conditions.append(EmailMessage.account_id == account_id)
            
            if user_id:
                conditions.append(EmailMessage.assigned_user_id == user_id)
            
            # Total received today
            result = await self.db.execute(
                select(func.count(EmailMessage.id)).where(and_(*conditions))
            )
            total_received_today = result.scalar()
            
            # Pending response
            pending_conditions = conditions + [
                EmailMessage.status.in_([
                    EmailStatus.RECEIVED,
                    EmailStatus.CLASSIFIED,
                    EmailStatus.ANALYZED,
                    EmailStatus.ASSIGNED,
                    EmailStatus.IN_PROGRESS
                ]),
                EmailMessage.requires_response == True
            ]
            
            result = await self.db.execute(
                select(func.count(EmailMessage.id)).where(and_(*pending_conditions))
            )
            total_pending_response = result.scalar()
            
            # Urgent emails
            urgent_conditions = conditions + [
                EmailMessage.priority == EmailPriority.URGENT,
                EmailMessage.status != EmailStatus.CLOSED
            ]
            
            result = await self.db.execute(
                select(func.count(EmailMessage.id)).where(and_(*urgent_conditions))
            )
            total_urgent = result.scalar()
            
            # Average response time today
            response_time_query = select(
                func.avg(
                    func.extract('epoch', EmailMessage.responded_at - EmailMessage.received_at) / 60
                )
            ).where(
                and_(
                    EmailMessage.received_at >= today,
                    EmailMessage.responded_at.isnot(None)
                )
            )
            
            if account_id:
                response_time_query = response_time_query.where(EmailMessage.account_id == account_id)
            
            result = await self.db.execute(response_time_query)
            avg_response_time = result.scalar() or 0.0
            
            # Sentiment distribution
            sentiment_query = select(
                EmailMessage.sentiment,
                func.count(EmailMessage.id)
            ).where(and_(*conditions)).group_by(EmailMessage.sentiment)
            
            result = await self.db.execute(sentiment_query)
            sentiment_dist = {row[0] or 'unknown': row[1] for row in result}
            
            # Category distribution
            category_query = select(
                EmailMessage.category,
                func.count(EmailMessage.id)
            ).where(and_(*conditions)).group_by(EmailMessage.category)
            
            result = await self.db.execute(category_query)
            category_dist = {row[0].value if row[0] else 'unknown': row[1] for row in result}
            
            # Intent distribution
            intent_query = select(
                EmailMessage.intent,
                func.count(EmailMessage.id)
            ).where(and_(*conditions)).group_by(EmailMessage.intent)
            
            result = await self.db.execute(intent_query)
            intent_dist = {row[0].value if row[0] else 'unknown': row[1] for row in result}
            
            # Priority distribution
            priority_query = select(
                EmailMessage.priority,
                func.count(EmailMessage.id)
            ).where(and_(*conditions)).group_by(EmailMessage.priority)
            
            result = await self.db.execute(priority_query)
            priority_dist = {row[0].value if row[0] else 'unknown': row[1] for row in result}
            
            # Recent emails
            recent_query = select(EmailMessage).where(and_(*conditions))
            recent_query = recent_query.order_by(desc(EmailMessage.received_at)).limit(10)
            
            result = await self.db.execute(recent_query)
            recent_emails = result.scalars().all()
            
            # SLA compliance
            sla_conditions = conditions + [EmailMessage.response_deadline.isnot(None)]
            
            # Within SLA
            within_sla_conditions = sla_conditions + [
                or_(
                    EmailMessage.responded_at <= EmailMessage.response_deadline,
                    and_(
                        EmailMessage.responded_at.is_(None),
                        datetime.utcnow() <= EmailMessage.response_deadline
                    )
                )
            ]
            
            result = await self.db.execute(
                select(func.count(EmailMessage.id)).where(and_(*within_sla_conditions))
            )
            within_sla = result.scalar()
            
            # Breached SLA
            breached_sla_conditions = sla_conditions + [
                or_(
                    EmailMessage.responded_at > EmailMessage.response_deadline,
                    and_(
                        EmailMessage.responded_at.is_(None),
                        datetime.utcnow() > EmailMessage.response_deadline
                    )
                )
            ]
            
            result = await self.db.execute(
                select(func.count(EmailMessage.id)).where(and_(*breached_sla_conditions))
            )
            breached_sla = result.scalar()
            
            total_sla_tracked = within_sla + breached_sla
            sla_compliance_rate = (within_sla / total_sla_tracked * 100) if total_sla_tracked > 0 else 100.0
            
            return {
                'success': True,
                'total_received_today': total_received_today,
                'total_pending_response': total_pending_response,
                'total_urgent': total_urgent,
                'avg_response_time_minutes': round(avg_response_time, 2),
                'sla_compliance_rate': round(sla_compliance_rate, 2),
                'sentiment_distribution': sentiment_dist,
                'category_distribution': category_dist,
                'intent_distribution': intent_dist,
                'priority_distribution': priority_dist,
                'recent_emails': [self._email_to_dict(e) for e in recent_emails],
                'within_sla': within_sla,
                'breached_sla': breached_sla
            }
            
        except Exception as e:
            logger.error(f"Failed to get dashboard stats: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_analytics_time_series(
        self,
        start_date: datetime,
        end_date: datetime,
        account_id: Optional[str] = None,
        category: Optional[EmailCategory] = None
    ) -> List[Dict[str, Any]]:
        """
        Get time series analytics data
        
        Args:
            start_date: Start date
            end_date: End date
            account_id: Optional account filter
            category: Optional category filter
            
        Returns:
            List of daily analytics
        """
        try:
            query = select(EmailAnalytics).where(
                and_(
                    EmailAnalytics.date >= start_date,
                    EmailAnalytics.date <= end_date
                )
            )
            
            if account_id:
                query = query.where(EmailAnalytics.account_id == account_id)
            
            if category:
                query = query.where(EmailAnalytics.category == category)
            
            query = query.order_by(EmailAnalytics.date)
            
            result = await self.db.execute(query)
            analytics = result.scalars().all()
            
            return [self._analytics_to_dict(a) for a in analytics]
            
        except Exception as e:
            logger.error(f"Failed to get analytics time series: {str(e)}")
            return []
    
    # ========================================================================
    # UTILITY METHODS
    # ========================================================================
    
    def _email_to_dict(self, email: EmailMessage) -> Dict[str, Any]:
        """Convert EmailMessage to dict"""
        return {
            'id': str(email.id),
            'account_id': str(email.account_id),
            'message_id': email.message_id,
            'from_email': email.from_email,
            'from_name': email.from_name,
            'to_emails': email.to_emails,
            'subject': email.subject,
            'received_at': email.received_at.isoformat(),
            'category': email.category.value if email.category else None,
            'intent': email.intent.value if email.intent else None,
            'priority': email.priority.value,
            'status': email.status.value,
            'sentiment': email.sentiment,
            'sentiment_score': email.sentiment_score,
            'is_read': email.is_read,
            'requires_response': email.requires_response,
            'response_deadline': email.response_deadline.isoformat() if email.response_deadline else None
        }
    
    def _analytics_to_dict(self, analytics: EmailAnalytics) -> Dict[str, Any]:
        """Convert EmailAnalytics to dict"""
        return {
            'date': analytics.date.isoformat(),
            'account_id': str(analytics.account_id) if analytics.account_id else None,
            'category': analytics.category.value if analytics.category else None,
            'total_received': analytics.total_received,
            'total_sent': analytics.total_sent,
            'avg_response_time': analytics.avg_response_time,
            'sla_compliance_rate': analytics.sla_compliance_rate,
            'sentiment_positive_count': analytics.sentiment_positive_count,
            'sentiment_negative_count': analytics.sentiment_negative_count,
            'sentiment_neutral_count': analytics.sentiment_neutral_count,
            'status_distribution': analytics.status_distribution,
            'priority_distribution': analytics.priority_distribution,
            'intent_distribution': analytics.intent_distribution
        }
