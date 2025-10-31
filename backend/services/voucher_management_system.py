"""
Voucher Management System for Spirit Tours
==========================================

Comprehensive system for managing all types of vouchers:
- Hotel vouchers
- Restaurant vouchers  
- Entrance tickets vouchers
- Transport vouchers
- Activity vouchers
"""

from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, date, timedelta
from enum import Enum
from dataclasses import dataclass, field
import asyncio
import json
from uuid import uuid4
import qrcode
from io import BytesIO
import barcode
from barcode.writer import ImageWriter
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import base64

# Database imports
from sqlalchemy import select, and_, or_, func
from fastapi import HTTPException
from pydantic import BaseModel, Field, validator
import aioredis

import logging
logger = logging.getLogger(__name__)

# ================== Data Models ==================

class VoucherStatus(str, Enum):
    """Voucher status"""
    DRAFT = "draft"
    ISSUED = "issued"
    CONFIRMED = "confirmed"
    USED = "used"
    CANCELLED = "cancelled"
    EXPIRED = "expired"

class VoucherCategory(str, Enum):
    """Voucher categories"""
    ACCOMMODATION = "accommodation"
    DINING = "dining"
    ATTRACTION = "attraction"
    TRANSPORT = "transport"
    ACTIVITY = "activity"
    PACKAGE = "package"

@dataclass
class VoucherTemplate:
    """Voucher template configuration"""
    template_id: str
    name: str
    category: VoucherCategory
    
    # Template design
    logo_url: Optional[str] = None
    header_color: str = "#003366"
    font_family: str = "Helvetica"
    
    # Content sections
    show_qr_code: bool = True
    show_barcode: bool = True
    show_terms: bool = True
    show_emergency_contacts: bool = True
    
    # Custom fields
    custom_fields: List[Dict[str, str]] = field(default_factory=list)
    
    # Terms and conditions
    terms_and_conditions: Optional[str] = None
    cancellation_policy: Optional[str] = None
    
    # Contact information
    company_name: str = "Spirit Tours"
    company_address: str = ""
    company_phone: str = ""
    company_email: str = ""
    company_website: str = ""
    emergency_phone: str = ""

@dataclass
class Voucher:
    """Complete voucher information"""
    voucher_id: str
    voucher_number: str
    category: VoucherCategory
    status: VoucherStatus
    
    # Group and booking info
    group_id: str
    group_number: str
    booking_reference: str
    
    # Service details
    service_provider: str
    service_name: str
    service_description: str
    service_date: datetime
    service_end_date: Optional[datetime] = None
    
    # Provider details
    provider_address: str
    provider_phone: str
    provider_email: Optional[str] = None
    provider_confirmation: Optional[str] = None
    
    # Guest information
    lead_guest_name: str
    total_guests: int
    guest_details: List[Dict[str, Any]] = field(default_factory=list)
    
    # Financial information
    total_amount: float = 0.0
    currency: str = "USD"
    payment_status: str = "pending"
    payment_method: Optional[str] = None
    
    # Special requirements
    special_requirements: Optional[str] = None
    dietary_restrictions: List[str] = field(default_factory=list)
    accessibility_needs: Optional[str] = None
    
    # Metadata
    created_at: datetime = field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    issued_at: Optional[datetime] = None
    used_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    
    # Template
    template_id: Optional[str] = None
    
    # Additional data
    metadata: Dict[str, Any] = field(default_factory=dict)

