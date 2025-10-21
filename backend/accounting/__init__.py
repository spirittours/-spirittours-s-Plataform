"""
Sistema de Contabilidad Integrado - Spirit Tours

Sistema completo de contabilidad con:
- Generación de recibos y facturas (PDF profesional)
- Firma digital electrónica (certificados digitales)
- Numeración automática de documentos
- Gestión fiscal (IVA, retenciones, impuestos)
- Dashboard de contabilidad unificado
- Reconciliación financiera automática
- Reportes contables (Balance, P&L, Cash Flow)
- Integración con sistemas externos (QuickBooks, Xero)
"""

from .models import (
    Invoice,
    Receipt,
    TaxInvoice,
    CreditNote,
    DebitNote,
    DigitalSignature,
    InvoiceCreateRequest,
    ReceiptCreateRequest
)
from .routes import router as accounting_router
from .invoice_service import (
    InvoiceService,
    get_invoice_service,
    initialize_invoice_service
)
from .receipt_service import (
    ReceiptService,
    get_receipt_service,
    initialize_receipt_service
)
from .digital_signature_service import (
    DigitalSignatureService,
    get_signature_service,
    initialize_signature_service
)
from .pdf_generator import PDFGenerator, get_pdf_generator
from .dashboard_service import (
    AccountingDashboardService,
    get_dashboard_service
)
from .reconciliation_service import (
    ReconciliationService,
    get_reconciliation_service
)
from .financial_reports_service import (
    FinancialReportsService,
    get_financial_reports_service
)

__all__ = [
    # Models
    "Invoice",
    "Receipt",
    "TaxInvoice",
    "CreditNote",
    "DebitNote",
    "DigitalSignature",
    "InvoiceCreateRequest",
    "ReceiptCreateRequest",
    
    # Router
    "accounting_router",
    
    # Services
    "InvoiceService",
    "ReceiptService",
    "DigitalSignatureService",
    "PDFGenerator",
    "AccountingDashboardService",
    "ReconciliationService",
    "FinancialReportsService",
    
    # Service getters
    "get_invoice_service",
    "get_receipt_service",
    "get_signature_service",
    "get_pdf_generator",
    "get_dashboard_service",
    "get_reconciliation_service",
    "get_financial_reports_service",
    
    # Service initializers
    "initialize_invoice_service",
    "initialize_receipt_service",
    "initialize_signature_service"
]
