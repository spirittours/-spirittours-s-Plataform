"""
Base Agent Class - Arquitectura Core para todos los Agentes IA de Spirit Tours
Implementación de la clase base que define la estructura común de todos los 25 agentes
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
import uuid

logger = logging.getLogger(__name__)

class BaseAIAgent(ABC):
    """
    Clase base abstracta para todos los agentes IA de Spirit Tours
    
    Define la interface común y funcionalidades compartidas:
    - Inicialización y configuración
    - Logging y monitoring
    - Communication protocols
    - Error handling
    - Performance metrics
    """
    
    def __init__(self, agent_name: str, config: Dict[str, Any] = None):
        self.agent_id = str(uuid.uuid4())
        self.agent_name = agent_name
        self.config = config or {}
        self.status = "initialized"
        self.created_at = datetime.now()
        self.last_active = datetime.now()
        self.performance_metrics = {
            "requests_processed": 0,
            "avg_response_time": 0.0,
            "success_rate": 0.0,
            "errors_count": 0
        }
        self.logger = self._setup_logger()
        
    def _setup_logger(self) -> logging.Logger:
        """Configurar logger específico para este agente"""
        agent_logger = logging.getLogger(f"spirit_tours.{self.agent_name}")
        agent_logger.setLevel(logging.INFO)
        
        if not agent_logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                f'%(asctime)s - {self.agent_name} - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            agent_logger.addHandler(handler)
            
        return agent_logger
    
    async def initialize(self) -> bool:
        """
        Inicializar el agente - llamado al arrancar el sistema
        Cada agente debe implementar su lógica de inicialización específica
        """
        try:
            self.logger.info(f"Initializing agent {self.agent_name}...")
            
            # Lógica común de inicialización
            await self._load_configuration()
            await self._setup_connections()
            await self._validate_dependencies()
            
            # Lógica específica del agente
            success = await self._initialize_agent_specific()
            
            if success:
                self.status = "active"
                self.logger.info(f"Agent {self.agent_name} initialized successfully")
            else:
                self.status = "error"
                self.logger.error(f"Agent {self.agent_name} initialization failed")
                
            return success
            
        except Exception as e:
            self.logger.error(f"Error initializing agent {self.agent_name}: {str(e)}")
            self.status = "error"
            return False
    
    async def _load_configuration(self):
        """Cargar configuración específica del agente"""
        self.logger.info("Loading agent configuration...")
        # TODO: Implementar carga desde archivo de configuración
        pass
    
    async def _setup_connections(self):
        """Configurar conexiones externas (APIs, databases, etc.)"""
        self.logger.info("Setting up external connections...")
        # TODO: Implementar conexiones específicas
        pass
    
    async def _validate_dependencies(self):
        """Validar que todas las dependencias estén disponibles"""
        self.logger.info("Validating dependencies...")
        # TODO: Implementar validación de dependencias
        pass
    
    @abstractmethod
    async def _initialize_agent_specific(self) -> bool:
        """
        Inicialización específica del agente - debe ser implementada por cada agente
        """
        pass
    
    @abstractmethod
    async def process_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Procesar una petición - interface principal del agente
        
        Args:
            request: Diccionario con los datos de la petición
            
        Returns:
            Diccionario con la respuesta del agente
        """
        pass
    
    async def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Manejador principal de peticiones con logging y métricas
        """
        start_time = datetime.now()
        self.last_active = start_time
        
        try:
            self.logger.info(f"Processing request: {request.get('type', 'unknown')}")
            
            # Validar petición
            if not self._validate_request(request):
                raise ValueError("Invalid request format")
            
            # Procesar petición
            response = await self.process_request(request)
            
            # Actualizar métricas de éxito
            self._update_performance_metrics(start_time, success=True)
            
            self.logger.info(f"Request processed successfully")
            return response
            
        except Exception as e:
            # Actualizar métricas de error
            self._update_performance_metrics(start_time, success=False)
            self.performance_metrics["errors_count"] += 1
            
            self.logger.error(f"Error processing request: {str(e)}")
            
            return {
                "status": "error",
                "message": str(e),
                "agent": self.agent_name,
                "timestamp": datetime.now().isoformat()
            }
    
    def _validate_request(self, request: Dict[str, Any]) -> bool:
        """Validar formato de petición"""
        required_fields = ["type", "data"]
        return all(field in request for field in required_fields)
    
    def _update_performance_metrics(self, start_time: datetime, success: bool):
        """Actualizar métricas de performance"""
        response_time = (datetime.now() - start_time).total_seconds()
        
        self.performance_metrics["requests_processed"] += 1
        
        # Actualizar tiempo promedio de respuesta
        current_avg = self.performance_metrics["avg_response_time"]
        total_requests = self.performance_metrics["requests_processed"]
        
        new_avg = ((current_avg * (total_requests - 1)) + response_time) / total_requests
        self.performance_metrics["avg_response_time"] = round(new_avg, 3)
        
        # Actualizar tasa de éxito
        if success:
            success_count = total_requests - self.performance_metrics["errors_count"]
            self.performance_metrics["success_rate"] = round((success_count / total_requests) * 100, 2)
    
    async def get_status(self) -> Dict[str, Any]:
        """Obtener estado actual del agente"""
        return {
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "last_active": self.last_active.isoformat(),
            "performance_metrics": self.performance_metrics,
            "configuration": self.config
        }
    
    async def shutdown(self):
        """Shutdown graceful del agente"""
        self.logger.info(f"Shutting down agent {self.agent_name}...")
        self.status = "shutdown"
        # TODO: Implementar limpieza de recursos
    
    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}(name={self.agent_name}, status={self.status})>"