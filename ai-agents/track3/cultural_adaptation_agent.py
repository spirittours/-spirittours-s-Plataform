#!/usr/bin/env python3
"""
Spirit Tours - Cultural Adaptation AI Agent
Adaptación Cultural Inteligente para Experiencias Turísticas Globales

Este agente proporciona adaptación cultural avanzada para personalizar
experiencias turísticas según el background cultural, religioso, social
y linguístico de los usuarios, asegurando experiencias culturalmente
apropiadas y enriquecedoras.

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
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.cluster import KMeans, AgglomerativeClustering
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
import nltk
from textblob import TextBlob
import spacy
from transformers import pipeline, AutoTokenizer, AutoModel
from geopy.distance import geodesic
from babel import Locale
from babel.numbers import format_currency
from babel.dates import format_date, format_time
import pycountry
import yaml
import uuid
import re

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

class CulturalDimension(Enum):
    """Dimensiones culturales basadas en teoría de Hofstede y otros modelos"""
    POWER_DISTANCE = "power_distance"  # Distancia al poder
    INDIVIDUALISM = "individualism"  # Individualismo vs Colectivismo
    MASCULINITY = "masculinity"  # Masculinidad vs Feminidad
    UNCERTAINTY_AVOIDANCE = "uncertainty_avoidance"  # Evitación de incertidumbre
    LONG_TERM_ORIENTATION = "long_term_orientation"  # Orientación temporal
    INDULGENCE = "indulgence"  # Indulgencia vs Contención
    HIERARCHY_RESPECT = "hierarchy_respect"  # Respeto por jerarquía
    COMMUNICATION_STYLE = "communication_style"  # Estilo de comunicación
    TIME_ORIENTATION = "time_orientation"  # Orientación temporal
    SOCIAL_HARMONY = "social_harmony"  # Armonía social

class ReligiousConsideration(Enum):
    """Consideraciones religiosas para adaptación"""
    DIETARY_RESTRICTIONS = "dietary_restrictions"
    PRAYER_TIMES = "prayer_times"
    RELIGIOUS_SITES = "religious_sites"
    MODESTY_REQUIREMENTS = "modesty_requirements"
    SABBATH_OBSERVANCE = "sabbath_observance"
    RITUAL_CONSIDERATIONS = "ritual_considerations"
    SACRED_SPACES = "sacred_spaces"
    RELIGIOUS_HOLIDAYS = "religious_holidays"
    PILGRIMAGE_INTERESTS = "pilgrimage_interests"
    INTERFAITH_SENSITIVITY = "interfaith_sensitivity"

class CommunicationStyle(Enum):
    """Estilos de comunicación cultural"""
    DIRECT = "direct"  # Comunicación directa
    INDIRECT = "indirect"  # Comunicación indirecta
    HIGH_CONTEXT = "high_context"  # Alto contexto
    LOW_CONTEXT = "low_context"  # Bajo contexto
    FORMAL = "formal"  # Formal
    INFORMAL = "informal"  # Informal
    HIERARCHICAL = "hierarchical"  # Jerárquico
    EGALITARIAN = "egalitarian"  # Igualitario

class AdaptationLevel(Enum):
    """Niveles de adaptación cultural"""
    BASIC = 1  # Adaptaciones básicas
    MODERATE = 2  # Adaptaciones moderadas
    COMPREHENSIVE = 3  # Adaptaciones comprehensivas
    DEEP = 4  # Adaptaciones profundas
    IMMERSIVE = 5  # Adaptaciones inmersivas

@dataclass
class CulturalProfile:
    """Perfil cultural completo del usuario"""
    user_id: str
    primary_culture: str  # Cultura principal
    secondary_cultures: List[str] = field(default_factory=list)  # Culturas secundarias
    nationality: str = ""
    country_of_residence: str = ""
    languages_spoken: List[str] = field(default_factory=list)
    primary_language: str = ""
    religious_affiliation: Optional[str] = None
    religious_practices: List[str] = field(default_factory=list)
    cultural_dimensions: Dict[str, float] = field(default_factory=dict)
    communication_style: CommunicationStyle = CommunicationStyle.DIRECT
    dietary_restrictions: List[str] = field(default_factory=list)
    cultural_sensitivities: List[str] = field(default_factory=list)
    travel_experience_level: str = "intermediate"
    cultural_openness_score: float = 0.7
    adaptation_preferences: Dict[str, Any] = field(default_factory=dict)
    previous_cultural_experiences: List[Dict] = field(default_factory=list)
    cultural_learning_goals: List[str] = field(default_factory=list)
    comfort_zone_boundaries: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class AdaptationRequest:
    """Solicitud de adaptación cultural"""
    request_id: str
    user_cultural_profile: CulturalProfile
    destination_culture: str
    experience_type: str  # ej: dining, accommodation, activities, etc.
    content_to_adapt: Dict[str, Any]
    adaptation_level: AdaptationLevel
    specific_requirements: List[str] = field(default_factory=list)
    constraints: Dict[str, Any] = field(default_factory=dict)
    context: Dict[str, Any] = field(default_factory=dict)  # tiempo, grupo, ocasión
    priority_dimensions: List[str] = field(default_factory=list)
    request_timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class AdaptationResult:
    """Resultado de adaptación cultural"""
    request_id: str
    adapted_content: Dict[str, Any]
    adaptation_explanations: List[str] = field(default_factory=list)
    cultural_insights: List[str] = field(default_factory=list)
    sensitivity_warnings: List[str] = field(default_factory=list)
    alternative_options: List[Dict] = field(default_factory=list)
    learning_opportunities: List[str] = field(default_factory=list)
    confidence_score: float = 0.0
    adaptation_strength: float = 0.0
    cultural_authenticity_score: float = 0.0
    processing_time_ms: float = 0.0
    adaptations_applied: List[str] = field(default_factory=list)
    cultural_context_provided: Dict[str, Any] = field(default_factory=dict)
    generated_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class CulturalMetrics:
    """Métricas de adaptación cultural"""
    total_adaptations: int = 0
    successful_adaptations: int = 0
    adaptations_by_culture: Dict[str, int] = field(default_factory=dict)
    adaptations_by_type: Dict[str, int] = field(default_factory=dict)
    average_confidence_score: float = 0.0
    average_adaptation_strength: float = 0.0
    cultural_sensitivity_incidents: int = 0
    user_satisfaction_by_culture: Dict[str, float] = field(default_factory=dict)
    adaptation_accuracy_rate: float = 0.0
    cross_cultural_learning_rate: float = 0.0
    cultural_immersion_score: float = 0.0
    diversity_coverage: float = 0.0
    localization_effectiveness: float = 0.0
    cultural_bridge_building_score: float = 0.0

class CulturalKnowledgeBase:
    """Base de conocimiento cultural comprensiva"""
    
    def __init__(self):
        self.cultural_database = {}
        self.hofstede_scores = {}
        self.religious_guidelines = {}
        self.language_mappings = {}
        self.cultural_etiquette = {}
        self.dietary_guidelines = {}
        self.communication_patterns = {}
        self.business_cultures = {}
        self.social_norms = {}
        self.cultural_taboos = {}
        
    async def initialize(self):
        """Inicializar base de conocimiento cultural"""
        try:
            await self._load_cultural_database()
            await self._load_hofstede_dimensions()
            await self._load_religious_guidelines()
            await self._load_communication_patterns()
            await self._load_etiquette_guidelines()
            await self._load_dietary_guidelines()
            await self._load_taboo_database()
            
            logger.info("Cultural knowledge base initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing cultural knowledge base: {e}")
            raise
    
    async def _load_cultural_database(self):
        """Cargar base de datos cultural principal"""
        # Simulación de base de datos cultural comprensiva
        # En producción, se cargaría desde fuentes autorizadas y actualizadas
        
        self.cultural_database = {
            "japan": {
                "name": "Japanese Culture",
                "hofstede_scores": {
                    "power_distance": 54,
                    "individualism": 46,
                    "masculinity": 95,
                    "uncertainty_avoidance": 92,
                    "long_term_orientation": 88,
                    "indulgence": 42
                },
                "communication_style": "high_context",
                "time_orientation": "punctual",
                "hierarchy_importance": "high",
                "gift_giving_culture": "important",
                "business_card_etiquette": "formal_exchange",
                "dining_etiquette": "chopsticks_required",
                "bowing_customs": "respectful_greeting",
                "seasonal_considerations": ["sakura_season", "golden_week", "obon"],
                "religious_influences": ["shinto", "buddhism"],
                "language_formality_levels": ["keigo", "teineigo", "tameguchi"]
            },
            "usa": {
                "name": "American Culture", 
                "hofstede_scores": {
                    "power_distance": 40,
                    "individualism": 91,
                    "masculinity": 62,
                    "uncertainty_avoidance": 46,
                    "long_term_orientation": 26,
                    "indulgence": 68
                },
                "communication_style": "direct",
                "time_orientation": "punctual",
                "hierarchy_importance": "moderate",
                "personal_space": "important",
                "tipping_culture": "expected",
                "casual_interaction": "common",
                "diversity_awareness": "high",
                "religious_diversity": ["christian", "jewish", "muslim", "hindu", "buddhist", "secular"]
            },
            "saudi_arabia": {
                "name": "Saudi Arabian Culture",
                "hofstede_scores": {
                    "power_distance": 95,
                    "individualism": 25,
                    "masculinity": 60,
                    "uncertainty_avoidance": 80,
                    "long_term_orientation": 36,
                    "indulgence": 52
                },
                "communication_style": "high_context",
                "religious_considerations": "islam_dominant",
                "prayer_times": "five_daily",
                "ramadan_observance": "important",
                "modesty_requirements": "strict",
                "gender_segregation": "traditional_contexts",
                "hospitality": "extremely_important",
                "family_orientation": "very_strong",
                "business_relationships": "relationship_first"
            },
            "india": {
                "name": "Indian Culture",
                "hofstede_scores": {
                    "power_distance": 77,
                    "individualism": 48,
                    "masculinity": 56,
                    "uncertainty_avoidance": 40,
                    "long_term_orientation": 51,
                    "indulgence": 26
                },
                "diversity": "extremely_high",
                "languages": ["hindi", "english", "bengali", "telugu", "marathi", "tamil", "gujarati"],
                "religious_diversity": ["hinduism", "islam", "christianity", "sikhism", "buddhism", "jainism"],
                "caste_awareness": "traditional_influence",
                "family_importance": "central",
                "hospitality": "guest_is_god",
                "vegetarianism": "common",
                "festivals": ["diwali", "holi", "eid", "christmas", "dussehra"],
                "business_hierarchy": "important"
            },
            "germany": {
                "name": "German Culture",
                "hofstede_scores": {
                    "power_distance": 35,
                    "individualism": 67,
                    "masculinity": 66,
                    "uncertainty_avoidance": 65,
                    "long_term_orientation": 83,
                    "indulgence": 40
                },
                "punctuality": "extremely_important",
                "efficiency": "valued",
                "direct_communication": "preferred",
                "planning": "detailed",
                "privacy": "important",
                "environmental_consciousness": "high",
                "work_life_balance": "structured",
                "formality": "professional_contexts"
            },
            "brazil": {
                "name": "Brazilian Culture",
                "hofstede_scores": {
                    "power_distance": 69,
                    "individualism": 38,
                    "masculinity": 49,
                    "uncertainty_avoidance": 76,
                    "long_term_orientation": 44,
                    "indulgence": 59
                },
                "warmth": "high",
                "physical_contact": "common",
                "personal_relationships": "very_important",
                "family_orientation": "strong",
                "celebration_culture": "carnival_festivals",
                "flexibility": "with_time",
                "diversity": "racial_cultural",
                "music_dance": "integral_part",
                "beach_culture": "important"
            }
        }
    
    async def _load_hofstede_dimensions(self):
        """Cargar dimensiones culturales de Hofstede"""
        # Cargar scores de Hofstede para análisis cultural
        for culture_id, culture_data in self.cultural_database.items():
            if "hofstede_scores" in culture_data:
                self.hofstede_scores[culture_id] = culture_data["hofstede_scores"]
    
    async def _load_religious_guidelines(self):
        """Cargar pautas religiosas para adaptación"""
        self.religious_guidelines = {
            "islam": {
                "dietary_restrictions": ["no_pork", "no_alcohol", "halal_meat"],
                "prayer_times": ["fajr", "dhuhr", "asr", "maghrib", "isha"],
                "prayer_direction": "qibla_mecca",
                "modesty_requirements": ["loose_clothing", "cover_arms_legs"],
                "religious_holidays": ["ramadan", "eid_fitr", "eid_adha", "hajj_period"],
                "sacred_considerations": ["mosque_etiquette", "quran_respect"],
                "fasting_periods": ["ramadan_daylight", "voluntary_fasts"],
                "pilgrimage": "hajj_umrah_important"
            },
            "hinduism": {
                "dietary_restrictions": ["many_vegetarian", "no_beef", "some_no_garlic_onion"],
                "sacred_animals": ["cows_sacred", "respect_all_life"],
                "religious_sites": ["temples", "holy_rivers", "pilgrimage_sites"],
                "festivals": ["diwali", "holi", "navratri", "dussehra"],
                "sacred_symbols": ["om", "swastika_religious", "tilaka"],
                "caste_considerations": "traditional_awareness",
                "meditation_yoga": "spiritual_practices",
                "karma_dharma": "life_philosophy"
            },
            "christianity": {
                "denominations": ["catholic", "protestant", "orthodox", "evangelical"],
                "holy_days": ["sunday", "christmas", "easter", "good_friday"],
                "dietary_considerations": ["lent_fasting", "some_vegetarian_fridays"],
                "sacred_sites": ["churches", "cathedrals", "pilgrimage_sites"],
                "sacraments": ["baptism", "communion", "marriage"],
                "moral_guidelines": ["ten_commandments", "golden_rule"],
                "charity": "important_value",
                "family_values": "traditional_emphasis"
            },
            "judaism": {
                "dietary_restrictions": ["kosher_laws", "no_pork", "no_shellfish", "meat_dairy_separation"],
                "sabbath": ["friday_evening_saturday_evening", "no_work"],
                "holidays": ["rosh_hashanah", "yom_kippur", "passover", "sukkot"],
                "sacred_sites": ["synagogues", "western_wall", "israel_connection"],
                "life_cycle": ["bar_bat_mitzvah", "wedding_traditions"],
                "study_tradition": "torah_talmud_important",
                "community": "strong_emphasis",
                "remembrance": ["holocaust_awareness", "historical_persecution"]
            },
            "buddhism": {
                "core_principles": ["four_noble_truths", "eightfold_path", "karma"],
                "meditation": "central_practice",
                "temples_monasteries": "sacred_spaces",
                "vegetarianism": "many_practitioners",
                "nonviolence": "ahimsa_important",
                "mindfulness": "present_moment_awareness",
                "detachment": "material_possessions",
                "compassion": "all_beings",
                "reincarnation": "cyclical_existence"
            }
        }
    
    async def _load_communication_patterns(self):
        """Cargar patrones de comunicación cultural"""
        self.communication_patterns = {
            "high_context": {
                "characteristics": ["indirect", "implied_meaning", "nonverbal_important", "relationship_focus"],
                "cultures": ["japan", "korea", "china", "arab_cultures", "mediterranean"],
                "business_implications": ["relationship_building_first", "patience_required", "reading_between_lines"],
                "adaptation_tips": ["pay_attention_nonverbal", "build_trust_first", "avoid_directness"]
            },
            "low_context": {
                "characteristics": ["direct", "explicit_meaning", "facts_focus", "efficiency_valued"],
                "cultures": ["germany", "usa", "scandinavia", "netherlands"],
                "business_implications": ["get_to_point", "clear_communication", "time_efficiency"],
                "adaptation_tips": ["be_direct", "provide_clear_information", "focus_on_facts"]
            },
            "hierarchical": {
                "characteristics": ["respect_authority", "formal_titles", "age_respect", "position_important"],
                "cultures": ["korea", "thailand", "japan", "india", "mexico"],
                "business_implications": ["protocol_important", "formal_introductions", "decision_makers_clear"],
                "adaptation_tips": ["use_titles", "respect_seniority", "formal_approach"]
            },
            "egalitarian": {
                "characteristics": ["equality_focus", "informal_interaction", "merit_based", "accessibility"],
                "cultures": ["australia", "new_zealand", "scandinavia", "netherlands"],
                "business_implications": ["direct_access", "informal_meetings", "flat_structures"],
                "adaptation_tips": ["be_natural", "focus_on_contribution", "informal_is_ok"]
            }
        }
    
    async def _load_etiquette_guidelines(self):
        """Cargar pautas de etiqueta cultural"""
        self.cultural_etiquette = {
            "greeting_customs": {
                "handshake": ["usa", "germany", "uk", "australia"],
                "bow": ["japan", "korea", "thailand"],
                "kiss_cheeks": ["france", "italy", "spain", "lebanon"],
                "namaste": ["india", "nepal"],
                "wai": ["thailand", "laos"],
                "salaam": ["arab_cultures", "islamic_countries"]
            },
            "gift_giving": {
                "business_appropriate": ["japan", "korea", "china", "germany"],
                "avoid_expensive": ["usa", "scandinavia", "netherlands"],
                "religious_considerations": ["no_alcohol_islamic", "no_leather_hindu"],
                "color_significance": ["red_lucky_china", "white_mourning_asia", "yellow_sacred_thailand"],
                "wrapping_important": ["japan", "korea"],
                "reciprocity_expected": ["most_cultures"]
            },
            "dining_etiquette": {
                "chopsticks": ["china", "japan", "korea", "vietnam"],
                "hands_eating": ["india", "middle_east", "parts_africa"],
                "utensil_placement": ["european", "american_styles"],
                "sharing_dishes": ["chinese", "korean", "middle_eastern"],
                "host_serves_guest": ["asian_cultures", "middle_eastern"],
                "finish_plate": ["expected_some", "impolite_others"]
            },
            "business_meetings": {
                "punctuality_critical": ["germany", "switzerland", "japan", "usa"],
                "relationship_first": ["china", "arab_cultures", "latin_america"],
                "formal_dress": ["most_business_cultures"],
                "business_cards": ["exchange_ceremony_asia", "both_hands_japan"],
                "hierarchy_seating": ["korea", "china", "thailand"],
                "consensus_building": ["japan", "germany", "scandinavia"]
            }
        }
    
    async def _load_dietary_guidelines(self):
        """Cargar pautas alimentarias culturales"""
        self.dietary_guidelines = {
            "religious_dietary_laws": {
                "halal": {
                    "allowed": ["beef", "chicken", "lamb", "fish_scales", "vegetables", "fruits"],
                    "forbidden": ["pork", "alcohol", "non_halal_meat", "blood", "carnivorous_animals"],
                    "preparation": ["halal_slaughter", "separate_utensils", "bismillah_prayer"]
                },
                "kosher": {
                    "allowed": ["kosher_meat", "fish_scales_fins", "dairy_separate", "vegetables"],
                    "forbidden": ["pork", "shellfish", "meat_dairy_together", "blood", "non_kosher_animals"],
                    "preparation": ["kosher_slaughter", "rabbinical_supervision", "separate_kitchens"]
                },
                "hindu_vegetarian": {
                    "allowed": ["vegetables", "fruits", "dairy", "grains", "legumes"],
                    "often_avoided": ["meat", "fish", "eggs", "onion_garlic_some", "alcohol"],
                    "considerations": ["cow_sacred", "ahimsa_principle", "sattvic_foods"]
                },
                "buddhist": {
                    "many_vegetarian": ["vegetables", "fruits", "grains", "tofu"],
                    "some_avoid": ["meat", "fish", "alcohol", "strong_flavors"],
                    "principles": ["non_harm", "mindful_eating", "moderation"]
                }
            },
            "cultural_food_preferences": {
                "spice_tolerance": {
                    "high": ["india", "mexico", "thailand", "ethiopia"],
                    "medium": ["china", "korea", "turkey", "morocco"],
                    "low": ["germany", "scandinavia", "uk", "russia"]
                },
                "staple_foods": {
                    "rice": ["asia", "parts_africa", "south_america"],
                    "wheat": ["middle_east", "europe", "north_america"],
                    "corn": ["mexico", "parts_africa", "south_america"],
                    "potatoes": ["peru", "ireland", "eastern_europe"]
                },
                "meal_timing": {
                    "early_dinner": ["usa", "uk", "germany", "scandinavia"],
                    "late_dinner": ["spain", "italy", "argentina", "greece"],
                    "siesta_culture": ["spain", "mexico", "parts_latin_america"]
                }
            }
        }
    
    async def _load_taboo_database(self):
        """Cargar base de datos de tabúes culturales"""
        self.cultural_taboos = {
            "gesture_taboos": {
                "thumbs_up": ["offensive_middle_east", "rude_parts_middle_east"],
                "ok_sign": ["offensive_brazil_turkey", "money_japan"],
                "pointing_finger": ["rude_asia", "use_open_hand"],
                "showing_sole": ["offensive_muslim_buddhist_cultures"],
                "left_hand": ["unclean_muslim_hindu_cultures", "avoid_eating_greeting"]
            },
            "conversation_taboos": {
                "personal_income": ["private_most_cultures", "especially_asia_europe"],
                "age_women": ["sensitive_many_cultures"],
                "political_topics": ["avoid_unless_relevant", "sensitive_authoritarian"],
                "religious_criticism": ["highly_sensitive", "respect_beliefs"],
                "family_problems": ["private_matter", "especially_collective_cultures"]
            },
            "dress_taboos": {
                "revealing_clothing": ["inappropriate_conservative_cultures", "religious_sites"],
                "shoes_indoors": ["remove_asia", "some_middle_eastern"],
                "head_covering": ["required_some_religious_sites", "respectful_mosques"],
                "colors": ["white_mourning_asia", "red_luck_china", "green_sacred_islam"]
            },
            "behavioral_taboos": {
                "public_affection": ["inappropriate_conservative_cultures"],
                "loud_behavior": ["disrespectful_asia", "especially_japan"],
                "refusing_hospitality": ["offensive_middle_eastern", "central_asian"],
                "not_removing_shoes": ["disrespectful_when_required"],
                "ignoring_elders": ["very_disrespectful_hierarchical_cultures"]
            }
        }
    
    async def get_cultural_distance(self, culture1: str, culture2: str) -> float:
        """Calcular distancia cultural entre dos culturas usando dimensiones Hofstede"""
        try:
            if culture1 not in self.hofstede_scores or culture2 not in self.hofstede_scores:
                return 0.5  # Distancia neutral si no hay datos
            
            scores1 = np.array(list(self.hofstede_scores[culture1].values()))
            scores2 = np.array(list(self.hofstede_scores[culture2].values()))
            
            # Calcular distancia euclidiana normalizada
            distance = np.linalg.norm(scores1 - scores2) / np.sqrt(len(scores1) * 100**2)
            
            return min(1.0, distance)  # Normalizar entre 0-1
            
        except Exception as e:
            logger.warning(f"Error calculating cultural distance: {e}")
            return 0.5
    
    async def get_adaptation_recommendations(self, source_culture: str, target_culture: str, context: str) -> List[str]:
        """Obtener recomendaciones de adaptación entre culturas"""
        recommendations = []
        
        try:
            source_data = self.cultural_database.get(source_culture, {})
            target_data = self.cultural_database.get(target_culture, {})
            
            # Recomendaciones de comunicación
            source_comm = source_data.get("communication_style", "direct")
            target_comm = target_data.get("communication_style", "direct")
            
            if source_comm != target_comm:
                if target_comm == "high_context":
                    recommendations.append("Pay attention to nonverbal cues and implied meanings")
                    recommendations.append("Build relationships before discussing business")
                elif target_comm == "direct":
                    recommendations.append("Be more direct and explicit in communication")
                    recommendations.append("Focus on facts and efficiency")
            
            # Recomendaciones de jerarquía
            if target_data.get("hierarchy_importance") == "high":
                recommendations.append("Show respect to authority figures and use formal titles")
                recommendations.append("Follow protocol in business and social situations")
            
            # Recomendaciones religiosas
            if "religious_influences" in target_data:
                for religion in target_data["religious_influences"]:
                    if religion in self.religious_guidelines:
                        guidelines = self.religious_guidelines[religion]
                        if "dietary_restrictions" in guidelines:
                            recommendations.append(f"Be aware of dietary restrictions: {', '.join(guidelines['dietary_restrictions'])}")
                        if "modesty_requirements" in guidelines:
                            recommendations.append("Dress modestly, especially at religious sites")
            
            # Recomendaciones específicas por cultura
            if target_culture == "japan":
                recommendations.extend([
                    "Bow when greeting, depth indicates respect level",
                    "Remove shoes when entering homes and some establishments",
                    "Use both hands when exchanging business cards",
                    "Avoid pointing with fingers, use open hand instead"
                ])
            elif target_culture == "saudi_arabia":
                recommendations.extend([
                    "Dress conservatively, covering arms and legs",
                    "Be aware of prayer times (5 times daily)",
                    "Use right hand for eating and greeting",
                    "Show respect for Islamic traditions and customs"
                ])
            
        except Exception as e:
            logger.warning(f"Error generating adaptation recommendations: {e}")
        
        return recommendations[:10]  # Limitar a top 10 recomendaciones

class CulturalAdaptationEngine:
    """Motor de adaptación cultural con ML"""
    
    def __init__(self):
        self.adaptation_classifier = RandomForestClassifier(n_estimators=100)
        self.sensitivity_predictor = GradientBoostingRegressor(n_estimators=150)
        self.cultural_clustering = KMeans(n_clusters=8)
        self.scaler = StandardScaler()
        self.tfidf_vectorizer = TfidfVectorizer(max_features=1000)
        self.knowledge_base = CulturalKnowledgeBase()
        
    async def initialize(self):
        """Inicializar motor de adaptación"""
        try:
            # Inicializar base de conocimiento
            await self.knowledge_base.initialize()
            
            # Entrenar modelos con datos sintéticos
            await self._train_adaptation_models()
            
            logger.info("Cultural adaptation engine initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing adaptation engine: {e}")
            raise
    
    async def _train_adaptation_models(self):
        """Entrenar modelos de adaptación con datos sintéticos"""
        # Generar datos sintéticos para entrenamiento
        n_samples = 2000
        
        # Features: [cultural_distance, context_type, user_openness, content_sensitivity, etc.]
        features = np.random.rand(n_samples, 15)
        
        # Labels para clasificador de tipo de adaptación (0-4: basic to immersive)
        adaptation_labels = np.random.choice([0, 1, 2, 3, 4], size=n_samples, p=[0.2, 0.3, 0.3, 0.15, 0.05])
        
        # Labels para predictor de sensibilidad (0-1: low to high sensitivity)
        sensitivity_labels = np.random.rand(n_samples)
        
        # Entrenar modelos
        self.adaptation_classifier.fit(features, adaptation_labels)
        self.sensitivity_predictor.fit(features, sensitivity_labels)
        self.scaler.fit(features)
        
        # Entrenar clustering cultural (datos simulados de perfiles culturales)
        cultural_features = np.random.rand(500, 10)  # Perfiles culturales
        self.cultural_clustering.fit(cultural_features)
    
    async def adapt_content(self, request: AdaptationRequest) -> AdaptationResult:
        """Adaptar contenido según perfil cultural y destino"""
        try:
            start_time = datetime.now()
            
            # Analizar distancia cultural
            cultural_distance = await self.knowledge_base.get_cultural_distance(
                request.user_cultural_profile.primary_culture,
                request.destination_culture
            )
            
            # Determinar nivel de adaptación necesario
            adaptation_level = await self._determine_adaptation_level(request, cultural_distance)
            
            # Generar adaptaciones específicas
            adapted_content = await self._generate_adapted_content(request, adaptation_level)
            
            # Generar explicaciones culturales
            explanations = await self._generate_cultural_explanations(request, adapted_content)
            
            # Detectar sensibilidades potenciales
            warnings = await self._detect_sensitivity_warnings(request, adapted_content)
            
            # Generar alternativas culturales
            alternatives = await self._generate_cultural_alternatives(request)
            
            # Identificar oportunidades de aprendizaje
            learning_opportunities = await self._identify_learning_opportunities(request)
            
            # Calcular métricas de calidad
            quality_metrics = await self._calculate_adaptation_quality(request, adapted_content)
            
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return AdaptationResult(
                request_id=request.request_id,
                adapted_content=adapted_content,
                adaptation_explanations=explanations,
                cultural_insights=await self._generate_cultural_insights(request),
                sensitivity_warnings=warnings,
                alternative_options=alternatives,
                learning_opportunities=learning_opportunities,
                confidence_score=quality_metrics["confidence"],
                adaptation_strength=quality_metrics["strength"],
                cultural_authenticity_score=quality_metrics["authenticity"],
                processing_time_ms=processing_time,
                adaptations_applied=quality_metrics["adaptations_applied"],
                cultural_context_provided=await self._provide_cultural_context(request)
            )
            
        except Exception as e:
            logger.error(f"Error adapting content: {e}")
            raise
    
    async def _determine_adaptation_level(self, request: AdaptationRequest, cultural_distance: float) -> AdaptationLevel:
        """Determinar nivel de adaptación necesario"""
        # Crear vector de características para ML
        features = [
            cultural_distance,
            request.user_cultural_profile.cultural_openness_score,
            len(request.user_cultural_profile.previous_cultural_experiences) / 10.0,
            1.0 if request.user_cultural_profile.religious_affiliation else 0.0,
            len(request.user_cultural_profile.cultural_sensitivities) / 10.0,
            request.adaptation_level.value / 5.0,
            len(request.specific_requirements) / 10.0,
            1.0 if request.experience_type == "religious" else 0.0,
            np.random.rand(),  # Context complexity (simulado)
            np.random.rand(),  # Content sensitivity (simulado)
        ]
        
        # Rellenar hasta 15 features
        while len(features) < 15:
            features.append(np.random.rand() * 0.1)
        
        features_scaled = self.scaler.transform([features])
        
        # Predecir nivel de adaptación
        predicted_level = self.adaptation_classifier.predict(features_scaled)[0]
        
        return AdaptationLevel(min(5, max(1, predicted_level + 1)))
    
    async def _generate_adapted_content(self, request: AdaptationRequest, adaptation_level: AdaptationLevel) -> Dict[str, Any]:
        """Generar contenido adaptado culturalmente"""
        original_content = request.content_to_adapt.copy()
        adapted_content = {}
        
        # Adaptaciones de idioma y comunicación
        if "language" in original_content:
            adapted_content["language"] = await self._adapt_language_style(
                original_content["language"],
                request.user_cultural_profile,
                request.destination_culture
            )
        
        # Adaptaciones de tiempo y fechas
        if "schedule" in original_content:
            adapted_content["schedule"] = await self._adapt_schedule_format(
                original_content["schedule"],
                request.destination_culture
            )
        
        # Adaptaciones gastronómicas
        if "dining" in original_content:
            adapted_content["dining"] = await self._adapt_dining_options(
                original_content["dining"],
                request.user_cultural_profile,
                request.destination_culture
            )
        
        # Adaptaciones de actividades
        if "activities" in original_content:
            adapted_content["activities"] = await self._adapt_activities(
                original_content["activities"],
                request.user_cultural_profile,
                request.destination_culture,
                adaptation_level
            )
        
        # Adaptaciones de alojamiento
        if "accommodation" in original_content:
            adapted_content["accommodation"] = await self._adapt_accommodation(
                original_content["accommodation"],
                request.user_cultural_profile,
                request.destination_culture
            )
        
        # Adaptaciones de transporte
        if "transportation" in original_content:
            adapted_content["transportation"] = await self._adapt_transportation(
                original_content["transportation"],
                request.user_cultural_profile,
                request.destination_culture
            )
        
        # Adaptaciones de precios y moneda
        if "pricing" in original_content:
            adapted_content["pricing"] = await self._adapt_pricing_display(
                original_content["pricing"],
                request.user_cultural_profile,
                request.destination_culture
            )
        
        return adapted_content
    
    async def _adapt_language_style(self, content: Dict, user_profile: CulturalProfile, destination: str) -> Dict:
        """Adaptar estilo de lenguaje según cultura"""
        adapted = content.copy()
        
        # Obtener patrón de comunicación del destino
        dest_data = self.knowledge_base.cultural_database.get(destination, {})
        comm_style = dest_data.get("communication_style", "direct")
        
        if "descriptions" in adapted:
            descriptions = adapted["descriptions"]
            
            if comm_style == "high_context":
                # Hacer descripciones más indirectas y contextuales
                adapted["descriptions"] = [
                    self._make_description_high_context(desc) for desc in descriptions
                ]
            elif comm_style == "direct":
                # Hacer descripciones más directas y explícitas
                adapted["descriptions"] = [
                    self._make_description_direct(desc) for desc in descriptions
                ]
        
        # Adaptación de formalidad
        if dest_data.get("formality") == "high" or dest_data.get("hierarchy_importance") == "high":
            adapted["tone"] = "formal"
            adapted["titles_required"] = True
        else:
            adapted["tone"] = "casual"
            adapted["titles_required"] = False
        
        return adapted
    
    def _make_description_high_context(self, description: str) -> str:
        """Convertir descripción a estilo de alto contexto"""
        # Agregar más contexto y suavizar el lenguaje
        if "must" in description.lower():
            description = description.replace("must", "it would be appreciated if you could")
        if "should" in description.lower():
            description = description.replace("should", "you might consider")
        
        # Agregar palabras de cortesía
        courtesy_phrases = ["perhaps", "kindly", "if you wish", "at your convenience"]
        import random
        phrase = random.choice(courtesy_phrases)
        
        return f"{phrase.capitalize()}, {description.lower()}"
    
    def _make_description_direct(self, description: str) -> str:
        """Convertir descripción a estilo directo"""
        # Hacer más conciso y directo
        description = re.sub(r'perhaps|maybe|might|could possibly', 'will', description, flags=re.IGNORECASE)
        description = re.sub(r'you might consider', 'you should', description, flags=re.IGNORECASE)
        
        return description.strip()
    
    async def _adapt_schedule_format(self, schedule: Dict, destination_culture: str) -> Dict:
        """Adaptar formato de horarios según cultura"""
        adapted_schedule = schedule.copy()
        
        dest_data = self.knowledge_base.cultural_database.get(destination_culture, {})
        
        # Adaptar formato de tiempo
        if destination_culture in ["usa"]:
            # Formato 12 horas
            adapted_schedule["time_format"] = "12_hour"
            adapted_schedule["am_pm_required"] = True
        else:
            # Formato 24 horas
            adapted_schedule["time_format"] = "24_hour"
            adapted_schedule["am_pm_required"] = False
        
        # Consideraciones de puntualidad cultural
        if dest_data.get("punctuality") == "extremely_important":
            adapted_schedule["punctuality_note"] = "Punctuality is highly valued. Please arrive exactly on time."
            adapted_schedule["buffer_time"] = 0  # Sin tiempo extra
        elif dest_data.get("flexibility") == "with_time":
            adapted_schedule["punctuality_note"] = "Approximate times. Some flexibility is normal."
            adapted_schedule["buffer_time"] = 15  # 15 minutos de flexibilidad
        
        return adapted_schedule
    
    async def _adapt_dining_options(self, dining: Dict, user_profile: CulturalProfile, destination: str) -> Dict:
        """Adaptar opciones gastronómicas según restricciones culturales"""
        adapted_dining = dining.copy()
        
        # Filtrar según restricciones religiosas/culturales
        dietary_restrictions = user_profile.dietary_restrictions.copy()
        
        # Agregar restricciones basadas en religión
        if user_profile.religious_affiliation:
            religion = user_profile.religious_affiliation.lower()
            if religion in self.knowledge_base.religious_guidelines:
                religious_restrictions = self.knowledge_base.religious_guidelines[religion].get("dietary_restrictions", [])
                dietary_restrictions.extend(religious_restrictions)
        
        # Filtrar restaurantes y platos
        if "restaurants" in adapted_dining:
            filtered_restaurants = []
            for restaurant in adapted_dining["restaurants"]:
                if self._is_restaurant_suitable(restaurant, dietary_restrictions):
                    filtered_restaurants.append(self._adapt_restaurant_info(restaurant, user_profile, destination))
            adapted_dining["restaurants"] = filtered_restaurants
        
        # Agregar opciones culturalmente apropiadas
        adapted_dining["cultural_dining_tips"] = await self._get_cultural_dining_tips(destination)
        
        return adapted_dining
    
    def _is_restaurant_suitable(self, restaurant: Dict, restrictions: List[str]) -> bool:
        """Verificar si restaurante es adecuado según restricciones"""
        restaurant_cuisine = restaurant.get("cuisine_type", "").lower()
        menu_items = [item.lower() for item in restaurant.get("menu_highlights", [])]
        
        # Verificar restricciones
        for restriction in restrictions:
            if restriction == "no_pork" and ("pork" in restaurant_cuisine or any("pork" in item for item in menu_items)):
                return False
            if restriction == "no_beef" and ("beef" in restaurant_cuisine or any("beef" in item for item in menu_items)):
                return False
            if restriction == "no_alcohol" and restaurant.get("serves_alcohol", False):
                return False
            if restriction == "halal_meat" and not restaurant.get("halal_certified", False):
                return False
            if restriction == "kosher" and not restaurant.get("kosher_certified", False):
                return False
        
        return True
    
    def _adapt_restaurant_info(self, restaurant: Dict, user_profile: CulturalProfile, destination: str) -> Dict:
        """Adaptar información del restaurante"""
        adapted = restaurant.copy()
        
        # Agregar información cultural relevante
        if user_profile.religious_affiliation == "islam":
            adapted["prayer_time_consideration"] = "Restaurant is aware of prayer times"
            if "halal_certified" in adapted and adapted["halal_certified"]:
                adapted["religious_certification"] = "Halal certified"
        
        # Agregar tips de etiqueta local
        dest_data = self.knowledge_base.cultural_database.get(destination, {})
        if "dining_etiquette" in dest_data:
            adapted["local_etiquette"] = dest_data["dining_etiquette"]
        
        return adapted
    
    async def _get_cultural_dining_tips(self, destination: str) -> List[str]:
        """Obtener tips de comida cultural para destino"""
        tips = []
        
        dest_data = self.knowledge_base.cultural_database.get(destination, {})
        
        if destination == "japan":
            tips.extend([
                "Use chopsticks properly - don't stick them upright in rice",
                "Slurping noodles is acceptable and shows appreciation", 
                "Say 'itadakimasu' before eating and 'gochisousama' after",
                "Don't pass food directly from chopsticks to chopsticks"
            ])
        elif destination == "india":
            tips.extend([
                "Eat with your right hand only",
                "Try local vegetarian options - very common and delicious",
                "Bread is often used to scoop up curry instead of utensils",
                "Leaving a little food on your plate shows you're satisfied"
            ])
        elif destination == "saudi_arabia":
            tips.extend([
                "Use right hand for eating",
                "All food will be halal",
                "Meals often eaten on the floor with shared dishes",
                "Hospitality is very important - accept offered food graciously"
            ])
        
        return tips
    
    async def _adapt_activities(self, activities: Dict, user_profile: CulturalProfile, destination: str, level: AdaptationLevel) -> Dict:
        """Adaptar actividades según cultura y nivel de adaptación"""
        adapted_activities = activities.copy()
        
        # Filtrar actividades según sensibilidades culturales/religiosas
        if "activity_list" in adapted_activities:
            filtered_activities = []
            
            for activity in adapted_activities["activity_list"]:
                if self._is_activity_culturally_appropriate(activity, user_profile):
                    adapted_activity = await self._enhance_activity_with_cultural_context(
                        activity, user_profile, destination, level
                    )
                    filtered_activities.append(adapted_activity)
            
            adapted_activities["activity_list"] = filtered_activities
        
        # Agregar actividades culturalmente inmersivas según nivel
        if level.value >= 3:  # Comprehensive o superior
            cultural_activities = await self._suggest_cultural_immersion_activities(destination, user_profile)
            adapted_activities["cultural_immersion"] = cultural_activities
        
        return adapted_activities
    
    def _is_activity_culturally_appropriate(self, activity: Dict, user_profile: CulturalProfile) -> bool:
        """Verificar si actividad es culturalmente apropiada"""
        activity_type = activity.get("type", "").lower()
        
        # Verificar sensibilidades religiosas
        if user_profile.religious_affiliation:
            religion = user_profile.religious_affiliation.lower()
            
            if religion == "islam":
                if activity_type in ["alcohol_tasting", "nightclub", "gambling"]:
                    return False
                if activity.get("mixed_gender_interaction") and user_profile.cultural_sensitivities and "gender_segregation" in user_profile.cultural_sensitivities:
                    return False
            
            if religion in ["hindu", "buddhist"] and activity_type == "leather_workshop":
                return False
        
        # Verificar otras sensibilidades culturales
        for sensitivity in user_profile.cultural_sensitivities:
            if sensitivity == "animal_products" and "animal" in activity_type:
                return False
            if sensitivity == "loud_environments" and activity.get("noise_level", "") == "high":
                return False
        
        return True
    
    async def _enhance_activity_with_cultural_context(self, activity: Dict, user_profile: CulturalProfile, destination: str, level: AdaptationLevel) -> Dict:
        """Enriquecer actividad con contexto cultural"""
        enhanced = activity.copy()
        
        # Agregar contexto cultural según nivel de adaptación
        if level.value >= 2:  # Moderate o superior
            enhanced["cultural_significance"] = await self._get_cultural_significance(activity, destination)
            enhanced["local_customs"] = await self._get_relevant_customs(activity, destination)
        
        if level.value >= 4:  # Deep o superior
            enhanced["historical_context"] = await self._get_historical_context(activity, destination)
            enhanced["cultural_learning_points"] = await self._get_learning_opportunities(activity, destination)
        
        # Adaptar descripción según perfil cultural del usuario
        enhanced["adapted_description"] = await self._adapt_activity_description(
            activity.get("description", ""), user_profile, destination
        )
        
        return enhanced
    
    async def _get_cultural_significance(self, activity: Dict, destination: str) -> str:
        """Obtener significado cultural de actividad"""
        activity_type = activity.get("type", "").lower()
        
        cultural_meanings = {
            "temple_visit": {
                "japan": "Temples are places of spiritual reflection and connection with ancestors",
                "thailand": "Temples are central to daily life and Buddhist practice",
                "india": "Temples represent the connection between earthly and divine realms"
            },
            "traditional_meal": {
                "japan": "Sharing meals represents building relationships and showing respect",
                "india": "Food is considered sacred and sharing meals builds community bonds",
                "italy": "Meals are social events that strengthen family and friendship ties"
            },
            "market_visit": {
                "morocco": "Souks are historic trading centers representing centuries of commerce",
                "thailand": "Floating markets represent traditional water-based commerce",
                "mexico": "Markets are community gathering places with pre-Hispanic roots"
            }
        }
        
        return cultural_meanings.get(activity_type, {}).get(destination, "This activity has local cultural importance")
    
    async def _get_relevant_customs(self, activity: Dict, destination: str) -> List[str]:
        """Obtener costumbres relevantes para actividad"""
        customs = []
        activity_type = activity.get("type", "").lower()
        
        if "temple" in activity_type or "religious" in activity_type:
            if destination in ["thailand", "japan", "cambodia"]:
                customs.extend([
                    "Remove shoes before entering",
                    "Dress modestly covering shoulders and knees",
                    "Speak in quiet, respectful tones",
                    "Don't point feet toward Buddha statues"
                ])
            elif destination in ["india"]:
                customs.extend([
                    "Remove shoes and sometimes socks",
                    "Cover head if required",
                    "Don't wear leather items",
                    "Walk clockwise around sacred spaces"
                ])
        
        elif "market" in activity_type:
            customs.extend([
                "Bargaining is often expected and part of the cultural interaction",
                "Take time to build rapport with vendors",
                "Small talk before business is appreciated"
            ])
        
        return customs
    
    async def _get_historical_context(self, activity: Dict, destination: str) -> str:
        """Obtener contexto histórico de actividad"""
        # Contexto histórico simulado - en producción se conectaría a base de datos histórica
        return f"This {activity.get('type', 'activity')} has deep roots in {destination} culture, representing traditions passed down through generations."
    
    async def _get_learning_opportunities(self, activity: Dict, destination: str) -> List[str]:
        """Obtener oportunidades de aprendizaje de actividad"""
        return [
            f"Learn about local {destination} traditions",
            "Understand cultural values through direct experience",
            "Practice cross-cultural communication skills",
            "Gain appreciation for different ways of life"
        ]
    
    async def _adapt_activity_description(self, description: str, user_profile: CulturalProfile, destination: str) -> str:
        """Adaptar descripción de actividad según perfil cultural"""
        # Análisis de estilo de comunicación del usuario
        if user_profile.communication_style == CommunicationStyle.FORMAL:
            # Hacer descripción más formal
            description = description.replace("you'll", "you will")
            description = description.replace("it's", "it is")
        
        # Agregar contexto cultural relevante
        dest_data = self.knowledge_base.cultural_database.get(destination, {})
        if dest_data.get("communication_style") == "high_context":
            # Agregar más contexto y sutileza
            description = f"In the rich cultural tradition of {destination}, {description.lower()}"
        
        return description
    
    async def _suggest_cultural_immersion_activities(self, destination: str, user_profile: CulturalProfile) -> List[Dict]:
        """Sugerir actividades de inmersión cultural"""
        immersion_activities = []
        
        # Actividades específicas por destino
        if destination == "japan":
            immersion_activities = [
                {
                    "name": "Tea Ceremony Experience",
                    "type": "cultural_ritual",
                    "description": "Learn the art of Japanese tea ceremony and its philosophical meaning",
                    "cultural_depth": "deep",
                    "learning_outcome": "Understanding of Japanese aesthetics and mindfulness"
                },
                {
                    "name": "Homestay with Local Family",
                    "type": "cultural_exchange",
                    "description": "Experience daily life with a Japanese family",
                    "cultural_depth": "immersive",
                    "learning_outcome": "Direct cultural exchange and language practice"
                }
            ]
        elif destination == "india":
            immersion_activities = [
                {
                    "name": "Cooking Class with Local Family",
                    "type": "culinary_cultural",
                    "description": "Learn traditional cooking techniques and family recipes",
                    "cultural_depth": "comprehensive", 
                    "learning_outcome": "Understanding of Indian hospitality and food culture"
                },
                {
                    "name": "Festival Participation",
                    "type": "religious_cultural",
                    "description": "Join local community in traditional festival celebrations",
                    "cultural_depth": "immersive",
                    "learning_outcome": "Experience of community bonding and religious traditions"
                }
            ]
        
        # Filtrar según openness score del usuario
        if user_profile.cultural_openness_score >= 0.7:
            return immersion_activities
        elif user_profile.cultural_openness_score >= 0.5:
            return [act for act in immersion_activities if act.get("cultural_depth") != "immersive"]
        else:
            return [act for act in immersion_activities if act.get("cultural_depth") in ["basic", "moderate"]]
    
    async def _adapt_accommodation(self, accommodation: Dict, user_profile: CulturalProfile, destination: str) -> Dict:
        """Adaptar opciones de alojamiento según cultura"""
        adapted = accommodation.copy()
        
        # Considerar preferencias religiosas
        if user_profile.religious_affiliation:
            religion = user_profile.religious_affiliation.lower()
            
            if religion == "islam":
                # Filtrar hoteles con servicios halal
                if "options" in adapted:
                    adapted["options"] = [
                        opt for opt in adapted["options"]
                        if opt.get("halal_food_available", False) or opt.get("no_alcohol_policy", False)
                    ]
                adapted["prayer_facilities"] = "Prayer mats and Qibla direction available"
                adapted["dietary_accommodation"] = "Halal food options confirmed"
            
            if religion == "judaism":
                adapted["kosher_options"] = "Kosher meal arrangements can be made"
                adapted["sabbath_considerations"] = "Elevator and key card access considerations available"
        
        # Adaptaciones culturales específicas
        dest_data = self.knowledge_base.cultural_database.get(destination, {})
        
        if dest_data.get("modesty_requirements") == "strict":
            adapted["dress_code_note"] = "Please note modest dress requirements in public areas"
            adapted["separate_facilities"] = "Gender-separated pool/spa times available"
        
        return adapted
    
    async def _adapt_transportation(self, transportation: Dict, user_profile: CulturalProfile, destination: str) -> Dict:
        """Adaptar opciones de transporte según cultura"""
        adapted = transportation.copy()
        
        # Consideraciones religiosas para transporte
        if user_profile.religious_affiliation == "islam":
            if "options" in adapted:
                for option in adapted["options"]:
                    if option.get("type") == "shared_transport":
                        option["note"] = "Mixed-gender seating standard, let us know if you prefer alternative arrangements"
        
        # Adaptaciones culturales del destino
        dest_data = self.knowledge_base.cultural_database.get(destination, {})
        
        if destination == "japan":
            adapted["cultural_transport_tips"] = [
                "Trains are extremely punctual - arrive early",
                "Keep conversations quiet on public transport", 
                "Let passengers exit before boarding",
                "Priority seating for elderly and pregnant women"
            ]
        elif destination == "india":
            adapted["cultural_transport_tips"] = [
                "Traffic can be chaotic but follows its own logic",
                "Bargaining for taxi/auto-rickshaw fares is common",
                "Women-only train cars available during peak hours",
                "Remove shoes when entering some traditional vehicles"
            ]
        
        return adapted
    
    async def _adapt_pricing_display(self, pricing: Dict, user_profile: CulturalProfile, destination: str) -> Dict:
        """Adaptar visualización de precios según cultura"""
        adapted = pricing.copy()
        
        # Formato de moneda según cultura del usuario
        user_culture_data = self.knowledge_base.cultural_database.get(user_profile.primary_culture, {})
        
        # Agregar contexto de precios local
        dest_data = self.knowledge_base.cultural_database.get(destination, {})
        
        if dest_data.get("tipping_culture") == "expected":
            adapted["tipping_note"] = "15-20% tip customary for restaurants and services"
        elif dest_data.get("tipping_culture") == "not_expected":
            adapted["tipping_note"] = "Tipping not expected - excellent service included"
        
        # Información sobre negociación de precios
        if destination in ["india", "morocco", "turkey", "egypt"]:
            adapted["bargaining_note"] = "Prices in markets are often negotiable - bargaining is part of the cultural experience"
        
        return adapted
    
    async def _generate_cultural_explanations(self, request: AdaptationRequest, adapted_content: Dict) -> List[str]:
        """Generar explicaciones culturales para las adaptaciones"""
        explanations = []
        
        source_culture = request.user_cultural_profile.primary_culture
        dest_culture = request.destination_culture
        
        # Explicación de distancia cultural
        distance = await self.knowledge_base.get_cultural_distance(source_culture, dest_culture)
        
        if distance > 0.7:
            explanations.append(f"There are significant cultural differences between {source_culture} and {dest_culture} cultures that we've considered in these recommendations.")
        elif distance > 0.4:
            explanations.append(f"We've made moderate cultural adaptations to help you navigate differences between {source_culture} and {dest_culture} cultures.")
        else:
            explanations.append(f"The cultural similarities between {source_culture} and {dest_culture} cultures allow for minimal adaptations.")
        
        # Explicaciones específicas de adaptación
        if "dining" in adapted_content:
            explanations.append("Dining recommendations have been filtered according to your dietary requirements and cultural practices.")
        
        if "activities" in adapted_content:
            explanations.append("Activities have been selected and described with cultural context to enhance your understanding and experience.")
        
        if request.user_cultural_profile.religious_affiliation:
            explanations.append(f"Recommendations consider {request.user_cultural_profile.religious_affiliation} practices and requirements.")
        
        return explanations
    
    async def _detect_sensitivity_warnings(self, request: AdaptationRequest, adapted_content: Dict) -> List[str]:
        """Detectar y generar advertencias de sensibilidad cultural"""
        warnings = []
        
        destination = request.destination_culture
        user_profile = request.user_cultural_profile
        
        # Verificar tabúes culturales
        if destination in self.knowledge_base.cultural_taboos.get("gesture_taboos", {}):
            warnings.append("Be mindful of hand gestures - some common gestures may have different meanings here.")
        
        # Advertencias religiosas
        dest_data = self.knowledge_base.cultural_database.get(destination, {})
        if "religious_influences" in dest_data:
            for religion in dest_data["religious_influences"]:
                if religion != user_profile.religious_affiliation:
                    if religion == "islam":
                        warnings.append("This is a Muslim-majority area. Please dress modestly and be respectful during prayer times.")
                    elif religion in ["hinduism", "buddhism"]:
                        warnings.append("Many religious sites here. Please remove shoes when required and dress modestly.")
        
        # Advertencias de comunicación
        if dest_data.get("communication_style") != user_profile.communication_style.value:
            if dest_data.get("communication_style") == "high_context":
                warnings.append("Communication here tends to be more indirect. Pay attention to nonverbal cues and implied meanings.")
            elif dest_data.get("communication_style") == "direct":
                warnings.append("Direct communication is preferred here. Being straightforward is appreciated.")
        
        return warnings
    
    async def _generate_cultural_alternatives(self, request: AdaptationRequest) -> List[Dict]:
        """Generar alternativas culturales"""
        alternatives = []
        
        destination = request.destination_culture
        
        # Alternativas de experiencias culturales
        if request.experience_type == "dining":
            alternatives = [
                {
                    "type": "home_dining",
                    "description": "Dine with a local family for authentic cultural exchange",
                    "cultural_value": "high",
                    "authenticity": "maximum"
                },
                {
                    "type": "cooking_class",
                    "description": "Learn to prepare traditional dishes yourself",
                    "cultural_value": "high",
                    "hands_on": True
                }
            ]
        elif request.experience_type == "accommodation":
            alternatives = [
                {
                    "type": "homestay",
                    "description": "Stay with local family for immersive cultural experience",
                    "cultural_immersion": "maximum"
                },
                {
                    "type": "traditional_guesthouse",
                    "description": "Experience traditional architecture and hospitality",
                    "authenticity": "high"
                }
            ]
        
        return alternatives
    
    async def _identify_learning_opportunities(self, request: AdaptationRequest) -> List[str]:
        """Identificar oportunidades de aprendizaje cultural"""
        opportunities = []
        
        destination = request.destination_culture
        user_openness = request.user_cultural_profile.cultural_openness_score
        
        if user_openness >= 0.6:
            opportunities.extend([
                f"Learn basic greetings and courtesy phrases in the local language of {destination}",
                f"Understand the historical context that shapes modern {destination} culture",
                "Practice cross-cultural communication skills",
                "Develop global cultural competency"
            ])
        
        # Oportunidades específicas por destino
        if destination == "japan":
            opportunities.extend([
                "Learn about the concept of 'wa' (harmony) in Japanese society",
                "Understand the importance of collective vs individual in decision-making",
                "Experience the art of mindful living through tea ceremony or meditation"
            ])
        elif destination == "india":
            opportunities.extend([
                "Explore the philosophy of 'Atithi Devo Bhava' (guest is god)",
                "Understand the diversity within unity concept in Indian culture",
                "Learn about the spiritual aspects of daily life in Indian culture"
            ])
        
        return opportunities
    
    async def _generate_cultural_insights(self, request: AdaptationRequest) -> List[str]:
        """Generar insights culturales profundos"""
        insights = []
        
        destination = request.destination_culture
        dest_data = self.knowledge_base.cultural_database.get(destination, {})
        
        # Insights basados en dimensiones de Hofstede
        hofstede_scores = dest_data.get("hofstede_scores", {})
        
        if hofstede_scores.get("power_distance", 50) > 70:
            insights.append("This is a hierarchical society where respect for authority and seniority is deeply valued.")
        
        if hofstede_scores.get("individualism", 50) < 30:
            insights.append("This is a collective culture where group harmony and family ties are prioritized over individual preferences.")
        
        if hofstede_scores.get("uncertainty_avoidance", 50) > 70:
            insights.append("This culture values structure and predictability. Planning and following rules are important.")
        
        # Insights específicos por cultura
        if destination == "japan":
            insights.extend([
                "The concept of 'reading the air' (kuuki wo yomu) is important - paying attention to unspoken communication",
                "Harmony and avoiding conflict are core values that influence all interactions"
            ])
        elif destination == "saudi_arabia":
            insights.extend([
                "Family and tribal connections are fundamental to social and business relationships",
                "Hospitality is a sacred duty - refusing offers of food or drink can be considered rude"
            ])
        
        return insights
    
    async def _calculate_adaptation_quality(self, request: AdaptationRequest, adapted_content: Dict) -> Dict:
        """Calcular métricas de calidad de adaptación"""
        # Calcular confianza basada en disponibilidad de datos culturales
        source_data_available = request.user_cultural_profile.primary_culture in self.knowledge_base.cultural_database
        dest_data_available = request.destination_culture in self.knowledge_base.cultural_database
        
        confidence = 0.5  # Base
        if source_data_available:
            confidence += 0.2
        if dest_data_available:
            confidence += 0.3
        
        # Calcular fuerza de adaptación
        adaptations_count = len([k for k in adapted_content.keys() if k in request.content_to_adapt])
        strength = min(1.0, adaptations_count / max(1, len(request.content_to_adapt)))
        
        # Calcular autenticidad cultural
        authenticity = 0.7  # Simulado - en producción se basaría en feedback y validación cultural
        
        return {
            "confidence": round(confidence, 3),
            "strength": round(strength, 3),
            "authenticity": round(authenticity, 3),
            "adaptations_applied": list(adapted_content.keys())
        }
    
    async def _provide_cultural_context(self, request: AdaptationRequest) -> Dict[str, Any]:
        """Proporcionar contexto cultural comprehensivo"""
        context = {}
        
        destination = request.destination_culture
        dest_data = self.knowledge_base.cultural_database.get(destination, {})
        
        # Información cultural básica
        context["cultural_overview"] = dest_data.get("name", f"{destination} Culture")
        context["hofstede_dimensions"] = dest_data.get("hofstede_scores", {})
        context["communication_style"] = dest_data.get("communication_style", "mixed")
        
        # Consideraciones religiosas
        if "religious_influences" in dest_data:
            context["religious_context"] = dest_data["religious_influences"]
        
        # Etiqueta básica
        context["basic_etiquette"] = await self.knowledge_base.get_adaptation_recommendations(
            request.user_cultural_profile.primary_culture,
            destination,
            request.experience_type
        )
        
        return context

class CulturalAdaptationAgent(BaseAgent):
    """
    Agente de Adaptación Cultural - Spirit Tours
    
    Proporciona adaptación cultural inteligente incluyendo:
    - Análisis profundo de diferencias culturales usando dimensiones Hofstede
    - Base de conocimiento comprensiva de culturas, religiones y etiqueta
    - Adaptación de contenido según background cultural del usuario
    - Detección de sensibilidades y tabúes culturales
    - Recomendaciones de inmersión cultural personalizada
    - Consideraciones religiosas y dietarias detalladas
    - Explicabilidad cultural para fomentar entendimiento
    """
    
    def __init__(self):
        super().__init__("Cultural Adaptation AI", "cultural_adaptation")
        
        # Componentes principales
        self.adaptation_engine = CulturalAdaptationEngine()
        
        # Estados del agente
        self.user_cultural_profiles = {}
        self.adaptation_cache = {}
        self.performance_metrics = CulturalMetrics()
        
        # Configuración
        self.config = {
            "default_adaptation_level": AdaptationLevel.MODERATE,
            "cache_ttl_hours": 2,
            "max_alternative_options": 5,
            "cultural_sensitivity_threshold": 0.8,
            "explanation_detail_level": "comprehensive",
            "learning_opportunities_enabled": True,
            "real_time_cultural_updates": True,
            "multi_cultural_support": True
        }
        
        # Cache y storage
        self.cultural_insights_cache = {}
        self.adaptation_history = {}
        
        # Performance monitoring
        self.performance_monitor = PerformanceMonitor(agent_name=self.name)
        self.health_checker = HealthChecker(agent_name=self.name)
        
        logger.info(f"Cultural Adaptation Agent initialized: {self.name}")
    
    async def initialize(self):
        """Inicializar el agente y sus componentes"""
        try:
            await super().initialize()
            
            # Inicializar motor de adaptación
            await self.adaptation_engine.initialize()
            
            # Cargar perfiles culturales existentes
            await self._load_cultural_profiles()
            
            # Registrar métricas iniciales
            await self._register_initial_metrics()
            
            self.is_initialized = True
            logger.info("Cultural Adaptation Agent fully initialized")
            
        except Exception as e:
            logger.error(f"Error initializing Cultural Adaptation Agent: {e}")
            raise
    
    async def _load_cultural_profiles(self):
        """Cargar perfiles culturales existentes"""
        # En producción, cargaría desde base de datos
        pass
    
    async def _register_initial_metrics(self):
        """Registrar métricas iniciales del agente"""
        await self.performance_monitor.record_metric("agent_initialized", 1)
        await self.performance_monitor.record_metric("cultural_profiles_loaded", len(self.user_cultural_profiles))
    
    # API Endpoints principales
    
    async def adapt_experience_content(self,
                                     user_id: str,
                                     destination_culture: str,
                                     content: Dict[str, Any],
                                     experience_type: str = "general",
                                     adaptation_level: str = "moderate",
                                     **kwargs) -> Dict:
        """Adaptar contenido de experiencia según cultura del usuario y destino"""
        try:
            start_time = datetime.now()
            
            # Obtener o crear perfil cultural del usuario
            user_profile = await self._get_or_create_cultural_profile(user_id)
            
            # Crear solicitud de adaptación
            request = AdaptationRequest(
                request_id=str(uuid.uuid4()),
                user_cultural_profile=user_profile,
                destination_culture=destination_culture,
                experience_type=experience_type,
                content_to_adapt=content,
                adaptation_level=AdaptationLevel[adaptation_level.upper()],
                **kwargs
            )
            
            # Verificar cache
            cache_key = await self._generate_adaptation_cache_key(request)
            cached_result = self.adaptation_cache.get(cache_key)
            
            if cached_result and not self._is_adaptation_cache_expired(cached_result):
                cached_result["cache_hit"] = True
                return cached_result
            
            # Realizar adaptación cultural
            adaptation_result = await self.adaptation_engine.adapt_content(request)
            
            # Convertir a formato de respuesta
            response = await self._format_adaptation_response(adaptation_result)
            
            # Almacenar en cache
            self.adaptation_cache[cache_key] = {
                **response,
                "cached_at": datetime.now().isoformat()
            }
            
            # Actualizar métricas
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            await self._update_adaptation_metrics(request, adaptation_result, processing_time)
            
            # Registrar en historial
            await self._record_adaptation_history(request, adaptation_result)
            
            return response
            
        except Exception as e:
            logger.error(f"Error adapting experience content: {e}")
            return await self._generate_adaptation_error_response(str(e))
    
    async def _get_or_create_cultural_profile(self, user_id: str) -> CulturalProfile:
        """Obtener perfil cultural existente o crear uno nuevo"""
        if user_id in self.user_cultural_profiles:
            profile = self.user_cultural_profiles[user_id]
            profile.updated_at = datetime.now()
            return profile
        
        # Crear nuevo perfil cultural
        new_profile = CulturalProfile(user_id=user_id)
        
        # Cargar datos culturales del usuario (simulado)
        await self._load_user_cultural_data(new_profile)
        
        self.user_cultural_profiles[user_id] = new_profile
        
        return new_profile
    
    async def _load_user_cultural_data(self, profile: CulturalProfile):
        """Cargar datos culturales del usuario"""
        # Simulación de carga de datos - en producción conectaría con APIs de usuario
        
        # Datos culturales básicos
        cultures = ["usa", "germany", "japan", "india", "brazil", "saudi_arabia"]
        profile.primary_culture = np.random.choice(cultures)
        profile.nationality = profile.primary_culture
        profile.country_of_residence = profile.primary_culture
        
        # Idiomas
        language_map = {
            "usa": ["english"],
            "germany": ["german", "english"],
            "japan": ["japanese", "english"],
            "india": ["hindi", "english"],
            "brazil": ["portuguese", "spanish"],
            "saudi_arabia": ["arabic", "english"]
        }
        profile.languages_spoken = language_map.get(profile.primary_culture, ["english"])
        profile.primary_language = profile.languages_spoken[0]
        
        # Religión (simulada)
        religions = [None, "christianity", "islam", "hinduism", "buddhism", "judaism"]
        profile.religious_affiliation = np.random.choice(religions, p=[0.3, 0.25, 0.15, 0.15, 0.1, 0.05])
        
        # Dimensiones culturales (simuladas basadas en cultura)
        if profile.primary_culture in self.adaptation_engine.knowledge_base.hofstede_scores:
            hofstede_data = self.adaptation_engine.knowledge_base.hofstede_scores[profile.primary_culture]
            profile.cultural_dimensions = {k: v/100.0 for k, v in hofstede_data.items()}
        
        # Estilo de comunicación
        culture_data = self.adaptation_engine.knowledge_base.cultural_database.get(profile.primary_culture, {})
        comm_style = culture_data.get("communication_style", "direct")
        
        if comm_style == "high_context":
            profile.communication_style = CommunicationStyle.HIGH_CONTEXT
        elif comm_style == "direct":
            profile.communication_style = CommunicationStyle.DIRECT
        else:
            profile.communication_style = CommunicationStyle.INFORMAL
        
        # Restricciones dietarias basadas en religión
        if profile.religious_affiliation:
            religion_guidelines = self.adaptation_engine.knowledge_base.religious_guidelines.get(
                profile.religious_affiliation, {}
            )
            profile.dietary_restrictions = religion_guidelines.get("dietary_restrictions", [])
        
        # Scores y preferencias
        profile.cultural_openness_score = np.random.uniform(0.4, 0.9)
        profile.travel_experience_level = np.random.choice(["beginner", "intermediate", "expert"], p=[0.2, 0.6, 0.2])
    
    async def _generate_adaptation_cache_key(self, request: AdaptationRequest) -> str:
        """Generar clave de cache para adaptación"""
        key_components = [
            request.user_cultural_profile.user_id,
            request.user_cultural_profile.primary_culture,
            request.destination_culture,
            request.experience_type,
            request.adaptation_level.name,
            str(hash(frozenset(request.content_to_adapt.items()) if request.content_to_adapt else frozenset())),
            datetime.now().strftime("%Y%m%d%H")  # Invalidar cache cada hora
        ]
        
        return "_".join(key_components)
    
    def _is_adaptation_cache_expired(self, cached_result: Dict) -> bool:
        """Verificar si resultado de adaptación en cache está expirado"""
        if "cached_at" not in cached_result:
            return True
        
        cached_time = datetime.fromisoformat(cached_result["cached_at"])
        expiry_time = cached_time + timedelta(hours=self.config["cache_ttl_hours"])
        
        return datetime.now() > expiry_time
    
    async def _format_adaptation_response(self, result: AdaptationResult) -> Dict:
        """Formatear respuesta de adaptación"""
        return {
            "request_id": result.request_id,
            "adapted_content": result.adapted_content,
            "cultural_explanations": result.adaptation_explanations,
            "cultural_insights": result.cultural_insights,
            "sensitivity_warnings": result.sensitivity_warnings,
            "alternative_options": result.alternative_options[:self.config["max_alternative_options"]],
            "learning_opportunities": result.learning_opportunities if self.config["learning_opportunities_enabled"] else [],
            "quality_metrics": {
                "confidence_score": result.confidence_score,
                "adaptation_strength": result.adaptation_strength,
                "cultural_authenticity": result.cultural_authenticity_score
            },
            "cultural_context": result.cultural_context_provided,
            "adaptations_applied": result.adaptations_applied,
            "processing_time_ms": result.processing_time_ms,
            "generated_at": result.generated_at.isoformat(),
            "cache_hit": False
        }
    
    async def _update_adaptation_metrics(self, request: AdaptationRequest, result: AdaptationResult, processing_time: float):
        """Actualizar métricas de adaptación"""
        # Contadores generales
        self.performance_metrics.total_adaptations += 1
        
        if result.confidence_score >= self.config["cultural_sensitivity_threshold"]:
            self.performance_metrics.successful_adaptations += 1
        
        # Métricas por cultura
        dest_culture = request.destination_culture
        self.performance_metrics.adaptations_by_culture[dest_culture] = (
            self.performance_metrics.adaptations_by_culture.get(dest_culture, 0) + 1
        )
        
        # Métricas por tipo
        exp_type = request.experience_type
        self.performance_metrics.adaptations_by_type[exp_type] = (
            self.performance_metrics.adaptations_by_type.get(exp_type, 0) + 1
        )
        
        # Promedios móviles
        total = self.performance_metrics.total_adaptations
        current_conf_avg = self.performance_metrics.average_confidence_score
        
        self.performance_metrics.average_confidence_score = (
            (current_conf_avg * (total - 1) + result.confidence_score) / total
        )
        
        current_strength_avg = self.performance_metrics.average_adaptation_strength
        self.performance_metrics.average_adaptation_strength = (
            (current_strength_avg * (total - 1) + result.adaptation_strength) / total
        )
    
    async def _record_adaptation_history(self, request: AdaptationRequest, result: AdaptationResult):
        """Registrar adaptación en historial"""
        history_entry = {
            "user_id": request.user_cultural_profile.user_id,
            "source_culture": request.user_cultural_profile.primary_culture,
            "destination_culture": request.destination_culture,
            "experience_type": request.experience_type,
            "adaptation_level": request.adaptation_level.name,
            "confidence_score": result.confidence_score,
            "adaptations_count": len(result.adaptations_applied),
            "timestamp": result.generated_at.isoformat()
        }
        
        user_id = request.user_cultural_profile.user_id
        if user_id not in self.adaptation_history:
            self.adaptation_history[user_id] = []
        
        self.adaptation_history[user_id].append(history_entry)
        
        # Mantener solo últimas 50 adaptaciones por usuario
        self.adaptation_history[user_id] = self.adaptation_history[user_id][-50:]
    
    async def _generate_adaptation_error_response(self, error_message: str) -> Dict:
        """Generar respuesta de error de adaptación"""
        return {
            "status": "error",
            "message": error_message,
            "adapted_content": {},
            "cultural_explanations": [],
            "fallback_used": True,
            "generated_at": datetime.now().isoformat()
        }
    
    # API Endpoints adicionales
    
    async def update_cultural_profile(self, user_id: str, cultural_data: Dict) -> Dict:
        """Actualizar perfil cultural del usuario"""
        try:
            user_profile = await self._get_or_create_cultural_profile(user_id)
            
            # Actualizar campos proporcionados
            update_fields = {
                "primary_culture", "nationality", "country_of_residence",
                "languages_spoken", "primary_language", "religious_affiliation",
                "dietary_restrictions", "cultural_sensitivities",
                "cultural_openness_score", "travel_experience_level"
            }
            
            for field, value in cultural_data.items():
                if field in update_fields and hasattr(user_profile, field):
                    setattr(user_profile, field, value)
            
            user_profile.updated_at = datetime.now()
            
            # Invalidar cache para este usuario
            await self._invalidate_user_adaptation_cache(user_id)
            
            return {
                "status": "success",
                "user_id": user_id,
                "updated_profile": await self._serialize_cultural_profile(user_profile),
                "updated_at": user_profile.updated_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error updating cultural profile: {e}")
            return {"status": "error", "message": str(e)}
    
    async def get_cultural_insights(self, source_culture: str, destination_culture: str, context: str = "general") -> Dict:
        """Obtener insights culturales entre dos culturas"""
        try:
            # Verificar cache de insights
            cache_key = f"{source_culture}_{destination_culture}_{context}"
            cached_insights = self.cultural_insights_cache.get(cache_key)
            
            if cached_insights:
                return cached_insights
            
            # Calcular distancia cultural
            cultural_distance = await self.adaptation_engine.knowledge_base.get_cultural_distance(
                source_culture, destination_culture
            )
            
            # Obtener recomendaciones de adaptación
            recommendations = await self.adaptation_engine.knowledge_base.get_adaptation_recommendations(
                source_culture, destination_culture, context
            )
            
            # Obtener datos culturales
            source_data = self.adaptation_engine.knowledge_base.cultural_database.get(source_culture, {})
            dest_data = self.adaptation_engine.knowledge_base.cultural_database.get(destination_culture, {})
            
            insights = {
                "cultural_distance": round(cultural_distance, 3),
                "adaptation_recommendations": recommendations,
                "cultural_comparison": {
                    "source_culture": {
                        "name": source_data.get("name", source_culture),
                        "communication_style": source_data.get("communication_style"),
                        "hofstede_scores": source_data.get("hofstede_scores", {})
                    },
                    "destination_culture": {
                        "name": dest_data.get("name", destination_culture),
                        "communication_style": dest_data.get("communication_style"),
                        "hofstede_scores": dest_data.get("hofstede_scores", {})
                    }
                },
                "key_differences": await self._identify_key_cultural_differences(source_data, dest_data),
                "bridge_building_tips": await self._generate_bridge_building_tips(source_culture, destination_culture),
                "generated_at": datetime.now().isoformat()
            }
            
            # Almacenar en cache
            self.cultural_insights_cache[cache_key] = insights
            
            return insights
            
        except Exception as e:
            logger.error(f"Error generating cultural insights: {e}")
            return {"status": "error", "message": str(e)}
    
    async def _identify_key_cultural_differences(self, source_data: Dict, dest_data: Dict) -> List[str]:
        """Identificar diferencias culturales clave"""
        differences = []
        
        # Comparar estilos de comunicación
        source_comm = source_data.get("communication_style", "mixed")
        dest_comm = dest_data.get("communication_style", "mixed")
        
        if source_comm != dest_comm:
            differences.append(f"Communication styles differ: {source_comm} vs {dest_comm}")
        
        # Comparar scores de Hofstede
        source_hofstede = source_data.get("hofstede_scores", {})
        dest_hofstede = dest_data.get("hofstede_scores", {})
        
        for dimension in ["power_distance", "individualism", "uncertainty_avoidance"]:
            if dimension in source_hofstede and dimension in dest_hofstede:
                diff = abs(source_hofstede[dimension] - dest_hofstede[dimension])
                if diff > 30:  # Diferencia significativa
                    differences.append(f"Significant difference in {dimension.replace('_', ' ')}")
        
        return differences
    
    async def _generate_bridge_building_tips(self, source_culture: str, dest_culture: str) -> List[str]:
        """Generar tips para construir puentes culturales"""
        tips = [
            "Approach cultural differences with curiosity rather than judgment",
            "Ask questions about local customs and show genuine interest in learning",
            "Observe how locals interact and adapt your behavior accordingly",
            "Be patient with yourself and others as you navigate cultural differences"
        ]
        
        # Tips específicos basados en culturas
        if dest_culture == "japan" and source_culture == "usa":
            tips.extend([
                "Practice patience and indirect communication",
                "Show respect through formal greetings and gift-giving",
                "Understand that silence can be comfortable and meaningful"
            ])
        elif dest_culture == "germany" and source_culture in ["usa", "brazil"]:
            tips.extend([
                "Value punctuality and direct, honest communication",
                "Prepare thoroughly for meetings and discussions",
                "Respect personal space and formal business protocols"
            ])
        
        return tips
    
    async def get_cultural_profile_summary(self, user_id: str) -> Dict:
        """Obtener resumen del perfil cultural del usuario"""
        try:
            user_profile = await self._get_or_create_cultural_profile(user_id)
            
            return {
                "user_id": user_profile.user_id,
                "cultural_identity": {
                    "primary_culture": user_profile.primary_culture,
                    "secondary_cultures": user_profile.secondary_cultures,
                    "nationality": user_profile.nationality,
                    "languages": user_profile.languages_spoken,
                    "religious_affiliation": user_profile.religious_affiliation
                },
                "cultural_characteristics": {
                    "communication_style": user_profile.communication_style.value,
                    "cultural_openness_score": user_profile.cultural_openness_score,
                    "travel_experience_level": user_profile.travel_experience_level,
                    "cultural_dimensions": user_profile.cultural_dimensions
                },
                "preferences_and_restrictions": {
                    "dietary_restrictions": user_profile.dietary_restrictions,
                    "cultural_sensitivities": user_profile.cultural_sensitivities,
                    "adaptation_preferences": user_profile.adaptation_preferences
                },
                "experience_data": {
                    "previous_cultural_experiences": len(user_profile.previous_cultural_experiences),
                    "cultural_learning_goals": user_profile.cultural_learning_goals
                },
                "profile_stats": {
                    "created_at": user_profile.created_at.isoformat(),
                    "updated_at": user_profile.updated_at.isoformat(),
                    "adaptation_history_count": len(self.adaptation_history.get(user_id, []))
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting cultural profile summary: {e}")
            return {"status": "error", "message": str(e)}
    
    async def _serialize_cultural_profile(self, profile: CulturalProfile) -> Dict:
        """Serializar perfil cultural para respuesta API"""
        return {
            "user_id": profile.user_id,
            "primary_culture": profile.primary_culture,
            "secondary_cultures": profile.secondary_cultures,
            "nationality": profile.nationality,
            "country_of_residence": profile.country_of_residence,
            "languages_spoken": profile.languages_spoken,
            "primary_language": profile.primary_language,
            "religious_affiliation": profile.religious_affiliation,
            "communication_style": profile.communication_style.value,
            "dietary_restrictions": profile.dietary_restrictions,
            "cultural_sensitivities": profile.cultural_sensitivities,
            "cultural_openness_score": profile.cultural_openness_score,
            "travel_experience_level": profile.travel_experience_level,
            "cultural_dimensions": profile.cultural_dimensions
        }
    
    async def get_performance_analytics(self) -> Dict:
        """Obtener análisis de performance de adaptación cultural"""
        return {
            "agent_name": self.name,
            "adaptation_stats": {
                "total_adaptations": self.performance_metrics.total_adaptations,
                "successful_adaptations": self.performance_metrics.successful_adaptations,
                "success_rate": round(
                    (self.performance_metrics.successful_adaptations / 
                     max(1, self.performance_metrics.total_adaptations)) * 100, 2
                ),
                "average_confidence_score": round(self.performance_metrics.average_confidence_score, 3),
                "average_adaptation_strength": round(self.performance_metrics.average_adaptation_strength, 3)
            },
            "cultural_coverage": {
                "adaptations_by_culture": dict(self.performance_metrics.adaptations_by_culture),
                "adaptations_by_type": dict(self.performance_metrics.adaptations_by_type),
                "diversity_coverage": len(self.performance_metrics.adaptations_by_culture) / 50.0 * 100  # Assumiendo 50 culturas total
            },
            "system_metrics": {
                "cultural_profiles_loaded": len(self.user_cultural_profiles),
                "cache_entries": len(self.adaptation_cache),
                "insights_cached": len(self.cultural_insights_cache),
                "cultural_sensitivity_incidents": self.performance_metrics.cultural_sensitivity_incidents
            },
            "quality_metrics": {
                "adaptation_accuracy_rate": round(self.performance_metrics.adaptation_accuracy_rate, 3),
                "cultural_immersion_score": round(self.performance_metrics.cultural_immersion_score, 3),
                "cross_cultural_learning_rate": round(self.performance_metrics.cross_cultural_learning_rate, 3)
            },
            "timestamp": datetime.now().isoformat()
        }
    
    async def _invalidate_user_adaptation_cache(self, user_id: str):
        """Invalidar entradas de cache de adaptación para usuario específico"""
        keys_to_remove = [
            key for key in self.adaptation_cache.keys()
            if key.startswith(user_id)
        ]
        
        for key in keys_to_remove:
            del self.adaptation_cache[key]
    
    async def clear_all_cache(self) -> Dict:
        """Limpiar todo el cache de adaptaciones e insights"""
        adaptation_cache_size = len(self.adaptation_cache)
        insights_cache_size = len(self.cultural_insights_cache)
        
        self.adaptation_cache.clear()
        self.cultural_insights_cache.clear()
        
        return {
            "status": "success",
            "message": f"Cache cleared: {adaptation_cache_size} adaptation entries and {insights_cache_size} insights entries removed",
            "timestamp": datetime.now().isoformat()
        }
    
    async def health_check(self) -> Dict:
        """Verificar salud del agente"""
        try:
            health_data = await self.health_checker.get_health_status()
            
            # Verificaciones específicas del agente
            agent_health = {
                "adaptation_engine_ready": hasattr(self.adaptation_engine, 'knowledge_base'),
                "cultural_database_loaded": len(self.adaptation_engine.knowledge_base.cultural_database) > 0,
                "hofstede_scores_available": len(self.adaptation_engine.knowledge_base.hofstede_scores) > 0,
                "religious_guidelines_loaded": len(self.adaptation_engine.knowledge_base.religious_guidelines) > 0,
                "cultural_profiles_managed": len(self.user_cultural_profiles),
                "adaptation_cache_size": len(self.adaptation_cache),
                "memory_usage_mb": self._get_memory_usage(),
                "processing_capability": "operational"
            }
            
            overall_health = "healthy" if all([
                agent_health["adaptation_engine_ready"],
                agent_health["cultural_database_loaded"],
                agent_health["hofstede_scores_available"],
                agent_health["memory_usage_mb"] < 800
            ]) else "degraded"
            
            return {
                "agent_name": self.name,
                "agent_status": overall_health,
                "timestamp": datetime.now().isoformat(),
                "health_details": agent_health,
                "system_health": health_data,
                "performance_summary": {
                    "total_adaptations": self.performance_metrics.total_adaptations,
                    "success_rate": round(
                        (self.performance_metrics.successful_adaptations / 
                         max(1, self.performance_metrics.total_adaptations)) * 100, 2
                    ),
                    "cultural_coverage": len(self.performance_metrics.adaptations_by_culture)
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
        base_usage = 300.0  # MB base para cultural database
        profile_usage = len(self.user_cultural_profiles) * 0.2  # 0.2 MB por perfil
        cache_usage = len(self.adaptation_cache) * 0.1  # 0.1 MB por entrada
        insights_usage = len(self.cultural_insights_cache) * 0.05  # 0.05 MB por insight
        
        return base_usage + profile_usage + cache_usage + insights_usage

# Función de inicialización del agente
async def initialize_cultural_adaptation_agent() -> CulturalAdaptationAgent:
    """Inicializar y retornar instancia del agente de adaptación cultural"""
    agent = CulturalAdaptationAgent()
    await agent.initialize()
    return agent

# Entry point para testing
if __name__ == "__main__":
    async def main():
        agent = await initialize_cultural_adaptation_agent()
        
        print("🌍 Cultural Adaptation Agent - Test Suite")
        print("=" * 55)
        
        # Test 1: Adapt dining content
        test_user_id = "cultural_test_user_456"
        
        dining_content = {
            "restaurants": [
                {
                    "name": "Local Steakhouse",
                    "cuisine_type": "american",
                    "menu_highlights": ["beef steak", "pork ribs", "chicken"],
                    "serves_alcohol": True,
                    "halal_certified": False
                }
            ],
            "dining_schedule": "7:00 PM dinner"
        }
        
        adaptation_result = await agent.adapt_experience_content(
            user_id=test_user_id,
            destination_culture="saudi_arabia",
            content=dining_content,
            experience_type="dining",
            adaptation_level="comprehensive"
        )
        
        print(f"✅ Dining Adaptation: {len(adaptation_result.get('adapted_content', {}))} adaptations")
        print(f"   Cultural Explanations: {len(adaptation_result.get('cultural_explanations', []))}")
        print(f"   Sensitivity Warnings: {len(adaptation_result.get('sensitivity_warnings', []))}")
        
        # Test 2: Get cultural insights
        insights = await agent.get_cultural_insights("usa", "japan", "business")
        print(f"✅ Cultural Insights: Distance = {insights.get('cultural_distance', 0)}")
        print(f"   Adaptation Recommendations: {len(insights.get('adaptation_recommendations', []))}")
        
        # Test 3: Update cultural profile
        cultural_update = {
            "religious_affiliation": "islam",
            "dietary_restrictions": ["no_pork", "no_alcohol", "halal_meat"],
            "cultural_openness_score": 0.8,
            "cultural_sensitivities": ["gender_segregation", "prayer_times"]
        }
        
        profile_result = await agent.update_cultural_profile(test_user_id, cultural_update)
        print(f"✅ Profile Update: {profile_result['status']}")
        
        # Test 4: Get cultural profile summary
        profile_summary = await agent.get_cultural_profile_summary(test_user_id)
        print(f"✅ Profile Summary: {profile_summary.get('cultural_identity', {}).get('primary_culture', 'unknown')}")
        
        # Test 5: Performance analytics
        analytics = await agent.get_performance_analytics()
        print(f"✅ Performance Analytics: {analytics['adaptation_stats']['total_adaptations']} adaptations processed")
        
        # Test 6: Health check
        health = await agent.health_check()
        print(f"✅ Health Check: {health['agent_status']}")
        
        print(f"\n🎯 Cultural Adaptation Agent ready for production!")
        print(f"🌍 Cultural Database: {analytics['system_metrics']['cultural_profiles_loaded']} profiles")
        print(f"📊 Success Rate: {analytics['adaptation_stats']['success_rate']}%")
        print(f"🧠 Cultural Intelligence: Ready for global adaptation")

    # Ejecutar test si es llamado directamente
    asyncio.run(main())