"""
Modelos de Contabilidad - Recibos, Facturas, Firma Digital

Sistema completo de contabilidad con soporte para:
- Facturas (Invoice)
- Recibos (Receipt)
- Facturas con IVA (TaxInvoice)
- Notas de crédito/débito
- Firma digital electrónica
"""
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, EmailStr, validator
from decimal import Decimal


class DocumentType(str, Enum):
    """Tipos de documentos contables."""
    INVOICE = "invoice"  # Factura
    RECEIPT = "receipt"  # Recibo
    TAX_INVOICE = "tax_invoice"  # Factura con IVA
    CREDIT_NOTE = "credit_note"  # Nota de crédito
    DEBIT_NOTE = "debit_note"  # Nota de débito
    PROFORMA = "proforma"  # Factura proforma


class DocumentStatus(str, Enum):
    """Estado de documentos."""
    DRAFT = "draft"  # Borrador
    PENDING = "pending"  # Pendiente de aprobación
    APPROVED = "approved"  # Aprobado
    SENT = "sent"  # Enviado al cliente
    PAID = "paid"  # Pagado
    PARTIALLY_PAID = "partially_paid"  # Parcialmente pagado
    OVERDUE = "overdue"  # Vencido
    CANCELLED = "cancelled"  # Cancelado
    REFUNDED = "refunded"  # Reembolsado


class PaymentStatus(str, Enum):
    """Estado de pago."""
    UNPAID = "unpaid"
    PARTIAL = "partial"
    PAID = "paid"
    REFUNDED = "refunded"


class TaxType(str, Enum):
    """Tipos de impuestos."""
    VAT = "vat"  # IVA (Value Added Tax)
    SALES_TAX = "sales_tax"  # Impuesto de ventas
    WITHHOLDING = "withholding"  # Retención
    SERVICE_TAX = "service_tax"  # Impuesto de servicios
    TOURISM_TAX = "tourism_tax"  # Impuesto turístico


class Address(BaseModel):
    """Dirección completa."""
    street: str
    city: str
    state: Optional[str] = None
    postal_code: str
    country: str = Field(..., min_length=2, max_length=2)
    
    def format(self) -> str:
        """Formato legible de dirección."""
        parts = [self.street, self.city]
        if self.state:
            parts.append(self.state)
        parts.extend([self.postal_code, self.country])
        return ", ".join(parts)


class CompanyInfo(BaseModel):
    """Información de empresa."""
    name: str = Field(..., description="Nombre legal de la empresa")
    trade_name: Optional[str] = None
    tax_id: str = Field(..., description="NIF/CIF/Tax ID")
    address: Address
    phone: str
    email: EmailStr
    website: Optional[str] = None
    logo_url: Optional[str] = None
    
    # Información fiscal
    vat_number: Optional[str] = None
    registration_number: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Spirit Tours S.L.",
                "tax_id": "B-12345678",
                "address": {
                    "street": "Calle Gran Vía 123",
                    "city": "Madrid",
                    "postal_code": "28001",
                    "country": "ES"
                },
                "phone": "+34 91 234 5678",
                "email": "info@spirittours.com"
            }
        }


class CustomerInfo(BaseModel):
    """Información de cliente."""
    name: str
    tax_id: Optional[str] = None
    address: Optional[Address] = None
    phone: Optional[str] = None
    email: EmailStr
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Cliente Ejemplo S.A.",
                "tax_id": "A-98765432",
                "email": "cliente@ejemplo.com"
            }
        }


class InvoiceLine(BaseModel):
    """Línea de factura/recibo."""
    description: str = Field(..., description="Descripción del servicio/producto")
    quantity: Decimal = Field(..., ge=0, description="Cantidad")
    unit_price: Decimal = Field(..., ge=0, description="Precio unitario")
    discount_percent: Decimal = Field(Decimal("0"), ge=0, le=100, description="Descuento %")
    tax_rate: Decimal = Field(Decimal("0"), ge=0, le=100, description="% impuesto (IVA)")
    
    # Campos calculados
    subtotal: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    total: Optional[Decimal] = None
    
    def calculate(self):
        """Calcular montos automáticamente."""
        self.subtotal = (self.quantity * self.unit_price).quantize(Decimal("0.01"))
        self.discount_amount = (self.subtotal * self.discount_percent / Decimal("100")).quantize(Decimal("0.01"))
        taxable_amount = self.subtotal - self.discount_amount
        self.tax_amount = (taxable_amount * self.tax_rate / Decimal("100")).quantize(Decimal("0.01"))
        self.total = (taxable_amount + self.tax_amount).quantize(Decimal("0.01"))
    
    class Config:
        json_schema_extra = {
            "example": {
                "description": "Paquete turístico Madrid - Barcelona",
                "quantity": 2,
                "unit_price": 500.00,
                "discount_percent": 10,
                "tax_rate": 21
            }
        }


