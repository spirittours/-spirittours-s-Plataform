"""
Affiliate API - Complete TAAP System Endpoints
RESTful API for affiliate program management
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, BackgroundTasks, File, UploadFile
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, func, desc
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, date
from decimal import Decimal
import secrets
import hashlib
import json
import uuid

from backend.database import get_db
from backend.models.affiliate_models import (
    Affiliate, AffiliateClick, AffiliateConversion, AffiliatePayment,
    AffiliateMaterial, AffiliatePromoCode, AffiliateNotification,
    AffiliateType, AffiliateTier, AffiliateStatus, ConversionStatus,
    PaymentStatus, PaymentMethod
)
from backend.models.business_models import Booking, Tour, Customer
from backend.auth import get_current_user, create_access_token
from backend.services.email_service import EmailService
from backend.services.cache_service import cache_service
from pydantic import BaseModel, EmailStr, Field, validator

router = APIRouter(prefix="/api/affiliate", tags=["Affiliate Program"])

# ========================================
# PYDANTIC MODELS
# ========================================

class AffiliateRegistration(BaseModel):
    """Model for new affiliate registration"""
    name: str = Field(..., min_length=2, max_length=200)
    email: EmailStr
    phone: Optional[str] = None
    company_name: Optional[str] = None
    website: Optional[str] = None
    type: AffiliateType = AffiliateType.INDIVIDUAL
    
    # Address
    country: str
    city: Optional[str] = None
    
    # Preferences
    language: str = "es"
    currency: str = "USD"
    
    # Marketing info
    referral_source: Optional[str] = None
    promotion_methods: Optional[List[str]] = None
    expected_monthly_sales: Optional[float] = None
    
    # Agreement
    accept_terms: bool
    accept_privacy: bool
    
    @validator('accept_terms', 'accept_privacy')
    def validate_agreements(cls, v):
        if not v:
            raise ValueError("Must accept terms and privacy policy")
        return v

class AffiliateUpdate(BaseModel):
    """Model for updating affiliate profile"""
    name: Optional[str] = None
    company_name: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    
    # Address
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    
    # Payment
    payment_method: Optional[PaymentMethod] = None
    payment_details: Optional[Dict] = None
    minimum_payout: Optional[float] = None
    
    # Preferences
    language: Optional[str] = None
    timezone: Optional[str] = None
    notification_preferences: Optional[Dict] = None

class LinkGeneratorRequest(BaseModel):
    """Request for generating affiliate links"""
    url: str
    campaign: Optional[str] = None
    medium: Optional[str] = "website"
    content: Optional[str] = None
    term: Optional[str] = None

class BookingCreateRequest(BaseModel):
    """Create booking through affiliate"""
    tour_id: int
    tour_date: datetime
    adults: int = Field(ge=1)
    children: int = Field(ge=0, default=0)
    
    # Customer info
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    customer_country: str
    
    # Optional
    special_requests: Optional[str] = None
    promo_code: Optional[str] = None

# ========================================
# HELPER FUNCTIONS
# ========================================

async def get_current_affiliate(
    request: Request,
    db: Session = Depends(get_db)
) -> Affiliate:
    """Get current authenticated affiliate"""
    
    # Check for API key in header
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        # Check for JWT token
        token = request.headers.get("Authorization")
        if not token:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Validate JWT and get affiliate
        # ... JWT validation logic
    
    # Get affiliate by API key
    affiliate = db.query(Affiliate).filter(
        Affiliate.api_key == api_key,
        Affiliate.status == AffiliateStatus.ACTIVE
    ).first()
    
    if not affiliate:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Update last activity
    affiliate.last_activity = datetime.utcnow()
    db.commit()
    
    return affiliate

def generate_affiliate_code(name: str) -> str:
    """Generate unique affiliate code"""
    base = name.upper().replace(" ", "")[:3]
    random_part = secrets.token_hex(3).upper()
    return f"{base}{random_part}"

def generate_api_credentials() -> tuple:
    """Generate API key and secret"""
    api_key = secrets.token_urlsafe(32)
    api_secret = secrets.token_urlsafe(64)
    return api_key, api_secret

def calculate_tier(monthly_sales: float) -> AffiliateTier:
    """Calculate tier based on monthly sales"""
    if monthly_sales >= 200000:
        return AffiliateTier.PLATINUM
    elif monthly_sales >= 50000:
        return AffiliateTier.GOLD
    elif monthly_sales >= 10000:
        return AffiliateTier.SILVER
    else:
        return AffiliateTier.STARTER

def calculate_commission_rate(tier: AffiliateTier, type: AffiliateType) -> float:
    """Calculate commission rate based on tier and type"""
    base_rates = {
        AffiliateType.INDIVIDUAL: 5,
        AffiliateType.PROFESSIONAL_AGENT: 8,
        AffiliateType.AGENCY_PARTNER: 10,
        AffiliateType.ENTERPRISE_PARTNER: 12,
        AffiliateType.TECHNOLOGY_PARTNER: 15,
    }
    
    tier_multipliers = {
        AffiliateTier.STARTER: 1.0,
        AffiliateTier.SILVER: 1.25,
        AffiliateTier.GOLD: 1.5,
        AffiliateTier.PLATINUM: 1.875,
        AffiliateTier.DIAMOND: 2.0,
    }
    
    base = base_rates.get(type, 5)
    multiplier = tier_multipliers.get(tier, 1.0)
    
    return min(base * multiplier, 20)  # Cap at 20%

# ========================================
# PUBLIC ENDPOINTS
# ========================================

@router.post("/register", response_model=Dict)
async def register_affiliate(
    data: AffiliateRegistration,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Public endpoint for affiliate self-registration
    Auto-approves basic affiliates, requires review for agencies
    """
    try:
        # Check if email already exists
        existing = db.query(Affiliate).filter(
            Affiliate.email == data.email
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Generate unique affiliate code
        affiliate_code = generate_affiliate_code(data.name)
        while db.query(Affiliate).filter(Affiliate.affiliate_code == affiliate_code).first():
            affiliate_code = generate_affiliate_code(data.name)
        
        # Generate API credentials
        api_key, api_secret = generate_api_credentials()
        
        # Determine initial status
        initial_status = AffiliateStatus.ACTIVE if data.type == AffiliateType.INDIVIDUAL else AffiliateStatus.PENDING
        
        # Create affiliate
        affiliate = Affiliate(
            affiliate_code=affiliate_code,
            name=data.name,
            email=data.email,
            phone=data.phone,
            company_name=data.company_name,
            website=data.website,
            type=data.type,
            tier=AffiliateTier.STARTER,
            country=data.country,
            city=data.city,
            language=data.language,
            currency=data.currency,
            status=initial_status,
            api_key=api_key,
            api_secret=api_secret,
            referral_source=data.referral_source,
            signup_ip=request.client.host,
            base_commission_rate=calculate_commission_rate(AffiliateTier.STARTER, data.type),
            created_at=datetime.utcnow()
        )
        
        db.add(affiliate)
        db.commit()
        db.refresh(affiliate)
        
        # Send welcome email in background
        background_tasks.add_task(
            send_welcome_email,
            affiliate.email,
            affiliate.name,
            affiliate.affiliate_code,
            api_key,
            api_secret
        )
        
        # Create JWT token for immediate access
        access_token = create_access_token(
            data={"sub": str(affiliate.id), "type": "affiliate"}
        )
        
        return {
            "success": True,
            "message": "Registration successful",
            "affiliate_code": affiliate.affiliate_code,
            "api_key": api_key if initial_status == AffiliateStatus.ACTIVE else None,
            "api_secret": api_secret if initial_status == AffiliateStatus.ACTIVE else None,
            "status": initial_status.value,
            "access_token": access_token,
            "dashboard_url": f"/affiliate/dashboard",
            "requires_approval": initial_status == AffiliateStatus.PENDING
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check-availability/{code}")
async def check_code_availability(code: str, db: Session = Depends(get_db)):
    """Check if affiliate code is available"""
    exists = db.query(Affiliate).filter(
        Affiliate.affiliate_code == code.upper()
    ).first() is not None
    
    return {
        "code": code.upper(),
        "available": not exists,
        "suggestions": generate_code_suggestions(code) if exists else []
    }

@router.get("/public/leaderboard")
@cache_service.cache(prefix="leaderboard", ttl=3600)
async def get_public_leaderboard(
    period: str = Query("month", regex="^(week|month|year|all)$"),
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db)
):
    """Get public leaderboard of top affiliates"""
    
    # Calculate date range
    if period == "week":
        start_date = datetime.utcnow() - timedelta(days=7)
    elif period == "month":
        start_date = datetime.utcnow() - timedelta(days=30)
    elif period == "year":
        start_date = datetime.utcnow() - timedelta(days=365)
    else:
        start_date = datetime(2020, 1, 1)
    
    # Query top affiliates
    top_affiliates = db.query(
        Affiliate.name,
        Affiliate.tier,
        func.count(AffiliateConversion.id).label("conversions"),
        func.sum(AffiliateConversion.booking_value).label("total_sales")
    ).join(
        AffiliateConversion,
        and_(
            AffiliateConversion.affiliate_id == Affiliate.id,
            AffiliateConversion.converted_at >= start_date,
            AffiliateConversion.status == ConversionStatus.CONFIRMED
        )
    ).group_by(
        Affiliate.id
    ).order_by(
        desc("total_sales")
    ).limit(limit).all()
    
    return {
        "period": period,
        "leaderboard": [
            {
                "rank": idx + 1,
                "name": affiliate.name[:3] + "***",  # Privacy
                "tier": affiliate.tier.value,
                "conversions": affiliate.conversions,
                "badge": get_performance_badge(affiliate.total_sales)
            }
            for idx, affiliate in enumerate(top_affiliates)
        ]
    }

# ========================================
# AUTHENTICATED ENDPOINTS
# ========================================

@router.get("/dashboard")
async def get_dashboard(
    time_range: str = Query("30d", regex="^(today|7d|30d|90d|year|all)$"),
    affiliate: Affiliate = Depends(get_current_affiliate),
    db: Session = Depends(get_db)
):
    """Get affiliate dashboard with complete statistics"""
    
    # Calculate date range
    date_ranges = {
        "today": datetime.utcnow().replace(hour=0, minute=0, second=0),
        "7d": datetime.utcnow() - timedelta(days=7),
        "30d": datetime.utcnow() - timedelta(days=30),
        "90d": datetime.utcnow() - timedelta(days=90),
        "year": datetime.utcnow() - timedelta(days=365),
        "all": datetime(2020, 1, 1)
    }
    
    start_date = date_ranges.get(time_range, date_ranges["30d"])
    
    # Get statistics
    stats = db.query(
        func.count(AffiliateClick.id).label("total_clicks"),
        func.count(func.distinct(AffiliateClick.visitor_id)).label("unique_visitors"),
        func.count(AffiliateConversion.id).label("total_conversions"),
        func.sum(AffiliateConversion.booking_value).label("total_sales"),
        func.sum(AffiliateConversion.commission_amount).label("total_commission"),
        func.avg(AffiliateConversion.booking_value).label("average_order_value")
    ).select_from(Affiliate).outerjoin(
        AffiliateClick,
        and_(
            AffiliateClick.affiliate_id == affiliate.id,
            AffiliateClick.clicked_at >= start_date
        )
    ).outerjoin(
        AffiliateConversion,
        and_(
            AffiliateConversion.affiliate_id == affiliate.id,
            AffiliateConversion.converted_at >= start_date,
            AffiliateConversion.status.in_([ConversionStatus.CONFIRMED, ConversionStatus.PAID])
        )
    ).filter(
        Affiliate.id == affiliate.id
    ).first()
    
    # Calculate rates
    conversion_rate = (stats.total_conversions / stats.total_clicks * 100) if stats.total_clicks > 0 else 0
    earnings_per_click = (stats.total_commission / stats.total_clicks) if stats.total_clicks > 0 else 0
    
    # Get recent conversions
    recent_conversions = db.query(AffiliateConversion).filter(
        AffiliateConversion.affiliate_id == affiliate.id
    ).order_by(
        AffiliateConversion.converted_at.desc()
    ).limit(10).all()
    
    # Get pending payment
    pending_payment = db.query(
        func.sum(AffiliateConversion.total_payout)
    ).filter(
        AffiliateConversion.affiliate_id == affiliate.id,
        AffiliateConversion.status == ConversionStatus.CONFIRMED,
        AffiliateConversion.payment_date.is_(None)
    ).scalar() or 0
    
    # Get top performing products
    top_products = db.query(
        Tour.name,
        Tour.id,
        func.count(AffiliateConversion.id).label("conversions"),
        func.sum(AffiliateConversion.commission_amount).label("commission")
    ).join(
        Booking,
        Booking.id == AffiliateConversion.booking_id
    ).join(
        Tour,
        Tour.id == Booking.tour_id
    ).filter(
        AffiliateConversion.affiliate_id == affiliate.id,
        AffiliateConversion.converted_at >= start_date
    ).group_by(
        Tour.id
    ).order_by(
        desc("conversions")
    ).limit(5).all()
    
    # Get performance chart data
    chart_data = db.query(
        func.date(AffiliateConversion.converted_at).label("date"),
        func.count(AffiliateConversion.id).label("conversions"),
        func.sum(AffiliateConversion.booking_value).label("sales"),
        func.sum(AffiliateConversion.commission_amount).label("commission")
    ).filter(
        AffiliateConversion.affiliate_id == affiliate.id,
        AffiliateConversion.converted_at >= start_date
    ).group_by(
        func.date(AffiliateConversion.converted_at)
    ).order_by(
        func.date(AffiliateConversion.converted_at)
    ).all()
    
    return {
        "affiliate": {
            "code": affiliate.affiliate_code,
            "name": affiliate.name,
            "tier": affiliate.tier.value,
            "commission_rate": float(affiliate.tier_commission_rate or affiliate.base_commission_rate),
            "status": affiliate.status.value
        },
        "stats": {
            "total_clicks": stats.total_clicks or 0,
            "unique_visitors": stats.unique_visitors or 0,
            "total_conversions": stats.total_conversions or 0,
            "conversion_rate": round(conversion_rate, 2),
            "total_sales": float(stats.total_sales or 0),
            "total_commission": float(stats.total_commission or 0),
            "pending_payment": float(pending_payment),
            "average_order_value": float(stats.average_order_value or 0),
            "earnings_per_click": round(earnings_per_click, 2)
        },
        "recent_conversions": [
            {
                "date": conv.converted_at.isoformat(),
                "product": conv.product_name,
                "value": float(conv.booking_value),
                "commission": float(conv.commission_amount),
                "status": conv.status.value
            }
            for conv in recent_conversions
        ],
        "top_products": [
            {
                "id": product.id,
                "name": product.name,
                "conversions": product.conversions,
                "commission": float(product.commission)
            }
            for product in top_products
        ],
        "chart_data": [
            {
                "date": data.date.isoformat(),
                "conversions": data.conversions,
                "sales": float(data.sales or 0),
                "commission": float(data.commission or 0)
            }
            for data in chart_data
        ],
        "notifications": await get_unread_notifications_count(affiliate.id, db)
    }

@router.post("/generate-link")
async def generate_affiliate_link(
    data: LinkGeneratorRequest,
    affiliate: Affiliate = Depends(get_current_affiliate),
    db: Session = Depends(get_db)
):
    """Generate trackable affiliate link"""
    
    # Generate tracking parameters
    tracking_params = {
        "ref": affiliate.affiliate_code,
        "utm_source": "affiliate",
        "utm_medium": data.medium or "website",
        "utm_campaign": data.campaign or "general"
    }
    
    if data.content:
        tracking_params["utm_content"] = data.content
    if data.term:
        tracking_params["utm_term"] = data.term
    
    # Build URL with parameters
    from urllib.parse import urlparse, urlunparse, urlencode, parse_qs
    
    parsed = urlparse(data.url)
    query_dict = parse_qs(parsed.query)
    query_dict.update(tracking_params)
    
    new_query = urlencode(query_dict, doseq=True)
    
    affiliate_url = urlunparse((
        parsed.scheme or "https",
        parsed.netloc or "spirittours.com",
        parsed.path,
        parsed.params,
        new_query,
        parsed.fragment
    ))
    
    # Generate short URL
    short_code = secrets.token_urlsafe(6)
    # Store mapping in cache/db for short URL redirect
    cache_service.set(f"short_url:{short_code}", affiliate_url, ttl=86400 * 30)
    
    return {
        "original_url": data.url,
        "affiliate_url": affiliate_url,
        "short_url": f"https://sprt.tours/{short_code}",
        "tracking_params": tracking_params,
        "qr_code": f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={affiliate_url}"
    }

@router.get("/materials")
async def get_marketing_materials(
    type: Optional[str] = None,
    language: str = Query("es"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    affiliate: Affiliate = Depends(get_current_affiliate),
    db: Session = Depends(get_db)
):
    """Get available marketing materials"""
    
    query = db.query(AffiliateMaterial).filter(
        AffiliateMaterial.is_active == True
    )
    
    if type:
        query = query.filter(AffiliateMaterial.type == type)
    
    if language:
        query = query.filter(
            func.cast(AffiliateMaterial.languages, String).contains(language)
        )
    
    # Order by priority and performance
    query = query.order_by(
        AffiliateMaterial.priority.desc(),
        AffiliateMaterial.conversion_rate.desc()
    )
    
    # Paginate
    offset = (page - 1) * limit
    materials = query.offset(offset).limit(limit).all()
    total = query.count()
    
    return {
        "materials": [
            {
                "id": mat.id,
                "code": mat.code,
                "type": mat.type,
                "name": mat.name,
                "description": mat.description,
                "preview_url": mat.preview_url or mat.thumbnail_url,
                "dimensions": f"{mat.width}x{mat.height}" if mat.width else None,
                "format": mat.format,
                "performance": {
                    "ctr": float(mat.click_through_rate or 0),
                    "conversion_rate": float(mat.conversion_rate or 0)
                },
                "embed_code": mat.embed_code.replace("{AFFILIATE_CODE}", affiliate.affiliate_code) if mat.embed_code else None,
                "download_url": f"/api/affiliate/materials/{mat.id}/download"
            }
            for mat in materials
        ],
        "pagination": {
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }
    }

@router.get("/payments")
async def get_payment_history(
    status: Optional[PaymentStatus] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    affiliate: Affiliate = Depends(get_current_affiliate),
    db: Session = Depends(get_db)
):
    """Get payment history"""
    
    query = db.query(AffiliatePayment).filter(
        AffiliatePayment.affiliate_id == affiliate.id
    )
    
    if status:
        query = query.filter(AffiliatePayment.status == status)
    
    if date_from:
        query = query.filter(AffiliatePayment.created_at >= date_from)
    
    if date_to:
        query = query.filter(AffiliatePayment.created_at <= date_to)
    
    query = query.order_by(AffiliatePayment.created_at.desc())
    
    # Paginate
    offset = (page - 1) * limit
    payments = query.offset(offset).limit(limit).all()
    total = query.count()
    
    return {
        "payments": [
            {
                "id": payment.id,
                "payment_number": payment.payment_number,
                "period": f"{payment.period_start.date()} to {payment.period_end.date()}",
                "amount": float(payment.total_payment),
                "currency": payment.currency,
                "status": payment.status.value,
                "method": payment.payment_method.value,
                "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
                "invoice_url": payment.invoice_url,
                "details": {
                    "conversions": payment.total_conversions,
                    "gross_sales": float(payment.gross_sales),
                    "commission": float(payment.base_commission),
                    "bonus": float(payment.tier_bonus + payment.performance_bonus),
                    "adjustments": float(payment.adjustments)
                }
            }
            for payment in payments
        ],
        "summary": {
            "total_paid": float(
                db.query(func.sum(AffiliatePayment.total_payment))
                .filter(
                    AffiliatePayment.affiliate_id == affiliate.id,
                    AffiliatePayment.status == PaymentStatus.PAID
                )
                .scalar() or 0
            ),
            "pending": float(
                db.query(func.sum(AffiliatePayment.total_payment))
                .filter(
                    AffiliatePayment.affiliate_id == affiliate.id,
                    AffiliatePayment.status == PaymentStatus.PENDING
                )
                .scalar() or 0
            )
        },
        "pagination": {
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }
    }

# ========================================
# HELPER FUNCTIONS
# ========================================

async def send_welcome_email(email: str, name: str, code: str, api_key: str, api_secret: str):
    """Send welcome email to new affiliate"""
    email_service = EmailService()
    await email_service.send_template_email(
        to=email,
        template="affiliate_welcome",
        subject="¡Bienvenido al Programa de Afiliados de Spirit Tours!",
        data={
            "name": name,
            "affiliate_code": code,
            "api_key": api_key,
            "api_secret": api_secret,
            "dashboard_url": "https://spirittours.com/affiliate/dashboard",
            "getting_started_url": "https://spirittours.com/affiliate/guide"
        }
    )

def generate_code_suggestions(base: str) -> List[str]:
    """Generate alternative code suggestions"""
    suggestions = []
    for i in range(3):
        random_part = secrets.token_hex(3).upper()
        suggestions.append(f"{base.upper()}{random_part}")
    return suggestions

def get_performance_badge(sales: float) -> str:
    """Get performance badge based on sales"""
    if sales >= 100000:
        return "🏆 Diamond"
    elif sales >= 50000:
        return "🥇 Platinum"
    elif sales >= 20000:
        return "🥈 Gold"
    elif sales >= 5000:
        return "🥉 Silver"
    else:
        return "⭐ Bronze"

async def get_unread_notifications_count(affiliate_id: uuid.UUID, db: Session) -> int:
    """Get count of unread notifications"""
    return db.query(func.count(AffiliateNotification.id)).filter(
        AffiliateNotification.affiliate_id == affiliate_id,
        AffiliateNotification.is_read == False
    ).scalar() or 0