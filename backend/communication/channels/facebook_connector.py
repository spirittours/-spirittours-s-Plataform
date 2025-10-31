"""
Facebook Messenger Connector
=============================

Conector para Facebook Messenger API con soporte de:
- Mensajes de texto, imágenes, videos, audio
- Quick replies y botones
- Templates (generic, button, receipt)
- Webhook verification
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import httpx
import hmac
import hashlib

from .base_connector import BaseChannelConnector
from ..multi_channel_gateway import NormalizedMessage, Channel

logger = logging.getLogger(__name__)


class FacebookMessengerConnector(BaseChannelConnector):
    """Conector para Facebook Messenger API"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.channel = Channel.FACEBOOK
        
        # Configuración
        self.page_access_token = config.get("page_access_token")
        self.app_secret = config.get("app_secret")
        self.verify_token = config.get("verify_token")
        self.api_version = config.get("api_version", "v18.0")
        
        # API endpoint
        self.api_base_url = f"https://graph.facebook.com/{self.api_version}"
        
        # HTTP client
        self.client = httpx.AsyncClient(
            timeout=30.0,
            headers={
                "Content-Type": "application/json",
            }
        )
        
        self.validate_config()
    
    def validate_config(self) -> bool:
        """Valida configuración de Facebook"""
        required = ["page_access_token", "verify_token"]
        for field in required:
            if not getattr(self, field):
                raise ValueError(f"Missing required config: {field}")
        return True
    
    def verify_signature(self, payload: bytes, signature: str) -> bool:
        """Verifica firma HMAC de webhook"""
        if not self.app_secret:
            logger.warning("No app_secret configured, skipping signature verification")
            return True
        
        expected_signature = hmac.new(
            self.app_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        # Signature viene como "sha256=..."
        signature = signature.replace("sha256=", "")
        
        return hmac.compare_digest(expected_signature, signature)
    
    async def normalize_message(self, raw_message: Dict[str, Any]) -> NormalizedMessage:
        """
        Normaliza mensaje de Facebook Messenger
        
        Facebook webhook structure:
        {
            "object": "page",
            "entry": [{
                "id": "PAGE_ID",
                "time": 1234567890,
                "messaging": [{
                    "sender": {"id": "USER_ID"},
                    "recipient": {"id": "PAGE_ID"},
                    "timestamp": 1234567890,
                    "message": {
                        "mid": "MESSAGE_ID",
                        "text": "Hello",
                        "attachments": [...]
                    }
                }]
            }]
        }
        """
        
        try:
            entry = raw_message.get("entry", [{}])[0]
            messaging = entry.get("messaging", [{}])[0]
            
            sender = messaging.get("sender", {})
            message = messaging.get("message", {})
            
            if not message:
                # Puede ser postback, read, delivery, etc.
                raise ValueError("No message in messaging event")
            
            user_id = sender.get("id")
            message_id = message.get("mid")
            timestamp = datetime.fromtimestamp(messaging.get("timestamp", 0) / 1000)
            
            # Obtener nombre del usuario (requiere API call)
            username = await self._get_user_profile(user_id)
            
            # Extraer contenido
            message_text = message.get("text", "")
            attachments = []
            
            # Procesar attachments
            if "attachments" in message:
                for attachment in message["attachments"]:
                    att_type = attachment.get("type")
                    payload = attachment.get("payload", {})
                    
                    if att_type == "image":
                        attachments.append({
                            "type": "image",
                            "url": payload.get("url"),
                        })
                        if not message_text:
                            message_text = "[Imagen]"
                    
                    elif att_type == "video":
                        attachments.append({
                            "type": "video",
                            "url": payload.get("url"),
                        })
                        if not message_text:
                            message_text = "[Video]"
                    
                    elif att_type == "audio":
                        attachments.append({
                            "type": "audio",
                            "url": payload.get("url"),
                        })
                        if not message_text:
                            message_text = "[Audio]"
                    
                    elif att_type == "file":
                        attachments.append({
                            "type": "file",
                            "url": payload.get("url"),
                        })
                        if not message_text:
                            message_text = "[Archivo]"
                    
                    elif att_type == "location":
                        coords = payload.get("coordinates", {})
                        message_text = f"[Ubicación: {coords.get('lat')}, {coords.get('long')}]"
            
            # Quick reply
            if "quick_reply" in message:
                quick_reply = message["quick_reply"]
                message_text = quick_reply.get("payload", message_text)
            
            return NormalizedMessage(
                message_id=message_id,
                channel=Channel.FACEBOOK,
                user_id=user_id,
                username=username,
                message_text=message_text,
                timestamp=timestamp,
                attachments=attachments,
                metadata={
                    "raw": messaging,
                },
                channel_user_id=user_id,
                channel_conversation_id=user_id,  # En Messenger, user_id es conversation_id
            )
            
        except Exception as e:
            logger.error(f"Error normalizing Facebook message: {e}", exc_info=True)
            raise
    
    async def _get_user_profile(self, user_id: str) -> str:
        """Obtiene perfil del usuario de Facebook"""
        
        url = f"{self.api_base_url}/{user_id}"
        params = {
            "fields": "first_name,last_name",
            "access_token": self.page_access_token,
        }
        
        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            first_name = data.get("first_name", "")
            last_name = data.get("last_name", "")
            
            return f"{first_name} {last_name}".strip() or "Usuario"
            
        except Exception as e:
            logger.warning(f"Could not fetch user profile: {e}")
            return "Usuario"
    
    async def send_message(
        self,
        recipient_id: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Envía mensaje de texto por Facebook Messenger"""
        
        url = f"{self.api_base_url}/me/messages"
        params = {"access_token": self.page_access_token}
        
        payload = {
            "recipient": {"id": recipient_id},
            "message": {"text": message},
        }
        
        # Quick replies si hay
        if metadata and "quick_replies" in metadata:
            payload["message"]["quick_replies"] = metadata["quick_replies"]
        
        try:
            response = await self.client.post(url, params=params, json=payload)
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"Sent Facebook message to {recipient_id}: {data.get('message_id')}")
            return {
                "status": "sent",
                "message_id": data.get("message_id"),
                "recipient_id": data.get("recipient_id"),
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Error sending Facebook message: {e}", exc_info=True)
            raise
    
    async def send_media(
        self,
        recipient_id: str,
        media_type: str,
        media_url: str,
        caption: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Envía media por Facebook Messenger"""
        
        url = f"{self.api_base_url}/me/messages"
        params = {"access_token": self.page_access_token}
        
        # Mapear tipos
        type_map = {
            "image": "image",
            "photo": "image",
            "video": "video",
            "audio": "audio",
            "document": "file",
            "file": "file",
        }
        
        fb_type = type_map.get(media_type, "file")
        
        attachment = {
            "type": fb_type,
            "payload": {"url": media_url}
        }
        
        payload = {
            "recipient": {"id": recipient_id},
            "message": {"attachment": attachment},
        }
        
        try:
            response = await self.client.post(url, params=params, json=payload)
            response.raise_for_status()
            data = response.json()
            
            # Si hay caption, enviar como mensaje separado
            if caption:
                await self.send_message(recipient_id, caption)
            
            return {
                "status": "sent",
                "message_id": data.get("message_id"),
                "recipient_id": data.get("recipient_id"),
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Error sending Facebook media: {e}", exc_info=True)
            raise
    
    async def send_quick_replies(
        self,
        recipient_id: str,
        message: str,
        quick_replies: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """Envía mensaje con quick replies"""
        
        # Convertir a formato de Facebook
        fb_quick_replies = []
        
        for reply in quick_replies[:13]:  # Facebook permite máximo 13
            fb_quick_replies.append({
                "content_type": "text",
                "title": reply.get("title", "")[:20],  # Máximo 20 caracteres
                "payload": reply.get("payload", reply.get("title", "")),
            })
        
        return await self.send_message(
            recipient_id=recipient_id,
            message=message,
            metadata={"quick_replies": fb_quick_replies},
        )
    
    async def send_typing_indicator(self, recipient_id: str):
        """Envía indicador de 'typing_on'"""
        
        url = f"{self.api_base_url}/me/messages"
        params = {"access_token": self.page_access_token}
        
        payload = {
            "recipient": {"id": recipient_id},
            "sender_action": "typing_on",
        }
        
        try:
            response = await self.client.post(url, params=params, json=payload)
            response.raise_for_status()
            logger.debug(f"Sent typing indicator to {recipient_id}")
            
        except httpx.HTTPError as e:
            logger.warning(f"Error sending typing indicator: {e}")
    
    async def mark_as_read(self, message_id: str):
        """Marca mensaje como visto"""
        
        # Facebook requiere sender_action con el recipient_id, no message_id
        # Esto se maneja mejor en el contexto de la conversación
        pass
    
    async def send_template(
        self,
        recipient_id: str,
        template_type: str,
        elements: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Envía template (generic, button, receipt, etc.)
        
        Args:
            recipient_id: ID del destinatario
            template_type: Tipo de template (generic, button, receipt, etc.)
            elements: Lista de elementos del template
        """
        
        url = f"{self.api_base_url}/me/messages"
        params = {"access_token": self.page_access_token}
        
        payload = {
            "recipient": {"id": recipient_id},
            "message": {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": template_type,
                        "elements": elements,
                    }
                }
            }
        }
        
        try:
            response = await self.client.post(url, params=params, json=payload)
            response.raise_for_status()
            data = response.json()
            
            return {
                "status": "sent",
                "message_id": data.get("message_id"),
                "recipient_id": data.get("recipient_id"),
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Error sending Facebook template: {e}", exc_info=True)
            raise
    
    async def handle_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Maneja webhook de Facebook"""
        
        object_type = webhook_data.get("object")
        
        if object_type != "page":
            return {"status": "ignored", "reason": "Not a page event"}
        
        entry = webhook_data.get("entry", [{}])[0]
        messaging = entry.get("messaging", [])
        
        event_types = []
        
        for event in messaging:
            if "message" in event:
                event_types.append("message")
            elif "postback" in event:
                event_types.append("postback")
            elif "delivery" in event:
                event_types.append("delivery")
            elif "read" in event:
                event_types.append("read")
        
        logger.info(f"Received Facebook events: {event_types}")
        
        return {
            "status": "received",
            "event_types": event_types,
            "count": len(messaging),
        }
    
    async def verify_webhook(self, mode: str, token: str, challenge: str) -> str:
        """Verifica webhook de Facebook (para setup inicial)"""
        
        if mode == "subscribe" and token == self.verify_token:
            logger.info("Facebook webhook verified successfully")
            return challenge
        
        raise ValueError("Invalid webhook verification")