class TaxBreakdown(BaseModel):
    """Desglose de impuestos."""
    tax_type: TaxType
    tax_name: str  # e.g., "IVA 21%", "IRPF 15%"
    tax_rate: Decimal
    taxable_amount: Decimal
    tax_amount: Decimal


class PaymentInfo(BaseModel):
    """Información de pago."""
    payment_method: str  # "bank_transfer", "credit_card", "cash", etc.
    payment_date: Optional[datetime] = None
    payment_reference: Optional[str] = None
    amount_paid: Decimal = Decimal("0")
    
    # Información bancaria
    bank_name: Optional[str] = None
    account_holder: Optional[str] = None
    account_number: Optional[str] = None
    iban: Optional[str] = None
    swift_bic: Optional[str] = None


class DigitalSignature(BaseModel):
    """Firma digital electrónica."""
    signature_id: str = Field(..., description="ID único de firma")
    algorithm: str = Field("SHA256withRSA", description="Algoritmo de firma")
    certificate_serial: str = Field(..., description="Número de serie del certificado")
    certificate_issuer: str = Field(..., description="Emisor del certificado")
    signer_name: str = Field(..., description="Nombre del firmante")
    signature_timestamp: datetime = Field(default_factory=datetime.utcnow)
    signature_value: str = Field(..., description="Valor de la firma (base64)")
    
    # Validación
    is_valid: bool = Field(True, description="¿Firma válida?")
    validation_timestamp: Optional[datetime] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "signature_id": "SIG-2025-001234",
                "algorithm": "SHA256withRSA",
                "certificate_serial": "1234567890ABCDEF",
                "certificate_issuer": "CN=FNMT Clase 2 CA",
                "signer_name": "Spirit Tours S.L.",
                "signature_value": "MIIG..."
            }
        }


class Invoice(BaseModel):
    """
    Factura completa con todos los detalles legales.
    
    Soporta facturación española con IVA y normativa fiscal.
    """
    id: Optional[int] = None
    
    # Numeración
    invoice_number: str = Field(..., description="Número de factura (e.g., 2025-001234)")
    invoice_series: str = Field("A", description="Serie de factura")
    
    # Tipo y estado
    document_type: DocumentType = DocumentType.INVOICE
    status: DocumentStatus = DocumentStatus.DRAFT
    payment_status: PaymentStatus = PaymentStatus.UNPAID
    
    # Fechas
    issue_date: date = Field(default_factory=date.today)
    due_date: Optional[date] = None
    payment_date: Optional[datetime] = None
    
    # Partes
    company: CompanyInfo = Field(..., description="Empresa emisora")
    customer: CustomerInfo = Field(..., description="Cliente")
    
    # Líneas de factura
    lines: List[InvoiceLine] = Field(..., min_items=1)
    
    # Montos
    currency: str = Field("EUR", min_length=3, max_length=3)
    subtotal: Decimal = Decimal("0")
    total_discount: Decimal = Decimal("0")
    taxable_amount: Decimal = Decimal("0")
    total_tax: Decimal = Decimal("0")
    total_amount: Decimal = Decimal("0")
    
    # Desglose de impuestos
    tax_breakdown: List[TaxBreakdown] = []
    
    # Información de pago
    payment_info: Optional[PaymentInfo] = None
    payment_terms: str = Field("30 días", description="Condiciones de pago")
    
    # Notas
    notes: Optional[str] = None
    legal_text: Optional[str] = None
    
    # Firma digital
    digital_signature: Optional[DigitalSignature] = None
    
    # Referencias
    related_booking_id: Optional[int] = None
    related_quotation_id: Optional[int] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[int] = None
    
    # Archivos generados
    pdf_url: Optional[str] = None
    xml_url: Optional[str] = None  # Para facturación electrónica
    
    def calculate_totals(self):
        """Calcular todos los totales automáticamente."""
        # Calcular cada línea
        for line in self.lines:
            line.calculate()
        
        # Sumar totales
        self.subtotal = sum((line.subtotal or Decimal("0")) for line in self.lines)
        self.total_discount = sum((line.discount_amount or Decimal("0")) for line in self.lines)
        self.taxable_amount = self.subtotal - self.total_discount
        self.total_tax = sum((line.tax_amount or Decimal("0")) for line in self.lines)
        self.total_amount = self.taxable_amount + self.total_tax
        
        # Agrupar impuestos por tipo/tasa
        tax_groups: Dict[tuple, TaxBreakdown] = {}
        for line in self.lines:
            if line.tax_rate > 0:
                key = (TaxType.VAT, line.tax_rate)
                if key not in tax_groups:
                    tax_groups[key] = TaxBreakdown(
                        tax_type=TaxType.VAT,
                        tax_name=f"IVA {line.tax_rate}%",
                        tax_rate=line.tax_rate,
                        taxable_amount=Decimal("0"),
                        tax_amount=Decimal("0")
                    )
                taxable = (line.subtotal or Decimal("0")) - (line.discount_amount or Decimal("0"))
                tax_groups[key].taxable_amount += taxable
                tax_groups[key].tax_amount += (line.tax_amount or Decimal("0"))
        
        self.tax_breakdown = list(tax_groups.values())
    
    class Config:
        json_schema_extra = {
            "example": {
                "invoice_number": "2025-001234",
                "invoice_series": "A",
                "issue_date": "2025-10-18",
                "due_date": "2025-11-17",
                "customer": {
                    "name": "Cliente Ejemplo",
                    "email": "cliente@ejemplo.com"
                },
                "lines": [
                    {
                        "description": "Paquete turístico",
                        "quantity": 2,
                        "unit_price": 500.00,
                        "tax_rate": 21
                    }
                ]
            }
        }


