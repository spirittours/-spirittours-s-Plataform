"""
Channel Connectors
==================

Conectores para diferentes canales de comunicación:
- WhatsApp Business API
- Telegram Bot API
- Facebook Messenger
- Instagram Direct Messages
- Twitter/X DMs
- LinkedIn Messages
- WebChat
- SMS/Email
"""

from .base_connector import BaseChannelConnector
from .whatsapp_connector import WhatsAppConnector

__all__ = [
    "BaseChannelConnector",
    "WhatsAppConnector",
]
