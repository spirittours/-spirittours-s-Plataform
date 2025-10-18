"""
Servicio de Facturas - Spirit Tours

Gestión completa de facturas:
- Creación con numeración automática
- Cálculo automático de totales e impuestos
- Gestión de ciclo de vida (draft → approved → sent → paid)
- Generación de PDF profesional
- Aplicación de firma digital
- Búsqueda y listado
"""
from datetime import date, datetime, timedelta
from typing import List, Optional, Dict, Any
from decimal import Decimal
import uuid

from .models import (
    Invoice, InvoiceCreateRequest, InvoiceLine,
    DocumentStatus, PaymentStatus, CompanyInfo,
    TaxInvoice, CreditNote, DebitNote, DigitalSignature
)


class InvoiceService:
    """
    Servicio de gestión de facturas.
    
    Gestiona todo el ciclo de vida de las facturas desde creación hasta pago.
    """
    
    def __init__(self, company_info: CompanyInfo):
        """
        Inicializar servicio de facturas.
        
        Args:
            company_info: Información de la empresa emisora
        """
        self.company_info = company_info
        # TODO: Conectar con base de datos real
        self._invoices: Dict[str, Invoice] = {}
        self._counter: int = 1
    
    async def create_invoice(
        self,
        request: InvoiceCreateRequest,
        invoice_series: str = "A",
        auto_calculate: bool = True
    ) -> Invoice:
        """
        Crear nueva factura.
        
        Args:
            request: Datos de la factura
            invoice_series: Serie de factura (A, B, C, etc.)
            auto_calculate: Calcular automáticamente totales
        
        Returns:
            Invoice creada con numeración automática
        """
        # Generar número de factura
        invoice_number = await self._generate_invoice_number(invoice_series)
        
        # Calcular fecha de vencimiento si no está especificada
        issue_date = request.issue_date or date.today()
        due_date = request.due_date
        if not due_date:
            # Calcular basado en payment_terms
            days = self._parse_payment_terms_days(request.payment_terms)
            due_date = issue_date + timedelta(days=days)
        
        # Crear factura
        invoice = Invoice(
            invoice_number=invoice_number,
            invoice_series=invoice_series,
            issue_date=issue_date,
            due_date=due_date,
            company=self.company_info,
            customer=request.customer,
            lines=request.lines,
            payment_terms=request.payment_terms,
            notes=request.notes,
            related_booking_id=request.related_booking_id,
            status=DocumentStatus.DRAFT,
            payment_status=PaymentStatus.UNPAID
        )
        
        # Calcular totales
        if auto_calculate:
            invoice.calculate_totals()
        
        # Guardar
        self._invoices[invoice_number] = invoice
        
        return invoice
    
    async def get_invoice(self, invoice_number: str) -> Optional[Invoice]:
        """
        Obtener factura por número.
        
        Args:
            invoice_number: Número de factura
        
        Returns:
            Invoice o None si no existe
        """
        # TODO: Obtener de base de datos
        return self._invoices.get(invoice_number)
    
    async def list_invoices(
        self,
        status: Optional[DocumentStatus] = None,
        customer_email: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Invoice]:
        """
        Listar facturas con filtros.
        
        Args:
            status: Filtrar por estado
            customer_email: Filtrar por email de cliente
            from_date: Fecha desde
            to_date: Fecha hasta
            limit: Límite de resultados
            offset: Offset para paginación
        
        Returns:
            Lista de facturas
        """
        # TODO: Implementar query real de base de datos
        invoices = list(self._invoices.values())
        
        # Filtrar
        if status:
            invoices = [inv for inv in invoices if inv.status == status]
        if customer_email:
            invoices = [inv for inv in invoices if inv.customer.email == customer_email]
        if from_date:
            invoices = [inv for inv in invoices if inv.issue_date >= from_date]
        if to_date:
            invoices = [inv for inv in invoices if inv.issue_date <= to_date]
        
        # Ordenar por fecha (más reciente primero)
        invoices.sort(key=lambda x: x.issue_date, reverse=True)
        
        # Paginar
        return invoices[offset:offset + limit]
    
    async def approve_invoice(self, invoice_number: str) -> Invoice:
        """
        Aprobar factura (draft → approved).
        
        Args:
            invoice_number: Número de factura
        
        Returns:
            Invoice actualizada
        
        Raises:
            ValueError: Si la factura no existe o no está en estado draft
        """
        invoice = await self.get_invoice(invoice_number)
        if not invoice:
            raise ValueError(f"Invoice {invoice_number} not found")
        
        if invoice.status != DocumentStatus.DRAFT:
            raise ValueError(f"Invoice must be in DRAFT status, current: {invoice.status}")
        
        invoice.status = DocumentStatus.APPROVED
        invoice.updated_at = datetime.utcnow()
        
        return invoice
    
    async def mark_as_sent(self, invoice_number: str) -> Invoice:
        """
        Marcar factura como enviada (approved → sent).
        
        Args:
            invoice_number: Número de factura
        
        Returns:
            Invoice actualizada
        """
        invoice = await self.get_invoice(invoice_number)
        if not invoice:
            raise ValueError(f"Invoice {invoice_number} not found")
        
        if invoice.status != DocumentStatus.APPROVED:
            raise ValueError("Invoice must be APPROVED before sending")
        
        invoice.status = DocumentStatus.SENT
        invoice.updated_at = datetime.utcnow()
        
        return invoice
    
    async def mark_as_paid(
        self,
        invoice_number: str,
        payment_date: Optional[datetime] = None,
        payment_reference: Optional[str] = None
    ) -> Invoice:
        """
        Marcar factura como pagada.
        
        Args:
            invoice_number: Número de factura
            payment_date: Fecha de pago (default: ahora)
            payment_reference: Referencia del pago
        
        Returns:
            Invoice actualizada
        """
        invoice = await self.get_invoice(invoice_number)
        if not invoice:
            raise ValueError(f"Invoice {invoice_number} not found")
        
        invoice.status = DocumentStatus.PAID
        invoice.payment_status = PaymentStatus.PAID
        invoice.payment_date = payment_date or datetime.utcnow()
        
        if payment_reference and invoice.payment_info:
            invoice.payment_info.payment_reference = payment_reference
            invoice.payment_info.payment_date = invoice.payment_date
            invoice.payment_info.amount_paid = invoice.total_amount
        
        invoice.updated_at = datetime.utcnow()
        
        return invoice
    
    async def cancel_invoice(self, invoice_number: str, reason: str) -> Invoice:
        """
        Cancelar factura.
        
        Args:
            invoice_number: Número de factura
            reason: Razón de cancelación
        
        Returns:
            Invoice cancelada
        """
        invoice = await self.get_invoice(invoice_number)
        if not invoice:
            raise ValueError(f"Invoice {invoice_number} not found")
        
        if invoice.status == DocumentStatus.PAID:
            raise ValueError("Cannot cancel a paid invoice. Create a credit note instead.")
        
        invoice.status = DocumentStatus.CANCELLED
        invoice.notes = f"{invoice.notes or ''}\n\nCANCELLED: {reason}"
        invoice.updated_at = datetime.utcnow()
        
        return invoice
    
    async def create_credit_note(
        self,
        original_invoice_number: str,
        lines: List[InvoiceLine],
        reason: str,
        credit_note_series: str = "NC"
    ) -> CreditNote:
        """
        Crear nota de crédito para rectificar una factura.
        
        Args:
            original_invoice_number: Número de factura original
            lines: Líneas a rectificar (con cantidades negativas)
            reason: Motivo de la rectificación
            credit_note_series: Serie de nota de crédito
        
        Returns:
            CreditNote creada
        """
        # Obtener factura original
        original = await self.get_invoice(original_invoice_number)
        if not original:
            raise ValueError(f"Original invoice {original_invoice_number} not found")
        
        # Generar número de nota de crédito
        credit_number = await self._generate_invoice_number(credit_note_series)
        
        # Calcular totales (negativos)
        for line in lines:
            line.calculate()
        
        total_amount = sum(line.total or Decimal("0") for line in lines)
        
        # Crear nota de crédito
        credit_note = CreditNote(
            credit_note_number=credit_number,
            credit_note_series=credit_note_series,
            original_invoice_number=original_invoice_number,
            original_invoice_date=original.issue_date,
            company=self.company_info,
            customer=original.customer,
            lines=lines,
            total_amount=total_amount,
            reason=reason
        )
        
        return credit_note
    
    async def create_debit_note(
        self,
        original_invoice_number: str,
        lines: List[InvoiceLine],
        reason: str,
        debit_note_series: str = "ND"
    ) -> DebitNote:
        """
        Crear nota de débito para cargos adicionales.
        
        Args:
            original_invoice_number: Número de factura original
            lines: Líneas adicionales (positivas)
            reason: Motivo del cargo adicional
            debit_note_series: Serie de nota de débito
        
        Returns:
            DebitNote creada
        """
        # Obtener factura original
        original = await self.get_invoice(original_invoice_number)
        if not original:
            raise ValueError(f"Original invoice {original_invoice_number} not found")
        
        # Generar número
        debit_number = await self._generate_invoice_number(debit_note_series)
        
        # Calcular totales
        for line in lines:
            line.calculate()
        
        total_amount = sum(line.total or Decimal("0") for line in lines)
        
        # Crear nota de débito
        debit_note = DebitNote(
            debit_note_number=debit_number,
            debit_note_series=debit_note_series,
            original_invoice_number=original_invoice_number,
            original_invoice_date=original.issue_date,
            company=self.company_info,
            customer=original.customer,
            lines=lines,
            total_amount=total_amount,
            reason=reason
        )
        
        return debit_note
    
    async def check_overdue_invoices(self) -> List[Invoice]:
        """
        Verificar facturas vencidas y actualizar estado.
        
        Returns:
            Lista de facturas vencidas
        """
        today = date.today()
        overdue = []
        
        for invoice in self._invoices.values():
            if (invoice.payment_status != PaymentStatus.PAID and 
                invoice.due_date and 
                invoice.due_date < today and
                invoice.status != DocumentStatus.CANCELLED):
                
                invoice.status = DocumentStatus.OVERDUE
                invoice.updated_at = datetime.utcnow()
                overdue.append(invoice)
        
        return overdue
    
    async def get_statistics(self, year: int, month: Optional[int] = None) -> Dict[str, Any]:
        """
        Obtener estadísticas de facturación.
        
        Args:
            year: Año
            month: Mes (opcional)
        
        Returns:
            Diccionario con estadísticas
        """
        invoices = await self.list_invoices(limit=10000)
        
        # Filtrar por año/mes
        if month:
            invoices = [
                inv for inv in invoices 
                if inv.issue_date.year == year and inv.issue_date.month == month
            ]
        else:
            invoices = [inv for inv in invoices if inv.issue_date.year == year]
        
        # Calcular estadísticas
        total_invoices = len(invoices)
        total_amount = sum(inv.total_amount for inv in invoices)
        paid_invoices = [inv for inv in invoices if inv.payment_status == PaymentStatus.PAID]
        paid_amount = sum(inv.total_amount for inv in paid_invoices)
        pending_amount = total_amount - paid_amount
        overdue_invoices = [inv for inv in invoices if inv.status == DocumentStatus.OVERDUE]
        overdue_amount = sum(inv.total_amount for inv in overdue_invoices)
        
        return {
            "period": f"{year}-{month:02d}" if month else str(year),
            "total_invoices": total_invoices,
            "total_amount": float(total_amount),
            "paid_invoices": len(paid_invoices),
            "paid_amount": float(paid_amount),
            "pending_amount": float(pending_amount),
            "overdue_invoices": len(overdue_invoices),
            "overdue_amount": float(overdue_amount),
            "payment_rate": (len(paid_invoices) / total_invoices * 100) if total_invoices > 0 else 0
        }
    
    # Helper methods
    
    async def _generate_invoice_number(self, series: str) -> str:
        """
        Generar número de factura único.
        
        Format: {YEAR}-{SERIES}-{SEQUENCE}
        Example: 2025-A-001234
        
        Args:
            series: Serie de factura
        
        Returns:
            Número de factura
        """
        # TODO: Obtener último número de base de datos
        year = date.today().year
        sequence = self._counter
        self._counter += 1
        
        return f"{year}-{series}-{sequence:06d}"
    
    def _parse_payment_terms_days(self, payment_terms: str) -> int:
        """
        Parsear términos de pago a días.
        
        Examples:
            "30 días" -> 30
            "60 days" -> 60
            "Inmediato" -> 0
        
        Args:
            payment_terms: Términos de pago
        
        Returns:
            Número de días
        """
        terms_lower = payment_terms.lower()
        
        # Patrones comunes
        if "inmediato" in terms_lower or "immediate" in terms_lower:
            return 0
        
        # Extraer número
        import re
        match = re.search(r'(\d+)', terms_lower)
        if match:
            return int(match.group(1))
        
        # Default: 30 días
        return 30


# Singleton global (se inicializa en startup)
_invoice_service: Optional[InvoiceService] = None


def get_invoice_service() -> InvoiceService:
    """
    Obtener instancia global del servicio de facturas.
    
    Returns:
        InvoiceService
    
    Raises:
        RuntimeError: Si el servicio no ha sido inicializado
    """
    global _invoice_service
    if _invoice_service is None:
        raise RuntimeError("InvoiceService not initialized. Call initialize_invoice_service() first.")
    return _invoice_service


def initialize_invoice_service(company_info: CompanyInfo) -> InvoiceService:
    """
    Inicializar servicio de facturas global.
    
    Args:
        company_info: Información de la empresa
    
    Returns:
        InvoiceService inicializado
    """
    global _invoice_service
    _invoice_service = InvoiceService(company_info)
    return _invoice_service
