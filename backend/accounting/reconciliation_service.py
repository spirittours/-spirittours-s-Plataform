"""
Motor de Reconciliación Financiera - Spirit Tours

Sistema automático de reconciliación que:
- Empareja recibos con facturas automáticamente
- Detecta pagos parciales y completos
- Identifica discrepancias de pago
- Gestiona cuentas por cobrar
- Genera reportes de reconciliación
"""
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from decimal import Decimal
from enum import Enum

from .models import Invoice, Receipt, PaymentStatus, DocumentStatus
from .invoice_service import get_invoice_service
from .receipt_service import get_receipt_service


class ReconciliationStatus(str, Enum):
    """Estado de reconciliación."""
    MATCHED = "matched"  # Recibo emparejado con factura
    PARTIAL = "partial"  # Pago parcial
    UNMATCHED = "unmatched"  # Recibo sin factura
    OVERPAID = "overpaid"  # Pago excede factura
    DISCREPANCY = "discrepancy"  # Discrepancia detectada


class MatchingStrategy(str, Enum):
    """Estrategia de emparejamiento."""
    EXACT_AMOUNT = "exact_amount"  # Monto exacto
    INVOICE_NUMBER = "invoice_number"  # Número de factura en referencia
    CUSTOMER_DATE = "customer_date"  # Cliente + fecha cercana
    FUZZY = "fuzzy"  # Matching difuso con ML


