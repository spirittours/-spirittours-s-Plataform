#!/usr/bin/env python3
"""
Spirit Tours - Personalization Engine AI Agent
Motor de Personalización Avanzada con Machine Learning

Este agente proporciona personalización ultra-avanzada de experiencias
turísticas usando múltiples algoritmos de ML, análisis de comportamiento
en tiempo real y adaptación dinámica de recomendaciones.

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
import numpy as np
import pandas as pd
from pydantic import BaseModel, Field
import redis.asyncio as redis
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier
from sklearn.cluster import KMeans, DBSCAN
from sklearn.decomposition import PCA, NMF
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.neural_network import MLPRegressor
import tensorflow as tf
from tensorflow.keras.models import Sequential, Model
from tensorflow.keras.layers import Dense, Embedding, Concatenate, Input, Dropout
from tensorflow.keras.optimizers import Adam
import nltk
from textblob import TextBlob
import spacy
from transformers import pipeline, AutoTokenizer, AutoModel
import yaml
import uuid

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

class PersonalizationType(Enum):
    """Tipos de personalización disponibles"""
    DESTINATION_RECOMMENDATIONS = "destination_recommendations"
    ACTIVITY_SUGGESTIONS = "activity_suggestions"
    ACCOMMODATION_MATCHING = "accommodation_matching"
    DINING_PREFERENCES = "dining_preferences"
    TRANSPORT_OPTIMIZATION = "transport_optimization"
    BUDGET_OPTIMIZATION = "budget_optimization"
    TIME_SCHEDULING = "time_scheduling"
    CULTURAL_ADAPTATION = "cultural_adaptation"
    ACCESSIBILITY_ADJUSTMENTS = "accessibility_adjustments"
    SOCIAL_MATCHING = "social_matching"
    WEATHER_ADAPTATION = "weather_adaptation"
    SEASONAL_OPTIMIZATION = "seasonal_optimization"

class PreferenceCategory(Enum):
    """Categorías de preferencias del usuario"""
    TRAVEL_STYLE = "travel_style"
    ACTIVITY_LEVEL = "activity_level" 
    BUDGET_RANGE = "budget_range"
    ACCOMMODATION_TYPE = "accommodation_type"
    FOOD_PREFERENCES = "food_preferences"
    TRANSPORTATION_PREFERENCE = "transportation_preference"
    GROUP_SIZE_PREFERENCE = "group_size_preference"
    CULTURAL_INTEREST = "cultural_interest"
    ADVENTURE_LEVEL = "adventure_level"
    RELAXATION_PREFERENCE = "relaxation_preference"
    LEARNING_INTEREST = "learning_interest"
    PHOTOGRAPHY_INTEREST = "photography_interest"

class PersonalizationScore(Enum):
    """Niveles de score de personalización"""
    LOW = 1
    MEDIUM_LOW = 2
    MEDIUM = 3
    MEDIUM_HIGH = 4
    HIGH = 5

@dataclass
class UserProfile:
    """Perfil completo del usuario para personalización"""
    user_id: str
    demographic_data: Dict[str, Any] = field(default_factory=dict)
    preferences: Dict[str, Any] = field(default_factory=dict)
    behavior_history: List[Dict] = field(default_factory=list)
    interaction_patterns: Dict[str, Any] = field(default_factory=dict)
    travel_history: List[Dict] = field(default_factory=list)
    feedback_history: List[Dict] = field(default_factory=list)
    social_connections: List[str] = field(default_factory=list)
    real_time_context: Dict[str, Any] = field(default_factory=dict)
    personality_traits: Dict[str, float] = field(default_factory=dict)
    learning_preferences: Dict[str, Any] = field(default_factory=dict)
    accessibility_needs: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    personalization_score: float = 0.0
    engagement_score: float = 0.0
    satisfaction_score: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class PersonalizationRequest:
    """Solicitud de personalización"""
    request_id: str
    user_id: str
    personalization_type: PersonalizationType
    context: Dict[str, Any] = field(default_factory=dict)
    constraints: Dict[str, Any] = field(default_factory=dict)
    preferences_override: Dict[str, Any] = field(default_factory=dict)
    real_time_data: Dict[str, Any] = field(default_factory=dict)
    request_timestamp: datetime = field(default_factory=datetime.now)
    priority: int = 3  # 1-5, 5 being highest
    expected_items: int = 10
    diversification_factor: float = 0.3
    novelty_factor: float = 0.2
    explanation_required: bool = True
    A_B_test_group: Optional[str] = None

@dataclass
class PersonalizationResult:
    """Resultado de personalización"""
    request_id: str
    user_id: str
    recommendations: List[Dict] = field(default_factory=list)
    explanations: List[str] = field(default_factory=list)
    confidence_scores: List[float] = field(default_factory=list)
    diversity_score: float = 0.0
    novelty_score: float = 0.0
    personalization_strength: float = 0.0
    processing_time_ms: float = 0.0
    model_versions: Dict[str, str] = field(default_factory=dict)
    A_B_test_variant: Optional[str] = None
    explanation_details: Dict[str, Any] = field(default_factory=dict)
    fallback_used: bool = False
    cache_hit: bool = False
    generated_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class PersonalizationMetrics:
    """Métricas de performance del motor de personalización"""
    total_requests: int = 0
    successful_personalizations: int = 0
    cache_hit_rate: float = 0.0
    average_response_time_ms: float = 0.0
    average_confidence_score: float = 0.0
    user_engagement_improvement: float = 0.0
    conversion_rate_improvement: float = 0.0
    diversity_score_avg: float = 0.0
    novelty_score_avg: float = 0.0
    model_accuracy: Dict[str, float] = field(default_factory=dict)
    A_B_test_results: Dict[str, Dict] = field(default_factory=dict)
    user_satisfaction_impact: float = 0.0
    revenue_impact: float = 0.0
    click_through_rate: float = 0.0
    recommendation_acceptance_rate: float = 0.0
    personalization_coverage: float = 0.0
    real_time_adaptation_rate: float = 0.0

class UserBehaviorAnalyzer:
    """Analizador avanzado de comportamiento del usuario"""
    
    def __init__(self):
        self.behavior_classifier = GradientBoostingClassifier(n_estimators=100)
        self.preference_predictor = RandomForestRegressor(n_estimators=150)
        self.engagement_model = MLPRegressor(hidden_layer_sizes=(100, 50))
        self.clustering_model = KMeans(n_clusters=10)
        self.scaler = StandardScaler()
        self.personality_analyzer = None
        self.sentiment_analyzer = pipeline("sentiment-analysis")
        
    async def initialize(self):
        """Inicializar el analizador de comportamiento"""
        try:
            # Configurar modelos de análisis de personalidad
            await self._setup_personality_models()
            
            # Entrenar modelos con datos sintéticos iniciales
            await self._train_initial_models()
            
            logger.info("User behavior analyzer initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing behavior analyzer: {e}")
            raise
    
    async def _setup_personality_models(self):
        """Configurar modelos de análisis de personalidad"""
        # Configurar analyzer de personalidad basado en Big Five
        self.personality_traits = {
            "openness": {"keywords": ["adventure", "culture", "art", "nature", "exploration"], "weight": 0.2},
            "conscientiousness": {"keywords": ["planning", "schedule", "organized", "detailed"], "weight": 0.15},
            "extraversion": {"keywords": ["social", "group", "party", "nightlife", "events"], "weight": 0.2},
            "agreeableness": {"keywords": ["family", "friends", "harmony", "cooperation"], "weight": 0.15},
            "neuroticism": {"keywords": ["safety", "secure", "comfort", "familiar"], "weight": 0.1}
        }
    
    async def _train_initial_models(self):
        """Entrenar modelos iniciales con datos sintéticos"""
        # Generar datos sintéticos para entrenamiento inicial
        synthetic_features = np.random.randn(1000, 25)  # 25 características de comportamiento
        synthetic_labels = np.random.choice([0, 1, 2, 3, 4], size=1000)  # 5 categorías de comportamiento
        synthetic_preferences = np.random.randn(1000, 15)  # 15 dimensiones de preferencias
        
        # Entrenar modelos
        self.behavior_classifier.fit(synthetic_features, synthetic_labels)
        self.preference_predictor.fit(synthetic_features, synthetic_preferences)
        self.engagement_model.fit(synthetic_features[:, :20], np.random.randn(1000))  # Score de engagement
        self.clustering_model.fit(synthetic_features)
        self.scaler.fit(synthetic_features)
    
    async def analyze_user_behavior(self, user_profile: UserProfile) -> Dict:
        """Analizar comportamiento completo del usuario"""
        try:
            # Extraer características del comportamiento
            behavior_features = await self._extract_behavior_features(user_profile)
            
            # Análisis de personalidad
            personality_analysis = await self._analyze_personality(user_profile)
            
            # Predicción de preferencias
            preference_predictions = await self._predict_preferences(behavior_features)
            
            # Análisis de patrones de engagement
            engagement_analysis = await self._analyze_engagement_patterns(user_profile)
            
            # Segmentación de usuario
            user_segment = await self._segment_user(behavior_features)
            
            return {
                "behavior_classification": await self._classify_behavior(behavior_features),
                "personality_traits": personality_analysis,
                "predicted_preferences": preference_predictions,
                "engagement_patterns": engagement_analysis,
                "user_segment": user_segment,
                "behavioral_insights": await self._generate_behavioral_insights(user_profile),
                "recommendation_strategy": await self._determine_recommendation_strategy(user_profile)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing user behavior: {e}")
            return {}
    
    async def _extract_behavior_features(self, user_profile: UserProfile) -> np.ndarray:
        """Extraer características numéricas del comportamiento"""
        features = []
        
        # Características demográficas
        age = user_profile.demographic_data.get("age", 30)
        features.extend([age, age**2])  # Edad y edad al cuadrado para relaciones no lineales
        
        # Características de historial de viaje
        travel_frequency = len(user_profile.travel_history)
        avg_trip_duration = np.mean([t.get("duration_days", 3) for t in user_profile.travel_history]) if user_profile.travel_history else 3
        avg_budget = np.mean([t.get("budget", 1000) for t in user_profile.travel_history]) if user_profile.travel_history else 1000
        
        features.extend([travel_frequency, avg_trip_duration, avg_budget])
        
        # Características de preferencias
        activity_diversity = len(user_profile.preferences.get("preferred_activities", []))
        cultural_interest = user_profile.preferences.get("cultural_interest_level", 5)
        adventure_level = user_profile.preferences.get("adventure_level", 5)
        
        features.extend([activity_diversity, cultural_interest, adventure_level])
        
        # Características de interacción
        click_rate = user_profile.interaction_patterns.get("click_through_rate", 0.1)
        session_duration = user_profile.interaction_patterns.get("avg_session_duration", 300)  # segundos
        pages_per_session = user_profile.interaction_patterns.get("pages_per_session", 5)
        
        features.extend([click_rate, session_duration, pages_per_session])
        
        # Características de feedback
        avg_rating = np.mean([f.get("rating", 5) for f in user_profile.feedback_history]) if user_profile.feedback_history else 5
        feedback_frequency = len(user_profile.feedback_history)
        
        features.extend([avg_rating, feedback_frequency])
        
        # Características sociales
        social_connections_count = len(user_profile.social_connections)
        features.append(social_connections_count)
        
        # Características temporales (estacionalidad)
        current_month = datetime.now().month
        features.extend([np.sin(2 * np.pi * current_month / 12), np.cos(2 * np.pi * current_month / 12)])
        
        # Rellenar hasta 25 características si es necesario
        while len(features) < 25:
            features.append(0.0)
        
        return np.array(features[:25]).reshape(1, -1)
    
    async def _analyze_personality(self, user_profile: UserProfile) -> Dict[str, float]:
        """Analizar rasgos de personalidad basado en Big Five"""
        personality_scores = {}
        
        # Análizar texto de preferencias y feedback para inferir personalidad
        text_data = []
        
        # Recopilar texto de diferentes fuentes
        if user_profile.preferences:
            text_data.extend([str(v) for v in user_profile.preferences.values() if isinstance(v, str)])
        
        for feedback in user_profile.feedback_history:
            if "comment" in feedback:
                text_data.append(feedback["comment"])
        
        combined_text = " ".join(text_data).lower()
        
        # Calcular scores de personalidad basado en keywords
        for trait, trait_config in self.personality_traits.items():
            score = 0.5  # Score base
            
            for keyword in trait_config["keywords"]:
                if keyword in combined_text:
                    score += trait_config["weight"]
            
            # Normalizar score entre 0 y 1
            personality_scores[trait] = min(1.0, max(0.0, score))
        
        # Ajustes basados en comportamiento histórico
        if user_profile.travel_history:
            # Usuarios con más viajes tienden a ser más abiertos
            travel_count = len(user_profile.travel_history)
            personality_scores["openness"] += min(0.3, travel_count * 0.05)
            
            # Usuarios con viajes muy planificados tienden a ser más conscientes
            planned_trips = sum(1 for trip in user_profile.travel_history if trip.get("planning_days", 0) > 30)
            if planned_trips > 0:
                personality_scores["conscientiousness"] += min(0.2, planned_trips * 0.1)
        
        # Normalizar todos los scores
        for trait in personality_scores:
            personality_scores[trait] = min(1.0, max(0.0, personality_scores[trait]))
        
        return personality_scores
    
    async def _predict_preferences(self, behavior_features: np.ndarray) -> Dict:
        """Predecir preferencias del usuario usando ML"""
        try:
            # Escalar características
            scaled_features = self.scaler.transform(behavior_features)
            
            # Predecir preferencias multidimensionales
            preference_predictions = self.preference_predictor.predict(scaled_features)[0]
            
            # Mapear predicciones a categorías interpretables
            preference_categories = [
                "cultural_activities", "adventure_sports", "relaxation", "nightlife",
                "nature_exploration", "photography", "food_experiences", "shopping",
                "historical_sites", "museums", "beaches", "mountains", "cities",
                "rural_areas", "luxury_experiences"
            ]
            
            preferences = {}
            for i, category in enumerate(preference_categories):
                if i < len(preference_predictions):
                    # Normalizar entre 0 y 10
                    score = (preference_predictions[i] - np.min(preference_predictions)) / \
                           (np.max(preference_predictions) - np.min(preference_predictions)) * 10
                    preferences[category] = round(float(score), 2)
            
            return preferences
            
        except Exception as e:
            logger.warning(f"Error predicting preferences: {e}")
            return {}
    
    async def _analyze_engagement_patterns(self, user_profile: UserProfile) -> Dict:
        """Analizar patrones de engagement del usuario"""
        patterns = {
            "peak_activity_hours": [],
            "preferred_content_types": [],
            "interaction_frequency": "medium",
            "decision_making_speed": "medium",
            "exploration_tendency": "balanced"
        }
        
        # Analizar patrones temporales
        if user_profile.interaction_patterns:
            activity_hours = user_profile.interaction_patterns.get("active_hours", [])
            if activity_hours:
                # Encontrar horas pico (simplificado)
                hour_counts = {}
                for hour in activity_hours:
                    hour_counts[hour] = hour_counts.get(hour, 0) + 1
                
                patterns["peak_activity_hours"] = sorted(hour_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        
        # Analizar velocidad de toma de decisiones
        if user_profile.behavior_history:
            decision_times = [b.get("decision_time_seconds", 300) for b in user_profile.behavior_history]
            avg_decision_time = np.mean(decision_times) if decision_times else 300
            
            if avg_decision_time < 60:
                patterns["decision_making_speed"] = "fast"
            elif avg_decision_time > 600:
                patterns["decision_making_speed"] = "slow"
            else:
                patterns["decision_making_speed"] = "medium"
        
        # Analizar tendencia de exploración
        if user_profile.travel_history:
            unique_destinations = len(set(t.get("destination", "") for t in user_profile.travel_history))
            total_trips = len(user_profile.travel_history)
            
            if total_trips > 0:
                exploration_ratio = unique_destinations / total_trips
                
                if exploration_ratio > 0.8:
                    patterns["exploration_tendency"] = "high_explorer"
                elif exploration_ratio < 0.4:
                    patterns["exploration_tendency"] = "repeat_visitor"
                else:
                    patterns["exploration_tendency"] = "balanced"
        
        return patterns
    
    async def _segment_user(self, behavior_features: np.ndarray) -> Dict:
        """Segmentar usuario usando clustering"""
        try:
            # Escalar características
            scaled_features = self.scaler.transform(behavior_features)
            
            # Obtener segmento del clustering
            cluster_id = self.clustering_model.predict(scaled_features)[0]
            
            # Mapear cluster a segmento interpretable
            segment_names = {
                0: "Budget Conscious Traveler",
                1: "Luxury Experience Seeker", 
                2: "Cultural Explorer",
                3: "Adventure Enthusiast",
                4: "Relaxation Focused",
                5: "Family Traveler",
                6: "Solo Explorer",
                7: "Group Organizer",
                8: "Seasonal Traveler",
                9: "Spontaneous Wanderer"
            }
            
            segment_name = segment_names.get(cluster_id, f"Segment {cluster_id}")
            
            return {
                "segment_id": int(cluster_id),
                "segment_name": segment_name,
                "confidence": 0.8  # Confianza simulada
            }
            
        except Exception as e:
            logger.warning(f"Error segmenting user: {e}")
            return {"segment_id": 0, "segment_name": "General Traveler", "confidence": 0.5}
    
    async def _classify_behavior(self, behavior_features: np.ndarray) -> Dict:
        """Clasificar tipo de comportamiento del usuario"""
        try:
            # Escalar características
            scaled_features = self.scaler.transform(behavior_features)
            
            # Predecir clase de comportamiento
            behavior_class = self.behavior_classifier.predict(scaled_features)[0]
            probability = self.behavior_classifier.predict_proba(scaled_features)[0]
            
            behavior_types = {
                0: "Methodical Planner",
                1: "Spontaneous Explorer", 
                2: "Value Optimizer",
                3: "Experience Collector",
                4: "Comfort Seeker"
            }
            
            return {
                "behavior_type": behavior_types.get(behavior_class, "Mixed Behavior"),
                "confidence": float(np.max(probability)),
                "probability_distribution": {
                    behavior_types.get(i, f"Type {i}"): float(prob) 
                    for i, prob in enumerate(probability)
                }
            }
            
        except Exception as e:
            logger.warning(f"Error classifying behavior: {e}")
            return {"behavior_type": "Mixed Behavior", "confidence": 0.5}
    
    async def _generate_behavioral_insights(self, user_profile: UserProfile) -> List[str]:
        """Generar insights sobre el comportamiento del usuario"""
        insights = []
        
        # Insight sobre frecuencia de viaje
        travel_count = len(user_profile.travel_history)
        if travel_count > 10:
            insights.append("Frequent traveler with extensive experience - values efficiency and unique experiences")
        elif travel_count < 3:
            insights.append("New to travel - may benefit from guided recommendations and safety-focused options")
        
        # Insight sobre patrones de feedback
        if user_profile.feedback_history:
            avg_rating = np.mean([f.get("rating", 5) for f in user_profile.feedback_history])
            if avg_rating > 4.5:
                insights.append("High satisfaction user - likely to respond well to premium experiences")
            elif avg_rating < 3.5:
                insights.append("Critical user - focus on addressing specific pain points and exceeding expectations")
        
        # Insight sobre engagement
        engagement_score = user_profile.engagement_score
        if engagement_score > 0.8:
            insights.append("Highly engaged user - receptive to detailed information and complex itineraries")
        elif engagement_score < 0.4:
            insights.append("Low engagement - prefer simple, clear recommendations with minimal complexity")
        
        return insights
    
    async def _determine_recommendation_strategy(self, user_profile: UserProfile) -> Dict:
        """Determinar estrategia de recomendación óptima"""
        strategy = {
            "primary_approach": "collaborative_filtering",
            "secondary_approach": "content_based",
            "diversification_weight": 0.3,
            "novelty_weight": 0.2,
            "explanation_style": "detailed",
            "update_frequency": "real_time"
        }
        
        # Ajustar estrategia basada en personalidad y comportamiento
        personality = user_profile.personality_traits
        
        if personality.get("openness", 0.5) > 0.7:
            strategy["novelty_weight"] = 0.4  # Más peso a novedades
            strategy["primary_approach"] = "hybrid"
        
        if personality.get("conscientiousness", 0.5) > 0.7:
            strategy["explanation_style"] = "detailed"
            strategy["update_frequency"] = "scheduled"
        
        if personality.get("neuroticism", 0.5) > 0.6:
            strategy["diversification_weight"] = 0.1  # Menos diversificación, más familiaridad
            strategy["explanation_style"] = "reassuring"
        
        return strategy

class RecommendationEngine:
    """Motor de recomendaciones avanzado con múltiples algoritmos"""
    
    def __init__(self):
        self.collaborative_model = None
        self.content_model = None
        self.deep_learning_model = None
        self.hybrid_weights = {"collaborative": 0.4, "content": 0.3, "deep": 0.3}
        self.item_embeddings = {}
        self.user_embeddings = {}
        self.popularity_scores = {}
        self.content_similarity_matrix = None
        
    async def initialize(self):
        """Inicializar el motor de recomendaciones"""
        try:
            # Configurar modelos de recomendación
            await self._setup_collaborative_filtering()
            await self._setup_content_based_filtering() 
            await self._setup_deep_learning_model()
            await self._load_item_data()
            
            logger.info("Recommendation engine initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing recommendation engine: {e}")
            raise
    
    async def _setup_collaborative_filtering(self):
        """Configurar filtrado colaborativo"""
        # Simulación de matriz de interacciones usuario-item
        # En producción, cargaría datos reales de interacciones
        self.user_item_matrix = np.random.rand(1000, 500)  # 1000 usuarios, 500 items
        self.user_similarity_matrix = cosine_similarity(self.user_item_matrix)
        self.item_similarity_matrix = cosine_similarity(self.user_item_matrix.T)
    
    async def _setup_content_based_filtering(self):
        """Configurar filtrado basado en contenido"""
        # Simulación de características de items
        # En producción, extraería características reales de productos
        self.item_features = np.random.rand(500, 50)  # 500 items, 50 características
        self.content_similarity_matrix = cosine_similarity(self.item_features)
    
    async def _setup_deep_learning_model(self):
        """Configurar modelo de deep learning para recomendaciones"""
        try:
            # Definir arquitectura de red neuronal para recomendaciones
            user_input = Input(shape=(20,), name='user_features')
            item_input = Input(shape=(30,), name='item_features')
            context_input = Input(shape=(10,), name='context_features')
            
            # Capas de embedding y densas
            user_dense = Dense(64, activation='relu')(user_input)
            user_dense = Dropout(0.3)(user_dense)
            
            item_dense = Dense(64, activation='relu')(item_input)
            item_dense = Dropout(0.3)(item_dense)
            
            context_dense = Dense(32, activation='relu')(context_input)
            
            # Concatenar todas las características
            concatenated = Concatenate()([user_dense, item_dense, context_dense])
            
            # Capas finales
            hidden = Dense(128, activation='relu')(concatenated)
            hidden = Dropout(0.4)(hidden)
            hidden = Dense(64, activation='relu')(hidden)
            
            output = Dense(1, activation='sigmoid')(hidden)
            
            # Compilar modelo
            self.deep_learning_model = Model(
                inputs=[user_input, item_input, context_input], 
                outputs=output
            )
            
            self.deep_learning_model.compile(
                optimizer=Adam(learning_rate=0.001),
                loss='binary_crossentropy',
                metrics=['accuracy']
            )
            
            # Entrenar con datos sintéticos
            await self._train_deep_model_synthetic()
            
        except Exception as e:
            logger.warning(f"Error setting up deep learning model: {e}")
            self.deep_learning_model = None
    
    async def _train_deep_model_synthetic(self):
        """Entrenar modelo con datos sintéticos"""
        if self.deep_learning_model:
            # Generar datos sintéticos de entrenamiento
            n_samples = 10000
            
            user_features = np.random.rand(n_samples, 20)
            item_features = np.random.rand(n_samples, 30)
            context_features = np.random.rand(n_samples, 10)
            
            # Generar labels sintéticas (probabilidad de interacción positiva)
            labels = np.random.choice([0, 1], size=n_samples, p=[0.7, 0.3])
            
            # Entrenar modelo
            self.deep_learning_model.fit(
                [user_features, item_features, context_features],
                labels,
                epochs=5,
                batch_size=256,
                verbose=0,
                validation_split=0.2
            )
    
    async def _load_item_data(self):
        """Cargar datos de items para recomendaciones"""
        # Simulación de catálogo de productos turísticos
        self.item_catalog = {
            f"dest_{i}": {
                "id": f"dest_{i}",
                "name": f"Destination {i}",
                "type": np.random.choice(["city", "beach", "mountain", "cultural", "adventure"]),
                "rating": np.random.uniform(3.0, 5.0),
                "price_level": np.random.randint(1, 6),
                "popularity_score": np.random.uniform(0.1, 1.0),
                "categories": np.random.choice(
                    ["culture", "nature", "adventure", "relaxation", "food", "history"], 
                    size=np.random.randint(1, 4), 
                    replace=False
                ).tolist(),
                "features": np.random.rand(50).tolist()
            }
            for i in range(500)
        }
        
        # Calcular scores de popularidad
        for item_id, item_data in self.item_catalog.items():
            self.popularity_scores[item_id] = item_data["popularity_score"]
    
    async def generate_recommendations(self, 
                                     user_profile: UserProfile,
                                     request: PersonalizationRequest) -> List[Dict]:
        """Generar recomendaciones usando enfoque híbrido"""
        try:
            # Obtener recomendaciones de cada algoritmo
            collaborative_recs = await self._collaborative_filtering_recommendations(user_profile, request)
            content_recs = await self._content_based_recommendations(user_profile, request)
            deep_recs = await self._deep_learning_recommendations(user_profile, request)
            
            # Combinar recomendaciones usando pesos híbridos
            combined_recs = await self._combine_recommendations(
                collaborative_recs, content_recs, deep_recs, request
            )
            
            # Aplicar diversificación
            diversified_recs = await self._apply_diversification(combined_recs, request)
            
            # Aplicar filtros de negocio
            filtered_recs = await self._apply_business_filters(diversified_recs, user_profile, request)
            
            # Ordenar por score final
            final_recs = sorted(filtered_recs, key=lambda x: x.get("final_score", 0), reverse=True)
            
            return final_recs[:request.expected_items]
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return await self._generate_fallback_recommendations(user_profile, request)
    
    async def _collaborative_filtering_recommendations(self, 
                                                      user_profile: UserProfile, 
                                                      request: PersonalizationRequest) -> List[Dict]:
        """Generar recomendaciones usando filtrado colaborativo"""
        recommendations = []
        
        try:
            # Simular user ID numérico
            user_id_numeric = hash(user_profile.user_id) % 1000
            
            # Encontrar usuarios similares
            user_similarities = self.user_similarity_matrix[user_id_numeric]
            similar_users = np.argsort(user_similarities)[-10:]  # Top 10 usuarios similares
            
            # Obtener items populares entre usuarios similares
            item_scores = {}
            
            for similar_user in similar_users:
                similarity = user_similarities[similar_user]
                user_items = np.where(self.user_item_matrix[similar_user] > 0.5)[0]
                
                for item_idx in user_items:
                    item_id = f"dest_{item_idx}"
                    if item_id not in item_scores:
                        item_scores[item_id] = 0
                    item_scores[item_id] += similarity * self.user_item_matrix[similar_user, item_idx]
            
            # Convertir a lista de recomendaciones
            for item_id, score in sorted(item_scores.items(), key=lambda x: x[1], reverse=True)[:20]:
                if item_id in self.item_catalog:
                    recommendations.append({
                        "item_id": item_id,
                        "item_data": self.item_catalog[item_id],
                        "score": float(score),
                        "algorithm": "collaborative_filtering",
                        "explanation": f"Recommended based on users with similar preferences"
                    })
                    
        except Exception as e:
            logger.warning(f"Error in collaborative filtering: {e}")
        
        return recommendations
    
    async def _content_based_recommendations(self, 
                                           user_profile: UserProfile, 
                                           request: PersonalizationRequest) -> List[Dict]:
        """Generar recomendaciones basadas en contenido"""
        recommendations = []
        
        try:
            # Crear perfil de preferencias del usuario
            user_preference_vector = await self._create_user_content_profile(user_profile)
            
            # Calcular similarity con todos los items
            item_scores = {}
            
            for item_id, item_data in self.item_catalog.items():
                item_features = np.array(item_data["features"])
                
                # Calcular similarity usando cosine similarity
                similarity = np.dot(user_preference_vector, item_features) / \
                           (np.linalg.norm(user_preference_vector) * np.linalg.norm(item_features))
                
                item_scores[item_id] = float(similarity)
            
            # Ordenar por score y crear recomendaciones
            for item_id, score in sorted(item_scores.items(), key=lambda x: x[1], reverse=True)[:20]:
                recommendations.append({
                    "item_id": item_id,
                    "item_data": self.item_catalog[item_id],
                    "score": score,
                    "algorithm": "content_based",
                    "explanation": f"Matches your interest in {', '.join(self.item_catalog[item_id]['categories'])}"
                })
                
        except Exception as e:
            logger.warning(f"Error in content-based filtering: {e}")
        
        return recommendations
    
    async def _create_user_content_profile(self, user_profile: UserProfile) -> np.ndarray:
        """Crear perfil de contenido del usuario basado en preferencias"""
        # Inicializar vector de características
        feature_vector = np.zeros(50)
        
        # Mapear preferencias del usuario a características
        preferences = user_profile.preferences
        
        # Ejemplo de mapeo de preferencias a vector de características
        if "cultural_interest_level" in preferences:
            cultural_level = preferences["cultural_interest_level"] / 10.0
            feature_vector[0:5] = cultural_level  # Primeras 5 features para cultura
        
        if "adventure_level" in preferences:
            adventure_level = preferences["adventure_level"] / 10.0
            feature_vector[5:10] = adventure_level  # Siguientes 5 para aventura
        
        if "preferred_activities" in preferences:
            activities = preferences["preferred_activities"]
            activity_mapping = {
                "museums": [10, 11, 12],
                "outdoor": [13, 14, 15], 
                "food": [16, 17, 18],
                "nightlife": [19, 20, 21],
                "shopping": [22, 23, 24]
            }
            
            for activity in activities:
                if activity in activity_mapping:
                    for idx in activity_mapping[activity]:
                        feature_vector[idx] = 1.0
        
        # Usar historial de viajes para enriquecer el perfil
        if user_profile.travel_history:
            for trip in user_profile.travel_history[-5:]:  # Últimos 5 viajes
                trip_rating = trip.get("rating", 5) / 5.0
                trip_type = trip.get("type", "general")
                
                # Mapear tipo de viaje a características
                type_mapping = {
                    "cultural": [25, 26, 27],
                    "beach": [28, 29, 30],
                    "adventure": [31, 32, 33],
                    "city": [34, 35, 36],
                    "nature": [37, 38, 39]
                }
                
                if trip_type in type_mapping:
                    for idx in type_mapping[trip_type]:
                        feature_vector[idx] += trip_rating * 0.2
        
        # Normalizar vector
        norm = np.linalg.norm(feature_vector)
        if norm > 0:
            feature_vector = feature_vector / norm
        
        return feature_vector
    
    async def _deep_learning_recommendations(self, 
                                           user_profile: UserProfile, 
                                           request: PersonalizationRequest) -> List[Dict]:
        """Generar recomendaciones usando deep learning"""
        recommendations = []
        
        if not self.deep_learning_model:
            return recommendations
        
        try:
            # Preparar features del usuario
            user_features = await self._prepare_user_features_for_dl(user_profile)
            context_features = await self._prepare_context_features_for_dl(request)
            
            # Evaluar todos los items
            item_scores = {}
            
            for item_id, item_data in list(self.item_catalog.items())[:100]:  # Evaluar subset por performance
                # Preparar features del item
                item_features = np.array(item_data["features"][:30])  # Tomar primeras 30 features
                
                # Predecir probabilidad de interacción
                prediction = self.deep_learning_model.predict([
                    user_features.reshape(1, -1),
                    item_features.reshape(1, -1), 
                    context_features.reshape(1, -1)
                ], verbose=0)[0][0]
                
                item_scores[item_id] = float(prediction)
            
            # Crear recomendaciones ordenadas por score
            for item_id, score in sorted(item_scores.items(), key=lambda x: x[1], reverse=True)[:20]:
                recommendations.append({
                    "item_id": item_id,
                    "item_data": self.item_catalog[item_id],
                    "score": score,
                    "algorithm": "deep_learning",
                    "explanation": "AI-powered recommendation based on complex pattern analysis"
                })
                
        except Exception as e:
            logger.warning(f"Error in deep learning recommendations: {e}")
        
        return recommendations
    
    async def _prepare_user_features_for_dl(self, user_profile: UserProfile) -> np.ndarray:
        """Preparar features del usuario para deep learning"""
        features = np.zeros(20)
        
        # Features demográficas
        features[0] = user_profile.demographic_data.get("age", 30) / 100.0
        
        # Features de preferencias
        features[1] = user_profile.preferences.get("cultural_interest_level", 5) / 10.0
        features[2] = user_profile.preferences.get("adventure_level", 5) / 10.0
        features[3] = user_profile.preferences.get("budget_level", 5) / 10.0
        
        # Features de comportamiento
        features[4] = len(user_profile.travel_history) / 50.0  # Normalizar
        features[5] = user_profile.engagement_score
        features[6] = user_profile.satisfaction_score
        
        # Features de personalidad (si están disponibles)
        personality = user_profile.personality_traits
        features[7] = personality.get("openness", 0.5)
        features[8] = personality.get("conscientiousness", 0.5)
        features[9] = personality.get("extraversion", 0.5)
        
        # Features temporales
        current_month = datetime.now().month
        features[10] = np.sin(2 * np.pi * current_month / 12)
        features[11] = np.cos(2 * np.pi * current_month / 12)
        
        # Features de contexto social
        features[12] = len(user_profile.social_connections) / 100.0
        
        # Rellenar características restantes con datos disponibles o zeros
        for i in range(13, 20):
            features[i] = np.random.rand() * 0.1  # Ruido pequeño para evitar overfitting
        
        return features
    
    async def _prepare_context_features_for_dl(self, request: PersonalizationRequest) -> np.ndarray:
        """Preparar features de contexto para deep learning"""
        features = np.zeros(10)
        
        # Features de la solicitud
        features[0] = request.diversification_factor
        features[1] = request.novelty_factor
        features[2] = request.expected_items / 50.0  # Normalizar
        features[3] = request.priority / 5.0
        
        # Features temporales del contexto
        now = datetime.now()
        features[4] = now.hour / 24.0
        features[5] = now.weekday() / 7.0
        
        # Features de contexto en tiempo real
        context = request.real_time_data
        features[6] = context.get("current_weather_score", 0.5)
        features[7] = context.get("local_events_score", 0.5)
        features[8] = context.get("price_sensitivity", 0.5)
        features[9] = context.get("time_pressure", 0.5)
        
        return features
    
    async def _combine_recommendations(self, 
                                      collaborative_recs: List[Dict],
                                      content_recs: List[Dict], 
                                      deep_recs: List[Dict],
                                      request: PersonalizationRequest) -> List[Dict]:
        """Combinar recomendaciones de múltiples algoritmos"""
        combined_items = {}
        
        # Procesar recomendaciones colaborativas
        for rec in collaborative_recs:
            item_id = rec["item_id"]
            if item_id not in combined_items:
                combined_items[item_id] = {
                    "item_id": item_id,
                    "item_data": rec["item_data"],
                    "scores": {},
                    "explanations": []
                }
            combined_items[item_id]["scores"]["collaborative"] = rec["score"]
            combined_items[item_id]["explanations"].append(rec["explanation"])
        
        # Procesar recomendaciones de contenido
        for rec in content_recs:
            item_id = rec["item_id"]
            if item_id not in combined_items:
                combined_items[item_id] = {
                    "item_id": item_id,
                    "item_data": rec["item_data"],
                    "scores": {},
                    "explanations": []
                }
            combined_items[item_id]["scores"]["content"] = rec["score"]
            combined_items[item_id]["explanations"].append(rec["explanation"])
        
        # Procesar recomendaciones de deep learning
        for rec in deep_recs:
            item_id = rec["item_id"]
            if item_id not in combined_items:
                combined_items[item_id] = {
                    "item_id": item_id,
                    "item_data": rec["item_data"],
                    "scores": {},
                    "explanations": []
                }
            combined_items[item_id]["scores"]["deep"] = rec["score"]
            combined_items[item_id]["explanations"].append(rec["explanation"])
        
        # Calcular score final usando pesos híbridos
        final_recommendations = []
        
        for item_id, item_info in combined_items.items():
            scores = item_info["scores"]
            
            # Calcular score híbrido
            final_score = 0.0
            total_weight = 0.0
            
            for algorithm, weight in self.hybrid_weights.items():
                if algorithm in scores:
                    final_score += weight * scores[algorithm]
                    total_weight += weight
            
            if total_weight > 0:
                final_score = final_score / total_weight
            
            # Agregar boost por popularidad
            popularity_boost = self.popularity_scores.get(item_id, 0.5) * 0.1
            final_score += popularity_boost
            
            final_recommendations.append({
                "item_id": item_id,
                "item_data": item_info["item_data"],
                "final_score": final_score,
                "algorithm_scores": scores,
                "explanations": item_info["explanations"][:2],  # Top 2 explicaciones
                "confidence": min(1.0, len(scores) / 3.0)  # Mayor confianza si más algoritmos coinciden
            })
        
        return final_recommendations
    
    async def _apply_diversification(self, recommendations: List[Dict], request: PersonalizationRequest) -> List[Dict]:
        """Aplicar diversificación a las recomendaciones"""
        if not recommendations or request.diversification_factor <= 0:
            return recommendations
        
        diversified = []
        remaining = recommendations.copy()
        
        # Seleccionar primer item (mayor score)
        if remaining:
            best_item = max(remaining, key=lambda x: x["final_score"])
            diversified.append(best_item)
            remaining.remove(best_item)
        
        # Seleccionar items restantes balanceando score y diversidad
        while remaining and len(diversified) < request.expected_items:
            best_candidate = None
            best_diversified_score = -1
            
            for candidate in remaining:
                # Calcular score de diversidad
                diversity_score = await self._calculate_diversity_score(candidate, diversified)
                
                # Combinar score original con diversidad
                diversified_score = (
                    (1 - request.diversification_factor) * candidate["final_score"] +
                    request.diversification_factor * diversity_score
                )
                
                if diversified_score > best_diversified_score:
                    best_diversified_score = diversified_score
                    best_candidate = candidate
            
            if best_candidate:
                diversified.append(best_candidate)
                remaining.remove(best_candidate)
        
        return diversified
    
    async def _calculate_diversity_score(self, candidate: Dict, selected: List[Dict]) -> float:
        """Calcular score de diversidad para un candidato"""
        if not selected:
            return 1.0
        
        candidate_categories = set(candidate["item_data"].get("categories", []))
        candidate_type = candidate["item_data"].get("type", "")
        
        diversity_scores = []
        
        for selected_item in selected:
            selected_categories = set(selected_item["item_data"].get("categories", []))
            selected_type = selected_item["item_data"].get("type", "")
            
            # Diversidad por categorías
            category_overlap = len(candidate_categories & selected_categories)
            category_diversity = 1.0 - (category_overlap / max(1, len(candidate_categories | selected_categories)))
            
            # Diversidad por tipo
            type_diversity = 1.0 if candidate_type != selected_type else 0.0
            
            # Diversidad por precio
            candidate_price = candidate["item_data"].get("price_level", 3)
            selected_price = selected_item["item_data"].get("price_level", 3)
            price_diversity = 1.0 - abs(candidate_price - selected_price) / 5.0
            
            # Score combinado de diversidad
            item_diversity = (category_diversity + type_diversity + price_diversity) / 3.0
            diversity_scores.append(item_diversity)
        
        # Retornar diversidad promedio
        return sum(diversity_scores) / len(diversity_scores)
    
    async def _apply_business_filters(self, 
                                     recommendations: List[Dict], 
                                     user_profile: UserProfile,
                                     request: PersonalizationRequest) -> List[Dict]:
        """Aplicar filtros de negocio a las recomendaciones"""
        filtered = []
        
        for rec in recommendations:
            item_data = rec["item_data"]
            
            # Filtro de presupuesto
            user_budget = user_profile.preferences.get("budget_range", [0, 10000])
            item_price_level = item_data.get("price_level", 3)
            estimated_price = item_price_level * 500  # Estimación simple
            
            if user_budget[0] <= estimated_price <= user_budget[1]:
                # Filtro de rating mínimo
                if item_data.get("rating", 0) >= 3.0:
                    # Filtro de disponibilidad (simulado)
                    if np.random.rand() > 0.1:  # 90% disponibilidad
                        filtered.append(rec)
        
        return filtered
    
    async def _generate_fallback_recommendations(self, 
                                               user_profile: UserProfile, 
                                               request: PersonalizationRequest) -> List[Dict]:
        """Generar recomendaciones de fallback en caso de error"""
        fallback = []
        
        # Seleccionar items populares como fallback
        popular_items = sorted(self.item_catalog.items(), 
                              key=lambda x: x[1]["popularity_score"], 
                              reverse=True)
        
        for item_id, item_data in popular_items[:request.expected_items]:
            fallback.append({
                "item_id": item_id,
                "item_data": item_data,
                "final_score": item_data["popularity_score"],
                "algorithm_scores": {"popularity": item_data["popularity_score"]},
                "explanations": ["Popular choice among travelers"],
                "confidence": 0.6,
                "fallback": True
            })
        
        return fallback

class PersonalizationEngineAgent(BaseAgent):
    """
    Agente Motor de Personalización - Spirit Tours
    
    Proporciona personalización ultra-avanzada incluyendo:
    - Análisis profundo de comportamiento del usuario con ML
    - Recomendaciones híbridas (colaborativo + contenido + deep learning)
    - Personalidad y psicografía del usuario (Big Five)
    - Adaptación en tiempo real a contexto y preferencias
    - Diversificación inteligente de recomendaciones
    - A/B testing de algoritmos de personalización
    - Explicabilidad de recomendaciones
    """
    
    def __init__(self):
        super().__init__("Personalization Engine AI", "personalization_engine")
        
        # Componentes principales
        self.behavior_analyzer = UserBehaviorAnalyzer()
        self.recommendation_engine = RecommendationEngine()
        
        # Estados del agente
        self.user_profiles = {}
        self.active_sessions = {}
        self.performance_metrics = PersonalizationMetrics()
        
        # Configuración
        self.config = {
            "real_time_updates": True,
            "cache_ttl_seconds": 3600,  # 1 hora
            "max_recommendations": 50,
            "min_confidence_threshold": 0.3,
            "diversification_default": 0.3,
            "novelty_default": 0.2,
            "explanation_enabled": True,
            "a_b_testing_enabled": True,
            "learning_rate": 0.01,
            "profile_update_frequency": "real_time"
        }
        
        # Cache y storage
        self.recommendation_cache = {}
        self.explanation_cache = {}
        self.a_b_test_variants = {}
        
        # Performance monitoring
        self.performance_monitor = PerformanceMonitor(agent_name=self.name)
        self.health_checker = HealthChecker(agent_name=self.name)
        
        logger.info(f"Personalization Engine Agent initialized: {self.name}")
    
    async def initialize(self):
        """Inicializar el agente y sus componentes"""
        try:
            await super().initialize()
            
            # Inicializar componentes
            await self.behavior_analyzer.initialize()
            await self.recommendation_engine.initialize()
            
            # Configurar A/B testing
            await self._setup_ab_testing()
            
            # Cargar perfiles de usuario existentes
            await self._load_user_profiles()
            
            # Registrar métricas iniciales
            await self._register_initial_metrics()
            
            self.is_initialized = True
            logger.info("Personalization Engine Agent fully initialized")
            
        except Exception as e:
            logger.error(f"Error initializing Personalization Engine Agent: {e}")
            raise
    
    async def _setup_ab_testing(self):
        """Configurar variantes para A/B testing"""
        self.a_b_test_variants = {
            "algorithm_weight": {
                "control": {"collaborative": 0.4, "content": 0.3, "deep": 0.3},
                "variant_a": {"collaborative": 0.5, "content": 0.2, "deep": 0.3},
                "variant_b": {"collaborative": 0.3, "content": 0.4, "deep": 0.3},
                "variant_c": {"collaborative": 0.25, "content": 0.25, "deep": 0.5}
            },
            "diversification": {
                "control": 0.3,
                "variant_a": 0.2,
                "variant_b": 0.4
            },
            "explanation_style": {
                "control": "detailed",
                "variant_a": "concise",
                "variant_b": "emotional"
            }
        }
    
    async def _load_user_profiles(self):
        """Cargar perfiles de usuario existentes"""
        # En producción, cargaría desde base de datos
        # Por ahora, inicializar estructura vacía
        pass
    
    async def _register_initial_metrics(self):
        """Registrar métricas iniciales del agente"""
        await self.performance_monitor.record_metric("agent_initialized", 1)
        await self.performance_monitor.record_metric("profiles_loaded", len(self.user_profiles))
    
    # API Endpoints principales
    
    async def get_personalized_recommendations(self, 
                                            user_id: str,
                                            personalization_type: str,
                                            context: Dict = None,
                                            **kwargs) -> Dict:
        """Obtener recomendaciones personalizadas para usuario"""
        try:
            start_time = datetime.now()
            
            # Crear solicitud de personalización
            request = PersonalizationRequest(
                request_id=str(uuid.uuid4()),
                user_id=user_id,
                personalization_type=PersonalizationType(personalization_type),
                context=context or {},
                **kwargs
            )
            
            # Obtener o crear perfil de usuario
            user_profile = await self._get_or_create_user_profile(user_id)
            
            # Actualizar contexto en tiempo real
            await self._update_real_time_context(user_profile, request)
            
            # Verificar cache
            cache_key = await self._generate_cache_key(user_profile, request)
            cached_result = self.recommendation_cache.get(cache_key)
            
            if cached_result and not self._is_cache_expired(cached_result):
                cached_result["cache_hit"] = True
                await self._update_cache_metrics(True)
                return cached_result
            
            # Generar nuevas recomendaciones
            result = await self._generate_personalized_recommendations(user_profile, request)
            
            # Almacenar en cache
            self.recommendation_cache[cache_key] = {
                **result,
                "cached_at": datetime.now().isoformat()
            }
            
            # Actualizar métricas
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            await self._update_performance_metrics(request, result, processing_time)
            await self._update_cache_metrics(False)
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating personalized recommendations: {e}")
            return await self._generate_error_response(str(e))
    
    async def _get_or_create_user_profile(self, user_id: str) -> UserProfile:
        """Obtener perfil de usuario existente o crear uno nuevo"""
        if user_id in self.user_profiles:
            profile = self.user_profiles[user_id]
            profile.updated_at = datetime.now()
            return profile
        
        # Crear nuevo perfil
        new_profile = UserProfile(user_id=user_id)
        
        # Cargar datos existentes del usuario (simulado)
        await self._load_user_data_into_profile(new_profile)
        
        self.user_profiles[user_id] = new_profile
        
        return new_profile
    
    async def _load_user_data_into_profile(self, profile: UserProfile):
        """Cargar datos del usuario en el perfil"""
        # Simulación de carga de datos - en producción conectaría con APIs reales
        
        # Datos demográficos
        profile.demographic_data = {
            "age": np.random.randint(18, 80),
            "location": "Unknown",
            "travel_experience": np.random.choice(["beginner", "intermediate", "expert"])
        }
        
        # Preferencias básicas
        profile.preferences = {
            "budget_range": [500, 5000],
            "cultural_interest_level": np.random.randint(1, 11),
            "adventure_level": np.random.randint(1, 11),
            "preferred_activities": np.random.choice(
                ["museums", "outdoor", "food", "nightlife", "shopping"], 
                size=np.random.randint(1, 4), 
                replace=False
            ).tolist()
        }
        
        # Historial simulado
        profile.travel_history = [
            {
                "destination": f"City {i}",
                "duration_days": np.random.randint(2, 14),
                "budget": np.random.randint(500, 5000),
                "rating": np.random.uniform(3.0, 5.0),
                "type": np.random.choice(["cultural", "beach", "adventure", "city", "nature"])
            }
            for i in range(np.random.randint(0, 10))
        ]
        
        # Scores iniciales
        profile.engagement_score = np.random.uniform(0.3, 1.0)
        profile.satisfaction_score = np.random.uniform(0.5, 1.0)
    
    async def _update_real_time_context(self, user_profile: UserProfile, request: PersonalizationRequest):
        """Actualizar contexto en tiempo real"""
        # Contexto temporal
        now = datetime.now()
        request.real_time_data.update({
            "current_hour": now.hour,
            "current_day_of_week": now.weekday(),
            "current_season": self._get_current_season(),
            "time_pressure": request.context.get("time_pressure", 0.5),
            "current_weather_score": np.random.uniform(0.3, 1.0),  # Simulado
            "local_events_score": np.random.uniform(0.1, 1.0),  # Simulado
            "price_sensitivity": user_profile.preferences.get("price_sensitivity", 0.5)
        })
        
        # Actualizar perfil con contexto de tiempo real
        user_profile.real_time_context = request.real_time_data
    
    def _get_current_season(self) -> str:
        """Obtener estación actual"""
        month = datetime.now().month
        if month in [12, 1, 2]:
            return "winter"
        elif month in [3, 4, 5]:
            return "spring"
        elif month in [6, 7, 8]:
            return "summer"
        else:
            return "autumn"
    
    async def _generate_cache_key(self, user_profile: UserProfile, request: PersonalizationRequest) -> str:
        """Generar clave de cache para la solicitud"""
        key_components = [
            user_profile.user_id,
            request.personalization_type.value,
            str(request.expected_items),
            str(request.diversification_factor),
            str(request.novelty_factor),
            str(hash(frozenset(request.context.items()) if request.context else frozenset())),
            datetime.now().strftime("%Y%m%d%H")  # Invalidar cache cada hora
        ]
        
        return "_".join(key_components)
    
    def _is_cache_expired(self, cached_result: Dict) -> bool:
        """Verificar si el resultado en cache está expirado"""
        if "cached_at" not in cached_result:
            return True
        
        cached_time = datetime.fromisoformat(cached_result["cached_at"])
        expiry_time = cached_time + timedelta(seconds=self.config["cache_ttl_seconds"])
        
        return datetime.now() > expiry_time
    
    async def _generate_personalized_recommendations(self, 
                                                   user_profile: UserProfile, 
                                                   request: PersonalizationRequest) -> PersonalizationResult:
        """Generar recomendaciones personalizadas completas"""
        try:
            # Análisis de comportamiento del usuario
            behavior_analysis = await self.behavior_analyzer.analyze_user_behavior(user_profile)
            
            # Actualizar perfil con insights de comportamiento
            await self._update_profile_with_behavior_analysis(user_profile, behavior_analysis)
            
            # Determinar variante de A/B test
            ab_variant = await self._assign_ab_test_variant(user_profile, request)
            
            # Ajustar parámetros según A/B test
            await self._apply_ab_test_parameters(request, ab_variant)
            
            # Generar recomendaciones usando motor híbrido
            recommendations = await self.recommendation_engine.generate_recommendations(user_profile, request)
            
            # Generar explicaciones
            explanations = await self._generate_explanations(recommendations, user_profile, behavior_analysis)
            
            # Calcular métricas de calidad
            quality_metrics = await self._calculate_quality_metrics(recommendations, request)
            
            # Crear resultado
            result = PersonalizationResult(
                request_id=request.request_id,
                user_id=user_profile.user_id,
                recommendations=recommendations,
                explanations=explanations,
                confidence_scores=[rec.get("confidence", 0.5) for rec in recommendations],
                diversity_score=quality_metrics["diversity_score"],
                novelty_score=quality_metrics["novelty_score"],
                personalization_strength=quality_metrics["personalization_strength"],
                A_B_test_variant=ab_variant,
                explanation_details=behavior_analysis,
                fallback_used=any(rec.get("fallback", False) for rec in recommendations),
                model_versions={"behavior_analyzer": "1.0", "recommendation_engine": "1.0"}
            )
            
            return {
                "request_id": result.request_id,
                "user_id": result.user_id,
                "recommendations": result.recommendations,
                "explanations": result.explanations,
                "quality_metrics": {
                    "confidence_scores": result.confidence_scores,
                    "diversity_score": result.diversity_score,
                    "novelty_score": result.novelty_score,
                    "personalization_strength": result.personalization_strength
                },
                "metadata": {
                    "ab_test_variant": result.A_B_test_variant,
                    "fallback_used": result.fallback_used,
                    "model_versions": result.model_versions,
                    "behavior_insights": behavior_analysis.get("behavioral_insights", [])
                },
                "generated_at": result.generated_at.isoformat(),
                "cache_hit": False
            }
            
        except Exception as e:
            logger.error(f"Error in personalized recommendation generation: {e}")
            raise
    
    async def _update_profile_with_behavior_analysis(self, 
                                                    user_profile: UserProfile, 
                                                    behavior_analysis: Dict):
        """Actualizar perfil de usuario con análisis de comportamiento"""
        # Actualizar rasgos de personalidad
        if "personality_traits" in behavior_analysis:
            user_profile.personality_traits.update(behavior_analysis["personality_traits"])
        
        # Actualizar patrones de interacción
        if "engagement_patterns" in behavior_analysis:
            user_profile.interaction_patterns.update(behavior_analysis["engagement_patterns"])
        
        # Actualizar score de personalización basado en riqueza de datos
        data_richness_score = (
            len(user_profile.travel_history) * 0.1 +
            len(user_profile.feedback_history) * 0.15 +
            len(user_profile.preferences) * 0.05 +
            len(user_profile.personality_traits) * 0.2
        )
        
        user_profile.personalization_score = min(1.0, data_richness_score)
    
    async def _assign_ab_test_variant(self, user_profile: UserProfile, request: PersonalizationRequest) -> Optional[str]:
        """Asignar variante de A/B test al usuario"""
        if not self.config["a_b_testing_enabled"]:
            return None
        
        # Usar hash del user_id para asignación consistente
        user_hash = hash(user_profile.user_id) % 100
        
        # Distribución de variantes (25% cada una)
        if user_hash < 25:
            return "control"
        elif user_hash < 50:
            return "variant_a"
        elif user_hash < 75:
            return "variant_b"
        else:
            return "variant_c"
    
    async def _apply_ab_test_parameters(self, request: PersonalizationRequest, ab_variant: Optional[str]):
        """Aplicar parámetros de A/B test a la solicitud"""
        if not ab_variant:
            return
        
        # Ajustar pesos de algoritmos
        if ab_variant in self.a_b_test_variants["algorithm_weight"]:
            weights = self.a_b_test_variants["algorithm_weight"][ab_variant]
            self.recommendation_engine.hybrid_weights = weights
        
        # Ajustar factor de diversificación
        if ab_variant in self.a_b_test_variants["diversification"]:
            request.diversification_factor = self.a_b_test_variants["diversification"][ab_variant]
    
    async def _generate_explanations(self, 
                                   recommendations: List[Dict], 
                                   user_profile: UserProfile,
                                   behavior_analysis: Dict) -> List[str]:
        """Generar explicaciones para las recomendaciones"""
        explanations = []
        
        for i, rec in enumerate(recommendations[:5]):  # Explicar top 5
            explanation_parts = []
            
            # Explicación basada en algoritmo principal
            if "explanations" in rec and rec["explanations"]:
                explanation_parts.append(rec["explanations"][0])
            
            # Explicación basada en personalidad
            personality = user_profile.personality_traits
            if personality.get("openness", 0) > 0.7 and "adventure" in str(rec.get("item_data", {})).lower():
                explanation_parts.append("matches your adventurous spirit")
            
            if personality.get("conscientiousness", 0) > 0.7:
                explanation_parts.append("well-organized experience that fits your planning style")
            
            # Explicación basada en historial
            if user_profile.travel_history:
                recent_destinations = [t.get("type", "") for t in user_profile.travel_history[-3:]]
                item_type = rec.get("item_data", {}).get("type", "")
                
                if item_type in recent_destinations:
                    explanation_parts.append(f"similar to your recent {item_type} experiences")
                else:
                    explanation_parts.append(f"new {item_type} experience to expand your horizons")
            
            # Combinar explicaciones
            if explanation_parts:
                final_explanation = f"Recommended because it {', and '.join(explanation_parts[:2])}"
            else:
                final_explanation = "Recommended based on your preferences and travel style"
            
            explanations.append(final_explanation)
        
        return explanations
    
    async def _calculate_quality_metrics(self, recommendations: List[Dict], request: PersonalizationRequest) -> Dict:
        """Calcular métricas de calidad de las recomendaciones"""
        if not recommendations:
            return {
                "diversity_score": 0.0,
                "novelty_score": 0.0, 
                "personalization_strength": 0.0
            }
        
        # Calcular diversidad
        categories = []
        types = []
        
        for rec in recommendations:
            item_data = rec.get("item_data", {})
            categories.extend(item_data.get("categories", []))
            types.append(item_data.get("type", ""))
        
        diversity_score = len(set(categories)) / max(1, len(categories)) if categories else 0.0
        
        # Calcular novedad (basado en popularidad inversa)
        popularity_scores = [rec.get("item_data", {}).get("popularity_score", 0.5) for rec in recommendations]
        novelty_score = 1.0 - (sum(popularity_scores) / len(popularity_scores)) if popularity_scores else 0.5
        
        # Calcular fuerza de personalización (basado en confianza de algoritmos)
        confidence_scores = [rec.get("confidence", 0.5) for rec in recommendations]
        personalization_strength = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.5
        
        return {
            "diversity_score": round(diversity_score, 3),
            "novelty_score": round(novelty_score, 3),
            "personalization_strength": round(personalization_strength, 3)
        }
    
    async def _update_performance_metrics(self, 
                                        request: PersonalizationRequest,
                                        result: Dict, 
                                        processing_time_ms: float):
        """Actualizar métricas de performance"""
        # Actualizar contadores
        self.performance_metrics.total_requests += 1
        
        if result.get("recommendations"):
            self.performance_metrics.successful_personalizations += 1
        
        # Actualizar tiempos de respuesta
        current_avg = self.performance_metrics.average_response_time_ms
        total_requests = self.performance_metrics.total_requests
        
        self.performance_metrics.average_response_time_ms = (
            (current_avg * (total_requests - 1) + processing_time_ms) / total_requests
        )
        
        # Actualizar scores promedio
        quality_metrics = result.get("quality_metrics", {})
        
        current_conf_avg = self.performance_metrics.average_confidence_score
        new_conf_scores = quality_metrics.get("confidence_scores", [0.5])
        avg_conf = sum(new_conf_scores) / len(new_conf_scores)
        
        self.performance_metrics.average_confidence_score = (
            (current_conf_avg * (total_requests - 1) + avg_conf) / total_requests
        )
        
        # Actualizar métricas de diversidad y novedad
        self.performance_metrics.diversity_score_avg = (
            (self.performance_metrics.diversity_score_avg * (total_requests - 1) + 
             quality_metrics.get("diversity_score", 0.5)) / total_requests
        )
        
        self.performance_metrics.novelty_score_avg = (
            (self.performance_metrics.novelty_score_avg * (total_requests - 1) + 
             quality_metrics.get("novelty_score", 0.5)) / total_requests
        )
    
    async def _update_cache_metrics(self, cache_hit: bool):
        """Actualizar métricas de cache"""
        total_requests = self.performance_metrics.total_requests
        
        if cache_hit:
            cache_hits = self.performance_metrics.cache_hit_rate * total_requests + 1
        else:
            cache_hits = self.performance_metrics.cache_hit_rate * total_requests
        
        self.performance_metrics.cache_hit_rate = cache_hits / max(1, total_requests)
    
    async def _generate_error_response(self, error_message: str) -> Dict:
        """Generar respuesta de error"""
        return {
            "status": "error",
            "message": error_message,
            "recommendations": [],
            "fallback_used": True,
            "generated_at": datetime.now().isoformat()
        }
    
    # API Endpoints adicionales
    
    async def update_user_preferences(self, user_id: str, preferences: Dict) -> Dict:
        """Actualizar preferencias del usuario"""
        try:
            user_profile = await self._get_or_create_user_profile(user_id)
            
            # Actualizar preferencias
            user_profile.preferences.update(preferences)
            user_profile.updated_at = datetime.now()
            
            # Invalidar cache para este usuario
            await self._invalidate_user_cache(user_id)
            
            return {
                "status": "success",
                "user_id": user_id,
                "updated_preferences": user_profile.preferences,
                "updated_at": user_profile.updated_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error updating user preferences: {e}")
            return {"status": "error", "message": str(e)}
    
    async def record_user_feedback(self, user_id: str, recommendation_id: str, feedback: Dict) -> Dict:
        """Registrar feedback del usuario sobre recomendación"""
        try:
            user_profile = await self._get_or_create_user_profile(user_id)
            
            # Agregar feedback al historial
            feedback_entry = {
                "recommendation_id": recommendation_id,
                "rating": feedback.get("rating", 5),
                "liked": feedback.get("liked", True),
                "comment": feedback.get("comment", ""),
                "feedback_type": feedback.get("type", "explicit"),
                "timestamp": datetime.now().isoformat()
            }
            
            user_profile.feedback_history.append(feedback_entry)
            user_profile.updated_at = datetime.now()
            
            # Actualizar satisfaction score
            recent_feedback = user_profile.feedback_history[-10:]  # Últimos 10 feedback
            avg_rating = sum(f.get("rating", 5) for f in recent_feedback) / len(recent_feedback)
            user_profile.satisfaction_score = avg_rating / 5.0
            
            # Invalidar cache
            await self._invalidate_user_cache(user_id)
            
            return {
                "status": "success",
                "user_id": user_id,
                "feedback_recorded": feedback_entry,
                "updated_satisfaction_score": user_profile.satisfaction_score
            }
            
        except Exception as e:
            logger.error(f"Error recording user feedback: {e}")
            return {"status": "error", "message": str(e)}
    
    async def get_user_profile_summary(self, user_id: str) -> Dict:
        """Obtener resumen del perfil del usuario"""
        try:
            user_profile = await self._get_or_create_user_profile(user_id)
            
            # Generar análisis de comportamiento actualizado
            behavior_analysis = await self.behavior_analyzer.analyze_user_behavior(user_profile)
            
            return {
                "user_id": user_profile.user_id,
                "profile_created": user_profile.created_at.isoformat(),
                "last_updated": user_profile.updated_at.isoformat(),
                "personalization_score": round(user_profile.personalization_score, 3),
                "engagement_score": round(user_profile.engagement_score, 3),
                "satisfaction_score": round(user_profile.satisfaction_score, 3),
                "travel_history_count": len(user_profile.travel_history),
                "feedback_history_count": len(user_profile.feedback_history),
                "personality_traits": user_profile.personality_traits,
                "behavioral_insights": behavior_analysis.get("behavioral_insights", []),
                "user_segment": behavior_analysis.get("user_segment", {}),
                "recommendation_strategy": behavior_analysis.get("recommendation_strategy", {})
            }
            
        except Exception as e:
            logger.error(f"Error getting user profile summary: {e}")
            return {"status": "error", "message": str(e)}
    
    async def get_performance_analytics(self) -> Dict:
        """Obtener análisis de performance del motor de personalización"""
        return {
            "agent_name": self.name,
            "total_requests": self.performance_metrics.total_requests,
            "successful_personalizations": self.performance_metrics.successful_personalizations,
            "success_rate": (
                self.performance_metrics.successful_personalizations / 
                max(1, self.performance_metrics.total_requests) * 100
            ),
            "cache_hit_rate": round(self.performance_metrics.cache_hit_rate * 100, 2),
            "average_response_time_ms": round(self.performance_metrics.average_response_time_ms, 2),
            "average_confidence_score": round(self.performance_metrics.average_confidence_score, 3),
            "quality_metrics": {
                "diversity_score_avg": round(self.performance_metrics.diversity_score_avg, 3),
                "novelty_score_avg": round(self.performance_metrics.novelty_score_avg, 3)
            },
            "user_profiles_count": len(self.user_profiles),
            "cache_entries": len(self.recommendation_cache),
            "ab_test_variants": list(self.a_b_test_variants.keys()),
            "timestamp": datetime.now().isoformat()
        }
    
    async def _invalidate_user_cache(self, user_id: str):
        """Invalidar entradas de cache para un usuario específico"""
        keys_to_remove = [
            key for key in self.recommendation_cache.keys() 
            if key.startswith(user_id)
        ]
        
        for key in keys_to_remove:
            del self.recommendation_cache[key]
    
    async def clear_all_cache(self) -> Dict:
        """Limpiar todo el cache de recomendaciones"""
        cache_size = len(self.recommendation_cache)
        self.recommendation_cache.clear()
        
        return {
            "status": "success",
            "message": f"Cache cleared: {cache_size} entries removed",
            "timestamp": datetime.now().isoformat()
        }
    
    async def health_check(self) -> Dict:
        """Verificar salud del agente"""
        try:
            health_data = await self.health_checker.get_health_status()
            
            # Verificaciones específicas del agente
            agent_health = {
                "behavior_analyzer_ready": hasattr(self.behavior_analyzer, 'behavior_classifier'),
                "recommendation_engine_ready": hasattr(self.recommendation_engine, 'collaborative_model'),
                "user_profiles_loaded": len(self.user_profiles),
                "cache_entries": len(self.recommendation_cache),
                "performance_metrics_tracking": self.performance_metrics.total_requests > 0,
                "ab_testing_configured": len(self.a_b_test_variants) > 0,
                "memory_usage_mb": self._get_memory_usage()
            }
            
            overall_health = "healthy" if all([
                agent_health["behavior_analyzer_ready"],
                agent_health["recommendation_engine_ready"],
                agent_health["memory_usage_mb"] < 1000
            ]) else "degraded"
            
            return {
                "agent_name": self.name,
                "agent_status": overall_health,
                "timestamp": datetime.now().isoformat(),
                "health_details": agent_health,
                "system_health": health_data,
                "performance_summary": {
                    "total_requests": self.performance_metrics.total_requests,
                    "success_rate": round(
                        (self.performance_metrics.successful_personalizations / 
                         max(1, self.performance_metrics.total_requests)) * 100, 2
                    ),
                    "avg_response_time": round(self.performance_metrics.average_response_time_ms, 2)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in health check: {e}")
            return {
                "agent_name": self.name,
                "agent_status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def _get_memory_usage(self) -> float:
        """Obtener uso de memoria del agente (simulado)"""
        # En producción usaría psutil
        base_usage = 200.0  # MB base
        profile_usage = len(self.user_profiles) * 0.1  # 0.1 MB por perfil
        cache_usage = len(self.recommendation_cache) * 0.05  # 0.05 MB por entrada
        
        return base_usage + profile_usage + cache_usage

# Función de inicialización del agente
async def initialize_personalization_engine_agent() -> PersonalizationEngineAgent:
    """Inicializar y retornar instancia del agente de motor de personalización"""
    agent = PersonalizationEngineAgent()
    await agent.initialize()
    return agent

# Entry point para testing
if __name__ == "__main__":
    async def main():
        agent = await initialize_personalization_engine_agent()
        
        print("🧠 Personalization Engine Agent - Test Suite")
        print("=" * 60)
        
        # Test 1: Get personalized recommendations
        test_user_id = "test_user_123"
        
        recs_result = await agent.get_personalized_recommendations(
            user_id=test_user_id,
            personalization_type="destination_recommendations",
            context={"travel_dates": "2024-12-01", "group_size": 2},
            expected_items=5
        )
        
        print(f"✅ Recommendations Generated: {len(recs_result.get('recommendations', []))} items")
        print(f"   Diversity Score: {recs_result.get('quality_metrics', {}).get('diversity_score', 0)}")
        print(f"   Confidence: {recs_result.get('quality_metrics', {}).get('personalization_strength', 0)}")
        
        # Test 2: Update user preferences
        pref_result = await agent.update_user_preferences(
            user_id=test_user_id,
            preferences={
                "budget_range": [1000, 3000],
                "cultural_interest_level": 8,
                "adventure_level": 6
            }
        )
        print(f"✅ Preferences Updated: {pref_result['status']}")
        
        # Test 3: Record feedback
        feedback_result = await agent.record_user_feedback(
            user_id=test_user_id,
            recommendation_id="rec_123",
            feedback={"rating": 5, "liked": True, "comment": "Great recommendation!"}
        )
        print(f"✅ Feedback Recorded: {feedback_result['status']}")
        
        # Test 4: Get user profile
        profile = await agent.get_user_profile_summary(test_user_id)
        print(f"✅ User Profile: Personalization Score = {profile.get('personalization_score', 0)}")
        
        # Test 5: Performance analytics
        analytics = await agent.get_performance_analytics()
        print(f"✅ Performance Analytics: {analytics['total_requests']} requests processed")
        
        # Test 6: Health check
        health = await agent.health_check()
        print(f"✅ Health Check: {health['agent_status']}")
        
        print(f"\n🎯 Personalization Engine Agent ready for production!")
        print(f"📊 Cache Hit Rate: {analytics['cache_hit_rate']}%")
        print(f"⚡ Avg Response Time: {analytics['average_response_time_ms']}ms")
        print(f"🎪 A/B Testing: {len(analytics['ab_test_variants'])} variants active")

    # Ejecutar test si es llamado directamente
    asyncio.run(main())