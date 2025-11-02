#!/usr/bin/env python3
"""
B2B Management API
API para gestión de operadores turísticos, agencias y agentes de ventas
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from pydantic import BaseModel, Field

# Import database and models
from config.database import get_db
from models.business_models import (
    TourOperator, TravelAgency, SalesAgent, BusinessBooking, PaymentStatement,
    TourOperatorCreate, TravelAgencyCreate, SalesAgentCreate,
    TourOperatorResponse, CustomerType, PaymentTerms
)
from models.rbac_models import User

router = APIRouter(prefix="/api/v1/b2b", tags=["B2B Management"])

# ============================
# PYDANTIC MODELS
# ============================

class TourOperatorStats(BaseModel):
    """Tour operator statistics"""
    total_agencies: int
    active_agencies: int
    total_agents: int
    total_bookings: int
    total_revenue: Decimal
    total_commission: Decimal
    monthly_bookings: int
    monthly_revenue: Decimal

class TravelAgencyStats(BaseModel):
    """Travel agency statistics"""
    total_agents: int
    active_agents: int
    total_bookings: int
    total_revenue: Decimal
    monthly_bookings: int
    monthly_revenue: Decimal

class SalesAgentStats(BaseModel):
    """Sales agent statistics"""
    total_bookings: int
    total_sales: Decimal
    monthly_bookings: int
    monthly_sales: Decimal
    performance_vs_target: float

class PaymentStatementRequest(BaseModel):
    """Request for generating payment statement"""
    tour_operator_id: Optional[str] = None
    travel_agency_id: Optional[str] = None
    period_start: datetime
    period_end: datetime

# ============================
# TOUR OPERATORS ENDPOINTS
# ============================

@router.post("/tour-operators", response_model=TourOperatorResponse)
async def create_tour_operator(
    operator_data: TourOperatorCreate,
    db: Session = Depends(get_db)
):
    """Create a new tour operator"""
    try:
        # Check if operator already exists
        existing = db.query(TourOperator).filter(
            or_(
                TourOperator.email == operator_data.email,
                TourOperator.tax_id == operator_data.tax_id
            )
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Tour operator with this email or tax ID already exists"
            )
        
        # Create new tour operator
        tour_operator = TourOperator(**operator_data.dict())
        db.add(tour_operator)
        db.commit()
        db.refresh(tour_operator)
        
        return TourOperatorResponse(
            id=str(tour_operator.id),
            company_name=tour_operator.company_name,
            email=tour_operator.email,
            phone=tour_operator.phone,
            city=tour_operator.city,
            country=tour_operator.country,
            is_active=tour_operator.is_active,
            is_verified=tour_operator.is_verified,
            total_agencies=tour_operator.total_agencies,
            total_bookings=tour_operator.total_bookings,
            total_revenue=tour_operator.total_revenue,
            created_at=tour_operator.created_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error creating tour operator: {str(e)}"
        )

@router.get("/tour-operators", response_model=List[TourOperatorResponse])
async def get_tour_operators(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """Get list of tour operators with filtering"""
    try:
        query = db.query(TourOperator)
        
        if search:
            query = query.filter(
                or_(
                    TourOperator.company_name.ilike(f"%{search}%"),
                    TourOperator.email.ilike(f"%{search}%"),
                    TourOperator.city.ilike(f"%{search}%")
                )
            )
        
        if is_active is not None:
            query = query.filter(TourOperator.is_active == is_active)
        
        operators = query.offset(skip).limit(limit).all()
        
        return [
            TourOperatorResponse(
                id=str(op.id),
                company_name=op.company_name,
                email=op.email,
                phone=op.phone,
                city=op.city,
                country=op.country,
                is_active=op.is_active,
                is_verified=op.is_verified,
                total_agencies=op.total_agencies,
                total_bookings=op.total_bookings,
                total_revenue=op.total_revenue,
                created_at=op.created_at
            )
            for op in operators
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving tour operators: {str(e)}"
        )

@router.get("/tour-operators/{operator_id}/stats", response_model=TourOperatorStats)
async def get_tour_operator_stats(
    operator_id: str = Path(...),
    db: Session = Depends(get_db)
):
    """Get tour operator statistics"""
    try:
        # Verify operator exists
        operator = db.query(TourOperator).filter(TourOperator.id == operator_id).first()
        if not operator:
            raise HTTPException(status_code=404, detail="Tour operator not found")
        
        # Get agencies statistics
        total_agencies = db.query(TravelAgency).filter(
            TravelAgency.tour_operator_id == operator_id
        ).count()
        
        active_agencies = db.query(TravelAgency).filter(
            and_(
                TravelAgency.tour_operator_id == operator_id,
                TravelAgency.is_active == True
            )
        ).count()
        
        # Get total agents across all agencies
        total_agents = db.query(SalesAgent).join(TravelAgency).filter(
            TravelAgency.tour_operator_id == operator_id
        ).count()
        
        # Get monthly statistics
        current_month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month_start = (current_month_start + timedelta(days=32)).replace(day=1)
        
        monthly_stats = db.query(
            func.count(BusinessBooking.id).label('monthly_bookings'),
            func.sum(BusinessBooking.gross_amount).label('monthly_revenue')
        ).filter(
            and_(
                BusinessBooking.tour_operator_id == operator_id,
                BusinessBooking.created_at >= current_month_start,
                BusinessBooking.created_at < next_month_start
            )
        ).first()
        
        return TourOperatorStats(
            total_agencies=total_agencies,
            active_agencies=active_agencies,
            total_agents=total_agents,
            total_bookings=operator.total_bookings,
            total_revenue=operator.total_revenue,
            total_commission=operator.total_commission,
            monthly_bookings=monthly_stats.monthly_bookings or 0,
            monthly_revenue=monthly_stats.monthly_revenue or Decimal('0.00')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving tour operator stats: {str(e)}"
        )

# ============================
# TRAVEL AGENCIES ENDPOINTS
# ============================

@router.post("/travel-agencies", response_model=Dict[str, Any])
async def create_travel_agency(
    agency_data: TravelAgencyCreate,
    db: Session = Depends(get_db)
):
    """Create a new travel agency"""
    try:
        # Verify tour operator exists and has capacity
        tour_operator = db.query(TourOperator).filter(
            TourOperator.id == agency_data.tour_operator_id
        ).first()
        
        if not tour_operator:
            raise HTTPException(status_code=404, detail="Tour operator not found")
        
        if tour_operator.total_agencies >= tour_operator.max_agencies:
            raise HTTPException(
                status_code=400, 
                detail="Tour operator has reached maximum agencies limit"
            )
        
        # Check if agency code already exists
        existing = db.query(TravelAgency).filter(
            TravelAgency.agency_code == agency_data.agency_code
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Agency code already exists"
            )
        
        # Create travel agency
        travel_agency = TravelAgency(**agency_data.dict())
        db.add(travel_agency)
        
        # Update tour operator count
        tour_operator.total_agencies += 1
        
        db.commit()
        db.refresh(travel_agency)
        
        return {
            "id": str(travel_agency.id),
            "agency_name": travel_agency.agency_name,
            "agency_code": travel_agency.agency_code,
            "email": travel_agency.email,
            "city": travel_agency.city,
            "country": travel_agency.country,
            "is_active": travel_agency.is_active,
            "created_at": travel_agency.created_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error creating travel agency: {str(e)}"
        )

@router.get("/tour-operators/{operator_id}/agencies")
async def get_tour_operator_agencies(
    operator_id: str = Path(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get agencies for a specific tour operator"""
    try:
        agencies = db.query(TravelAgency).filter(
            TravelAgency.tour_operator_id == operator_id
        ).offset(skip).limit(limit).all()
        
        return {
            "agencies": [
                {
                    "id": str(agency.id),
                    "agency_name": agency.agency_name,
                    "agency_code": agency.agency_code,
                    "email": agency.email,
                    "city": agency.city,
                    "country": agency.country,
                    "is_active": agency.is_active,
                    "total_agents": agency.total_agents,
                    "total_bookings": agency.total_bookings,
                    "total_revenue": float(agency.total_revenue),
                    "created_at": agency.created_at
                }
                for agency in agencies
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving agencies: {str(e)}"
        )

# ============================
# SALES AGENTS ENDPOINTS
# ============================

@router.post("/sales-agents", response_model=Dict[str, Any])
async def create_sales_agent(
    agent_data: SalesAgentCreate,
    db: Session = Depends(get_db)
):
    """Create a new sales agent"""
    try:
        # Verify travel agency exists and has capacity
        travel_agency = db.query(TravelAgency).filter(
            TravelAgency.id == agent_data.travel_agency_id
        ).first()
        
        if not travel_agency:
            raise HTTPException(status_code=404, detail="Travel agency not found")
        
        if travel_agency.total_agents >= travel_agency.max_agents:
            raise HTTPException(
                status_code=400,
                detail="Travel agency has reached maximum agents limit"
            )
        
        # Check if agent code or email already exists
        existing = db.query(SalesAgent).filter(
            or_(
                SalesAgent.agent_code == agent_data.agent_code,
                SalesAgent.email == agent_data.email
            )
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Agent code or email already exists"
            )
        
        # Create sales agent
        sales_agent = SalesAgent(**agent_data.dict())
        db.add(sales_agent)
        
        # Update agency count
        travel_agency.total_agents += 1
        
        db.commit()
        db.refresh(sales_agent)
        
        return {
            "id": str(sales_agent.id),
            "first_name": sales_agent.first_name,
            "last_name": sales_agent.last_name,
            "agent_code": sales_agent.agent_code,
            "email": sales_agent.email,
            "phone": sales_agent.phone,
            "is_active": sales_agent.is_active,
            "created_at": sales_agent.created_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error creating sales agent: {str(e)}"
        )

@router.get("/travel-agencies/{agency_id}/agents")
async def get_agency_agents(
    agency_id: str = Path(...),
    db: Session = Depends(get_db)
):
    """Get sales agents for a specific travel agency"""
    try:
        agents = db.query(SalesAgent).filter(
            SalesAgent.travel_agency_id == agency_id
        ).all()
        
        return {
            "agents": [
                {
                    "id": str(agent.id),
                    "first_name": agent.first_name,
                    "last_name": agent.last_name,
                    "agent_code": agent.agent_code,
                    "email": agent.email,
                    "phone": agent.phone,
                    "territory": agent.territory,
                    "specialization": agent.specialization,
                    "is_active": agent.is_active,
                    "total_bookings": agent.total_bookings,
                    "total_sales": float(agent.total_sales),
                    "sales_target_monthly": float(agent.sales_target_monthly),
                    "created_at": agent.created_at
                }
                for agent in agents
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving sales agents: {str(e)}"
        )

# ============================
# PAYMENT STATEMENTS ENDPOINTS
# ============================

@router.post("/payment-statements/generate")
async def generate_payment_statement(
    statement_request: PaymentStatementRequest,
    db: Session = Depends(get_db)
):
    """Generate payment statement for tour operator or travel agency"""
    try:
        # Validate period
        if statement_request.period_end <= statement_request.period_start:
            raise HTTPException(
                status_code=400,
                detail="End date must be after start date"
            )
        
        # Build query for bookings in period
        query = db.query(BusinessBooking).filter(
            and_(
                BusinessBooking.created_at >= statement_request.period_start,
                BusinessBooking.created_at <= statement_request.period_end
            )
        )
        
        # Filter by tour operator or travel agency
        if statement_request.tour_operator_id:
            query = query.filter(BusinessBooking.tour_operator_id == statement_request.tour_operator_id)
        elif statement_request.travel_agency_id:
            query = query.filter(BusinessBooking.travel_agency_id == statement_request.travel_agency_id)
        else:
            raise HTTPException(
                status_code=400,
                detail="Either tour_operator_id or travel_agency_id must be provided"
            )
        
        bookings = query.all()
        
        # Calculate totals
        total_bookings = len(bookings)
        gross_revenue = sum(booking.gross_amount for booking in bookings)
        total_commission = sum(booking.commission_amount for booking in bookings)
        net_amount = gross_revenue - total_commission
        
        # Create payment statement
        statement_number = f"PS{datetime.now().strftime('%Y%m%d')}{total_bookings:04d}"
        
        payment_statement = PaymentStatement(
            statement_number=statement_number,
            tour_operator_id=statement_request.tour_operator_id,
            travel_agency_id=statement_request.travel_agency_id,
            period_start=statement_request.period_start,
            period_end=statement_request.period_end,
            total_bookings=total_bookings,
            gross_revenue=gross_revenue,
            total_commission=total_commission,
            net_amount=net_amount,
            booking_details=[
                {
                    "booking_id": str(booking.id),
                    "booking_reference": booking.booking_reference,
                    "customer_name": booking.customer_name,
                    "product_name": booking.product_name,
                    "travel_date": booking.travel_date.isoformat(),
                    "gross_amount": float(booking.gross_amount),
                    "commission_amount": float(booking.commission_amount),
                    "net_amount": float(booking.net_amount)
                }
                for booking in bookings
            ],
            payment_due_date=datetime.now() + timedelta(days=30),
            payment_status="pending"
        )
        
        db.add(payment_statement)
        db.commit()
        db.refresh(payment_statement)
        
        return {
            "statement_id": str(payment_statement.id),
            "statement_number": payment_statement.statement_number,
            "period_start": payment_statement.period_start,
            "period_end": payment_statement.period_end,
            "total_bookings": payment_statement.total_bookings,
            "gross_revenue": float(payment_statement.gross_revenue),
            "total_commission": float(payment_statement.total_commission),
            "net_amount": float(payment_statement.net_amount),
            "payment_due_date": payment_statement.payment_due_date,
            "generated_at": payment_statement.generated_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error generating payment statement: {str(e)}"
        )

@router.get("/payment-statements")
async def get_payment_statements(
    tour_operator_id: Optional[str] = Query(None),
    travel_agency_id: Optional[str] = Query(None),
    payment_status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get payment statements with filtering"""
    try:
        query = db.query(PaymentStatement)
        
        if tour_operator_id:
            query = query.filter(PaymentStatement.tour_operator_id == tour_operator_id)
        
        if travel_agency_id:
            query = query.filter(PaymentStatement.travel_agency_id == travel_agency_id)
        
        if payment_status:
            query = query.filter(PaymentStatement.payment_status == payment_status)
        
        statements = query.order_by(PaymentStatement.generated_at.desc()).limit(50).all()
        
        return {
            "statements": [
                {
                    "statement_id": str(stmt.id),
                    "statement_number": stmt.statement_number,
                    "period_start": stmt.period_start,
                    "period_end": stmt.period_end,
                    "total_bookings": stmt.total_bookings,
                    "gross_revenue": float(stmt.gross_revenue),
                    "total_commission": float(stmt.total_commission),
                    "net_amount": float(stmt.net_amount),
                    "payment_status": stmt.payment_status,
                    "payment_due_date": stmt.payment_due_date,
                    "generated_at": stmt.generated_at
                }
                for stmt in statements
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving payment statements: {str(e)}"
        )