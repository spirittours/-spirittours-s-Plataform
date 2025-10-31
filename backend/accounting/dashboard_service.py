"""
Servicio de Dashboard de Contabilidad - Spirit Tours

Dashboard completo con:
- KPIs financieros en tiempo real
- Visualizaciones de facturación
- Gráficos de cash flow
- Análisis de vencimientos
- Proyecciones financieras
- Alertas automáticas
"""
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional
from decimal import Decimal
from enum import Enum

from .models import Invoice, Receipt, DocumentStatus, PaymentStatus
from .invoice_service import get_invoice_service
from .receipt_service import get_receipt_service


class TimePeriod(str, Enum):
    """Períodos de tiempo para análisis."""
    TODAY = "today"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"
    CUSTOM = "custom"


class ChartType(str, Enum):
    """Tipos de gráficos."""
    LINE = "line"
    BAR = "bar"
    PIE = "pie"
    AREA = "area"
    DONUT = "donut"


class AccountingDashboardService:
    """
    Servicio de Dashboard de Contabilidad.
    
    Proporciona datos agregados, KPIs, y visualizaciones para el dashboard
    de contabilidad de Spirit Tours.
    """
    
    def __init__(self):
        """Inicializar servicio de dashboard."""
        pass
    
    async def get_kpis(self, period: TimePeriod = TimePeriod.MONTH) -> Dict[str, Any]:
        """
        Obtener KPIs financieros principales.
        
        Args:
            period: Período de tiempo a analizar
        
        Returns:
            Diccionario con KPIs:
            - total_invoiced: Total facturado
            - total_received: Total recibido
            - outstanding_balance: Saldo pendiente
            - overdue_amount: Monto vencido
            - payment_rate: Tasa de pago (%)
            - average_collection_days: Días promedio de cobro
            - invoice_count: Número de facturas
            - receipt_count: Número de recibos
        """
        invoice_service = get_invoice_service()
        receipt_service = get_receipt_service()
        
        # Determinar rango de fechas
        from_date, to_date = self._get_date_range(period)
        
        # Obtener facturas del período
        invoices = await invoice_service.list_invoices(
            from_date=from_date,
            to_date=to_date,
            limit=10000
        )
        
        # Obtener recibos del período
        receipts = await receipt_service.list_receipts(
            from_date=from_date,
            to_date=to_date,
            limit=10000
        )
        
        # Calcular KPIs
        total_invoiced = sum(inv.total_amount for inv in invoices)
        total_received = sum(rec.amount for rec in receipts if rec.status != DocumentStatus.CANCELLED)
        
        paid_invoices = [inv for inv in invoices if inv.payment_status == PaymentStatus.PAID]
        unpaid_invoices = [inv for inv in invoices if inv.payment_status in [PaymentStatus.UNPAID, PaymentStatus.PARTIAL]]
        overdue_invoices = [inv for inv in invoices if inv.status == DocumentStatus.OVERDUE]
        
        outstanding_balance = sum(inv.total_amount for inv in unpaid_invoices)
        overdue_amount = sum(inv.total_amount for inv in overdue_invoices)
        
        payment_rate = (len(paid_invoices) / len(invoices) * 100) if invoices else 0
        
        # Calcular días promedio de cobro
        collection_days = []
        for inv in paid_invoices:
            if inv.payment_date and inv.issue_date:
                days = (inv.payment_date.date() - inv.issue_date).days
                collection_days.append(days)
        
        average_collection_days = sum(collection_days) / len(collection_days) if collection_days else 0
        
        # Comparación con período anterior
        prev_from, prev_to = self._get_previous_period_range(period)
        prev_invoices = await invoice_service.list_invoices(
            from_date=prev_from,
            to_date=prev_to,
            limit=10000
        )
        prev_total = sum(inv.total_amount for inv in prev_invoices)
        
        growth_rate = ((total_invoiced - prev_total) / prev_total * 100) if prev_total > 0 else 0
        
        return {
            "period": {
                "from": from_date.isoformat(),
                "to": to_date.isoformat(),
                "label": period.value
            },
            "kpis": {
                "total_invoiced": {
                    "value": float(total_invoiced),
                    "currency": "EUR",
                    "growth": float(growth_rate),
                    "label": "Total Facturado"
                },
                "total_received": {
                    "value": float(total_received),
                    "currency": "EUR",
                    "label": "Total Recibido"
                },
                "outstanding_balance": {
                    "value": float(outstanding_balance),
                    "currency": "EUR",
                    "label": "Saldo Pendiente"
                },
                "overdue_amount": {
                    "value": float(overdue_amount),
                    "currency": "EUR",
                    "count": len(overdue_invoices),
                    "label": "Monto Vencido"
                },
                "payment_rate": {
                    "value": float(payment_rate),
                    "unit": "%",
                    "label": "Tasa de Pago"
                },
                "average_collection_days": {
                    "value": float(average_collection_days),
                    "unit": "días",
                    "label": "Días Promedio de Cobro"
                },
                "invoice_count": {
                    "value": len(invoices),
                    "paid": len(paid_invoices),
                    "unpaid": len(unpaid_invoices),
                    "overdue": len(overdue_invoices),
                    "label": "Facturas"
                },
                "receipt_count": {
                    "value": len(receipts),
                    "label": "Recibos"
                }
            }
        }
    
    async def get_revenue_chart(
        self,
        period: TimePeriod = TimePeriod.YEAR,
        chart_type: ChartType = ChartType.LINE
    ) -> Dict[str, Any]:
        """
        Generar datos para gráfico de ingresos.
        
        Args:
            period: Período de tiempo
            chart_type: Tipo de gráfico
        
        Returns:
            Datos para visualización de ingresos mensuales
        """
        invoice_service = get_invoice_service()
        
        # Obtener rango de fechas
        from_date, to_date = self._get_date_range(period)
        
        # Obtener todas las facturas
        invoices = await invoice_service.list_invoices(
            from_date=from_date,
            to_date=to_date,
            limit=10000
        )
        
        # Agrupar por mes
        monthly_data: Dict[str, Dict[str, Decimal]] = {}
        
        for invoice in invoices:
            month_key = invoice.issue_date.strftime("%Y-%m")
            
            if month_key not in monthly_data:
                monthly_data[month_key] = {
                    "invoiced": Decimal("0"),
                    "paid": Decimal("0"),
                    "pending": Decimal("0")
                }
            
            monthly_data[month_key]["invoiced"] += invoice.total_amount
            
            if invoice.payment_status == PaymentStatus.PAID:
                monthly_data[month_key]["paid"] += invoice.total_amount
            else:
                monthly_data[month_key]["pending"] += invoice.total_amount
        
        # Ordenar por fecha
        sorted_months = sorted(monthly_data.keys())
        
        # Formatear para gráfico
        labels = [datetime.strptime(m, "%Y-%m").strftime("%b %Y") for m in sorted_months]
        
        datasets = [
            {
                "label": "Total Facturado",
                "data": [float(monthly_data[m]["invoiced"]) for m in sorted_months],
                "backgroundColor": "rgba(75, 192, 192, 0.5)",
                "borderColor": "rgb(75, 192, 192)",
                "borderWidth": 2
            },
            {
                "label": "Pagado",
                "data": [float(monthly_data[m]["paid"]) for m in sorted_months],
                "backgroundColor": "rgba(54, 162, 235, 0.5)",
                "borderColor": "rgb(54, 162, 235)",
                "borderWidth": 2
            },
            {
                "label": "Pendiente",
                "data": [float(monthly_data[m]["pending"]) for m in sorted_months],
                "backgroundColor": "rgba(255, 206, 86, 0.5)",
                "borderColor": "rgb(255, 206, 86)",
                "borderWidth": 2
            }
        ]
        
        return {
            "type": chart_type.value,
            "title": "Ingresos Mensuales",
            "data": {
                "labels": labels,
                "datasets": datasets
            },
            "options": {
                "responsive": True,
                "plugins": {
                    "legend": {"position": "top"},
                    "title": {"display": True, "text": "Evolución de Ingresos"}
                },
                "scales": {
                    "y": {"beginAtZero": True, "ticks": {"callback": "€{value}"}}
                }
            }
        }
    
    async def get_payment_methods_chart(
        self,
        period: TimePeriod = TimePeriod.MONTH
    ) -> Dict[str, Any]:
        """
        Generar datos para gráfico de métodos de pago.
        
        Args:
            period: Período de tiempo
        
        Returns:
            Datos para gráfico de distribución de métodos de pago
        """
        receipt_service = get_receipt_service()
        
        # Obtener rango de fechas
        from_date, to_date = self._get_date_range(period)
        
        # Obtener recibos
        receipts = await receipt_service.list_receipts(
            from_date=from_date,
            to_date=to_date,
            limit=10000
        )
        
        # Agrupar por método de pago
        payment_methods: Dict[str, Decimal] = {}
        
        for receipt in receipts:
            if receipt.status != DocumentStatus.CANCELLED:
                method = receipt.payment_method
                if method not in payment_methods:
                    payment_methods[method] = Decimal("0")
                payment_methods[method] += receipt.amount
        
        # Formatear para gráfico pie/donut
        labels = list(payment_methods.keys())
        data = [float(payment_methods[m]) for m in labels]
        
        # Colores
        colors = [
            "rgba(255, 99, 132, 0.7)",
            "rgba(54, 162, 235, 0.7)",
            "rgba(255, 206, 86, 0.7)",
            "rgba(75, 192, 192, 0.7)",
            "rgba(153, 102, 255, 0.7)",
            "rgba(255, 159, 64, 0.7)"
        ]
        
        return {
            "type": ChartType.DONUT.value,
            "title": "Métodos de Pago",
            "data": {
                "labels": labels,
                "datasets": [{
                    "label": "Monto",
                    "data": data,
                    "backgroundColor": colors[:len(labels)],
                    "borderWidth": 2
                }]
            },
            "options": {
                "responsive": True,
                "plugins": {
                    "legend": {"position": "right"},
                    "title": {"display": True, "text": "Distribución de Métodos de Pago"}
                }
            }
        }
    
    async def get_cash_flow_projection(
        self,
        months_ahead: int = 3
    ) -> Dict[str, Any]:
        """
        Generar proyección de cash flow.
        
        Args:
            months_ahead: Meses a proyectar hacia adelante
        
        Returns:
            Proyección de flujo de caja
        """
        invoice_service = get_invoice_service()
        
        today = date.today()
        projection_data = []
        
        for i in range(months_ahead + 1):
            month_date = today + timedelta(days=30 * i)
            month_key = month_date.strftime("%Y-%m")
            month_label = month_date.strftime("%b %Y")
            
            # Facturas que vencen en este mes
            invoices = await invoice_service.list_invoices(limit=10000)
            
            expected_inflow = Decimal("0")
            for inv in invoices:
                if inv.due_date and inv.payment_status != PaymentStatus.PAID:
                    if inv.due_date.strftime("%Y-%m") == month_key:
                        expected_inflow += inv.total_amount
            
            projection_data.append({
                "month": month_label,
                "expected_inflow": float(expected_inflow),
                "month_key": month_key
            })
        
        return {
            "title": "Proyección de Cash Flow",
            "projection_months": months_ahead,
            "data": projection_data,
            "chart": {
                "type": ChartType.AREA.value,
                "labels": [d["month"] for d in projection_data],
                "datasets": [{
                    "label": "Entrada Esperada",
                    "data": [d["expected_inflow"] for d in projection_data],
                    "backgroundColor": "rgba(75, 192, 192, 0.2)",
                    "borderColor": "rgb(75, 192, 192)",
                    "fill": True
                }]
            }
        }
    
    async def get_aging_report(self) -> Dict[str, Any]:
        """
        Generar reporte de antigüedad de cuentas por cobrar.
        
        Returns:
            Análisis de antigüedad de facturas pendientes
        """
        invoice_service = get_invoice_service()
        
        # Obtener facturas no pagadas
        unpaid_invoices = []
        all_invoices = await invoice_service.list_invoices(limit=10000)
        
        for inv in all_invoices:
            if inv.payment_status in [PaymentStatus.UNPAID, PaymentStatus.PARTIAL]:
                unpaid_invoices.append(inv)
        
        today = date.today()
        
        # Categorías de antigüedad
        aging_buckets = {
            "current": {"label": "Corriente (0-30 días)", "amount": Decimal("0"), "count": 0},
            "30_60": {"label": "31-60 días", "amount": Decimal("0"), "count": 0},
            "60_90": {"label": "61-90 días", "amount": Decimal("0"), "count": 0},
            "over_90": {"label": "Más de 90 días", "amount": Decimal("0"), "count": 0}
        }
        
        for inv in unpaid_invoices:
            if inv.due_date:
                days_overdue = (today - inv.due_date).days
                
                if days_overdue <= 0:
                    aging_buckets["current"]["amount"] += inv.total_amount
                    aging_buckets["current"]["count"] += 1
                elif days_overdue <= 30:
                    aging_buckets["current"]["amount"] += inv.total_amount
                    aging_buckets["current"]["count"] += 1
                elif days_overdue <= 60:
                    aging_buckets["30_60"]["amount"] += inv.total_amount
                    aging_buckets["30_60"]["count"] += 1
                elif days_overdue <= 90:
                    aging_buckets["60_90"]["amount"] += inv.total_amount
                    aging_buckets["60_90"]["count"] += 1
                else:
                    aging_buckets["over_90"]["amount"] += inv.total_amount
                    aging_buckets["over_90"]["count"] += 1
        
        # Formatear para respuesta
        buckets_list = []
        for key, data in aging_buckets.items():
            buckets_list.append({
                "category": key,
                "label": data["label"],
                "amount": float(data["amount"]),
                "count": data["count"]
            })
        
        total_outstanding = sum(b["amount"] for b in buckets_list)
        
        return {
            "title": "Reporte de Antigüedad de Cuentas por Cobrar",
            "total_outstanding": total_outstanding,
            "buckets": buckets_list,
            "chart": {
                "type": ChartType.BAR.value,
                "labels": [b["label"] for b in buckets_list],
                "datasets": [{
                    "label": "Monto Pendiente",
                    "data": [b["amount"] for b in buckets_list],
                    "backgroundColor": [
                        "rgba(75, 192, 192, 0.7)",
                        "rgba(255, 206, 86, 0.7)",
                        "rgba(255, 159, 64, 0.7)",
                        "rgba(255, 99, 132, 0.7)"
                    ]
                }]
            }
        }
    
    async def get_alerts(self) -> List[Dict[str, Any]]:
        """
        Generar alertas financieras automáticas.
        
        Returns:
            Lista de alertas para el dashboard
        """
        invoice_service = get_invoice_service()
        alerts = []
        
        # Obtener facturas
        invoices = await invoice_service.list_invoices(limit=10000)
        
        # Alerta: Facturas vencidas
        overdue = [inv for inv in invoices if inv.status == DocumentStatus.OVERDUE]
        if overdue:
            overdue_amount = sum(inv.total_amount for inv in overdue)
            alerts.append({
                "type": "warning",
                "severity": "high",
                "title": "Facturas Vencidas",
                "message": f"{len(overdue)} facturas vencidas por un total de {overdue_amount:.2f} EUR",
                "action": "/accounting/invoices?status=overdue",
                "icon": "alert-triangle"
            })
        
        # Alerta: Facturas próximas a vencer (7 días)
        today = date.today()
        upcoming_due = []
        for inv in invoices:
            if inv.due_date and inv.payment_status != PaymentStatus.PAID:
                days_to_due = (inv.due_date - today).days
                if 0 < days_to_due <= 7:
                    upcoming_due.append(inv)
        
        if upcoming_due:
            alerts.append({
                "type": "info",
                "severity": "medium",
                "title": "Facturas Próximas a Vencer",
                "message": f"{len(upcoming_due)} facturas vencen en los próximos 7 días",
                "action": "/accounting/invoices?upcoming=true",
                "icon": "clock"
            })
        
        # Alerta: Baja tasa de pago
        paid = [inv for inv in invoices if inv.payment_status == PaymentStatus.PAID]
        payment_rate = (len(paid) / len(invoices) * 100) if invoices else 0
        
        if payment_rate < 70:
            alerts.append({
                "type": "warning",
                "severity": "medium",
                "title": "Tasa de Pago Baja",
                "message": f"Tasa de pago actual: {payment_rate:.1f}% (objetivo: >80%)",
                "action": "/accounting/dashboard",
                "icon": "trending-down"
            })
        
        return alerts
    
    # Helper methods
    
    def _get_date_range(self, period: TimePeriod) -> tuple[date, date]:
        """Obtener rango de fechas para un período."""
        today = date.today()
        
        if period == TimePeriod.TODAY:
            return today, today
        elif period == TimePeriod.WEEK:
            from_date = today - timedelta(days=7)
            return from_date, today
        elif period == TimePeriod.MONTH:
            from_date = today.replace(day=1)
            return from_date, today
        elif period == TimePeriod.QUARTER:
            quarter_month = ((today.month - 1) // 3) * 3 + 1
            from_date = today.replace(month=quarter_month, day=1)
            return from_date, today
        elif period == TimePeriod.YEAR:
            from_date = today.replace(month=1, day=1)
            return from_date, today
        else:
            # Default to month
            from_date = today.replace(day=1)
            return from_date, today
    
    def _get_previous_period_range(self, period: TimePeriod) -> tuple[date, date]:
        """Obtener rango del período anterior para comparación."""
        from_date, to_date = self._get_date_range(period)
        days_diff = (to_date - from_date).days
        
        prev_to = from_date - timedelta(days=1)
        prev_from = prev_to - timedelta(days=days_diff)
        
        return prev_from, prev_to


# Singleton global
_dashboard_service: Optional[AccountingDashboardService] = None


def get_dashboard_service() -> AccountingDashboardService:
    """
    Obtener instancia global del servicio de dashboard.
    
    Returns:
        AccountingDashboardService
    """
    global _dashboard_service
    if _dashboard_service is None:
        _dashboard_service = AccountingDashboardService()
    return _dashboard_service
