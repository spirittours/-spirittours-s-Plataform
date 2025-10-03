#!/usr/bin/env python3
"""
AI Agents Orchestrator - Spirit Tours
Sistema de coordinación y gestión de los 25 Agentes IA
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
import uuid
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AgentTrack(Enum):
    """Tracks de agentes IA"""
    TRACK_1 = "track_1_customer_revenue"
    TRACK_2 = "track_2_security_market"
    TRACK_3 = "track_3_ethics_sustainability"

class AgentStatus(Enum):
    """Estados de los agentes"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    MAINTENANCE = "maintenance"

class QueryType(Enum):
    """Tipos de consulta"""
    BOOKING_ASSISTANCE = "booking_assistance"
    CUSTOMER_SERVICE = "customer_service"
    PRICE_OPTIMIZATION = "price_optimization"
    CONTENT_GENERATION = "content_generation"
    SECURITY_ASSESSMENT = "security_assessment"
    MARKET_ANALYSIS = "market_analysis"
    SUSTAINABILITY_CHECK = "sustainability_check"
    CULTURAL_ADAPTATION = "cultural_adaptation"
    ROUTE_OPTIMIZATION = "route_optimization"
    PERSONALIZATION = "personalization"

@dataclass
class AgentCapability:
    """Capacidad de un agente IA"""
    name: str
    description: str
    supported_query_types: List[QueryType]
    confidence_score: float = 0.0
    response_time_ms: int = 0

@dataclass
class AgentConfig:
    """Configuración de un agente IA"""
    agent_id: str
    name: str
    track: AgentTrack
    status: AgentStatus
    capabilities: List[AgentCapability]
    endpoint_path: str
    priority: int = 1  # 1 = highest, 5 = lowest
    max_concurrent_requests: int = 10
    timeout_seconds: int = 30
    api_key: Optional[str] = None
    model_config: Dict[str, Any] = field(default_factory=dict)

@dataclass
class QueryRequest:
    """Solicitud de consulta a agente"""
    query_id: str
    query_type: QueryType
    content: str
    context: Dict[str, Any] = field(default_factory=dict)
    customer_id: Optional[str] = None
    booking_id: Optional[str] = None
    priority: int = 3
    max_response_time: int = 30

@dataclass
class AgentResponse:
    """Respuesta de un agente IA"""
    agent_id: str
    query_id: str
    success: bool
    response_data: Dict[str, Any]
    confidence_score: float
    processing_time_ms: int
    error_message: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)

