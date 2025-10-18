"""
Sistema Avanzado de Facturación
Maneja facturación completa con soporte multi-moneda, impuestos, y compliance
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from enum import Enum
import uuid
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)


class InvoiceStatus(Enum):
    """Estados de factura"""
    DRAFT = "draft"
    PENDING = "pending"
    PAID = "paid"
    PARTIALLY_PAID = "partially_paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class InvoiceType(Enum):
    """Tipos de factura"""
    STANDARD = "standard"
    PROFORMA = "proforma"
    CREDIT_NOTE = "credit_note"
    DEBIT_NOTE = "debit_note"
    RECEIPT = "receipt"


class TaxType(Enum):
    """Tipos de impuestos"""
    VAT = "vat"  # IVA
    GST = "gst"  # Goods and Services Tax
    SALES_TAX = "sales_tax"
    SERVICE_TAX = "service_tax"
    TOURISM_TAX = "tourism_tax"
    EXEMPT = "exempt"


class PaymentTerm(Enum):
    """Términos de pago"""
    IMMEDIATE = "immediate"
    NET_15 = "net_15"
    NET_30 = "net_30"
    NET_60 = "net_60"
    NET_90 = "net_90"
    CUSTOM = "custom"


@dataclass
class InvoiceLineItem:
    """Línea de factura"""
    description: str
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal = Decimal('0')
    discount_percentage: Decimal = Decimal('0')
    item_code: Optional[str] = None
    
    @property
    def subtotal(self) -> Decimal:
        """Subtotal antes de impuestos y descuentos"""
        return (self.quantity * self.unit_price).quantize(Decimal('0.01'))
    
    @property
    def discount_amount(self) -> Decimal:
        """Monto del descuento"""
        if self.discount_percentage > 0:
            return (self.subtotal * self.discount_percentage / 100).quantize(Decimal('0.01'))
        return Decimal('0')
    
    @property
    def subtotal_after_discount(self) -> Decimal:
        """Subtotal después del descuento"""
        return (self.subtotal - self.discount_amount).quantize(Decimal('0.01'))
    
    @property
    def tax_amount(self) -> Decimal:
        """Monto del impuesto"""
        if self.tax_rate > 0:
            return (self.subtotal_after_discount * self.tax_rate / 100).quantize(Decimal('0.01'))
        return Decimal('0')
    
    @property
    def total(self) -> Decimal:
        """Total incluyendo impuestos"""
        return (self.subtotal_after_discount + self.tax_amount).quantize(Decimal('0.01'))


@dataclass
class TaxBreakdown:
    """Desglose de impuestos"""
    tax_name: str
    tax_type: TaxType
    tax_rate: Decimal
    taxable_amount: Decimal
    tax_amount: Decimal


@dataclass
class Invoice:
    """Factura completa"""
    invoice_number: str
    invoice_type: InvoiceType
    customer_id: str
    customer_name: str
    customer_email: str
    customer_address: Dict[str, str]
    customer_tax_id: Optional[str] = None
    
    issue_date: datetime = field(default_factory=datetime.utcnow)
    due_date: Optional[datetime] = None
    
    line_items: List[InvoiceLineItem] = field(default_factory=list)
    
    currency: str = "USD"
    exchange_rate: Decimal = Decimal('1.0')
    
    payment_term: PaymentTerm = PaymentTerm.NET_30
    
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    
    status: InvoiceStatus = InvoiceStatus.DRAFT
    
    # Company info
    company_name: str = "Spirit Tours"
    company_tax_id: str = "SPIRIT-TAX-001"
    company_address: Dict[str, str] = field(default_factory=dict)
    
    # Internal
    created_by: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    
    # Payments
    payments: List[Dict[str, Any]] = field(default_factory=list)
    
    @property
    def subtotal(self) -> Decimal:
        """Subtotal de todos los items"""
        return sum(item.subtotal_after_discount for item in self.line_items)
    
    @property
    def total_tax(self) -> Decimal:
        """Total de impuestos"""
        return sum(item.tax_amount for item in self.line_items)
    
    @property
    def total(self) -> Decimal:
        """Total de la factura"""
        return (self.subtotal + self.total_tax).quantize(Decimal('0.01'))
    
    @property
    def amount_paid(self) -> Decimal:
        """Total pagado"""
        return sum(Decimal(str(p['amount'])) for p in self.payments)
    
    @property
    def balance_due(self) -> Decimal:
        """Balance pendiente"""
        return (self.total - self.amount_paid).quantize(Decimal('0.01'))
    
    @property
    def is_paid(self) -> bool:
        """Verifica si está completamente pagada"""
        return self.balance_due <= 0
    
    @property
    def is_overdue(self) -> bool:
        """Verifica si está vencida"""
        if self.due_date and self.status not in [InvoiceStatus.PAID, InvoiceStatus.CANCELLED]:
            return datetime.utcnow() > self.due_date
        return False
    
    def get_tax_breakdown(self) -> List[TaxBreakdown]:
        """Obtiene el desglose de impuestos por tipo"""
        tax_groups = {}
        
        for item in self.line_items:
            if item.tax_rate > 0:
                key = f"{item.tax_rate}"
                if key not in tax_groups:
                    tax_groups[key] = {
                        'rate': item.tax_rate,
                        'taxable_amount': Decimal('0'),
                        'tax_amount': Decimal('0')
                    }
                
                tax_groups[key]['taxable_amount'] += item.subtotal_after_discount
                tax_groups[key]['tax_amount'] += item.tax_amount
        
        breakdown = []
        for key, data in tax_groups.items():
            breakdown.append(TaxBreakdown(
                tax_name=f"Tax {data['rate']}%",
                tax_type=TaxType.VAT,
                tax_rate=data['rate'],
                taxable_amount=data['taxable_amount'],
                tax_amount=data['tax_amount']
            ))
        
        return breakdown


class AdvancedBillingService:
    """
    Servicio avanzado de facturación con soporte completo
    """
    
    def __init__(self):
        self.invoices: Dict[str, Invoice] = {}
        self.invoice_counter = 1000
        
        # Configuración de tasas de impuestos por país
        self.tax_rates = {
            'US': Decimal('0'),  # Sales tax varies by state
            'ES': Decimal('21'),  # IVA España
            'MX': Decimal('16'),  # IVA México
            'AR': Decimal('21'),  # IVA Argentina
            'CO': Decimal('19'),  # IVA Colombia
            'UK': Decimal('20'),  # VAT UK
            'DE': Decimal('19'),  # VAT Germany
            'FR': Decimal('20'),  # VAT France
        }
        
        # Configuración de monedas
        self.exchange_rates = {
            'USD': Decimal('1.0'),
            'EUR': Decimal('0.92'),
            'GBP': Decimal('0.79'),
            'MXN': Decimal('17.5'),
            'COP': Decimal('4000'),
            'ARS': Decimal('350'),
        }
        
        logger.info("Advanced Billing Service initialized")
    
    def generate_invoice_number(self, prefix: str = "INV") -> str:
        """Genera un número de factura único"""
        self.invoice_counter += 1
        timestamp = datetime.utcnow().strftime("%Y%m")
        return f"{prefix}-{timestamp}-{self.invoice_counter:06d}"
    
    def create_invoice(
        self,
        customer_id: str,
        customer_name: str,
        customer_email: str,
        customer_address: Dict[str, str],
        line_items: List[Dict[str, Any]],
        invoice_type: InvoiceType = InvoiceType.STANDARD,
        currency: str = "USD",
        payment_term: PaymentTerm = PaymentTerm.NET_30,
        customer_tax_id: Optional[str] = None,
        notes: Optional[str] = None,
        apply_tax: bool = True
    ) -> Invoice:
        """
        Crea una nueva factura
        
        Args:
            customer_id: ID del cliente
            customer_name: Nombre del cliente
            customer_email: Email del cliente
            customer_address: Dirección del cliente
            line_items: Lista de items a facturar
            invoice_type: Tipo de factura
            currency: Moneda de la factura
            payment_term: Términos de pago
            customer_tax_id: ID fiscal del cliente
            notes: Notas adicionales
            apply_tax: Si aplica impuestos automáticamente
            
        Returns:
            Invoice creada
        """
        try:
            # Generar número de factura
            invoice_number = self.generate_invoice_number()
            
            # Determinar país del cliente para impuestos
            country_code = customer_address.get('country_code', 'US')
            tax_rate = self.tax_rates.get(country_code, Decimal('0')) if apply_tax else Decimal('0')
            
            # Crear items de línea
            invoice_items = []
            for item_data in line_items:
                item = InvoiceLineItem(
                    description=item_data['description'],
                    quantity=Decimal(str(item_data['quantity'])),
                    unit_price=Decimal(str(item_data['unit_price'])),
                    tax_rate=item_data.get('tax_rate', tax_rate),
                    discount_percentage=Decimal(str(item_data.get('discount', 0))),
                    item_code=item_data.get('item_code')
                )
                invoice_items.append(item)
            
            # Calcular fecha de vencimiento
            due_date = None
            if payment_term != PaymentTerm.IMMEDIATE:
                days_map = {
                    PaymentTerm.NET_15: 15,
                    PaymentTerm.NET_30: 30,
                    PaymentTerm.NET_60: 60,
                    PaymentTerm.NET_90: 90,
                }
                days = days_map.get(payment_term, 30)
                due_date = datetime.utcnow() + timedelta(days=days)
            
            # Crear factura
            invoice = Invoice(
                invoice_number=invoice_number,
                invoice_type=invoice_type,
                customer_id=customer_id,
                customer_name=customer_name,
                customer_email=customer_email,
                customer_address=customer_address,
                customer_tax_id=customer_tax_id,
                line_items=invoice_items,
                currency=currency,
                exchange_rate=self.exchange_rates.get(currency, Decimal('1.0')),
                payment_term=payment_term,
                due_date=due_date,
                notes=notes,
                status=InvoiceStatus.DRAFT
            )
            
            # Guardar factura
            self.invoices[invoice_number] = invoice
            
            logger.info(f"Invoice created: {invoice_number} for customer {customer_id}")
            return invoice
            
        except Exception as e:
            logger.error(f"Error creating invoice: {e}")
            raise
    
    def add_payment(
        self,
        invoice_number: str,
        amount: Decimal,
        payment_method: str,
        payment_reference: str,
        payment_date: Optional[datetime] = None
    ) -> bool:
        """
        Registra un pago para una factura
        
        Args:
            invoice_number: Número de factura
            amount: Monto del pago
            payment_method: Método de pago
            payment_reference: Referencia del pago
            payment_date: Fecha del pago
            
        Returns:
            True si el pago se registró correctamente
        """
        try:
            invoice = self.invoices.get(invoice_number)
            if not invoice:
                raise ValueError(f"Invoice {invoice_number} not found")
            
            if payment_date is None:
                payment_date = datetime.utcnow()
            
            payment = {
                'payment_id': str(uuid.uuid4()),
                'amount': str(amount),
                'payment_method': payment_method,
                'payment_reference': payment_reference,
                'payment_date': payment_date.isoformat(),
                'created_at': datetime.utcnow().isoformat()
            }
            
            invoice.payments.append(payment)
            invoice.updated_at = datetime.utcnow()
            
            # Actualizar estado de la factura
            if invoice.is_paid:
                invoice.status = InvoiceStatus.PAID
            elif invoice.amount_paid > 0:
                invoice.status = InvoiceStatus.PARTIALLY_PAID
            else:
                invoice.status = InvoiceStatus.PENDING
            
            logger.info(f"Payment registered for invoice {invoice_number}: {amount} {invoice.currency}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding payment: {e}")
            return False
    
    def get_invoice(self, invoice_number: str) -> Optional[Invoice]:
        """Obtiene una factura por su número"""
        return self.invoices.get(invoice_number)
    
    def list_invoices(
        self,
        customer_id: Optional[str] = None,
        status: Optional[InvoiceStatus] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None
    ) -> List[Invoice]:
        """
        Lista facturas con filtros opcionales
        
        Args:
            customer_id: Filtrar por cliente
            status: Filtrar por estado
            from_date: Fecha desde
            to_date: Fecha hasta
            
        Returns:
            Lista de facturas que cumplen los criterios
        """
        filtered = list(self.invoices.values())
        
        if customer_id:
            filtered = [inv for inv in filtered if inv.customer_id == customer_id]
        
        if status:
            filtered = [inv for inv in filtered if inv.status == status]
        
        if from_date:
            filtered = [inv for inv in filtered if inv.issue_date >= from_date]
        
        if to_date:
            filtered = [inv for inv in filtered if inv.issue_date <= to_date]
        
        return sorted(filtered, key=lambda x: x.issue_date, reverse=True)
    
    def cancel_invoice(self, invoice_number: str, reason: str) -> bool:
        """Cancela una factura"""
        try:
            invoice = self.invoices.get(invoice_number)
            if not invoice:
                raise ValueError(f"Invoice {invoice_number} not found")
            
            if invoice.status == InvoiceStatus.PAID:
                raise ValueError("Cannot cancel a paid invoice. Issue a credit note instead.")
            
            invoice.status = InvoiceStatus.CANCELLED
            invoice.notes = f"{invoice.notes or ''}\nCANCELLED: {reason}"
            invoice.updated_at = datetime.utcnow()
            
            logger.info(f"Invoice cancelled: {invoice_number}")
            return True
            
        except Exception as e:
            logger.error(f"Error cancelling invoice: {e}")
            return False
    
    def create_credit_note(
        self,
        original_invoice_number: str,
        line_items: List[Dict[str, Any]],
        reason: str
    ) -> Optional[Invoice]:
        """
        Crea una nota de crédito para una factura
        
        Args:
            original_invoice_number: Número de factura original
            line_items: Items a acreditar
            reason: Razón de la nota de crédito
            
        Returns:
            Nota de crédito creada
        """
        try:
            original = self.invoices.get(original_invoice_number)
            if not original:
                raise ValueError(f"Original invoice {original_invoice_number} not found")
            
            # Crear nota de crédito
            credit_note = self.create_invoice(
                customer_id=original.customer_id,
                customer_name=original.customer_name,
                customer_email=original.customer_email,
                customer_address=original.customer_address,
                line_items=line_items,
                invoice_type=InvoiceType.CREDIT_NOTE,
                currency=original.currency,
                customer_tax_id=original.customer_tax_id,
                notes=f"Credit note for invoice {original_invoice_number}\nReason: {reason}"
            )
            
            credit_note.status = InvoiceStatus.PAID
            
            logger.info(f"Credit note created: {credit_note.invoice_number}")
            return credit_note
            
        except Exception as e:
            logger.error(f"Error creating credit note: {e}")
            return None
    
    def get_aging_report(self, as_of_date: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Genera reporte de antigüedad de saldos
        
        Args:
            as_of_date: Fecha de corte
            
        Returns:
            Reporte de aging
        """
        if as_of_date is None:
            as_of_date = datetime.utcnow()
        
        aging_buckets = {
            'current': Decimal('0'),      # 0-30 días
            '30_60': Decimal('0'),        # 31-60 días
            '60_90': Decimal('0'),        # 61-90 días
            'over_90': Decimal('0'),      # Más de 90 días
        }
        
        invoice_details = []
        
        for invoice in self.invoices.values():
            if invoice.status in [InvoiceStatus.PAID, InvoiceStatus.CANCELLED]:
                continue
            
            balance = invoice.balance_due
            if balance <= 0:
                continue
            
            # Calcular días de antigüedad
            if invoice.due_date:
                days_old = (as_of_date - invoice.due_date).days
            else:
                days_old = (as_of_date - invoice.issue_date).days
            
            # Clasificar en bucket
            if days_old <= 30:
                aging_buckets['current'] += balance
                bucket = 'current'
            elif days_old <= 60:
                aging_buckets['30_60'] += balance
                bucket = '30-60 days'
            elif days_old <= 90:
                aging_buckets['60_90'] += balance
                bucket = '60-90 days'
            else:
                aging_buckets['over_90'] += balance
                bucket = 'over 90 days'
            
            invoice_details.append({
                'invoice_number': invoice.invoice_number,
                'customer': invoice.customer_name,
                'issue_date': invoice.issue_date.isoformat(),
                'due_date': invoice.due_date.isoformat() if invoice.due_date else None,
                'days_old': days_old,
                'balance': str(balance),
                'bucket': bucket
            })
        
        total = sum(aging_buckets.values())
        
        return {
            'as_of_date': as_of_date.isoformat(),
            'aging_buckets': {k: str(v) for k, v in aging_buckets.items()},
            'total_outstanding': str(total),
            'invoice_details': sorted(invoice_details, key=lambda x: x['days_old'], reverse=True)
        }
    
    def get_revenue_report(
        self,
        from_date: datetime,
        to_date: datetime,
        group_by: str = 'month'
    ) -> Dict[str, Any]:
        """
        Genera reporte de ingresos
        
        Args:
            from_date: Fecha inicial
            to_date: Fecha final
            group_by: Agrupar por 'day', 'week', 'month'
            
        Returns:
            Reporte de ingresos
        """
        invoices = self.list_invoices(from_date=from_date, to_date=to_date)
        
        revenue_data = {
            'period': {
                'from': from_date.isoformat(),
                'to': to_date.isoformat()
            },
            'total_invoiced': Decimal('0'),
            'total_paid': Decimal('0'),
            'total_pending': Decimal('0'),
            'invoice_count': len(invoices),
            'paid_invoice_count': 0,
            'by_status': {},
            'by_currency': {}
        }
        
        for invoice in invoices:
            # Totales generales
            revenue_data['total_invoiced'] += invoice.total
            revenue_data['total_paid'] += invoice.amount_paid
            revenue_data['total_pending'] += invoice.balance_due
            
            if invoice.is_paid:
                revenue_data['paid_invoice_count'] += 1
            
            # Por estado
            status = invoice.status.value
            if status not in revenue_data['by_status']:
                revenue_data['by_status'][status] = {
                    'count': 0,
                    'amount': Decimal('0')
                }
            revenue_data['by_status'][status]['count'] += 1
            revenue_data['by_status'][status]['amount'] += invoice.total
            
            # Por moneda
            currency = invoice.currency
            if currency not in revenue_data['by_currency']:
                revenue_data['by_currency'][currency] = {
                    'count': 0,
                    'amount': Decimal('0')
                }
            revenue_data['by_currency'][currency]['count'] += 1
            revenue_data['by_currency'][currency]['amount'] += invoice.total
        
        # Convertir Decimals a strings para serialización
        revenue_data['total_invoiced'] = str(revenue_data['total_invoiced'])
        revenue_data['total_paid'] = str(revenue_data['total_paid'])
        revenue_data['total_pending'] = str(revenue_data['total_pending'])
        
        for status_data in revenue_data['by_status'].values():
            status_data['amount'] = str(status_data['amount'])
        
        for currency_data in revenue_data['by_currency'].values():
            currency_data['amount'] = str(currency_data['amount'])
        
        return revenue_data


# Instancia global del servicio
billing_service = AdvancedBillingService()
