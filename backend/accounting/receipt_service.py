"""
Servicio de Recibos - Spirit Tours

Gestión completa de recibos de pago:
- Creación con numeración automática
- Vinculación con facturas
- Generación de PDF profesional
- Aplicación de firma digital
- Búsqueda y listado
"""
from datetime import date, datetime
from typing import List, Optional, Dict, Any
from decimal import Decimal

from .models import (
    Receipt, ReceiptCreateRequest, CompanyInfo,
    DocumentStatus, DigitalSignature
)


class ReceiptService:
    """
    Servicio de gestión de recibos de pago.
    
    Los recibos certifican pagos recibidos, ya sea vinculados a facturas
    o como documentos independientes.
    """
    
    def __init__(self, company_info: CompanyInfo):
        """
        Inicializar servicio de recibos.
        
        Args:
            company_info: Información de la empresa emisora
        """
        self.company_info = company_info
        # TODO: Conectar con base de datos real
        self._receipts: Dict[str, Receipt] = {}
        self._counter: int = 1
    
    async def create_receipt(
        self,
        request: ReceiptCreateRequest,
        receipt_series: str = "R",
        payment_date: Optional[datetime] = None
    ) -> Receipt:
        """
        Crear nuevo recibo de pago.
        
        Args:
            request: Datos del recibo
            receipt_series: Serie de recibo (R por default)
            payment_date: Fecha/hora del pago (default: ahora)
        
        Returns:
            Receipt creado con numeración automática
        """
        # Generar número de recibo
        receipt_number = await self._generate_receipt_number(receipt_series)
        
        # Crear recibo
        receipt = Receipt(
            receipt_number=receipt_number,
            receipt_series=receipt_series,
            issue_date=date.today(),
            payment_date=payment_date or datetime.utcnow(),
            company=self.company_info,
            customer=request.customer,
            amount=request.amount,
            payment_method=request.payment_method,
            payment_reference=request.payment_reference,
            concept=request.concept,
            related_invoice_number=request.related_invoice_number,
            status=DocumentStatus.APPROVED  # Receipts are auto-approved
        )
        
        # Guardar
        self._receipts[receipt_number] = receipt
        
        return receipt
    
    async def get_receipt(self, receipt_number: str) -> Optional[Receipt]:
        """
        Obtener recibo por número.
        
        Args:
            receipt_number: Número de recibo
        
        Returns:
            Receipt o None si no existe
        """
        # TODO: Obtener de base de datos
        return self._receipts.get(receipt_number)
    
    async def list_receipts(
        self,
        customer_email: Optional[str] = None,
        related_invoice_number: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        payment_method: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Receipt]:
        """
        Listar recibos con filtros.
        
        Args:
            customer_email: Filtrar por email de cliente
            related_invoice_number: Filtrar por factura relacionada
            from_date: Fecha desde
            to_date: Fecha hasta
            payment_method: Filtrar por método de pago
            limit: Límite de resultados
            offset: Offset para paginación
        
        Returns:
            Lista de recibos
        """
        # TODO: Implementar query real de base de datos
        receipts = list(self._receipts.values())
        
        # Filtrar
        if customer_email:
            receipts = [r for r in receipts if r.customer.email == customer_email]
        if related_invoice_number:
            receipts = [r for r in receipts if r.related_invoice_number == related_invoice_number]
        if from_date:
            receipts = [r for r in receipts if r.issue_date >= from_date]
        if to_date:
            receipts = [r for r in receipts if r.issue_date <= to_date]
        if payment_method:
            receipts = [r for r in receipts if r.payment_method == payment_method]
        
        # Ordenar por fecha (más reciente primero)
        receipts.sort(key=lambda x: x.payment_date, reverse=True)
        
        # Paginar
        return receipts[offset:offset + limit]
    
    async def cancel_receipt(self, receipt_number: str, reason: str) -> Receipt:
        """
        Cancelar recibo.
        
        Args:
            receipt_number: Número de recibo
            reason: Razón de cancelación
        
        Returns:
            Receipt cancelado
        """
        receipt = await self.get_receipt(receipt_number)
        if not receipt:
            raise ValueError(f"Receipt {receipt_number} not found")
        
        if receipt.status == DocumentStatus.CANCELLED:
            raise ValueError("Receipt is already cancelled")
        
        receipt.status = DocumentStatus.CANCELLED
        
        # Agregar razón al concepto
        receipt.concept = f"{receipt.concept}\n\nCANCELLED: {reason}"
        
        return receipt
    
    async def get_receipts_by_invoice(self, invoice_number: str) -> List[Receipt]:
        """
        Obtener todos los recibos relacionados con una factura.
        
        Args:
            invoice_number: Número de factura
        
        Returns:
            Lista de recibos
        """
        return await self.list_receipts(
            related_invoice_number=invoice_number,
            limit=1000
        )
    
    async def get_total_received_for_invoice(self, invoice_number: str) -> Decimal:
        """
        Calcular total recibido para una factura.
        
        Suma todos los recibos no cancelados relacionados con la factura.
        
        Args:
            invoice_number: Número de factura
        
        Returns:
            Total recibido
        """
        receipts = await self.get_receipts_by_invoice(invoice_number)
        
        total = Decimal("0")
        for receipt in receipts:
            if receipt.status != DocumentStatus.CANCELLED:
                total += receipt.amount
        
        return total
    
    async def get_statistics(
        self,
        year: int,
        month: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Obtener estadísticas de recibos.
        
        Args:
            year: Año
            month: Mes (opcional)
        
        Returns:
            Diccionario con estadísticas
        """
        receipts = await self.list_receipts(limit=10000)
        
        # Filtrar por año/mes
        if month:
            receipts = [
                r for r in receipts 
                if r.issue_date.year == year and r.issue_date.month == month
            ]
        else:
            receipts = [r for r in receipts if r.issue_date.year == year]
        
        # Filtrar cancelados
        active_receipts = [r for r in receipts if r.status != DocumentStatus.CANCELLED]
        
        # Calcular por método de pago
        payment_methods: Dict[str, Decimal] = {}
        for receipt in active_receipts:
            method = receipt.payment_method
            if method not in payment_methods:
                payment_methods[method] = Decimal("0")
            payment_methods[method] += receipt.amount
        
        # Totales
        total_receipts = len(active_receipts)
        total_amount = sum(r.amount for r in active_receipts)
        cancelled_receipts = len(receipts) - total_receipts
        
        return {
            "period": f"{year}-{month:02d}" if month else str(year),
            "total_receipts": total_receipts,
            "total_amount": float(total_amount),
            "cancelled_receipts": cancelled_receipts,
            "payment_methods": {
                method: float(amount) 
                for method, amount in payment_methods.items()
            },
            "average_receipt_amount": float(total_amount / total_receipts) if total_receipts > 0 else 0
        }
    
    # Helper methods
    
    async def _generate_receipt_number(self, series: str) -> str:
        """
        Generar número de recibo único.
        
        Format: {YEAR}-{SERIES}-{SEQUENCE}
        Example: 2025-R-001234
        
        Args:
            series: Serie de recibo
        
        Returns:
            Número de recibo
        """
        # TODO: Obtener último número de base de datos
        year = date.today().year
        sequence = self._counter
        self._counter += 1
        
        return f"{year}-{series}-{sequence:06d}"


# Singleton global
_receipt_service: Optional[ReceiptService] = None


def get_receipt_service() -> ReceiptService:
    """
    Obtener instancia global del servicio de recibos.
    
    Returns:
        ReceiptService
    
    Raises:
        RuntimeError: Si el servicio no ha sido inicializado
    """
    global _receipt_service
    if _receipt_service is None:
        raise RuntimeError("ReceiptService not initialized. Call initialize_receipt_service() first.")
    return _receipt_service


def initialize_receipt_service(company_info: CompanyInfo) -> ReceiptService:
    """
    Inicializar servicio de recibos global.
    
    Args:
        company_info: Información de la empresa
    
    Returns:
        ReceiptService inicializado
    """
    global _receipt_service
    _receipt_service = ReceiptService(company_info)
    return _receipt_service
