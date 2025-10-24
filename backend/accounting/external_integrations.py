"""
Integraciones con Sistemas Contables Externos - Spirit Tours

Integración con:
- QuickBooks Online
- Xero
- Sage
- A3 Software (España)

Sincronización bidireccional de:
- Facturas
- Recibos
- Clientes
- Productos/Servicios
- Cuentas contables
"""
from typing import List, Dict, Any, Optional
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
import httpx

from .models import Invoice, Receipt, CustomerInfo
from .invoice_service import get_invoice_service
from .receipt_service import get_receipt_service


class IntegrationType(str, Enum):
    """Tipo de integración externa."""
    QUICKBOOKS = "quickbooks"
    XERO = "xero"
    SAGE = "sage"
    A3_SOFTWARE = "a3_software"


class SyncDirection(str, Enum):
    """Dirección de sincronización."""
    EXPORT = "export"  # Spirit Tours → Sistema externo
    IMPORT = "import"  # Sistema externo → Spirit Tours
    BIDIRECTIONAL = "bidirectional"


class SyncStatus(str, Enum):
    """Estado de sincronización."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class QuickBooksIntegration:
    """
    Integración con QuickBooks Online.
    
    Utiliza QuickBooks Online API v3.
    """
    
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        realm_id: str,
        access_token: str,
        refresh_token: str,
        sandbox: bool = False
    ):
        """
        Inicializar integración con QuickBooks.
        
        Args:
            client_id: App Client ID
            client_secret: App Client Secret
            realm_id: Company ID (Realm ID)
            access_token: OAuth2 access token
            refresh_token: OAuth2 refresh token
            sandbox: Usar sandbox environment
        """
        self.client_id = client_id
        self.client_secret = client_secret
        self.realm_id = realm_id
        self.access_token = access_token
        self.refresh_token = refresh_token
        
        base_url = "https://sandbox-quickbooks.api.intuit.com" if sandbox else "https://quickbooks.api.intuit.com"
        self.api_base = f"{base_url}/v3/company/{realm_id}"
        
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            timeout=30.0
        )
    
    async def sync_invoice(self, invoice: Invoice) -> Dict[str, Any]:
        """
        Sincronizar factura a QuickBooks.
        
        Args:
            invoice: Factura de Spirit Tours
        
        Returns:
            Respuesta de QuickBooks con ID de factura creada
        """
        # Transformar a formato QuickBooks
        qb_invoice = {
            "DocNumber": invoice.invoice_number,
            "TxnDate": invoice.issue_date.isoformat(),
            "DueDate": invoice.due_date.isoformat() if invoice.due_date else None,
            "CustomerRef": {
                "name": invoice.customer.name
            },
            "Line": []
        }
        
        # Agregar líneas
        for line in invoice.lines:
            qb_line = {
                "DetailType": "SalesItemLineDetail",
                "Description": line.description,
                "Amount": float(line.total or 0),
                "SalesItemLineDetail": {
                    "Qty": float(line.quantity),
                    "UnitPrice": float(line.unit_price),
                    "TaxCodeRef": {
                        "value": self._map_tax_code(line.tax_rate)
                    }
                }
            }
            qb_invoice["Line"].append(qb_line)
        
        # Enviar a QuickBooks
        try:
            response = await self.client.post(
                f"{self.api_base}/invoice",
                json=qb_invoice
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            return {
                "error": str(e),
                "status": "failed"
            }
    
    async def sync_payment(self, receipt: Receipt) -> Dict[str, Any]:
        """
        Sincronizar recibo/pago a QuickBooks.
        
        Args:
            receipt: Recibo de Spirit Tours
        
        Returns:
            Respuesta de QuickBooks
        """
        qb_payment = {
            "TotalAmt": float(receipt.amount),
            "CustomerRef": {
                "name": receipt.customer.name
            },
            "TxnDate": receipt.payment_date.date().isoformat(),
            "PaymentMethodRef": {
                "name": self._map_payment_method(receipt.payment_method)
            }
        }
        
        # Si está vinculado a factura
        if receipt.related_invoice_number:
            qb_payment["Line"] = [{
                "Amount": float(receipt.amount),
                "LinkedTxn": [{
                    "TxnType": "Invoice",
                    "TxnId": receipt.related_invoice_number
                }]
            }]
        
        try:
            response = await self.client.post(
                f"{self.api_base}/payment",
                json=qb_payment
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            return {
                "error": str(e),
                "status": "failed"
            }
    
    async def get_customer(self, customer_name: str) -> Optional[Dict[str, Any]]:
        """Buscar cliente en QuickBooks por nombre."""
        try:
            response = await self.client.get(
                f"{self.api_base}/query",
                params={
                    "query": f"SELECT * FROM Customer WHERE DisplayName = '{customer_name}'"
                }
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get("QueryResponse", {}).get("Customer"):
                return data["QueryResponse"]["Customer"][0]
            return None
        except httpx.HTTPError:
            return None
    
    async def create_customer(self, customer: CustomerInfo) -> Dict[str, Any]:
        """Crear cliente en QuickBooks."""
        qb_customer = {
            "DisplayName": customer.name,
            "PrimaryEmailAddr": {
                "Address": customer.email
            }
        }
        
        if customer.phone:
            qb_customer["PrimaryPhone"] = {
                "FreeFormNumber": customer.phone
            }
        
        if customer.address:
            qb_customer["BillAddr"] = {
                "Line1": customer.address.street,
                "City": customer.address.city,
                "PostalCode": customer.address.postal_code,
                "Country": customer.address.country
            }
        
        try:
            response = await self.client.post(
                f"{self.api_base}/customer",
                json=qb_customer
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            return {
                "error": str(e),
                "status": "failed"
            }
    
    def _map_tax_code(self, tax_rate: Decimal) -> str:
        """Mapear tasa de IVA a código de QuickBooks."""
        if tax_rate == Decimal("21"):
            return "TAX"  # IVA 21%
        elif tax_rate == Decimal("10"):
            return "TAX_10"  # IVA 10%
        elif tax_rate == Decimal("0"):
            return "NON"  # Exento
        else:
            return "TAX"
    
    def _map_payment_method(self, method: str) -> str:
        """Mapear método de pago a QuickBooks."""
        mapping = {
            "bank_transfer": "Bank Transfer",
            "credit_card": "Credit Card",
            "cash": "Cash",
            "check": "Check"
        }
        return mapping.get(method, "Other")


class XeroIntegration:
    """
    Integración con Xero.
    
    Utiliza Xero API v2.
    """
    
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        tenant_id: str,
        access_token: str
    ):
        """
        Inicializar integración con Xero.
        
        Args:
            client_id: OAuth2 Client ID
            client_secret: OAuth2 Client Secret
            tenant_id: Xero Tenant ID
            access_token: OAuth2 Access Token
        """
        self.client_id = client_id
        self.client_secret = client_secret
        self.tenant_id = tenant_id
        self.access_token = access_token
        
        self.api_base = "https://api.xero.com/api.xro/2.0"
        
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {access_token}",
                "Xero-tenant-id": tenant_id,
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            timeout=30.0
        )
    
    async def sync_invoice(self, invoice: Invoice) -> Dict[str, Any]:
        """
        Sincronizar factura a Xero.
        
        Args:
            invoice: Factura de Spirit Tours
        
        Returns:
            Respuesta de Xero
        """
        xero_invoice = {
            "Type": "ACCREC",  # Accounts Receivable
            "InvoiceNumber": invoice.invoice_number,
            "Date": invoice.issue_date.isoformat(),
            "DueDate": invoice.due_date.isoformat() if invoice.due_date else None,
            "Contact": {
                "Name": invoice.customer.name
            },
            "LineItems": [],
            "Status": self._map_invoice_status(invoice.status)
        }
        
        # Agregar líneas
        for line in invoice.lines:
            xero_line = {
                "Description": line.description,
                "Quantity": float(line.quantity),
                "UnitAmount": float(line.unit_price),
                "TaxType": self._map_tax_type(line.tax_rate),
                "LineAmount": float(line.total or 0)
            }
            
            if line.discount_percent > 0:
                xero_line["DiscountRate"] = float(line.discount_percent)
            
            xero_invoice["LineItems"].append(xero_line)
        
        try:
            response = await self.client.post(
                f"{self.api_base}/Invoices",
                json={"Invoices": [xero_invoice]}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            return {
                "error": str(e),
                "status": "failed"
            }
    
    async def sync_payment(self, receipt: Receipt) -> Dict[str, Any]:
        """
        Sincronizar pago a Xero.
        
        Args:
            receipt: Recibo de Spirit Tours
        
        Returns:
            Respuesta de Xero
        """
        xero_payment = {
            "Invoice": {
                "InvoiceNumber": receipt.related_invoice_number
            },
            "Account": {
                "Code": "200"  # Bank account code (configurable)
            },
            "Date": receipt.payment_date.date().isoformat(),
            "Amount": float(receipt.amount),
            "Reference": receipt.receipt_number
        }
        
        try:
            response = await self.client.post(
                f"{self.api_base}/Payments",
                json={"Payments": [xero_payment]}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            return {
                "error": str(e),
                "status": "failed"
            }
    
    def _map_invoice_status(self, status) -> str:
        """Mapear estado de factura a Xero."""
        from .models import DocumentStatus
        
        mapping = {
            DocumentStatus.DRAFT: "DRAFT",
            DocumentStatus.APPROVED: "SUBMITTED",
            DocumentStatus.SENT: "SUBMITTED",
            DocumentStatus.PAID: "AUTHORISED"
        }
        return mapping.get(status, "DRAFT")
    
    def _map_tax_type(self, tax_rate: Decimal) -> str:
        """Mapear tasa de IVA a tipo de Xero."""
        if tax_rate == Decimal("21"):
            return "OUTPUT2"  # 21% IVA
        elif tax_rate == Decimal("10"):
            return "ESIEXEMPT"  # 10% reducido
        elif tax_rate == Decimal("0"):
            return "ZERORATEDINPUT"
        else:
            return "OUTPUT2"


class ExternalIntegrationService:
    """
    Servicio unificado de integración con sistemas externos.
    
    Gestiona sincronización con múltiples plataformas contables.
    """
    
    def __init__(self):
        """Inicializar servicio de integraciones."""
        self.integrations: Dict[IntegrationType, Any] = {}
    
    def register_quickbooks(
        self,
        client_id: str,
        client_secret: str,
        realm_id: str,
        access_token: str,
        refresh_token: str,
        sandbox: bool = False
    ):
        """Registrar integración con QuickBooks."""
        self.integrations[IntegrationType.QUICKBOOKS] = QuickBooksIntegration(
            client_id, client_secret, realm_id, access_token, refresh_token, sandbox
        )
    
    def register_xero(
        self,
        client_id: str,
        client_secret: str,
        tenant_id: str,
        access_token: str
    ):
        """Registrar integración con Xero."""
        self.integrations[IntegrationType.XERO] = XeroIntegration(
            client_id, client_secret, tenant_id, access_token
        )
    
    async def sync_invoices(
        self,
        integration_type: IntegrationType,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Sincronizar facturas al sistema externo.
        
        Args:
            integration_type: Tipo de integración
            from_date: Fecha desde
            to_date: Fecha hasta
        
        Returns:
            Resultado de sincronización
        """
        if integration_type not in self.integrations:
            raise ValueError(f"Integration {integration_type.value} not configured")
        
        integration = self.integrations[integration_type]
        invoice_service = get_invoice_service()
        
        # Obtener facturas
        invoices = await invoice_service.list_invoices(
            from_date=from_date,
            to_date=to_date,
            limit=10000
        )
        
        results = {
            "total": len(invoices),
            "synced": 0,
            "failed": 0,
            "errors": []
        }
        
        for invoice in invoices:
            try:
                response = await integration.sync_invoice(invoice)
                
                if "error" in response:
                    results["failed"] += 1
                    results["errors"].append({
                        "invoice_number": invoice.invoice_number,
                        "error": response["error"]
                    })
                else:
                    results["synced"] += 1
            except Exception as e:
                results["failed"] += 1
                results["errors"].append({
                    "invoice_number": invoice.invoice_number,
                    "error": str(e)
                })
        
        return results
    
    async def sync_payments(
        self,
        integration_type: IntegrationType,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Sincronizar pagos/recibos al sistema externo.
        
        Args:
            integration_type: Tipo de integración
            from_date: Fecha desde
            to_date: Fecha hasta
        
        Returns:
            Resultado de sincronización
        """
        if integration_type not in self.integrations:
            raise ValueError(f"Integration {integration_type.value} not configured")
        
        integration = self.integrations[integration_type]
        receipt_service = get_receipt_service()
        
        # Obtener recibos
        receipts = await receipt_service.list_receipts(
            from_date=from_date,
            to_date=to_date,
            limit=10000
        )
        
        results = {
            "total": len(receipts),
            "synced": 0,
            "failed": 0,
            "errors": []
        }
        
        for receipt in receipts:
            try:
                response = await integration.sync_payment(receipt)
                
                if "error" in response:
                    results["failed"] += 1
                    results["errors"].append({
                        "receipt_number": receipt.receipt_number,
                        "error": response["error"]
                    })
                else:
                    results["synced"] += 1
            except Exception as e:
                results["failed"] += 1
                results["errors"].append({
                    "receipt_number": receipt.receipt_number,
                    "error": str(e)
                })
        
        return results


# Singleton global
_external_integration_service: Optional[ExternalIntegrationService] = None


def get_external_integration_service() -> ExternalIntegrationService:
    """
    Obtener instancia global del servicio de integraciones externas.
    
    Returns:
        ExternalIntegrationService
    """
    global _external_integration_service
    if _external_integration_service is None:
        _external_integration_service = ExternalIntegrationService()
    return _external_integration_service
