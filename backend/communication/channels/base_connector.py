"""
Base Channel Connector
=======================

Interfaz base para todos los conectores de canal
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime

from ..multi_channel_gateway import NormalizedMessage, Channel


class BaseChannelConnector(ABC):
    """Interfaz base para conectores de canal"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.channel: Channel = None  # Debe ser definido por subclase
    
    @abstractmethod
    async def normalize_message(self, raw_message: Dict[str, Any]) -> NormalizedMessage:
        """
        Normaliza un mensaje del canal a formato común
        
        Args:
            raw_message: Mensaje en formato específico del canal
            
        Returns:
            NormalizedMessage: Mensaje en formato normalizado
        """
        pass
    
    @abstractmethod
    async def send_message(
        self,
        recipient_id: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Envía un mensaje a través del canal
        
        Args:
            recipient_id: ID del destinatario en el canal
            message: Texto del mensaje
            metadata: Metadata adicional
            
        Returns:
            Dict con información del envío
        """
        pass
    
    @abstractmethod
    async def send_media(
        self,
        recipient_id: str,
        media_type: str,
        media_url: str,
        caption: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Envía media (imagen, video, audio, documento)
        
        Args:
            recipient_id: ID del destinatario
            media_type: Tipo de media (image, video, audio, document)
            media_url: URL del media
            caption: Caption opcional
            
        Returns:
            Dict con información del envío
        """
        pass
    
    @abstractmethod
    async def send_quick_replies(
        self,
        recipient_id: str,
        message: str,
        quick_replies: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """
        Envía mensaje con respuestas rápidas
        
        Args:
            recipient_id: ID del destinatario
            message: Texto del mensaje
            quick_replies: Lista de opciones de respuesta rápida
            
        Returns:
            Dict con información del envío
        """
        pass
    
    @abstractmethod
    async def send_typing_indicator(self, recipient_id: str):
        """
        Envía indicador de "escribiendo..."
        
        Args:
            recipient_id: ID del destinatario
        """
        pass
    
    @abstractmethod
    async def mark_as_read(self, message_id: str):
        """
        Marca un mensaje como leído
        
        Args:
            message_id: ID del mensaje
        """
        pass
    
    async def handle_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Maneja webhook del canal
        
        Args:
            webhook_data: Datos del webhook
            
        Returns:
            Dict con resultado del procesamiento
        """
        # Implementación por defecto - puede ser sobrescrita
        return {"status": "received"}
    
    def validate_config(self) -> bool:
        """Valida la configuración del conector"""
        return True
