"""
Celery Tasks for Email Processing

Handles:
- Email fetching from Gmail/Microsoft365 APIs
- Email classification and analysis
- Auto-response generation
- Email analytics aggregation
- SLA monitoring

Author: Spirit Tours Development Team
Created: 2025-10-04
Phase: 1 - Email Foundation
"""

from celery import shared_task
from datetime import datetime, timedelta
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


@shared_task(name='backend.tasks.email_tasks.fetch_new_emails')
def fetch_new_emails(account_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Fetch new emails from Gmail or Microsoft365 API
    
    Args:
        account_id: Specific account ID, or None to fetch all
        
    Returns:
        Dict with fetch results
    """
    try:
        from database import get_sync_db
        from services.email_service import EmailService
        
        logger.info(f"Starting email fetch for account: {account_id or 'all'}")
        
        with get_sync_db() as db:
            service = EmailService(db)
            
            # Get accounts to fetch
            if account_id:
                accounts = [service.get_email_account(account_id)]
                if not accounts[0]:
                    return {
                        'success': False,
                        'error': f'Account {account_id} not found'
                    }
            else:
                accounts = service.get_email_accounts(active_only=True)
            
            total_fetched = 0
            results = []
            
            for account in accounts:
                try:
                    # TODO: Implement actual Gmail/Microsoft365 API fetching
                    # For now, log the intention
                    logger.info(f"Would fetch emails for {account.email_address}")
                    
                    # Placeholder result
                    result = {
                        'account_id': str(account.id),
                        'email_address': account.email_address,
                        'fetched': 0,
                        'provider': account.provider
                    }
                    
                    results.append(result)
                    
                except Exception as e:
                    logger.error(f"Failed to fetch emails for {account.email_address}: {str(e)}")
                    results.append({
                        'account_id': str(account.id),
                        'email_address': account.email_address,
                        'error': str(e)
                    })
            
            return {
                'success': True,
                'total_accounts': len(accounts),
                'total_fetched': total_fetched,
                'results': results,
                'timestamp': datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Email fetch task failed: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }


@shared_task(name='backend.tasks.email_tasks.classify_pending_emails')
def classify_pending_emails(batch_size: int = 10) -> Dict[str, Any]:
    """
    Classify emails that are in 'received' status
    
    Args:
        batch_size: Number of emails to classify in this batch
        
    Returns:
        Dict with classification results
    """
    try:
        from database import get_sync_db
        from services.email_service import EmailService
        from models.email_models import EmailMessage, EmailStatus
        from sqlalchemy import select
        
        logger.info(f"Starting email classification batch (size: {batch_size})")
        
        with get_sync_db() as db:
            service = EmailService(db)
            
            # Get pending emails
            query = select(EmailMessage).where(
                EmailMessage.status == EmailStatus.RECEIVED
            ).limit(batch_size)
            
            result = db.execute(query)
            emails = result.scalars().all()
            
            classified_count = 0
            failed_count = 0
            results = []
            
            for email in emails:
                try:
                    classification = service.classify_email(str(email.id))
                    
                    if classification['success']:
                        classified_count += 1
                        results.append({
                            'email_id': str(email.id),
                            'from': email.from_email,
                            'subject': email.subject[:50],
                            'category': classification['category'].value,
                            'intent': classification['intent'].value,
                            'priority': classification['priority'].value,
                            'success': True
                        })
                    else:
                        failed_count += 1
                        results.append({
                            'email_id': str(email.id),
                            'error': classification.get('error'),
                            'success': False
                        })
                        
                except Exception as e:
                    logger.error(f"Failed to classify email {email.id}: {str(e)}")
                    failed_count += 1
                    results.append({
                        'email_id': str(email.id),
                        'error': str(e),
                        'success': False
                    })
            
            return {
                'success': True,
                'total_processed': len(emails),
                'classified': classified_count,
                'failed': failed_count,
                'results': results,
                'timestamp': datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Classification task failed: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }


@shared_task(name='backend.tasks.email_tasks.send_auto_responses')
def send_auto_responses(batch_size: int = 5) -> Dict[str, Any]:
    """
    Send auto-responses for classified emails that require them
    
    Args:
        batch_size: Number of auto-responses to send
        
    Returns:
        Dict with send results
    """
    try:
        from database import get_sync_db
        from services.email_service import EmailService
        from models.email_models import EmailMessage, EmailStatus
        from sqlalchemy import select, and_
        
        logger.info(f"Starting auto-response batch (size: {batch_size})")
        
        with get_sync_db() as db:
            service = EmailService(db)
            
            # Get emails needing auto-response
            query = select(EmailMessage).where(
                and_(
                    EmailMessage.status == EmailStatus.CLASSIFIED,
                    EmailMessage.requires_response == True,
                    EmailMessage.auto_response_sent == False
                )
            ).limit(batch_size)
            
            result = db.execute(query)
            emails = result.scalars().all()
            
            sent_count = 0
            failed_count = 0
            results = []
            
            for email in emails:
                try:
                    # TODO: Implement actual email sending via Gmail/Microsoft365 API
                    # For now, mark as auto-response sent
                    logger.info(f"Would send auto-response for email {email.id}")
                    
                    email.auto_response_sent = True
                    email.status = EmailStatus.AUTO_RESPONDED
                    email.responded_at = datetime.utcnow()
                    
                    db.commit()
                    
                    sent_count += 1
                    results.append({
                        'email_id': str(email.id),
                        'to': email.from_email,
                        'success': True
                    })
                    
                except Exception as e:
                    logger.error(f"Failed to send auto-response for {email.id}: {str(e)}")
                    failed_count += 1
                    results.append({
                        'email_id': str(email.id),
                        'error': str(e),
                        'success': False
                    })
            
            return {
                'success': True,
                'total_processed': len(emails),
                'sent': sent_count,
                'failed': failed_count,
                'results': results,
                'timestamp': datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Auto-response task failed: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }


@shared_task(name='backend.tasks.email_tasks.check_sla_breaches')
def check_sla_breaches() -> Dict[str, Any]:
    """
    Check for SLA breaches and send notifications
    
    Returns:
        Dict with breach check results
    """
    try:
        from database import get_sync_db
        from services.email_service import EmailService
        from models.email_models import EmailMessage, EmailStatus
        from sqlalchemy import select, and_
        
        logger.info("Checking for SLA breaches")
        
        with get_sync_db() as db:
            service = EmailService(db)
            
            now = datetime.utcnow()
            
            # Get emails that have breached SLA
            query = select(EmailMessage).where(
                and_(
                    EmailMessage.response_deadline < now,
                    EmailMessage.status.in_([
                        EmailStatus.RECEIVED,
                        EmailStatus.CLASSIFIED,
                        EmailStatus.ANALYZED,
                        EmailStatus.ASSIGNED,
                        EmailStatus.IN_PROGRESS
                    ]),
                    EmailMessage.responded_at.is_(None)
                )
            )
            
            result = db.execute(query)
            breached_emails = result.scalars().all()
            
            breaches = []
            
            for email in breached_emails:
                breach_time = now - email.response_deadline
                breach_hours = breach_time.total_seconds() / 3600
                
                breaches.append({
                    'email_id': str(email.id),
                    'from': email.from_email,
                    'subject': email.subject[:50],
                    'category': email.category.value if email.category else None,
                    'priority': email.priority.value,
                    'assigned_to': str(email.assigned_user_id) if email.assigned_user_id else None,
                    'deadline': email.response_deadline.isoformat(),
                    'breach_hours': round(breach_hours, 2)
                })
                
                # Mark as important if not already
                if not email.is_important:
                    email.is_important = True
            
            if breaches:
                db.commit()
                logger.warning(f"Found {len(breaches)} SLA breaches")
                
                # TODO: Send notifications to managers/assigned users
            
            return {
                'success': True,
                'total_breaches': len(breaches),
                'breaches': breaches,
                'timestamp': datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        logger.error(f"SLA breach check failed: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }


@shared_task(name='backend.tasks.email_tasks.aggregate_daily_analytics')
def aggregate_daily_analytics(date: Optional[str] = None) -> Dict[str, Any]:
    """
    Aggregate daily email analytics
    
    Args:
        date: Date to aggregate (YYYY-MM-DD), defaults to yesterday
        
    Returns:
        Dict with aggregation results
    """
    try:
        from database import get_sync_db
        from services.email_service import EmailService
        from models.email_models import EmailMessage, EmailAccount, EmailAnalytics
        from sqlalchemy import select, func, and_, extract
        
        # Parse date or use yesterday
        if date:
            target_date = datetime.fromisoformat(date).replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            target_date = (datetime.utcnow() - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        
        next_date = target_date + timedelta(days=1)
        
        logger.info(f"Aggregating email analytics for {target_date.date()}")
        
        with get_sync_db() as db:
            service = EmailService(db)
            
            # Get all accounts
            accounts = service.get_email_accounts(active_only=False)
            
            aggregated_count = 0
            
            for account in accounts:
                try:
                    # Count received emails
                    received_query = select(func.count(EmailMessage.id)).where(
                        and_(
                            EmailMessage.account_id == account.id,
                            EmailMessage.received_at >= target_date,
                            EmailMessage.received_at < next_date
                        )
                    )
                    total_received = db.execute(received_query).scalar()
                    
                    # Count sent responses
                    sent_query = select(func.count(EmailMessage.id)).where(
                        and_(
                            EmailMessage.account_id == account.id,
                            EmailMessage.responded_at >= target_date,
                            EmailMessage.responded_at < next_date
                        )
                    )
                    total_sent = db.execute(sent_query).scalar()
                    
                    # Calculate average response time
                    response_time_query = select(
                        func.avg(
                            extract('epoch', EmailMessage.responded_at - EmailMessage.received_at) / 60
                        )
                    ).where(
                        and_(
                            EmailMessage.account_id == account.id,
                            EmailMessage.received_at >= target_date,
                            EmailMessage.received_at < next_date,
                            EmailMessage.responded_at.isnot(None)
                        )
                    )
                    avg_response_time = db.execute(response_time_query).scalar() or 0.0
                    
                    # Count sentiment distribution
                    sentiment_query = select(
                        EmailMessage.sentiment,
                        func.count(EmailMessage.id)
                    ).where(
                        and_(
                            EmailMessage.account_id == account.id,
                            EmailMessage.received_at >= target_date,
                            EmailMessage.received_at < next_date
                        )
                    ).group_by(EmailMessage.sentiment)
                    
                    sentiment_results = db.execute(sentiment_query).all()
                    sentiment_dist = {}
                    for sentiment, count in sentiment_results:
                        if sentiment == 'positive':
                            sentiment_dist['positive'] = count
                        elif sentiment == 'negative':
                            sentiment_dist['negative'] = count
                        else:
                            sentiment_dist['neutral'] = sentiment_dist.get('neutral', 0) + count
                    
                    # Create or update analytics record
                    analytics = EmailAnalytics(
                        date=target_date,
                        account_id=account.id,
                        total_received=total_received,
                        total_sent=total_sent,
                        avg_response_time=avg_response_time,
                        sentiment_positive_count=sentiment_dist.get('positive', 0),
                        sentiment_negative_count=sentiment_dist.get('negative', 0),
                        sentiment_neutral_count=sentiment_dist.get('neutral', 0)
                    )
                    
                    # Check if record exists
                    existing = db.execute(
                        select(EmailAnalytics).where(
                            and_(
                                EmailAnalytics.date == target_date,
                                EmailAnalytics.account_id == account.id,
                                EmailAnalytics.category.is_(None)
                            )
                        )
                    ).scalar_one_or_none()
                    
                    if existing:
                        # Update existing
                        existing.total_received = total_received
                        existing.total_sent = total_sent
                        existing.avg_response_time = avg_response_time
                        existing.sentiment_positive_count = sentiment_dist.get('positive', 0)
                        existing.sentiment_negative_count = sentiment_dist.get('negative', 0)
                        existing.sentiment_neutral_count = sentiment_dist.get('neutral', 0)
                        existing.updated_at = datetime.utcnow()
                    else:
                        # Insert new
                        db.add(analytics)
                    
                    aggregated_count += 1
                    
                except Exception as e:
                    logger.error(f"Failed to aggregate for account {account.email_address}: {str(e)}")
            
            db.commit()
            
            return {
                'success': True,
                'date': target_date.date().isoformat(),
                'accounts_processed': aggregated_count,
                'timestamp': datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Analytics aggregation failed: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }


@shared_task(name='backend.tasks.email_tasks.sync_email_account')
def sync_email_account(account_id: str, full_sync: bool = False) -> Dict[str, Any]:
    """
    Sync specific email account with provider
    
    Args:
        account_id: Email account ID to sync
        full_sync: Whether to do full sync or incremental
        
    Returns:
        Dict with sync results
    """
    try:
        from database import get_sync_db
        from services.email_service import EmailService
        
        logger.info(f"Syncing email account {account_id} (full_sync={full_sync})")
        
        with get_sync_db() as db:
            service = EmailService(db)
            account = service.get_email_account(account_id)
            
            if not account:
                return {
                    'success': False,
                    'error': 'Account not found'
                }
            
            # TODO: Implement actual sync with Gmail/Microsoft365 API
            logger.info(f"Would sync {account.email_address} via {account.provider}")
            
            # Update last_sync_at
            account.last_sync_at = datetime.utcnow()
            db.commit()
            
            return {
                'success': True,
                'account_id': account_id,
                'email_address': account.email_address,
                'provider': account.provider,
                'full_sync': full_sync,
                'last_sync_at': account.last_sync_at.isoformat(),
                'timestamp': datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Account sync failed: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }
