"""
Email Provider Router - Intelligent Email Routing with Failover
Sistema inteligente de enrutamiento de emails con failover automático

Features:
- Automatic provider selection based on priority, weight, and health
- Load balancing across multiple providers
- Automatic failover on provider failure
- Circuit breaker pattern for unhealthy providers
- Cost optimization (prefer cheaper providers when possible)
- Rate limiting and quota management

Author: Spirit Tours Development Team
Created: October 18, 2025
"""

import asyncio
import logging
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import random

from backend.models.email_system_models import (
    EmailProvider, EmailQueue, EmailLog, EmailMetric,
    EmailProviderType, EmailProviderStatus, EmailEventType,
    EmailPriority, EmailQueueStatus
)

logger = logging.getLogger(__name__)

class EmailProviderRouter:
    """
    Intelligent router for email provider selection
    
    Selection criteria (in order):
    1. Provider must be active and healthy
    2. Provider must have capacity (not rate limited)
    3. Priority (higher = preferred)
    4. Weight (for load balancing)
    5. Cost (prefer cheaper when other factors equal)
    6. Success rate (prefer more reliable)
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.circuit_breaker_threshold = 5  # Consecutive failures before circuit break
        self.circuit_breaker_timeout = 300  # 5 minutes
        self.rate_limit_buffer = 0.9  # Use 90% of limits to avoid hitting ceiling
    
    async def select_provider(
        self,
        email_priority: EmailPriority = EmailPriority.NORMAL,
        preferred_provider_ids: Optional[List[str]] = None,
        exclude_provider_ids: Optional[List[str]] = None,
        email_category: Optional[str] = None
    ) -> Optional[EmailProvider]:
        """
        Select the best available email provider
        
        Args:
            email_priority: Priority of the email (urgent, high, normal, low)
            preferred_provider_ids: List of preferred provider IDs
            exclude_provider_ids: List of provider IDs to exclude
            email_category: Email category (transactional, marketing, etc.)
        
        Returns:
            Selected EmailProvider or None if no provider available
        """
        try:
            # Get all active providers
            providers = self._get_available_providers(exclude_provider_ids)
            
            if not providers:
                logger.error("No email providers available")
                return None
            
            # Filter by preferred providers if specified
            if preferred_provider_ids:
                preferred = [p for p in providers if str(p.id) in preferred_provider_ids]
                if preferred:
                    providers = preferred
            
            # Filter out unhealthy providers
            healthy_providers = [p for p in providers if self._is_provider_healthy(p)]
            
            if not healthy_providers:
                logger.warning("No healthy providers, attempting to use degraded providers")
                # Try to use degraded providers as last resort
                healthy_providers = providers[:3]  # Take top 3 by priority
            
            # Filter by capacity (rate limits)
            available_providers = [
                p for p in healthy_providers 
                if self._has_capacity(p, email_priority)
            ]
            
            if not available_providers:
                logger.warning("All providers at capacity, queueing email")
                return None
            
            # Select provider based on priority, weight, and cost
            selected_provider = self._select_best_provider(
                available_providers, 
                email_priority,
                email_category
            )
            
            logger.info(
                f"Selected provider: {selected_provider.name} "
                f"(type: {selected_provider.provider_type.value}, "
                f"priority: {selected_provider.priority})"
            )
            
            return selected_provider
            
        except Exception as e:
            logger.error(f"Error selecting provider: {str(e)}", exc_info=True)
            return None
    
    def _get_available_providers(
        self, 
        exclude_ids: Optional[List[str]] = None
    ) -> List[EmailProvider]:
        """Get all active providers, ordered by priority"""
        query = self.db.query(EmailProvider).filter(
            EmailProvider.is_active == True,
            EmailProvider.status.in_([
                EmailProviderStatus.ACTIVE,
                EmailProviderStatus.TESTING
            ])
        )
        
        if exclude_ids:
            query = query.filter(~EmailProvider.id.in_(exclude_ids))
        
        # Order by priority (descending) and then by weight
        providers = query.order_by(
            EmailProvider.priority.desc(),
            EmailProvider.weight.desc()
        ).all()
        
        return providers
    
    def _is_provider_healthy(self, provider: EmailProvider) -> bool:
        """
        Check if provider is healthy
        
        Circuit breaker logic:
        - If consecutive_failures >= threshold: check if timeout has passed
        - If success_rate < 80%: consider degraded but usable
        - If success_rate < 50%: consider unhealthy
        """
        # Check circuit breaker
        if provider.consecutive_failures >= self.circuit_breaker_threshold:
            if provider.last_health_check:
                time_since_check = datetime.now(timezone.utc) - provider.last_health_check
                if time_since_check.total_seconds() < self.circuit_breaker_timeout:
                    logger.warning(
                        f"Provider {provider.name} in circuit breaker state "
                        f"({provider.consecutive_failures} failures)"
                    )
                    return False
        
        # Check success rate
        if provider.success_rate < 50.0:
            logger.warning(
                f"Provider {provider.name} has low success rate: {provider.success_rate}%"
            )
            return False
        
        # Check status
        if provider.status in [EmailProviderStatus.ERROR, EmailProviderStatus.QUOTA_EXCEEDED]:
            return False
        
        return True
    
    def _has_capacity(self, provider: EmailProvider, priority: EmailPriority) -> bool:
        """
        Check if provider has capacity to send emails
        
        Consider:
        - Daily limit
        - Hourly limit
        - Monthly limit
        - Rate limit status
        """
        # Check if provider is rate limited
        if provider.status == EmailProviderStatus.RATE_LIMITED:
            logger.warning(f"Provider {provider.name} is rate limited")
            return False
        
        # Check daily limit
        if provider.max_emails_per_day > 0:
            daily_used = provider.emails_sent_today
            daily_limit = provider.max_emails_per_day * self.rate_limit_buffer
            if daily_used >= daily_limit:
                logger.warning(
                    f"Provider {provider.name} at daily capacity: "
                    f"{daily_used}/{provider.max_emails_per_day}"
                )
                return False
        
        # Check monthly limit
        if provider.max_emails_per_month > 0:
            monthly_used = provider.emails_sent_this_month
            monthly_limit = provider.max_emails_per_month * self.rate_limit_buffer
            if monthly_used >= monthly_limit:
                logger.warning(
                    f"Provider {provider.name} at monthly capacity: "
                    f"{monthly_used}/{provider.max_emails_per_month}"
                )
                return False
        
        # For urgent emails, be more lenient (use full capacity)
        if priority == EmailPriority.URGENT:
            return True
        
        return True
    
    def _select_best_provider(
        self,
        providers: List[EmailProvider],
        priority: EmailPriority,
        category: Optional[str] = None
    ) -> EmailProvider:
        """
        Select the best provider from available list
        
        Algorithm:
        1. For URGENT priority: Choose highest priority provider
        2. For other priorities: Use weighted random selection
        3. Consider cost for marketing emails
        """
        if not providers:
            return None
        
        # For urgent emails, always use highest priority provider
        if priority == EmailPriority.URGENT:
            return providers[0]  # Already sorted by priority
        
        # For marketing emails, prefer cheaper providers
        if category == "marketing":
            providers_sorted = sorted(
                providers,
                key=lambda p: (
                    -p.priority,  # Higher priority first
                    p.cost_per_email_usd,  # Lower cost first
                    -p.success_rate  # Higher success rate first
                )
            )
            return providers_sorted[0]
        
        # Weighted random selection for load balancing
        return self._weighted_random_selection(providers)
    
    def _weighted_random_selection(self, providers: List[EmailProvider]) -> EmailProvider:
        """
        Select provider using weighted random algorithm
        
        Weight factors:
        - Provider weight setting (configured)
        - Success rate
        - Inverse of cost
        """
        weights = []
        for provider in providers:
            # Base weight from configuration
            weight = provider.weight
            
            # Adjust by success rate (normalize to 0-1)
            weight *= (provider.success_rate / 100.0)
            
            # Adjust by cost (prefer cheaper, but not too heavily)
            if provider.cost_per_email_usd > 0:
                # Inverse cost, normalized
                cost_factor = 1.0 / (1.0 + provider.cost_per_email_usd * 1000)
                weight *= (0.7 + 0.3 * cost_factor)  # Cost is 30% of weight factor
            
            weights.append(weight)
        
        # Weighted random choice
        total_weight = sum(weights)
        if total_weight == 0:
            return providers[0]
        
        normalized_weights = [w / total_weight for w in weights]
        selected = random.choices(providers, weights=normalized_weights, k=1)[0]
        
        return selected
    
    async def get_fallback_provider(
        self,
        failed_provider: EmailProvider,
        exclude_ids: List[str]
    ) -> Optional[EmailProvider]:
        """
        Get fallback provider when a provider fails
        
        Args:
            failed_provider: The provider that failed
            exclude_ids: Provider IDs to exclude (including failed provider)
        
        Returns:
            Fallback provider or None
        """
        # First try configured fallback
        if failed_provider.fallback_provider_id:
            fallback = self.db.query(EmailProvider).filter(
                EmailProvider.id == failed_provider.fallback_provider_id,
                EmailProvider.is_active == True
            ).first()
            
            if fallback and self._is_provider_healthy(fallback):
                logger.info(
                    f"Using configured fallback: {fallback.name} "
                    f"for failed provider: {failed_provider.name}"
                )
                return fallback
        
        # Otherwise, select any available provider
        exclude_ids_with_failed = exclude_ids + [str(failed_provider.id)]
        return await self.select_provider(
            email_priority=EmailPriority.HIGH,  # Fallback gets high priority
            exclude_provider_ids=exclude_ids_with_failed
        )
    
    def record_provider_success(self, provider: EmailProvider, send_time_ms: int):
        """
        Record successful email send
        
        Updates:
        - Increment sent counters
        - Reset consecutive failures
        - Update success rate
        - Update last used timestamp
        """
        try:
            provider.emails_sent_today += 1
            provider.emails_sent_this_month += 1
            provider.total_emails_sent += 1
            provider.consecutive_failures = 0
            provider.last_used_at = datetime.now(timezone.utc)
            
            # Update success rate (exponential moving average)
            if provider.total_emails_sent > 0:
                total = provider.total_emails_sent + provider.total_emails_failed
                provider.success_rate = (provider.total_emails_sent / total) * 100
            
            # If provider was in error state, reactivate
            if provider.status == EmailProviderStatus.ERROR:
                provider.status = EmailProviderStatus.ACTIVE
            
            self.db.commit()
            
            logger.debug(
                f"Provider {provider.name} success recorded. "
                f"Total sent: {provider.total_emails_sent}, "
                f"Success rate: {provider.success_rate:.2f}%"
            )
            
        except Exception as e:
            logger.error(f"Error recording provider success: {str(e)}")
            self.db.rollback()
    
    def record_provider_failure(
        self, 
        provider: EmailProvider, 
        error_message: str,
        error_details: Optional[Dict[str, Any]] = None
    ):
        """
        Record failed email send
        
        Updates:
        - Increment failure counters
        - Increment consecutive failures
        - Update success rate
        - Potentially activate circuit breaker
        """
        try:
            provider.total_emails_failed += 1
            provider.consecutive_failures += 1
            
            # Update success rate
            if provider.total_emails_sent + provider.total_emails_failed > 0:
                total = provider.total_emails_sent + provider.total_emails_failed
                provider.success_rate = (provider.total_emails_sent / total) * 100
            
            # Activate circuit breaker if threshold reached
            if provider.consecutive_failures >= self.circuit_breaker_threshold:
                provider.status = EmailProviderStatus.ERROR
                logger.error(
                    f"Provider {provider.name} circuit breaker activated! "
                    f"{provider.consecutive_failures} consecutive failures"
                )
            
            # Store last error
            provider.health_check_result = {
                'error': error_message,
                'details': error_details,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            provider.last_health_check = datetime.now(timezone.utc)
            
            self.db.commit()
            
            logger.warning(
                f"Provider {provider.name} failure recorded. "
                f"Consecutive failures: {provider.consecutive_failures}, "
                f"Error: {error_message}"
            )
            
        except Exception as e:
            logger.error(f"Error recording provider failure: {str(e)}")
            self.db.rollback()
    
    async def health_check_provider(self, provider: EmailProvider) -> bool:
        """
        Perform health check on a provider
        
        Returns:
            True if provider is healthy, False otherwise
        """
        try:
            # Update last health check time
            provider.last_health_check = datetime.now(timezone.utc)
            
            # For SMTP providers, try to connect
            if provider.provider_type in [EmailProviderType.SMTP_OWN, EmailProviderType.SMTP_EXTERNAL]:
                result = await self._health_check_smtp(provider)
            else:
                # For API providers, try to call health endpoint
                result = await self._health_check_api(provider)
            
            if result:
                provider.consecutive_failures = 0
                provider.status = EmailProviderStatus.ACTIVE
                provider.health_check_result = {
                    'status': 'healthy',
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
            else:
                provider.consecutive_failures += 1
                if provider.consecutive_failures >= self.circuit_breaker_threshold:
                    provider.status = EmailProviderStatus.ERROR
            
            self.db.commit()
            return result
            
        except Exception as e:
            logger.error(f"Health check failed for {provider.name}: {str(e)}")
            provider.consecutive_failures += 1
            provider.health_check_result = {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            self.db.commit()
            return False
    
    async def _health_check_smtp(self, provider: EmailProvider) -> bool:
        """Health check for SMTP providers"""
        try:
            import aiosmtplib
            
            # Try to connect to SMTP server
            timeout = 10  # 10 seconds timeout
            
            if provider.smtp_use_ssl:
                smtp = aiosmtplib.SMTP(
                    hostname=provider.smtp_host,
                    port=provider.smtp_port,
                    use_tls=False,
                    timeout=timeout
                )
            else:
                smtp = aiosmtplib.SMTP(
                    hostname=provider.smtp_host,
                    port=provider.smtp_port,
                    use_tls=provider.smtp_use_tls,
                    timeout=timeout
                )
            
            await smtp.connect()
            
            # Try to login if credentials provided
            if provider.smtp_username and provider.smtp_password_encrypted:
                # TODO: Decrypt password before login
                # await smtp.login(provider.smtp_username, decrypted_password)
                pass
            
            await smtp.quit()
            
            logger.info(f"SMTP health check passed for {provider.name}")
            return True
            
        except Exception as e:
            logger.error(f"SMTP health check failed for {provider.name}: {str(e)}")
            return False
    
    async def _health_check_api(self, provider: EmailProvider) -> bool:
        """Health check for API-based providers"""
        try:
            import aiohttp
            
            # Different health endpoints for different providers
            health_endpoints = {
                EmailProviderType.SENDGRID: "https://api.sendgrid.com/v3/mail/batch",
                EmailProviderType.MAILGUN: f"{provider.api_endpoint}/domains",
                EmailProviderType.AWS_SES: None,  # SES doesn't have a simple health endpoint
            }
            
            endpoint = health_endpoints.get(provider.provider_type)
            if not endpoint:
                # No specific health check, assume healthy if configured
                return True
            
            async with aiohttp.ClientSession() as session:
                headers = {}
                if provider.provider_type == EmailProviderType.SENDGRID:
                    # TODO: Decrypt API key
                    # headers['Authorization'] = f'Bearer {api_key}'
                    pass
                
                async with session.get(endpoint, headers=headers, timeout=10) as response:
                    return response.status in [200, 201, 204]
            
        except Exception as e:
            logger.error(f"API health check failed for {provider.name}: {str(e)}")
            return False
    
    def get_provider_statistics(self) -> Dict[str, Any]:
        """
        Get statistics for all providers
        
        Returns:
            Dictionary with provider statistics
        """
        try:
            providers = self.db.query(EmailProvider).all()
            
            stats = {
                'total_providers': len(providers),
                'active_providers': sum(1 for p in providers if p.is_active),
                'healthy_providers': sum(1 for p in providers if self._is_provider_healthy(p)),
                'providers': []
            }
            
            for provider in providers:
                provider_stats = {
                    'id': str(provider.id),
                    'name': provider.name,
                    'type': provider.provider_type.value,
                    'status': provider.status.value,
                    'is_active': provider.is_active,
                    'is_healthy': self._is_provider_healthy(provider),
                    'priority': provider.priority,
                    'weight': provider.weight,
                    'success_rate': provider.success_rate,
                    'emails_sent_today': provider.emails_sent_today,
                    'emails_sent_this_month': provider.emails_sent_this_month,
                    'total_emails_sent': provider.total_emails_sent,
                    'total_emails_failed': provider.total_emails_failed,
                    'consecutive_failures': provider.consecutive_failures,
                    'cost_per_email_usd': provider.cost_per_email_usd,
                    'last_used_at': provider.last_used_at.isoformat() if provider.last_used_at else None,
                    'last_health_check': provider.last_health_check.isoformat() if provider.last_health_check else None
                }
                stats['providers'].append(provider_stats)
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting provider statistics: {str(e)}")
            return {'error': str(e)}
    
    def reset_daily_counters(self):
        """Reset daily email counters for all providers (run daily via cron)"""
        try:
            providers = self.db.query(EmailProvider).all()
            for provider in providers:
                provider.emails_sent_today = 0
            self.db.commit()
            logger.info("Daily email counters reset for all providers")
        except Exception as e:
            logger.error(f"Error resetting daily counters: {str(e)}")
            self.db.rollback()
    
    def reset_monthly_counters(self):
        """Reset monthly email counters for all providers (run monthly via cron)"""
        try:
            providers = self.db.query(EmailProvider).all()
            for provider in providers:
                provider.emails_sent_this_month = 0
            self.db.commit()
            logger.info("Monthly email counters reset for all providers")
        except Exception as e:
            logger.error(f"Error resetting monthly counters: {str(e)}")
            self.db.rollback()


class EmailRoutingStrategy:
    """
    Different routing strategies for different scenarios
    """
    
    @staticmethod
    def cost_optimized(providers: List[EmailProvider]) -> EmailProvider:
        """Select cheapest provider"""
        return min(providers, key=lambda p: p.cost_per_email_usd)
    
    @staticmethod
    def reliability_optimized(providers: List[EmailProvider]) -> EmailProvider:
        """Select most reliable provider"""
        return max(providers, key=lambda p: p.success_rate)
    
    @staticmethod
    def speed_optimized(providers: List[EmailProvider]) -> EmailProvider:
        """Select fastest provider (highest priority)"""
        return max(providers, key=lambda p: p.priority)
    
    @staticmethod
    def balanced(providers: List[EmailProvider]) -> EmailProvider:
        """Balance between cost, reliability, and speed"""
        def score(p: EmailProvider) -> float:
            cost_score = 1.0 / (1.0 + p.cost_per_email_usd * 1000) if p.cost_per_email_usd > 0 else 1.0
            reliability_score = p.success_rate / 100.0
            speed_score = p.priority / 10.0  # Normalize priority
            return (cost_score * 0.3) + (reliability_score * 0.5) + (speed_score * 0.2)
        
        return max(providers, key=score)
