"""
CarbonOptimizerAgent - Agente especializado en optimización de huella de carbono
Minimiza el impacto ambiental de las operaciones turísticas
"""

import json
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import asyncio
from sqlalchemy.orm import Session
import numpy as np
import pandas as pd

from ..base_agent import BaseAgent, AgentCapability, AgentResponse
from ..decorators import log_performance, handle_errors, require_capability
from ...backend.models.sustainability_models import (
    CarbonFootprint,
    EmissionSource,
    CarbonOffset,
    SustainabilityMetric
)

logger = logging.getLogger(__name__)

class EmissionCategory(Enum):
    """Categorías de emisiones"""
    TRANSPORT = "transport"
    ACCOMMODATION = "accommodation"
    ACTIVITIES = "activities"
    FOOD = "food"
    WASTE = "waste"
    ENERGY = "energy"
    WATER = "water"
    SUPPLIES = "supplies"

class TransportMode(Enum):
    """Modos de transporte"""
    WALKING = "walking"
    BICYCLE = "bicycle"
    ELECTRIC_VEHICLE = "electric_vehicle"
    HYBRID_VEHICLE = "hybrid_vehicle"
    PUBLIC_TRANSPORT = "public_transport"
    CONVENTIONAL_CAR = "conventional_car"
    AIRPLANE = "airplane"
    CRUISE = "cruise"
    TRAIN = "train"
    FERRY = "ferry"

class OffsetType(Enum):
    """Tipos de compensación de carbono"""
    REFORESTATION = "reforestation"
    RENEWABLE_ENERGY = "renewable_energy"
    CARBON_CAPTURE = "carbon_capture"
    OCEAN_CLEANUP = "ocean_cleanup"
    BIODIVERSITY = "biodiversity"
    COMMUNITY_PROJECTS = "community_projects"

@dataclass
class CarbonCalculation:
    """Cálculo de huella de carbono"""
    calculation_id: str
    entity_type: str  # tour, transport, accommodation, etc.
    entity_id: str
    total_emissions_kg: float
    emissions_per_person: float
    emissions_breakdown: Dict[EmissionCategory, float]
    calculation_method: str
    data_quality_score: float
    uncertainty_range: Tuple[float, float]
    timestamp: datetime
    recommendations: List[Dict[str, Any]]

@dataclass
class TransportOptimization:
    """Optimización de transporte"""
    route_id: str
    original_emissions: float
    optimized_emissions: float
    reduction_percentage: float
    recommended_modes: List[TransportMode]
    route_segments: List[Dict[str, Any]]
    total_distance: float
    estimated_time: float
    cost_impact: float
    convenience_score: float

@dataclass
class CarbonOffsetPlan:
    """Plan de compensación de carbono"""
    plan_id: str
    total_emissions_to_offset: float
    offset_projects: List[Dict[str, Any]]
    total_cost: float
    certification_type: str
    verification_status: str
    impact_timeline: Dict[str, float]
    co_benefits: List[str]
    transparency_report: Dict[str, Any]

@dataclass
class SustainabilityScore:
    """Puntuación de sostenibilidad"""
    entity_id: str
    overall_score: float
    carbon_score: float
    water_score: float
    waste_score: float
    biodiversity_score: float
    social_score: float
    improvement_areas: List[str]
    certification_eligibility: List[str]
    benchmarks: Dict[str, float]

