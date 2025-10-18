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


# ============================================================================
# DASHBOARD AVANZADO
# ============================================================================

@router.get("/dashboard/kpis")
async def get_dashboard_kpis(
    period: str = Query("month", description="Período: today, week, month, quarter, year")
):
    """
    Obtener KPIs financieros del dashboard.
    
    Incluye: total facturado, total recibido, saldo pendiente, tasa de pago, etc.
    """
    from .dashboard_service import get_dashboard_service, TimePeriod
    
    service = get_dashboard_service()
    period_enum = TimePeriod(period)
    kpis = await service.get_kpis(period_enum)
    
    return kpis


@router.get("/dashboard/revenue-chart")
async def get_revenue_chart(
    period: str = Query("year", description="Período del gráfico"),
    chart_type: str = Query("line", description="Tipo: line, bar, area")
):
    """
    Obtener datos para gráfico de ingresos mensuales.
    
    Retorna datos formateados para Chart.js o similar.
    """
    from .dashboard_service import get_dashboard_service, TimePeriod, ChartType
    
    service = get_dashboard_service()
    chart_data = await service.get_revenue_chart(
        TimePeriod(period),
        ChartType(chart_type)
    )
    
    return chart_data


@router.get("/dashboard/payment-methods-chart")
async def get_payment_methods_chart(
    period: str = Query("month", description="Período del análisis")
):
    """
    Obtener distribución de métodos de pago.
    
    Retorna gráfico tipo donut/pie con desglose por método.
    """
    from .dashboard_service import get_dashboard_service, TimePeriod
    
    service = get_dashboard_service()
    chart_data = await service.get_payment_methods_chart(TimePeriod(period))
    
    return chart_data


@router.get("/dashboard/cash-flow-projection")
async def get_cash_flow_projection(
    months_ahead: int = Query(3, ge=1, le=12, description="Meses a proyectar")
):
    """
    Obtener proyección de flujo de caja.
    
    Proyecta las entradas esperadas basadas en facturas pendientes.
    """
    from .dashboard_service import get_dashboard_service
    
    service = get_dashboard_service()
    projection = await service.get_cash_flow_projection(months_ahead)
    
    return projection


@router.get("/dashboard/aging-report")
async def get_aging_report():
    """
    Obtener reporte de antigüedad de cuentas por cobrar.
    
    Clasifica facturas pendientes por días vencidos:
    - Corriente (0-30 días)
    - 31-60 días
    - 61-90 días
    - Más de 90 días
    """
    from .dashboard_service import get_dashboard_service
    
    service = get_dashboard_service()
    report = await service.get_aging_report()
    
    return report


@router.get("/dashboard/alerts")
async def get_dashboard_alerts():
    """
    Obtener alertas financieras automáticas.
    
    Incluye:
    - Facturas vencidas
    - Facturas próximas a vencer
    - Baja tasa de pago
    """
    from .dashboard_service import get_dashboard_service
    
    service = get_dashboard_service()
    alerts = await service.get_alerts()
    
    return {"alerts": alerts}


# ============================================================================
# RECONCILIACIÓN FINANCIERA
# ============================================================================

@router.post("/reconciliation/auto")
async def auto_reconcile(
    from_date: Optional[date] = Query(None, description="Fecha desde"),
    to_date: Optional[date] = Query(None, description="Fecha hasta"),
    strategies: Optional[List[str]] = Query(
        None,
        description="Estrategias: invoice_number, exact_amount, customer_date"
    )
):
    """
    Ejecutar reconciliación automática de recibos con facturas.
    
    Utiliza múltiples estrategias de matching para emparejar
    recibos con sus facturas correspondientes.
    """
    from .reconciliation_service import get_reconciliation_service, MatchingStrategy
    
    service = get_reconciliation_service()
    
    strategy_enums = None
    if strategies:
        strategy_enums = [MatchingStrategy(s) for s in strategies]
    
    result = await service.auto_reconcile(from_date, to_date, strategy_enums)
    
    return result