class VoucherCreateRequest(BaseModel):
    """Request model for creating voucher"""
    category: VoucherCategory
    group_id: str
    service_provider: str
    service_name: str
    service_description: str
    service_date: str
    service_end_date: Optional[str] = None
    provider_address: str
    provider_phone: str
    provider_email: Optional[str] = None
    provider_confirmation: Optional[str] = None
    lead_guest_name: str
    total_guests: int
    guest_details: Optional[List[Dict[str, Any]]] = None
    total_amount: Optional[float] = 0.0
    currency: str = "USD"
    special_requirements: Optional[str] = None
    dietary_restrictions: Optional[List[str]] = None
    accessibility_needs: Optional[str] = None
    template_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class VoucherPrintRequest(BaseModel):
    """Request model for printing vouchers"""
    voucher_ids: List[str]
    format: str = Field("pdf", description="Output format: pdf, html")
    combine: bool = Field(True, description="Combine into single document")
    include_qr: bool = Field(True, description="Include QR codes")
    include_barcode: bool = Field(True, description="Include barcodes")
    language: str = Field("en", description="Language for voucher")

# ================== Voucher Templates ==================

DEFAULT_HOTEL_TEMPLATE = VoucherTemplate(
    template_id="default_hotel",
    name="Default Hotel Voucher",
    category=VoucherCategory.ACCOMMODATION,
    terms_and_conditions="""
    1. This voucher is valid only for the dates specified.
    2. Check-in time: 14:00, Check-out time: 12:00 (unless otherwise specified).
    3. Any additional services not mentioned in this voucher will be charged separately.
    4. Cancellation must be made 48 hours prior to arrival date.
    5. This voucher is non-transferable and has no cash value.
    """,
    cancellation_policy="Cancellations made within 48 hours will incur 100% charge."
)

DEFAULT_RESTAURANT_TEMPLATE = VoucherTemplate(
    template_id="default_restaurant",
    name="Default Restaurant Voucher",
    category=VoucherCategory.DINING,
    terms_and_conditions="""
    1. Reservation is subject to availability.
    2. This voucher must be presented upon arrival.
    3. Menu items are subject to seasonal availability.
    4. Beverages are not included unless specified.
    5. Gratuities are not included.
    """,
    cancellation_policy="Cancellations must be made 24 hours in advance."
)

DEFAULT_ENTRANCE_TEMPLATE = VoucherTemplate(
    template_id="default_entrance",
    name="Default Entrance Ticket Voucher",
    category=VoucherCategory.ATTRACTION,
    terms_and_conditions="""
    1. Valid only for the date and time specified.
    2. Lost tickets cannot be replaced.
    3. No refunds for unused tickets.
    4. Subject to venue operating hours and conditions.
    5. Photo ID may be required for entry.
    """,
    cancellation_policy="Tickets are non-refundable."
)

# ================== Main Voucher System ==================

