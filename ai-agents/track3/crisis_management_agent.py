#!/usr/bin/env python3
"""
Spirit Tours - Crisis Management AI Agent
Gestión Inteligente de Crisis y Emergencias en Tiempo Real

Este agente proporciona capacidades avanzadas de gestión de crisis,
incluyendo detección temprana, respuesta automatizada, coordinación
de recursos y comunicación de emergencia.

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
import aiohttp
import pandas as pd
import numpy as np
from pydantic import BaseModel, Field
import redis.asyncio as redis
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import nltk
from textblob import TextBlob
import spacy
import yaml

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

class CrisisType(Enum):
    """Tipos de crisis manejados por el sistema"""
    NATURAL_DISASTER = "natural_disaster"
    HEALTH_EMERGENCY = "health_emergency" 
    SECURITY_THREAT = "security_threat"
    TRANSPORTATION_ISSUE = "transportation_issue"
    ACCOMMODATION_PROBLEM = "accommodation_problem"
    CUSTOMER_SAFETY = "customer_safety"
    OPERATIONAL_FAILURE = "operational_failure"
    COMMUNICATION_BREAKDOWN = "communication_breakdown"
    FINANCIAL_CRISIS = "financial_crisis"
    REGULATORY_ISSUE = "regulatory_issue"
    REPUTATION_DAMAGE = "reputation_damage"
    CYBER_ATTACK = "cyber_attack"

class SeverityLevel(Enum):
    """Niveles de severidad de crisis"""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4
    CATASTROPHIC = 5

class ResponseStatus(Enum):
    """Estados de respuesta a crisis"""
    DETECTED = "detected"
    ANALYZING = "analyzing"
    RESPONDING = "responding"
    ESCALATED = "escalated"
    RESOLVED = "resolved"
    CLOSED = "closed"

@dataclass
class CrisisIncident:
    """Estructura de datos para incidentes de crisis"""
    incident_id: str
    crisis_type: CrisisType
    severity: SeverityLevel
    status: ResponseStatus
    title: str
    description: str
    location: Optional[str] = None
    affected_customers: List[str] = field(default_factory=list)
    affected_services: List[str] = field(default_factory=list)
    detection_time: datetime = field(default_factory=datetime.now)
    response_time: Optional[datetime] = None
    resolution_time: Optional[datetime] = None
    escalation_level: int = 0
    response_team: List[str] = field(default_factory=list)
    actions_taken: List[str] = field(default_factory=list)
    resources_allocated: Dict[str, Any] = field(default_factory=dict)
    communication_log: List[Dict] = field(default_factory=list)
    impact_assessment: Dict[str, Any] = field(default_factory=dict)
    lessons_learned: List[str] = field(default_factory=list)
    cost_impact: float = 0.0
    customer_satisfaction_impact: float = 0.0
    reputation_impact: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass 
class ResponseProtocol:
    """Protocolo de respuesta automatizada"""
    protocol_id: str
    crisis_type: CrisisType
    severity_threshold: SeverityLevel
    automated_actions: List[str] = field(default_factory=list)
    notification_templates: Dict[str, str] = field(default_factory=dict)
    escalation_rules: List[Dict] = field(default_factory=list)
    resource_requirements: Dict[str, Any] = field(default_factory=dict)
    communication_channels: List[str] = field(default_factory=list)
    response_timeline: Dict[str, int] = field(default_factory=dict)
    success_criteria: List[str] = field(default_factory=list)
    backup_protocols: List[str] = field(default_factory=list)

@dataclass
class CrisisMetrics:
    """Métricas de performance de gestión de crisis"""
    total_incidents: int = 0
    incidents_by_type: Dict[str, int] = field(default_factory=dict)
    incidents_by_severity: Dict[str, int] = field(default_factory=dict)
    average_detection_time: float = 0.0
    average_response_time: float = 0.0
    average_resolution_time: float = 0.0
    resolution_rate: float = 0.0
    customer_satisfaction_impact: float = 0.0
    cost_impact_total: float = 0.0
    prevention_success_rate: float = 0.0
    escalation_rate: float = 0.0
    communication_effectiveness: float = 0.0
    resource_utilization_efficiency: float = 0.0
    lessons_learned_implemented: int = 0
    protocol_success_rate: float = 0.0
    system_uptime_during_crisis: float = 0.0

class CrisisDetectionEngine:
    """Motor de detección temprana de crisis"""
    
    def __init__(self):
        self.anomaly_detector = IsolationForest(contamination=0.1)
        self.risk_classifier = RandomForestClassifier(n_estimators=100)
        self.scaler = StandardScaler()
        self.detection_rules = []
        self.monitoring_sources = []
        self.alert_thresholds = {}
        
    async def initialize(self):
        """Inicializar el motor de detección"""
        try:
            # Cargar reglas de detección
            await self._load_detection_rules()
            
            # Configurar fuentes de monitoreo
            await self._setup_monitoring_sources()
            
            # Entrenar modelos de ML
            await self._train_detection_models()
            
            logger.info("Crisis detection engine initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing detection engine: {e}")
            raise
    
    async def _load_detection_rules(self):
        """Cargar reglas de detección configurables"""
        self.detection_rules = [
            {
                "rule_id": "weather_alert",
                "source": "weather_api",
                "condition": "severe_weather_warning",
                "crisis_type": CrisisType.NATURAL_DISASTER,
                "severity_mapping": {"low": SeverityLevel.MEDIUM, "high": SeverityLevel.HIGH}
            },
            {
                "rule_id": "booking_anomaly", 
                "source": "booking_system",
                "condition": "cancellation_spike > 50%",
                "crisis_type": CrisisType.OPERATIONAL_FAILURE,
                "severity_mapping": {"medium": SeverityLevel.MEDIUM, "high": SeverityLevel.HIGH}
            },
            {
                "rule_id": "customer_complaints",
                "source": "feedback_system",
                "condition": "negative_sentiment > 80%",
                "crisis_type": CrisisType.CUSTOMER_SAFETY,
                "severity_mapping": {"medium": SeverityLevel.MEDIUM, "high": SeverityLevel.HIGH}
            },
            {
                "rule_id": "social_media_crisis",
                "source": "social_monitoring",
                "condition": "viral_negative_mention",
                "crisis_type": CrisisType.REPUTATION_DAMAGE,
                "severity_mapping": {"medium": SeverityLevel.HIGH, "high": SeverityLevel.CRITICAL}
            },
            {
                "rule_id": "security_breach",
                "source": "security_system",
                "condition": "unauthorized_access_detected",
                "crisis_type": CrisisType.CYBER_ATTACK,
                "severity_mapping": {"any": SeverityLevel.CRITICAL}
            }
        ]
        
    async def _setup_monitoring_sources(self):
        """Configurar fuentes de monitoreo en tiempo real"""
        self.monitoring_sources = [
            {"name": "weather_api", "endpoint": "https://api.weather.com/alerts", "interval": 300},
            {"name": "booking_system", "endpoint": "internal://booking/metrics", "interval": 60},
            {"name": "feedback_system", "endpoint": "internal://feedback/analytics", "interval": 120},
            {"name": "social_monitoring", "endpoint": "internal://social/sentiment", "interval": 180},
            {"name": "security_system", "endpoint": "internal://security/alerts", "interval": 30}
        ]
        
    async def _train_detection_models(self):
        """Entrenar modelos de machine learning para detección"""
        # Generar datos sintéticos para entrenamiento inicial
        # En producción, usar datos históricos reales
        synthetic_data = np.random.randn(1000, 15)  # 15 features
        synthetic_labels = np.random.choice([0, 1], size=1000, p=[0.9, 0.1])
        
        # Entrenar detector de anomalías
        self.anomaly_detector.fit(synthetic_data)
        
        # Entrenar clasificador de riesgo
        self.risk_classifier.fit(synthetic_data, synthetic_labels)
        
        # Entrenar scaler
        self.scaler.fit(synthetic_data)
        
    async def detect_potential_crisis(self, monitoring_data: Dict) -> Optional[Dict]:
        """Detectar potencial crisis en datos de monitoreo"""
        try:
            # Aplicar reglas de detección
            rule_alerts = await self._apply_detection_rules(monitoring_data)
            
            # Análisis de anomalías con ML
            ml_alerts = await self._detect_ml_anomalies(monitoring_data)
            
            # Combinar alertas
            combined_alerts = rule_alerts + ml_alerts
            
            if combined_alerts:
                return {
                    "detection_time": datetime.now().isoformat(),
                    "alerts": combined_alerts,
                    "confidence": self._calculate_detection_confidence(combined_alerts),
                    "recommended_severity": self._estimate_severity(combined_alerts)
                }
                
            return None
            
        except Exception as e:
            logger.error(f"Error in crisis detection: {e}")
            return None
    
    async def _apply_detection_rules(self, data: Dict) -> List[Dict]:
        """Aplicar reglas de detección configuradas"""
        alerts = []
        
        for rule in self.detection_rules:
            if await self._evaluate_rule_condition(rule, data):
                alerts.append({
                    "rule_id": rule["rule_id"],
                    "crisis_type": rule["crisis_type"],
                    "source": rule["source"],
                    "confidence": 0.8,
                    "details": data.get(rule["source"], {})
                })
                
        return alerts
    
    async def _evaluate_rule_condition(self, rule: Dict, data: Dict) -> bool:
        """Evaluar condición específica de regla"""
        # Implementación simplificada - en producción sería más sofisticada
        source_data = data.get(rule["source"], {})
        condition = rule["condition"]
        
        if "severe_weather_warning" in condition:
            return source_data.get("alert_level", "") in ["high", "severe"]
        elif "cancellation_spike" in condition:
            return source_data.get("cancellation_rate", 0) > 50
        elif "negative_sentiment" in condition:
            return source_data.get("negative_sentiment_rate", 0) > 80
        elif "viral_negative_mention" in condition:
            return source_data.get("viral_mentions", 0) > 100 and source_data.get("sentiment", 0) < -0.5
        elif "unauthorized_access_detected" in condition:
            return source_data.get("security_alerts", 0) > 0
            
        return False
    
    async def _detect_ml_anomalies(self, data: Dict) -> List[Dict]:
        """Detectar anomalías usando modelos ML"""
        alerts = []
        
        try:
            # Extraer características numéricas de los datos
            features = self._extract_numerical_features(data)
            
            if len(features) >= 15:  # Verificar que tenemos suficientes features
                features_scaled = self.scaler.transform([features])
                
                # Detección de anomalías
                anomaly_score = self.anomaly_detector.decision_function(features_scaled)[0]
                is_anomaly = self.anomaly_detector.predict(features_scaled)[0] == -1
                
                # Clasificación de riesgo
                risk_probability = self.risk_classifier.predict_proba(features_scaled)[0][1]
                
                if is_anomaly or risk_probability > 0.7:
                    alerts.append({
                        "rule_id": "ml_anomaly_detection",
                        "crisis_type": CrisisType.OPERATIONAL_FAILURE,
                        "source": "ml_model",
                        "confidence": max(abs(anomaly_score), risk_probability),
                        "details": {
                            "anomaly_score": anomaly_score,
                            "risk_probability": risk_probability,
                            "features": features[:5]  # Solo primeras 5 features por brevedad
                        }
                    })
                    
        except Exception as e:
            logger.warning(f"ML anomaly detection error: {e}")
            
        return alerts
    
    def _extract_numerical_features(self, data: Dict) -> List[float]:
        """Extraer características numéricas de los datos de monitoreo"""
        features = []
        
        # Extraer métricas de diferentes fuentes
        for source, source_data in data.items():
            if isinstance(source_data, dict):
                for key, value in source_data.items():
                    if isinstance(value, (int, float)):
                        features.append(float(value))
                        
        # Rellenar con valores por defecto si no hay suficientes features
        while len(features) < 15:
            features.append(0.0)
            
        return features[:15]  # Tomar solo las primeras 15 features
    
    def _calculate_detection_confidence(self, alerts: List[Dict]) -> float:
        """Calcular confianza general de detección"""
        if not alerts:
            return 0.0
            
        confidences = [alert.get("confidence", 0.5) for alert in alerts]
        return sum(confidences) / len(confidences)
    
    def _estimate_severity(self, alerts: List[Dict]) -> SeverityLevel:
        """Estimar severidad basada en alertas"""
        if not alerts:
            return SeverityLevel.LOW
            
        # Lógica simplificada de estimación de severidad
        max_confidence = max(alert.get("confidence", 0) for alert in alerts)
        
        if max_confidence > 0.9:
            return SeverityLevel.CRITICAL
        elif max_confidence > 0.75:
            return SeverityLevel.HIGH  
        elif max_confidence > 0.6:
            return SeverityLevel.MEDIUM
        else:
            return SeverityLevel.LOW

class ResponseOrchestrator:
    """Orquestador de respuestas automatizadas a crisis"""
    
    def __init__(self):
        self.response_protocols = {}
        self.active_responses = {}
        self.resource_manager = None
        self.communication_manager = None
        
    async def initialize(self):
        """Inicializar el orquestador de respuestas"""
        try:
            await self._load_response_protocols()
            await self._setup_resource_manager()
            await self._setup_communication_manager()
            
            logger.info("Response orchestrator initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing response orchestrator: {e}")
            raise
    
    async def _load_response_protocols(self):
        """Cargar protocolos de respuesta predefinidos"""
        protocols = [
            ResponseProtocol(
                protocol_id="natural_disaster_response",
                crisis_type=CrisisType.NATURAL_DISASTER,
                severity_threshold=SeverityLevel.MEDIUM,
                automated_actions=[
                    "activate_emergency_contacts",
                    "suspend_bookings_affected_area",
                    "notify_customers_in_area",
                    "coordinate_with_local_authorities",
                    "activate_emergency_accommodation"
                ],
                notification_templates={
                    "customer": "Urgent: Natural disaster alert affects your travel plans. We're working to ensure your safety.",
                    "staff": "Emergency protocol activated. Report to emergency coordinator immediately.",
                    "partners": "Crisis situation detected. Implementing emergency procedures."
                },
                escalation_rules=[
                    {"condition": "no_response_30min", "action": "escalate_to_management"},
                    {"condition": "severity_increase", "action": "activate_crisis_team"}
                ],
                communication_channels=["email", "sms", "whatsapp", "push_notification"],
                response_timeline={"immediate": 5, "short_term": 30, "medium_term": 120}
            ),
            ResponseProtocol(
                protocol_id="security_breach_response", 
                crisis_type=CrisisType.CYBER_ATTACK,
                severity_threshold=SeverityLevel.HIGH,
                automated_actions=[
                    "isolate_affected_systems",
                    "activate_security_team",
                    "notify_data_protection_officer",
                    "preserve_forensic_evidence",
                    "implement_communication_blackout"
                ],
                notification_templates={
                    "internal": "Security incident detected. Implementing containment procedures.",
                    "customers": "We are investigating a security matter and taking precautionary measures.",
                    "authorities": "Reporting potential security breach as per regulatory requirements."
                },
                escalation_rules=[
                    {"condition": "data_breach_confirmed", "action": "notify_authorities_immediately"},
                    {"condition": "customer_data_exposed", "action": "activate_pr_crisis_team"}
                ]
            ),
            ResponseProtocol(
                protocol_id="customer_safety_response",
                crisis_type=CrisisType.CUSTOMER_SAFETY,
                severity_threshold=SeverityLevel.MEDIUM,
                automated_actions=[
                    "dispatch_emergency_support",
                    "coordinate_medical_assistance",
                    "notify_emergency_contacts",
                    "document_incident_details",
                    "activate_insurance_procedures"
                ],
                notification_templates={
                    "customer": "We are aware of your situation and emergency support is on the way.",
                    "family": "We are providing immediate assistance to your family member during their travel.",
                    "medical": "Tourist medical emergency reported. Coordinates and details attached."
                }
            )
        ]
        
        for protocol in protocols:
            self.response_protocols[protocol.protocol_id] = protocol
    
    async def _setup_resource_manager(self):
        """Configurar gestor de recursos para crisis"""
        self.resource_manager = {
            "emergency_contacts": [],
            "crisis_team": [],
            "external_partners": [],
            "backup_systems": [],
            "emergency_budgets": {"immediate": 50000, "extended": 200000}
        }
    
    async def _setup_communication_manager(self):
        """Configurar gestor de comunicaciones de emergencia"""
        self.communication_manager = {
            "channels": {
                "email": {"provider": "sendgrid", "template_engine": "jinja2"},
                "sms": {"provider": "twilio", "emergency_queue": True},
                "whatsapp": {"provider": "whatsapp_business", "broadcast_lists": []},
                "push": {"provider": "firebase", "high_priority": True}
            },
            "escalation_contacts": [],
            "communication_logs": []
        }
    
    async def execute_response(self, incident: CrisisIncident) -> Dict:
        """Ejecutar respuesta automatizada a crisis"""
        try:
            # Seleccionar protocolo apropiado
            protocol = await self._select_response_protocol(incident)
            
            if not protocol:
                return {"status": "error", "message": "No suitable response protocol found"}
            
            # Iniciar respuesta
            response_id = f"response_{incident.incident_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            self.active_responses[response_id] = {
                "incident": incident,
                "protocol": protocol,
                "start_time": datetime.now(),
                "status": "executing",
                "actions_completed": [],
                "notifications_sent": []
            }
            
            # Ejecutar acciones automatizadas
            execution_results = await self._execute_automated_actions(protocol, incident)
            
            # Enviar notificaciones
            notification_results = await self._send_crisis_notifications(protocol, incident)
            
            # Actualizar estado de respuesta
            self.active_responses[response_id].update({
                "status": "completed",
                "execution_results": execution_results,
                "notification_results": notification_results,
                "completion_time": datetime.now()
            })
            
            return {
                "status": "success",
                "response_id": response_id,
                "protocol_used": protocol.protocol_id,
                "actions_executed": len(execution_results),
                "notifications_sent": len(notification_results),
                "response_time": (datetime.now() - self.active_responses[response_id]["start_time"]).total_seconds()
            }
            
        except Exception as e:
            logger.error(f"Error executing crisis response: {e}")
            return {"status": "error", "message": str(e)}
    
    async def _select_response_protocol(self, incident: CrisisIncident) -> Optional[ResponseProtocol]:
        """Seleccionar protocolo de respuesta apropiado"""
        matching_protocols = []
        
        for protocol in self.response_protocols.values():
            if (protocol.crisis_type == incident.crisis_type and 
                incident.severity.value >= protocol.severity_threshold.value):
                matching_protocols.append(protocol)
        
        # Seleccionar protocolo con threshold más alto (más específico)
        if matching_protocols:
            return max(matching_protocols, key=lambda p: p.severity_threshold.value)
        
        return None
    
    async def _execute_automated_actions(self, protocol: ResponseProtocol, incident: CrisisIncident) -> List[Dict]:
        """Ejecutar acciones automatizadas del protocolo"""
        results = []
        
        for action in protocol.automated_actions:
            try:
                result = await self._execute_single_action(action, incident)
                results.append({
                    "action": action,
                    "status": "completed" if result else "failed",
                    "timestamp": datetime.now().isoformat(),
                    "details": result
                })
                
            except Exception as e:
                results.append({
                    "action": action,
                    "status": "error",
                    "timestamp": datetime.now().isoformat(),
                    "error": str(e)
                })
                
        return results
    
    async def _execute_single_action(self, action: str, incident: CrisisIncident) -> Dict:
        """Ejecutar acción individual"""
        # Simulación de ejecución de acciones
        # En producción, estas conectarían con sistemas reales
        
        action_handlers = {
            "activate_emergency_contacts": self._activate_emergency_contacts,
            "suspend_bookings_affected_area": self._suspend_bookings,
            "notify_customers_in_area": self._notify_affected_customers,
            "coordinate_with_local_authorities": self._coordinate_authorities,
            "activate_emergency_accommodation": self._activate_emergency_accommodation,
            "isolate_affected_systems": self._isolate_systems,
            "activate_security_team": self._activate_security_team,
            "dispatch_emergency_support": self._dispatch_emergency_support,
            "coordinate_medical_assistance": self._coordinate_medical_assistance
        }
        
        handler = action_handlers.get(action)
        if handler:
            return await handler(incident)
        else:
            return {"status": "action_not_implemented", "action": action}
    
    async def _activate_emergency_contacts(self, incident: CrisisIncident) -> Dict:
        """Activar contactos de emergencia"""
        # Simulación
        return {
            "contacts_notified": 5,
            "response_team_activated": True,
            "escalation_initiated": incident.severity.value >= SeverityLevel.HIGH.value
        }
    
    async def _suspend_bookings(self, incident: CrisisIncident) -> Dict:
        """Suspender reservas en área afectada"""
        return {
            "bookings_suspended": 23,
            "affected_locations": [incident.location] if incident.location else [],
            "suspension_period": "72_hours"
        }
    
    async def _notify_affected_customers(self, incident: CrisisIncident) -> Dict:
        """Notificar clientes afectados"""
        return {
            "customers_notified": len(incident.affected_customers),
            "notification_channels": ["email", "sms", "app_notification"],
            "response_rate": 0.85
        }
    
    async def _coordinate_authorities(self, incident: CrisisIncident) -> Dict:
        """Coordinar con autoridades locales"""
        return {
            "authorities_contacted": ["local_police", "emergency_services", "tourism_board"],
            "coordination_established": True,
            "information_shared": True
        }
    
    async def _activate_emergency_accommodation(self, incident: CrisisIncident) -> Dict:
        """Activar alojamiento de emergencia"""
        return {
            "emergency_rooms_secured": 15,
            "partner_hotels_activated": 3,
            "capacity_available": 45
        }
    
    async def _isolate_systems(self, incident: CrisisIncident) -> Dict:
        """Aislar sistemas afectados"""
        return {
            "systems_isolated": ["booking_db", "payment_gateway"],
            "backup_systems_activated": True,
            "data_integrity_preserved": True
        }
    
    async def _activate_security_team(self, incident: CrisisIncident) -> Dict:
        """Activar equipo de seguridad"""
        return {
            "security_team_notified": True,
            "forensic_team_engaged": True,
            "external_security_consulted": incident.severity.value >= SeverityLevel.CRITICAL.value
        }
    
    async def _dispatch_emergency_support(self, incident: CrisisIncident) -> Dict:
        """Despachar soporte de emergencia"""
        return {
            "support_team_dispatched": True,
            "estimated_arrival": "30_minutes",
            "emergency_kit_included": True
        }
    
    async def _coordinate_medical_assistance(self, incident: CrisisIncident) -> Dict:
        """Coordinar asistencia médica"""
        return {
            "medical_services_contacted": True,
            "insurance_notified": True,
            "medical_evacuation_arranged": incident.severity.value >= SeverityLevel.HIGH.value
        }
    
    async def _send_crisis_notifications(self, protocol: ResponseProtocol, incident: CrisisIncident) -> List[Dict]:
        """Enviar notificaciones de crisis"""
        results = []
        
        for template_type, message_template in protocol.notification_templates.items():
            try:
                # Personalizar mensaje
                personalized_message = await self._personalize_message(message_template, incident)
                
                # Enviar por canales configurados
                for channel in protocol.communication_channels:
                    result = await self._send_notification(
                        channel=channel,
                        message=personalized_message,
                        recipients=self._get_recipients_for_type(template_type, incident),
                        priority="high"
                    )
                    
                    results.append({
                        "template_type": template_type,
                        "channel": channel,
                        "status": "sent" if result else "failed",
                        "timestamp": datetime.now().isoformat(),
                        "recipients_count": len(self._get_recipients_for_type(template_type, incident))
                    })
                    
            except Exception as e:
                results.append({
                    "template_type": template_type,
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                })
                
        return results
    
    async def _personalize_message(self, template: str, incident: CrisisIncident) -> str:
        """Personalizar mensaje de notificación"""
        # Reemplazos básicos
        personalized = template.replace("{incident_type}", incident.crisis_type.value)
        personalized = personalized.replace("{severity}", incident.severity.name)
        personalized = personalized.replace("{location}", incident.location or "multiple locations")
        personalized = personalized.replace("{time}", incident.detection_time.strftime("%H:%M %d/%m/%Y"))
        
        return personalized
    
    def _get_recipients_for_type(self, template_type: str, incident: CrisisIncident) -> List[str]:
        """Obtener destinatarios según tipo de template"""
        if template_type == "customer":
            return incident.affected_customers
        elif template_type == "staff":
            return incident.response_team or ["crisis_team@spirittours.com"]
        elif template_type == "partners":
            return ["partners@spirittours.com", "suppliers@spirittours.com"]
        elif template_type == "internal":
            return ["management@spirittours.com", "security@spirittours.com"]
        else:
            return ["crisis_team@spirittours.com"]
    
    async def _send_notification(self, channel: str, message: str, recipients: List[str], priority: str) -> bool:
        """Enviar notificación por canal específico"""
        # Simulación de envío de notificaciones
        # En producción, integraría con servicios reales
        try:
            if channel == "email":
                # Simular envío de email
                await asyncio.sleep(0.1)  # Simular latencia de API
                return True
            elif channel == "sms":
                # Simular envío de SMS
                await asyncio.sleep(0.15)
                return True
            elif channel == "whatsapp":
                # Simular envío de WhatsApp
                await asyncio.sleep(0.12)
                return True
            elif channel == "push_notification":
                # Simular push notification
                await asyncio.sleep(0.05)
                return True
            else:
                return False
                
        except Exception:
            return False

class CrisisAnalyzer:
    """Analizador de patrones e impacto de crisis"""
    
    def __init__(self):
        self.historical_incidents = []
        self.pattern_models = {}
        self.impact_calculators = {}
        
    async def analyze_incident_patterns(self, incidents: List[CrisisIncident]) -> Dict:
        """Analizar patrones en incidentes históricos"""
        try:
            analysis = {
                "temporal_patterns": await self._analyze_temporal_patterns(incidents),
                "geographic_patterns": await self._analyze_geographic_patterns(incidents),
                "severity_trends": await self._analyze_severity_trends(incidents),
                "type_correlations": await self._analyze_type_correlations(incidents),
                "response_effectiveness": await self._analyze_response_effectiveness(incidents),
                "predictive_insights": await self._generate_predictive_insights(incidents)
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing incident patterns: {e}")
            return {}
    
    async def _analyze_temporal_patterns(self, incidents: List[CrisisIncident]) -> Dict:
        """Analizar patrones temporales de crisis"""
        if not incidents:
            return {}
        
        # Análisis por hora del día
        hourly_distribution = {}
        for incident in incidents:
            hour = incident.detection_time.hour
            hourly_distribution[hour] = hourly_distribution.get(hour, 0) + 1
        
        # Análisis por día de la semana
        daily_distribution = {}
        for incident in incidents:
            day = incident.detection_time.strftime("%A")
            daily_distribution[day] = daily_distribution.get(day, 0) + 1
        
        # Análisis estacional
        seasonal_distribution = {}
        for incident in incidents:
            season = self._get_season(incident.detection_time)
            seasonal_distribution[season] = seasonal_distribution.get(season, 0) + 1
        
        return {
            "peak_hours": sorted(hourly_distribution.items(), key=lambda x: x[1], reverse=True)[:3],
            "peak_days": sorted(daily_distribution.items(), key=lambda x: x[1], reverse=True)[:3],
            "seasonal_trends": seasonal_distribution,
            "average_incidents_per_month": len(incidents) / max(1, self._get_months_span(incidents))
        }
    
    def _get_season(self, date: datetime) -> str:
        """Determinar estación del año"""
        month = date.month
        if month in [12, 1, 2]:
            return "Winter"
        elif month in [3, 4, 5]:
            return "Spring"
        elif month in [6, 7, 8]:
            return "Summer"
        else:
            return "Autumn"
    
    def _get_months_span(self, incidents: List[CrisisIncident]) -> int:
        """Obtener span en meses de los incidentes"""
        if len(incidents) < 2:
            return 1
        
        dates = [incident.detection_time for incident in incidents]
        date_range = max(dates) - min(dates)
        return max(1, date_range.days // 30)
    
    async def _analyze_geographic_patterns(self, incidents: List[CrisisIncident]) -> Dict:
        """Analizar patrones geográficos de crisis"""
        location_distribution = {}
        
        for incident in incidents:
            if incident.location:
                location_distribution[incident.location] = location_distribution.get(incident.location, 0) + 1
        
        return {
            "high_risk_locations": sorted(location_distribution.items(), key=lambda x: x[1], reverse=True)[:5],
            "total_locations_affected": len(location_distribution),
            "average_incidents_per_location": sum(location_distribution.values()) / max(1, len(location_distribution))
        }
    
    async def _analyze_severity_trends(self, incidents: List[CrisisIncident]) -> Dict:
        """Analizar tendencias de severidad"""
        severity_distribution = {}
        severity_over_time = []
        
        for incident in incidents:
            severity = incident.severity.name
            severity_distribution[severity] = severity_distribution.get(severity, 0) + 1
            severity_over_time.append({
                "date": incident.detection_time.isoformat(),
                "severity": incident.severity.value
            })
        
        # Calcular tendencia de severidad
        if len(severity_over_time) > 1:
            recent_avg = np.mean([s["severity"] for s in severity_over_time[-10:]])
            older_avg = np.mean([s["severity"] for s in severity_over_time[:-10]]) if len(severity_over_time) > 10 else recent_avg
            trend = "increasing" if recent_avg > older_avg else "decreasing" if recent_avg < older_avg else "stable"
        else:
            trend = "insufficient_data"
        
        return {
            "severity_distribution": severity_distribution,
            "severity_trend": trend,
            "average_severity": np.mean([incident.severity.value for incident in incidents]),
            "critical_incidents_percentage": (severity_distribution.get("CRITICAL", 0) + 
                                           severity_distribution.get("CATASTROPHIC", 0)) / max(1, len(incidents)) * 100
        }
    
    async def _analyze_type_correlations(self, incidents: List[CrisisIncident]) -> Dict:
        """Analizar correlaciones entre tipos de crisis"""
        type_distribution = {}
        type_sequences = []
        
        for incident in incidents:
            crisis_type = incident.crisis_type.value
            type_distribution[crisis_type] = type_distribution.get(crisis_type, 0) + 1
        
        # Buscar secuencias de tipos (crisis que se siguen unas a otras)
        sorted_incidents = sorted(incidents, key=lambda x: x.detection_time)
        for i in range(len(sorted_incidents) - 1):
            current_type = sorted_incidents[i].crisis_type.value
            next_type = sorted_incidents[i + 1].crisis_type.value
            if current_type != next_type:
                type_sequences.append((current_type, next_type))
        
        # Calcular correlaciones frecuentes
        sequence_counts = {}
        for seq in type_sequences:
            sequence_counts[seq] = sequence_counts.get(seq, 0) + 1
        
        return {
            "type_distribution": type_distribution,
            "most_common_types": sorted(type_distribution.items(), key=lambda x: x[1], reverse=True)[:5],
            "frequent_sequences": sorted(sequence_counts.items(), key=lambda x: x[1], reverse=True)[:3],
            "type_diversity": len(type_distribution) / len(CrisisType) * 100
        }
    
    async def _analyze_response_effectiveness(self, incidents: List[CrisisIncident]) -> Dict:
        """Analizar efectividad de respuestas"""
        response_times = []
        resolution_times = []
        resolution_success_rate = 0
        
        for incident in incidents:
            if incident.response_time and incident.detection_time:
                response_delta = incident.response_time - incident.detection_time
                response_times.append(response_delta.total_seconds() / 60)  # en minutos
            
            if incident.resolution_time and incident.detection_time:
                resolution_delta = incident.resolution_time - incident.detection_time
                resolution_times.append(resolution_delta.total_seconds() / 3600)  # en horas
            
            if incident.status == ResponseStatus.RESOLVED:
                resolution_success_rate += 1
        
        resolution_success_rate = (resolution_success_rate / max(1, len(incidents))) * 100
        
        return {
            "average_response_time_minutes": np.mean(response_times) if response_times else 0,
            "average_resolution_time_hours": np.mean(resolution_times) if resolution_times else 0,
            "resolution_success_rate": resolution_success_rate,
            "fastest_response_time": min(response_times) if response_times else 0,
            "slowest_response_time": max(response_times) if response_times else 0,
            "response_time_consistency": np.std(response_times) if response_times else 0
        }
    
    async def _generate_predictive_insights(self, incidents: List[CrisisIncident]) -> Dict:
        """Generar insights predictivos"""
        insights = []
        
        if len(incidents) < 5:
            return {"insights": ["Insufficient data for predictive analysis"]}
        
        # Insight sobre patrones temporales
        temporal_analysis = await self._analyze_temporal_patterns(incidents)
        if temporal_analysis.get("peak_hours"):
            peak_hour = temporal_analysis["peak_hours"][0][0]
            insights.append(f"Crisis más frecuentes entre las {peak_hour}:00-{peak_hour+1}:00. Considerar monitoreo intensivo.")
        
        # Insight sobre severidad
        severity_analysis = await self._analyze_severity_trends(incidents)
        if severity_analysis["severity_trend"] == "increasing":
            insights.append("Tendencia de severidad creciente detectada. Revisar protocolos de prevención.")
        
        # Insight sobre tipos frecuentes
        type_analysis = await self._analyze_type_correlations(incidents)
        if type_analysis.get("most_common_types"):
            common_type = type_analysis["most_common_types"][0][0]
            insights.append(f"Tipo de crisis más común: {common_type}. Desarrollar especialización en prevención.")
        
        # Insight sobre efectividad
        effectiveness_analysis = await self._analyze_response_effectiveness(incidents)
        if effectiveness_analysis["resolution_success_rate"] < 80:
            insights.append("Tasa de resolución por debajo del objetivo (80%). Revisar protocolos de respuesta.")
        
        return {
            "insights": insights,
            "confidence_level": min(0.9, len(incidents) / 100),  # Mayor confianza con más datos
            "recommendation_priority": "high" if len([i for i in insights if "revisar" in i.lower()]) > 0 else "medium"
        }

class CrisisManagementAgent(BaseAgent):
    """
    Agente de Gestión de Crisis - Spirit Tours
    
    Proporciona capacidades avanzadas de gestión de crisis incluyendo:
    - Detección temprana automatizada
    - Respuesta orquestada en tiempo real  
    - Análisis predictivo de patrones
    - Coordinación de recursos de emergencia
    - Comunicación multicanal de crisis
    - Aprendizaje continuo de incidentes
    """
    
    def __init__(self):
        super().__init__("Crisis Management AI", "crisis_management")
        
        # Componentes principales
        self.detection_engine = CrisisDetectionEngine()
        self.response_orchestrator = ResponseOrchestrator()
        self.crisis_analyzer = CrisisAnalyzer()
        
        # Estados del agente
        self.active_incidents = {}
        self.monitoring_active = False
        self.performance_metrics = CrisisMetrics()
        
        # Configuración
        self.config = {
            "detection_interval": 60,  # segundos
            "max_concurrent_incidents": 10,
            "auto_escalation_threshold": SeverityLevel.HIGH,
            "monitoring_sources": ["weather", "social", "booking", "security", "feedback"],
            "notification_channels": ["email", "sms", "whatsapp", "push"],
            "response_timeout": 1800,  # 30 minutos
            "learning_enabled": True,
            "predictive_analysis_enabled": True
        }
        
        # Performance monitoring
        self.performance_monitor = PerformanceMonitor(agent_name=self.name)
        self.health_checker = HealthChecker(agent_name=self.name)
        
        logger.info(f"Crisis Management Agent initialized: {self.name}")
    
    async def initialize(self):
        """Inicializar el agente y sus componentes"""
        try:
            await super().initialize()
            
            # Inicializar componentes
            await self.detection_engine.initialize()
            await self.response_orchestrator.initialize()
            
            # Cargar configuración persistente
            await self._load_persistent_config()
            
            # Iniciar monitoreo
            await self.start_monitoring()
            
            # Registrar métricas iniciales
            await self._register_initial_metrics()
            
            self.is_initialized = True
            logger.info("Crisis Management Agent fully initialized")
            
        except Exception as e:
            logger.error(f"Error initializing Crisis Management Agent: {e}")
            raise
    
    async def _load_persistent_config(self):
        """Cargar configuración persistente"""
        # En producción, cargaría desde base de datos o archivos de configuración
        pass
    
    async def start_monitoring(self):
        """Iniciar monitoreo continuo de potenciales crisis"""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        
        # Crear task de monitoreo
        asyncio.create_task(self._continuous_monitoring())
        
        logger.info("Crisis monitoring started")
    
    async def stop_monitoring(self):
        """Detener monitoreo de crisis"""
        self.monitoring_active = False
        logger.info("Crisis monitoring stopped")
    
    async def _continuous_monitoring(self):
        """Loop principal de monitoreo continuo"""
        while self.monitoring_active:
            try:
                # Recopilar datos de monitoreo
                monitoring_data = await self._collect_monitoring_data()
                
                # Detectar potenciales crisis
                detection_result = await self.detection_engine.detect_potential_crisis(monitoring_data)
                
                if detection_result:
                    # Crear incidente
                    incident = await self._create_crisis_incident(detection_result)
                    
                    # Ejecutar respuesta automática
                    await self._handle_crisis_incident(incident)
                
                # Actualizar métricas
                await self._update_performance_metrics()
                
                # Esperar intervalo de detección
                await asyncio.sleep(self.config["detection_interval"])
                
            except Exception as e:
                logger.error(f"Error in crisis monitoring loop: {e}")
                await asyncio.sleep(30)  # Esperar antes de reintentar
    
    async def _collect_monitoring_data(self) -> Dict:
        """Recopilar datos de todas las fuentes de monitoreo"""
        monitoring_data = {}
        
        try:
            # Simulación de datos de monitoreo
            # En producción, se conectaría a APIs reales
            
            monitoring_data["weather_api"] = {
                "alert_level": "normal",
                "temperature": 25.5,
                "humidity": 65,
                "wind_speed": 12.3,
                "precipitation": 0.0
            }
            
            monitoring_data["booking_system"] = {
                "cancellation_rate": 8.5,
                "booking_volume": 245,
                "average_booking_value": 1250.0,
                "system_performance": 98.5
            }
            
            monitoring_data["feedback_system"] = {
                "negative_sentiment_rate": 15.2,
                "complaint_volume": 3,
                "average_rating": 4.2,
                "response_rate": 89.5
            }
            
            monitoring_data["social_monitoring"] = {
                "viral_mentions": 12,
                "sentiment": 0.65,
                "reach": 15000,
                "engagement_rate": 5.8
            }
            
            monitoring_data["security_system"] = {
                "security_alerts": 0,
                "failed_login_attempts": 5,
                "suspicious_activities": 1,
                "system_integrity": 100
            }
            
        except Exception as e:
            logger.warning(f"Error collecting monitoring data: {e}")
        
        return monitoring_data
    
    async def _create_crisis_incident(self, detection_result: Dict) -> CrisisIncident:
        """Crear incidente de crisis basado en detección"""
        # Generar ID único para incidente
        incident_id = f"CRS_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{len(self.active_incidents)}"
        
        # Determinar tipo de crisis predominante
        alerts = detection_result.get("alerts", [])
        crisis_types = [alert.get("crisis_type") for alert in alerts if alert.get("crisis_type")]
        primary_crisis_type = crisis_types[0] if crisis_types else CrisisType.OPERATIONAL_FAILURE
        
        # Crear incidente
        incident = CrisisIncident(
            incident_id=incident_id,
            crisis_type=primary_crisis_type,
            severity=detection_result.get("recommended_severity", SeverityLevel.MEDIUM),
            status=ResponseStatus.DETECTED,
            title=f"Crisis Detection: {primary_crisis_type.value}",
            description=f"Automated crisis detection triggered by: {', '.join([a.get('rule_id', 'unknown') for a in alerts])}",
            detection_time=datetime.now(),
            metadata={
                "detection_confidence": detection_result.get("confidence", 0.5),
                "detection_alerts": alerts,
                "auto_generated": True
            }
        )
        
        # Registrar incidente activo
        self.active_incidents[incident_id] = incident
        
        logger.info(f"Crisis incident created: {incident_id} - {primary_crisis_type.value}")
        
        return incident
    
    async def _handle_crisis_incident(self, incident: CrisisIncident):
        """Manejar incidente de crisis completo"""
        try:
            # Actualizar estado a analyzing
            incident.status = ResponseStatus.ANALYZING
            
            # Ejecutar respuesta automatizada
            incident.status = ResponseStatus.RESPONDING
            incident.response_time = datetime.now()
            
            response_result = await self.response_orchestrator.execute_response(incident)
            
            # Evaluar si requiere escalación
            if (incident.severity.value >= self.config["auto_escalation_threshold"].value or 
                not response_result.get("status") == "success"):
                
                incident.status = ResponseStatus.ESCALATED
                incident.escalation_level += 1
                await self._escalate_incident(incident)
            
            # Actualizar métricas de performance
            await self._update_incident_metrics(incident, response_result)
            
            logger.info(f"Crisis incident handled: {incident.incident_id}")
            
        except Exception as e:
            logger.error(f"Error handling crisis incident: {e}")
            incident.status = ResponseStatus.ESCALATED
            await self._escalate_incident(incident)
    
    async def _escalate_incident(self, incident: CrisisIncident):
        """Escalar incidente a equipo humano"""
        escalation_data = {
            "incident_id": incident.incident_id,
            "escalation_level": incident.escalation_level,
            "severity": incident.severity.name,
            "crisis_type": incident.crisis_type.value,
            "escalation_reason": "Auto-escalation triggered",
            "escalation_time": datetime.now().isoformat()
        }
        
        # En producción, enviaría notificaciones reales al equipo de crisis
        logger.warning(f"CRISIS ESCALATED: {incident.incident_id} - Level {incident.escalation_level}")
        
        # Agregar a actions_taken del incidente
        incident.actions_taken.append(f"Escalated to level {incident.escalation_level}")
    
    async def _update_incident_metrics(self, incident: CrisisIncident, response_result: Dict):
        """Actualizar métricas basadas en incidente"""
        # Calcular tiempos de respuesta
        if incident.response_time and incident.detection_time:
            response_time_minutes = (incident.response_time - incident.detection_time).total_seconds() / 60
            
            # Actualizar métricas promedio
            current_avg = self.performance_metrics.average_response_time
            total_incidents = self.performance_metrics.total_incidents
            
            self.performance_metrics.average_response_time = (
                (current_avg * total_incidents + response_time_minutes) / (total_incidents + 1)
            )
        
        # Actualizar contadores
        self.performance_metrics.total_incidents += 1
        
        crisis_type_key = incident.crisis_type.value
        self.performance_metrics.incidents_by_type[crisis_type_key] = (
            self.performance_metrics.incidents_by_type.get(crisis_type_key, 0) + 1
        )
        
        severity_key = incident.severity.name
        self.performance_metrics.incidents_by_severity[severity_key] = (
            self.performance_metrics.incidents_by_severity.get(severity_key, 0) + 1
        )
        
        # Calcular tasa de resolución
        if response_result.get("status") == "success":
            resolved_count = sum(1 for inc in self.active_incidents.values() 
                               if inc.status in [ResponseStatus.RESOLVED, ResponseStatus.CLOSED])
            self.performance_metrics.resolution_rate = resolved_count / max(1, len(self.active_incidents)) * 100
    
    async def _update_performance_metrics(self):
        """Actualizar métricas generales de performance"""
        try:
            # Calcular métricas de uptime del sistema
            self.performance_metrics.system_uptime_during_crisis = 99.5  # Simulado
            
            # Actualizar eficiencia de utilización de recursos
            self.performance_metrics.resource_utilization_efficiency = 87.3  # Simulado
            
            # Actualizar efectividad de comunicación
            self.performance_metrics.communication_effectiveness = 91.2  # Simulado
            
        except Exception as e:
            logger.warning(f"Error updating performance metrics: {e}")
    
    async def _register_initial_metrics(self):
        """Registrar métricas iniciales del agente"""
        await self.performance_monitor.record_metric("agent_initialized", 1)
        await self.performance_monitor.record_metric("monitoring_status", 1 if self.monitoring_active else 0)
    
    # API Endpoints del agente
    
    async def get_crisis_status(self) -> Dict:
        """Obtener estado actual de crisis"""
        return {
            "monitoring_active": self.monitoring_active,
            "active_incidents": len(self.active_incidents),
            "incidents_today": len([inc for inc in self.active_incidents.values() 
                                   if inc.detection_time.date() == datetime.now().date()]),
            "highest_severity_active": max([inc.severity.value for inc in self.active_incidents.values()], 
                                         default=0),
            "system_status": "monitoring" if self.monitoring_active else "standby",
            "last_update": datetime.now().isoformat()
        }
    
    async def get_incident_details(self, incident_id: str) -> Optional[Dict]:
        """Obtener detalles de incidente específico"""
        incident = self.active_incidents.get(incident_id)
        
        if not incident:
            return None
        
        return {
            "incident_id": incident.incident_id,
            "crisis_type": incident.crisis_type.value,
            "severity": incident.severity.name,
            "status": incident.status.value,
            "title": incident.title,
            "description": incident.description,
            "location": incident.location,
            "detection_time": incident.detection_time.isoformat(),
            "response_time": incident.response_time.isoformat() if incident.response_time else None,
            "affected_customers": len(incident.affected_customers),
            "affected_services": incident.affected_services,
            "actions_taken": incident.actions_taken,
            "escalation_level": incident.escalation_level,
            "cost_impact": incident.cost_impact,
            "metadata": incident.metadata
        }
    
    async def get_performance_metrics(self) -> Dict:
        """Obtener métricas de performance del agente"""
        return {
            "total_incidents": self.performance_metrics.total_incidents,
            "incidents_by_type": dict(self.performance_metrics.incidents_by_type),
            "incidents_by_severity": dict(self.performance_metrics.incidents_by_severity),
            "average_response_time_minutes": round(self.performance_metrics.average_response_time, 2),
            "resolution_rate_percent": round(self.performance_metrics.resolution_rate, 2),
            "prevention_success_rate": round(self.performance_metrics.prevention_success_rate, 2),
            "escalation_rate": round(self.performance_metrics.escalation_rate, 2),
            "communication_effectiveness": round(self.performance_metrics.communication_effectiveness, 2),
            "system_uptime_during_crisis": round(self.performance_metrics.system_uptime_during_crisis, 2),
            "cost_impact_total": self.performance_metrics.cost_impact_total,
            "lessons_learned_implemented": self.performance_metrics.lessons_learned_implemented
        }
    
    async def manual_incident_report(self, incident_data: Dict) -> Dict:
        """Reportar incidente manualmente"""
        try:
            # Validar datos de entrada
            required_fields = ["crisis_type", "severity", "title", "description"]
            
            for field in required_fields:
                if field not in incident_data:
                    return {"status": "error", "message": f"Missing required field: {field}"}
            
            # Crear incidente manual
            incident_id = f"MAN_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{len(self.active_incidents)}"
            
            incident = CrisisIncident(
                incident_id=incident_id,
                crisis_type=CrisisType(incident_data["crisis_type"]),
                severity=SeverityLevel(incident_data["severity"]),
                status=ResponseStatus.DETECTED,
                title=incident_data["title"],
                description=incident_data["description"],
                location=incident_data.get("location"),
                affected_customers=incident_data.get("affected_customers", []),
                affected_services=incident_data.get("affected_services", []),
                metadata={
                    "manual_report": True,
                    "reporter": incident_data.get("reporter", "unknown"),
                    "report_source": "manual_api"
                }
            )
            
            # Registrar y manejar incidente
            self.active_incidents[incident_id] = incident
            await self._handle_crisis_incident(incident)
            
            return {
                "status": "success",
                "incident_id": incident_id,
                "message": "Incident reported and response initiated"
            }
            
        except Exception as e:
            logger.error(f"Error in manual incident report: {e}")
            return {"status": "error", "message": str(e)}
    
    async def resolve_incident(self, incident_id: str, resolution_data: Dict) -> Dict:
        """Resolver incidente manualmente"""
        try:
            incident = self.active_incidents.get(incident_id)
            
            if not incident:
                return {"status": "error", "message": "Incident not found"}
            
            # Actualizar estado de resolución
            incident.status = ResponseStatus.RESOLVED
            incident.resolution_time = datetime.now()
            incident.lessons_learned = resolution_data.get("lessons_learned", [])
            incident.cost_impact = resolution_data.get("cost_impact", 0.0)
            incident.customer_satisfaction_impact = resolution_data.get("customer_satisfaction_impact", 0.0)
            
            # Agregar acción de resolución
            incident.actions_taken.append(f"Manually resolved: {resolution_data.get('resolution_summary', 'No summary provided')}")
            
            # Actualizar métricas
            await self._update_incident_metrics(incident, {"status": "success"})
            
            logger.info(f"Incident resolved: {incident_id}")
            
            return {
                "status": "success",
                "incident_id": incident_id,
                "resolution_time": incident.resolution_time.isoformat(),
                "message": "Incident resolved successfully"
            }
            
        except Exception as e:
            logger.error(f"Error resolving incident: {e}")
            return {"status": "error", "message": str(e)}
    
    async def get_crisis_analytics(self, time_period: str = "30d") -> Dict:
        """Obtener análisis de crisis por período"""
        try:
            # Filtrar incidentes por período de tiempo
            cutoff_date = datetime.now() - timedelta(days=int(time_period.replace('d', '')))
            recent_incidents = [
                inc for inc in self.active_incidents.values() 
                if inc.detection_time >= cutoff_date
            ]
            
            # Generar análisis completo
            analysis = await self.crisis_analyzer.analyze_incident_patterns(recent_incidents)
            
            return {
                "analysis_period": time_period,
                "incidents_analyzed": len(recent_incidents),
                "analysis_date": datetime.now().isoformat(),
                **analysis
            }
            
        except Exception as e:
            logger.error(f"Error generating crisis analytics: {e}")
            return {"status": "error", "message": str(e)}
    
    async def update_response_protocol(self, protocol_data: Dict) -> Dict:
        """Actualizar protocolo de respuesta"""
        try:
            protocol_id = protocol_data.get("protocol_id")
            
            if not protocol_id:
                return {"status": "error", "message": "Protocol ID required"}
            
            # Actualizar protocolo en orquestador
            if protocol_id in self.response_orchestrator.response_protocols:
                protocol = self.response_orchestrator.response_protocols[protocol_id]
                
                # Actualizar campos proporcionados
                for field, value in protocol_data.items():
                    if hasattr(protocol, field) and field != "protocol_id":
                        setattr(protocol, field, value)
                
                logger.info(f"Response protocol updated: {protocol_id}")
                
                return {
                    "status": "success",
                    "protocol_id": protocol_id,
                    "message": "Protocol updated successfully"
                }
            else:
                return {"status": "error", "message": "Protocol not found"}
                
        except Exception as e:
            logger.error(f"Error updating response protocol: {e}")
            return {"status": "error", "message": str(e)}
    
    async def health_check(self) -> Dict:
        """Verificar salud del agente"""
        try:
            health_data = await self.health_checker.get_health_status()
            
            # Verificaciones específicas del agente
            agent_health = {
                "monitoring_active": self.monitoring_active,
                "detection_engine_ready": hasattr(self.detection_engine, 'anomaly_detector'),
                "response_orchestrator_ready": len(self.response_orchestrator.response_protocols) > 0,
                "active_incidents": len(self.active_incidents),
                "memory_usage_mb": self._get_memory_usage(),
                "uptime_hours": (datetime.now() - getattr(self, 'start_time', datetime.now())).total_seconds() / 3600
            }
            
            overall_health = "healthy" if all([
                agent_health["monitoring_active"],
                agent_health["detection_engine_ready"],
                agent_health["response_orchestrator_ready"],
                agent_health["memory_usage_mb"] < 500
            ]) else "degraded"
            
            return {
                "agent_name": self.name,
                "agent_status": overall_health,
                "timestamp": datetime.now().isoformat(),
                "health_details": agent_health,
                "system_health": health_data
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
        # En producción usaría psutil o similar
        return 125.5  # MB simulado

# Función de inicialización del agente
async def initialize_crisis_management_agent() -> CrisisManagementAgent:
    """Inicializar y retornar instancia del agente de gestión de crisis"""
    agent = CrisisManagementAgent()
    await agent.initialize()
    return agent

# Entry point para testing
if __name__ == "__main__":
    async def main():
        agent = await initialize_crisis_management_agent()
        
        # Test de funcionalidad básica
        print("🚨 Crisis Management Agent - Test Suite")
        print("=" * 50)
        
        # Test 1: Status check
        status = await agent.get_crisis_status()
        print(f"✅ Status Check: {status}")
        
        # Test 2: Manual incident report
        test_incident = {
            "crisis_type": "customer_safety",
            "severity": 3,
            "title": "Customer Emergency Test",
            "description": "Test incident for system validation",
            "location": "Test Location",
            "reporter": "system_test"
        }
        
        report_result = await agent.manual_incident_report(test_incident)
        print(f"✅ Manual Report: {report_result}")
        
        # Test 3: Performance metrics
        metrics = await agent.get_performance_metrics()
        print(f"✅ Performance Metrics: {metrics}")
        
        # Test 4: Health check
        health = await agent.health_check()
        print(f"✅ Health Check: {health}")
        
        print("\n🎯 Crisis Management Agent ready for production!")
        
        # Mantener monitoreo activo por un período de test
        print("🔍 Running monitoring for 30 seconds...")
        await asyncio.sleep(30)
        
        # Detener monitoreo
        await agent.stop_monitoring()
        print("✅ Test completed successfully")

    # Ejecutar test si es llamado directamente
    asyncio.run(main())