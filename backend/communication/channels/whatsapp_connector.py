"""
WhatsApp Business API Connector
================================

Conector para WhatsApp Business API (Cloud API o On-Premises)
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import httpx

from .base_connector import BaseChannelConnector
from ..multi_channel_gateway import NormalizedMessage, Channel

logger = logging.getLogger(__name__)


class WhatsAppConnector(BaseChannelConnector):
    """Conector para WhatsApp Business API"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.channel = Channel.WHATSAPP
        
        # Configuración
        self.api_version = config.get("api_version", "v18.0")
        self.phone_number_id = config.get("phone_number_id")
        self.access_token = config.get("access_token")
        self.business_account_id = config.get("business_account_id")
        self.webhook_verify_token = config.get("webhook_verify_token")
        
        # API endpoint
        self.api_base_url = f"https://graph.facebook.com/{self.api_version}"
        
        # HTTP client
        self.client = httpx.AsyncClient(
            timeout=30.0,
            headers={
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json",
            }
        )
        
        self.validate_config()
    
    def validate_config(self) -> bool:
        """Valida configuración de WhatsApp"""
        required = ["phone_number_id", "access_token"]
        for field in required:
            if not getattr(self, field):
                raise ValueError(f"Missing required config: {field}")
        return True
    
    async def normalize_message(self, raw_message: Dict[str, Any]) -> NormalizedMessage:
        """Normaliza mensaje de WhatsApp a formato común"""
        
        # Estructura de mensaje de WhatsApp Cloud API
        # raw_message = {
        #   "entry": [{
        #     "changes": [{
        #       "value": {
        #         "messages": [{
        #           "from": "14155552671",
        #           "id": "wamid.xxxxx",
        #           "timestamp": "1234567890",
        #           "text": {"body": "Hello"},
        #           "type": "text"
        #         }],
        #         "contacts": [{
        #           "profile": {"name": "John Doe"},
        #           "wa_id": "14155552671"
        #         }]
        #       }
        #     }]
        #   }]
        # }
        
        try:
            entry = raw_message.get("entry", [{}])[0]
            changes = entry.get("changes", [{}])[0]
            value = changes.get("value", {})
            
            messages = value.get("messages", [])
            if not messages:
                raise ValueError("No messages in webhook data")
            
            message = messages[0]
            contacts = value.get("contacts", [{}])
            contact = contacts[0] if contacts else {}
            
            # Extraer datos
            message_id = message.get("id")
            from_number = message.get("from")
            timestamp_str = message.get("timestamp")
            message_type = message.get("type", "text")
            
            # Texto del mensaje
            message_text = ""
            attachments = []
            
            if message_type == "text":
                message_text = message.get("text", {}).get("body", "")
            elif message_type == "image":
                image_data = message.get("image", {})
                attachments.append({
                    "type": "image",
                    "id": image_data.get("id"),
                    "mime_type": image_data.get("mime_type"),
                    "sha256": image_data.get("sha256"),
                    "caption": image_data.get("caption", ""),
                })
                message_text = image_data.get("caption", "[Imagen]")
            elif message_type == "video":
                video_data = message.get("video", {})
                attachments.append({
                    "type": "video",
                    "id": video_data.get("id"),
                    "mime_type": video_data.get("mime_type"),
                    "sha256": video_data.get("sha256"),
                    "caption": video_data.get("caption", ""),
                })
                message_text = video_data.get("caption", "[Video]")
            elif message_type == "audio":
                audio_data = message.get("audio", {})
                attachments.append({
                    "type": "audio",
                    "id": audio_data.get("id"),
                    "mime_type": audio_data.get("mime_type"),
                    "sha256": audio_data.get("sha256"),
                })
                message_text = "[Nota de voz]"
            elif message_type == "document":
                doc_data = message.get("document", {})
                attachments.append({
                    "type": "document",
                    "id": doc_data.get("id"),
                    "mime_type": doc_data.get("mime_type"),
                    "sha256": doc_data.get("sha256"),
                    "filename": doc_data.get("filename", "documento"),
                })
                message_text = f"[Documento: {doc_data.get('filename', 'documento')}]"
            elif message_type == "location":
                location = message.get("location", {})
                message_text = f"[Ubicación: {location.get('latitude')}, {location.get('longitude')}]"
            elif message_type == "contacts":
                message_text = "[Contacto compartido]"
            elif message_type == "button":
                button = message.get("button", {})
                message_text = button.get("text", "[Botón presionado]")
            elif message_type == "interactive":
                interactive = message.get("interactive", {})
                if interactive.get("type") == "button_reply":
                    message_text = interactive.get("button_reply", {}).get("title", "")
                elif interactive.get("type") == "list_reply":
                    message_text = interactive.get("list_reply", {}).get("title", "")
            
            # Información de contacto
            username = contact.get("profile", {}).get("name")
            
            # Timestamp
            timestamp = datetime.fromtimestamp(int(timestamp_str))
            
            return NormalizedMessage(
                message_id=message_id,
                channel=Channel.WHATSAPP,
                user_id=from_number,  # Usar número de WhatsApp como user_id
                username=username,
                message_text=message_text,
                timestamp=timestamp,
                attachments=attachments,
                metadata={
                    "message_type": message_type,
                    "raw": message,
                },
                channel_user_id=from_number,
                channel_conversation_id=from_number,  # En WhatsApp, el número es el ID de conversación
            )
            
        except Exception as e:
            logger.error(f"Error normalizing WhatsApp message: {e}", exc_info=True)
            raise
    
    async def send_message(
        self,
        recipient_id: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Envía mensaje de texto por WhatsApp"""
        
        url = f"{self.api_base_url}/{self.phone_number_id}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": recipient_id,
            "type": "text",
            "text": {
                "preview_url": True,
                "body": message,
            }
        }
        
        try:
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"Sent WhatsApp message to {recipient_id}: {data}")
            return {
                "status": "sent",
                "message_id": data.get("messages", [{}])[0].get("id"),
                "recipient_id": recipient_id,
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Error sending WhatsApp message: {e}", exc_info=True)
            raise
    
    async def send_media(
        self,
        recipient_id: str,
        media_type: str,
        media_url: str,
        caption: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Envía media por WhatsApp"""
        
        url = f"{self.api_base_url}/{self.phone_number_id}/messages"
        
        # Mapear tipos de media
        media_type_map = {
            "image": "image",
            "video": "video",
            "audio": "audio",
            "document": "document",
        }
        
        wa_media_type = media_type_map.get(media_type, "document")
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": recipient_id,
            "type": wa_media_type,
            wa_media_type: {
                "link": media_url,
            }
        }
        
        # Agregar caption si aplica
        if caption and wa_media_type in ["image", "video", "document"]:
            payload[wa_media_type]["caption"] = caption
        
        try:
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            
            return {
                "status": "sent",
                "message_id": data.get("messages", [{}])[0].get("id"),
                "recipient_id": recipient_id,
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Error sending WhatsApp media: {e}", exc_info=True)
            raise
    
    async def send_quick_replies(
        self,
        recipient_id: str,
        message: str,
        quick_replies: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """Envía mensaje con botones de respuesta rápida"""
        
        url = f"{self.api_base_url}/{self.phone_number_id}/messages"
        
        # WhatsApp soporta hasta 3 botones
        buttons = []
        for i, reply in enumerate(quick_replies[:3]):
            buttons.append({
                "type": "reply",
                "reply": {
                    "id": f"btn_{i}",
                    "title": reply.get("title", "")[:20],  # Máximo 20 caracteres
                }
            })
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": recipient_id,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {
                    "text": message
                },
                "action": {
                    "buttons": buttons
                }
            }
        }
        
        try:
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            
            return {
                "status": "sent",
                "message_id": data.get("messages", [{}])[0].get("id"),
                "recipient_id": recipient_id,
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Error sending WhatsApp quick replies: {e}", exc_info=True)
            raise
    
    async def send_typing_indicator(self, recipient_id: str):
        """Envía indicador de escritura"""
        # WhatsApp Cloud API no soporta typing indicator directamente
        # Se puede simular con un delay
        import asyncio
        await asyncio.sleep(0.5)
    
    async def mark_as_read(self, message_id: str):
        """Marca mensaje como leído"""
        
        url = f"{self.api_base_url}/{self.phone_number_id}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id,
        }
        
        try:
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            logger.debug(f"Marked WhatsApp message {message_id} as read")
            
        except httpx.HTTPError as e:
            logger.warning(f"Error marking message as read: {e}")
    
    async def handle_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Maneja webhook de WhatsApp"""
        
        # Verificar que sea un webhook de mensaje
        entry = webhook_data.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})
        
        # Verificar tipo de webhook
        if "messages" in value:
            # Mensaje entrante
            messages = value["messages"]
            for message in messages:
                # Marcar como leído
                await self.mark_as_read(message["id"])
            
            return {
                "status": "message_received",
                "count": len(messages),
            }
        
        elif "statuses" in value:
            # Actualización de estado de mensaje enviado
            statuses = value["statuses"]
            return {
                "status": "status_update",
                "count": len(statuses),
            }
        
        return {"status": "unknown"}
    
    async def verify_webhook(self, mode: str, token: str, challenge: str) -> str:
        """Verifica webhook de WhatsApp (para setup inicial)"""
        
        if mode == "subscribe" and token == self.webhook_verify_token:
            logger.info("WhatsApp webhook verified successfully")
            return challenge
        
        raise ValueError("Invalid webhook verification")
