# Sistema de Contabilidad Integrado - Spirit Tours

Sistema completo de contabilidad con generación de **recibos**, **facturas** y **firma digital electrónica** para cumplimiento fiscal español.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Arquitectura](#arquitectura)
- [Modelos de Datos](#modelos-de-datos)
- [Servicios](#servicios)
- [API REST](#api-rest)
- [Firma Digital](#firma-digital)
- [Generación de PDF](#generación-de-pdf)
- [Cumplimiento Fiscal](#cumplimiento-fiscal)
- [Instalación](#instalación)
- [Ejemplos de Uso](#ejemplos-de-uso)

## ✨ Características

### Documentos Contables
- ✅ **Facturas (Invoice)** - Con numeración automática y cálculo de IVA
- ✅ **Recibos (Receipt)** - Certificación de pagos recibidos
- ✅ **Facturas con IVA (TaxInvoice)** - Cumplimiento fiscal español
- ✅ **Notas de Crédito** - Rectificación negativa de facturas
- ✅ **Notas de Débito** - Cargos adicionales sobre facturas

### Firma Digital Electrónica
- ✅ **Certificados X.509** - Soporte para certificados españoles (FNMT, Camerfirma)
- ✅ **SHA256withRSA** - Algoritmo de firma seguro
- ✅ **Validación de Firmas** - Verificación de autenticidad
- ✅ **Timestamp Certification** - Sellado de tiempo

### Generación de PDF
- ✅ **Diseño Profesional** - Templates corporativos de alta calidad
- ✅ **Multi-idioma** - Español e Inglés
- ✅ **Cumplimiento Fiscal** - Formato conforme a normativa española
- ✅ **QR Codes** - Para verificación electrónica

### Gestión Fiscal
- ✅ **IVA Automático** - Cálculo y desglose por tasa (21%, 10%, 4%)
- ✅ **NIF/CIF** - Validación de identificadores fiscales
- ✅ **Operaciones Intracomunitarias** - Soporte para UE
- ✅ **Retenciones** - Gestión de IRPF y otras retenciones

### Funcionalidades Avanzadas
- ✅ **Numeración Automática** - Serie + año + secuencia
- ✅ **Ciclo de Vida** - Draft → Approved → Sent → Paid
- ✅ **Búsqueda y Filtros** - Por estado, cliente, fecha, etc.
- ✅ **Estadísticas** - Dashboard con KPIs financieros
- ✅ **Reconciliación** - Vinculación recibos-facturas

## 🏗️ Arquitectura

```
backend/accounting/
├── __init__.py                      # Exports del módulo
├── models.py                        # Modelos Pydantic (16KB)
├── invoice_service.py               # Servicio de facturas (16KB)
├── receipt_service.py               # Servicio de recibos (9KB)
├── digital_signature_service.py     # Servicio de firma digital (12KB)
├── pdf_generator.py                 # Generador de PDF (14KB)
├── routes.py                        # API REST FastAPI (17KB)
└── README.md                        # Documentación
```

**Total:** 7 archivos, ~84KB de código

## 📊 Modelos de Datos

### Invoice (Factura)

```python
class Invoice(BaseModel):
    # Numeración
    invoice_number: str              # "2025-A-001234"
    invoice_series: str              # "A", "B", "C"
    
    # Estado
    status: DocumentStatus           # DRAFT, APPROVED, SENT, PAID, etc.
    payment_status: PaymentStatus    # UNPAID, PARTIAL, PAID
    
    # Fechas
    issue_date: date
    due_date: date
    payment_date: Optional[datetime]
    
    # Partes
    company: CompanyInfo
    customer: CustomerInfo
    
    # Líneas
    lines: List[InvoiceLine]
    
    # Montos (calculados automáticamente)
    subtotal: Decimal
    total_discount: Decimal
    taxable_amount: Decimal
    total_tax: Decimal
    total_amount: Decimal
    tax_breakdown: List[TaxBreakdown]
    
    # Firma digital
    digital_signature: Optional[DigitalSignature]
    
    # Archivos
    pdf_url: Optional[str]
    xml_url: Optional[str]
```

### Receipt (Recibo)

```python
class Receipt(BaseModel):
    # Numeración
    receipt_number: str              # "2025-R-001234"
    receipt_series: str              # "R"
    
    # Fechas
    issue_date: date
    payment_date: datetime
    
    # Partes
    company: CompanyInfo
    customer: CustomerInfo
    
    # Pago
    amount: Decimal
    payment_method: str              # "bank_transfer", "credit_card", "cash"
    payment_reference: Optional[str]
    
    # Concepto
    concept: str
    related_invoice_number: Optional[str]
    
    # Firma digital
    digital_signature: Optional[DigitalSignature]
    
    # Archivo
    pdf_url: Optional[str]
```

### DigitalSignature (Firma Digital)

```python
class DigitalSignature(BaseModel):
    signature_id: str                # "SIG-2025-001234"
    algorithm: str                   # "SHA256withRSA"
    certificate_serial: str          # Número de serie del certificado
    certificate_issuer: str          # "CN=FNMT Clase 2 CA"
    signer_name: str                 # Nombre del firmante
    signature_value: str             # Firma en base64
    signature_timestamp: datetime
    is_valid: bool
```

## 🔧 Servicios

### InvoiceService

Gestión completa del ciclo de vida de facturas.

```python
service = get_invoice_service()

# Crear factura
invoice = await service.create_invoice(request)

# Aprobar factura
invoice = await service.approve_invoice(invoice_number)

# Enviar factura
invoice = await service.mark_as_sent(invoice_number)

# Marcar como pagada
invoice = await service.mark_as_paid(invoice_number)

# Crear nota de crédito
credit_note = await service.create_credit_note(
    original_invoice_number="2025-A-001234",
    lines=[...],
    reason="Devolución de producto"
)

# Estadísticas
stats = await service.get_statistics(year=2025, month=10)
```

### ReceiptService

Gestión de recibos de pago.

```python
service = get_receipt_service()

# Crear recibo
receipt = await service.create_receipt(request)

# Listar recibos de una factura
receipts = await service.get_receipts_by_invoice(invoice_number)

# Total recibido para una factura
total = await service.get_total_received_for_invoice(invoice_number)

# Estadísticas
stats = await service.get_statistics(year=2025, month=10)
```

### DigitalSignatureService

Gestión de firmas digitales electrónicas.

```python
service = get_signature_service()

# Firmar documento
signature = await service.sign_document(
    document_data="data_to_sign",
    signer_name="Spirit Tours S.L."
)

# Verificar firma
is_valid = await service.verify_signature(document_data, signature)

# Validar certificado
validation = await service.validate_certificate()

# Información del certificado
cert_info = await service.get_certificate_info()
```

### PDFGenerator

Generación de PDF profesionales.

```python
generator = get_pdf_generator(language="es")

# Generar PDF de factura
pdf_bytes = await generator.generate_invoice_pdf(invoice)

# Generar PDF de recibo
pdf_bytes = await generator.generate_receipt_pdf(receipt)
```

## 🌐 API REST

Base URL: `/accounting`

### Endpoints de Facturas

```http
POST   /accounting/invoices                    # Crear factura
GET    /accounting/invoices                    # Listar facturas
GET    /accounting/invoices/{number}           # Obtener factura
PUT    /accounting/invoices/{number}/approve   # Aprobar factura
PUT    /accounting/invoices/{number}/send      # Marcar como enviada
PUT    /accounting/invoices/{number}/pay       # Marcar como pagada
DELETE /accounting/invoices/{number}           # Cancelar factura
GET    /accounting/invoices/{number}/pdf       # Descargar PDF
POST   /accounting/invoices/{number}/sign      # Firmar digitalmente
GET    /accounting/invoices/statistics/summary # Estadísticas
```

### Endpoints de Recibos

```http
POST   /accounting/receipts                    # Crear recibo
GET    /accounting/receipts                    # Listar recibos
GET    /accounting/receipts/{number}           # Obtener recibo
DELETE /accounting/receipts/{number}           # Cancelar recibo
GET    /accounting/receipts/{number}/pdf       # Descargar PDF
POST   /accounting/receipts/{number}/sign      # Firmar digitalmente
GET    /accounting/receipts/statistics/summary # Estadísticas
```

### Endpoints de Notas de Crédito/Débito

```http
POST   /accounting/credit-notes                # Crear nota de crédito
POST   /accounting/debit-notes                 # Crear nota de débito
```

### Endpoints de Firma Digital

```http
GET    /accounting/digital-signature/certificate # Info del certificado
GET    /accounting/digital-signature/validate    # Validar certificado
```

### Dashboard

```http
GET    /accounting/dashboard/summary           # Resumen consolidado
GET    /accounting/health                      # Health check
```

## 🔐 Firma Digital

### Configuración de Certificado

```python
from backend.accounting import initialize_signature_service

# Inicializar con certificado real
service = initialize_signature_service(
    certificate_path="/path/to/certificate.pem",
    private_key_path="/path/to/private_key.pem"
)
```

### Certificados Soportados

- **FNMT** (Fábrica Nacional de Moneda y Timbre)
- **Camerfirma**
- **Firmaprofesional**
- **Cualquier certificado X.509 estándar**

### Algoritmo

- **SHA256withRSA** - Algoritmo seguro y estándar
- Compatible con normativa española de firma electrónica

## 📄 Generación de PDF

### Dependencias

```bash
pip install reportlab
```

### Características de PDF

- ✅ Diseño profesional y corporativo
- ✅ Logo de empresa
- ✅ Desglose detallado de IVA
- ✅ Información fiscal completa
- ✅ QR code para verificación
- ✅ Firma digital visible
- ✅ Multi-idioma (ES/EN)

### Ejemplo de Generación

```python
from backend.accounting import get_pdf_generator

generator = get_pdf_generator(language="es")
pdf_bytes = await generator.generate_invoice_pdf(invoice)

# Guardar a archivo
with open("factura.pdf", "wb") as f:
    f.write(pdf_bytes)
```

## 🇪🇸 Cumplimiento Fiscal

### IVA (Impuesto sobre el Valor Añadido)

- **IVA General:** 21%
- **IVA Reducido:** 10%
- **IVA Superreducido:** 4%
- **Exento:** 0%

### Identificadores Fiscales

- **NIF:** Número de Identificación Fiscal (personas físicas)
- **CIF:** Código de Identificación Fiscal (empresas)
- **NIE:** Número de Identidad de Extranjero

### Operaciones Intracomunitarias

Soporte para facturación a empresas de la UE con:
- Inversión del sujeto pasivo
- Validación de VAT Number
- Exención de IVA

### Normativa

- **Ley 37/1992** - Ley del IVA
- **Real Decreto 1619/2012** - Facturas electrónicas
- **Ley 59/2003** - Firma electrónica

## 📦 Instalación

### Dependencias Base

```bash
pip install fastapi pydantic
```

### Dependencias Opcionales

```bash
# Para PDF profesional
pip install reportlab

# Para firma digital con certificados reales
pip install cryptography
```

### Inicialización

```python
from backend.accounting import (
    initialize_invoice_service,
    initialize_receipt_service,
    initialize_signature_service,
    accounting_router
)
from backend.accounting.models import CompanyInfo, Address

# Configurar información de empresa
company_info = CompanyInfo(
    name="Spirit Tours S.L.",
    tax_id="B-12345678",
    address=Address(
        street="Calle Gran Vía 123",
        city="Madrid",
        postal_code="28001",
        country="ES"
    ),
    phone="+34 91 234 5678",
    email="info@spirittours.com"
)

# Inicializar servicios
initialize_invoice_service(company_info)
initialize_receipt_service(company_info)
initialize_signature_service(
    certificate_path="/path/to/cert.pem",
    private_key_path="/path/to/key.pem"
)

# Registrar router en FastAPI
app.include_router(accounting_router)
```

## 📝 Ejemplos de Uso

### Crear Factura

```python
from backend.accounting import get_invoice_service
from backend.accounting.models import (
    InvoiceCreateRequest,
    CustomerInfo,
    InvoiceLine
)
from decimal import Decimal

request = InvoiceCreateRequest(
    customer=CustomerInfo(
        name="Cliente Ejemplo S.A.",
        tax_id="A-98765432",
        email="cliente@ejemplo.com"
    ),
    lines=[
        InvoiceLine(
            description="Paquete turístico Madrid-Barcelona",
            quantity=Decimal("2"),
            unit_price=Decimal("500.00"),
            discount_percent=Decimal("10"),
            tax_rate=Decimal("21")  # IVA 21%
        ),
        InvoiceLine(
            description="Seguro de viaje",
            quantity=Decimal("2"),
            unit_price=Decimal("50.00"),
            tax_rate=Decimal("21")
        )
    ],
    payment_terms="30 días",
    notes="Gracias por su preferencia"
)

service = get_invoice_service()
invoice = await service.create_invoice(request)

print(f"Factura creada: {invoice.invoice_number}")
print(f"Total: {invoice.total_amount} EUR")
print(f"IVA: {invoice.total_tax} EUR")
```

### Crear Recibo

```python
from backend.accounting import get_receipt_service
from backend.accounting.models import ReceiptCreateRequest

request = ReceiptCreateRequest(
    customer=CustomerInfo(
        name="Cliente Ejemplo S.A.",
        email="cliente@ejemplo.com"
    ),
    amount=Decimal("1210.00"),
    payment_method="bank_transfer",
    payment_reference="TRANS-123456",
    concept="Pago de factura 2025-A-001234",
    related_invoice_number="2025-A-001234"
)

service = get_receipt_service()
receipt = await service.create_receipt(request)

print(f"Recibo creado: {receipt.receipt_number}")
```

### Firmar Documento

```python
from backend.accounting import get_signature_service

# Obtener factura
invoice = await invoice_service.get_invoice("2025-A-001234")

# Firmar
signature_service = get_signature_service()
document_data = f"{invoice.invoice_number}|{invoice.total_amount}|{invoice.issue_date}"
signature = await signature_service.sign_document(
    document_data=document_data,
    signer_name="Spirit Tours S.L."
)

# Asignar firma a factura
invoice.digital_signature = signature

print(f"Documento firmado: {signature.signature_id}")
print(f"Algoritmo: {signature.algorithm}")
print(f"Timestamp: {signature.signature_timestamp}")
```

### Generar PDF

```python
from backend.accounting import get_pdf_generator

# Generar PDF de factura
generator = get_pdf_generator(language="es")
pdf_bytes = await generator.generate_invoice_pdf(invoice)

# Guardar archivo
with open(f"factura_{invoice.invoice_number}.pdf", "wb") as f:
    f.write(pdf_bytes)

print(f"PDF generado: {len(pdf_bytes)} bytes")
```

### Obtener Estadísticas

```python
# Estadísticas de facturas
invoice_stats = await invoice_service.get_statistics(year=2025, month=10)

print(f"Facturas emitidas: {invoice_stats['total_invoices']}")
print(f"Total facturado: {invoice_stats['total_amount']} EUR")
print(f"Pagado: {invoice_stats['paid_amount']} EUR")
print(f"Pendiente: {invoice_stats['pending_amount']} EUR")
print(f"Vencido: {invoice_stats['overdue_amount']} EUR")
print(f"Tasa de pago: {invoice_stats['payment_rate']:.2f}%")

# Estadísticas de recibos
receipt_stats = await receipt_service.get_statistics(year=2025, month=10)

print(f"Recibos emitidos: {receipt_stats['total_receipts']}")
print(f"Total recibido: {receipt_stats['total_amount']} EUR")
print(f"Desglose por método:")
for method, amount in receipt_stats['payment_methods'].items():
    print(f"  - {method}: {amount} EUR")
```

## 🚀 Próximas Funcionalidades

### Dashboard Avanzado
- [ ] Gráficos de facturación mensual
- [ ] Proyecciones de cash flow
- [ ] Alertas de facturas vencidas
- [ ] KPIs financieros en tiempo real

### Reconciliación Automática
- [ ] Matching automático recibos-facturas
- [ ] Detección de pagos parciales
- [ ] Seguimiento de cuentas por cobrar

### Reportes Contables
- [ ] Balance general
- [ ] Estado de resultados (P&L)
- [ ] Flujo de caja
- [ ] Libro de IVA

### Integraciones
- [ ] QuickBooks Online
- [ ] Xero
- [ ] Sage
- [ ] A3 Software

## 📞 Soporte

Para consultas o soporte:
- **Email:** dev@spirittours.com
- **Documentación:** `/docs` (FastAPI Swagger UI)

## 📄 Licencia

© 2025 Spirit Tours. Todos los derechos reservados.
