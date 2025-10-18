"""
Telegram Bot API Connector
===========================

Conector para Telegram Bot API con soporte completo de:
- Mensajes de texto, foto, video, audio, documento
- Inline keyboards y reply keyboards
- Comandos (/start, /help, etc.)
- Webhook y polling
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import httpx

from .base_connector import BaseChannelConnector
from ..multi_channel_gateway import NormalizedMessage, Channel

logger = logging.getLogger(__name__)


class TelegramConnector(BaseChannelConnector):
    """Conector para Telegram Bot API"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.channel = Channel.TELEGRAM
        
        # Configuración
        self.bot_token = config.get("bot_token")
        self.webhook_secret = config.get("webhook_secret")
        
        # API endpoint
        self.api_base_url = f"https://api.telegram.org/bot{self.bot_token}"
        
        # HTTP client
        self.client = httpx.AsyncClient(
            timeout=30.0,
            headers={"Content-Type": "application/json"}
        )
        
        self.validate_config()
    
    def validate_config(self) -> bool:
        """Valida configuración de Telegram"""
        if not self.bot_token:
            raise ValueError("Missing required config: bot_token")
        return True
    
    async def normalize_message(self, raw_message: Dict[str, Any]) -> NormalizedMessage:
        """
        Normaliza mensaje de Telegram a formato común
        
        Telegram webhook structure:
        {
            "update_id": 123456789,
            "message": {
                "message_id": 123,
                "from": {
                    "id": 123456,
                    "is_bot": false,
                    "first_name": "John",
                    "last_name": "Doe",
                    "username": "johndoe",
                    "language_code": "en"
                },
                "chat": {
                    "id": 123456,
                    "first_name": "John",
                    "last_name": "Doe",
                    "username": "johndoe",
                    "type": "private"
                },
                "date": 1234567890,
                "text": "Hello",
                "entities": [...]
            }
        }
        """
        
        try:
            # Puede ser mensaje, edited_message, channel_post, etc.
            message = raw_message.get("message") or \
                     raw_message.get("edited_message") or \
                     raw_message.get("channel_post")
            
            if not message:
                raise ValueError("No message in update")
            
            # Extraer datos del usuario
            from_user = message.get("from", {})
            chat = message.get("chat", {})
            
            user_id = str(from_user.get("id") or chat.get("id"))
            username = from_user.get("username") or \
                      f"{from_user.get('first_name', '')} {from_user.get('last_name', '')}".strip()
            
            message_id = str(message.get("message_id"))
            timestamp = datetime.fromtimestamp(message.get("date", 0))
            
            # Extraer contenido
            message_text = ""
            attachments = []
            
            # Texto simple
            if "text" in message:
                message_text = message["text"]
            
            # Comandos
            elif "entities" in message:
                for entity in message["entities"]:
                    if entity["type"] == "bot_command":
                        message_text = message.get("text", "")
                        break
            
            # Foto
            if "photo" in message:
                # Telegram envía múltiples tamaños, tomar el más grande
                photos = message["photo"]
                largest_photo = max(photos, key=lambda p: p.get("file_size", 0))
                attachments.append({
                    "type": "photo",
                    "file_id": largest_photo["file_id"],
                    "file_unique_id": largest_photo.get("file_unique_id"),
                    "width": largest_photo.get("width"),
                    "height": largest_photo.get("height"),
                    "file_size": largest_photo.get("file_size"),
                })
                message_text = message.get("caption", "[Foto]")
            
            # Video
            if "video" in message:
                video = message["video"]
                attachments.append({
                    "type": "video",
                    "file_id": video["file_id"],
                    "file_unique_id": video.get("file_unique_id"),
                    "duration": video.get("duration"),
                    "width": video.get("width"),
                    "height": video.get("height"),
                    "file_size": video.get("file_size"),
                })
                message_text = message.get("caption", "[Video]")
            
            # Audio
            if "audio" in message:
                audio = message["audio"]
                attachments.append({
                    "type": "audio",
                    "file_id": audio["file_id"],
                    "file_unique_id": audio.get("file_unique_id"),
                    "duration": audio.get("duration"),
                    "file_size": audio.get("file_size"),
                    "title": audio.get("title"),
                    "performer": audio.get("performer"),
                })
                message_text = "[Audio]"
            
            # Voice note
            if "voice" in message:
                voice = message["voice"]
                attachments.append({
                    "type": "voice",
                    "file_id": voice["file_id"],
                    "file_unique_id": voice.get("file_unique_id"),
                    "duration": voice.get("duration"),
                    "file_size": voice.get("file_size"),
                })
                message_text = "[Nota de voz]"
            
            # Documento
            if "document" in message:
                doc = message["document"]
                attachments.append({
                    "type": "document",
                    "file_id": doc["file_id"],
                    "file_unique_id": doc.get("file_unique_id"),
                    "file_name": doc.get("file_name"),
                    "mime_type": doc.get("mime_type"),
                    "file_size": doc.get("file_size"),
                })
                message_text = message.get("caption", f"[Documento: {doc.get('file_name', 'documento')}]")
            
            # Location
            if "location" in message:
                location = message["location"]
                message_text = f"[Ubicación: {location['latitude']}, {location['longitude']}]"
            
            # Contact
            if "contact" in message:
                contact = message["contact"]
                message_text = f"[Contacto: {contact.get('first_name', '')} {contact.get('last_name', '')}]"
            
            # Sticker
            if "sticker" in message:
                sticker = message["sticker"]
                message_text = f"[Sticker: {sticker.get('emoji', '😀')}]"
            
            return NormalizedMessage(
                message_id=message_id,
                channel=Channel.TELEGRAM,
                user_id=user_id,
                username=username,
                message_text=message_text,
                timestamp=timestamp,
                attachments=attachments,
                metadata={
                    "chat_type": chat.get("type"),
                    "language_code": from_user.get("language_code"),
                    "raw": message,
                },
                channel_user_id=user_id,
                channel_conversation_id=str(chat.get("id")),
            )
            
        except Exception as e:
            logger.error(f"Error normalizing Telegram message: {e}", exc_info=True)
            raise
    
    async def send_message(
        self,
        recipient_id: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Envía mensaje de texto por Telegram"""
        
        url = f"{self.api_base_url}/sendMessage"
        
        payload = {
            "chat_id": recipient_id,
            "text": message,
            "parse_mode": "HTML",  # Soporta HTML formatting
        }
        
        # Reply markup si hay botones
        if metadata and "reply_markup" in metadata:
            payload["reply_markup"] = metadata["reply_markup"]
        
        try:
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            
            if not data.get("ok"):
                raise Exception(f"Telegram API error: {data.get('description')}")
            
            result = data.get("result", {})
            
            logger.info(f"Sent Telegram message to {recipient_id}: {result.get('message_id')}")
            return {
                "status": "sent",
                "message_id": str(result.get("message_id")),
                "recipient_id": recipient_id,
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Error sending Telegram message: {e}", exc_info=True)
            raise
    
    async def send_media(
        self,
        recipient_id: str,
        media_type: str,
        media_url: str,
        caption: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Envía media por Telegram"""
        
        # Mapear tipos de media a métodos de Telegram
        method_map = {
            "image": "sendPhoto",
            "photo": "sendPhoto",
            "video": "sendVideo",
            "audio": "sendAudio",
            "document": "sendDocument",
        }
        
        method = method_map.get(media_type, "sendDocument")
        url = f"{self.api_base_url}/{method}"
        
        # Mapear parámetros
        param_map = {
            "sendPhoto": "photo",
            "sendVideo": "video",
            "sendAudio": "audio",
            "sendDocument": "document",
        }
        
        param_name = param_map.get(method, "document")
        
        payload = {
            "chat_id": recipient_id,
            param_name: media_url,
        }
        
        if caption:
            payload["caption"] = caption
        
        try:
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            
            if not data.get("ok"):
                raise Exception(f"Telegram API error: {data.get('description')}")
            
            result = data.get("result", {})
            
            return {
                "status": "sent",
                "message_id": str(result.get("message_id")),
                "recipient_id": recipient_id,
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Error sending Telegram media: {e}", exc_info=True)
            raise
    
    async def send_quick_replies(
        self,
        recipient_id: str,
        message: str,
        quick_replies: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """Envía mensaje con inline keyboard"""
        
        # Crear inline keyboard
        keyboard = []
        row = []
        
        for i, reply in enumerate(quick_replies):
            button = {
                "text": reply.get("title", ""),
                "callback_data": reply.get("payload", f"btn_{i}"),
            }
            row.append(button)
            
            # Máximo 2 botones por fila
            if len(row) == 2 or i == len(quick_replies) - 1:
                keyboard.append(row)
                row = []
        
        reply_markup = {
            "inline_keyboard": keyboard
        }
        
        return await self.send_message(
            recipient_id=recipient_id,
            message=message,
            metadata={"reply_markup": reply_markup},
        )
    
    async def send_typing_indicator(self, recipient_id: str):
        """Envía acción de 'escribiendo...'"""
        
        url = f"{self.api_base_url}/sendChatAction"
        
        payload = {
            "chat_id": recipient_id,
            "action": "typing",
        }
        
        try:
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            logger.debug(f"Sent typing indicator to {recipient_id}")
            
        except httpx.HTTPError as e:
            logger.warning(f"Error sending typing indicator: {e}")
    
    async def mark_as_read(self, message_id: str):
        """
        Telegram no tiene concepto de 'mark as read' explícito
        El bot automáticamente marca como leído cuando responde
        """
        pass
    
    async def handle_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Maneja webhook de Telegram"""
        
        update_type = None
        
        if "message" in webhook_data:
            update_type = "message"
        elif "edited_message" in webhook_data:
            update_type = "edited_message"
        elif "callback_query" in webhook_data:
            update_type = "callback_query"
        elif "inline_query" in webhook_data:
            update_type = "inline_query"
        
        logger.info(f"Received Telegram update: {update_type}")
        
        return {
            "status": "received",
            "update_type": update_type,
            "update_id": webhook_data.get("update_id"),
        }
    
    async def set_webhook(self, webhook_url: str) -> Dict[str, Any]:
        """Configura webhook de Telegram"""
        
        url = f"{self.api_base_url}/setWebhook"
        
        payload = {
            "url": webhook_url,
            "allowed_updates": ["message", "edited_message", "callback_query"],
        }
        
        if self.webhook_secret:
            payload["secret_token"] = self.webhook_secret
        
        try:
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            
            if not data.get("ok"):
                raise Exception(f"Failed to set webhook: {data.get('description')}")
            
            logger.info(f"Telegram webhook set to: {webhook_url}")
            return {"status": "success", "webhook_url": webhook_url}
            
        except httpx.HTTPError as e:
            logger.error(f"Error setting Telegram webhook: {e}", exc_info=True)
            raise
    
    async def get_webhook_info(self) -> Dict[str, Any]:
        """Obtiene información del webhook configurado"""
        
        url = f"{self.api_base_url}/getWebhookInfo"
        
        try:
            response = await self.client.get(url)
            response.raise_for_status()
            data = response.json()
            
            if data.get("ok"):
                return data.get("result", {})
            
            return {}
            
        except httpx.HTTPError as e:
            logger.error(f"Error getting webhook info: {e}", exc_info=True)
            return {}
    
    async def delete_webhook(self) -> Dict[str, Any]:
        """Elimina webhook (útil para cambiar a polling)"""
        
        url = f"{self.api_base_url}/deleteWebhook"
        
        try:
            response = await self.client.post(url)
            response.raise_for_status()
            data = response.json()
            
            if data.get("ok"):
                logger.info("Telegram webhook deleted")
                return {"status": "deleted"}
            
            return {"status": "failed"}
            
        except httpx.HTTPError as e:
            logger.error(f"Error deleting webhook: {e}", exc_info=True)
            raise
    
    async def get_me(self) -> Dict[str, Any]:
        """Obtiene información del bot (útil para validación)"""
        
        url = f"{self.api_base_url}/getMe"
        
        try:
            response = await self.client.get(url)
            response.raise_for_status()
            data = response.json()
            
            if data.get("ok"):
                return data.get("result", {})
            
            return {}
            
        except httpx.HTTPError as e:
            logger.error(f"Error getting bot info: {e}", exc_info=True)
            return {}
