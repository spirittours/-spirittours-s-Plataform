#!/usr/bin/env python3
"""
AI Orchestrator API
API para gestión y coordinación de los 25 Agentes IA
"""

from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

# Import database and AI orchestrator
from config.database import get_db
# from ai_manager import ai_orchestrator, QueryRequest_API, AgentStatusResponse, QueryType  # TODO: Fix import when ai_manager is available

router = APIRouter(prefix="/api/v1/ai", tags=["AI Orchestrator"])

# ============================
# PYDANTIC MODELS
# ============================

class ProcessQueryRequest(BaseModel):
    """Request para procesar consulta con agentes IA"""
    content: str = Field(..., description="Contenido de la consulta")
    query_type: Optional[str] = Field(None, description="Tipo específico de consulta")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)
    customer_id: Optional[str] = Field(None, description="ID del cliente")
    booking_id: Optional[str] = Field(None, description="ID de la reserva")
    priority: int = Field(3, ge=1, le=5, description="Prioridad (1=máxima, 5=mínima)")
    max_response_time: int = Field(30, ge=5, le=60, description="Tiempo máximo de respuesta en segundos")

class AgentRecommendation(BaseModel):
    """Recomendación de un agente IA"""
    agent_id: str
    agent_name: str
    confidence: float
    response_time_ms: int
    data: Dict[str, Any]

class RecommendationsResponse(BaseModel):
    """Respuesta con recomendaciones de múltiples agentes"""
    query_id: str
    query_type: str
    total_agents_consulted: int
    successful_responses: int
    recommendations: List[AgentRecommendation]

class OrchestratorStatus(BaseModel):
    """Estado del orquestador"""
    total_agents: int
    active_agents: int
    orchestrator_initialized: bool
    active_queries: int
    agents: Dict[str, Dict[str, Any]]

# ============================
# API ENDPOINTS
# ============================

@router.get("/status", response_model=OrchestratorStatus)
async def get_orchestrator_status():
    """
    Obtener estado completo del orquestador de IA
    """
    try:
        status_data = await ai_orchestrator.get_agent_status()
        
        return OrchestratorStatus(
            total_agents=status_data["total_agents"],
            active_agents=status_data["active_agents"], 
            orchestrator_initialized=status_data["orchestrator_initialized"],
            active_queries=status_data["active_queries"],
            agents=status_data["agents"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving orchestrator status: {str(e)}"
        )

@router.get("/agents", response_model=Dict[str, Any])
async def list_agents(
    track: Optional[str] = Query(None, description="Filtrar por track (track_1, track_2, track_3)"),
    status_filter: Optional[str] = Query(None, description="Filtrar por estado (active, inactive)")
):
    """
    Listar todos los agentes IA disponibles con filtros opcionales
    """
    try:
        all_status = await ai_orchestrator.get_agent_status()
        agents = all_status["agents"]
        
        # Aplicar filtros
        if track:
            agents = {k: v for k, v in agents.items() if track in v["track"]}
        
        if status_filter:
            agents = {k: v for k, v in agents.items() if v["status"] == status_filter}
        
        return {
            "total_agents": len(agents),
            "filters_applied": {
                "track": track,
                "status": status_filter
            },
            "agents": agents
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error listing agents: {str(e)}"
        )

@router.get("/agents/{agent_id}", response_model=Dict[str, Any])
async def get_agent_details(agent_id: str):
    """
    Obtener detalles específicos de un agente IA
    """
    try:
        agent_status = await ai_orchestrator.get_agent_status(agent_id)
        
        if "error" in agent_status:
            raise HTTPException(
                status_code=404,
                detail=f"Agent {agent_id} not found"
            )
        
        return agent_status
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving agent details: {str(e)}"
        )

