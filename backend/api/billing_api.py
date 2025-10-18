"""
API de Facturación Avanzada
Endpoints para gestión completa de facturas
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal

from backend.services.advanced_billing_service import (
    billing_service,
    InvoiceType,
    InvoiceStatus,
    PaymentTerm
)

router = APIRouter(prefix="/api/billing", tags=["Billing"])


# ==================== PYDANTIC MODELS ====================

class LineItemCreate(BaseModel):
    """Modelo para crear un item de línea"""
    description: str = Field(..., min_length=1, max_length=500)
    quantity: float = Field(..., gt=0)
    unit_price: float = Field(..., gt=0)
    tax_rate: Optional[float] = None
    discount: Optional[float] = Field(default=0, ge=0, le=100)
    item_code: Optional[str] = None


class CustomerAddress(BaseModel):
    """Dirección del cliente"""
    street: str
    city: str
    state: Optional[str] = None
    postal_code: str
    country: str
    country_code: str = Field(..., min_length=2, max_length=2)


class InvoiceCreate(BaseModel):
    """Modelo para crear una factura"""
    customer_id: str
    customer_name: str
    customer_email: EmailStr
    customer_address: CustomerAddress
    customer_tax_id: Optional[str] = None
    
    line_items: List[LineItemCreate] = Field(..., min_items=1)
    
    invoice_type: InvoiceType = InvoiceType.STANDARD
    currency: str = Field(default="USD", min_length=3, max_length=3)
    payment_term: PaymentTerm = PaymentTerm.NET_30
    
    notes: Optional[str] = None
    apply_tax: bool = True


class PaymentCreate(BaseModel):
    """Modelo para registrar un pago"""
    amount: float = Field(..., gt=0)
    payment_method: str = Field(..., min_length=1)
    payment_reference: str = Field(..., min_length=1)
    payment_date: Optional[datetime] = None


class InvoiceResponse(BaseModel):
    """Respuesta de factura"""
    invoice_number: str
    invoice_type: str
    customer_name: str
    customer_email: str
    issue_date: datetime
    due_date: Optional[datetime]
    currency: str
    subtotal: str
    total_tax: str
    total: str
    amount_paid: str
    balance_due: str
    status: str
    line_items_count: int


class CreditNoteCreate(BaseModel):
    """Modelo para crear nota de crédito"""
    original_invoice_number: str
    line_items: List[LineItemCreate]
    reason: str = Field(..., min_length=1, max_length=500)


# ==================== ENDPOINTS ====================

@router.post("/invoices", response_model=InvoiceResponse)
async def create_invoice(invoice_data: InvoiceCreate):
    """
    Crea una nueva factura
    
    - **customer_id**: ID del cliente
    - **line_items**: Items a facturar
    - **currency**: Moneda (USD, EUR, MXN, etc.)
    - **payment_term**: Términos de pago
    """
    try:
        # Convertir items a diccionarios
        line_items = [item.dict() for item in invoice_data.line_items]
        
        # Crear factura
        invoice = billing_service.create_invoice(
            customer_id=invoice_data.customer_id,
            customer_name=invoice_data.customer_name,
            customer_email=invoice_data.customer_email,
            customer_address=invoice_data.customer_address.dict(),
            line_items=line_items,
            invoice_type=invoice_data.invoice_type,
            currency=invoice_data.currency,
            payment_term=invoice_data.payment_term,
            customer_tax_id=invoice_data.customer_tax_id,
            notes=invoice_data.notes,
            apply_tax=invoice_data.apply_tax
        )
        
        return InvoiceResponse(
            invoice_number=invoice.invoice_number,
            invoice_type=invoice.invoice_type.value,
            customer_name=invoice.customer_name,
            customer_email=invoice.customer_email,
            issue_date=invoice.issue_date,
            due_date=invoice.due_date,
            currency=invoice.currency,
            subtotal=str(invoice.subtotal),
            total_tax=str(invoice.total_tax),
            total=str(invoice.total),
            amount_paid=str(invoice.amount_paid),
            balance_due=str(invoice.balance_due),
            status=invoice.status.value,
            line_items_count=len(invoice.line_items)
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/invoices/{invoice_number}")
async def get_invoice(invoice_number: str):
    """
    Obtiene una factura por su número
    
    - **invoice_number**: Número de factura (ej: INV-202410-001001)
    """
    invoice = billing_service.get_invoice(invoice_number)
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Construir respuesta detallada
    tax_breakdown = invoice.get_tax_breakdown()
    
    return {
        "invoice_number": invoice.invoice_number,
        "invoice_type": invoice.invoice_type.value,
        "status": invoice.status.value,
        "customer": {
            "id": invoice.customer_id,
            "name": invoice.customer_name,
            "email": invoice.customer_email,
            "address": invoice.customer_address,
            "tax_id": invoice.customer_tax_id
        },
        "dates": {
            "issue_date": invoice.issue_date.isoformat(),
            "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
            "created_at": invoice.created_at.isoformat(),
            "updated_at": invoice.updated_at.isoformat()
        },
        "line_items": [
            {
                "description": item.description,
                "item_code": item.item_code,
                "quantity": str(item.quantity),
                "unit_price": str(item.unit_price),
                "subtotal": str(item.subtotal),
                "discount_percentage": str(item.discount_percentage),
                "discount_amount": str(item.discount_amount),
                "subtotal_after_discount": str(item.subtotal_after_discount),
                "tax_rate": str(item.tax_rate),
                "tax_amount": str(item.tax_amount),
                "total": str(item.total)
            }
            for item in invoice.line_items
        ],
        "financial": {
            "currency": invoice.currency,
            "subtotal": str(invoice.subtotal),
            "total_tax": str(invoice.total_tax),
            "total": str(invoice.total),
            "amount_paid": str(invoice.amount_paid),
            "balance_due": str(invoice.balance_due)
        },
        "tax_breakdown": [
            {
                "tax_name": tb.tax_name,
                "tax_type": tb.tax_type.value,
                "tax_rate": str(tb.tax_rate),
                "taxable_amount": str(tb.taxable_amount),
                "tax_amount": str(tb.tax_amount)
            }
            for tb in tax_breakdown
        ],
        "payments": invoice.payments,
        "payment_term": invoice.payment_term.value,
        "notes": invoice.notes,
        "terms_and_conditions": invoice.terms_and_conditions,
        "is_paid": invoice.is_paid,
        "is_overdue": invoice.is_overdue
    }


@router.get("/invoices")
async def list_invoices(
    customer_id: Optional[str] = Query(None),
    status: Optional[InvoiceStatus] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0)
):
    """
    Lista facturas con filtros opcionales
    
    - **customer_id**: Filtrar por cliente
    - **status**: Filtrar por estado (draft, pending, paid, etc.)
    - **from_date**: Fecha desde
    - **to_date**: Fecha hasta
    - **limit**: Número máximo de resultados
    - **offset**: Offset para paginación
    """
    invoices = billing_service.list_invoices(
        customer_id=customer_id,
        status=status,
        from_date=from_date,
        to_date=to_date
    )
    
    # Paginación
    total = len(invoices)
    invoices_page = invoices[offset:offset + limit]
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "invoices": [
            {
                "invoice_number": inv.invoice_number,
                "invoice_type": inv.invoice_type.value,
                "customer_name": inv.customer_name,
                "customer_id": inv.customer_id,
                "issue_date": inv.issue_date.isoformat(),
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "currency": inv.currency,
                "total": str(inv.total),
                "balance_due": str(inv.balance_due),
                "status": inv.status.value,
                "is_overdue": inv.is_overdue
            }
            for inv in invoices_page
        ]
    }


@router.post("/invoices/{invoice_number}/payments")
async def add_payment(invoice_number: str, payment: PaymentCreate):
    """
    Registra un pago para una factura
    
    - **invoice_number**: Número de factura
    - **amount**: Monto del pago
    - **payment_method**: Método de pago (card, transfer, cash, etc.)
    - **payment_reference**: Referencia del pago
    """
    try:
        success = billing_service.add_payment(
            invoice_number=invoice_number,
            amount=Decimal(str(payment.amount)),
            payment_method=payment.payment_method,
            payment_reference=payment.payment_reference,
            payment_date=payment.payment_date
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to add payment")
        
        # Obtener factura actualizada
        invoice = billing_service.get_invoice(invoice_number)
        
        return {
            "message": "Payment registered successfully",
            "invoice_number": invoice_number,
            "payment_amount": str(payment.amount),
            "new_balance": str(invoice.balance_due),
            "status": invoice.status.value,
            "is_paid": invoice.is_paid
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/invoices/{invoice_number}/cancel")
async def cancel_invoice(invoice_number: str, reason: str = Query(..., min_length=1)):
    """
    Cancela una factura
    
    - **invoice_number**: Número de factura a cancelar
    - **reason**: Razón de la cancelación
    """
    success = billing_service.cancel_invoice(invoice_number, reason)
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to cancel invoice")
    
    return {
        "message": "Invoice cancelled successfully",
        "invoice_number": invoice_number,
        "reason": reason
    }


@router.post("/credit-notes", response_model=InvoiceResponse)
async def create_credit_note(credit_note: CreditNoteCreate):
    """
    Crea una nota de crédito
    
    - **original_invoice_number**: Número de factura original
    - **line_items**: Items a acreditar
    - **reason**: Razón de la nota de crédito
    """
    line_items = [item.dict() for item in credit_note.line_items]
    
    result = billing_service.create_credit_note(
        original_invoice_number=credit_note.original_invoice_number,
        line_items=line_items,
        reason=credit_note.reason
    )
    
    if not result:
        raise HTTPException(status_code=400, detail="Failed to create credit note")
    
    return InvoiceResponse(
        invoice_number=result.invoice_number,
        invoice_type=result.invoice_type.value,
        customer_name=result.customer_name,
        customer_email=result.customer_email,
        issue_date=result.issue_date,
        due_date=result.due_date,
        currency=result.currency,
        subtotal=str(result.subtotal),
        total_tax=str(result.total_tax),
        total=str(result.total),
        amount_paid=str(result.amount_paid),
        balance_due=str(result.balance_due),
        status=result.status.value,
        line_items_count=len(result.line_items)
    )


@router.get("/reports/aging")
async def get_aging_report(as_of_date: Optional[datetime] = Query(None)):
    """
    Genera reporte de antigüedad de saldos
    
    - **as_of_date**: Fecha de corte (opcional, default: hoy)
    """
    report = billing_service.get_aging_report(as_of_date)
    return report


@router.get("/reports/revenue")
async def get_revenue_report(
    from_date: datetime = Query(...),
    to_date: datetime = Query(...),
    group_by: str = Query(default="month", regex="^(day|week|month)$")
):
    """
    Genera reporte de ingresos
    
    - **from_date**: Fecha inicial
    - **to_date**: Fecha final
    - **group_by**: Agrupar por día, semana o mes
    """
    report = billing_service.get_revenue_report(
        from_date=from_date,
        to_date=to_date,
        group_by=group_by
    )
    return report


@router.get("/stats")
async def get_billing_stats():
    """
    Obtiene estadísticas generales de facturación
    """
    all_invoices = billing_service.list_invoices()
    
    stats = {
        "total_invoices": len(all_invoices),
        "by_status": {},
        "total_outstanding": Decimal('0'),
        "total_overdue": Decimal('0'),
        "overdue_count": 0
    }
    
    for invoice in all_invoices:
        # Por estado
        status = invoice.status.value
        if status not in stats["by_status"]:
            stats["by_status"][status] = 0
        stats["by_status"][status] += 1
        
        # Pendientes
        if invoice.balance_due > 0:
            stats["total_outstanding"] += invoice.balance_due
        
        # Vencidas
        if invoice.is_overdue:
            stats["overdue_count"] += 1
            stats["total_overdue"] += invoice.balance_due
    
    # Convertir Decimals a strings
    stats["total_outstanding"] = str(stats["total_outstanding"])
    stats["total_overdue"] = str(stats["total_overdue"])
    
    return stats


@router.get("/health")
async def billing_health_check():
    """Verificación de salud del servicio de facturación"""
    return {
        "service": "billing",
        "status": "healthy",
        "invoices_count": len(billing_service.invoices),
        "timestamp": datetime.utcnow().isoformat()
    }
