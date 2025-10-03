#!/usr/bin/env python3
"""
Spirit Tours - Sustainability Advisory AI Agent
Sistema Inteligente de Asesoramiento en Sostenibilidad Turística

Este agente proporciona capacidades avanzadas de asesoramiento en sostenibilidad,
incluyendo análisis de impacto ambiental, certificaciones eco-friendly,
optimización de huella de carbono y recomendaciones de turismo responsable.

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
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.cluster import KMeans
from sklearn.metrics import mean_absolute_error, accuracy_score
import nltk
from textblob import TextBlob
import spacy
import yaml
import hashlib
from collections import defaultdict, Counter
import math
import statistics
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

class SustainabilityCategory(Enum):
    """Categorías de sostenibilidad turística"""
    ENVIRONMENTAL = "environmental"
    SOCIAL = "social"
    ECONOMIC = "economic"
    CULTURAL = "cultural"
    WILDLIFE = "wildlife"
    TRANSPORTATION = "transportation"
    ACCOMMODATION = "accommodation"
    ACTIVITIES = "activities"

class CertificationType(Enum):
    """Tipos de certificaciones de sostenibilidad"""
    RAINFOREST_ALLIANCE = "rainforest_alliance"
    GREEN_KEY = "green_key"
    LEED = "leed"
    EARTH_CHECK = "earth_check"
    TRAVELIFE = "travelife"
    BIOSPHERE = "biosphere"
    ISO14001 = "iso14001"
    FAIR_TRADE = "fair_trade"
    CARBON_NEUTRAL = "carbon_neutral"
    BLUE_FLAG = "blue_flag"

class ImpactLevel(Enum):
    """Niveles de impacto ambiental"""
    MINIMAL = "minimal"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    SEVERE = "severe"

@dataclass
class SustainabilityMetric:
    """Métrica de sostenibilidad"""
    category: SustainabilityCategory
    metric_name: str
    value: float
    unit: str
    benchmark: Optional[float] = None
    target: Optional[float] = None
    impact_level: ImpactLevel = ImpactLevel.MODERATE
    confidence_score: float = 0.0
    measurement_date: datetime = field(default_factory=datetime.now)
    certification_eligible: bool = False
    improvement_potential: float = 0.0

@dataclass
class CarbonFootprintCalculation:
    """Cálculo de huella de carbono"""
    activity_type: str
    transportation_emissions: float
    accommodation_emissions: float
    activity_emissions: float
    food_emissions: float
    total_emissions: float
    equivalent_trees: int
    offset_cost: float
    reduction_recommendations: List[str] = field(default_factory=list)
    calculation_confidence: float = 0.0
    
@dataclass
class EcoFriendlyRecommendation:
    """Recomendación eco-friendly"""
    recommendation_id: str
    category: SustainabilityCategory
    title: str
    description: str
    impact_reduction: float
    cost_implication: str
    difficulty_level: str
    certification_bonus: List[CertificationType] = field(default_factory=list)
    priority_score: float = 0.0
    implementation_timeline: str = ""

@dataclass
class SustainabilityAssessment:
    """Evaluación completa de sostenibilidad"""
    assessment_id: str
    tour_id: str
    overall_score: float
    category_scores: Dict[SustainabilityCategory, float]
    metrics: List[SustainabilityMetric]
    carbon_footprint: CarbonFootprintCalculation
    certifications_eligible: List[CertificationType]
    recommendations: List[EcoFriendlyRecommendation]
    improvement_plan: Dict[str, Any]
    compliance_status: Dict[str, str]
    assessment_date: datetime = field(default_factory=datetime.now)

class SustainabilityProcessor:
    """Procesador de datos de sostenibilidad"""
    
    def __init__(self):
        self.carbon_factors = self._initialize_carbon_factors()
        self.sustainability_benchmarks = self._initialize_benchmarks()
        self.certification_criteria = self._initialize_certification_criteria()
        self.ml_models = self._initialize_ml_models()
        
    def _initialize_carbon_factors(self) -> Dict[str, float]:
        """Inicializa factores de emisión de carbono (kg CO2 per unit)"""
        return {
            # Transportation (per km per person)
            "flight_domestic": 0.255,
            "flight_international": 0.150,
            "car_gasoline": 0.171,
            "car_electric": 0.053,
            "bus_intercity": 0.027,
            "train_high_speed": 0.014,
            "train_regional": 0.041,
            "ferry": 0.113,
            "cruise_ship": 0.250,
            "taxi": 0.180,
            "uber_pool": 0.090,
            
            # Accommodation (per night per person)
            "luxury_hotel": 47.2,
            "business_hotel": 28.4,
            "budget_hotel": 15.6,
            "boutique_hotel": 35.1,
            "eco_lodge": 8.3,
            "hostel": 7.9,
            "vacation_rental": 22.1,
            "camping": 2.1,
            "glamping": 12.4,
            
            # Activities (per hour per person)
            "city_tour": 2.3,
            "museum_visit": 0.8,
            "hiking": 0.1,
            "wildlife_safari": 8.7,
            "water_sports": 3.2,
            "adventure_sports": 4.5,
            "cultural_experience": 1.2,
            "spa_wellness": 6.1,
            "shopping": 2.8,
            "nightlife": 5.4,
            
            # Food (per meal per person)
            "local_cuisine": 2.1,
            "international_cuisine": 3.8,
            "vegetarian": 1.4,
            "vegan": 0.9,
            "seafood": 4.2,
            "street_food": 1.8,
            "fine_dining": 6.7,
            "fast_food": 3.1
        }
    
    def _initialize_benchmarks(self) -> Dict[str, Dict[str, float]]:
        """Inicializa benchmarks de sostenibilidad por categoría"""
        return {
            "environmental": {
                "carbon_intensity_excellent": 5.0,  # kg CO2 per day
                "carbon_intensity_good": 15.0,
                "carbon_intensity_average": 30.0,
                "carbon_intensity_poor": 50.0,
                "waste_reduction_excellent": 90.0,  # % reduction
                "waste_reduction_good": 70.0,
                "waste_reduction_average": 50.0,
                "water_conservation_excellent": 80.0,  # % conservation
                "water_conservation_good": 60.0,
                "renewable_energy_excellent": 80.0  # % renewable
            },
            "social": {
                "local_employment_excellent": 80.0,  # % local staff
                "local_employment_good": 60.0,
                "community_investment_excellent": 5.0,  # % revenue to community
                "community_investment_good": 2.0,
                "fair_wages_compliance": 100.0,  # % compliance
                "gender_equality_score": 85.0  # equality index
            },
            "economic": {
                "local_procurement_excellent": 70.0,  # % local sourcing
                "local_procurement_good": 50.0,
                "economic_leakage_low": 20.0,  # % leakage
                "economic_leakage_high": 60.0,
                "profit_sharing_excellent": 10.0  # % profit to community
            },
            "cultural": {
                "cultural_authenticity_excellent": 85.0,  # authenticity score
                "cultural_authenticity_good": 70.0,
                "heritage_preservation_excellent": 90.0,  # preservation score
                "cultural_sensitivity_training": 100.0  # % staff trained
            }
        }
    
    def _initialize_certification_criteria(self) -> Dict[CertificationType, Dict[str, float]]:
        """Inicializa criterios para certificaciones de sostenibilidad"""
        return {
            CertificationType.RAINFOREST_ALLIANCE: {
                "biodiversity_protection": 85.0,
                "community_wellbeing": 80.0,
                "natural_resource_conservation": 90.0,
                "climate_action": 75.0
            },
            CertificationType.GREEN_KEY: {
                "environmental_management": 80.0,
                "staff_involvement": 70.0,
                "guest_information": 75.0,
                "water_management": 85.0,
                "waste_management": 85.0,
                "energy_efficiency": 80.0
            },
            CertificationType.TRAVELIFE: {
                "sustainability_management": 75.0,
                "internal_management": 70.0,
                "social_policy": 80.0,
                "environmental_policy": 85.0,
                "supplier_relations": 70.0
            },
            CertificationType.EARTH_CHECK: {
                "energy_efficiency": 20.0,  # % improvement required
                "greenhouse_gas_reduction": 15.0,
                "waste_management": 25.0,
                "water_conservation": 20.0,
                "social_community": 70.0
            },
            CertificationType.CARBON_NEUTRAL: {
                "carbon_footprint_measurement": 100.0,
                "reduction_plan": 90.0,
                "offset_verification": 100.0,
                "annual_reporting": 100.0
            }
        }
    
    def _initialize_ml_models(self) -> Dict[str, Any]:
        """Inicializa modelos de machine learning"""
        models = {}
        
        # Modelo de predicción de huella de carbono
        models['carbon_predictor'] = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        
        # Modelo de clasificación de sostenibilidad
        models['sustainability_classifier'] = GradientBoostingClassifier(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=6,
            random_state=42
        )
        
        # Modelo de clustering para recomendaciones
        models['recommendation_cluster'] = KMeans(
            n_clusters=8,
            random_state=42
        )
        
        # Escaladores para normalización
        models['carbon_scaler'] = StandardScaler()
        models['sustainability_scaler'] = StandardScaler()
        models['label_encoder'] = LabelEncoder()
        
        return models
    
    async def calculate_carbon_footprint(self, tour_data: Dict[str, Any]) -> CarbonFootprintCalculation:
        """Calcula la huella de carbono de un tour"""
        try:
            transportation_emissions = 0.0
            accommodation_emissions = 0.0
            activity_emissions = 0.0
            food_emissions = 0.0
            
            # Calcular emisiones de transporte
            for transport in tour_data.get('transportation', []):
                transport_type = transport.get('type', '').lower()
                distance = transport.get('distance_km', 0)
                passengers = transport.get('passengers', 1)
                
                factor = self.carbon_factors.get(transport_type, 0.15)  # Factor por defecto
                transport_emissions = (factor * distance) / passengers
                transportation_emissions += transport_emissions
            
            # Calcular emisiones de alojamiento
            for accommodation in tour_data.get('accommodations', []):
                acc_type = accommodation.get('type', '').lower()
                nights = accommodation.get('nights', 1)
                guests = accommodation.get('guests', 1)
                
                factor = self.carbon_factors.get(acc_type, 25.0)  # Factor por defecto
                acc_emissions = (factor * nights) / guests
                accommodation_emissions += acc_emissions
            
            # Calcular emisiones de actividades
            for activity in tour_data.get('activities', []):
                activity_type = activity.get('type', '').lower()
                duration_hours = activity.get('duration_hours', 2)
                participants = activity.get('participants', 1)
                
                factor = self.carbon_factors.get(activity_type, 3.0)  # Factor por defecto
                act_emissions = (factor * duration_hours) / participants
                activity_emissions += act_emissions
            
            # Calcular emisiones de comida
            for meal in tour_data.get('meals', []):
                meal_type = meal.get('type', '').lower()
                meal_count = meal.get('count', 1)
                
                factor = self.carbon_factors.get(meal_type, 3.0)  # Factor por defecto
                meal_emissions = factor * meal_count
                food_emissions += meal_emissions
            
            total_emissions = (transportation_emissions + accommodation_emissions + 
                             activity_emissions + food_emissions)
            
            # Calcular equivalente en árboles (1 árbol absorbe ~22kg CO2/año)
            equivalent_trees = math.ceil(total_emissions / 22)
            
            # Calcular costo de compensación ($15-25 por tonelada CO2)
            offset_cost = (total_emissions / 1000) * 20  # $20 por tonelada
            
            # Generar recomendaciones de reducción
            recommendations = await self._generate_carbon_reduction_recommendations(
                transportation_emissions, accommodation_emissions,
                activity_emissions, food_emissions
            )
            
            # Calcular confianza del cálculo
            confidence = self._calculate_carbon_confidence(tour_data)
            
            return CarbonFootprintCalculation(
                activity_type=tour_data.get('tour_type', 'general'),
                transportation_emissions=transportation_emissions,
                accommodation_emissions=accommodation_emissions,
                activity_emissions=activity_emissions,
                food_emissions=food_emissions,
                total_emissions=total_emissions,
                equivalent_trees=equivalent_trees,
                offset_cost=offset_cost,
                reduction_recommendations=recommendations,
                calculation_confidence=confidence
            )
            
        except Exception as e:
            logger.error(f"Error calculating carbon footprint: {str(e)}")
            return CarbonFootprintCalculation(
                activity_type="unknown",
                transportation_emissions=0.0,
                accommodation_emissions=0.0,
                activity_emissions=0.0,
                food_emissions=0.0,
                total_emissions=0.0,
                equivalent_trees=0,
                offset_cost=0.0,
                reduction_recommendations=[],
                calculation_confidence=0.0
            )
    
    async def _generate_carbon_reduction_recommendations(self, transport: float, 
                                                       accommodation: float, 
                                                       activities: float, 
                                                       food: float) -> List[str]:
        """Genera recomendaciones para reducir la huella de carbono"""
        recommendations = []
        total = transport + accommodation + activities + food
        
        if total == 0:
            return ["No data available for carbon footprint analysis"]
        
        # Recomendaciones basadas en el componente más alto
        percentages = {
            'transport': transport / total * 100,
            'accommodation': accommodation / total * 100,
            'activities': activities / total * 100,
            'food': food / total * 100
        }
        
        if percentages['transport'] > 50:
            recommendations.extend([
                "Consider train travel instead of flights for distances under 1000km",
                "Choose direct flights to reduce emissions from takeoffs/landings",
                "Opt for economy class - business/first class have 3x higher emissions",
                "Use public transportation or electric vehicles at destination"
            ])
        
        if percentages['accommodation'] > 30:
            recommendations.extend([
                "Choose eco-certified accommodations (Green Key, LEED, etc.)",
                "Select smaller, locally-owned properties over large hotel chains",
                "Look for accommodations with renewable energy sources",
                "Choose properties with water and waste management programs"
            ])
        
        if percentages['activities'] > 25:
            recommendations.extend([
                "Prioritize low-impact activities like hiking and cycling",
                "Choose wildlife tours with certified conservation programs",
                "Select cultural experiences that support local communities",
                "Avoid activities with high fuel consumption (helicopter tours, jet skiing)"
            ])
        
        if percentages['food'] > 20:
            recommendations.extend([
                "Choose local, seasonal cuisine over imported foods",
                "Reduce meat consumption - opt for vegetarian/vegan options",
                "Support restaurants that source ingredients locally",
                "Avoid single-use packaging and plastic bottles"
            ])
        
        # Recomendaciones generales
        recommendations.extend([
            "Consider carbon offset programs for unavoidable emissions",
            "Plan longer stays to reduce transportation frequency",
            "Pack light to reduce aircraft fuel consumption",
            "Choose destinations closer to home for shorter trips"
        ])
        
        return recommendations[:8]  # Limitar a 8 recomendaciones más relevantes
    
    def _calculate_carbon_confidence(self, tour_data: Dict[str, Any]) -> float:
        """Calcula la confianza del cálculo de huella de carbono"""
        confidence_factors = []
        
        # Factor de completitud de datos
        data_completeness = 0
        total_fields = 4  # transportation, accommodation, activities, meals
        
        if tour_data.get('transportation'):
            data_completeness += 1
        if tour_data.get('accommodations'):
            data_completeness += 1
        if tour_data.get('activities'):
            data_completeness += 1
        if tour_data.get('meals'):
            data_completeness += 1
        
        confidence_factors.append(data_completeness / total_fields)
        
        # Factor de precisión de datos
        precision_score = 0
        total_precision_checks = 0
        
        # Verificar precisión de transporte
        for transport in tour_data.get('transportation', []):
            total_precision_checks += 1
            if transport.get('distance_km') and transport.get('type'):
                precision_score += 1
        
        # Verificar precisión de alojamiento
        for acc in tour_data.get('accommodations', []):
            total_precision_checks += 1
            if acc.get('nights') and acc.get('type'):
                precision_score += 1
        
        if total_precision_checks > 0:
            confidence_factors.append(precision_score / total_precision_checks)
        else:
            confidence_factors.append(0.5)  # Confianza media por defecto
        
        return statistics.mean(confidence_factors) if confidence_factors else 0.5
    
    async def assess_sustainability_metrics(self, tour_data: Dict[str, Any]) -> List[SustainabilityMetric]:
        """Evalúa métricas de sostenibilidad del tour"""
        metrics = []
        
        try:
            # Métricas ambientales
            environmental_metrics = await self._assess_environmental_metrics(tour_data)
            metrics.extend(environmental_metrics)
            
            # Métricas sociales
            social_metrics = await self._assess_social_metrics(tour_data)
            metrics.extend(social_metrics)
            
            # Métricas económicas
            economic_metrics = await self._assess_economic_metrics(tour_data)
            metrics.extend(economic_metrics)
            
            # Métricas culturales
            cultural_metrics = await self._assess_cultural_metrics(tour_data)
            metrics.extend(cultural_metrics)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error assessing sustainability metrics: {str(e)}")
            return []
    
    async def _assess_environmental_metrics(self, tour_data: Dict[str, Any]) -> List[SustainabilityMetric]:
        """Evalúa métricas ambientales"""
        metrics = []
        
        # Intensidad de carbono
        carbon_footprint = await self.calculate_carbon_footprint(tour_data)
        duration_days = tour_data.get('duration_days', 1)
        carbon_intensity = carbon_footprint.total_emissions / duration_days
        
        # Determinar nivel de impacto
        benchmarks = self.sustainability_benchmarks['environmental']
        if carbon_intensity <= benchmarks['carbon_intensity_excellent']:
            impact = ImpactLevel.MINIMAL
        elif carbon_intensity <= benchmarks['carbon_intensity_good']:
            impact = ImpactLevel.LOW
        elif carbon_intensity <= benchmarks['carbon_intensity_average']:
            impact = ImpactLevel.MODERATE
        else:
            impact = ImpactLevel.HIGH
        
        metrics.append(SustainabilityMetric(
            category=SustainabilityCategory.ENVIRONMENTAL,
            metric_name="Carbon Intensity",
            value=carbon_intensity,
            unit="kg CO2/day",
            benchmark=benchmarks['carbon_intensity_average'],
            target=benchmarks['carbon_intensity_excellent'],
            impact_level=impact,
            confidence_score=carbon_footprint.calculation_confidence,
            certification_eligible=(impact in [ImpactLevel.MINIMAL, ImpactLevel.LOW]),
            improvement_potential=max(0, carbon_intensity - benchmarks['carbon_intensity_excellent'])
        ))
        
        # Uso de transporte sostenible
        sustainable_transport_score = self._calculate_sustainable_transport_score(tour_data)
        metrics.append(SustainabilityMetric(
            category=SustainabilityCategory.TRANSPORTATION,
            metric_name="Sustainable Transport Score",
            value=sustainable_transport_score,
            unit="score",
            benchmark=50.0,
            target=80.0,
            impact_level=ImpactLevel.LOW if sustainable_transport_score >= 70 else ImpactLevel.MODERATE,
            confidence_score=0.85,
            certification_eligible=(sustainable_transport_score >= 70),
            improvement_potential=max(0, 80 - sustainable_transport_score)
        ))
        
        # Alojamientos eco-friendly
        eco_accommodation_score = self._calculate_eco_accommodation_score(tour_data)
        metrics.append(SustainabilityMetric(
            category=SustainabilityCategory.ACCOMMODATION,
            metric_name="Eco-Accommodation Score",
            value=eco_accommodation_score,
            unit="score",
            benchmark=60.0,
            target=85.0,
            impact_level=ImpactLevel.LOW if eco_accommodation_score >= 75 else ImpactLevel.MODERATE,
            confidence_score=0.80,
            certification_eligible=(eco_accommodation_score >= 75),
            improvement_potential=max(0, 85 - eco_accommodation_score)
        ))
        
        return metrics
    
    async def _assess_social_metrics(self, tour_data: Dict[str, Any]) -> List[SustainabilityMetric]:
        """Evalúa métricas sociales"""
        metrics = []
        
        # Empleos locales
        local_employment_score = self._calculate_local_employment_score(tour_data)
        benchmarks = self.sustainability_benchmarks['social']
        
        metrics.append(SustainabilityMetric(
            category=SustainabilityCategory.SOCIAL,
            metric_name="Local Employment Rate",
            value=local_employment_score,
            unit="percentage",
            benchmark=benchmarks['local_employment_good'],
            target=benchmarks['local_employment_excellent'],
            impact_level=ImpactLevel.LOW if local_employment_score >= 70 else ImpactLevel.MODERATE,
            confidence_score=0.75,
            certification_eligible=(local_employment_score >= 70),
            improvement_potential=max(0, benchmarks['local_employment_excellent'] - local_employment_score)
        ))
        
        # Inversión en comunidad
        community_investment_score = self._calculate_community_investment_score(tour_data)
        metrics.append(SustainabilityMetric(
            category=SustainabilityCategory.SOCIAL,
            metric_name="Community Investment Rate",
            value=community_investment_score,
            unit="percentage",
            benchmark=benchmarks['community_investment_good'],
            target=benchmarks['community_investment_excellent'],
            impact_level=ImpactLevel.LOW if community_investment_score >= 3 else ImpactLevel.MODERATE,
            confidence_score=0.70,
            certification_eligible=(community_investment_score >= 3),
            improvement_potential=max(0, benchmarks['community_investment_excellent'] - community_investment_score)
        ))
        
        return metrics
    
    async def _assess_economic_metrics(self, tour_data: Dict[str, Any]) -> List[SustainabilityMetric]:
        """Evalúa métricas económicas"""
        metrics = []
        
        # Adquisiciones locales
        local_procurement_score = self._calculate_local_procurement_score(tour_data)
        benchmarks = self.sustainability_benchmarks['economic']
        
        metrics.append(SustainabilityMetric(
            category=SustainabilityCategory.ECONOMIC,
            metric_name="Local Procurement Rate",
            value=local_procurement_score,
            unit="percentage",
            benchmark=benchmarks['local_procurement_good'],
            target=benchmarks['local_procurement_excellent'],
            impact_level=ImpactLevel.LOW if local_procurement_score >= 60 else ImpactLevel.MODERATE,
            confidence_score=0.80,
            certification_eligible=(local_procurement_score >= 60),
            improvement_potential=max(0, benchmarks['local_procurement_excellent'] - local_procurement_score)
        ))
        
        return metrics
    
    async def _assess_cultural_metrics(self, tour_data: Dict[str, Any]) -> List[SustainabilityMetric]:
        """Evalúa métricas culturales"""
        metrics = []
        
        # Autenticidad cultural
        cultural_authenticity_score = self._calculate_cultural_authenticity_score(tour_data)
        benchmarks = self.sustainability_benchmarks['cultural']
        
        metrics.append(SustainabilityMetric(
            category=SustainabilityCategory.CULTURAL,
            metric_name="Cultural Authenticity Score",
            value=cultural_authenticity_score,
            unit="score",
            benchmark=benchmarks['cultural_authenticity_good'],
            target=benchmarks['cultural_authenticity_excellent'],
            impact_level=ImpactLevel.LOW if cultural_authenticity_score >= 75 else ImpactLevel.MODERATE,
            confidence_score=0.75,
            certification_eligible=(cultural_authenticity_score >= 75),
            improvement_potential=max(0, benchmarks['cultural_authenticity_excellent'] - cultural_authenticity_score)
        ))
        
        return metrics
    
    def _calculate_sustainable_transport_score(self, tour_data: Dict[str, Any]) -> float:
        """Calcula el score de transporte sostenible"""
        transport_scores = []
        
        # Scoring por tipo de transporte (0-100)
        transport_sustainability = {
            'train_high_speed': 95,
            'train_regional': 90,
            'bus_intercity': 85,
            'car_electric': 80,
            'ferry': 70,
            'car_gasoline': 60,
            'taxi': 50,
            'uber_pool': 55,
            'flight_domestic': 30,
            'flight_international': 25,
            'cruise_ship': 20
        }
        
        for transport in tour_data.get('transportation', []):
            transport_type = transport.get('type', '').lower()
            score = transport_sustainability.get(transport_type, 50)
            distance = transport.get('distance_km', 100)
            
            # Penalizar distancias largas
            if distance > 1000:
                score *= 0.8
            elif distance > 500:
                score *= 0.9
            
            transport_scores.append(score)
        
        return statistics.mean(transport_scores) if transport_scores else 50.0
    
    def _calculate_eco_accommodation_score(self, tour_data: Dict[str, Any]) -> float:
        """Calcula el score de alojamientos eco-friendly"""
        accommodation_scores = []
        
        # Scoring por tipo de alojamiento (0-100)
        accommodation_sustainability = {
            'eco_lodge': 95,
            'camping': 90,
            'glamping': 85,
            'hostel': 75,
            'vacation_rental': 70,
            'boutique_hotel': 65,
            'budget_hotel': 60,
            'business_hotel': 50,
            'luxury_hotel': 40
        }
        
        for accommodation in tour_data.get('accommodations', []):
            acc_type = accommodation.get('type', '').lower()
            base_score = accommodation_sustainability.get(acc_type, 50)
            
            # Bonus por certificaciones
            certifications = accommodation.get('certifications', [])
            cert_bonus = len(certifications) * 10  # 10 puntos por certificación
            
            # Bonus por prácticas sostenibles
            sustainable_practices = accommodation.get('sustainable_practices', [])
            practice_bonus = len(sustainable_practices) * 5  # 5 puntos por práctica
            
            total_score = min(100, base_score + cert_bonus + practice_bonus)
            accommodation_scores.append(total_score)
        
        return statistics.mean(accommodation_scores) if accommodation_scores else 50.0
    
    def _calculate_local_employment_score(self, tour_data: Dict[str, Any]) -> float:
        """Calcula el score de empleo local"""
        total_employees = 0
        local_employees = 0
        
        # Analizar proveedores de servicios
        for service in tour_data.get('service_providers', []):
            employees = service.get('total_employees', 0)
            local_emp = service.get('local_employees', 0)
            
            total_employees += employees
            local_employees += local_emp
        
        if total_employees == 0:
            return 50.0  # Score neutro si no hay datos
        
        return (local_employees / total_employees) * 100
    
    def _calculate_community_investment_score(self, tour_data: Dict[str, Any]) -> float:
        """Calcula el score de inversión en comunidad"""
        total_cost = tour_data.get('total_cost', 0)
        community_investment = 0
        
        # Sumar inversiones directas en comunidad
        for investment in tour_data.get('community_investments', []):
            community_investment += investment.get('amount', 0)
        
        # Sumar porcentaje de servicios locales
        for service in tour_data.get('service_providers', []):
            if service.get('is_local', False):
                community_investment += service.get('cost', 0)
        
        if total_cost == 0:
            return 2.0  # Score neutro si no hay datos
        
        return (community_investment / total_cost) * 100
    
    def _calculate_local_procurement_score(self, tour_data: Dict[str, Any]) -> float:
        """Calcula el score de adquisiciones locales"""
        total_procurement = 0
        local_procurement = 0
        
        # Analizar adquisiciones
        for procurement in tour_data.get('procurement', []):
            amount = procurement.get('amount', 0)
            total_procurement += amount
            
            if procurement.get('is_local', False):
                local_procurement += amount
        
        # Considerar comida local
        for meal in tour_data.get('meals', []):
            if meal.get('is_local_cuisine', False):
                local_procurement += meal.get('cost', 10)  # Valor estimado
                total_procurement += meal.get('cost', 10)
        
        if total_procurement == 0:
            return 50.0  # Score neutro si no hay datos
        
        return (local_procurement / total_procurement) * 100
    
    def _calculate_cultural_authenticity_score(self, tour_data: Dict[str, Any]) -> float:
        """Calcula el score de autenticidad cultural"""
        authenticity_factors = []
        
        # Analizar actividades culturales
        cultural_activities = 0
        total_activities = len(tour_data.get('activities', []))
        
        for activity in tour_data.get('activities', []):
            if activity.get('type', '').lower() in ['cultural_experience', 'heritage_visit', 'local_tradition']:
                cultural_activities += 1
                
                # Bonus por guías locales
                if activity.get('has_local_guide', False):
                    authenticity_factors.append(90)
                else:
                    authenticity_factors.append(70)
        
        if total_activities > 0:
            cultural_ratio = (cultural_activities / total_activities) * 100
            authenticity_factors.append(cultural_ratio)
        
        # Evaluar alojamientos con carácter local
        for accommodation in tour_data.get('accommodations', []):
            if accommodation.get('type', '').lower() in ['boutique_hotel', 'eco_lodge', 'local_guesthouse']:
                authenticity_factors.append(85)
        
        # Evaluar comida local
        local_meals = 0
        total_meals = len(tour_data.get('meals', []))
        
        for meal in tour_data.get('meals', []):
            if meal.get('is_local_cuisine', False):
                local_meals += 1
        
        if total_meals > 0:
            local_food_ratio = (local_meals / total_meals) * 100
            authenticity_factors.append(local_food_ratio)
        
        return statistics.mean(authenticity_factors) if authenticity_factors else 50.0
    
    async def evaluate_certification_eligibility(self, metrics: List[SustainabilityMetric]) -> List[CertificationType]:
        """Evalúa elegibilidad para certificaciones de sostenibilidad"""
        eligible_certifications = []
        
        try:
            # Organizar métricas por categoría
            metrics_by_category = defaultdict(list)
            for metric in metrics:
                metrics_by_category[metric.category].append(metric)
            
            # Evaluar cada tipo de certificación
            for cert_type, criteria in self.certification_criteria.items():
                if await self._meets_certification_criteria(cert_type, criteria, metrics_by_category):
                    eligible_certifications.append(cert_type)
            
            return eligible_certifications
            
        except Exception as e:
            logger.error(f"Error evaluating certification eligibility: {str(e)}")
            return []
    
    async def _meets_certification_criteria(self, cert_type: CertificationType, 
                                          criteria: Dict[str, float],
                                          metrics_by_category: Dict[SustainabilityCategory, List[SustainabilityMetric]]) -> bool:
        """Verifica si se cumplen los criterios de una certificación específica"""
        
        if cert_type == CertificationType.GREEN_KEY:
            # Verificar criterios Green Key
            environmental_metrics = metrics_by_category.get(SustainabilityCategory.ENVIRONMENTAL, [])
            
            # Verificar gestión de energía y agua
            energy_criteria_met = any(
                m.metric_name == "Carbon Intensity" and m.value <= 20.0 
                for m in environmental_metrics
            )
            
            accommodation_metrics = metrics_by_category.get(SustainabilityCategory.ACCOMMODATION, [])
            accommodation_criteria_met = any(
                m.metric_name == "Eco-Accommodation Score" and m.value >= criteria['environmental_management']
                for m in accommodation_metrics
            )
            
            return energy_criteria_met and accommodation_criteria_met
        
        elif cert_type == CertificationType.TRAVELIFE:
            # Verificar criterios Travelife
            social_metrics = metrics_by_category.get(SustainabilityCategory.SOCIAL, [])
            environmental_metrics = metrics_by_category.get(SustainabilityCategory.ENVIRONMENTAL, [])
            
            social_criteria_met = any(
                m.metric_name == "Local Employment Rate" and m.value >= criteria['social_policy']
                for m in social_metrics
            )
            
            environmental_criteria_met = any(
                m.metric_name == "Carbon Intensity" and m.value <= 25.0
                for m in environmental_metrics
            )
            
            return social_criteria_met and environmental_criteria_met
        
        elif cert_type == CertificationType.CARBON_NEUTRAL:
            # Verificar criterios Carbon Neutral
            environmental_metrics = metrics_by_category.get(SustainabilityCategory.ENVIRONMENTAL, [])
            
            return any(
                m.metric_name == "Carbon Intensity" and m.value <= 5.0
                for m in environmental_metrics
            )
        
        elif cert_type == CertificationType.RAINFOREST_ALLIANCE:
            # Verificar criterios Rainforest Alliance
            environmental_metrics = metrics_by_category.get(SustainabilityCategory.ENVIRONMENTAL, [])
            social_metrics = metrics_by_category.get(SustainabilityCategory.SOCIAL, [])
            cultural_metrics = metrics_by_category.get(SustainabilityCategory.CULTURAL, [])
            
            environmental_ok = any(
                m.metric_name == "Carbon Intensity" and m.value <= 15.0
                for m in environmental_metrics
            )
            
            social_ok = any(
                m.value >= criteria['community_wellbeing']
                for m in social_metrics
            )
            
            cultural_ok = any(
                m.value >= 75.0
                for m in cultural_metrics
            )
            
            return environmental_ok and social_ok and cultural_ok
        
        # Para otras certificaciones, aplicar criterios generales
        return True  # Simplificado para el ejemplo
    
    async def generate_sustainability_recommendations(self, assessment: SustainabilityAssessment) -> List[EcoFriendlyRecommendation]:
        """Genera recomendaciones personalizadas de sostenibilidad"""
        recommendations = []
        
        try:
            # Analizar métricas con mayor potencial de mejora
            improvement_opportunities = []
            
            for metric in assessment.metrics:
                if metric.improvement_potential > 0:
                    improvement_opportunities.append({
                        'category': metric.category,
                        'metric': metric.metric_name,
                        'potential': metric.improvement_potential,
                        'current_value': metric.value,
                        'target': metric.target
                    })
            
            # Ordenar por potencial de mejora
            improvement_opportunities.sort(key=lambda x: x['potential'], reverse=True)
            
            # Generar recomendaciones para las top 3-5 oportunidades
            for i, opportunity in enumerate(improvement_opportunities[:5]):
                rec = await self._create_specific_recommendation(opportunity, i + 1)
                if rec:
                    recommendations.append(rec)
            
            # Agregar recomendaciones generales basadas en el assessment
            general_recs = await self._generate_general_recommendations(assessment)
            recommendations.extend(general_recs)
            
            # Calcular scores de prioridad
            for rec in recommendations:
                rec.priority_score = self._calculate_recommendation_priority(rec, assessment)
            
            # Ordenar por prioridad
            recommendations.sort(key=lambda x: x.priority_score, reverse=True)
            
            return recommendations[:10]  # Limitar a las 10 más importantes
            
        except Exception as e:
            logger.error(f"Error generating sustainability recommendations: {str(e)}")
            return []
    
    async def _create_specific_recommendation(self, opportunity: Dict[str, Any], rank: int) -> Optional[EcoFriendlyRecommendation]:
        """Crea una recomendación específica basada en una oportunidad de mejora"""
        
        category = opportunity['category']
        metric = opportunity['metric']
        potential = opportunity['potential']
        
        rec_id = f"rec_{category.value}_{rank}_{int(datetime.now().timestamp())}"
        
        if category == SustainabilityCategory.ENVIRONMENTAL:
            if "Carbon Intensity" in metric:
                return EcoFriendlyRecommendation(
                    recommendation_id=rec_id,
                    category=category,
                    title="Reduce Carbon Footprint",
                    description=f"Your current carbon intensity is {opportunity['current_value']:.1f} kg CO2/day. "
                              f"Target: {opportunity['target']:.1f} kg CO2/day. Consider eco-friendly transportation, "
                              f"green accommodations, and carbon offset programs.",
                    impact_reduction=potential,
                    cost_implication="Low to Medium (+0-15% tour cost)",
                    difficulty_level="Medium",
                    certification_bonus=[CertificationType.CARBON_NEUTRAL, CertificationType.GREEN_KEY],
                    implementation_timeline="1-3 months"
                )
        
        elif category == SustainabilityCategory.TRANSPORTATION:
            return EcoFriendlyRecommendation(
                recommendation_id=rec_id,
                category=category,
                title="Optimize Sustainable Transportation",
                description=f"Improve your sustainable transport score from {opportunity['current_value']:.1f} "
                          f"to {opportunity['target']:.1f}. Prioritize rail travel, electric vehicles, "
                          f"and public transportation options.",
                impact_reduction=potential,
                cost_implication="Variable (-5% to +10% transport costs)",
                difficulty_level="Medium",
                certification_bonus=[CertificationType.TRAVELIFE],
                implementation_timeline="Immediate to 1 month"
            )
        
        elif category == SustainabilityCategory.SOCIAL:
            if "Local Employment" in metric:
                return EcoFriendlyRecommendation(
                    recommendation_id=rec_id,
                    category=category,
                    title="Increase Local Employment",
                    description=f"Current local employment rate: {opportunity['current_value']:.1f}%. "
                              f"Target: {opportunity['target']:.1f}%. Partner with local tour operators, "
                              f"guides, and service providers to boost community employment.",
                    impact_reduction=potential,
                    cost_implication="Neutral (0-5% cost variation)",
                    difficulty_level="Easy to Medium",
                    certification_bonus=[CertificationType.TRAVELIFE, CertificationType.RAINFOREST_ALLIANCE],
                    implementation_timeline="1-2 months"
                )
        
        # Recomendación genérica si no hay match específico
        return EcoFriendlyRecommendation(
            recommendation_id=rec_id,
            category=category,
            title=f"Improve {category.value.title()} Sustainability",
            description=f"Focus on improving {metric} metrics to enhance overall sustainability performance.",
            impact_reduction=potential,
            cost_implication="Variable",
            difficulty_level="Medium",
            certification_bonus=[],
            implementation_timeline="1-3 months"
        )
    
    async def _generate_general_recommendations(self, assessment: SustainabilityAssessment) -> List[EcoFriendlyRecommendation]:
        """Genera recomendaciones generales basadas en el assessment completo"""
        recommendations = []
        
        # Recomendación basada en score general
        if assessment.overall_score < 60:
            recommendations.append(EcoFriendlyRecommendation(
                recommendation_id=f"general_improvement_{int(datetime.now().timestamp())}",
                category=SustainabilityCategory.ENVIRONMENTAL,
                title="Comprehensive Sustainability Improvement Plan",
                description="Your overall sustainability score indicates significant room for improvement. "
                          "Consider implementing a structured sustainability program with regular monitoring.",
                impact_reduction=40.0,
                cost_implication="Medium (+10-20% operational costs initially)",
                difficulty_level="High",
                certification_bonus=list(CertificationType),
                priority_score=95.0,
                implementation_timeline="3-6 months"
            ))
        
        # Recomendación de certificación
        if assessment.certifications_eligible:
            cert_names = [cert.value.replace('_', ' ').title() for cert in assessment.certifications_eligible[:3]]
            recommendations.append(EcoFriendlyRecommendation(
                recommendation_id=f"certification_{int(datetime.now().timestamp())}",
                category=SustainabilityCategory.ENVIRONMENTAL,
                title="Pursue Sustainability Certifications",
                description=f"You're eligible for: {', '.join(cert_names)}. "
                          f"These certifications will enhance credibility and attract eco-conscious travelers.",
                impact_reduction=20.0,
                cost_implication="Medium (certification fees + compliance costs)",
                difficulty_level="Medium",
                certification_bonus=assessment.certifications_eligible[:3],
                priority_score=85.0,
                implementation_timeline="2-4 months"
            ))
        
        # Recomendación de compensación de carbono
        if assessment.carbon_footprint.total_emissions > 30:
            recommendations.append(EcoFriendlyRecommendation(
                recommendation_id=f"carbon_offset_{int(datetime.now().timestamp())}",
                category=SustainabilityCategory.ENVIRONMENTAL,
                title="Implement Carbon Offset Program",
                description=f"Offset {assessment.carbon_footprint.total_emissions:.1f} kg CO2 "
                          f"(≈${assessment.carbon_footprint.offset_cost:.2f}) through verified projects. "
                          f"Plant {assessment.carbon_footprint.equivalent_trees} trees equivalent.",
                impact_reduction=assessment.carbon_footprint.total_emissions,
                cost_implication=f"Low (+${assessment.carbon_footprint.offset_cost:.2f})",
                difficulty_level="Easy",
                certification_bonus=[CertificationType.CARBON_NEUTRAL],
                priority_score=75.0,
                implementation_timeline="Immediate"
            ))
        
        return recommendations
    
    def _calculate_recommendation_priority(self, recommendation: EcoFriendlyRecommendation, 
                                         assessment: SustainabilityAssessment) -> float:
        """Calcula el score de prioridad de una recomendación"""
        
        # Factores de prioridad
        impact_factor = recommendation.impact_reduction / 100.0  # 0-1
        
        # Factor de dificultad (más fácil = mayor prioridad)
        difficulty_factors = {
            "Easy": 1.0,
            "Medium": 0.8,
            "High": 0.6
        }
        difficulty_factor = difficulty_factors.get(recommendation.difficulty_level, 0.7)
        
        # Factor de costo (menor costo = mayor prioridad)
        cost_factor = 1.0
        if "High" in recommendation.cost_implication:
            cost_factor = 0.6
        elif "Medium" in recommendation.cost_implication:
            cost_factor = 0.8
        elif "Low" in recommendation.cost_implication:
            cost_factor = 1.0
        
        # Factor de certificaciones (más certificaciones = mayor prioridad)
        cert_factor = min(1.0, len(recommendation.certification_bonus) * 0.2 + 0.6)
        
        # Factor de timeline (más rápido = mayor prioridad)
        timeline_factor = 1.0
        if "month" in recommendation.implementation_timeline.lower():
            if "1-2" in recommendation.implementation_timeline:
                timeline_factor = 1.0
            elif "1-3" in recommendation.implementation_timeline:
                timeline_factor = 0.9
            elif "3-6" in recommendation.implementation_timeline:
                timeline_factor = 0.7
        elif "Immediate" in recommendation.implementation_timeline:
            timeline_factor = 1.2
        
        # Calcular score final (0-100)
        priority_score = (
            impact_factor * 30 +
            difficulty_factor * 25 +
            cost_factor * 20 +
            cert_factor * 15 +
            timeline_factor * 10
        )
        
        return min(100.0, priority_score)


class SustainabilityAdvisorAgent(BaseAgent):
    """
    Agente de Asesoramiento en Sostenibilidad Turística
    
    Capacidades principales:
    - Análisis completo de sostenibilidad de tours y destinos
    - Cálculo detallado de huella de carbono
    - Evaluación de elegibilidad para certificaciones eco-friendly
    - Generación de recomendaciones personalizadas
    - Monitoreo de métricas de sostenibilidad
    - Optimización de impacto ambiental y social
    """
    
    def __init__(self):
        super().__init__("SustainabilityAdvisor AI", "sustainability_advisor")
        
        # Initialize components
        self.processor = SustainabilityProcessor()
        self.performance_monitor = PerformanceMonitor("sustainability_advisor")
        self.health_checker = HealthChecker("sustainability_advisor")
        
        # Redis cache for sustainability data
        self.redis_client = None
        self.cache_ttl = 86400  # 24 hours
        
        # Metrics tracking
        self.assessments_completed = 0
        self.carbon_calculations_performed = 0
        self.recommendations_generated = 0
        self.certifications_identified = 0
        
        logger.info("SustainabilityAdvisor AI Agent initialized successfully")
    
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
            logger.info("Redis connection established for SustainabilityAdvisor")
            
            # Initialize ML models (in a real scenario, these would be pre-trained)
            await self._initialize_models()
            
            # Start health monitoring
            await self.health_checker.start_monitoring()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize SustainabilityAdvisor: {str(e)}")
            return False
    
    async def _initialize_models(self):
        """Inicializa los modelos de machine learning"""
        try:
            # En un entorno real, aquí cargaríamos modelos pre-entrenados
            # Por ahora, generamos datos sintéticos para demostración
            
            # Generar datos de entrenamiento sintéticos
            np.random.seed(42)
            
            # Datos para predicción de huella de carbono
            n_samples = 1000
            features = np.random.rand(n_samples, 8)  # 8 features
            carbon_target = (
                features[:, 0] * 50 +  # transport factor
                features[:, 1] * 30 +  # accommodation factor
                features[:, 2] * 20 +  # activities factor
                features[:, 3] * 15 +  # food factor
                np.random.normal(0, 5, n_samples)  # noise
            )
            
            # Entrenar modelo de predicción de carbono
            carbon_features_scaled = self.processor.ml_models['carbon_scaler'].fit_transform(features)
            self.processor.ml_models['carbon_predictor'].fit(carbon_features_scaled, carbon_target)
            
            # Datos para clasificación de sostenibilidad
            sustainability_labels = np.random.choice([0, 1, 2], n_samples)  # 0: low, 1: medium, 2: high
            sustainability_features_scaled = self.processor.ml_models['sustainability_scaler'].fit_transform(features[:, :6])
            self.processor.ml_models['sustainability_classifier'].fit(sustainability_features_scaled, sustainability_labels)
            
            # Clustering para recomendaciones
            self.processor.ml_models['recommendation_cluster'].fit(features[:, :4])
            
            logger.info("ML models initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing ML models: {str(e)}")
    
    async def process_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Procesa una solicitud de asesoramiento en sostenibilidad"""
        
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
            
            # Check cache first
            cached_result = await self._get_cached_result(request_data)
            if cached_result:
                logger.info(f"Returning cached sustainability assessment for request {request_id}")
                return cached_result
            
            # Process request
            result = await self._process_sustainability_request(request_data, request_id)
            
            # Cache result
            await self._cache_result(request_data, result)
            
            # Update metrics
            await self._update_metrics(result)
            
            # Log performance
            processing_time = (datetime.now() - start_time).total_seconds()
            await self.performance_monitor.log_request(request_id, processing_time, result['success'])
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing sustainability request {request_id}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'request_id': request_id,
                'timestamp': datetime.now().isoformat()
            }
    
    def _validate_request(self, request_data: Dict[str, Any]) -> bool:
        """Valida los datos de la solicitud"""
        required_fields = ['tour_data']
        
        for field in required_fields:
            if field not in request_data:
                logger.warning(f"Missing required field: {field}")
                return False
        
        tour_data = request_data['tour_data']
        
        # Validar estructura básica del tour
        if not isinstance(tour_data, dict):
            return False
        
        return True
    
    async def _process_sustainability_request(self, request_data: Dict[str, Any], request_id: str) -> Dict[str, Any]:
        """Procesa la solicitud de sostenibilidad"""
        
        tour_data = request_data['tour_data']
        assessment_type = request_data.get('assessment_type', 'comprehensive')
        
        try:
            # Realizar evaluación completa de sostenibilidad
            assessment = await self._conduct_sustainability_assessment(tour_data, request_id)
            
            # Generar recomendaciones personalizadas
            recommendations = await self.processor.generate_sustainability_recommendations(assessment)
            
            # Crear plan de mejora
            improvement_plan = await self._create_improvement_plan(assessment, recommendations)
            
            # Preparar respuesta
            response = {
                'success': True,
                'request_id': request_id,
                'assessment': {
                    'assessment_id': assessment.assessment_id,
                    'tour_id': assessment.tour_id,
                    'overall_score': assessment.overall_score,
                    'category_scores': {cat.value: score for cat, score in assessment.category_scores.items()},
                    'carbon_footprint': {
                        'total_emissions': assessment.carbon_footprint.total_emissions,
                        'emissions_per_day': assessment.carbon_footprint.total_emissions / tour_data.get('duration_days', 1),
                        'breakdown': {
                            'transportation': assessment.carbon_footprint.transportation_emissions,
                            'accommodation': assessment.carbon_footprint.accommodation_emissions,
                            'activities': assessment.carbon_footprint.activity_emissions,
                            'food': assessment.carbon_footprint.food_emissions
                        },
                        'offset_cost': assessment.carbon_footprint.offset_cost,
                        'equivalent_trees': assessment.carbon_footprint.equivalent_trees,
                        'reduction_recommendations': assessment.carbon_footprint.reduction_recommendations
                    },
                    'certifications_eligible': [cert.value for cert in assessment.certifications_eligible],
                    'compliance_status': assessment.compliance_status
                },
                'recommendations': [
                    {
                        'id': rec.recommendation_id,
                        'category': rec.category.value,
                        'title': rec.title,
                        'description': rec.description,
                        'impact_reduction': rec.impact_reduction,
                        'cost_implication': rec.cost_implication,
                        'difficulty_level': rec.difficulty_level,
                        'priority_score': rec.priority_score,
                        'implementation_timeline': rec.implementation_timeline,
                        'certification_bonus': [cert.value for cert in rec.certification_bonus]
                    }
                    for rec in recommendations
                ],
                'improvement_plan': improvement_plan,
                'metrics': [
                    {
                        'category': metric.category.value,
                        'metric_name': metric.metric_name,
                        'current_value': metric.value,
                        'target_value': metric.target,
                        'benchmark': metric.benchmark,
                        'impact_level': metric.impact_level.value,
                        'improvement_potential': metric.improvement_potential,
                        'certification_eligible': metric.certification_eligible
                    }
                    for metric in assessment.metrics
                ],
                'summary': await self._generate_assessment_summary(assessment, recommendations),
                'timestamp': datetime.now().isoformat()
            }
            
            return response
            
        except Exception as e:
            logger.error(f"Error in sustainability assessment: {str(e)}")
            raise
    
    async def _conduct_sustainability_assessment(self, tour_data: Dict[str, Any], request_id: str) -> SustainabilityAssessment:
        """Realiza una evaluación completa de sostenibilidad"""
        
        assessment_id = f"assess_{request_id}_{int(datetime.now().timestamp())}"
        tour_id = tour_data.get('tour_id', f"tour_{int(datetime.now().timestamp())}")
        
        try:
            # Calcular huella de carbono
            carbon_footprint = await self.processor.calculate_carbon_footprint(tour_data)
            
            # Evaluar métricas de sostenibilidad
            metrics = await self.processor.assess_sustainability_metrics(tour_data)
            
            # Calcular scores por categoría
            category_scores = {}
            for category in SustainabilityCategory:
                category_metrics = [m for m in metrics if m.category == category]
                if category_metrics:
                    # Promedio ponderado por confianza
                    weighted_sum = sum(m.value * m.confidence_score for m in category_metrics)
                    total_confidence = sum(m.confidence_score for m in category_metrics)
                    
                    if total_confidence > 0:
                        category_scores[category] = weighted_sum / total_confidence
                    else:
                        category_scores[category] = 50.0  # Score neutro
                else:
                    category_scores[category] = 50.0  # Score neutro si no hay métricas
            
            # Calcular score general
            overall_score = statistics.mean(category_scores.values()) if category_scores else 50.0
            
            # Evaluar elegibilidad para certificaciones
            certifications_eligible = await self.processor.evaluate_certification_eligibility(metrics)
            
            # Crear plan de mejora inicial
            improvement_plan = {
                'priority_areas': [],
                'quick_wins': [],
                'long_term_goals': [],
                'estimated_timeline': '3-6 months',
                'investment_required': 'Medium'
            }
            
            # Estado de cumplimiento
            compliance_status = {
                'environmental_regulations': 'Compliant' if overall_score >= 60 else 'Needs Improvement',
                'social_standards': 'Compliant' if category_scores.get(SustainabilityCategory.SOCIAL, 0) >= 60 else 'Needs Improvement',
                'certification_readiness': 'Ready' if certifications_eligible else 'Preparation Needed'
            }
            
            assessment = SustainabilityAssessment(
                assessment_id=assessment_id,
                tour_id=tour_id,
                overall_score=overall_score,
                category_scores=category_scores,
                metrics=metrics,
                carbon_footprint=carbon_footprint,
                certifications_eligible=certifications_eligible,
                recommendations=[],  # Se llenará después
                improvement_plan=improvement_plan,
                compliance_status=compliance_status
            )
            
            return assessment
            
        except Exception as e:
            logger.error(f"Error conducting sustainability assessment: {str(e)}")
            raise
    
    async def _create_improvement_plan(self, assessment: SustainabilityAssessment, 
                                     recommendations: List[EcoFriendlyRecommendation]) -> Dict[str, Any]:
        """Crea un plan de mejora detallado"""
        
        try:
            # Clasificar recomendaciones por prioridad y timeline
            high_priority = [r for r in recommendations if r.priority_score >= 80]
            medium_priority = [r for r in recommendations if 60 <= r.priority_score < 80]
            low_priority = [r for r in recommendations if r.priority_score < 60]
            
            quick_wins = [r for r in recommendations if 'Immediate' in r.implementation_timeline or '1 month' in r.implementation_timeline]
            long_term = [r for r in recommendations if '3-6 months' in r.implementation_timeline or '6 months' in r.implementation_timeline]
            
            # Identificar áreas prioritarias
            priority_areas = []
            for category, score in assessment.category_scores.items():
                if score < 60:
                    priority_areas.append({
                        'category': category.value,
                        'current_score': score,
                        'target_score': 75.0,
                        'improvement_needed': 75.0 - score
                    })
            
            # Calcular inversión estimada
            cost_levels = [r.cost_implication for r in recommendations]
            high_cost_count = sum(1 for cost in cost_levels if 'High' in cost)
            medium_cost_count = sum(1 for cost in cost_levels if 'Medium' in cost)
            
            if high_cost_count >= 3:
                investment_level = 'High'
            elif medium_cost_count >= 2:
                investment_level = 'Medium'
            else:
                investment_level = 'Low'
            
            # Timeline estimado
            if len(long_term) >= 3:
                timeline = '6-12 months'
            elif len(recommendations) >= 5:
                timeline = '3-6 months'
            else:
                timeline = '1-3 months'
            
            improvement_plan = {
                'executive_summary': f"Overall sustainability score: {assessment.overall_score:.1f}/100. "
                                   f"{len(assessment.certifications_eligible)} certification(s) available. "
                                   f"{len(recommendations)} improvement opportunities identified.",
                'priority_areas': priority_areas,
                'quick_wins': [
                    {
                        'title': r.title,
                        'expected_impact': r.impact_reduction,
                        'timeline': r.implementation_timeline,
                        'cost': r.cost_implication
                    }
                    for r in quick_wins[:3]
                ],
                'long_term_goals': [
                    {
                        'title': r.title,
                        'expected_impact': r.impact_reduction,
                        'timeline': r.implementation_timeline,
                        'certification_bonus': [cert.value for cert in r.certification_bonus]
                    }
                    for r in long_term[:3]
                ],
                'estimated_timeline': timeline,
                'investment_required': investment_level,
                'expected_roi': {
                    'cost_savings': 'Medium-term cost reductions through efficiency improvements',
                    'revenue_increase': 'Attract eco-conscious travelers (15-25% premium)',
                    'risk_mitigation': 'Reduced regulatory and reputational risks',
                    'certification_benefits': 'Access to green tourism markets and partnerships'
                },
                'success_metrics': [
                    f"Achieve overall sustainability score of 75+ (current: {assessment.overall_score:.1f})",
                    f"Reduce carbon footprint by {sum(r.impact_reduction for r in recommendations[:3]):.1f}%",
                    f"Obtain {len(assessment.certifications_eligible)} sustainability certification(s)",
                    "Increase customer satisfaction scores by 10-15%"
                ]
            }
            
            return improvement_plan
            
        except Exception as e:
            logger.error(f"Error creating improvement plan: {str(e)}")
            return {
                'error': 'Unable to create improvement plan',
                'message': str(e)
            }
    
    async def _generate_assessment_summary(self, assessment: SustainabilityAssessment, 
                                         recommendations: List[EcoFriendlyRecommendation]) -> Dict[str, Any]:
        """Genera un resumen ejecutivo del assessment"""
        
        try:
            # Determinar nivel de sostenibilidad general
            if assessment.overall_score >= 85:
                sustainability_level = "Excellent"
                level_description = "Outstanding sustainability performance across all categories"
            elif assessment.overall_score >= 70:
                sustainability_level = "Good"
                level_description = "Solid sustainability practices with room for improvement"
            elif assessment.overall_score >= 50:
                sustainability_level = "Fair"
                level_description = "Basic sustainability measures in place, significant improvements needed"
            else:
                sustainability_level = "Needs Improvement"
                level_description = "Substantial sustainability improvements required"
            
            # Identificar fortalezas y debilidades
            strengths = []
            weaknesses = []
            
            for category, score in assessment.category_scores.items():
                if score >= 75:
                    strengths.append(f"{category.value.title()}: {score:.1f}/100")
                elif score < 50:
                    weaknesses.append(f"{category.value.title()}: {score:.1f}/100")
            
            # Carbon footprint analysis
            carbon_per_day = assessment.carbon_footprint.total_emissions / max(1, assessment.tour_id.count('day'))  # Estimación simple
            
            if carbon_per_day <= 10:
                carbon_level = "Low Impact"
            elif carbon_per_day <= 25:
                carbon_level = "Moderate Impact"
            else:
                carbon_level = "High Impact"
            
            # Certification opportunities
            cert_summary = f"{len(assessment.certifications_eligible)} certification(s) available" if assessment.certifications_eligible else "No immediate certification opportunities"
            
            summary = {
                'sustainability_level': sustainability_level,
                'level_description': level_description,
                'overall_score': assessment.overall_score,
                'carbon_footprint': {
                    'total_emissions': assessment.carbon_footprint.total_emissions,
                    'daily_average': carbon_per_day,
                    'impact_level': carbon_level,
                    'offset_cost': assessment.carbon_footprint.offset_cost
                },
                'strengths': strengths,
                'areas_for_improvement': weaknesses,
                'top_recommendations': [
                    {
                        'title': rec.title,
                        'impact': rec.impact_reduction,
                        'priority': rec.priority_score
                    }
                    for rec in recommendations[:3]
                ],
                'certification_opportunities': cert_summary,
                'key_actions': [
                    rec.title for rec in recommendations 
                    if rec.priority_score >= 80 and 'Immediate' in rec.implementation_timeline
                ][:3],
                'business_impact': {
                    'market_positioning': 'Enhanced appeal to eco-conscious travelers',
                    'cost_implications': f"Estimated implementation cost: {assessment.improvement_plan.get('investment_required', 'Medium')}",
                    'revenue_opportunities': 'Access to green tourism premium markets',
                    'risk_mitigation': 'Reduced regulatory and environmental risks'
                }
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"Error generating assessment summary: {str(e)}")
            return {
                'error': 'Unable to generate summary',
                'message': str(e)
            }
    
    async def _get_cached_result(self, request_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Obtiene resultado cacheado si existe"""
        try:
            if not self.redis_client:
                return None
            
            # Generate cache key
            cache_key = self._generate_cache_key(request_data)
            
            # Get cached result
            cached_data = await self.redis_client.get(cache_key)
            
            if cached_data:
                return json.loads(cached_data)
            
            return None
            
        except Exception as e:
            logger.warning(f"Error retrieving cached result: {str(e)}")
            return None
    
    async def _cache_result(self, request_data: Dict[str, Any], result: Dict[str, Any]):
        """Cachea el resultado de la evaluación"""
        try:
            if not self.redis_client or not result.get('success'):
                return
            
            # Generate cache key
            cache_key = self._generate_cache_key(request_data)
            
            # Cache result
            await self.redis_client.setex(
                cache_key,
                self.cache_ttl,
                json.dumps(result, default=str)
            )
            
        except Exception as e:
            logger.warning(f"Error caching result: {str(e)}")
    
    def _generate_cache_key(self, request_data: Dict[str, Any]) -> str:
        """Genera una clave de cache única para la solicitud"""
        # Create a hash of the relevant request data
        tour_data_str = json.dumps(request_data.get('tour_data', {}), sort_keys=True)
        assessment_type = request_data.get('assessment_type', 'comprehensive')
        
        key_string = f"sustainability_{assessment_type}_{tour_data_str}"
        
        return hashlib.md5(key_string.encode()).hexdigest()
    
    async def _update_metrics(self, result: Dict[str, Any]):
        """Actualiza métricas internas del agente"""
        try:
            if result.get('success'):
                self.assessments_completed += 1
                
                if 'assessment' in result and 'carbon_footprint' in result['assessment']:
                    self.carbon_calculations_performed += 1
                
                if 'recommendations' in result:
                    self.recommendations_generated += len(result['recommendations'])
                
                if 'assessment' in result and 'certifications_eligible' in result['assessment']:
                    self.certifications_identified += len(result['assessment']['certifications_eligible'])
            
        except Exception as e:
            logger.error(f"Error updating metrics: {str(e)}")
    
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
                    'assessments_completed': self.assessments_completed,
                    'carbon_calculations_performed': self.carbon_calculations_performed,
                    'recommendations_generated': self.recommendations_generated,
                    'certifications_identified': self.certifications_identified
                },
                'capabilities': [
                    'Comprehensive sustainability assessment',
                    'Carbon footprint calculation',
                    'Certification eligibility evaluation',
                    'Personalized eco-friendly recommendations',
                    'Improvement plan generation',
                    'Environmental impact analysis',
                    'Social and economic sustainability metrics'
                ],
                'supported_certifications': [cert.value for cert in CertificationType],
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
            logger.info("Shutting down SustainabilityAdvisor AI Agent...")
            
            # Close Redis connection
            if self.redis_client:
                await self.redis_client.close()
            
            # Stop monitoring
            await self.health_checker.stop_monitoring()
            
            logger.info("SustainabilityAdvisor AI Agent shutdown complete")
            
        except Exception as e:
            logger.error(f"Error during agent shutdown: {str(e)}")


# Example usage and testing
async def main():
    """Función principal para testing del agente"""
    
    # Initialize agent
    agent = SustainabilityAdvisorAgent()
    
    # Test initialization
    init_success = await agent.initialize()
    if not init_success:
        logger.error("Failed to initialize SustainabilityAdvisor agent")
        return
    
    # Test request data
    test_request = {
        'request_id': 'test_sustainability_001',
        'assessment_type': 'comprehensive',
        'tour_data': {
            'tour_id': 'eco_tour_001',
            'tour_type': 'eco_adventure',
            'duration_days': 7,
            'participants': 4,
            'transportation': [
                {
                    'type': 'flight_international',
                    'distance_km': 8000,
                    'passengers': 4
                },
                {
                    'type': 'train_regional',
                    'distance_km': 150,
                    'passengers': 4
                }
            ],
            'accommodations': [
                {
                    'type': 'eco_lodge',
                    'nights': 3,
                    'guests': 4,
                    'certifications': ['green_key', 'rainforest_alliance'],
                    'sustainable_practices': ['solar_power', 'water_conservation', 'waste_management']
                },
                {
                    'type': 'camping',
                    'nights': 4,
                    'guests': 4,
                    'certifications': [],
                    'sustainable_practices': ['leave_no_trace']
                }
            ],
            'activities': [
                {
                    'type': 'hiking',
                    'duration_hours': 16,
                    'participants': 4,
                    'has_local_guide': True
                },
                {
                    'type': 'wildlife_safari',
                    'duration_hours': 8,
                    'participants': 4,
                    'has_local_guide': True
                },
                {
                    'type': 'cultural_experience',
                    'duration_hours': 4,
                    'participants': 4,
                    'has_local_guide': True
                }
            ],
            'meals': [
                {
                    'type': 'local_cuisine',
                    'count': 14,
                    'is_local_cuisine': True,
                    'cost': 15
                },
                {
                    'type': 'vegetarian',
                    'count': 7,
                    'is_local_cuisine': True,
                    'cost': 12
                }
            ],
            'service_providers': [
                {
                    'name': 'Local Eco Tours',
                    'is_local': True,
                    'total_employees': 25,
                    'local_employees': 24,
                    'cost': 2000
                }
            ],
            'community_investments': [
                {
                    'type': 'conservation_fund',
                    'amount': 200
                }
            ],
            'total_cost': 3500
        }
    }
    
    # Process test request
    logger.info("Processing test sustainability assessment...")
    result = await agent.process_request(test_request)
    
    # Display results
    if result['success']:
        print("\n=== SUSTAINABILITY ASSESSMENT RESULTS ===")
        
        assessment = result['assessment']
        print(f"Overall Score: {assessment['overall_score']:.1f}/100")
        
        print("\nCategory Scores:")
        for category, score in assessment['category_scores'].items():
            print(f"  {category.title()}: {score:.1f}/100")
        
        carbon = assessment['carbon_footprint']
        print(f"\nCarbon Footprint: {carbon['total_emissions']:.1f} kg CO2")
        print(f"Daily Average: {carbon['emissions_per_day']:.1f} kg CO2/day")
        print(f"Offset Cost: ${carbon['offset_cost']:.2f}")
        print(f"Trees Equivalent: {carbon['equivalent_trees']} trees")
        
        print(f"\nEligible Certifications: {', '.join(assessment['certifications_eligible'])}")
        
        print(f"\nTop Recommendations ({len(result['recommendations'])}):")
        for i, rec in enumerate(result['recommendations'][:3], 1):
            print(f"  {i}. {rec['title']} (Priority: {rec['priority_score']:.1f})")
            print(f"     Impact: {rec['impact_reduction']:.1f}% reduction")
            print(f"     Timeline: {rec['implementation_timeline']}")
        
        print("\nImprovement Plan:")
        plan = result['improvement_plan']
        print(f"  Timeline: {plan['estimated_timeline']}")
        print(f"  Investment: {plan['investment_required']}")
        print(f"  Quick Wins: {len(plan['quick_wins'])}")
        
        print("\n=== END RESULTS ===")
        
    else:
        print(f"Assessment failed: {result.get('error', 'Unknown error')}")
    
    # Get agent status
    status = await agent.get_agent_status()
    print(f"\nAgent Status: {status['status']}")
    print(f"Assessments Completed: {status['metrics']['assessments_completed']}")
    
    # Shutdown agent
    await agent.shutdown()


if __name__ == "__main__":
    asyncio.run(main())