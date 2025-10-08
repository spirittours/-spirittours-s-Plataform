"""
Agency Onboarding System
Complete onboarding flow for travel agencies to join the B2B2C platform
"""

import uuid
import secrets
import hashlib
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import asyncio
import aiohttp
from enum import Enum
import jwt
from sqlalchemy import Column, String, Float, Boolean, DateTime, JSON, ForeignKey, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from email_validator import validate_email
import stripe
import boto3
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import qrcode
import io
import base64

Base = declarative_base()

class OnboardingStatus(Enum):
    """Agency onboarding status stages"""
    INITIATED = "initiated"
    DOCUMENTS_PENDING = "documents_pending"
    VERIFICATION_IN_PROGRESS = "verification_in_progress"
    TRAINING_REQUIRED = "training_required"
    CONTRACT_PENDING = "contract_pending"
    PAYMENT_SETUP = "payment_setup"
    APPROVED = "approved"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    REJECTED = "rejected"


class AgencyTier(Enum):
    """Agency partnership tiers"""
    STARTER = "starter"
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"
    ENTERPRISE = "enterprise"


@dataclass
class CommissionStructure:
    """Commission structure for agencies"""
    tier: AgencyTier
    flight_commission: float = 0.08
    hotel_commission: float = 0.10
    package_commission: float = 0.12
    activity_commission: float = 0.15
    insurance_commission: float = 0.20
    volume_bonus: float = 0.0
    performance_bonus: float = 0.0
    
    def get_total_commission(self, product_type: str) -> float:
        """Calculate total commission including bonuses"""
        base = getattr(self, f"{product_type}_commission", 0.10)
        return base + self.volume_bonus + self.performance_bonus


class TravelAgency(Base):
    """Travel Agency model for database"""
    __tablename__ = 'travel_agencies'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agency_code = Column(String, unique=True, nullable=False)
    company_name = Column(String, nullable=False)
    legal_name = Column(String, nullable=False)
    tax_id = Column(String, unique=True, nullable=False)
    
    # Contact Information
    primary_email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    website = Column(String)
    
    # Address
    address_line1 = Column(String, nullable=False)
    address_line2 = Column(String)
    city = Column(String, nullable=False)
    state = Column(String)
    country = Column(String, nullable=False)
    postal_code = Column(String)
    
    # Business Information
    license_number = Column(String)
    iata_number = Column(String)
    year_established = Column(Integer)
    employee_count = Column(Integer)
    annual_revenue = Column(Float)
    
    # Platform Configuration
    tier = Column(String, default=AgencyTier.STARTER.value)
    commission_structure = Column(JSON)
    preferred_gds = Column(JSON)  # List of preferred GDS providers
    white_label_enabled = Column(Boolean, default=False)
    custom_domain = Column(String)
    
    # Credentials
    api_key = Column(String, unique=True)
    api_secret = Column(String)
    webhook_url = Column(String)
    ip_whitelist = Column(JSON)  # List of whitelisted IPs
    
    # Status
    onboarding_status = Column(String, default=OnboardingStatus.INITIATED.value)
    is_active = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    
    # Dates
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime)
    last_activity = Column(DateTime)
    contract_expires = Column(DateTime)
    
    # Relationships
    users = relationship("AgencyUser", back_populates="agency")
    bookings = relationship("AgencyBooking", back_populates="agency")


class AgencyUser(Base):
    """Agency user accounts"""
    __tablename__ = 'agency_users'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agency_id = Column(String, ForeignKey('travel_agencies.id'))
    email = Column(String, unique=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    role = Column(String, default="agent")  # admin, manager, agent
    is_active = Column(Boolean, default=True)
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String)
    
    # Relationships
    agency = relationship("TravelAgency", back_populates="users")


