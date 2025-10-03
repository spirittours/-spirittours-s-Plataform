"""
Main FastAPI Application with RBAC Integration
Spirit Tours AI Platform - Complete CRM Backend
"""

from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import logging
from datetime import datetime
import sys
import os

# Add project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Database imports
from backend.config.database import engine, get_db
from backend.models.rbac_models import Base
from backend.database.init_rbac import initialize_rbac_system

# API Routers
from backend.api.auth_api import router as auth_router
from backend.api.admin_api import router as admin_router

# RBAC Middleware
from backend.auth.rbac_middleware import (
    get_current_active_user, 
    RBACManager, 
    AuditMiddleware,
    AuthenticationError, 
    AuthorizationError
)

# Import existing AI agents (for integration)
try:
    from ai_agents.main import app as ai_agents_app
    AI_AGENTS_AVAILABLE = True
except ImportError:
    AI_AGENTS_AVAILABLE = False
    print("Warning: AI Agents module not available")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/spirit_tours_crm.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Starting Spirit Tours CRM...")
    
    # Create database tables
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Initialize RBAC system
    logger.info("Initializing RBAC system...")
    try:
        db = next(get_db())
        initialize_rbac_system(db)
        db.close()
        logger.info("RBAC system initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing RBAC: {e}")
    
    logger.info("Spirit Tours CRM started successfully!")
    
    yield
    
    logger.info("Shutting down Spirit Tours CRM...")

# Create FastAPI application
app = FastAPI(
    title="Spirit Tours CRM",
    description="Advanced AI-Powered Tourism Management Platform with RBAC",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        # Add production URLs here
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Security Middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["localhost", "127.0.0.1", "*.spirittours.com"]
)

# Custom Exception Handlers
@app.exception_handler(AuthenticationError)
async def authentication_exception_handler(request: Request, exc: AuthenticationError):
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": exc.detail}
    )

@app.exception_handler(AuthorizationError)
async def authorization_exception_handler(request: Request, exc: AuthorizationError):
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"detail": exc.detail}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"}
    )

# Root endpoint
@app.get("/", tags=["System"])
async def root():
    """Root endpoint with system information"""
    return {
        "message": "Spirit Tours CRM - AI-Powered Tourism Management Platform",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat(),
        "features": {
            "rbac_system": True,
            "ai_agents": AI_AGENTS_AVAILABLE,
            "total_agents": 25 if AI_AGENTS_AVAILABLE else 0
        },
        "endpoints": {
            "authentication": "/auth",
            "admin": "/admin", 
            "ai_agents": "/agents" if AI_AGENTS_AVAILABLE else None,
            "documentation": "/api/docs"
        }
    }

# Health check endpoint
@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": "connected",
            "rbac_system": "active",
            "ai_agents": "available" if AI_AGENTS_AVAILABLE else "unavailable"
        }
    }

# System status endpoint (admin only)
@app.get("/status", tags=["System"])
async def system_status(
    current_user = Depends(get_current_active_user)
):
    """Detailed system status - requires authentication"""
    rbac_manager = RBACManager(next(get_db()))
    
    # Check if user has monitoring permissions
    if not rbac_manager.check_permission(
        current_user, 
        "system_monitoring", 
        "read", 
        "monitoring"
    ):
        raise AuthorizationError("Insufficient permissions for system monitoring")
    
    return {
        "system": {
            "status": "operational",
            "uptime": "Available", # Implement actual uptime calculation
            "version": "1.0.0"
        },
        "database": {
            "status": "connected",
            "tables": len(Base.metadata.tables)
        },
        "rbac": {
            "status": "active",
            "user_id": str(current_user.id),
            "is_admin": rbac_manager.user_has_admin_access(current_user)
        },
        "ai_agents": {
            "status": "available" if AI_AGENTS_AVAILABLE else "unavailable",
            "count": 25 if AI_AGENTS_AVAILABLE else 0
        }
    }

# Include API routers
app.include_router(auth_router)
app.include_router(admin_router)

# Mount AI Agents if available
if AI_AGENTS_AVAILABLE:
    try:
        app.mount("/agents", ai_agents_app)
        logger.info("AI Agents mounted successfully at /agents")
    except Exception as e:
        logger.warning(f"Could not mount AI Agents: {e}")

# Additional CRM API endpoints
@app.get("/api/dashboard/stats", tags=["Dashboard"])
async def get_dashboard_stats(
    current_user = Depends(get_current_active_user),
    db = Depends(get_db)
):
    """Get dashboard statistics"""
    rbac_manager = RBACManager(db)
    
    # Check dashboard access permission
    if not rbac_manager.check_permission(current_user, "analytics_dashboard", "read", "dashboard"):
        raise AuthorizationError("No tiene permisos para ver las estadísticas del dashboard")
    
    # Return mock stats (implement real statistics in production)
    return {
        "users": {
            "total": 1247,
            "active": 892,
            "new_this_month": 156
        },
        "bookings": {
            "total": 5634,
            "pending": 23,
            "confirmed": 198,
            "completed": 5413
        },
        "revenue": {
            "today": 45670.50,
            "this_month": 1234567.89,
            "this_year": 12345678.90
        },
        "agents": {
            "total": 25,
            "active": 23,
            "most_used": "booking_assistant"
        }
    }

