"""
Advanced Payments API - Spirit Tours Enterprise
API endpoints para el sistema de pagos avanzados con multi-currency, fraud detection y blockchain audit
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field, validator
from typing import Dict, Any, List, Optional
from decimal import Decimal
from datetime import datetime
import logging
import uuid

from ..services.payments.advanced_payment_orchestrator import (
    AdvancedPaymentOrchestrator, 
    PaymentRequest, 
    PaymentResult,
    PaymentOrchestratorFactory
)

logger = logging.getLogger(__name__)

# Inicializar router
router = APIRouter(prefix="/api/v1/payments/advanced", tags=["Advanced Payments"])

# Configuración global del orquestador
orchestrator_config = {
    "pricing_engine": {
        "redis_url": "redis://localhost:6379/1",
        "fixer_api_key": "your_fixer_api_key",
        "oxr_api_key": "your_oxr_api_key"
    },
    "fraud_detection": {
        "redis_url": "redis://localhost:6379/2"
    },
    "blockchain_audit": {
        "blockchain_network": "private_chain",
        "validator_id": "spirit-tours-audit-node"
    },
    "auto_approve_threshold": 30,
    "manual_review_threshold": 60,
    "block_threshold": 80
}

# Instancia global del orquestador
payment_orchestrator = None

# Modelos Pydantic
class PaymentRequestModel(BaseModel):
    """Modelo de solicitud de pago"""
    user_id: str = Field(..., description="ID del usuario")
    product_id: str = Field(..., description="ID del producto/servicio")
    base_amount: Decimal = Field(..., gt=0, description="Monto base")
    base_currency: str = Field(..., min_length=3, max_length=3, description="Moneda base (ISO 4217)")
    target_currency: str = Field(..., min_length=3, max_length=3, description="Moneda objetivo (ISO 4217)")
    payment_method: str = Field(..., description="Método de pago")
    customer_email: str = Field(..., description="Email del cliente")
    customer_ip: str = Field(..., description="IP del cliente")
    user_agent: str = Field(..., description="User Agent del cliente")
    device_fingerprint: str = Field(..., description="Huella digital del dispositivo")
    billing_country: str = Field(..., min_length=2, max_length=2, description="País de facturación (ISO 3166)")
    shipping_country: Optional[str] = Field(None, min_length=2, max_length=2, description="País de envío (ISO 3166)")
    session_id: Optional[str] = Field(None, description="ID de sesión")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Metadatos adicionales")
    
    @validator('customer_email')
    def validate_email(cls, v):
        if '@' not in v or '.' not in v:
            raise ValueError('Email inválido')
        return v.lower()
    
    @validator('base_currency', 'target_currency')
    def validate_currency(cls, v):
        return v.upper()
    
    @validator('billing_country', 'shipping_country')
    def validate_country(cls, v):
        if v:
            return v.upper()
        return v

class PaymentResponseModel(BaseModel):
    """Modelo de respuesta de pago"""
    payment_id: str
    status: str
    action: str
    final_amount: Decimal
    currency: str
    fraud_score: int
    fraud_reasons: List[str]
    pricing_adjustments: Dict[str, str]  # Convertido a string para JSON
    audit_event_id: str
    processing_time_ms: float
    gateway_response: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

class FraudAnalysisRequestModel(BaseModel):
    """Modelo para análisis de fraude standalone"""
    transaction_id: str
    user_id: str
    email: str
    amount: Decimal
    currency: str
    payment_method: str
    ip_address: str
    user_agent: str
    device_fingerprint: str
    billing_country: str
    shipping_country: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class PricingRequestModel(BaseModel):
    """Modelo para cálculo de precios dinámicos"""
    product_id: str
    base_price: Decimal
    base_currency: str
    target_currency: str
    customer_location: Optional[str] = None
    customer_segment: Optional[str] = None
    travel_date: Optional[datetime] = None
    group_size: int = Field(default=1, ge=1)
    customer_lifetime_value: float = Field(default=0.0, ge=0.0)

class RefundRequestModel(BaseModel):
    """Modelo para solicitudes de reembolso"""
    payment_id: str = Field(..., description="ID del pago original")
    amount: Decimal = Field(..., gt=0, description="Monto a reembolsar")
    reason: str = Field(..., min_length=3, description="Razón del reembolso")
    requested_by: str = Field(..., description="Usuario que solicita el reembolso")

# Dependency para obtener el orquestador
async def get_payment_orchestrator() -> AdvancedPaymentOrchestrator:
    """Dependency para obtener instancia del orquestrador de pagos"""
    global payment_orchestrator
    
    if payment_orchestrator is None:
        payment_orchestrator = PaymentOrchestratorFactory.create_orchestrator(orchestrator_config)
        
        # Inicializar si no está inicializado
        if not payment_orchestrator.initialized:
            success = await payment_orchestrator.initialize()
            if not success:
                raise HTTPException(
                    status_code=500, 
                    detail="Failed to initialize payment orchestrator"
                )
    
    return payment_orchestrator

# Endpoints principales
@router.post("/process", response_model=PaymentResponseModel)
async def process_payment(
    payment_request: PaymentRequestModel,
    background_tasks: BackgroundTasks,
    orchestrator: AdvancedPaymentOrchestrator = Depends(get_payment_orchestrator)
):
    """
    Procesa un pago completo con pricing dinámico, detección de fraude y auditoría blockchain
    """
    try:
        # Generar IDs únicos
        payment_id = str(uuid.uuid4())
        transaction_id = f"txn_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        
        # Crear solicitud de pago
        request = PaymentRequest(
            payment_id=payment_id,
            transaction_id=transaction_id,
            user_id=payment_request.user_id,
            product_id=payment_request.product_id,
            base_amount=payment_request.base_amount,
            base_currency=payment_request.base_currency,
            target_currency=payment_request.target_currency,
            payment_method=payment_request.payment_method,
            customer_email=payment_request.customer_email,
            customer_ip=payment_request.customer_ip,
            user_agent=payment_request.user_agent,
            device_fingerprint=payment_request.device_fingerprint,
            billing_country=payment_request.billing_country,
            shipping_country=payment_request.shipping_country,
            session_id=payment_request.session_id,
            metadata=payment_request.metadata or {}
        )
        
        # Procesar pago
        result = await orchestrator.process_payment(request)
        
        # Convertir resultado para respuesta
        response = PaymentResponseModel(
            payment_id=result.payment_id,
            status=result.status.value,
            action=result.action.value,
            final_amount=result.final_amount,
            currency=result.currency,
            fraud_score=result.fraud_score,
            fraud_reasons=result.fraud_reasons,
            pricing_adjustments={k: str(v) for k, v in result.pricing_adjustments.items()},
            audit_event_id=result.audit_event_id,
            processing_time_ms=result.processing_time_ms,
            gateway_response=result.gateway_response,
            error_message=result.error_message
        )
        
        # Tareas en background si es necesario
        if result.action.value == "manual_review":
            background_tasks.add_task(
                _notify_manual_review_team, 
                payment_id, 
                result.fraud_score
            )
        
        return response
        
    except Exception as e:
        logger.error(f"❌ Error in process_payment endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Payment processing failed: {str(e)}")

@router.post("/fraud-analysis")
async def analyze_fraud_risk(
    fraud_request: FraudAnalysisRequestModel,
    orchestrator: AdvancedPaymentOrchestrator = Depends(get_payment_orchestrator)
):
    """
    Realiza análisis de fraude independiente para una transacción
    """
    try:
        from ..services.payments.fraud_detection_system import FraudContext
        
        # Crear contexto de fraude
        context = FraudContext(
            transaction_id=fraud_request.transaction_id,
            user_id=fraud_request.user_id,
            email=fraud_request.email,
            amount=fraud_request.amount,
            currency=fraud_request.currency,
            payment_method=fraud_request.payment_method,
            ip_address=fraud_request.ip_address,
            user_agent=fraud_request.user_agent,
            device_fingerprint=fraud_request.device_fingerprint,
            billing_country=fraud_request.billing_country,
            shipping_country=fraud_request.shipping_country,
            transaction_time=datetime.now(),
            previous_transactions=fraud_request.metadata.get('previous_transactions', 0) if fraud_request.metadata else 0,
            account_age_days=fraud_request.metadata.get('account_age_days', 0) if fraud_request.metadata else 0
        )
        
        # Analizar fraude
        result = await orchestrator.fraud_detector.analyze_transaction(context)
        
        return {
            "transaction_id": result.transaction_id,
            "risk_level": result.risk_level.value,
            "risk_score": result.risk_score,
            "is_fraudulent": result.is_fraudulent,
            "triggered_rules": result.triggered_rules,
            "reasons": [reason.value for reason in result.reasons],
            "confidence": result.confidence,
            "analysis_time_ms": result.analysis_time_ms,
            "recommended_action": result.recommended_action,
            "ml_scores": result.ml_scores
        }
        
    except Exception as e:
        logger.error(f"❌ Error in fraud analysis endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Fraud analysis failed: {str(e)}")

@router.post("/pricing/calculate")
async def calculate_dynamic_pricing(
    pricing_request: PricingRequestModel,
    orchestrator: AdvancedPaymentOrchestrator = Depends(get_payment_orchestrator)
):
    """
    Calcula precio dinámico con múltiples factores
    """
    try:
        from ..services.payments.multi_currency_pricing_engine import PricingContext
        
        # Crear contexto de pricing
        context = PricingContext(
            product_id=pricing_request.product_id,
            base_price=pricing_request.base_price,
            base_currency=pricing_request.base_currency,
            target_currency=pricing_request.target_currency,
            customer_location=pricing_request.customer_location,
            customer_segment=pricing_request.customer_segment,
            booking_date=datetime.now(),
            travel_date=pricing_request.travel_date,
            group_size=pricing_request.group_size,
            customer_lifetime_value=pricing_request.customer_lifetime_value
        )
        
        # Calcular precio dinámico
        result = await orchestrator.pricing_engine.calculate_dynamic_price(context)
        
        return {
            "original_price": str(result.original_price),
            "final_price": str(result.final_price),
            "currency": result.currency,
            "exchange_rate": str(result.exchange_rate),
            "adjustments": {k: str(v) for k, v in result.adjustments.items()},
            "strategy_used": result.strategy_used,
            "confidence_score": result.confidence_score,
            "expires_at": result.expires_at.isoformat(),
            "calculation_time": result.calculation_time.isoformat(),
            "metadata": result.metadata
        }
        
    except Exception as e:
        logger.error(f"❌ Error in pricing calculation endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Pricing calculation failed: {str(e)}")

@router.post("/refund")
async def process_refund(
    refund_request: RefundRequestModel,
    orchestrator: AdvancedPaymentOrchestrator = Depends(get_payment_orchestrator)
):
    """
    Procesa un reembolso con auditoría blockchain
    """
    try:
        result = await orchestrator.process_refund(
            payment_id=refund_request.payment_id,
            amount=refund_request.amount,
            reason=f"{refund_request.reason} (requested by: {refund_request.requested_by})"
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error in refund processing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Refund processing failed: {str(e)}")

@router.get("/verify/{payment_id}")
async def verify_payment_integrity(
    payment_id: str,
    orchestrator: AdvancedPaymentOrchestrator = Depends(get_payment_orchestrator)
):
    """
    Verifica la integridad de un pago usando blockchain
    """
    try:
        result = await orchestrator.verify_payment_integrity(payment_id)
        return result
        
    except Exception as e:
        logger.error(f"❌ Error verifying payment integrity: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {str(e)}")

@router.get("/analytics")
async def get_payment_analytics(
    days: int = 30,
    orchestrator: AdvancedPaymentOrchestrator = Depends(get_payment_orchestrator)
):
    """
    Obtiene analytics completos del sistema de pagos
    """
    try:
        if days < 1 or days > 365:
            raise HTTPException(status_code=400, detail="Days must be between 1 and 365")
        
        analytics = await orchestrator.get_payment_analytics(days)
        return analytics
        
    except Exception as e:
        logger.error(f"❌ Error getting payment analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analytics retrieval failed: {str(e)}")

@router.get("/currencies/supported")
async def get_supported_currencies(
    orchestrator: AdvancedPaymentOrchestrator = Depends(get_payment_orchestrator)
):
    """
    Obtiene lista de monedas soportadas
    """
    try:
        currencies = await orchestrator.pricing_engine.get_supported_currencies()
        return {"supported_currencies": currencies}
        
    except Exception as e:
        logger.error(f"❌ Error getting supported currencies: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Currency list retrieval failed: {str(e)}")

@router.get("/fraud/statistics")
async def get_fraud_statistics(
    days: int = 30,
    orchestrator: AdvancedPaymentOrchestrator = Depends(get_payment_orchestrator)
):
    """
    Obtiene estadísticas de detección de fraude
    """
    try:
        if days < 1 or days > 365:
            raise HTTPException(status_code=400, detail="Days must be between 1 and 365")
        
        stats = await orchestrator.fraud_detector.get_fraud_statistics(days)
        return stats
        
    except Exception as e:
        logger.error(f"❌ Error getting fraud statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Fraud statistics retrieval failed: {str(e)}")

@router.get("/blockchain/compliance-report")
async def generate_compliance_report(
    start_date: datetime,
    end_date: datetime,
    orchestrator: AdvancedPaymentOrchestrator = Depends(get_payment_orchestrator)
):
    """
    Genera reporte de cumplimiento blockchain para auditorías
    """
    try:
        if start_date >= end_date:
            raise HTTPException(status_code=400, detail="Start date must be before end date")
        
        report = await orchestrator.blockchain_audit.get_compliance_report(start_date, end_date)
        return report
        
    except Exception as e:
        logger.error(f"❌ Error generating compliance report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Compliance report generation failed: {str(e)}")

@router.get("/health")
async def health_check():
    """
    Verifica el estado del sistema de pagos avanzados
    """
    try:
        global payment_orchestrator
        
        status = {
            "service": "Advanced Payments System",
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "components": {
                "orchestrator": "initialized" if payment_orchestrator and payment_orchestrator.initialized else "not_initialized",
                "pricing_engine": "ready",
                "fraud_detector": "ready", 
                "blockchain_audit": "ready"
            }
        }
        
        if payment_orchestrator and payment_orchestrator.initialized:
            # Obtener estadísticas adicionales
            try:
                audit_stats = await payment_orchestrator.blockchain_audit.get_audit_statistics()
                status["blockchain_stats"] = audit_stats
            except:
                pass
        
        return status
        
    except Exception as e:
        logger.error(f"❌ Error in health check: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

# Funciones auxiliares
async def _notify_manual_review_team(payment_id: str, fraud_score: int):
    """Notifica al equipo de revisión manual"""
    try:
        # En implementación real, enviar notificación (email, Slack, etc.)
        logger.info(f"🔔 Manual review notification sent for payment {payment_id} (fraud score: {fraud_score})")
        
    except Exception as e:
        logger.error(f"❌ Error sending manual review notification: {str(e)}")

# Event handlers para startup/shutdown
@router.on_event("startup")
async def startup_event():
    """Inicializa el sistema al arrancar"""
    try:
        logger.info("🚀 Starting Advanced Payments API...")
        
        # Pre-inicializar el orquestador
        global payment_orchestrator
        payment_orchestrator = PaymentOrchestratorFactory.create_orchestrator(orchestrator_config)
        
        success = await payment_orchestrator.initialize()
        if success:
            logger.info("✅ Advanced Payments API started successfully")
        else:
            logger.error("❌ Failed to start Advanced Payments API")
            
    except Exception as e:
        logger.error(f"❌ Startup error: {str(e)}")

@router.on_event("shutdown") 
async def shutdown_event():
    """Cierra el sistema al terminar"""
    try:
        logger.info("🔄 Shutting down Advanced Payments API...")
        
        global payment_orchestrator
        if payment_orchestrator:
            await payment_orchestrator.close()
        
        logger.info("✅ Advanced Payments API shutdown complete")
        
    except Exception as e:
        logger.error(f"❌ Shutdown error: {str(e)}")