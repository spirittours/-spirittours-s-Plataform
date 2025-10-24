"""
Payment Gateway Service for Spirit Tours
Multi-provider payment processing with deposit tracking
"""

import os
import logging
import asyncio
import hashlib
import hmac
import json
from typing import Dict, Optional, Any, List
from datetime import datetime, timedelta
from enum import Enum
from decimal import Decimal
import uuid

# Payment provider SDKs
try:
    import stripe
    STRIPE_AVAILABLE = True
except ImportError:
    STRIPE_AVAILABLE = False

try:
    import paypalrestsdk
    PAYPAL_AVAILABLE = True
except ImportError:
    PAYPAL_AVAILABLE = False

try:
    import mercadopago
    MERCADOPAGO_AVAILABLE = True
except ImportError:
    MERCADOPAGO_AVAILABLE = False

logger = logging.getLogger(__name__)


class PaymentProvider(Enum):
    """Proveedores de pago soportados"""
    STRIPE = "stripe"
    PAYPAL = "paypal"
    MERCADOPAGO = "mercadopago"
    PAYU = "payu"
    SQUARE = "square"
    AUTHORIZE_NET = "authorize_net"
    BANK_TRANSFER = "bank_transfer"


class PaymentStatus(Enum):
    """Estados de pago"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class PaymentType(Enum):
    """Tipos de pago"""
    DEPOSIT = "deposit"
    PARTIAL = "partial"
    FULL = "full"
    REFUND = "refund"


class PaymentGatewayService:
    """
    Servicio unificado de pasarelas de pago
    Maneja múltiples proveedores según el país
    """
    
    def __init__(self):
        """Inicializar servicio con configuraciones"""
        
        # Configuraciones por proveedor
        self.configs = {
            PaymentProvider.STRIPE: {
                "api_key": os.getenv("STRIPE_SECRET_KEY"),
                "webhook_secret": os.getenv("STRIPE_WEBHOOK_SECRET"),
                "enabled": STRIPE_AVAILABLE and bool(os.getenv("STRIPE_SECRET_KEY"))
            },
            PaymentProvider.PAYPAL: {
                "client_id": os.getenv("PAYPAL_CLIENT_ID"),
                "client_secret": os.getenv("PAYPAL_CLIENT_SECRET"),
                "mode": os.getenv("PAYPAL_MODE", "sandbox"),
                "enabled": PAYPAL_AVAILABLE and bool(os.getenv("PAYPAL_CLIENT_ID"))
            },
            PaymentProvider.MERCADOPAGO: {
                "access_token": os.getenv("MERCADOPAGO_ACCESS_TOKEN"),
                "public_key": os.getenv("MERCADOPAGO_PUBLIC_KEY"),
                "enabled": MERCADOPAGO_AVAILABLE and bool(os.getenv("MERCADOPAGO_ACCESS_TOKEN"))
            }
        }
        
        # Mapeo de países a proveedores preferidos
        self.country_providers = {
            "US": [PaymentProvider.STRIPE, PaymentProvider.PAYPAL, PaymentProvider.SQUARE],
            "MX": [PaymentProvider.MERCADOPAGO, PaymentProvider.STRIPE, PaymentProvider.PAYPAL],
            "ES": [PaymentProvider.STRIPE, PaymentProvider.PAYPAL, PaymentProvider.PAYU],
            "AR": [PaymentProvider.MERCADOPAGO],
            "BR": [PaymentProvider.MERCADOPAGO, PaymentProvider.PAYU],
            "CO": [PaymentProvider.MERCADOPAGO, PaymentProvider.PAYU],
            "CL": [PaymentProvider.MERCADOPAGO],
            "PE": [PaymentProvider.MERCADOPAGO, PaymentProvider.PAYU],
            "AE": [PaymentProvider.STRIPE, PaymentProvider.PAYPAL],
            "IL": [PaymentProvider.STRIPE, PaymentProvider.PAYPAL]
        }
        
        # Inicializar proveedores
        self._initialize_providers()
        
        # Cache de transacciones
        self.transaction_cache: Dict[str, Dict[str, Any]] = {}
        
        # Configuración de depósitos
        self.deposit_config = {
            "min_amount": 500,
            "max_amount": 10000,
            "default_percentage": 0.20,  # 20% del total
            "currencies": ["USD", "EUR", "MXN", "ARS", "BRL", "COP", "PEN", "ILS", "AED"]
        }
        
        logger.info("Payment Gateway Service inicializado")
        
    def _initialize_providers(self):
        """Inicializar SDKs de proveedores"""
        
        # Inicializar Stripe
        if self.configs[PaymentProvider.STRIPE]["enabled"]:
            stripe.api_key = self.configs[PaymentProvider.STRIPE]["api_key"]
            logger.info("Stripe inicializado")
            
        # Inicializar PayPal
        if self.configs[PaymentProvider.PAYPAL]["enabled"]:
            paypalrestsdk.configure({
                "mode": self.configs[PaymentProvider.PAYPAL]["mode"],
                "client_id": self.configs[PaymentProvider.PAYPAL]["client_id"],
                "client_secret": self.configs[PaymentProvider.PAYPAL]["client_secret"]
            })
            logger.info(f"PayPal inicializado en modo {self.configs[PaymentProvider.PAYPAL]['mode']}")
            
        # Inicializar MercadoPago
        if self.configs[PaymentProvider.MERCADOPAGO]["enabled"]:
            sdk = mercadopago.SDK(self.configs[PaymentProvider.MERCADOPAGO]["access_token"])
            self.mercadopago_sdk = sdk
            logger.info("MercadoPago inicializado")
            
    async def process_deposit(
        self,
        quotation_id: str,
        amount: Decimal,
        currency: str,
        payment_method: Dict[str, Any],
        customer_info: Dict[str, Any],
        country_code: str = "US",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Procesar pago de depósito para una cotización
        
        Args:
            quotation_id: ID de la cotización
            amount: Monto del depósito
            currency: Moneda (USD, EUR, MXN, etc)
            payment_method: Información del método de pago
            customer_info: Información del cliente
            country_code: Código del país para seleccionar proveedor
            metadata: Metadatos adicionales
            
        Returns:
            Dict con resultado del procesamiento
        """
        try:
            # Validar monto
            if amount < self.deposit_config["min_amount"]:
                raise ValueError(f"El depósito mínimo es {self.deposit_config['min_amount']} {currency}")
                
            if amount > self.deposit_config["max_amount"]:
                raise ValueError(f"El depósito máximo es {self.deposit_config['max_amount']} {currency}")
                
            # Seleccionar proveedor según país
            provider = self._select_provider(country_code, payment_method.get("type"))
            
            # Crear transacción
            transaction_id = f"TXN-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
            
            transaction_data = {
                "transaction_id": transaction_id,
                "quotation_id": quotation_id,
                "amount": float(amount),
                "currency": currency,
                "type": PaymentType.DEPOSIT.value,
                "provider": provider.value,
                "status": PaymentStatus.PENDING.value,
                "customer_info": customer_info,
                "payment_method": payment_method,
                "metadata": metadata or {},
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            # Guardar en cache
            self.transaction_cache[transaction_id] = transaction_data
            
            # Procesar según proveedor
            if provider == PaymentProvider.STRIPE:
                result = await self._process_stripe_payment(transaction_data)
            elif provider == PaymentProvider.PAYPAL:
                result = await self._process_paypal_payment(transaction_data)
            elif provider == PaymentProvider.MERCADOPAGO:
                result = await self._process_mercadopago_payment(transaction_data)
            else:
                result = await self._process_bank_transfer(transaction_data)
                
            # Actualizar transacción
            transaction_data.update(result)
            transaction_data["updated_at"] = datetime.now().isoformat()
            
            # Log de auditoría
            logger.info(f"Depósito procesado: {transaction_id} - {result['status']}")
            
            return transaction_data
            
        except Exception as e:
            logger.error(f"Error procesando depósito: {e}")
            raise
            
    async def _process_stripe_payment(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Procesar pago con Stripe"""
        try:
            # Crear Payment Intent
            intent = stripe.PaymentIntent.create(
                amount=int(transaction_data["amount"] * 100),  # Stripe usa centavos
                currency=transaction_data["currency"].lower(),
                payment_method_types=["card"],
                metadata={
                    "transaction_id": transaction_data["transaction_id"],
                    "quotation_id": transaction_data["quotation_id"],
                    "type": transaction_data["type"]
                },
                description=f"Depósito para cotización {transaction_data['quotation_id']}"
            )
            
            # Si hay método de pago, confirmar inmediatamente
            if transaction_data["payment_method"].get("stripe_payment_method_id"):
                intent = stripe.PaymentIntent.confirm(
                    intent.id,
                    payment_method=transaction_data["payment_method"]["stripe_payment_method_id"]
                )
                
            return {
                "status": PaymentStatus.PROCESSING.value if intent.status == "processing" 
                         else PaymentStatus.COMPLETED.value if intent.status == "succeeded"
                         else PaymentStatus.PENDING.value,
                "provider_reference": intent.id,
                "client_secret": intent.client_secret,
                "provider_response": {
                    "id": intent.id,
                    "status": intent.status,
                    "amount": intent.amount / 100
                }
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Error Stripe: {e}")
            return {
                "status": PaymentStatus.FAILED.value,
                "error": str(e),
                "provider_response": {"error": str(e)}
            }
            
    async def _process_paypal_payment(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Procesar pago con PayPal"""
        try:
            # Crear pago
            payment = paypalrestsdk.Payment({
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": f"{os.getenv('BASE_URL')}/payments/paypal/success",
                    "cancel_url": f"{os.getenv('BASE_URL')}/payments/paypal/cancel"
                },
                "transactions": [{
                    "amount": {
                        "total": str(transaction_data["amount"]),
                        "currency": transaction_data["currency"]
                    },
                    "description": f"Depósito para cotización {transaction_data['quotation_id']}"
                }]
            })
            
            if payment.create():
                # Obtener URL de aprobación
                approval_url = None
                for link in payment.links:
                    if link.rel == "approval_url":
                        approval_url = link.href
                        break
                        
                return {
                    "status": PaymentStatus.PENDING.value,
                    "provider_reference": payment.id,
                    "approval_url": approval_url,
                    "provider_response": {
                        "id": payment.id,
                        "state": payment.state
                    }
                }
            else:
                return {
                    "status": PaymentStatus.FAILED.value,
                    "error": payment.error,
                    "provider_response": {"error": payment.error}
                }
                
        except Exception as e:
            logger.error(f"Error PayPal: {e}")
            return {
                "status": PaymentStatus.FAILED.value,
                "error": str(e),
                "provider_response": {"error": str(e)}
            }
            
    async def _process_mercadopago_payment(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Procesar pago con MercadoPago"""
        try:
            # Crear preferencia de pago
            preference_data = {
                "items": [
                    {
                        "title": f"Depósito - Cotización {transaction_data['quotation_id']}",
                        "quantity": 1,
                        "unit_price": float(transaction_data["amount"])
                    }
                ],
                "payer": {
                    "name": transaction_data["customer_info"].get("name", ""),
                    "email": transaction_data["customer_info"].get("email", "")
                },
                "back_urls": {
                    "success": f"{os.getenv('BASE_URL')}/payments/mercadopago/success",
                    "failure": f"{os.getenv('BASE_URL')}/payments/mercadopago/failure",
                    "pending": f"{os.getenv('BASE_URL')}/payments/mercadopago/pending"
                },
                "auto_return": "approved",
                "external_reference": transaction_data["transaction_id"]
            }
            
            preference_response = self.mercadopago_sdk.preference().create(preference_data)
            preference = preference_response["response"]
            
            return {
                "status": PaymentStatus.PENDING.value,
                "provider_reference": preference["id"],
                "init_point": preference.get("init_point"),  # URL de pago
                "sandbox_init_point": preference.get("sandbox_init_point"),
                "provider_response": {
                    "id": preference["id"],
                    "collector_id": preference.get("collector_id")
                }
            }
            
        except Exception as e:
            logger.error(f"Error MercadoPago: {e}")
            return {
                "status": PaymentStatus.FAILED.value,
                "error": str(e),
                "provider_response": {"error": str(e)}
            }
            
    async def _process_bank_transfer(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Procesar transferencia bancaria"""
        # Generar referencia única
        reference = f"REF-{transaction_data['quotation_id']}-{uuid.uuid4().hex[:6].upper()}"
        
        # Información bancaria según país/moneda
        bank_info = self._get_bank_info(transaction_data["currency"])
        
        return {
            "status": PaymentStatus.PENDING.value,
            "provider_reference": reference,
            "payment_instructions": {
                "reference": reference,
                "amount": transaction_data["amount"],
                "currency": transaction_data["currency"],
                "bank_info": bank_info,
                "expires_at": (datetime.now() + timedelta(days=3)).isoformat()
            },
            "provider_response": {
                "type": "bank_transfer",
                "reference": reference
            }
        }
        
    def _select_provider(self, country_code: str, payment_type: Optional[str] = None) -> PaymentProvider:
        """
        Seleccionar proveedor de pago según país
        """
        # Obtener proveedores para el país
        providers = self.country_providers.get(country_code, [PaymentProvider.STRIPE])
        
        # Filtrar proveedores habilitados
        enabled_providers = [
            p for p in providers 
            if p in self.configs and self.configs[p].get("enabled", False)
        ]
        
        # Si no hay proveedores habilitados, usar transferencia bancaria
        if not enabled_providers:
            return PaymentProvider.BANK_TRANSFER
            
        # Retornar el primero disponible
        return enabled_providers[0]
        
    def _get_bank_info(self, currency: str) -> Dict[str, Any]:
        """Obtener información bancaria según moneda"""
        bank_accounts = {
            "USD": {
                "bank_name": "Bank of America",
                "account_name": "Spirit Tours LLC",
                "account_number": "****1234",
                "routing_number": "026009593",
                "swift": "BOFAUS3N"
            },
            "MXN": {
                "bank_name": "BBVA México",
                "account_name": "Spirit Tours SA de CV",
                "clabe": "012180001234567890",
                "account_number": "****5678"
            },
            "EUR": {
                "bank_name": "Banco Santander",
                "account_name": "Spirit Tours SL",
                "iban": "ES91 2100 0418 4502 0005 1332",
                "swift": "BSCHESMM"
            }
        }
        
        return bank_accounts.get(currency, bank_accounts["USD"])
        
    async def handle_webhook(
        self,
        provider: PaymentProvider,
        headers: Dict[str, str],
        body: bytes
    ) -> Dict[str, Any]:
        """
        Manejar webhooks de proveedores de pago
        
        Args:
            provider: Proveedor del webhook
            headers: Headers de la petición
            body: Body raw de la petición
            
        Returns:
            Dict con resultado del procesamiento
        """
        try:
            if provider == PaymentProvider.STRIPE:
                return await self._handle_stripe_webhook(headers, body)
            elif provider == PaymentProvider.PAYPAL:
                return await self._handle_paypal_webhook(headers, body)
            elif provider == PaymentProvider.MERCADOPAGO:
                return await self._handle_mercadopago_webhook(headers, body)
            else:
                raise ValueError(f"Proveedor no soportado: {provider}")
                
        except Exception as e:
            logger.error(f"Error procesando webhook: {e}")
            raise
            
    async def _handle_stripe_webhook(self, headers: Dict[str, str], body: bytes) -> Dict[str, Any]:
        """Manejar webhook de Stripe"""
        try:
            # Verificar firma
            sig_header = headers.get("stripe-signature")
            webhook_secret = self.configs[PaymentProvider.STRIPE]["webhook_secret"]
            
            event = stripe.Webhook.construct_event(
                body, sig_header, webhook_secret
            )
            
            # Procesar evento
            if event["type"] == "payment_intent.succeeded":
                payment_intent = event["data"]["object"]
                transaction_id = payment_intent["metadata"].get("transaction_id")
                
                if transaction_id and transaction_id in self.transaction_cache:
                    # Actualizar transacción
                    self.transaction_cache[transaction_id]["status"] = PaymentStatus.COMPLETED.value
                    self.transaction_cache[transaction_id]["completed_at"] = datetime.now().isoformat()
                    
                    return {
                        "status": "success",
                        "transaction_id": transaction_id,
                        "event": event["type"]
                    }
                    
            elif event["type"] == "payment_intent.payment_failed":
                payment_intent = event["data"]["object"]
                transaction_id = payment_intent["metadata"].get("transaction_id")
                
                if transaction_id and transaction_id in self.transaction_cache:
                    self.transaction_cache[transaction_id]["status"] = PaymentStatus.FAILED.value
                    self.transaction_cache[transaction_id]["failed_at"] = datetime.now().isoformat()
                    
            return {
                "status": "processed",
                "event": event["type"]
            }
            
        except Exception as e:
            logger.error(f"Error en webhook Stripe: {e}")
            raise
            
    async def _handle_paypal_webhook(self, headers: Dict[str, str], body: bytes) -> Dict[str, Any]:
        """Manejar webhook de PayPal"""
        try:
            # Parsear body
            data = json.loads(body)
            
            # Verificar evento
            if data.get("event_type") == "PAYMENT.CAPTURE.COMPLETED":
                resource = data.get("resource", {})
                reference = resource.get("custom_id")
                
                # Buscar transacción por referencia
                for tid, tdata in self.transaction_cache.items():
                    if tdata.get("provider_reference") == reference:
                        tdata["status"] = PaymentStatus.COMPLETED.value
                        tdata["completed_at"] = datetime.now().isoformat()
                        break
                        
            return {
                "status": "processed",
                "event": data.get("event_type")
            }
            
        except Exception as e:
            logger.error(f"Error en webhook PayPal: {e}")
            raise
            
    async def _handle_mercadopago_webhook(self, headers: Dict[str, str], body: bytes) -> Dict[str, Any]:
        """Manejar webhook de MercadoPago"""
        try:
            # Parsear body
            data = json.loads(body)
            
            # Procesar notificación
            if data.get("type") == "payment":
                payment_id = data.get("data", {}).get("id")
                
                # Obtener detalles del pago
                payment_info = self.mercadopago_sdk.payment().get(payment_id)
                
                if payment_info["response"]:
                    payment = payment_info["response"]
                    external_reference = payment.get("external_reference")
                    
                    # Actualizar transacción
                    if external_reference and external_reference in self.transaction_cache:
                        status_map = {
                            "approved": PaymentStatus.COMPLETED.value,
                            "pending": PaymentStatus.PENDING.value,
                            "rejected": PaymentStatus.FAILED.value,
                            "cancelled": PaymentStatus.CANCELLED.value
                        }
                        
                        new_status = status_map.get(payment["status"], PaymentStatus.PENDING.value)
                        self.transaction_cache[external_reference]["status"] = new_status
                        self.transaction_cache[external_reference]["updated_at"] = datetime.now().isoformat()
                        
            return {
                "status": "processed",
                "type": data.get("type")
            }
            
        except Exception as e:
            logger.error(f"Error en webhook MercadoPago: {e}")
            raise
            
    async def get_transaction_status(self, transaction_id: str) -> Optional[Dict[str, Any]]:
        """
        Obtener estado de una transacción
        """
        return self.transaction_cache.get(transaction_id)
        
    async def refund_payment(
        self,
        transaction_id: str,
        amount: Optional[Decimal] = None,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Procesar reembolso total o parcial
        """
        try:
            # Obtener transacción original
            transaction = self.transaction_cache.get(transaction_id)
            if not transaction:
                raise ValueError(f"Transacción no encontrada: {transaction_id}")
                
            # Validar que se pueda reembolsar
            if transaction["status"] != PaymentStatus.COMPLETED.value:
                raise ValueError("Solo se pueden reembolsar pagos completados")
                
            # Determinar monto
            refund_amount = amount or Decimal(str(transaction["amount"]))
            
            # Procesar según proveedor
            provider = PaymentProvider(transaction["provider"])
            
            if provider == PaymentProvider.STRIPE:
                result = await self._refund_stripe(transaction, float(refund_amount))
            elif provider == PaymentProvider.PAYPAL:
                result = await self._refund_paypal(transaction, float(refund_amount))
            elif provider == PaymentProvider.MERCADOPAGO:
                result = await self._refund_mercadopago(transaction, float(refund_amount))
            else:
                result = {
                    "status": "manual_refund_required",
                    "message": "Contacte al departamento financiero"
                }
                
            # Crear registro de reembolso
            refund_data = {
                "refund_id": f"RFD-{uuid.uuid4().hex[:8].upper()}",
                "transaction_id": transaction_id,
                "amount": float(refund_amount),
                "reason": reason,
                "status": result.get("status"),
                "created_at": datetime.now().isoformat(),
                "provider_response": result
            }
            
            # Actualizar estado de transacción
            if result.get("status") == "completed":
                if refund_amount >= Decimal(str(transaction["amount"])):
                    transaction["status"] = PaymentStatus.REFUNDED.value
                else:
                    transaction["status"] = PaymentStatus.PARTIALLY_REFUNDED.value
                    
            return refund_data
            
        except Exception as e:
            logger.error(f"Error procesando reembolso: {e}")
            raise
            
    async def _refund_stripe(self, transaction: Dict[str, Any], amount: float) -> Dict[str, Any]:
        """Procesar reembolso con Stripe"""
        try:
            refund = stripe.Refund.create(
                payment_intent=transaction["provider_reference"],
                amount=int(amount * 100)  # Stripe usa centavos
            )
            
            return {
                "status": "completed" if refund.status == "succeeded" else "pending",
                "provider_reference": refund.id,
                "amount": refund.amount / 100
            }
            
        except Exception as e:
            logger.error(f"Error reembolso Stripe: {e}")
            return {"status": "failed", "error": str(e)}
            
    async def _refund_paypal(self, transaction: Dict[str, Any], amount: float) -> Dict[str, Any]:
        """Procesar reembolso con PayPal"""
        # Implementación específica de PayPal
        return {"status": "pending", "message": "PayPal refund initiated"}
        
    async def _refund_mercadopago(self, transaction: Dict[str, Any], amount: float) -> Dict[str, Any]:
        """Procesar reembolso con MercadoPago"""
        try:
            refund = self.mercadopago_sdk.refund().create(
                transaction["provider_reference"],
                {"amount": amount}
            )
            
            return {
                "status": "completed" if refund["response"]["status"] == "approved" else "pending",
                "provider_reference": refund["response"]["id"]
            }
            
        except Exception as e:
            logger.error(f"Error reembolso MercadoPago: {e}")
            return {"status": "failed", "error": str(e)}
            
    def get_payment_stats(self) -> Dict[str, Any]:
        """
        Obtener estadísticas de pagos
        """
        total_transactions = len(self.transaction_cache)
        
        if total_transactions == 0:
            return {
                "total_transactions": 0,
                "by_status": {},
                "by_provider": {},
                "total_amount": 0
            }
            
        # Calcular estadísticas
        by_status = {}
        by_provider = {}
        total_amount = 0
        
        for transaction in self.transaction_cache.values():
            # Por estado
            status = transaction["status"]
            by_status[status] = by_status.get(status, 0) + 1
            
            # Por proveedor
            provider = transaction["provider"]
            by_provider[provider] = by_provider.get(provider, 0) + 1
            
            # Total si está completado
            if transaction["status"] == PaymentStatus.COMPLETED.value:
                total_amount += transaction["amount"]
                
        return {
            "total_transactions": total_transactions,
            "by_status": by_status,
            "by_provider": by_provider,
            "total_amount": total_amount,
            "timestamp": datetime.now().isoformat()
        }


# Instancia global del servicio
payment_service = PaymentGatewayService()