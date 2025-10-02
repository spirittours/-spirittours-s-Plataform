"""
Environmental Impact Agent - Track 3
Agente especializado en análisis y optimización del impacto ambiental
de viajes y actividades turísticas.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import asyncio
import aiohttp
from dataclasses import dataclass, field
import numpy as np
from enum import Enum
import hashlib
import re

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ImpactLevel(Enum):
    """Niveles de impacto ambiental"""
    VERY_LOW = "very_low"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    VERY_HIGH = "very_high"

class TransportMode(Enum):
    """Modos de transporte"""
    WALKING = "walking"
    BICYCLE = "bicycle"
    ELECTRIC_VEHICLE = "electric_vehicle"
    PUBLIC_TRANSPORT = "public_transport"
    CAR = "car"
    BUS = "bus"
    TRAIN = "train"
    AIRPLANE = "airplane"
    CRUISE_SHIP = "cruise_ship"

@dataclass
class CarbonFootprint:
    """Huella de carbono de una actividad"""
    activity_type: str
    co2_emissions_kg: float
    energy_consumption_kwh: float
    water_usage_liters: float
    waste_generated_kg: float
    impact_level: ImpactLevel
    offset_options: List[Dict[str, Any]] = field(default_factory=list)
    
    def total_environmental_score(self) -> float:
        """Calcula el puntaje ambiental total"""
        # Normalización y ponderación de factores
        co2_weight = 0.4
        energy_weight = 0.25
        water_weight = 0.20
        waste_weight = 0.15
        
        # Normalizar valores (valores ejemplo para referencia)
        co2_norm = min(self.co2_emissions_kg / 1000, 1.0)  # 1000 kg como máximo
        energy_norm = min(self.energy_consumption_kwh / 500, 1.0)  # 500 kwh como máximo
        water_norm = min(self.water_usage_liters / 5000, 1.0)  # 5000 L como máximo
        waste_norm = min(self.waste_generated_kg / 100, 1.0)  # 100 kg como máximo
        
        score = (co2_norm * co2_weight + 
                energy_norm * energy_weight + 
                water_norm * water_weight + 
                waste_norm * waste_weight)
        
        return round(1 - score, 2)  # Invertir para que mayor sea mejor

@dataclass
class EcoAlternative:
    """Alternativa ecológica para una actividad"""
    activity_id: str
    original_activity: str
    eco_alternative: str
    carbon_savings_kg: float
    cost_difference: float
    convenience_score: float
    environmental_benefits: List[str]
    implementation_difficulty: str
    
    def feasibility_score(self) -> float:
        """Calcula la viabilidad de la alternativa"""
        carbon_weight = 0.35
        cost_weight = 0.25
        convenience_weight = 0.40
        
        carbon_score = min(self.carbon_savings_kg / 100, 1.0)
        cost_score = max(0, 1 - abs(self.cost_difference) / 1000)
        
        return round(
            carbon_score * carbon_weight + 
            cost_score * cost_weight + 
            self.convenience_score * convenience_weight, 
            2
        )

class EnvironmentalImpactAgent:
    """
    Agente de IA para análisis y optimización del impacto ambiental
    """
    
    def __init__(self):
        self.agent_id = "environmental_impact_agent"
        self.version = "2.0.0"
        self.capabilities = [
            "carbon_footprint_calculation",
            "eco_alternatives_suggestion",
            "sustainability_scoring",
            "green_certification_verification",
            "environmental_impact_prediction",
            "offset_recommendations",
            "eco_route_optimization",
            "waste_reduction_strategies",
            "energy_efficiency_analysis",
            "biodiversity_impact_assessment"
        ]
        
        # Base de datos de emisiones por modo de transporte (kg CO2 por km)
        self.transport_emissions = {
            TransportMode.WALKING: 0,
            TransportMode.BICYCLE: 0,
            TransportMode.ELECTRIC_VEHICLE: 0.05,
            TransportMode.PUBLIC_TRANSPORT: 0.08,
            TransportMode.CAR: 0.21,
            TransportMode.BUS: 0.10,
            TransportMode.TRAIN: 0.04,
            TransportMode.AIRPLANE: 0.25,
            TransportMode.CRUISE_SHIP: 0.35
        }
        
        # Factores de emisión por tipo de alojamiento (kg CO2 por noche)
        self.accommodation_emissions = {
            "eco_lodge": 5,
            "green_hotel": 10,
            "standard_hotel": 20,
            "luxury_hotel": 35,
            "hostel": 8,
            "camping": 2,
            "airbnb": 15,
            "resort": 40
        }
        
        # Certificaciones verdes reconocidas
        self.green_certifications = {
            "green_globe": {"weight": 0.9, "validity_days": 365},
            "ecoturismo_certification": {"weight": 0.85, "validity_days": 730},
            "leed": {"weight": 0.95, "validity_days": 1095},
            "energy_star": {"weight": 0.8, "validity_days": 365},
            "rainforest_alliance": {"weight": 0.88, "validity_days": 365},
            "carbon_neutral": {"weight": 1.0, "validity_days": 365}
        }
        
        self.cache = {}
        self.metrics = {
            "calculations_performed": 0,
            "alternatives_suggested": 0,
            "carbon_saved_kg": 0,
            "eco_routes_optimized": 0
        }
    
    async def calculate_carbon_footprint(
        self,
        trip_data: Dict[str, Any]
    ) -> CarbonFootprint:
        """
        Calcula la huella de carbono de un viaje
        """
        try:
            total_co2 = 0
            total_energy = 0
            total_water = 0
            total_waste = 0
            
            # Calcular emisiones de transporte
            if "transport" in trip_data:
                for segment in trip_data["transport"]:
                    mode = TransportMode[segment["mode"].upper()]
                    distance = segment.get("distance_km", 0)
                    emissions_per_km = self.transport_emissions.get(mode, 0.2)
                    total_co2 += distance * emissions_per_km
                    
                    # Estimación de energía
                    total_energy += distance * 0.5  # kwh estimados
            
            # Calcular emisiones de alojamiento
            if "accommodation" in trip_data:
                nights = trip_data["accommodation"].get("nights", 1)
                acc_type = trip_data["accommodation"].get("type", "standard_hotel")
                emissions_per_night = self.accommodation_emissions.get(acc_type, 20)
                total_co2 += nights * emissions_per_night
                
                # Estimaciones adicionales
                total_energy += nights * 10  # kwh por noche
                total_water += nights * 200  # litros por noche
                total_waste += nights * 2  # kg por noche
            
            # Calcular emisiones de actividades
            if "activities" in trip_data:
                for activity in trip_data["activities"]:
                    # Estimación basada en tipo de actividad
                    activity_emissions = self._estimate_activity_emissions(activity)
                    total_co2 += activity_emissions["co2"]
                    total_energy += activity_emissions["energy"]
                    total_water += activity_emissions["water"]
                    total_waste += activity_emissions["waste"]
            
            # Determinar nivel de impacto
            impact_level = self._determine_impact_level(total_co2)
            
            # Generar opciones de compensación
            offset_options = await self._generate_offset_options(total_co2)
            
            footprint = CarbonFootprint(
                activity_type="trip",
                co2_emissions_kg=round(total_co2, 2),
                energy_consumption_kwh=round(total_energy, 2),
                water_usage_liters=round(total_water, 2),
                waste_generated_kg=round(total_waste, 2),
                impact_level=impact_level,
                offset_options=offset_options
            )
            
            self.metrics["calculations_performed"] += 1
            
            return footprint
            
        except Exception as e:
            logger.error(f"Error calculating carbon footprint: {e}")
            raise
    
    async def suggest_eco_alternatives(
        self,
        activity_data: Dict[str, Any]
    ) -> List[EcoAlternative]:
        """
        Sugiere alternativas ecológicas para actividades
        """
        try:
            alternatives = []
            activity_type = activity_data.get("type", "general")
            
            if activity_type == "transport":
                alternatives.extend(
                    await self._suggest_transport_alternatives(activity_data)
                )
            elif activity_type == "accommodation":
                alternatives.extend(
                    await self._suggest_accommodation_alternatives(activity_data)
                )
            elif activity_type == "tour":
                alternatives.extend(
                    await self._suggest_tour_alternatives(activity_data)
                )
            
            # Ordenar por puntaje de viabilidad
            alternatives.sort(key=lambda x: x.feasibility_score(), reverse=True)
            
            self.metrics["alternatives_suggested"] += len(alternatives)
            
            # Calcular carbono ahorrado potencial
            for alt in alternatives:
                self.metrics["carbon_saved_kg"] += alt.carbon_savings_kg
            
            return alternatives[:5]  # Retornar top 5 alternativas
            
        except Exception as e:
            logger.error(f"Error suggesting eco alternatives: {e}")
            return []
    
    async def calculate_sustainability_score(
        self,
        business_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calcula el puntaje de sostenibilidad de un negocio
        """
        try:
            scores = {
                "environmental": 0,
                "social": 0,
                "economic": 0,
                "overall": 0,
                "certifications": [],
                "recommendations": []
            }
            
            # Evaluar prácticas ambientales
            env_practices = business_data.get("environmental_practices", {})
            scores["environmental"] = self._evaluate_environmental_practices(env_practices)
            
            # Evaluar certificaciones
            certifications = business_data.get("certifications", [])
            cert_score = 0
            for cert in certifications:
                if cert in self.green_certifications:
                    cert_info = self.green_certifications[cert]
                    cert_score += cert_info["weight"]
                    scores["certifications"].append({
                        "name": cert,
                        "weight": cert_info["weight"],
                        "valid": True
                    })
            
            # Evaluar impacto social
            social_practices = business_data.get("social_practices", {})
            scores["social"] = self._evaluate_social_practices(social_practices)
            
            # Evaluar sostenibilidad económica
            economic_practices = business_data.get("economic_practices", {})
            scores["economic"] = self._evaluate_economic_practices(economic_practices)
            
            # Calcular puntaje general
            scores["overall"] = round(
                (scores["environmental"] * 0.4 +
                 scores["social"] * 0.3 +
                 scores["economic"] * 0.2 +
                 min(cert_score, 1.0) * 0.1) * 100,
                2
            )
            
            # Generar recomendaciones
            if scores["overall"] < 50:
                scores["recommendations"].append(
                    "Considerar implementar prácticas de gestión ambiental básicas"
                )
            if scores["environmental"] < 0.5:
                scores["recommendations"].append(
                    "Mejorar eficiencia energética y reducir emisiones"
                )
            if not certifications:
                scores["recommendations"].append(
                    "Obtener certificaciones verdes reconocidas"
                )
            
            return scores
            
        except Exception as e:
            logger.error(f"Error calculating sustainability score: {e}")
            return {"overall": 0, "error": str(e)}
    
    async def optimize_eco_route(
        self,
        origin: str,
        destination: str,
        preferences: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Optimiza una ruta para minimizar impacto ambiental
        """
        try:
            eco_route = {
                "segments": [],
                "total_distance_km": 0,
                "total_co2_kg": 0,
                "total_time_hours": 0,
                "eco_score": 0,
                "alternatives": []
            }
            
            # Simular cálculo de ruta ecológica
            # En producción, esto se integraría con APIs de mapas y transporte
            
            # Ejemplo de ruta optimizada
            eco_route["segments"] = [
                {
                    "mode": "train",
                    "distance_km": 200,
                    "co2_kg": 8,
                    "time_hours": 2.5,
                    "cost": 45
                },
                {
                    "mode": "electric_bus",
                    "distance_km": 50,
                    "co2_kg": 2.5,
                    "time_hours": 1,
                    "cost": 10
                }
            ]
            
            # Calcular totales
            for segment in eco_route["segments"]:
                eco_route["total_distance_km"] += segment["distance_km"]
                eco_route["total_co2_kg"] += segment["co2_kg"]
                eco_route["total_time_hours"] += segment["time_hours"]
            
            # Calcular eco score (0-100)
            max_co2 = eco_route["total_distance_km"] * 0.25  # Peor caso: avión
            actual_co2 = eco_route["total_co2_kg"]
            eco_route["eco_score"] = round(
                max(0, 100 * (1 - actual_co2 / max_co2)), 
                2
            )
            
            self.metrics["eco_routes_optimized"] += 1
            
            return eco_route
            
        except Exception as e:
            logger.error(f"Error optimizing eco route: {e}")
            return {"error": str(e)}
    
    async def analyze_biodiversity_impact(
        self,
        location: Dict[str, Any],
        activity_type: str
    ) -> Dict[str, Any]:
        """
        Analiza el impacto potencial en la biodiversidad local
        """
        try:
            impact_analysis = {
                "location": location,
                "activity": activity_type,
                "biodiversity_index": 0,
                "threatened_species": [],
                "protected_areas": [],
                "impact_level": "low",
                "mitigation_measures": [],
                "best_practices": []
            }
            
            # Simular análisis de biodiversidad
            # En producción, esto se conectaría con bases de datos de conservación
            
            # Ejemplo de análisis
            if "national_park" in location.get("type", "").lower():
                impact_analysis["biodiversity_index"] = 85
                impact_analysis["threatened_species"] = [
                    {"name": "Mountain Gorilla", "status": "Endangered"},
                    {"name": "Forest Elephant", "status": "Vulnerable"}
                ]
                impact_analysis["protected_areas"] = ["UNESCO World Heritage Site"]
                impact_analysis["impact_level"] = "moderate"
                impact_analysis["mitigation_measures"] = [
                    "Mantener distancia mínima de 10m de la fauna",
                    "No usar flash en fotografías",
                    "Seguir senderos designados",
                    "No dejar residuos"
                ]
                impact_analysis["best_practices"] = [
                    "Contratar guías locales certificados",
                    "Limitar tamaño de grupos a 8 personas",
                    "Contribuir a fondos de conservación local"
                ]
            
            return impact_analysis
            
        except Exception as e:
            logger.error(f"Error analyzing biodiversity impact: {e}")
            return {"error": str(e)}
    
    async def generate_sustainability_report(
        self,
        trip_id: str,
        detailed: bool = False
    ) -> Dict[str, Any]:
        """
        Genera un reporte completo de sostenibilidad
        """
        try:
            report = {
                "trip_id": trip_id,
                "generated_at": datetime.now().isoformat(),
                "summary": {},
                "detailed_analysis": {},
                "recommendations": [],
                "achievements": [],
                "improvement_areas": []
            }
            
            # Resumen ejecutivo
            report["summary"] = {
                "total_co2_kg": 245.5,
                "water_saved_liters": 500,
                "waste_diverted_kg": 10,
                "local_economy_contribution": 1200,
                "sustainability_score": 78,
                "carbon_offset_purchased": True
            }
            
            if detailed:
                report["detailed_analysis"] = {
                    "transport": {
                        "total_km": 850,
                        "co2_kg": 120,
                        "eco_transport_percentage": 65
                    },
                    "accommodation": {
                        "nights": 7,
                        "green_certified": True,
                        "energy_saved_kwh": 35
                    },
                    "activities": {
                        "eco_tours": 4,
                        "local_businesses_supported": 12,
                        "cultural_preservation_contribution": 200
                    }
                }
            
            # Recomendaciones
            report["recommendations"] = [
                "Considerar transporte ferroviario para próximo viaje",
                "Elegir alojamientos con certificación LEED",
                "Participar en programas de reforestación local"
            ]
            
            # Logros
            report["achievements"] = [
                {"badge": "Eco Traveler", "description": "Reducción de 50% en emisiones"},
                {"badge": "Local Supporter", "description": "90% de compras en negocios locales"}
            ]
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating sustainability report: {e}")
            return {"error": str(e)}
    
    # Métodos privados de apoyo
    
    def _estimate_activity_emissions(self, activity: Dict[str, Any]) -> Dict[str, float]:
        """Estima emisiones de una actividad"""
        activity_type = activity.get("type", "general")
        duration_hours = activity.get("duration_hours", 1)
        
        # Valores base por tipo de actividad
        emissions_map = {
            "hiking": {"co2": 0.1, "energy": 0.5, "water": 10, "waste": 0.1},
            "diving": {"co2": 5, "energy": 2, "water": 50, "waste": 0.5},
            "safari": {"co2": 15, "energy": 5, "water": 30, "waste": 1},
            "cultural_tour": {"co2": 2, "energy": 1, "water": 20, "waste": 0.2},
            "spa": {"co2": 3, "energy": 4, "water": 200, "waste": 0.5}
        }
        
        base = emissions_map.get(activity_type, {"co2": 2, "energy": 1, "water": 25, "waste": 0.3})
        
        return {
            "co2": base["co2"] * duration_hours,
            "energy": base["energy"] * duration_hours,
            "water": base["water"] * duration_hours,
            "waste": base["waste"] * duration_hours
        }
    
    def _determine_impact_level(self, co2_kg: float) -> ImpactLevel:
        """Determina el nivel de impacto basado en CO2"""
        if co2_kg < 50:
            return ImpactLevel.VERY_LOW
        elif co2_kg < 150:
            return ImpactLevel.LOW
        elif co2_kg < 300:
            return ImpactLevel.MODERATE
        elif co2_kg < 500:
            return ImpactLevel.HIGH
        else:
            return ImpactLevel.VERY_HIGH
    
    async def _generate_offset_options(self, co2_kg: float) -> List[Dict[str, Any]]:
        """Genera opciones de compensación de carbono"""
        options = []
        
        # Reforestación
        trees_needed = int(co2_kg / 20)  # Un árbol absorbe ~20kg CO2/año
        options.append({
            "type": "reforestation",
            "description": f"Plantar {trees_needed} árboles",
            "cost": trees_needed * 5,
            "provider": "Local Forest Initiative",
            "certification": "VCS"
        })
        
        # Energía renovable
        renewable_kwh = co2_kg * 2
        options.append({
            "type": "renewable_energy",
            "description": f"Financiar {renewable_kwh}kwh de energía solar",
            "cost": renewable_kwh * 0.1,
            "provider": "Solar Community Project",
            "certification": "Gold Standard"
        })
        
        # Conservación
        hectares = co2_kg / 100
        options.append({
            "type": "conservation",
            "description": f"Proteger {hectares:.2f} hectáreas de bosque",
            "cost": hectares * 50,
            "provider": "Rainforest Trust",
            "certification": "CCB"
        })
        
        return options
    
    async def _suggest_transport_alternatives(
        self,
        transport_data: Dict[str, Any]
    ) -> List[EcoAlternative]:
        """Sugiere alternativas de transporte ecológicas"""
        alternatives = []
        current_mode = transport_data.get("mode", "car")
        distance = transport_data.get("distance_km", 100)
        
        # Calcular emisiones actuales
        current_emissions = distance * self.transport_emissions.get(
            TransportMode[current_mode.upper()], 0.2
        )
        
        # Sugerir alternativas según distancia
        if distance < 5:
            alternatives.append(EcoAlternative(
                activity_id=f"transport_{transport_data.get('id', '1')}",
                original_activity=f"{current_mode} - {distance}km",
                eco_alternative="Caminar o bicicleta",
                carbon_savings_kg=current_emissions,
                cost_difference=-transport_data.get("cost", 10),
                convenience_score=0.7 if distance < 2 else 0.5,
                environmental_benefits=[
                    "Cero emisiones",
                    "Beneficios para la salud",
                    "Reduce congestión urbana"
                ],
                implementation_difficulty="easy"
            ))
        
        if distance < 50:
            public_emissions = distance * self.transport_emissions[TransportMode.PUBLIC_TRANSPORT]
            alternatives.append(EcoAlternative(
                activity_id=f"transport_{transport_data.get('id', '1')}",
                original_activity=f"{current_mode} - {distance}km",
                eco_alternative="Transporte público",
                carbon_savings_kg=current_emissions - public_emissions,
                cost_difference=-transport_data.get("cost", 20) * 0.6,
                convenience_score=0.8,
                environmental_benefits=[
                    "Reduce emisiones por persona",
                    "Menor congestión",
                    "Apoya infraestructura pública"
                ],
                implementation_difficulty="easy"
            ))
        
        if distance > 100:
            train_emissions = distance * self.transport_emissions[TransportMode.TRAIN]
            alternatives.append(EcoAlternative(
                activity_id=f"transport_{transport_data.get('id', '1')}",
                original_activity=f"{current_mode} - {distance}km",
                eco_alternative="Tren",
                carbon_savings_kg=current_emissions - train_emissions,
                cost_difference=transport_data.get("cost", 50) * 0.1,
                convenience_score=0.9,
                environmental_benefits=[
                    "80% menos emisiones que avión",
                    "Menor consumo energético",
                    "Infraestructura existente"
                ],
                implementation_difficulty="medium"
            ))
        
        return alternatives
    
    async def _suggest_accommodation_alternatives(
        self,
        accommodation_data: Dict[str, Any]
    ) -> List[EcoAlternative]:
        """Sugiere alternativas de alojamiento ecológicas"""
        alternatives = []
        current_type = accommodation_data.get("type", "standard_hotel")
        nights = accommodation_data.get("nights", 1)
        
        # Calcular emisiones actuales
        current_emissions = nights * self.accommodation_emissions.get(current_type, 20)
        
        # Eco-lodge
        eco_emissions = nights * self.accommodation_emissions["eco_lodge"]
        alternatives.append(EcoAlternative(
            activity_id=f"accommodation_{accommodation_data.get('id', '1')}",
            original_activity=f"{current_type} - {nights} noches",
            eco_alternative="Eco-lodge certificado",
            carbon_savings_kg=current_emissions - eco_emissions,
            cost_difference=accommodation_data.get("cost", 100) * 0.1,
            convenience_score=0.85,
            environmental_benefits=[
                "Energía 100% renovable",
                "Gestión sostenible del agua",
                "Apoyo a comunidad local",
                "Conservación de biodiversidad"
            ],
            implementation_difficulty="easy"
        ))
        
        # Camping
        camping_emissions = nights * self.accommodation_emissions["camping"]
        alternatives.append(EcoAlternative(
            activity_id=f"accommodation_{accommodation_data.get('id', '1')}",
            original_activity=f"{current_type} - {nights} noches",
            eco_alternative="Camping ecológico",
            carbon_savings_kg=current_emissions - camping_emissions,
            cost_difference=-accommodation_data.get("cost", 100) * 0.7,
            convenience_score=0.6,
            environmental_benefits=[
                "Mínimo impacto ambiental",
                "Conexión con naturaleza",
                "Bajo consumo recursos"
            ],
            implementation_difficulty="medium"
        ))
        
        return alternatives
    
    async def _suggest_tour_alternatives(
        self,
        tour_data: Dict[str, Any]
    ) -> List[EcoAlternative]:
        """Sugiere alternativas de tours ecológicas"""
        alternatives = []
        
        alternatives.append(EcoAlternative(
            activity_id=f"tour_{tour_data.get('id', '1')}",
            original_activity=tour_data.get("name", "Tour estándar"),
            eco_alternative="Tour a pie con guía local",
            carbon_savings_kg=15,
            cost_difference=-10,
            convenience_score=0.9,
            environmental_benefits=[
                "Cero emisiones de transporte",
                "Apoyo a economía local",
                "Experiencia más auténtica",
                "Menor impacto en sitios"
            ],
            implementation_difficulty="easy"
        ))
        
        return alternatives
    
    def _evaluate_environmental_practices(self, practices: Dict[str, Any]) -> float:
        """Evalúa prácticas ambientales"""
        score = 0
        max_score = 0
        
        criteria = {
            "renewable_energy": 2.0,
            "water_conservation": 1.5,
            "waste_management": 1.5,
            "local_sourcing": 1.0,
            "biodiversity_protection": 1.5,
            "carbon_offsetting": 1.0,
            "green_transportation": 1.5
        }
        
        for criterion, weight in criteria.items():
            max_score += weight
            if practices.get(criterion, False):
                score += weight
        
        return round(score / max_score, 2) if max_score > 0 else 0
    
    def _evaluate_social_practices(self, practices: Dict[str, Any]) -> float:
        """Evalúa prácticas sociales"""
        score = 0
        max_score = 0
        
        criteria = {
            "local_employment": 2.0,
            "fair_wages": 2.0,
            "community_support": 1.5,
            "cultural_preservation": 1.5,
            "accessibility": 1.0,
            "education_programs": 1.0,
            "gender_equality": 1.0
        }
        
        for criterion, weight in criteria.items():
            max_score += weight
            if practices.get(criterion, False):
                score += weight
        
        return round(score / max_score, 2) if max_score > 0 else 0
    
    def _evaluate_economic_practices(self, practices: Dict[str, Any]) -> float:
        """Evalúa prácticas económicas sostenibles"""
        score = 0
        max_score = 0
        
        criteria = {
            "local_suppliers": 1.5,
            "reinvestment": 1.5,
            "transparency": 1.0,
            "long_term_planning": 1.0,
            "economic_resilience": 1.0,
            "innovation": 1.0
        }
        
        for criterion, weight in criteria.items():
            max_score += weight
            if practices.get(criterion, False):
                score += weight
        
        return round(score / max_score, 2) if max_score > 0 else 0
    
    def get_metrics(self) -> Dict[str, Any]:
        """Obtiene métricas del agente"""
        return {
            "agent_id": self.agent_id,
            "version": self.version,
            "metrics": self.metrics,
            "cache_size": len(self.cache),
            "capabilities": self.capabilities
        }

# Funciones principales para uso del agente
async def main():
    """Función principal para pruebas"""
    agent = EnvironmentalImpactAgent()
    
    # Ejemplo de cálculo de huella de carbono
    trip_data = {
        "transport": [
            {"mode": "airplane", "distance_km": 500},
            {"mode": "car", "distance_km": 100}
        ],
        "accommodation": {
            "type": "standard_hotel",
            "nights": 5
        },
        "activities": [
            {"type": "hiking", "duration_hours": 4},
            {"type": "cultural_tour", "duration_hours": 3}
        ]
    }
    
    footprint = await agent.calculate_carbon_footprint(trip_data)
    print(f"Huella de carbono: {footprint.co2_emissions_kg}kg CO2")
    print(f"Nivel de impacto: {footprint.impact_level.value}")
    print(f"Puntaje ambiental: {footprint.total_environmental_score()}")
    
    # Ejemplo de alternativas ecológicas
    activity = {
        "type": "transport",
        "mode": "car",
        "distance_km": 200,
        "cost": 50
    }
    
    alternatives = await agent.suggest_eco_alternatives(activity)
    for alt in alternatives:
        print(f"\nAlternativa: {alt.eco_alternative}")
        print(f"Ahorro CO2: {alt.carbon_savings_kg}kg")
        print(f"Viabilidad: {alt.feasibility_score()}")

if __name__ == "__main__":
    asyncio.run(main())