#!/usr/bin/env python3
"""
Spirit Tours - WellnessOptimizer AI Agent
Sistema de Optimización Avanzada de Bienestar y Salud Turística

Este agente utiliza IA avanzada para:
- Análisis de perfiles de salud y bienestar de turistas
- Recomendaciones personalizadas de actividades saludables
- Monitoreo de condiciones ambientales y su impacto en la salud
- Sugerencias nutricionales y de hidratación por destino
- Alertas médicas y de seguridad en tiempo real
- Integración con dispositivos wearables para tracking
- Planes de recuperación post-viaje

Author: Spirit Tours AI Development Team
Version: 1.0.0
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass, field
from enum import Enum
import uuid
import aiohttp
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import redis.asyncio as redis
import hashlib
from collections import defaultdict, Counter
import math
import statistics
import pickle
from pathlib import Path

# Import base agent
import sys
sys.path.append(str(Path(__file__).parent.parent))
from base_agent import BaseAgent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WellnessCategory(Enum):
    """Categorías de bienestar"""
    PHYSICAL_ACTIVITY = "physical_activity"
    MENTAL_HEALTH = "mental_health"
    NUTRITION = "nutrition"
    SLEEP_RECOVERY = "sleep_recovery"
    STRESS_MANAGEMENT = "stress_management"
    ENVIRONMENTAL_WELLNESS = "environmental_wellness"
    SOCIAL_WELLNESS = "social_wellness"
    PREVENTIVE_CARE = "preventive_care"

class HealthRiskLevel(Enum):
    """Niveles de riesgo de salud"""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"

class ActivityIntensity(Enum):
    """Intensidades de actividad"""
    LIGHT = "light"
    MODERATE = "moderate"
    VIGOROUS = "vigorous"
    EXTREME = "extreme"

@dataclass
class HealthProfile:
    """Perfil de salud del turista"""
    profile_id: str
    customer_id: str
    age: int
    gender: str
    height_cm: int
    weight_kg: float
    bmi: float = field(init=False)
    fitness_level: str = "average"  # beginner, average, advanced, expert
    medical_conditions: List[str] = field(default_factory=list)
    medications: List[str] = field(default_factory=list)
    allergies: List[str] = field(default_factory=list)
    dietary_restrictions: List[str] = field(default_factory=list)
    activity_preferences: List[str] = field(default_factory=list)
    wearable_devices: List[str] = field(default_factory=list)
    emergency_contact: Dict[str, str] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        """Calculate BMI after initialization"""
        self.bmi = self.weight_kg / ((self.height_cm / 100) ** 2)

@dataclass
class EnvironmentalConditions:
    """Condiciones ambientales del destino"""
    location: str
    temperature_celsius: float
    humidity_percent: float
    air_quality_index: int
    uv_index: float
    altitude_meters: int
    pollen_count: int
    pollution_level: str
    water_quality_score: int
    timezone: str
    sunrise_time: str
    sunset_time: str
    weather_conditions: List[str] = field(default_factory=list)
    health_alerts: List[str] = field(default_factory=list)

@dataclass
class WellnessActivity:
    """Actividad de bienestar recomendada"""
    activity_id: str
    name: str
    category: WellnessCategory
    description: str
    intensity: ActivityIntensity
    duration_minutes: int
    calories_burned_estimate: int
    health_benefits: List[str] = field(default_factory=list)
    precautions: List[str] = field(default_factory=list)
    equipment_needed: List[str] = field(default_factory=list)
    suitable_for_conditions: List[str] = field(default_factory=list)
    contraindications: List[str] = field(default_factory=list)
    optimal_time_of_day: List[str] = field(default_factory=list)
    seasonal_availability: Dict[str, bool] = field(default_factory=dict)

@dataclass
class NutritionalRecommendation:
    """Recomendación nutricional"""
    recommendation_id: str
    meal_type: str  # breakfast, lunch, dinner, snack
    local_foods: List[str] = field(default_factory=list)
    nutritional_benefits: List[str] = field(default_factory=list)
    caloric_content: int = 0
    hydration_recommendation: str = ""
    foods_to_avoid: List[str] = field(default_factory=list)
    cultural_significance: str = ""
    allergen_warnings: List[str] = field(default_factory=list)

@dataclass
class WellnessAlert:
    """Alerta de bienestar"""
    alert_id: str
    customer_id: str
    alert_type: str  # health, safety, environmental, medical
    severity: HealthRiskLevel
    title: str
    message: str
    recommendations: List[str] = field(default_factory=list)
    urgent: bool = False
    created_at: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None
    acknowledged: bool = False

@dataclass
class WellnessPlan:
    """Plan integral de bienestar"""
    plan_id: str
    customer_id: str
    destination: str
    travel_dates: Tuple[datetime, datetime]
    health_profile: HealthProfile
    daily_activities: Dict[str, List[WellnessActivity]] = field(default_factory=dict)
    nutrition_plan: Dict[str, List[NutritionalRecommendation]] = field(default_factory=dict)
    hydration_schedule: Dict[str, str] = field(default_factory=dict)
    recovery_recommendations: List[str] = field(default_factory=list)
    wellness_score: float = 0.0
    personalization_factors: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)

class WellnessAnalytics:
    """Analytics avanzados de bienestar"""
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.wellness_model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.activity_recommender = KMeans(n_clusters=8, random_state=42)
        self.health_risk_analyzer = RandomForestRegressor(n_estimators=50, random_state=42)
        
    async def analyze_health_compatibility(self, 
                                         health_profile: HealthProfile, 
                                         activity: WellnessActivity,
                                         environmental_conditions: EnvironmentalConditions) -> Dict[str, Any]:
        """Analiza compatibilidad entre perfil de salud, actividad y condiciones"""
        
        compatibility_score = 0.0
        risk_factors = []
        recommendations = []
        
        # Factor de edad
        age_factor = self._calculate_age_factor(health_profile.age, activity.intensity)
        compatibility_score += age_factor * 0.2
        
        # Factor de condición física
        fitness_factor = self._calculate_fitness_factor(health_profile.fitness_level, activity.intensity)
        compatibility_score += fitness_factor * 0.25
        
        # Factor de condiciones médicas
        medical_factor, medical_risks = self._analyze_medical_conditions(
            health_profile.medical_conditions, activity, environmental_conditions
        )
        compatibility_score += medical_factor * 0.2
        risk_factors.extend(medical_risks)
        
        # Factor ambiental
        environmental_factor, env_risks = self._analyze_environmental_impact(
            environmental_conditions, health_profile, activity
        )
        compatibility_score += environmental_factor * 0.15
        risk_factors.extend(env_risks)
        
        # Factor de alergias
        allergy_factor, allergy_risks = self._check_allergy_risks(
            health_profile.allergies, activity, environmental_conditions
        )
        compatibility_score += allergy_factor * 0.1
        risk_factors.extend(allergy_risks)
        
        # Factor BMI
        bmi_factor = self._calculate_bmi_factor(health_profile.bmi, activity.intensity)
        compatibility_score += bmi_factor * 0.1
        
        # Generar recomendaciones
        if compatibility_score < 0.4:
            recommendations.append("Considere actividades de menor intensidad")
            recommendations.append("Consulte con un profesional médico antes del viaje")
        elif compatibility_score < 0.7:
            recommendations.append("Tome precauciones adicionales durante la actividad")
            recommendations.append("Mantenga hidratación constante")
        else:
            recommendations.append("Actividad altamente compatible con su perfil")
            
        return {
            "compatibility_score": min(max(compatibility_score, 0.0), 1.0),
            "risk_level": self._determine_risk_level(compatibility_score, risk_factors),
            "risk_factors": risk_factors,
            "recommendations": recommendations,
            "safe_duration_minutes": self._calculate_safe_duration(compatibility_score, activity.duration_minutes),
            "optimal_conditions": self._suggest_optimal_conditions(health_profile, activity)
        }
    
    def _calculate_age_factor(self, age: int, intensity: ActivityIntensity) -> float:
        """Calcula factor de compatibilidad basado en edad"""
        if intensity == ActivityIntensity.LIGHT:
            return 1.0
        elif intensity == ActivityIntensity.MODERATE:
            if 18 <= age <= 65:
                return 0.9
            elif age > 65:
                return 0.6
            else:
                return 0.7
        elif intensity == ActivityIntensity.VIGOROUS:
            if 18 <= age <= 45:
                return 0.8
            elif 45 < age <= 65:
                return 0.5
            else:
                return 0.2
        else:  # EXTREME
            if 18 <= age <= 35:
                return 0.6
            else:
                return 0.1
                
    def _calculate_fitness_factor(self, fitness_level: str, intensity: ActivityIntensity) -> float:
        """Calcula factor de condición física"""
        fitness_scores = {
            "beginner": {"light": 0.9, "moderate": 0.4, "vigorous": 0.2, "extreme": 0.0},
            "average": {"light": 1.0, "moderate": 0.8, "vigorous": 0.5, "extreme": 0.2},
            "advanced": {"light": 1.0, "moderate": 1.0, "vigorous": 0.9, "extreme": 0.6},
            "expert": {"light": 1.0, "moderate": 1.0, "vigorous": 1.0, "extreme": 0.9}
        }
        
        return fitness_scores.get(fitness_level, {}).get(intensity.value, 0.5)
    
    def _analyze_medical_conditions(self, 
                                  conditions: List[str], 
                                  activity: WellnessActivity,
                                  env_conditions: EnvironmentalConditions) -> Tuple[float, List[str]]:
        """Analiza condiciones médicas y riesgos"""
        
        high_risk_conditions = [
            "heart_disease", "hypertension", "diabetes", "asthma", "copd",
            "epilepsy", "severe_arthritis", "recent_surgery"
        ]
        
        moderate_risk_conditions = [
            "mild_arthritis", "allergic_rhinitis", "migraine", "anxiety",
            "depression", "osteoporosis"
        ]
        
        risk_factors = []
        base_score = 1.0
        
        for condition in conditions:
            condition_lower = condition.lower().replace(" ", "_")
            
            if any(risk in condition_lower for risk in high_risk_conditions):
                base_score -= 0.3
                risk_factors.append(f"Condición médica de alto riesgo: {condition}")
                
                # Riesgos específicos por actividad
                if "heart" in condition_lower and activity.intensity in [ActivityIntensity.VIGOROUS, ActivityIntensity.EXTREME]:
                    risk_factors.append("Actividad de alta intensidad no recomendada para condición cardíaca")
                
                if "asthma" in condition_lower and env_conditions.air_quality_index > 100:
                    risk_factors.append("Calidad del aire pobre puede agravar el asma")
                    
            elif any(risk in condition_lower for risk in moderate_risk_conditions):
                base_score -= 0.15
                risk_factors.append(f"Condición médica de riesgo moderado: {condition}")
                
        return max(base_score, 0.0), risk_factors
    
    def _analyze_environmental_impact(self, 
                                    env_conditions: EnvironmentalConditions,
                                    health_profile: HealthProfile,
                                    activity: WellnessActivity) -> Tuple[float, List[str]]:
        """Analiza impacto de condiciones ambientales"""
        
        risk_factors = []
        base_score = 1.0
        
        # Temperatura extrema
        if env_conditions.temperature_celsius > 35 or env_conditions.temperature_celsius < 0:
            base_score -= 0.3
            risk_factors.append("Temperaturas extremas pueden ser peligrosas")
            
        # Calidad del aire
        if env_conditions.air_quality_index > 150:
            base_score -= 0.4
            risk_factors.append("Calidad del aire muy pobre")
        elif env_conditions.air_quality_index > 100:
            base_score -= 0.2
            risk_factors.append("Calidad del aire moderadamente pobre")
            
        # Índice UV alto
        if env_conditions.uv_index > 8:
            base_score -= 0.2
            risk_factors.append("Índice UV muy alto - riesgo de quemaduras")
            
        # Altitud elevada
        if env_conditions.altitude_meters > 2500:
            base_score -= 0.3
            risk_factors.append("Altitud elevada puede causar mal de montaña")
            
        # Humedad extrema
        if env_conditions.humidity_percent > 85:
            base_score -= 0.15
            risk_factors.append("Humedad muy alta puede dificultar la regulación térmica")
            
        return max(base_score, 0.0), risk_factors
    
    def _check_allergy_risks(self, 
                           allergies: List[str],
                           activity: WellnessActivity,
                           env_conditions: EnvironmentalConditions) -> Tuple[float, List[str]]:
        """Verifica riesgos por alergias"""
        
        risk_factors = []
        base_score = 1.0
        
        for allergy in allergies:
            allergy_lower = allergy.lower()
            
            # Alergias ambientales
            if "pollen" in allergy_lower and env_conditions.pollen_count > 50:
                base_score -= 0.3
                risk_factors.append("Alto recuento de polen puede desencadenar alergias")
                
            if "dust" in allergy_lower and env_conditions.air_quality_index > 100:
                base_score -= 0.2
                risk_factors.append("Calidad del aire pobre puede contener alérgenos")
                
            # Alergias a animales
            if any(animal in allergy_lower for animal in ["cat", "dog", "horse", "animal"]):
                if activity.category == WellnessCategory.PHYSICAL_ACTIVITY:
                    risk_factors.append("Algunas actividades pueden involucrar contacto con animales")
                    
        return max(base_score, 0.0), risk_factors
    
    def _calculate_bmi_factor(self, bmi: float, intensity: ActivityIntensity) -> float:
        """Calcula factor basado en BMI"""
        if 18.5 <= bmi <= 24.9:  # Normal
            return 1.0
        elif 25 <= bmi <= 29.9:  # Sobrepeso
            if intensity in [ActivityIntensity.VIGOROUS, ActivityIntensity.EXTREME]:
                return 0.6
            else:
                return 0.8
        elif bmi >= 30:  # Obeso
            if intensity == ActivityIntensity.LIGHT:
                return 0.7
            elif intensity == ActivityIntensity.MODERATE:
                return 0.4
            else:
                return 0.2
        else:  # Bajo peso
            if intensity in [ActivityIntensity.VIGOROUS, ActivityIntensity.EXTREME]:
                return 0.5
            else:
                return 0.8
    
    def _determine_risk_level(self, compatibility_score: float, risk_factors: List[str]) -> HealthRiskLevel:
        """Determina nivel de riesgo global"""
        if compatibility_score >= 0.8 and len(risk_factors) == 0:
            return HealthRiskLevel.LOW
        elif compatibility_score >= 0.6 and len(risk_factors) <= 2:
            return HealthRiskLevel.MODERATE
        elif compatibility_score >= 0.3:
            return HealthRiskLevel.HIGH
        else:
            return HealthRiskLevel.CRITICAL
    
    def _calculate_safe_duration(self, compatibility_score: float, original_duration: int) -> int:
        """Calcula duración segura de actividad"""
        if compatibility_score >= 0.8:
            return original_duration
        elif compatibility_score >= 0.6:
            return int(original_duration * 0.8)
        elif compatibility_score >= 0.4:
            return int(original_duration * 0.6)
        else:
            return int(original_duration * 0.3)
    
    def _suggest_optimal_conditions(self, health_profile: HealthProfile, activity: WellnessActivity) -> Dict[str, str]:
        """Sugiere condiciones óptimas para la actividad"""
        suggestions = {}
        
        # Temperatura óptima
        if activity.intensity == ActivityIntensity.VIGOROUS:
            suggestions["temperature"] = "15-25°C para mejor rendimiento"
        else:
            suggestions["temperature"] = "18-28°C para comodidad"
            
        # Horario óptimo
        if health_profile.age > 60:
            suggestions["time"] = "Mañana temprano o tarde para evitar calor extremo"
        else:
            suggestions["time"] = "Cualquier momento con condiciones ambientales adecuadas"
            
        # Hidratación
        suggestions["hydration"] = "Beber 200ml de agua cada 15-20 minutos durante actividad intensa"
        
        return suggestions

class WellnessRecommendationEngine:
    """Motor de recomendaciones de bienestar"""
    
    def __init__(self):
        self.analytics = WellnessAnalytics()
        self.activity_database = self._initialize_activity_database()
        self.nutrition_database = self._initialize_nutrition_database()
        
    def _initialize_activity_database(self) -> Dict[str, WellnessActivity]:
        """Inicializa base de datos de actividades de bienestar"""
        activities = {}
        
        # Actividades de baja intensidad
        activities["meditation_beach"] = WellnessActivity(
            activity_id="meditation_beach",
            name="Meditación en la Playa",
            category=WellnessCategory.MENTAL_HEALTH,
            description="Sesión de meditación mindfulness con sonido de olas",
            intensity=ActivityIntensity.LIGHT,
            duration_minutes=30,
            calories_burned_estimate=25,
            health_benefits=["Reduce estrés", "Mejora concentración", "Relaja músculos"],
            optimal_time_of_day=["amanecer", "atardecer"],
            suitable_for_conditions=["clima_templado", "viento_suave"]
        )
        
        activities["therapeutic_walking"] = WellnessActivity(
            activity_id="therapeutic_walking",
            name="Caminata Terapéutica",
            category=WellnessCategory.PHYSICAL_ACTIVITY,
            description="Caminata suave en entorno natural con técnicas de respiración",
            intensity=ActivityIntensity.LIGHT,
            duration_minutes=45,
            calories_burned_estimate=120,
            health_benefits=["Mejora circulación", "Fortalece piernas", "Reduce ansiedad"],
            contraindications=["lesiones_pie", "problemas_cardiacos_severos"]
        )
        
        activities["yoga_sunrise"] = WellnessActivity(
            activity_id="yoga_sunrise",
            name="Yoga al Amanecer",
            category=WellnessCategory.PHYSICAL_ACTIVITY,
            description="Sesión de hatha yoga con vista al amanecer",
            intensity=ActivityIntensity.MODERATE,
            duration_minutes=60,
            calories_burned_estimate=180,
            health_benefits=["Mejora flexibilidad", "Fortalece core", "Equilibrio mental"],
            equipment_needed=["esterilla_yoga"],
            optimal_time_of_day=["amanecer"]
        )
        
        # Actividades de intensidad moderada
        activities["cultural_cycling"] = WellnessActivity(
            activity_id="cultural_cycling",
            name="Ciclismo Cultural",
            category=WellnessCategory.PHYSICAL_ACTIVITY,
            description="Tour en bicicleta visitando sitios culturales locales",
            intensity=ActivityIntensity.MODERATE,
            duration_minutes=120,
            calories_burned_estimate=400,
            health_benefits=["Cardio moderado", "Fortalece piernas", "Experiencia cultural"],
            equipment_needed=["bicicleta", "casco"],
            contraindications=["problemas_equilibrio", "lesiones_rodilla"]
        )
        
        activities["aqua_therapy"] = WellnessActivity(
            activity_id="aqua_therapy",
            name="Terapia Acuática",
            category=WellnessCategory.PHYSICAL_ACTIVITY,
            description="Ejercicios terapéuticos en piscina o mar calmo",
            intensity=ActivityIntensity.MODERATE,
            duration_minutes=45,
            calories_burned_estimate=200,
            health_benefits=["Bajo impacto articular", "Fortalece músculos", "Mejora movilidad"],
            suitable_for_conditions=["agua_limpia", "temperatura_agradable"]
        )
        
        # Actividades de alta intensidad
        activities["mountain_hiking"] = WellnessActivity(
            activity_id="mountain_hiking",
            name="Senderismo de Montaña",
            category=WellnessCategory.PHYSICAL_ACTIVITY,
            description="Caminata vigorosa en senderos montañosos",
            intensity=ActivityIntensity.VIGOROUS,
            duration_minutes=180,
            calories_burned_estimate=600,
            health_benefits=["Cardio intenso", "Fortalece todo el cuerpo", "Mejora resistencia"],
            equipment_needed=["calzado_montaña", "mochila", "bastones"],
            contraindications=["problemas_cardiacos", "lesiones_articulares", "asma_severa"],
            precautions=["hidratación_constante", "protección_solar", "conocer_límites"]
        )
        
        activities["water_sports"] = WellnessActivity(
            activity_id="water_sports",
            name="Deportes Acuáticos",
            category=WellnessCategory.PHYSICAL_ACTIVITY,
            description="Kayak, paddle surf o windsurf en aguas seguras",
            intensity=ActivityIntensity.VIGOROUS,
            duration_minutes=90,
            calories_burned_estimate=450,
            health_benefits=["Cardio completo", "Fortalece core", "Mejora coordinación"],
            equipment_needed=["chaleco_salvavidas", "equipo_específico"],
            contraindications=["miedo_agua", "problemas_equilibrio"],
            suitable_for_conditions=["agua_calma", "visibilidad_buena"]
        )
        
        return activities
        
    def _initialize_nutrition_database(self) -> Dict[str, List[NutritionalRecommendation]]:
        """Inicializa base de datos nutricional por región"""
        nutrition_db = {}
        
        # Mediterráneo
        nutrition_db["mediterraneo"] = [
            NutritionalRecommendation(
                recommendation_id="med_breakfast",
                meal_type="breakfast",
                local_foods=["aceite_oliva", "pan_integral", "tomate", "jamón_ibérico"],
                nutritional_benefits=["Grasas saludables", "Fibra", "Proteínas"],
                caloric_content=350,
                hydration_recommendation="Agua con limón o té verde",
                cultural_significance="Desayuno tradicional español rico en antioxidantes"
            ),
            NutritionalRecommendation(
                recommendation_id="med_lunch",
                meal_type="lunch",
                local_foods=["pescado_azul", "verduras_temporada", "arroz", "legumbres"],
                nutritional_benefits=["Omega-3", "Vitaminas", "Carbohidratos complejos"],
                caloric_content=550,
                hydration_recommendation="Agua abundante, evitar alcohol en exceso",
                foods_to_avoid=["fritos_industriales", "salsas_procesadas"]
            )
        ]
        
        # Tropical
        nutrition_db["tropical"] = [
            NutritionalRecommendation(
                recommendation_id="trop_breakfast",
                meal_type="breakfast",
                local_foods=["frutas_tropicales", "coco", "yogur_natural", "miel_local"],
                nutritional_benefits=["Vitamina C", "Electrolitos", "Probióticos"],
                caloric_content=300,
                hydration_recommendation="Agua de coco natural para electrolitos",
                allergen_warnings=["frutos_secos", "lactosa"]
            ),
            NutritionalRecommendation(
                recommendation_id="trop_snack",
                meal_type="snack",
                local_foods=["mango", "piña", "papaya", "agua_coco"],
                nutritional_benefits=["Hidratación natural", "Antioxidantes", "Fibra"],
                caloric_content=150,
                hydration_recommendation="Complementar con agua pura cada hora"
            )
        ]
        
        return nutrition_db
    
    async def generate_personalized_plan(self, 
                                       health_profile: HealthProfile, 
                                       destination: str,
                                       travel_dates: Tuple[datetime, datetime],
                                       environmental_conditions: EnvironmentalConditions) -> WellnessPlan:
        """Genera plan personalizado de bienestar"""
        
        plan_id = str(uuid.uuid4())
        daily_activities = {}
        nutrition_plan = {}
        
        # Calcular días de viaje
        days = (travel_dates[1] - travel_dates[0]).days + 1
        
        for day in range(days):
            current_date = travel_dates[0] + timedelta(days=day)
            date_str = current_date.strftime("%Y-%m-%d")
            
            # Seleccionar actividades para el día
            day_activities = await self._select_daily_activities(
                health_profile, environmental_conditions, day
            )
            daily_activities[date_str] = day_activities
            
            # Plan nutricional para el día
            day_nutrition = await self._create_daily_nutrition_plan(
                health_profile, destination, environmental_conditions
            )
            nutrition_plan[date_str] = day_nutrition
        
        # Calcular score de bienestar
        wellness_score = await self._calculate_wellness_score(
            health_profile, daily_activities, environmental_conditions
        )
        
        # Recomendaciones de recuperación
        recovery_recs = await self._generate_recovery_recommendations(
            health_profile, daily_activities
        )
        
        plan = WellnessPlan(
            plan_id=plan_id,
            customer_id=health_profile.customer_id,
            destination=destination,
            travel_dates=travel_dates,
            health_profile=health_profile,
            daily_activities=daily_activities,
            nutrition_plan=nutrition_plan,
            wellness_score=wellness_score,
            recovery_recommendations=recovery_recs
        )
        
        return plan
    
    async def _select_daily_activities(self, 
                                     health_profile: HealthProfile,
                                     env_conditions: EnvironmentalConditions,
                                     day_number: int) -> List[WellnessActivity]:
        """Selecciona actividades óptimas para un día específico"""
        
        selected_activities = []
        
        # Progresión gradual de intensidad
        if day_number < 3:  # Primeros días - adaptación
            max_intensity = ActivityIntensity.MODERATE
        elif day_number < 7:  # Días medios - pico de actividad
            max_intensity = ActivityIntensity.VIGOROUS
        else:  # Últimos días - recuperación
            max_intensity = ActivityIntensity.MODERATE
            
        # Evaluar cada actividad
        for activity in self.activity_database.values():
            if self._intensity_level(activity.intensity) <= self._intensity_level(max_intensity):
                
                compatibility = await self.analytics.analyze_health_compatibility(
                    health_profile, activity, env_conditions
                )
                
                if compatibility["risk_level"] in [HealthRiskLevel.LOW, HealthRiskLevel.MODERATE]:
                    selected_activities.append(activity)
                    
                    # Límite de actividades por día
                    if len(selected_activities) >= 3:
                        break
        
        return selected_activities
    
    def _intensity_level(self, intensity: ActivityIntensity) -> int:
        """Convierte intensidad a nivel numérico"""
        levels = {
            ActivityIntensity.LIGHT: 1,
            ActivityIntensity.MODERATE: 2,
            ActivityIntensity.VIGOROUS: 3,
            ActivityIntensity.EXTREME: 4
        }
        return levels.get(intensity, 1)
    
    async def _create_daily_nutrition_plan(self,
                                         health_profile: HealthProfile,
                                         destination: str,
                                         env_conditions: EnvironmentalConditions) -> List[NutritionalRecommendation]:
        """Crea plan nutricional diario"""
        
        # Determinar región nutricional
        region = self._determine_nutritional_region(destination)
        
        # Obtener recomendaciones base
        base_recommendations = self.nutrition_database.get(region, [])
        
        # Personalizar según perfil de salud
        personalized_recs = []
        for rec in base_recommendations:
            # Adaptar por restricciones dietéticas
            adapted_rec = self._adapt_for_dietary_restrictions(rec, health_profile.dietary_restrictions)
            
            # Adaptar por condiciones ambientales
            adapted_rec = self._adapt_for_environment(adapted_rec, env_conditions)
            
            personalized_recs.append(adapted_rec)
            
        return personalized_recs
    
    def _determine_nutritional_region(self, destination: str) -> str:
        """Determina región nutricional del destino"""
        destination_lower = destination.lower()
        
        if any(country in destination_lower for country in ["spain", "italy", "greece", "españa"]):
            return "mediterraneo"
        elif any(region in destination_lower for region in ["caribbean", "tropical", "costa rica"]):
            return "tropical"
        else:
            return "mediterraneo"  # Default
    
    def _adapt_for_dietary_restrictions(self, 
                                      recommendation: NutritionalRecommendation,
                                      restrictions: List[str]) -> NutritionalRecommendation:
        """Adapta recomendación por restricciones dietéticas"""
        
        adapted_rec = recommendation
        
        for restriction in restrictions:
            restriction_lower = restriction.lower()
            
            if "vegetarian" in restriction_lower:
                # Filtrar productos animales
                adapted_rec.local_foods = [
                    food for food in adapted_rec.local_foods 
                    if not any(animal in food for animal in ["pescado", "jamón", "carne"])
                ]
                
            elif "vegan" in restriction_lower:
                # Filtrar todos los productos animales
                adapted_rec.local_foods = [
                    food for food in adapted_rec.local_foods 
                    if not any(animal in food for animal in ["pescado", "jamón", "carne", "yogur", "miel"])
                ]
                
            elif "gluten" in restriction_lower:
                # Filtrar productos con gluten
                adapted_rec.local_foods = [
                    food for food in adapted_rec.local_foods 
                    if "pan" not in food
                ]
                adapted_rec.foods_to_avoid.extend(["pan", "pasta", "cerveza"])
                
        return adapted_rec
    
    def _adapt_for_environment(self, 
                             recommendation: NutritionalRecommendation,
                             env_conditions: EnvironmentalConditions) -> NutritionalRecommendation:
        """Adapta recomendación por condiciones ambientales"""
        
        # Clima caluroso - más hidratación
        if env_conditions.temperature_celsius > 30:
            recommendation.hydration_recommendation += " - Aumentar ingesta a 3-4L por día"
            
        # Altitud elevada - más carbohidratos
        if env_conditions.altitude_meters > 2000:
            recommendation.nutritional_benefits.append("Carbohidratos para energía en altitud")
            
        # Aire seco - más electrolitos
        if env_conditions.humidity_percent < 30:
            recommendation.hydration_recommendation += " - Incluir electrolitos para hidratación"
            
        return recommendation
    
    async def _calculate_wellness_score(self,
                                      health_profile: HealthProfile,
                                      daily_activities: Dict[str, List[WellnessActivity]],
                                      env_conditions: EnvironmentalConditions) -> float:
        """Calcula score global de bienestar del plan"""
        
        total_score = 0.0
        total_days = len(daily_activities)
        
        for day_activities in daily_activities.values():
            day_score = 0.0
            
            for activity in day_activities:
                compatibility = await self.analytics.analyze_health_compatibility(
                    health_profile, activity, env_conditions
                )
                day_score += compatibility["compatibility_score"]
                
            # Promedio del día
            if day_activities:
                day_score = day_score / len(day_activities)
            
            total_score += day_score
            
        # Promedio total
        if total_days > 0:
            total_score = total_score / total_days
            
        return round(total_score, 2)
    
    async def _generate_recovery_recommendations(self,
                                               health_profile: HealthProfile,
                                               daily_activities: Dict[str, List[WellnessActivity]]) -> List[str]:
        """Genera recomendaciones de recuperación post-viaje"""
        
        recommendations = []
        
        # Analizar intensidad total del viaje
        total_intensity = 0
        activity_count = 0
        
        for day_activities in daily_activities.values():
            for activity in day_activities:
                total_intensity += self._intensity_level(activity.intensity)
                activity_count += 1
                
        if activity_count > 0:
            avg_intensity = total_intensity / activity_count
            
            if avg_intensity >= 3:  # Alta intensidad
                recommendations.extend([
                    "Planificar 2-3 días de descanso activo post-viaje",
                    "Incluir sesiones de stretching y relajación",
                    "Mantener hidratación elevada 48h después del regreso",
                    "Considerar masaje terapéutico para recuperación muscular"
                ])
            elif avg_intensity >= 2:  # Intensidad moderada
                recommendations.extend([
                    "1-2 días de actividades ligeras post-viaje",
                    "Mantener rutina de ejercicio suave",
                    "Hidratación normal y alimentación equilibrada"
                ])
            else:  # Intensidad ligera
                recommendations.extend([
                    "Continuar con actividades regulares",
                    "Incorporar elementos aprendidos en el viaje a rutina diaria"
                ])
        
        # Recomendaciones específicas por edad
        if health_profile.age > 60:
            recommendations.append("Monitorear signos de fatiga y ajustar actividades según necesidad")
            
        return recommendations

class WellnessOptimizer(BaseAgent):
    """
    WellnessOptimizer AI - Agente de Optimización de Bienestar Turístico
    
    Especializado en crear experiencias de bienestar personalizadas que maximizan
    la salud física y mental de los turistas durante sus viajes.
    """
    
    def __init__(self):
        super().__init__("WellnessOptimizer AI", "wellness_optimizer")
        self.recommendation_engine = WellnessRecommendationEngine()
        self.analytics = WellnessAnalytics()
        self.redis_client = None
        self.health_profiles = {}
        self.wellness_plans = {}
        self.active_alerts = {}
        
        # Métricas de performance
        self.metrics = {
            "plans_generated": 0,
            "health_profiles_created": 0,
            "wellness_alerts_sent": 0,
            "average_wellness_score": 0.0,
            "activity_recommendations": 0,
            "nutrition_plans_created": 0
        }
        
    async def initialize(self):
        """Inicializa el agente y sus dependencias"""
        await super().initialize()
        
        try:
            # Conectar a Redis
            self.redis_client = redis.from_url("redis://localhost:6379", decode_responses=True)
            await self.redis_client.ping()
            logger.info("✅ WellnessOptimizer conectado a Redis")
            
            # Cargar datos existentes
            await self._load_existing_data()
            
            # Configurar tareas periódicas
            asyncio.create_task(self._periodic_health_monitoring())
            asyncio.create_task(self._update_environmental_conditions())
            
            self.status = "active"
            logger.info("🏥 WellnessOptimizer AI inicializado correctamente")
            
        except Exception as e:
            logger.error(f"❌ Error inicializando WellnessOptimizer: {str(e)}")
            self.status = "error"
            raise
    
    async def _load_existing_data(self):
        """Carga datos existentes desde Redis"""
        try:
            # Cargar perfiles de salud
            profile_keys = await self.redis_client.keys("health_profile:*")
            for key in profile_keys:
                profile_data = await self.redis_client.hgetall(key)
                if profile_data:
                    customer_id = key.split(":")[-1]
                    self.health_profiles[customer_id] = profile_data
                    
            # Cargar planes de bienestar
            plan_keys = await self.redis_client.keys("wellness_plan:*")
            for key in plan_keys:
                plan_data = await self.redis_client.get(key)
                if plan_data:
                    plan = json.loads(plan_data)
                    self.wellness_plans[plan["plan_id"]] = plan
                    
            logger.info(f"📊 Datos cargados: {len(self.health_profiles)} perfiles, {len(self.wellness_plans)} planes")
            
        except Exception as e:
            logger.error(f"❌ Error cargando datos: {str(e)}")
    
    async def process_request(self, request_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Procesa solicitudes del sistema de bienestar"""
        
        try:
            if request_type == "create_health_profile":
                return await self._create_health_profile(data)
                
            elif request_type == "generate_wellness_plan":
                return await self._generate_wellness_plan(data)
                
            elif request_type == "analyze_activity_compatibility":
                return await self._analyze_activity_compatibility(data)
                
            elif request_type == "get_nutrition_recommendations":
                return await self._get_nutrition_recommendations(data)
                
            elif request_type == "monitor_health_alerts":
                return await self._monitor_health_alerts(data)
                
            elif request_type == "update_wellness_progress":
                return await self._update_wellness_progress(data)
                
            elif request_type == "get_recovery_plan":
                return await self._get_recovery_plan(data)
                
            else:
                return {
                    "success": False,
                    "error": f"Tipo de solicitud no soportado: {request_type}"
                }
                
        except Exception as e:
            logger.error(f"❌ Error procesando solicitud {request_type}: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _create_health_profile(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Crea perfil de salud para un cliente"""
        
        try:
            customer_id = data.get("customer_id")
            if not customer_id:
                return {"success": False, "error": "customer_id requerido"}
            
            # Crear perfil de salud
            profile = HealthProfile(
                profile_id=str(uuid.uuid4()),
                customer_id=customer_id,
                age=data.get("age", 30),
                gender=data.get("gender", "other"),
                height_cm=data.get("height_cm", 170),
                weight_kg=data.get("weight_kg", 70.0),
                fitness_level=data.get("fitness_level", "average"),
                medical_conditions=data.get("medical_conditions", []),
                medications=data.get("medications", []),
                allergies=data.get("allergies", []),
                dietary_restrictions=data.get("dietary_restrictions", []),
                activity_preferences=data.get("activity_preferences", []),
                wearable_devices=data.get("wearable_devices", []),
                emergency_contact=data.get("emergency_contact", {})
            )
            
            # Guardar en memoria y Redis
            self.health_profiles[customer_id] = profile
            
            profile_data = {
                "profile_id": profile.profile_id,
                "customer_id": profile.customer_id,
                "age": str(profile.age),
                "gender": profile.gender,
                "height_cm": str(profile.height_cm),
                "weight_kg": str(profile.weight_kg),
                "bmi": str(profile.bmi),
                "fitness_level": profile.fitness_level,
                "medical_conditions": json.dumps(profile.medical_conditions),
                "medications": json.dumps(profile.medications),
                "allergies": json.dumps(profile.allergies),
                "dietary_restrictions": json.dumps(profile.dietary_restrictions),
                "activity_preferences": json.dumps(profile.activity_preferences),
                "emergency_contact": json.dumps(profile.emergency_contact),
                "created_at": profile.created_at.isoformat()
            }
            
            await self.redis_client.hset(f"health_profile:{customer_id}", mapping=profile_data)
            
            self.metrics["health_profiles_created"] += 1
            
            logger.info(f"✅ Perfil de salud creado para cliente {customer_id}")
            
            return {
                "success": True,
                "profile_id": profile.profile_id,
                "bmi": profile.bmi,
                "health_assessment": await self._assess_health_status(profile),
                "recommendations": await self._generate_initial_recommendations(profile)
            }
            
        except Exception as e:
            logger.error(f"❌ Error creando perfil de salud: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _generate_wellness_plan(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Genera plan integral de bienestar"""
        
        try:
            customer_id = data.get("customer_id")
            destination = data.get("destination", "Madrid")
            start_date = datetime.fromisoformat(data.get("start_date"))
            end_date = datetime.fromisoformat(data.get("end_date"))
            
            # Obtener perfil de salud
            if customer_id not in self.health_profiles:
                return {"success": False, "error": "Perfil de salud no encontrado"}
            
            health_profile = self.health_profiles[customer_id]
            
            # Obtener condiciones ambientales
            env_conditions = await self._get_environmental_conditions(destination)
            
            # Generar plan personalizado
            wellness_plan = await self.recommendation_engine.generate_personalized_plan(
                health_profile, destination, (start_date, end_date), env_conditions
            )
            
            # Guardar plan
            self.wellness_plans[wellness_plan.plan_id] = wellness_plan
            
            # Serializar para Redis
            plan_data = {
                "plan_id": wellness_plan.plan_id,
                "customer_id": wellness_plan.customer_id,
                "destination": wellness_plan.destination,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "wellness_score": wellness_plan.wellness_score,
                "daily_activities": {
                    date: [
                        {
                            "activity_id": activity.activity_id,
                            "name": activity.name,
                            "category": activity.category.value,
                            "intensity": activity.intensity.value,
                            "duration_minutes": activity.duration_minutes,
                            "calories_estimate": activity.calories_burned_estimate,
                            "benefits": activity.health_benefits
                        }
                        for activity in activities
                    ]
                    for date, activities in wellness_plan.daily_activities.items()
                },
                "nutrition_plan": {
                    date: [
                        {
                            "meal_type": rec.meal_type,
                            "local_foods": rec.local_foods,
                            "benefits": rec.nutritional_benefits,
                            "calories": rec.caloric_content,
                            "hydration": rec.hydration_recommendation
                        }
                        for rec in recommendations
                    ]
                    for date, recommendations in wellness_plan.nutrition_plan.items()
                },
                "recovery_recommendations": wellness_plan.recovery_recommendations,
                "created_at": wellness_plan.created_at.isoformat()
            }
            
            await self.redis_client.set(
                f"wellness_plan:{wellness_plan.plan_id}",
                json.dumps(plan_data, ensure_ascii=False)
            )
            
            self.metrics["plans_generated"] += 1
            self.metrics["average_wellness_score"] = (
                self.metrics["average_wellness_score"] * (self.metrics["plans_generated"] - 1) +
                wellness_plan.wellness_score
            ) / self.metrics["plans_generated"]
            
            logger.info(f"🏥 Plan de bienestar generado: {wellness_plan.plan_id} (score: {wellness_plan.wellness_score})")
            
            return {
                "success": True,
                "plan_id": wellness_plan.plan_id,
                "wellness_score": wellness_plan.wellness_score,
                "total_days": len(wellness_plan.daily_activities),
                "daily_activities": {
                    date: len(activities) 
                    for date, activities in wellness_plan.daily_activities.items()
                },
                "key_recommendations": wellness_plan.recovery_recommendations[:3],
                "health_alerts": await self._check_health_alerts(health_profile, env_conditions)
            }
            
        except Exception as e:
            logger.error(f"❌ Error generando plan de bienestar: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _analyze_activity_compatibility(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analiza compatibilidad de actividad con perfil de salud"""
        
        try:
            customer_id = data.get("customer_id")
            activity_id = data.get("activity_id")
            destination = data.get("destination", "Madrid")
            
            if customer_id not in self.health_profiles:
                return {"success": False, "error": "Perfil de salud no encontrado"}
            
            if activity_id not in self.recommendation_engine.activity_database:
                return {"success": False, "error": "Actividad no encontrada"}
                
            health_profile = self.health_profiles[customer_id]
            activity = self.recommendation_engine.activity_database[activity_id]
            env_conditions = await self._get_environmental_conditions(destination)
            
            # Análizar compatibilidad
            compatibility = await self.analytics.analyze_health_compatibility(
                health_profile, activity, env_conditions
            )
            
            self.metrics["activity_recommendations"] += 1
            
            return {
                "success": True,
                "activity_name": activity.name,
                "compatibility_score": compatibility["compatibility_score"],
                "risk_level": compatibility["risk_level"].value,
                "risk_factors": compatibility["risk_factors"],
                "recommendations": compatibility["recommendations"],
                "safe_duration_minutes": compatibility["safe_duration_minutes"],
                "optimal_conditions": compatibility["optimal_conditions"]
            }
            
        except Exception as e:
            logger.error(f"❌ Error analizando compatibilidad: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _get_nutrition_recommendations(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Obtiene recomendaciones nutricionales personalizadas"""
        
        try:
            customer_id = data.get("customer_id")
            destination = data.get("destination", "Madrid")
            meal_type = data.get("meal_type", "lunch")
            
            if customer_id not in self.health_profiles:
                return {"success": False, "error": "Perfil de salud no encontrado"}
            
            health_profile = self.health_profiles[customer_id]
            env_conditions = await self._get_environmental_conditions(destination)
            
            # Crear plan nutricional
            nutrition_recommendations = await self.recommendation_engine._create_daily_nutrition_plan(
                health_profile, destination, env_conditions
            )
            
            # Filtrar por tipo de comida
            filtered_recs = [rec for rec in nutrition_recommendations if rec.meal_type == meal_type]
            
            if not filtered_recs:
                filtered_recs = nutrition_recommendations  # Devolver todas si no hay coincidencias
            
            self.metrics["nutrition_plans_created"] += 1
            
            result_recommendations = []
            for rec in filtered_recs[:3]:  # Máximo 3 recomendaciones
                result_recommendations.append({
                    "meal_type": rec.meal_type,
                    "local_foods": rec.local_foods,
                    "nutritional_benefits": rec.nutritional_benefits,
                    "caloric_content": rec.caloric_content,
                    "hydration_recommendation": rec.hydration_recommendation,
                    "foods_to_avoid": rec.foods_to_avoid,
                    "cultural_significance": rec.cultural_significance,
                    "allergen_warnings": rec.allergen_warnings
                })
            
            return {
                "success": True,
                "destination": destination,
                "meal_type": meal_type,
                "recommendations": result_recommendations,
                "dietary_adaptations": len(health_profile.dietary_restrictions),
                "allergen_considerations": len(health_profile.allergies)
            }
            
        except Exception as e:
            logger.error(f"❌ Error obteniendo recomendaciones nutricionales: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _monitor_health_alerts(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Monitorea y genera alertas de salud"""
        
        try:
            customer_id = data.get("customer_id")
            destination = data.get("destination", "Madrid")
            
            if customer_id not in self.health_profiles:
                return {"success": False, "error": "Perfil de salud no encontrado"}
            
            health_profile = self.health_profiles[customer_id]
            env_conditions = await self._get_environmental_conditions(destination)
            
            alerts = await self._check_health_alerts(health_profile, env_conditions)
            
            # Guardar alertas activas
            for alert in alerts:
                alert_id = str(uuid.uuid4())
                self.active_alerts[alert_id] = {
                    "alert_id": alert_id,
                    "customer_id": customer_id,
                    "type": alert["type"],
                    "severity": alert["severity"],
                    "message": alert["message"],
                    "recommendations": alert["recommendations"],
                    "created_at": datetime.now().isoformat()
                }
                
                await self.redis_client.hset(
                    f"health_alert:{alert_id}",
                    mapping=self.active_alerts[alert_id]
                )
            
            self.metrics["wellness_alerts_sent"] += len(alerts)
            
            return {
                "success": True,
                "alerts_count": len(alerts),
                "alerts": alerts,
                "monitoring_status": "active",
                "next_check_in_minutes": 30
            }
            
        except Exception as e:
            logger.error(f"❌ Error monitoreando alertas de salud: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _update_wellness_progress(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Actualiza progreso de bienestar"""
        
        try:
            customer_id = data.get("customer_id")
            plan_id = data.get("plan_id")
            completed_activities = data.get("completed_activities", [])
            wellness_feedback = data.get("wellness_feedback", {})
            
            if plan_id not in self.wellness_plans:
                return {"success": False, "error": "Plan de bienestar no encontrado"}
            
            # Actualizar progreso
            progress_data = {
                "customer_id": customer_id,
                "plan_id": plan_id,
                "completed_activities": completed_activities,
                "completion_rate": len(completed_activities) / max(1, data.get("total_planned_activities", 1)),
                "wellness_feedback": wellness_feedback,
                "updated_at": datetime.now().isoformat()
            }
            
            await self.redis_client.hset(
                f"wellness_progress:{plan_id}",
                mapping={k: json.dumps(v) if isinstance(v, (dict, list)) else str(v) for k, v in progress_data.items()}
            )
            
            return {
                "success": True,
                "completion_rate": progress_data["completion_rate"],
                "completed_activities": len(completed_activities),
                "updated_at": progress_data["updated_at"]
            }
            
        except Exception as e:
            logger.error(f"❌ Error actualizando progreso: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _get_recovery_plan(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Genera plan de recuperación post-viaje"""
        
        try:
            customer_id = data.get("customer_id")
            plan_id = data.get("plan_id")
            
            if customer_id not in self.health_profiles:
                return {"success": False, "error": "Perfil de salud no encontrado"}
                
            if plan_id not in self.wellness_plans:
                return {"success": False, "error": "Plan de bienestar no encontrado"}
            
            health_profile = self.health_profiles[customer_id]
            wellness_plan = self.wellness_plans[plan_id]
            
            # Generar recomendaciones de recuperación
            recovery_recommendations = await self.recommendation_engine._generate_recovery_recommendations(
                health_profile, wellness_plan.daily_activities
            )
            
            # Plan de recuperación estructurado
            recovery_plan = {
                "immediate_recovery": recovery_recommendations[:2],
                "week_1_activities": [
                    "Actividades ligeras de 30 minutos",
                    "Hidratación continua",
                    "Sueño reparador 8+ horas"
                ],
                "week_2_activities": [
                    "Retomar intensidad gradualmente",
                    "Incorporar elementos del viaje"
                ],
                "long_term_habits": recovery_recommendations[2:],
                "follow_up_recommendations": [
                    "Evaluación médica si hay molestias persistentes",
                    "Continuar hábitos saludables adquiridos"
                ]
            }
            
            return {
                "success": True,
                "recovery_plan": recovery_plan,
                "estimated_recovery_days": 7 if wellness_plan.wellness_score > 0.7 else 14,
                "wellness_score_achieved": wellness_plan.wellness_score
            }
            
        except Exception as e:
            logger.error(f"❌ Error generando plan de recuperación: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _get_environmental_conditions(self, destination: str) -> EnvironmentalConditions:
        """Obtiene condiciones ambientales del destino (mock data)"""
        
        # En una implementación real, esto se conectaría a APIs meteorológicas y de calidad del aire
        return EnvironmentalConditions(
            location=destination,
            temperature_celsius=22.0,
            humidity_percent=65.0,
            air_quality_index=45,
            uv_index=6.5,
            altitude_meters=650,
            pollen_count=30,
            pollution_level="moderate",
            water_quality_score=85,
            timezone="Europe/Madrid",
            sunrise_time="07:30",
            sunset_time="19:45",
            weather_conditions=["partly_cloudy"],
            health_alerts=[]
        )
    
    async def _assess_health_status(self, profile: HealthProfile) -> Dict[str, str]:
        """Evalúa estado general de salud"""
        
        assessment = {}
        
        # Evaluación BMI
        if profile.bmi < 18.5:
            assessment["bmi_status"] = "Bajo peso - considerar aumentar masa muscular"
        elif 18.5 <= profile.bmi <= 24.9:
            assessment["bmi_status"] = "Peso normal - mantener estilo de vida saludable"
        elif 25 <= profile.bmi <= 29.9:
            assessment["bmi_status"] = "Sobrepeso - considerar actividades de intensidad moderada"
        else:
            assessment["bmi_status"] = "Obesidad - priorizar actividades de bajo impacto"
        
        # Evaluación condiciones médicas
        if profile.medical_conditions:
            assessment["medical_status"] = f"Requiere consideraciones especiales por {len(profile.medical_conditions)} condición(es)"
        else:
            assessment["medical_status"] = "Sin condiciones médicas reportadas"
        
        # Evaluación fitness
        fitness_recommendations = {
            "beginner": "Comenzar con actividades ligeras y progresar gradualmente",
            "average": "Buena base para actividades de intensidad moderada",
            "advanced": "Apto para actividades vigorosas con precauciones",
            "expert": "Capacidad para actividades de alta intensidad"
        }
        
        assessment["fitness_status"] = fitness_recommendations.get(profile.fitness_level, "Evaluación requerida")
        
        return assessment
    
    async def _generate_initial_recommendations(self, profile: HealthProfile) -> List[str]:
        """Genera recomendaciones iniciales basadas en el perfil"""
        
        recommendations = []
        
        # Recomendaciones por BMI
        if profile.bmi < 18.5:
            recommendations.append("Enfocarse en actividades de fortalecimiento muscular")
        elif profile.bmi > 25:
            recommendations.append("Priorizar actividades cardiovasculares de bajo impacto")
            
        # Recomendaciones por edad
        if profile.age > 65:
            recommendations.extend([
                "Incluir ejercicios de equilibrio y flexibilidad",
                "Monitorear signos de fatiga durante actividades"
            ])
        elif profile.age < 25:
            recommendations.append("Aprovechar alta capacidad de recuperación para actividades variadas")
        
        # Recomendaciones por condiciones médicas
        if any("heart" in condition.lower() for condition in profile.medical_conditions):
            recommendations.append("Evitar actividades de alta intensidad sin supervisión médica")
            
        if any("asthma" in condition.lower() for condition in profile.medical_conditions):
            recommendations.append("Llevar inhalador y evitar áreas con alta contaminación")
        
        # Recomendaciones generales
        recommendations.extend([
            "Mantener hidratación constante durante actividades",
            "Escuchar al cuerpo y respetar límites personales",
            "Calentar antes y estirar después de actividades físicas"
        ])
        
        return recommendations[:5]  # Máximo 5 recomendaciones
    
    async def _check_health_alerts(self, 
                                 health_profile: HealthProfile, 
                                 env_conditions: EnvironmentalConditions) -> List[Dict[str, Any]]:
        """Verifica alertas de salud basadas en condiciones"""
        
        alerts = []
        
        # Alertas por condiciones ambientales
        if env_conditions.air_quality_index > 150:
            alerts.append({
                "type": "environmental",
                "severity": "high",
                "title": "Calidad del Aire Peligrosa",
                "message": "La calidad del aire es muy pobre. Evite actividades al aire libre.",
                "recommendations": [
                    "Permanecer en interiores",
                    "Usar mascarilla si es necesario salir",
                    "Postponer actividades físicas externas"
                ]
            })
        
        if env_conditions.uv_index > 8:
            alerts.append({
                "type": "environmental",
                "severity": "moderate",
                "title": "Índice UV Muy Alto",
                "message": "Riesgo elevado de quemaduras solares.",
                "recommendations": [
                    "Usar protector solar FPS 50+",
                    "Evitar exposición directa 10AM-4PM",
                    "Usar ropa protectora y sombrero"
                ]
            })
        
        if env_conditions.temperature_celsius > 35:
            alerts.append({
                "type": "environmental", 
                "severity": "high",
                "title": "Temperatura Extrema",
                "message": "Temperatura muy alta. Riesgo de golpe de calor.",
                "recommendations": [
                    "Aumentar ingesta de líquidos",
                    "Buscar sombra/aire acondicionado",
                    "Reducir intensidad de actividades"
                ]
            })
        
        # Alertas por condiciones médicas
        if any("asthma" in condition.lower() for condition in health_profile.medical_conditions):
            if env_conditions.air_quality_index > 100:
                alerts.append({
                    "type": "medical",
                    "severity": "moderate",
                    "title": "Alerta de Asma",
                    "message": "La calidad del aire puede agravar síntomas de asma.",
                    "recommendations": [
                        "Llevar inhalador de rescate",
                        "Evitar ejercicio intenso al aire libre",
                        "Considerar actividades en interiores"
                    ]
                })
        
        if any("diabetes" in condition.lower() for condition in health_profile.medical_conditions):
            alerts.append({
                "type": "medical",
                "severity": "moderate",
                "title": "Recordatorio Diabetes",
                "message": "Mantenga monitoreo regular de glucosa durante actividades.",
                "recommendations": [
                    "Llevar glucómetro y snacks",
                    "Monitorear niveles antes/después de ejercicio",
                    "Informar a compañeros sobre su condición"
                ]
            })
        
        # Alerta por edad avanzada en condiciones extremas
        if health_profile.age > 70 and (env_conditions.temperature_celsius > 30 or env_conditions.temperature_celsius < 5):
            alerts.append({
                "type": "safety",
                "severity": "moderate",
                "title": "Precaución por Edad",
                "message": "Las temperaturas extremas requieren precauciones adicionales.",
                "recommendations": [
                    "Evitar cambios bruscos de temperatura",
                    "Mantener compañía durante actividades",
                    "Tener contacto de emergencia disponible"
                ]
            })
        
        return alerts
    
    async def _periodic_health_monitoring(self):
        """Monitoreo periódico de salud de clientes activos"""
        
        while self.status == "active":
            try:
                logger.info("🔄 Ejecutando monitoreo periódico de salud...")
                
                # Verificar alertas para todos los perfiles activos
                active_customers = list(self.health_profiles.keys())
                
                for customer_id in active_customers:
                    try:
                        # Verificar si el cliente tiene un viaje activo
                        active_plans = [
                            plan for plan in self.wellness_plans.values()
                            if plan.customer_id == customer_id
                        ]
                        
                        if active_plans:
                            # Monitorear alertas para planes activos
                            health_profile = self.health_profiles[customer_id]
                            
                            # Obtener condiciones actuales (mock)
                            env_conditions = await self._get_environmental_conditions("Madrid")
                            
                            alerts = await self._check_health_alerts(health_profile, env_conditions)
                            
                            if alerts:
                                logger.info(f"🚨 {len(alerts)} alertas generadas para cliente {customer_id}")
                                
                                # En un sistema real, aquí se enviarían notificaciones
                                # await self._send_health_notifications(customer_id, alerts)
                    
                    except Exception as e:
                        logger.error(f"❌ Error monitoreando cliente {customer_id}: {str(e)}")
                
                # Esperar 30 minutos antes del próximo chequeo
                await asyncio.sleep(1800)
                
            except Exception as e:
                logger.error(f"❌ Error en monitoreo periódico: {str(e)}")
                await asyncio.sleep(300)  # Esperar 5 minutos en caso de error
    
    async def _update_environmental_conditions(self):
        """Actualiza condiciones ambientales periódicamente"""
        
        while self.status == "active":
            try:
                logger.info("🌤️ Actualizando condiciones ambientales...")
                
                # En una implementación real, aquí se consultarían APIs meteorológicas
                # Por ahora, registrar la actualización
                
                await self.redis_client.set(
                    "last_environmental_update",
                    datetime.now().isoformat()
                )
                
                # Actualizar cada hora
                await asyncio.sleep(3600)
                
            except Exception as e:
                logger.error(f"❌ Error actualizando condiciones ambientales: {str(e)}")
                await asyncio.sleep(600)  # Retry en 10 minutos
    
    async def get_status(self) -> Dict[str, Any]:
        """Obtiene estado del agente"""
        
        return {
            "agent_name": self.agent_name,
            "agent_type": self.agent_type,
            "status": self.status,
            "uptime": str(datetime.now() - self.start_time),
            "metrics": self.metrics,
            "active_profiles": len(self.health_profiles),
            "active_plans": len(self.wellness_plans),
            "active_alerts": len(self.active_alerts),
            "capabilities": [
                "health_profile_creation",
                "wellness_plan_generation",
                "activity_compatibility_analysis",
                "nutrition_recommendations",
                "health_monitoring",
                "recovery_planning",
                "environmental_alerts"
            ]
        }
    
    async def cleanup(self):
        """Limpieza de recursos"""
        
        try:
            if self.redis_client:
                await self.redis_client.close()
            
            logger.info("🧹 WellnessOptimizer recursos liberados")
            
        except Exception as e:
            logger.error(f"❌ Error en cleanup: {str(e)}")

# Función principal para testing
async def main():
    """Función principal de prueba"""
    
    agent = WellnessOptimizer()
    
    try:
        await agent.initialize()
        
        # Test crear perfil de salud
        test_profile_data = {
            "customer_id": "test_customer_wellness",
            "age": 35,
            "gender": "female",
            "height_cm": 165,
            "weight_kg": 62.0,
            "fitness_level": "average",
            "medical_conditions": ["mild_asthma"],
            "allergies": ["pollen"],
            "dietary_restrictions": ["vegetarian"],
            "activity_preferences": ["yoga", "hiking", "swimming"],
            "emergency_contact": {
                "name": "María García",
                "phone": "+34123456789",
                "relationship": "spouse"
            }
        }
        
        print("🧪 Creando perfil de salud...")
        profile_result = await agent.process_request("create_health_profile", test_profile_data)
        print(f"✅ Perfil creado: {json.dumps(profile_result, indent=2, ensure_ascii=False)}")
        
        # Test generar plan de bienestar
        test_plan_data = {
            "customer_id": "test_customer_wellness",
            "destination": "Valencia",
            "start_date": "2024-09-25T00:00:00",
            "end_date": "2024-09-30T00:00:00"
        }
        
        print("\n🧪 Generando plan de bienestar...")
        plan_result = await agent.process_request("generate_wellness_plan", test_plan_data)
        print(f"✅ Plan generado: {json.dumps(plan_result, indent=2, ensure_ascii=False)}")
        
        # Test análisis de compatibilidad
        test_compatibility_data = {
            "customer_id": "test_customer_wellness",
            "activity_id": "yoga_sunrise",
            "destination": "Valencia"
        }
        
        print("\n🧪 Analizando compatibilidad de actividad...")
        compatibility_result = await agent.process_request("analyze_activity_compatibility", test_compatibility_data)
        print(f"✅ Compatibilidad: {json.dumps(compatibility_result, indent=2, ensure_ascii=False)}")
        
        # Test recomendaciones nutricionales
        test_nutrition_data = {
            "customer_id": "test_customer_wellness",
            "destination": "Valencia", 
            "meal_type": "breakfast"
        }
        
        print("\n🧪 Obteniendo recomendaciones nutricionales...")
        nutrition_result = await agent.process_request("get_nutrition_recommendations", test_nutrition_data)
        print(f"✅ Nutrición: {json.dumps(nutrition_result, indent=2, ensure_ascii=False)}")
        
        # Test monitoreo de alertas
        test_alerts_data = {
            "customer_id": "test_customer_wellness",
            "destination": "Valencia"
        }
        
        print("\n🧪 Monitoreando alertas de salud...")
        alerts_result = await agent.process_request("monitor_health_alerts", test_alerts_data)
        print(f"✅ Alertas: {json.dumps(alerts_result, indent=2, ensure_ascii=False)}")
        
        # Mostrar estado del agente
        print("\n📊 Estado del agente:")
        status = await agent.get_status()
        print(json.dumps(status, indent=2, ensure_ascii=False))
        
        await asyncio.sleep(2)
        
    except Exception as e:
        logger.error(f"❌ Error en main: {str(e)}")
        
    finally:
        await agent.cleanup()

if __name__ == "__main__":
    asyncio.run(main())