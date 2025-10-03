"""
ExperienceCurator AI Agent - Personalized Itinerary Generation System

Este agente especializado crea itinerarios personalizados y experiencias únicas
para Spirit Tours, incluyendo:
- Generación automática de itinerarios personalizados
- Curación inteligente de experiencias y actividades
- Optimización de secuencias y timing de actividades
- Adaptación dinámica basada en preferencias del usuario
- Recomendaciones contextuales y en tiempo real
- Gestión de restricciones y limitaciones
- Integración con datos de satisfacción y feedback
- Personalización cultural y demográfica avanzada

Parte del sistema Track 1 (Expansión) de Spirit Tours Platform
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, field
from enum import Enum
import json
import random
import math
from pathlib import Path

# Importar clase base
import sys
sys.path.append(str(Path(__file__).parent.parent / "core"))
from base_agent import BaseAgent, AgentStatus

class ExperienceCategory(Enum):
    """Categorías de experiencias"""
    CULTURAL = "cultural"
    ADVENTURE = "adventure"
    GASTRONOMY = "gastronomy"
    NATURE = "nature"
    HISTORY = "history"
    ART = "art"
    PHOTOGRAPHY = "photography"
    SHOPPING = "shopping"
    NIGHTLIFE = "nightlife"
    RELAXATION = "relaxation"
    FAMILY_FRIENDLY = "family_friendly"
    ROMANTIC = "romantic"
    LUXURY = "luxury"
    BUDGET_FRIENDLY = "budget_friendly"
    SEASONAL = "seasonal"

class DifficultyLevel(Enum):
    """Niveles de dificultad"""
    VERY_EASY = "very_easy"
    EASY = "easy"
    MODERATE = "moderate"
    CHALLENGING = "challenging"
    EXPERT = "expert"

class ItineraryType(Enum):
    """Tipos de itinerario"""
    HALF_DAY = "half_day"          # 4 horas
    FULL_DAY = "full_day"          # 8 horas
    MULTI_DAY = "multi_day"        # 2-7 días
    EXTENDED = "extended"          # 7+ días
    CUSTOM = "custom"              # Duración personalizada

class PersonalizationLevel(Enum):
    """Niveles de personalización"""
    BASIC = "basic"                # Plantillas predefinidas
    ENHANCED = "enhanced"          # Adaptación por preferencias
    DEEP = "deep"                  # ML personalización avanzada
    ULTRA = "ultra"                # IA generativa completa

class WeatherAdaptation(Enum):
    """Adaptación al clima"""
    INDOOR_ONLY = "indoor_only"
    OUTDOOR_ONLY = "outdoor_only"
    MIXED = "mixed"
    WEATHER_DEPENDENT = "weather_dependent"
    ALL_WEATHER = "all_weather"

@dataclass
class ExperienceItem:
    """Elemento individual de experiencia"""
    experience_id: str
    name: str
    description: str
    category: ExperienceCategory
    
    # Detalles logísticos
    location: Dict[str, Any]  # {"name", "address", "coordinates"}
    duration_minutes: int
    difficulty_level: DifficultyLevel
    group_size_limits: Tuple[int, int]  # (min, max)
    
    # Características de la experiencia
    highlights: List[str]
    included_features: List[str]
    requirements: List[str]  # Age, fitness, etc.
    
    # Pricing y disponibilidad
    base_price: float
    seasonal_pricing: Dict[str, float]  # {"summer": 1.2, "winter": 0.8}
    availability_schedule: Dict[str, List[str]]  # {"monday": ["09:00-17:00"]}
    
    # Métricas de calidad
    customer_rating: float = 4.5
    satisfaction_score: float = 0.85
    photo_quality: float = 0.9
    unique_factor: float = 0.7  # Qué tan única es la experiencia
    
    # Personalización
    age_groups: List[str] = field(default_factory=list)  # ["children", "adults", "seniors"]
    interests: List[str] = field(default_factory=list)
    cultural_themes: List[str] = field(default_factory=list)
    weather_suitability: WeatherAdaptation = WeatherAdaptation.MIXED
    
    # Conectividad
    nearby_experiences: List[str] = field(default_factory=list)  # IDs de experiencias cercanas
    transportation_options: List[str] = field(default_factory=list)
    
    created_at: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)

@dataclass
class ItineraryPreferences:
    """Preferencias para generación de itinerario"""
    user_id: str
    
    # Básicos del viaje
    destination: str
    start_date: datetime
    end_date: datetime
    group_size: int
    budget_per_person: Optional[float] = None
    
    # Preferencias de experiencia
    preferred_categories: List[ExperienceCategory] = field(default_factory=list)
    avoided_categories: List[ExperienceCategory] = field(default_factory=list)
    difficulty_preference: DifficultyLevel = DifficultyLevel.MODERATE
    
    # Características del grupo
    group_demographics: Dict[str, Any] = field(default_factory=dict)
    accessibility_requirements: List[str] = field(default_factory=list)
    dietary_restrictions: List[str] = field(default_factory=list)
    
    # Preferencias de tiempo
    preferred_pace: str = "moderate"  # "relaxed", "moderate", "intensive"
    start_time_preference: str = "09:00"
    max_daily_duration: int = 480  # minutes (8 horas)
    
    # Personalización avanzada
    interests: List[str] = field(default_factory=list)
    travel_style: List[str] = field(default_factory=list)  # ["cultural", "adventurous", "luxury"]
    previous_destinations: List[str] = field(default_factory=list)
    
    # Restricciones
    must_include: List[str] = field(default_factory=list)  # Experience IDs obligatorios
    must_avoid: List[str] = field(default_factory=list)
    weather_preferences: WeatherAdaptation = WeatherAdaptation.ALL_WEATHER
    
    # Nivel de personalización deseado
    personalization_level: PersonalizationLevel = PersonalizationLevel.ENHANCED
    
    created_at: datetime = field(default_factory=datetime.now)

@dataclass
class GeneratedItinerary:
    """Itinerario generado completo"""
    itinerary_id: str
    user_id: str
    itinerary_type: ItineraryType
    
    # Información general
    title: str
    description: str
    destination: str
    total_duration_days: int
    
    # Experiencias organizadas por día
    daily_schedules: List[Dict[str, Any]] = field(default_factory=list)
    
    # Métricas del itinerario
    total_experiences: int = 0
    estimated_cost_per_person: float = 0.0
    diversity_score: float = 0.0  # Qué tan variado es el itinerario
    satisfaction_prediction: float = 0.0
    
    # Optimización
    route_optimization_score: float = 0.0
    time_efficiency_score: float = 0.0
    budget_optimization_score: float = 0.0
    
    # Personalización aplicada
    personalization_factors: List[str] = field(default_factory=list)
    preferences_matched: float = 0.0  # % de preferencias satisfechas
    
    # Alternativas y flexibilidad
    alternative_experiences: List[Dict[str, Any]] = field(default_factory=list)
    weather_alternatives: List[Dict[str, Any]] = field(default_factory=list)
    budget_alternatives: Dict[str, Any] = field(default_factory=dict)
    
    # Metadata
    generation_algorithm: str = "ai_hybrid"
    confidence_score: float = 0.85
    created_at: datetime = field(default_factory=datetime.now)
    last_modified: datetime = field(default_factory=datetime.now)

@dataclass
class CurationRule:
    """Regla de curación para experiencias"""
    rule_id: str
    name: str
    description: str
    
    # Condiciones
    conditions: Dict[str, Any]  # Condiciones que deben cumplirse
    priority: int  # 1-10 (10 = máxima prioridad)
    
    # Acciones
    actions: List[str]  # Qué hacer cuando se cumple la condición
    impact_weight: float = 1.0
    
    # Aplicabilidad
    applicable_categories: List[ExperienceCategory] = field(default_factory=list)
    user_segments: List[str] = field(default_factory=list)
    
    # Performance
    success_rate: float = 0.8
    user_satisfaction_impact: float = 0.1
    
    active: bool = True
    created_at: datetime = field(default_factory=datetime.now)

class ExperienceCuratorAgent(BaseAgent):
    """
    Agente Curador de Experiencias - Generación Personalizada de Itinerarios
    
    Especializado en crear itinerarios únicos y personalizados utilizando
    algoritmos avanzados de IA, machine learning y reglas de curación
    para maximizar la satisfacción del cliente.
    """
    
    def __init__(self):
        super().__init__("ExperienceCurator AI", "experience_curator")
        
        # Catálogo de experiencias
        self.experience_catalog: Dict[str, ExperienceItem] = {}
        self.generated_itineraries: Dict[str, GeneratedItinerary] = {}
        self.curation_rules: Dict[str, CurationRule] = {}
        
        # Cache de personalizaciones y recomendaciones
        self.personalization_cache: Dict[str, Dict] = {}
        self.recommendation_cache: Dict[str, List[str]] = {}
        
        # Algoritmos de curación disponibles
        self.curation_algorithms = {
            "preference_matching": self._preference_based_curation,
            "collaborative_filtering": self._collaborative_filtering_curation,
            "content_based": self._content_based_curation,
            "hybrid_ai": self._hybrid_ai_curation,
            "optimization_based": self._optimization_based_curation
        }
        
        # Configuraciones de personalización
        self.max_experiences_per_day = 6
        self.min_break_time_minutes = 30
        self.travel_time_buffer_minutes = 15
        
        # Métricas de calidad
        self.min_satisfaction_threshold = 4.0
        self.diversity_target = 0.7
        self.optimization_iterations = 100
        
        # Intervalos de actualización
        self.catalog_update_interval = 21600  # 6 horas
        self.personalization_refresh_interval = 7200  # 2 horas
        self.performance_analysis_interval = 43200  # 12 horas
        
        # Datos de demostración
        self._initialize_experience_catalog()
        self._initialize_curation_rules()
    
    def _initialize_agent_specific(self):
        """Inicialización específica del agente ExperienceCurator"""
        self.logger.info("Inicializando ExperienceCurator AI Agent...")
        
        # Cargar catálogo de experiencias
        self._load_experience_catalog()
        
        # Inicializar motores de recomendación
        self._initialize_recommendation_engines()
        
        # Iniciar tareas de curación continua
        asyncio.create_task(self._start_continuous_curation())
        asyncio.create_task(self._start_catalog_maintenance())
        asyncio.create_task(self._start_performance_optimization())
        
        self.logger.info("ExperienceCurator AI Agent inicializado correctamente")
    
    def _initialize_experience_catalog(self):
        """Inicializar catálogo de experiencias de demostración"""
        
        demo_experiences = [
            {
                "experience_id": "mad_prado_cultural",
                "name": "Prado Museum Masterpieces Tour",
                "description": "Guided tour through Spain's premier art museum with expert commentary",
                "category": ExperienceCategory.ART,
                "duration_minutes": 180,
                "difficulty": DifficultyLevel.EASY,
                "base_price": 45.0,
                "rating": 4.6,
                "location": {"name": "Museo del Prado", "city": "Madrid"}
            },
            {
                "experience_id": "mad_food_tapas",
                "name": "Authentic Tapas Walking Tour",
                "description": "Discover Madrid's best tapas bars with local food expert",
                "category": ExperienceCategory.GASTRONOMY,
                "duration_minutes": 240,
                "difficulty": DifficultyLevel.EASY,
                "base_price": 65.0,
                "rating": 4.8,
                "location": {"name": "La Latina District", "city": "Madrid"}
            },
            {
                "experience_id": "mad_palace_royal",
                "name": "Royal Palace Private Tour",
                "description": "Exclusive access to Royal Palace with historian guide",
                "category": ExperienceCategory.HISTORY,
                "duration_minutes": 150,
                "difficulty": DifficultyLevel.MODERATE,
                "base_price": 85.0,
                "rating": 4.5,
                "location": {"name": "Palacio Real", "city": "Madrid"}
            },
            {
                "experience_id": "mad_park_retiro",
                "name": "Retiro Park Peaceful Walk",
                "description": "Relaxing stroll through Madrid's most beautiful park",
                "category": ExperienceCategory.NATURE,
                "duration_minutes": 120,
                "difficulty": DifficultyLevel.VERY_EASY,
                "base_price": 25.0,
                "rating": 4.3,
                "location": {"name": "Parque del Retiro", "city": "Madrid"}
            },
            {
                "experience_id": "mad_flamenco_show",
                "name": "Authentic Flamenco Experience",
                "description": "Traditional flamenco show with dinner in historic venue",
                "category": ExperienceCategory.CULTURAL,
                "duration_minutes": 180,
                "difficulty": DifficultyLevel.EASY,
                "base_price": 95.0,
                "rating": 4.7,
                "location": {"name": "Corral de la Morería", "city": "Madrid"}
            },
            {
                "experience_id": "mad_market_san_miguel",
                "name": "San Miguel Market Food Tour",
                "description": "Gourmet food sampling in historic covered market",
                "category": ExperienceCategory.GASTRONOMY,
                "duration_minutes": 90,
                "difficulty": DifficultyLevel.VERY_EASY,
                "base_price": 35.0,
                "rating": 4.4,
                "location": {"name": "Mercado de San Miguel", "city": "Madrid"}
            }
        ]
        
        # Convertir a objetos ExperienceItem
        for exp_data in demo_experiences:
            experience = ExperienceItem(
                experience_id=exp_data["experience_id"],
                name=exp_data["name"],
                description=exp_data["description"],
                category=exp_data["category"],
                location=exp_data["location"],
                duration_minutes=exp_data["duration_minutes"],
                difficulty_level=exp_data["difficulty"],
                group_size_limits=(1, 20),
                highlights=["Expert guide", "Skip the line", "Photo opportunities"],
                included_features=["Professional guide", "Entry fees", "Small groups"],
                requirements=["Comfortable walking shoes"],
                base_price=exp_data["base_price"],
                seasonal_pricing={"summer": 1.1, "winter": 0.9, "spring": 1.0, "fall": 1.0},
                availability_schedule={
                    "monday": ["09:00-18:00"],
                    "tuesday": ["09:00-18:00"], 
                    "wednesday": ["09:00-18:00"],
                    "thursday": ["09:00-18:00"],
                    "friday": ["09:00-18:00"],
                    "saturday": ["09:00-19:00"],
                    "sunday": ["10:00-17:00"]
                },
                customer_rating=exp_data["rating"],
                satisfaction_score=exp_data["rating"] / 5.0,
                photo_quality=random.uniform(0.8, 0.95),
                unique_factor=random.uniform(0.6, 0.9),
                age_groups=["adults", "seniors"],
                interests=["culture", "history", "art"],
                weather_suitability=WeatherAdaptation.MIXED
            )
            
            self.experience_catalog[experience.experience_id] = experience
    
    def _initialize_curation_rules(self):
        """Inicializar reglas de curación"""
        
        demo_rules = [
            {
                "rule_id": "sequential_cultural",
                "name": "Sequential Cultural Experience Rule",
                "description": "Avoid scheduling multiple intensive cultural activities back-to-back",
                "conditions": {"consecutive_cultural_count": ">= 2"},
                "actions": ["insert_break", "add_light_activity"],
                "priority": 8
            },
            {
                "rule_id": "food_timing",
                "name": "Meal Time Optimization",
                "description": "Schedule food experiences during appropriate meal times",
                "conditions": {"category": "gastronomy", "time_range": "meal_hours"},
                "actions": ["optimize_timing", "suggest_alternatives"],
                "priority": 9
            },
            {
                "rule_id": "weather_adaptation",
                "name": "Weather-Based Activity Selection",
                "description": "Prioritize indoor activities during bad weather forecasts",
                "conditions": {"weather": "rain", "activity_type": "outdoor"},
                "actions": ["suggest_indoor_alternative", "reschedule"],
                "priority": 7
            }
        ]
        
        for rule_data in demo_rules:
            rule = CurationRule(
                rule_id=rule_data["rule_id"],
                name=rule_data["name"],
                description=rule_data["description"],
                conditions=rule_data["conditions"],
                priority=rule_data["priority"],
                actions=rule_data["actions"],
                success_rate=random.uniform(0.75, 0.95)
            )
            self.curation_rules[rule.rule_id] = rule
    
    async def process_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Procesar solicitud de curación de experiencias"""
        try:
            request_type = request_data.get("type", "generate_itinerary")
            
            if request_type == "generate_itinerary":
                return await self._generate_personalized_itinerary(request_data)
            elif request_type == "curate_experiences":
                return await self._curate_experience_selection(request_data)
            elif request_type == "optimize_itinerary":
                return await self._optimize_existing_itinerary(request_data)
            elif request_type == "get_recommendations":
                return await self._get_experience_recommendations(request_data)
            elif request_type == "analyze_preferences":
                return await self._analyze_user_preferences(request_data)
            elif request_type == "validate_itinerary":
                return await self._validate_itinerary_feasibility(request_data)
            elif request_type == "suggest_alternatives":
                return await self._suggest_itinerary_alternatives(request_data)
            elif request_type == "personalize_content":
                return await self._personalize_experience_content(request_data)
            elif request_type == "predict_satisfaction":
                return await self._predict_itinerary_satisfaction(request_data)
            else:
                return await self._comprehensive_curation_service(request_data)
                
        except Exception as e:
            self.logger.error(f"Error procesando solicitud de ExperienceCurator: {e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def _generate_personalized_itinerary(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generar itinerario personalizado completo"""
        
        # Parsear preferencias del usuario
        preferences = self._parse_itinerary_preferences(request_data)
        
        # Simular tiempo de generación IA
        await asyncio.sleep(2.5)
        
        # Seleccionar algoritmo de curación
        algorithm = request_data.get("algorithm", "hybrid_ai")
        if algorithm not in self.curation_algorithms:
            algorithm = "hybrid_ai"
        
        # Generar itinerario base
        itinerary = await self.curation_algorithms[algorithm](preferences)
        
        # Aplicar reglas de curación
        itinerary = self._apply_curation_rules(itinerary, preferences)
        
        # Optimizar secuencia y timing
        itinerary = await self._optimize_itinerary_sequence(itinerary, preferences)
        
        # Generar alternativas
        alternatives = await self._generate_itinerary_alternatives(itinerary, preferences)
        
        # Calcular métricas de calidad
        quality_metrics = self._calculate_itinerary_quality(itinerary, preferences)
        
        # Guardar itinerario generado
        self.generated_itineraries[itinerary.itinerary_id] = itinerary
        
        return {
            "success": True,
            "data": {
                "itinerary": self._serialize_itinerary(itinerary),
                "generation_summary": {
                    "algorithm_used": algorithm,
                    "preferences_satisfied": itinerary.preferences_matched,
                    "total_experiences": itinerary.total_experiences,
                    "estimated_cost": itinerary.estimated_cost_per_person,
                    "satisfaction_prediction": itinerary.satisfaction_prediction
                },
                "quality_metrics": quality_metrics,
                "alternatives": alternatives,
                "personalization_insights": {
                    "factors_applied": itinerary.personalization_factors,
                    "customization_level": preferences.personalization_level.value,
                    "unique_recommendations": len([exp for day in itinerary.daily_schedules for exp in day.get("experiences", [])]),
                    "diversity_achieved": itinerary.diversity_score
                },
                "recommendations": {
                    "pre_trip_tips": self._generate_pre_trip_recommendations(itinerary),
                    "what_to_bring": self._generate_packing_suggestions(itinerary, preferences),
                    "local_insights": self._generate_local_insights(itinerary)
                }
            }
        }
    
    async def _curate_experience_selection(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Curar selección específica de experiencias"""
        
        user_preferences = request_data.get("preferences", {})
        available_experiences = request_data.get("experience_pool", list(self.experience_catalog.keys()))
        max_selections = request_data.get("max_selections", 10)
        
        # Simular curación inteligente
        await asyncio.sleep(1.5)
        
        # Aplicar diferentes estrategias de curación
        curated_selections = {}
        
        # Curación basada en preferencias
        preference_based = await self._preference_based_curation_simple(user_preferences, available_experiences)
        curated_selections["preference_based"] = preference_based[:max_selections]
        
        # Curación por popularidad
        popularity_based = self._popularity_based_curation(available_experiences)
        curated_selections["popularity_based"] = popularity_based[:max_selections]
        
        # Curación por unicidad
        uniqueness_based = self._uniqueness_based_curation(available_experiences)
        curated_selections["uniqueness_based"] = uniqueness_based[:max_selections]
        
        # Curación híbrida optimizada
        hybrid_selection = self._hybrid_curation_selection(user_preferences, available_experiences, max_selections)
        
        # Análisis de diversidad
        diversity_analysis = self._analyze_selection_diversity(hybrid_selection)
        
        return {
            "success": True,
            "data": {
                "curated_selection": {
                    "experiences": [self._serialize_experience_item(self.experience_catalog[exp_id]) for exp_id in hybrid_selection],
                    "selection_strategy": "hybrid_optimized",
                    "total_selected": len(hybrid_selection),
                    "diversity_score": diversity_analysis["overall_diversity"]
                },
                "alternative_selections": curated_selections,
                "diversity_analysis": diversity_analysis,
                "curation_insights": {
                    "top_matching_factors": self._identify_top_matching_factors(hybrid_selection, user_preferences),
                    "coverage_analysis": self._analyze_preference_coverage(hybrid_selection, user_preferences),
                    "recommendation_confidence": random.uniform(0.8, 0.95)
                },
                "optimization_suggestions": self._generate_selection_optimization_suggestions(hybrid_selection, user_preferences)
            }
        }
    
    async def _optimize_existing_itinerary(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Optimizar itinerario existente"""
        
        itinerary_id = request_data.get("itinerary_id")
        optimization_goals = request_data.get("goals", ["time", "cost", "satisfaction"])
        
        if not itinerary_id or itinerary_id not in self.generated_itineraries:
            return {"success": False, "error": "Itinerary not found"}
        
        original_itinerary = self.generated_itineraries[itinerary_id]
        
        # Simular proceso de optimización
        await asyncio.sleep(2)
        
        # Crear copia para optimización
        optimized_itinerary = self._deep_copy_itinerary(original_itinerary)
        
        optimization_results = {}
        
        # Optimización por objetivo
        for goal in optimization_goals:
            if goal == "time":
                time_optimization = await self._optimize_for_time_efficiency(optimized_itinerary)
                optimization_results["time"] = time_optimization
            elif goal == "cost":
                cost_optimization = await self._optimize_for_cost_effectiveness(optimized_itinerary)
                optimization_results["cost"] = cost_optimization  
            elif goal == "satisfaction":
                satisfaction_optimization = await self._optimize_for_satisfaction(optimized_itinerary)
                optimization_results["satisfaction"] = satisfaction_optimization
        
        # Calcular mejoras logradas
        improvement_metrics = self._calculate_optimization_improvements(original_itinerary, optimized_itinerary)
        
        # Actualizar itinerario optimizado
        optimized_itinerary.last_modified = datetime.now()
        optimized_itinerary.generation_algorithm = f"{original_itinerary.generation_algorithm}_optimized"
        
        return {
            "success": True,
            "data": {
                "original_itinerary": self._serialize_itinerary(original_itinerary),
                "optimized_itinerary": self._serialize_itinerary(optimized_itinerary),
                "optimization_results": optimization_results,
                "improvement_metrics": improvement_metrics,
                "optimization_summary": {
                    "goals_achieved": len(optimization_results),
                    "overall_improvement": improvement_metrics.get("overall_score_improvement", 0),
                    "confidence_level": "high",
                    "processing_time": "2.3 seconds"
                },
                "recommendations": {
                    "apply_changes": improvement_metrics.get("overall_score_improvement", 0) > 0.1,
                    "further_optimizations": self._suggest_further_optimizations(optimized_itinerary),
                    "trade_offs": self._identify_optimization_tradeoffs(original_itinerary, optimized_itinerary)
                }
            }
        }
    
    async def _get_experience_recommendations(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Obtener recomendaciones de experiencias"""
        
        user_id = request_data.get("user_id")
        context = request_data.get("context", {})  # Current location, time, weather, etc.
        recommendation_count = request_data.get("count", 5)
        
        # Simular motor de recomendaciones
        await asyncio.sleep(1.2)
        
        # Diferentes tipos de recomendaciones
        recommendations = {
            "contextual": await self._get_contextual_recommendations(context, recommendation_count),
            "personalized": await self._get_personalized_recommendations(user_id, recommendation_count),
            "trending": self._get_trending_recommendations(recommendation_count),
            "seasonal": self._get_seasonal_recommendations(context, recommendation_count),
            "nearby": self._get_nearby_recommendations(context, recommendation_count)
        }
        
        # Combinar y rankear recomendaciones
        combined_recommendations = self._combine_and_rank_recommendations(recommendations, user_id, context)
        
        # Análisis de diversidad y calidad
        recommendation_analysis = self._analyze_recommendations_quality(combined_recommendations, context)
        
        return {
            "success": True,
            "data": {
                "primary_recommendations": combined_recommendations[:recommendation_count],
                "alternative_recommendations": {
                    "contextual": recommendations["contextual"][:3],
                    "trending": recommendations["trending"][:3],
                    "seasonal": recommendations["seasonal"][:3]
                },
                "recommendation_analysis": recommendation_analysis,
                "context_insights": {
                    "current_context": context,
                    "context_factors_used": list(context.keys()),
                    "personalization_applied": user_id is not None,
                    "recommendation_freshness": "real_time"
                },
                "interaction_suggestions": {
                    "save_for_later": "Enable users to save recommendations for future trips",
                    "share_recommendations": "Allow sharing with travel companions",
                    "feedback_mechanism": "Collect user feedback to improve recommendations"
                }
            }
        }
    
    # Métodos auxiliares de curación
    
    async def _hybrid_ai_curation(self, preferences: ItineraryPreferences) -> GeneratedItinerary:
        """Algoritmo híbrido de curación con IA"""
        
        # Generar ID único para el itinerario
        itinerary_id = f"itinerary_{preferences.user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Calcular duración del viaje
        duration_days = (preferences.end_date - preferences.start_date).days + 1
        
        # Filtrar experiencias disponibles
        available_experiences = self._filter_experiences_by_preferences(preferences)
        
        # Generar programación diaria
        daily_schedules = []
        
        for day in range(duration_days):
            current_date = preferences.start_date + timedelta(days=day)
            daily_schedule = self._generate_daily_schedule(available_experiences, preferences, current_date, day)
            daily_schedules.append(daily_schedule)
        
        # Calcular métricas del itinerario
        total_experiences = sum(len(day.get("experiences", [])) for day in daily_schedules)
        estimated_cost = self._calculate_total_itinerary_cost(daily_schedules)
        diversity_score = self._calculate_diversity_score(daily_schedules)
        satisfaction_prediction = self._predict_satisfaction_score(daily_schedules, preferences)
        
        # Crear itinerario completo
        itinerary = GeneratedItinerary(
            itinerary_id=itinerary_id,
            user_id=preferences.user_id,
            itinerary_type=self._determine_itinerary_type(duration_days),
            title=f"Personalized {preferences.destination} Experience",
            description=f"Custom {duration_days}-day itinerary for {preferences.group_size} people",
            destination=preferences.destination,
            total_duration_days=duration_days,
            daily_schedules=daily_schedules,
            total_experiences=total_experiences,
            estimated_cost_per_person=estimated_cost,
            diversity_score=diversity_score,
            satisfaction_prediction=satisfaction_prediction,
            personalization_factors=self._identify_applied_personalization_factors(preferences),
            preferences_matched=self._calculate_preferences_match_rate(daily_schedules, preferences),
            generation_algorithm="hybrid_ai_v2"
        )
        
        return itinerary
    
    def _generate_daily_schedule(self, available_experiences: List[ExperienceItem], 
                               preferences: ItineraryPreferences, date: datetime, day_index: int) -> Dict[str, Any]:
        """Generar programación para un día específico"""
        
        # Seleccionar experiencias para el día basado en duración y preferencias
        daily_experiences = []
        total_time_used = 0
        max_daily_time = preferences.max_daily_duration
        
        # Ordenar experiencias por relevancia y calidad
        sorted_experiences = sorted(available_experiences, 
                                  key=lambda x: (x.customer_rating, x.satisfaction_score, x.unique_factor), 
                                  reverse=True)
        
        for experience in sorted_experiences[:20]:  # Considerar top 20
            if total_time_used + experience.duration_minutes + self.min_break_time_minutes <= max_daily_time:
                if self._is_experience_suitable_for_day(experience, preferences, day_index):
                    daily_experiences.append({
                        "experience_id": experience.experience_id,
                        "name": experience.name,
                        "start_time": self._calculate_optimal_start_time(experience, total_time_used, preferences),
                        "duration_minutes": experience.duration_minutes,
                        "category": experience.category.value,
                        "estimated_cost": experience.base_price,
                        "highlights": experience.highlights[:3]
                    })
                    total_time_used += experience.duration_minutes + self.min_break_time_minutes
                    
                    if len(daily_experiences) >= self.max_experiences_per_day:
                        break
        
        return {
            "date": date.isoformat(),
            "day_number": day_index + 1,
            "experiences": daily_experiences,
            "total_duration_minutes": total_time_used,
            "estimated_cost_per_person": sum(exp["estimated_cost"] for exp in daily_experiences),
            "daily_theme": self._determine_daily_theme(daily_experiences),
            "logistics": {
                "start_time": preferences.start_time_preference,
                "end_time": self._calculate_end_time(preferences.start_time_preference, total_time_used),
                "breaks_included": len(daily_experiences) - 1 if daily_experiences else 0,
                "transportation_notes": self._generate_transportation_notes(daily_experiences)
            }
        }
    
    def _filter_experiences_by_preferences(self, preferences: ItineraryPreferences) -> List[ExperienceItem]:
        """Filtrar experiencias basado en preferencias del usuario"""
        
        filtered = []
        
        for experience in self.experience_catalog.values():
            # Verificar categorías preferidas
            if preferences.preferred_categories and experience.category not in preferences.preferred_categories:
                continue
            
            # Verificar categorías a evitar
            if experience.category in preferences.avoided_categories:
                continue
            
            # Verificar tamaño del grupo
            min_size, max_size = experience.group_size_limits
            if not (min_size <= preferences.group_size <= max_size):
                continue
            
            # Verificar presupuesto
            if preferences.budget_per_person and experience.base_price > preferences.budget_per_person * 0.3:
                continue
            
            # Verificar nivel de dificultad
            if self._difficulty_level_to_int(experience.difficulty_level) > self._difficulty_level_to_int(preferences.difficulty_preference) + 1:
                continue
            
            # Verificar experiencias obligatorias
            if preferences.must_include and experience.experience_id not in preferences.must_include:
                if len([e for e in filtered if e.experience_id in preferences.must_include]) < len(preferences.must_include):
                    continue
            
            # Verificar experiencias a evitar
            if experience.experience_id in preferences.must_avoid:
                continue
            
            filtered.append(experience)
        
        return filtered
    
    # Métodos de monitoreo continuo
    
    async def _start_continuous_curation(self):
        """Curación continua de experiencias"""
        while self.status == AgentStatus.ACTIVE:
            try:
                # Actualizar recomendaciones personalizadas
                await self._refresh_personalization_cache()
                
                # Optimizar reglas de curación
                await self._optimize_curation_rules()
                
                await asyncio.sleep(self.personalization_refresh_interval)
                
            except Exception as e:
                self.logger.error(f"Error en curación continua: {e}")
                await asyncio.sleep(1800)  # 30 minutos antes de reintentar
    
    async def _start_catalog_maintenance(self):
        """Mantenimiento continuo del catálogo"""
        while self.status == AgentStatus.ACTIVE:
            try:
                # Actualizar catálogo de experiencias
                await self._update_experience_catalog()
                
                # Validar calidad de experiencias
                await self._validate_experience_quality()
                
                await asyncio.sleep(self.catalog_update_interval)
                
            except Exception as e:
                self.logger.error(f"Error en mantenimiento de catálogo: {e}")
                await asyncio.sleep(3600)  # 1 hora antes de reintentar
    
    async def _start_performance_optimization(self):
        """Optimización continua de performance"""
        while self.status == AgentStatus.ACTIVE:
            try:
                # Analizar performance de itinerarios
                await self._analyze_itinerary_performance()
                
                # Optimizar algoritmos de curación
                await self._optimize_curation_algorithms()
                
                await asyncio.sleep(self.performance_analysis_interval)
                
            except Exception as e:
                self.logger.error(f"Error en optimización de performance: {e}")
                await asyncio.sleep(7200)  # 2 horas antes de reintentar
    
    # Métodos de serialización
    
    def _serialize_itinerary(self, itinerary: GeneratedItinerary) -> Dict[str, Any]:
        """Serializar itinerario para JSON"""
        return {
            "itinerary_id": itinerary.itinerary_id,
            "user_id": itinerary.user_id,
            "type": itinerary.itinerary_type.value,
            "title": itinerary.title,
            "description": itinerary.description,
            "destination": itinerary.destination,
            "duration_days": itinerary.total_duration_days,
            "daily_schedules": itinerary.daily_schedules,
            "summary": {
                "total_experiences": itinerary.total_experiences,
                "estimated_cost_per_person": itinerary.estimated_cost_per_person,
                "diversity_score": itinerary.diversity_score,
                "satisfaction_prediction": itinerary.satisfaction_prediction
            },
            "optimization_scores": {
                "route_optimization": itinerary.route_optimization_score,
                "time_efficiency": itinerary.time_efficiency_score,
                "budget_optimization": itinerary.budget_optimization_score
            },
            "personalization": {
                "factors_applied": itinerary.personalization_factors,
                "preferences_matched": itinerary.preferences_matched,
                "alternative_experiences": itinerary.alternative_experiences,
                "weather_alternatives": itinerary.weather_alternatives
            },
            "metadata": {
                "generation_algorithm": itinerary.generation_algorithm,
                "confidence_score": itinerary.confidence_score,
                "created_at": itinerary.created_at.isoformat(),
                "last_modified": itinerary.last_modified.isoformat()
            }
        }
    
    def _serialize_experience_item(self, experience: ExperienceItem) -> Dict[str, Any]:
        """Serializar experiencia para JSON"""
        return {
            "experience_id": experience.experience_id,
            "name": experience.name,
            "description": experience.description,
            "category": experience.category.value,
            "location": experience.location,
            "duration_minutes": experience.duration_minutes,
            "difficulty_level": experience.difficulty_level.value,
            "group_size_limits": experience.group_size_limits,
            "highlights": experience.highlights,
            "included_features": experience.included_features,
            "requirements": experience.requirements,
            "pricing": {
                "base_price": experience.base_price,
                "seasonal_pricing": experience.seasonal_pricing
            },
            "availability": experience.availability_schedule,
            "quality_metrics": {
                "customer_rating": experience.customer_rating,
                "satisfaction_score": experience.satisfaction_score,
                "photo_quality": experience.photo_quality,
                "unique_factor": experience.unique_factor
            },
            "suitability": {
                "age_groups": experience.age_groups,
                "interests": experience.interests,
                "cultural_themes": experience.cultural_themes,
                "weather_suitability": experience.weather_suitability.value
            }
        }
    
    def get_agent_status(self) -> Dict[str, Any]:
        """Obtener estado detallado del agente"""
        return {
            **super().get_agent_status(),
            "experience_catalog_size": len(self.experience_catalog),
            "generated_itineraries": len(self.generated_itineraries),
            "curation_rules_active": len([r for r in self.curation_rules.values() if r.active]),
            "personalization_cache_size": len(self.personalization_cache),
            "available_algorithms": list(self.curation_algorithms.keys()),
            "avg_satisfaction_prediction": sum(i.satisfaction_prediction for i in self.generated_itineraries.values()) / len(self.generated_itineraries) if self.generated_itineraries else 0
        }

# Implementaciones auxiliares básicas (continuarían con más detalle en producción)

    def _parse_itinerary_preferences(self, request_data: Dict[str, Any]) -> ItineraryPreferences:
        """Parsear preferencias de itinerario desde request"""
        return ItineraryPreferences(
            user_id=request_data.get("user_id", "demo_user"),
            destination=request_data.get("destination", "Madrid"),
            start_date=datetime.fromisoformat(request_data.get("start_date", datetime.now().isoformat())),
            end_date=datetime.fromisoformat(request_data.get("end_date", (datetime.now() + timedelta(days=3)).isoformat())),
            group_size=request_data.get("group_size", 2),
            budget_per_person=request_data.get("budget_per_person"),
            preferred_categories=[ExperienceCategory(cat) for cat in request_data.get("preferred_categories", ["cultural", "gastronomy"])],
            personalization_level=PersonalizationLevel(request_data.get("personalization_level", "enhanced"))
        )

# Función de utilidad para crear instancia
def create_experience_curator_agent() -> ExperienceCuratorAgent:
    """Crear y configurar instancia del agente ExperienceCurator"""
    return ExperienceCuratorAgent()

if __name__ == "__main__":
    # Ejemplo de uso
    import asyncio
    
    async def test_agent():
        agent = create_experience_curator_agent()
        
        # Test generación de itinerario
        result = await agent.process_request({
            "type": "generate_itinerary",
            "user_id": "test_user_001",
            "destination": "Madrid",
            "start_date": "2024-06-15",
            "end_date": "2024-06-18",
            "group_size": 4,
            "preferred_categories": ["cultural", "gastronomy", "art"],
            "personalization_level": "deep"
        })
        
        print("Itinerary Generation Result:")
        print(json.dumps(result, indent=2, default=str))
    
    asyncio.run(test_agent())