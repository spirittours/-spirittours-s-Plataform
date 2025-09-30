"""
Spirit Tours - Accessibility Specialist AI Agent
Agente especializado en accesibilidad turística y adaptaciones para personas con discapacidad
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

class AccessibilityType(Enum):
    """Tipos de necesidades de accesibilidad"""
    MOBILITY = "mobility"                    # Movilidad reducida
    VISUAL = "visual"                        # Discapacidad visual
    HEARING = "hearing"                      # Discapacidad auditiva
    COGNITIVE = "cognitive"                  # Discapacidad cognitiva
    MULTIPLE = "multiple"                    # Múltiples discapacidades
    TEMPORARY = "temporary"                  # Discapacidad temporal

class AccessibilityLevel(Enum):
    """Niveles de accesibilidad"""
    FULLY_ACCESSIBLE = "fully_accessible"   # Completamente accesible
    PARTIALLY_ACCESSIBLE = "partially"      # Parcialmente accesible
    ASSISTED_ACCESS = "assisted_access"     # Acceso con asistencia
    NOT_ACCESSIBLE = "not_accessible"       # No accesible
    UNKNOWN = "unknown"                      # Desconocido

class AccommodationType(Enum):
    """Tipos de alojamiento accesible"""
    WHEELCHAIR_ROOM = "wheelchair_room"      # Habitación adaptada
    ACCESSIBLE_BATHROOM = "accessible_bath"  # Baño accesible
    HEARING_LOOP = "hearing_loop"           # Bucle magnético
    VISUAL_AIDS = "visual_aids"             # Ayudas visuales
    SERVICE_ANIMAL = "service_animal"       # Animal de servicio

@dataclass
class AccessibilityRequirement:
    """Requerimiento de accesibilidad"""
    type: AccessibilityType
    severity: str  # mild, moderate, severe
    equipment_needed: List[str] = field(default_factory=list)
    assistance_level: str = "none"  # none, minimal, moderate, full
    special_requests: str = ""
    medical_considerations: str = ""

@dataclass
class AccessibilityAssessment:
    """Evaluación de accesibilidad de un destino/actividad"""
    destination_id: str
    activity_id: str
    overall_rating: AccessibilityLevel
    mobility_score: int  # 0-100
    visual_score: int    # 0-100
    hearing_score: int   # 0-100
    cognitive_score: int # 0-100
    facilities: List[str] = field(default_factory=list)
    barriers: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    last_updated: datetime = field(default_factory=datetime.utcnow)

@dataclass
class AccessibilityRecommendation:
    """Recomendación de accesibilidad personalizada"""
    recommendation_id: str
    customer_requirements: AccessibilityRequirement
    suitable_destinations: List[str] = field(default_factory=list)
    suitable_activities: List[str] = field(default_factory=list)
    required_accommodations: List[str] = field(default_factory=list)
    equipment_rental: List[str] = field(default_factory=list)
    assistance_services: List[str] = field(default_factory=list)
    cost_adjustments: float = 0.0
    confidence_score: float = 0.0

class AccessibilitySpecialistAgent(BaseAIAgent):
    """
    Agente especializado en accesibilidad turística
    
    Funcionalidades:
    - Evaluación de accesibilidad de destinos y actividades
    - Recomendaciones personalizadas según necesidades
    - Coordinación de servicios de asistencia
    - Adaptación de itinerarios para accesibilidad
    - Información sobre equipamiento y facilidades
    - Contacto con proveedores especializados
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        super().__init__("AccessibilitySpecialistAgent", config)
        
        # Base de datos de accesibilidad
        self.accessibility_database = {}
        self.accommodation_partners = {}
        self.equipment_providers = {}
        self.assistance_services = {}
        
        # Criterios de evaluación
        self.assessment_criteria = {
            "mobility": {
                "entrance_accessibility": 25,
                "pathway_quality": 20,
                "elevator_access": 15,
                "restroom_facilities": 15,
                "parking_availability": 10,
                "seating_options": 15
            },
            "visual": {
                "tactile_guidance": 25,
                "audio_descriptions": 20,
                "braille_signage": 15,
                "high_contrast": 15,
                "lighting_quality": 15,
                "guide_services": 10
            },
            "hearing": {
                "visual_alerts": 25,
                "sign_language": 20,
                "hearing_loop": 15,
                "written_info": 15,
                "vibration_alerts": 15,
                "interpreter_services": 10
            },
            "cognitive": {
                "clear_signage": 25,
                "simple_navigation": 20,
                "staff_training": 15,
                "quiet_spaces": 15,
                "flexible_timing": 15,
                "support_services": 10
            }
        }
        
        # Equipamiento disponible
        self.available_equipment = {
            "mobility": [
                "wheelchair_manual", "wheelchair_electric", "mobility_scooter",
                "walking_aids", "transfer_boards", "portable_ramps"
            ],
            "visual": [
                "white_canes", "magnifying_devices", "audio_guides",
                "braille_maps", "tactile_markers", "guide_dogs"
            ],
            "hearing": [
                "hearing_aids", "fm_systems", "vibrating_alarms",
                "sign_language_interpreters", "captioning_devices"
            ],
            "cognitive": [
                "memory_aids", "simple_instructions", "visual_schedules",
                "communication_boards", "sensory_tools"
            ]
        }

    async def initialize(self):
        """Inicializar agente de accesibilidad"""
        try:
            logger.info("🦽 Initializing Accessibility Specialist Agent...")
            
            # Cargar base de datos de accesibilidad
            await self._load_accessibility_database()
            
            # Configurar proveedores de servicios
            await self._setup_service_providers()
            
            # Inicializar evaluaciones
            await self._initialize_assessments()
            
            self.is_initialized = True
            logger.info("✅ Accessibility Specialist Agent initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Accessibility Specialist Agent: {e}")
            raise

    async def assess_destination_accessibility(self, destination_id: str, 
                                             requirements: AccessibilityRequirement) -> AccessibilityAssessment:
        """Evaluar accesibilidad de un destino"""
        try:
            # Obtener información del destino
            destination_info = await self._get_destination_info(destination_id)
            
            # Evaluar cada aspecto de accesibilidad
            mobility_score = await self._assess_mobility_access(destination_info)
            visual_score = await self._assess_visual_access(destination_info)
            hearing_score = await self._assess_hearing_access(destination_info)
            cognitive_score = await self._assess_cognitive_access(destination_info)
            
            # Calcular calificación general
            overall_score = (mobility_score + visual_score + hearing_score + cognitive_score) / 4
            overall_rating = self._get_accessibility_level(overall_score)
            
            # Identificar barreras y facilidades
            facilities = await self._identify_facilities(destination_info)
            barriers = await self._identify_barriers(destination_info, requirements)
            recommendations = await self._generate_recommendations(destination_info, requirements)
            
            assessment = AccessibilityAssessment(
                destination_id=destination_id,
                activity_id="general",
                overall_rating=overall_rating,
                mobility_score=mobility_score,
                visual_score=visual_score,
                hearing_score=hearing_score,
                cognitive_score=cognitive_score,
                facilities=facilities,
                barriers=barriers,
                recommendations=recommendations
            )
            
            # Guardar evaluación
            self.accessibility_database[destination_id] = assessment
            
            return assessment
            
        except Exception as e:
            logger.error(f"❌ Error assessing destination accessibility: {e}")
            return None

    async def create_accessible_recommendation(self, requirements: AccessibilityRequirement,
                                            preferences: Dict[str, Any]) -> AccessibilityRecommendation:
        """Crear recomendación personalizada de accesibilidad"""
        try:
            recommendation_id = str(uuid.uuid4())
            
            # Encontrar destinos adecuados
            suitable_destinations = await self._find_suitable_destinations(requirements, preferences)
            
            # Encontrar actividades adecuadas
            suitable_activities = await self._find_suitable_activities(requirements, preferences)
            
            # Determinar accommodations necesarios
            required_accommodations = await self._determine_accommodations(requirements)
            
            # Equipamiento de alquiler
            equipment_rental = await self._recommend_equipment(requirements)
            
            # Servicios de asistencia
            assistance_services = await self._recommend_assistance(requirements)
            
            # Calcular ajustes de costo
            cost_adjustments = await self._calculate_accessibility_costs(
                required_accommodations, equipment_rental, assistance_services
            )
            
            # Calcular confianza de la recomendación
            confidence_score = await self._calculate_confidence_score(
                suitable_destinations, suitable_activities, requirements
            )
            
            recommendation = AccessibilityRecommendation(
                recommendation_id=recommendation_id,
                customer_requirements=requirements,
                suitable_destinations=suitable_destinations,
                suitable_activities=suitable_activities,
                required_accommodations=required_accommodations,
                equipment_rental=equipment_rental,
                assistance_services=assistance_services,
                cost_adjustments=cost_adjustments,
                confidence_score=confidence_score
            )
            
            return recommendation
            
        except Exception as e:
            logger.error(f"❌ Error creating accessibility recommendation: {e}")
            return None

    async def coordinate_assistance_services(self, booking_id: str,
                                           requirements: AccessibilityRequirement) -> Dict[str, Any]:
        """Coordinar servicios de asistencia para una reserva"""
        try:
            coordination_result = {
                "booking_id": booking_id,
                "services_coordinated": [],
                "equipment_arranged": [],
                "special_arrangements": [],
                "contacts": [],
                "cost_breakdown": {},
                "confirmation_details": {}
            }
            
            # Coordinar servicios según el tipo de discapacidad
            if requirements.type == AccessibilityType.MOBILITY:
                mobility_services = await self._coordinate_mobility_services(booking_id, requirements)
                coordination_result["services_coordinated"].extend(mobility_services)
                
            elif requirements.type == AccessibilityType.VISUAL:
                visual_services = await self._coordinate_visual_services(booking_id, requirements)
                coordination_result["services_coordinated"].extend(visual_services)
                
            elif requirements.type == AccessibilityType.HEARING:
                hearing_services = await self._coordinate_hearing_services(booking_id, requirements)
                coordination_result["services_coordinated"].extend(hearing_services)
                
            elif requirements.type == AccessibilityType.COGNITIVE:
                cognitive_services = await self._coordinate_cognitive_services(booking_id, requirements)
                coordination_result["services_coordinated"].extend(cognitive_services)
                
            elif requirements.type == AccessibilityType.MULTIPLE:
                # Coordinar múltiples tipos de servicios
                all_services = await self._coordinate_multiple_services(booking_id, requirements)
                coordination_result["services_coordinated"].extend(all_services)
            
            # Organizar equipamiento
            equipment = await self._arrange_equipment(booking_id, requirements)
            coordination_result["equipment_arranged"] = equipment
            
            # Arreglos especiales
            special_arrangements = await self._make_special_arrangements(booking_id, requirements)
            coordination_result["special_arrangements"] = special_arrangements
            
            # Información de contacto
            contacts = await self._provide_emergency_contacts(booking_id, requirements)
            coordination_result["contacts"] = contacts
            
            return coordination_result
            
        except Exception as e:
            logger.error(f"❌ Error coordinating assistance services: {e}")
            return {}

    async def adapt_itinerary_for_accessibility(self, itinerary: Dict[str, Any],
                                              requirements: AccessibilityRequirement) -> Dict[str, Any]:
        """Adaptar itinerario para necesidades de accesibilidad"""
        try:
            adapted_itinerary = itinerary.copy()
            adaptations_made = []
            
            # Revisar cada día del itinerario
            for day_key, day_activities in itinerary.get("days", {}).items():
                adapted_day = []
                
                for activity in day_activities:
                    # Evaluar accesibilidad de la actividad
                    accessibility_check = await self._check_activity_accessibility(activity, requirements)
                    
                    if accessibility_check["suitable"]:
                        # Actividad adecuada, posibles adaptaciones menores
                        adapted_activity = activity.copy()
                        
                        if accessibility_check["adaptations_needed"]:
                            adapted_activity["accessibility_adaptations"] = accessibility_check["adaptations"]
                            adaptations_made.extend(accessibility_check["adaptations"])
                        
                        adapted_day.append(adapted_activity)
                    else:
                        # Buscar alternativa accesible
                        alternative = await self._find_accessible_alternative(activity, requirements)
                        
                        if alternative:
                            alternative["original_activity"] = activity["name"]
                            alternative["reason_for_change"] = accessibility_check["barriers"]
                            adapted_day.append(alternative)
                            adaptations_made.append(f"Replaced {activity['name']} with {alternative['name']}")
                        else:
                            # No hay alternativa, marcar para revisión manual
                            adapted_day.append({
                                "type": "manual_review_needed",
                                "original_activity": activity,
                                "accessibility_issues": accessibility_check["barriers"],
                                "message": "This activity requires manual review for accessibility adaptation"
                            })
                            adaptations_made.append(f"Manual review needed for {activity['name']}")
                
                adapted_itinerary["days"][day_key] = adapted_day
            
            # Añadir tiempo extra para desplazamientos
            await self._adjust_timing_for_accessibility(adapted_itinerary, requirements)
            
            # Añadir información de accesibilidad
            adapted_itinerary["accessibility_info"] = {
                "requirements": requirements.__dict__,
                "adaptations_made": adaptations_made,
                "accessibility_rating": await self._rate_itinerary_accessibility(adapted_itinerary),
                "special_instructions": await self._generate_accessibility_instructions(adapted_itinerary, requirements),
                "emergency_procedures": await self._create_emergency_procedures(requirements)
            }
            
            return adapted_itinerary
            
        except Exception as e:
            logger.error(f"❌ Error adapting itinerary for accessibility: {e}")
            return itinerary

    async def _load_accessibility_database(self):
        """Cargar base de datos de accesibilidad"""
        # Simular carga de base de datos con información de accesibilidad
        sample_destinations = [
            {
                "id": "dest_001",
                "name": "Barcelona City Center",
                "mobility_features": ["wheelchair_accessible", "ramps", "elevators"],
                "visual_features": ["tactile_paths", "audio_guides", "braille_info"],
                "hearing_features": ["visual_alerts", "sign_language_tours"],
                "cognitive_features": ["clear_signage", "simplified_maps"]
            }
        ]
        
        for dest in sample_destinations:
            self.accessibility_database[dest["id"]] = dest

    async def _setup_service_providers(self):
        """Configurar proveedores de servicios de accesibilidad"""
        self.accommodation_partners = {
            "wheelchair_accessible_hotels": [
                {"name": "Hotel Accessible Barcelona", "rating": 5, "contact": "info@accessible-bcn.com"}
            ],
            "guide_services": [
                {"name": "AccessibleTours Spain", "languages": ["es", "en", "fr"], "specialties": ["visual", "hearing"]}
            ],
            "equipment_rental": [
                {"name": "MobilityRent Barcelona", "equipment": ["wheelchairs", "scooters"], "delivery": True}
            ]
        }

    async def _initialize_assessments(self):
        """Inicializar evaluaciones de accesibilidad"""
        # Crear evaluaciones base para destinos comunes
        pass

    async def process_query(self, query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Procesar consulta específica de accesibilidad"""
        try:
            query_lower = query.lower()
            
            if any(keyword in query_lower for keyword in ["wheelchair", "mobility", "disabled access"]):
                return await self._handle_mobility_query(query, context)
            elif any(keyword in query_lower for keyword in ["blind", "visual", "sight"]):
                return await self._handle_visual_query(query, context)
            elif any(keyword in query_lower for keyword in ["deaf", "hearing", "sign language"]):
                return await self._handle_hearing_query(query, context)
            elif any(keyword in query_lower for keyword in ["cognitive", "autism", "learning"]):
                return await self._handle_cognitive_query(query, context)
            else:
                return await self._handle_general_accessibility_query(query, context)
                
        except Exception as e:
            logger.error(f"❌ Error processing accessibility query: {e}")
            return {
                "response": "I apologize, but I encountered an error processing your accessibility query. Please try rephrasing your question or contact our accessibility specialist directly.",
                "error": str(e),
                "suggestions": [
                    "Contact our accessibility department: accessibility@spirittours.com",
                    "Call our accessibility hotline: +34 900 123 456",
                    "Request a personalized accessibility consultation"
                ]
            }

    async def cleanup(self):
        """Limpiar recursos del agente"""
        try:
            logger.info("🧹 Cleaning up Accessibility Specialist Agent...")
            
            # Guardar datos de accesibilidad si es necesario
            # Cerrar conexiones con proveedores
            
            self.is_initialized = False
            logger.info("✅ Accessibility Specialist Agent cleanup completed")
            
        except Exception as e:
            logger.error(f"❌ Accessibility Specialist Agent cleanup error: {e}")

# Función de utilidad
async def create_accessibility_specialist_agent(config: Dict[str, Any]) -> AccessibilitySpecialistAgent:
    """Factory function para crear agente de accesibilidad"""
    agent = AccessibilitySpecialistAgent(config)
    await agent.initialize()
    return agent

# Ejemplo de uso
if __name__ == "__main__":
    async def main():
        config = {"openai_api_key": "test-key"}
        
        try:
            agent = await create_accessibility_specialist_agent(config)
            
            # Test accessibility requirement
            requirement = AccessibilityRequirement(
                type=AccessibilityType.MOBILITY,
                severity="moderate",
                equipment_needed=["wheelchair"],
                assistance_level="minimal"
            )
            
            # Test destination assessment
            assessment = await agent.assess_destination_accessibility("dest_001", requirement)
            print(f"✅ Accessibility assessment: {assessment.overall_rating.value}")
            
            # Test recommendation
            preferences = {"destination_type": "city", "budget": "medium"}
            recommendation = await agent.create_accessible_recommendation(requirement, preferences)
            print(f"✅ Accessibility recommendation created with confidence: {recommendation.confidence_score}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            if 'agent' in locals():
                await agent.cleanup()
    
    asyncio.run(main())