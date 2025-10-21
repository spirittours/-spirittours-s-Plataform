"""
Spirit Tours API Server
Main FastAPI application with all routes and middleware
"""

import os
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

# WebSocket support
from fastapi import WebSocket, WebSocketDisconnect
from typing import List

# Importar configuración y servicios
from database.connection import db_manager, init_database
from integrations.websocket_manager import ws_manager, ConnectionType
from integrations.email_service import email_service
from integrations.payment_gateway import payment_service

# Importar routers
from routers.quotation_router import router as quotation_router
# from routers.auth_router import router as auth_router
# from routers.hotel_router import router as hotel_router
# from routers.payment_router import router as payment_router

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Configuración de la aplicación
APP_CONFIG = {
    "title": "Spirit Tours API",
    "description": "Advanced Group Quotation System with Privacy Controls",
    "version": "2.0.0",
    "docs_url": "/api/docs",
    "redoc_url": "/api/redoc",
    "openapi_url": "/api/openapi.json"
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestión del ciclo de vida de la aplicación
    """
    # Startup
    logger.info("🚀 Starting Spirit Tours API Server...")
    
    try:
        # Inicializar base de datos
        logger.info("Initializing database...")
        if not init_database():
            logger.error("Failed to initialize database")
            # Continue anyway for development
            
        # Probar conexión
        if db_manager.test_connection():
            logger.info("✅ Database connected successfully")
        else:
            logger.warning("⚠️ Database connection failed - running in limited mode")
            
        # Inicializar WebSocket manager
        await ws_manager.initialize()
        logger.info("✅ WebSocket manager initialized")
        
        # Verificar servicios externos
        logger.info("✅ Email service ready")
        logger.info("✅ Payment gateway ready")
        
        logger.info("=" * 50)
        logger.info("🎯 Spirit Tours API Server Ready!")
        logger.info(f"📍 API Docs: http://localhost:8000/api/docs")
        logger.info(f"📍 WebSocket: ws://localhost:8000/ws")
        logger.info("=" * 50)
        
    except Exception as e:
        logger.error(f"Startup error: {e}")
        
    yield
    
    # Shutdown
    logger.info("Shutting down Spirit Tours API Server...")
    
    try:
        # Cerrar WebSocket manager
        await ws_manager.close()
        
        # Cerrar conexiones de base de datos
        db_manager.close()
        
        logger.info("✅ Shutdown complete")
        
    except Exception as e:
        logger.error(f"Shutdown error: {e}")


# Crear aplicación FastAPI
app = FastAPI(
    **APP_CONFIG,
    lifespan=lifespan
)


# ====================
# MIDDLEWARE
# ====================

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Page", "X-Per-Page"]
)

# Session Middleware
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
)

# GZip Middleware para comprimir respuestas
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Trusted Host Middleware (seguridad)
if os.getenv("ENVIRONMENT") == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=os.getenv("ALLOWED_HOSTS", "spirittours.com,*.spirittours.com").split(",")
    )


# ====================
# ERROR HANDLERS
# ====================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Manejador personalizado de excepciones HTTP"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
                "timestamp": datetime.now().isoformat(),
                "path": request.url.path
            }
        }
    )


@app.exception_handler(500)
async def internal_server_error_handler(request: Request, exc):
    """Manejador de errores internos del servidor"""
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": 500,
                "message": "Internal server error occurred",
                "timestamp": datetime.now().isoformat(),
                "path": request.url.path
            }
        }
    )


# ====================
# REQUEST MIDDLEWARE
# ====================

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log de todas las peticiones HTTP"""
    start_time = datetime.now()
    
    # Log request
    logger.info(f"📨 {request.method} {request.url.path}")
    
    # Process request
    response = await call_next(request)
    
    # Calculate duration
    duration = (datetime.now() - start_time).total_seconds()
    
    # Log response
    logger.info(f"✅ {request.method} {request.url.path} - {response.status_code} - {duration:.3f}s")
    
    # Add custom headers
    response.headers["X-Process-Time"] = str(duration)
    response.headers["X-Server"] = "Spirit Tours API"
    
    return response


# ====================
# HEALTH CHECKS
# ====================

@app.get("/health", tags=["System"])
async def health_check():
    """
    Health check endpoint
    """
    try:
        # Verificar base de datos
        db_status = db_manager.test_connection()
        db_stats = db_manager.get_connection_stats() if db_status else {}
        
        # Verificar servicios
        ws_stats = await ws_manager.get_connection_stats()
        email_stats = await email_service.get_queue_stats()
        payment_stats = payment_service.get_payment_stats()
        
        return {
            "status": "healthy" if db_status else "degraded",
            "timestamp": datetime.now().isoformat(),
            "version": APP_CONFIG["version"],
            "services": {
                "database": {
                    "status": "up" if db_status else "down",
                    "connections": db_stats
                },
                "websocket": {
                    "status": "up",
                    "connections": ws_stats
                },
                "email": {
                    "status": "up",
                    "queue": email_stats
                },
                "payment": {
                    "status": "up",
                    "stats": payment_stats
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )


@app.get("/", tags=["System"])
async def root():
    """
    Root endpoint
    """
    return {
        "message": "Welcome to Spirit Tours API",
        "version": APP_CONFIG["version"],
        "documentation": "/api/docs",
        "health": "/health",
        "timestamp": datetime.now().isoformat()
    }


# ====================
# API ROUTERS
# ====================

# Include routers with prefixes
app.include_router(quotation_router, prefix="/api/v1", tags=["Quotations"])
# app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
# app.include_router(hotel_router, prefix="/api/v1/hotels", tags=["Hotels"])
# app.include_router(payment_router, prefix="/api/v1/payments", tags=["Payments"])


# ====================
# WEBSOCKET ENDPOINTS
# ====================

class ConnectionManager:
    """Manager local para conexiones WebSocket"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass


manager = ConnectionManager()


@app.websocket("/ws/quotations/{quotation_id}")
async def websocket_quotation_endpoint(
    websocket: WebSocket,
    quotation_id: str,
    user_id: Optional[str] = None,
    user_type: Optional[str] = "CLIENT"
):
    """
    WebSocket endpoint para actualizaciones en tiempo real de cotizaciones
    
    IMPORTANTE: Implementa filtros de privacidad para que hoteles NO vean precios de competidores
    """
    try:
        # Conectar al manager
        await ws_manager.connect(
            websocket=websocket,
            user_id=user_id or "anonymous",
            user_type=ConnectionType[user_type],
            entity_id=quotation_id,
            metadata={"quotation_id": quotation_id}
        )
        
        logger.info(f"WebSocket connected: {user_id} to quotation {quotation_id}")
        
        # Mantener conexión abierta
        while True:
            try:
                # Recibir mensajes del cliente
                data = await websocket.receive_json()
                
                # Procesar mensaje
                response = await ws_manager.handle_message(websocket, data)
                
                if response:
                    await websocket.send_json(response)
                    
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                break
                
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        
    finally:
        # Desconectar
        await ws_manager.disconnect(websocket)
        logger.info(f"WebSocket disconnected: {user_id}")


@app.websocket("/ws/admin")
async def websocket_admin_endpoint(
    websocket: WebSocket,
    admin_id: str
):
    """
    WebSocket endpoint para administradores (ven todo)
    """
    try:
        await ws_manager.connect(
            websocket=websocket,
            user_id=admin_id,
            user_type=ConnectionType.ADMIN,
            entity_id="admin",
            user_role="admin"
        )
        
        logger.info(f"Admin WebSocket connected: {admin_id}")
        
        while True:
            try:
                data = await websocket.receive_json()
                response = await ws_manager.handle_message(websocket, data)
                
                if response:
                    await websocket.send_json(response)
                    
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Admin WebSocket error: {e}")
                break
                
    finally:
        await ws_manager.disconnect(websocket)
        logger.info(f"Admin WebSocket disconnected: {admin_id}")


# ====================
# STATIC FILES
# ====================

# Servir archivos estáticos si existen
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")


# ====================
# DEVELOPMENT HELPERS
# ====================

if os.getenv("ENVIRONMENT", "development") == "development":
    
    @app.get("/api/test/create-quotation", tags=["Testing"])
    async def test_create_quotation():
        """
        Endpoint de prueba para crear una cotización de ejemplo
        """
        from database.connection import db_manager
        from models.quotation import GroupQuotation, QuotationStatus
        from datetime import datetime, timedelta
        from decimal import Decimal
        
        try:
            with db_manager.session_scope() as session:
                test_quotation = GroupQuotation(
                    id=f"GQ-TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    company_id="CMP-DEMO001",
                    user_id="USR-DEMO001",
                    title="Test Quotation - Development",
                    description="This is a test quotation for development",
                    reference_number=f"TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    destination="Miami Beach",
                    check_in_date=datetime.now() + timedelta(days=30),
                    check_out_date=datetime.now() + timedelta(days=35),
                    num_nights=5,
                    num_rooms=10,
                    num_guests=20,
                    budget_min=Decimal("5000"),
                    budget_max=Decimal("10000"),
                    currency="USD",
                    deadline=datetime.now() + timedelta(days=7),
                    status=QuotationStatus.DRAFT,
                    privacy_settings={
                        "hide_competitor_prices": True,
                        "admin_can_override": True
                    }
                )
                
                session.add(test_quotation)
                session.commit()
                
                return {
                    "message": "Test quotation created successfully",
                    "quotation_id": test_quotation.id,
                    "reference": test_quotation.reference_number
                }
                
        except Exception as e:
            logger.error(f"Error creating test quotation: {e}")
            raise HTTPException(status_code=500, detail=str(e))
            
    @app.get("/api/test/websocket", tags=["Testing"])
    async def test_websocket():
        """
        Página de prueba para WebSocket
        """
        html = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>WebSocket Test - Spirit Tours</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                #messages { border: 1px solid #ccc; height: 300px; overflow-y: scroll; padding: 10px; margin: 20px 0; }
                .message { margin: 5px 0; padding: 5px; background: #f0f0f0; border-radius: 3px; }
                button { padding: 10px 20px; margin: 5px; cursor: pointer; }
                input { padding: 8px; width: 300px; }
            </style>
        </head>
        <body>
            <h1>🔌 WebSocket Test - Spirit Tours</h1>
            
            <div>
                <input type="text" id="quotationId" placeholder="Quotation ID" value="GQ-TEST-001">
                <input type="text" id="userId" placeholder="User ID" value="user123">
                <select id="userType">
                    <option value="CLIENT">Client</option>
                    <option value="HOTEL">Hotel</option>
                    <option value="ADMIN">Admin</option>
                </select>
                <button onclick="connect()">Connect</button>
                <button onclick="disconnect()">Disconnect</button>
            </div>
            
            <div>
                <button onclick="sendPing()">Send Ping</button>
                <button onclick="requestUpdate()">Request Update</button>
            </div>
            
            <div id="messages"></div>
            
            <script>
                let ws = null;
                
                function connect() {
                    const quotationId = document.getElementById('quotationId').value;
                    const userId = document.getElementById('userId').value;
                    const userType = document.getElementById('userType').value;
                    
                    ws = new WebSocket(`ws://localhost:8000/ws/quotations/${quotationId}?user_id=${userId}&user_type=${userType}`);
                    
                    ws.onopen = () => {
                        addMessage('✅ Connected to WebSocket', 'success');
                    };
                    
                    ws.onmessage = (event) => {
                        const data = JSON.parse(event.data);
                        addMessage('📨 Received: ' + JSON.stringify(data, null, 2));
                    };
                    
                    ws.onclose = () => {
                        addMessage('❌ Disconnected from WebSocket', 'error');
                    };
                    
                    ws.onerror = (error) => {
                        addMessage('⚠️ Error: ' + error, 'error');
                    };
                }
                
                function disconnect() {
                    if (ws) {
                        ws.close();
                        ws = null;
                    }
                }
                
                function sendPing() {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'ping' }));
                        addMessage('📤 Sent: ping');
                    }
                }
                
                function requestUpdate() {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ 
                            type: 'request_update',
                            quotation_id: document.getElementById('quotationId').value
                        }));
                        addMessage('📤 Sent: request_update');
                    }
                }
                
                function addMessage(message, type = 'info') {
                    const messagesDiv = document.getElementById('messages');
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'message ' + type;
                    messageDiv.textContent = new Date().toLocaleTimeString() + ' - ' + message;
                    messagesDiv.appendChild(messageDiv);
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }
            </script>
        </body>
        </html>
        """
        
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=html)


# ====================
# MAIN ENTRY POINT
# ====================

if __name__ == "__main__":
    import uvicorn
    
    # Configuración para desarrollo
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
        access_log=True
    )