class AgencyOnboardingService:
    """Handles the complete agency onboarding process"""
    
    def __init__(self, db_session, email_client=None, storage_client=None):
        self.db_session = db_session
        self.email_client = email_client or SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))
        self.storage_client = storage_client or boto3.client('s3')
        self.stripe_client = stripe
        stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
        
    async def start_onboarding(self, application_data: Dict) -> Dict:
        """Start the onboarding process for a new agency"""
        
        # Validate application data
        validation_result = await self._validate_application(application_data)
        if not validation_result["valid"]:
            return {
                "success": False,
                "errors": validation_result["errors"]
            }
        
        # Check for duplicate applications
        existing = self.db_session.query(TravelAgency).filter_by(
            tax_id=application_data["tax_id"]
        ).first()
        
        if existing:
            return {
                "success": False,
                "error": "Agency with this tax ID already exists"
            }
        
        # Create agency record
        agency = TravelAgency(
            agency_code=self._generate_agency_code(),
            company_name=application_data["company_name"],
            legal_name=application_data["legal_name"],
            tax_id=application_data["tax_id"],
            primary_email=application_data["primary_email"],
            phone=application_data["phone"],
            website=application_data.get("website"),
            address_line1=application_data["address_line1"],
            address_line2=application_data.get("address_line2"),
            city=application_data["city"],
            state=application_data.get("state"),
            country=application_data["country"],
            postal_code=application_data.get("postal_code"),
            license_number=application_data.get("license_number"),
            iata_number=application_data.get("iata_number"),
            year_established=application_data.get("year_established"),
            employee_count=application_data.get("employee_count"),
            annual_revenue=application_data.get("annual_revenue"),
            preferred_gds=application_data.get("preferred_gds", ["amadeus", "hotelbeds"]),
            tier=self._determine_initial_tier(application_data).value,
            onboarding_status=OnboardingStatus.DOCUMENTS_PENDING.value
        )
        
        # Generate API credentials
        agency.api_key = self._generate_api_key()
        agency.api_secret = self._generate_api_secret()
        
        # Set initial commission structure
        commission = self._get_commission_structure(AgencyTier(agency.tier))
        agency.commission_structure = {
            "flights": commission.flight_commission,
            "hotels": commission.hotel_commission,
            "packages": commission.package_commission,
            "activities": commission.activity_commission,
            "insurance": commission.insurance_commission
        }
        
        self.db_session.add(agency)
        self.db_session.commit()
        
        # Create primary admin user
        admin_user = await self._create_admin_user(agency, application_data)
        
        # Send welcome email
        await self._send_welcome_email(agency, admin_user)
        
        # Create onboarding checklist
        checklist = await self._create_onboarding_checklist(agency)
        
        return {
            "success": True,
            "agency_id": agency.id,
            "agency_code": agency.agency_code,
            "status": agency.onboarding_status,
            "next_steps": checklist,
            "credentials": {
                "api_key": agency.api_key,
                "api_secret": agency.api_secret[:8] + "..." # Show partial secret
            }
        }
    
    async def _validate_application(self, data: Dict) -> Dict:
        """Validate agency application data"""
        errors = []
        
        # Required fields
        required_fields = [
            "company_name", "legal_name", "tax_id", "primary_email",
            "phone", "address_line1", "city", "country"
        ]
        
        for field in required_fields:
            if not data.get(field):
                errors.append(f"{field} is required")
        
        # Validate email
        if data.get("primary_email"):
            try:
                validate_email(data["primary_email"])
            except:
                errors.append("Invalid email format")
        
        # Validate IATA number if provided
        if data.get("iata_number"):
            if not self._validate_iata_number(data["iata_number"]):
                errors.append("Invalid IATA number")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
    
    def _generate_agency_code(self) -> str:
        """Generate unique agency code"""
        prefix = "AGN"
        timestamp = datetime.utcnow().strftime("%y%m")
        random_part = secrets.token_hex(3).upper()
        return f"{prefix}{timestamp}{random_part}"
    
    def _generate_api_key(self) -> str:
        """Generate secure API key"""
        return f"pk_live_{secrets.token_urlsafe(32)}"
    
    def _generate_api_secret(self) -> str:
        """Generate secure API secret"""
        return f"sk_live_{secrets.token_urlsafe(48)}"
    
    def _determine_initial_tier(self, data: Dict) -> AgencyTier:
        """Determine initial tier based on agency profile"""
        annual_revenue = data.get("annual_revenue", 0)
        employee_count = data.get("employee_count", 1)
        has_iata = bool(data.get("iata_number"))
        
        if annual_revenue > 10000000 or employee_count > 50:
            return AgencyTier.GOLD if has_iata else AgencyTier.SILVER
        elif annual_revenue > 1000000 or employee_count > 10:
            return AgencyTier.SILVER if has_iata else AgencyTier.BRONZE
        elif has_iata:
            return AgencyTier.BRONZE
        else:
            return AgencyTier.STARTER
    
    def _get_commission_structure(self, tier: AgencyTier) -> CommissionStructure:
        """Get commission structure for tier"""
        structures = {
            AgencyTier.STARTER: CommissionStructure(tier, 0.06, 0.08, 0.10, 0.12, 0.15),
            AgencyTier.BRONZE: CommissionStructure(tier, 0.08, 0.10, 0.12, 0.15, 0.20),
            AgencyTier.SILVER: CommissionStructure(tier, 0.09, 0.12, 0.13, 0.17, 0.25, volume_bonus=0.02),
            AgencyTier.GOLD: CommissionStructure(tier, 0.10, 0.15, 0.15, 0.20, 0.30, volume_bonus=0.03),
            AgencyTier.PLATINUM: CommissionStructure(tier, 0.12, 0.18, 0.18, 0.25, 0.35, volume_bonus=0.05),
            AgencyTier.ENTERPRISE: CommissionStructure(tier, 0.15, 0.20, 0.20, 0.30, 0.40, volume_bonus=0.07)
        }
        return structures.get(tier, structures[AgencyTier.STARTER])
    
    async def _create_admin_user(self, agency: TravelAgency, data: Dict) -> AgencyUser:
        """Create primary admin user for agency"""
        admin_user = AgencyUser(
            agency_id=agency.id,
            email=data["primary_email"],
            first_name=data.get("admin_first_name", "Admin"),
            last_name=data.get("admin_last_name", agency.company_name),
            role="admin"
        )
        
        self.db_session.add(admin_user)
        self.db_session.commit()
        
        # Generate temporary password
        temp_password = secrets.token_urlsafe(12)
        await self._send_credentials_email(admin_user, temp_password)
        
        return admin_user
    
    async def _send_welcome_email(self, agency: TravelAgency, admin_user: AgencyUser):
        """Send welcome email to new agency"""
        message = Mail(
            from_email='partnerships@spirittours.com',
            to_emails=agency.primary_email,
            subject=f'Welcome to Spirit Tours Partner Program - {agency.company_name}',
            html_content=f'''
            <h2>Welcome to Spirit Tours B2B2C Platform!</h2>
            <p>Dear {admin_user.first_name},</p>
            <p>Thank you for joining the Spirit Tours Partner Program. Your agency code is: <strong>{agency.agency_code}</strong></p>
            
            <h3>Next Steps:</h3>
            <ol>
                <li>Complete document verification</li>
                <li>Set up payment methods</li>
                <li>Complete online training</li>
                <li>Configure your white-label portal</li>
                <li>Start making bookings!</li>
            </ol>
            
            <p>Access your dashboard: <a href="https://partners.spirittours.com">Partner Portal</a></p>
            
            <p>Best regards,<br>Spirit Tours Partnership Team</p>
            '''
        )
        
        try:
            response = self.email_client.send(message)
        except Exception as e:
            print(f"Failed to send welcome email: {e}")
    
    async def _create_onboarding_checklist(self, agency: TravelAgency) -> List[Dict]:
        """Create onboarding checklist for agency"""
        checklist = [
            {
                "step": 1,
                "task": "Upload business documents",
                "description": "Business license, tax certificate, insurance",
                "status": "pending",
                "required": True
            },
            {
                "step": 2,
                "task": "Verify bank account",
                "description": "Set up payment and commission disbursement",
                "status": "pending",
                "required": True
            },
            {
                "step": 3,
                "task": "Complete online training",
                "description": "Platform overview and booking procedures",
                "status": "pending",
                "required": True
            },
            {
                "step": 4,
                "task": "Sign partnership agreement",
                "description": "Review and sign digital contract",
                "status": "pending",
                "required": True
            },
            {
                "step": 5,
                "task": "Configure white-label portal",
                "description": "Customize branding and domain",
                "status": "pending",
                "required": False
            },
            {
                "step": 6,
                "task": "Test sandbox environment",
                "description": "Make test bookings in sandbox",
                "status": "pending",
                "required": True
            },
            {
                "step": 7,
                "task": "Schedule onboarding call",
                "description": "Meet with partnership manager",
                "status": "pending",
                "required": False
            }
        ]
        
        # Store checklist in database or cache
        # Implementation depends on your storage solution
        
        return checklist
    
    def _validate_iata_number(self, iata_number: str) -> bool:
        """Validate IATA number format"""
        # IATA numbers are typically 8 digits
        import re
        pattern = r'^\d{8}$'
        return bool(re.match(pattern, str(iata_number)))


