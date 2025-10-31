"""
Instagram Direct Messages Connector
====================================

Conector para Instagram Messaging API (parte de Facebook Graph API)
Soporta:
- Mensajes de texto, imágenes, videos
- Stories replies
- Quick replies
- Icebreakers
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import httpx

from .base_connector import BaseChannelConnector
from ..multi_channel_gateway import NormalizedMessage, Channel

logger = logging.getLogger(__name__)


class InstagramConnector(BaseChannelConnector):
    """Conector para Instagram Messaging API"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.channel = Channel.INSTAGRAM
        
        # Configuración
        self.page_access_token = config.get("page_access_token")
        self.instagram_account_id = config.get("instagram_account_id")
        self.verify_token = config.get("verify_token")
        self.api_version = config.get("api_version", "v18.0")
        
        # API endpoint
        self.api_base_url = f"https://graph.facebook.com/{self.api_version}"
        
        # HTTP client
        self.client = httpx.AsyncClient(
            timeout=30.0,
            headers={"Content-Type": "application/json"}
        )
        
        self.validate_config()
    
    def validate_config(self) -> bool:
        """Valida configuración de Instagram"""
        required = ["page_access_token", "instagram_account_id"]
        for field in required:
            if not getattr(self, field):
                raise ValueError(f"Missing required config: {field}")
        return True
    
    async def normalize_message(self, raw_message: Dict[str, Any]) -> NormalizedMessage:
        """
        Normaliza mensaje de Instagram
        
        Instagram webhook structure (similar a Facebook Messenger):
        {
            "object": "instagram",
            "entry": [{
                "id": "INSTAGRAM_ACCOUNT_ID",
                "time": 1234567890,
                "messaging": [{
                    "sender": {"id": "USER_IGID"},
                    "recipient": {"id": "PAGE_IGID"},
                    "timestamp": 1234567890,
                    "message": {
                        "mid": "MESSAGE_ID",
                        "text": "Hello",
                        "attachments": [...],
                        "is_echo": false
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
                raise ValueError("No message in messaging event")
            
            user_id = sender.get("id")
            message_id = message.get("mid")
            timestamp = datetime.fromtimestamp(messaging.get("timestamp", 0) / 1000)
            
            # Obtener nombre del usuario
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
                    
                    elif att_type == "story_mention":
                        message_text = "[Mención en historia]"
                    
                    elif att_type == "share":
                        message_text = "[Contenido compartido]"
            
            # Story reply
            if message.get("reply_to"):
                reply_to = message["reply_to"]
                if reply_to.get("story"):
                    message_text = f"[Respuesta a historia]: {message_text}"
            
            return NormalizedMessage(
                message_id=message_id,
                channel=Channel.INSTAGRAM,
                user_id=user_id,
                username=username,
                message_text=message_text,
                timestamp=timestamp,
                attachments=attachments,
                metadata={
                    "is_echo": message.get("is_echo", False),
                    "raw": messaging,
                },
                channel_user_id=user_id,
                channel_conversation_id=user_id,
            )
            
        except Exception as e:
            logger.error(f"Error normalizing Instagram message: {e}", exc_info=True)
            raise
    
    async def _get_user_profile(self, user_id: str) -> str:
        """Obtiene perfil del usuario de Instagram"""
        
        url = f"{self.api_base_url}/{user_id}"
        params = {
            "fields": "name,username",
            "access_token": self.page_access_token,
        }
        
        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            name = data.get("name") or data.get("username", "Usuario")
            return name
            
        except Exception as e:
            logger.warning(f"Could not fetch Instagram user profile: {e}")
            return "Usuario"
    
    async def send_message(
        self,
        recipient_id: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Envía mensaje de texto por Instagram"""
        
        url = f"{self.api_base_url}/me/messages"
        params = {"access_token": self.page_access_token}
        
        payload = {
            "recipient": {"id": recipient_id},
            "message": {"text": message},
        }
        
        try:
            response = await self.client.post(url, params=params, json=payload)
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"Sent Instagram message to {recipient_id}: {data.get('message_id')}")
            return {
                "status": "sent",
                "message_id": data.get("message_id"),
                "recipient_id": data.get("recipient_id"),
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Error sending Instagram message: {e}", exc_info=True)
            raise
    
    async def send_media(
        self,
        recipient_id: str,
        media_type: str,
        media_url: str,
        caption: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Envía media por Instagram"""
        
        url = f"{self.api_base_url}/me/messages"
        params = {"access_token": self.page_access_token}
        
        # Instagram soporta image, video, audio, file
        type_map = {
            "image": "image",
            "photo": "image",
            "video": "video",
            "audio": "audio",
            "document": "file",
            "file": "file",
        }
        
        ig_type = type_map.get(media_type, "file")
        
        attachment = {
            "type": ig_type,
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
            logger.error(f"Error sending Instagram media: {e}", exc_info=True)
            raise
    
    async def send_quick_replies(
        self,
        recipient_id: str,
        message: str,
        quick_replies: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """
        Envía mensaje con quick replies
        
        Instagram soporta máximo 13 quick replies
        """
        
        url = f"{self.api_base_url}/me/messages"
        params = {"access_token": self.page_access_token}
        
        # Convertir a formato de Instagram (igual que Facebook)
        ig_quick_replies = []
        
        for reply in quick_replies[:13]:
            ig_quick_replies.append({
                "content_type": "text",
                "title": reply.get("title", "")[:20],
                "payload": reply.get("payload", reply.get("title", "")),
            })
        
        payload = {
            "recipient": {"id": recipient_id},
            "message": {
                "text": message,
                "quick_replies": ig_quick_replies,
            },
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
            logger.error(f"Error sending Instagram quick replies: {e}", exc_info=True)
            raise
    
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
        
        url = f"{self.api_base_url}/me/messages"
        params = {"access_token": self.page_access_token}
        
        payload = {
            "recipient": {"id": message_id},  # En Instagram, se usa recipient_id
            "sender_action": "mark_seen",
        }
        
        try:
            response = await self.client.post(url, params=params, json=payload)
            response.raise_for_status()
            logger.debug(f"Marked Instagram message as read")
            
        except httpx.HTTPError as e:
            logger.warning(f"Error marking message as read: {e}")
    
    async def set_ice_breakers(self, ice_breakers: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Configura ice breakers (mensajes de inicio sugeridos)
        
        Args:
            ice_breakers: Lista de hasta 4 ice breakers con "question" y "payload"
        """
        
        url = f"{self.api_base_url}/me/messenger_profile"
        params = {"access_token": self.page_access_token}
        
        payload = {
            "ice_breakers": [
                {
                    "question": ib.get("question", "")[:80],  # Máximo 80 caracteres
                    "payload": ib.get("payload", ""),
                }
                for ib in ice_breakers[:4]  # Máximo 4
            ]
        }
        
        try:
            response = await self.client.post(url, params=params, json=payload)
            response.raise_for_status()
            data = response.json()
            
            logger.info("Instagram ice breakers configured")
            return {"status": "success", "result": data.get("result")}
            
        except httpx.HTTPError as e:
            logger.error(f"Error setting ice breakers: {e}", exc_info=True)
            raise
    
    async def handle_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Maneja webhook de Instagram"""
        
        object_type = webhook_data.get("object")
        
        if object_type != "instagram":
            return {"status": "ignored", "reason": "Not an Instagram event"}
        
        entry = webhook_data.get("entry", [{}])[0]
        messaging = entry.get("messaging", [])
        
        event_types = []
        
        for event in messaging:
            if "message" in event:
                event_types.append("message")
            elif "postback" in event:
                event_types.append("postback")
            elif "read" in event:
                event_types.append("read")
        
        logger.info(f"Received Instagram events: {event_types}")
        
        return {
            "status": "received",
            "event_types": event_types,
            "count": len(messaging),
        }
    
    async def verify_webhook(self, mode: str, token: str, challenge: str) -> str:
        """Verifica webhook de Instagram (para setup inicial)"""
        
        if mode == "subscribe" and token == self.verify_token:
            logger.info("Instagram webhook verified successfully")
            return challenge
        
        raise ValueError("Invalid webhook verification")
