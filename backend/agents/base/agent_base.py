"""
Agent Base Class

Abstract base class defining the interface and common functionality
for all AI agents in the Spirit Tours system.
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
import logging
import uuid
from pydantic import BaseModel, Field


logger = logging.getLogger(__name__)


class AgentStatus(str, Enum):
    """Agent execution status"""
    IDLE = "idle"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"
    TIMEOUT = "timeout"


class AgentCapability(str, Enum):
    """Agent capability types"""
    # Analysis capabilities
    DATA_ANALYSIS = "data_analysis"
    FORECASTING = "forecasting"
    OPTIMIZATION = "optimization"
    PATTERN_RECOGNITION = "pattern_recognition"
    
    # Content capabilities
    TEXT_GENERATION = "text_generation"
    TRANSLATION = "translation"
    SUMMARIZATION = "summarization"
    
    # Interaction capabilities
    CONVERSATION = "conversation"
    RECOMMENDATION = "recommendation"
    SEARCH = "search"
    
    # Integration capabilities
    API_INTEGRATION = "api_integration"
    DATABASE_ACCESS = "database_access"
    EXTERNAL_SERVICES = "external_services"
    
    # Specialized capabilities
    GEOSPATIAL = "geospatial"
    SCHEDULING = "scheduling"
    PRICING = "pricing"


class AgentRequest(BaseModel):
    """Standard agent request format"""
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    intent: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    context: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    priority: int = Field(default=5, ge=1, le=10)  # 1=highest, 10=lowest
    timeout_seconds: Optional[int] = 30


class AgentResponse(BaseModel):
    """Standard agent response format"""
    request_id: str
    agent_name: str
    status: AgentStatus
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    execution_time_ms: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    suggestions: List[str] = Field(default_factory=list)


class AgentBase(ABC):
    """
    Abstract base class for all AI agents.
    
    All agents must implement:
    - process(): Main agent logic
    - validate_request(): Request validation
    - get_capabilities(): Agent capabilities
    """
    
    def __init__(
        self,
        name: str,
        description: str,
        version: str = "1.0.0",
        config: Optional[Dict[str, Any]] = None
    ):
        self.name = name
        self.description = description
        self.version = version
        self.config = config or {}
        self.logger = logging.getLogger(f"agents.{name}")
        self.status = AgentStatus.IDLE
        self._execution_count = 0
        self._total_execution_time = 0.0
        self._error_count = 0
        
    @abstractmethod
    async def process(self, request: AgentRequest) -> AgentResponse:
        """
        Main agent processing logic.
        
        Args:
            request: Agent request with intent and parameters
            
        Returns:
            AgentResponse with results or error
        """
        pass
    
    @abstractmethod
    def validate_request(self, request: AgentRequest) -> tuple[bool, Optional[str]]:
        """
        Validate incoming request.
        
        Args:
            request: Agent request to validate
            
        Returns:
            (is_valid, error_message)
        """
        pass
    
    @abstractmethod
    def get_capabilities(self) -> List[AgentCapability]:
        """
        Return list of agent capabilities.
        
        Returns:
            List of AgentCapability enums
        """
        pass
    
    async def execute(self, request: AgentRequest) -> AgentResponse:
        """
        Execute agent with request validation and error handling.
        
        Args:
            request: Agent request
            
        Returns:
            AgentResponse
        """
        start_time = datetime.utcnow()
        
        try:
            # Validate request
            is_valid, error_msg = self.validate_request(request)
            if not is_valid:
                return AgentResponse(
                    request_id=request.request_id,
                    agent_name=self.name,
                    status=AgentStatus.ERROR,
                    error=f"Invalid request: {error_msg}"
                )
            
            # Update status
            self.status = AgentStatus.PROCESSING
            self.logger.info(f"Processing request {request.request_id}")
            
            # Process request
            response = await self.process(request)
            
            # Update metrics
            self._execution_count += 1
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            self._total_execution_time += execution_time
            response.execution_time_ms = execution_time
            
            # Update status
            self.status = AgentStatus.COMPLETED
            self.logger.info(
                f"Completed request {request.request_id} in {execution_time:.2f}ms"
            )
            
            return response
            
        except Exception as e:
            self._error_count += 1
            self.status = AgentStatus.ERROR
            self.logger.error(f"Error processing request {request.request_id}: {str(e)}")
            
            return AgentResponse(
                request_id=request.request_id,
                agent_name=self.name,
                status=AgentStatus.ERROR,
                error=str(e),
                execution_time_ms=(datetime.utcnow() - start_time).total_seconds() * 1000
            )
    
    def get_metrics(self) -> Dict[str, Any]:
        """
        Get agent performance metrics.
        
        Returns:
            Dictionary with metrics
        """
        avg_execution_time = (
            self._total_execution_time / self._execution_count
            if self._execution_count > 0
            else 0
        )
        
        return {
            'name': self.name,
            'version': self.version,
            'status': self.status.value,
            'execution_count': self._execution_count,
            'error_count': self._error_count,
            'success_rate': (
                (self._execution_count - self._error_count) / self._execution_count
                if self._execution_count > 0
                else 0
            ),
            'avg_execution_time_ms': avg_execution_time,
            'total_execution_time_ms': self._total_execution_time,
        }
    
    def reset_metrics(self):
        """Reset agent metrics."""
        self._execution_count = 0
        self._total_execution_time = 0.0
        self._error_count = 0
    
    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}(name={self.name}, version={self.version}, status={self.status.value})>"
