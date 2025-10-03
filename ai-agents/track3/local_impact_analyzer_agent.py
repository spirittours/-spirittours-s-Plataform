"""
Spirit Tours - Local Impact Analyzer AI Agent
Agente especializado en análisis y maximización del impacto económico y social local
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass, field
from enum import Enum
import uuid

from ..core.base_agent import BaseAIAgent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ImpactCategory(Enum):
    """Categorías de impacto local"""
    ECONOMIC = "economic"                    # Impacto económico
    SOCIAL = "social"                        # Impacto social
    CULTURAL = "cultural"                    # Impacto cultural
    ENVIRONMENTAL = "environmental"          # Impacto ambiental
    INFRASTRUCTURE = "infrastructure"        # Impacto en infraestructura
    EMPLOYMENT = "employment"                # Impacto en empleo

class BusinessType(Enum):
    """Tipos de negocios locales"""
    FAMILY_RESTAURANT = "family_restaurant"
    LOCAL_ARTISAN = "local_artisan"
    SMALL_HOTEL = "small_hotel"
    TOUR_GUIDE = "tour_guide"
    TRANSPORT_SERVICE = "transport_service"
    CULTURAL_CENTER = "cultural_center"
    LOCAL_MARKET = "local_market"
    COMMUNITY_COOPERATIVE = "community_cooperative"

class ImpactLevel(Enum):
    """Niveles de impacto"""
    VERY_HIGH = "very_high"      # 90-100%
    HIGH = "high"                # 70-89%
    MEDIUM = "medium"            # 50-69%
    LOW = "low"                  # 30-49%
    MINIMAL = "minimal"          # 0-29%

@dataclass
class LocalBusiness:
    """Negocio local"""
    business_id: str
    name: str
    type: BusinessType
    location: str
    coordinates: Tuple[float, float]
    owner_profile: Dict[str, Any]
    employees_count: int
    annual_revenue: Optional[float] = None
    certifications: List[str] = field(default_factory=list)
    community_involvement: str = ""
    sustainability_practices: List[str] = field(default_factory=list)
    tourist_capacity: int = 0
    services_offered: List[str] = field(default_factory=list)
    languages_supported: List[str] = field(default_factory=list)

@dataclass
class ImpactMetric:
    """Métrica de impacto"""
    metric_name: str
    category: ImpactCategory
    value: float
    unit: str
    measurement_date: datetime
    source: str
    confidence_level: float  # 0-1
    notes: str = ""

@dataclass
class LocalImpactAssessment:
    """Evaluación de impacto local completa"""
    assessment_id: str
    destination: str
    assessment_period: Tuple[datetime, datetime]
    total_tourist_spending: float
    local_spending_percentage: float
    jobs_supported: int
    businesses_benefited: int
    cultural_preservation_score: float
    community_satisfaction: float
    environmental_impact_score: float
    metrics: List[ImpactMetric] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)

@dataclass
class TripImpactAnalysis:
    """Análisis de impacto de un viaje específico"""
    trip_id: str
    destination: str
    duration_days: int
    tourist_count: int
    total_spending: float
    local_spending: float
    local_spending_percentage: float
    businesses_supported: List[str] = field(default_factory=list)
    jobs_impact: float = 0.0
    cultural_activities: List[str] = field(default_factory=list)
    environmental_footprint: float = 0.0
    community_contribution: float = 0.0
    impact_score: float = 0.0

class LocalImpactAnalyzerAgent(BaseAIAgent):
    """
    Agente especializado en análisis de impacto local
    
    Funcionalidades:
    - Análisis de impacto económico local de viajes
    - Identificación de negocios locales genuinos
    - Medición de beneficios comunitarios
    - Optimización para maximizar impacto positivo
    - Tracking de preservación cultural
    - Evaluación de sostenibilidad social
    - Recomendaciones de turismo responsable
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        super().__init__("LocalImpactAnalyzerAgent", config)
        
        # Base de datos de negocios locales
        self.local_businesses = {}
        
        # Métricas de impacto por destino
        self.destination_metrics = {}
        
        # Factores de multiplicación económica
        self.economic_multipliers = {
            "local_restaurant": 1.8,      # Cada euro genera 1.8 en la economía local
            "local_artisan": 2.2,         # Mayor impacto por ser producción local
            "small_hotel": 1.6,           # Buena retención de capital local
            "tour_guide": 2.5,            # Alto impacto directo en empleo
            "transport_service": 1.4,     # Menor multiplicador por costos externos
            "cultural_center": 2.0,       # Alto valor cultural y social
            "local_market": 2.3,          # Beneficia múltiples vendedores
            "community_cooperative": 2.8   # Máximo impacto comunitario
        }
        
        # Pesos para cálculo de impacto
        self.impact_weights = {
            ImpactCategory.ECONOMIC: 0.25,
            ImpactCategory.SOCIAL: 0.20,
            ImpactCategory.CULTURAL: 0.20,
            ImpactCategory.ENVIRONMENTAL: 0.15,
            ImpactCategory.INFRASTRUCTURE: 0.10,
            ImpactCategory.EMPLOYMENT: 0.10
        }
        
        # Benchmarks de impacto por tipo de destino
        self.impact_benchmarks = {
            "rural_community": {
                "local_spending_target": 80.0,  # % de gasto en negocios locales
                "jobs_per_1000_euros": 0.15,    # Empleos generados por 1000€
                "cultural_preservation": 0.85    # Índice de preservación cultural
            },
            "small_city": {
                "local_spending_target": 60.0,
                "jobs_per_1000_euros": 0.08,
                "cultural_preservation": 0.70
            },
            "major_destination": {
                "local_spending_target": 40.0,
                "jobs_per_1000_euros": 0.05,
                "cultural_preservation": 0.55
            }
        }

    async def initialize(self):
        """Inicializar agente de análisis de impacto local"""
        try:
            logger.info("🏘️ Initializing Local Impact Analyzer Agent...")
            
            # Cargar base de datos de negocios locales
            await self._load_local_businesses_database()
            
            # Inicializar métricas de destinos
            await self._setup_destination_metrics()
            
            # Configurar partnerships con organizaciones locales
            await self._setup_community_partnerships()
            
            self.is_initialized = True
            logger.info("✅ Local Impact Analyzer Agent initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Local Impact Analyzer Agent: {e}")
            raise

    async def analyze_trip_impact(self, trip_data: Dict[str, Any]) -> TripImpactAnalysis:
        """Analizar impacto de un viaje específico"""
        try:
            trip_id = trip_data.get("trip_id", str(uuid.uuid4()))
            destination = trip_data.get("destination", "")
            duration_days = trip_data.get("duration_days", 1)
            tourist_count = trip_data.get("tourist_count", 1)
            
            # Analizar gasto total y distribución
            spending_analysis = await self._analyze_spending_distribution(trip_data)
            
            # Identificar negocios locales beneficiados
            local_businesses = await self._identify_benefited_businesses(trip_data)
            
            # Calcular impacto en empleos
            jobs_impact = await self._calculate_employment_impact(spending_analysis)
            
            # Evaluar actividades culturales
            cultural_activities = await self._evaluate_cultural_activities(trip_data)
            
            # Calcular huella ambiental local
            environmental_footprint = await self._calculate_local_environmental_impact(trip_data)
            
            # Evaluar contribución comunitaria
            community_contribution = await self._assess_community_contribution(trip_data)
            
            # Calcular score general de impacto
            impact_score = await self._calculate_overall_impact_score({
                "local_spending_percentage": spending_analysis["local_percentage"],
                "jobs_impact": jobs_impact,
                "cultural_engagement": len(cultural_activities),
                "community_contribution": community_contribution,
                "environmental_responsibility": 100 - environmental_footprint
            })
            
            analysis = TripImpactAnalysis(
                trip_id=trip_id,
                destination=destination,
                duration_days=duration_days,
                tourist_count=tourist_count,
                total_spending=spending_analysis["total_spending"],
                local_spending=spending_analysis["local_spending"],
                local_spending_percentage=spending_analysis["local_percentage"],
                businesses_supported=local_businesses,
                jobs_impact=jobs_impact,
                cultural_activities=cultural_activities,
                environmental_footprint=environmental_footprint,
                community_contribution=community_contribution,
                impact_score=impact_score
            )
            
            return analysis
            
        except Exception as e:
            logger.error(f"❌ Error analyzing trip impact: {e}")
            return None

    async def assess_destination_impact(self, destination: str, 
                                      assessment_period: Tuple[datetime, datetime]) -> LocalImpactAssessment:
        """Evaluar impacto general de un destino"""
        try:
            assessment_id = str(uuid.uuid4())
            
            # Recopilar datos de todos los viajes en el período
            trips_data = await self._get_trips_for_period(destination, assessment_period)
            
            # Calcular métricas agregadas
            total_spending = sum(trip.get("total_spending", 0) for trip in trips_data)
            local_spending = sum(trip.get("local_spending", 0) for trip in trips_data)
            local_percentage = (local_spending / max(total_spending, 1)) * 100
            
            # Calcular empleos soportados
            jobs_supported = await self._calculate_total_jobs_supported(trips_data)
            
            # Contar negocios beneficiados
            all_businesses = set()
            for trip in trips_data:
                businesses = await self._identify_benefited_businesses(trip)
                all_businesses.update(businesses)
            
            # Evaluar preservación cultural
            cultural_score = await self._assess_cultural_preservation(destination, trips_data)
            
            # Medir satisfacción comunitaria
            community_satisfaction = await self._measure_community_satisfaction(destination)
            
            # Evaluar impacto ambiental
            env_impact_score = await self._assess_environmental_impact(destination, trips_data)
            
            # Generar métricas detalladas
            metrics = await self._generate_detailed_metrics(destination, trips_data)
            
            # Generar recomendaciones
            recommendations = await self._generate_impact_recommendations(
                destination, local_percentage, cultural_score, env_impact_score
            )
            
            assessment = LocalImpactAssessment(
                assessment_id=assessment_id,
                destination=destination,
                assessment_period=assessment_period,
                total_tourist_spending=total_spending,
                local_spending_percentage=local_percentage,
                jobs_supported=jobs_supported,
                businesses_benefited=len(all_businesses),
                cultural_preservation_score=cultural_score,
                community_satisfaction=community_satisfaction,
                environmental_impact_score=env_impact_score,
                metrics=metrics,
                recommendations=recommendations
            )
            
            return assessment
            
        except Exception as e:
            logger.error(f"❌ Error assessing destination impact: {e}")
            return None

    async def optimize_itinerary_for_local_impact(self, itinerary: Dict[str, Any],
                                                target_local_percentage: float = 70.0) -> Dict[str, Any]:
        """Optimizar itinerario para maximizar impacto local"""
        try:
            optimization_result = {
                "original_itinerary": itinerary,
                "target_local_percentage": target_local_percentage,
                "optimized_itinerary": itinerary.copy(),
                "optimizations_made": [],
                "impact_improvements": {},
                "cost_adjustments": {}
            }
            
            # Analizar impacto actual
            current_impact = await self.analyze_trip_impact(itinerary)
            
            # Optimizar alojamiento
            accommodation_optimization = await self._optimize_accommodation_for_impact(
                itinerary.get("accommodation", [])
            )
            if accommodation_optimization["improvement"] > 0:
                optimization_result["optimized_itinerary"]["accommodation"] = accommodation_optimization["optimized"]
                optimization_result["optimizations_made"].append(accommodation_optimization)
            
            # Optimizar restauración
            dining_optimization = await self._optimize_dining_for_impact(
                itinerary.get("dining", [])
            )
            if dining_optimization["improvement"] > 0:
                optimization_result["optimized_itinerary"]["dining"] = dining_optimization["optimized"]
                optimization_result["optimizations_made"].append(dining_optimization)
            
            # Optimizar actividades
            activities_optimization = await self._optimize_activities_for_impact(
                itinerary.get("activities", [])
            )
            if activities_optimization["improvement"] > 0:
                optimization_result["optimized_itinerary"]["activities"] = activities_optimization["optimized"]
                optimization_result["optimizations_made"].append(activities_optimization)
            
            # Optimizar compras y souvenirs
            shopping_optimization = await self._optimize_shopping_for_impact(
                itinerary.get("shopping", [])
            )
            if shopping_optimization["improvement"] > 0:
                optimization_result["optimized_itinerary"]["shopping"] = shopping_optimization["optimized"]
                optimization_result["optimizations_made"].append(shopping_optimization)
            
            # Calcular nuevo impacto
            optimized_impact = await self.analyze_trip_impact(optimization_result["optimized_itinerary"])
            
            # Calcular mejoras
            optimization_result["impact_improvements"] = {
                "local_spending_increase": optimized_impact.local_spending_percentage - current_impact.local_spending_percentage,
                "additional_businesses": len(optimized_impact.businesses_supported) - len(current_impact.businesses_supported),
                "jobs_impact_increase": optimized_impact.jobs_impact - current_impact.jobs_impact,
                "cultural_engagement_increase": len(optimized_impact.cultural_activities) - len(current_impact.cultural_activities),
                "overall_score_improvement": optimized_impact.impact_score - current_impact.impact_score
            }
            
            return optimization_result
            
        except Exception as e:
            logger.error(f"❌ Error optimizing itinerary for local impact: {e}")
            return {}

    async def recommend_local_businesses(self, destination: str, 
                                       business_types: List[BusinessType],
                                       budget: Optional[float] = None) -> List[LocalBusiness]:
        """Recomendar negocios locales auténticos"""
        try:
            recommendations = []
            
            # Filtrar negocios por destino y tipo
            destination_businesses = [
                business for business in self.local_businesses.values()
                if business.location.lower() == destination.lower() and business.type in business_types
            ]
            
            # Aplicar filtro de presupuesto si se especifica
            if budget:
                destination_businesses = [
                    business for business in destination_businesses
                    if await self._is_business_within_budget(business, budget)
                ]
            
            # Calcular score de impacto para cada negocio
            scored_businesses = []
            for business in destination_businesses:
                impact_score = await self._calculate_business_impact_score(business)
                scored_businesses.append((business, impact_score))
            
            # Ordenar por score de impacto
            scored_businesses.sort(key=lambda x: x[1], reverse=True)
            
            # Seleccionar top recomendaciones
            for business, score in scored_businesses[:20]:  # Top 20
                recommendations.append(business)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"❌ Error recommending local businesses: {e}")
            return []

    async def track_community_development(self, destination: str,
                                        baseline_date: datetime) -> Dict[str, Any]:
        """Rastrear desarrollo comunitario a lo largo del tiempo"""
        try:
            # Obtener métricas históricas
            current_metrics = await self._get_current_community_metrics(destination)
            baseline_metrics = await self._get_historical_metrics(destination, baseline_date)
            
            # Calcular cambios
            development_tracking = {
                "destination": destination,
                "tracking_period": {
                    "start": baseline_date,
                    "end": datetime.utcnow()
                },
                "economic_development": {
                    "business_growth": await self._calculate_business_growth(destination, baseline_date),
                    "employment_increase": await self._calculate_employment_growth(destination, baseline_date),
                    "income_improvement": await self._calculate_income_improvement(destination, baseline_date)
                },
                "social_development": {
                    "education_improvements": await self._assess_education_improvements(destination, baseline_date),
                    "healthcare_access": await self._assess_healthcare_improvements(destination, baseline_date),
                    "infrastructure_development": await self._assess_infrastructure_development(destination, baseline_date)
                },
                "cultural_preservation": {
                    "traditions_maintained": await self._assess_cultural_maintenance(destination, baseline_date),
                    "language_preservation": await self._assess_language_preservation(destination, baseline_date),
                    "crafts_continuation": await self._assess_crafts_continuation(destination, baseline_date)
                },
                "sustainability_progress": {
                    "environmental_protection": await self._assess_environmental_progress(destination, baseline_date),
                    "resource_management": await self._assess_resource_management(destination, baseline_date),
                    "waste_management": await self._assess_waste_management(destination, baseline_date)
                }
            }
            
            return development_tracking
            
        except Exception as e:
            logger.error(f"❌ Error tracking community development: {e}")
            return {}

    async def _load_local_businesses_database(self):
        """Cargar base de datos de negocios locales"""
        # Simular carga de base de datos con negocios locales verificados
        sample_businesses = [
            LocalBusiness(
                business_id="local_001",
                name="Casa Rural María",
                type=BusinessType.SMALL_HOTEL,
                location="Puebla de Sanabria",
                coordinates=(42.0583, -6.6333),
                owner_profile={"family_owned": True, "generations": 3, "local_born": True},
                employees_count=5,
                annual_revenue=85000.0,
                certifications=["EcoTourism", "LocalProduct"],
                community_involvement="Sponsors local festivals, employs only locals",
                sustainability_practices=["solar_energy", "local_sourcing", "waste_reduction"],
                tourist_capacity=12,
                services_offered=["accommodation", "traditional_meals", "cultural_tours"],
                languages_supported=["es", "en"]
            )
        ]
        
        for business in sample_businesses:
            self.local_businesses[business.business_id] = business

    async def process_query(self, query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Procesar consulta específica sobre impacto local"""
        try:
            query_lower = query.lower()
            
            if any(keyword in query_lower for keyword in ["local impact", "community benefit", "economic impact"]):
                return await self._handle_impact_analysis_query(query, context)
            elif any(keyword in query_lower for keyword in ["local business", "authentic", "family owned"]):
                return await self._handle_local_business_query(query, context)
            elif any(keyword in query_lower for keyword in ["cultural preservation", "traditions", "heritage"]):
                return await self._handle_cultural_impact_query(query, context)
            elif any(keyword in query_lower for keyword in ["community development", "social impact"]):
                return await self._handle_development_query(query, context)
            else:
                return await self._handle_general_local_impact_query(query, context)
                
        except Exception as e:
            logger.error(f"❌ Error processing local impact query: {e}")
            return {
                "response": "I apologize, but I encountered an error processing your local impact query. Please try rephrasing your question.",
                "error": str(e),
                "suggestions": [
                    "Ask about local businesses in your destination",
                    "Inquire about community impact of your trip",
                    "Request recommendations for authentic local experiences"
                ]
            }

    async def cleanup(self):
        """Limpiar recursos del agente"""
        try:
            logger.info("🧹 Cleaning up Local Impact Analyzer Agent...")
            
            # Guardar métricas actualizadas
            
            self.is_initialized = False
            logger.info("✅ Local Impact Analyzer Agent cleanup completed")
            
        except Exception as e:
            logger.error(f"❌ Local Impact Analyzer Agent cleanup error: {e}")

# Función de utilidad
async def create_local_impact_analyzer_agent(config: Dict[str, Any]) -> LocalImpactAnalyzerAgent:
    """Factory function para crear agente de análisis de impacto local"""
    agent = LocalImpactAnalyzerAgent(config)
    await agent.initialize()
    return agent

# Ejemplo de uso
if __name__ == "__main__":
    async def main():
        config = {"openai_api_key": "test-key"}
        
        try:
            agent = await create_local_impact_analyzer_agent(config)
            
            # Test trip analysis
            trip_data = {
                "trip_id": "test_001",
                "destination": "Puebla de Sanabria",
                "duration_days": 4,
                "tourist_count": 2,
                "accommodation": [{"type": "local_hotel", "nights": 3, "cost": 180}],
                "dining": [{"type": "local_restaurant", "meals": 8, "cost": 120}],
                "activities": [{"type": "cultural_tour", "cost": 80}]
            }
            
            # Test impact analysis
            impact_analysis = await agent.analyze_trip_impact(trip_data)
            print(f"✅ Trip impact score: {impact_analysis.impact_score:.1f}")
            print(f"✅ Local spending: {impact_analysis.local_spending_percentage:.1f}%")
            
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            if 'agent' in locals():
                await agent.cleanup()
    
    asyncio.run(main())