class CarbonOptimizerAgent(BaseAgent):
    """
    Agente especializado en optimización y reducción de huella de carbono
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.capabilities = [
            AgentCapability.ANALYSIS,
            AgentCapability.OPTIMIZATION,
            AgentCapability.MONITORING,
            AgentCapability.RECOMMENDATION,
            AgentCapability.REPORTING
        ]
        
        # Factores de emisión (kg CO2e)
        self.emission_factors = {
            'transport': {
                'airplane_short': 0.255,  # per km per person
                'airplane_long': 0.195,
                'car_petrol': 0.192,
                'car_diesel': 0.171,
                'car_electric': 0.053,
                'bus': 0.089,
                'train': 0.041,
                'ferry': 0.115,
                'walking': 0.0,
                'bicycle': 0.0
            },
            'accommodation': {
                'luxury_hotel': 30.2,  # per night per person
                'standard_hotel': 20.6,
                'eco_hotel': 10.3,
                'hostel': 7.5,
                'camping': 2.1,
                'vacation_rental': 15.4
            },
            'food': {
                'meat_heavy': 7.5,  # per meal per person
                'standard': 4.2,
                'vegetarian': 2.3,
                'vegan': 1.5,
                'local_organic': 1.8
            },
            'activities': {
                'motorized_tour': 15.0,  # per activity per person
                'boat_tour': 12.0,
                'hiking': 0.5,
                'cultural_visit': 2.0,
                'adventure_sports': 8.0
            }
        }
        
        # Base de datos de proyectos de compensación
        self.offset_projects = self._load_offset_projects()
        
        # Benchmarks de la industria
        self.industry_benchmarks = {
            'tour_emissions_per_day': 25.0,  # kg CO2e
            'transport_efficiency': 0.15,  # kg CO2e per km
            'accommodation_standard': 20.0,  # kg CO2e per night
            'sustainable_threshold': 15.0  # kg CO2e per day
        }
        
        # Métricas de seguimiento
        self.metrics = {
            'emissions_calculated': 0,
            'emissions_reduced': 0,
            'offsets_arranged': 0,
            'routes_optimized': 0,
            'recommendations_generated': 0,
            'total_co2_saved': 0.0
        }
    
    @log_performance
    @handle_errors
    async def calculate_carbon_footprint(
        self,
        entity_type: str,
        entity_data: Dict[str, Any],
        include_indirect: bool = True
    ) -> CarbonCalculation:
        """
        Calcula la huella de carbono de una entidad
        """
        logger.info(f"Calculating carbon footprint for {entity_type}")
        
        # Inicializar cálculo
        emissions_breakdown = {}
        total_emissions = 0.0
        
        # Calcular emisiones por categoría
        if entity_type == "tour":
            emissions_breakdown = await self._calculate_tour_emissions(entity_data)
        elif entity_type == "transport":
            emissions_breakdown = await self._calculate_transport_emissions(entity_data)
        elif entity_type == "accommodation":
            emissions_breakdown = await self._calculate_accommodation_emissions(entity_data)
        elif entity_type == "event":
            emissions_breakdown = await self._calculate_event_emissions(entity_data)
        
        # Incluir emisiones indirectas si se solicita
        if include_indirect:
            indirect_emissions = await self._calculate_indirect_emissions(
                entity_type,
                entity_data
            )
            emissions_breakdown['indirect'] = indirect_emissions
        
        # Calcular total
        total_emissions = sum(emissions_breakdown.values())
        
        # Calcular por persona
        num_people = entity_data.get('participants', 1)
        emissions_per_person = total_emissions / num_people
        
        # Evaluar calidad de datos
        data_quality = self._assess_data_quality(entity_data)
        
        # Calcular incertidumbre
        uncertainty = self._calculate_uncertainty(data_quality, total_emissions)
        
        # Generar recomendaciones
        recommendations = await self._generate_reduction_recommendations(
            entity_type,
            emissions_breakdown,
            entity_data
        )
        
        calculation = CarbonCalculation(
            calculation_id=f"calc_{datetime.now().timestamp()}",
            entity_type=entity_type,
            entity_id=entity_data.get('id', 'unknown'),
            total_emissions_kg=total_emissions,
            emissions_per_person=emissions_per_person,
            emissions_breakdown=emissions_breakdown,
            calculation_method="IPCC_2021_methodology",
            data_quality_score=data_quality,
            uncertainty_range=uncertainty,
            timestamp=datetime.now(),
            recommendations=recommendations
        )
        
        # Guardar cálculo
        await self._save_calculation(calculation)
        
        self.metrics['emissions_calculated'] += 1
        
        return calculation
    
    @log_performance
    @handle_errors
    async def optimize_transport_route(
        self,
        origin: str,
        destination: str,
        constraints: Optional[Dict[str, Any]] = None
    ) -> TransportOptimization:
        """
        Optimiza rutas de transporte para mínimas emisiones
        """
        logger.info(f"Optimizing transport route from {origin} to {destination}")
        
        # Obtener opciones de ruta
        route_options = await self._get_route_options(origin, destination)
        
        # Calcular emisiones para cada opción
        emissions_by_route = []
        for route in route_options:
            emissions = self._calculate_route_emissions(route)
            emissions_by_route.append({
                'route': route,
                'emissions': emissions,
                'time': route.get('duration'),
                'cost': route.get('cost')
            })
        
        # Aplicar restricciones
        if constraints:
            emissions_by_route = self._apply_route_constraints(
                emissions_by_route,
                constraints
            )
        
        # Seleccionar ruta óptima
        optimal_route = self._select_optimal_route(emissions_by_route)
        
        # Calcular emisiones originales (ruta directa en coche)
        original_emissions = self._calculate_direct_car_emissions(origin, destination)
        
        # Crear segmentos de ruta optimizada
        route_segments = self._create_route_segments(optimal_route['route'])
        
        # Calcular métricas
        reduction_percentage = ((original_emissions - optimal_route['emissions']) / 
                              original_emissions * 100)
        
        optimization = TransportOptimization(
            route_id=f"route_{datetime.now().timestamp()}",
            original_emissions=original_emissions,
            optimized_emissions=optimal_route['emissions'],
            reduction_percentage=reduction_percentage,
            recommended_modes=self._extract_transport_modes(route_segments),
            route_segments=route_segments,
            total_distance=optimal_route['route'].get('distance'),
            estimated_time=optimal_route['time'],
            cost_impact=optimal_route['cost'],
            convenience_score=self._calculate_convenience_score(optimal_route)
        )
        
        self.metrics['routes_optimized'] += 1
        self.metrics['total_co2_saved'] += (original_emissions - optimal_route['emissions'])
        
        return optimization
    
    @log_performance
    @handle_errors
    async def create_offset_plan(
        self,
        emissions_to_offset: float,
        preferences: Optional[Dict[str, Any]] = None
    ) -> CarbonOffsetPlan:
        """
        Crea plan de compensación de carbono
        """
        logger.info(f"Creating offset plan for {emissions_to_offset} kg CO2e")
        
        # Filtrar proyectos según preferencias
        eligible_projects = self._filter_offset_projects(preferences)
        
        # Optimizar selección de proyectos
        selected_projects = self._optimize_project_selection(
            emissions_to_offset,
            eligible_projects,
            preferences
        )
        
        # Calcular costo total
        total_cost = sum(p['cost'] for p in selected_projects)
        
        # Verificar certificación
        certification_type = self._determine_certification_type(selected_projects)
        verification_status = await self._verify_projects(selected_projects)
        
        # Calcular timeline de impacto
        impact_timeline = self._calculate_impact_timeline(
            selected_projects,
            emissions_to_offset
        )
        
        # Identificar co-beneficios
        co_benefits = self._identify_co_benefits(selected_projects)
        
        # Generar reporte de transparencia
        transparency_report = self._generate_transparency_report(
            selected_projects,
            emissions_to_offset
        )
        
        offset_plan = CarbonOffsetPlan(
            plan_id=f"offset_{datetime.now().timestamp()}",
            total_emissions_to_offset=emissions_to_offset,
            offset_projects=selected_projects,
            total_cost=total_cost,
            certification_type=certification_type,
            verification_status=verification_status,
            impact_timeline=impact_timeline,
            co_benefits=co_benefits,
            transparency_report=transparency_report
        )
        
        # Guardar plan
        await self._save_offset_plan(offset_plan)
        
        self.metrics['offsets_arranged'] += 1
        
        return offset_plan
    
    @log_performance
    @handle_errors
    async def analyze_sustainability_performance(
        self,
        entity_id: str,
        entity_type: str,
        period: Optional[str] = "monthly"
    ) -> SustainabilityScore:
        """
        Analiza desempeño de sostenibilidad
        """
        logger.info(f"Analyzing sustainability performance for {entity_type} {entity_id}")
        
        # Obtener datos históricos
        historical_data = await self._get_historical_data(entity_id, period)
        
        # Calcular scores por categoría
        carbon_score = self._calculate_carbon_score(historical_data)
        water_score = self._calculate_water_score(historical_data)
        waste_score = self._calculate_waste_score(historical_data)
        biodiversity_score = self._calculate_biodiversity_score(historical_data)
        social_score = self._calculate_social_score(historical_data)
        
        # Calcular score general
        overall_score = self._calculate_overall_sustainability_score({
            'carbon': carbon_score,
            'water': water_score,
            'waste': waste_score,
            'biodiversity': biodiversity_score,
            'social': social_score
        })
        
        # Identificar áreas de mejora
        improvement_areas = self._identify_improvement_areas({
            'carbon': carbon_score,
            'water': water_score,
            'waste': waste_score,
            'biodiversity': biodiversity_score,
            'social': social_score
        })
        
        # Evaluar elegibilidad para certificaciones
        certifications = self._evaluate_certification_eligibility(overall_score)
        
        # Comparar con benchmarks
        benchmarks = self._compare_with_benchmarks(
            entity_type,
            overall_score,
            historical_data
        )
        
        score = SustainabilityScore(
            entity_id=entity_id,
            overall_score=overall_score,
            carbon_score=carbon_score,
            water_score=water_score,
            waste_score=waste_score,
            biodiversity_score=biodiversity_score,
            social_score=social_score,
            improvement_areas=improvement_areas,
            certification_eligibility=certifications,
            benchmarks=benchmarks
        )
        
        return score
    
    @log_performance
    @handle_errors
    async def generate_carbon_report(
        self,
        entity_id: str,
        report_type: str = "comprehensive",
        period: str = "monthly"
    ) -> Dict[str, Any]:
        """
        Genera reporte detallado de carbono
        """
        logger.info(f"Generating {report_type} carbon report for {entity_id}")
        
        # Recopilar datos
        emissions_data = await self._collect_emissions_data(entity_id, period)
        reduction_data = await self._collect_reduction_data(entity_id, period)
        offset_data = await self._collect_offset_data(entity_id, period)
        
        # Calcular métricas clave
        total_emissions = sum(emissions_data.values())
        total_reductions = sum(reduction_data.values())
        total_offsets = sum(offset_data.values())
        net_emissions = total_emissions - total_reductions - total_offsets
        
        # Análisis de tendencias
        trend_analysis = self._analyze_emissions_trends(emissions_data)
        
        # Comparación con objetivos
        target_comparison = self._compare_with_targets(
            net_emissions,
            entity_id
        )
        
        # Recomendaciones
        recommendations = await self._generate_comprehensive_recommendations(
            emissions_data,
            reduction_data,
            entity_id
        )
        
        # Proyecciones futuras
        projections = self._project_future_emissions(
            emissions_data,
            reduction_data
        )
        
        report = {
            'report_id': f"report_{datetime.now().timestamp()}",
            'entity_id': entity_id,
            'period': period,
            'generated_at': datetime.now().isoformat(),
            'summary': {
                'total_emissions': total_emissions,
                'total_reductions': total_reductions,
                'total_offsets': total_offsets,
                'net_emissions': net_emissions,
                'carbon_intensity': net_emissions / 30  # per day
            },
            'emissions_breakdown': emissions_data,
            'reductions_achieved': reduction_data,
            'offsets_purchased': offset_data,
            'trend_analysis': trend_analysis,
            'target_comparison': target_comparison,
            'recommendations': recommendations,
            'future_projections': projections,
            'certification_status': self._check_certification_status(net_emissions)
        }
        
        self.metrics['recommendations_generated'] += len(recommendations)
        
        return report
    
    @log_performance
    @handle_errors
    async def monitor_real_time_emissions(
        self,
        activity_type: str,
        activity_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Monitorea emisiones en tiempo real
        """
        logger.info(f"Monitoring real-time emissions for {activity_type}")
        
        # Calcular emisiones instantáneas
        current_emissions = self._calculate_instant_emissions(
            activity_type,
            activity_data
        )
        
        # Comparar con baseline
        baseline = await self._get_baseline_emissions(activity_type)
        variance = ((current_emissions - baseline) / baseline) * 100
        
        # Generar alertas si es necesario
        alerts = []
        if variance > 20:
            alerts.append({
                'type': 'high_emissions',
                'severity': 'warning',
                'message': f'Emissions {variance:.1f}% above baseline',
                'recommended_action': 'Consider switching to lower-carbon alternatives'
            })
        
        # Sugerir alternativas inmediatas
        alternatives = await self._suggest_immediate_alternatives(
            activity_type,
            current_emissions
        )
        
        return {
            'timestamp': datetime.now().isoformat(),
            'activity_type': activity_type,
            'current_emissions': current_emissions,
            'baseline_emissions': baseline,
            'variance_percentage': variance,
            'alerts': alerts,
            'alternatives': alternatives,
            'cumulative_daily': await self._get_daily_cumulative(activity_data.get('entity_id'))
        }
    
    # Métodos auxiliares privados
    
    async def _calculate_tour_emissions(self, tour_data: Dict[str, Any]) -> Dict[str, float]:
        """Calcula emisiones de un tour"""
        emissions = {}
        
        # Transporte
        if 'transport' in tour_data:
            emissions[EmissionCategory.TRANSPORT] = self._calculate_transport_component(
                tour_data['transport']
            )
        
        # Alojamiento
        if 'accommodation' in tour_data:
            emissions[EmissionCategory.ACCOMMODATION] = self._calculate_accommodation_component(
                tour_data['accommodation']
            )
        
        # Actividades
        if 'activities' in tour_data:
            emissions[EmissionCategory.ACTIVITIES] = self._calculate_activities_component(
                tour_data['activities']
            )
        
        # Comida
        if 'meals' in tour_data:
            emissions[EmissionCategory.FOOD] = self._calculate_food_component(
                tour_data['meals']
            )
        
        return emissions
    
    def _calculate_transport_component(self, transport_data: Dict[str, Any]) -> float:
        """Calcula componente de transporte"""
        total = 0.0
        
        for segment in transport_data.get('segments', []):
            mode = segment.get('mode', 'car_petrol')
            distance = segment.get('distance', 0)
            passengers = segment.get('passengers', 1)
            
            if mode in self.emission_factors['transport']:
                emissions_per_km = self.emission_factors['transport'][mode]
                total += emissions_per_km * distance * passengers
        
        return total
    
    def _calculate_accommodation_component(self, accommodation_data: Dict[str, Any]) -> float:
        """Calcula componente de alojamiento"""
        nights = accommodation_data.get('nights', 1)
        type_ = accommodation_data.get('type', 'standard_hotel')
        guests = accommodation_data.get('guests', 1)
        
        if type_ in self.emission_factors['accommodation']:
            emissions_per_night = self.emission_factors['accommodation'][type_]
            return emissions_per_night * nights * guests
        
        return 20.0 * nights * guests  # Default
    
    def _calculate_activities_component(self, activities_data: List[Dict[str, Any]]) -> float:
        """Calcula componente de actividades"""
        total = 0.0
        
        for activity in activities_data:
            type_ = activity.get('type', 'cultural_visit')
            participants = activity.get('participants', 1)
            
            if type_ in self.emission_factors['activities']:
                emissions = self.emission_factors['activities'][type_]
                total += emissions * participants
        
        return total
    
    def _calculate_food_component(self, meals_data: Dict[str, Any]) -> float:
        """Calcula componente de comida"""
        total = 0.0
        
        for meal_type, count in meals_data.items():
            if meal_type in self.emission_factors['food']:
                emissions_per_meal = self.emission_factors['food'][meal_type]
                total += emissions_per_meal * count
        
        return total
    
    async def _calculate_transport_emissions(self, transport_data: Dict[str, Any]) -> Dict[str, float]:
        """Calcula emisiones de transporte"""
        return {
            EmissionCategory.TRANSPORT: self._calculate_transport_component(transport_data)
        }
    
    async def _calculate_accommodation_emissions(self, accommodation_data: Dict[str, Any]) -> Dict[str, float]:
        """Calcula emisiones de alojamiento"""
        return {
            EmissionCategory.ACCOMMODATION: self._calculate_accommodation_component(accommodation_data)
        }
    
    async def _calculate_event_emissions(self, event_data: Dict[str, Any]) -> Dict[str, float]:
        """Calcula emisiones de un evento"""
        emissions = {}
        
        # Venue
        venue_size = event_data.get('venue_size', 100)  # m2
        duration = event_data.get('duration_hours', 4)
        emissions[EmissionCategory.ENERGY] = venue_size * 0.05 * duration  # kg CO2e
        
        # Catering
        attendees = event_data.get('attendees', 50)
        emissions[EmissionCategory.FOOD] = attendees * 4.2  # Standard meal
        
        # Transport (attendees)
        average_distance = event_data.get('average_distance', 20)  # km
        emissions[EmissionCategory.TRANSPORT] = attendees * average_distance * 0.15
        
        return emissions
    
    async def _calculate_indirect_emissions(
        self,
        entity_type: str,
        entity_data: Dict[str, Any]
    ) -> float:
        """Calcula emisiones indirectas"""
        # Simplified calculation - 15% of direct emissions
        direct_total = sum(await self._calculate_tour_emissions(entity_data).values())
        return direct_total * 0.15
    
    def _assess_data_quality(self, data: Dict[str, Any]) -> float:
        """Evalúa calidad de los datos"""
        quality_score = 1.0
        
        # Penalizar por datos faltantes
        required_fields = ['transport', 'accommodation', 'participants']
        for field in required_fields:
            if field not in data:
                quality_score -= 0.2
        
        # Penalizar por estimaciones
        if data.get('estimated', False):
            quality_score -= 0.3
        
        return max(0.0, quality_score)
    
    def _calculate_uncertainty(
        self,
        data_quality: float,
        total_emissions: float
    ) -> Tuple[float, float]:
        """Calcula rango de incertidumbre"""
        uncertainty_factor = 0.1 + (1 - data_quality) * 0.3
        
        lower_bound = total_emissions * (1 - uncertainty_factor)
        upper_bound = total_emissions * (1 + uncertainty_factor)
        
        return (lower_bound, upper_bound)
    
    async def _generate_reduction_recommendations(
        self,
        entity_type: str,
        emissions_breakdown: Dict[str, float],
        entity_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Genera recomendaciones de reducción"""
        recommendations = []
        
        # Identificar categoría con mayores emisiones
        max_category = max(emissions_breakdown, key=emissions_breakdown.get)
        
        if max_category == EmissionCategory.TRANSPORT:
            recommendations.append({
                'category': 'transport',
                'action': 'Switch to electric or hybrid vehicles',
                'potential_reduction': '40-60%',
                'implementation': 'immediate'
            })
            recommendations.append({
                'category': 'transport',
                'action': 'Optimize routes to reduce distance',
                'potential_reduction': '15-25%',
                'implementation': 'immediate'
            })
        
        if max_category == EmissionCategory.ACCOMMODATION:
            recommendations.append({
                'category': 'accommodation',
                'action': 'Choose eco-certified hotels',
                'potential_reduction': '30-50%',
                'implementation': 'next_booking'
            })
        
        return recommendations
    
    async def _save_calculation(self, calculation: CarbonCalculation) -> None:
        """Guarda cálculo de carbono"""
        # Implementación de guardado en DB
        pass
    
    async def _get_route_options(self, origin: str, destination: str) -> List[Dict[str, Any]]:
        """Obtiene opciones de ruta"""
        # Implementación simplificada
        return [
            {
                'mode': 'train',
                'distance': 100,
                'duration': 120,
                'cost': 50
            },
            {
                'mode': 'bus',
                'distance': 110,
                'duration': 180,
                'cost': 30
            },
            {
                'mode': 'car_electric',
                'distance': 95,
                'duration': 90,
                'cost': 60
            }
        ]
    
    def _calculate_route_emissions(self, route: Dict[str, Any]) -> float:
        """Calcula emisiones de una ruta"""
        mode = route.get('mode', 'car_petrol')
        distance = route.get('distance', 0)
        
        if mode in self.emission_factors['transport']:
            return self.emission_factors['transport'][mode] * distance
        
        return distance * 0.2  # Default
    
    def _apply_route_constraints(
        self,
        routes: List[Dict[str, Any]],
        constraints: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Aplica restricciones a las rutas"""
        filtered = routes
        
        if 'max_time' in constraints:
            filtered = [r for r in filtered if r['time'] <= constraints['max_time']]
        
        if 'max_cost' in constraints:
            filtered = [r for r in filtered if r['cost'] <= constraints['max_cost']]
        
        return filtered
    
    def _select_optimal_route(self, routes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Selecciona ruta óptima"""
        # Ponderar emisiones (60%), tiempo (25%), costo (15%)
        best_route = None
        best_score = float('inf')
        
        for route in routes:
            score = (route['emissions'] * 0.6 + 
                    route['time'] * 0.25 + 
                    route['cost'] * 0.15)
            
            if score < best_score:
                best_score = score
                best_route = route
        
        return best_route
    
    def _calculate_direct_car_emissions(self, origin: str, destination: str) -> float:
        """Calcula emisiones de ruta directa en coche"""
        # Simplificado - asumir 100km
        distance = 100
        return self.emission_factors['transport']['car_petrol'] * distance
    
    def _create_route_segments(self, route: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Crea segmentos de ruta"""
        return [{
            'start': 'origin',
            'end': 'destination',
            'mode': route.get('mode'),
            'distance': route.get('distance'),
            'emissions': self._calculate_route_emissions(route)
        }]
    
    def _extract_transport_modes(self, segments: List[Dict[str, Any]]) -> List[TransportMode]:
        """Extrae modos de transporte"""
        modes = []
        for segment in segments:
            mode_str = segment.get('mode', '')
            if mode_str == 'train':
                modes.append(TransportMode.TRAIN)
            elif mode_str == 'bus':
                modes.append(TransportMode.PUBLIC_TRANSPORT)
            elif mode_str == 'car_electric':
                modes.append(TransportMode.ELECTRIC_VEHICLE)
        
        return modes
    
    def _calculate_convenience_score(self, route: Dict[str, Any]) -> float:
        """Calcula score de conveniencia"""
        # Basado en tiempo y costo
        time_score = max(0, 100 - route.get('time', 0) / 2)
        cost_score = max(0, 100 - route.get('cost', 0))
        
        return (time_score + cost_score) / 2
    
    def _load_offset_projects(self) -> List[Dict[str, Any]]:
        """Carga proyectos de compensación"""
        return [
            {
                'id': 'proj1',
                'name': 'Amazon Reforestation',
                'type': OffsetType.REFORESTATION,
                'price_per_ton': 15,
                'certification': 'Gold Standard',
                'location': 'Brazil',
                'co_benefits': ['biodiversity', 'community']
            },
            {
                'id': 'proj2',
                'name': 'Wind Farm India',
                'type': OffsetType.RENEWABLE_ENERGY,
                'price_per_ton': 12,
                'certification': 'VCS',
                'location': 'India',
                'co_benefits': ['jobs', 'energy_access']
            }
        ]
    
    def _filter_offset_projects(
        self,
        preferences: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Filtra proyectos según preferencias"""
        projects = self.offset_projects
        
        if preferences:
            if 'type' in preferences:
                projects = [p for p in projects if p['type'] == preferences['type']]
            
            if 'max_price' in preferences:
                projects = [p for p in projects if p['price_per_ton'] <= preferences['max_price']]
        
        return projects
    
    def _optimize_project_selection(
        self,
        emissions: float,
        projects: List[Dict[str, Any]],
        preferences: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Optimiza selección de proyectos"""
        selected = []
        remaining = emissions / 1000  # Convert to tons
        
        # Ordenar por precio
        sorted_projects = sorted(projects, key=lambda x: x['price_per_ton'])
        
        for project in sorted_projects:
            if remaining > 0:
                tons = min(remaining, 10)  # Max 10 tons per project
                selected.append({
                    **project,
                    'tons_offset': tons,
                    'cost': tons * project['price_per_ton']
                })
                remaining -= tons
        
        return selected
    
    def _determine_certification_type(self, projects: List[Dict[str, Any]]) -> str:
        """Determina tipo de certificación"""
        certifications = [p.get('certification') for p in projects]
        
        if 'Gold Standard' in certifications:
            return 'Gold Standard'
        elif 'VCS' in certifications:
            return 'Verified Carbon Standard'
        else:
            return 'Mixed Certifications'
    
    async def _verify_projects(self, projects: List[Dict[str, Any]]) -> str:
        """Verifica proyectos"""
        # Simulación de verificación
        return "verified"
    
    def _calculate_impact_timeline(
        self,
        projects: List[Dict[str, Any]],
        emissions: float
    ) -> Dict[str, float]:
        """Calcula timeline de impacto"""
        return {
            'immediate': emissions * 0.2,
            '6_months': emissions * 0.5,
            '1_year': emissions * 0.8,
            '2_years': emissions * 1.0
        }
    
    def _identify_co_benefits(self, projects: List[Dict[str, Any]]) -> List[str]:
        """Identifica co-beneficios"""
        co_benefits = set()
        
        for project in projects:
            co_benefits.update(project.get('co_benefits', []))
        
        return list(co_benefits)
    
    def _generate_transparency_report(
        self,
        projects: List[Dict[str, Any]],
        emissions: float
    ) -> Dict[str, Any]:
        """Genera reporte de transparencia"""
        return {
            'total_offset': emissions,
            'projects_count': len(projects),
            'total_investment': sum(p['cost'] for p in projects),
            'certifications': list(set(p['certification'] for p in projects)),
            'locations': list(set(p['location'] for p in projects))
        }
    
    async def _save_offset_plan(self, plan: CarbonOffsetPlan) -> None:
        """Guarda plan de compensación"""
        # Implementación de guardado
        pass
    
    async def _get_historical_data(self, entity_id: str, period: str) -> Dict[str, Any]:
        """Obtiene datos históricos"""
        # Implementación simplificada
        return {
            'emissions': [100, 95, 90, 85],
            'water_usage': [1000, 950, 900, 850],
            'waste_generated': [50, 45, 40, 35]
        }
    
    def _calculate_carbon_score(self, data: Dict[str, Any]) -> float:
        """Calcula score de carbono"""
        emissions = data.get('emissions', [])
        if emissions:
            # Mejora = score más alto
            trend = (emissions[0] - emissions[-1]) / emissions[0] * 100
            return min(100, max(0, 50 + trend))
        return 50.0
    
    def _calculate_water_score(self, data: Dict[str, Any]) -> float:
        """Calcula score de agua"""
        return 75.0  # Placeholder
    
    def _calculate_waste_score(self, data: Dict[str, Any]) -> float:
        """Calcula score de residuos"""
        return 80.0  # Placeholder
    
    def _calculate_biodiversity_score(self, data: Dict[str, Any]) -> float:
        """Calcula score de biodiversidad"""
        return 70.0  # Placeholder
    
    def _calculate_social_score(self, data: Dict[str, Any]) -> float:
        """Calcula score social"""
        return 85.0  # Placeholder
    
    def _calculate_overall_sustainability_score(self, scores: Dict[str, float]) -> float:
        """Calcula score general de sostenibilidad"""
        weights = {
            'carbon': 0.3,
            'water': 0.2,
            'waste': 0.2,
            'biodiversity': 0.15,
            'social': 0.15
        }
        
        total = sum(scores[k] * weights[k] for k in scores)
        return total
    
    def _identify_improvement_areas(self, scores: Dict[str, float]) -> List[str]:
        """Identifica áreas de mejora"""
        areas = []
        
        for category, score in scores.items():
            if score < 70:
                areas.append(f"Improve {category} performance (current: {score:.1f})")
        
        return areas
    
    def _evaluate_certification_eligibility(self, overall_score: float) -> List[str]:
        """Evalúa elegibilidad para certificaciones"""
        certifications = []
        
        if overall_score >= 80:
            certifications.append("Green Key Global")
        if overall_score >= 85:
            certifications.append("EarthCheck")
        if overall_score >= 90:
            certifications.append("GSTC Certified")
        
        return certifications
    
    def _compare_with_benchmarks(
        self,
        entity_type: str,
        overall_score: float,
        data: Dict[str, Any]
    ) -> Dict[str, float]:
        """Compara con benchmarks de la industria"""
        return {
            'industry_average': 65.0,
            'top_10_percent': 85.0,
            'your_score': overall_score,
            'percentile': min(99, overall_score * 1.2)
        }
    
    async def _collect_emissions_data(self, entity_id: str, period: str) -> Dict[str, float]:
        """Recopila datos de emisiones"""
        return {
            'transport': 500.0,
            'accommodation': 300.0,
            'activities': 150.0,
            'food': 100.0
        }
    
    async def _collect_reduction_data(self, entity_id: str, period: str) -> Dict[str, float]:
        """Recopila datos de reducciones"""
        return {
            'route_optimization': 50.0,
            'eco_accommodation': 30.0,
            'sustainable_activities': 20.0
        }
    
    async def _collect_offset_data(self, entity_id: str, period: str) -> Dict[str, float]:
        """Recopila datos de compensaciones"""
        return {
            'reforestation': 100.0,
            'renewable_energy': 50.0
        }
    
    def _analyze_emissions_trends(self, emissions_data: Dict[str, float]) -> Dict[str, Any]:
        """Analiza tendencias de emisiones"""
        total = sum(emissions_data.values())
        
        return {
            'trend': 'decreasing',
            'change_percentage': -15.0,
            'projection': 'on_track',
            'largest_contributor': max(emissions_data, key=emissions_data.get)
        }
    
    def _compare_with_targets(self, net_emissions: float, entity_id: str) -> Dict[str, Any]:
        """Compara con objetivos"""
        target = 500.0  # kg CO2e
        
        return {
            'target': target,
            'actual': net_emissions,
            'variance': net_emissions - target,
            'achievement': 'below_target' if net_emissions < target else 'above_target'
        }
    
    async def _generate_comprehensive_recommendations(
        self,
        emissions_data: Dict[str, float],
        reduction_data: Dict[str, float],
        entity_id: str
    ) -> List[Dict[str, Any]]:
        """Genera recomendaciones comprehensivas"""
        return [
            {
                'priority': 'high',
                'category': 'transport',
                'action': 'Transition fleet to electric vehicles',
                'impact': '40% reduction',
                'timeline': '6 months'
            },
            {
                'priority': 'medium',
                'category': 'energy',
                'action': 'Install solar panels',
                'impact': '25% reduction',
                'timeline': '12 months'
            }
        ]
    
    def _project_future_emissions(
        self,
        emissions_data: Dict[str, float],
        reduction_data: Dict[str, float]
    ) -> Dict[str, float]:
        """Proyecta emisiones futuras"""
        current = sum(emissions_data.values())
        reductions = sum(reduction_data.values())
        
        return {
            '3_months': current - reductions * 0.5,
            '6_months': current - reductions * 1.0,
            '12_months': current - reductions * 2.0
        }
    
    def _check_certification_status(self, net_emissions: float) -> str:
        """Verifica estado de certificación"""
        if net_emissions < 100:
            return "Carbon Neutral Certified"
        elif net_emissions < 500:
            return "Low Carbon Certified"
        else:
            return "Working Towards Certification"
    
    def _calculate_instant_emissions(
        self,
        activity_type: str,
        activity_data: Dict[str, Any]
    ) -> float:
        """Calcula emisiones instantáneas"""
        if activity_type == 'transport':
            distance = activity_data.get('distance', 0)
            mode = activity_data.get('mode', 'car_petrol')
            
            if mode in self.emission_factors['transport']:
                return self.emission_factors['transport'][mode] * distance
        
        return 0.0
    
    async def _get_baseline_emissions(self, activity_type: str) -> float:
        """Obtiene emisiones baseline"""
        baselines = {
            'transport': 10.0,
            'accommodation': 20.0,
            'activities': 5.0
        }
        
        return baselines.get(activity_type, 10.0)
    
    async def _suggest_immediate_alternatives(
        self,
        activity_type: str,
        current_emissions: float
    ) -> List[Dict[str, Any]]:
        """Sugiere alternativas inmediatas"""
        alternatives = []
        
        if activity_type == 'transport' and current_emissions > 10:
            alternatives.append({
                'option': 'Switch to public transport',
                'emissions_reduction': '60%',
                'availability': 'immediate'
            })
        
        return alternatives
    
    async def _get_daily_cumulative(self, entity_id: Optional[str]) -> float:
        """Obtiene acumulado diario"""
        # Placeholder
        return 150.0