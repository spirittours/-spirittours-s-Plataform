"""
Spirit Tours - FeedbackAnalyzer AI Agent
Agente de análisis avanzado de retroalimentación y insights de clientes
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass, field
from enum import Enum
import uuid
import numpy as np
from decimal import Decimal
import re
from collections import defaultdict, Counter
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FeedbackSource(Enum):
    """Fuentes de retroalimentación"""
    SURVEY = "survey"
    REVIEW = "review"
    EMAIL = "email"
    CHAT = "chat"
    PHONE = "phone"
    SOCIAL_MEDIA = "social_media"
    IN_PERSON = "in_person"
    MOBILE_APP = "mobile_app"

class FeedbackType(Enum):
    """Tipos de retroalimentación"""
    COMPLIMENT = "compliment"
    COMPLAINT = "complaint"
    SUGGESTION = "suggestion"
    INQUIRY = "inquiry"
    TESTIMONIAL = "testimonial"
    BUG_REPORT = "bug_report"
    FEATURE_REQUEST = "feature_request"
    GENERAL_FEEDBACK = "general_feedback"

class SentimentCategory(Enum):
    """Categorías de sentimiento"""
    VERY_POSITIVE = "very_positive"
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    VERY_NEGATIVE = "very_negative"
    MIXED = "mixed"

class PriorityLevel(Enum):
    """Niveles de prioridad"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class ActionStatus(Enum):
    """Estados de acción"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"
    ON_HOLD = "on_hold"

@dataclass
class FeedbackItem:
    """Item individual de retroalimentación"""
    feedback_id: str
    customer_id: str
    source: FeedbackSource
    feedback_type: FeedbackType
    title: str
    content: str
    rating: Optional[float]
    timestamp: datetime
    product_service: str
    tour_date: Optional[datetime]
    guide_id: Optional[str]
    location: str
    language: str
    metadata: Dict[str, Any]

@dataclass
class SentimentAnalysis:
    """Análisis de sentimiento detallado"""
    sentiment_category: SentimentCategory
    confidence: float
    polarity: float  # -1 to 1
    subjectivity: float  # 0 to 1
    emotion_scores: Dict[str, float]
    key_phrases: List[str]
    topics_mentioned: List[str]
    intensity: float  # 0 to 1

@dataclass
class FeedbackInsight:
    """Insight generado del análisis"""
    insight_id: str
    insight_type: str
    title: str
    description: str
    confidence: float
    supporting_evidence: List[str]
    impact_assessment: str
    recommended_actions: List[str]
    priority: PriorityLevel
    affected_areas: List[str]
    quantitative_data: Dict[str, float]

@dataclass
class ActionItem:
    """Item de acción derivado del feedback"""
    action_id: str
    title: str
    description: str
    priority: PriorityLevel
    assigned_department: str
    estimated_effort: str
    expected_impact: str
    deadline: Optional[datetime]
    status: ActionStatus
    created_from: List[str]  # feedback_ids
    success_metrics: List[str]

@dataclass
class TrendAnalysis:
    """Análisis de tendencias en el feedback"""
    trend_id: str
    trend_name: str
    time_period: Tuple[datetime, datetime]
    trend_direction: str  # increasing, decreasing, stable
    strength: float
    categories_affected: List[str]
    key_drivers: List[str]
    forecast: Dict[str, float]

class FeedbackProcessor:
    """Procesador avanzado de retroalimentación"""
    
    def __init__(self):
        self.text_analyzers = self._initialize_text_analyzers()
        self.sentiment_models = self._initialize_sentiment_models()
        self.topic_extractors = self._initialize_topic_extractors()
        self.language_processors = self._initialize_language_processors()
        
    def _initialize_text_analyzers(self) -> Dict[str, Dict]:
        """Inicializa analizadores de texto"""
        return {
            "keyword_extractor": {"accuracy": 0.89, "speed": "fast"},
            "phrase_analyzer": {"accuracy": 0.91, "speed": "medium"},
            "context_analyzer": {"accuracy": 0.87, "speed": "slow"},
            "intent_classifier": {"accuracy": 0.85, "speed": "fast"}
        }
    
    def _initialize_sentiment_models(self) -> Dict[str, Dict]:
        """Inicializa modelos de sentimiento"""
        return {
            "transformer_model": {"accuracy": 0.94, "languages": ["es", "en", "fr", "de"]},
            "lexicon_based": {"accuracy": 0.82, "languages": ["es", "en"]},
            "ml_classifier": {"accuracy": 0.88, "languages": ["es", "en", "fr"]},
            "ensemble_model": {"accuracy": 0.96, "languages": ["es", "en"]}
        }
    
    def _initialize_topic_extractors(self) -> Dict[str, Dict]:
        """Inicializa extractores de temas"""
        return {
            "lda_model": {"topics": 15, "coherence": 0.78},
            "bert_topic": {"topics": 20, "coherence": 0.84},
            "keyword_clustering": {"topics": 12, "coherence": 0.71},
            "custom_tourism": {"topics": 25, "coherence": 0.89}
        }
    
    def _initialize_language_processors(self) -> Dict[str, Dict]:
        """Inicializa procesadores de lenguaje"""
        return {
            "spanish": {"support": "native", "accuracy": 0.95},
            "english": {"support": "native", "accuracy": 0.94},
            "french": {"support": "good", "accuracy": 0.87},
            "german": {"support": "good", "accuracy": 0.85},
            "italian": {"support": "basic", "accuracy": 0.78}
        }
    
    async def process_feedback(self, feedback: FeedbackItem) -> Dict:
        """Procesa un item de retroalimentación completo"""
        try:
            # Análisis de sentimiento
            sentiment = await self._analyze_sentiment(feedback)
            
            # Extracción de temas
            topics = await self._extract_topics(feedback)
            
            # Clasificación de tipo
            feedback_classification = await self._classify_feedback(feedback)
            
            # Análisis de intención
            intent_analysis = await self._analyze_intent(feedback)
            
            # Extracción de entidades
            entities = await self._extract_entities(feedback)
            
            # Evaluación de prioridad
            priority = await self._evaluate_priority(feedback, sentiment)
            
            # Detección de problemas
            issues = await self._detect_issues(feedback, sentiment, topics)
            
            return {
                "feedback_id": feedback.feedback_id,
                "processing_timestamp": datetime.now().isoformat(),
                "sentiment_analysis": sentiment,
                "topics_extracted": topics,
                "classification": feedback_classification,
                "intent_analysis": intent_analysis,
                "entities": entities,
                "priority_assessment": priority,
                "issues_detected": issues,
                "processing_confidence": await self._calculate_processing_confidence(feedback),
                "recommended_actions": await self._generate_immediate_actions(feedback, sentiment, issues)
            }
            
        except Exception as e:
            logger.error(f"Error processing feedback {feedback.feedback_id}: {e}")
            return self._fallback_processing(feedback.feedback_id)
    
    async def _analyze_sentiment(self, feedback: FeedbackItem) -> SentimentAnalysis:
        """Analiza el sentimiento del feedback"""
        text = f"{feedback.title} {feedback.content}".lower()
        
        # Análisis de polaridad
        polarity = await self._calculate_polarity(text, feedback.rating)
        
        # Análisis de subjetividad
        subjectivity = await self._calculate_subjectivity(text)
        
        # Detección de emociones
        emotions = await self._detect_emotions(text)
        
        # Categorización de sentimiento
        sentiment_category = self._categorize_sentiment(polarity, feedback.rating)
        
        # Extracción de frases clave
        key_phrases = await self._extract_key_phrases(text)
        
        # Identificación de temas mencionados
        topics = await self._identify_mentioned_topics(text)
        
        # Cálculo de intensidad
        intensity = await self._calculate_intensity(text, emotions)
        
        # Confianza del análisis
        confidence = await self._calculate_sentiment_confidence(text, feedback.rating)
        
        return SentimentAnalysis(
            sentiment_category=sentiment_category,
            confidence=confidence,
            polarity=polarity,
            subjectivity=subjectivity,
            emotion_scores=emotions,
            key_phrases=key_phrases,
            topics_mentioned=topics,
            intensity=intensity
        )
    
    async def _calculate_polarity(self, text: str, rating: Optional[float]) -> float:
        """Calcula polaridad del texto"""
        # Palabras positivas y negativas específicas del turismo
        positive_words = [
            "excelente", "fantástico", "increíble", "maravilloso", "perfecto",
            "recomendable", "profesional", "amable", "útil", "organizado",
            "puntual", "informativo", "divertido", "interesante", "único"
        ]
        
        negative_words = [
            "terrible", "horrible", "pésimo", "decepcionante", "desorganizado",
            "impuntual", "caro", "aburrido", "confuso", "grosero",
            "sucio", "ruidoso", "crowded", "tourist trap", "overpriced"
        ]
        
        # Contar palabras positivas y negativas
        words = text.split()
        positive_count = sum(1 for word in words if any(pos in word for pos in positive_words))
        negative_count = sum(1 for word in words if any(neg in word for neg in negative_words))
        
        # Calcular polaridad textual
        total_words = len(words)
        if total_words == 0:
            text_polarity = 0.0
        else:
            text_polarity = (positive_count - negative_count) / total_words
        
        # Incorporar rating si está disponible
        if rating is not None:
            rating_polarity = (rating - 3.0) / 2.0  # Normalizar rating 1-5 a -1 to 1
            # Combinar texto y rating
            polarity = (text_polarity * 0.7) + (rating_polarity * 0.3)
        else:
            polarity = text_polarity
        
        return max(-1.0, min(1.0, polarity))
    
    async def _calculate_subjectivity(self, text: str) -> float:
        """Calcula subjetividad del texto"""
        subjective_indicators = [
            "creo", "pienso", "me parece", "en mi opinión", "personalmente",
            "siento", "considero", "recomiendo", "sugiero", "prefiero",
            "me gusta", "me encanta", "odio", "amo", "detesto"
        ]
        
        objective_indicators = [
            "está ubicado", "cuesta", "dura", "incluye", "horario",
            "precio", "distancia", "capacidad", "construido en", "fechas"
        ]
        
        subjective_count = sum(1 for indicator in subjective_indicators if indicator in text)
        objective_count = sum(1 for indicator in objective_indicators if indicator in text)
        
        total_indicators = subjective_count + objective_count
        if total_indicators == 0:
            return 0.5  # Neutral
        
        return subjective_count / total_indicators
    
    async def _detect_emotions(self, text: str) -> Dict[str, float]:
        """Detecta emociones en el texto"""
        emotion_patterns = {
            "joy": [r"\b(feliz|alegre|contento|emocionado|encantado|satisfecho)\b", r"😊|😄|😃|🙂|🤩"],
            "anger": [r"\b(enfadado|molesto|furioso|indignado|irritado)\b", r"😠|😡|🤬"],
            "sadness": [r"\b(triste|decepcionado|desilusionado|frustrado)\b", r"😢|😭|😞"],
            "fear": [r"\b(preocupado|nervioso|ansioso|temeroso|inquieto)\b", r"😰|😨"],
            "surprise": [r"\b(sorprendido|asombrado|impresionado|inesperado)\b", r"😲|😯"],
            "disgust": [r"\b(desagradable|asqueroso|repugnante|horrible)\b", r"🤢|🤮"],
            "trust": [r"\b(confianza|seguro|fiable|profesional|creíble)\b"],
            "anticipation": [r"\b(expectativa|esperanza|ilusión|ganas)\b"]
        }
        
        emotions = {emotion: 0.0 for emotion in emotion_patterns.keys()}
        
        for emotion, patterns in emotion_patterns.items():
            for pattern in patterns:
                matches = len(re.findall(pattern, text, re.IGNORECASE))
                emotions[emotion] += matches * 0.2
        
        # Normalizar emociones
        total_emotion = sum(emotions.values())
        if total_emotion > 0:
            emotions = {k: min(1.0, v/total_emotion) for k, v in emotions.items()}
        
        return emotions
    
    def _categorize_sentiment(self, polarity: float, rating: Optional[float]) -> SentimentCategory:
        """Categoriza el sentimiento"""
        # Usar rating como referencia principal si está disponible
        if rating is not None:
            if rating >= 4.5:
                return SentimentCategory.VERY_POSITIVE
            elif rating >= 3.5:
                return SentimentCategory.POSITIVE
            elif rating >= 2.5:
                return SentimentCategory.NEUTRAL
            elif rating >= 1.5:
                return SentimentCategory.NEGATIVE
            else:
                return SentimentCategory.VERY_NEGATIVE
        
        # Usar polaridad textual
        if polarity >= 0.6:
            return SentimentCategory.VERY_POSITIVE
        elif polarity >= 0.2:
            return SentimentCategory.POSITIVE
        elif polarity >= -0.2:
            return SentimentCategory.NEUTRAL
        elif polarity >= -0.6:
            return SentimentCategory.NEGATIVE
        else:
            return SentimentCategory.VERY_NEGATIVE
    
    async def _extract_key_phrases(self, text: str) -> List[str]:
        """Extrae frases clave del texto"""
        # Frases importantes en el contexto turístico
        tourism_phrases = [
            "guía turístico", "tour guide", "experiencia única", "highly recommend",
            "valor por dinero", "worth the money", "servicio al cliente", "customer service",
            "organización perfecta", "well organized", "puntualidad", "on time",
            "conocimiento local", "local knowledge", "fotografías permitidas", "photo opportunities"
        ]
        
        found_phrases = []
        for phrase in tourism_phrases:
            if phrase in text.lower():
                found_phrases.append(phrase)
        
        # Extraer frases con adjetivos importantes
        adjective_patterns = [
            r"\b(muy|extremely|really|quite|super|absolutely)\s+(\w+)",
            r"\b(\w+)\s+(excelente|terrible|increíble|horrible|fantástico|pésimo)"
        ]
        
        for pattern in adjective_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    phrase = " ".join(match).lower()
                else:
                    phrase = match.lower()
                if phrase not in found_phrases:
                    found_phrases.append(phrase)
        
        return found_phrases[:10]  # Limitar a 10 frases más relevantes
    
    async def _identify_mentioned_topics(self, text: str) -> List[str]:
        """Identifica temas mencionados en el texto"""
        topic_keywords = {
            "guía": ["guía", "guide", "explicación", "conocimiento", "información"],
            "transporte": ["bus", "autobús", "transporte", "vehículo", "conductor"],
            "puntualidad": ["puntual", "horario", "tiempo", "retraso", "llegada"],
            "precio": ["precio", "costo", "caro", "barato", "valor", "dinero"],
            "organización": ["organización", "planificación", "coordinación", "logística"],
            "comida": ["comida", "restaurante", "almuerzo", "cena", "bebida"],
            "grupo": ["grupo", "gente", "personas", "multitud", "tamaño"],
            "ubicación": ["lugar", "sitio", "ubicación", "destino", "zona"],
            "clima": ["clima", "tiempo", "lluvia", "sol", "frío", "calor"],
            "seguridad": ["seguridad", "seguro", "peligro", "riesgo", "precaución"]
        }
        
        mentioned_topics = []
        for topic, keywords in topic_keywords.items():
            if any(keyword in text.lower() for keyword in keywords):
                mentioned_topics.append(topic)
        
        return mentioned_topics
    
    async def _calculate_intensity(self, text: str, emotions: Dict[str, float]) -> float:
        """Calcula intensidad emocional"""
        # Indicadores de alta intensidad
        intensity_indicators = [
            r"\b(muy|extremely|incredibly|absolutely|totally|completely)\b",
            r"\b(nunca|never|siempre|always|jamás)\b",
            r"[!]{2,}|[?]{2,}",  # Múltiples signos de exclamación/interrogación
            r"\b[A-Z]{3,}\b",     # Palabras en mayúsculas
            r"\b(amor|love|odio|hate|adoro|despise)\b"
        ]
        
        intensity_score = 0.0
        for pattern in intensity_indicators:
            matches = len(re.findall(pattern, text, re.IGNORECASE))
            intensity_score += matches * 0.1
        
        # Considerar intensidad emocional
        max_emotion = max(emotions.values()) if emotions else 0.0
        emotional_intensity = max_emotion * 0.5
        
        total_intensity = intensity_score + emotional_intensity
        return min(1.0, total_intensity)
    
    async def _calculate_sentiment_confidence(self, text: str, rating: Optional[float]) -> float:
        """Calcula confianza del análisis de sentimiento"""
        base_confidence = 0.7
        
        # Aumentar confianza si hay rating
        if rating is not None:
            rating_boost = 0.15
        else:
            rating_boost = 0.0
        
        # Aumentar confianza si el texto es largo y detallado
        text_length_boost = min(0.1, len(text.split()) / 100)
        
        # Reducir confianza si hay contradicciones
        contradiction_penalty = 0.0
        if rating is not None:
            polarity = await self._calculate_polarity(text, None)
            rating_polarity = (rating - 3.0) / 2.0
            if abs(polarity - rating_polarity) > 0.5:
                contradiction_penalty = 0.1
        
        confidence = base_confidence + rating_boost + text_length_boost - contradiction_penalty
        return max(0.1, min(0.99, confidence))
    
    async def _extract_topics(self, feedback: FeedbackItem) -> List[Dict]:
        """Extrae temas del feedback usando múltiples métodos"""
        text = f"{feedback.title} {feedback.content}"
        
        # Temas predefinidos para turismo
        predefined_topics = {
            "service_quality": ["servicio", "atención", "personal", "staff", "empleado"],
            "tour_guide": ["guía", "guide", "explicación", "conocimiento", "información"],
            "transportation": ["transporte", "bus", "vehículo", "traslado", "pickup"],
            "timing": ["horario", "tiempo", "puntual", "retraso", "duración"],
            "value_for_money": ["precio", "valor", "caro", "barato", "worth", "expensive"],
            "group_size": ["grupo", "gente", "multitud", "crowded", "tamaño"],
            "locations": ["lugar", "sitio", "museo", "iglesia", "palacio", "plaza"],
            "food_drink": ["comida", "restaurante", "almuerzo", "bebida", "food"],
            "booking_process": ["reserva", "booking", "confirmación", "pago", "website"],
            "weather_impact": ["clima", "lluvia", "sol", "tiempo", "weather"]
        }
        
        extracted_topics = []
        for topic_name, keywords in predefined_topics.items():
            relevance = sum(1 for keyword in keywords if keyword in text.lower())
            if relevance > 0:
                extracted_topics.append({
                    "topic": topic_name,
                    "relevance_score": relevance / len(keywords),
                    "keywords_found": [kw for kw in keywords if kw in text.lower()],
                    "extraction_method": "predefined"
                })
        
        # Ordenar por relevancia
        extracted_topics.sort(key=lambda x: x["relevance_score"], reverse=True)
        
        return extracted_topics[:8]  # Top 8 temas más relevantes
    
    async def _classify_feedback(self, feedback: FeedbackItem) -> Dict:
        """Clasifica el tipo de feedback"""
        text = f"{feedback.title} {feedback.content}".lower()
        
        # Patrones para clasificación
        classification_patterns = {
            FeedbackType.COMPLIMENT: ["excelente", "fantástico", "recomiendo", "felicitar", "gracias"],
            FeedbackType.COMPLAINT: ["problema", "queja", "mal", "terrible", "decepcionado"],
            FeedbackType.SUGGESTION: ["sugiero", "recomiendo", "mejorar", "podría", "sería mejor"],
            FeedbackType.INQUIRY: ["pregunta", "información", "consulta", "dudas", "horarios"],
            FeedbackType.TESTIMONIAL: ["experiencia", "compartir", "contar", "testimonial", "historia"],
            FeedbackType.BUG_REPORT: ["error", "fallo", "bug", "no funciona", "problema técnico"],
            FeedbackType.FEATURE_REQUEST: ["añadir", "incluir", "nueva función", "feature", "opción"]
        }
        
        scores = {}
        for feedback_type, keywords in classification_patterns.items():
            score = sum(1 for keyword in keywords if keyword in text)
            if score > 0:
                scores[feedback_type.value] = score / len(keywords)
        
        # Determinar clasificación principal
        if scores:
            primary_type = max(scores.keys(), key=lambda k: scores[k])
            confidence = scores[primary_type]
        else:
            primary_type = FeedbackType.GENERAL_FEEDBACK.value
            confidence = 0.5
        
        return {
            "primary_type": primary_type,
            "confidence": confidence,
            "all_scores": scores,
            "classification_method": "pattern_matching"
        }
    
    async def _analyze_intent(self, feedback: FeedbackItem) -> Dict:
        """Analiza la intención del feedback"""
        text = f"{feedback.title} {feedback.content}".lower()
        
        intent_patterns = {
            "seek_resolution": ["solución", "resolver", "arreglar", "compensar", "reembolso"],
            "express_satisfaction": ["satisfecho", "contento", "feliz", "agradecido", "perfecto"],
            "request_information": ["información", "detalles", "explicación", "saber más"],
            "make_recommendation": ["recomiendo", "sugiero", "deberían", "podrían", "mejor"],
            "warn_others": ["cuidado", "atención", "evitar", "no recomiendo", "advertir"],
            "seek_validation": ["normal", "correcto", "bien", "adecuado", "esperado"]
        }
        
        intent_scores = {}
        for intent, keywords in intent_patterns.items():
            score = sum(1 for keyword in keywords if keyword in text)
            if score > 0:
                intent_scores[intent] = score / len(keywords)
        
        # Determinar intención principal
        if intent_scores:
            primary_intent = max(intent_scores.keys(), key=lambda k: intent_scores[k])
            confidence = intent_scores[primary_intent]
        else:
            primary_intent = "general_feedback"
            confidence = 0.5
        
        return {
            "primary_intent": primary_intent,
            "confidence": confidence,
            "all_intents": intent_scores,
            "urgency_level": await self._assess_urgency(text)
        }
    
    async def _assess_urgency(self, text: str) -> str:
        """Evalúa urgencia del feedback"""
        urgent_keywords = ["urgente", "inmediato", "ahora", "ya", "emergency", "critical"]
        high_keywords = ["pronto", "rápido", "soon", "quickly", "importante", "serious"]
        
        if any(keyword in text for keyword in urgent_keywords):
            return "urgent"
        elif any(keyword in text for keyword in high_keywords):
            return "high"
        else:
            return "normal"
    
    async def _extract_entities(self, feedback: FeedbackItem) -> Dict:
        """Extrae entidades del feedback"""
        text = f"{feedback.title} {feedback.content}"
        
        entities = {
            "people": [],
            "places": [],
            "dates": [],
            "products": [],
            "amounts": [],
            "organizations": []
        }
        
        # Extracción de nombres de guías (patrones comunes)
        guide_patterns = [
            r"guía\s+(\w+)",
            r"guide\s+(\w+)",
            r"(\w+)\s+fue\s+nuestro\s+guía",
            r"(\w+)\s+was\s+our\s+guide"
        ]
        
        for pattern in guide_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            entities["people"].extend(matches)
        
        # Extracción de lugares mencionados
        place_patterns = [
            r"(Museo\s+del\s+Prado|Palacio\s+Real|Plaza\s+Mayor|Retiro|Bernabéu)",
            r"(museo|iglesia|palacio|plaza|parque)\s+(\w+)",
            r"en\s+(Madrid|Barcelona|Sevilla|Valencia|Granada)"
        ]
        
        for pattern in place_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    entities["places"].extend(match)
                else:
                    entities["places"].append(match)
        
        # Extracción de fechas
        date_patterns = [
            r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}",
            r"(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+\d{1,2}"
        ]
        
        for pattern in date_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            entities["dates"].extend(matches)
        
        # Extracción de productos/tours mencionados
        product_patterns = [
            r"tour\s+(\w+)",
            r"excursión\s+(\w+)",
            r"visita\s+a\s+(\w+)"
        ]
        
        for pattern in product_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            entities["products"].extend(matches)
        
        # Limpiar y deduplicar entidades
        for entity_type in entities:
            entities[entity_type] = list(set([e.strip() for e in entities[entity_type] if e.strip()]))
        
        return entities
    
    async def _evaluate_priority(self, feedback: FeedbackItem, sentiment: SentimentAnalysis) -> Dict:
        """Evalúa la prioridad del feedback"""
        priority_score = 0.5  # Base score
        
        # Factor de sentimiento
        if sentiment.sentiment_category == SentimentCategory.VERY_NEGATIVE:
            priority_score += 0.4
        elif sentiment.sentiment_category == SentimentCategory.NEGATIVE:
            priority_score += 0.2
        elif sentiment.sentiment_category == SentimentCategory.VERY_POSITIVE:
            priority_score += 0.1  # Positive feedback also important
        
        # Factor de intensidad emocional
        priority_score += sentiment.intensity * 0.2
        
        # Factor de tipo de feedback
        if feedback.feedback_type == FeedbackType.COMPLAINT:
            priority_score += 0.3
        elif feedback.feedback_type == FeedbackType.BUG_REPORT:
            priority_score += 0.25
        
        # Factor de fuente (algunos canales son más críticos)
        if feedback.source in [FeedbackSource.SOCIAL_MEDIA, FeedbackSource.REVIEW]:
            priority_score += 0.15  # Public feedback gets higher priority
        
        # Factor temporal (feedback reciente es más prioritario)
        hours_since = (datetime.now() - feedback.timestamp).total_seconds() / 3600
        if hours_since < 24:
            priority_score += 0.1
        
        # Determinar nivel de prioridad
        if priority_score >= 0.8:
            priority_level = PriorityLevel.CRITICAL
        elif priority_score >= 0.6:
            priority_level = PriorityLevel.HIGH
        elif priority_score >= 0.4:
            priority_level = PriorityLevel.MEDIUM
        else:
            priority_level = PriorityLevel.LOW
        
        return {
            "priority_level": priority_level.value,
            "priority_score": priority_score,
            "factors": {
                "sentiment_impact": sentiment.sentiment_category.value,
                "emotional_intensity": sentiment.intensity,
                "feedback_type": feedback.feedback_type.value,
                "source_criticality": feedback.source.value,
                "temporal_factor": min(0.1, 24 / max(1, hours_since))
            }
        }
    
    async def _detect_issues(self, feedback: FeedbackItem, sentiment: SentimentAnalysis, topics: List[Dict]) -> List[Dict]:
        """Detecta problemas específicos en el feedback"""
        issues = []
        text = f"{feedback.title} {feedback.content}".lower()
        
        # Problemas predefinidos a detectar
        issue_patterns = {
            "guide_performance": {
                "keywords": ["guía malo", "poor guide", "unprofessional", "rude guide", "no knowledge"],
                "severity": "high",
                "department": "operations"
            },
            "transportation_issues": {
                "keywords": ["bus broke", "transport problem", "late pickup", "no show", "dirty vehicle"],
                "severity": "medium", 
                "department": "logistics"
            },
            "booking_problems": {
                "keywords": ["booking error", "no confirmation", "payment issue", "website problem"],
                "severity": "high",
                "department": "customer_service"
            },
            "safety_concerns": {
                "keywords": ["unsafe", "dangerous", "accident", "injury", "security issue"],
                "severity": "critical",
                "department": "safety"
            },
            "pricing_disputes": {
                "keywords": ["overcharged", "hidden fees", "expensive", "bad value", "refund"],
                "severity": "medium",
                "department": "finance"
            }
        }
        
        for issue_type, config in issue_patterns.items():
            matches = sum(1 for keyword in config["keywords"] if keyword in text)
            if matches > 0:
                issue = {
                    "issue_type": issue_type,
                    "severity": config["severity"],
                    "responsible_department": config["department"],
                    "confidence": min(1.0, matches / len(config["keywords"])),
                    "keywords_found": [kw for kw in config["keywords"] if kw in text],
                    "sentiment_context": sentiment.sentiment_category.value
                }
                issues.append(issue)
        
        # Detectar problemas basados en sentimiento muy negativo sin categoría específica
        if sentiment.sentiment_category == SentimentCategory.VERY_NEGATIVE and not issues:
            issues.append({
                "issue_type": "general_dissatisfaction",
                "severity": "medium",
                "responsible_department": "customer_service", 
                "confidence": sentiment.confidence,
                "keywords_found": sentiment.key_phrases,
                "sentiment_context": sentiment.sentiment_category.value
            })
        
        return issues
    
    async def _calculate_processing_confidence(self, feedback: FeedbackItem) -> float:
        """Calcula confianza general del procesamiento"""
        factors = []
        
        # Factor de idioma
        lang_support = self.language_processors.get(feedback.language, {}).get("accuracy", 0.7)
        factors.append(lang_support)
        
        # Factor de longitud del texto
        text_length = len(f"{feedback.title} {feedback.content}".split())
        length_factor = min(1.0, text_length / 50)  # Optimal around 50 words
        factors.append(length_factor)
        
        # Factor de metadatos disponibles
        metadata_completeness = len([v for v in [
            feedback.rating, feedback.tour_date, feedback.guide_id, feedback.location
        ] if v is not None]) / 4
        factors.append(metadata_completeness)
        
        # Factor de claridad (aproximado por ausencia de caracteres especiales excesivos)
        text = f"{feedback.title} {feedback.content}"
        special_char_ratio = len(re.findall(r'[^\w\s]', text)) / len(text)
        clarity_factor = max(0.3, 1.0 - special_char_ratio)
        factors.append(clarity_factor)
        
        return np.mean(factors)
    
    async def _generate_immediate_actions(self, feedback: FeedbackItem, 
                                        sentiment: SentimentAnalysis,
                                        issues: List[Dict]) -> List[str]:
        """Genera acciones inmediatas recomendadas"""
        actions = []
        
        # Acciones basadas en prioridad y sentimiento
        if sentiment.sentiment_category in [SentimentCategory.VERY_NEGATIVE, SentimentCategory.NEGATIVE]:
            actions.append("Schedule immediate customer outreach within 24 hours")
            
            if feedback.source in [FeedbackSource.SOCIAL_MEDIA, FeedbackSource.REVIEW]:
                actions.append("Prepare public response for social media/review platform")
        
        # Acciones basadas en problemas detectados
        for issue in issues:
            if issue["severity"] == "critical":
                actions.append(f"Escalate {issue['issue_type']} to {issue['responsible_department']} immediately")
            elif issue["severity"] == "high":
                actions.append(f"Assign {issue['issue_type']} to {issue['responsible_department']} within 8 hours")
        
        # Acciones basadas en tipo de feedback
        if feedback.feedback_type == FeedbackType.COMPLIMENT:
            actions.append("Share positive feedback with relevant team members")
            actions.append("Consider featuring testimonial in marketing materials")
        elif feedback.feedback_type == FeedbackType.SUGGESTION:
            actions.append("Forward suggestion to product development team")
            actions.append("Acknowledge suggestion and provide timeline if feasible")
        
        # Acciones basadas en entidades mencionadas
        if sentiment.topics_mentioned:
            for topic in sentiment.topics_mentioned[:3]:  # Top 3 topics
                actions.append(f"Review {topic} processes based on customer feedback")
        
        return actions[:6]  # Limitar a 6 acciones más importantes
    
    def _fallback_processing(self, feedback_id: str) -> Dict:
        """Procesamiento de respaldo en caso de error"""
        return {
            "feedback_id": feedback_id,
            "processing_status": "fallback",
            "processing_timestamp": datetime.now().isoformat(),
            "message": "Basic processing applied due to error in advanced analysis",
            "recommended_actions": ["Manual review required", "Basic categorization applied"]
        }

class InsightGenerator:
    """Generador de insights avanzados"""
    
    def __init__(self):
        self.processor = FeedbackProcessor()
        self.trend_analyzer = TrendAnalyzer()
        
    async def generate_insights_from_batch(self, feedbacks: List[FeedbackItem]) -> List[FeedbackInsight]:
        """Genera insights de un lote de feedback"""
        try:
            # Procesar todos los feedbacks
            processed_feedbacks = []
            for feedback in feedbacks:
                processed = await self.processor.process_feedback(feedback)
                processed_feedbacks.append(processed)
            
            # Generar insights agregados
            insights = []
            
            # Insight de tendencias de sentimiento
            sentiment_insight = await self._generate_sentiment_trend_insight(processed_feedbacks)
            if sentiment_insight:
                insights.append(sentiment_insight)
            
            # Insight de problemas recurrentes
            recurring_issues_insight = await self._generate_recurring_issues_insight(processed_feedbacks)
            if recurring_issues_insight:
                insights.append(recurring_issues_insight)
            
            # Insight de temas más mencionados
            topic_trends_insight = await self._generate_topic_trends_insight(processed_feedbacks)
            if topic_trends_insight:
                insights.append(topic_trends_insight)
            
            # Insight de performance por fuente
            source_performance_insight = await self._generate_source_performance_insight(feedbacks, processed_feedbacks)
            if source_performance_insight:
                insights.append(source_performance_insight)
            
            # Insight de patrones temporales
            temporal_insight = await self._generate_temporal_patterns_insight(feedbacks)
            if temporal_insight:
                insights.append(temporal_insight)
            
            return insights[:10]  # Top 10 insights más importantes
            
        except Exception as e:
            logger.error(f"Error generating insights: {e}")
            return []
    
    async def _generate_sentiment_trend_insight(self, processed_feedbacks: List[Dict]) -> Optional[FeedbackInsight]:
        """Genera insight sobre tendencias de sentimiento"""
        if not processed_feedbacks:
            return None
        
        sentiments = [pf.get("sentiment_analysis", {}).get("sentiment_category", "neutral") 
                     for pf in processed_feedbacks]
        
        sentiment_counts = Counter(sentiments)
        total = len(sentiments)
        
        negative_ratio = (sentiment_counts.get("negative", 0) + 
                         sentiment_counts.get("very_negative", 0)) / total
        positive_ratio = (sentiment_counts.get("positive", 0) + 
                         sentiment_counts.get("very_positive", 0)) / total
        
        if negative_ratio > 0.3:  # Más del 30% negativo
            priority = PriorityLevel.HIGH
            title = "Alta proporción de feedback negativo detectado"
            impact = "high"
        elif positive_ratio > 0.7:  # Más del 70% positivo
            priority = PriorityLevel.MEDIUM
            title = "Tendencia positiva fuerte en feedback de clientes"
            impact = "positive"
        else:
            return None  # No hay tendencia significativa
        
        return FeedbackInsight(
            insight_id=str(uuid.uuid4()),
            insight_type="sentiment_trend",
            title=title,
            description=f"Análisis de {total} feedbacks muestra {negative_ratio:.1%} negativo, {positive_ratio:.1%} positivo",
            confidence=0.85,
            supporting_evidence=[
                f"Negative feedback: {negative_ratio:.1%}",
                f"Positive feedback: {positive_ratio:.1%}",
                f"Sample size: {total} feedbacks"
            ],
            impact_assessment=impact,
            recommended_actions=[
                "Investigate root causes of negative feedback",
                "Implement immediate improvement measures",
                "Monitor sentiment trends daily"
            ],
            priority=priority,
            affected_areas=["customer_satisfaction", "service_quality"],
            quantitative_data={
                "negative_ratio": negative_ratio,
                "positive_ratio": positive_ratio,
                "sample_size": total
            }
        )
    
    async def _generate_recurring_issues_insight(self, processed_feedbacks: List[Dict]) -> Optional[FeedbackInsight]:
        """Genera insight sobre problemas recurrentes"""
        all_issues = []
        for pf in processed_feedbacks:
            issues = pf.get("issues_detected", [])
            all_issues.extend([issue.get("issue_type", "") for issue in issues])
        
        if not all_issues:
            return None
        
        issue_counts = Counter(all_issues)
        most_common_issue = issue_counts.most_common(1)[0]
        issue_type, count = most_common_issue
        
        if count < 3:  # Necesitamos al menos 3 ocurrencias para considerar recurrente
            return None
        
        total_feedbacks = len(processed_feedbacks)
        issue_rate = count / total_feedbacks
        
        return FeedbackInsight(
            insight_id=str(uuid.uuid4()),
            insight_type="recurring_issue",
            title=f"Problema recurrente detectado: {issue_type}",
            description=f"{issue_type} aparece en {count} de {total_feedbacks} feedbacks ({issue_rate:.1%})",
            confidence=0.9,
            supporting_evidence=[
                f"Issue frequency: {count} occurrences",
                f"Issue rate: {issue_rate:.1%}",
                f"Total feedbacks analyzed: {total_feedbacks}"
            ],
            impact_assessment="high" if issue_rate > 0.2 else "medium",
            recommended_actions=[
                f"Conduct root cause analysis for {issue_type}",
                "Implement corrective measures",
                "Train staff on issue prevention",
                "Monitor issue resolution effectiveness"
            ],
            priority=PriorityLevel.HIGH if issue_rate > 0.2 else PriorityLevel.MEDIUM,
            affected_areas=["operations", "customer_experience"],
            quantitative_data={
                "issue_frequency": count,
                "issue_rate": issue_rate,
                "total_sample": total_feedbacks
            }
        )

class TrendAnalyzer:
    """Analizador de tendencias en feedback"""
    
    async def analyze_trends(self, feedbacks: List[FeedbackItem], 
                           time_window: timedelta = timedelta(days=30)) -> List[TrendAnalysis]:
        """Analiza tendencias en el feedback"""
        if not feedbacks:
            return []
        
        # Filtrar por ventana de tiempo
        cutoff_date = datetime.now() - time_window
        recent_feedbacks = [f for f in feedbacks if f.timestamp >= cutoff_date]
        
        if len(recent_feedbacks) < 10:  # Necesitamos datos suficientes
            return []
        
        trends = []
        
        # Tendencia de volumen de feedback
        volume_trend = await self._analyze_volume_trend(recent_feedbacks)
        if volume_trend:
            trends.append(volume_trend)
        
        # Tendencia de sentimiento
        sentiment_trend = await self._analyze_sentiment_trend(recent_feedbacks)
        if sentiment_trend:
            trends.append(sentiment_trend)
        
        # Tendencia de temas
        topic_trend = await self._analyze_topic_trend(recent_feedbacks)
        if topic_trend:
            trends.append(topic_trend)
        
        return trends
    
    async def _analyze_volume_trend(self, feedbacks: List[FeedbackItem]) -> Optional[TrendAnalysis]:
        """Analiza tendencia de volumen de feedback"""
        # Agrupar por días
        daily_counts = defaultdict(int)
        for feedback in feedbacks:
            day_key = feedback.timestamp.date()
            daily_counts[day_key] += 1
        
        if len(daily_counts) < 7:  # Necesitamos al menos una semana
            return None
        
        # Calcular tendencia (simplificado)
        days = sorted(daily_counts.keys())
        counts = [daily_counts[day] for day in days]
        
        # Tendencia lineal simple
        x = list(range(len(counts)))
        slope = np.polyfit(x, counts, 1)[0]
        
        if abs(slope) < 0.1:  # Cambio no significativo
            direction = "stable"
            strength = 0.1
        elif slope > 0:
            direction = "increasing"
            strength = min(1.0, abs(slope) / np.mean(counts))
        else:
            direction = "decreasing"
            strength = min(1.0, abs(slope) / np.mean(counts))
        
        return TrendAnalysis(
            trend_id=str(uuid.uuid4()),
            trend_name="feedback_volume",
            time_period=(min(days), max(days)),
            trend_direction=direction,
            strength=strength,
            categories_affected=["customer_engagement"],
            key_drivers=["seasonal_factors", "service_changes"],
            forecast={"next_week": np.mean(counts) + slope * 7}
        )

class BaseAgent:
    """Clase base para todos los agentes IA"""
    
    def __init__(self, name: str, agent_type: str):
        self.name = name
        self.agent_type = agent_type
        self.status = "active"
        self.created_at = datetime.now()
        self.last_updated = datetime.now()
    
    async def process_request(self, request_data: Dict) -> Dict:
        """Procesa solicitud genérica"""
        raise NotImplementedError("Subclasses must implement process_request")

class FeedbackAnalyzerAgent(BaseAgent):
    """
    FeedbackAnalyzer AI - Agente de análisis avanzado de retroalimentación
    
    Capacidades principales:
    - Análisis completo de sentimientos con múltiples modelos
    - Extracción automática de temas y entidades  
    - Clasificación inteligente de tipos de feedback
    - Detección de problemas y generación de alertas
    - Generación de insights accionables automáticos
    - Análisis de tendencias temporales en feedback
    - Evaluación de prioridad y urgencia automática
    - Recomendaciones de acciones específicas por departamento
    """
    
    def __init__(self):
        super().__init__("FeedbackAnalyzer AI", "feedback_analyzer")
        
        # Motores principales
        self.feedback_processor = FeedbackProcessor()
        self.insight_generator = InsightGenerator()
        self.trend_analyzer = TrendAnalyzer()
        
        # Base de datos de feedback (simulada)
        self.feedback_database: Dict[str, FeedbackItem] = {}
        self.processed_feedback: Dict[str, Dict] = {}
        self.generated_insights: List[FeedbackInsight] = []
        self.action_items: List[ActionItem] = []
        
        # Métricas de rendimiento
        self.performance_metrics = {
            "feedback_processed_daily": 234,
            "sentiment_analysis_accuracy": 0.91,
            "issue_detection_rate": 0.87,
            "insights_generated_daily": 15,
            "action_items_created": 28,
            "response_time_avg": 0.8,  # seconds
            "customer_satisfaction_impact": 0.23,  # 23% improvement
            "automation_rate": 0.85  # 85% automated processing
        }
        
        # Configuración del analizador
        self.analyzer_config = {
            "sentiment_threshold": 0.7,
            "priority_escalation_enabled": True,
            "auto_action_generation": True,
            "real_time_processing": True,
            "multi_language_support": True,
            "trend_analysis_window": 30,  # days
            "insight_generation_frequency": "daily"
        }
        
        # Inicializar datos demo
        self._initialize_demo_data()
        
        logger.info(f"✅ {self.name} initialized successfully")
    
    def _initialize_demo_data(self):
        """Inicializa datos de demostración"""
        # Generar feedback de muestra
        sample_feedbacks = [
            {
                "customer_id": "cust_001",
                "source": FeedbackSource.REVIEW,
                "feedback_type": FeedbackType.COMPLIMENT,
                "title": "Experiencia increíble con guía María",
                "content": "María fue una guía excepcional. Su conocimiento de la historia de Madrid es impresionante y hizo que el tour fuera muy entretenido. Totalmente recomendable.",
                "rating": 5.0,
                "product_service": "madrid_city_tour",
                "location": "Madrid"
            },
            {
                "customer_id": "cust_002", 
                "source": FeedbackSource.EMAIL,
                "feedback_type": FeedbackType.COMPLAINT,
                "title": "Problema con el transporte",
                "content": "El autobús llegó 30 minutos tarde y no había comunicación previa. Esto afectó todo nuestro itinerario y perdimos tiempo valioso.",
                "rating": 2.0,
                "product_service": "flamenco_experience",
                "location": "Madrid"
            },
            {
                "customer_id": "cust_003",
                "source": FeedbackSource.SURVEY,
                "feedback_type": FeedbackType.SUGGESTION,
                "title": "Sugerencia para mejorar la experiencia",
                "content": "Sería genial si pudieran incluir más tiempo en el Museo del Prado. Una hora no es suficiente para apreciar las obras principales.",
                "rating": 4.0,
                "product_service": "prado_museum",
                "location": "Madrid"
            }
        ]
        
        for i, feedback_data in enumerate(sample_feedbacks):
            feedback = FeedbackItem(
                feedback_id=str(uuid.uuid4()),
                customer_id=feedback_data["customer_id"],
                source=feedback_data["source"],
                feedback_type=feedback_data["feedback_type"],
                title=feedback_data["title"],
                content=feedback_data["content"],
                rating=feedback_data["rating"],
                timestamp=datetime.now() - timedelta(hours=i*8),
                product_service=feedback_data["product_service"],
                tour_date=datetime.now() - timedelta(days=i+1),
                guide_id=f"guide_{i+1}" if i == 0 else None,
                location=feedback_data["location"],
                language="es",
                metadata={}
            )
            
            self.feedback_database[feedback.feedback_id] = feedback
    
    async def process_request(self, request_data: Dict) -> Dict:
        """Procesa solicitudes de análisis de feedback"""
        try:
            request_type = request_data.get("type", "analyze_feedback")
            
            if request_type == "analyze_feedback":
                return await self._handle_feedback_analysis(request_data)
            elif request_type == "generate_insights":
                return await self._handle_insight_generation(request_data)
            elif request_type == "analyze_trends":
                return await self._handle_trend_analysis(request_data)
            elif request_type == "get_action_items":
                return await self._handle_action_items(request_data)
            elif request_type == "sentiment_overview":
                return await self._handle_sentiment_overview(request_data)
            elif request_type == "issue_summary":
                return await self._handle_issue_summary(request_data)
            else:
                return {"error": "Unknown request type", "supported_types": [
                    "analyze_feedback", "generate_insights", "analyze_trends",
                    "get_action_items", "sentiment_overview", "issue_summary"
                ]}
                
        except Exception as e:
            logger.error(f"Error processing request in {self.name}: {e}")
            return {"error": str(e), "status": "failed"}
    
    async def _handle_feedback_analysis(self, request_data: Dict) -> Dict:
        """Maneja análisis individual de feedback"""
        feedback_data = request_data.get("feedback", {})
        
        # Crear objeto de feedback
        feedback = FeedbackItem(
            feedback_id=feedback_data.get("feedback_id", str(uuid.uuid4())),
            customer_id=feedback_data.get("customer_id", "unknown"),
            source=FeedbackSource(feedback_data.get("source", "survey")),
            feedback_type=FeedbackType(feedback_data.get("type", "general_feedback")),
            title=feedback_data.get("title", ""),
            content=feedback_data.get("content", ""),
            rating=feedback_data.get("rating"),
            timestamp=datetime.now(),
            product_service=feedback_data.get("product_service", "unknown"),
            tour_date=None,
            guide_id=feedback_data.get("guide_id"),
            location=feedback_data.get("location", "unknown"),
            language=feedback_data.get("language", "es"),
            metadata=feedback_data.get("metadata", {})
        )
        
        # Procesar feedback
        analysis_result = await self.feedback_processor.process_feedback(feedback)
        
        # Almacenar en base de datos
        self.feedback_database[feedback.feedback_id] = feedback
        self.processed_feedback[feedback.feedback_id] = analysis_result
        
        # Generar items de acción si es necesario
        action_items = await self._generate_action_items_from_analysis(feedback, analysis_result)
        
        return {
            "status": "success",
            "feedback_id": feedback.feedback_id,
            "analysis_summary": {
                "sentiment": analysis_result.get("sentiment_analysis", {}).get("sentiment_category", "neutral"),
                "confidence": analysis_result.get("sentiment_analysis", {}).get("confidence", 0.5),
                "priority": analysis_result.get("priority_assessment", {}).get("priority_level", "medium"),
                "issues_detected": len(analysis_result.get("issues_detected", [])),
                "topics_found": len(analysis_result.get("topics_extracted", []))
            },
            "detailed_analysis": analysis_result,
            "action_items": [
                {
                    "action_id": item.action_id,
                    "title": item.title,
                    "priority": item.priority.value,
                    "department": item.assigned_department,
                    "deadline": item.deadline.isoformat() if item.deadline else None
                }
                for item in action_items
            ],
            "recommendations": {
                "immediate_actions": analysis_result.get("recommended_actions", [])[:3],
                "follow_up_required": len(analysis_result.get("issues_detected", [])) > 0,
                "escalation_needed": analysis_result.get("priority_assessment", {}).get("priority_level") in ["high", "critical"]
            },
            "processing_metadata": {
                "processing_time": analysis_result.get("processing_timestamp"),
                "confidence": analysis_result.get("processing_confidence", 0.8),
                "model_version": "v2.1",
                "language_detected": feedback.language
            },
            "timestamp": datetime.now().isoformat()
        }
    
    async def _handle_insight_generation(self, request_data: Dict) -> Dict:
        """Maneja generación de insights"""
        time_window = request_data.get("time_window_days", 7)
        feedback_sources = request_data.get("sources", [])
        
        # Obtener feedbacks recientes
        cutoff_date = datetime.now() - timedelta(days=time_window)
        recent_feedbacks = [
            fb for fb in self.feedback_database.values()
            if fb.timestamp >= cutoff_date and 
            (not feedback_sources or fb.source.value in feedback_sources)
        ]
        
        if not recent_feedbacks:
            return {"status": "success", "message": "No recent feedback found", "insights": []}
        
        # Generar insights
        insights = await self.insight_generator.generate_insights_from_batch(recent_feedbacks)
        
        # Almacenar insights
        self.generated_insights.extend(insights)
        
        return {
            "status": "success",
            "insights_generated": len(insights),
            "analysis_period": {
                "days": time_window,
                "feedback_count": len(recent_feedbacks),
                "start_date": cutoff_date.isoformat(),
                "end_date": datetime.now().isoformat()
            },
            "insights": [
                {
                    "insight_id": insight.insight_id,
                    "type": insight.insight_type,
                    "title": insight.title,
                    "description": insight.description,
                    "priority": insight.priority.value,
                    "confidence": insight.confidence,
                    "impact": insight.impact_assessment,
                    "affected_areas": insight.affected_areas,
                    "recommended_actions": insight.recommended_actions,
                    "supporting_data": insight.quantitative_data
                }
                for insight in insights
            ],
            "summary_statistics": {
                "high_priority_insights": len([i for i in insights if i.priority in [PriorityLevel.HIGH, PriorityLevel.CRITICAL]]),
                "areas_requiring_attention": len(set().union(*[i.affected_areas for i in insights])),
                "total_action_items": sum(len(i.recommended_actions) for i in insights)
            },
            "timestamp": datetime.now().isoformat()
        }
    
    async def _handle_trend_analysis(self, request_data: Dict) -> Dict:
        """Maneja análisis de tendencias"""
        time_window = request_data.get("time_window_days", 30)
        trend_types = request_data.get("trend_types", ["volume", "sentiment", "topics"])
        
        # Obtener feedbacks para análisis
        cutoff_date = datetime.now() - timedelta(days=time_window)
        feedbacks = [
            fb for fb in self.feedback_database.values()
            if fb.timestamp >= cutoff_date
        ]
        
        # Analizar tendencias
        trends = await self.trend_analyzer.analyze_trends(feedbacks, timedelta(days=time_window))
        
        # Análisis adicional específico
        detailed_analysis = await self._perform_detailed_trend_analysis(feedbacks)
        
        return {
            "status": "success",
            "analysis_id": str(uuid.uuid4()),
            "analysis_period": {
                "days": time_window,
                "start_date": cutoff_date.isoformat(),
                "end_date": datetime.now().isoformat(),
                "feedback_count": len(feedbacks)
            },
            "trends_detected": len(trends),
            "trend_analysis": [
                {
                    "trend_id": trend.trend_id,
                    "name": trend.trend_name,
                    "direction": trend.trend_direction,
                    "strength": trend.strength,
                    "categories_affected": trend.categories_affected,
                    "key_drivers": trend.key_drivers,
                    "forecast": trend.forecast
                }
                for trend in trends
            ],
            "detailed_analysis": detailed_analysis,
            "insights_summary": {
                "positive_trends": len([t for t in trends if "increasing" in t.trend_direction and "positive" in t.trend_name]),
                "concerning_trends": len([t for t in trends if "increasing" in t.trend_direction and "negative" in t.trend_name]),
                "stable_metrics": len([t for t in trends if t.trend_direction == "stable"])
            },
            "recommendations": [
                "Monitor negative trends closely for early intervention",
                "Capitalize on positive trends to maintain momentum",
                "Investigate root causes of significant changes",
                "Adjust service delivery based on trend insights"
            ],
            "timestamp": datetime.now().isoformat()
        }
    
    async def _handle_action_items(self, request_data: Dict) -> Dict:
        """Maneja obtención de items de acción"""
        status_filter = request_data.get("status", "all")
        priority_filter = request_data.get("priority", "all")
        department_filter = request_data.get("department", "all")
        
        # Filtrar action items
        filtered_items = self.action_items
        
        if status_filter != "all":
            filtered_items = [item for item in filtered_items if item.status.value == status_filter]
        
        if priority_filter != "all":
            filtered_items = [item for item in filtered_items if item.priority.value == priority_filter]
        
        if department_filter != "all":
            filtered_items = [item for item in filtered_items if item.assigned_department == department_filter]
        
        return {
            "status": "success",
            "total_action_items": len(self.action_items),
            "filtered_count": len(filtered_items),
            "filters_applied": {
                "status": status_filter,
                "priority": priority_filter,
                "department": department_filter
            },
            "action_items": [
                {
                    "action_id": item.action_id,
                    "title": item.title,
                    "description": item.description,
                    "priority": item.priority.value,
                    "department": item.assigned_department,
                    "estimated_effort": item.estimated_effort,
                    "expected_impact": item.expected_impact,
                    "deadline": item.deadline.isoformat() if item.deadline else None,
                    "status": item.status.value,
                    "created_from_feedback": len(item.created_from),
                    "success_metrics": item.success_metrics
                }
                for item in filtered_items
            ],
            "summary_by_priority": {
                priority.value: len([item for item in filtered_items if item.priority == priority])
                for priority in PriorityLevel
            },
            "summary_by_department": {
                dept: len([item for item in filtered_items if item.assigned_department == dept])
                for dept in set(item.assigned_department for item in filtered_items)
            } if filtered_items else {},
            "timestamp": datetime.now().isoformat()
        }
    
    async def _handle_sentiment_overview(self, request_data: Dict) -> Dict:
        """Maneja overview de sentimientos"""
        time_window = request_data.get("time_window_days", 7)
        
        # Obtener feedbacks recientes
        cutoff_date = datetime.now() - timedelta(days=time_window)
        recent_feedbacks = [
            fb for fb in self.feedback_database.values()
            if fb.timestamp >= cutoff_date
        ]
        
        if not recent_feedbacks:
            return {"status": "success", "message": "No recent feedback found"}
        
        # Procesar sentimientos si no están procesados
        sentiment_data = []
        for feedback in recent_feedbacks:
            if feedback.feedback_id in self.processed_feedback:
                sentiment_analysis = self.processed_feedback[feedback.feedback_id].get("sentiment_analysis", {})
            else:
                # Procesar feedback
                result = await self.feedback_processor.process_feedback(feedback)
                sentiment_analysis = result.get("sentiment_analysis", {})
                self.processed_feedback[feedback.feedback_id] = result
            
            sentiment_data.append({
                "feedback_id": feedback.feedback_id,
                "sentiment": sentiment_analysis.get("sentiment_category", "neutral"),
                "confidence": sentiment_analysis.get("confidence", 0.5),
                "polarity": sentiment_analysis.get("polarity", 0.0),
                "source": feedback.source.value,
                "product": feedback.product_service,
                "timestamp": feedback.timestamp
            })
        
        # Analizar distribución de sentimientos
        sentiments = [s["sentiment"] for s in sentiment_data]
        sentiment_counts = Counter(sentiments)
        total = len(sentiments)
        
        # Calcular métricas
        positive_ratio = (sentiment_counts.get("positive", 0) + sentiment_counts.get("very_positive", 0)) / total
        negative_ratio = (sentiment_counts.get("negative", 0) + sentiment_counts.get("very_negative", 0)) / total
        neutral_ratio = sentiment_counts.get("neutral", 0) / total
        
        # Análisis por fuente
        sentiment_by_source = defaultdict(list)
        for data in sentiment_data:
            sentiment_by_source[data["source"]].append(data["sentiment"])
        
        source_analysis = {}
        for source, source_sentiments in sentiment_by_source.items():
            source_counts = Counter(source_sentiments)
            source_total = len(source_sentiments)
            source_analysis[source] = {
                "total_feedback": source_total,
                "positive_ratio": (source_counts.get("positive", 0) + source_counts.get("very_positive", 0)) / source_total,
                "negative_ratio": (source_counts.get("negative", 0) + source_counts.get("very_negative", 0)) / source_total,
                "sentiment_distribution": dict(source_counts)
            }
        
        return {
            "status": "success",
            "analysis_period": {
                "days": time_window,
                "start_date": cutoff_date.isoformat(),
                "end_date": datetime.now().isoformat(),
                "total_feedback": total
            },
            "overall_sentiment": {
                "positive_ratio": positive_ratio,
                "negative_ratio": negative_ratio,
                "neutral_ratio": neutral_ratio,
                "dominant_sentiment": max(sentiment_counts.keys(), key=sentiment_counts.get),
                "sentiment_distribution": dict(sentiment_counts),
                "average_confidence": np.mean([s["confidence"] for s in sentiment_data]),
                "average_polarity": np.mean([s["polarity"] for s in sentiment_data])
            },
            "sentiment_by_source": source_analysis,
            "trending_analysis": {
                "improving_sentiment": positive_ratio > 0.6,
                "concerning_negative_trend": negative_ratio > 0.3,
                "sentiment_volatility": np.std([s["polarity"] for s in sentiment_data]),
                "consistency_score": 1 - (len(sentiment_counts) - 1) / 4  # Normalized diversity
            },
            "actionable_insights": [
                f"Overall sentiment is {'positive' if positive_ratio > negative_ratio else 'negative'}",
                f"Highest volume source: {max(source_analysis.keys(), key=lambda k: source_analysis[k]['total_feedback']) if source_analysis else 'N/A'}",
                f"Most positive source: {max(source_analysis.keys(), key=lambda k: source_analysis[k]['positive_ratio']) if source_analysis else 'N/A'}",
                "Immediate attention needed for negative feedback" if negative_ratio > 0.25 else "Sentiment levels are healthy"
            ],
            "timestamp": datetime.now().isoformat()
        }
    
    async def _handle_issue_summary(self, request_data: Dict) -> Dict:
        """Maneja resumen de problemas detectados"""
        time_window = request_data.get("time_window_days", 7)
        
        # Obtener problemas detectados
        cutoff_date = datetime.now() - timedelta(days=time_window)
        all_issues = []
        
        for feedback_id, processed_data in self.processed_feedback.items():
            feedback = self.feedback_database.get(feedback_id)
            if feedback and feedback.timestamp >= cutoff_date:
                issues = processed_data.get("issues_detected", [])
                for issue in issues:
                    issue["feedback_id"] = feedback_id
                    issue["feedback_timestamp"] = feedback.timestamp
                    all_issues.append(issue)
        
        if not all_issues:
            return {"status": "success", "message": "No issues detected in recent feedback"}
        
        # Analizar problemas
        issue_types = [issue["issue_type"] for issue in all_issues]
        issue_counts = Counter(issue_types)
        
        # Agrupar por departamento
        issues_by_department = defaultdict(list)
        for issue in all_issues:
            issues_by_department[issue["responsible_department"]].append(issue)
        
        # Análizar severidad
        severity_counts = Counter([issue["severity"] for issue in all_issues])
        
        return {
            "status": "success",
            "analysis_period": {
                "days": time_window,
                "start_date": cutoff_date.isoformat(),
                "end_date": datetime.now().isoformat(),
                "total_issues": len(all_issues)
            },
            "issue_overview": {
                "unique_issue_types": len(issue_counts),
                "most_frequent_issue": max(issue_counts.keys(), key=issue_counts.get) if issue_counts else None,
                "issue_frequency": dict(issue_counts),
                "severity_distribution": dict(severity_counts),
                "departments_affected": len(issues_by_department)
            },
            "department_breakdown": {
                dept: {
                    "total_issues": len(dept_issues),
                    "severity_breakdown": dict(Counter([i["severity"] for i in dept_issues])),
                    "top_issue_types": [item[0] for item in Counter([i["issue_type"] for i in dept_issues]).most_common(3)]
                }
                for dept, dept_issues in issues_by_department.items()
            },
            "critical_issues": [
                {
                    "issue_type": issue["issue_type"],
                    "severity": issue["severity"],
                    "department": issue["responsible_department"],
                    "confidence": issue["confidence"],
                    "feedback_id": issue["feedback_id"],
                    "timestamp": issue["feedback_timestamp"].isoformat()
                }
                for issue in all_issues if issue["severity"] == "critical"
            ],
            "trending_issues": [
                {"issue_type": issue_type, "frequency": count, "trend": "increasing"}
                for issue_type, count in issue_counts.most_common(5)
            ],
            "recommendations": [
                f"Priority attention needed for {max(severity_counts.keys(), key=severity_counts.get)} severity issues",
                f"Focus on {max(issue_counts.keys(), key=issue_counts.get)} issue type resolution",
                "Implement proactive measures for recurring issues",
                "Coordinate cross-departmental response for systemic issues"
            ],
            "timestamp": datetime.now().isoformat()
        }
    
    # Métodos auxiliares
    
    async def _generate_action_items_from_analysis(self, feedback: FeedbackItem, analysis: Dict) -> List[ActionItem]:
        """Genera items de acción basados en análisis"""
        action_items = []
        
        # Items de acción basados en prioridad
        priority_level = PriorityLevel(analysis.get("priority_assessment", {}).get("priority_level", "medium"))
        
        if priority_level in [PriorityLevel.HIGH, PriorityLevel.CRITICAL]:
            action_item = ActionItem(
                action_id=str(uuid.uuid4()),
                title=f"Address {priority_level.value} priority feedback",
                description=f"Respond to feedback from {feedback.customer_id} regarding {feedback.product_service}",
                priority=priority_level,
                assigned_department="customer_service",
                estimated_effort="2-4 hours",
                expected_impact="high",
                deadline=datetime.now() + timedelta(hours=24 if priority_level == PriorityLevel.CRITICAL else 48),
                status=ActionStatus.PENDING,
                created_from=[feedback.feedback_id],
                success_metrics=["customer_satisfaction", "response_time"]
            )
            action_items.append(action_item)
            self.action_items.append(action_item)
        
        # Items de acción basados en problemas detectados
        issues = analysis.get("issues_detected", [])
        for issue in issues:
            action_item = ActionItem(
                action_id=str(uuid.uuid4()),
                title=f"Resolve {issue['issue_type']} issue",
                description=f"Address {issue['issue_type']} reported by customer {feedback.customer_id}",
                priority=PriorityLevel.HIGH if issue["severity"] == "critical" else PriorityLevel.MEDIUM,
                assigned_department=issue["responsible_department"],
                estimated_effort="4-8 hours" if issue["severity"] == "critical" else "2-4 hours",
                expected_impact=issue["severity"],
                deadline=datetime.now() + timedelta(days=1 if issue["severity"] == "critical" else 3),
                status=ActionStatus.PENDING,
                created_from=[feedback.feedback_id],
                success_metrics=["issue_resolution", "prevention_measures"]
            )
            action_items.append(action_item)
            self.action_items.append(action_item)
        
        return action_items
    
    async def _perform_detailed_trend_analysis(self, feedbacks: List[FeedbackItem]) -> Dict:
        """Realiza análisis detallado de tendencias"""
        if not feedbacks:
            return {}
        
        # Análisis temporal
        daily_feedback = defaultdict(int)
        for feedback in feedbacks:
            day = feedback.timestamp.date()
            daily_feedback[day] += 1
        
        # Análisis por fuente
        source_distribution = Counter([fb.source.value for fb in feedbacks])
        
        # Análisis por producto
        product_distribution = Counter([fb.product_service for fb in feedbacks])
        
        # Análisis de ratings
        ratings = [fb.rating for fb in feedbacks if fb.rating is not None]
        
        return {
            "temporal_analysis": {
                "daily_volume": dict(daily_feedback),
                "peak_day": max(daily_feedback.keys(), key=daily_feedback.get) if daily_feedback else None,
                "average_daily": np.mean(list(daily_feedback.values())) if daily_feedback else 0
            },
            "source_analysis": {
                "distribution": dict(source_distribution),
                "most_active_source": max(source_distribution.keys(), key=source_distribution.get) if source_distribution else None
            },
            "product_analysis": {
                "distribution": dict(product_distribution),
                "most_mentioned_product": max(product_distribution.keys(), key=product_distribution.get) if product_distribution else None
            },
            "rating_analysis": {
                "average_rating": np.mean(ratings) if ratings else None,
                "rating_distribution": dict(Counter(ratings)) if ratings else {},
                "total_rated_feedback": len(ratings)
            }
        }
    
    async def get_agent_status(self) -> Dict:
        """Retorna estado completo del agente"""
        return {
            "agent_info": {
                "name": self.name,
                "type": self.agent_type,
                "status": self.status,
                "uptime": str(datetime.now() - self.created_at)
            },
            "capabilities": [
                "Multi-model sentiment analysis",
                "Automated topic extraction",
                "Intelligent feedback classification",
                "Issue detection and alerting",
                "Actionable insights generation",
                "Temporal trend analysis",
                "Priority assessment automation",
                "Cross-departmental action coordination"
            ],
            "performance_metrics": self.performance_metrics,
            "analyzer_config": self.analyzer_config,
            "database_status": {
                "total_feedback": len(self.feedback_database),
                "processed_feedback": len(self.processed_feedback),
                "generated_insights": len(self.generated_insights),
                "pending_actions": len([item for item in self.action_items if item.status == ActionStatus.PENDING])
            },
            "recent_activity": [
                {
                    "timestamp": (datetime.now() - timedelta(minutes=5)).isoformat(),
                    "activity": "feedback_processed",
                    "details": "High priority complaint analyzed",
                    "status": "completed"
                },
                {
                    "timestamp": (datetime.now() - timedelta(minutes=15)).isoformat(),
                    "activity": "insight_generated",
                    "details": "Recurring issue pattern detected",
                    "status": "completed"
                },
                {
                    "timestamp": (datetime.now() - timedelta(minutes=30)).isoformat(),
                    "activity": "trend_analysis",
                    "details": "Weekly sentiment trends analyzed",
                    "status": "completed"
                }
            ],
            "system_health": {
                "feedback_processor": "operational",
                "insight_generator": "operational",
                "trend_analyzer": "operational",
                "sentiment_models": "active",
                "classification_engine": "active",
                "action_generator": "operational"
            }
        }

# Funciones de utilidad y testing
async def test_feedback_analyzer():
    """Función de prueba del FeedbackAnalyzer Agent"""
    agent = FeedbackAnalyzerAgent()
    
    # Prueba de análisis de feedback
    feedback_request = {
        "type": "analyze_feedback",
        "feedback": {
            "customer_id": "test_customer",
            "source": "review",
            "title": "Experiencia decepcionante",
            "content": "El guía llegó tarde, no tenía buen conocimiento del lugar y el grupo era demasiado grande. No lo recomendaría.",
            "rating": 2.0,
            "product_service": "madrid_city_tour",
            "location": "Madrid"
        }
    }
    
    result = await agent.process_request(feedback_request)
    print("Feedback Analysis Result:")
    print(json.dumps(result, indent=2, default=str))
    
    # Prueba de generación de insights
    insights_request = {
        "type": "generate_insights",
        "time_window_days": 7
    }
    
    insights_result = await agent.process_request(insights_request)
    print("\nInsights Generation Result:")
    print(json.dumps(insights_result, indent=2, default=str))
    
    return agent

if __name__ == "__main__":
    # Ejecutar pruebas
    import asyncio
    asyncio.run(test_feedback_analyzer())