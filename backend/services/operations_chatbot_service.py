#!/usr/bin/env python3
"""
Operations Chatbot Service
Asistente IA 24/7 para Equipo de Operaciones
"""

import os
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio
import logging
from sqlalchemy.orm import Session

try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

logger = logging.getLogger(__name__)

class OperationsChatbotService:
    """
    24/7 AI-powered chatbot for operations team
    Provides instant answers, recommendations, and automation
    """
    
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        
        if HAS_OPENAI and self.openai_api_key:
            openai.api_key = self.openai_api_key
        
        # Chatbot configuration
        self.model = "gpt-4"
        self.temperature = 0.7
        self.max_tokens = 1000
        
        # Context and knowledge base
        self.system_context = self._build_system_context()
        self.conversation_history = {}  # user_id -> messages
    
    async def process_message(
        self,
        user_id: str,
        message: str,
        db: Session,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process user message and generate response
        
        Args:
            user_id: User ID for conversation tracking
            message: User's message
            db: Database session for querying data
            context: Additional context (group_id, reservation_id, etc.)
        
        Returns:
            Dict with response and suggested actions
        """
        try:
            if not HAS_OPENAI or not self.openai_api_key:
                return self._fallback_response(message)
            
            # Detect intent
            intent = await self._detect_intent(message)
            
            # Get relevant data based on intent
            data_context = await self._get_relevant_context(intent, context, db)
            
            # Build conversation messages
            messages = self._build_conversation(user_id, message, data_context)
            
            # Generate response
            response = await openai.ChatCompletion.acreate(
                model=self.model,
                messages=messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            bot_message = response.choices[0].message.content
            
            # Store in conversation history
            self._add_to_history(user_id, "user", message)
            self._add_to_history(user_id, "assistant", bot_message)
            
            # Generate suggested actions
            suggested_actions = await self._generate_actions(intent, context, db)
            
            return {
                "success": True,
                "response": bot_message,
                "intent": intent,
                "suggested_actions": suggested_actions,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "response": "Lo siento, ocurrió un error procesando tu mensaje. Por favor intenta nuevamente."
            }
    
    async def get_quick_answer(
        self,
        question: str,
        db: Session
    ) -> str:
        """
        Get quick answer to common questions
        """
        quick_answers = {
            "como crear reserva": "Para crear una reserva: 1) Ve a Operaciones > Nueva Reserva, 2) Selecciona el proveedor y grupo, 3) Completa los detalles del servicio, 4) Confirma y guarda.",
            "como cerrar grupo": "Para cerrar un grupo: 1) Ve a Grupos > Detalles del Grupo, 2) Revisa el checklist de cierre, 3) Valida todas las facturas, 4) Click en 'Cerrar Grupo'.",
            "como validar factura": "Para validar una factura: 1) Sube el PDF de la factura, 2) El sistema OCR extraerá los datos automáticamente, 3) Revisa los datos vs la reserva, 4) Aprueba o marca discrepancias.",
            "que hacer alerta": "Cuando recibes una alerta: 1) Revisa los detalles en el panel de alertas, 2) Toma la acción requerida según la severidad, 3) Marca como resuelta cuando completes."
        }
        
        # Simple keyword matching
        question_lower = question.lower()
        for key, answer in quick_answers.items():
            if key in question_lower:
                return answer
        
        # Fallback to AI
        if HAS_OPENAI and self.openai_api_key:
            try:
                response = await openai.ChatCompletion.acreate(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": self.system_context},
                        {"role": "user", "content": question}
                    ],
                    temperature=0.5,
                    max_tokens=200
                )
                return response.choices[0].message.content
            except:
                pass
        
        return "No encontré una respuesta específica. ¿Puedes reformular tu pregunta?"
    
    async def suggest_next_action(
        self,
        group_id: str,
        db: Session
    ) -> List[Dict[str, Any]]:
        """
        Suggest next actions for a group
        """
        from ..models.operations_models import TourGroup, ProviderReservation
        
        group = db.query(TourGroup).filter(TourGroup.id == group_id).first()
        if not group:
            return []
        
        suggestions = []
        
        # Check for pending reservations
        pending = db.query(ProviderReservation).filter(
            ProviderReservation.group_id == group_id,
            ProviderReservation.status == "pending"
        ).count()
        
        if pending > 0:
            suggestions.append({
                "priority": "high",
                "action": f"Confirmar {pending} reservas pendientes",
                "type": "confirmation",
                "url": f"/operations/groups/{group_id}/reservations"
            })
        
        # Check if group has started
        if group.start_date <= datetime.utcnow() < group.end_date:
            suggestions.append({
                "priority": "medium",
                "action": "Grupo en curso - monitorear servicios activos",
                "type": "monitoring"
            })
        
        # Check if group has ended
        if group.end_date < datetime.utcnow() and group.closure_status != "closed":
            suggestions.append({
                "priority": "high",
                "action": "Iniciar proceso de cierre de grupo",
                "type": "closure",
                "url": f"/operations/groups/{group_id}/close"
            })
        
        return suggestions
    
    async def analyze_situation(
        self,
        situation: str,
        data: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """
        Analyze a situation and provide recommendations
        """
        if not HAS_OPENAI or not self.openai_api_key:
            return {"analysis": "AI analysis not available", "recommendations": []}
        
        prompt = f"""
        Analiza la siguiente situación operativa y proporciona:
        1. Análisis de la situación
        2. Recomendaciones específicas
        3. Prioridad de acciones
        4. Riesgos potenciales
        
        Situación: {situation}
        
        Datos relevantes:
        {json.dumps(data, indent=2)}
        
        Proporciona una respuesta estructurada en español.
        """
        
        try:
            response = await openai.ChatCompletion.acreate(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_context},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=800
            )
            
            analysis = response.choices[0].message.content
            
            # Parse structured response
            return {
                "success": True,
                "analysis": analysis,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in situation analysis: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    # Private methods
    
    def _build_system_context(self) -> str:
        """Build system context for chatbot"""
        return """
        Eres un asistente inteligente para el equipo de operaciones de Spirit Tours, 
        una agencia de viajes especializada en tours a Tierra Santa.
        
        Tu rol es:
        - Ayudar al equipo con preguntas sobre procesos operativos
        - Proporcionar guías paso a paso
        - Analizar situaciones y dar recomendaciones
        - Alertar sobre problemas potenciales
        - Sugerir optimizaciones
        
        Funcionalidades del sistema:
        - Gestión de reservas con proveedores
        - Control de grupos turísticos
        - Validación automática de facturas
        - Detección de fraudes y anomalías
        - Sistema de cierre de grupos
        - Alertas y notificaciones
        
        Siempre responde en español, de manera clara y profesional.
        Proporciona pasos accionables cuando sea posible.
        """
    
    async def _detect_intent(self, message: str) -> str:
        """Detect user intent from message"""
        message_lower = message.lower()
        
        # Intent keywords
        intents = {
            "create_reservation": ["crear reserva", "nueva reserva", "hacer reserva"],
            "check_status": ["estado", "status", "cómo va", "progreso"],
            "validate_invoice": ["validar factura", "revisar factura", "factura"],
            "close_group": ["cerrar grupo", "finalizar grupo", "cierre"],
            "alert_help": ["alerta", "notificación", "aviso"],
            "find_provider": ["buscar proveedor", "encontrar proveedor"],
            "cost_optimization": ["ahorrar", "reducir costos", "optimizar"],
            "fraud_check": ["fraude", "sospechoso", "anomalía"],
            "help": ["ayuda", "help", "cómo", "tutorial"]
        }
        
        for intent, keywords in intents.items():
            if any(kw in message_lower for kw in keywords):
                return intent
        
        return "general_query"
    
    async def _get_relevant_context(
        self,
        intent: str,
        context: Optional[Dict[str, Any]],
        db: Session
    ) -> str:
        """Get relevant context based on intent"""
        context_info = []
        
        if context and "group_id" in context:
            from ..models.operations_models import TourGroup
            group = db.query(TourGroup).filter(
                TourGroup.id == context["group_id"]
            ).first()
            
            if group:
                context_info.append(f"Grupo: {group.name} ({group.code})")
                context_info.append(f"Estado: {group.operational_status.value}")
                context_info.append(f"Participantes: {group.total_participants}")
        
        if context and "reservation_id" in context:
            from ..models.operations_models import ProviderReservation
            res = db.query(ProviderReservation).filter(
                ProviderReservation.id == context["reservation_id"]
            ).first()
            
            if res:
                context_info.append(f"Reserva: {res.confirmation_number}")
                context_info.append(f"Proveedor: {res.provider.name}")
                context_info.append(f"Servicio: {res.service_type.value}")
        
        return "\n".join(context_info) if context_info else "Sin contexto adicional"
    
    def _build_conversation(
        self,
        user_id: str,
        message: str,
        data_context: str
    ) -> List[Dict[str, str]]:
        """Build conversation messages for API"""
        messages = [
            {"role": "system", "content": self.system_context}
        ]
        
        # Add recent history
        if user_id in self.conversation_history:
            history = self.conversation_history[user_id][-10:]  # Last 10 messages
            messages.extend(history)
        
        # Add context if available
        if data_context:
            messages.append({
                "role": "system",
                "content": f"Contexto actual:\n{data_context}"
            })
        
        # Add current message
        messages.append({
            "role": "user",
            "content": message
        })
        
        return messages
    
    def _add_to_history(self, user_id: str, role: str, content: str):
        """Add message to conversation history"""
        if user_id not in self.conversation_history:
            self.conversation_history[user_id] = []
        
        self.conversation_history[user_id].append({
            "role": role,
            "content": content
        })
        
        # Keep only last 20 messages per user
        if len(self.conversation_history[user_id]) > 20:
            self.conversation_history[user_id] = self.conversation_history[user_id][-20:]
    
    async def _generate_actions(
        self,
        intent: str,
        context: Optional[Dict[str, Any]],
        db: Session
    ) -> List[Dict[str, Any]]:
        """Generate suggested actions based on intent"""
        actions = []
        
        if intent == "create_reservation":
            actions.append({
                "label": "Nueva Reserva",
                "action": "navigate",
                "url": "/operations/reservations/new"
            })
        
        elif intent == "close_group" and context and "group_id" in context:
            actions.append({
                "label": "Ver Checklist de Cierre",
                "action": "navigate",
                "url": f"/operations/groups/{context['group_id']}/close"
            })
        
        elif intent == "validate_invoice":
            actions.append({
                "label": "Subir Factura",
                "action": "upload",
                "type": "invoice"
            })
        
        elif intent == "help":
            actions.append({
                "label": "Ver Documentación",
                "action": "navigate",
                "url": "/docs/operations"
            })
        
        return actions
    
    def _fallback_response(self, message: str) -> Dict[str, Any]:
        """Fallback response when AI is not available"""
        return {
            "success": True,
            "response": (
                "Puedo ayudarte con:\n"
                "- Crear y gestionar reservas\n"
                "- Validar facturas\n"
                "- Cerrar grupos\n"
                "- Revisar alertas\n"
                "- Optimizar costos\n\n"
                "¿Qué necesitas hacer?"
            ),
            "intent": "help",
            "suggested_actions": [
                {"label": "Nueva Reserva", "url": "/operations/reservations/new"},
                {"label": "Ver Grupos", "url": "/operations/groups"},
                {"label": "Ver Alertas", "url": "/operations/alerts"}
            ]
        }

# Singleton instance
chatbot_service = OperationsChatbotService()

__all__ = ['OperationsChatbotService', 'chatbot_service']