class AIAgentOrchestrator:
    """Orquestador principal de agentes IA"""
    
    def __init__(self):
        self.agents: Dict[str, AgentConfig] = {}
        self.active_queries: Dict[str, QueryRequest] = {}
        self.agent_stats: Dict[str, Dict[str, Any]] = {}
        self.is_initialized = False
        
    async def initialize(self):
        """Inicializar el orquestador con todos los agentes"""
        try:
            logger.info("🚀 Inicializando AI Agent Orchestrator...")
            
            # Configurar todos los agentes
            await self._setup_track_1_agents()
            await self._setup_track_2_agents() 
            await self._setup_track_3_agents()
            
            # Inicializar estadísticas
            for agent_id in self.agents:
                self.agent_stats[agent_id] = {
                    "total_queries": 0,
                    "successful_queries": 0,
                    "avg_response_time": 0.0,
                    "avg_confidence": 0.0,
                    "last_used": None,
                    "error_count": 0
                }
            
            self.is_initialized = True
            logger.info(f"✅ Orchestrator iniciado con {len(self.agents)} agentes")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error inicializando orchestrator: {str(e)}")
            return False
    
    async def _setup_track_1_agents(self):
        """Configurar agentes Track 1: Customer & Revenue Excellence"""
        
        track_1_agents = [
            AgentConfig(
                agent_id="multi_channel",
                name="Multi-Channel Communication Hub",
                track=AgentTrack.TRACK_1,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="WhatsApp Integration",
                        description="Gestión de comunicaciones WhatsApp Business",
                        supported_query_types=[QueryType.CUSTOMER_SERVICE, QueryType.BOOKING_ASSISTANCE]
                    ),
                    AgentCapability(
                        name="Social Media Management", 
                        description="Gestión unificada de redes sociales",
                        supported_query_types=[QueryType.CUSTOMER_SERVICE, QueryType.CONTENT_GENERATION]
                    )
                ],
                endpoint_path="/api/v1/agents/multi-channel",
                priority=1
            ),
            
            AgentConfig(
                agent_id="content_master",
                name="ContentMaster AI",
                track=AgentTrack.TRACK_1,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Blog Content Generation",
                        description="Generación automática de contenido SEO optimizado",
                        supported_query_types=[QueryType.CONTENT_GENERATION]
                    ),
                    AgentCapability(
                        name="Social Media Posts",
                        description="Creación de posts para redes sociales",
                        supported_query_types=[QueryType.CONTENT_GENERATION]
                    )
                ],
                endpoint_path="/api/v1/agents/content-master",
                priority=2
            ),
            
            AgentConfig(
                agent_id="competitive_intel",
                name="CompetitiveIntel AI",
                track=AgentTrack.TRACK_1,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Price Monitoring",
                        description="Monitoreo de precios de competidores",
                        supported_query_types=[QueryType.MARKET_ANALYSIS, QueryType.PRICE_OPTIMIZATION]
                    ),
                    AgentCapability(
                        name="Threat Detection",
                        description="Detección de amenazas competitivas",
                        supported_query_types=[QueryType.MARKET_ANALYSIS]
                    )
                ],
                endpoint_path="/api/v1/agents/competitive-intel",
                priority=2
            ),
            
            AgentConfig(
                agent_id="customer_prophet",
                name="CustomerProphet AI", 
                track=AgentTrack.TRACK_1,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Behavior Prediction",
                        description="Predicción de comportamiento de clientes",
                        supported_query_types=[QueryType.PERSONALIZATION, QueryType.CUSTOMER_SERVICE]
                    ),
                    AgentCapability(
                        name="Churn Prevention",
                        description="Prevención de abandono de clientes",
                        supported_query_types=[QueryType.CUSTOMER_SERVICE]
                    )
                ],
                endpoint_path="/api/v1/agents/customer-prophet",
                priority=1
            ),
            
            AgentConfig(
                agent_id="experience_curator",
                name="ExperienceCurator AI",
                track=AgentTrack.TRACK_1,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Itinerary Generation",
                        description="Creación de itinerarios personalizados",
                        supported_query_types=[QueryType.BOOKING_ASSISTANCE, QueryType.PERSONALIZATION]
                    ),
                    AgentCapability(
                        name="Experience Matching",
                        description="Coincidencia de experiencias con preferencias",
                        supported_query_types=[QueryType.PERSONALIZATION]
                    )
                ],
                endpoint_path="/api/v1/agents/experience-curator",
                priority=1
            ),
            
            AgentConfig(
                agent_id="revenue_maximizer",
                name="RevenueMaximizer AI",
                track=AgentTrack.TRACK_1,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Dynamic Pricing",
                        description="Optimización dinámica de precios",
                        supported_query_types=[QueryType.PRICE_OPTIMIZATION]
                    ),
                    AgentCapability(
                        name="Revenue Forecasting",
                        description="Pronósticos de ingresos avanzados",
                        supported_query_types=[QueryType.MARKET_ANALYSIS]
                    )
                ],
                endpoint_path="/api/v1/agents/revenue-maximizer",
                priority=1
            ),
            
            AgentConfig(
                agent_id="social_sentiment",
                name="SocialSentiment AI",
                track=AgentTrack.TRACK_1, 
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Social Media Monitoring",
                        description="Monitoreo de sentimientos en redes sociales",
                        supported_query_types=[QueryType.MARKET_ANALYSIS, QueryType.CUSTOMER_SERVICE]
                    )
                ],
                endpoint_path="/api/v1/agents/social-sentiment",
                priority=2
            ),
            
            AgentConfig(
                agent_id="booking_optimizer",
                name="BookingOptimizer AI",
                track=AgentTrack.TRACK_1,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Conversion Optimization",
                        description="Optimización de conversiones de reservas",
                        supported_query_types=[QueryType.BOOKING_ASSISTANCE]
                    )
                ],
                endpoint_path="/api/v1/agents/booking-optimizer",
                priority=1
            ),
            
            AgentConfig(
                agent_id="demand_forecaster",
                name="DemandForecaster AI",
                track=AgentTrack.TRACK_1,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Demand Prediction",
                        description="Predicción de demanda turística",
                        supported_query_types=[QueryType.MARKET_ANALYSIS, QueryType.PRICE_OPTIMIZATION]
                    )
                ],
                endpoint_path="/api/v1/agents/demand-forecaster",
                priority=2
            ),
            
            AgentConfig(
                agent_id="feedback_analyzer",
                name="FeedbackAnalyzer AI",
                track=AgentTrack.TRACK_1,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Review Analysis",
                        description="Análisis de reseñas y feedback",
                        supported_query_types=[QueryType.CUSTOMER_SERVICE, QueryType.MARKET_ANALYSIS]
                    )
                ],
                endpoint_path="/api/v1/agents/feedback-analyzer",
                priority=2
            )
        ]
        
        for agent in track_1_agents:
            self.agents[agent.agent_id] = agent
    
    async def _setup_track_2_agents(self):
        """Configurar agentes Track 2: Security & Market Intelligence"""
        
        track_2_agents = [
            AgentConfig(
                agent_id="security_guard",
                name="SecurityGuard AI",
                track=AgentTrack.TRACK_2,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Risk Assessment",
                        description="Evaluación de riesgos de seguridad",
                        supported_query_types=[QueryType.SECURITY_ASSESSMENT]
                    )
                ],
                endpoint_path="/api/v1/agents/security-guard",
                priority=1
            ),
            
            AgentConfig(
                agent_id="market_entry",
                name="MarketEntry AI",
                track=AgentTrack.TRACK_2,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Market Analysis",
                        description="Análisis de entrada a nuevos mercados",
                        supported_query_types=[QueryType.MARKET_ANALYSIS]
                    )
                ],
                endpoint_path="/api/v1/agents/market-entry",
                priority=2
            ),
            
            AgentConfig(
                agent_id="influencer_match",
                name="InfluencerMatch AI",
                track=AgentTrack.TRACK_2,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Influencer Discovery",
                        description="Descubrimiento de influencers relevantes",
                        supported_query_types=[QueryType.MARKET_ANALYSIS, QueryType.CONTENT_GENERATION]
                    )
                ],
                endpoint_path="/api/v1/agents/influencer-match",
                priority=2
            ),
            
            AgentConfig(
                agent_id="luxury_upsell",
                name="LuxuryUpsell AI",
                track=AgentTrack.TRACK_2,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Luxury Segmentation",
                        description="Segmentación y upselling de lujo",
                        supported_query_types=[QueryType.PERSONALIZATION, QueryType.PRICE_OPTIMIZATION]
                    )
                ],
                endpoint_path="/api/v1/agents/luxury-upsell",
                priority=2
            ),
            
            AgentConfig(
                agent_id="route_genius",
                name="RouteGenius AI",
                track=AgentTrack.TRACK_2,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Route Optimization",
                        description="Optimización de rutas turísticas",
                        supported_query_types=[QueryType.ROUTE_OPTIMIZATION, QueryType.BOOKING_ASSISTANCE]
                    )
                ],
                endpoint_path="/api/v1/agents/route-genius",
                priority=1
            )
        ]
        
        for agent in track_2_agents:
            self.agents[agent.agent_id] = agent
    
    async def _setup_track_3_agents(self):
        """Configurar agentes Track 3: Ethics & Sustainability"""
        
        track_3_agents = [
            AgentConfig(
                agent_id="crisis_management",
                name="CrisisManagement AI",
                track=AgentTrack.TRACK_3,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Crisis Detection",
                        description="Detección y manejo de crisis",
                        supported_query_types=[QueryType.SECURITY_ASSESSMENT, QueryType.CUSTOMER_SERVICE]
                    )
                ],
                endpoint_path="/api/v1/agents/crisis-management",
                priority=1
            ),
            
            AgentConfig(
                agent_id="personalization_engine",
                name="PersonalizationEngine AI",
                track=AgentTrack.TRACK_3,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Advanced Personalization",
                        description="Motor de personalización avanzado",
                        supported_query_types=[QueryType.PERSONALIZATION, QueryType.BOOKING_ASSISTANCE]
                    )
                ],
                endpoint_path="/api/v1/agents/personalization-engine",
                priority=1
            ),
            
            AgentConfig(
                agent_id="cultural_adaptation",
                name="CulturalAdaptation AI",
                track=AgentTrack.TRACK_3,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Cultural Intelligence",
                        description="Adaptación cultural inteligente",
                        supported_query_types=[QueryType.CULTURAL_ADAPTATION, QueryType.PERSONALIZATION]
                    )
                ],
                endpoint_path="/api/v1/agents/cultural-adaptation",
                priority=2
            ),
            
            AgentConfig(
                agent_id="sustainability_advisor",
                name="SustainabilityAdvisor AI",
                track=AgentTrack.TRACK_3,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Sustainability Assessment",
                        description="Evaluación de sostenibilidad turística",
                        supported_query_types=[QueryType.SUSTAINABILITY_CHECK]
                    )
                ],
                endpoint_path="/api/v1/agents/sustainability-advisor",
                priority=2
            ),
            
            AgentConfig(
                agent_id="wellness_optimizer",
                name="WellnessOptimizer AI",
                track=AgentTrack.TRACK_3,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Wellness Planning",
                        description="Planificación de bienestar y salud",
                        supported_query_types=[QueryType.PERSONALIZATION, QueryType.BOOKING_ASSISTANCE]
                    )
                ],
                endpoint_path="/api/v1/agents/wellness-optimizer",
                priority=2
            ),
            
            AgentConfig(
                agent_id="knowledge_curator",
                name="KnowledgeCurator AI",
                track=AgentTrack.TRACK_3,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Knowledge Management",
                        description="Gestión inteligente del conocimiento",
                        supported_query_types=[QueryType.CUSTOMER_SERVICE, QueryType.CONTENT_GENERATION]
                    )
                ],
                endpoint_path="/api/v1/agents/knowledge-curator",
                priority=2
            ),
            
            AgentConfig(
                agent_id="accessibility_specialist",
                name="AccessibilitySpecialist AI",
                track=AgentTrack.TRACK_3,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Accessibility Assessment",
                        description="Evaluación de accesibilidad turística",
                        supported_query_types=[QueryType.BOOKING_ASSISTANCE, QueryType.PERSONALIZATION]
                    )
                ],
                endpoint_path="/api/v1/agents/accessibility-specialist",
                priority=2
            ),
            
            AgentConfig(
                agent_id="carbon_optimizer",
                name="CarbonOptimizer AI",
                track=AgentTrack.TRACK_3,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Carbon Footprint Calculation",
                        description="Cálculo preciso de huella de carbono",
                        supported_query_types=[QueryType.SUSTAINABILITY_CHECK, QueryType.ROUTE_OPTIMIZATION]
                    )
                ],
                endpoint_path="/api/v1/agents/carbon-optimizer",
                priority=2
            ),
            
            AgentConfig(
                agent_id="local_impact_analyzer",
                name="LocalImpactAnalyzer AI",
                track=AgentTrack.TRACK_3,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Community Impact Assessment",
                        description="Análisis de impacto en comunidades locales",
                        supported_query_types=[QueryType.SUSTAINABILITY_CHECK, QueryType.MARKET_ANALYSIS]
                    )
                ],
                endpoint_path="/api/v1/agents/local-impact-analyzer",
                priority=2
            ),
            
            AgentConfig(
                agent_id="ethical_tourism_advisor",
                name="EthicalTourismAdvisor AI",
                track=AgentTrack.TRACK_3,
                status=AgentStatus.ACTIVE,
                capabilities=[
                    AgentCapability(
                        name="Ethical Tourism Guidance",
                        description="Asesoramiento en turismo ético",
                        supported_query_types=[QueryType.SUSTAINABILITY_CHECK, QueryType.BOOKING_ASSISTANCE]
                    )
                ],
                endpoint_path="/api/v1/agents/ethical-tourism-advisor",
                priority=2
            )
        ]
        
        for agent in track_3_agents:
            self.agents[agent.agent_id] = agent
    
    async def process_query(self, query: QueryRequest) -> List[AgentResponse]:
        """Procesar consulta usando los agentes más apropiados"""
        
        if not self.is_initialized:
            await self.initialize()
        
        self.active_queries[query.query_id] = query
        
        # Encontrar agentes capaces de manejar la consulta
        capable_agents = self._find_capable_agents(query.query_type)
        
        if not capable_agents:
            return [AgentResponse(
                agent_id="orchestrator",
                query_id=query.query_id,
                success=False,
                response_data={},
                confidence_score=0.0,
                processing_time_ms=0,
                error_message=f"No agents available for query type: {query.query_type.value}"
            )]
        
        # Procesar consulta con múltiples agentes en paralelo
        responses = await self._execute_parallel_queries(query, capable_agents)
        
        # Actualizar estadísticas
        for response in responses:
            self._update_agent_stats(response)
        
        # Limpiar consulta activa
        if query.query_id in self.active_queries:
            del self.active_queries[query.query_id]
        
        return responses
    
    def _find_capable_agents(self, query_type: QueryType) -> List[AgentConfig]:
        """Encontrar agentes capaces de manejar el tipo de consulta"""
        
        capable_agents = []
        
        for agent in self.agents.values():
            if agent.status != AgentStatus.ACTIVE:
                continue
                
            for capability in agent.capabilities:
                if query_type in capability.supported_query_types:
                    capable_agents.append(agent)
                    break
        
        # Ordenar por prioridad (1 = mayor prioridad)
        capable_agents.sort(key=lambda x: x.priority)
        
        return capable_agents
    
    async def _execute_parallel_queries(self, query: QueryRequest, agents: List[AgentConfig]) -> List[AgentResponse]:
        """Ejecutar consultas en paralelo con múltiples agentes"""
        
        tasks = []
        
        # Limitar a los 3 agentes con mayor prioridad para evitar sobrecarga
        top_agents = agents[:3]
        
        for agent in top_agents:
            task = self._execute_single_query(query, agent)
            tasks.append(task)
        
        # Ejecutar todas las consultas en paralelo con timeout
        try:
            responses = await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=query.max_response_time
            )
            
            # Filtrar respuestas válidas
            valid_responses = []
            for response in responses:
                if isinstance(response, AgentResponse):
                    valid_responses.append(response)
                elif isinstance(response, Exception):
                    logger.error(f"Agent query error: {str(response)}")
            
            return valid_responses
            
        except asyncio.TimeoutError:
            logger.warning(f"Query {query.query_id} timed out after {query.max_response_time}s")
            return [AgentResponse(
                agent_id="orchestrator",
                query_id=query.query_id,
                success=False,
                response_data={},
                confidence_score=0.0,
                processing_time_ms=query.max_response_time * 1000,
                error_message="Query timeout"
            )]
    
    async def _execute_single_query(self, query: QueryRequest, agent: AgentConfig) -> AgentResponse:
        """Ejecutar consulta con un agente específico"""
        
        start_time = datetime.now()
        
        try:
            # Simular procesamiento del agente (en producción sería llamada HTTP real)
            await asyncio.sleep(0.1)  # Simular latencia
            
            # Crear respuesta simulada (en producción sería respuesta real del agente)
            response_data = {
                "agent_name": agent.name,
                "query": query.content,
                "result": f"Processed by {agent.name}",
                "recommendations": [
                    f"Recommendation 1 from {agent.name}",
                    f"Recommendation 2 from {agent.name}"
                ],
                "metadata": {
                    "agent_track": agent.track.value,
                    "capabilities_used": [cap.name for cap in agent.capabilities 
                                        if query.query_type in cap.supported_query_types]
                }
            }
            
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return AgentResponse(
                agent_id=agent.agent_id,
                query_id=query.query_id,
                success=True,
                response_data=response_data,
                confidence_score=0.85 + (agent.priority * 0.02),  # Simular confidence
                processing_time_ms=int(processing_time)
            )
            
        except Exception as e:
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return AgentResponse(
                agent_id=agent.agent_id,
                query_id=query.query_id,
                success=False,
                response_data={},
                confidence_score=0.0,
                processing_time_ms=int(processing_time),
                error_message=str(e)
            )
    
    def _update_agent_stats(self, response: AgentResponse):
        """Actualizar estadísticas del agente"""
        
        if response.agent_id not in self.agent_stats:
            return
        
        stats = self.agent_stats[response.agent_id]
        
        stats["total_queries"] += 1
        stats["last_used"] = datetime.now()
        
        if response.success:
            stats["successful_queries"] += 1
            
            # Actualizar tiempo de respuesta promedio
            current_avg = stats["avg_response_time"]
            total_queries = stats["total_queries"]
            stats["avg_response_time"] = (
                (current_avg * (total_queries - 1) + response.processing_time_ms) / total_queries
            )
            
            # Actualizar confidence promedio
            current_avg_conf = stats["avg_confidence"]
            stats["avg_confidence"] = (
                (current_avg_conf * (total_queries - 1) + response.confidence_score) / total_queries
            )
        else:
            stats["error_count"] += 1
    
    async def get_agent_status(self, agent_id: Optional[str] = None) -> Dict[str, Any]:
        """Obtener estado de agentes"""
        
        if agent_id:
            if agent_id not in self.agents:
                return {"error": "Agent not found"}
            
            agent = self.agents[agent_id]
            stats = self.agent_stats.get(agent_id, {})
            
            return {
                "agent_id": agent_id,
                "name": agent.name,
                "track": agent.track.value,
                "status": agent.status.value,
                "priority": agent.priority,
                "capabilities": len(agent.capabilities),
                "stats": stats
            }
        else:
            # Retornar estado de todos los agentes
            all_status = {}
            
            for agent_id, agent in self.agents.items():
                stats = self.agent_stats.get(agent_id, {})
                all_status[agent_id] = {
                    "name": agent.name,
                    "track": agent.track.value,
                    "status": agent.status.value,
                    "priority": agent.priority,
                    "capabilities": len(agent.capabilities),
                    "stats": stats
                }
            
            return {
                "total_agents": len(self.agents),
                "active_agents": len([a for a in self.agents.values() if a.status == AgentStatus.ACTIVE]),
                "agents": all_status,
                "orchestrator_initialized": self.is_initialized,
                "active_queries": len(self.active_queries)
            }
    
    async def get_recommendations(self, query_content: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Obtener recomendaciones usando múltiples agentes"""
        
        # Determinar tipo de consulta basado en el contenido
        query_type = self._determine_query_type(query_content)
        
        # Crear solicitud de consulta
        query = QueryRequest(
            query_id=str(uuid.uuid4()),
            query_type=query_type,
            content=query_content,
            context=context or {},
            priority=2
        )
        
        # Procesar consulta
        responses = await self.process_query(query)
        
        # Compilar recomendaciones
        recommendations = {
            "query_id": query.query_id,
            "query_type": query_type.value,
            "total_agents_consulted": len(responses),
            "successful_responses": len([r for r in responses if r.success]),
            "recommendations": []
        }
        
        for response in responses:
            if response.success:
                recommendations["recommendations"].append({
                    "agent_id": response.agent_id,
                    "agent_name": self.agents[response.agent_id].name if response.agent_id in self.agents else "Unknown",
                    "confidence": response.confidence_score,
                    "response_time_ms": response.processing_time_ms,
                    "data": response.response_data
                })
        
        # Ordenar por confidence score
        recommendations["recommendations"].sort(key=lambda x: x["confidence"], reverse=True)
        
        return recommendations
    
    def _determine_query_type(self, content: str) -> QueryType:
        """Determinar tipo de consulta basado en el contenido"""
        
        content_lower = content.lower()
        
        # Palabras clave para diferentes tipos de consulta
        keywords_map = {
            QueryType.BOOKING_ASSISTANCE: ["reservar", "booking", "disponibilidad", "precio", "tour"],
            QueryType.CUSTOMER_SERVICE: ["ayuda", "problema", "soporte", "cancelar", "modificar"],
            QueryType.PRICE_OPTIMIZATION: ["precio", "descuento", "oferta", "costo", "tarifa"],
            QueryType.CONTENT_GENERATION: ["contenido", "blog", "social", "marketing", "post"],
            QueryType.SECURITY_ASSESSMENT: ["seguridad", "riesgo", "seguro", "peligro"],
            QueryType.MARKET_ANALYSIS: ["mercado", "competencia", "análisis", "tendencia"],
            QueryType.SUSTAINABILITY_CHECK: ["sostenible", "ecológico", "verde", "carbono", "ambiental"],
            QueryType.CULTURAL_ADAPTATION: ["cultura", "local", "tradición", "adaptación"],
            QueryType.ROUTE_OPTIMIZATION: ["ruta", "itinerario", "optimizar", "recorrido"],
            QueryType.PERSONALIZATION: ["personalizar", "preferencia", "recomendación", "perfil"]
        }
        
        # Buscar coincidencias
        for query_type, keywords in keywords_map.items():
            if any(keyword in content_lower for keyword in keywords):
                return query_type
        
        # Tipo por defecto
        return QueryType.CUSTOMER_SERVICE

# Instancia global del orquestador
ai_orchestrator = AIAgentOrchestrator()

# Pydantic models para API
class QueryRequest_API(BaseModel):
    content: str
    query_type: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    customer_id: Optional[str] = None
    booking_id: Optional[str] = None
    priority: Optional[int] = 3

class AgentStatusResponse(BaseModel):
    agent_id: str
    name: str
    track: str
    status: str
    priority: int
    capabilities: int
    stats: Dict[str, Any]