"""
Advanced Access Control Service for Virtual Guide AI
Manages temporal access, fraud prevention, and multi-level permissions
"""

import asyncio
import json
import logging
import hashlib
import secrets
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta, date
from dataclasses import dataclass
from enum import Enum
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, update

from ..models import User, Booking, Agency, Trip
from ..cache.redis_cache import RedisCache
from ..services.notification_service import NotificationService

logger = logging.getLogger(__name__)

class AccessLevel(str, Enum):
    """Access levels for Virtual Guide AI"""
    BLOCKED = "blocked"  # Completely blocked
    DEMO = "demo"  # Limited demo access
    BASIC = "basic"  # Basic features only
    STANDARD = "standard"  # Standard trip access
    PREMIUM = "premium"  # Premium features
    VIP = "vip"  # All features + extended time
    AGENCY = "agency"  # Agency-level access
    UNLIMITED = "unlimited"  # Unlimited access
    DEVELOPER = "developer"  # Developer/testing access

class AccessType(str, Enum):
    """Types of access grants"""
    TRIP_BASED = "trip_based"  # Based on booked trip
    TIME_LIMITED = "time_limited"  # Limited time period
    USAGE_LIMITED = "usage_limited"  # Limited number of uses
    FEATURE_LIMITED = "feature_limited"  # Limited features
    LOCATION_LIMITED = "location_limited"  # Limited to specific locations
    SUBSCRIPTION = "subscription"  # Subscription-based
    PROMOTIONAL = "promotional"  # Promotional access
    AGENCY_DELEGATED = "agency_delegated"  # Delegated by agency

class AccessStatus(str, Enum):
    """Status of access grant"""
    PENDING = "pending"  # Not yet active
    ACTIVE = "active"  # Currently active
    EXPIRED = "expired"  # Time expired
    REVOKED = "revoked"  # Manually revoked
    SUSPENDED = "suspended"  # Temporarily suspended
    EXHAUSTED = "exhausted"  # Usage limit reached

@dataclass
class AccessGrant:
    """Individual access grant for a user"""
    grant_id: str
    user_id: str
    access_level: AccessLevel
    access_type: AccessType
    status: AccessStatus
    
    # Temporal controls
    activation_date: datetime
    expiration_date: Optional[datetime]
    pre_trip_days: int = 14  # Days before trip to activate
    post_trip_days: int = 14  # Days after trip to deactivate
    
    # Trip-based controls
    trip_id: Optional[str] = None
    allowed_destinations: List[int] = None  # Destination IDs
    
    # Usage controls
    usage_limit: Optional[int] = None
    usage_count: int = 0
    daily_limit: Optional[int] = None
    
    # Feature controls
    allowed_features: List[str] = None
    blocked_features: List[str] = None
    allowed_personalities: List[str] = None
    
    # Agency controls
    agency_id: Optional[str] = None
    granted_by: Optional[str] = None  # Admin or agency that granted
    
    # Security
    ip_whitelist: List[str] = None
    device_whitelist: List[str] = None
    require_2fa: bool = False
    watermark_enabled: bool = True
    
    # Metadata
    created_at: datetime = None
    updated_at: datetime = None
    notes: Optional[str] = None

