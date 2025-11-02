#!/usr/bin/env python3
"""
Booking API with B2C/B2B/B2B2C Integration
API completa de reservas que integra el sistema de booking existente
con los modelos de negocio B2C/B2B/B2B2C
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, validator
import uuid

# Import database and models
from config.database import get_db
from models.business_models import (
    BusinessBooking, TourOperator, TravelAgency, SalesAgent,
    CustomerType, BookingChannel
)
from models.rbac_models import User

router = APIRouter(prefix="/api/v1/bookings", tags=["Bookings"])

# ============================
# PYDANTIC MODELS
# ============================

class CustomerInfo(BaseModel):
    """Customer information for booking"""
    email: str = Field(..., description="Customer email")
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100) 
    phone: str = Field(..., description="Customer phone number")
    country: str = Field(..., description="Customer country")
    language: str = Field(default="es", description="Preferred language")

class BookingRequest(BaseModel):
    """Complete booking request"""
    # Customer Information
    customer: CustomerInfo
    
    # Booking Details
    product_id: str = Field(..., description="Product to book")
    slot_id: str = Field(..., description="Time slot ID")
    participants_count: int = Field(..., ge=1, le=20)
    
    # B2B Information (optional for B2C)
    customer_type: CustomerType = Field(default=CustomerType.B2C_DIRECT)
    booking_channel: BookingChannel = Field(default=BookingChannel.DIRECT_WEBSITE)
    tour_operator_id: Optional[str] = None
    travel_agency_id: Optional[str] = None 
    sales_agent_id: Optional[str] = None

class BookingResponse(BaseModel):
    """Booking response with all details"""
    booking_id: str
    booking_reference: str
    customer_type: str
    booking_channel: str
    
    # Financial Information  
    gross_amount: Decimal
    net_amount: Decimal
    commission_amount: Decimal
    currency: str
    
    # Booking Details
    product_name: str
    destination: str
    travel_date: datetime
    participants: int
    booking_status: str
    
    created_at: datetime

# ============================
# API ENDPOINTS
# ============================

@router.post("/create", response_model=BookingResponse)
async def create_booking(
    booking_request: BookingRequest,
    db: Session = Depends(get_db)
):
    """
    Create a new booking with B2C/B2B/B2B2C support
    """
    try:
        # For now, create a simple booking record
        # Later integrate with the full booking system
        
        # Calculate basic pricing (simplified)
        gross_amount = Decimal('100.00')  # Base price
        commission_rate = 0.10 if booking_request.customer_type != CustomerType.B2C_DIRECT else 0.0
        commission_amount = gross_amount * Decimal(str(commission_rate))
        net_amount = gross_amount - commission_amount
        
        # Create business booking record
        business_booking = BusinessBooking(
            original_booking_id=str(uuid.uuid4()),
            booking_reference=f"ST{datetime.now().strftime('%Y%m%d')}{uuid.uuid4().hex[:6].upper()}",
            customer_type=booking_request.customer_type,
            booking_channel=booking_request.booking_channel,
            tour_operator_id=booking_request.tour_operator_id,
            travel_agency_id=booking_request.travel_agency_id,
            sales_agent_id=booking_request.sales_agent_id,
            gross_amount=gross_amount,
            net_amount=net_amount,
            commission_amount=commission_amount,
            commission_percentage=commission_rate,
            currency="EUR",
            customer_email=booking_request.customer.email,
            customer_name=f"{booking_request.customer.first_name} {booking_request.customer.last_name}",
            customer_phone=booking_request.customer.phone,
            product_name="Madrid City Tour",  # Simplified
            destination="Madrid",
            travel_date=datetime.now() + timedelta(days=7),
            participants=booking_request.participants_count,
            booking_status="confirmed",
            payment_status="pending"
        )
        
        db.add(business_booking)
        db.commit()
        db.refresh(business_booking)
        
        # Return response
        return BookingResponse(
            booking_id=str(business_booking.id),
            booking_reference=business_booking.booking_reference,
            customer_type=business_booking.customer_type.value,
            booking_channel=business_booking.booking_channel.value,
            gross_amount=business_booking.gross_amount,
            net_amount=business_booking.net_amount,
            commission_amount=business_booking.commission_amount,
            currency=business_booking.currency,
            product_name=business_booking.product_name,
            destination=business_booking.destination,
            travel_date=business_booking.travel_date,
            participants=business_booking.participants,
            booking_status=business_booking.booking_status,
            created_at=business_booking.created_at
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error creating booking: {str(e)}"
        )

@router.get("/search")
async def search_bookings(
    customer_email: Optional[str] = Query(None),
    booking_reference: Optional[str] = Query(None),
    customer_type: Optional[CustomerType] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Search bookings with filters
    """
    try:
        query = db.query(BusinessBooking)
        
        if customer_email:
            query = query.filter(BusinessBooking.customer_email.ilike(f"%{customer_email}%"))
        
        if booking_reference:
            query = query.filter(BusinessBooking.booking_reference == booking_reference)
        
        if customer_type:
            query = query.filter(BusinessBooking.customer_type == customer_type)
        
        bookings = query.limit(50).all()
        
        return {
            "bookings": [
                {
                    "booking_id": str(booking.id),
                    "booking_reference": booking.booking_reference,
                    "customer_email": booking.customer_email,
                    "customer_name": booking.customer_name,
                    "customer_type": booking.customer_type.value,
                    "gross_amount": float(booking.gross_amount),
                    "currency": booking.currency,
                    "destination": booking.destination,
                    "travel_date": booking.travel_date.isoformat(),
                    "booking_status": booking.booking_status,
                    "created_at": booking.created_at.isoformat()
                }
                for booking in bookings
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error searching bookings: {str(e)}"
        )