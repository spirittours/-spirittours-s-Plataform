"""
Chatbot Inteligente con NLU para Spirit Tours
Procesamiento de lenguaje natural y asistencia conversacional
"""

import asyncio
import logging
import re
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
import spacy
from dataclasses import dataclass, asdict
import numpy as np
from collections import defaultdict

# Importaciones de ML/NLP
try:
    from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logger.warning("Transformers library not available, using rule-based NLU")

logger = logging.getLogger(__name__)


class Intent(Enum):
    """Intenciones del usuario"""
    # Saludos y despedidas
    GREETING = "GREETING"
    FAREWELL = "FAREWELL"
    
    # Información y búsqueda
    SEARCH_DESTINATION = "SEARCH_DESTINATION"
    SEARCH_PACKAGE = "SEARCH_PACKAGE"
    SEARCH_ACTIVITY = "SEARCH_ACTIVITY"
    
    # Cotización y reserva
    REQUEST_QUOTATION = "REQUEST_QUOTATION"
    MODIFY_QUOTATION = "MODIFY_QUOTATION"
    CONFIRM_BOOKING = "CONFIRM_BOOKING"
    CANCEL_BOOKING = "CANCEL_BOOKING"
    
    # Consultas
    CHECK_AVAILABILITY = "CHECK_AVAILABILITY"
    ASK_PRICE = "ASK_PRICE"
    ASK_DURATION = "ASK_DURATION"
    ASK_INCLUDED = "ASK_INCLUDED"
    
    # Soporte
    COMPLAINT = "COMPLAINT"
    TECHNICAL_SUPPORT = "TECHNICAL_SUPPORT"
    PAYMENT_ISSUE = "PAYMENT_ISSUE"
    
    # Otros
    UNKNOWN = "UNKNOWN"
    THANK_YOU = "THANK_YOU"
    HELP = "HELP"


class EntityType(Enum):
    """Tipos de entidades"""
    DESTINATION = "DESTINATION"
    DATE = "DATE"
    DURATION = "DURATION"
    PASSENGER_COUNT = "PASSENGER_COUNT"
    BUDGET = "BUDGET"
    ACTIVITY = "ACTIVITY"
    HOTEL_TYPE = "HOTEL_TYPE"
    TRANSPORT_TYPE = "TRANSPORT_TYPE"
    LANGUAGE = "LANGUAGE"
    EMAIL = "EMAIL"
    PHONE = "PHONE"
    NAME = "NAME"


class ConversationState(Enum):
    """Estados de la conversación"""
    IDLE = "IDLE"
    GREETING = "GREETING"
    GATHERING_INFO = "GATHERING_INFO"
    QUOTATION_PROCESS = "QUOTATION_PROCESS"
    BOOKING_PROCESS = "BOOKING_PROCESS"
    SUPPORT = "SUPPORT"
    COMPLETED = "COMPLETED"


class Sentiment(Enum):
    """Sentimientos detectados"""
    POSITIVE = "POSITIVE"
    NEUTRAL = "NEUTRAL"
    NEGATIVE = "NEGATIVE"
    FRUSTRATED = "FRUSTRATED"
    EXCITED = "EXCITED"


@dataclass
class UserContext:
    """Contexto del usuario en la conversación"""
    user_id: str
    session_id: str
    state: ConversationState
    current_intent: Optional[Intent] = None
    entities: Dict[str, Any] = None
    history: List[Dict[str, Any]] = None
    preferences: Dict[str, Any] = None
    pending_action: Optional[str] = None
    language: str = "es"
    sentiment_history: List[Sentiment] = None
    
    def __post_init__(self):
        if self.entities is None:
            self.entities = {}
        if self.history is None:
            self.history = []
        if self.preferences is None:
            self.preferences = {}
        if self.sentiment_history is None:
            self.sentiment_history = []


@dataclass
class Message:
    """Mensaje en la conversación"""
    text: str
    sender: str  # 'user' o 'bot'
    timestamp: datetime
    intent: Optional[Intent] = None
    entities: Optional[Dict[str, Any]] = None
    sentiment: Optional[Sentiment] = None
    confidence: float = 1.0


