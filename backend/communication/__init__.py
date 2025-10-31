"""
Communication Module
====================

Sistema inteligente de comunicación multicanal con:
- Routing inteligente (AI_FIRST vs HUMAN_DIRECT)
- Detección de "preguntones" (time wasters)
- Clasificación automática por departamento
- Extracción de información de contacto
- Escalación dinámica AI → Humano

Componentes principales:
- IntelligentRouter: Enrutador central con scoring
- AISalesAgent: Agente IA especializado en cierre de ventas
- MultiChannelGateway: Gateway unificado para todos los canales
- HumanAgentQueue: Sistema de cola para agentes humanos
"""

from .intelligent_router import (
    IntelligentRouter,
    Department,
    Intent,
    AgentType,
    RoutingMode,
    CustomerType,
    ContactInfo,
    ConversationContext,
)

__all__ = [
    "IntelligentRouter",
    "Department",
    "Intent",
    "AgentType",
    "RoutingMode",
    "CustomerType",
    "ContactInfo",
    "ConversationContext",
]

__version__ = "1.0.0"
