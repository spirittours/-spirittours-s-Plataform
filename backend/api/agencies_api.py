"""
API endpoints for agency registration, management and portal
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import hashlib
import secrets
import json
from pydantic import BaseModel, EmailStr, validator
import logging

from database import get_db
from models.agencies_models import (
    Agency, AgencyDocument, AgencyContract, 
    AgencyCommission, AgencyPayment, AgencyUser
)
from services.agencies_service import AgenciesService
from services.auth_service import get_current_user, require_role
from utils.email import send_email
from utils.file_storage import store_file, validate_file
from utils.pdf_generator import generate_contract_pdf
from utils.digital_signature import verify_signature, create_signature_hash

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/agencies", tags=["agencies"])

# Pydantic models for request/response
class AgencyRegistrationRequest(BaseModel):
    # Company Information
    company_name: str
    commercial_name: Optional[str]
    registration_number: str
    tax_id: str
    business_type: str  # 'agency', 'tour_operator', 'both'
    years_in_business: int
    iata_number: Optional[str]
    
    # Address
    address_street: str
    address_city: str
    address_state: str
    address_country: str
    address_postal_code: str
    
    # Owner/Director Information
    owner_full_name: str
    owner_position: str
    owner_email: EmailStr
    owner_phone: str
    owner_mobile: str
    owner_passport_number: str
    owner_passport_country: str
    owner_passport_expiry: str
    
    # Commercial Contacts
    sales_contact_name: str
    sales_email: EmailStr
    sales_phone: str
    accounting_email: EmailStr
    operations_email: Optional[EmailStr]
    website: Optional[str]
    facebook: Optional[str]
    instagram: Optional[str]
    linkedin: Optional[str]
    
    # Financial Information
    bank_name: str
    bank_country: str
    account_number: str
    swift_code: Optional[str]
    credit_line_requested: float
    payment_terms: str  # '7days', '15days', '30days', 'prepayment'
    preferred_currency: str  # 'USD', 'EUR', 'MXN', 'PEN', 'COP'
    monthly_volume_estimate: str
    
    # Commercial References
    references: List[Dict[str, str]]
    
    # Agreements
    terms_accepted: bool
    payment_terms_accepted: bool
    cancellation_policy_accepted: bool
    data_protection_accepted: bool
    
    # Digital Signature
    signature_timestamp: datetime
    signature_ip: str
    
    @validator('terms_accepted', 'payment_terms_accepted')
    def validate_agreements(cls, v):
        if not v:
            raise ValueError('All agreements must be accepted')
        return v

class AgencyStatusResponse(BaseModel):
    id: int
    company_name: str
    status: str
    registration_date: datetime
    approval_date: Optional[datetime]
    rejection_reason: Optional[str]
    credit_limit: float
    payment_terms: str
    commission_rate: float
    documents_verified: bool
    contract_signed: bool
    active: bool

class AgencyDashboardStats(BaseModel):
    total_bookings: int
    total_revenue: float
    pending_payments: float
    commission_earned: float
    active_passengers: int
    credit_available: float
    credit_used: float
    last_booking_date: Optional[datetime]
    performance_score: float

@router.post("/register", response_model=Dict[str, Any])
async def register_agency(
    request: AgencyRegistrationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Register a new agency/tour operator
    """
    try:
        service = AgenciesService(db)
        
        # Check if agency already exists
        existing = db.query(Agency).filter(
            (Agency.tax_id == request.tax_id) | 
            (Agency.company_email == request.owner_email)
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Agency with this Tax ID or email already exists"
            )
        
        # Create agency record
        agency = Agency(
            company_name=request.company_name,
            commercial_name=request.commercial_name or request.company_name,
            registration_number=request.registration_number,
            tax_id=request.tax_id,
            business_type=request.business_type,
            years_in_business=request.years_in_business,
            iata_number=request.iata_number,
            
            # Address
            address_street=request.address_street,
            address_city=request.address_city,
            address_state=request.address_state,
            address_country=request.address_country,
            address_postal_code=request.address_postal_code,
            
            # Owner
            owner_name=request.owner_full_name,
            owner_position=request.owner_position,
            owner_email=request.owner_email,
            owner_phone=request.owner_phone,
            owner_mobile=request.owner_mobile,
            owner_passport_number=request.owner_passport_number,
            owner_passport_country=request.owner_passport_country,
            owner_passport_expiry=datetime.fromisoformat(request.owner_passport_expiry),
            
            # Contacts
            sales_contact=request.sales_contact_name,
            sales_email=request.sales_email,
            sales_phone=request.sales_phone,
            accounting_email=request.accounting_email,
            operations_email=request.operations_email,
            company_email=request.owner_email,
            website=request.website,
            
            # Social Media
            social_media={
                'facebook': request.facebook,
                'instagram': request.instagram,
                'linkedin': request.linkedin
            },
            
            # Financial
            bank_name=request.bank_name,
            bank_country=request.bank_country,
            bank_account=request.account_number,
            swift_code=request.swift_code,
            credit_limit_requested=request.credit_line_requested,
            payment_terms_requested=request.payment_terms,
            preferred_currency=request.preferred_currency,
            monthly_volume_estimate=request.monthly_volume_estimate,
            
            # References
            commercial_references=request.references,
            
            # Status
            status='pending_review',
            registration_date=datetime.utcnow(),
            registration_ip=request.signature_ip,
            
            # Initial settings
            credit_limit_approved=0,
            payment_terms_approved='prepayment',
            commission_rate=10.0,  # Default 10%
            active=False
        )
        
        db.add(agency)
        db.commit()
        db.refresh(agency)
        
        # Create digital signature record
        signature_hash = create_signature_hash(
            agency_id=agency.id,
            timestamp=request.signature_timestamp,
            ip_address=request.signature_ip
        )
        
        # Generate welcome email
        background_tasks.add_task(
            send_agency_welcome_email,
            agency.owner_email,
            agency.owner_name,
            agency.company_name,
            agency.id
        )
        
        # Notify admin team
        background_tasks.add_task(
            notify_admin_new_agency,
            agency
        )
        
        return {
            "success": True,
            "message": "Registration received successfully",
            "agency_id": agency.id,
            "reference_number": f"AG{agency.id:06d}",
            "status": "pending_review",
            "estimated_response": "24-48 hours",
            "next_steps": [
                "Upload required documents",
                "Our team will review your application",
                "You will receive an email with the decision",
                "If approved, you'll get access credentials"
            ]
        }
        
    except Exception as e:
        logger.error(f"Agency registration error: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{agency_id}/documents")
