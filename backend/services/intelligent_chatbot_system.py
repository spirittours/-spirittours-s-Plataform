"""
Advanced Intelligent Chatbot System with NLU
=============================================
Sistema completo de chatbot con procesamiento de lenguaje natural,
comprensión contextual, y múltiples capacidades de asistencia.

Funcionalidades:
- Natural Language Understanding (NLU) con Rasa/Transformers
- Multi-idioma (ES, EN, PT, FR)
- Contexto de conversación persistente
- Integración con todos los servicios del sistema
- Machine Learning para mejorar respuestas
- Voice support con STT/TTS
- Sentiment analysis
- Intent classification
- Entity extraction
- Dialog flow management
- Proactive engagement
- A/B testing de respuestas
- Analytics y métricas
"""

import asyncio
import json
import logging
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple, Union
from enum import Enum
from dataclasses import dataclass, field
import uuid
import hashlib

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, validator
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, or_, func
import spacy
from transformers import (
    AutoTokenizer, 
    AutoModelForSequenceClassification,
    AutoModelForTokenClassification,
    AutoModelForQuestionAnswering,
    pipeline
)
import torch
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import langdetect
from textblob import TextBlob
import speech_recognition as sr
from gtts import gTTS
import io
import wave
import pyaudio

# Importar servicios del sistema
from services.advanced_email_service import AdvancedEmailService
from integrations.unified_payment_gateway import UnifiedPaymentGateway
from integrations.advanced_websocket_manager import AdvancedWebSocketManager
from ml.advanced_recommendation_engine import AdvancedMLSystem
from database import get_db
from models import User  # Tour, Booking, Hotel, Customer, Conversation - TODO: Import when available
from services.event_bus import EventBus
from services.workflow_engine import WorkflowEngine

logger = logging.getLogger(__name__)

# ================== Configuración y Modelos ==================

class IntentType(str, Enum):
    """Tipos de intención del usuario"""
    GREETING = "greeting"
    FAREWELL = "farewell"
    BOOKING = "booking"
    SEARCH = "search"
    CANCEL = "cancel"
    MODIFY = "modify"
    PAYMENT = "payment"
    SUPPORT = "support"
    INFORMATION = "information"
    RECOMMENDATION = "recommendation"
    COMPLAINT = "complaint"
    FEEDBACK = "feedback"
    FAQ = "faq"
    UNKNOWN = "unknown"

class EntityType(str, Enum):
    """Tipos de entidades extraídas"""
    LOCATION = "location"
    DATE = "date"
    PERSON = "person"
    MONEY = "money"
    NUMBER = "number"
    EMAIL = "email"
    PHONE = "phone"
    TOUR_NAME = "tour_name"
    HOTEL_NAME = "hotel_name"
    SERVICE_TYPE = "service_type"

class ConversationState(str, Enum):
    """Estados de la conversación"""
    IDLE = "idle"
    GREETING = "greeting"
    COLLECTING_INFO = "collecting_info"
    PROCESSING = "processing"
    CONFIRMING = "confirming"
    COMPLETED = "completed"
    ERROR = "error"

class ResponseType(str, Enum):
    """Tipos de respuesta del chatbot"""
    TEXT = "text"
    CARD = "card"
    CAROUSEL = "carousel"
    QUICK_REPLY = "quick_reply"
    MEDIA = "media"
    FORM = "form"
    PAYMENT = "payment"

@dataclass
class Intent:
    """Intención detectada"""
    type: IntentType
    confidence: float
    entities: List[Dict[str, Any]] = field(default_factory=list)
    context: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Entity:
    """Entidad extraída"""
    type: EntityType
    value: str
    confidence: float
    position: Tuple[int, int]
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Message:
    """Mensaje del usuario o bot"""
    id: str
    sender: str  # user_id or 'bot'
    text: str
    timestamp: datetime
    intent: Optional[Intent] = None
    entities: List[Entity] = field(default_factory=list)
    sentiment: Optional[float] = None
    language: str = "es"
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ConversationContext:
    """Contexto de conversación"""
    session_id: str
    user_id: str
    state: ConversationState
    messages: List[Message] = field(default_factory=list)
    current_intent: Optional[Intent] = None
    collected_data: Dict[str, Any] = field(default_factory=dict)
    preferences: Dict[str, Any] = field(default_factory=dict)
    history: List[Dict[str, Any]] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

# ================== NLU Engine ==================

