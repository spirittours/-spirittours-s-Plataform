"""
AgentTask - Task representation for agent execution
===================================================

This module defines the task structure used by agents to execute work.
Tasks can be prioritized, scheduled, and tracked throughout their lifecycle.

Author: Spirit Tours Development Team
Date: 2025-11-02
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional
from uuid import uuid4
from pydantic import BaseModel, Field


class TaskPriority(str, Enum):
    """Task priority levels"""
    CRITICAL = "critical"  # Must be processed immediately
    HIGH = "high"          # Process as soon as possible
    NORMAL = "normal"      # Standard priority
    LOW = "low"            # Process when resources available


class TaskStatus(str, Enum):
    """Task lifecycle status"""
    PENDING = "pending"
    QUEUED = "queued"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AgentTask(BaseModel):
    """
    Represents a task to be executed by an agent.
    
    Attributes:
        task_id: Unique task identifier
        task_type: Type of task (e.g., 'itinerary_plan', 'weather_forecast')
        agent_type: Type of agent that should handle this task
        priority: Task priority level
        status: Current task status
        payload: Task-specific data
        context: Additional context information
        created_at: Task creation timestamp
        scheduled_at: When task should be executed (optional)
        started_at: When task execution started (optional)
        completed_at: When task execution completed (optional)
        assigned_agent_id: ID of agent assigned to this task (optional)
        result: Task execution result (optional)
        error: Error information if task failed (optional)
        metadata: Additional metadata
    """
    
    task_id: str = Field(default_factory=lambda: str(uuid4()))
    task_type: str = Field(..., description="Type of task to execute")
    agent_type: str = Field(..., description="Type of agent required")
    priority: TaskPriority = Field(default=TaskPriority.NORMAL)
    status: TaskStatus = Field(default=TaskStatus.PENDING)
    
    payload: Dict[str, Any] = Field(default_factory=dict, description="Task data")
    context: Dict[str, Any] = Field(default_factory=dict, description="Context information")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    assigned_agent_id: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
    
    def assign_to_agent(self, agent_id: str) -> None:
        """
        Assign task to a specific agent.
        
        Args:
            agent_id: ID of the agent to assign to
        """
        self.assigned_agent_id = agent_id
        self.status = TaskStatus.ASSIGNED
        self.metadata['assigned_at'] = datetime.utcnow().isoformat()
    
    def start_execution(self) -> None:
        """Mark task as started."""
        self.status = TaskStatus.IN_PROGRESS
        self.started_at = datetime.utcnow()
    
    def complete(self, result: Dict[str, Any]) -> None:
        """
        Mark task as completed with result.
        
        Args:
            result: Task execution result
        """
        self.status = TaskStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        self.result = result
    
    def fail(self, error: str) -> None:
        """
        Mark task as failed with error.
        
        Args:
            error: Error message
        """
        self.status = TaskStatus.FAILED
        self.completed_at = datetime.utcnow()
        self.error = error
    
    def cancel(self) -> None:
        """Mark task as cancelled."""
        self.status = TaskStatus.CANCELLED
        self.completed_at = datetime.utcnow()
        self.metadata['cancelled_at'] = datetime.utcnow().isoformat()
    
    def get_execution_time(self) -> Optional[float]:
        """
        Calculate task execution time in seconds.
        
        Returns:
            Execution time in seconds, or None if not completed
        """
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
    
    def get_wait_time(self) -> Optional[float]:
        """
        Calculate task wait time (created to started) in seconds.
        
        Returns:
            Wait time in seconds, or None if not started
        """
        if self.started_at:
            return (self.started_at - self.created_at).total_seconds()
        return None
    
    def is_completed(self) -> bool:
        """Check if task is in a terminal state."""
        return self.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]
    
    def is_successful(self) -> bool:
        """Check if task completed successfully."""
        return self.status == TaskStatus.COMPLETED
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert task to dictionary."""
        return self.dict()
    
    def __repr__(self) -> str:
        return f"<AgentTask id={self.task_id[:8]} type={self.task_type} status={self.status.value}>"
