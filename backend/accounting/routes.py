"""
API Routes - Sistema de Contabilidad Spirit Tours

Endpoints REST para:
- Facturas (crear, listar, aprobar, enviar, marcar como pagada)
- Recibos (crear, listar, cancelar)
- Notas de crédito/débito
- Firma digital
- Generación de PDF
- Estadísticas
"""
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, HTTPException, Query, Path, Response
from fastapi.responses import StreamingResponse
import io

from .models import (
    Invoice, InvoiceCreateRequest,
    Receipt, ReceiptCreateRequest,
    CreditNote, DebitNote, InvoiceLine,
    DocumentStatus, PaymentStatus
)
from .invoice_service import get_invoice_service
from .receipt_service import get_receipt_service
from .digital_signature_service import get_signature_service
from .pdf_generator import get_pdf_generator


router = APIRouter(prefix="/accounting", tags=["Accounting"])


# ============================================================================
# FACTURAS (INVOICES)
# ============================================================================

@router.post("/invoices", response_model=Invoice, status_code=201)
async def create_invoice(request: InvoiceCreateRequest):
    """
    Crear nueva factura.
    
    La factura se crea en estado DRAFT y requiere aprobación antes de enviarla.
    Los totales se calculan automáticamente.
    """
    try:
        service = get_invoice_service()
        invoice = await service.create_invoice(request)
        return invoice
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/invoices/{invoice_number}", response_model=Invoice)
async def get_invoice(
    invoice_number: str = Path(..., description="Número de factura")
):
    """Obtener factura por número."""
    service = get_invoice_service()
    invoice = await service.get_invoice(invoice_number)
    
    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice {invoice_number} not found")
    
    return invoice


@router.get("/invoices", response_model=List[Invoice])
async def list_invoices(
    status: Optional[DocumentStatus] = Query(None, description="Filtrar por estado"),
    customer_email: Optional[str] = Query(None, description="Filtrar por email de cliente"),
    from_date: Optional[date] = Query(None, description="Fecha desde"),
    to_date: Optional[date] = Query(None, description="Fecha hasta"),
    limit: int = Query(100, ge=1, le=1000, description="Límite de resultados"),
    offset: int = Query(0, ge=0, description="Offset para paginación")
):
    """
    Listar facturas con filtros.
    
    Soporta filtrado por estado, cliente, rango de fechas, y paginación.
    """
    service = get_invoice_service()
    invoices = await service.list_invoices(
        status=status,
        customer_email=customer_email,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
        offset=offset
    )
    return invoices


@router.put("/invoices/{invoice_number}/approve", response_model=Invoice)
async def approve_invoice(
    invoice_number: str = Path(..., description="Número de factura")
):
    """
    Aprobar factura (DRAFT → APPROVED).
    
    Una vez aprobada, la factura puede ser enviada al cliente.
    """
    try:
        service = get_invoice_service()
        invoice = await service.approve_invoice(invoice_number)
        return invoice
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/invoices/{invoice_number}/send", response_model=Invoice)
async def mark_invoice_as_sent(
    invoice_number: str = Path(..., description="Número de factura")
):
    """
    Marcar factura como enviada (APPROVED → SENT).
    
    Indica que la factura ha sido enviada al cliente.
    """
    try:
        service = get_invoice_service()
        invoice = await service.mark_as_sent(invoice_number)
        return invoice
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/invoices/{invoice_number}/pay", response_model=Invoice)
async def mark_invoice_as_paid(
    invoice_number: str = Path(..., description="Número de factura"),
    payment_reference: Optional[str] = Query(None, description="Referencia de pago")
):
    """
    Marcar factura como pagada.
    
    Registra el pago de la factura y actualiza el estado a PAID.
    """
    try:
        service = get_invoice_service()
        invoice = await service.mark_as_paid(invoice_number, payment_reference=payment_reference)
        return invoice
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/invoices/{invoice_number}", response_model=Invoice)
async def cancel_invoice(
    invoice_number: str = Path(..., description="Número de factura"),
    reason: str = Query(..., description="Razón de cancelación")
):
    """
    Cancelar factura.
    
    Las facturas pagadas no pueden ser canceladas. Para rectificar una factura
    pagada, use notas de crédito.
    """
    try:
        service = get_invoice_service()
        invoice = await service.cancel_invoice(invoice_number, reason)
        return invoice
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/invoices/{invoice_number}/pdf")
async def download_invoice_pdf(
    invoice_number: str = Path(..., description="Número de factura"),
    language: str = Query("es", description="Idioma (es/en)")
):
    """
    Descargar factura en formato PDF.
    
    Genera un PDF profesional con diseño corporativo y cumplimiento fiscal.
    """
    service = get_invoice_service()
    invoice = await service.get_invoice(invoice_number)
    
    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice {invoice_number} not found")
    
    # Generar PDF
    pdf_generator = get_pdf_generator(language=language)
    pdf_bytes = await pdf_generator.generate_invoice_pdf(invoice)
    
    # Retornar como descarga
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=invoice_{invoice_number}.pdf"
        }
    )