class Receipt(BaseModel):
    """
    Recibo de pago.
    
    Documento que certifica el pago recibido.
    """
    id: Optional[int] = None
    
    # Numeración
    receipt_number: str = Field(..., description="Número de recibo")
    receipt_series: str = Field("R", description="Serie de recibo")
    
    # Estado
    status: DocumentStatus = DocumentStatus.APPROVED
    
    # Fechas
    issue_date: date = Field(default_factory=date.today)
    payment_date: datetime = Field(default_factory=datetime.utcnow)
    
    # Partes
    company: CompanyInfo
    customer: CustomerInfo
    
    # Pago
    amount: Decimal = Field(..., gt=0)
    currency: str = Field("EUR", min_length=3, max_length=3)
    payment_method: str
    payment_reference: Optional[str] = None
    
    # Concepto
    concept: str = Field(..., description="Concepto del pago")
    related_invoice_number: Optional[str] = None
    
    # Firma digital
    digital_signature: Optional[DigitalSignature] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[int] = None
    
    # Archivo PDF
    pdf_url: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "receipt_number": "2025-R-001234",
                "issue_date": "2025-10-18",
                "amount": 1210.00,
                "payment_method": "bank_transfer",
                "concept": "Pago de factura 2025-001234"
            }
        }


class TaxInvoice(Invoice):
    """
    Factura completa con IVA y requisitos fiscales españoles.
    
    Extiende Invoice con información fiscal adicional.
    """
    # Información fiscal adicional
    reverse_charge: bool = Field(False, description="Inversión del sujeto pasivo")
    exempt_reason: Optional[str] = None
    
    # Para empresas extranjeras
    is_intra_community: bool = Field(False, description="Operación intracomunitaria")
    customer_vat_number: Optional[str] = None


class CreditNote(BaseModel):
    """
    Nota de crédito (rectificativa negativa).
    
    Documento que anula o rectifica una factura emitida.
    """
    id: Optional[int] = None
    
    # Numeración
    credit_note_number: str
    credit_note_series: str = Field("NC", description="Serie nota crédito")
    
    # Factura original
    original_invoice_number: str = Field(..., description="Factura que rectifica")
    original_invoice_date: date
    
    # Estado y fechas
    status: DocumentStatus = DocumentStatus.APPROVED
    issue_date: date = Field(default_factory=date.today)
    
    # Partes
    company: CompanyInfo
    customer: CustomerInfo
    
    # Líneas (negativas)
    lines: List[InvoiceLine]
    
    # Montos (negativos)
    currency: str = Field("EUR")
    total_amount: Decimal = Field(..., lt=0, description="Monto negativo")
    
    # Razón
    reason: str = Field(..., description="Motivo de la rectificación")
    
    # Firma digital
    digital_signature: Optional[DigitalSignature] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    pdf_url: Optional[str] = None


class DebitNote(BaseModel):
    """
    Nota de débito (rectificativa positiva).
    
    Documento que aumenta el importe de una factura.
    """
    id: Optional[int] = None
    
    # Numeración
    debit_note_number: str
    debit_note_series: str = Field("ND", description="Serie nota débito")
    
    # Factura original
    original_invoice_number: str
    original_invoice_date: date
    
    # Estado y fechas
    status: DocumentStatus = DocumentStatus.APPROVED
    issue_date: date = Field(default_factory=date.today)
    
    # Partes
    company: CompanyInfo
    customer: CustomerInfo
    
    # Líneas (positivas adicionales)
    lines: List[InvoiceLine]
    
    # Montos
    currency: str = Field("EUR")
    total_amount: Decimal = Field(..., gt=0)
    
    # Razón
    reason: str = Field(..., description="Motivo del cargo adicional")
    
    # Firma digital
    digital_signature: Optional[DigitalSignature] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    pdf_url: Optional[str] = None


# Request/Response models

class InvoiceCreateRequest(BaseModel):
    """Request para crear factura."""
    customer: CustomerInfo
    lines: List[InvoiceLine]
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    payment_terms: str = "30 días"
    notes: Optional[str] = None
    related_booking_id: Optional[int] = None


class ReceiptCreateRequest(BaseModel):
    """Request para crear recibo."""
    customer: CustomerInfo
    amount: Decimal
    payment_method: str
    payment_reference: Optional[str] = None
    concept: str
    related_invoice_number: Optional[str] = None
