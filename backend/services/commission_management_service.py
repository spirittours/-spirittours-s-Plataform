"""
Commission Management Service
Advanced commission calculation, tracking, and payment system for B2B/B2B2C partners
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union, Tuple
from enum import Enum
from decimal import Decimal, ROUND_HALF_UP
from dataclasses import dataclass, field
import uuid
import json

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, Enum as SQLEnum, DECIMAL as SQLDecimal, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, relationship
from pydantic import BaseModel, Field, validator

# Configure logging
logger = logging.getLogger(__name__)

Base = declarative_base()

class CommissionType(str, Enum):
    """Types of commission structures"""
    FLAT_RATE = "flat_rate"
    TIERED = "tiered" 
    PERFORMANCE_BASED = "performance_based"
    VOLUME_BASED = "volume_based"
    HYBRID = "hybrid"

class CommissionStatus(str, Enum):
    """Commission calculation and payment status"""
    PENDING = "pending"
    CALCULATED = "calculated"
    APPROVED = "approved"
    PAID = "paid"
    DISPUTED = "disputed"
    CANCELLED = "cancelled"

class PaymentFrequency(str, Enum):
    """Commission payment frequency"""
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    CUSTOM = "custom"

# Database Models
class CommissionStructure(Base):
    """Commission structure definition for partners"""
    __tablename__ = "commission_structures"
    
    id = Column(Integer, primary_key=True, index=True)
    structure_id = Column(String, unique=True, index=True)
    user_id = Column(String, index=True)  # Partner user ID
    name = Column(String(100), nullable=False)
    commission_type = Column(SQLEnum(CommissionType), nullable=False)
    base_rate = Column(SQLDecimal(5, 4), nullable=False)  # Base commission rate (0.0000 to 9.9999)
    
    # Tiered structure (JSON)
    tier_structure = Column(JSON, nullable=True)  # {"tier_1": {"min_volume": 0, "max_volume": 10000, "rate": 0.10}}
    
    # Performance bonuses
    performance_bonuses = Column(JSON, nullable=True)  # Performance-based bonuses
    
    # Volume discounts/bonuses
    volume_bonuses = Column(JSON, nullable=True)
    
    # Special rates for specific products/services
    product_rates = Column(JSON, nullable=True)
    
    # Payment configuration
    payment_frequency = Column(SQLEnum(PaymentFrequency), default=PaymentFrequency.MONTHLY)
    minimum_payout = Column(SQLDecimal(10, 2), default=Decimal('50.00'))
    
    # Validity period
    effective_from = Column(DateTime, default=datetime.now)
    effective_until = Column(DateTime, nullable=True)
    
    # Status and tracking
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    created_by = Column(String, nullable=True)  # Admin user who created this structure

class CommissionCalculation(Base):
    """Individual commission calculations for bookings"""
    __tablename__ = "commission_calculations"
    
    id = Column(Integer, primary_key=True, index=True)
    calculation_id = Column(String, unique=True, index=True)
    booking_id = Column(String, index=True, nullable=False)
    partner_id = Column(String, index=True, nullable=False)
    structure_id = Column(String, ForeignKey('commission_structures.structure_id'))
    
    # Booking details
    booking_amount = Column(SQLDecimal(10, 2), nullable=False)
    booking_currency = Column(String(3), default="USD")
    booking_date = Column(DateTime, nullable=False)
    
    # Commission calculation
    commission_rate_applied = Column(SQLDecimal(5, 4), nullable=False)
    commission_amount = Column(SQLDecimal(10, 2), nullable=False)
    commission_currency = Column(String(3), default="USD")
    
    # Tier and bonus information
    tier_applied = Column(String, nullable=True)
    volume_bonus = Column(SQLDecimal(10, 2), default=Decimal('0.00'))
    performance_bonus = Column(SQLDecimal(10, 2), default=Decimal('0.00'))
    special_rate_applied = Column(String, nullable=True)
    
    # Calculation metadata
    calculation_factors = Column(JSON, nullable=True)  # Detailed calculation breakdown
    
    # Status and tracking
    status = Column(SQLEnum(CommissionStatus), default=CommissionStatus.PENDING)
    calculated_at = Column(DateTime, default=datetime.now)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(String, nullable=True)
    
    # Payment tracking
    payment_batch_id = Column(String, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    
    # Relationship
    structure = relationship("CommissionStructure", backref="calculations")

class CommissionPayment(Base):
    """Commission payment batches and records"""
    __tablename__ = "commission_payments"
    
    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(String, unique=True, index=True)
    batch_id = Column(String, index=True)
    partner_id = Column(String, index=True, nullable=False)
    
    # Payment details
    total_amount = Column(SQLDecimal(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    payment_method = Column(String(50), nullable=False)  # bank_transfer, paypal, etc.
    
    # Period covered
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    
    # Calculation breakdown
    total_bookings = Column(Integer, default=0)
    total_booking_amount = Column(SQLDecimal(12, 2), default=Decimal('0.00'))
    base_commission = Column(SQLDecimal(10, 2), default=Decimal('0.00'))
    volume_bonuses = Column(SQLDecimal(10, 2), default=Decimal('0.00'))
    performance_bonuses = Column(SQLDecimal(10, 2), default=Decimal('0.00'))
    adjustments = Column(SQLDecimal(10, 2), default=Decimal('0.00'))
    
    # Processing
    status = Column(SQLEnum(CommissionStatus), default=CommissionStatus.PENDING)
    processed_at = Column(DateTime, nullable=True)
    processed_by = Column(String, nullable=True)
    
    # Payment gateway information
    payment_reference = Column(String, nullable=True)
    payment_gateway_response = Column(JSON, nullable=True)
    
    # Tracking
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

# Pydantic Models
class TierDefinition(BaseModel):
    """Tier definition for tiered commission structures"""
    tier_name: str
    min_volume: Decimal = Field(..., ge=0)
    max_volume: Optional[Decimal] = Field(None, gt=0)
    rate: Decimal = Field(..., ge=0, le=1)
    bonus_amount: Optional[Decimal] = Field(Decimal('0.00'), ge=0)

class PerformanceBonus(BaseModel):
    """Performance bonus definition"""
    metric: str  # "customer_satisfaction", "booking_volume", etc.
    threshold: Union[int, Decimal]
    bonus_rate: Decimal = Field(..., ge=0, le=1)
    bonus_amount: Optional[Decimal] = Field(Decimal('0.00'), ge=0)
    description: Optional[str] = None

class VolumeBonus(BaseModel):
    """Volume-based bonus definition"""
    min_volume: Decimal = Field(..., ge=0)
    bonus_rate: Optional[Decimal] = Field(None, ge=0, le=1)
    bonus_amount: Optional[Decimal] = Field(None, ge=0)
    description: Optional[str] = None

class CommissionStructureRequest(BaseModel):
    """Request model for creating/updating commission structures"""
    name: str = Field(..., min_length=1, max_length=100)
    commission_type: CommissionType
    base_rate: Decimal = Field(..., ge=0, le=1)
    
    # Tiered structure
    tiers: Optional[List[TierDefinition]] = Field(default_factory=list)
    
    # Performance bonuses
    performance_bonuses: Optional[List[PerformanceBonus]] = Field(default_factory=list)
    
    # Volume bonuses
    volume_bonuses: Optional[List[VolumeBonus]] = Field(default_factory=list)
    
    # Product-specific rates
    product_rates: Optional[Dict[str, Decimal]] = Field(default_factory=dict)
    
    # Payment settings
    payment_frequency: PaymentFrequency = PaymentFrequency.MONTHLY
    minimum_payout: Decimal = Field(Decimal('50.00'), ge=0)
    
    # Validity
    effective_from: datetime = Field(default_factory=datetime.now)
    effective_until: Optional[datetime] = None

class CommissionCalculationRequest(BaseModel):
    """Request model for commission calculations"""
    booking_id: str
    partner_id: str
    booking_amount: Decimal = Field(..., gt=0)
    booking_currency: str = Field(default="USD", pattern="^[A-Z]{3}$")
    booking_date: datetime
    product_type: Optional[str] = None
    additional_factors: Optional[Dict[str, Union[str, int, float, bool]]] = Field(default_factory=dict)

class CommissionCalculationResponse(BaseModel):
    """Response model for commission calculations"""
    calculation_id: str
    booking_id: str
    partner_id: str
    structure_id: str
    
    # Financial details
    booking_amount: Decimal
    commission_rate_applied: Decimal
    commission_amount: Decimal
    
    # Breakdown
    base_commission: Decimal
    tier_bonus: Decimal
    volume_bonus: Decimal
    performance_bonus: Decimal
    total_commission: Decimal
    
    # Metadata
    tier_applied: Optional[str]
    calculation_factors: Dict[str, Union[str, float, int]]
    status: CommissionStatus
    calculated_at: datetime

@dataclass
class CommissionCalculationFactors:
    """Factors used in commission calculations"""
    partner_id: str
    booking_amount: Decimal
    booking_date: datetime
    product_type: Optional[str] = None
    
    # Historical performance data
    ytd_volume: Decimal = Decimal('0.00')
    mtd_volume: Decimal = Decimal('0.00')
    qtd_volume: Decimal = Decimal('0.00')
    
    # Performance metrics
    customer_satisfaction: Optional[float] = None
    booking_count: int = 0
    
    # Additional factors
    additional_data: Dict[str, Union[str, int, float, bool]] = field(default_factory=dict)

class CommissionManagementService:
    """Advanced commission management and calculation service"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        logger.info("CommissionManagementService initialized")
    
    async def create_commission_structure(self, partner_id: str, structure_request: CommissionStructureRequest, 
                                        created_by: str) -> CommissionStructure:
        """Create a new commission structure for a partner"""
        
        try:
            # Generate unique structure ID
            structure_id = f"CS_{uuid.uuid4().hex[:12].upper()}"
            
            # Validate tier structure
            if structure_request.commission_type == CommissionType.TIERED and structure_request.tiers:
                self._validate_tier_structure(structure_request.tiers)
            
            # Create structure
            structure = CommissionStructure(
                structure_id=structure_id,
                user_id=partner_id,
                name=structure_request.name,
                commission_type=structure_request.commission_type,
                base_rate=structure_request.base_rate,
                tier_structure=self._format_tier_structure(structure_request.tiers) if structure_request.tiers else None,
                performance_bonuses=self._format_performance_bonuses(structure_request.performance_bonuses) if structure_request.performance_bonuses else None,
                volume_bonuses=self._format_volume_bonuses(structure_request.volume_bonuses) if structure_request.volume_bonuses else None,
                product_rates=dict(structure_request.product_rates) if structure_request.product_rates else None,
                payment_frequency=structure_request.payment_frequency,
                minimum_payout=structure_request.minimum_payout,
                effective_from=structure_request.effective_from,
                effective_until=structure_request.effective_until,
                created_by=created_by
            )
            
            # Deactivate any existing active structures
            existing_structures = self.db.query(CommissionStructure).filter(
                CommissionStructure.user_id == partner_id,
                CommissionStructure.is_active == True
            ).all()
            
            for existing in existing_structures:
                existing.is_active = False
                existing.effective_until = datetime.now()
            
            # Save new structure
            self.db.add(structure)
            self.db.commit()
            
            logger.info(f"Commission structure created: {structure_id} for partner {partner_id}")
            return structure
            
        except Exception as e:
            logger.error(f"Error creating commission structure: {e}")
            self.db.rollback()
            raise
    
    async def calculate_commission(self, calculation_request: CommissionCalculationRequest) -> CommissionCalculationResponse:
        """Calculate commission for a booking"""
        
        try:
            # Get active commission structure for partner
            structure = self.db.query(CommissionStructure).filter(
                CommissionStructure.user_id == calculation_request.partner_id,
                CommissionStructure.is_active == True,
                CommissionStructure.effective_from <= calculation_request.booking_date,
                (CommissionStructure.effective_until.is_(None) | 
                 (CommissionStructure.effective_until >= calculation_request.booking_date))
            ).first()
            
            if not structure:
                raise ValueError(f"No active commission structure found for partner {calculation_request.partner_id}")
            
            # Gather calculation factors
            factors = await self._gather_calculation_factors(calculation_request)
            
            # Perform calculation based on commission type
            calculation_result = await self._perform_commission_calculation(structure, factors)
            
            # Create calculation record
            calculation_id = f"CC_{uuid.uuid4().hex[:12].upper()}"
            
            calculation = CommissionCalculation(
                calculation_id=calculation_id,
                booking_id=calculation_request.booking_id,
                partner_id=calculation_request.partner_id,
                structure_id=structure.structure_id,
                booking_amount=calculation_request.booking_amount,
                booking_currency=calculation_request.booking_currency,
                booking_date=calculation_request.booking_date,
                commission_rate_applied=calculation_result["rate_applied"],
                commission_amount=calculation_result["total_amount"],
                tier_applied=calculation_result.get("tier_applied"),
                volume_bonus=calculation_result["volume_bonus"],
                performance_bonus=calculation_result["performance_bonus"],
                special_rate_applied=calculation_result.get("special_rate_applied"),
                calculation_factors=calculation_result["factors"],
                status=CommissionStatus.CALCULATED
            )
            
            self.db.add(calculation)
            self.db.commit()
            
            # Prepare response
            response = CommissionCalculationResponse(
                calculation_id=calculation_id,
                booking_id=calculation_request.booking_id,
                partner_id=calculation_request.partner_id,
                structure_id=structure.structure_id,
                booking_amount=calculation_request.booking_amount,
                commission_rate_applied=calculation_result["rate_applied"],
                commission_amount=calculation_result["total_amount"],
                base_commission=calculation_result["base_amount"],
                tier_bonus=calculation_result["tier_bonus"],
                volume_bonus=calculation_result["volume_bonus"],
                performance_bonus=calculation_result["performance_bonus"],
                total_commission=calculation_result["total_amount"],
                tier_applied=calculation_result.get("tier_applied"),
                calculation_factors=calculation_result["factors"],
                status=CommissionStatus.CALCULATED,
                calculated_at=datetime.now()
            )
            
            logger.info(f"Commission calculated: {calculation_id} - ${calculation_result['total_amount']}")
            return response
            
        except Exception as e:
            logger.error(f"Error calculating commission: {e}")
            self.db.rollback()
            raise
    
    async def process_commission_payment_batch(self, partner_ids: List[str], period_start: datetime,
                                             period_end: datetime, processed_by: str) -> Dict[str, Union[str, int, Decimal]]:
        """Process commission payments for multiple partners"""
        
        try:
            batch_id = f"CPB_{datetime.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:8].upper()}"
            processed_payments = []
            total_amount = Decimal('0.00')
            
            for partner_id in partner_ids:
                payment_result = await self._process_partner_payment(
                    partner_id, period_start, period_end, batch_id, processed_by
                )
                
                if payment_result:
                    processed_payments.append(payment_result)
                    total_amount += payment_result["amount"]
            
            logger.info(f"Commission batch processed: {batch_id} - {len(processed_payments)} payments - ${total_amount}")
            
            return {
                "batch_id": batch_id,
                "total_payments": len(processed_payments),
                "total_amount": total_amount,
                "processed_at": datetime.now().isoformat(),
                "payments": processed_payments
            }
            
        except Exception as e:
            logger.error(f"Error processing commission batch: {e}")
            raise
    
    async def get_partner_commission_summary(self, partner_id: str, period_start: datetime,
                                           period_end: datetime) -> Dict[str, Union[str, int, Decimal]]:
        """Get commission summary for a partner for a specific period"""
        
        try:
            # Get all calculations for the period
            calculations = self.db.query(CommissionCalculation).filter(
                CommissionCalculation.partner_id == partner_id,
                CommissionCalculation.booking_date >= period_start,
                CommissionCalculation.booking_date <= period_end,
                CommissionCalculation.status.in_([CommissionStatus.CALCULATED, CommissionStatus.APPROVED, CommissionStatus.PAID])
            ).all()
            
            if not calculations:
                return {
                    "partner_id": partner_id,
                    "period_start": period_start.isoformat(),
                    "period_end": period_end.isoformat(),
                    "total_bookings": 0,
                    "total_booking_amount": Decimal('0.00'),
                    "total_commission": Decimal('0.00'),
                    "average_rate": Decimal('0.00'),
                    "calculations": []
                }
            
            # Calculate totals
            total_bookings = len(calculations)
            total_booking_amount = sum(calc.booking_amount for calc in calculations)
            total_commission = sum(calc.commission_amount for calc in calculations)
            average_rate = total_commission / total_booking_amount if total_booking_amount > 0 else Decimal('0.00')
            
            # Format calculation details
            calculation_details = [
                {
                    "calculation_id": calc.calculation_id,
                    "booking_id": calc.booking_id,
                    "booking_amount": float(calc.booking_amount),
                    "commission_amount": float(calc.commission_amount),
                    "commission_rate": float(calc.commission_rate_applied),
                    "status": calc.status.value,
                    "calculated_at": calc.calculated_at.isoformat()
                }
                for calc in calculations
            ]
            
            return {
                "partner_id": partner_id,
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
                "total_bookings": total_bookings,
                "total_booking_amount": total_booking_amount,
                "total_commission": total_commission,
                "average_rate": average_rate,
                "calculations": calculation_details
            }
            
        except Exception as e:
            logger.error(f"Error getting partner commission summary: {e}")
            raise
    
    async def approve_commission_calculations(self, calculation_ids: List[str], approved_by: str) -> Dict[str, int]:
        """Approve multiple commission calculations"""
        
        try:
            approved_count = 0
            
            for calculation_id in calculation_ids:
                calculation = self.db.query(CommissionCalculation).filter(
                    CommissionCalculation.calculation_id == calculation_id,
                    CommissionCalculation.status == CommissionStatus.CALCULATED
                ).first()
                
                if calculation:
                    calculation.status = CommissionStatus.APPROVED
                    calculation.approved_at = datetime.now()
                    calculation.approved_by = approved_by
                    approved_count += 1
            
            self.db.commit()
            
            logger.info(f"Approved {approved_count} commission calculations by {approved_by}")
            
            return {
                "approved_count": approved_count,
                "total_requested": len(calculation_ids),
                "approved_by": approved_by,
                "approved_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error approving commission calculations: {e}")
            self.db.rollback()
            raise
    
    # Private helper methods
    def _validate_tier_structure(self, tiers: List[TierDefinition]) -> None:
        """Validate tier structure for consistency"""
        
        if not tiers:
            return
        
        # Sort tiers by min_volume
        sorted_tiers = sorted(tiers, key=lambda t: t.min_volume)
        
        for i, tier in enumerate(sorted_tiers):
            # Check for overlapping ranges
            if i > 0:
                prev_tier = sorted_tiers[i-1]
                if prev_tier.max_volume and tier.min_volume < prev_tier.max_volume:
                    raise ValueError(f"Tier ranges overlap: {prev_tier.tier_name} and {tier.tier_name}")
            
            # Check for valid ranges
            if tier.max_volume and tier.min_volume >= tier.max_volume:
                raise ValueError(f"Invalid tier range for {tier.tier_name}")
    
    def _format_tier_structure(self, tiers: List[TierDefinition]) -> Dict[str, Dict]:
        """Format tier structure for database storage"""
        
        tier_dict = {}
        for tier in tiers:
            tier_dict[tier.tier_name] = {
                "min_volume": float(tier.min_volume),
                "max_volume": float(tier.max_volume) if tier.max_volume else None,
                "rate": float(tier.rate),
                "bonus_amount": float(tier.bonus_amount) if tier.bonus_amount else 0.0
            }
        
        return tier_dict
    
    def _format_performance_bonuses(self, bonuses: List[PerformanceBonus]) -> Dict[str, Dict]:
        """Format performance bonuses for database storage"""
        
        bonus_dict = {}
        for i, bonus in enumerate(bonuses):
            bonus_dict[f"bonus_{i+1}"] = {
                "metric": bonus.metric,
                "threshold": float(bonus.threshold) if isinstance(bonus.threshold, Decimal) else bonus.threshold,
                "bonus_rate": float(bonus.bonus_rate),
                "bonus_amount": float(bonus.bonus_amount) if bonus.bonus_amount else 0.0,
                "description": bonus.description or ""
            }
        
        return bonus_dict
    
    def _format_volume_bonuses(self, bonuses: List[VolumeBonus]) -> Dict[str, Dict]:
        """Format volume bonuses for database storage"""
        
        bonus_dict = {}
        for i, bonus in enumerate(bonuses):
            bonus_dict[f"volume_bonus_{i+1}"] = {
                "min_volume": float(bonus.min_volume),
                "bonus_rate": float(bonus.bonus_rate) if bonus.bonus_rate else 0.0,
                "bonus_amount": float(bonus.bonus_amount) if bonus.bonus_amount else 0.0,
                "description": bonus.description or ""
            }
        
        return bonus_dict
    
    async def _gather_calculation_factors(self, request: CommissionCalculationRequest) -> CommissionCalculationFactors:
        """Gather all factors needed for commission calculation"""
        
        # Calculate historical volumes
        current_year_start = datetime(request.booking_date.year, 1, 1)
        current_month_start = datetime(request.booking_date.year, request.booking_date.month, 1)
        current_quarter_start = datetime(request.booking_date.year, ((request.booking_date.month - 1) // 3) * 3 + 1, 1)
        
        # YTD volume
        ytd_calcs = self.db.query(CommissionCalculation).filter(
            CommissionCalculation.partner_id == request.partner_id,
            CommissionCalculation.booking_date >= current_year_start,
            CommissionCalculation.booking_date < request.booking_date
        ).all()
        ytd_volume = sum(calc.booking_amount for calc in ytd_calcs)
        
        # MTD volume
        mtd_calcs = self.db.query(CommissionCalculation).filter(
            CommissionCalculation.partner_id == request.partner_id,
            CommissionCalculation.booking_date >= current_month_start,
            CommissionCalculation.booking_date < request.booking_date
        ).all()
        mtd_volume = sum(calc.booking_amount for calc in mtd_calcs)
        
        # QTD volume
        qtd_calcs = self.db.query(CommissionCalculation).filter(
            CommissionCalculation.partner_id == request.partner_id,
            CommissionCalculation.booking_date >= current_quarter_start,
            CommissionCalculation.booking_date < request.booking_date
        ).all()
        qtd_volume = sum(calc.booking_amount for calc in qtd_calcs)
        
        return CommissionCalculationFactors(
            partner_id=request.partner_id,
            booking_amount=request.booking_amount,
            booking_date=request.booking_date,
            product_type=request.product_type,
            ytd_volume=ytd_volume,
            mtd_volume=mtd_volume,
            qtd_volume=qtd_volume,
            booking_count=len(ytd_calcs),
            additional_data=request.additional_factors
        )
    
    async def _perform_commission_calculation(self, structure: CommissionStructure, 
                                            factors: CommissionCalculationFactors) -> Dict[str, Union[Decimal, str, Dict]]:
        """Perform the actual commission calculation based on structure type"""
        
        base_amount = factors.booking_amount * structure.base_rate
        tier_bonus = Decimal('0.00')
        volume_bonus = Decimal('0.00')
        performance_bonus = Decimal('0.00')
        
        rate_applied = structure.base_rate
        tier_applied = None
        special_rate_applied = None
        
        # Tiered commission calculation
        if structure.commission_type == CommissionType.TIERED and structure.tier_structure:
            tier_result = self._calculate_tier_commission(structure.tier_structure, factors)
            rate_applied = tier_result["rate"]
            base_amount = factors.booking_amount * rate_applied
            tier_bonus = tier_result["bonus"]
            tier_applied = tier_result["tier_name"]
        
        # Volume bonuses
        if structure.volume_bonuses:
            volume_bonus = self._calculate_volume_bonuses(structure.volume_bonuses, factors)
        
        # Performance bonuses
        if structure.performance_bonuses:
            performance_bonus = self._calculate_performance_bonuses(structure.performance_bonuses, factors)
        
        # Product-specific rates
        if factors.product_type and structure.product_rates and factors.product_type in structure.product_rates:
            product_rate = Decimal(str(structure.product_rates[factors.product_type]))
            base_amount = factors.booking_amount * product_rate
            rate_applied = product_rate
            special_rate_applied = f"Product rate for {factors.product_type}"
        
        total_amount = base_amount + tier_bonus + volume_bonus + performance_bonus
        
        # Round to 2 decimal places
        total_amount = total_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        return {
            "base_amount": base_amount,
            "tier_bonus": tier_bonus,
            "volume_bonus": volume_bonus,
            "performance_bonus": performance_bonus,
            "total_amount": total_amount,
            "rate_applied": rate_applied,
            "tier_applied": tier_applied,
            "special_rate_applied": special_rate_applied,
            "factors": {
                "ytd_volume": float(factors.ytd_volume),
                "mtd_volume": float(factors.mtd_volume),
                "qtd_volume": float(factors.qtd_volume),
                "booking_count": factors.booking_count,
                "calculation_method": structure.commission_type.value
            }
        }
    
    def _calculate_tier_commission(self, tier_structure: Dict, factors: CommissionCalculationFactors) -> Dict[str, Union[Decimal, str]]:
        """Calculate tier-based commission"""
        
        applicable_tier = None
        applicable_rate = Decimal('0.00')
        bonus_amount = Decimal('0.00')
        
        # Use YTD volume for tier determination
        volume = factors.ytd_volume + factors.booking_amount
        
        for tier_name, tier_config in tier_structure.items():
            min_vol = Decimal(str(tier_config["min_volume"]))
            max_vol = Decimal(str(tier_config["max_volume"])) if tier_config["max_volume"] else None
            
            if volume >= min_vol and (max_vol is None or volume <= max_vol):
                applicable_tier = tier_name
                applicable_rate = Decimal(str(tier_config["rate"]))
                bonus_amount = Decimal(str(tier_config.get("bonus_amount", 0.0)))
                break
        
        return {
            "tier_name": applicable_tier,
            "rate": applicable_rate,
            "bonus": bonus_amount
        }
    
    def _calculate_volume_bonuses(self, volume_bonuses: Dict, factors: CommissionCalculationFactors) -> Decimal:
        """Calculate volume-based bonuses"""
        
        total_bonus = Decimal('0.00')
        
        for bonus_name, bonus_config in volume_bonuses.items():
            min_volume = Decimal(str(bonus_config["min_volume"]))
            
            # Check if current volume qualifies
            if factors.ytd_volume >= min_volume:
                if bonus_config.get("bonus_rate"):
                    bonus_rate = Decimal(str(bonus_config["bonus_rate"]))
                    total_bonus += factors.booking_amount * bonus_rate
                elif bonus_config.get("bonus_amount"):
                    bonus_amount = Decimal(str(bonus_config["bonus_amount"]))
                    total_bonus += bonus_amount
        
        return total_bonus
    
    def _calculate_performance_bonuses(self, performance_bonuses: Dict, factors: CommissionCalculationFactors) -> Decimal:
        """Calculate performance-based bonuses"""
        
        total_bonus = Decimal('0.00')
        
        for bonus_name, bonus_config in performance_bonuses.items():
            metric = bonus_config["metric"]
            threshold = bonus_config["threshold"]
            
            # Get metric value from factors
            metric_value = None
            if metric == "booking_volume":
                metric_value = float(factors.ytd_volume)
            elif metric == "booking_count":
                metric_value = factors.booking_count
            elif metric in factors.additional_data:
                metric_value = factors.additional_data[metric]
            
            # Check if threshold is met
            if metric_value and metric_value >= threshold:
                if bonus_config.get("bonus_rate"):
                    bonus_rate = Decimal(str(bonus_config["bonus_rate"]))
                    total_bonus += factors.booking_amount * bonus_rate
                elif bonus_config.get("bonus_amount"):
                    bonus_amount = Decimal(str(bonus_config["bonus_amount"]))
                    total_bonus += bonus_amount
        
        return total_bonus
    
    async def _process_partner_payment(self, partner_id: str, period_start: datetime, 
                                     period_end: datetime, batch_id: str, processed_by: str) -> Optional[Dict[str, Union[str, Decimal]]]:
        """Process payment for a single partner"""
        
        try:
            # Get approved calculations for the period
            calculations = self.db.query(CommissionCalculation).filter(
                CommissionCalculation.partner_id == partner_id,
                CommissionCalculation.booking_date >= period_start,
                CommissionCalculation.booking_date <= period_end,
                CommissionCalculation.status == CommissionStatus.APPROVED,
                CommissionCalculation.payment_batch_id.is_(None)
            ).all()
            
            if not calculations:
                return None
            
            # Calculate totals
            total_amount = sum(calc.commission_amount for calc in calculations)
            total_bookings = len(calculations)
            total_booking_amount = sum(calc.booking_amount for calc in calculations)
            base_commission = sum(calc.commission_amount - calc.volume_bonus - calc.performance_bonus for calc in calculations)
            volume_bonuses = sum(calc.volume_bonus for calc in calculations)
            performance_bonuses = sum(calc.performance_bonus for calc in calculations)
            
            # Check minimum payout
            partner_structure = self.db.query(CommissionStructure).filter(
                CommissionStructure.user_id == partner_id,
                CommissionStructure.is_active == True
            ).first()
            
            minimum_payout = partner_structure.minimum_payout if partner_structure else Decimal('50.00')
            
            if total_amount < minimum_payout:
                logger.info(f"Partner {partner_id} payment ${total_amount} below minimum ${minimum_payout} - skipping")
                return None
            
            # Create payment record
            payment_id = f"CP_{uuid.uuid4().hex[:12].upper()}"
            
            payment = CommissionPayment(
                payment_id=payment_id,
                batch_id=batch_id,
                partner_id=partner_id,
                total_amount=total_amount,
                period_start=period_start,
                period_end=period_end,
                total_bookings=total_bookings,
                total_booking_amount=total_booking_amount,
                base_commission=base_commission,
                volume_bonuses=volume_bonuses,
                performance_bonuses=performance_bonuses,
                payment_method="bank_transfer",  # Default method
                status=CommissionStatus.APPROVED,
                processed_by=processed_by
            )
            
            self.db.add(payment)
            
            # Update calculations with payment batch
            for calc in calculations:
                calc.payment_batch_id = batch_id
                calc.status = CommissionStatus.PAID
                calc.paid_at = datetime.now()
            
            self.db.commit()
            
            return {
                "payment_id": payment_id,
                "partner_id": partner_id,
                "amount": total_amount,
                "bookings": total_bookings
            }
            
        except Exception as e:
            logger.error(f"Error processing partner payment for {partner_id}: {e}")
            self.db.rollback()
            raise