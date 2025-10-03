"""
Spirit Tours - Carbon Optimizer AI Agent
Agente especializado en optimización y reducción de huella de carbono en viajes
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass, field
from enum import Enum
import uuid
import math

from ..core.base_agent import BaseAIAgent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TransportMode(Enum):
    """Modos de transporte"""
    FLIGHT_ECONOMY = "flight_economy"
    FLIGHT_BUSINESS = "flight_business"
    FLIGHT_FIRST = "flight_first"
    TRAIN_STANDARD = "train_standard"
    TRAIN_HIGH_SPEED = "train_high_speed"
    BUS_COACH = "bus_coach"
    CAR_PETROL = "car_petrol"
    CAR_DIESEL = "car_diesel"
    CAR_HYBRID = "car_hybrid"
    CAR_ELECTRIC = "car_electric"
    FERRY = "ferry"
    CRUISE = "cruise"
    BICYCLE = "bicycle"
    WALKING = "walking"

class AccommodationType(Enum):
    """Tipos de alojamiento"""
    HOTEL_LUXURY = "hotel_luxury"
    HOTEL_STANDARD = "hotel_standard"
    HOTEL_BUDGET = "hotel_budget"
    ECO_HOTEL = "eco_hotel"
    HOSTEL = "hostel"
    APARTMENT = "apartment"
    CAMPING = "camping"
    ECO_LODGE = "eco_lodge"
    GLAMPING = "glamping"

class CarbonOffsetType(Enum):
    """Tipos de compensación de carbono"""
    FOREST_PLANTING = "forest_planting"
    RENEWABLE_ENERGY = "renewable_energy"
    CARBON_CAPTURE = "carbon_capture"
    METHANE_REDUCTION = "methane_reduction"
    COOKSTOVE_PROJECTS = "cookstove_projects"
    SOIL_SEQUESTRATION = "soil_sequestration"

@dataclass
class CarbonEmission:
    """Emisión de carbono de una actividad"""
    activity_type: str  # transport, accommodation, activity
    mode: str          # specific transport/accommodation mode
    distance_km: float = 0.0
    duration_hours: float = 0.0
    passengers: int = 1
    co2_kg: float = 0.0
    emission_factor: float = 0.0  # kg CO2 per unit
    calculation_method: str = "standard"

@dataclass
class CarbonFootprint:
    """Huella de carbono completa de un viaje"""
    trip_id: str
    total_co2_kg: float = 0.0
    transport_emissions: List[CarbonEmission] = field(default_factory=list)
    accommodation_emissions: List[CarbonEmission] = field(default_factory=list)
    activity_emissions: List[CarbonEmission] = field(default_factory=list)
    food_emissions: float = 0.0
    other_emissions: float = 0.0
    calculation_date: datetime = field(default_factory=datetime.utcnow)

@dataclass
class CarbonOffsetOption:
    """Opción de compensación de carbono"""
    offset_id: str
    provider: str
    offset_type: CarbonOffsetType
    co2_offset_kg: float
    cost_per_tonne: float
    total_cost: float
    certification: str
    project_description: str
    location: str
    estimated_impact: str
    retirement_date: Optional[datetime] = None

@dataclass
class CarbonOptimizationSuggestion:
    """Sugerencia de optimización de carbono"""
    suggestion_id: str
    current_co2_kg: float
    optimized_co2_kg: float
    reduction_percentage: float
    cost_difference: float
    optimization_type: str  # transport, accommodation, itinerary
    description: str
    alternatives: List[Dict[str, Any]] = field(default_factory=list)
    trade_offs: List[str] = field(default_factory=list)

class CarbonOptimizerAgent(BaseAIAgent):
    """
    Agente especializado en optimización de huella de carbono
    
    Funcionalidades:
    - Cálculo preciso de huella de carbono por viaje
    - Optimización de itinerarios para reducir emisiones
    - Recomendaciones de transporte sostenible
    - Opciones de compensación de carbono certificada
    - Comparación de alternativas eco-friendly
    - Tracking de objetivos de sostenibilidad
    - Reporting de impacto ambiental
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        super().__init__("CarbonOptimizerAgent", config)
        
        # Factores de emisión (kg CO2 por unidad)
        self.emission_factors = {
            # Transport (kg CO2 per passenger per km)
            TransportMode.FLIGHT_ECONOMY: 0.255,
            TransportMode.FLIGHT_BUSINESS: 0.433,
            TransportMode.FLIGHT_FIRST: 0.602,
            TransportMode.TRAIN_STANDARD: 0.041,
            TransportMode.TRAIN_HIGH_SPEED: 0.028,
            TransportMode.BUS_COACH: 0.027,
            TransportMode.CAR_PETROL: 0.192,
            TransportMode.CAR_DIESEL: 0.171,
            TransportMode.CAR_HYBRID: 0.109,
            TransportMode.CAR_ELECTRIC: 0.053,
            TransportMode.FERRY: 0.108,
            TransportMode.CRUISE: 0.250,
            TransportMode.BICYCLE: 0.000,
            TransportMode.WALKING: 0.000
        }
        
        # Factores de emisión de alojamiento (kg CO2 per night per person)
        self.accommodation_factors = {
            AccommodationType.HOTEL_LUXURY: 35.5,
            AccommodationType.HOTEL_STANDARD: 24.3,
            AccommodationType.HOTEL_BUDGET: 18.7,
            AccommodationType.ECO_HOTEL: 12.1,
            AccommodationType.HOSTEL: 9.8,
            AccommodationType.APARTMENT: 15.2,
            AccommodationType.CAMPING: 3.1,
            AccommodationType.ECO_LODGE: 8.5,
            AccommodationType.GLAMPING: 6.7
        }
        
        # Proveedores de compensación de carbono
        self.offset_providers = {}
        
        # Base de datos de alternativas sostenibles
        self.sustainable_alternatives = {}
        
        # Objetivos de reducción
        self.carbon_targets = {
            "minimal_impact": 2.0,      # kg CO2 per day target
            "low_impact": 4.0,          # kg CO2 per day target  
            "moderate_impact": 8.0,     # kg CO2 per day target
            "standard_impact": 15.0     # kg CO2 per day target
        }

    async def initialize(self):
        """Inicializar agente de optimización de carbono"""
        try:
            logger.info("🌱 Initializing Carbon Optimizer Agent...")
            
            # Cargar proveedores de compensación
            await self._load_offset_providers()
            
            # Inicializar base de datos de alternativas
            await self._setup_sustainable_alternatives()
            
            # Cargar factores de emisión actualizados
            await self._update_emission_factors()
            
            self.is_initialized = True
            logger.info("✅ Carbon Optimizer Agent initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Carbon Optimizer Agent: {e}")
            raise

    async def calculate_trip_footprint(self, trip_data: Dict[str, Any]) -> CarbonFootprint:
        """Calcular huella de carbono completa de un viaje"""
        try:
            trip_id = trip_data.get("trip_id", str(uuid.uuid4()))
            footprint = CarbonFootprint(trip_id=trip_id)
            
            # Calcular emisiones de transporte
            if "transport" in trip_data:
                for transport in trip_data["transport"]:
                    emission = await self._calculate_transport_emission(transport)
                    footprint.transport_emissions.append(emission)
            
            # Calcular emisiones de alojamiento
            if "accommodation" in trip_data:
                for accommodation in trip_data["accommodation"]:
                    emission = await self._calculate_accommodation_emission(accommodation)
                    footprint.accommodation_emissions.append(emission)
            
            # Calcular emisiones de actividades
            if "activities" in trip_data:
                for activity in trip_data["activities"]:
                    emission = await self._calculate_activity_emission(activity)
                    footprint.activity_emissions.append(emission)
            
            # Calcular emisiones de comida
            footprint.food_emissions = await self._calculate_food_emissions(trip_data)
            
            # Calcular otras emisiones
            footprint.other_emissions = await self._calculate_other_emissions(trip_data)
            
            # Calcular total
            footprint.total_co2_kg = (
                sum(e.co2_kg for e in footprint.transport_emissions) +
                sum(e.co2_kg for e in footprint.accommodation_emissions) +
                sum(e.co2_kg for e in footprint.activity_emissions) +
                footprint.food_emissions +
                footprint.other_emissions
            )
            
            return footprint
            
        except Exception as e:
            logger.error(f"❌ Error calculating trip footprint: {e}")
            return None

    async def optimize_itinerary_for_carbon(self, itinerary: Dict[str, Any],
                                          target_reduction: float = 30.0) -> Dict[str, Any]:
        """Optimizar itinerario para reducir huella de carbono"""
        try:
            # Calcular huella actual
            current_footprint = await self.calculate_trip_footprint(itinerary)
            current_co2 = current_footprint.total_co2_kg
            
            optimization_result = {
                "original_itinerary": itinerary,
                "current_co2_kg": current_co2,
                "target_reduction_percentage": target_reduction,
                "target_co2_kg": current_co2 * (1 - target_reduction/100),
                "optimizations": [],
                "optimized_itinerary": itinerary.copy(),
                "final_co2_kg": current_co2,
                "achieved_reduction": 0.0,
                "cost_impact": 0.0
            }
            
            # Optimizar transporte
            transport_optimization = await self._optimize_transport(itinerary.get("transport", []))
            if transport_optimization["reduction_kg"] > 0:
                optimization_result["optimizations"].append(transport_optimization)
                optimization_result["optimized_itinerary"]["transport"] = transport_optimization["optimized_options"]
            
            # Optimizar alojamiento
            accommodation_optimization = await self._optimize_accommodation(itinerary.get("accommodation", []))
            if accommodation_optimization["reduction_kg"] > 0:
                optimization_result["optimizations"].append(accommodation_optimization)
                optimization_result["optimized_itinerary"]["accommodation"] = accommodation_optimization["optimized_options"]
            
            # Optimizar actividades
            activity_optimization = await self._optimize_activities(itinerary.get("activities", []))
            if activity_optimization["reduction_kg"] > 0:
                optimization_result["optimizations"].append(activity_optimization)
                optimization_result["optimized_itinerary"]["activities"] = activity_optimization["optimized_options"]
            
            # Calcular nueva huella de carbono
            optimized_footprint = await self.calculate_trip_footprint(optimization_result["optimized_itinerary"])
            optimization_result["final_co2_kg"] = optimized_footprint.total_co2_kg
            
            # Calcular reducción lograda
            optimization_result["achieved_reduction"] = (
                (current_co2 - optimized_footprint.total_co2_kg) / current_co2 * 100
            )
            
            # Calcular impacto en costo
            optimization_result["cost_impact"] = sum(opt.get("cost_difference", 0) for opt in optimization_result["optimizations"])
            
            return optimization_result
            
        except Exception as e:
            logger.error(f"❌ Error optimizing itinerary for carbon: {e}")
            return {}

    async def suggest_carbon_offsets(self, co2_kg: float, budget: Optional[float] = None) -> List[CarbonOffsetOption]:
        """Sugerir opciones de compensación de carbono"""
        try:
            offset_options = []
            
            for provider_name, provider_info in self.offset_providers.items():
                for project in provider_info.get("projects", []):
                    # Calcular costo total
                    cost_per_tonne = project["cost_per_tonne"]
                    total_cost = (co2_kg / 1000) * cost_per_tonne
                    
                    # Verificar presupuesto si se especifica
                    if budget and total_cost > budget:
                        continue
                    
                    offset_option = CarbonOffsetOption(
                        offset_id=f"{provider_name}_{project['id']}",
                        provider=provider_name,
                        offset_type=CarbonOffsetType(project["type"]),
                        co2_offset_kg=co2_kg,
                        cost_per_tonne=cost_per_tonne,
                        total_cost=total_cost,
                        certification=project["certification"],
                        project_description=project["description"],
                        location=project["location"],
                        estimated_impact=project["impact"]
                    )
                    
                    offset_options.append(offset_option)
            
            # Ordenar por costo-efectividad
            offset_options.sort(key=lambda x: x.cost_per_tonne)
            
            return offset_options[:10]  # Retornar top 10 opciones
            
        except Exception as e:
            logger.error(f"❌ Error suggesting carbon offsets: {e}")
            return []

    async def compare_travel_alternatives(self, origin: str, destination: str,
                                        travel_date: datetime) -> List[Dict[str, Any]]:
        """Comparar alternativas de viaje por huella de carbono"""
        try:
            # Calcular distancia aproximada
            distance_km = await self._calculate_distance(origin, destination)
            
            alternatives = []
            
            # Generar alternativas de transporte
            transport_options = [
                TransportMode.FLIGHT_ECONOMY,
                TransportMode.TRAIN_HIGH_SPEED,
                TransportMode.BUS_COACH,
                TransportMode.CAR_HYBRID
            ]
            
            for transport_mode in transport_options:
                # Verificar si es viable (ej: tren solo para ciertas rutas)
                if not await self._is_transport_viable(origin, destination, transport_mode):
                    continue
                
                # Calcular emisiones
                emission_factor = self.emission_factors.get(transport_mode, 0)
                co2_kg = distance_km * emission_factor
                
                # Calcular tiempo y costo aproximado
                travel_time = await self._estimate_travel_time(distance_km, transport_mode)
                cost = await self._estimate_travel_cost(distance_km, transport_mode)
                
                alternative = {
                    "transport_mode": transport_mode.value,
                    "distance_km": distance_km,
                    "co2_kg": co2_kg,
                    "travel_time_hours": travel_time,
                    "estimated_cost": cost,
                    "co2_per_euro": co2_kg / max(cost, 1),
                    "sustainability_rating": await self._calculate_sustainability_rating(transport_mode, co2_kg)
                }
                
                alternatives.append(alternative)
            
            # Ordenar por huella de carbono
            alternatives.sort(key=lambda x: x["co2_kg"])
            
            return alternatives
            
        except Exception as e:
            logger.error(f"❌ Error comparing travel alternatives: {e}")
            return []

    async def track_carbon_goals(self, user_id: str, annual_target_kg: float,
                               current_trips: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Rastrear progreso hacia objetivos de carbono"""
        try:
            # Calcular emisiones del año actual
            current_year = datetime.now().year
            year_emissions = 0.0
            trip_count = 0
            
            for trip in current_trips:
                trip_date = datetime.fromisoformat(trip.get("date", "2024-01-01"))
                if trip_date.year == current_year:
                    footprint = await self.calculate_trip_footprint(trip)
                    year_emissions += footprint.total_co2_kg
                    trip_count += 1
            
            # Calcular progreso
            progress_percentage = min((year_emissions / annual_target_kg) * 100, 100)
            remaining_budget = max(annual_target_kg - year_emissions, 0)
            
            # Calcular proyección
            days_passed = (datetime.now() - datetime(current_year, 1, 1)).days
            days_remaining = 365 - days_passed
            projected_emissions = (year_emissions / max(days_passed, 1)) * 365 if days_passed > 0 else 0
            
            # Generar recomendaciones
            recommendations = []
            if projected_emissions > annual_target_kg:
                over_budget = projected_emissions - annual_target_kg
                recommendations.extend([
                    f"Consider reducing upcoming travel emissions by {over_budget:.1f} kg CO2",
                    "Look into carbon offset options for future trips",
                    "Choose more sustainable transport options"
                ])
            
            tracking_result = {
                "user_id": user_id,
                "annual_target_kg": annual_target_kg,
                "current_emissions_kg": year_emissions,
                "progress_percentage": progress_percentage,
                "remaining_budget_kg": remaining_budget,
                "projected_annual_kg": projected_emissions,
                "on_track": projected_emissions <= annual_target_kg,
                "trips_this_year": trip_count,
                "average_per_trip_kg": year_emissions / max(trip_count, 1),
                "recommendations": recommendations,
                "last_updated": datetime.utcnow()
            }
            
            return tracking_result
            
        except Exception as e:
            logger.error(f"❌ Error tracking carbon goals: {e}")
            return {}

    async def _load_offset_providers(self):
        """Cargar proveedores de compensación de carbono"""
        self.offset_providers = {
            "Gold_Standard": {
                "name": "Gold Standard",
                "certification": "Gold Standard VER",
                "projects": [
                    {
                        "id": "gs_forest_001",
                        "type": "forest_planting",
                        "cost_per_tonne": 25.0,
                        "certification": "Gold Standard VER",
                        "description": "Reforestation project in Amazon rainforest",
                        "location": "Brazil",
                        "impact": "Protects biodiversity and local communities"
                    },
                    {
                        "id": "gs_renewable_001", 
                        "type": "renewable_energy",
                        "cost_per_tonne": 18.0,
                        "certification": "Gold Standard VER",
                        "description": "Wind farm development in India",
                        "location": "India",
                        "impact": "Reduces fossil fuel dependency"
                    }
                ]
            },
            "Verra_VCS": {
                "name": "Verified Carbon Standard",
                "certification": "VCS",
                "projects": [
                    {
                        "id": "vcs_cookstove_001",
                        "type": "cookstove_projects",
                        "cost_per_tonne": 12.0,
                        "certification": "VCS",
                        "description": "Efficient cookstove distribution in Kenya",
                        "location": "Kenya",
                        "impact": "Improves health and reduces deforestation"
                    }
                ]
            }
        }

    async def _setup_sustainable_alternatives(self):
        """Configurar base de datos de alternativas sostenibles"""
        self.sustainable_alternatives = {
            "transport": {
                "electric_buses": {"co2_reduction": 85, "availability": "major_cities"},
                "bike_sharing": {"co2_reduction": 100, "availability": "urban_areas"},
                "electric_trains": {"co2_reduction": 75, "availability": "rail_network"}
            },
            "accommodation": {
                "eco_certified_hotels": {"co2_reduction": 50, "cost_premium": 10},
                "local_homestays": {"co2_reduction": 60, "cost_reduction": 20},
                "camping": {"co2_reduction": 90, "cost_reduction": 70}
            }
        }

    async def process_query(self, query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Procesar consulta específica sobre carbono"""
        try:
            query_lower = query.lower()
            
            if any(keyword in query_lower for keyword in ["carbon footprint", "co2", "emissions"]):
                return await self._handle_footprint_query(query, context)
            elif any(keyword in query_lower for keyword in ["offset", "compensate", "neutralize"]):
                return await self._handle_offset_query(query, context)
            elif any(keyword in query_lower for keyword in ["sustainable", "eco-friendly", "green travel"]):
                return await self._handle_sustainability_query(query, context)
            elif any(keyword in query_lower for keyword in ["optimize", "reduce emissions"]):
                return await self._handle_optimization_query(query, context)
            else:
                return await self._handle_general_carbon_query(query, context)
                
        except Exception as e:
            logger.error(f"❌ Error processing carbon query: {e}")
            return {
                "response": "I apologize, but I encountered an error processing your carbon-related query. Please try rephrasing your question.",
                "error": str(e),
                "suggestions": [
                    "Ask about calculating carbon footprint for your trip",
                    "Inquire about carbon offset options",
                    "Request sustainable travel alternatives"
                ]
            }

    async def cleanup(self):
        """Limpiar recursos del agente"""
        try:
            logger.info("🧹 Cleaning up Carbon Optimizer Agent...")
            
            # Guardar datos de optimización si es necesario
            
            self.is_initialized = False
            logger.info("✅ Carbon Optimizer Agent cleanup completed")
            
        except Exception as e:
            logger.error(f"❌ Carbon Optimizer Agent cleanup error: {e}")

# Función de utilidad
async def create_carbon_optimizer_agent(config: Dict[str, Any]) -> CarbonOptimizerAgent:
    """Factory function para crear agente de optimización de carbono"""
    agent = CarbonOptimizerAgent(config)
    await agent.initialize()
    return agent

# Ejemplo de uso
if __name__ == "__main__":
    async def main():
        config = {"openai_api_key": "test-key"}
        
        try:
            agent = await create_carbon_optimizer_agent(config)
            
            # Test trip data
            trip_data = {
                "trip_id": "test_trip_001",
                "transport": [
                    {"mode": "flight_economy", "distance_km": 1200, "passengers": 1}
                ],
                "accommodation": [
                    {"type": "hotel_standard", "nights": 3}
                ]
            }
            
            # Test footprint calculation
            footprint = await agent.calculate_trip_footprint(trip_data)
            print(f"✅ Trip carbon footprint: {footprint.total_co2_kg:.2f} kg CO2")
            
            # Test offset suggestions
            offsets = await agent.suggest_carbon_offsets(footprint.total_co2_kg, budget=100)
            print(f"✅ Found {len(offsets)} offset options")
            
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            if 'agent' in locals():
                await agent.cleanup()
    
    asyncio.run(main())