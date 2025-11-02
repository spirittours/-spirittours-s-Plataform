"""
AgentProtocol - Communication protocol for inter-agent messaging
================================================================

This module defines the message structure and communication protocol
used by agents to communicate with each other.

Author: Spirit Tours Development Team
Date: 2025-11-02
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional
from uuid import uuid4
from pydantic import BaseModel, Field


class MessageType(str, Enum):
    """Agent message types"""
    # Request/Response
    REQUEST = "request"
    RESPONSE = "response"
    
    # Notifications
    NOTIFICATION = "notification"
    BROADCAST = "broadcast"
    
    # Control
    COMMAND = "command"
    STATUS_UPDATE = "status_update"
    
    # Data
    DATA_SHARE = "data_share"
    QUERY = "query"
    
    # Error handling
    ERROR = "error"
    WARNING = "warning"


class AgentMessage(BaseModel):
    """
    Represents a message between agents.
    
    Attributes:
        message_id: Unique message identifier
        message_type: Type of message
        from_agent_id: ID of sending agent
        to_agent_id: ID of receiving agent (None for broadcast)
        subject: Message subject
        payload: Message data
        timestamp: Message creation time
        correlation_id: ID linking related messages
        reply_to: ID of message this is replying to
        priority: Message priority
        ttl: Time to live in seconds
        metadata: Additional metadata
    """
    
    message_id: str = Field(default_factory=lambda: str(uuid4()))
    message_type: MessageType = Field(..., description="Type of message")
    
    from_agent_id: str = Field(..., description="Sender agent ID")
    to_agent_id: Optional[str] = Field(None, description="Receiver agent ID (None for broadcast)")
    
    subject: str = Field(..., description="Message subject")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Message data")
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    correlation_id: Optional[str] = Field(None, description="ID linking related messages")
    reply_to: Optional[str] = Field(None, description="ID of message being replied to")
    
    priority: int = Field(default=5, ge=1, le=10, description="Priority (1=lowest, 10=highest)")
    ttl: Optional[int] = Field(None, description="Time to live in seconds")
    
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
    
    def create_reply(
        self,
        from_agent_id: str,
        payload: Dict[str, Any],
        message_type: MessageType = MessageType.RESPONSE
    ) -> 'AgentMessage':
        """
        Create a reply message to this message.
        
        Args:
            from_agent_id: ID of agent sending the reply
            payload: Reply data
            message_type: Type of reply message
            
        Returns:
            New AgentMessage configured as a reply
        """
        return AgentMessage(
            message_type=message_type,
            from_agent_id=from_agent_id,
            to_agent_id=self.from_agent_id,
            subject=f"Re: {self.subject}",
            payload=payload,
            correlation_id=self.correlation_id or self.message_id,
            reply_to=self.message_id,
            priority=self.priority,
        )
    
    def is_broadcast(self) -> bool:
        """Check if this is a broadcast message."""
        return self.to_agent_id is None
    
    def is_expired(self) -> bool:
        """
        Check if message has exceeded its time to live.
        
        Returns:
            True if message is expired
        """
        if self.ttl is None:
            return False
        
        age = (datetime.utcnow() - self.timestamp).total_seconds()
        return age > self.ttl
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary."""
        return self.dict()
    
    def __repr__(self) -> str:
        return f"<AgentMessage id={self.message_id[:8]} type={self.message_type.value} from={self.from_agent_id[:8]}>"


class AgentProtocol:
    """
    Protocol handler for agent communication.
    
    This class manages message routing, delivery, and protocol enforcement.
    """
    
    def __init__(self):
        """Initialize protocol handler."""
        self._message_handlers: Dict[str, Any] = {}
        self._message_history: list[AgentMessage] = []
        self._max_history = 1000
    
    def register_handler(self, agent_id: str, handler) -> None:
        """
        Register a message handler for an agent.
        
        Args:
            agent_id: Agent ID
            handler: Async function to handle messages
        """
        self._message_handlers[agent_id] = handler
    
    def unregister_handler(self, agent_id: str) -> None:
        """
        Unregister a message handler.
        
        Args:
            agent_id: Agent ID to unregister
        """
        self._message_handlers.pop(agent_id, None)
    
    async def send_message(self, message: AgentMessage) -> bool:
        """
        Send a message to the target agent(s).
        
        Args:
            message: Message to send
            
        Returns:
            True if message was delivered successfully
        """
        # Check if message is expired
        if message.is_expired():
            return False
        
        # Add to history
        self._message_history.append(message)
        if len(self._message_history) > self._max_history:
            self._message_history.pop(0)
        
        # Handle broadcast
        if message.is_broadcast():
            return await self._broadcast_message(message)
        
        # Handle direct message
        return await self._deliver_message(message)
    
    async def _deliver_message(self, message: AgentMessage) -> bool:
        """
        Deliver message to specific agent.
        
        Args:
            message: Message to deliver
            
        Returns:
            True if delivered successfully
        """
        handler = self._message_handlers.get(message.to_agent_id)
        if handler is None:
            return False
        
        try:
            await handler(message)
            return True
        except Exception as e:
            print(f"Error delivering message: {e}")
            return False
    
    async def _broadcast_message(self, message: AgentMessage) -> bool:
        """
        Broadcast message to all registered agents.
        
        Args:
            message: Message to broadcast
            
        Returns:
            True if at least one agent received the message
        """
        delivered = False
        for agent_id, handler in self._message_handlers.items():
            if agent_id != message.from_agent_id:  # Don't send to sender
                try:
                    await handler(message)
                    delivered = True
                except Exception as e:
                    print(f"Error broadcasting to {agent_id}: {e}")
        
        return delivered
    
    def get_message_history(
        self,
        agent_id: Optional[str] = None,
        limit: int = 100
    ) -> list[AgentMessage]:
        """
        Get message history.
        
        Args:
            agent_id: Filter by agent ID (sender or receiver)
            limit: Maximum number of messages to return
            
        Returns:
            List of messages
        """
        messages = self._message_history
        
        if agent_id:
            messages = [
                msg for msg in messages
                if msg.from_agent_id == agent_id or msg.to_agent_id == agent_id
            ]
        
        return messages[-limit:]
    
    def get_conversation(
        self,
        agent_id1: str,
        agent_id2: str,
        limit: int = 100
    ) -> list[AgentMessage]:
        """
        Get conversation between two agents.
        
        Args:
            agent_id1: First agent ID
            agent_id2: Second agent ID
            limit: Maximum number of messages
            
        Returns:
            List of messages in the conversation
        """
        messages = [
            msg for msg in self._message_history
            if (msg.from_agent_id == agent_id1 and msg.to_agent_id == agent_id2) or
               (msg.from_agent_id == agent_id2 and msg.to_agent_id == agent_id1)
        ]
        
        return messages[-limit:]
