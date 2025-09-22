#!/usr/bin/env python3
"""
Spirit Tours - Knowledge Curator AI Agent
Sistema Inteligente de Curación y Gestión de Conocimiento

Este agente proporciona capacidades avanzadas de gestión de conocimiento,
incluyendo curación de contenido turístico, base de conocimientos inteligente,
sistema de recomendaciones, gestión de información de reservas, y 
optimización de experiencias basada en datos históricos.

Author: Spirit Tours AI Development Team
Version: 1.0.0
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Set, Union
from dataclasses import dataclass, field
from enum import Enum
import aiohttp
import pandas as pd
import numpy as np
from pydantic import BaseModel, Field
import redis.asyncio as redis
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans
from sklearn.decomposition import LatentDirichletAllocation
import nltk
from textblob import TextBlob
import spacy
import yaml
import hashlib
from collections import defaultdict, Counter
import math
import statistics
import re
import warnings
warnings.filterwarnings('ignore')

# Import base agent
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.base_agent import BaseAgent
from utils.performance_monitor import PerformanceMonitor
from utils.health_checker import HealthChecker

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KnowledgeType(Enum):
    """Tipos de conocimiento gestionados"""
    DESTINATION_INFO = "destination_info"
    ACCOMMODATION = "accommodation"
    ACTIVITY = "activity"
    TRANSPORTATION = "transportation"
    CULTURAL_INFO = "cultural_info"
    BOOKING_RULES = "booking_rules"
    PRICING_INFO = "pricing_info"
    CUSTOMER_PREFERENCE = "customer_preference"
    REVIEW_INSIGHT = "review_insight"
    SEASONAL_DATA = "seasonal_data"
    REGULATORY_INFO = "regulatory_info"
    EMERGENCY_INFO = "emergency_info"

class ContentFormat(Enum):
    """Formatos de contenido soportados"""
    TEXT = "text"
    JSON = "json"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    DOCUMENT = "document"
    STRUCTURED_DATA = "structured_data"

class KnowledgeSource(Enum):
    """Fuentes de conocimiento"""
    INTERNAL_DATA = "internal_data"
    CUSTOMER_FEEDBACK = "customer_feedback"
    EXTERNAL_API = "external_api"
    MANUAL_CURATION = "manual_curation"
    MACHINE_LEARNING = "machine_learning"
    PARTNER_INTEGRATION = "partner_integration"
    WEB_SCRAPING = "web_scraping"
    SOCIAL_MEDIA = "social_media"

class QualityScore(Enum):
    """Niveles de calidad del conocimiento"""
    EXCELLENT = "excellent"
    GOOD = "good"
    AVERAGE = "average"
    POOR = "poor"
    NEEDS_REVIEW = "needs_review"

@dataclass
class KnowledgeItem:
    """Item individual de conocimiento"""
    knowledge_id: str
    title: str
    content: str
    knowledge_type: KnowledgeType
    content_format: ContentFormat
    source: KnowledgeSource
    quality_score: float
    relevance_score: float
    freshness_score: float
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    related_items: List[str] = field(default_factory=list)
    usage_count: int = 0
    last_updated: datetime = field(default_factory=datetime.now)
    expiry_date: Optional[datetime] = None
    language: str = "es"
    verified: bool = False

@dataclass
class BookingKnowledge:
    """Conocimiento específico de reservas"""
    booking_id: str
    customer_id: str
    tour_details: Dict[str, Any]
    booking_rules: Dict[str, Any]
    payment_info: Dict[str, Any]
    cancellation_policy: Dict[str, Any]
    special_requirements: List[str] = field(default_factory=list)
    previous_bookings: List[str] = field(default_factory=list)
    preference_profile: Dict[str, Any] = field(default_factory=dict)
    booking_status: str = "pending"
    created_at: datetime = field(default_factory=datetime.now)

@dataclass
class RecommendationContext:
    """Contexto para recomendaciones"""
    user_id: Optional[str] = None
    search_query: Optional[str] = None
    current_location: Optional[str] = None
    travel_dates: Optional[Tuple[datetime, datetime]] = None
    budget_range: Optional[Tuple[float, float]] = None
    group_size: int = 1
    interests: List[str] = field(default_factory=list)
    previous_bookings: List[str] = field(default_factory=list)
    language_preference: str = "es"

@dataclass
class KnowledgeQuery:
    """Query para búsqueda de conocimiento"""
    query_text: str
    knowledge_types: List[KnowledgeType] = field(default_factory=list)
    filters: Dict[str, Any] = field(default_factory=dict)
    limit: int = 10
    include_related: bool = True
    minimum_quality: float = 0.5
    language: str = "es"
    context: Optional[RecommendationContext] = None

@dataclass
class SearchResult:
    """Resultado de búsqueda"""
    knowledge_item: KnowledgeItem
    relevance_score: float
    match_explanation: List[str]
    related_suggestions: List[str] = field(default_factory=list)

@dataclass
class KnowledgeInsight:
    """Insight generado del análisis de conocimiento"""
    insight_id: str
    insight_type: str
    title: str
    description: str
    confidence: float
    supporting_data: Dict[str, Any]
    recommendations: List[str] = field(default_factory=list)
    generated_at: datetime = field(default_factory=datetime.now)

class KnowledgeProcessor:
    """Procesador de conocimiento turístico"""
    
    def __init__(self):
        self.knowledge_base = {}
        self.booking_knowledge = {}
        self.vectorizer = TfidfVectorizer(max_features=10000, stop_words='spanish')
        self.lda_model = LatentDirichletAllocation(n_components=20, random_state=42)
        self.clusterer = KMeans(n_clusters=15, random_state=42)
        self.similarity_threshold = 0.7
        self.knowledge_graph = defaultdict(set)
        
        # Inicializar procesador de texto español
        try:
            self.nlp = spacy.load("es_core_news_sm")
        except IOError:
            logger.warning("Spanish spaCy model not found, using basic processing")
            self.nlp = None
    
    async def add_knowledge_item(self, item: KnowledgeItem) -> bool:
        """Añade un item de conocimiento a la base"""
        try:
            # Validar y procesar el item
            processed_item = await self._process_knowledge_item(item)
            
            # Calcular scores de calidad y relevancia
            processed_item.quality_score = await self._calculate_quality_score(processed_item)
            processed_item.freshness_score = await self._calculate_freshness_score(processed_item)
            
            # Extraer entidades y temas
            processed_item.tags.extend(await self._extract_entities(processed_item.content))
            
            # Encontrar items relacionados
            related_items = await self._find_related_items(processed_item)
            processed_item.related_items = related_items
            
            # Almacenar en la base de conocimientos
            self.knowledge_base[item.knowledge_id] = processed_item
            
            # Actualizar grafo de conocimiento
            await self._update_knowledge_graph(processed_item)
            
            logger.info(f"Knowledge item added: {item.knowledge_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding knowledge item: {str(e)}")
            return False
    
    async def _process_knowledge_item(self, item: KnowledgeItem) -> KnowledgeItem:
        """Procesa un item de conocimiento"""
        
        # Limpiar y normalizar contenido
        if item.content_format == ContentFormat.TEXT:
            item.content = await self._clean_text(item.content)
        
        # Verificar duplicados
        duplicate_id = await self._check_duplicates(item)
        if duplicate_id:
            logger.warning(f"Potential duplicate found: {duplicate_id}")
            item.metadata['potential_duplicate'] = duplicate_id
        
        # Enriquecer metadata
        item.metadata.update({
            'word_count': len(item.content.split()) if item.content_format == ContentFormat.TEXT else 0,
            'character_count': len(item.content),
            'processing_timestamp': datetime.now().isoformat(),
            'automated_tags': await self._generate_automated_tags(item.content)
        })
        
        return item
    
    async def _clean_text(self, text: str) -> str:
        """Limpia y normaliza texto"""
        if not text:
            return ""
        
        # Remover caracteres especiales manteniendo español
        cleaned = re.sub(r'[^\w\sáéíóúüñÁÉÍÓÚÜÑ.,!?;:]', '', text)
        
        # Normalizar espacios
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        
        return cleaned
    
    async def _calculate_quality_score(self, item: KnowledgeItem) -> float:
        """Calcula score de calidad del conocimiento"""
        
        quality_factors = []
        
        # Factor de completitud
        if item.content and len(item.content.strip()) > 0:
            completeness = min(1.0, len(item.content) / 500)  # 500 chars como referencia
            quality_factors.append(completeness)
        else:
            quality_factors.append(0.0)
        
        # Factor de fuente
        source_scores = {
            KnowledgeSource.MANUAL_CURATION: 0.95,
            KnowledgeSource.INTERNAL_DATA: 0.85,
            KnowledgeSource.PARTNER_INTEGRATION: 0.80,
            KnowledgeSource.CUSTOMER_FEEDBACK: 0.75,
            KnowledgeSource.EXTERNAL_API: 0.70,
            KnowledgeSource.MACHINE_LEARNING: 0.65,
            KnowledgeSource.WEB_SCRAPING: 0.60,
            KnowledgeSource.SOCIAL_MEDIA: 0.55
        }
        quality_factors.append(source_scores.get(item.source, 0.5))
        
        # Factor de verificación
        quality_factors.append(0.9 if item.verified else 0.6)
        
        # Factor de metadatos
        metadata_completeness = len(item.metadata) / 10  # 10 campos esperados
        quality_factors.append(min(1.0, metadata_completeness))
        
        # Factor de tags
        tag_completeness = min(1.0, len(item.tags) / 5)  # 5 tags como referencia
        quality_factors.append(tag_completeness)
        
        return statistics.mean(quality_factors)
    
    async def _calculate_freshness_score(self, item: KnowledgeItem) -> float:
        """Calcula score de frescura del conocimiento"""
        
        now = datetime.now()
        days_old = (now - item.last_updated).days
        
        # Diferentes tipos de conocimiento envejecen diferente
        decay_rates = {
            KnowledgeType.PRICING_INFO: 7,  # Precios cambian rápido
            KnowledgeType.SEASONAL_DATA: 90,
            KnowledgeType.BOOKING_RULES: 30,
            KnowledgeType.EMERGENCY_INFO: 1,
            KnowledgeType.REGULATORY_INFO: 30,
            KnowledgeType.ACCOMMODATION: 60,
            KnowledgeType.ACTIVITY: 90,
            KnowledgeType.DESTINATION_INFO: 180,
            KnowledgeType.CULTURAL_INFO: 365,
            KnowledgeType.TRANSPORTATION: 60
        }
        
        decay_period = decay_rates.get(item.knowledge_type, 90)
        freshness = max(0.1, 1.0 - (days_old / decay_period))
        
        # Bonificación si tiene fecha de expiración válida
        if item.expiry_date and item.expiry_date > now:
            freshness = min(1.0, freshness * 1.2)
        elif item.expiry_date and item.expiry_date <= now:
            freshness = 0.1  # Conocimiento expirado
        
        return freshness
    
    async def _extract_entities(self, content: str) -> List[str]:
        """Extrae entidades del contenido"""
        entities = []
        
        if self.nlp and content:
            try:
                doc = self.nlp(content[:1000])  # Limitar para eficiencia
                
                for ent in doc.ents:
                    if ent.label_ in ['LOC', 'ORG', 'PERSON', 'MISC']:
                        entities.append(ent.text.lower())
                
                # Extraer sustantivos importantes
                important_nouns = [
                    token.lemma_.lower() for token in doc 
                    if token.pos_ == 'NOUN' and len(token.text) > 3 and token.is_alpha
                ]
                entities.extend(important_nouns[:5])  # Top 5 sustantivos
                
            except Exception as e:
                logger.warning(f"Error extracting entities: {str(e)}")
        
        # Fallback: usar keywords básicos
        if not entities:
            entities = await self._extract_basic_keywords(content)
        
        return list(set(entities))  # Remover duplicados
    
    async def _extract_basic_keywords(self, content: str) -> List[str]:
        """Extrae keywords básicos del contenido"""
        if not content:
            return []
        
        # Keywords turísticos comunes
        tourism_keywords = [
            'hotel', 'restaurante', 'museo', 'playa', 'montaña', 'ciudad',
            'tour', 'guía', 'excursión', 'viaje', 'destino', 'atracción',
            'cultura', 'historia', 'arte', 'naturaleza', 'aventura',
            'transporte', 'vuelo', 'tren', 'autobús', 'taxi',
            'precio', 'descuento', 'oferta', 'reserva', 'disponibilidad'
        ]
        
        content_lower = content.lower()
        found_keywords = [kw for kw in tourism_keywords if kw in content_lower]
        
        # Extraer palabras frecuentes
        words = re.findall(r'\b\w{4,}\b', content_lower)
        word_freq = Counter(words)
        frequent_words = [word for word, count in word_freq.most_common(5) if count > 1]
        
        return found_keywords + frequent_words
    
    async def _generate_automated_tags(self, content: str) -> List[str]:
        """Genera tags automáticos basados en el contenido"""
        if not content:
            return []
        
        # Categorías turísticas automáticas
        category_patterns = {
            'gastronomia': ['restaurante', 'comida', 'cocina', 'plato', 'gastronom'],
            'cultura': ['museo', 'arte', 'historia', 'cultura', 'patrimonio'],
            'naturaleza': ['parque', 'bosque', 'montaña', 'playa', 'naturaleza'],
            'aventura': ['aventura', 'deporte', 'extremo', 'escalada', 'senderismo'],
            'familia': ['familia', 'niños', 'infantil', 'parque', 'diversión'],
            'lujo': ['lujo', 'premium', 'exclusivo', 'spa', 'resort'],
            'economico': ['barato', 'económico', 'budget', 'ahorro', 'descuento'],
            'urbano': ['ciudad', 'urbano', 'centro', 'shopping', 'vida nocturna'],
            'rural': ['rural', 'campo', 'pueblo', 'tradición', 'auténtico']
        }
        
        content_lower = content.lower()
        auto_tags = []
        
        for tag, patterns in category_patterns.items():
            if any(pattern in content_lower for pattern in patterns):
                auto_tags.append(tag)
        
        return auto_tags
    
    async def _find_related_items(self, item: KnowledgeItem) -> List[str]:
        """Encuentra items relacionados usando similitud"""
        related_items = []
        
        if not self.knowledge_base:
            return related_items
        
        try:
            # Crear corpus para comparación
            texts = [existing_item.content for existing_item in self.knowledge_base.values()]
            texts.append(item.content)
            
            if len(texts) < 2:
                return related_items
            
            # Calcular similitud TF-IDF
            tfidf_matrix = self.vectorizer.fit_transform(texts)
            similarities = cosine_similarity(tfidf_matrix[-1:], tfidf_matrix[:-1])[0]
            
            # Encontrar items similares
            for i, similarity in enumerate(similarities):
                if similarity > self.similarity_threshold:
                    existing_ids = list(self.knowledge_base.keys())
                    if i < len(existing_ids):
                        related_items.append(existing_ids[i])
            
            # Limitar a top 5
            related_items = related_items[:5]
            
        except Exception as e:
            logger.warning(f"Error finding related items: {str(e)}")
        
        return related_items
    
    async def _check_duplicates(self, item: KnowledgeItem) -> Optional[str]:
        """Verifica si existe un item duplicado"""
        
        for existing_id, existing_item in self.knowledge_base.items():
            # Verificar similitud de título
            if item.title and existing_item.title:
                title_similarity = self._calculate_text_similarity(
                    item.title.lower(), existing_item.title.lower()
                )
                if title_similarity > 0.9:
                    return existing_id
            
            # Verificar similitud de contenido
            if item.content and existing_item.content:
                content_similarity = self._calculate_text_similarity(
                    item.content[:500].lower(), existing_item.content[:500].lower()
                )
                if content_similarity > 0.85:
                    return existing_id
        
        return None
    
    def _calculate_text_similarity(self, text1: str, text2: str) -> float:
        """Calcula similitud entre dos textos"""
        if not text1 or not text2:
            return 0.0
        
        # Usar Jaccard similarity para textos cortos
        words1 = set(text1.split())
        words2 = set(text2.split())
        
        if not words1 and not words2:
            return 1.0
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union) if union else 0.0
    
    async def _update_knowledge_graph(self, item: KnowledgeItem):
        """Actualiza el grafo de conocimiento"""
        
        # Conectar con items relacionados
        for related_id in item.related_items:
            self.knowledge_graph[item.knowledge_id].add(related_id)
            self.knowledge_graph[related_id].add(item.knowledge_id)
        
        # Conectar por tags comunes
        for existing_id, existing_item in self.knowledge_base.items():
            if existing_id != item.knowledge_id:
                common_tags = set(item.tags).intersection(set(existing_item.tags))
                if len(common_tags) >= 2:  # Al menos 2 tags en común
                    self.knowledge_graph[item.knowledge_id].add(existing_id)
                    self.knowledge_graph[existing_id].add(item.knowledge_id)
    
    async def search_knowledge(self, query: KnowledgeQuery) -> List[SearchResult]:
        """Busca conocimiento según la query"""
        
        results = []
        
        try:
            # Filtrar por tipo si se especifica
            candidate_items = {}
            for item_id, item in self.knowledge_base.items():
                if not query.knowledge_types or item.knowledge_type in query.knowledge_types:
                    if item.quality_score >= query.minimum_quality:
                        candidate_items[item_id] = item
            
            if not candidate_items:
                return results
            
            # Búsqueda por similitud de texto
            if query.query_text:
                results = await self._search_by_text_similarity(
                    query.query_text, candidate_items, query.limit
                )
            else:
                # Si no hay query de texto, devolver los mejores por calidad
                sorted_items = sorted(
                    candidate_items.items(), 
                    key=lambda x: x[1].quality_score, 
                    reverse=True
                )[:query.limit]
                
                for item_id, item in sorted_items:
                    results.append(SearchResult(
                        knowledge_item=item,
                        relevance_score=item.quality_score,
                        match_explanation=["High quality match"]
                    ))
            
            # Aplicar filtros adicionales
            if query.filters:
                results = await self._apply_filters(results, query.filters)
            
            # Agregar sugerencias relacionadas si se solicita
            if query.include_related:
                for result in results:
                    result.related_suggestions = result.knowledge_item.related_items[:3]
            
            # Personalizar basado en contexto
            if query.context:
                results = await self._personalize_results(results, query.context)
            
            return results[:query.limit]
            
        except Exception as e:
            logger.error(f"Error searching knowledge: {str(e)}")
            return []
    
    async def _search_by_text_similarity(self, query_text: str, 
                                       candidate_items: Dict[str, KnowledgeItem], 
                                       limit: int) -> List[SearchResult]:
        """Busca por similitud de texto"""
        
        results = []
        
        try:
            # Preparar textos para vectorización
            texts = []
            item_ids = []
            
            for item_id, item in candidate_items.items():
                search_text = f"{item.title} {item.content} {' '.join(item.tags)}"
                texts.append(search_text)
                item_ids.append(item_id)
            
            if not texts:
                return results
            
            # Añadir query al final
            texts.append(query_text)
            
            # Vectorizar y calcular similitudes
            tfidf_matrix = self.vectorizer.fit_transform(texts)
            similarities = cosine_similarity(tfidf_matrix[-1:], tfidf_matrix[:-1])[0]
            
            # Crear resultados ordenados por similitud
            scored_items = []
            for i, similarity in enumerate(similarities):
                if similarity > 0.1 and i < len(item_ids):  # Umbral mínimo
                    item_id = item_ids[i]
                    item = candidate_items[item_id]
                    
                    # Combinar similitud con scores de calidad y frescura
                    combined_score = (similarity * 0.6 + 
                                    item.quality_score * 0.3 + 
                                    item.freshness_score * 0.1)
                    
                    scored_items.append((item_id, item, combined_score, similarity))
            
            # Ordenar por score combinado
            scored_items.sort(key=lambda x: x[2], reverse=True)
            
            # Crear SearchResults
            for item_id, item, combined_score, similarity in scored_items[:limit]:
                match_explanation = await self._generate_match_explanation(
                    query_text, item, similarity
                )
                
                results.append(SearchResult(
                    knowledge_item=item,
                    relevance_score=combined_score,
                    match_explanation=match_explanation
                ))
            
        except Exception as e:
            logger.error(f"Error in text similarity search: {str(e)}")
        
        return results
    
    async def _generate_match_explanation(self, query: str, item: KnowledgeItem, 
                                        similarity: float) -> List[str]:
        """Genera explicación del match"""
        
        explanations = []
        
        # Explicación por similitud
        if similarity > 0.8:
            explanations.append("Muy alta similitud con tu búsqueda")
        elif similarity > 0.6:
            explanations.append("Alta similitud con tu búsqueda")
        elif similarity > 0.4:
            explanations.append("Similitud moderada con tu búsqueda")
        else:
            explanations.append("Similitud básica con tu búsqueda")
        
        # Explicación por tags coincidentes
        query_words = set(query.lower().split())
        item_tags = set([tag.lower() for tag in item.tags])
        matching_tags = query_words.intersection(item_tags)
        
        if matching_tags:
            explanations.append(f"Tags coincidentes: {', '.join(matching_tags)}")
        
        # Explicación por calidad
        if item.quality_score > 0.8:
            explanations.append("Contenido de alta calidad")
        
        # Explicación por frescura
        if item.freshness_score > 0.8:
            explanations.append("Información actualizada")
        
        return explanations[:3]  # Máximo 3 explicaciones
    
    async def _apply_filters(self, results: List[SearchResult], 
                           filters: Dict[str, Any]) -> List[SearchResult]:
        """Aplica filtros adicionales a los resultados"""
        
        filtered_results = []
        
        for result in results:
            item = result.knowledge_item
            include = True
            
            # Filtro por fecha
            if 'date_range' in filters:
                date_range = filters['date_range']
                if isinstance(date_range, tuple) and len(date_range) == 2:
                    start_date, end_date = date_range
                    if item.last_updated < start_date or item.last_updated > end_date:
                        include = False
            
            # Filtro por tags
            if 'required_tags' in filters:
                required_tags = set(filters['required_tags'])
                item_tags = set(item.tags)
                if not required_tags.issubset(item_tags):
                    include = False
            
            # Filtro por fuente
            if 'allowed_sources' in filters:
                if item.source not in filters['allowed_sources']:
                    include = False
            
            # Filtro por idioma
            if 'language' in filters:
                if item.language != filters['language']:
                    include = False
            
            # Filtro por verificación
            if 'verified_only' in filters and filters['verified_only']:
                if not item.verified:
                    include = False
            
            if include:
                filtered_results.append(result)
        
        return filtered_results
    
    async def _personalize_results(self, results: List[SearchResult], 
                                 context: RecommendationContext) -> List[SearchResult]:
        """Personaliza resultados basado en el contexto del usuario"""
        
        personalized_results = []
        
        for result in results:
            item = result.knowledge_item
            personalization_boost = 0.0
            
            # Boost por intereses del usuario
            if context.interests:
                user_interests = set([interest.lower() for interest in context.interests])
                item_tags = set([tag.lower() for tag in item.tags])
                interest_overlap = user_interests.intersection(item_tags)
                personalization_boost += len(interest_overlap) * 0.1
            
            # Boost por historial de reservas
            if context.previous_bookings and item.knowledge_type in [
                KnowledgeType.DESTINATION_INFO, KnowledgeType.ACTIVITY
            ]:
                # Boost basado en preferencias previas (simplificado)
                personalization_boost += 0.05
            
            # Boost por ubicación actual
            if context.current_location and 'location' in item.metadata:
                # Boost si es contenido local (simplificado)
                personalization_boost += 0.1
            
            # Boost por idioma preferido
            if context.language_preference == item.language:
                personalization_boost += 0.05
            
            # Aplicar boost
            boosted_score = min(1.0, result.relevance_score + personalization_boost)
            result.relevance_score = boosted_score
            
            personalized_results.append(result)
        
        # Re-ordenar por score personalizado
        personalized_results.sort(key=lambda x: x.relevance_score, reverse=True)
        
        return personalized_results
    
    async def add_booking_knowledge(self, booking: BookingKnowledge) -> bool:
        """Añade conocimiento específico de reserva"""
        try:
            self.booking_knowledge[booking.booking_id] = booking
            
            # Extraer insights de la reserva para conocimiento general
            await self._extract_booking_insights(booking)
            
            logger.info(f"Booking knowledge added: {booking.booking_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding booking knowledge: {str(e)}")
            return False
    
    async def _extract_booking_insights(self, booking: BookingKnowledge):
        """Extrae insights de una reserva para mejorar el conocimiento general"""
        
        try:
            # Crear conocimiento sobre patrones de reserva
            booking_pattern_item = KnowledgeItem(
                knowledge_id=f"booking_pattern_{booking.booking_id}",
                title=f"Patrón de reserva - Cliente {booking.customer_id}",
                content=f"Reserva de {booking.tour_details.get('destination', 'destino')} "
                       f"para {booking.tour_details.get('group_size', 1)} personas",
                knowledge_type=KnowledgeType.CUSTOMER_PREFERENCE,
                content_format=ContentFormat.STRUCTURED_DATA,
                source=KnowledgeSource.INTERNAL_DATA,
                quality_score=0.8,
                relevance_score=0.7,
                freshness_score=1.0,
                metadata={
                    'customer_id': booking.customer_id,
                    'booking_value': booking.tour_details.get('total_cost', 0),
                    'group_size': booking.tour_details.get('group_size', 1),
                    'booking_lead_time': (booking.tour_details.get('start_date', datetime.now()) - booking.created_at).days
                },
                verified=True
            )
            
            await self.add_knowledge_item(booking_pattern_item)
            
        except Exception as e:
            logger.warning(f"Error extracting booking insights: {str(e)}")
    
    async def generate_insights(self, knowledge_types: List[KnowledgeType] = None) -> List[KnowledgeInsight]:
        """Genera insights del análisis de conocimiento"""
        
        insights = []
        
        try:
            # Analizar tendencias de conocimiento
            trend_insights = await self._analyze_knowledge_trends(knowledge_types)
            insights.extend(trend_insights)
            
            # Analizar gaps de conocimiento
            gap_insights = await self._analyze_knowledge_gaps(knowledge_types)
            insights.extend(gap_insights)
            
            # Analizar calidad del conocimiento
            quality_insights = await self._analyze_knowledge_quality(knowledge_types)
            insights.extend(quality_insights)
            
            # Analizar patrones de reserva si hay booking knowledge
            if self.booking_knowledge:
                booking_insights = await self._analyze_booking_patterns()
                insights.extend(booking_insights)
            
        except Exception as e:
            logger.error(f"Error generating insights: {str(e)}")
        
        return insights
    
    async def _analyze_knowledge_trends(self, knowledge_types: List[KnowledgeType] = None) -> List[KnowledgeInsight]:
        """Analiza tendencias en el conocimiento"""
        
        insights = []
        
        # Filtrar items si se especifican tipos
        items = self.knowledge_base.values()
        if knowledge_types:
            items = [item for item in items if item.knowledge_type in knowledge_types]
        
        if not items:
            return insights
        
        # Análisis de crecimiento por tipo
        type_counts = Counter([item.knowledge_type for item in items])
        
        if type_counts:
            most_common_type = type_counts.most_common(1)[0]
            insights.append(KnowledgeInsight(
                insight_id=f"trend_knowledge_type_{datetime.now().strftime('%Y%m%d')}",
                insight_type="trend_analysis",
                title="Tipo de Conocimiento Dominante",
                description=f"El tipo de conocimiento más común es {most_common_type[0].value} "
                          f"con {most_common_type[1]} items ({(most_common_type[1]/len(items)*100):.1f}%)",
                confidence=0.9,
                supporting_data={
                    "type_distribution": dict(type_counts),
                    "total_items": len(items)
                },
                recommendations=[
                    f"Considerar balancear con más contenido de otros tipos",
                    f"Aprovechar la fortaleza en {most_common_type[0].value}"
                ]
            ))
        
        # Análisis de frescura
        fresh_items = [item for item in items if item.freshness_score > 0.8]
        if items:
            freshness_ratio = len(fresh_items) / len(items)
            insights.append(KnowledgeInsight(
                insight_id=f"trend_freshness_{datetime.now().strftime('%Y%m%d')}",
                insight_type="freshness_analysis",
                title="Estado de Frescura del Conocimiento",
                description=f"{freshness_ratio*100:.1f}% del conocimiento está actualizado",
                confidence=0.85,
                supporting_data={
                    "fresh_items": len(fresh_items),
                    "total_items": len(items),
                    "freshness_ratio": freshness_ratio
                },
                recommendations=[
                    "Actualizar conocimiento obsoleto regularmente",
                    "Establecer ciclos de revisión automática"
                ] if freshness_ratio < 0.7 else [
                    "Mantener el buen nivel de actualización",
                    "Continuar con la estrategia actual"
                ]
            ))
        
        return insights
    
    async def _analyze_knowledge_gaps(self, knowledge_types: List[KnowledgeType] = None) -> List[KnowledgeInsight]:
        """Analiza gaps en el conocimiento"""
        
        insights = []
        
        # Todos los tipos de conocimiento esperados
        all_types = list(KnowledgeType)
        current_types = set([item.knowledge_type for item in self.knowledge_base.values()])
        
        missing_types = set(all_types) - current_types
        
        if missing_types:
            insights.append(KnowledgeInsight(
                insight_id=f"gap_missing_types_{datetime.now().strftime('%Y%m%d')}",
                insight_type="gap_analysis",
                title="Tipos de Conocimiento Faltantes",
                description=f"Se identificaron {len(missing_types)} tipos de conocimiento sin contenido",
                confidence=1.0,
                supporting_data={
                    "missing_types": [t.value for t in missing_types],
                    "coverage_percentage": (len(current_types) / len(all_types)) * 100
                },
                recommendations=[
                    f"Desarrollar contenido para {t.value}" for t in list(missing_types)[:3]
                ]
            ))
        
        # Análisis de densidad por tipo
        type_density = {}
        for knowledge_type in current_types:
            items = [item for item in self.knowledge_base.values() if item.knowledge_type == knowledge_type]
            avg_quality = statistics.mean([item.quality_score for item in items])
            type_density[knowledge_type] = {
                'count': len(items),
                'avg_quality': avg_quality
            }
        
        # Identificar tipos con baja densidad o calidad
        sparse_types = []
        for k_type, data in type_density.items():
            if data['count'] < 5 or data['avg_quality'] < 0.6:
                sparse_types.append((k_type, data))
        
        if sparse_types:
            insights.append(KnowledgeInsight(
                insight_id=f"gap_sparse_types_{datetime.now().strftime('%Y%m%d')}",
                insight_type="quality_gap_analysis",
                title="Tipos de Conocimiento con Baja Densidad",
                description=f"Se identificaron {len(sparse_types)} tipos con poco contenido o baja calidad",
                confidence=0.8,
                supporting_data={
                    "sparse_types": [(t.value, data) for t, data in sparse_types]
                },
                recommendations=[
                    f"Mejorar contenido de {t.value}" for t, _ in sparse_types[:3]
                ]
            ))
        
        return insights
    
    async def _analyze_knowledge_quality(self, knowledge_types: List[KnowledgeType] = None) -> List[KnowledgeInsight]:
        """Analiza la calidad del conocimiento"""
        
        insights = []
        
        items = list(self.knowledge_base.values())
        if knowledge_types:
            items = [item for item in items if item.knowledge_type in knowledge_types]
        
        if not items:
            return insights
        
        # Análisis de distribución de calidad
        quality_scores = [item.quality_score for item in items]
        avg_quality = statistics.mean(quality_scores)
        quality_std = statistics.stdev(quality_scores) if len(quality_scores) > 1 else 0
        
        high_quality_items = [item for item in items if item.quality_score > 0.8]
        low_quality_items = [item for item in items if item.quality_score < 0.5]
        
        insights.append(KnowledgeInsight(
            insight_id=f"quality_distribution_{datetime.now().strftime('%Y%m%d')}",
            insight_type="quality_analysis",
            title="Distribución de Calidad del Conocimiento",
            description=f"Calidad promedio: {avg_quality:.2f}. "
                      f"{len(high_quality_items)} items de alta calidad, "
                      f"{len(low_quality_items)} items de baja calidad",
            confidence=0.9,
            supporting_data={
                "avg_quality": avg_quality,
                "quality_std": quality_std,
                "high_quality_count": len(high_quality_items),
                "low_quality_count": len(low_quality_items),
                "total_items": len(items)
            },
            recommendations=[
                "Revisar y mejorar items de baja calidad",
                "Usar items de alta calidad como template",
                "Establecer estándares mínimos de calidad"
            ] if len(low_quality_items) > len(items) * 0.2 else [
                "Mantener el buen nivel de calidad actual",
                "Continuar mejorando gradualmente"
            ]
        ))
        
        return insights
    
    async def _analyze_booking_patterns(self) -> List[KnowledgeInsight]:
        """Analiza patrones en las reservas"""
        
        insights = []
        
        if not self.booking_knowledge:
            return insights
        
        bookings = list(self.booking_knowledge.values())
        
        # Análisis de preferencias de destino
        destinations = [b.tour_details.get('destination') for b in bookings if 'destination' in b.tour_details]
        if destinations:
            dest_counts = Counter(destinations)
            popular_dest = dest_counts.most_common(3)
            
            insights.append(KnowledgeInsight(
                insight_id=f"booking_destinations_{datetime.now().strftime('%Y%m%d')}",
                insight_type="booking_pattern_analysis",
                title="Destinos Más Populares",
                description=f"Los destinos más reservados son: {', '.join([d[0] for d in popular_dest])}",
                confidence=0.85,
                supporting_data={
                    "destination_ranking": popular_dest,
                    "total_bookings": len(bookings)
                },
                recommendations=[
                    f"Expandir contenido sobre {popular_dest[0][0]}",
                    "Desarrollar ofertas especiales para destinos populares"
                ]
            ))
        
        # Análisis de tamaño de grupo
        group_sizes = [b.tour_details.get('group_size', 1) for b in bookings]
        if group_sizes:
            avg_group_size = statistics.mean(group_sizes)
            
            insights.append(KnowledgeInsight(
                insight_id=f"booking_group_size_{datetime.now().strftime('%Y%m%d')}",
                insight_type="booking_pattern_analysis",
                title="Tamaño Promedio de Grupo",
                description=f"El tamaño promedio de grupo es {avg_group_size:.1f} personas",
                confidence=0.8,
                supporting_data={
                    "avg_group_size": avg_group_size,
                    "group_size_distribution": dict(Counter(group_sizes))
                },
                recommendations=[
                    "Optimizar ofertas para grupos de este tamaño",
                    "Desarrollar paquetes familiares" if avg_group_size > 2.5 else "Enfocar en ofertas individuales"
                ]
            ))
        
        return insights


class KnowledgeCuratorAgent(BaseAgent):
    """
    Agente de Curación de Conocimiento Turístico
    
    Capacidades principales:
    - Gestión inteligente de base de conocimientos turísticos
    - Búsqueda y recomendaciones personalizadas
    - Análisis de patrones y generación de insights
    - Integración con sistema de reservas
    - Curación automática de contenido
    - Gestión de conocimiento de reservas y preferencias
    """
    
    def __init__(self):
        super().__init__("KnowledgeCurator AI", "knowledge_curator")
        
        # Initialize components
        self.processor = KnowledgeProcessor()
        self.performance_monitor = PerformanceMonitor("knowledge_curator")
        self.health_checker = HealthChecker("knowledge_curator")
        
        # Redis cache
        self.redis_client = None
        self.cache_ttl = 3600  # 1 hour
        
        # Metrics
        self.knowledge_items_processed = 0
        self.searches_performed = 0
        self.insights_generated = 0
        self.booking_knowledge_items = 0
        
        logger.info("KnowledgeCurator AI Agent initialized successfully")
    
    async def initialize(self):
        """Inicializa el agente y sus componentes"""
        try:
            # Initialize Redis connection
            self.redis_client = redis.Redis(
                host='localhost',
                port=6379,
                decode_responses=True
            )
            
            # Test Redis connection
            await self.redis_client.ping()
            logger.info("Redis connection established for KnowledgeCurator")
            
            # Initialize with some sample knowledge
            await self._initialize_sample_knowledge()
            
            # Start health monitoring
            await self.health_checker.start_monitoring()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize KnowledgeCurator: {str(e)}")
            return False
    
    async def _initialize_sample_knowledge(self):
        """Inicializa con conocimiento de muestra"""
        
        sample_items = [
            # Conocimiento de destinos
            KnowledgeItem(
                knowledge_id="dest_madrid_001",
                title="Madrid - Capital de España",
                content="Madrid es la capital y ciudad más poblada de España. Conocida por sus museos de clase mundial como el Prado y el Reina Sofía, arquitectura impresionante, y vibrante vida nocturna. El centro histórico incluye la Plaza Mayor y el Palacio Real.",
                knowledge_type=KnowledgeType.DESTINATION_INFO,
                content_format=ContentFormat.TEXT,
                source=KnowledgeSource.MANUAL_CURATION,
                quality_score=0.9,
                relevance_score=0.8,
                freshness_score=0.9,
                tags=["madrid", "españa", "capital", "museo", "cultura", "historia"],
                metadata={
                    "country": "España",
                    "population": 3223334,
                    "climate": "continental",
                    "best_season": "primavera_otoño"
                },
                verified=True
            ),
            
            # Conocimiento de alojamiento
            KnowledgeItem(
                knowledge_id="hotel_madrid_001",
                title="Hotel Ritz Madrid - Lujo Clásico",
                content="El Hotel Ritz Madrid es un icónico hotel de lujo ubicado en el corazón de Madrid, cerca del Prado. Ofrece habitaciones elegantes, servicio excepcional y una ubicación privilegiada. Perfecto para huéspedes que buscan sofisticación y comodidad.",
                knowledge_type=KnowledgeType.ACCOMMODATION,
                content_format=ContentFormat.TEXT,
                source=KnowledgeSource.PARTNER_INTEGRATION,
                quality_score=0.85,
                relevance_score=0.9,
                freshness_score=0.8,
                tags=["hotel", "lujo", "madrid", "centro", "5_estrellas"],
                metadata={
                    "stars": 5,
                    "price_range": "alto",
                    "location": "centro_madrid",
                    "amenities": ["spa", "restaurante", "wifi", "parking"]
                },
                verified=True
            ),
            
            # Conocimiento de actividades
            KnowledgeItem(
                knowledge_id="activity_prado_001",
                title="Visita Guiada Museo del Prado",
                content="Tour guiado de 2 horas por el Museo del Prado, una de las pinacotecas más importantes del mundo. Incluye obras maestras de Velázquez, Goya, y El Greco. Guía experto en arte español e historia. Entrada prioritaria incluida.",
                knowledge_type=KnowledgeType.ACTIVITY,
                content_format=ContentFormat.TEXT,
                source=KnowledgeSource.PARTNER_INTEGRATION,
                quality_score=0.88,
                relevance_score=0.9,
                freshness_score=0.85,
                tags=["museo", "arte", "cultura", "madrid", "guiado", "historia"],
                metadata={
                    "duration_hours": 2,
                    "price_per_person": 25,
                    "group_size_max": 20,
                    "languages": ["español", "inglés", "francés"],
                    "difficulty": "facil"
                },
                verified=True
            ),
            
            # Conocimiento de reglas de reserva
            KnowledgeItem(
                knowledge_id="booking_rules_001",
                title="Políticas de Reserva y Cancelación",
                content="Reservas confirmadas requieren pago del 50% como depósito. Cancelación gratuita hasta 48 horas antes. Cancelaciones dentro de 48 horas: cargo del 50%. No-shows: cargo del 100%. Modificaciones permitidas hasta 24 horas antes sin cargo adicional.",
                knowledge_type=KnowledgeType.BOOKING_RULES,
                content_format=ContentFormat.TEXT,
                source=KnowledgeSource.INTERNAL_DATA,
                quality_score=0.95,
                relevance_score=0.8,
                freshness_score=1.0,
                tags=["reserva", "cancelacion", "politicas", "pago", "deposito"],
                metadata={
                    "deposit_percentage": 50,
                    "free_cancellation_hours": 48,
                    "modification_deadline_hours": 24
                },
                verified=True
            ),
            
            # Conocimiento cultural
            KnowledgeItem(
                knowledge_id="culture_spain_001",
                title="Etiqueta y Costumbres Españolas",
                content="En España, la puntualidad es valorada en contextos de negocios pero más relajada socialmente. Los saludos incluyen dos besos en las mejillas. La cena es tardía (22:00+). La siesta no es universal pero las tiendas cierran 14:00-17:00. El flamenco es patrimonio cultural pero no representa toda España.",
                knowledge_type=KnowledgeType.CULTURAL_INFO,
                content_format=ContentFormat.TEXT,
                source=KnowledgeSource.MANUAL_CURATION,
                quality_score=0.92,
                relevance_score=0.85,
                freshness_score=0.9,
                tags=["cultura", "españa", "costumbres", "etiqueta", "social"],
                metadata={
                    "dinner_time": "22:00",
                    "siesta_hours": "14:00-17:00",
                    "greeting_style": "dos_besos"
                },
                verified=True
            )
        ]
        
        # Añadir conocimiento de muestra
        for item in sample_items:
            await self.processor.add_knowledge_item(item)
        
        logger.info(f"Initialized with {len(sample_items)} sample knowledge items")
    
    async def process_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Procesa una solicitud de curación de conocimiento"""
        
        start_time = datetime.now()
        request_id = request_data.get('request_id', f"req_{int(start_time.timestamp())}")
        
        try:
            # Validate request
            if not self._validate_request(request_data):
                return {
                    'success': False,
                    'error': 'Invalid request data',
                    'request_id': request_id
                }
            
            request_type = request_data.get('type', 'search')
            
            # Route to appropriate handler
            if request_type == 'search':
                result = await self._handle_search_request(request_data, request_id)
            elif request_type == 'add_knowledge':
                result = await self._handle_add_knowledge_request(request_data, request_id)
            elif request_type == 'add_booking':
                result = await self._handle_add_booking_request(request_data, request_id)
            elif request_type == 'generate_insights':
                result = await self._handle_insights_request(request_data, request_id)
            elif request_type == 'booking_recommendations':
                result = await self._handle_booking_recommendations_request(request_data, request_id)
            else:
                return {
                    'success': False,
                    'error': f'Unknown request type: {request_type}',
                    'request_id': request_id
                }
            
            # Log performance
            processing_time = (datetime.now() - start_time).total_seconds()
            await self.performance_monitor.log_request(request_id, processing_time, result['success'])
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing knowledge request {request_id}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'request_id': request_id,
                'timestamp': datetime.now().isoformat()
            }
    
    def _validate_request(self, request_data: Dict[str, Any]) -> bool:
        """Valida los datos de la solicitud"""
        
        request_type = request_data.get('type')
        
        if request_type == 'search':
            return 'query' in request_data
        elif request_type == 'add_knowledge':
            return 'knowledge_item' in request_data
        elif request_type == 'add_booking':
            return 'booking_data' in request_data
        elif request_type == 'generate_insights':
            return True  # No required fields
        elif request_type == 'booking_recommendations':
            return 'customer_context' in request_data
        
        return False
    
    async def _handle_search_request(self, request_data: Dict[str, Any], request_id: str) -> Dict[str, Any]:
        """Maneja solicitudes de búsqueda"""
        
        try:
            # Create query object
            query_data = request_data['query']
            
            query = KnowledgeQuery(
                query_text=query_data.get('text', ''),
                knowledge_types=[KnowledgeType(t) for t in query_data.get('types', [])],
                filters=query_data.get('filters', {}),
                limit=query_data.get('limit', 10),
                include_related=query_data.get('include_related', True),
                minimum_quality=query_data.get('minimum_quality', 0.5),
                language=query_data.get('language', 'es'),
                context=self._parse_context(query_data.get('context'))
            )
            
            # Perform search
            results = await self.processor.search_knowledge(query)
            
            # Update metrics
            self.searches_performed += 1
            
            return {
                'success': True,
                'request_id': request_id,
                'results': [
                    {
                        'knowledge_id': result.knowledge_item.knowledge_id,
                        'title': result.knowledge_item.title,
                        'content': result.knowledge_item.content,
                        'type': result.knowledge_item.knowledge_type.value,
                        'tags': result.knowledge_item.tags,
                        'relevance_score': result.relevance_score,
                        'quality_score': result.knowledge_item.quality_score,
                        'match_explanation': result.match_explanation,
                        'related_suggestions': result.related_suggestions,
                        'metadata': result.knowledge_item.metadata,
                        'last_updated': result.knowledge_item.last_updated.isoformat()
                    }
                    for result in results
                ],
                'total_results': len(results),
                'query_info': {
                    'processed_query': query.query_text,
                    'applied_filters': query.filters,
                    'search_types': [t.value for t in query.knowledge_types]
                },
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in search request: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'request_id': request_id
            }
    
    def _parse_context(self, context_data: Optional[Dict[str, Any]]) -> Optional[RecommendationContext]:
        """Parsea el contexto de recomendación"""
        
        if not context_data:
            return None
        
        travel_dates = None
        if 'travel_dates' in context_data:
            dates = context_data['travel_dates']
            if isinstance(dates, list) and len(dates) == 2:
                try:
                    travel_dates = (
                        datetime.fromisoformat(dates[0]),
                        datetime.fromisoformat(dates[1])
                    )
                except ValueError:
                    pass
        
        budget_range = None
        if 'budget_range' in context_data:
            budget = context_data['budget_range']
            if isinstance(budget, list) and len(budget) == 2:
                budget_range = (float(budget[0]), float(budget[1]))
        
        return RecommendationContext(
            user_id=context_data.get('user_id'),
            search_query=context_data.get('search_query'),
            current_location=context_data.get('current_location'),
            travel_dates=travel_dates,
            budget_range=budget_range,
            group_size=context_data.get('group_size', 1),
            interests=context_data.get('interests', []),
            previous_bookings=context_data.get('previous_bookings', []),
            language_preference=context_data.get('language_preference', 'es')
        )
    
    async def _handle_add_knowledge_request(self, request_data: Dict[str, Any], request_id: str) -> Dict[str, Any]:
        """Maneja solicitudes de añadir conocimiento"""
        
        try:
            knowledge_data = request_data['knowledge_item']
            
            # Create KnowledgeItem object
            knowledge_item = KnowledgeItem(
                knowledge_id=knowledge_data.get('knowledge_id', f"kb_{int(datetime.now().timestamp())}"),
                title=knowledge_data['title'],
                content=knowledge_data['content'],
                knowledge_type=KnowledgeType(knowledge_data['type']),
                content_format=ContentFormat(knowledge_data.get('format', 'text')),
                source=KnowledgeSource(knowledge_data.get('source', 'manual_curation')),
                quality_score=knowledge_data.get('quality_score', 0.0),
                relevance_score=knowledge_data.get('relevance_score', 0.0),
                freshness_score=knowledge_data.get('freshness_score', 1.0),
                tags=knowledge_data.get('tags', []),
                metadata=knowledge_data.get('metadata', {}),
                language=knowledge_data.get('language', 'es'),
                verified=knowledge_data.get('verified', False)
            )
            
            # Add to knowledge base
            success = await self.processor.add_knowledge_item(knowledge_item)
            
            if success:
                self.knowledge_items_processed += 1
            
            return {
                'success': success,
                'request_id': request_id,
                'knowledge_id': knowledge_item.knowledge_id,
                'processed_scores': {
                    'quality_score': knowledge_item.quality_score,
                    'freshness_score': knowledge_item.freshness_score
                },
                'extracted_tags': knowledge_item.tags,
                'related_items': knowledge_item.related_items,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error adding knowledge: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'request_id': request_id
            }
    
    async def _handle_add_booking_request(self, request_data: Dict[str, Any], request_id: str) -> Dict[str, Any]:
        """Maneja solicitudes de añadir conocimiento de reserva"""
        
        try:
            booking_data_raw = request_data['booking_data']
            
            # Create BookingKnowledge object
            booking_knowledge = BookingKnowledge(
                booking_id=booking_data_raw.get('booking_id', f"book_{int(datetime.now().timestamp())}"),
                customer_id=booking_data_raw['customer_id'],
                tour_details=booking_data_raw['tour_details'],
                booking_rules=booking_data_raw.get('booking_rules', {}),
                payment_info=booking_data_raw.get('payment_info', {}),
                cancellation_policy=booking_data_raw.get('cancellation_policy', {}),
                special_requirements=booking_data_raw.get('special_requirements', []),
                previous_bookings=booking_data_raw.get('previous_bookings', []),
                preference_profile=booking_data_raw.get('preference_profile', {}),
                booking_status=booking_data_raw.get('booking_status', 'pending')
            )
            
            # Add to booking knowledge base
            success = await self.processor.add_booking_knowledge(booking_knowledge)
            
            if success:
                self.booking_knowledge_items += 1
            
            return {
                'success': success,
                'request_id': request_id,
                'booking_id': booking_knowledge.booking_id,
                'extracted_insights': 'Booking patterns analyzed and insights generated',
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error adding booking knowledge: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'request_id': request_id
            }
    
    async def _handle_insights_request(self, request_data: Dict[str, Any], request_id: str) -> Dict[str, Any]:
        """Maneja solicitudes de generación de insights"""
        
        try:
            # Parse knowledge types filter
            knowledge_types = None
            if 'knowledge_types' in request_data:
                knowledge_types = [KnowledgeType(t) for t in request_data['knowledge_types']]
            
            # Generate insights
            insights = await self.processor.generate_insights(knowledge_types)
            
            self.insights_generated += len(insights)
            
            return {
                'success': True,
                'request_id': request_id,
                'insights': [
                    {
                        'insight_id': insight.insight_id,
                        'type': insight.insight_type,
                        'title': insight.title,
                        'description': insight.description,
                        'confidence': insight.confidence,
                        'supporting_data': insight.supporting_data,
                        'recommendations': insight.recommendations,
                        'generated_at': insight.generated_at.isoformat()
                    }
                    for insight in insights
                ],
                'total_insights': len(insights),
                'analysis_scope': {
                    'total_knowledge_items': len(self.processor.knowledge_base),
                    'total_booking_items': len(self.processor.booking_knowledge),
                    'filtered_types': [t.value for t in knowledge_types] if knowledge_types else 'all'
                },
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating insights: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'request_id': request_id
            }
    
    async def _handle_booking_recommendations_request(self, request_data: Dict[str, Any], request_id: str) -> Dict[str, Any]:
        """Maneja solicitudes de recomendaciones para reservas"""
        
        try:
            customer_context = request_data['customer_context']
            
            # Create search query based on customer context
            interests = customer_context.get('interests', [])
            destination = customer_context.get('preferred_destination', '')
            
            # Build search query
            query_text = f"{destination} {' '.join(interests)}"
            
            context = RecommendationContext(
                user_id=customer_context.get('customer_id'),
                current_location=customer_context.get('current_location'),
                group_size=customer_context.get('group_size', 1),
                interests=interests,
                previous_bookings=customer_context.get('previous_bookings', []),
                budget_range=(
                    customer_context.get('min_budget', 0),
                    customer_context.get('max_budget', 10000)
                )
            )
            
            query = KnowledgeQuery(
                query_text=query_text,
                knowledge_types=[
                    KnowledgeType.DESTINATION_INFO,
                    KnowledgeType.ACTIVITY,
                    KnowledgeType.ACCOMMODATION
                ],
                limit=15,
                context=context
            )
            
            # Get recommendations
            results = await self.processor.search_knowledge(query)
            
            # Group by type
            recommendations = {
                'destinations': [],
                'activities': [],
                'accommodations': []
            }
            
            for result in results:
                item = result.knowledge_item
                
                rec_data = {
                    'id': item.knowledge_id,
                    'title': item.title,
                    'description': item.content[:200] + "..." if len(item.content) > 200 else item.content,
                    'tags': item.tags,
                    'relevance_score': result.relevance_score,
                    'quality_score': item.quality_score,
                    'metadata': item.metadata
                }
                
                if item.knowledge_type == KnowledgeType.DESTINATION_INFO:
                    recommendations['destinations'].append(rec_data)
                elif item.knowledge_type == KnowledgeType.ACTIVITY:
                    recommendations['activities'].append(rec_data)
                elif item.knowledge_type == KnowledgeType.ACCOMMODATION:
                    recommendations['accommodations'].append(rec_data)
            
            # Generate booking improvement suggestions
            booking_improvements = await self._generate_booking_improvements(customer_context)
            
            return {
                'success': True,
                'request_id': request_id,
                'recommendations': recommendations,
                'booking_improvements': booking_improvements,
                'personalization_factors': {
                    'interests_matched': len(interests),
                    'budget_considered': 'budget_range' in customer_context,
                    'location_considered': 'current_location' in customer_context,
                    'history_considered': len(customer_context.get('previous_bookings', []))
                },
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating booking recommendations: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'request_id': request_id
            }
    
    async def _generate_booking_improvements(self, customer_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Genera sugerencias de mejora para el proceso de reserva"""
        
        improvements = []
        
        # Análisis basado en el contexto del cliente
        group_size = customer_context.get('group_size', 1)
        budget = customer_context.get('max_budget', 0)
        previous_bookings = customer_context.get('previous_bookings', [])
        
        # Sugerencia basada en tamaño de grupo
        if group_size > 4:
            improvements.append({
                'type': 'group_discount',
                'title': 'Descuento por Grupo Grande',
                'description': f'Para grupos de {group_size} personas, ofrecemos descuentos especiales del 10-15%',
                'potential_savings': f'{budget * 0.12:.2f}€' if budget > 0 else 'Variable',
                'action': 'apply_group_discount'
            })
        
        # Sugerencia basada en historial
        if len(previous_bookings) >= 3:
            improvements.append({
                'type': 'loyalty_program',
                'title': 'Programa de Fidelización',
                'description': 'Como cliente frecuente, calificas para nuestro programa VIP con beneficios exclusivos',
                'benefits': ['Acceso prioritario', 'Descuentos adicionales', 'Upgrades gratuitos'],
                'action': 'enroll_loyalty_program'
            })
        
        # Sugerencia de paquetes
        if budget > 1000:
            improvements.append({
                'type': 'package_deal',
                'title': 'Paquete Todo Incluido',
                'description': 'Considera nuestros paquetes completos que incluyen alojamiento, actividades y transporte',
                'estimated_savings': '15-20% comparado con reservas separadas',
                'action': 'show_package_options'
            })
        
        # Sugerencia de timing
        improvements.append({
            'type': 'booking_timing',
            'title': 'Mejor Momento para Reservar',
            'description': 'Reservando con 6-8 semanas de anticipación obtienes los mejores precios',
            'tip': 'Los martes y miércoles suelen tener mejores ofertas',
            'action': 'set_booking_reminder'
        })
        
        return improvements
    
    async def get_agent_status(self) -> Dict[str, Any]:
        """Obtiene el estado actual del agente"""
        try:
            health_status = await self.health_checker.get_health_status()
            performance_stats = await self.performance_monitor.get_performance_stats()
            
            return {
                'agent_name': self.agent_name,
                'agent_id': self.agent_id,
                'status': 'active',
                'health': health_status,
                'performance': performance_stats,
                'metrics': {
                    'knowledge_items_processed': self.knowledge_items_processed,
                    'searches_performed': self.searches_performed,
                    'insights_generated': self.insights_generated,
                    'booking_knowledge_items': self.booking_knowledge_items,
                    'total_knowledge_items': len(self.processor.knowledge_base),
                    'total_booking_items': len(self.processor.booking_knowledge)
                },
                'knowledge_base_stats': {
                    'total_items': len(self.processor.knowledge_base),
                    'types_distribution': dict(Counter([
                        item.knowledge_type.value for item in self.processor.knowledge_base.values()
                    ])),
                    'avg_quality_score': statistics.mean([
                        item.quality_score for item in self.processor.knowledge_base.values()
                    ]) if self.processor.knowledge_base else 0.0,
                    'verified_items': len([
                        item for item in self.processor.knowledge_base.values() if item.verified
                    ])
                },
                'capabilities': [
                    'Intelligent knowledge management',
                    'Advanced search and recommendations',
                    'Booking knowledge integration',
                    'Pattern analysis and insights',
                    'Content curation and quality assessment',
                    'Multi-language support',
                    'Real-time knowledge graph updates'
                ],
                'supported_knowledge_types': [t.value for t in KnowledgeType],
                'supported_content_formats': [f.value for f in ContentFormat],
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting agent status: {str(e)}")
            return {
                'agent_name': self.agent_name,
                'agent_id': self.agent_id,
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    async def shutdown(self):
        """Cierra el agente y limpia recursos"""
        try:
            logger.info("Shutting down KnowledgeCurator AI Agent...")
            
            # Close Redis connection
            if self.redis_client:
                await self.redis_client.close()
            
            # Stop monitoring
            await self.health_checker.stop_monitoring()
            
            logger.info("KnowledgeCurator AI Agent shutdown complete")
            
        except Exception as e:
            logger.error(f"Error during agent shutdown: {str(e)}")


# Example usage and testing
async def main():
    """Función principal para testing del agente"""
    
    # Initialize agent
    agent = KnowledgeCuratorAgent()
    
    # Test initialization
    init_success = await agent.initialize()
    if not init_success:
        logger.error("Failed to initialize KnowledgeCurator agent")
        return
    
    # Test search request
    search_request = {
        'request_id': 'test_search_001',
        'type': 'search',
        'query': {
            'text': 'madrid museo arte',
            'types': ['destination_info', 'activity'],
            'limit': 5,
            'context': {
                'user_id': 'user_123',
                'interests': ['arte', 'cultura', 'historia'],
                'group_size': 2,
                'language_preference': 'es'
            }
        }
    }
    
    # Process search
    logger.info("Testing knowledge search...")
    search_result = await agent.process_request(search_request)
    
    if search_result['success']:
        print("\n=== SEARCH RESULTS ===")
        for result in search_result['results']:
            print(f"Title: {result['title']}")
            print(f"Type: {result['type']}")
            print(f"Relevance: {result['relevance_score']:.2f}")
            print(f"Quality: {result['quality_score']:.2f}")
            print("---")
    
    # Test insights generation
    insights_request = {
        'request_id': 'test_insights_001',
        'type': 'generate_insights'
    }
    
    logger.info("Testing insights generation...")
    insights_result = await agent.process_request(insights_request)
    
    if insights_result['success']:
        print("\n=== KNOWLEDGE INSIGHTS ===")
        for insight in insights_result['insights']:
            print(f"Type: {insight['type']}")
            print(f"Title: {insight['title']}")
            print(f"Confidence: {insight['confidence']:.2f}")
            print("---")
    
    # Test booking recommendations
    booking_rec_request = {
        'request_id': 'test_booking_rec_001',
        'type': 'booking_recommendations',
        'customer_context': {
            'customer_id': 'cust_456',
            'interests': ['cultura', 'arte', 'gastronomia'],
            'preferred_destination': 'madrid',
            'group_size': 2,
            'max_budget': 1500,
            'previous_bookings': ['booking_001', 'booking_002']
        }
    }
    
    logger.info("Testing booking recommendations...")
    booking_result = await agent.process_request(booking_rec_request)
    
    if booking_result['success']:
        print("\n=== BOOKING RECOMMENDATIONS ===")
        recommendations = booking_result['recommendations']
        print(f"Destinations: {len(recommendations['destinations'])}")
        print(f"Activities: {len(recommendations['activities'])}")
        print(f"Accommodations: {len(recommendations['accommodations'])}")
        
        print("\nBooking Improvements:")
        for improvement in booking_result['booking_improvements']:
            print(f"- {improvement['title']}: {improvement['description']}")
    
    # Get agent status
    status = await agent.get_agent_status()
    print(f"\nAgent Status: {status['status']}")
    print(f"Knowledge Items: {status['metrics']['total_knowledge_items']}")
    print(f"Searches Performed: {status['metrics']['searches_performed']}")
    
    # Shutdown agent
    await agent.shutdown()


if __name__ == "__main__":
    asyncio.run(main())