class NLUProcessor:
    """
    Procesador de lenguaje natural para entender intenciones y extraer entidades
    """
    
    def __init__(self):
        # Cargar modelo de spaCy para español
        try:
            self.nlp = spacy.load("es_core_news_sm")
        except:
            logger.warning("Spanish model not found, using English")
            try:
                self.nlp = spacy.load("en_core_web_sm")
            except:
                self.nlp = None
                logger.error("No spaCy model available")
        
        # Patrones de intención
        self.intent_patterns = self._load_intent_patterns()
        
        # Patrones de entidades
        self.entity_patterns = self._load_entity_patterns()
        
        # Cargar modelo de sentimientos si está disponible
        if TRANSFORMERS_AVAILABLE:
            try:
                self.sentiment_analyzer = pipeline(
                    "sentiment-analysis",
                    model="nlptown/bert-base-multilingual-uncased-sentiment"
                )
            except:
                self.sentiment_analyzer = None
        else:
            self.sentiment_analyzer = None
    
    def _load_intent_patterns(self) -> Dict[Intent, List[str]]:
        """Cargar patrones para detectar intenciones"""
        return {
            Intent.GREETING: [
                r'\b(hola|buenos días|buenas tardes|buenas noches|hey|hi|saludos)\b',
                r'^(qué tal|cómo estás|cómo está)',
            ],
            Intent.FAREWELL: [
                r'\b(adiós|hasta luego|nos vemos|chau|bye|hasta pronto)\b',
                r'(gracias por todo|fue un placer)',
            ],
            Intent.REQUEST_QUOTATION: [
                r'\b(cotización|cotizar|presupuesto|precio|cuánto cuesta|cuánto sale)\b',
                r'(quiero viajar|necesito un paquete|busco un tour)',
                r'(me interesa|quisiera información)',
            ],
            Intent.SEARCH_DESTINATION: [
                r'\b(destinos|lugares|dónde puedo ir|qué lugares)\b',
                r'(viajar a|conocer|visitar)\s+(\w+)',
                r'(tours? en|paquetes? a)\s+(\w+)',
            ],
            Intent.CHECK_AVAILABILITY: [
                r'\b(disponibilidad|disponible|hay lugar|hay espacio)\b',
                r'(quedan lugares|todavía hay)',
            ],
            Intent.ASK_PRICE: [
                r'\b(precio|costo|valor|tarifa|cuánto)\b',
                r'(cuánto cuesta|cuánto sale|qué precio tiene)',
            ],
            Intent.ASK_INCLUDED: [
                r'\b(incluye|incluido|qué trae|qué tiene)\b',
                r'(viene con|está incluido)',
            ],
            Intent.CONFIRM_BOOKING: [
                r'\b(confirmar|reservar|apartar|sí quiero)\b',
                r'(lo tomo|me lo llevo|perfecto)',
            ],
            Intent.CANCEL_BOOKING: [
                r'\b(cancelar|anular|desistir)\b',
                r'(no quiero|cambié de opinión)',
            ],
            Intent.COMPLAINT: [
                r'\b(queja|reclamo|problema|mal servicio)\b',
                r'(no estoy satisfecho|no me gustó)',
            ],
            Intent.HELP: [
                r'\b(ayuda|ayúdame|no entiendo|explicar)\b',
                r'(cómo funciona|qué hago)',
            ],
            Intent.THANK_YOU: [
                r'\b(gracias|muchas gracias|te agradezco)\b',
                r'(perfecto|excelente|genial)',
            ]
        }
    
    def _load_entity_patterns(self) -> Dict[EntityType, List[str]]:
        """Cargar patrones para extraer entidades"""
        return {
            EntityType.DESTINATION: [
                r'(cusco|machu picchu|lima|arequipa|puno|nazca)',
                r'(bolivia|perú|ecuador|colombia|chile)',
                r'(lago titicaca|salar de uyuni|amazonas)',
            ],
            EntityType.DATE: [
                r'(\d{1,2})\s+de\s+(\w+)',
                r'(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)',
                r'(mañana|pasado mañana|próxima semana|próximo mes)',
                r'(\d{1,2}/\d{1,2}/\d{2,4})',
            ],
            EntityType.DURATION: [
                r'(\d+)\s+(días?|semanas?|noches?)',
                r'(fin de semana|feriado largo)',
            ],
            EntityType.PASSENGER_COUNT: [
                r'(\d+)\s+(personas?|pasajeros?|viajeros?)',
                r'(somos|son)\s+(\d+)',
                r'para\s+(\d+)',
            ],
            EntityType.BUDGET: [
                r'(\d+)\s*(dólares|usd|soles|pen)',
                r'(presupuesto de|máximo|hasta)\s+(\d+)',
                r'entre\s+(\d+)\s+y\s+(\d+)',
            ],
            EntityType.ACTIVITY: [
                r'(trekking|senderismo|caminata|hiking)',
                r'(cultural|histórico|arqueológico)',
                r'(aventura|extremo|adrenalina)',
                r'(relax|descanso|spa)',
                r'(gastronomía|comida|restaurantes)',
            ],
            EntityType.EMAIL: [
                r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
            ],
            EntityType.PHONE: [
                r'(\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}',
                r'\d{9,}',
            ]
        }
    
    async def process_message(self, text: str) -> Tuple[Intent, Dict[str, Any], Sentiment]:
        """
        Procesar mensaje para extraer intención, entidades y sentimiento
        """
        # Limpiar texto
        text = text.lower().strip()
        
        # Detectar intención
        intent = self._detect_intent(text)
        
        # Extraer entidades
        entities = self._extract_entities(text)
        
        # Analizar sentimiento
        sentiment = await self._analyze_sentiment(text)
        
        return intent, entities, sentiment
    
    def _detect_intent(self, text: str) -> Intent:
        """Detectar intención del mensaje"""
        best_intent = Intent.UNKNOWN
        best_score = 0
        
        for intent, patterns in self.intent_patterns.items():
            score = 0
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    score += 1
            
            if score > best_score:
                best_score = score
                best_intent = intent
        
        return best_intent
    
    def _extract_entities(self, text: str) -> Dict[str, Any]:
        """Extraer entidades del mensaje"""
        entities = {}
        
        # Usar spaCy si está disponible
        if self.nlp:
            doc = self.nlp(text)
            
            for ent in doc.ents:
                if ent.label_ == "LOC" or ent.label_ == "GPE":
                    entities[EntityType.DESTINATION.value] = ent.text
                elif ent.label_ == "DATE":
                    entities[EntityType.DATE.value] = ent.text
                elif ent.label_ == "PERSON":
                    entities[EntityType.NAME.value] = ent.text
                elif ent.label_ == "MONEY":
                    entities[EntityType.BUDGET.value] = ent.text
        
        # Usar patrones regex
        for entity_type, patterns in self.entity_patterns.items():
            for pattern in patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                if matches:
                    if entity_type not in entities:
                        entities[entity_type.value] = matches[0] if isinstance(matches[0], str) else matches[0][0]
        
        return entities
    
    async def _analyze_sentiment(self, text: str) -> Sentiment:
        """Analizar sentimiento del mensaje"""
        if self.sentiment_analyzer:
            try:
                result = self.sentiment_analyzer(text)[0]
                label = result['label']
                
                # Mapear a nuestros sentimientos
                if '5' in label or '4' in label:
                    return Sentiment.POSITIVE
                elif '3' in label:
                    return Sentiment.NEUTRAL
                else:
                    return Sentiment.NEGATIVE
            except:
                pass
        
        # Análisis básico por palabras clave
        positive_words = ['gracias', 'excelente', 'perfecto', 'genial', 'bueno']
        negative_words = ['mal', 'problema', 'no funciona', 'terrible', 'pésimo']
        
        positive_count = sum(1 for word in positive_words if word in text.lower())
        negative_count = sum(1 for word in negative_words if word in text.lower())
        
        if positive_count > negative_count:
            return Sentiment.POSITIVE
        elif negative_count > positive_count:
            return Sentiment.NEGATIVE
        else:
            return Sentiment.NEUTRAL