class AccessControlService:
    """Advanced access control for Virtual Guide AI system"""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.cache = RedisCache()
        self.notification_service = NotificationService()
        self.active_grants: Dict[str, AccessGrant] = {}
        
        # Start background tasks
        asyncio.create_task(self._monitor_access_expiration())
        asyncio.create_task(self._detect_fraud_patterns())
    
    async def create_trip_based_access(
        self,
        user_id: str,
        trip_id: str,
        booking_id: str,
        pre_trip_days: int = 14,
        post_trip_days: int = 14
    ) -> AccessGrant:
        """Create access based on trip booking"""
        
        # Get trip details
        trip = await self.db.get(Trip, trip_id)
        booking = await self.db.get(Booking, booking_id)
        
        if not trip or not booking:
            raise ValueError("Trip or booking not found")
        
        # Calculate access window
        trip_start = trip.start_date
        trip_end = trip.end_date
        
        activation_date = trip_start - timedelta(days=pre_trip_days)
        expiration_date = trip_end + timedelta(days=post_trip_days)
        
        # Get allowed destinations from trip
        allowed_destinations = trip.destination_ids
        
        # Create access grant
        grant = AccessGrant(
            grant_id=f"grant_{user_id}_{trip_id}_{datetime.utcnow().timestamp()}",
            user_id=user_id,
            access_level=AccessLevel.STANDARD,
            access_type=AccessType.TRIP_BASED,
            status=AccessStatus.PENDING if datetime.utcnow() < activation_date else AccessStatus.ACTIVE,
            activation_date=activation_date,
            expiration_date=expiration_date,
            pre_trip_days=pre_trip_days,
            post_trip_days=post_trip_days,
            trip_id=trip_id,
            allowed_destinations=allowed_destinations,
            allowed_features=[
                "virtual_guide",
                "navigation",
                "offline_maps",
                "voice_interaction",
                "multi_language",
                "personality_selection"
            ],
            watermark_enabled=True,
            created_at=datetime.utcnow()
        )
        
        # Store in database
        await self._store_access_grant(grant)
        
        # Cache for quick lookup
        await self._cache_access_grant(grant)
        
        # Send notification
        await self.notification_service.send_notification(
            user_id=user_id,
            title="Virtual Guide Access Activated",
            message=f"Your Virtual Guide AI will be available from {activation_date.date()} to {expiration_date.date()}",
            data={"grant_id": grant.grant_id}
        )
        
        logger.info(f"Created trip-based access for user {user_id}, trip {trip_id}")
        
        return grant
    
    async def grant_admin_access(
        self,
        admin_id: str,
        target_user_email: str,
        access_level: AccessLevel,
        duration_days: Optional[int] = None,
        features: Optional[List[str]] = None,
        destinations: Optional[List[int]] = None,
        notes: Optional[str] = None
    ) -> AccessGrant:
        """Admin grants access to a specific user"""
        
        # Find user by email
        user = await self.db.query(User).filter_by(email=target_user_email).first()
        
        if not user:
            # Create pending grant for email
            user_id = f"pending_{target_user_email}"
        else:
            user_id = user.id
        
        # Calculate dates
        activation_date = datetime.utcnow()
        expiration_date = None if duration_days is None else activation_date + timedelta(days=duration_days)
        
        # Create grant
        grant = AccessGrant(
            grant_id=f"admin_grant_{user_id}_{datetime.utcnow().timestamp()}",
            user_id=user_id,
            access_level=access_level,
            access_type=AccessType.TIME_LIMITED if duration_days else AccessType.UNLIMITED,
            status=AccessStatus.ACTIVE,
            activation_date=activation_date,
            expiration_date=expiration_date,
            allowed_destinations=destinations,
            allowed_features=features or self._get_features_for_level(access_level),
            granted_by=admin_id,
            notes=notes,
            watermark_enabled=access_level not in [AccessLevel.VIP, AccessLevel.UNLIMITED],
            created_at=datetime.utcnow()
        )
        
        # Store and cache
        await self._store_access_grant(grant)
        await self._cache_access_grant(grant)
        
        # Send notification
        if user:
            await self.notification_service.send_notification(
                user_id=user.id,
                title="Virtual Guide Access Granted",
                message=f"An administrator has granted you {access_level.value} access to Virtual Guide AI",
                data={"grant_id": grant.grant_id}
            )
        
        # Log admin action
        await self._log_admin_action(admin_id, "grant_access", {
            "target_user": target_user_email,
            "access_level": access_level.value,
            "duration_days": duration_days
        })
        
        return grant
    
    async def revoke_access(
        self,
        admin_id: str,
        target_identifier: str,  # email, user_id, or grant_id
        reason: str
    ) -> bool:
        """Revoke access for a user"""
        
        # Find grants to revoke
        grants = await self._find_grants_by_identifier(target_identifier)
        
        if not grants:
            logger.warning(f"No grants found for {target_identifier}")
            return False
        
        # Revoke all found grants
        for grant in grants:
            grant.status = AccessStatus.REVOKED
            grant.updated_at = datetime.utcnow()
            
            # Update database
            await self._update_access_grant(grant)
            
            # Remove from cache
            await self._invalidate_cache(grant.user_id)
            
            # Send notification
            await self.notification_service.send_notification(
                user_id=grant.user_id,
                title="Virtual Guide Access Revoked",
                message=f"Your Virtual Guide AI access has been revoked. Reason: {reason}",
                data={"grant_id": grant.grant_id}
            )
        
        # Log admin action
        await self._log_admin_action(admin_id, "revoke_access", {
            "target": target_identifier,
            "reason": reason,
            "grants_revoked": len(grants)
        })
        
        return True
    
    async def grant_agency_access(
        self,
        agency_id: str,
        access_level: AccessLevel = AccessLevel.AGENCY,
        client_limit: Optional[int] = None,
        valid_until: Optional[datetime] = None,
        allowed_features: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Grant access to a travel agency"""
        
        agency = await self.db.get(Agency, agency_id)
        
        if not agency:
            raise ValueError(f"Agency {agency_id} not found")
        
        # Create agency access configuration
        agency_config = {
            "agency_id": agency_id,
            "access_level": access_level.value,
            "client_limit": client_limit,
            "valid_until": valid_until.isoformat() if valid_until else None,
            "allowed_features": allowed_features or [
                "virtual_guide",
                "trip_planning",
                "group_management",
                "client_delegation",
                "analytics_basic"
            ],
            "delegation_enabled": True,
            "can_grant_access": True,
            "max_grant_duration_days": 365,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Store agency configuration
        await self.cache.set(
            f"agency_access:{agency_id}",
            json.dumps(agency_config),
            expire=86400 * 365  # 1 year
        )
        
        # Update agency status in database
        agency.virtual_guide_enabled = True
        agency.virtual_guide_config = agency_config
        await self.db.commit()
        
        return agency_config
    
    async def delegate_agency_access(
        self,
        agency_id: str,
        client_email: str,
        trip_id: Optional[str] = None,
        duration_days: int = 30,
        features: Optional[List[str]] = None
    ) -> AccessGrant:
        """Agency delegates access to their client"""
        
        # Verify agency has delegation rights
        agency_config = await self._get_agency_config(agency_id)
        
        if not agency_config or not agency_config.get('delegation_enabled'):
            raise ValueError("Agency not authorized to delegate access")
        
        # Check agency limits
        if agency_config.get('client_limit'):
            current_clients = await self._count_agency_active_grants(agency_id)
            if current_clients >= agency_config['client_limit']:
                raise ValueError("Agency client limit reached")
        
        # Create delegated grant
        grant = AccessGrant(
            grant_id=f"agency_{agency_id}_{datetime.utcnow().timestamp()}",
            user_id=client_email,  # Will be resolved when user registers
            access_level=AccessLevel.BASIC,
            access_type=AccessType.AGENCY_DELEGATED,
            status=AccessStatus.ACTIVE,
            activation_date=datetime.utcnow(),
            expiration_date=datetime.utcnow() + timedelta(days=duration_days),
            trip_id=trip_id,
            allowed_features=features or ["virtual_guide", "navigation"],
            agency_id=agency_id,
            granted_by=agency_id,
            watermark_enabled=True,
            created_at=datetime.utcnow()
        )
        
        # Store and cache
        await self._store_access_grant(grant)
        await self._cache_access_grant(grant)
        
        return grant
    
    async def check_access(
        self,
        user_id: str,
        destination_id: Optional[int] = None,
        feature: Optional[str] = None,
        ip_address: Optional[str] = None,
        device_id: Optional[str] = None
    ) -> Tuple[bool, Optional[AccessGrant], Optional[str]]:
        """Check if user has access to Virtual Guide AI"""
        
        # Get all active grants for user
        grants = await self._get_user_active_grants(user_id)
        
        if not grants:
            return False, None, "No active access grants found"
        
        # Check each grant
        for grant in grants:
            # Check status
            if grant.status != AccessStatus.ACTIVE:
                continue
            
            # Check temporal validity
            now = datetime.utcnow()
            if grant.activation_date > now:
                continue
            if grant.expiration_date and grant.expiration_date < now:
                grant.status = AccessStatus.EXPIRED
                await self._update_access_grant(grant)
                continue
            
            # Check destination access
            if destination_id and grant.allowed_destinations:
                if destination_id not in grant.allowed_destinations:
                    continue
            
            # Check feature access
            if feature:
                if grant.blocked_features and feature in grant.blocked_features:
                    continue
                if grant.allowed_features and feature not in grant.allowed_features:
                    continue
            
            # Check usage limits
            if grant.usage_limit and grant.usage_count >= grant.usage_limit:
                grant.status = AccessStatus.EXHAUSTED
                await self._update_access_grant(grant)
                continue
            
            # Check daily limit
            if grant.daily_limit:
                daily_usage = await self._get_daily_usage(grant.grant_id)
                if daily_usage >= grant.daily_limit:
                    continue
            
            # Check IP whitelist
            if grant.ip_whitelist and ip_address:
                if ip_address not in grant.ip_whitelist:
                    await self._log_suspicious_access(user_id, "ip_mismatch", {
                        "ip": ip_address,
                        "whitelist": grant.ip_whitelist
                    })
                    continue
            
            # Check device whitelist
            if grant.device_whitelist and device_id:
                if device_id not in grant.device_whitelist:
                    await self._log_suspicious_access(user_id, "device_mismatch", {
                        "device": device_id,
                        "whitelist": grant.device_whitelist
                    })
                    continue
            
            # Access granted - increment usage
            grant.usage_count += 1
            await self._update_access_grant(grant)
            await self._log_access_usage(grant.grant_id, destination_id, feature)
            
            return True, grant, None
        
        return False, None, "No valid grant matches access requirements"
    
    async def get_user_access_info(self, user_id: str) -> Dict[str, Any]:
        """Get detailed access information for a user"""
        
        grants = await self._get_all_user_grants(user_id)
        
        active_grants = [g for g in grants if g.status == AccessStatus.ACTIVE]
        
        # Find the best access level
        best_level = AccessLevel.BLOCKED
        for grant in active_grants:
            if self._compare_access_levels(grant.access_level, best_level) > 0:
                best_level = grant.access_level
        
        # Calculate remaining days
        remaining_days = None
        if active_grants:
            earliest_expiration = min(
                g.expiration_date for g in active_grants 
                if g.expiration_date is not None
            )
            if earliest_expiration:
                remaining_days = (earliest_expiration - datetime.utcnow()).days
        
        # Get allowed destinations
        all_destinations = set()
        for grant in active_grants:
            if grant.allowed_destinations:
                all_destinations.update(grant.allowed_destinations)
        
        # Get allowed features
        all_features = set()
        for grant in active_grants:
            if grant.allowed_features:
                all_features.update(grant.allowed_features)
        
        return {
            "user_id": user_id,
            "has_access": len(active_grants) > 0,
            "access_level": best_level.value,
            "active_grants": len(active_grants),
            "total_grants": len(grants),
            "remaining_days": remaining_days,
            "allowed_destinations": list(all_destinations),
            "allowed_features": list(all_features),
            "grants": [
                {
                    "grant_id": g.grant_id,
                    "type": g.access_type.value,
                    "status": g.status.value,
                    "activation": g.activation_date.isoformat(),
                    "expiration": g.expiration_date.isoformat() if g.expiration_date else None,
                    "usage": f"{g.usage_count}/{g.usage_limit}" if g.usage_limit else str(g.usage_count)
                }
                for g in grants
            ]
        }
    
    async def detect_fraud_attempt(
        self,
        user_id: str,
        fraud_type: str,
        details: Dict[str, Any]
    ) -> bool:
        """Detect and handle fraud attempts"""
        
        logger.warning(f"Fraud attempt detected - User: {user_id}, Type: {fraud_type}")
        
        # Log fraud attempt
        await self._log_fraud_attempt(user_id, fraud_type, details)
        
        # Get user's fraud history
        fraud_count = await self._get_user_fraud_count(user_id)
        
        # Take action based on severity
        if fraud_type in ["access_sharing", "credential_theft", "api_abuse"]:
            # Immediate suspension
            await self._suspend_all_user_grants(user_id)
            
            # Alert administrators
            await self._alert_admins_fraud(user_id, fraud_type, details)
            
            return True
        
        elif fraud_count > 3:
            # Multiple attempts - suspend
            await self._suspend_all_user_grants(user_id)
            return True
        
        elif fraud_count > 1:
            # Warning
            await self.notification_service.send_notification(
                user_id=user_id,
                title="Security Warning",
                message="Suspicious activity detected on your account. Please contact support.",
                priority="high"
            )
        
        return False
    
    # Background tasks
    
    async def _monitor_access_expiration(self):
        """Monitor and update expired access grants"""
        
        while True:
            try:
                # Get all active grants
                active_grants = await self._get_all_active_grants()
                
                now = datetime.utcnow()
                
                for grant in active_grants:
                    # Check expiration
                    if grant.expiration_date and grant.expiration_date < now:
                        grant.status = AccessStatus.EXPIRED
                        await self._update_access_grant(grant)
                        await self._invalidate_cache(grant.user_id)
                        
                        # Send notification
                        await self.notification_service.send_notification(
                            user_id=grant.user_id,
                            title="Virtual Guide Access Expired",
                            message="Your Virtual Guide AI access has expired. Contact support to renew."
                        )
                    
                    # Check activation for pending grants
                    elif grant.status == AccessStatus.PENDING and grant.activation_date <= now:
                        grant.status = AccessStatus.ACTIVE
                        await self._update_access_grant(grant)
                        
                        # Send notification
                        await self.notification_service.send_notification(
                            user_id=grant.user_id,
                            title="Virtual Guide Access Now Active",
                            message="Your Virtual Guide AI is now available!"
                        )
                
            except Exception as e:
                logger.error(f"Error monitoring access expiration: {e}")
            
            await asyncio.sleep(3600)  # Check every hour
    
    async def _detect_fraud_patterns(self):
        """Detect fraudulent usage patterns"""
        
        while True:
            try:
                # Patterns to detect:
                # 1. Multiple devices from same account
                # 2. Rapid location changes
                # 3. Excessive API calls
                # 4. Access from multiple IPs simultaneously
                # 5. Attempts to access after expiration
                
                suspicious_patterns = await self._analyze_usage_patterns()
                
                for pattern in suspicious_patterns:
                    await self.detect_fraud_attempt(
                        pattern['user_id'],
                        pattern['type'],
                        pattern['details']
                    )
                
            except Exception as e:
                logger.error(f"Error detecting fraud patterns: {e}")
            
            await asyncio.sleep(300)  # Check every 5 minutes
    
    # Helper methods
    
    def _get_features_for_level(self, level: AccessLevel) -> List[str]:
        """Get allowed features for access level"""
        
        features_map = {
            AccessLevel.DEMO: ["virtual_guide_demo", "limited_destinations"],
            AccessLevel.BASIC: ["virtual_guide", "navigation", "offline_maps"],
            AccessLevel.STANDARD: ["virtual_guide", "navigation", "offline_maps", "voice_interaction", "multi_language"],
            AccessLevel.PREMIUM: ["virtual_guide", "navigation", "offline_maps", "voice_interaction", "multi_language", "ar_mode", "group_sync"],
            AccessLevel.VIP: ["all_features"],
            AccessLevel.UNLIMITED: ["all_features", "api_access", "white_label"],
            AccessLevel.AGENCY: ["virtual_guide", "client_management", "analytics", "delegation"],
            AccessLevel.DEVELOPER: ["all_features", "debug_mode", "api_unlimited"]
        }
        
        return features_map.get(level, [])
    
    def _compare_access_levels(self, level1: AccessLevel, level2: AccessLevel) -> int:
        """Compare two access levels"""
        
        levels_order = [
            AccessLevel.BLOCKED,
            AccessLevel.DEMO,
            AccessLevel.BASIC,
            AccessLevel.STANDARD,
            AccessLevel.PREMIUM,
            AccessLevel.VIP,
            AccessLevel.AGENCY,
            AccessLevel.UNLIMITED,
            AccessLevel.DEVELOPER
        ]
        
        idx1 = levels_order.index(level1) if level1 in levels_order else -1
        idx2 = levels_order.index(level2) if level2 in levels_order else -1
        
        return idx1 - idx2
    
    async def _store_access_grant(self, grant: AccessGrant):
        """Store access grant in database"""
        # Implementation would store in database
        pass
    
    async def _update_access_grant(self, grant: AccessGrant):
        """Update access grant in database"""
        # Implementation would update database
        pass
    
    async def _cache_access_grant(self, grant: AccessGrant):
        """Cache access grant for quick lookup"""
        await self.cache.set(
            f"grant:{grant.user_id}:{grant.grant_id}",
            json.dumps(grant.__dict__, default=str),
            expire=86400  # 24 hours
        )
    
    async def _invalidate_cache(self, user_id: str):
        """Invalidate user's cached grants"""
        # Implementation would clear user's cache
        pass
    
    async def _get_user_active_grants(self, user_id: str) -> List[AccessGrant]:
        """Get all active grants for a user"""
        # Implementation would query database
        return []
    
    async def _get_all_user_grants(self, user_id: str) -> List[AccessGrant]:
        """Get all grants for a user"""
        # Implementation would query database
        return []
    
    async def _find_grants_by_identifier(self, identifier: str) -> List[AccessGrant]:
        """Find grants by email, user_id, or grant_id"""
        # Implementation would search database
        return []
    
    async def _get_agency_config(self, agency_id: str) -> Optional[Dict]:
        """Get agency configuration"""
        config = await self.cache.get(f"agency_access:{agency_id}")
        return json.loads(config) if config else None
    
    async def _count_agency_active_grants(self, agency_id: str) -> int:
        """Count active grants created by agency"""
        # Implementation would count in database
        return 0
    
    async def _get_daily_usage(self, grant_id: str) -> int:
        """Get today's usage count for a grant"""
        # Implementation would query usage logs
        return 0
    
    async def _log_access_usage(self, grant_id: str, destination_id: Optional[int], feature: Optional[str]):
        """Log access usage"""
        # Implementation would log to database
        pass
    
    async def _log_admin_action(self, admin_id: str, action: str, details: Dict):
        """Log administrator action"""
        # Implementation would log to audit table
        pass
    
    async def _log_suspicious_access(self, user_id: str, reason: str, details: Dict):
        """Log suspicious access attempt"""
        # Implementation would log to security table
        pass
    
    async def _log_fraud_attempt(self, user_id: str, fraud_type: str, details: Dict):
        """Log fraud attempt"""
        # Implementation would log to fraud table
        pass
    
    async def _get_user_fraud_count(self, user_id: str) -> int:
        """Get user's fraud attempt count"""
        # Implementation would query fraud logs
        return 0
    
    async def _suspend_all_user_grants(self, user_id: str):
        """Suspend all grants for a user"""
        grants = await self._get_all_user_grants(user_id)
        for grant in grants:
            grant.status = AccessStatus.SUSPENDED
            await self._update_access_grant(grant)
    
    async def _alert_admins_fraud(self, user_id: str, fraud_type: str, details: Dict):
        """Alert administrators about fraud"""
        # Implementation would send high-priority alerts
        pass
    
    async def _get_all_active_grants(self) -> List[AccessGrant]:
        """Get all active grants in system"""
        # Implementation would query database
        return []
    
    async def _analyze_usage_patterns(self) -> List[Dict]:
        """Analyze usage patterns for fraud detection"""
        # Implementation would analyze logs
        return []