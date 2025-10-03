"""
BTCPay Server Service - Free Alternative to Stripe/PayPal
Self-hosted, open-source cryptocurrency payment processor
Cost: $0 (no fees, direct peer-to-peer payments)
Features:
- Accept Bitcoin, Lightning Network, and 20+ cryptocurrencies
- No transaction fees (only network fees)
- No KYC/AML requirements
- Complete payment autonomy
- Point of Sale system
- Crowdfunding platform
- Payment buttons and invoices
- Wallet management
- Exchange rate management
"""

import asyncio
import httpx
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from decimal import Decimal
import json
import hmac
import hashlib
from enum import Enum
import logging
import qrcode
import io
import base64
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.backends import default_backend

logger = logging.getLogger(__name__)

class PaymentStatus(Enum):
    NEW = "new"
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETE = "complete"
    CONFIRMED = "confirmed"
    EXPIRED = "expired"
    INVALID = "invalid"
    REFUNDED = "refunded"

class CryptoCurrency(Enum):
    BTC = "BTC"
    LTC = "LTC"
    ETH = "ETH"
    BCH = "BCH"
    DASH = "DASH"
    DOGE = "DOGE"
    XMR = "XMR"
    USDT = "USDT"
    USDC = "USDC"
    DAI = "DAI"
    LIGHTNING = "BTC_LightningNetwork"

@dataclass
class Invoice:
    """Payment invoice"""
    id: str
    store_id: str
    amount: Decimal
    currency: str
    crypto_amount: Decimal
    crypto_currency: CryptoCurrency
    status: PaymentStatus
    payment_url: str
    address: str
    created_at: datetime
    expires_at: datetime
    buyer_email: Optional[str] = None
    order_id: Optional[str] = None
    item_desc: Optional[str] = None
    notification_url: Optional[str] = None
    redirect_url: Optional[str] = None
    metadata: Dict[str, Any] = None
    
@dataclass
class Payment:
    """Cryptocurrency payment"""
    payment_id: str
    invoice_id: str
    amount: Decimal
    currency: CryptoCurrency
    address: str
    transaction_id: Optional[str] = None
    confirmations: int = 0
    status: PaymentStatus = PaymentStatus.NEW
    received_date: Optional[datetime] = None
    
@dataclass
class Wallet:
    """Cryptocurrency wallet"""
    wallet_id: str
    name: str
    currency: CryptoCurrency
    balance: Decimal
    available_balance: Decimal
    pending_balance: Decimal
    address_count: int
    
@dataclass
class ExchangeRate:
    """Exchange rate data"""
    currency_pair: str
    rate: Decimal
    bid: Decimal
    ask: Decimal
    provider: str
    updated_at: datetime
    