@router.post("/reconciliation/invoice/{invoice_number}")
async def reconcile_invoice(
    invoice_number: str = Path(..., description="Número de factura")
):
    """
    Reconciliar factura específica con sus recibos.
    
    Retorna el estado de reconciliación y balance pendiente.
    """
    from .reconciliation_service import get_reconciliation_service
    
    try:
        service = get_reconciliation_service()
        result = await service.reconcile_invoice(invoice_number)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/reconciliation/accounts-receivable")
async def get_accounts_receivable_report():
    """
    Obtener reporte completo de cuentas por cobrar.
    
    Agrupa por cliente con detalles de facturas pendientes.
    """
    from .reconciliation_service import get_reconciliation_service
    
    service = get_reconciliation_service()
    report = await service.get_accounts_receivable_report()
    
    return report


@router.get("/reconciliation/discrepancies")
async def get_discrepancies_report():
    """
    Identificar discrepancias en pagos.
    
    Lista facturas con sobrepagos o pagos insuficientes.
    """
    from .reconciliation_service import get_reconciliation_service
    
    service = get_reconciliation_service()
    discrepancies = await service.get_discrepancies_report()
    
    return {"discrepancies": discrepancies}


@router.get("/reconciliation/suggest/{receipt_number}")
async def suggest_invoice_matches(
    receipt_number: str = Path(..., description="Número de recibo")
):
    """
    Sugerir facturas para emparejar con un recibo.
    
    Retorna lista de sugerencias ordenadas por score de confianza.
    """
    from .reconciliation_service import get_reconciliation_service
    
    try:
        service = get_reconciliation_service()
        suggestions = await service.suggest_matches(receipt_number)
        return {"suggestions": suggestions}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ============================================================================
# REPORTES FINANCIEROS
# ============================================================================

@router.get("/reports/balance-sheet")
async def get_balance_sheet(
    as_of_date: Optional[date] = Query(None, description="Fecha del balance")
):
    """
    Generar Balance General (Balance Sheet).
    
    Muestra activos, pasivos y patrimonio a una fecha específica.
    """
    from .financial_reports_service import get_financial_reports_service
    
    service = get_financial_reports_service()
    report = await service.generate_balance_sheet(as_of_date)
    
    return report


@router.get("/reports/profit-and-loss")
async def get_profit_and_loss(
    from_date: date = Query(..., description="Fecha inicio"),
    to_date: date = Query(..., description="Fecha fin")
):
    """
    Generar Estado de Resultados (Profit & Loss).
    
    Muestra ingresos, gastos y resultado neto del período.
    """
    from .financial_reports_service import get_financial_reports_service
    
    service = get_financial_reports_service()
    report = await service.generate_profit_and_loss(from_date, to_date)
    
    return report


@router.get("/reports/cash-flow")
async def get_cash_flow_statement(
    from_date: date = Query(..., description="Fecha inicio"),
    to_date: date = Query(..., description="Fecha fin")
):
    """
    Generar Estado de Flujo de Caja (Cash Flow Statement).
    
    Muestra entradas y salidas de efectivo por actividad.
    """
    from .financial_reports_service import get_financial_reports_service
    
    service = get_financial_reports_service()
    report = await service.generate_cash_flow_statement(from_date, to_date)
    
    return report


@router.get("/reports/vat-book")
async def get_vat_book(
    from_date: date = Query(..., description="Fecha inicio"),
    to_date: date = Query(..., description="Fecha fin")
):
    """
    Generar Libro de IVA (VAT Book).
    
    Reporte fiscal con desglose completo de IVA por tasa.
    """
    from .financial_reports_service import get_financial_reports_service
    
    service = get_financial_reports_service()
    report = await service.generate_vat_book(from_date, to_date)
    
    return report


@router.get("/reports/modelo-303")
async def get_modelo_303(
    quarter: int = Query(..., ge=1, le=4, description="Trimestre (1-4)"),
    year: int = Query(..., ge=2000, le=2100, description="Año")
):
    """
    Generar datos para Modelo 303 (IVA trimestral España).
    
    Calcula IVA repercutido, IVA soportado y resultado.
    """
    from .financial_reports_service import get_financial_reports_service
    
    service = get_financial_reports_service()
    report = await service.generate_modelo_303(quarter, year)
    
    return report