class NLUEngine:
    """Motor de comprensión de lenguaje natural"""
    
    def __init__(self):
        self.models = {}
        self.tokenizers = {}
        self.nlp = {}
        self.sentence_transformer = None
        self.knowledge_base = []
        self.intent_patterns = self._load_intent_patterns()
        self.entity_patterns = self._load_entity_patterns()
        
    async def initialize(self):
        """Inicializar modelos NLU"""
        try:
            # Cargar modelos de SpaCy para múltiples idiomas
            self.nlp['es'] = spacy.load("es_core_news_sm")
            self.nlp['en'] = spacy.load("en_core_web_sm")
            
            # Cargar modelo de clasificación de intenciones
            self.tokenizers['intent'] = AutoTokenizer.from_pretrained(
                "bert-base-multilingual-uncased"
            )
            self.models['intent'] = AutoModelForSequenceClassification.from_pretrained(
                "bert-base-multilingual-uncased",
                num_labels=len(IntentType)
            )
            
            # Cargar modelo de extracción de entidades
            self.tokenizers['ner'] = AutoTokenizer.from_pretrained(
                "dslim/bert-base-NER"
            )
            self.models['ner'] = AutoModelForTokenClassification.from_pretrained(
                "dslim/bert-base-NER"
            )
            
            # Cargar modelo de embeddings para similitud
            self.sentence_transformer = SentenceTransformer(
                'paraphrase-multilingual-MiniLM-L12-v2'
            )
            
            # Cargar base de conocimiento
            await self._load_knowledge_base()
            
            logger.info("NLU Engine initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing NLU Engine: {e}")
            # Fallback a modelos más simples si falla
            self._initialize_fallback()
    
    def _initialize_fallback(self):
        """Inicializar modelos de respaldo"""
        logger.info("Using fallback NLU models")
        # Usar reglas y patrones simples como respaldo
        
    def _load_intent_patterns(self) -> Dict[IntentType, List[str]]:
        """Cargar patrones de intenciones"""
        return {
            IntentType.GREETING: [
                r"\bhola\b", r"\bbuen(os|as)?\s+(dias?|tardes?|noches?)\b",
                r"\bhello\b", r"\bhi\b", r"\bhey\b", r"\bsaludos\b"
            ],
            IntentType.BOOKING: [
                r"\breserv", r"\bbook", r"\bquiero\s+viajar",
                r"\bnecesito\s+un\s+(tour|viaje)", r"\bcomprar\s+paquete"
            ],
            IntentType.SEARCH: [
                r"\bbuscar?\b", r"\bencontrar\b", r"\bsearch",
                r"\b(donde|dónde)\s+(esta|está|queda)", r"\bmostrar?\b"
            ],
            IntentType.CANCEL: [
                r"\bcancelar?\b", r"\banular?\b", r"\bdeshacer\b",
                r"\bno\s+quiero", r"\beliminar\s+reserva"
            ],
            IntentType.PAYMENT: [
                r"\bpag(ar|o)\b", r"\btarjeta", r"\btransferencia",
                r"\bcuanto\s+cuesta", r"\bprecio", r"\bcost"
            ],
            IntentType.SUPPORT: [
                r"\bayuda", r"\bhelp", r"\basistencia",
                r"\bproblema", r"\bno\s+funciona", r"\berror"
            ],
            IntentType.RECOMMENDATION: [
                r"\brecomend", r"\bsuger", r"\bconsej",
                r"\bque\s+me\s+recomien", r"\bmejor\s+opci"
            ]
        }
    
    def _load_entity_patterns(self) -> Dict[EntityType, List[str]]:
        """Cargar patrones de entidades"""
        return {
            EntityType.EMAIL: [
                r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
            ],
            EntityType.PHONE: [
                r"\+?[1-9]\d{7,14}", r"\(\d{2,4}\)\s?\d{3,4}-?\d{4}"
            ],
            EntityType.DATE: [
                r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}",
                r"(hoy|mañana|pasado\s+mañana|ayer)",
                r"(lunes|martes|miércoles|jueves|viernes|sábado|domingo)"
            ],
            EntityType.MONEY: [
                r"\$\s?\d+([.,]\d{2})?", r"\d+\s?(USD|EUR|COP|MXN|PEN)"
            ]
        }
    
    async def _load_knowledge_base(self):
        """Cargar base de conocimiento de FAQs y respuestas"""
        self.knowledge_base = [
            {
                "question": "¿Cómo puedo reservar un tour?",
                "answer": "Puedes reservar un tour seleccionando tu destino y fechas. Te ayudaré paso a paso.",
                "keywords": ["reservar", "tour", "como", "booking"],
                "category": "booking"
            },
            {
                "question": "¿Cuáles son los métodos de pago?",
                "answer": "Aceptamos tarjetas de crédito/débito, PayPal, transferencias y pagos en efectivo en puntos autorizados.",
                "keywords": ["pago", "tarjeta", "payment", "metodos"],
                "category": "payment"
            },
            {
                "question": "¿Puedo cancelar mi reserva?",
                "answer": "Sí, puedes cancelar hasta 48 horas antes del viaje para un reembolso completo.",
                "keywords": ["cancelar", "cancel", "reembolso", "devolucion"],
                "category": "cancel"
            },
            # Agregar más FAQs según necesidad
        ]
        
        # Crear embeddings para búsqueda semántica
        if self.sentence_transformer:
            questions = [kb['question'] for kb in self.knowledge_base]
            embeddings = self.sentence_transformer.encode(questions)
            for i, kb in enumerate(self.knowledge_base):
                kb['embedding'] = embeddings[i]
    
    async def detect_intent(self, text: str, context: ConversationContext) -> Intent:
        """Detectar la intención del usuario"""
        try:
            # Método 1: Usar modelo de transformers
            if 'intent' in self.models and 'intent' in self.tokenizers:
                inputs = self.tokenizers['intent'](
                    text, return_tensors="pt",
                    padding=True, truncation=True, max_length=128
                )
                
                with torch.no_grad():
                    outputs = self.models['intent'](**inputs)
                    predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
                    confidence = float(torch.max(predictions))
                    intent_idx = torch.argmax(predictions, dim=-1).item()
                
                # Mapear índice a IntentType
                intent_type = list(IntentType)[intent_idx]
                
                if confidence > 0.7:
                    return Intent(
                        type=intent_type,
                        confidence=confidence,
                        context={'method': 'transformer'}
                    )
            
            # Método 2: Usar patrones regex como fallback
            text_lower = text.lower()
            best_intent = IntentType.UNKNOWN
            best_confidence = 0.0
            
            for intent_type, patterns in self.intent_patterns.items():
                for pattern in patterns:
                    if re.search(pattern, text_lower):
                        confidence = 0.8  # Confidence base para regex
                        if confidence > best_confidence:
                            best_confidence = confidence
                            best_intent = intent_type
            
            # Método 3: Usar contexto de conversación
            if best_intent == IntentType.UNKNOWN and context.current_intent:
                # Inferir basado en el contexto
                if context.state == ConversationState.COLLECTING_INFO:
                    best_intent = context.current_intent.type
                    best_confidence = 0.6
            
            return Intent(
                type=best_intent,
                confidence=best_confidence,
                context={'method': 'pattern_matching'}
            )
            
        except Exception as e:
            logger.error(f"Error detecting intent: {e}")
            return Intent(type=IntentType.UNKNOWN, confidence=0.0)
    
    async def extract_entities(self, text: str, lang: str = "es") -> List[Entity]:
        """Extraer entidades del texto"""
        entities = []
        
        try:
            # Método 1: Usar SpaCy NER
            if lang in self.nlp:
                doc = self.nlp[lang](text)
                for ent in doc.ents:
                    entity_type = self._map_spacy_to_entity_type(ent.label_)
                    if entity_type:
                        entities.append(Entity(
                            type=entity_type,
                            value=ent.text,
                            confidence=0.85,
                            position=(ent.start_char, ent.end_char),
                            metadata={'source': 'spacy', 'label': ent.label_}
                        ))
            
            # Método 2: Usar patrones regex
            for entity_type, patterns in self.entity_patterns.items():
                for pattern in patterns:
                    matches = re.finditer(pattern, text, re.IGNORECASE)
                    for match in matches:
                        # Evitar duplicados
                        value = match.group()
                        if not any(e.value == value for e in entities):
                            entities.append(Entity(
                                type=entity_type,
                                value=value,
                                confidence=0.9,
                                position=match.span(),
                                metadata={'source': 'regex'}
                            ))
            
            # Método 3: Usar modelo BERT NER si está disponible
            if 'ner' in self.models and 'ner' in self.tokenizers:
                inputs = self.tokenizers['ner'](
                    text, return_tensors="pt",
                    padding=True, truncation=True
                )
                
                with torch.no_grad():
                    outputs = self.models['ner'](**inputs)
                    predictions = torch.argmax(outputs.logits, dim=2)
                
                # Procesar predicciones NER
                tokens = self.tokenizers['ner'].convert_ids_to_tokens(inputs["input_ids"][0])
                for idx, (token, pred) in enumerate(zip(tokens, predictions[0])):
                    if pred > 0:  # 0 generalmente es 'O' (Outside)
                        # Aquí procesarías las etiquetas BIO
                        pass
            
        except Exception as e:
            logger.error(f"Error extracting entities: {e}")
        
        return entities
    
    def _map_spacy_to_entity_type(self, spacy_label: str) -> Optional[EntityType]:
        """Mapear etiquetas de SpaCy a EntityType"""
        mapping = {
            'LOC': EntityType.LOCATION,
            'GPE': EntityType.LOCATION,
            'DATE': EntityType.DATE,
            'PERSON': EntityType.PERSON,
            'PER': EntityType.PERSON,
            'MONEY': EntityType.MONEY,
            'CARDINAL': EntityType.NUMBER,
        }
        return mapping.get(spacy_label)
    
    async def analyze_sentiment(self, text: str) -> float:
        """Analizar sentimiento del texto"""
        try:
            blob = TextBlob(text)
            # Retorna valor entre -1 (negativo) y 1 (positivo)
            return blob.sentiment.polarity
        except Exception as e:
            logger.error(f"Error analyzing sentiment: {e}")
            return 0.0
    
    async def find_best_answer(self, question: str) -> Optional[Dict[str, Any]]:
        """Buscar la mejor respuesta en la base de conocimiento"""
        if not self.sentence_transformer or not self.knowledge_base:
            return None
        
        try:
            # Crear embedding de la pregunta
            question_embedding = self.sentence_transformer.encode([question])[0]
            
            # Calcular similitud con la base de conocimiento
            best_match = None
            best_score = 0.0
            
            for kb_item in self.knowledge_base:
                if 'embedding' in kb_item:
                    similarity = cosine_similarity(
                        [question_embedding],
                        [kb_item['embedding']]
                    )[0][0]
                    
                    if similarity > best_score and similarity > 0.7:
                        best_score = similarity
                        best_match = kb_item
            
            if best_match:
                return {
                    'answer': best_match['answer'],
                    'confidence': best_score,
                    'category': best_match.get('category')
                }
                
        except Exception as e:
            logger.error(f"Error finding answer: {e}")
        
        return None