async def upload_agency_documents(
    agency_id: int,
    document_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload agency documents
    """
    agency = db.query(Agency).filter(Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    # Validate file
    if not validate_file(file, max_size=10*1024*1024, allowed_types=['pdf', 'jpg', 'jpeg', 'png']):
        raise HTTPException(status_code=400, detail="Invalid file format or size")
    
    # Store file
    file_path = await store_file(
        file,
        folder=f"agencies/{agency_id}/documents",
        filename=f"{document_type}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    )
    
    # Create document record
    document = AgencyDocument(
        agency_id=agency_id,
        document_type=document_type,
        file_path=file_path,
        file_name=file.filename,
        file_size=file.size,
        uploaded_date=datetime.utcnow(),
        status='pending_verification',
        verified=False
    )
    
    db.add(document)
    db.commit()
    
    return {
        "success": True,
        "document_id": document.id,
        "message": f"{document_type} uploaded successfully"
    }

@router.get("/{agency_id}/contract/download")
async def download_agency_contract(
    agency_id: int,
    db: Session = Depends(get_db)
):
    """
    Generate and download agency contract PDF
    """
    agency = db.query(Agency).filter(Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    # Generate contract PDF
    contract_data = {
        'agency_name': agency.company_name,
        'tax_id': agency.tax_id,
        'address': f"{agency.address_street}, {agency.address_city}, {agency.address_country}",
        'owner_name': agency.owner_name,
        'payment_terms': agency.payment_terms_approved or agency.payment_terms_requested,
        'commission_rate': agency.commission_rate,
        'credit_limit': agency.credit_limit_approved,
        'date': datetime.utcnow().strftime('%Y-%m-%d')
    }
    
    pdf_path = generate_contract_pdf(contract_data)
    
    return FileResponse(
        pdf_path,
        media_type='application/pdf',
        filename=f"spirit_tours_contract_{agency.company_name.replace(' ', '_')}.pdf"
    )

@router.post("/{agency_id}/contract/sign")
async def sign_agency_contract(
    agency_id: int,
    signature_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Digitally sign the agency contract
    """
    agency = db.query(Agency).filter(Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    # Verify signature
    if not verify_signature(signature_data):
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Create contract record
    contract = AgencyContract(
        agency_id=agency_id,
        contract_number=f"CT-{agency_id:06d}-{datetime.now().year}",
        start_date=datetime.utcnow(),
        end_date=datetime.utcnow() + timedelta(days=365),  # 1 year contract
        payment_terms=agency.payment_terms_approved,
        commission_rate=agency.commission_rate,
        credit_limit=agency.credit_limit_approved,
        status='active',
        signed_date=datetime.utcnow(),
        signature_hash=signature_data.get('hash'),
        signature_ip=signature_data.get('ip_address')
    )
    
    db.add(contract)
    agency.contract_signed = True
    agency.contract_date = datetime.utcnow()
    
    db.commit()
    
    return {
        "success": True,
        "contract_number": contract.contract_number,
        "message": "Contract signed successfully"
    }

@router.get("/{agency_id}/dashboard", response_model=AgencyDashboardStats)
async def get_agency_dashboard(
    agency_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get agency dashboard statistics
    """
    # Verify agency access
    agency = db.query(Agency).filter(Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    # Check if user belongs to agency or is admin
    if current_user['role'] not in ['admin', 'director']:
        agency_user = db.query(AgencyUser).filter(
            AgencyUser.agency_id == agency_id,
            AgencyUser.user_email == current_user['email']
        ).first()
        
        if not agency_user:
            raise HTTPException(status_code=403, detail="Access denied")
    
    service = AgenciesService(db)
    stats = service.get_agency_statistics(agency_id)
    
    return AgencyDashboardStats(**stats)

@router.post("/{agency_id}/approve")
@require_role(['admin', 'director'])
async def approve_agency(
    agency_id: int,
    approval_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Approve agency registration (Admin only)
    """
    agency = db.query(Agency).filter(Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    # Update agency status
    agency.status = 'approved'
    agency.approval_date = datetime.utcnow()
    agency.approved_by = current_user['id']
    agency.credit_limit_approved = approval_data.get('credit_limit', 0)
    agency.payment_terms_approved = approval_data.get('payment_terms', 'prepayment')
    agency.commission_rate = approval_data.get('commission_rate', 10.0)
    agency.active = True
    
    # Create commission structure
    commission = AgencyCommission(
        agency_id=agency_id,
        service_type='all',
        commission_rate=agency.commission_rate,
        valid_from=datetime.utcnow(),
        active=True
    )
    db.add(commission)
    
    # Create agency user account
    temp_password = secrets.token_urlsafe(12)
    agency_user = AgencyUser(
        agency_id=agency_id,
        user_email=agency.owner_email,
        user_name=agency.owner_name,
        role='admin',
        temp_password=temp_password,  # Should be hashed in production
        active=True,
        created_date=datetime.utcnow()
    )
    db.add(agency_user)
    
    db.commit()
    
    # Send approval email with credentials
    background_tasks.add_task(
        send_agency_approval_email,
        agency.owner_email,
        agency.owner_name,
        agency.company_name,
        temp_password
    )
    
    return {
        "success": True,
        "message": "Agency approved successfully",
        "credentials_sent": True
    }

@router.post("/{agency_id}/reject")
@require_role(['admin', 'director'])
async def reject_agency(
    agency_id: int,
    rejection_data: Dict[str, str],
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reject agency registration (Admin only)
    """
    agency = db.query(Agency).filter(Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    # Update agency status
    agency.status = 'rejected'
    agency.rejection_date = datetime.utcnow()
    agency.rejection_reason = rejection_data.get('reason')
    agency.rejected_by = current_user['id']
    agency.active = False
    
    db.commit()
    
    # Send rejection email
    background_tasks.add_task(
        send_agency_rejection_email,
        agency.owner_email,
        agency.owner_name,
        agency.company_name,
        rejection_data.get('reason')
    )
    
    return {
        "success": True,
        "message": "Agency registration rejected"
    }

@router.get("/pending", response_model=List[AgencyStatusResponse])
@require_role(['admin', 'director'])
async def get_pending_agencies(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of pending agency registrations (Admin only)
    """
    agencies = db.query(Agency).filter(
        Agency.status == 'pending_review'
    ).order_by(Agency.registration_date.desc()).all()
    
    return [AgencyStatusResponse(
        id=a.id,
        company_name=a.company_name,
        status=a.status,
        registration_date=a.registration_date,
        approval_date=a.approval_date,
        rejection_reason=a.rejection_reason,
        credit_limit=a.credit_limit_approved,
        payment_terms=a.payment_terms_approved,
        commission_rate=a.commission_rate,
        documents_verified=a.documents_verified,
        contract_signed=a.contract_signed,
        active=a.active
    ) for a in agencies]

@router.get("/{agency_id}/payments")
async def get_agency_payments(
    agency_id: int,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get agency payment history
    """
    # Verify access
    if current_user['role'] not in ['admin', 'director']:
        agency_user = db.query(AgencyUser).filter(
            AgencyUser.agency_id == agency_id,
            AgencyUser.user_email == current_user['email']
        ).first()
        
        if not agency_user:
            raise HTTPException(status_code=403, detail="Access denied")
    
    payments = db.query(AgencyPayment).filter(
        AgencyPayment.agency_id == agency_id
    ).order_by(AgencyPayment.payment_date.desc()).offset(offset).limit(limit).all()
    
    return {
        "payments": [
            {
                "id": p.id,
                "booking_id": p.booking_id,
                "amount": p.amount,
                "currency": p.currency,
                "payment_date": p.payment_date,
                "payment_method": p.payment_method,
                "status": p.status,
                "reference": p.reference_number
            } for p in payments
        ],
        "total": db.query(AgencyPayment).filter(
            AgencyPayment.agency_id == agency_id
        ).count()
    }

@router.post("/{agency_id}/credit-request")
async def request_credit_increase(
    agency_id: int,
    credit_request: Dict[str, Any],
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Request credit limit increase
    """
    agency = db.query(Agency).filter(Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    # Create credit request record
    request_data = {
        'agency_id': agency_id,
        'current_limit': agency.credit_limit_approved,
        'requested_limit': credit_request.get('amount'),
        'justification': credit_request.get('justification'),
        'request_date': datetime.utcnow(),
        'status': 'pending'
    }
    
    # Store request (simplified - should have proper model)
    agency.credit_request = request_data
    db.commit()
    
    # Notify admin
    background_tasks.add_task(
        notify_admin_credit_request,
        agency,
        credit_request
    )
    
    return {
        "success": True,
        "message": "Credit increase request submitted",
        "reference": f"CR-{agency_id}-{datetime.now().strftime('%Y%m%d')}"
    }

# Helper functions for email notifications
async def send_agency_welcome_email(email: str, name: str, company: str, agency_id: int):
    """Send welcome email to newly registered agency"""
    subject = f"Bienvenido a Spirit Tours - {company}"
    body = f"""
    Estimado/a {name},
    
    Hemos recibido su solicitud de registro para {company}.
    Su número de referencia es: AG{agency_id:06d}
    
    Nuestro equipo revisará su aplicación en las próximas 24-48 horas.
    
    Por favor, asegúrese de haber cargado todos los documentos requeridos.
    
    Saludos cordiales,
    Equipo Spirit Tours
    """
    await send_email(email, subject, body)

async def send_agency_approval_email(email: str, name: str, company: str, password: str):
    """Send approval email with credentials"""
    subject = f"¡Felicidades! {company} ha sido aprobada"
    body = f"""
    Estimado/a {name},
    
    Nos complace informarle que {company} ha sido aprobada como agencia asociada.
    
    Sus credenciales de acceso son:
    Email: {email}
    Contraseña temporal: {password}
    
    Por favor, cambie su contraseña en el primer inicio de sesión.
    
    Portal de agencias: https://spirittours.com/agency-portal
    
    Bienvenido a la familia Spirit Tours!
    
    Saludos cordiales,
    Equipo Spirit Tours
    """
    await send_email(email, subject, body)

async def send_agency_rejection_email(email: str, name: str, company: str, reason: str):
    """Send rejection email"""
    subject = f"Actualización sobre su solicitud - {company}"
    body = f"""
    Estimado/a {name},
    
    Lamentamos informarle que su solicitud de registro para {company} no ha sido aprobada.
    
    Razón: {reason}
    
    Si desea volver a aplicar, por favor corrija los puntos mencionados y envíe una nueva solicitud.
    
    Saludos cordiales,
    Equipo Spirit Tours
    """
    await send_email(email, subject, body)

async def notify_admin_new_agency(agency: Agency):
    """Notify admin team about new agency registration"""
    # Implementation for admin notification
    pass

async def notify_admin_credit_request(agency: Agency, request: Dict):
    """Notify admin about credit increase request"""
    # Implementation for credit request notification
    pass