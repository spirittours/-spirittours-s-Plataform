"""
Advanced Payment Orchestrator - Spirit Tours Enterprise
Orquestador principal que integra todos los servicios de pago avanzados
"""

import asyncio
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from decimal import Decimal
from dataclasses import dataclass
from enum import Enum

from .multi_currency_pricing_engine import MultiCurrencyPricingEngine, PricingContext, DynamicPrice
from .fraud_detection_system import FraudDetectionSystem, FraudContext, FraudAnalysisResult, FraudRiskLevel
from .blockchain_audit_service import BlockchainAuditService, AuditEvent, AuditEventType

logger = logging.getLogger(__name__)

class PaymentStatus(Enum):
    """Estados de pago"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    CHARGEBACK = "chargeback"

class PaymentAction(Enum):
    """Acciones de pago"""
    APPROVE = "approve"
    DECLINE = "decline"
    MANUAL_REVIEW = "manual_review"
    ADDITIONAL_VERIFICATION = "additional_verification"
    BLOCK = "block"

@dataclass
class PaymentRequest:
    """Solicitud de pago completa"""
    payment_id: str
    transaction_id: str
    user_id: str
    product_id: str
    base_amount: Decimal
    base_currency: str
    target_currency: str
    payment_method: str
    customer_email: str
    customer_ip: str
    user_agent: str
    device_fingerprint: str
    billing_country: str
    shipping_country: Optional[str] = None
    session_id: Optional[str] = None
    metadata: Dict[str, Any] = None

@dataclass
class PaymentResult:
    """Resultado del procesamiento de pago"""
    payment_id: str
    status: PaymentStatus
    action: PaymentAction
    final_amount: Decimal
    currency: str
    fraud_score: int
    fraud_reasons: List[str]
    pricing_adjustments: Dict[str, Decimal]
    audit_event_id: str
    processing_time_ms: float
    gateway_response: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

class AdvancedPaymentOrchestrator:
    """Orquestador principal de pagos avanzados"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        
        # Inicializar servicios
        self.pricing_engine = MultiCurrencyPricingEngine(
            config.get('pricing_engine', {})
        )
        self.fraud_detector = FraudDetectionSystem(
            config.get('fraud_detection', {})
        )
        self.blockchain_audit = BlockchainAuditService(
            config.get('blockchain_audit', {})
        )
        
        # Configuración de orquestador
        self.auto_approve_threshold = config.get('auto_approve_threshold', 30)
        self.manual_review_threshold = config.get('manual_review_threshold', 60)
        self.block_threshold = config.get('block_threshold', 80)
        
        self.initialized = False
    
    async def initialize(self) -> bool:
        """Inicializa todos los servicios de pago"""
        try:
            logger.info("🚀 Initializing Advanced Payment Orchestrator...")
            
            # Inicializar servicios en paralelo
            init_tasks = [
                self.pricing_engine.initialize(),
                self.fraud_detector.initialize(),
                self.blockchain_audit.initialize()
            ]
            
            results = await asyncio.gather(*init_tasks, return_exceptions=True)
            
            # Verificar resultados
            for i, result in enumerate(results):
                service_name = ["Pricing Engine", "Fraud Detector", "Blockchain Audit"][i]
                if isinstance(result, Exception):
                    logger.error(f"❌ {service_name} initialization failed: {str(result)}")
                    return False
                elif not result:
                    logger.error(f"❌ {service_name} initialization returned False")
                    return False
                else:
                    logger.info(f"✅ {service_name} initialized successfully")
            
            self.initialized = True
            logger.info("✅ Advanced Payment Orchestrator initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize payment orchestrator: {str(e)}")
            return False
    
    async def process_payment(self, request: PaymentRequest) -> PaymentResult:
        """Procesa un pago completo con todos los controles avanzados"""
        start_time = datetime.now()
        
        try:
            if not self.initialized:
                raise Exception("Payment orchestrator not initialized")
            
            logger.info(f"💳 Processing payment: {request.payment_id}")
            
            # 1. Registrar inicio de pago en audit
            audit_event = AuditEvent(
                event_id=None,  # Se asignará automáticamente
                event_type=AuditEventType.PAYMENT_INITIATED,
                timestamp=datetime.now(),
                transaction_id=request.transaction_id,
                user_id=request.user_id,
                amount=request.base_amount,
                currency=request.base_currency,
                payment_method=request.payment_method,
                status="initiated",
                metadata={
                    "payment_id": request.payment_id,
                    "product_id": request.product_id,
                    "target_currency": request.target_currency,
                    "customer_email": request.customer_email,
                    "billing_country": request.billing_country
                },
                ip_address=request.customer_ip,
                user_agent=request.user_agent,
                session_id=request.session_id
            )
            
            audit_event_id = await self.blockchain_audit.record_payment_event(audit_event)
            
            # 2. Calcular precio dinámico
            pricing_result = await self._calculate_dynamic_pricing(request)
            
            # 3. Análisis de fraude
            fraud_result = await self._analyze_fraud_risk(request, pricing_result)
            
            # 4. Determinar acción basada en riesgo
            action = self._determine_payment_action(fraud_result)
            
            # 5. Procesar según la acción determinada
            if action == PaymentAction.APPROVE:
                payment_status = await self._process_approved_payment(request, pricing_result)
            elif action == PaymentAction.DECLINE or action == PaymentAction.BLOCK:
                payment_status = PaymentStatus.FAILED
                await self._record_declined_payment(request, fraud_result)
            else:  # MANUAL_REVIEW o ADDITIONAL_VERIFICATION
                payment_status = PaymentStatus.PENDING
                await self._initiate_manual_review(request, fraud_result)
            
            # 6. Calcular tiempo de procesamiento
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            
            # 7. Crear resultado final
            result = PaymentResult(
                payment_id=request.payment_id,
                status=payment_status,
                action=action,
                final_amount=pricing_result.final_price,
                currency=pricing_result.currency,
                fraud_score=fraud_result.risk_score,
                fraud_reasons=[reason.value for reason in fraud_result.reasons],
                pricing_adjustments=pricing_result.adjustments,
                audit_event_id=audit_event_id,
                processing_time_ms=processing_time
            )
            
            # 8. Registrar resultado en audit
            await self._record_payment_result(request, result)
            
            logger.info(f"✅ Payment processed: {request.payment_id} - {action.value}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error processing payment {request.payment_id}: {str(e)}")
            
            # Registrar error en audit
            try:
                error_event = AuditEvent(
                    event_id=None,
                    event_type=AuditEventType.PAYMENT_FAILED,
                    timestamp=datetime.now(),
                    transaction_id=request.transaction_id,
                    user_id=request.user_id,
                    amount=request.base_amount,
                    currency=request.base_currency,
                    payment_method=request.payment_method,
                    status="error",
                    metadata={"error": str(e), "payment_id": request.payment_id},
                    ip_address=request.customer_ip
                )
                await self.blockchain_audit.record_payment_event(error_event)
            except:
                pass  # No fallar si audit falla
            
            # Retornar resultado de error
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            return PaymentResult(
                payment_id=request.payment_id,
                status=PaymentStatus.FAILED,
                action=PaymentAction.DECLINE,
                final_amount=request.base_amount,
                currency=request.base_currency,
                fraud_score=100,
                fraud_reasons=["system_error"],
                pricing_adjustments={},
                audit_event_id="",
                processing_time_ms=processing_time,
                error_message=str(e)
            )
    
    async def _calculate_dynamic_pricing(self, request: PaymentRequest) -> DynamicPrice:
        """Calcula precio dinámico usando el motor de precios"""
        try:
            # Preparar contexto de pricing
            pricing_context = PricingContext(
                product_id=request.product_id,
                base_price=request.base_amount,
                base_currency=request.base_currency,
                target_currency=request.target_currency,
                customer_location=request.billing_country,
                customer_segment=request.metadata.get('customer_segment') if request.metadata else None,
                booking_date=datetime.now(),
                travel_date=request.metadata.get('travel_date') if request.metadata else None,
                group_size=request.metadata.get('group_size', 1) if request.metadata else 1,
                customer_lifetime_value=request.metadata.get('customer_clv', 0.0) if request.metadata else 0.0
            )
            
            # Calcular precio dinámico
            dynamic_price = await self.pricing_engine.calculate_dynamic_price(pricing_context)
            
            logger.info(f"💰 Dynamic pricing calculated: {dynamic_price.final_price} {dynamic_price.currency}")
            return dynamic_price
            
        except Exception as e:
            logger.error(f"❌ Error calculating dynamic pricing: {str(e)}")
            # Fallback a precio base con conversión simple
            return DynamicPrice(
                original_price=request.base_amount,
                final_price=request.base_amount,  # Sin conversión de emergencia
                currency=request.base_currency,
                exchange_rate=Decimal("1.0"),
                adjustments={},
                strategy_used="fallback",
                confidence_score=0.5,
                expires_at=datetime.now() + timedelta(minutes=15),
                calculation_time=datetime.now(),
                metadata={"error": str(e)}
            )
    
    async def _analyze_fraud_risk(self, request: PaymentRequest, pricing: DynamicPrice) -> FraudAnalysisResult:
        """Analiza riesgo de fraude"""
        try:
            # Preparar contexto de fraude
            fraud_context = FraudContext(
                transaction_id=request.transaction_id,
                user_id=request.user_id,
                email=request.customer_email,
                amount=pricing.final_price,
                currency=pricing.currency,
                payment_method=request.payment_method,
                ip_address=request.customer_ip,
                user_agent=request.user_agent,
                device_fingerprint=request.device_fingerprint,
                billing_country=request.billing_country,
                shipping_country=request.shipping_country,
                transaction_time=datetime.now(),
                session_id=request.session_id,
                previous_transactions=request.metadata.get('previous_transactions', 0) if request.metadata else 0,
                account_age_days=request.metadata.get('account_age_days', 0) if request.metadata else 0
            )
            
            # Analizar fraude
            fraud_result = await self.fraud_detector.analyze_transaction(fraud_context)
            
            logger.info(f"🔍 Fraud analysis completed: {fraud_result.risk_level.value} (score: {fraud_result.risk_score})")
            return fraud_result
            
        except Exception as e:
            logger.error(f"❌ Error analyzing fraud risk: {str(e)}")
            # Fallback a riesgo alto por seguridad
            return FraudAnalysisResult(
                transaction_id=request.transaction_id,
                risk_level=FraudRiskLevel.HIGH,
                risk_score=80,
                is_fraudulent=True,
                triggered_rules=["SYSTEM_ERROR"],
                reasons=[],
                confidence=0.0,
                analysis_time_ms=0.0,
                recommended_action="manual_review",
                metadata={"error": str(e)},
                ml_scores={}
            )
    
    def _determine_payment_action(self, fraud_result: FraudAnalysisResult) -> PaymentAction:
        """Determina la acción a tomar basada en el riesgo de fraude"""
        risk_score = fraud_result.risk_score
        
        if risk_score >= self.block_threshold:
            return PaymentAction.BLOCK
        elif risk_score >= self.manual_review_threshold:
            return PaymentAction.MANUAL_REVIEW
        elif risk_score >= self.auto_approve_threshold:
            return PaymentAction.ADDITIONAL_VERIFICATION
        else:
            return PaymentAction.APPROVE
    
    async def _process_approved_payment(self, request: PaymentRequest, pricing: DynamicPrice) -> PaymentStatus:
        """Procesa un pago aprobado"""
        try:
            # En implementación real, procesar con gateway de pago
            logger.info(f"💳 Processing approved payment: {request.payment_id}")
            
            # Simular procesamiento exitoso
            await asyncio.sleep(0.1)  # Simular latencia de gateway
            
            return PaymentStatus.COMPLETED
            
        except Exception as e:
            logger.error(f"❌ Error processing approved payment: {str(e)}")
            return PaymentStatus.FAILED
    
    async def _record_declined_payment(self, request: PaymentRequest, fraud_result: FraudAnalysisResult):
        """Registra un pago rechazado"""
        try:
            decline_event = AuditEvent(
                event_id=None,
                event_type=AuditEventType.FRAUD_DETECTED,
                timestamp=datetime.now(),
                transaction_id=request.transaction_id,
                user_id=request.user_id,
                amount=request.base_amount,
                currency=request.base_currency,
                payment_method=request.payment_method,
                status="declined",
                metadata={
                    "fraud_score": fraud_result.risk_score,
                    "fraud_reasons": [reason.value for reason in fraud_result.reasons],
                    "triggered_rules": fraud_result.triggered_rules
                },
                ip_address=request.customer_ip
            )
            
            await self.blockchain_audit.record_payment_event(decline_event)
            
        except Exception as e:
            logger.error(f"❌ Error recording declined payment: {str(e)}")
    
    async def _initiate_manual_review(self, request: PaymentRequest, fraud_result: FraudAnalysisResult):
        """Inicia proceso de revisión manual"""
        try:
            review_event = AuditEvent(
                event_id=None,
                event_type=AuditEventType.COMPLIANCE_CHECK,
                timestamp=datetime.now(),
                transaction_id=request.transaction_id,
                user_id=request.user_id,
                amount=request.base_amount,
                currency=request.base_currency,
                payment_method=request.payment_method,
                status="manual_review_initiated",
                metadata={
                    "fraud_score": fraud_result.risk_score,
                    "review_priority": "high" if fraud_result.risk_score > 70 else "medium"
                },
                ip_address=request.customer_ip
            )
            
            await self.blockchain_audit.record_payment_event(review_event)
            
            # En implementación real, enviar a cola de revisión manual
            logger.info(f"📋 Manual review initiated for payment: {request.payment_id}")
            
        except Exception as e:
            logger.error(f"❌ Error initiating manual review: {str(e)}")
    
    async def _record_payment_result(self, request: PaymentRequest, result: PaymentResult):
        """Registra el resultado final del pago"""
        try:
            if result.status == PaymentStatus.COMPLETED:
                event_type = AuditEventType.PAYMENT_COMPLETED
            else:
                event_type = AuditEventType.PAYMENT_FAILED
            
            result_event = AuditEvent(
                event_id=None,
                event_type=event_type,
                timestamp=datetime.now(),
                transaction_id=request.transaction_id,
                user_id=request.user_id,
                amount=result.final_amount,
                currency=result.currency,
                payment_method=request.payment_method,
                status=result.status.value,
                metadata={
                    "payment_id": result.payment_id,
                    "action": result.action.value,
                    "fraud_score": result.fraud_score,
                    "processing_time_ms": result.processing_time_ms,
                    "pricing_adjustments": {k: str(v) for k, v in result.pricing_adjustments.items()}
                },
                ip_address=request.customer_ip
            )
            
            await self.blockchain_audit.record_payment_event(result_event)
            
        except Exception as e:
            logger.error(f"❌ Error recording payment result: {str(e)}")
    
    # Métodos públicos adicionales
    async def get_payment_analytics(self, days: int = 30) -> Dict[str, Any]:
        """Obtiene analytics de pagos"""
        try:
            # Obtener analytics de cada servicio
            pricing_analytics = await self.pricing_engine.get_pricing_analytics("all", days)
            fraud_stats = await self.fraud_detector.get_fraud_statistics(days)
            audit_stats = await self.blockchain_audit.get_audit_statistics()
            
            # Combinar analytics
            analytics = {
                "period_days": days,
                "pricing_analytics": pricing_analytics,
                "fraud_statistics": fraud_stats,
                "audit_statistics": audit_stats,
                "orchestrator_config": {
                    "auto_approve_threshold": self.auto_approve_threshold,
                    "manual_review_threshold": self.manual_review_threshold,
                    "block_threshold": self.block_threshold
                },
                "generated_at": datetime.now().isoformat()
            }
            
            return analytics
            
        except Exception as e:
            logger.error(f"❌ Error getting payment analytics: {str(e)}")
            return {}
    
    async def process_refund(self, payment_id: str, amount: Decimal, reason: str) -> Dict[str, Any]:
        """Procesa un reembolso"""
        try:
            refund_event = AuditEvent(
                event_id=None,
                event_type=AuditEventType.PAYMENT_REFUNDED,
                timestamp=datetime.now(),
                transaction_id=payment_id,
                user_id="system",
                amount=amount,
                currency="USD",  # En implementación real, obtener de BD
                payment_method="refund",
                status="refunded",
                metadata={"refund_reason": reason, "original_payment_id": payment_id}
            )
            
            audit_event_id = await self.blockchain_audit.record_payment_event(refund_event)
            
            # En implementación real, procesar refund con gateway
            
            return {
                "refund_id": str(uuid.uuid4()),
                "status": "completed",
                "audit_event_id": audit_event_id,
                "processed_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error processing refund: {str(e)}")
            raise
    
    async def verify_payment_integrity(self, payment_id: str) -> Dict[str, Any]:
        """Verifica la integridad de un pago usando blockchain"""
        try:
            audit_trail = await self.blockchain_audit.verify_audit_trail(payment_id)
            
            return {
                "payment_id": payment_id,
                "verification_status": audit_trail.verification_status,
                "total_events": len(audit_trail.events),
                "blockchain_hashes": audit_trail.blockchain_hashes,
                "verified_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error verifying payment integrity: {str(e)}")
            return {"verification_status": False, "error": str(e)}
    
    async def close(self):
        """Cierra todos los servicios"""
        try:
            close_tasks = [
                self.pricing_engine.close(),
                self.fraud_detector.close(),
                self.blockchain_audit.close()
            ]
            
            await asyncio.gather(*close_tasks, return_exceptions=True)
            
            logger.info("✅ Advanced Payment Orchestrator closed successfully")
            
        except Exception as e:
            logger.error(f"❌ Error closing payment orchestrator: {str(e)}")


# Factory para crear instancias
class PaymentOrchestratorFactory:
    """Factory para crear orquestador de pagos"""
    
    @staticmethod
    def create_orchestrator(config: Dict[str, Any]) -> AdvancedPaymentOrchestrator:
        """Crea una instancia del orquestador"""
        return AdvancedPaymentOrchestrator(config)