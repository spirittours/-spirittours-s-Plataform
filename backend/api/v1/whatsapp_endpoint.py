"""
WhatsApp Business API Endpoint
Webhook para recibir y procesar mensajes de WhatsApp
"""

from fastapi import APIRouter, Request, Response, HTTPException, Depends, BackgroundTasks
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from typing import Dict, Any
import hashlib
import hmac
import logging

from ...database import get_db, get_redis
from ...services.whatsapp_business_service import WhatsAppBusinessService
from ...core.security import get_current_user
from ...models.crm_models import Employee

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/whatsapp",
    tags=["whatsapp"]
)

@router.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    redis = Depends(get_redis)
):
    """
    Webhook endpoint para recibir mensajes de WhatsApp via Twilio
    
    Este endpoint es llamado por Twilio cuando se recibe un mensaje
    """
    try:
        # Obtener datos del request
        form_data = await request.form()
        request_data = dict(form_data)
        
        # Log del mensaje recibido
        logger.info(f"WhatsApp webhook received: {request_data}")
        
        # Verificar firma de Twilio (opcional pero recomendado)
        # if not verify_twilio_signature(request, request_data):
        #     raise HTTPException(status_code=403, detail="Invalid signature")
        
        # Crear servicio de WhatsApp
        whatsapp_service = WhatsAppBusinessService(db, redis)
        
        # Procesar mensaje en background para respuesta rápida
        background_tasks.add_task(
            whatsapp_service.process_incoming_message,
            request_data
        )
        
        # Responder inmediatamente a Twilio
        return PlainTextResponse("OK", status_code=200)
        
    except Exception as e:
        logger.error(f"WhatsApp webhook error: {str(e)}")
        # No devolver error a Twilio para evitar reintentos
        return PlainTextResponse("ERROR", status_code=200)

@router.get("/webhook")
async def whatsapp_webhook_verification(request: Request):
    """
    Endpoint de verificación para configuración inicial del webhook
    
    Twilio puede llamar este endpoint para verificar que está activo
    """
    return PlainTextResponse("WhatsApp webhook is active", status_code=200)

@router.post("/send")
async def send_whatsapp_message(
    message_data: Dict[str, Any],
    db: Session = Depends(get_db),
    redis = Depends(get_redis),
    current_user: Employee = Depends(get_current_user)
):
    """
    Enviar mensaje de WhatsApp programáticamente
    
    Requiere autenticación
    """
    try:
        # Validar permisos
        if current_user.role not in ['admin', 'manager', 'supervisor']:
            raise HTTPException(
                status_code=403, 
                detail="No tiene permisos para enviar mensajes"
            )
        
        # Crear servicio
        whatsapp_service = WhatsAppBusinessService(db, redis)
        
        # Enviar mensaje
        recipient = message_data.get('to')
        message = message_data.get('message')
        media_url = message_data.get('media_url')
        
        if not recipient or not message:
            raise HTTPException(
                status_code=400,
                detail="Recipient and message are required"
            )
        
        result = await whatsapp_service._send_message(
            recipient,
            message,
            media_url
        )
        
        if result['success']:
            return {
                'success': True,
                'message': 'Message sent successfully',
                'message_sid': result['message_sid']
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send message: {result.get('error')}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending WhatsApp message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/broadcast")
async def broadcast_whatsapp_message(
    broadcast_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    redis = Depends(get_redis),
    current_user: Employee = Depends(get_current_user)
):
    """
    Enviar mensaje a múltiples destinatarios
    
    Requiere permisos de admin
    """
    try:
        # Solo admins pueden hacer broadcast
        if current_user.role != 'admin':
            raise HTTPException(
                status_code=403,
                detail="Only admins can send broadcast messages"
            )
        
        recipients = broadcast_data.get('recipients', [])
        message = broadcast_data.get('message')
        
        if not recipients or not message:
            raise HTTPException(
                status_code=400,
                detail="Recipients and message are required"
            )
        
        # Crear servicio
        whatsapp_service = WhatsAppBusinessService(db, redis)
        
        # Enviar en background
        background_tasks.add_task(
            whatsapp_service.send_broadcast,
            recipients,
            message
        )
        
        return {
            'success': True,
            'message': f'Broadcast queued for {len(recipients)} recipients'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error broadcasting WhatsApp message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def whatsapp_status(
    db: Session = Depends(get_db),
    redis = Depends(get_redis),
    current_user: Employee = Depends(get_current_user)
):
    """
    Obtener estado del servicio de WhatsApp
    """
    try:
        whatsapp_service = WhatsAppBusinessService(db, redis)
        
        # Verificar conexión con Twilio
        try:
            # Intentar obtener información de la cuenta
            account = whatsapp_service.client.api.accounts(
                whatsapp_service.account_sid
            ).fetch()
            
            twilio_status = {
                'connected': True,
                'account_status': account.status,
                'account_name': account.friendly_name
            }
        except:
            twilio_status = {
                'connected': False,
                'error': 'Could not connect to Twilio'
            }
        
        # Obtener estadísticas de sesiones activas
        active_sessions = len(whatsapp_service.user_sessions)
        
        return {
            'service': 'WhatsApp Business API',
            'status': 'active' if twilio_status['connected'] else 'error',
            'twilio': twilio_status,
            'active_sessions': active_sessions,
            'whatsapp_number': whatsapp_service.whatsapp_number,
            'nlp_enabled': whatsapp_service.use_nlp
        }
        
    except Exception as e:
        logger.error(f"Error checking WhatsApp status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test")
async def test_whatsapp_integration(
    test_data: Dict[str, Any],
    db: Session = Depends(get_db),
    redis = Depends(get_redis),
    current_user: Employee = Depends(get_current_user)
):
    """
    Endpoint de prueba para verificar la integración
    
    Solo para admins
    """
    try:
        if current_user.role != 'admin':
            raise HTTPException(
                status_code=403,
                detail="Only admins can test integration"
            )
        
        # Crear servicio
        whatsapp_service = WhatsAppBusinessService(db, redis)
        
        # Simular mensaje entrante
        test_message = {
            'From': f"whatsapp:{test_data.get('phone', current_user.phone)}",
            'To': whatsapp_service.whatsapp_number,
            'Body': test_data.get('message', 'AYUDA')
        }
        
        # Procesar mensaje
        response = await whatsapp_service.process_incoming_message(test_message)
        
        return {
            'success': True,
            'test_message': test_message,
            'response': response
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing WhatsApp integration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def verify_twilio_signature(request: Request, params: Dict) -> bool:
    """
    Verifica la firma de Twilio para seguridad
    
    Args:
        request: FastAPI request object
        params: Parámetros del request
        
    Returns:
        True si la firma es válida
    """
    try:
        # Obtener token de auth de variables de entorno
        auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        
        # Obtener firma del header
        signature = request.headers.get('X-Twilio-Signature', '')
        
        # Obtener URL
        url = str(request.url)
        
        # Construir string para validación
        data = url
        if params:
            for key in sorted(params.keys()):
                data += key + params[key]
        
        # Calcular firma esperada
        expected = hmac.new(
            auth_token.encode(),
            data.encode(),
            hashlib.sha1
        ).digest()
        
        expected_signature = base64.b64encode(expected).decode()
        
        # Comparar firmas
        return hmac.compare_digest(signature, expected_signature)
        
    except Exception as e:
        logger.error(f"Error verifying Twilio signature: {str(e)}")
        return False