@router.post("/invoices/{invoice_number}/sign", response_model=Invoice)
async def sign_invoice(
    invoice_number: str = Path(..., description="Número de factura"),
    signer_name: str = Query(..., description="Nombre del firmante")
):
    """
    Firmar factura digitalmente.
    
    Aplica una firma digital electrónica a la factura usando certificado X.509.
    """
    service = get_invoice_service()
    invoice = await service.get_invoice(invoice_number)
    
    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice {invoice_number} not found")
    
    if invoice.digital_signature:
        raise HTTPException(status_code=400, detail="Invoice already signed")
    
    # Firmar
    signature_service = get_signature_service()
    document_data = f"{invoice_number}|{invoice.total_amount}|{invoice.issue_date}"
    signature = await signature_service.sign_document(document_data, signer_name)
    
    # Actualizar factura
    invoice.digital_signature = signature
    
    return invoice


@router.get("/invoices/statistics/summary")
async def get_invoice_statistics(
    year: int = Query(..., description="Año"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Mes (opcional)")
):
    """
    Obtener estadísticas de facturación.
    
    Incluye totales, montos pagados, pendientes, vencidos, y tasa de pago.
    """
    service = get_invoice_service()
    stats = await service.get_statistics(year, month)
    return stats


# ============================================================================
# NOTAS DE CRÉDITO/DÉBITO
# ============================================================================

@router.post("/credit-notes", response_model=CreditNote, status_code=201)
async def create_credit_note(
    original_invoice_number: str = Query(..., description="Número de factura original"),
    lines: List[InvoiceLine] = ...,
    reason: str = Query(..., description="Motivo de la rectificación")
):
    """
    Crear nota de crédito (rectificativa negativa).
    
    Se usa para anular o rectificar facturas emitidas.
    """
    try:
        service = get_invoice_service()
        credit_note = await service.create_credit_note(
            original_invoice_number=original_invoice_number,
            lines=lines,
            reason=reason
        )
        return credit_note
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/debit-notes", response_model=DebitNote, status_code=201)
async def create_debit_note(
    original_invoice_number: str = Query(..., description="Número de factura original"),
    lines: List[InvoiceLine] = ...,
    reason: str = Query(..., description="Motivo del cargo adicional")
):
    """
    Crear nota de débito (rectificativa positiva).
    
    Se usa para cargos adicionales sobre facturas emitidas.
    """
    try:
        service = get_invoice_service()
        debit_note = await service.create_debit_note(
            original_invoice_number=original_invoice_number,
            lines=lines,
            reason=reason
        )
        return debit_note
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# RECIBOS (RECEIPTS)
# ============================================================================

@router.post("/receipts", response_model=Receipt, status_code=201)
async def create_receipt(request: ReceiptCreateRequest):
    """
    Crear nuevo recibo de pago.
    
    Los recibos certifican pagos recibidos y pueden estar vinculados a facturas.
    """
    try:
        service = get_receipt_service()
        receipt = await service.create_receipt(request)
        return receipt
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/receipts/{receipt_number}", response_model=Receipt)
async def get_receipt(
    receipt_number: str = Path(..., description="Número de recibo")
):
    """Obtener recibo por número."""
    service = get_receipt_service()
    receipt = await service.get_receipt(receipt_number)
    
    if not receipt:
        raise HTTPException(status_code=404, detail=f"Receipt {receipt_number} not found")
    
    return receipt


@router.get("/receipts", response_model=List[Receipt])
async def list_receipts(
    customer_email: Optional[str] = Query(None, description="Filtrar por email de cliente"),
    related_invoice_number: Optional[str] = Query(None, description="Filtrar por factura"),
    from_date: Optional[date] = Query(None, description="Fecha desde"),
    to_date: Optional[date] = Query(None, description="Fecha hasta"),
    payment_method: Optional[str] = Query(None, description="Método de pago"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """
    Listar recibos con filtros.
    
    Soporta filtrado por cliente, factura, fecha, método de pago, y paginación.
    """
    service = get_receipt_service()
    receipts = await service.list_receipts(
        customer_email=customer_email,
        related_invoice_number=related_invoice_number,
        from_date=from_date,
        to_date=to_date,
        payment_method=payment_method,
        limit=limit,
        offset=offset
    )
    return receipts


@router.delete("/receipts/{receipt_number}", response_model=Receipt)
async def cancel_receipt(
    receipt_number: str = Path(..., description="Número de recibo"),
    reason: str = Query(..., description="Razón de cancelación")
):
    """Cancelar recibo."""
    try:
        service = get_receipt_service()
        receipt = await service.cancel_receipt(receipt_number, reason)
        return receipt
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/receipts/{receipt_number}/pdf")
async def download_receipt_pdf(
    receipt_number: str = Path(..., description="Número de recibo"),
    language: str = Query("es", description="Idioma (es/en)")
):
    """
    Descargar recibo en formato PDF.
    
    Genera un PDF profesional del recibo de pago.
    """
    service = get_receipt_service()
    receipt = await service.get_receipt(receipt_number)
    
    if not receipt:
        raise HTTPException(status_code=404, detail=f"Receipt {receipt_number} not found")
    
    # Generar PDF
    pdf_generator = get_pdf_generator(language=language)
    pdf_bytes = await pdf_generator.generate_receipt_pdf(receipt)
    
    # Retornar como descarga
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=receipt_{receipt_number}.pdf"
        }
    )


@router.post("/receipts/{receipt_number}/sign", response_model=Receipt)
async def sign_receipt(
    receipt_number: str = Path(..., description="Número de recibo"),
    signer_name: str = Query(..., description="Nombre del firmante")
):
    """
    Firmar recibo digitalmente.
    
    Aplica una firma digital electrónica al recibo.
    """
    service = get_receipt_service()
    receipt = await service.get_receipt(receipt_number)
    
    if not receipt:
        raise HTTPException(status_code=404, detail=f"Receipt {receipt_number} not found")
    
    if receipt.digital_signature:
        raise HTTPException(status_code=400, detail="Receipt already signed")
    
    # Firmar
    signature_service = get_signature_service()
    document_data = f"{receipt_number}|{receipt.amount}|{receipt.payment_date}"
    signature = await signature_service.sign_document(document_data, signer_name)
    
    # Actualizar recibo
    receipt.digital_signature = signature
    
    return receipt


@router.get("/receipts/statistics/summary")
async def get_receipt_statistics(
    year: int = Query(..., description="Año"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Mes (opcional)")
):
    """
    Obtener estadísticas de recibos.
    
    Incluye totales, desglose por método de pago, y promedios.
    """
    service = get_receipt_service()
    stats = await service.get_statistics(year, month)
    return stats


# ============================================================================
# FIRMA DIGITAL
# ============================================================================

@router.get("/digital-signature/certificate")
async def get_certificate_info():
    """
    Obtener información del certificado digital actual.
    
    Retorna detalles del certificado X.509 en uso.
    """
    service = get_signature_service()
    cert_info = await service.get_certificate_info()
    
    if not cert_info:
        raise HTTPException(
            status_code=404,
            detail="No certificate loaded. Service running in development mode."
        )
    
    return cert_info


@router.get("/digital-signature/validate")
async def validate_certificate():
    """
    Validar certificado digital.
    
    Verifica fechas de expiración y validez del certificado.
    """
    service = get_signature_service()
    validation = await service.validate_certificate()
    return validation


# ============================================================================
# DASHBOARD Y REPORTES
# ============================================================================

@router.get("/dashboard/summary")
async def get_dashboard_summary(
    year: int = Query(..., description="Año"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Mes (opcional)")
):
    """
    Obtener resumen del dashboard de contabilidad.
    
    Incluye estadísticas consolidadas de facturas, recibos, y finanzas.
    """
    invoice_service = get_invoice_service()
    receipt_service = get_receipt_service()
    
    # Obtener estadísticas
    invoice_stats = await invoice_service.get_statistics(year, month)
    receipt_stats = await receipt_service.get_statistics(year, month)
    
    # Consolidar
    summary = {
        "period": invoice_stats["period"],
        "invoices": invoice_stats,
        "receipts": receipt_stats,
        "financial_summary": {
            "total_invoiced": invoice_stats["total_amount"],
            "total_received": receipt_stats["total_amount"],
            "outstanding_balance": invoice_stats["pending_amount"],
            "overdue_amount": invoice_stats["overdue_amount"]
        }
    }
    
    return summary


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "accounting",
        "version": "1.0.0"
    }