# ================== Dialog Manager ==================

class DialogManager:
    """Gestor de diálogos y flujos de conversación"""
    
    def __init__(self, nlu_engine: NLUEngine):
        self.nlu_engine = nlu_engine
        self.dialog_flows = self._load_dialog_flows()
        self.response_templates = self._load_response_templates()
        
    def _load_dialog_flows(self) -> Dict[IntentType, Dict]:
        """Cargar flujos de diálogo para cada intención"""
        return {
            IntentType.BOOKING: {
                'required_info': ['destination', 'dates', 'passengers'],
                'steps': [
                    {'ask': '¿A dónde te gustaría viajar?', 'collect': 'destination'},
                    {'ask': '¿Cuáles son tus fechas de viaje?', 'collect': 'dates'},
                    {'ask': '¿Cuántos pasajeros viajan?', 'collect': 'passengers'}
                ],
                'confirmation': '¡Perfecto! He encontrado tours disponibles para {destination}.'
            },
            IntentType.PAYMENT: {
                'required_info': ['booking_id', 'payment_method'],
                'steps': [
                    {'ask': '¿Cuál es tu número de reserva?', 'collect': 'booking_id'},
                    {'ask': '¿Cómo deseas pagar? (tarjeta/paypal/transferencia)', 'collect': 'payment_method'}
                ],
                'confirmation': 'Procesando pago para la reserva {booking_id}.'
            },
            # Más flujos según necesidad
        }
    
    def _load_response_templates(self) -> Dict[str, List[str]]:
        """Cargar plantillas de respuesta"""
        return {
            'greeting': [
                "¡Hola! 👋 Soy tu asistente virtual de Spirit Tours. ¿En qué puedo ayudarte hoy?",
                "¡Bienvenido a Spirit Tours! 🌟 Estoy aquí para ayudarte con tus reservas y consultas.",
                "¡Hola! ¿Listo para planear tu próxima aventura? 🏝️"
            ],
            'farewell': [
                "¡Hasta pronto! Que tengas un excelente día. 😊",
                "¡Fue un placer ayudarte! Vuelve cuando quieras. 👋",
                "¡Buen viaje! Estamos aquí cuando nos necesites. ✈️"
            ],
            'unknown': [
                "No estoy seguro de entender. ¿Podrías reformular tu pregunta?",
                "Disculpa, no comprendí bien. ¿Puedes darme más detalles?",
                "Hmm, no estoy seguro. ¿Te puedo ayudar con reservas, pagos o información de tours?"
            ],
            'waiting': [
                "Un momento, estoy procesando tu solicitud... ⏳",
                "Déjame buscar esa información para ti... 🔍",
                "Procesando... Esto tomará solo un segundo. 💫"
            ],
            'error': [
                "Lo siento, hubo un problema. ¿Podrías intentar de nuevo?",
                "Ups, algo salió mal. Déjame intentar otra vez.",
                "Disculpa el inconveniente. ¿Podemos empezar de nuevo?"
            ]
        }
    
    async def process_message(
        self,
        message: Message,
        context: ConversationContext
    ) -> Dict[str, Any]:
        """Procesar mensaje y generar respuesta"""
        try:
            # Detectar intención
            intent = await self.nlu_engine.detect_intent(message.text, context)
            message.intent = intent
            
            # Extraer entidades
            entities = await self.nlu_engine.extract_entities(
                message.text,
                message.language
            )
            message.entities = entities
            
            # Analizar sentimiento
            sentiment = await self.nlu_engine.analyze_sentiment(message.text)
            message.sentiment = sentiment
            
            # Actualizar contexto
            context.messages.append(message)
            context.current_intent = intent
            context.updated_at = datetime.utcnow()
            
            # Generar respuesta basada en la intención
            response = await self._generate_response(intent, entities, context)
            
            # Si el sentimiento es muy negativo, escalar a agente humano
            if sentiment < -0.5:
                response['escalate'] = True
                response['reason'] = 'negative_sentiment'
            
            return response
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            return self._create_error_response()
    
    async def _generate_response(
        self,
        intent: Intent,
        entities: List[Entity],
        context: ConversationContext
    ) -> Dict[str, Any]:
        """Generar respuesta apropiada"""
        
        # Manejar intenciones básicas
        if intent.type == IntentType.GREETING:
            return self._create_text_response(
                self._get_random_template('greeting'),
                ResponseType.TEXT
            )
        
        elif intent.type == IntentType.FAREWELL:
            context.state = ConversationState.COMPLETED
            return self._create_text_response(
                self._get_random_template('farewell'),
                ResponseType.TEXT
            )
        
        # Manejar flujos de diálogo complejos
        elif intent.type in self.dialog_flows:
            return await self._handle_dialog_flow(intent, entities, context)
        
        # Buscar en base de conocimiento
        elif intent.type == IntentType.FAQ or intent.type == IntentType.UNKNOWN:
            answer = await self.nlu_engine.find_best_answer(context.messages[-1].text)
            if answer:
                return self._create_text_response(
                    answer['answer'],
                    ResponseType.TEXT,
                    metadata={'source': 'knowledge_base', 'confidence': answer['confidence']}
                )
        
        # Respuesta por defecto
        return self._create_text_response(
            self._get_random_template('unknown'),
            ResponseType.TEXT
        )
    
    async def _handle_dialog_flow(
        self,
        intent: Intent,
        entities: List[Entity],
        context: ConversationContext
    ) -> Dict[str, Any]:
        """Manejar flujo de diálogo complejo"""
        flow = self.dialog_flows[intent.type]
        
        # Actualizar información recolectada con entidades
        for entity in entities:
            # Mapear entidad a campo requerido
            if entity.type == EntityType.LOCATION:
                context.collected_data['destination'] = entity.value
            elif entity.type == EntityType.DATE:
                context.collected_data['dates'] = entity.value
            elif entity.type == EntityType.NUMBER:
                context.collected_data['passengers'] = entity.value
        
        # Verificar qué información falta
        missing_info = []
        for required in flow['required_info']:
            if required not in context.collected_data:
                missing_info.append(required)
        
        # Si falta información, preguntar
        if missing_info:
            context.state = ConversationState.COLLECTING_INFO
            next_field = missing_info[0]
            
            for step in flow['steps']:
                if step['collect'] == next_field:
                    return self._create_text_response(
                        step['ask'],
                        ResponseType.TEXT,
                        quick_replies=self._get_quick_replies_for_field(next_field)
                    )
        
        # Si tenemos toda la información, procesar
        context.state = ConversationState.PROCESSING
        confirmation = flow['confirmation'].format(**context.collected_data)
        
        # Ejecutar acción correspondiente
        if intent.type == IntentType.BOOKING:
            results = await self._search_tours(context.collected_data)
            return self._create_carousel_response(confirmation, results)
        
        elif intent.type == IntentType.PAYMENT:
            payment_link = await self._generate_payment_link(context.collected_data)
            return self._create_payment_response(confirmation, payment_link)
        
        return self._create_text_response(confirmation, ResponseType.TEXT)
    
    def _get_random_template(self, category: str) -> str:
        """Obtener plantilla aleatoria de respuesta"""
        import random
        templates = self.response_templates.get(category, ["Lo siento, no tengo una respuesta."])
        return random.choice(templates)
    
    def _get_quick_replies_for_field(self, field: str) -> List[str]:
        """Obtener respuestas rápidas para un campo"""
        quick_replies = {
            'destination': ['Cancún', 'Cartagena', 'Miami', 'París', 'Ver todos'],
            'passengers': ['1', '2', '3', '4', '5+'],
            'payment_method': ['Tarjeta de crédito', 'PayPal', 'Transferencia']
        }
        return quick_replies.get(field, [])
    
    def _create_text_response(
        self,
        text: str,
        response_type: ResponseType = ResponseType.TEXT,
        quick_replies: List[str] = None,
        metadata: Dict = None
    ) -> Dict[str, Any]:
        """Crear respuesta de texto"""
        response = {
            'type': response_type.value,
            'text': text,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        if quick_replies:
            response['quick_replies'] = quick_replies
        
        if metadata:
            response['metadata'] = metadata
            
        return response
    
    def _create_carousel_response(self, text: str, items: List[Dict]) -> Dict[str, Any]:
        """Crear respuesta tipo carrusel"""
        return {
            'type': ResponseType.CAROUSEL.value,
            'text': text,
            'items': items[:5],  # Limitar a 5 items
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def _create_payment_response(self, text: str, payment_link: str) -> Dict[str, Any]:
        """Crear respuesta de pago"""
        return {
            'type': ResponseType.PAYMENT.value,
            'text': text,
            'payment_link': payment_link,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def _create_error_response(self) -> Dict[str, Any]:
        """Crear respuesta de error"""
        return self._create_text_response(
            self._get_random_template('error'),
            ResponseType.TEXT
        )
    
    async def _search_tours(self, criteria: Dict) -> List[Dict]:
        """Buscar tours según criterios (placeholder)"""
        # Aquí integrarías con el sistema de búsqueda real
        return [
            {
                'title': 'Tour Cancún Todo Incluido',
                'image': '/images/cancun.jpg',
                'price': '$899',
                'description': '5 días / 4 noches',
                'action': {'type': 'button', 'text': 'Ver detalles', 'url': '/tour/123'}
            }
        ]
    
    async def _generate_payment_link(self, payment_data: Dict) -> str:
        """Generar link de pago (placeholder)"""
        # Aquí integrarías con el sistema de pagos real
        return f"https://payments.spirittours.com/pay/{payment_data.get('booking_id')}"

# ================== Chatbot Service ==================

class IntelligentChatbotService:
    """Servicio principal del chatbot inteligente"""
    
    def __init__(
        self,
        redis_client: redis.Redis,
        email_service: AdvancedEmailService,
        payment_gateway: UnifiedPaymentGateway,
        ml_system: AdvancedMLSystem,
        event_bus: EventBus,
        workflow_engine: WorkflowEngine
    ):
        self.redis = redis_client
        self.email_service = email_service
        self.payment_gateway = payment_gateway
        self.ml_system = ml_system
        self.event_bus = event_bus
        self.workflow_engine = workflow_engine
        
        # Inicializar componentes
        self.nlu_engine = NLUEngine()
        self.dialog_manager = DialogManager(self.nlu_engine)
        self.voice_processor = VoiceProcessor()
        self.analytics = ChatbotAnalytics(redis_client)
        
        # Cache de contextos de conversación
        self.conversations: Dict[str, ConversationContext] = {}
        
        # Configuración
        self.config = {
            'max_conversation_idle_minutes': 30,
            'escalation_threshold': 3,  # Intentos antes de escalar
            'typing_delay_ms': 1500,
            'max_message_length': 1000,
            'supported_languages': ['es', 'en', 'pt', 'fr'],
            'enable_voice': True,
            'enable_proactive': True
        }
    
    async def initialize(self):
        """Inicializar servicio de chatbot"""
        await self.nlu_engine.initialize()
        await self.analytics.initialize()
        
        # Cargar contextos persistidos
        await self._load_persisted_contexts()
        
        # Iniciar trabajos en background
        asyncio.create_task(self._cleanup_idle_conversations())
        asyncio.create_task(self._proactive_engagement_worker())
        
        logger.info("Intelligent Chatbot Service initialized")
    
    async def process_text_message(
        self,
        user_id: str,
        text: str,
        session_id: Optional[str] = None,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Procesar mensaje de texto"""
        try:
            # Validar entrada
            if len(text) > self.config['max_message_length']:
                return {
                    'error': 'Message too long',
                    'max_length': self.config['max_message_length']
                }
            
            # Detectar idioma
            language = langdetect.detect(text)
            if language not in self.config['supported_languages']:
                language = 'es'  # Default
            
            # Obtener o crear contexto de conversación
            context = await self._get_or_create_context(user_id, session_id)
            
            # Crear mensaje
            message = Message(
                id=str(uuid.uuid4()),
                sender=user_id,
                text=text,
                timestamp=datetime.utcnow(),
                language=language,
                metadata=metadata or {}
            )
            
            # Procesar mensaje
            response = await self.dialog_manager.process_message(message, context)
            
            # Guardar contexto actualizado
            await self._save_context(context)
            
            # Registrar analytics
            await self.analytics.track_message(message, response, context)
            
            # Publicar evento
            await self.event_bus.publish('chatbot.message.processed', {
                'user_id': user_id,
                'session_id': context.session_id,
                'intent': message.intent.type if message.intent else None,
                'response_type': response.get('type')
            })
            
            # Agregar delay de typing si está configurado
            if self.config['typing_delay_ms'] > 0:
                response['typing_delay'] = self.config['typing_delay_ms']
            
            return response
            
        except Exception as e:
            logger.error(f"Error processing text message: {e}")
            return {
                'type': 'error',
                'text': 'Lo siento, hubo un error procesando tu mensaje.',
                'error': str(e)
            }
    
    async def process_voice_message(
        self,
        user_id: str,
        audio_data: bytes,
        format: str = 'wav',
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Procesar mensaje de voz"""
        if not self.config['enable_voice']:
            return {'error': 'Voice processing is disabled'}
        
        try:
            # Convertir voz a texto
            text = await self.voice_processor.speech_to_text(audio_data, format)
            
            if not text:
                return {
                    'type': 'error',
                    'text': 'No pude entender el audio. ¿Podrías repetir?'
                }
            
            # Procesar como mensaje de texto
            response = await self.process_text_message(
                user_id, text, session_id,
                metadata={'input_type': 'voice'}
            )
            
            # Convertir respuesta a voz si es posible
            if response.get('text') and not response.get('error'):
                audio_response = await self.voice_processor.text_to_speech(
                    response['text']
                )
                response['audio'] = audio_response
            
            return response
            
        except Exception as e:
            logger.error(f"Error processing voice message: {e}")
            return {'error': 'Voice processing failed', 'details': str(e)}
    
    async def get_conversation_history(
        self,
        user_id: str,
        session_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Obtener historial de conversación"""
        try:
            context = await self._get_context(user_id, session_id)
            if not context:
                return []
            
            messages = []
            for msg in context.messages[-limit:]:
                messages.append({
                    'id': msg.id,
                    'sender': msg.sender,
                    'text': msg.text,
                    'timestamp': msg.timestamp.isoformat(),
                    'intent': msg.intent.type if msg.intent else None,
                    'sentiment': msg.sentiment
                })
            
            return messages
            
        except Exception as e:
            logger.error(f"Error getting conversation history: {e}")
            return []
    
    async def escalate_to_human(
        self,
        user_id: str,
        reason: str,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Escalar conversación a agente humano"""
        try:
            context = await self._get_context(user_id, session_id)
            
            # Crear ticket de soporte
            ticket_data = {
                'user_id': user_id,
                'session_id': context.session_id if context else None,
                'reason': reason,
                'conversation_summary': await self._generate_conversation_summary(context),
                'created_at': datetime.utcnow()
            }
            
            # Publicar evento de escalación
            await self.event_bus.publish('chatbot.escalation', ticket_data)
            
            # Notificar al equipo de soporte
            await self.email_service.send_email(
                to=['support@spirittours.com'],
                subject='Escalación de Chatbot - Atención Requerida',
                template='support_escalation',
                context=ticket_data
            )
            
            return {
                'type': 'escalation',
                'text': 'Te estoy transfiriendo con un agente humano que te ayudará mejor.',
                'ticket_id': ticket_data.get('id'),
                'estimated_wait': '2-5 minutos'
            }
            
        except Exception as e:
            logger.error(f"Error escalating to human: {e}")
            return {'error': 'Escalation failed'}
    
    async def _get_or_create_context(
        self,
        user_id: str,
        session_id: Optional[str] = None
    ) -> ConversationContext:
        """Obtener o crear contexto de conversación"""
        key = f"{user_id}:{session_id}" if session_id else user_id
        
        if key in self.conversations:
            return self.conversations[key]
        
        # Buscar en Redis
        context_data = await self.redis.get(f"chatbot:context:{key}")
        if context_data:
            context_dict = json.loads(context_data)
            context = ConversationContext(**context_dict)
            self.conversations[key] = context
            return context
        
        # Crear nuevo contexto
        context = ConversationContext(
            session_id=session_id or str(uuid.uuid4()),
            user_id=user_id,
            state=ConversationState.IDLE
        )
        
        # Cargar preferencias del usuario
        user_prefs = await self._load_user_preferences(user_id)
        context.preferences = user_prefs
        
        self.conversations[key] = context
        return context
    
    async def _get_context(
        self,
        user_id: str,
        session_id: Optional[str] = None
    ) -> Optional[ConversationContext]:
        """Obtener contexto existente"""
        key = f"{user_id}:{session_id}" if session_id else user_id
        return self.conversations.get(key)
    
    async def _save_context(self, context: ConversationContext):
        """Guardar contexto en Redis"""
        key = f"{context.user_id}:{context.session_id}"
        self.conversations[key] = context
        
        # Serializar y guardar en Redis
        context_data = {
            'session_id': context.session_id,
            'user_id': context.user_id,
            'state': context.state.value,
            'collected_data': context.collected_data,
            'preferences': context.preferences,
            'created_at': context.created_at.isoformat(),
            'updated_at': context.updated_at.isoformat()
        }
        
        await self.redis.setex(
            f"chatbot:context:{key}",
            3600 * 24,  # 24 horas TTL
            json.dumps(context_data)
        )
    
    async def _load_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Cargar preferencias del usuario"""
        # Aquí cargarías las preferencias desde la base de datos
        return {
            'language': 'es',
            'notification_enabled': True,
            'preferred_destinations': [],
            'budget_range': None
        }
    
    async def _generate_conversation_summary(
        self,
        context: Optional[ConversationContext]
    ) -> str:
        """Generar resumen de la conversación"""
        if not context or not context.messages:
            return "No hay mensajes en la conversación"
        
        summary_parts = [
            f"Usuario: {context.user_id}",
            f"Sesión: {context.session_id}",
            f"Mensajes: {len(context.messages)}",
            f"Estado: {context.state.value}",
        ]
        
        if context.current_intent:
            summary_parts.append(f"Intención: {context.current_intent.type}")
        
        if context.collected_data:
            summary_parts.append(f"Datos recolectados: {context.collected_data}")
        
        # Últimos 3 mensajes
        recent_messages = context.messages[-3:]
        summary_parts.append("\nÚltimos mensajes:")
        for msg in recent_messages:
            summary_parts.append(f"- {msg.sender}: {msg.text[:50]}...")
        
        return "\n".join(summary_parts)
    
    async def _load_persisted_contexts(self):
        """Cargar contextos persistidos desde Redis"""
        try:
            keys = await self.redis.keys("chatbot:context:*")
            for key in keys:
                context_data = await self.redis.get(key)
                if context_data:
                    # Reconstruir contexto
                    pass
        except Exception as e:
            logger.error(f"Error loading persisted contexts: {e}")
    
    async def _cleanup_idle_conversations(self):
        """Limpiar conversaciones inactivas"""
        while True:
            try:
                await asyncio.sleep(300)  # Cada 5 minutos
                
                now = datetime.utcnow()
                idle_threshold = timedelta(
                    minutes=self.config['max_conversation_idle_minutes']
                )
                
                keys_to_remove = []
                for key, context in self.conversations.items():
                    if now - context.updated_at > idle_threshold:
                        keys_to_remove.append(key)
                
                for key in keys_to_remove:
                    del self.conversations[key]
                    await self.redis.delete(f"chatbot:context:{key}")
                
                if keys_to_remove:
                    logger.info(f"Cleaned up {len(keys_to_remove)} idle conversations")
                    
            except Exception as e:
                logger.error(f"Error in cleanup task: {e}")
    
    async def _proactive_engagement_worker(self):
        """Worker para engagement proactivo"""
        if not self.config['enable_proactive']:
            return
        
        while True:
            try:
                await asyncio.sleep(60)  # Cada minuto
                
                # Implementar lógica de engagement proactivo
                # Por ejemplo, enviar mensajes a usuarios que están navegando
                
            except Exception as e:
                logger.error(f"Error in proactive engagement: {e}")

# ================== Voice Processing ==================

class VoiceProcessor:
    """Procesador de voz para STT y TTS"""
    
    def __init__(self):
        self.recognizer = sr.Recognizer()
        
    async def speech_to_text(self, audio_data: bytes, format: str = 'wav') -> Optional[str]:
        """Convertir voz a texto"""
        try:
            # Crear archivo temporal de audio
            audio_file = io.BytesIO(audio_data)
            
            # Usar speech_recognition
            with sr.AudioFile(audio_file) as source:
                audio = self.recognizer.record(source)
                
            # Intentar con múltiples servicios
            try:
                # Google Speech Recognition (gratis pero limitado)
                text = self.recognizer.recognize_google(audio, language='es-ES')
                return text
            except:
                # Fallback a otro servicio si falla
                pass
                
        except Exception as e:
            logger.error(f"Error in speech to text: {e}")
            return None
    
    async def text_to_speech(self, text: str, language: str = 'es') -> bytes:
        """Convertir texto a voz"""
        try:
            # Usar gTTS para generar audio
            tts = gTTS(text=text, lang=language, slow=False)
            
            # Guardar en buffer
            audio_buffer = io.BytesIO()
            tts.write_to_fp(audio_buffer)
            audio_buffer.seek(0)
            
            return audio_buffer.read()
            
        except Exception as e:
            logger.error(f"Error in text to speech: {e}")
            return b""

# ================== Analytics ==================

class ChatbotAnalytics:
    """Analytics y métricas del chatbot"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.metrics = {
            'total_messages': 0,
            'successful_intents': 0,
            'failed_intents': 0,
            'escalations': 0,
            'avg_response_time': 0,
            'user_satisfaction': 0
        }
    
    async def initialize(self):
        """Inicializar analytics"""
        # Cargar métricas desde Redis
        stored_metrics = await self.redis.get("chatbot:analytics:metrics")
        if stored_metrics:
            self.metrics.update(json.loads(stored_metrics))
    
    async def track_message(
        self,
        message: Message,
        response: Dict[str, Any],
        context: ConversationContext
    ):
        """Registrar mensaje y respuesta"""
        try:
            # Incrementar contadores
            self.metrics['total_messages'] += 1
            
            if message.intent and message.intent.confidence > 0.7:
                self.metrics['successful_intents'] += 1
            else:
                self.metrics['failed_intents'] += 1
            
            # Guardar evento
            event = {
                'timestamp': datetime.utcnow().isoformat(),
                'user_id': context.user_id,
                'session_id': context.session_id,
                'message_id': message.id,
                'intent': message.intent.type if message.intent else None,
                'confidence': message.intent.confidence if message.intent else 0,
                'sentiment': message.sentiment,
                'response_type': response.get('type'),
                'language': message.language
            }
            
            # Guardar en Redis (time series)
            await self.redis.zadd(
                "chatbot:analytics:events",
                {json.dumps(event): datetime.utcnow().timestamp()}
            )
            
            # Actualizar métricas agregadas
            await self._update_aggregated_metrics()
            
        except Exception as e:
            logger.error(f"Error tracking message: {e}")
    
    async def _update_aggregated_metrics(self):
        """Actualizar métricas agregadas"""
        await self.redis.setex(
            "chatbot:analytics:metrics",
            3600,  # 1 hora TTL
            json.dumps(self.metrics)
        )
    
    async def get_analytics_dashboard(self) -> Dict[str, Any]:
        """Obtener dashboard de analytics"""
        return {
            'metrics': self.metrics,
            'hourly_stats': await self._get_hourly_stats(),
            'top_intents': await self._get_top_intents(),
            'sentiment_distribution': await self._get_sentiment_distribution(),
            'language_distribution': await self._get_language_distribution()
        }
    
    async def _get_hourly_stats(self) -> List[Dict]:
        """Obtener estadísticas por hora"""
        # Implementar agregación por hora
        return []
    
    async def _get_top_intents(self) -> List[Dict]:
        """Obtener intenciones más comunes"""
        # Implementar agregación de intenciones
        return []
    
    async def _get_sentiment_distribution(self) -> Dict:
        """Obtener distribución de sentimientos"""
        # Implementar análisis de sentimientos
        return {
            'positive': 0.4,
            'neutral': 0.5,
            'negative': 0.1
        }
    
    async def _get_language_distribution(self) -> Dict:
        """Obtener distribución de idiomas"""
        # Implementar análisis de idiomas
        return {
            'es': 0.6,
            'en': 0.3,
            'pt': 0.1
        }

# ================== FastAPI Application ==================

app = FastAPI(title="Intelligent Chatbot API", version="1.0.0")

# Dependencias globales
chatbot_service: Optional[IntelligentChatbotService] = None

@app.on_event("startup")
async def startup_event():
    """Inicializar servicios al arrancar"""
    global chatbot_service
    
    # Inicializar conexiones
    redis_client = await redis.from_url("redis://localhost")
    
    # Inicializar servicios
    email_service = AdvancedEmailService(redis_client, None)
    payment_gateway = UnifiedPaymentGateway()
    ml_system = AdvancedMLSystem(redis_client)
    event_bus = EventBus(redis_client)
    workflow_engine = WorkflowEngine(None, redis_client, event_bus)
    
    # Crear servicio de chatbot
    chatbot_service = IntelligentChatbotService(
        redis_client,
        email_service,
        payment_gateway,
        ml_system,
        event_bus,
        workflow_engine
    )
    
    await chatbot_service.initialize()
    logger.info("Chatbot service initialized and ready")

# ================== API Endpoints ==================

class ChatMessage(BaseModel):
    text: str
    session_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class VoiceMessage(BaseModel):
    audio_data: str  # Base64 encoded
    format: str = "wav"
    session_id: Optional[str] = None

@app.post("/api/chatbot/message")
async def send_message(
    message: ChatMessage,
    user_id: str
) -> Dict[str, Any]:
    """Enviar mensaje al chatbot"""
    if not chatbot_service:
        raise HTTPException(status_code=503, detail="Chatbot service not initialized")
    
    response = await chatbot_service.process_text_message(
        user_id=user_id,
        text=message.text,
        session_id=message.session_id,
        metadata=message.metadata
    )
    
    return response

@app.post("/api/chatbot/voice")
async def send_voice_message(
    message: VoiceMessage,
    user_id: str
) -> Dict[str, Any]:
    """Enviar mensaje de voz al chatbot"""
    if not chatbot_service:
        raise HTTPException(status_code=503, detail="Chatbot service not initialized")
    
    # Decodificar audio de base64
    import base64
    audio_data = base64.b64decode(message.audio_data)
    
    response = await chatbot_service.process_voice_message(
        user_id=user_id,
        audio_data=audio_data,
        format=message.format,
        session_id=message.session_id
    )
    
    return response

@app.get("/api/chatbot/history/{user_id}")
async def get_history(
    user_id: str,
    session_id: Optional[str] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """Obtener historial de conversación"""
    if not chatbot_service:
        raise HTTPException(status_code=503, detail="Chatbot service not initialized")
    
    history = await chatbot_service.get_conversation_history(
        user_id=user_id,
        session_id=session_id,
        limit=limit
    )
    
    return history

@app.post("/api/chatbot/escalate")
async def escalate_conversation(
    user_id: str,
    reason: str,
    session_id: Optional[str] = None
) -> Dict[str, Any]:
    """Escalar conversación a agente humano"""
    if not chatbot_service:
        raise HTTPException(status_code=503, detail="Chatbot service not initialized")
    
    result = await chatbot_service.escalate_to_human(
        user_id=user_id,
        reason=reason,
        session_id=session_id
    )
    
    return result

@app.get("/api/chatbot/analytics")
async def get_analytics() -> Dict[str, Any]:
    """Obtener analytics del chatbot"""
    if not chatbot_service:
        raise HTTPException(status_code=503, detail="Chatbot service not initialized")
    
    analytics = await chatbot_service.analytics.get_analytics_dashboard()
    return analytics

@app.websocket("/ws/chatbot/{user_id}")
async def websocket_chat(websocket: WebSocket, user_id: str):
    """WebSocket para chat en tiempo real"""
    await websocket.accept()
    session_id = str(uuid.uuid4())
    
    try:
        while True:
            # Recibir mensaje
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Procesar mensaje
            response = await chatbot_service.process_text_message(
                user_id=user_id,
                text=message_data.get('text'),
                session_id=session_id,
                metadata=message_data.get('metadata')
            )
            
            # Enviar respuesta
            await websocket.send_json(response)
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close()

# ================== Health Check ==================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "intelligent-chatbot",
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8007)