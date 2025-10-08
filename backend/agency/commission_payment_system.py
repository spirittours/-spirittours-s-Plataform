"""
Commission and Payment System for Travel Agencies
Handles commission calculation, tracking, and automated payouts
"""

import uuid
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from enum import Enum
import asyncio
import stripe
import pandas as pd
from sqlalchemy import Column, String, Float, Boolean, DateTime, JSON, ForeignKey, Numeric, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
import logging
from dataclasses import dataclass
import boto3
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import io

Base = declarative_base()
logger = logging.getLogger(__name__)

class TransactionType(Enum):
    """Types of commission transactions"""
    BOOKING_COMMISSION = "booking_commission"
    VOLUME_BONUS = "volume_bonus"
    PERFORMANCE_BONUS = "performance_bonus"
    SPECIAL_INCENTIVE = "special_incentive"
    ADJUSTMENT = "adjustment"
    PAYOUT = "payout"
    REVERSAL = "reversal"


class PayoutStatus(Enum):
    """Payout status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ProductType(Enum):
    """Product types for commission calculation"""
    FLIGHT = "flight"
    HOTEL = "hotel"
    PACKAGE = "package"
    ACTIVITY = "activity"
    INSURANCE = "insurance"
    CAR_RENTAL = "car_rental"
    CRUISE = "cruise"
    TRAIN = "train"


@dataclass
class CommissionRule:
    """Commission rule configuration"""
    product_type: ProductType
    base_rate: Decimal
    tier_bonuses: Dict[str, Decimal]  # Tier -> bonus rate
    volume_thresholds: List[Tuple[Decimal, Decimal]]  # (threshold, bonus)
    special_conditions: Dict[str, Any]  # Special rules
    
    def calculate_rate(self, agency_tier: str, volume: Decimal) -> Decimal:
        """Calculate commission rate based on tier and volume"""
        rate = self.base_rate
        
        # Add tier bonus
        rate += self.tier_bonuses.get(agency_tier, Decimal(0))
        
        # Add volume bonus
        for threshold, bonus in self.volume_thresholds:
            if volume >= threshold:
                rate += bonus
        
        return rate


class CommissionTransaction(Base):
    """Commission transaction record"""
    __tablename__ = 'commission_transactions'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agency_id = Column(String, ForeignKey('travel_agencies.id'), nullable=False)
    booking_id = Column(String, nullable=False)
    
    # Transaction details
    transaction_type = Column(String, nullable=False)
    product_type = Column(String, nullable=False)
    transaction_date = Column(DateTime, default=datetime.utcnow)
    
    # Amounts
    booking_amount = Column(Numeric(10, 2), nullable=False)
    commission_rate = Column(Numeric(5, 4), nullable=False)  # e.g., 0.1234 = 12.34%
    commission_amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String, default="USD")
    
    # Status
    status = Column(String, default="pending")
    is_paid = Column(Boolean, default=False)
    paid_date = Column(DateTime)
    payout_id = Column(String, ForeignKey('commission_payouts.id'))
    
    # Metadata
    description = Column(String)
    metadata = Column(JSON)
    
    # Relationships
    agency = relationship("TravelAgency", backref="commissions")
    payout = relationship("CommissionPayout", backref="transactions")


class CommissionPayout(Base):
    """Commission payout record"""
    __tablename__ = 'commission_payouts'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agency_id = Column(String, ForeignKey('travel_agencies.id'), nullable=False)
    
    # Payout details
    payout_date = Column(DateTime, default=datetime.utcnow)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    
    # Amounts
    total_amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String, default="USD")
    transaction_count = Column(Integer, default=0)
    
    # Payment details
    payment_method = Column(String, default="bank_transfer")
    payment_reference = Column(String)
    bank_account_id = Column(String)
    stripe_payout_id = Column(String)
    
    # Status
    status = Column(String, default=PayoutStatus.PENDING.value)
    processed_date = Column(DateTime)
    
    # Documentation
    invoice_number = Column(String, unique=True)
    invoice_url = Column(String)
    statement_url = Column(String)
    
    # Metadata
    notes = Column(String)
    metadata = Column(JSON)
    
    # Relationships
    agency = relationship("TravelAgency", backref="payouts")


class CommissionCalculator:
    """Calculates commissions for bookings"""
    
    def __init__(self):
        self.rules = self._initialize_commission_rules()
        
    def _initialize_commission_rules(self) -> Dict[ProductType, CommissionRule]:
        """Initialize commission rules for each product type"""
        return {
            ProductType.FLIGHT: CommissionRule(
                product_type=ProductType.FLIGHT,
                base_rate=Decimal("0.08"),
                tier_bonuses={
                    "starter": Decimal("0"),
                    "bronze": Decimal("0.01"),
                    "silver": Decimal("0.02"),
                    "gold": Decimal("0.03"),
                    "platinum": Decimal("0.04"),
                    "enterprise": Decimal("0.05")
                },
                volume_thresholds=[
                    (Decimal("50000"), Decimal("0.01")),
                    (Decimal("200000"), Decimal("0.02")),
                    (Decimal("500000"), Decimal("0.03"))
                ],
                special_conditions={}
            ),
            ProductType.HOTEL: CommissionRule(
                product_type=ProductType.HOTEL,
                base_rate=Decimal("0.10"),
                tier_bonuses={
                    "starter": Decimal("0"),
                    "bronze": Decimal("0.02"),
                    "silver": Decimal("0.03"),
                    "gold": Decimal("0.05"),
                    "platinum": Decimal("0.07"),
                    "enterprise": Decimal("0.10")
                },
                volume_thresholds=[
                    (Decimal("30000"), Decimal("0.02")),
                    (Decimal("100000"), Decimal("0.03")),
                    (Decimal("300000"), Decimal("0.05"))
                ],
                special_conditions={"luxury_bonus": Decimal("0.02")}
            ),
            ProductType.PACKAGE: CommissionRule(
                product_type=ProductType.PACKAGE,
                base_rate=Decimal("0.12"),
                tier_bonuses={
                    "starter": Decimal("0"),
                    "bronze": Decimal("0.01"),
                    "silver": Decimal("0.02"),
                    "gold": Decimal("0.03"),
                    "platinum": Decimal("0.05"),
                    "enterprise": Decimal("0.08")
                },
                volume_thresholds=[
                    (Decimal("40000"), Decimal("0.02")),
                    (Decimal("150000"), Decimal("0.04")),
                    (Decimal("400000"), Decimal("0.06"))
                ],
                special_conditions={}
            ),
            ProductType.ACTIVITY: CommissionRule(
                product_type=ProductType.ACTIVITY,
                base_rate=Decimal("0.15"),
                tier_bonuses={
                    "starter": Decimal("0"),
                    "bronze": Decimal("0.02"),
                    "silver": Decimal("0.03"),
                    "gold": Decimal("0.05"),
                    "platinum": Decimal("0.07"),
                    "enterprise": Decimal("0.10")
                },
                volume_thresholds=[
                    (Decimal("20000"), Decimal("0.03")),
                    (Decimal("75000"), Decimal("0.05")),
                    (Decimal("200000"), Decimal("0.08"))
                ],
                special_conditions={}
            ),
            ProductType.INSURANCE: CommissionRule(
                product_type=ProductType.INSURANCE,
                base_rate=Decimal("0.20"),
                tier_bonuses={
                    "starter": Decimal("0"),
                    "bronze": Decimal("0.05"),
                    "silver": Decimal("0.10"),
                    "gold": Decimal("0.15"),
                    "platinum": Decimal("0.20"),
                    "enterprise": Decimal("0.25")
                },
                volume_thresholds=[
                    (Decimal("10000"), Decimal("0.05")),
                    (Decimal("50000"), Decimal("0.10")),
                    (Decimal("150000"), Decimal("0.15"))
                ],
                special_conditions={"annual_policy_bonus": Decimal("0.05")}
            )
        }
    
    async def calculate_commission(
        self,
        booking_data: Dict,
        agency_tier: str,
        monthly_volume: Decimal
    ) -> Dict:
        """Calculate commission for a booking"""
        
        product_type = ProductType(booking_data["product_type"])
        booking_amount = Decimal(str(booking_data["amount"]))
        
        # Get commission rule
        rule = self.rules.get(product_type)
        if not rule:
            raise ValueError(f"No commission rule for product type: {product_type}")
        
        # Calculate rate
        commission_rate = rule.calculate_rate(agency_tier, monthly_volume)
        
        # Apply special conditions
        if "luxury" in booking_data.get("tags", []) and "luxury_bonus" in rule.special_conditions:
            commission_rate += rule.special_conditions["luxury_bonus"]
        
        # Calculate commission amount
        commission_amount = (booking_amount * commission_rate).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        
        return {
            "booking_id": booking_data["booking_id"],
            "product_type": product_type.value,
            "booking_amount": float(booking_amount),
            "commission_rate": float(commission_rate),
            "commission_amount": float(commission_amount),
            "currency": booking_data.get("currency", "USD")
        }


class PaymentProcessor:
    """Processes commission payments to agencies"""
    
    def __init__(self, db_session, stripe_client=None):
        self.db_session = db_session
        self.stripe = stripe_client or stripe
        stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
        self.s3_client = boto3.client('s3')
        
    async def process_monthly_payouts(self) -> List[Dict]:
        """Process monthly commission payouts for all agencies"""
        
        # Get current period
        today = datetime.utcnow()
        period_end = today.replace(day=1) - timedelta(days=1)  # Last day of previous month
        period_start = period_end.replace(day=1)
        
        # Get all active agencies
        agencies = self.db_session.query(TravelAgency).filter_by(
            is_active=True,
            is_verified=True
        ).all()
        
        payout_results = []
        
        for agency in agencies:
            try:
                result = await self.process_agency_payout(
                    agency.id,
                    period_start,
                    period_end
                )
                payout_results.append(result)
            except Exception as e:
                logger.error(f"Failed to process payout for agency {agency.id}: {e}")
                payout_results.append({
                    "agency_id": agency.id,
                    "status": "failed",
                    "error": str(e)
                })
        
        return payout_results
    
    async def process_agency_payout(
        self,
        agency_id: str,
        period_start: datetime,
        period_end: datetime
    ) -> Dict:
        """Process payout for a single agency"""
        
        # Get unpaid commissions for the period
        transactions = self.db_session.query(CommissionTransaction).filter(
            CommissionTransaction.agency_id == agency_id,
            CommissionTransaction.transaction_date >= period_start,
            CommissionTransaction.transaction_date <= period_end,
            CommissionTransaction.is_paid == False,
            CommissionTransaction.status == "approved"
        ).all()
        
        if not transactions:
            return {
                "agency_id": agency_id,
                "status": "no_transactions",
                "message": "No unpaid commissions for this period"
            }
        
        # Calculate total amount
        total_amount = sum(Decimal(str(t.commission_amount)) for t in transactions)
        
        # Check minimum payout threshold
        if total_amount < Decimal("100.00"):
            return {
                "agency_id": agency_id,
                "status": "below_threshold",
                "amount": float(total_amount),
                "message": "Amount below minimum payout threshold ($100)"
            }
        
        # Create payout record
        payout = CommissionPayout(
            agency_id=agency_id,
            period_start=period_start,
            period_end=period_end,
            total_amount=total_amount,
            transaction_count=len(transactions),
            invoice_number=self._generate_invoice_number(),
            status=PayoutStatus.PROCESSING.value
        )
        
        self.db_session.add(payout)
        self.db_session.flush()
        
        # Link transactions to payout
        for transaction in transactions:
            transaction.payout_id = payout.id
            transaction.is_paid = True
            transaction.paid_date = datetime.utcnow()
        
        # Process payment
        payment_result = await self._process_payment(payout)
        
        if payment_result["success"]:
            payout.status = PayoutStatus.COMPLETED.value
            payout.processed_date = datetime.utcnow()
            payout.payment_reference = payment_result["reference"]
            payout.stripe_payout_id = payment_result.get("stripe_payout_id")
            
            # Generate documents
            invoice_url = await self._generate_invoice(payout, transactions)
            statement_url = await self._generate_statement(payout, transactions)
            
            payout.invoice_url = invoice_url
            payout.statement_url = statement_url
            
            # Send notification
            await self._send_payout_notification(payout)
        else:
            payout.status = PayoutStatus.FAILED.value
            payout.notes = payment_result.get("error")
        
        self.db_session.commit()
        
        return {
            "agency_id": agency_id,
            "payout_id": payout.id,
            "status": payout.status,
            "amount": float(total_amount),
            "transaction_count": len(transactions),
            "invoice_number": payout.invoice_number,
            "payment_reference": payout.payment_reference
        }
    
    async def _process_payment(self, payout: CommissionPayout) -> Dict:
        """Process the actual payment"""
        
        agency = payout.agency
        
        try:
            # For Stripe Connect (if agency has connected account)
            if agency.stripe_account_id:
                transfer = self.stripe.Transfer.create(
                    amount=int(payout.total_amount * 100),  # Convert to cents
                    currency=payout.currency.lower(),
                    destination=agency.stripe_account_id,
                    description=f"Commission payout for period {payout.period_start.strftime('%B %Y')}",
                    metadata={
                        "payout_id": payout.id,
                        "agency_id": agency.id,
                        "invoice_number": payout.invoice_number
                    }
                )
                
                return {
                    "success": True,
                    "reference": transfer.id,
                    "stripe_payout_id": transfer.id
                }
            
            # For bank transfer (manual processing)
            elif agency.bank_account_id:
                # Create payout request for manual processing
                return {
                    "success": True,
                    "reference": f"BANK-{payout.invoice_number}",
                    "method": "bank_transfer_pending"
                }
            
            else:
                return {
                    "success": False,
                    "error": "No payment method configured for agency"
                }
                
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error processing payout: {e}")
            return {
                "success": False,
                "error": str(e)
            }
        except Exception as e:
            logger.error(f"Error processing payout: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _generate_invoice_number(self) -> str:
        """Generate unique invoice number"""
        prefix = "INV"
        date_part = datetime.utcnow().strftime("%Y%m")
        
        # Get last invoice number for this month
        last_invoice = self.db_session.query(CommissionPayout).filter(
            CommissionPayout.invoice_number.like(f"{prefix}{date_part}%")
        ).order_by(CommissionPayout.invoice_number.desc()).first()
        
        if last_invoice:
            last_number = int(last_invoice.invoice_number[-4:])
            new_number = last_number + 1
        else:
            new_number = 1
        
        return f"{prefix}{date_part}{new_number:04d}"
    
    async def _generate_invoice(
        self,
        payout: CommissionPayout,
        transactions: List[CommissionTransaction]
    ) -> str:
        """Generate PDF invoice"""
        
        # Create PDF in memory
        buffer = io.BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=letter)
        
        # Add invoice header
        pdf.setFont("Helvetica-Bold", 16)
        pdf.drawString(50, 750, "COMMISSION INVOICE")
        
        pdf.setFont("Helvetica", 10)
        pdf.drawString(50, 730, f"Invoice Number: {payout.invoice_number}")
        pdf.drawString(50, 715, f"Date: {payout.payout_date.strftime('%Y-%m-%d')}")
        pdf.drawString(50, 700, f"Period: {payout.period_start.strftime('%B %Y')}")
        
        # Add agency details
        agency = payout.agency
        pdf.drawString(50, 670, f"Agency: {agency.company_name}")
        pdf.drawString(50, 655, f"Agency Code: {agency.agency_code}")
        
        # Add transaction summary
        y_position = 620
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(50, y_position, "Commission Summary")
        
        y_position -= 20
        pdf.setFont("Helvetica", 10)
        
        # Group transactions by product type
        product_totals = {}
        for transaction in transactions:
            if transaction.product_type not in product_totals:
                product_totals[transaction.product_type] = {
                    "count": 0,
                    "booking_total": Decimal(0),
                    "commission_total": Decimal(0)
                }
            product_totals[transaction.product_type]["count"] += 1
            product_totals[transaction.product_type]["booking_total"] += transaction.booking_amount
            product_totals[transaction.product_type]["commission_total"] += transaction.commission_amount
        
        for product_type, totals in product_totals.items():
            pdf.drawString(50, y_position, f"{product_type}:")
            pdf.drawString(200, y_position, f"{totals['count']} bookings")
            pdf.drawString(300, y_position, f"${totals['booking_total']:,.2f} sales")
            pdf.drawString(420, y_position, f"${totals['commission_total']:,.2f} commission")
            y_position -= 15
        
        # Add total
        pdf.setFont("Helvetica-Bold", 12)
        y_position -= 20
        pdf.drawString(50, y_position, "Total Commission:")
        pdf.drawString(420, y_position, f"${payout.total_amount:,.2f}")
        
        # Save PDF
        pdf.save()
        buffer.seek(0)
        
        # Upload to S3
        s3_key = f"invoices/{payout.agency_id}/{payout.invoice_number}.pdf"
        self.s3_client.put_object(
            Bucket='spirittours-documents',
            Key=s3_key,
            Body=buffer.getvalue(),
            ContentType='application/pdf'
        )
        
        # Generate presigned URL
        url = self.s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': 'spirittours-documents', 'Key': s3_key},
            ExpiresIn=86400 * 30  # 30 days
        )
        
        return url
    
    async def _generate_statement(
        self,
        payout: CommissionPayout,
        transactions: List[CommissionTransaction]
    ) -> str:
        """Generate detailed statement"""
        
        # Create detailed Excel statement
        data = []
        for transaction in transactions:
            data.append({
                "Booking ID": transaction.booking_id,
                "Date": transaction.transaction_date.strftime('%Y-%m-%d'),
                "Product Type": transaction.product_type,
                "Booking Amount": float(transaction.booking_amount),
                "Commission Rate": f"{float(transaction.commission_rate) * 100:.2f}%",
                "Commission Amount": float(transaction.commission_amount),
                "Currency": transaction.currency
            })
        
        df = pd.DataFrame(data)
        
        # Save to Excel
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name='Commission Details', index=False)
            
            # Add summary sheet
            summary_data = {
                "Period": [f"{payout.period_start.strftime('%B %Y')}"],
                "Total Bookings": [len(transactions)],
                "Total Sales": [float(sum(t.booking_amount for t in transactions))],
                "Total Commission": [float(payout.total_amount)],
                "Invoice Number": [payout.invoice_number]
            }
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name='Summary', index=False)
        
        buffer.seek(0)
        
        # Upload to S3
        s3_key = f"statements/{payout.agency_id}/{payout.invoice_number}_statement.xlsx"
        self.s3_client.put_object(
            Bucket='spirittours-documents',
            Key=s3_key,
            Body=buffer.getvalue(),
            ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
        # Generate presigned URL
        url = self.s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': 'spirittours-documents', 'Key': s3_key},
            ExpiresIn=86400 * 30  # 30 days
        )
        
        return url
    
    async def _send_payout_notification(self, payout: CommissionPayout):
        """Send payout notification to agency"""
        agency = payout.agency
        
        # Send email notification
        # Implementation depends on your email service
        
        # Send webhook notification if configured
        if agency.webhook_url:
            webhook_data = {
                "event": "commission.payout",
                "payout_id": payout.id,
                "invoice_number": payout.invoice_number,
                "amount": float(payout.total_amount),
                "currency": payout.currency,
                "period": f"{payout.period_start.strftime('%B %Y')}",
                "invoice_url": payout.invoice_url,
                "statement_url": payout.statement_url
            }
            
            # Send webhook (async)
            # Implementation depends on your webhook service


# Export classes
__all__ = [
    'TransactionType',
    'PayoutStatus',
    'ProductType',
    'CommissionRule',
    'CommissionTransaction',
    'CommissionPayout',
    'CommissionCalculator',
    'PaymentProcessor'
]