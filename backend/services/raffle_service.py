"""
Service layer for raffle system with anti-fraud mechanisms
"""
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
import hashlib
import secrets
import qrcode
import io
import base64
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import redis
import json
import logging
from decimal import Decimal

from ..models.raffle_models import (
    Raffle, RaffleParticipant, RaffleEntry, RafflePrize,
    PointsTransaction, SocialAction, RaffleWinner,
    PointsConfiguration, LeaderBoard,
    RaffleStatus, ActionType, SocialPlatform
)

logger = logging.getLogger(__name__)

class RaffleService:
    """Main service for raffle operations"""
    
    def __init__(self, db: Session, redis_client: Optional[redis.Redis] = None):
        self.db = db
        self.redis = redis_client or redis.Redis(host='localhost', port=6379, decode_responses=True)
        self.fraud_detector = FraudDetectionService(db, self.redis)
        self.points_manager = PointsManagementService(db, self.redis)
    
    def create_raffle(self, raffle_data: Dict[str, Any]) -> Raffle:
        """Create a new raffle with QR code"""
        raffle = Raffle(**raffle_data)
        
        # Generate unique slug
        raffle.slug = self._generate_slug(raffle.name)
        
        # Generate QR code
        raffle.short_url = self._generate_short_url()
        raffle.qr_code_url = self._generate_qr_code(raffle.short_url)
        
        self.db.add(raffle)
        self.db.commit()
        
        logger.info(f"Created raffle: {raffle.id} - {raffle.name}")
        return raffle
    
    def register_participant(self, participant_data: Dict[str, Any]) -> RaffleParticipant:
        """Register a new participant with fraud checks"""
        # Check for existing participant
        existing = self.db.query(RaffleParticipant).filter_by(
            email=participant_data['email']
        ).first()
        
        if existing:
            return existing
        
        # Create participant
        participant = RaffleParticipant(**participant_data)
        
        # Generate referral code
        participant.referral_code = self._generate_referral_code()
        
        # Set initial year for seniority
        participant.year_started = datetime.now().year
        
        # Perform initial fraud check
        fraud_score = self.fraud_detector.check_participant(participant_data)
        participant.risk_score = fraud_score
        
        if fraud_score > 70:  # High risk
            participant.suspended_until = datetime.utcnow() + timedelta(days=7)
            participant.suspension_reason = "High risk score detected during registration"
        
        self.db.add(participant)
        self.db.commit()
        
        # Award welcome bonus points
        if fraud_score < 50:
            self.points_manager.award_points(
                participant.id,
                points=50,
                action_type=ActionType.FOLLOW,
                description="Welcome bonus"
            )
        
        return participant
    
    def enter_raffle(self, raffle_id: int, participant_id: int, 
                    entry_data: Dict[str, Any]) -> RaffleEntry:
        """Enter a participant into a raffle with validation"""
        raffle = self.db.query(Raffle).get(raffle_id)
        participant = self.db.query(RaffleParticipant).get(participant_id)
        
        if not raffle or not participant:
            raise ValueError("Invalid raffle or participant")
        
        # Check raffle status
        if raffle.status != RaffleStatus.ACTIVE:
            raise ValueError("Raffle is not active")
        
        # Check if already entered
        existing_entries = self.db.query(RaffleEntry).filter_by(
            raffle_id=raffle_id,
            participant_id=participant_id
        ).count()
        
        if existing_entries >= raffle.max_entries_per_user:
            raise ValueError("Maximum entries reached for this raffle")
        
        # Verify social requirements
        if raffle.require_social_follow:
            if not self._verify_social_requirements(participant, raffle.require_social_follow):
                raise ValueError("Social media requirements not met")
        
        # Check points requirement
        if raffle.points_per_entry > 0:
            if participant.available_points < raffle.points_per_entry:
                raise ValueError("Insufficient points")
            
            # Deduct points
            self.points_manager.spend_points(
                participant_id,
                raffle.points_per_entry,
                f"Raffle entry: {raffle.name}"
            )
        
        # Create entry
        entry = RaffleEntry(
            raffle_id=raffle_id,
            participant_id=participant_id,
            entry_number=self._generate_entry_number(raffle_id),
            **entry_data
        )
        
        # Fraud check on entry
        fraud_flags = self.fraud_detector.check_entry(entry, participant)
        if fraud_flags:
            entry.disqualified = True
            entry.disqualification_reason = json.dumps(fraud_flags)
        
        self.db.add(entry)
        
        # Update raffle statistics
        raffle.total_entries += 1
        if existing_entries == 0:
            raffle.total_participants += 1
        
        # Update participant statistics
        participant.raffles_entered += 1
        participant.last_entry_date = datetime.utcnow()
        
        self.db.commit()
        
        return entry
    
    def _verify_social_requirements(self, participant: RaffleParticipant, 
                                   requirements: Dict[str, bool]) -> bool:
        """Verify if participant meets social requirements"""
        if not participant.social_verified:
            return False
        
        for platform, required in requirements.items():
            if required and not participant.social_verified.get(platform, False):
                return False
        
        return True
    
    def _generate_slug(self, name: str) -> str:
        """Generate URL-friendly slug"""
        import re
        slug = re.sub(r'[^\w\s-]', '', name.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug[:200]
    
    def _generate_short_url(self) -> str:
        """Generate short URL for raffle"""
        return secrets.token_urlsafe(8)
    
    def _generate_qr_code(self, url: str) -> str:
        """Generate QR code for raffle URL"""
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(f"https://spirittours.com/raffle/{url}")
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        
        # Convert to base64 for storage
        img_str = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/png;base64,{img_str}"
    
    def _generate_referral_code(self) -> str:
        """Generate unique referral code"""
        return secrets.token_urlsafe(6).upper()
    
    def _generate_entry_number(self, raffle_id: int) -> str:
        """Generate unique entry number"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        random_part = secrets.token_hex(4)
        return f"R{raffle_id:04d}-{timestamp}-{random_part.upper()}"


class PointsManagementService:
    """Service for managing points with anti-fraud"""
    
    def __init__(self, db: Session, redis_client: redis.Redis):
        self.db = db
        self.redis = redis_client
        
    def award_points(self, participant_id: int, points: int, 
                    action_type: ActionType, platform: Optional[SocialPlatform] = None,
                    description: str = "", source_id: str = "") -> Optional[PointsTransaction]:
        """Award points with rate limiting and fraud checks"""
        
        participant = self.db.query(RaffleParticipant).get(participant_id)
        if not participant:
            return None
        
        # Check if suspended
        if participant.suspended_until and participant.suspended_until > datetime.utcnow():
            logger.warning(f"Participant {participant_id} is suspended")
            return None
        
        # Check rate limits
        if not self._check_rate_limits(participant_id, action_type, platform):
            logger.warning(f"Rate limit exceeded for participant {participant_id}")
            return None
        
        # Get points configuration
        config = self._get_points_config(action_type, platform)
        if not config or not config.active:
            return None
        
        # Apply tier multiplier
        final_points = self._apply_multipliers(points, participant.tier)
        
        # Check daily limit
        daily_earned = self._get_daily_points(participant_id)
        if daily_earned + final_points > self._get_daily_limit(participant.tier):
            final_points = max(0, self._get_daily_limit(participant.tier) - daily_earned)
            if final_points == 0:
                logger.info(f"Daily limit reached for participant {participant_id}")
                return None
        
        # Create transaction
        transaction = PointsTransaction(
            participant_id=participant_id,
            points=final_points,
            transaction_type='earned',
            category='social' if platform else 'other',
            source=action_type,
            platform=platform,
            description=description,
            source_id=source_id,
            balance_before=participant.total_points,
            balance_after=participant.total_points + final_points
        )
        
        # Update participant points
        participant.total_points += final_points
        participant.available_points += final_points
        participant.lifetime_points += final_points
        participant.daily_points_earned += final_points
        
        # Update tier if needed
        self._update_tier(participant)
        
        self.db.add(transaction)
        self.db.commit()
        
        # Update Redis cache
        self._update_redis_cache(participant_id, action_type, platform)
        
        return transaction
    
    def spend_points(self, participant_id: int, points: int, description: str) -> bool:
        """Spend points for raffle entries or rewards"""
        participant = self.db.query(RaffleParticipant).get(participant_id)
        
        if not participant or participant.available_points < points:
            return False
        
        transaction = PointsTransaction(
            participant_id=participant_id,
            points=-points,
            transaction_type='spent',
            category='raffle_entry',
            description=description,
            balance_before=participant.total_points,
            balance_after=participant.total_points - points
        )
        
        participant.available_points -= points
        participant.total_points -= points
        
        self.db.add(transaction)
        self.db.commit()
        
        return True
    
    def process_year_end_reset(self):
        """Process year-end points reset with 15% retention"""
        participants = self.db.query(RaffleParticipant).filter(
            RaffleParticipant.total_points > 0
        ).all()
        
        for participant in participants:
            # Calculate 15% retention
            retained_points = int(participant.total_points * 0.15)
            
            # Create reset transaction
            if participant.total_points > retained_points:
                reset_transaction = PointsTransaction(
                    participant_id=participant.id,
                    points=-(participant.total_points - retained_points),
                    transaction_type='expired',
                    category='year_end_reset',
                    description=f"Year-end reset, retained 15% ({retained_points} points)",
                    balance_before=participant.total_points,
                    balance_after=retained_points
                )
                self.db.add(reset_transaction)
            
            # Update participant points
            participant.total_points = retained_points
            participant.available_points = retained_points
            participant.daily_points_earned = 0
            participant.last_points_reset = datetime.utcnow()
        
        self.db.commit()
        logger.info(f"Year-end reset completed for {len(participants)} participants")
    
    def _check_rate_limits(self, participant_id: int, action_type: ActionType, 
                          platform: Optional[SocialPlatform]) -> bool:
        """Check if action is within rate limits"""
        # Check in Redis for quick rate limiting
        key = f"rate_limit:{participant_id}:{action_type.value}:{platform.value if platform else 'none'}"
        
        # Hourly limit
        hourly_key = f"{key}:hourly"
        hourly_count = self.redis.incr(hourly_key)
        if hourly_count == 1:
            self.redis.expire(hourly_key, 3600)  # 1 hour
        
        config = self._get_points_config(action_type, platform)
        if hourly_count > config.hourly_limit:
            return False
        
        # Daily limit check is handled in award_points
        return True
    
    def _get_points_config(self, action_type: ActionType, 
                          platform: Optional[SocialPlatform]) -> Optional[PointsConfiguration]:
        """Get points configuration for action"""
        query = self.db.query(PointsConfiguration).filter_by(
            action_type=action_type,
            active=True
        )
        
        if platform:
            query = query.filter_by(platform=platform)
        
        return query.first()
    
    def _get_daily_points(self, participant_id: int) -> int:
        """Get points earned today"""
        today = datetime.utcnow().date()
        total = self.db.query(func.sum(PointsTransaction.points)).filter(
            PointsTransaction.participant_id == participant_id,
            PointsTransaction.transaction_type == 'earned',
            func.date(PointsTransaction.created_at) == today
        ).scalar()
        
        return total or 0
    
    def _get_daily_limit(self, tier: str) -> int:
        """Get daily points limit based on tier"""
        limits = {
            'bronze': 10,
            'silver': 15,
            'gold': 20,
            'platinum': 30,
            'diamond': 50
        }
        return limits.get(tier, 10)
    
    def _apply_multipliers(self, points: int, tier: str) -> int:
        """Apply tier multipliers to points"""
        multipliers = {
            'bronze': 1.0,
            'silver': 1.2,
            'gold': 1.5,
            'platinum': 2.0,
            'diamond': 3.0
        }
        return int(points * multipliers.get(tier, 1.0))
    
    def _update_tier(self, participant: RaffleParticipant):
        """Update participant tier based on lifetime points"""
        tiers = [
            ('diamond', 100000),
            ('platinum', 50000),
            ('gold', 20000),
            ('silver', 5000),
            ('bronze', 0)
        ]
        
        for tier_name, min_points in tiers:
            if participant.lifetime_points >= min_points:
                participant.tier = tier_name
                break
    
    def _update_redis_cache(self, participant_id: int, action_type: ActionType,
                           platform: Optional[SocialPlatform]):
        """Update Redis cache for rate limiting"""
        daily_key = f"daily_points:{participant_id}:{datetime.utcnow().date()}"
        self.redis.incr(daily_key)
        self.redis.expire(daily_key, 86400)  # 24 hours


class FraudDetectionService:
    """Service for detecting fraudulent activities"""
    
    def __init__(self, db: Session, redis_client: redis.Redis):
        self.db = db
        self.redis = redis_client
        
    def check_participant(self, participant_data: Dict[str, Any]) -> float:
        """Check participant for fraud indicators"""
        risk_score = 0.0
        
        # Check email domain
        email_domain = participant_data['email'].split('@')[1]
        if email_domain in self._get_suspicious_domains():
            risk_score += 30
        
        # Check if using temporary email
        if self._is_temp_email(email_domain):
            risk_score += 40
        
        # Check IP address
        ip = participant_data.get('ip_address')
        if ip:
            # Check if IP is from VPN/proxy
            if self._is_vpn_proxy(ip):
                risk_score += 20
            
            # Check if IP has multiple accounts
            ip_accounts = self._count_ip_accounts(ip)
            if ip_accounts > 3:
                risk_score += 30
        
        # Check device fingerprint
        fingerprint = participant_data.get('device_fingerprint')
        if fingerprint:
            device_accounts = self._count_device_accounts(fingerprint)
            if device_accounts > 2:
                risk_score += 25
        
        return min(risk_score, 100)
    
    def check_entry(self, entry: RaffleEntry, participant: RaffleParticipant) -> List[str]:
        """Check raffle entry for fraud"""
        flags = []
        
        # Check velocity - too many entries too quickly
        recent_entries = self.db.query(RaffleEntry).filter(
            RaffleEntry.participant_id == participant.id,
            RaffleEntry.entry_date >= datetime.utcnow() - timedelta(minutes=5)
        ).count()
        
        if recent_entries > 3:
            flags.append("High velocity entries detected")
        
        # Check for pattern anomalies
        if participant.risk_score > 70:
            flags.append("High risk participant")
        
        # Check social actions validity
        if entry.social_requirements:
            for platform, completed in entry.social_requirements.items():
                if completed and not self._verify_social_action(participant.id, platform):
                    flags.append(f"Unverified {platform} action")
        
        return flags
    
    def check_social_action(self, action_data: Dict[str, Any]) -> bool:
        """Verify social media action is legitimate"""
        # Check for duplicate actions
        duplicate_hash = self._generate_action_hash(action_data)
        if self.redis.get(f"action_hash:{duplicate_hash}"):
            return False
        
        # Store hash with expiration
        self.redis.setex(f"action_hash:{duplicate_hash}", 86400, "1")
        
        # Check action velocity
        participant_id = action_data['participant_id']
        platform = action_data['platform']
        
        recent_actions = self.redis.incr(f"action_velocity:{participant_id}:{platform}")
        if recent_actions == 1:
            self.redis.expire(f"action_velocity:{participant_id}:{platform}", 300)  # 5 minutes
        
        if recent_actions > 5:  # More than 5 actions in 5 minutes
            return False
        
        return True
    
    def _get_suspicious_domains(self) -> List[str]:
        """Get list of suspicious email domains"""
        return ['tempmail.com', 'throwaway.email', 'guerrillamail.com']
    
    def _is_temp_email(self, domain: str) -> bool:
        """Check if email is from temporary email service"""
        temp_domains = self.redis.smembers("temp_email_domains")
        return domain in temp_domains if temp_domains else False
    
    def _is_vpn_proxy(self, ip: str) -> bool:
        """Check if IP is from VPN or proxy"""
        # This would integrate with IP reputation service
        # For now, simple Redis check
        return self.redis.sismember("vpn_ips", ip)
    
    def _count_ip_accounts(self, ip: str) -> int:
        """Count accounts from same IP"""
        return self.db.query(RaffleParticipant).filter(
            RaffleParticipant.ip_addresses.contains(ip)
        ).count()
    
    def _count_device_accounts(self, fingerprint: str) -> int:
        """Count accounts from same device"""
        return self.db.query(RaffleParticipant).filter(
            RaffleParticipant.device_fingerprints.contains(fingerprint)
        ).count()
    
    def _verify_social_action(self, participant_id: int, platform: str) -> bool:
        """Verify if social action was completed"""
        action = self.db.query(SocialAction).filter_by(
            participant_id=participant_id,
            platform=SocialPlatform[platform.upper()],
            verified=True
        ).first()
        
        return action is not None
    
    def _generate_action_hash(self, action_data: Dict[str, Any]) -> str:
        """Generate hash for action to detect duplicates"""
        hash_string = f"{action_data['participant_id']}:{action_data['platform']}:{action_data['target_id']}"
        return hashlib.sha256(hash_string.encode()).hexdigest()


class LeaderboardService:
    """Service for managing leaderboards"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def update_leaderboard(self):
        """Update current leaderboard standings"""
        # Get current period
        now = datetime.utcnow()
        year = now.year
        month = now.month
        week = now.isocalendar()[1]
        
        # Get all active participants
        participants = self.db.query(RaffleParticipant).filter(
            RaffleParticipant.active == True,
            RaffleParticipant.blocked == False
        ).all()
        
        # Calculate rankings
        rankings = []
        for participant in participants:
            # Get points earned this period
            period_points = self._get_period_points(participant.id, year, month)
            
            rankings.append({
                'participant_id': participant.id,
                'points_earned': period_points,
                'total_points': participant.total_points,
                'engagement_score': participant.engagement_score,
                'shares_count': participant.total_shares,
                'likes_count': participant.total_likes,
                'referrals_count': participant.total_referrals
            })
        
        # Sort by points earned
        rankings.sort(key=lambda x: x['points_earned'], reverse=True)
        
        # Update or create leaderboard entries
        for rank, data in enumerate(rankings, 1):
            entry = self.db.query(LeaderBoard).filter_by(
                year=year,
                month=month,
                participant_id=data['participant_id']
            ).first()
            
            if not entry:
                entry = LeaderBoard(
                    year=year,
                    month=month,
                    participant_id=data['participant_id']
                )
                self.db.add(entry)
            
            entry.points_earned = data['points_earned']
            entry.total_points = data['total_points']
            entry.engagement_score = data['engagement_score']
            entry.shares_count = data['shares_count']
            entry.likes_count = data['likes_count']
            entry.referrals_count = data['referrals_count']
            entry.overall_rank = rank
        
        self.db.commit()
    
    def get_leaderboard(self, period: str = 'month', limit: int = 100) -> List[Dict]:
        """Get current leaderboard"""
        now = datetime.utcnow()
        year = now.year
        month = now.month if period in ['month', 'week'] else None
        
        query = self.db.query(LeaderBoard).filter_by(year=year)
        if month:
            query = query.filter_by(month=month)
        
        entries = query.order_by(LeaderBoard.overall_rank).limit(limit).all()
        
        return [{
            'rank': entry.overall_rank,
            'participant_id': entry.participant_id,
            'participant_name': self._get_participant_name(entry.participant_id),
            'points': entry.points_earned,
            'total_points': entry.total_points,
            'engagement_score': entry.engagement_score
        } for entry in entries]
    
    def _get_period_points(self, participant_id: int, year: int, month: int) -> int:
        """Get points earned in specific period"""
        start_date = datetime(year, month, 1)
        end_date = datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)
        
        total = self.db.query(func.sum(PointsTransaction.points)).filter(
            PointsTransaction.participant_id == participant_id,
            PointsTransaction.transaction_type == 'earned',
            PointsTransaction.created_at >= start_date,
            PointsTransaction.created_at < end_date
        ).scalar()
        
        return total or 0
    
    def _get_participant_name(self, participant_id: int) -> str:
        """Get participant display name"""
        participant = self.db.query(RaffleParticipant).get(participant_id)
        if participant:
            # Partially hide name for privacy
            first = participant.first_name[:2] + "***" if len(participant.first_name) > 2 else participant.first_name
            last = participant.last_name[:1] + "***" if participant.last_name else ""
            return f"{first} {last}"
        return "Unknown"