@router.post("/query", response_model=RecommendationsResponse)
async def process_ai_query(
    query_request: ProcessQueryRequest,
    db: Session = Depends(get_db)
):
    """
    Procesar consulta utilizando múltiples agentes IA
    """
    try:
        # Asegurar que el orquestador está inicializado
        if not ai_orchestrator.is_initialized:
            await ai_orchestrator.initialize()
        
        # Obtener recomendaciones
        recommendations = await ai_orchestrator.get_recommendations(
            query_content=query_request.content,
            context={
                **query_request.context,
                "customer_id": query_request.customer_id,
                "booking_id": query_request.booking_id,
                "priority": query_request.priority
            }
        )
        
        # Convertir a formato de respuesta
        agent_recommendations = []
        for rec in recommendations["recommendations"]:
            agent_recommendations.append(
                AgentRecommendation(
                    agent_id=rec["agent_id"],
                    agent_name=rec["agent_name"],
                    confidence=rec["confidence"],
                    response_time_ms=rec["response_time_ms"],
                    data=rec["data"]
                )
            )
        
        return RecommendationsResponse(
            query_id=recommendations["query_id"],
            query_type=recommendations["query_type"],
            total_agents_consulted=recommendations["total_agents_consulted"],
            successful_responses=recommendations["successful_responses"],
            recommendations=agent_recommendations
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing AI query: {str(e)}"
        )