class ResponseGenerator:
    """
    Generador de respuestas contextuales
    """
    
    def __init__(self):
        self.templates = self._load_response_templates()
        self.suggestions = self._load_suggestions()
    
    def _load_response_templates(self) -> Dict[Intent, List[str]]:
        """Cargar plantillas de respuesta por intención"""
        return {
            Intent.GREETING: [
                "¡Hola! 👋 Bienvenido a Spirit Tours. ¿En qué puedo ayudarte hoy?",
                "¡Buenos días! Soy tu asistente virtual. ¿Estás buscando tu próxima aventura?",
                "¡Hola! Me alegra que estés aquí. ¿Te gustaría conocer nuestros destinos?",
            ],
            Intent.REQUEST_QUOTATION: [
                "¡Perfecto! Me encantaría ayudarte con una cotización. ¿A dónde te gustaría viajar?",
                "Claro, preparemos tu cotización. Necesito algunos datos: ¿Cuál es tu destino preferido?",
                "¡Excelente elección! Para darte la mejor cotización, ¿cuántas personas viajarían?",
            ],
            Intent.SEARCH_DESTINATION: [
                "Tenemos destinos increíbles como Machu Picchu, Lago Titicaca y el Amazonas. ¿Qué tipo de experiencia buscas?",
                "Nuestros destinos más populares son Cusco, Arequipa y Puno. ¿Prefieres aventura, cultura o relax?",
                "Te puedo recomendar lugares maravillosos. ¿Cuántos días tienes disponibles para viajar?",
            ],
            Intent.CHECK_AVAILABILITY: [
                "Verificaré la disponibilidad inmediatamente. ¿Para qué fechas estás pensando?",
                "Claro, déjame consultar. ¿Cuántas personas serían y para cuándo?",
                "Voy a revisar disponibilidad. ¿Tienes fechas específicas en mente?",
            ],
            Intent.ASK_PRICE: [
                "Los precios varían según el paquete. ¿Qué destino y cuántos días te interesan?",
                "Te puedo dar precios exactos. ¿Para cuántas personas sería el viaje?",
                "Nuestros precios son muy competitivos. ¿Cuál es tu presupuesto aproximado?",
            ],
            Intent.HELP: [
                "Estoy aquí para ayudarte. Puedo asistirte con:\n• Búsqueda de destinos\n• Cotizaciones\n• Reservas\n• Información de tours\n¿Qué necesitas?",
                "¡Claro! Te explico: puedes pedirme información sobre destinos, solicitar cotizaciones o hacer reservas. ¿Por dónde comenzamos?",
            ],
            Intent.COMPLAINT: [
                "Lamento mucho que hayas tenido una mala experiencia. ¿Podrías contarme más detalles para poder ayudarte?",
                "Entiendo tu frustración y quiero resolverlo. ¿Cuál es el problema específico?",
                "Me disculpo por los inconvenientes. Voy a escalar tu caso inmediatamente. ¿Tienes un número de reserva?",
            ],
            Intent.THANK_YOU: [
                "¡De nada! Es un placer ayudarte. ¿Hay algo más que necesites?",
                "¡Me alegra haberte ayudado! No dudes en contactarnos cuando quieras.",
                "¡Gracias a ti por elegirnos! ¿Te gustaría recibir ofertas especiales?",
            ],
            Intent.FAREWELL: [
                "¡Hasta luego! Fue un placer atenderte. ¡Buen viaje! 🌟",
                "¡Nos vemos pronto! Recuerda que estamos aquí 24/7 para ayudarte.",
                "¡Adiós! Esperamos verte pronto explorando el mundo con nosotros.",
            ]
        }
    
    def _load_suggestions(self) -> Dict[ConversationState, List[str]]:
        """Cargar sugerencias rápidas por estado"""
        return {
            ConversationState.GREETING: [
                "Ver destinos populares",
                "Solicitar cotización",
                "Ofertas del mes",
                "Hablar con un agente"
            ],
            ConversationState.GATHERING_INFO: [
                "Cusco - Machu Picchu",
                "Amazonas",
                "Lago Titicaca",
                "Tour personalizado"
            ],
            ConversationState.QUOTATION_PROCESS: [
                "Modificar fechas",
                "Cambiar número de personas",
                "Ver más opciones",
                "Confirmar cotización"
            ],
            ConversationState.BOOKING_PROCESS: [
                "Proceder al pago",
                "Modificar reserva",
                "Agregar servicios",
                "Cancelar"
            ]
        }
    
    async def generate_response(
        self,
        intent: Intent,
        entities: Dict[str, Any],
        context: UserContext,
        sentiment: Sentiment
    ) -> Dict[str, Any]:
        """
        Generar respuesta apropiada basada en el contexto
        """
        # Ajustar tono según sentimiento
        tone = self._determine_tone(sentiment, context.sentiment_history)
        
        # Obtener mensaje base
        message = self._get_base_message(intent, tone)
        
        # Personalizar con entidades y contexto
        message = self._personalize_message(message, entities, context)
        
        # Agregar sugerencias rápidas
        suggestions = self._get_suggestions(context.state, intent)
        
        # Determinar siguiente acción
        next_action = self._determine_next_action(intent, entities, context)
        
        return {
            'message': message,
            'suggestions': suggestions,
            'next_action': next_action,
            'data': self._prepare_response_data(intent, entities, context),
            'tone': tone
        }
    
    def _determine_tone(self, sentiment: Sentiment, history: List[Sentiment]) -> str:
        """Determinar tono de respuesta basado en sentimiento"""
        # Si el usuario está frustrado, ser más empático
        if sentiment == Sentiment.NEGATIVE or sentiment == Sentiment.FRUSTRATED:
            return 'empathetic'
        
        # Si hay negatividad persistente en el historial
        if len(history) >= 2 and all(s in [Sentiment.NEGATIVE, Sentiment.FRUSTRATED] for s in history[-2:]):
            return 'apologetic'
        
        # Si el usuario está emocionado
        if sentiment == Sentiment.POSITIVE or sentiment == Sentiment.EXCITED:
            return 'enthusiastic'
        
        return 'professional'
    
    def _get_base_message(self, intent: Intent, tone: str) -> str:
        """Obtener mensaje base según intención y tono"""
        templates = self.templates.get(intent, ["Lo siento, no entendí tu mensaje. ¿Podrías reformularlo?"])
        
        # Seleccionar template apropiado
        if tone == 'empathetic' and len(templates) > 1:
            return templates[1] if len(templates) > 1 else templates[0]
        else:
            return templates[0]
    
    def _personalize_message(
        self,
        message: str,
        entities: Dict[str, Any],
        context: UserContext
    ) -> str:
        """Personalizar mensaje con información del contexto"""
        # Agregar nombre si lo conocemos
        if context.preferences.get('name'):
            message = message.replace("Hola!", f"Hola {context.preferences['name']}!")
        
        # Incluir entidades detectadas
        if EntityType.DESTINATION.value in entities:
            destination = entities[EntityType.DESTINATION.value]
            message += f"\n\nVeo que te interesa {destination}. ¡Excelente elección!"
        
        if EntityType.DATE.value in entities:
            date = entities[EntityType.DATE.value]
            message += f" Las fechas {date} tienen buena disponibilidad."
        
        if EntityType.PASSENGER_COUNT.value in entities:
            passengers = entities[EntityType.PASSENGER_COUNT.value]
            message += f" Perfecto para {passengers} personas."
        
        return message
    
    def _get_suggestions(self, state: ConversationState, intent: Intent) -> List[str]:
        """Obtener sugerencias rápidas contextuales"""
        base_suggestions = self.suggestions.get(state, [])
        
        # Agregar sugerencias específicas según intención
        if intent == Intent.REQUEST_QUOTATION:
            return ["3 días", "5 días", "7 días", "Personalizado"]
        elif intent == Intent.SEARCH_DESTINATION:
            return base_suggestions
        elif intent == Intent.ASK_PRICE:
            return ["Económico", "Estándar", "Premium", "Ver todas las opciones"]
        
        return base_suggestions[:4]  # Máximo 4 sugerencias
    
    def _determine_next_action(
        self,
        intent: Intent,
        entities: Dict[str, Any],
        context: UserContext
    ) -> Optional[str]:
        """Determinar siguiente acción a realizar"""
        if intent == Intent.REQUEST_QUOTATION:
            # Verificar si tenemos toda la información necesaria
            required = [EntityType.DESTINATION, EntityType.DATE, EntityType.PASSENGER_COUNT]
            missing = [r for r in required if r.value not in entities and r.value not in context.entities]
            
            if not missing:
                return 'CREATE_QUOTATION'
            else:
                return f'COLLECT_{missing[0].value}'
        
        elif intent == Intent.CONFIRM_BOOKING:
            return 'PROCESS_BOOKING'
        
        elif intent == Intent.CANCEL_BOOKING:
            return 'PROCESS_CANCELLATION'
        
        elif intent == Intent.COMPLAINT:
            return 'ESCALATE_TO_HUMAN'
        
        return None
    
    def _prepare_response_data(
        self,
        intent: Intent,
        entities: Dict[str, Any],
        context: UserContext
    ) -> Dict[str, Any]:
        """Preparar datos adicionales para la respuesta"""
        data = {}
        
        if intent == Intent.REQUEST_QUOTATION and not any(
            k in [EntityType.DESTINATION.value, EntityType.DATE.value, EntityType.PASSENGER_COUNT.value]
            for k in entities
        ):
            # Mostrar formulario de cotización
            data['show_form'] = True
            data['form_type'] = 'quotation'
        
        elif intent == Intent.SEARCH_DESTINATION:
            # Mostrar carrusel de destinos
            data['show_carousel'] = True
            data['carousel_type'] = 'destinations'
        
        elif intent == Intent.CHECK_AVAILABILITY:
            # Mostrar calendario
            data['show_calendar'] = True
        
        return data