class BTCPayServerService:
    """
    Complete BTCPay Server integration
    Zero-fee cryptocurrency payment processing
    """
    
    def __init__(
        self,
        server_url: str = None,
        api_key: Optional[str] = None,
        store_id: Optional[str] = None
    ):
        # Configuration
        self.server_url = server_url or "https://btcpay.spirittours.com"
        self.api_key = api_key
        self.store_id = store_id
        
        # API endpoints
        self.api_url = f"{self.server_url}/api/v1"
        
        # Invoice management
        self.invoices: Dict[str, Invoice] = {}
        self.payments: Dict[str, Payment] = {}
        
        # Webhook verification
        self.webhook_secret: Optional[str] = None
        
        # Exchange rates cache
        self.exchange_rates: Dict[str, ExchangeRate] = {}
        self.rates_ttl = 300  # 5 minutes
        
        # Payment callbacks
        self.payment_callbacks: Dict[str, Any] = {}
        
    async def create_invoice(
        self,
        amount: Decimal,
        currency: str = "USD",
        crypto_currency: Optional[CryptoCurrency] = None,
        buyer_email: Optional[str] = None,
        order_id: Optional[str] = None,
        item_description: Optional[str] = None,
        expiration_minutes: int = 60,
        notification_url: Optional[str] = None,
        redirect_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        payment_methods: Optional[List[CryptoCurrency]] = None
    ) -> Optional[Invoice]:
        """
        Create payment invoice
        No fees, direct crypto payments
        """
        try:
            invoice_data = {
                "amount": str(amount),
                "currency": currency,
                "metadata": metadata or {}
            }
            
            # Set cryptocurrency if specified
            if crypto_currency:
                invoice_data["supportedTransactionCurrencies"] = {
                    crypto_currency.value: {"enabled": True}
                }
            elif payment_methods:
                invoice_data["supportedTransactionCurrencies"] = {
                    method.value: {"enabled": True} for method in payment_methods
                }
                
            # Add optional fields
            if buyer_email:
                invoice_data["buyer"] = {"email": buyer_email}
            if order_id:
                invoice_data["orderId"] = order_id
            if item_description:
                invoice_data["itemDesc"] = item_description
            if notification_url:
                invoice_data["notificationURL"] = notification_url
            if redirect_url:
                invoice_data["redirectURL"] = redirect_url
                
            # Set expiration
            invoice_data["expirationMinutes"] = expiration_minutes
            
            headers = {
                "Authorization": f"token {self.api_key}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/stores/{self.store_id}/invoices",
                    json=invoice_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Parse invoice data
                    invoice = Invoice(
                        id=data["id"],
                        store_id=self.store_id,
                        amount=Decimal(str(amount)),
                        currency=currency,
                        crypto_amount=Decimal(data.get("cryptoInfo", [{}])[0].get("cryptoPaid", "0")),
                        crypto_currency=CryptoCurrency(data.get("cryptoInfo", [{}])[0].get("cryptoCode", "BTC")),
                        status=PaymentStatus(data["status"].lower()),
                        payment_url=data["checkoutLink"],
                        address=data.get("cryptoInfo", [{}])[0].get("address", ""),
                        created_at=datetime.fromisoformat(data["createdTime"]),
                        expires_at=datetime.fromisoformat(data["expirationTime"]),
                        buyer_email=buyer_email,
                        order_id=order_id,
                        item_desc=item_description,
                        notification_url=notification_url,
                        redirect_url=redirect_url,
                        metadata=metadata
                    )
                    
                    self.invoices[invoice.id] = invoice
                    
                    return invoice
                    
        except Exception as e:
            logger.error(f"Create invoice error: {e}")
            
        return None
        
    async def get_invoice(self, invoice_id: str) -> Optional[Invoice]:
        """
        Get invoice details
        """
        try:
            headers = {
                "Authorization": f"token {self.api_key}"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/stores/{self.store_id}/invoices/{invoice_id}",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Update cached invoice
                    if invoice_id in self.invoices:
                        invoice = self.invoices[invoice_id]
                        invoice.status = PaymentStatus(data["status"].lower())
                        
                        # Update crypto info
                        crypto_info = data.get("cryptoInfo", [{}])[0]
                        invoice.crypto_amount = Decimal(crypto_info.get("cryptoPaid", "0"))
                        invoice.address = crypto_info.get("address", "")
                        
                        return invoice
                        
        except Exception as e:
            logger.error(f"Get invoice error: {e}")
            
        return None
        
    async def check_payment_status(self, invoice_id: str) -> PaymentStatus:
        """
        Check payment status
        """
        invoice = await self.get_invoice(invoice_id)
        
        if invoice:
            return invoice.status
            
        return PaymentStatus.INVALID
        
    async def get_payment_address(
        self,
        currency: CryptoCurrency = CryptoCurrency.BTC,
        label: Optional[str] = None
    ) -> Optional[str]:
        """
        Generate new payment address
        """
        try:
            headers = {
                "Authorization": f"token {self.api_key}"
            }
            
            params = {}
            if label:
                params["label"] = label
                
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/stores/{self.store_id}/payment-methods/onchain/{currency.value}/address",
                    headers=headers,
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("address")
                    
        except Exception as e:
            logger.error(f"Get payment address error: {e}")
            
        return None
        
    async def create_lightning_invoice(
        self,
        amount_sats: int,
        description: Optional[str] = None,
        expiry_seconds: int = 3600
    ) -> Optional[Dict[str, str]]:
        """
        Create Lightning Network invoice
        Instant, ultra-low fee payments
        """
        try:
            invoice_data = {
                "amount": amount_sats,
                "description": description or "Spirit Tours Payment",
                "expiry": expiry_seconds
            }
            
            headers = {
                "Authorization": f"token {self.api_key}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/stores/{self.store_id}/lightning/BTC/invoices",
                    json=invoice_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    return {
                        "payment_request": data["payment_request"],
                        "payment_hash": data["payment_hash"],
                        "amount": amount_sats,
                        "expires_at": datetime.now() + timedelta(seconds=expiry_seconds)
                    }
                    
        except Exception as e:
            logger.error(f"Create Lightning invoice error: {e}")
            
        return None
        
    async def get_exchange_rate(
        self,
        from_currency: str = "BTC",
        to_currency: str = "USD"
    ) -> Optional[Decimal]:
        """
        Get current exchange rate
        """
        cache_key = f"{from_currency}_{to_currency}"
        
        # Check cache
        if cache_key in self.exchange_rates:
            rate = self.exchange_rates[cache_key]
            if rate.updated_at > datetime.now() - timedelta(seconds=self.rates_ttl):
                return rate.rate
                
        try:
            headers = {
                "Authorization": f"token {self.api_key}"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/rates",
                    params={
                        "currencyPairs": f"{from_currency}_{to_currency}"
                    },
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data:
                        rate_data = data[0]
                        rate = ExchangeRate(
                            currency_pair=f"{from_currency}_{to_currency}",
                            rate=Decimal(str(rate_data["rate"])),
                            bid=Decimal(str(rate_data.get("bid", rate_data["rate"]))),
                            ask=Decimal(str(rate_data.get("ask", rate_data["rate"]))),
                            provider=rate_data.get("provider", "BTCPay"),
                            updated_at=datetime.now()
                        )
                        
                        self.exchange_rates[cache_key] = rate
                        return rate.rate
                        
        except Exception as e:
            logger.error(f"Get exchange rate error: {e}")
            
        return None
        
    async def create_pull_payment(
        self,
        amount: Decimal,
        currency: str = "USD",
        name: str = "Refund",
        description: Optional[str] = None,
        period: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Create pull payment (for refunds, payouts)
        """
        try:
            pull_payment_data = {
                "amount": str(amount),
                "currency": currency,
                "name": name
            }
            
            if description:
                pull_payment_data["description"] = description
            if period:
                pull_payment_data["period"] = period
                
            headers = {
                "Authorization": f"token {self.api_key}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/stores/{self.store_id}/pull-payments",
                    json=pull_payment_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    return response.json()
                    
        except Exception as e:
            logger.error(f"Create pull payment error: {e}")
            
        return None
        
    async def process_refund(
        self,
        invoice_id: str,
        amount: Optional[Decimal] = None,
        currency: Optional[str] = None
    ) -> bool:
        """
        Process refund for payment
        """
        try:
            # Get original invoice
            invoice = await self.get_invoice(invoice_id)
            
            if not invoice:
                return False
                
            refund_amount = amount or invoice.amount
            refund_currency = currency or invoice.currency
            
            # Create pull payment for refund
            pull_payment = await self.create_pull_payment(
                amount=refund_amount,
                currency=refund_currency,
                name=f"Refund for {invoice_id}",
                description=f"Refund for order {invoice.order_id}"
            )
            
            if pull_payment:
                # Update invoice status
                invoice.status = PaymentStatus.REFUNDED
                return True
                
        except Exception as e:
            logger.error(f"Process refund error: {e}")
            
        return False
        
    def generate_payment_qr(
        self,
        address: str,
        amount: Optional[Decimal] = None,
        currency: Optional[str] = None
    ) -> str:
        """
        Generate QR code for payment
        Returns base64 encoded image
        """
        # Build payment URI
        if currency and currency.upper() == "BITCOIN":
            uri = f"bitcoin:{address}"
            if amount:
                uri += f"?amount={amount}"
        else:
            uri = address
            
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4
        )
        
        qr.add_data(uri)
        qr.make(fit=True)
        
        # Create image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
        
    async def create_payment_button(
        self,
        amount: Decimal,
        currency: str = "USD",
        button_text: str = "Pay with Bitcoin",
        button_size: str = "medium",
        show_qr: bool = True
    ) -> str:
        """
        Generate embeddable payment button HTML
        """
        button_id = hashlib.sha256(
            f"{amount}{currency}{datetime.now()}".encode()
        ).hexdigest()[:16]
        
        button_html = f"""
        <div id="btcpay-button-{button_id}">
            <style>
                .btcpay-button {{
                    display: inline-block;
                    padding: {'10px 20px' if button_size == 'medium' else '15px 30px'};
                    background: linear-gradient(135deg, #f7931a 0%, #ff9900 100%);
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: transform 0.2s;
                }}
                .btcpay-button:hover {{
                    transform: scale(1.05);
                }}
                .btcpay-modal {{
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    z-index: 9999;
                }}
                .btcpay-modal-content {{
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: white;
                    padding: 20px;
                    border-radius: 10px;
                    max-width: 500px;
                    width: 90%;
                }}
            </style>
            
            <button class="btcpay-button" onclick="openBTCPayModal_{button_id}()">
                {button_text}
            </button>
            
            <div id="btcpay-modal-{button_id}" class="btcpay-modal">
                <div class="btcpay-modal-content">
                    <h3>Complete Your Payment</h3>
                    <p>Amount: {amount} {currency}</p>
                    <div id="btcpay-invoice-{button_id}"></div>
                    <button onclick="closeBTCPayModal_{button_id}()">Close</button>
                </div>
            </div>
            
            <script>
                async function openBTCPayModal_{button_id}() {{
                    const modal = document.getElementById('btcpay-modal-{button_id}');
                    modal.style.display = 'block';
                    
                    // Create invoice via API
                    const response = await fetch('/api/btcpay/create-invoice', {{
                        method: 'POST',
                        headers: {{'Content-Type': 'application/json'}},
                        body: JSON.stringify({{
                            amount: {amount},
                            currency: '{currency}'
                        }})
                    }});
                    
                    const invoice = await response.json();
                    
                    // Display payment info
                    const invoiceDiv = document.getElementById('btcpay-invoice-{button_id}');
                    invoiceDiv.innerHTML = `
                        <p>Send payment to:</p>
                        <code>${{invoice.address}}</code>
                        {'<img src="${invoice.qr_code}" alt="QR Code" />' if show_qr else ''}
                        <p>Status: <span id="payment-status-{button_id}">${{invoice.status}}</span></p>
                    `;
                    
                    // Poll for payment status
                    const pollInterval = setInterval(async () => {{
                        const statusResponse = await fetch(`/api/btcpay/invoice/${{invoice.id}}/status`);
                        const status = await statusResponse.json();
                        
                        document.getElementById('payment-status-{button_id}').textContent = status.status;
                        
                        if (status.status === 'complete' || status.status === 'confirmed') {{
                            clearInterval(pollInterval);
                            window.location.href = invoice.redirect_url || '/payment-success';
                        }}
                    }}, 5000);
                }}
                
                function closeBTCPayModal_{button_id}() {{
                    document.getElementById('btcpay-modal-{button_id}').style.display = 'none';
                }}
            </script>
        </div>
        """
        
        return button_html
        
    async def create_pos_app(
        self,
        app_name: str,
        items: List[Dict[str, Any]],
        custom_css: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create Point of Sale app
        """
        try:
            pos_data = {
                "appName": app_name,
                "title": app_name,
                "items": items,
                "showCustomAmount": True,
                "showDiscount": True,
                "enableTips": True
            }
            
            if custom_css:
                pos_data["customCSS"] = custom_css
                
            headers = {
                "Authorization": f"token {self.api_key}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/stores/{self.store_id}/apps/pos",
                    json=pos_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    return {
                        "app_id": data["id"],
                        "app_url": f"{self.server_url}/apps/{data['id']}/pos",
                        "items": items
                    }
                    
        except Exception as e:
            logger.error(f"Create POS app error: {e}")
            
        return {}
        
    async def create_crowdfunding(
        self,
        title: str,
        target_amount: Decimal,
        currency: str = "USD",
        description: Optional[str] = None,
        end_date: Optional[datetime] = None,
        perks: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Create crowdfunding campaign
        """
        try:
            crowdfund_data = {
                "title": title,
                "targetAmount": str(target_amount),
                "targetCurrency": currency,
                "description": description or "",
                "enabled": True
            }
            
            if end_date:
                crowdfund_data["endDate"] = end_date.isoformat()
                
            if perks:
                crowdfund_data["perks"] = perks
                
            headers = {
                "Authorization": f"token {self.api_key}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/stores/{self.store_id}/apps/crowdfund",
                    json=crowdfund_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    return {
                        "campaign_id": data["id"],
                        "campaign_url": f"{self.server_url}/apps/{data['id']}/crowdfund",
                        "target": target_amount,
                        "raised": 0
                    }
                    
        except Exception as e:
            logger.error(f"Create crowdfunding error: {e}")
            
        return {}
        
    async def verify_webhook(
        self,
        payload: bytes,
        signature: str,
        secret: str
    ) -> bool:
        """
        Verify webhook signature
        """
        try:
            expected_signature = hmac.new(
                secret.encode(),
                payload,
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(signature, expected_signature)
            
        except Exception as e:
            logger.error(f"Webhook verification error: {e}")
            
        return False
        
    async def handle_webhook(
        self,
        event_type: str,
        data: Dict[str, Any]
    ):
        """
        Handle webhook events
        """
        try:
            if event_type == "invoice_created":
                invoice_id = data.get("invoiceId")
                logger.info(f"Invoice created: {invoice_id}")
                
            elif event_type == "invoice_receivedPayment":
                invoice_id = data.get("invoiceId")
                logger.info(f"Payment received for invoice: {invoice_id}")
                
                # Update invoice status
                if invoice_id in self.invoices:
                    self.invoices[invoice_id].status = PaymentStatus.PROCESSING
                    
            elif event_type == "invoice_paidInFull":
                invoice_id = data.get("invoiceId")
                logger.info(f"Invoice paid in full: {invoice_id}")
                
                # Update invoice status
                if invoice_id in self.invoices:
                    self.invoices[invoice_id].status = PaymentStatus.COMPLETE
                    
                # Trigger callback if registered
                if invoice_id in self.payment_callbacks:
                    callback = self.payment_callbacks[invoice_id]
                    await callback(invoice_id, PaymentStatus.COMPLETE)
                    
            elif event_type == "invoice_confirmed":
                invoice_id = data.get("invoiceId")
                logger.info(f"Invoice confirmed: {invoice_id}")
                
                # Update invoice status
                if invoice_id in self.invoices:
                    self.invoices[invoice_id].status = PaymentStatus.CONFIRMED
                    
            elif event_type == "invoice_expired":
                invoice_id = data.get("invoiceId")
                logger.info(f"Invoice expired: {invoice_id}")
                
                # Update invoice status
                if invoice_id in self.invoices:
                    self.invoices[invoice_id].status = PaymentStatus.EXPIRED
                    
        except Exception as e:
            logger.error(f"Handle webhook error: {e}")
            
    def register_payment_callback(
        self,
        invoice_id: str,
        callback: Any
    ):
        """
        Register callback for payment completion
        """
        self.payment_callbacks[invoice_id] = callback
        
    async def get_wallet_balance(
        self,
        currency: CryptoCurrency = CryptoCurrency.BTC
    ) -> Optional[Dict[str, Decimal]]:
        """
        Get wallet balance
        """
        try:
            headers = {
                "Authorization": f"token {self.api_key}"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/stores/{self.store_id}/payment-methods/onchain/{currency.value}/wallet",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    return {
                        "total": Decimal(str(data.get("balance", 0))),
                        "available": Decimal(str(data.get("unconfirmedBalance", 0))),
                        "pending": Decimal(str(data.get("confirmedBalance", 0)))
                    }
                    
        except Exception as e:
            logger.error(f"Get wallet balance error: {e}")
            
        return None
        
    async def send_payment(
        self,
        address: str,
        amount: Decimal,
        currency: CryptoCurrency = CryptoCurrency.BTC,
        fee_rate: Optional[int] = None,
        subtract_fee: bool = False
    ) -> Optional[str]:
        """
        Send cryptocurrency payment
        """
        try:
            payment_data = {
                "destination": address,
                "amount": str(amount),
                "feeSatoshiPerByte": fee_rate or 1,
                "subtractFee": subtract_fee
            }
            
            headers = {
                "Authorization": f"token {self.api_key}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/stores/{self.store_id}/payment-methods/onchain/{currency.value}/wallet/transactions",
                    json=payment_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("transactionId")
                    
        except Exception as e:
            logger.error(f"Send payment error: {e}")
            
        return None
        

# Export service
btcpay_service = BTCPayServerService()