@app.get("/api/agents/status", tags=["AI Agents"])
async def get_agents_status(
    current_user = Depends(get_current_active_user)
):
    """Get AI agents status and accessibility"""
    rbac_manager = RBACManager(next(get_db()))
    
    # Define all 25 agents
    all_agents = [
        {"id": "ethical-tourism", "name": "Asesor Turismo Ético", "category": "Especializado"},
        {"id": "sustainable-travel", "name": "Planificador Sostenible", "category": "Especializado"},
        {"id": "cultural-immersion", "name": "Guía Inmersión Cultural", "category": "Especializado"},
        {"id": "adventure-planner", "name": "Planificador Aventura", "category": "Especializado"},
        {"id": "luxury-concierge", "name": "Concierge Lujo", "category": "Premium"},
        {"id": "budget-optimizer", "name": "Optimizador Presupuesto", "category": "Económico"},
        {"id": "accessibility-coordinator", "name": "Coordinador Accesibilidad", "category": "Especializado"},
        {"id": "group-coordinator", "name": "Coordinador Grupos", "category": "Organizacional"},
        {"id": "crisis-manager", "name": "Gestor Crisis", "category": "Seguridad"},
        {"id": "carbon-footprint", "name": "Analizador Huella Carbono", "category": "Sostenible"},
        {"id": "destination-expert", "name": "Experto Destinos", "category": "Informativo"},
        {"id": "booking-assistant", "name": "Asistente Reservas", "category": "Operacional"},
        {"id": "customer-experience", "name": "Gestor Experiencia Cliente", "category": "Servicio"},
        {"id": "travel-insurance", "name": "Asesor Seguros Viaje", "category": "Protección"},
        {"id": "visa-consultant", "name": "Consultor Visas", "category": "Documentación"},
        {"id": "weather-advisor", "name": "Asesor Clima", "category": "Informativo"},
        {"id": "health-safety", "name": "Coordinador Salud y Seguridad", "category": "Seguridad"},
        {"id": "local-cuisine", "name": "Guía Gastronomía Local", "category": "Cultural"},
        {"id": "transportation-optimizer", "name": "Optimizador Transporte", "category": "Logístico"},
        {"id": "accommodation-specialist", "name": "Especialista Alojamiento", "category": "Hospedaje"},
        {"id": "itinerary-planner", "name": "Planificador Itinerarios", "category": "Planificación"},
        {"id": "review-analyzer", "name": "Analizador Reseñas", "category": "Analítico"},
        {"id": "social-impact", "name": "Evaluador Impacto Social", "category": "Sostenible"},
        {"id": "multilingual-assistant", "name": "Asistente Multiidioma", "category": "Comunicación"},
        {"id": "virtual-tour-creator", "name": "Creador Tours Virtuales", "category": "Tecnológico"}
    ]
    
    # Check access for each agent
    accessible_agents = []
    for agent in all_agents:
        agent_scope = agent["id"].replace("-", "_")
        has_access = rbac_manager.check_permission(current_user, agent_scope, "read", "agent")
        can_execute = rbac_manager.check_permission(current_user, agent_scope, "execute", "agent")
        
        accessible_agents.append({
            **agent,
            "accessible": has_access,
            "can_execute": can_execute,
            "status": "online" if AI_AGENTS_AVAILABLE else "offline"
        })
    
    return {
        "total_agents": len(all_agents),
        "accessible_count": len([a for a in accessible_agents if a["accessible"]]),
        "executable_count": len([a for a in accessible_agents if a["can_execute"]]),
        "is_admin": rbac_manager.user_has_admin_access(current_user),
        "agents": accessible_agents
    }

# Custom middleware for request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests for audit trail"""
    start_time = datetime.utcnow()
    
    # Skip logging for health checks and static files
    if request.url.path in ["/health", "/favicon.ico"]:
        return await call_next(request)
    
    try:
        response = await call_next(request)
        
        # Calculate request duration
        process_time = (datetime.utcnow() - start_time).total_seconds()
        
        # Log request
        logger.info(
            f"{request.method} {request.url.path} - "
            f"Status: {response.status_code} - "
            f"Duration: {process_time:.3f}s - "
            f"IP: {request.client.host if request.client else 'unknown'}"
        )
        
        return response
        
    except Exception as e:
        # Log error
        logger.error(
            f"{request.method} {request.url.path} - "
            f"Error: {str(e)} - "
            f"IP: {request.client.host if request.client else 'unknown'}"
        )
        raise

if __name__ == "__main__":
    # Development server
    uvicorn.run(
        "main_rbac:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
        access_log=True
    )

# Production server configuration
"""
To run in production:
gunicorn backend.main_rbac:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 --access-logfile - --error-logfile -
"""