class ReconciliationMatch:
    """Representa un emparejamiento recibo-factura."""
    
    def __init__(
        self,
        invoice: Invoice,
        receipt: Receipt,
        matched_amount: Decimal,
        confidence: float,
        strategy: MatchingStrategy,
        notes: Optional[str] = None
    ):
        self.invoice = invoice
        self.receipt = receipt
        self.matched_amount = matched_amount
        self.confidence = confidence
        self.strategy = strategy
        self.notes = notes
        self.status = self._determine_status()
    
    def _determine_status(self) -> ReconciliationStatus:
        """Determinar estado de reconciliación."""
        if self.matched_amount == self.invoice.total_amount:
            return ReconciliationStatus.MATCHED
        elif self.matched_amount < self.invoice.total_amount:
            return ReconciliationStatus.PARTIAL
        elif self.matched_amount > self.invoice.total_amount:
            return ReconciliationStatus.OVERPAID
        else:
            return ReconciliationStatus.DISCREPANCY
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertir a diccionario."""
        return {
            "invoice_number": self.invoice.invoice_number,
            "receipt_number": self.receipt.receipt_number,
            "invoice_amount": float(self.invoice.total_amount),
            "receipt_amount": float(self.receipt.amount),
            "matched_amount": float(self.matched_amount),
            "confidence": self.confidence,
            "strategy": self.strategy.value,
            "status": self.status.value,
            "notes": self.notes
        }


class ReconciliationService:
    """
    Servicio de Reconciliación Financiera.
    
    Automatiza el proceso de emparejamiento de recibos con facturas
    y gestiona el seguimiento de cuentas por cobrar.
    """
    
    def __init__(self):
        """Inicializar servicio de reconciliación."""
        self.invoice_service = get_invoice_service()
        self.receipt_service = get_receipt_service()
    
    async def auto_reconcile(
        self,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        strategies: Optional[List[MatchingStrategy]] = None
    ) -> Dict[str, Any]:
        """
        Ejecutar reconciliación automática.
        
        Args:
            from_date: Fecha desde
            to_date: Fecha hasta
            strategies: Estrategias de matching a usar
        
        Returns:
            Resultado de reconciliación con estadísticas y matches
        """
        if strategies is None:
            strategies = [
                MatchingStrategy.INVOICE_NUMBER,
                MatchingStrategy.EXACT_AMOUNT,
                MatchingStrategy.CUSTOMER_DATE
            ]
        
        # Obtener facturas no pagadas
        unpaid_invoices = await self.invoice_service.list_invoices(
            payment_status=PaymentStatus.UNPAID,
            from_date=from_date,
            to_date=to_date,
            limit=10000
        )
        
        # Obtener recibos sin reconciliar
        unreconciled_receipts = await self._get_unreconciled_receipts(from_date, to_date)
        
        matches = []
        reconciled_invoices = set()
        reconciled_receipts = set()
        
        # Aplicar estrategias en orden
        for strategy in strategies:
            new_matches = await self._apply_strategy(
                strategy,
                unpaid_invoices,
                unreconciled_receipts,
                reconciled_invoices,
                reconciled_receipts
            )
            matches.extend(new_matches)
        
        # Actualizar estados de facturas y recibos
        for match in matches:
            if match.status == ReconciliationStatus.MATCHED:
                await self.invoice_service.mark_as_paid(
                    match.invoice.invoice_number,
                    payment_date=match.receipt.payment_date,
                    payment_reference=match.receipt.receipt_number
                )
        
        # Estadísticas
        total_matched_amount = sum(m.matched_amount for m in matches)
        
        return {
            "summary": {
                "total_invoices": len(unpaid_invoices),
                "total_receipts": len(unreconciled_receipts),
                "matched_count": len([m for m in matches if m.status == ReconciliationStatus.MATCHED]),
                "partial_count": len([m for m in matches if m.status == ReconciliationStatus.PARTIAL]),
                "unmatched_invoices": len(unpaid_invoices) - len(reconciled_invoices),
                "unmatched_receipts": len(unreconciled_receipts) - len(reconciled_receipts),
                "total_matched_amount": float(total_matched_amount)
            },
            "matches": [m.to_dict() for m in matches],
            "strategies_used": [s.value for s in strategies]
        }
    
    async def reconcile_invoice(
        self,
        invoice_number: str
    ) -> Dict[str, Any]:
        """
        Reconciliar factura específica con sus recibos.
        
        Args:
            invoice_number: Número de factura
        
        Returns:
            Estado de reconciliación de la factura
        """
        invoice = await self.invoice_service.get_invoice(invoice_number)
        if not invoice:
            raise ValueError(f"Invoice {invoice_number} not found")
        
        # Obtener recibos relacionados
        receipts = await self.receipt_service.get_receipts_by_invoice(invoice_number)
        
        # Calcular total recibido
        total_received = await self.receipt_service.get_total_received_for_invoice(invoice_number)
        
        # Determinar estado
        status = self._determine_payment_status(invoice.total_amount, total_received)
        
        return {
            "invoice_number": invoice_number,
            "invoice_amount": float(invoice.total_amount),
            "total_received": float(total_received),
            "balance": float(invoice.total_amount - total_received),
            "status": status.value,
            "receipts": [
                {
                    "receipt_number": r.receipt_number,
                    "amount": float(r.amount),
                    "payment_date": r.payment_date.isoformat(),
                    "payment_method": r.payment_method
                }
                for r in receipts
            ]
        }
    
    async def get_accounts_receivable_report(self) -> Dict[str, Any]:
        """
        Generar reporte de cuentas por cobrar.
        
        Returns:
            Reporte completo de cuentas por cobrar con aging
        """
        unpaid_invoices = await self.invoice_service.list_invoices(limit=10000)
        unpaid_invoices = [
            inv for inv in unpaid_invoices 
            if inv.payment_status in [PaymentStatus.UNPAID, PaymentStatus.PARTIAL]
        ]
        
        today = date.today()
        
        # Agrupar por cliente
        by_customer: Dict[str, Dict[str, Any]] = {}
        
        for inv in unpaid_invoices:
            customer_email = inv.customer.email
            
            if customer_email not in by_customer:
                by_customer[customer_email] = {
                    "customer_name": inv.customer.name,
                    "customer_email": customer_email,
                    "total_outstanding": Decimal("0"),
                    "invoice_count": 0,
                    "oldest_invoice_date": inv.issue_date,
                    "invoices": []
                }
            
            # Calcular cuánto falta por pagar
            total_received = await self.receipt_service.get_total_received_for_invoice(
                inv.invoice_number
            )
            outstanding = inv.total_amount - total_received
            
            by_customer[customer_email]["total_outstanding"] += outstanding
            by_customer[customer_email]["invoice_count"] += 1
            
            if inv.issue_date < by_customer[customer_email]["oldest_invoice_date"]:
                by_customer[customer_email]["oldest_invoice_date"] = inv.issue_date
            
            # Calcular días vencidos
            days_overdue = 0
            if inv.due_date:
                days_overdue = max(0, (today - inv.due_date).days)
            
            by_customer[customer_email]["invoices"].append({
                "invoice_number": inv.invoice_number,
                "issue_date": inv.issue_date.isoformat(),
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "amount": float(inv.total_amount),
                "outstanding": float(outstanding),
                "days_overdue": days_overdue
            })
        
        # Ordenar por monto pendiente (mayor a menor)
        sorted_customers = sorted(
            by_customer.values(),
            key=lambda x: x["total_outstanding"],
            reverse=True
        )
        
        # Formatear para reporte
        for customer in sorted_customers:
            customer["total_outstanding"] = float(customer["total_outstanding"])
            customer["oldest_invoice_date"] = customer["oldest_invoice_date"].isoformat()
        
        total_ar = sum(c["total_outstanding"] for c in sorted_customers)
        
        return {
            "title": "Reporte de Cuentas por Cobrar",
            "report_date": today.isoformat(),
            "total_accounts_receivable": total_ar,
            "customer_count": len(sorted_customers),
            "customers": sorted_customers
        }
    
    async def get_discrepancies_report(self) -> List[Dict[str, Any]]:
        """
        Identificar discrepancias en pagos.
        
        Returns:
            Lista de discrepancias detectadas
        """
        discrepancies = []
        
        # Obtener todas las facturas
        invoices = await self.invoice_service.list_invoices(limit=10000)
        
        for inv in invoices:
            total_received = await self.receipt_service.get_total_received_for_invoice(
                inv.invoice_number
            )
            
            difference = total_received - inv.total_amount
            
            # Discrepancia si hay diferencia significativa (>0.01)
            if abs(difference) > Decimal("0.01"):
                discrepancy_type = "overpayment" if difference > 0 else "underpayment"
                
                discrepancies.append({
                    "invoice_number": inv.invoice_number,
                    "customer": inv.customer.name,
                    "invoice_amount": float(inv.total_amount),
                    "total_received": float(total_received),
                    "difference": float(difference),
                    "type": discrepancy_type,
                    "issue_date": inv.issue_date.isoformat()
                })
        
        return discrepancies
    
    async def suggest_matches(
        self,
        receipt_number: str
    ) -> List[Dict[str, Any]]:
        """
        Sugerir facturas para emparejar con un recibo.
        
        Args:
            receipt_number: Número de recibo
        
        Returns:
            Lista de sugerencias de facturas con score de confianza
        """
        receipt = await self.receipt_service.get_receipt(receipt_number)
        if not receipt:
            raise ValueError(f"Receipt {receipt_number} not found")
        
        # Obtener facturas no pagadas del mismo cliente
        unpaid_invoices = await self.invoice_service.list_invoices(
            customer_email=receipt.customer.email,
            limit=100
        )
        unpaid_invoices = [
            inv for inv in unpaid_invoices
            if inv.payment_status in [PaymentStatus.UNPAID, PaymentStatus.PARTIAL]
        ]
        
        suggestions = []
        
        for inv in unpaid_invoices:
            score = await self._calculate_match_score(receipt, inv)
            
            if score > 0:
                suggestions.append({
                    "invoice_number": inv.invoice_number,
                    "invoice_amount": float(inv.total_amount),
                    "receipt_amount": float(receipt.amount),
                    "confidence_score": score,
                    "match_reason": self._get_match_reason(receipt, inv, score),
                    "issue_date": inv.issue_date.isoformat(),
                    "due_date": inv.due_date.isoformat() if inv.due_date else None
                })
        
        # Ordenar por score (mayor a menor)
        suggestions.sort(key=lambda x: x["confidence_score"], reverse=True)
        
        return suggestions
    
    # Private helper methods
    
    async def _get_unreconciled_receipts(
        self,
        from_date: Optional[date],
        to_date: Optional[date]
    ) -> List[Receipt]:
        """Obtener recibos que no han sido reconciliados."""
        receipts = await self.receipt_service.list_receipts(
            from_date=from_date,
            to_date=to_date,
            limit=10000
        )
        
        # Filtrar recibos sin factura relacionada o con factura no pagada
        unreconciled = []
        for receipt in receipts:
            if receipt.status == DocumentStatus.CANCELLED:
                continue
            
            if not receipt.related_invoice_number:
                unreconciled.append(receipt)
            else:
                invoice = await self.invoice_service.get_invoice(receipt.related_invoice_number)
                if invoice and invoice.payment_status != PaymentStatus.PAID:
                    unreconciled.append(receipt)
        
        return unreconciled
    
    async def _apply_strategy(
        self,
        strategy: MatchingStrategy,
        invoices: List[Invoice],
        receipts: List[Receipt],
        reconciled_invoices: set,
        reconciled_receipts: set
    ) -> List[ReconciliationMatch]:
        """Aplicar estrategia de matching."""
        matches = []
        
        if strategy == MatchingStrategy.INVOICE_NUMBER:
            matches = await self._match_by_invoice_number(
                invoices, receipts, reconciled_invoices, reconciled_receipts
            )
        elif strategy == MatchingStrategy.EXACT_AMOUNT:
            matches = await self._match_by_exact_amount(
                invoices, receipts, reconciled_invoices, reconciled_receipts
            )
        elif strategy == MatchingStrategy.CUSTOMER_DATE:
            matches = await self._match_by_customer_and_date(
                invoices, receipts, reconciled_invoices, reconciled_receipts
            )
        
        return matches
    
    async def _match_by_invoice_number(
        self,
        invoices: List[Invoice],
        receipts: List[Receipt],
        reconciled_invoices: set,
        reconciled_receipts: set
    ) -> List[ReconciliationMatch]:
        """Matching por número de factura en referencia."""
        matches = []
        
        for receipt in receipts:
            if receipt.receipt_number in reconciled_receipts:
                continue
            
            # Buscar número de factura en concepto o referencia
            invoice_ref = receipt.related_invoice_number
            if not invoice_ref and receipt.concept:
                # Intentar extraer número de factura del concepto
                import re
                pattern = r'(\d{4}-[A-Z]+-\d{6})'
                match = re.search(pattern, receipt.concept)
                if match:
                    invoice_ref = match.group(1)
            
            if invoice_ref:
                # Buscar factura
                for invoice in invoices:
                    if invoice.invoice_number == invoice_ref and invoice.invoice_number not in reconciled_invoices:
                        match = ReconciliationMatch(
                            invoice=invoice,
                            receipt=receipt,
                            matched_amount=min(invoice.total_amount, receipt.amount),
                            confidence=1.0,
                            strategy=MatchingStrategy.INVOICE_NUMBER,
                            notes="Matched by invoice number reference"
                        )
                        matches.append(match)
                        reconciled_invoices.add(invoice.invoice_number)
                        reconciled_receipts.add(receipt.receipt_number)
                        break
        
        return matches
    
    async def _match_by_exact_amount(
        self,
        invoices: List[Invoice],
        receipts: List[Receipt],
        reconciled_invoices: set,
        reconciled_receipts: set
    ) -> List[ReconciliationMatch]:
        """Matching por monto exacto."""
        matches = []
        
        for receipt in receipts:
            if receipt.receipt_number in reconciled_receipts:
                continue
            
            for invoice in invoices:
                if invoice.invoice_number in reconciled_invoices:
                    continue
                
                # Mismo cliente y monto exacto
                if (invoice.customer.email == receipt.customer.email and
                    invoice.total_amount == receipt.amount):
                    
                    match = ReconciliationMatch(
                        invoice=invoice,
                        receipt=receipt,
                        matched_amount=receipt.amount,
                        confidence=0.9,
                        strategy=MatchingStrategy.EXACT_AMOUNT,
                        notes="Matched by exact amount and customer"
                    )
                    matches.append(match)
                    reconciled_invoices.add(invoice.invoice_number)
                    reconciled_receipts.add(receipt.receipt_number)
                    break
        
        return matches
    
    async def _match_by_customer_and_date(
        self,
        invoices: List[Invoice],
        receipts: List[Receipt],
        reconciled_invoices: set,
        reconciled_receipts: set
    ) -> List[ReconciliationMatch]:
        """Matching por cliente y fecha cercana."""
        matches = []
        
        for receipt in receipts:
            if receipt.receipt_number in reconciled_receipts:
                continue
            
            best_match = None
            best_score = 0
            
            for invoice in invoices:
                if invoice.invoice_number in reconciled_invoices:
                    continue
                
                if invoice.customer.email != receipt.customer.email:
                    continue
                
                # Calcular score basado en diferencia de fecha y monto
                score = await self._calculate_match_score(receipt, invoice)
                
                if score > best_score and score > 0.6:
                    best_score = score
                    best_match = invoice
            
            if best_match:
                match = ReconciliationMatch(
                    invoice=best_match,
                    receipt=receipt,
                    matched_amount=min(best_match.total_amount, receipt.amount),
                    confidence=best_score,
                    strategy=MatchingStrategy.CUSTOMER_DATE,
                    notes="Matched by customer and date proximity"
                )
                matches.append(match)
                reconciled_invoices.add(best_match.invoice_number)
                reconciled_receipts.add(receipt.receipt_number)
        
        return matches
    
    async def _calculate_match_score(self, receipt: Receipt, invoice: Invoice) -> float:
        """Calcular score de matching entre recibo y factura."""
        score = 0.0
        
        # Mismo cliente (+0.5)
        if invoice.customer.email == receipt.customer.email:
            score += 0.5
        else:
            return 0.0  # No match si no es el mismo cliente
        
        # Monto exacto (+0.4)
        if invoice.total_amount == receipt.amount:
            score += 0.4
        else:
            # Monto cercano (dentro de 10%)
            diff_percent = abs(invoice.total_amount - receipt.amount) / invoice.total_amount * 100
            if diff_percent <= 10:
                score += 0.2
        
        # Fecha cercana (+0.1)
        date_diff = abs((receipt.payment_date.date() - invoice.issue_date).days)
        if date_diff <= 7:
            score += 0.1
        elif date_diff <= 30:
            score += 0.05
        
        return min(score, 1.0)
    
    def _determine_payment_status(
        self,
        invoice_amount: Decimal,
        total_received: Decimal
    ) -> PaymentStatus:
        """Determinar estado de pago basado en montos."""
        if total_received >= invoice_amount:
            return PaymentStatus.PAID
        elif total_received > 0:
            return PaymentStatus.PARTIAL
        else:
            return PaymentStatus.UNPAID
    
    def _get_match_reason(self, receipt: Receipt, invoice: Invoice, score: float) -> str:
        """Obtener razón del match."""
        reasons = []
        
        if invoice.total_amount == receipt.amount:
            reasons.append("monto exacto")
        
        date_diff = abs((receipt.payment_date.date() - invoice.issue_date).days)
        if date_diff <= 7:
            reasons.append("fecha cercana")
        
        if score >= 0.9:
            reasons.append("alta confianza")
        
        return ", ".join(reasons) if reasons else "matching automático"


# Singleton global
_reconciliation_service: Optional[ReconciliationService] = None


def get_reconciliation_service() -> ReconciliationService:
    """
    Obtener instancia global del servicio de reconciliación.
    
    Returns:
        ReconciliationService
    """
    global _reconciliation_service
    if _reconciliation_service is None:
        _reconciliation_service = ReconciliationService()
    return _reconciliation_service