class AgencyPortal:
    """Agency self-service portal"""
    
    def __init__(self, db_session):
        self.db_session = db_session
        
    async def get_dashboard_data(self, agency_id: str) -> Dict:
        """Get agency dashboard data"""
        agency = self.db_session.query(TravelAgency).filter_by(id=agency_id).first()
        
        if not agency:
            return {"error": "Agency not found"}
        
        # Calculate metrics
        today = datetime.utcnow().date()
        month_start = today.replace(day=1)
        
        dashboard_data = {
            "agency": {
                "name": agency.company_name,
                "code": agency.agency_code,
                "tier": agency.tier,
                "status": agency.onboarding_status
            },
            "metrics": {
                "bookings_today": self._get_bookings_count(agency_id, today),
                "bookings_month": self._get_bookings_count(agency_id, month_start),
                "revenue_today": self._get_revenue(agency_id, today),
                "revenue_month": self._get_revenue(agency_id, month_start),
                "commission_earned": self._get_commission_earned(agency_id, month_start),
                "pending_commission": self._get_pending_commission(agency_id)
            },
            "recent_bookings": self._get_recent_bookings(agency_id, limit=10),
            "commission_structure": agency.commission_structure,
            "api_usage": self._get_api_usage(agency_id),
            "notifications": self._get_notifications(agency_id)
        }
        
        return dashboard_data
    
    def _get_bookings_count(self, agency_id: str, since_date) -> int:
        """Get bookings count since date"""
        # Implementation depends on your booking model
        return 42  # Placeholder
    
    def _get_revenue(self, agency_id: str, since_date) -> float:
        """Get total revenue since date"""
        return 15750.50  # Placeholder
    
    def _get_commission_earned(self, agency_id: str, since_date) -> float:
        """Get commission earned since date"""
        return 1575.05  # Placeholder
    
    def _get_pending_commission(self, agency_id: str) -> float:
        """Get pending commission amount"""
        return 3250.75  # Placeholder
    
    def _get_recent_bookings(self, agency_id: str, limit: int) -> List[Dict]:
        """Get recent bookings"""
        return []  # Placeholder
    
    def _get_api_usage(self, agency_id: str) -> Dict:
        """Get API usage statistics"""
        return {
            "requests_today": 1250,
            "requests_month": 28500,
            "rate_limit": 100,
            "rate_limit_remaining": 75
        }
    
    def _get_notifications(self, agency_id: str) -> List[Dict]:
        """Get agency notifications"""
        return [
            {
                "id": "1",
                "type": "info",
                "message": "New GDS provider Sabre now available",
                "date": datetime.utcnow().isoformat()
            }
        ]


# Export classes
__all__ = [
    'OnboardingStatus',
    'AgencyTier',
    'CommissionStructure',
    'TravelAgency',
    'AgencyUser',
    'AgencyOnboardingService',
    'AgencyPortal'
]