class VoucherManagementSystem:
    """
    Comprehensive Voucher Management System
    """
    
    def __init__(self, db_session, redis_client: aioredis.Redis, config: Dict[str, Any]):
        self.db = db_session
        self.redis = redis_client
        self.config = config
        
        # Initialize templates
        self.templates = {
            "default_hotel": DEFAULT_HOTEL_TEMPLATE,
            "default_restaurant": DEFAULT_RESTAURANT_TEMPLATE,
            "default_entrance": DEFAULT_ENTRANCE_TEMPLATE
        }
        
        # Cache settings
        self.cache_ttl = 300  # 5 minutes
        
        logger.info("Voucher Management System initialized")
    
    # ================== Voucher Creation ==================
    
    async def create_voucher(
        self,
        request: VoucherCreateRequest,
        user_id: str
    ) -> Voucher:
        """Create a new voucher"""
        try:
            # Generate voucher number
            voucher_number = await self._generate_voucher_number(request.category)
            
            # Get group information
            group_info = await self._get_group_info(request.group_id)
            
            # Create voucher object
            voucher = Voucher(
                voucher_id=str(uuid4()),
                voucher_number=voucher_number,
                category=request.category,
                status=VoucherStatus.DRAFT,
                group_id=request.group_id,
                group_number=group_info['group_number'],
                booking_reference=group_info.get('booking_reference', ''),
                service_provider=request.service_provider,
                service_name=request.service_name,
                service_description=request.service_description,
                service_date=datetime.fromisoformat(request.service_date),
                service_end_date=datetime.fromisoformat(request.service_end_date) if request.service_end_date else None,
                provider_address=request.provider_address,
                provider_phone=request.provider_phone,
                provider_email=request.provider_email,
                provider_confirmation=request.provider_confirmation,
                lead_guest_name=request.lead_guest_name,
                total_guests=request.total_guests,
                guest_details=request.guest_details or [],
                total_amount=request.total_amount,
                currency=request.currency,
                special_requirements=request.special_requirements,
                dietary_restrictions=request.dietary_restrictions or [],
                accessibility_needs=request.accessibility_needs,
                template_id=request.template_id or f"default_{request.category.value}",
                created_by=user_id,
                metadata=request.metadata or {}
            )
            
            # Save to database
            await self._save_voucher_to_db(voucher)
            
            # Cache voucher
            await self._cache_voucher(voucher)
            
            logger.info(f"Created voucher: {voucher.voucher_number}")
            return voucher
            
        except Exception as e:
            logger.error(f"Error creating voucher: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def issue_voucher(
        self,
        voucher_id: str,
        user_id: str
    ) -> Voucher:
        """Issue a voucher (change status from draft to issued)"""
        try:
            # Get voucher
            voucher = await self.get_voucher(voucher_id)
            
            if voucher.status != VoucherStatus.DRAFT:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot issue voucher in {voucher.status} status"
                )
            
            # Update status
            voucher.status = VoucherStatus.ISSUED
            voucher.issued_at = datetime.utcnow()
            
            # Update database
            await self._update_voucher_in_db(voucher)
            
            # Update cache
            await self._cache_voucher(voucher)
            
            # Send confirmation email
            await self._send_voucher_email(voucher)
            
            logger.info(f"Issued voucher: {voucher.voucher_number}")
            return voucher
            
        except Exception as e:
            logger.error(f"Error issuing voucher: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def confirm_voucher(
        self,
        voucher_id: str,
        confirmation_number: str,
        user_id: str
    ) -> Voucher:
        """Confirm a voucher with provider confirmation"""
        try:
            # Get voucher
            voucher = await self.get_voucher(voucher_id)
            
            # Update confirmation
            voucher.status = VoucherStatus.CONFIRMED
            voucher.provider_confirmation = confirmation_number
            
            # Update database
            await self._update_voucher_in_db(voucher)
            
            # Update cache
            await self._cache_voucher(voucher)
            
            logger.info(f"Confirmed voucher: {voucher.voucher_number}")
            return voucher
            
        except Exception as e:
            logger.error(f"Error confirming voucher: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def use_voucher(
        self,
        voucher_id: str,
        user_id: str
    ) -> Voucher:
        """Mark voucher as used"""
        try:
            # Get voucher
            voucher = await self.get_voucher(voucher_id)
            
            if voucher.status not in [VoucherStatus.ISSUED, VoucherStatus.CONFIRMED]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot use voucher in {voucher.status} status"
                )
            
            # Update status
            voucher.status = VoucherStatus.USED
            voucher.used_at = datetime.utcnow()
            
            # Update database
            await self._update_voucher_in_db(voucher)
            
            # Update cache
            await self._cache_voucher(voucher)
            
            logger.info(f"Used voucher: {voucher.voucher_number}")
            return voucher
            
        except Exception as e:
            logger.error(f"Error using voucher: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def cancel_voucher(
        self,
        voucher_id: str,
        reason: str,
        user_id: str
    ) -> Voucher:
        """Cancel a voucher"""
        try:
            # Get voucher
            voucher = await self.get_voucher(voucher_id)
            
            if voucher.status in [VoucherStatus.USED, VoucherStatus.CANCELLED]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot cancel voucher in {voucher.status} status"
                )
            
            # Update status
            voucher.status = VoucherStatus.CANCELLED
            voucher.cancelled_at = datetime.utcnow()
            voucher.metadata['cancellation_reason'] = reason
            voucher.metadata['cancelled_by'] = user_id
            
            # Update database
            await self._update_voucher_in_db(voucher)
            
            # Update cache
            await self._cache_voucher(voucher)
            
            # Send cancellation notification
            await self._send_cancellation_notification(voucher)
            
            logger.info(f"Cancelled voucher: {voucher.voucher_number}")
            return voucher
            
        except Exception as e:
            logger.error(f"Error cancelling voucher: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ================== Voucher Retrieval ==================
    
    async def get_voucher(self, voucher_id: str) -> Voucher:
        """Get a voucher by ID"""
        try:
            # Check cache first
            cached = await self._get_cached_voucher(voucher_id)
            if cached:
                return cached
            
            # Get from database
            voucher = await self._get_voucher_from_db(voucher_id)
            
            if not voucher:
                raise HTTPException(status_code=404, detail="Voucher not found")
            
            # Cache it
            await self._cache_voucher(voucher)
            
            return voucher
            
        except Exception as e:
            logger.error(f"Error getting voucher: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_vouchers_by_group(
        self,
        group_id: str,
        category: Optional[VoucherCategory] = None,
        status: Optional[VoucherStatus] = None
    ) -> List[Voucher]:
        """Get all vouchers for a group"""
        try:
            # Build query
            query = {"group_id": group_id}
            if category:
                query["category"] = category.value
            if status:
                query["status"] = status.value
            
            # Get from database
            vouchers = await self._get_vouchers_from_db(query)
            
            return vouchers
            
        except Exception as e:
            logger.error(f"Error getting group vouchers: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_vouchers_by_date_range(
        self,
        start_date: date,
        end_date: date,
        category: Optional[VoucherCategory] = None
    ) -> List[Voucher]:
        """Get vouchers within date range"""
        try:
            # Build query
            query = {
                "service_date": {
                    "$gte": datetime.combine(start_date, datetime.min.time()),
                    "$lte": datetime.combine(end_date, datetime.max.time())
                }
            }
            if category:
                query["category"] = category.value
            
            # Get from database
            vouchers = await self._get_vouchers_from_db(query)
            
            return vouchers
            
        except Exception as e:
            logger.error(f"Error getting vouchers by date: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ================== Voucher Printing ==================
    
    async def print_vouchers(
        self,
        request: VoucherPrintRequest
    ) -> bytes:
        """Generate printable vouchers"""
        try:
            # Get vouchers
            vouchers = []
            for voucher_id in request.voucher_ids:
                voucher = await self.get_voucher(voucher_id)
                vouchers.append(voucher)
            
            # Generate based on format
            if request.format == "pdf":
                return await self._generate_pdf_vouchers(vouchers, request)
            elif request.format == "html":
                return await self._generate_html_vouchers(vouchers, request)
            else:
                raise HTTPException(status_code=400, detail="Invalid format")
            
        except Exception as e:
            logger.error(f"Error printing vouchers: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def _generate_pdf_vouchers(
        self,
        vouchers: List[Voucher],
        request: VoucherPrintRequest
    ) -> bytes:
        """Generate PDF vouchers"""
        buffer = BytesIO()
        
        # Create PDF document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )
        
        # Container for flowables
        elements = []
        
        # Process each voucher
        for i, voucher in enumerate(vouchers):
            # Get template
            template = self.templates.get(
                voucher.template_id,
                self.templates[f"default_{voucher.category.value}"]
            )
            
            # Add voucher content
            elements.extend(await self._create_voucher_elements(voucher, template, request))
            
            # Add page break if not last voucher and not combining
            if i < len(vouchers) - 1 and not request.combine:
                elements.append(PageBreak())
        
        # Build PDF
        doc.build(elements)
        
        # Get PDF bytes
        buffer.seek(0)
        return buffer.read()
    
    async def _create_voucher_elements(
        self,
        voucher: Voucher,
        template: VoucherTemplate,
        request: VoucherPrintRequest
    ) -> List:
        """Create PDF elements for a voucher"""
        elements = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor(template.header_color),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        # Header with logo
        if template.logo_url:
            # Add logo (placeholder for now)
            elements.append(Spacer(1, 0.5 * inch))
        
        # Title
        elements.append(
            Paragraph(f"{voucher.category.value.upper()} VOUCHER", title_style)
        )
        
        # Voucher number and QR code
        voucher_info = []
        
        # QR Code
        if request.include_qr:
            qr_code = await self._generate_qr_code(voucher.voucher_number)
            qr_img = Image(BytesIO(qr_code), width=1.5*inch, height=1.5*inch)
            voucher_info.append([qr_img])
        
        # Barcode
        if request.include_barcode:
            barcode_img = await self._generate_barcode(voucher.voucher_number)
            bc_img = Image(BytesIO(barcode_img), width=2*inch, height=0.5*inch)
            voucher_info.append([bc_img])
        
        # Voucher number
        voucher_info.append([
            Paragraph(f"<b>Voucher Number:</b> {voucher.voucher_number}", styles['Normal'])
        ])
        
        if voucher_info:
            t = Table(voucher_info, colWidths=[6*inch])
            t.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            elements.append(t)
            elements.append(Spacer(1, 0.25 * inch))
        
        # Service details
        service_data = [
            ['Service Provider:', voucher.service_provider],
            ['Service:', voucher.service_name],
            ['Date:', voucher.service_date.strftime('%B %d, %Y')],
            ['Time:', voucher.service_date.strftime('%I:%M %p')],
            ['Location:', voucher.provider_address],
            ['Phone:', voucher.provider_phone],
        ]
        
        if voucher.provider_confirmation:
            service_data.append(['Confirmation:', voucher.provider_confirmation])
        
        t = Table(service_data, colWidths=[2*inch, 4*inch])
        t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f0f0')),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 0.25 * inch))
        
        # Guest information
        guest_data = [
            ['Lead Guest:', voucher.lead_guest_name],
            ['Total Guests:', str(voucher.total_guests)],
        ]
        
        if voucher.special_requirements:
            guest_data.append(['Special Requirements:', voucher.special_requirements])
        
        if voucher.dietary_restrictions:
            guest_data.append(['Dietary Restrictions:', ', '.join(voucher.dietary_restrictions)])
        
        t = Table(guest_data, colWidths=[2*inch, 4*inch])
        t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f0f0')),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 0.25 * inch))
        
        # Terms and conditions
        if template.show_terms and template.terms_and_conditions:
            elements.append(Paragraph("<b>Terms and Conditions:</b>", styles['Heading3']))
            elements.append(Paragraph(template.terms_and_conditions, styles['Normal']))
            elements.append(Spacer(1, 0.25 * inch))
        
        # Emergency contacts
        if template.show_emergency_contacts and template.emergency_phone:
            elements.append(
                Paragraph(
                    f"<b>Emergency Contact:</b> {template.emergency_phone}",
                    styles['Normal']
                )
            )
        
        # Footer
        footer_text = f"""
        <para align=center>
        {template.company_name} | {template.company_phone} | {template.company_email}
        <br/>
        {template.company_website}
        </para>
        """
        elements.append(Spacer(1, 0.5 * inch))
        elements.append(Paragraph(footer_text, styles['Normal']))
        
        return elements
    
    async def _generate_qr_code(self, data: str) -> bytes:
        """Generate QR code"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        return buffer.read()
    
    async def _generate_barcode(self, data: str) -> bytes:
        """Generate barcode"""
        # Use Code128 barcode
        code128 = barcode.get('code128', data, writer=ImageWriter())
        buffer = BytesIO()
        code128.write(buffer)
        buffer.seek(0)
        return buffer.read()
    
    # ================== Utility Functions ==================
    
    async def _generate_voucher_number(self, category: VoucherCategory) -> str:
        """Generate unique voucher number"""
        prefix_map = {
            VoucherCategory.ACCOMMODATION: "HTL",
            VoucherCategory.DINING: "RST",
            VoucherCategory.ATTRACTION: "ENT",
            VoucherCategory.TRANSPORT: "TRN",
            VoucherCategory.ACTIVITY: "ACT",
            VoucherCategory.PACKAGE: "PKG"
        }
        
        prefix = prefix_map[category]
        
        # Get counter from Redis
        counter_key = f"voucher_counter:{category.value}:{datetime.utcnow().strftime('%Y%m')}"
        counter = await self.redis.incr(counter_key)
        
        # Format: PREFIX-YYYYMM-NNNNNN
        return f"{prefix}-{datetime.utcnow().strftime('%Y%m')}-{counter:06d}"
    
    async def _get_group_info(self, group_id: str) -> Dict[str, Any]:
        """Get group information"""
        # This would typically query the database
        # Placeholder implementation
        return {
            'group_number': f"GRP-{datetime.utcnow().strftime('%Y%m%d')}-001",
            'booking_reference': f"BKG-{group_id[:8]}"
        }
    
    async def _cache_voucher(self, voucher: Voucher) -> None:
        """Cache voucher in Redis"""
        key = f"voucher:{voucher.voucher_id}"
        value = json.dumps(self._serialize_voucher(voucher))
        await self.redis.setex(key, self.cache_ttl, value)
    
    async def _get_cached_voucher(self, voucher_id: str) -> Optional[Voucher]:
        """Get voucher from cache"""
        key = f"voucher:{voucher_id}"
        cached = await self.redis.get(key)
        if cached:
            return self._deserialize_voucher(json.loads(cached))
        return None
    
    def _serialize_voucher(self, voucher: Voucher) -> Dict[str, Any]:
        """Serialize voucher to dict"""
        return {
            'voucher_id': voucher.voucher_id,
            'voucher_number': voucher.voucher_number,
            'category': voucher.category.value,
            'status': voucher.status.value,
            'group_id': voucher.group_id,
            'group_number': voucher.group_number,
            'booking_reference': voucher.booking_reference,
            'service_provider': voucher.service_provider,
            'service_name': voucher.service_name,
            'service_description': voucher.service_description,
            'service_date': voucher.service_date.isoformat(),
            'service_end_date': voucher.service_end_date.isoformat() if voucher.service_end_date else None,
            'provider_address': voucher.provider_address,
            'provider_phone': voucher.provider_phone,
            'provider_email': voucher.provider_email,
            'provider_confirmation': voucher.provider_confirmation,
            'lead_guest_name': voucher.lead_guest_name,
            'total_guests': voucher.total_guests,
            'guest_details': voucher.guest_details,
            'total_amount': voucher.total_amount,
            'currency': voucher.currency,
            'payment_status': voucher.payment_status,
            'payment_method': voucher.payment_method,
            'special_requirements': voucher.special_requirements,
            'dietary_restrictions': voucher.dietary_restrictions,
            'accessibility_needs': voucher.accessibility_needs,
            'created_at': voucher.created_at.isoformat(),
            'created_by': voucher.created_by,
            'issued_at': voucher.issued_at.isoformat() if voucher.issued_at else None,
            'used_at': voucher.used_at.isoformat() if voucher.used_at else None,
            'cancelled_at': voucher.cancelled_at.isoformat() if voucher.cancelled_at else None,
            'template_id': voucher.template_id,
            'metadata': voucher.metadata
        }
    
    def _deserialize_voucher(self, data: Dict[str, Any]) -> Voucher:
        """Deserialize dict to voucher"""
        return Voucher(
            voucher_id=data['voucher_id'],
            voucher_number=data['voucher_number'],
            category=VoucherCategory(data['category']),
            status=VoucherStatus(data['status']),
            group_id=data['group_id'],
            group_number=data['group_number'],
            booking_reference=data['booking_reference'],
            service_provider=data['service_provider'],
            service_name=data['service_name'],
            service_description=data['service_description'],
            service_date=datetime.fromisoformat(data['service_date']),
            service_end_date=datetime.fromisoformat(data['service_end_date']) if data['service_end_date'] else None,
            provider_address=data['provider_address'],
            provider_phone=data['provider_phone'],
            provider_email=data['provider_email'],
            provider_confirmation=data['provider_confirmation'],
            lead_guest_name=data['lead_guest_name'],
            total_guests=data['total_guests'],
            guest_details=data['guest_details'],
            total_amount=data['total_amount'],
            currency=data['currency'],
            payment_status=data['payment_status'],
            payment_method=data['payment_method'],
            special_requirements=data['special_requirements'],
            dietary_restrictions=data['dietary_restrictions'],
            accessibility_needs=data['accessibility_needs'],
            created_at=datetime.fromisoformat(data['created_at']),
            created_by=data['created_by'],
            issued_at=datetime.fromisoformat(data['issued_at']) if data['issued_at'] else None,
            used_at=datetime.fromisoformat(data['used_at']) if data['used_at'] else None,
            cancelled_at=datetime.fromisoformat(data['cancelled_at']) if data['cancelled_at'] else None,
            template_id=data['template_id'],
            metadata=data['metadata']
        )


# ================== FastAPI Router ==================

from fastapi import APIRouter, Depends, Query, Body
from typing import Optional

router = APIRouter(prefix="/api/vouchers", tags=["Voucher Management"])

@router.post("/")
async def create_voucher(
    request: VoucherCreateRequest,
    system: VoucherManagementSystem = Depends(get_voucher_system),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new voucher"""
    return await system.create_voucher(request, current_user['id'])

@router.post("/{voucher_id}/issue")
async def issue_voucher(
    voucher_id: str,
    system: VoucherManagementSystem = Depends(get_voucher_system),
    current_user: Dict = Depends(get_current_user)
):
    """Issue a voucher"""
    return await system.issue_voucher(voucher_id, current_user['id'])

@router.post("/{voucher_id}/confirm")
async def confirm_voucher(
    voucher_id: str,
    confirmation_number: str = Body(..., embed=True),
    system: VoucherManagementSystem = Depends(get_voucher_system),
    current_user: Dict = Depends(get_current_user)
):
    """Confirm a voucher"""
    return await system.confirm_voucher(voucher_id, confirmation_number, current_user['id'])

@router.post("/{voucher_id}/use")
async def use_voucher(
    voucher_id: str,
    system: VoucherManagementSystem = Depends(get_voucher_system),
    current_user: Dict = Depends(get_current_user)
):
    """Mark voucher as used"""
    return await system.use_voucher(voucher_id, current_user['id'])

@router.post("/{voucher_id}/cancel")
async def cancel_voucher(
    voucher_id: str,
    reason: str = Body(..., embed=True),
    system: VoucherManagementSystem = Depends(get_voucher_system),
    current_user: Dict = Depends(get_current_user)
):
    """Cancel a voucher"""
    return await system.cancel_voucher(voucher_id, reason, current_user['id'])

@router.get("/{voucher_id}")
async def get_voucher(
    voucher_id: str,
    system: VoucherManagementSystem = Depends(get_voucher_system)
):
    """Get a voucher by ID"""
    return await system.get_voucher(voucher_id)

@router.get("/group/{group_id}")
async def get_group_vouchers(
    group_id: str,
    category: Optional[VoucherCategory] = Query(None),
    status: Optional[VoucherStatus] = Query(None),
    system: VoucherManagementSystem = Depends(get_voucher_system)
):
    """Get all vouchers for a group"""
    return await system.get_vouchers_by_group(group_id, category, status)

@router.post("/print")
async def print_vouchers(
    request: VoucherPrintRequest,
    system: VoucherManagementSystem = Depends(get_voucher_system)
):
    """Generate printable vouchers"""
    content = await system.print_vouchers(request)
    return {
        "filename": f"vouchers_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{request.format}",
        "content": base64.b64encode(content).decode('utf-8'),
        "content_type": "application/pdf" if request.format == "pdf" else "text/html"
    }