class IntelligentChatbot:
    """
    Chatbot principal que orquesta todo el sistema conversacional
    """
    
    def __init__(self, db_session=None):
        self.db = db_session
        self.nlu = NLUProcessor()
        self.response_generator = ResponseGenerator()
        
        # Almacén de contextos de usuario
        self.user_contexts: Dict[str, UserContext] = {}
        
        # Configuración
        self.max_history_length = 50
        self.context_timeout = timedelta(hours=1)
        self.escalation_threshold = 3  # Mensajes negativos antes de escalar
    
    async def process_message(
        self,
        message_text: str,
        user_id: str,
        session_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Procesar mensaje del usuario y generar respuesta
        """
        logger.info(f"Processing message from user {user_id}: {message_text[:50]}...")
        
        # Obtener o crear contexto del usuario
        context = self._get_or_create_context(user_id, session_id)
        
        # Procesar mensaje con NLU
        intent, entities, sentiment = await self.nlu.process_message(message_text)
        
        # Crear objeto mensaje
        user_message = Message(
            text=message_text,
            sender='user',
            timestamp=datetime.utcnow(),
            intent=intent,
            entities=entities,
            sentiment=sentiment
        )
        
        # Actualizar contexto
        self._update_context(context, user_message)
        
        # Verificar si necesita escalación
        if self._should_escalate(context):
            return await self._handle_escalation(context)
        
        # Generar respuesta
        response = await self.response_generator.generate_response(
            intent, entities, context, sentiment
        )
        
        # Ejecutar acciones si es necesario
        if response.get('next_action'):
            await self._execute_action(response['next_action'], context, entities)
        
        # Crear mensaje de respuesta
        bot_message = Message(
            text=response['message'],
            sender='bot',
            timestamp=datetime.utcnow()
        )
        
        # Agregar al historial
        context.history.append(asdict(bot_message))
        
        # Limpiar historial si es muy largo
        if len(context.history) > self.max_history_length:
            context.history = context.history[-self.max_history_length:]
        
        # Preparar respuesta final
        return {
            'success': True,
            'message': response['message'],
            'suggestions': response.get('suggestions', []),
            'data': response.get('data', {}),
            'context': {
                'intent': intent.value,
                'entities': entities,
                'sentiment': sentiment.value,
                'state': context.state.value
            },
            'session_id': session_id,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def _get_or_create_context(self, user_id: str, session_id: str) -> UserContext:
        """Obtener o crear contexto del usuario"""
        context_key = f"{user_id}:{session_id}"
        
        if context_key not in self.user_contexts:
            self.user_contexts[context_key] = UserContext(
                user_id=user_id,
                session_id=session_id,
                state=ConversationState.IDLE
            )
        
        context = self.user_contexts[context_key]
        
        # Verificar timeout
        if context.history and len(context.history) > 0:
            last_message_time = datetime.fromisoformat(context.history[-1]['timestamp'])
            if datetime.utcnow() - last_message_time > self.context_timeout:
                # Resetear contexto si ha pasado mucho tiempo
                context.state = ConversationState.IDLE
                context.current_intent = None
                context.pending_action = None
        
        return context
    
    def _update_context(self, context: UserContext, message: Message):
        """Actualizar contexto con nuevo mensaje"""
        # Actualizar intención actual
        if message.intent != Intent.UNKNOWN:
            context.current_intent = message.intent
        
        # Actualizar entidades (merge con existentes)
        if message.entities:
            context.entities.update(message.entities)
        
        # Actualizar historial de sentimientos
        if message.sentiment:
            context.sentiment_history.append(message.sentiment)
            if len(context.sentiment_history) > 10:
                context.sentiment_history = context.sentiment_history[-10:]
        
        # Actualizar estado de conversación
        self._update_conversation_state(context, message)
        
        # Agregar mensaje al historial
        context.history.append(asdict(message))
    
    def _update_conversation_state(self, context: UserContext, message: Message):
        """Actualizar estado de la conversación según el flujo"""
        current_state = context.state
        intent = message.intent
        
        # Transiciones de estado
        if current_state == ConversationState.IDLE:
            if intent == Intent.GREETING:
                context.state = ConversationState.GREETING
            elif intent in [Intent.REQUEST_QUOTATION, Intent.SEARCH_DESTINATION]:
                context.state = ConversationState.GATHERING_INFO
            elif intent == Intent.COMPLAINT:
                context.state = ConversationState.SUPPORT
        
        elif current_state == ConversationState.GREETING:
            if intent in [Intent.REQUEST_QUOTATION, Intent.SEARCH_DESTINATION]:
                context.state = ConversationState.GATHERING_INFO
        
        elif current_state == ConversationState.GATHERING_INFO:
            # Verificar si tenemos toda la información necesaria
            required_entities = [
                EntityType.DESTINATION.value,
                EntityType.DATE.value,
                EntityType.PASSENGER_COUNT.value
            ]
            if all(e in context.entities for e in required_entities):
                context.state = ConversationState.QUOTATION_PROCESS
        
        elif current_state == ConversationState.QUOTATION_PROCESS:
            if intent == Intent.CONFIRM_BOOKING:
                context.state = ConversationState.BOOKING_PROCESS
        
        elif current_state == ConversationState.BOOKING_PROCESS:
            if context.pending_action == 'BOOKING_CONFIRMED':
                context.state = ConversationState.COMPLETED
    
    def _should_escalate(self, context: UserContext) -> bool:
        """Determinar si la conversación debe escalarse a un humano"""
        # Escalar si hay muchos sentimientos negativos consecutivos
        recent_sentiments = context.sentiment_history[-self.escalation_threshold:]
        if len(recent_sentiments) >= self.escalation_threshold:
            if all(s in [Sentiment.NEGATIVE, Sentiment.FRUSTRATED] for s in recent_sentiments):
                return True
        
        # Escalar si el usuario lo solicita explícitamente
        if context.current_intent == Intent.COMPLAINT:
            return True
        
        # Escalar si llevamos muchos mensajes sin progreso
        if len(context.history) > 10 and context.state == ConversationState.GATHERING_INFO:
            return True
        
        return False
    
    async def _handle_escalation(self, context: UserContext) -> Dict[str, Any]:
        """Manejar escalación a agente humano"""
        logger.info(f"Escalating conversation for user {context.user_id}")
        
        # Notificar al sistema de soporte
        # En producción, esto crearía un ticket o notificaría a un agente
        
        return {
            'success': True,
            'message': "Entiendo tu situación. Te voy a conectar con uno de nuestros agentes especializados que podrá ayudarte mejor. Por favor espera un momento...",
            'escalated': True,
            'agent_required': True,
            'context': {
                'reason': 'negative_sentiment' if context.sentiment_history else 'user_request',
                'priority': 'high',
                'history': context.history[-10:]  # Últimos 10 mensajes
            }
        }
    
    async def _execute_action(
        self,
        action: str,
        context: UserContext,
        entities: Dict[str, Any]
    ):
        """Ejecutar acción determinada por el flujo"""
        logger.info(f"Executing action: {action}")
        
        if action == 'CREATE_QUOTATION':
            # Crear cotización con la información recopilada
            quotation_data = {
                'user_id': context.user_id,
                'destination': context.entities.get(EntityType.DESTINATION.value),
                'date': context.entities.get(EntityType.DATE.value),
                'passengers': context.entities.get(EntityType.PASSENGER_COUNT.value),
                'preferences': context.preferences
            }
            # En producción, esto llamaría al servicio de cotizaciones
            context.pending_action = 'QUOTATION_CREATED'
        
        elif action == 'PROCESS_BOOKING':
            # Procesar reserva
            context.pending_action = 'BOOKING_CONFIRMED'
        
        elif action == 'ESCALATE_TO_HUMAN':
            # Ya manejado en _handle_escalation
            pass
    
    async def get_conversation_summary(
        self,
        user_id: str,
        session_id: str
    ) -> Dict[str, Any]:
        """Obtener resumen de la conversación"""
        context_key = f"{user_id}:{session_id}"
        
        if context_key not in self.user_contexts:
            return {'error': 'Conversation not found'}
        
        context = self.user_contexts[context_key]
        
        # Analizar conversación
        total_messages = len(context.history)
        user_messages = [m for m in context.history if m['sender'] == 'user']
        bot_messages = [m for m in context.history if m['sender'] == 'bot']
        
        # Intenciones más comunes
        intents = [m.get('intent') for m in user_messages if m.get('intent')]
        intent_counts = defaultdict(int)
        for intent in intents:
            intent_counts[intent] += 1
        
        # Sentimiento promedio
        sentiments = [m.get('sentiment') for m in user_messages if m.get('sentiment')]
        sentiment_distribution = defaultdict(int)
        for sentiment in sentiments:
            sentiment_distribution[sentiment] += 1
        
        return {
            'session_id': session_id,
            'state': context.state.value,
            'total_messages': total_messages,
            'user_messages': len(user_messages),
            'bot_messages': len(bot_messages),
            'entities_collected': list(context.entities.keys()),
            'top_intents': dict(intent_counts),
            'sentiment_distribution': dict(sentiment_distribution),
            'duration': self._calculate_conversation_duration(context),
            'completed': context.state == ConversationState.COMPLETED
        }
    
    def _calculate_conversation_duration(self, context: UserContext) -> float:
        """Calcular duración de la conversación en minutos"""
        if not context.history or len(context.history) < 2:
            return 0
        
        first_message = datetime.fromisoformat(context.history[0]['timestamp'])
        last_message = datetime.fromisoformat(context.history[-1]['timestamp'])
        
        duration = (last_message - first_message).total_seconds() / 60
        return round(duration, 2)
    
    async def train_from_conversations(self, conversation_data: List[Dict[str, Any]]):
        """
        Entrenar/mejorar el chatbot con conversaciones históricas
        """
        logger.info(f"Training chatbot with {len(conversation_data)} conversations")
        
        # En producción, esto actualizaría los modelos de NLU
        # Por ahora, solo extraemos patrones
        
        successful_patterns = []
        failed_patterns = []
        
        for conversation in conversation_data:
            if conversation.get('outcome') == 'success':
                successful_patterns.extend(self._extract_patterns(conversation))
            else:
                failed_patterns.extend(self._extract_patterns(conversation))
        
        # Actualizar patrones de intención y entidades
        # Esto requeriría re-entrenamiento del modelo
        
        logger.info(f"Extracted {len(successful_patterns)} successful patterns")
    
    def _extract_patterns(self, conversation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extraer patrones de una conversación"""
        patterns = []
        
        messages = conversation.get('messages', [])
        for i, message in enumerate(messages):
            if message['sender'] == 'user':
                pattern = {
                    'text': message['text'],
                    'intent': message.get('intent'),
                    'entities': message.get('entities'),
                    'successful': conversation.get('outcome') == 'success'
                }
                patterns.append(pattern)
        
        return patterns


# Singleton global
_chatbot: Optional[IntelligentChatbot] = None


async def get_chatbot(db_session=None) -> IntelligentChatbot:
    """Obtener instancia singleton del chatbot"""
    global _chatbot
    
    if _chatbot is None:
        _chatbot = IntelligentChatbot(db_session)
    
    return _chatbot