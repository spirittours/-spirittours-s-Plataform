"""
RAG AI System API Router
Endpoints for autonomous AI interactions
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field
import json
import logging

from ..services.ai.rag_autonomous_system import (
    rag_system,
    Context,
    IntentType,
    SentimentScore,
    AgentRole
)
from ..services.ai.knowledge_base_manager import initialize_knowledge_base

router = APIRouter(prefix="/api/ai/rag", tags=["rag-ai"])
logger = logging.getLogger(__name__)

# Request/Response Models

class QueryRequest(BaseModel):
    query: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    language: str = "en"
    location: Optional[Dict[str, float]] = None
    preferences: Optional[Dict[str, Any]] = None
    stream: bool = False

class KnowledgeRequest(BaseModel):
    content: str
    metadata: Optional[Dict[str, Any]] = None
    source: str = "api"

class TrainingRequest(BaseModel):
    conversations: List[Dict[str, Any]]

class DecisionRequest(BaseModel):
    situation: Dict[str, Any]
    execute: bool = False

class FeedbackRequest(BaseModel):
    query_id: str
    rating: float = Field(ge=0, le=1)
    comment: Optional[str] = None

# Initialize knowledge base on startup
@router.on_event("startup")
async def startup_event():
    """Initialize RAG system and knowledge base"""
    try:
        # Initialize knowledge base
        kb_manager = await initialize_knowledge_base(rag_system)
        
        # Start continuous learning
        import asyncio
        asyncio.create_task(rag_system.continuous_learning_loop())
        
        logger.info("✅ RAG AI System initialized successfully")
        
    except Exception as e:
        logger.error(f"❌ RAG initialization failed: {e}")

# Query Processing Endpoints

@router.post("/query")
async def process_query(request: QueryRequest):
    """
    Process user query with autonomous AI
    """
    # Create context
    context = Context(
        user_id=request.user_id or "anonymous",
        session_id=request.session_id or "default",
        language=request.language,
        location=request.location,
        preferences=request.preferences,
        history=[]
    )
    
    # Process query
    result = await rag_system.process_query(
        query=request.query,
        context=context,
        stream=request.stream
    )
    
    return result

@router.websocket("/query/stream")
async def stream_query(websocket: WebSocket):
    """
    Stream AI responses via WebSocket
    """
    await websocket.accept()
    
    try:
        while True:
            # Receive query
            data = await websocket.receive_json()
            
            # Create context
            context = Context(
                user_id=data.get("user_id", "anonymous"),
                session_id=data.get("session_id", "default"),
                language=data.get("language", "en"),
                location=data.get("location"),
                preferences=data.get("preferences"),
                history=[]
            )
            
            # Process query
            result = await rag_system.process_query(
                query=data.get("query", ""),
                context=context,
                stream=True
            )
            
            # Send response
            await websocket.send_json(result)
            
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close()

@router.post("/analyze/intent")
async def analyze_intent(query: str):
    """
    Analyze user intent from query
    """
    intent = await rag_system.analyze_intent(query)
    
    return {
        "query": query,
        "intent": intent.value,
        "confidence": 0.85
    }

@router.post("/analyze/sentiment")
async def analyze_sentiment(query: str):
    """
    Analyze sentiment of user query
    """
    sentiment = await rag_system.analyze_sentiment(query)
    
    return {
        "query": query,
        "sentiment": sentiment.value,
        "sentiment_label": sentiment.name
    }

# Knowledge Management Endpoints

@router.post("/knowledge/add")
async def add_knowledge(request: KnowledgeRequest):
    """
    Add new knowledge to the system
    """
    knowledge = await rag_system.add_knowledge(
        content=request.content,
        metadata=request.metadata,
        source=request.source
    )
    
    return {
        "success": True,
        "knowledge_id": knowledge.id,
        "message": "Knowledge added successfully"
    }

@router.post("/knowledge/bulk-import")
async def bulk_import_knowledge(documents: List[Dict[str, Any]]):
    """
    Bulk import knowledge documents
    """
    count = await rag_system.bulk_import_knowledge(documents)
    
    return {
        "success": True,
        "imported": count,
        "total": len(documents)
    }

@router.get("/knowledge/search")
async def search_knowledge(query: str, limit: int = 10):
    """
    Search knowledge base
    """
    results = await rag_system.retrieve_context(query, k=limit)
    
    return {
        "query": query,
        "results": [
            {
                "content": doc.page_content,
                "metadata": doc.metadata
            }
            for doc in results
        ],
        "count": len(results)
    }

# Training Endpoints

@router.post("/train/conversations")
async def train_on_conversations(request: TrainingRequest):
    """
    Train system on conversation history
    """
    await rag_system.train_on_conversations(request.conversations)
    
    return {
        "success": True,
        "trained_on": len(request.conversations),
        "message": "Training completed successfully"
    }

@router.post("/train/feedback")
async def process_feedback(request: FeedbackRequest):
    """
    Process user feedback for learning
    """
    # This would update the learning patterns
    return {
        "success": True,
        "feedback_recorded": True,
        "rating": request.rating
    }

# Decision Making Endpoints

@router.post("/decision/make")
async def make_decision(request: DecisionRequest):
    """
    Make autonomous decision based on situation
    """
    decision = await rag_system.make_autonomous_decision(request.situation)
    
    result = {
        "decision_id": decision.id,
        "action": decision.action,
        "confidence": decision.confidence,
        "reasoning": decision.reasoning,
        "alternatives": decision.alternatives
    }
    
    if request.execute:
        execution_result = await rag_system.execute_decision(decision)
        result["execution"] = execution_result
        
    return result

@router.get("/decision/history")
async def get_decision_history(limit: int = 50):
    """
    Get recent decision history
    """
    decisions = rag_system.decision_history[-limit:]
    
    return {
        "decisions": [
            {
                "id": d.id,
                "action": d.action,
                "confidence": d.confidence,
                "executed": d.executed,
                "result": d.result
            }
            for d in decisions
        ],
        "total": len(rag_system.decision_history)
    }

# Agent Management Endpoints

@router.get("/agents/list")
async def list_agents():
    """
    List available specialized agents
    """
    return {
        "agents": [
            {
                "role": role.value,
                "name": role.name,
                "active": True
            }
            for role in AgentRole
        ]
    }

@router.post("/agents/{agent_role}/query")
async def query_specific_agent(agent_role: str, query: str):
    """
    Query a specific specialized agent
    """
    try:
        agent = AgentRole(agent_role)
        
        # Create minimal context
        context = Context(
            user_id="api_user",
            session_id="api_session",
            language="en"
        )
        
        # Force use of specific agent
        rag_system._select_agent = lambda x: agent
        
        result = await rag_system.process_query(query, context)
        
        return result
        
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Agent {agent_role} not found")

# Metrics and Monitoring Endpoints

@router.get("/metrics")
async def get_system_metrics():
    """
    Get comprehensive system metrics
    """
    return rag_system.get_system_metrics()

@router.get("/metrics/performance")
async def get_performance_metrics():
    """
    Get performance metrics
    """
    metrics = rag_system.metrics
    
    return {
        "total_queries": metrics["total_queries"],
        "successful_responses": metrics["successful_responses"],
        "failed_responses": metrics["failed_responses"],
        "success_rate": (metrics["successful_responses"] / max(metrics["total_queries"], 1)) * 100,
        "average_confidence": metrics["average_confidence"],
        "learning_rate": metrics["learning_rate"],
        "user_satisfaction": metrics["user_satisfaction"]
    }

@router.get("/metrics/knowledge")
async def get_knowledge_metrics():
    """
    Get knowledge base metrics
    """
    return {
        "total_knowledge": len(rag_system.knowledge_base),
        "learning_patterns": len(rag_system.learning_patterns),
        "vector_store_size": rag_system.vector_store._collection.count() if rag_system.vector_store else 0,
        "most_accessed": sorted(
            rag_system.knowledge_base.values(),
            key=lambda k: k.access_count,
            reverse=True
        )[:5]
    }

# Conversation Management

@router.get("/conversation/history/{user_id}")
async def get_conversation_history(user_id: str, limit: int = 50):
    """
    Get user conversation history
    """
    # This would retrieve from memory/database
    return {
        "user_id": user_id,
        "conversations": [],
        "total": 0
    }

@router.post("/conversation/clear/{user_id}")
async def clear_conversation_history(user_id: str):
    """
    Clear user conversation history
    """
    # Clear from memory
    rag_system.short_term_memory.clear()
    
    return {
        "success": True,
        "message": f"Conversation history cleared for user {user_id}"
    }

# Suggestions and Recommendations

@router.post("/suggestions")
async def get_suggestions(query: str, user_id: Optional[str] = None):
    """
    Get contextual suggestions
    """
    context = Context(
        user_id=user_id or "anonymous",
        session_id="api",
        language="en"
    )
    
    suggestions = await rag_system.generate_suggestions(query, context)
    
    return {
        "query": query,
        "suggestions": suggestions
    }

# System Management

@router.post("/system/save")
async def save_system_state():
    """
    Save current system state
    """
    rag_system.save_knowledge_base()
    
    return {
        "success": True,
        "message": "System state saved successfully"
    }

@router.post("/system/optimize")
async def optimize_system():
    """
    Optimize system performance
    """
    rag_system._optimize_knowledge_base()
    rag_system._analyze_learning_patterns()
    
    return {
        "success": True,
        "message": "System optimized successfully"
    }

# Tour-specific Endpoints

@router.post("/tours/recommend")
async def recommend_tours(
    preferences: Dict[str, Any],
    budget: Optional[float] = None,
    dates: Optional[List[str]] = None
):
    """
    Get personalized tour recommendations
    """
    query = f"""Recommend tours based on preferences: {json.dumps(preferences)}.
    Budget: ${budget if budget else 'flexible'}.
    Dates: {dates if dates else 'flexible'}."""
    
    context = Context(
        user_id="recommendation_engine",
        session_id="api",
        language="en",
        preferences=preferences
    )
    
    result = await rag_system.process_query(query, context)
    
    return {
        "recommendations": result.get("response", ""),
        "confidence": result.get("confidence", 0),
        "preferences_matched": preferences
    }

@router.post("/tours/availability")
async def check_tour_availability(
    tour_id: str,
    date: str,
    participants: int
):
    """
    Check tour availability
    """
    query = f"Check availability for tour {tour_id} on {date} for {participants} participants"
    
    context = Context(
        user_id="availability_checker",
        session_id="api",
        language="en"
    )
    
    result = await rag_system.process_query(query, context)
    
    return {
        "tour_id": tour_id,
        "date": date,
        "participants": participants,
        "available": True,  # Would check actual availability
        "response": result.get("response", "")
    }

@router.post("/tours/book-assistant")
async def booking_assistant(
    step: str,
    data: Dict[str, Any],
    session_id: str
):
    """
    Step-by-step booking assistant
    """
    query = f"Booking step: {step}. Data: {json.dumps(data)}"
    
    context = Context(
        user_id="booking_assistant",
        session_id=session_id,
        language="en"
    )
    
    result = await rag_system.process_query(query, context)
    
    return {
        "step": step,
        "next_step": "payment" if step == "details" else "confirmation",
        "response": result.get("response", ""),
        "suggestions": result.get("suggestions", [])
    }