@router.post("/recommendations")
async def get_personalized_recommendations(
    request_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Obtener recomendaciones personalizadas basadas en contexto del cliente
    """
    try:
        query_content = request_data.get("query", "Necesito recomendaciones personalizadas")
        context = request_data.get("context", {})
        
        # Enriquecer contexto si hay customer_id
        customer_id = context.get("customer_id")
        if customer_id:
            # TODO: Obtener datos del cliente de la BD para enriquecer contexto
            context["customer_enriched"] = True
        
        recommendations = await ai_orchestrator.get_recommendations(
            query_content=query_content,
            context=context
        )
        
        # Procesar recomendaciones específicamente para personalización
        processed_recommendations = []
        
        for rec in recommendations["recommendations"]:
            if rec["confidence"] > 0.7:  # Solo recomendaciones con alta confianza
                processed_rec = {
                    "agent": rec["agent_name"],
                    "type": "personalized_recommendation",
                    "confidence": rec["confidence"],
                    "recommendations": rec["data"].get("recommendations", []),
                    "metadata": rec["data"].get("metadata", {})
                }
                processed_recommendations.append(processed_rec)
        
        return {
            "query_id": recommendations["query_id"],
            "personalization_score": sum(rec["confidence"] for rec in processed_recommendations) / len(processed_recommendations) if processed_recommendations else 0,
            "recommendations": processed_recommendations,
            "total_agents_used": len(processed_recommendations)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating personalized recommendations: {str(e)}"
        )

@router.post("/agents/{agent_id}/query")
async def query_specific_agent(
    agent_id: str,
    query_request: ProcessQueryRequest
):
    """
    Consultar un agente específico directamente
    """
    try:
        # Verificar que el agente existe
        agent_status = await ai_orchestrator.get_agent_status(agent_id)
        if "error" in agent_status:
            raise HTTPException(
                status_code=404,
                detail=f"Agent {agent_id} not found"
            )
        
        # TODO: Implementar consulta directa a agente específico
        # Por ahora retornamos respuesta simulada
        
        return {
            "agent_id": agent_id,
            "agent_name": agent_status["name"],
            "query": query_request.content,
            "response": {
                "success": True,
                "result": f"Response from {agent_status['name']}",
                "confidence": 0.88,
                "processing_time_ms": 250,
                "recommendations": [
                    f"Specific recommendation 1 from {agent_status['name']}",
                    f"Specific recommendation 2 from {agent_status['name']}"
                ]
            },
            "timestamp": "2024-12-20T14:30:00Z"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error querying specific agent: {str(e)}"
        )

@router.get("/analytics")
async def get_ai_analytics():
    """
    Obtener analytics y métricas de uso de los agentes IA
    """
    try:
        status_data = await ai_orchestrator.get_agent_status()
        agents = status_data["agents"]
        
        # Calcular métricas agregadas
        total_queries = sum(agent.get("stats", {}).get("total_queries", 0) for agent in agents.values())
        successful_queries = sum(agent.get("stats", {}).get("successful_queries", 0) for agent in agents.values())
        
        success_rate = (successful_queries / total_queries * 100) if total_queries > 0 else 0
        
        # Agentes más utilizados
        most_used_agents = sorted(
            [(agent_id, agent.get("stats", {}).get("total_queries", 0)) 
             for agent_id, agent in agents.items()],
            key=lambda x: x[1],
            reverse=True
        )[:5]
        
        # Agentes más rápidos
        fastest_agents = []
        for agent_id, agent in agents.items():
            avg_time = agent.get("stats", {}).get("avg_response_time", 0)
            if avg_time > 0:
                fastest_agents.append((agent_id, avg_time))
        
        fastest_agents = sorted(fastest_agents, key=lambda x: x[1])[:5]
        
        # Distribución por tracks
        track_distribution = {}
        for agent in agents.values():
            track = agent["track"]
            track_distribution[track] = track_distribution.get(track, 0) + 1
        
        return {
            "overview": {
                "total_agents": status_data["total_agents"],
                "active_agents": status_data["active_agents"],
                "total_queries_processed": total_queries,
                "successful_queries": successful_queries,
                "success_rate_percentage": round(success_rate, 2),
                "active_queries": status_data["active_queries"]
            },
            "performance": {
                "most_used_agents": [{"agent_id": aid, "queries": count} for aid, count in most_used_agents],
                "fastest_agents": [{"agent_id": aid, "avg_response_ms": time} for aid, time in fastest_agents]
            },
            "distribution": {
                "by_track": track_distribution,
                "by_status": {
                    "active": len([a for a in agents.values() if a["status"] == "active"]),
                    "inactive": len([a for a in agents.values() if a["status"] == "inactive"])
                }
            },
            "timestamp": "2024-12-20T14:30:00Z"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving AI analytics: {str(e)}"
        )

@router.post("/initialize")
async def initialize_orchestrator():
    """
    Inicializar o reinicializar el orquestador de IA
    """
    try:
        success = await ai_orchestrator.initialize()
        
        if success:
            status = await ai_orchestrator.get_agent_status()
            return {
                "initialized": True,
                "total_agents": status["total_agents"],
                "active_agents": status["active_agents"],
                "message": "AI Orchestrator initialized successfully"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to initialize AI Orchestrator"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error initializing orchestrator: {str(e)}"
        )

@router.get("/capabilities")
async def get_system_capabilities():
    """
    Obtener capacidades completas del sistema de IA
    """
    try:
        # Obtener todos los tipos de query soportados
        query_types = [qt.value for qt in QueryType]
        
        # Obtener agentes y sus capacidades
        status_data = await ai_orchestrator.get_agent_status()
        agents = status_data["agents"]
        
        # Mapear capacidades por tipo de query
        capabilities_map = {}
        for query_type in query_types:
            capabilities_map[query_type] = {
                "available_agents": 0,
                "agent_names": []
            }
        
        # TODO: Implementar mapeo real de capacidades
        # Por ahora retornamos estructura básica
        
        return {
            "system_version": "2.0.0",
            "total_agents": status_data["total_agents"],
            "active_agents": status_data["active_agents"],
            "supported_query_types": query_types,
            "tracks": {
                "track_1": "Customer & Revenue Excellence",
                "track_2": "Security & Market Intelligence", 
                "track_3": "Ethics & Sustainability"
            },
            "capabilities_overview": {
                "multilingual_support": True,
                "real_time_processing": True,
                "parallel_queries": True,
                "personalization": True,
                "analytics": True
            },
            "performance_metrics": {
                "avg_response_time_ms": 500,
                "max_concurrent_queries": 100,
                "uptime_percentage": 99.9
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving system capabilities: {str(e)}"
        )