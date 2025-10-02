"""
Crisis Management Agent - Track 3
Agente especializado en gestión de crisis, emergencias y continuidad del negocio
para la industria de viajes y turismo.
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
from collections import defaultdict

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CrisisLevel(Enum):
    """Niveles de crisis"""
    MINIMAL = "minimal"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"
    CATASTROPHIC = "catastrophic"

class CrisisType(Enum):
    """Tipos de crisis"""
    NATURAL_DISASTER = "natural_disaster"
    PANDEMIC = "pandemic"
    TERRORISM = "terrorism"
    POLITICAL_INSTABILITY = "political_instability"
    ECONOMIC_CRISIS = "economic_crisis"
    CYBER_ATTACK = "cyber_attack"
    TRANSPORTATION_DISRUPTION = "transportation_disruption"
    WEATHER_EXTREME = "weather_extreme"
    HEALTH_EMERGENCY = "health_emergency"
    INFRASTRUCTURE_FAILURE = "infrastructure_failure"

class ResponsePhase(Enum):
    """Fases de respuesta a crisis"""
    PREVENTION = "prevention"
    DETECTION = "detection"
    ASSESSMENT = "assessment"
    RESPONSE = "response"
    RECOVERY = "recovery"
    LEARNING = "learning"

@dataclass
class CrisisEvent:
    """Evento de crisis"""
    event_id: str
    type: CrisisType
    level: CrisisLevel
    location: Dict[str, Any]
    start_time: datetime
    affected_areas: List[str]
    affected_services: List[str]
    estimated_impact: Dict[str, Any]
    response_status: ResponsePhase
    actions_taken: List[Dict[str, Any]] = field(default_factory=list)
    resolution_time: Optional[datetime] = None
    
    def duration_hours(self) -> float:
        """Calcula la duración de la crisis"""
        end = self.resolution_time or datetime.now()
        return (end - self.start_time).total_seconds() / 3600
    
    def impact_score(self) -> float:
        """Calcula el puntaje de impacto"""
        level_weights = {
            CrisisLevel.MINIMAL: 0.1,
            CrisisLevel.LOW: 0.2,
            CrisisLevel.MODERATE: 0.4,
            CrisisLevel.HIGH: 0.6,
            CrisisLevel.CRITICAL: 0.8,
            CrisisLevel.CATASTROPHIC: 1.0
        }
        
        base_score = level_weights.get(self.level, 0.5)
        area_factor = min(len(self.affected_areas) / 10, 1.0)
        service_factor = min(len(self.affected_services) / 5, 1.0)
        
        return round(base_score * 0.5 + area_factor * 0.25 + service_factor * 0.25, 2)

@dataclass
class EmergencyContact:
    """Contacto de emergencia"""
    name: str
    role: str
    phone: str
    email: str
    available_24_7: bool
    languages: List[str]
    specialization: str
    priority: int

@dataclass
class CrisisResponse:
    """Respuesta a crisis"""
    response_id: str
    crisis_event_id: str
    response_type: str
    actions: List[Dict[str, Any]]
    resources_needed: List[str]
    timeline: Dict[str, Any]
    responsible_teams: List[str]
    communication_plan: Dict[str, Any]
    success_criteria: List[str]
    
    def readiness_score(self) -> float:
        """Calcula el puntaje de preparación"""
        score = 0
        if self.actions: score += 0.3
        if self.resources_needed: score += 0.2
        if self.timeline: score += 0.2
        if self.responsible_teams: score += 0.2
        if self.communication_plan: score += 0.1
        return round(score, 2)

class CrisisManagementAgent:
    """
    Agente de IA para gestión de crisis y emergencias
    """
    
    def __init__(self):
        self.agent_id = "crisis_management_agent"
        self.version = "2.0.0"
        self.capabilities = [
            "crisis_detection",
            "risk_assessment",
            "emergency_response_planning",
            "evacuation_coordination",
            "communication_management",
            "resource_allocation",
            "recovery_planning",
            "business_continuity",
            "stakeholder_notification",
            "post_crisis_analysis"
        ]
        
        # Protocolos de crisis por tipo
        self.crisis_protocols = {
            CrisisType.NATURAL_DISASTER: {
                "priority": 1,
                "initial_actions": [
                    "Verificar seguridad del personal y clientes",
                    "Activar sistema de comunicación de emergencia",
                    "Evaluar daños a infraestructura",
                    "Coordinar con autoridades locales"
                ],
                "resources": ["Emergency supplies", "Medical team", "Evacuation transport"]
            },
            CrisisType.PANDEMIC: {
                "priority": 1,
                "initial_actions": [
                    "Implementar protocolos sanitarios",
                    "Informar a clientes sobre medidas",
                    "Coordinar con autoridades sanitarias",
                    "Ajustar políticas de cancelación"
                ],
                "resources": ["Medical supplies", "Testing kits", "Quarantine facilities"]
            },
            CrisisType.CYBER_ATTACK: {
                "priority": 2,
                "initial_actions": [
                    "Aislar sistemas afectados",
                    "Activar respaldo de datos",
                    "Notificar equipo de seguridad",
                    "Informar a clientes afectados"
                ],
                "resources": ["IT security team", "Backup systems", "Communication channels"]
            }
        }
        
        # Base de contactos de emergencia
        self.emergency_contacts = [
            EmergencyContact(
                name="Crisis Command Center",
                role="Primary Response",
                phone="+1-800-CRISIS1",
                email="crisis@spirittours.com",
                available_24_7=True,
                languages=["English", "Spanish", "French"],
                specialization="General Crisis Management",
                priority=1
            ),
            EmergencyContact(
                name="Medical Emergency Team",
                role="Health Crisis",
                phone="+1-800-MEDICAL",
                email="medical@spirittours.com",
                available_24_7=True,
                languages=["English", "Spanish"],
                specialization="Medical Emergencies",
                priority=1
            )
        ]
        
        # Umbrales de alerta
        self.alert_thresholds = {
            "booking_cancellation_rate": 0.30,  # 30% cancellations
            "negative_sentiment_rate": 0.40,    # 40% negative feedback
            "system_downtime_hours": 2,         # 2 hours downtime
            "customer_complaints_per_hour": 10, # 10 complaints/hour
            "staff_absence_rate": 0.25          # 25% staff absence
        }
        
        self.active_crises = {}
        self.response_history = []
        self.metrics = {
            "crises_managed": 0,
            "average_response_time_minutes": 0,
            "successful_resolutions": 0,
            "evacuations_coordinated": 0,
            "alerts_sent": 0
        }
    
    async def detect_crisis(
        self,
        monitoring_data: Dict[str, Any]
    ) -> Optional[CrisisEvent]:
        """
        Detecta posibles crisis basándose en datos de monitoreo
        """
        try:
            crisis_indicators = []
            
            # Verificar indicadores de crisis
            for metric, value in monitoring_data.items():
                if metric in self.alert_thresholds:
                    if value > self.alert_thresholds[metric]:
                        crisis_indicators.append({
                            "metric": metric,
                            "value": value,
                            "threshold": self.alert_thresholds[metric],
                            "severity": (value / self.alert_thresholds[metric]) - 1
                        })
            
            if not crisis_indicators:
                return None
            
            # Determinar tipo y nivel de crisis
            crisis_type = self._determine_crisis_type(crisis_indicators, monitoring_data)
            crisis_level = self._determine_crisis_level(crisis_indicators)
            
            # Crear evento de crisis
            crisis = CrisisEvent(
                event_id=self._generate_crisis_id(),
                type=crisis_type,
                level=crisis_level,
                location=monitoring_data.get("location", {"global": True}),
                start_time=datetime.now(),
                affected_areas=monitoring_data.get("affected_areas", []),
                affected_services=monitoring_data.get("affected_services", []),
                estimated_impact={
                    "customers_affected": monitoring_data.get("customers_affected", 0),
                    "revenue_impact": monitoring_data.get("revenue_impact", 0),
                    "reputation_risk": monitoring_data.get("reputation_risk", "medium")
                },
                response_status=ResponsePhase.DETECTION
            )
            
            # Registrar crisis activa
            self.active_crises[crisis.event_id] = crisis
            self.metrics["crises_managed"] += 1
            
            # Iniciar respuesta automática
            await self._initiate_automatic_response(crisis)
            
            return crisis
            
        except Exception as e:
            logger.error(f"Error detecting crisis: {e}")
            return None
    
    async def assess_crisis_impact(
        self,
        crisis: CrisisEvent
    ) -> Dict[str, Any]:
        """
        Evalúa el impacto completo de una crisis
        """
        try:
            impact_assessment = {
                "crisis_id": crisis.event_id,
                "timestamp": datetime.now().isoformat(),
                "immediate_impact": {},
                "projected_impact": {},
                "risk_factors": [],
                "mitigation_priority": [],
                "resource_requirements": {}
            }
            
            # Impacto inmediato
            impact_assessment["immediate_impact"] = {
                "safety_risk": self._assess_safety_risk(crisis),
                "operational_disruption": self._assess_operational_impact(crisis),
                "financial_loss": crisis.estimated_impact.get("revenue_impact", 0),
                "customer_impact": crisis.estimated_impact.get("customers_affected", 0),
                "reputation_damage": crisis.estimated_impact.get("reputation_risk", "medium")
            }
            
            # Impacto proyectado (próximas 24-72 horas)
            impact_assessment["projected_impact"] = {
                "24_hours": {
                    "affected_bookings": crisis.estimated_impact.get("customers_affected", 0) * 1.5,
                    "revenue_loss": crisis.estimated_impact.get("revenue_impact", 0) * 1.2,
                    "service_degradation": "moderate"
                },
                "72_hours": {
                    "affected_bookings": crisis.estimated_impact.get("customers_affected", 0) * 2,
                    "revenue_loss": crisis.estimated_impact.get("revenue_impact", 0) * 1.8,
                    "service_degradation": "significant" if crisis.level.value in ["high", "critical"] else "moderate"
                }
            }
            
            # Factores de riesgo
            impact_assessment["risk_factors"] = self._identify_risk_factors(crisis)
            
            # Prioridades de mitigación
            impact_assessment["mitigation_priority"] = self._prioritize_mitigation_actions(crisis)
            
            # Requisitos de recursos
            protocol = self.crisis_protocols.get(crisis.type, {})
            impact_assessment["resource_requirements"] = {
                "personnel": self._calculate_personnel_needs(crisis),
                "equipment": protocol.get("resources", []),
                "budget": self._estimate_crisis_budget(crisis),
                "external_support": self._identify_external_support_needs(crisis)
            }
            
            crisis.response_status = ResponsePhase.ASSESSMENT
            
            return impact_assessment
            
        except Exception as e:
            logger.error(f"Error assessing crisis impact: {e}")
            return {}
    
    async def generate_response_plan(
        self,
        crisis: CrisisEvent,
        constraints: Optional[Dict[str, Any]] = None
    ) -> CrisisResponse:
        """
        Genera un plan de respuesta a crisis
        """
        try:
            protocol = self.crisis_protocols.get(crisis.type, {})
            
            # Generar acciones basadas en protocolo y nivel de crisis
            actions = self._generate_response_actions(crisis, protocol)
            
            # Definir timeline
            timeline = self._generate_response_timeline(crisis, actions)
            
            # Asignar equipos responsables
            teams = self._assign_response_teams(crisis, actions)
            
            # Crear plan de comunicación
            communication = self._create_communication_plan(crisis)
            
            # Definir criterios de éxito
            success_criteria = self._define_success_criteria(crisis)
            
            response = CrisisResponse(
                response_id=f"RESP-{crisis.event_id}",
                crisis_event_id=crisis.event_id,
                response_type=f"{crisis.type.value}_response",
                actions=actions,
                resources_needed=protocol.get("resources", []),
                timeline=timeline,
                responsible_teams=teams,
                communication_plan=communication,
                success_criteria=success_criteria
            )
            
            # Aplicar restricciones si existen
            if constraints:
                response = self._apply_constraints(response, constraints)
            
            crisis.response_status = ResponsePhase.RESPONSE
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating response plan: {e}")
            raise
    
    async def coordinate_evacuation(
        self,
        location: Dict[str, Any],
        affected_people: int
    ) -> Dict[str, Any]:
        """
        Coordina planes de evacuación
        """
        try:
            evacuation_plan = {
                "plan_id": f"EVAC-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "location": location,
                "affected_people": affected_people,
                "status": "initiated",
                "phases": [],
                "transport_arrangements": [],
                "assembly_points": [],
                "timeline": {},
                "resources": {}
            }
            
            # Fase 1: Notificación
            evacuation_plan["phases"].append({
                "phase": 1,
                "name": "Notification",
                "duration_minutes": 15,
                "actions": [
                    "Activar alarmas de evacuación",
                    "Enviar notificaciones móviles",
                    "Anunciar por altavoces",
                    "Contactar líderes de grupo"
                ]
            })
            
            # Fase 2: Reunión en puntos seguros
            evacuation_plan["phases"].append({
                "phase": 2,
                "name": "Assembly",
                "duration_minutes": 30,
                "actions": [
                    "Dirigir a puntos de reunión",
                    "Realizar conteo de personas",
                    "Verificar necesidades especiales",
                    "Preparar transporte"
                ]
            })
            
            # Fase 3: Transporte
            transport_needed = self._calculate_transport_needs(affected_people)
            evacuation_plan["transport_arrangements"] = transport_needed
            evacuation_plan["phases"].append({
                "phase": 3,
                "name": "Transportation",
                "duration_minutes": 60,
                "actions": [
                    "Cargar pasajeros en orden de prioridad",
                    "Verificar manifiestos",
                    "Comunicar destinos",
                    "Iniciar movimiento"
                ]
            })
            
            # Fase 4: Reubicación
            evacuation_plan["phases"].append({
                "phase": 4,
                "name": "Relocation",
                "duration_minutes": 45,
                "actions": [
                    "Llegada a zona segura",
                    "Registro en nuevo location",
                    "Asignación de alojamiento temporal",
                    "Provisión de necesidades básicas"
                ]
            })
            
            # Puntos de reunión
            evacuation_plan["assembly_points"] = [
                {
                    "id": "AP1",
                    "name": "Main Lobby",
                    "capacity": 200,
                    "coordinates": location.get("coordinates", {}),
                    "facilities": ["First aid", "Water", "Communications"]
                },
                {
                    "id": "AP2",
                    "name": "Parking Area A",
                    "capacity": 500,
                    "coordinates": location.get("coordinates", {}),
                    "facilities": ["Open space", "Vehicle access"]
                }
            ]
            
            # Timeline total
            total_duration = sum(phase["duration_minutes"] for phase in evacuation_plan["phases"])
            evacuation_plan["timeline"] = {
                "start": datetime.now().isoformat(),
                "estimated_completion": (datetime.now() + timedelta(minutes=total_duration)).isoformat(),
                "total_duration_minutes": total_duration
            }
            
            # Recursos necesarios
            evacuation_plan["resources"] = {
                "personnel": {
                    "coordinators": max(2, affected_people // 100),
                    "medical_staff": max(2, affected_people // 50),
                    "security": max(4, affected_people // 25),
                    "support_staff": max(5, affected_people // 20)
                },
                "vehicles": transport_needed,
                "supplies": {
                    "water_bottles": affected_people * 2,
                    "first_aid_kits": max(5, affected_people // 20),
                    "blankets": affected_people,
                    "food_packages": affected_people
                }
            }
            
            self.metrics["evacuations_coordinated"] += 1
            
            return evacuation_plan
            
        except Exception as e:
            logger.error(f"Error coordinating evacuation: {e}")
            return {"error": str(e)}
    
    async def manage_communication(
        self,
        crisis: CrisisEvent,
        stakeholders: List[str]
    ) -> Dict[str, Any]:
        """
        Gestiona la comunicación durante una crisis
        """
        try:
            communication_strategy = {
                "crisis_id": crisis.event_id,
                "timestamp": datetime.now().isoformat(),
                "messages": {},
                "channels": [],
                "frequency": {},
                "responsible": {},
                "templates": {}
            }
            
            # Definir mensajes por stakeholder
            for stakeholder in stakeholders:
                if stakeholder == "customers":
                    communication_strategy["messages"]["customers"] = {
                        "initial": self._generate_customer_message(crisis, "initial"),
                        "update": self._generate_customer_message(crisis, "update"),
                        "resolution": self._generate_customer_message(crisis, "resolution")
                    }
                    communication_strategy["channels"].append(["email", "sms", "app_notification"])
                    communication_strategy["frequency"]["customers"] = "Every 2 hours"
                    
                elif stakeholder == "staff":
                    communication_strategy["messages"]["staff"] = {
                        "alert": self._generate_staff_message(crisis, "alert"),
                        "instructions": self._generate_staff_message(crisis, "instructions"),
                        "updates": self._generate_staff_message(crisis, "updates")
                    }
                    communication_strategy["channels"].append(["internal_system", "email", "teams"])
                    communication_strategy["frequency"]["staff"] = "Every hour"
                    
                elif stakeholder == "media":
                    communication_strategy["messages"]["media"] = {
                        "press_release": self._generate_media_statement(crisis),
                        "fact_sheet": self._generate_fact_sheet(crisis),
                        "q_and_a": self._generate_qa_document(crisis)
                    }
                    communication_strategy["channels"].append(["press_release", "website", "social_media"])
                    communication_strategy["frequency"]["media"] = "As needed"
                    
                elif stakeholder == "authorities":
                    communication_strategy["messages"]["authorities"] = {
                        "official_report": self._generate_official_report(crisis),
                        "compliance_status": self._generate_compliance_status(crisis),
                        "cooperation_plan": self._generate_cooperation_plan(crisis)
                    }
                    communication_strategy["channels"].append(["official_channels", "email", "phone"])
                    communication_strategy["frequency"]["authorities"] = "Immediate and ongoing"
            
            # Asignar responsables
            communication_strategy["responsible"] = {
                "customers": "Customer Service Manager",
                "staff": "HR Director",
                "media": "PR Manager",
                "authorities": "Compliance Officer"
            }
            
            # Plantillas de comunicación
            communication_strategy["templates"] = {
                "email": self._get_email_template(crisis),
                "sms": self._get_sms_template(crisis),
                "social_media": self._get_social_media_template(crisis)
            }
            
            self.metrics["alerts_sent"] += len(stakeholders) * 3  # Estimación
            
            return communication_strategy
            
        except Exception as e:
            logger.error(f"Error managing communication: {e}")
            return {}
    
    async def implement_business_continuity(
        self,
        crisis: CrisisEvent,
        affected_operations: List[str]
    ) -> Dict[str, Any]:
        """
        Implementa plan de continuidad del negocio
        """
        try:
            continuity_plan = {
                "plan_id": f"BCP-{crisis.event_id}",
                "activation_time": datetime.now().isoformat(),
                "affected_operations": affected_operations,
                "alternate_arrangements": {},
                "resource_reallocation": {},
                "priority_services": [],
                "recovery_targets": {}
            }
            
            # Definir arreglos alternativos por operación
            for operation in affected_operations:
                if operation == "booking_system":
                    continuity_plan["alternate_arrangements"]["booking_system"] = {
                        "primary": "Switch to backup servers",
                        "secondary": "Manual booking process",
                        "tertiary": "Partner system integration",
                        "estimated_capacity": "70% of normal"
                    }
                elif operation == "customer_service":
                    continuity_plan["alternate_arrangements"]["customer_service"] = {
                        "primary": "Remote work activation",
                        "secondary": "Outsourced call center",
                        "tertiary": "AI chatbot escalation",
                        "estimated_capacity": "85% of normal"
                    }
                elif operation == "payment_processing":
                    continuity_plan["alternate_arrangements"]["payment_processing"] = {
                        "primary": "Secondary payment gateway",
                        "secondary": "Manual processing",
                        "tertiary": "Delayed billing",
                        "estimated_capacity": "60% of normal"
                    }
            
            # Reasignación de recursos
            continuity_plan["resource_reallocation"] = {
                "personnel": self._reallocate_personnel(crisis, affected_operations),
                "technology": self._reallocate_technology(crisis, affected_operations),
                "budget": self._reallocate_budget(crisis, affected_operations)
            }
            
            # Servicios prioritarios
            continuity_plan["priority_services"] = [
                {"service": "Emergency assistance", "priority": 1},
                {"service": "Booking modifications", "priority": 2},
                {"service": "Refund processing", "priority": 3},
                {"service": "New bookings", "priority": 4}
            ]
            
            # Objetivos de recuperación
            continuity_plan["recovery_targets"] = {
                "RTO": "4 hours",  # Recovery Time Objective
                "RPO": "1 hour",   # Recovery Point Objective
                "service_level": "80% within 24 hours",
                "full_recovery": "72 hours"
            }
            
            return continuity_plan
            
        except Exception as e:
            logger.error(f"Error implementing business continuity: {e}")
            return {}
    
    async def conduct_post_crisis_analysis(
        self,
        crisis_id: str
    ) -> Dict[str, Any]:
        """
        Realiza análisis post-crisis
        """
        try:
            crisis = self.active_crises.get(crisis_id)
            if not crisis:
                return {"error": "Crisis not found"}
            
            analysis = {
                "crisis_id": crisis_id,
                "analysis_date": datetime.now().isoformat(),
                "crisis_summary": {},
                "response_effectiveness": {},
                "lessons_learned": [],
                "improvements_needed": [],
                "success_factors": [],
                "recommendations": []
            }
            
            # Resumen de la crisis
            analysis["crisis_summary"] = {
                "type": crisis.type.value,
                "level": crisis.level.value,
                "duration_hours": crisis.duration_hours(),
                "impact_score": crisis.impact_score(),
                "affected_customers": crisis.estimated_impact.get("customers_affected", 0),
                "financial_impact": crisis.estimated_impact.get("revenue_impact", 0)
            }
            
            # Efectividad de la respuesta
            analysis["response_effectiveness"] = {
                "response_time_minutes": self._calculate_response_time(crisis),
                "resolution_time_hours": crisis.duration_hours(),
                "objectives_met": self._evaluate_objectives(crisis),
                "resource_utilization": self._evaluate_resource_use(crisis),
                "communication_effectiveness": self._evaluate_communication(crisis),
                "overall_score": self._calculate_overall_effectiveness(crisis)
            }
            
            # Lecciones aprendidas
            analysis["lessons_learned"] = [
                "Response time can be improved with better monitoring",
                "Communication channels need redundancy",
                "Staff training on crisis protocols needs updating",
                "Resource allocation process requires optimization"
            ]
            
            # Mejoras necesarias
            analysis["improvements_needed"] = [
                {
                    "area": "Detection",
                    "current_state": "Manual monitoring",
                    "improvement": "Automated alert system",
                    "priority": "high"
                },
                {
                    "area": "Communication",
                    "current_state": "Sequential notifications",
                    "improvement": "Parallel multi-channel alerts",
                    "priority": "medium"
                }
            ]
            
            # Factores de éxito
            analysis["success_factors"] = [
                "Quick team mobilization",
                "Effective stakeholder communication",
                "Adequate resource availability",
                "Clear command structure"
            ]
            
            # Recomendaciones
            analysis["recommendations"] = self._generate_recommendations(crisis, analysis)
            
            # Marcar crisis como analizada
            crisis.response_status = ResponsePhase.LEARNING
            
            # Actualizar métricas
            if analysis["response_effectiveness"]["overall_score"] > 0.7:
                self.metrics["successful_resolutions"] += 1
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error conducting post-crisis analysis: {e}")
            return {"error": str(e)}
    
    # Métodos privados de apoyo
    
    def _generate_crisis_id(self) -> str:
        """Genera ID único para crisis"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        return f"CRISIS-{timestamp}"
    
    def _determine_crisis_type(
        self,
        indicators: List[Dict],
        data: Dict[str, Any]
    ) -> CrisisType:
        """Determina el tipo de crisis basado en indicadores"""
        # Lógica simplificada de detección
        if any("system" in i["metric"] for i in indicators):
            return CrisisType.CYBER_ATTACK
        if any("weather" in str(data.get("context", "")).lower() for i in indicators):
            return CrisisType.WEATHER_EXTREME
        if any("cancel" in i["metric"] for i in indicators):
            return CrisisType.TRANSPORTATION_DISRUPTION
        return CrisisType.INFRASTRUCTURE_FAILURE
    
    def _determine_crisis_level(self, indicators: List[Dict]) -> CrisisLevel:
        """Determina el nivel de crisis"""
        max_severity = max(i["severity"] for i in indicators)
        
        if max_severity > 2.0:
            return CrisisLevel.CRITICAL
        elif max_severity > 1.5:
            return CrisisLevel.HIGH
        elif max_severity > 1.0:
            return CrisisLevel.MODERATE
        elif max_severity > 0.5:
            return CrisisLevel.LOW
        return CrisisLevel.MINIMAL
    
    async def _initiate_automatic_response(self, crisis: CrisisEvent):
        """Inicia respuesta automática a crisis"""
        try:
            # Notificar contactos de emergencia
            for contact in self.emergency_contacts:
                if contact.priority == 1:
                    # Simular notificación
                    logger.info(f"Notifying {contact.name} about {crisis.event_id}")
            
            # Registrar acción
            crisis.actions_taken.append({
                "timestamp": datetime.now().isoformat(),
                "action": "Emergency contacts notified",
                "automated": True
            })
            
            # Actualizar métricas
            response_time = (datetime.now() - crisis.start_time).total_seconds() / 60
            self.metrics["average_response_time_minutes"] = (
                (self.metrics["average_response_time_minutes"] + response_time) / 2
            )
            
        except Exception as e:
            logger.error(f"Error initiating automatic response: {e}")
    
    def _assess_safety_risk(self, crisis: CrisisEvent) -> str:
        """Evalúa el riesgo de seguridad"""
        if crisis.type in [CrisisType.NATURAL_DISASTER, CrisisType.TERRORISM]:
            return "high"
        elif crisis.type in [CrisisType.PANDEMIC, CrisisType.WEATHER_EXTREME]:
            return "medium"
        return "low"
    
    def _assess_operational_impact(self, crisis: CrisisEvent) -> str:
        """Evalúa el impacto operacional"""
        if len(crisis.affected_services) > 3:
            return "severe"
        elif len(crisis.affected_services) > 1:
            return "moderate"
        return "minimal"
    
    def _identify_risk_factors(self, crisis: CrisisEvent) -> List[str]:
        """Identifica factores de riesgo"""
        factors = []
        if crisis.level in [CrisisLevel.HIGH, CrisisLevel.CRITICAL]:
            factors.append("High severity level")
        if len(crisis.affected_areas) > 5:
            factors.append("Wide geographical impact")
        if crisis.estimated_impact.get("customers_affected", 0) > 100:
            factors.append("Large number of affected customers")
        return factors
    
    def _prioritize_mitigation_actions(self, crisis: CrisisEvent) -> List[Dict]:
        """Prioriza acciones de mitigación"""
        actions = []
        
        if crisis.type == CrisisType.NATURAL_DISASTER:
            actions = [
                {"action": "Ensure safety of all personnel and customers", "priority": 1},
                {"action": "Secure critical infrastructure", "priority": 2},
                {"action": "Establish emergency communications", "priority": 3}
            ]
        elif crisis.type == CrisisType.CYBER_ATTACK:
            actions = [
                {"action": "Isolate affected systems", "priority": 1},
                {"action": "Activate backup systems", "priority": 2},
                {"action": "Notify security team", "priority": 3}
            ]
        
        return sorted(actions, key=lambda x: x["priority"])
    
    def _calculate_personnel_needs(self, crisis: CrisisEvent) -> int:
        """Calcula necesidades de personal"""
        base_staff = 5
        severity_multiplier = {
            CrisisLevel.MINIMAL: 1,
            CrisisLevel.LOW: 1.5,
            CrisisLevel.MODERATE: 2,
            CrisisLevel.HIGH: 3,
            CrisisLevel.CRITICAL: 5
        }
        return int(base_staff * severity_multiplier.get(crisis.level, 2))
    
    def _estimate_crisis_budget(self, crisis: CrisisEvent) -> float:
        """Estima presupuesto para crisis"""
        base_budget = 10000
        level_multiplier = {
            CrisisLevel.MINIMAL: 0.5,
            CrisisLevel.LOW: 1,
            CrisisLevel.MODERATE: 2,
            CrisisLevel.HIGH: 5,
            CrisisLevel.CRITICAL: 10
        }
        return base_budget * level_multiplier.get(crisis.level, 2)
    
    def _identify_external_support_needs(self, crisis: CrisisEvent) -> List[str]:
        """Identifica necesidades de apoyo externo"""
        support = []
        if crisis.type == CrisisType.NATURAL_DISASTER:
            support.extend(["Emergency services", "Red Cross", "Local authorities"])
        elif crisis.type == CrisisType.CYBER_ATTACK:
            support.extend(["Cybersecurity firm", "Law enforcement", "Legal counsel"])
        return support
    
    def _generate_response_actions(
        self,
        crisis: CrisisEvent,
        protocol: Dict
    ) -> List[Dict[str, Any]]:
        """Genera acciones de respuesta"""
        actions = []
        
        # Acciones iniciales del protocolo
        for i, action in enumerate(protocol.get("initial_actions", []), 1):
            actions.append({
                "id": f"ACTION-{i}",
                "description": action,
                "priority": "immediate",
                "assigned_to": "Crisis Team",
                "status": "pending",
                "deadline": (datetime.now() + timedelta(minutes=15*i)).isoformat()
            })
        
        return actions
    
    def _generate_response_timeline(
        self,
        crisis: CrisisEvent,
        actions: List[Dict]
    ) -> Dict[str, Any]:
        """Genera timeline de respuesta"""
        return {
            "immediate": "0-1 hours",
            "short_term": "1-6 hours",
            "medium_term": "6-24 hours",
            "long_term": "24+ hours",
            "milestones": [
                {"time": "1 hour", "goal": "Initial response complete"},
                {"time": "6 hours", "goal": "Situation stabilized"},
                {"time": "24 hours", "goal": "Normal operations resuming"}
            ]
        }
    
    def _assign_response_teams(
        self,
        crisis: CrisisEvent,
        actions: List[Dict]
    ) -> List[str]:
        """Asigna equipos de respuesta"""
        teams = ["Crisis Management Team"]
        
        if crisis.type == CrisisType.CYBER_ATTACK:
            teams.extend(["IT Security", "Legal", "Communications"])
        elif crisis.type == CrisisType.NATURAL_DISASTER:
            teams.extend(["Safety Team", "Operations", "Customer Service"])
        
        return teams
    
    def _create_communication_plan(self, crisis: CrisisEvent) -> Dict[str, Any]:
        """Crea plan de comunicación"""
        return {
            "internal": {
                "channels": ["Email", "Intranet", "Teams"],
                "frequency": "Every 2 hours",
                "responsible": "HR Director"
            },
            "external": {
                "channels": ["Website", "Social Media", "Press Release"],
                "frequency": "As needed",
                "responsible": "PR Manager"
            },
            "stakeholders": {
                "customers": "Immediate and ongoing",
                "partners": "Within 2 hours",
                "authorities": "Immediate"
            }
        }
    
    def _define_success_criteria(self, crisis: CrisisEvent) -> List[str]:
        """Define criterios de éxito"""
        return [
            "All personnel and customers safe",
            "Critical services restored",
            "Communication channels operational",
            f"Crisis resolved within {24 if crisis.level.value in ['low', 'moderate'] else 72} hours",
            "No secondary incidents"
        ]
    
    def _apply_constraints(
        self,
        response: CrisisResponse,
        constraints: Dict
    ) -> CrisisResponse:
        """Aplica restricciones al plan de respuesta"""
        # Aplicar límites de presupuesto, personal, etc.
        if "budget" in constraints:
            # Ajustar recursos según presupuesto
            pass
        if "personnel" in constraints:
            # Limitar asignaciones de personal
            pass
        return response
    
    def _calculate_transport_needs(self, people: int) -> List[Dict]:
        """Calcula necesidades de transporte"""
        buses_needed = people // 50 + (1 if people % 50 else 0)
        return [
            {"type": "bus", "quantity": buses_needed, "capacity": 50},
            {"type": "ambulance", "quantity": max(1, people // 100), "capacity": 2},
            {"type": "support_vehicle", "quantity": 2, "capacity": 5}
        ]
    
    def _generate_customer_message(self, crisis: CrisisEvent, stage: str) -> str:
        """Genera mensaje para clientes"""
        if stage == "initial":
            return f"We are aware of the situation affecting our services. Your safety is our priority."
        elif stage == "update":
            return f"We are working to resolve the issue. Affected services: {', '.join(crisis.affected_services)}"
        return "Services are being restored. Thank you for your patience."
    
    def _generate_staff_message(self, crisis: CrisisEvent, stage: str) -> str:
        """Genera mensaje para personal"""
        if stage == "alert":
            return f"Crisis Alert: {crisis.type.value}. All hands to crisis stations."
        elif stage == "instructions":
            return "Follow crisis protocol. Report to team leaders for assignments."
        return "Situation update: Continue with assigned crisis response tasks."
    
    def _generate_media_statement(self, crisis: CrisisEvent) -> str:
        """Genera declaración para medios"""
        return f"Spirit Tours is managing a {crisis.level.value} level incident. Customer safety is our top priority."
    
    def _generate_fact_sheet(self, crisis: CrisisEvent) -> Dict:
        """Genera hoja de hechos"""
        return {
            "incident_type": crisis.type.value,
            "affected_areas": crisis.affected_areas,
            "customers_affected": crisis.estimated_impact.get("customers_affected", 0),
            "response_status": crisis.response_status.value
        }
    
    def _generate_qa_document(self, crisis: CrisisEvent) -> List[Dict]:
        """Genera documento de preguntas y respuestas"""
        return [
            {"q": "What happened?", "a": f"A {crisis.type.value} incident occurred"},
            {"q": "Is anyone hurt?", "a": "All personnel and customers are safe"},
            {"q": "When will services resume?", "a": "We are working to restore services as soon as possible"}
        ]
    
    def _generate_official_report(self, crisis: CrisisEvent) -> Dict:
        """Genera reporte oficial"""
        return {
            "incident_id": crisis.event_id,
            "type": crisis.type.value,
            "level": crisis.level.value,
            "start_time": crisis.start_time.isoformat(),
            "affected_services": crisis.affected_services,
            "response_measures": [action["description"] for action in crisis.actions_taken]
        }
    
    def _generate_compliance_status(self, crisis: CrisisEvent) -> Dict:
        """Genera estado de cumplimiento"""
        return {
            "regulatory_notifications": "Complete",
            "safety_protocols": "Activated",
            "reporting_requirements": "In progress"
        }
    
    def _generate_cooperation_plan(self, crisis: CrisisEvent) -> Dict:
        """Genera plan de cooperación"""
        return {
            "information_sharing": "Full transparency",
            "resource_coordination": "Available as needed",
            "joint_response": "Ready to coordinate"
        }
    
    def _get_email_template(self, crisis: CrisisEvent) -> str:
        """Obtiene plantilla de email"""
        return f"""
        Subject: Important Update - {crisis.type.value}
        
        Dear [Name],
        
        We are writing to inform you about a situation affecting our services.
        
        [Details]
        
        Your safety and satisfaction remain our top priorities.
        
        Sincerely,
        Spirit Tours Crisis Management Team
        """
    
    def _get_sms_template(self, crisis: CrisisEvent) -> str:
        """Obtiene plantilla de SMS"""
        return f"Spirit Tours Alert: {crisis.type.value} affecting services. Check email for details. Support: +1-800-HELP"
    
    def _get_social_media_template(self, crisis: CrisisEvent) -> str:
        """Obtiene plantilla de redes sociales"""
        return f"UPDATE: We are managing a situation affecting some services. Customer safety is our priority. More info: [link]"
    
    def _reallocate_personnel(
        self,
        crisis: CrisisEvent,
        affected_ops: List[str]
    ) -> Dict:
        """Reasigna personal"""
        return {
            "from_departments": ["Marketing", "Admin"],
            "to_departments": ["Customer Service", "Operations"],
            "number": 20,
            "duration": "Until crisis resolved"
        }
    
    def _reallocate_technology(
        self,
        crisis: CrisisEvent,
        affected_ops: List[str]
    ) -> Dict:
        """Reasigna recursos tecnológicos"""
        return {
            "backup_servers": "Activated",
            "cloud_resources": "Scaled up",
            "bandwidth": "Prioritized for critical services"
        }
    
    def _reallocate_budget(
        self,
        crisis: CrisisEvent,
        affected_ops: List[str]
    ) -> Dict:
        """Reasigna presupuesto"""
        return {
            "emergency_fund": self._estimate_crisis_budget(crisis),
            "reallocated_from": ["Marketing", "Expansion projects"],
            "approval": "CFO authorized"
        }
    
    def _calculate_response_time(self, crisis: CrisisEvent) -> float:
        """Calcula tiempo de respuesta"""
        if crisis.actions_taken:
            first_action = datetime.fromisoformat(crisis.actions_taken[0]["timestamp"])
            return (first_action - crisis.start_time).total_seconds() / 60
        return 0
    
    def _evaluate_objectives(self, crisis: CrisisEvent) -> float:
        """Evalúa cumplimiento de objetivos"""
        # Simulación de evaluación
        return 0.85
    
    def _evaluate_resource_use(self, crisis: CrisisEvent) -> float:
        """Evalúa uso de recursos"""
        return 0.75
    
    def _evaluate_communication(self, crisis: CrisisEvent) -> float:
        """Evalúa efectividad de comunicación"""
        return 0.90
    
    def _calculate_overall_effectiveness(self, crisis: CrisisEvent) -> float:
        """Calcula efectividad general"""
        objectives = self._evaluate_objectives(crisis)
        resources = self._evaluate_resource_use(crisis)
        communication = self._evaluate_communication(crisis)
        
        return round((objectives * 0.4 + resources * 0.3 + communication * 0.3), 2)
    
    def _generate_recommendations(
        self,
        crisis: CrisisEvent,
        analysis: Dict
    ) -> List[str]:
        """Genera recomendaciones basadas en análisis"""
        recommendations = []
        
        if analysis["response_effectiveness"]["response_time_minutes"] > 15:
            recommendations.append("Implement automated crisis detection system")
        
        if analysis["response_effectiveness"]["overall_score"] < 0.8:
            recommendations.append("Conduct crisis response training for all staff")
        
        recommendations.append("Update crisis response protocols based on lessons learned")
        recommendations.append("Establish redundant communication channels")
        
        return recommendations
    
    def get_metrics(self) -> Dict[str, Any]:
        """Obtiene métricas del agente"""
        return {
            "agent_id": self.agent_id,
            "version": self.version,
            "metrics": self.metrics,
            "active_crises": len(self.active_crises),
            "capabilities": self.capabilities
        }

# Funciones principales para uso del agente
async def main():
    """Función principal para pruebas"""
    agent = CrisisManagementAgent()
    
    # Ejemplo de detección de crisis
    monitoring_data = {
        "booking_cancellation_rate": 0.45,
        "negative_sentiment_rate": 0.35,
        "customers_affected": 250,
        "revenue_impact": 50000,
        "affected_areas": ["Europe", "Asia"],
        "affected_services": ["Flights", "Hotels"],
        "location": {"region": "Global"}
    }
    
    crisis = await agent.detect_crisis(monitoring_data)
    if crisis:
        print(f"Crisis detectada: {crisis.event_id}")
        print(f"Tipo: {crisis.type.value}")
        print(f"Nivel: {crisis.level.value}")
        print(f"Score de impacto: {crisis.impact_score()}")
        
        # Evaluar impacto
        impact = await agent.assess_crisis_impact(crisis)
        print(f"\nImpacto inmediato: {impact['immediate_impact']}")
        
        # Generar plan de respuesta
        response = await agent.generate_response_plan(crisis)
        print(f"\nPlan de respuesta: {response.response_id}")
        print(f"Preparación: {response.readiness_score()}")

if __name__ == "__main__":
    asyncio.run(main())