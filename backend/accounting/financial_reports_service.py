"""
Servicio de Reportes Financieros - Spirit Tours

Genera reportes contables profesionales:
- Balance General (Balance Sheet)
- Estado de Resultados (Profit & Loss / P&L)
- Flujo de Caja (Cash Flow Statement)
- Libro de IVA
- Reportes fiscales españoles
"""
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional
from decimal import Decimal
from enum import Enum

from .models import Invoice, Receipt, PaymentStatus, DocumentStatus, TaxType
from .invoice_service import get_invoice_service
from .receipt_service import get_receipt_service


class ReportPeriod(str, Enum):
    """Período del reporte."""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    CUSTOM = "custom"


class ReportFormat(str, Enum):
    """Formato del reporte."""
    JSON = "json"
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"


class FinancialReportsService:
    """
    Servicio de Reportes Financieros.
    
    Genera reportes contables completos siguiendo estándares
    contables españoles e internacionales.
    """
    
    def __init__(self):
        """Inicializar servicio de reportes."""
        self.invoice_service = get_invoice_service()
        self.receipt_service = get_receipt_service()
    
    async def generate_balance_sheet(
        self,
        as_of_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Generar Balance General (Balance Sheet).
        
        Muestra la posición financiera en una fecha específica.
        
        Args:
            as_of_date: Fecha del balance (default: hoy)
        
        Returns:
            Balance general con activos, pasivos y patrimonio
        """
        if not as_of_date:
            as_of_date = date.today()
        
        # ACTIVOS
        # Cuentas por cobrar (Accounts Receivable)
        accounts_receivable = await self._calculate_accounts_receivable(as_of_date)
        
        # Efectivo y equivalentes (estimado de recibos)
        cash_and_equivalents = await self._calculate_cash_balance(as_of_date)
        
        total_current_assets = accounts_receivable + cash_and_equivalents
        total_assets = total_current_assets  # Simplified
        
        # PASIVOS (simplificado - para un sistema completo necesitaríamos más módulos)
        # Cuentas por pagar
        accounts_payable = Decimal("0")  # TODO: Implementar módulo de gastos
        
        # Impuestos por pagar (IVA cobrado)
        taxes_payable = await self._calculate_taxes_payable(as_of_date)
        
        total_current_liabilities = accounts_payable + taxes_payable
        total_liabilities = total_current_liabilities
        
        # PATRIMONIO
        # Capital = Activos - Pasivos
        equity = total_assets - total_liabilities
        
        return {
            "report": "Balance General / Balance Sheet",
            "as_of_date": as_of_date.isoformat(),
            "currency": "EUR",
            "assets": {
                "current_assets": {
                    "cash_and_equivalents": float(cash_and_equivalents),
                    "accounts_receivable": float(accounts_receivable),
                    "total": float(total_current_assets)
                },
                "total_assets": float(total_assets)
            },
            "liabilities": {
                "current_liabilities": {
                    "accounts_payable": float(accounts_payable),
                    "taxes_payable": float(taxes_payable),
                    "total": float(total_current_liabilities)
                },
                "total_liabilities": float(total_liabilities)
            },
            "equity": {
                "total_equity": float(equity)
            },
            "total_liabilities_and_equity": float(total_liabilities + equity),
            "check": {
                "balanced": abs(total_assets - (total_liabilities + equity)) < Decimal("0.01"),
                "message": "Balance sheet is balanced" if abs(total_assets - (total_liabilities + equity)) < Decimal("0.01") else "Warning: Balance sheet not balanced"
            }
        }
    
    async def generate_profit_and_loss(
        self,
        from_date: date,
        to_date: date
    ) -> Dict[str, Any]:
        """
        Generar Estado de Resultados (Profit & Loss / P&L).
        
        Muestra ingresos, gastos y resultado neto del período.
        
        Args:
            from_date: Fecha inicio
            to_date: Fecha fin
        
        Returns:
            Estado de resultados detallado
        """
        # INGRESOS
        invoices = await self.invoice_service.list_invoices(
            from_date=from_date,
            to_date=to_date,
            limit=10000
        )
        
        # Ingresos por servicios (solo facturas emitidas, no necesariamente pagadas)
        gross_revenue = sum(inv.total_amount for inv in invoices)
        
        # IVA es impuesto, no ingreso
        total_tax = sum(inv.total_tax for inv in invoices)
        net_revenue = sum(inv.taxable_amount for inv in invoices)
        
        # Descuentos
        total_discounts = sum(inv.total_discount for inv in invoices)
        
        # COSTOS Y GASTOS (simplificado - necesitaríamos módulo de gastos)
        # Cost of Goods Sold (COGS) - para turismo sería el costo de proveedores
        cogs = Decimal("0")  # TODO: Integrar con sistema de proveedores
        
        # Margen bruto
        gross_profit = net_revenue - cogs
        
        # Gastos operativos
        operating_expenses = Decimal("0")  # TODO: Implementar módulo de gastos
        
        # Resultado operativo
        operating_income = gross_profit - operating_expenses
        
        # Otros ingresos/gastos
        other_income = Decimal("0")
        other_expenses = Decimal("0")
        
        # Resultado antes de impuestos
        income_before_taxes = operating_income + other_income - other_expenses
        
        # Impuesto sobre la renta (estimado al 25%)
        income_tax_rate = Decimal("0.25")
        income_tax = income_before_taxes * income_tax_rate if income_before_taxes > 0 else Decimal("0")
        
        # RESULTADO NETO
        net_income = income_before_taxes - income_tax
        
        # Márgenes
        gross_margin_percent = (gross_profit / net_revenue * 100) if net_revenue > 0 else 0
        net_margin_percent = (net_income / net_revenue * 100) if net_revenue > 0 else 0
        
        return {
            "report": "Estado de Resultados / Profit & Loss",
            "period": {
                "from": from_date.isoformat(),
                "to": to_date.isoformat()
            },
            "currency": "EUR",
            "revenue": {
                "gross_revenue": float(gross_revenue),
                "vat": float(total_tax),
                "discounts": float(total_discounts),
                "net_revenue": float(net_revenue)
            },
            "cost_of_sales": {
                "cogs": float(cogs),
                "gross_profit": float(gross_profit),
                "gross_margin_percent": float(gross_margin_percent)
            },
            "operating_expenses": {
                "total": float(operating_expenses),
                "operating_income": float(operating_income)
            },
            "other": {
                "other_income": float(other_income),
                "other_expenses": float(other_expenses)
            },
            "income_before_taxes": float(income_before_taxes),
            "income_tax": {
                "rate": float(income_tax_rate * 100),
                "amount": float(income_tax)
            },
            "net_income": {
                "amount": float(net_income),
                "margin_percent": float(net_margin_percent)
            },
            "invoice_count": len(invoices)
        }
    
    async def generate_cash_flow_statement(
        self,
        from_date: date,
        to_date: date
    ) -> Dict[str, Any]:
        """
        Generar Estado de Flujo de Caja (Cash Flow Statement).
        
        Muestra entradas y salidas de efectivo del período.
        
        Args:
            from_date: Fecha inicio
            to_date: Fecha fin
        
        Returns:
            Estado de flujo de caja
        """
        # ACTIVIDADES OPERATIVAS
        # Entradas: Cobros de clientes
        receipts = await self.receipt_service.list_receipts(
            from_date=from_date,
            to_date=to_date,
            limit=10000
        )
        
        cash_from_customers = sum(
            rec.amount for rec in receipts 
            if rec.status != DocumentStatus.CANCELLED
        )
        
        # Salidas: Pagos a proveedores (simplificado)
        cash_to_suppliers = Decimal("0")  # TODO: Módulo de gastos/proveedores
        
        # Salidas: Gastos operativos
        cash_for_operations = Decimal("0")  # TODO: Módulo de gastos
        
        # Flujo neto de actividades operativas
        net_cash_from_operations = cash_from_customers - cash_to_suppliers - cash_for_operations
        
        # ACTIVIDADES DE INVERSIÓN (simplificado)
        cash_for_investments = Decimal("0")
        cash_from_investments = Decimal("0")
        net_cash_from_investing = cash_from_investments - cash_for_investments
        
        # ACTIVIDADES DE FINANCIACIÓN (simplificado)
        cash_from_financing = Decimal("0")
        cash_for_financing = Decimal("0")
        net_cash_from_financing = cash_from_financing - cash_for_financing
        
        # FLUJO NETO DE EFECTIVO
        net_cash_flow = (
            net_cash_from_operations +
            net_cash_from_investing +
            net_cash_from_financing
        )
        
        # Desglose por método de pago
        cash_by_method: Dict[str, Decimal] = {}
        for rec in receipts:
            if rec.status != DocumentStatus.CANCELLED:
                method = rec.payment_method
                if method not in cash_by_method:
                    cash_by_method[method] = Decimal("0")
                cash_by_method[method] += rec.amount
        
        return {
            "report": "Estado de Flujo de Caja / Cash Flow Statement",
            "period": {
                "from": from_date.isoformat(),
                "to": to_date.isoformat()
            },
            "currency": "EUR",
            "operating_activities": {
                "cash_from_customers": float(cash_from_customers),
                "cash_to_suppliers": float(cash_to_suppliers),
                "cash_for_operations": float(cash_for_operations),
                "net_cash_from_operations": float(net_cash_from_operations)
            },
            "investing_activities": {
                "cash_from_investments": float(cash_from_investments),
                "cash_for_investments": float(cash_for_investments),
                "net_cash_from_investing": float(net_cash_from_investing)
            },
            "financing_activities": {
                "cash_from_financing": float(cash_from_financing),
                "cash_for_financing": float(cash_for_financing),
                "net_cash_from_financing": float(net_cash_from_financing)
            },
            "net_cash_flow": float(net_cash_flow),
            "cash_by_payment_method": {
                method: float(amount)
                for method, amount in cash_by_method.items()
            },
            "receipt_count": len(receipts)
        }
    
    async def generate_vat_book(
        self,
        from_date: date,
        to_date: date
    ) -> Dict[str, Any]:
        """
        Generar Libro de IVA (VAT Book).
        
        Reporte fiscal obligatorio en España.
        
        Args:
            from_date: Fecha inicio
            to_date: Fecha fin
        
        Returns:
            Libro de IVA con desglose completo
        """
        invoices = await self.invoice_service.list_invoices(
            from_date=from_date,
            to_date=to_date,
            limit=10000
        )
        
        # Agrupar por tasa de IVA
        vat_summary: Dict[str, Dict[str, Decimal]] = {
            "21": {"base": Decimal("0"), "vat": Decimal("0"), "total": Decimal("0"), "count": 0},
            "10": {"base": Decimal("0"), "vat": Decimal("0"), "total": Decimal("0"), "count": 0},
            "4": {"base": Decimal("0"), "vat": Decimal("0"), "total": Decimal("0"), "count": 0},
            "0": {"base": Decimal("0"), "vat": Decimal("0"), "total": Decimal("0"), "count": 0}
        }
        
        invoice_details = []
        
        for inv in invoices:
            # Extraer información de IVA de cada factura
            for tax_breakdown in inv.tax_breakdown:
                if tax_breakdown.tax_type == TaxType.VAT:
                    rate_str = str(int(tax_breakdown.tax_rate))
                    
                    if rate_str in vat_summary:
                        vat_summary[rate_str]["base"] += tax_breakdown.taxable_amount
                        vat_summary[rate_str]["vat"] += tax_breakdown.tax_amount
                        vat_summary[rate_str]["total"] += (
                            tax_breakdown.taxable_amount + tax_breakdown.tax_amount
                        )
                        vat_summary[rate_str]["count"] += 1
            
            invoice_details.append({
                "invoice_number": inv.invoice_number,
                "date": inv.issue_date.isoformat(),
                "customer": inv.customer.name,
                "customer_tax_id": inv.customer.tax_id,
                "base": float(inv.taxable_amount),
                "vat": float(inv.total_tax),
                "total": float(inv.total_amount),
                "tax_breakdown": [
                    {
                        "rate": float(tb.tax_rate),
                        "base": float(tb.taxable_amount),
                        "vat": float(tb.tax_amount)
                    }
                    for tb in inv.tax_breakdown
                ]
            })
        
        # Totales
        total_base = sum(data["base"] for data in vat_summary.values())
        total_vat = sum(data["vat"] for data in vat_summary.values())
        total_amount = sum(data["total"] for data in vat_summary.values())
        
        # Formatear resumen
        vat_summary_formatted = []
        for rate, data in vat_summary.items():
            if data["count"] > 0:
                vat_summary_formatted.append({
                    "vat_rate": f"{rate}%",
                    "taxable_base": float(data["base"]),
                    "vat_amount": float(data["vat"]),
                    "total": float(data["total"]),
                    "invoice_count": data["count"]
                })
        
        return {
            "report": "Libro de IVA / VAT Book",
            "period": {
                "from": from_date.isoformat(),
                "to": to_date.isoformat()
            },
            "currency": "EUR",
            "summary": {
                "total_taxable_base": float(total_base),
                "total_vat": float(total_vat),
                "total_amount": float(total_amount),
                "invoice_count": len(invoices)
            },
            "by_vat_rate": vat_summary_formatted,
            "invoices": invoice_details
        }
    
    async def generate_modelo_303(
        self,
        quarter: int,
        year: int
    ) -> Dict[str, Any]:
        """
        Generar datos para Modelo 303 (IVA trimestral España).
        
        Args:
            quarter: Trimestre (1-4)
            year: Año
        
        Returns:
            Datos para el Modelo 303
        """
        # Determinar fechas del trimestre
        quarter_dates = {
            1: (date(year, 1, 1), date(year, 3, 31)),
            2: (date(year, 4, 1), date(year, 6, 30)),
            3: (date(year, 7, 1), date(year, 9, 30)),
            4: (date(year, 10, 1), date(year, 12, 31))
        }
        
        from_date, to_date = quarter_dates[quarter]
        
        # Generar libro de IVA
        vat_book = await self.generate_vat_book(from_date, to_date)
        
        # IVA REPERCUTIDO (cobrado a clientes)
        iva_repercutido = Decimal(str(vat_book["summary"]["total_vat"]))
        
        # IVA SOPORTADO (pagado a proveedores) - simplificado
        iva_soportado = Decimal("0")  # TODO: Módulo de gastos/compras
        
        # RESULTADO
        iva_a_ingresar = iva_repercutido - iva_soportado
        
        return {
            "report": "Modelo 303 - IVA Trimestral",
            "period": {
                "quarter": quarter,
                "year": year,
                "from": from_date.isoformat(),
                "to": to_date.isoformat()
            },
            "currency": "EUR",
            "iva_repercutido": {
                "description": "IVA cobrado a clientes",
                "amount": float(iva_repercutido)
            },
            "iva_soportado": {
                "description": "IVA pagado a proveedores",
                "amount": float(iva_soportado)
            },
            "resultado": {
                "description": "IVA a ingresar (o compensar si negativo)",
                "amount": float(iva_a_ingresar),
                "status": "A INGRESAR" if iva_a_ingresar > 0 else "A COMPENSAR"
            },
            "vat_breakdown": vat_book["by_vat_rate"]
        }
    
    # Helper methods
    
    async def _calculate_accounts_receivable(self, as_of_date: date) -> Decimal:
        """Calcular cuentas por cobrar a una fecha."""
        invoices = await self.invoice_service.list_invoices(
            to_date=as_of_date,
            limit=10000
        )
        
        total_ar = Decimal("0")
        
        for inv in invoices:
            if inv.payment_status in [PaymentStatus.UNPAID, PaymentStatus.PARTIAL]:
                # Calcular cuánto falta por cobrar
                total_received = await self.receipt_service.get_total_received_for_invoice(
                    inv.invoice_number
                )
                outstanding = inv.total_amount - total_received
                total_ar += outstanding
        
        return total_ar
    
    async def _calculate_cash_balance(self, as_of_date: date) -> Decimal:
        """Calcular balance de efectivo a una fecha."""
        receipts = await self.receipt_service.list_receipts(
            to_date=as_of_date,
            limit=10000
        )
        
        total_cash = sum(
            rec.amount for rec in receipts
            if rec.status != DocumentStatus.CANCELLED
        )
        
        return total_cash
    
    async def _calculate_taxes_payable(self, as_of_date: date) -> Decimal:
        """Calcular impuestos por pagar a una fecha."""
        invoices = await self.invoice_service.list_invoices(
            to_date=as_of_date,
            limit=10000
        )
        
        # IVA cobrado (pendiente de declarar)
        total_tax = sum(inv.total_tax for inv in invoices)
        
        return total_tax


# Singleton global
_financial_reports_service: Optional[FinancialReportsService] = None


def get_financial_reports_service() -> FinancialReportsService:
    """
    Obtener instancia global del servicio de reportes financieros.
    
    Returns:
        FinancialReportsService
    """
    global _financial_reports_service
    if _financial_reports_service is None:
        _financial_reports_service = FinancialReportsService()
    return _financial_reports_service
