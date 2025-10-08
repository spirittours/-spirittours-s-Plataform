"""
24/7 Dedicated Support Channel System
Multi-channel customer support with intelligent routing and automation
"""

import os
import json
import uuid
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, field
import asyncio
import aiohttp
from collections import defaultdict
import logging
import pytz
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import redis
import boto3
from twilio.rest import Client as TwilioClient
import openai
import anthropic

Base = declarative_base()
logger = logging.getLogger(__name__)

class SupportChannel(Enum):
    """Support communication channels"""
    PHONE = "phone"
    EMAIL = "email"
    CHAT = "chat"
    WHATSAPP = "whatsapp"
    SMS = "sms"
    SOCIAL_MEDIA = "social_media"
    VIDEO_CALL = "video_call"
    IN_APP = "in_app"


class TicketPriority(Enum):
    """Support ticket priority levels"""
    CRITICAL = "critical"  # System down, major booking issues
    HIGH = "high"  # Payment issues, urgent travel
    MEDIUM = "medium"  # General inquiries, modifications
    LOW = "low"  # Information requests, feedback


class TicketStatus(Enum):
    """Support ticket status"""
    OPEN = "open"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    WAITING_CUSTOMER = "waiting_customer"
    ESCALATED = "escalated"
    RESOLVED = "resolved"
    CLOSED = "closed"


class AgentStatus(Enum):
    """Support agent availability status"""
    AVAILABLE = "available"
    BUSY = "busy"
    BREAK = "break"
    OFFLINE = "offline"
    AFTER_CALL_WORK = "after_call_work"


class IssueCategory(Enum):
    """Support issue categories"""
    BOOKING = "booking"
    PAYMENT = "payment"
    CANCELLATION = "cancellation"
    MODIFICATION = "modification"
    TECHNICAL = "technical"
    COMPLAINT = "complaint"
    INFORMATION = "information"
    EMERGENCY = "emergency"


@dataclass
class SupportTicket:
    """Support ticket details"""
    ticket_id: str
    customer_id: str
    channel: SupportChannel
    priority: TicketPriority
    status: TicketStatus
    category: IssueCategory
    subject: str
    description: str
    created_at: datetime
    assigned_agent: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolution: Optional[str] = None
    satisfaction_score: Optional[int] = None
    tags: List[str] = field(default_factory=list)
    attachments: List[str] = field(default_factory=list)
    conversation_history: List[Dict] = field(default_factory=list)
    metadata: Dict = field(default_factory=dict)


@dataclass
class SupportAgent:
    """Support agent information"""
    agent_id: str
    name: str
    email: str
    phone: str
    status: AgentStatus
    skills: List[str]
    languages: List[str]
    shift_start: datetime
    shift_end: datetime
    timezone: str
    current_tickets: List[str] = field(default_factory=list)
    performance_metrics: Dict = field(default_factory=dict)


class SupportTicketModel(Base):
    """Database model for support tickets"""
    __tablename__ = 'support_tickets'
    
    id = Column(String, primary_key=True)
    customer_id = Column(String, nullable=False)
    channel = Column(String, nullable=False)
    priority = Column(String, nullable=False)
    status = Column(String, default="open")
    category = Column(String)
    subject = Column(String)
    description = Column(String)
    assigned_agent_id = Column(String, ForeignKey('support_agents.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime)
    resolution = Column(String)
    satisfaction_score = Column(Integer)
    first_response_time = Column(Integer)  # seconds
    resolution_time = Column(Integer)  # seconds
    escalation_count = Column(Integer, default=0)
    tags = Column(JSON)
    metadata = Column(JSON)
    
    # Relationships
    agent = relationship("SupportAgentModel", backref="tickets")
    conversations = relationship("ConversationModel", backref="ticket")


class SupportAgentModel(Base):
    """Database model for support agents"""
    __tablename__ = 'support_agents'
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String)
    status = Column(String, default="offline")
    skills = Column(JSON)
    languages = Column(JSON)
    timezone = Column(String, default="UTC")
    is_active = Column(Boolean, default=True)
    performance_score = Column(Float, default=100.0)
    tickets_resolved = Column(Integer, default=0)
    avg_resolution_time = Column(Float)  # minutes
    avg_satisfaction_score = Column(Float)
    last_activity = Column(DateTime)


class ConversationModel(Base):
    """Database model for support conversations"""
    __tablename__ = 'support_conversations'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id = Column(String, ForeignKey('support_tickets.id'))
    sender_type = Column(String)  # customer, agent, system
    sender_id = Column(String)
    message = Column(String)
    channel = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    attachments = Column(JSON)
    metadata = Column(JSON)


class SupportChannelRouter:
    """Routes support requests to appropriate channels and agents"""
    
    def __init__(self, db_session):
        self.db_session = db_session
        self.redis_client = redis.Redis(host='localhost', port=6379, db=2)
        self.ai_classifier = AITicketClassifier()
        
    async def route_request(
        self,
        channel: SupportChannel,
        customer_id: str,
        message: str,
        metadata: Dict = None
    ) -> SupportTicket:
        """Route incoming support request to appropriate handler"""
        
        # Classify the request
        classification = await self.ai_classifier.classify_request(message)
        
        # Determine priority
        priority = self._determine_priority(classification, metadata)
        
        # Create ticket
        ticket = SupportTicket(
            ticket_id=f"TKT-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
            customer_id=customer_id,
            channel=channel,
            priority=priority,
            status=TicketStatus.OPEN,
            category=classification["category"],
            subject=classification["subject"],
            description=message,
            created_at=datetime.utcnow(),
            tags=classification["tags"],
            metadata=metadata or {}
        )
        
        # Check if immediate resolution is possible
        if classification["confidence"] > 0.9 and classification["auto_resolvable"]:
            resolution = await self._auto_resolve(ticket, classification)
            if resolution:
                ticket.status = TicketStatus.RESOLVED
                ticket.resolution = resolution
                ticket.resolved_at = datetime.utcnow()
                await self._save_ticket(ticket)
                return ticket
        
        # Find best available agent
        agent = await self._find_best_agent(ticket)
        
        if agent:
            ticket.assigned_agent = agent.agent_id
            ticket.status = TicketStatus.ASSIGNED
            
            # Notify agent
            await self._notify_agent(agent, ticket)
        else:
            # Add to queue if no agent available
            await self._add_to_queue(ticket)
        
        # Save ticket
        await self._save_ticket(ticket)
        
        # Send acknowledgment to customer
        await self._send_acknowledgment(ticket)
        
        return ticket
    
    def _determine_priority(self, classification: Dict, metadata: Dict) -> TicketPriority:
        """Determine ticket priority based on classification and context"""
        
        # Emergency keywords
        if any(word in classification.get("keywords", []) for word in ["emergency", "urgent", "critical"]):
            return TicketPriority.CRITICAL
        
        # Check category
        if classification["category"] == IssueCategory.EMERGENCY:
            return TicketPriority.CRITICAL
        elif classification["category"] == IssueCategory.PAYMENT:
            return TicketPriority.HIGH
        elif classification["category"] in [IssueCategory.CANCELLATION, IssueCategory.MODIFICATION]:
            # Check if travel date is near
            if metadata and "travel_date" in metadata:
                travel_date = datetime.fromisoformat(metadata["travel_date"])
                if (travel_date - datetime.utcnow()).days < 3:
                    return TicketPriority.HIGH
            return TicketPriority.MEDIUM
        else:
            return TicketPriority.LOW
    
    async def _auto_resolve(self, ticket: SupportTicket, classification: Dict) -> Optional[str]:
        """Attempt to automatically resolve the ticket"""
        
        # Common auto-resolvable issues
        resolutions = {
            "password_reset": "Password reset link has been sent to your registered email.",
            "booking_confirmation": "Your booking confirmation has been resent to your email.",
            "refund_status": "Your refund is being processed and will reflect in 5-7 business days.",
            "check_in_info": "Online check-in opens 24 hours before departure. You'll receive an email reminder.",
            "baggage_info": "Standard baggage allowance is 23kg for checked and 7kg for cabin baggage."
        }
        
        issue_type = classification.get("issue_type")
        if issue_type in resolutions:
            return resolutions[issue_type]
        
        return None
    
    async def _find_best_agent(self, ticket: SupportTicket) -> Optional[SupportAgent]:
        """Find the best available agent for the ticket"""
        
        # Get available agents
        available_agents = self.db_session.query(SupportAgentModel).filter(
            SupportAgentModel.status == AgentStatus.AVAILABLE.value,
            SupportAgentModel.is_active == True
        ).all()
        
        if not available_agents:
            return None
        
        # Score agents based on skills, language, and workload
        best_agent = None
        best_score = -1
        
        for agent_model in available_agents:
            agent = self._model_to_agent(agent_model)
            score = self._calculate_agent_score(agent, ticket)
            
            if score > best_score:
                best_score = score
                best_agent = agent
        
        return best_agent
    
    def _calculate_agent_score(self, agent: SupportAgent, ticket: SupportTicket) -> float:
        """Calculate agent suitability score for a ticket"""
        
        score = 0.0
        
        # Skill match
        if ticket.category.value in agent.skills:
            score += 30.0
        
        # Language match (if specified)
        if ticket.metadata.get("language"):
            if ticket.metadata["language"] in agent.languages:
                score += 20.0
        
        # Workload (fewer current tickets is better)
        score += max(0, 20 - len(agent.current_tickets) * 2)
        
        # Performance score
        score += agent.performance_metrics.get("satisfaction_score", 0) / 5 * 10
        
        # Time zone match (for better response time)
        customer_tz = ticket.metadata.get("timezone", "UTC")
        if customer_tz == agent.timezone:
            score += 10.0
        
        return score
    
    async def _add_to_queue(self, ticket: SupportTicket):
        """Add ticket to priority queue"""
        
        queue_key = f"support:queue:{ticket.priority.value}"
        ticket_data = json.dumps({
            "ticket_id": ticket.ticket_id,
            "created_at": ticket.created_at.isoformat(),
            "priority": ticket.priority.value
        })
        
        # Add to Redis sorted set with timestamp as score
        self.redis_client.zadd(
            queue_key,
            {ticket_data: ticket.created_at.timestamp()}
        )
    
    async def _notify_agent(self, agent: SupportAgent, ticket: SupportTicket):
        """Notify agent of new ticket assignment"""
        
        # Send push notification
        notification = {
            "type": "new_ticket",
            "ticket_id": ticket.ticket_id,
            "priority": ticket.priority.value,
            "subject": ticket.subject,
            "customer": ticket.customer_id
        }
        
        # Send via WebSocket, push notification, or email
        # Implementation depends on notification system
        
    async def _send_acknowledgment(self, ticket: SupportTicket):
        """Send acknowledgment to customer"""
        
        message = f"""
        Thank you for contacting Spirit Tours Support.
        
        Your ticket #{ticket.ticket_id} has been created.
        Priority: {ticket.priority.value}
        Status: {ticket.status.value}
        
        {"An agent has been assigned and will respond shortly." if ticket.assigned_agent else "Your request has been queued and will be addressed soon."}
        
        Expected response time: {self._get_expected_response_time(ticket.priority)}
        """
        
        # Send via appropriate channel
        # Implementation depends on channel
    
    def _get_expected_response_time(self, priority: TicketPriority) -> str:
        """Get expected response time based on priority"""
        
        response_times = {
            TicketPriority.CRITICAL: "15 minutes",
            TicketPriority.HIGH: "1 hour",
            TicketPriority.MEDIUM: "4 hours",
            TicketPriority.LOW: "24 hours"
        }
        
        return response_times.get(priority, "24 hours")
    
    async def _save_ticket(self, ticket: SupportTicket):
        """Save ticket to database"""
        
        ticket_model = SupportTicketModel(
            id=ticket.ticket_id,
            customer_id=ticket.customer_id,
            channel=ticket.channel.value,
            priority=ticket.priority.value,
            status=ticket.status.value,
            category=ticket.category.value,
            subject=ticket.subject,
            description=ticket.description,
            assigned_agent_id=ticket.assigned_agent,
            resolved_at=ticket.resolved_at,
            resolution=ticket.resolution,
            satisfaction_score=ticket.satisfaction_score,
            tags=ticket.tags,
            metadata=ticket.metadata
        )
        
        self.db_session.add(ticket_model)
        self.db_session.commit()
    
    def _model_to_agent(self, model: SupportAgentModel) -> SupportAgent:
        """Convert database model to agent object"""
        
        return SupportAgent(
            agent_id=model.id,
            name=model.name,
            email=model.email,
            phone=model.phone,
            status=AgentStatus(model.status),
            skills=model.skills or [],
            languages=model.languages or [],
            shift_start=datetime.utcnow(),  # Would get from schedule
            shift_end=datetime.utcnow() + timedelta(hours=8),
            timezone=model.timezone,
            performance_metrics={
                "satisfaction_score": model.avg_satisfaction_score or 0,
                "resolution_time": model.avg_resolution_time or 0,
                "tickets_resolved": model.tickets_resolved
            }
        )


class AITicketClassifier:
    """AI-powered ticket classification and routing"""
    
    def __init__(self):
        self.openai_client = openai.Client(api_key=os.getenv("OPENAI_API_KEY"))
        
    async def classify_request(self, message: str) -> Dict:
        """Classify support request using AI"""
        
        prompt = f"""
        Classify this customer support message:
        "{message}"
        
        Provide:
        1. Category (booking, payment, cancellation, modification, technical, complaint, information, emergency)
        2. Subject (brief summary, max 50 chars)
        3. Keywords (list of important terms)
        4. Sentiment (positive, neutral, negative)
        5. Confidence score (0-1)
        6. Auto-resolvable (true/false)
        7. Issue type (if auto-resolvable)
        
        Return as JSON.
        """
        
        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a support ticket classifier."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            classification = json.loads(response.choices[0].message.content)
            
            # Map to enum
            classification["category"] = IssueCategory(
                classification.get("category", "information").lower()
            )
            
            return classification
            
        except Exception as e:
            logger.error(f"AI classification failed: {e}")
            # Fallback to rule-based classification
            return self._fallback_classification(message)
    
    def _fallback_classification(self, message: str) -> Dict:
        """Fallback rule-based classification"""
        
        message_lower = message.lower()
        
        # Simple keyword-based classification
        if any(word in message_lower for word in ["book", "reserve", "availability"]):
            category = IssueCategory.BOOKING
        elif any(word in message_lower for word in ["pay", "charge", "refund", "bill"]):
            category = IssueCategory.PAYMENT
        elif any(word in message_lower for word in ["cancel", "cancellation"]):
            category = IssueCategory.CANCELLATION
        elif any(word in message_lower for word in ["change", "modify", "reschedule"]):
            category = IssueCategory.MODIFICATION
        elif any(word in message_lower for word in ["error", "bug", "not working", "crash"]):
            category = IssueCategory.TECHNICAL
        elif any(word in message_lower for word in ["complaint", "unhappy", "dissatisfied"]):
            category = IssueCategory.COMPLAINT
        else:
            category = IssueCategory.INFORMATION
        
        return {
            "category": category,
            "subject": message[:50],
            "keywords": [],
            "sentiment": "neutral",
            "confidence": 0.5,
            "auto_resolvable": False,
            "tags": []
        }


class LiveChatSystem:
    """Real-time live chat system"""
    
    def __init__(self):
        self.active_chats = {}  # chat_id -> ChatSession
        self.agent_queues = defaultdict(list)  # agent_id -> [chat_ids]
        
    async def start_chat(
        self,
        customer_id: str,
        initial_message: str,
        metadata: Dict = None
    ) -> Dict:
        """Start a new live chat session"""
        
        chat_id = f"CHAT-{uuid.uuid4().hex[:8].upper()}"
        
        # Find available agent
        agent = await self._find_available_chat_agent()
        
        if agent:
            # Create chat session
            session = {
                "chat_id": chat_id,
                "customer_id": customer_id,
                "agent_id": agent["agent_id"],
                "started_at": datetime.utcnow().isoformat(),
                "status": "active",
                "messages": [
                    {
                        "sender": "customer",
                        "message": initial_message,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                ],
                "metadata": metadata or {}
            }
            
            self.active_chats[chat_id] = session
            self.agent_queues[agent["agent_id"]].append(chat_id)
            
            # Notify agent
            await self._notify_agent_new_chat(agent, session)
            
            return {
                "chat_id": chat_id,
                "agent_name": agent["name"],
                "status": "connected",
                "estimated_wait": None
            }
        else:
            # Add to wait queue
            position = await self._add_to_chat_queue(customer_id, initial_message)
            
            return {
                "chat_id": chat_id,
                "status": "waiting",
                "position": position,
                "estimated_wait": f"{position * 2} minutes"
            }
    
    async def send_message(
        self,
        chat_id: str,
        sender_type: str,  # customer or agent
        message: str
    ) -> bool:
        """Send message in chat session"""
        
        if chat_id not in self.active_chats:
            return False
        
        session = self.active_chats[chat_id]
        
        # Add message to session
        session["messages"].append({
            "sender": sender_type,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Send via WebSocket to other party
        await self._broadcast_message(chat_id, sender_type, message)
        
        # Log conversation
        await self._log_chat_message(chat_id, sender_type, message)
        
        return True
    
    async def end_chat(self, chat_id: str, ended_by: str) -> Dict:
        """End chat session"""
        
        if chat_id not in self.active_chats:
            return {"error": "Chat not found"}
        
        session = self.active_chats[chat_id]
        session["status"] = "ended"
        session["ended_at"] = datetime.utcnow().isoformat()
        session["ended_by"] = ended_by
        
        # Calculate chat metrics
        duration = (datetime.utcnow() - datetime.fromisoformat(session["started_at"])).seconds
        message_count = len(session["messages"])
        
        # Save chat transcript
        await self._save_chat_transcript(session)
        
        # Remove from active chats
        del self.active_chats[chat_id]
        
        # Remove from agent queue
        if session.get("agent_id"):
            self.agent_queues[session["agent_id"]].remove(chat_id)
        
        # Request feedback
        await self._request_chat_feedback(session["customer_id"], chat_id)
        
        return {
            "chat_id": chat_id,
            "duration": duration,
            "messages": message_count,
            "transcript_saved": True
        }
    
    async def _find_available_chat_agent(self) -> Optional[Dict]:
        """Find available agent for chat"""
        
        # Mock implementation - would query actual agent availability
        return {
            "agent_id": "AGT001",
            "name": "Sarah Johnson",
            "status": "available"
        }
    
    async def _add_to_chat_queue(self, customer_id: str, message: str) -> int:
        """Add customer to chat queue"""
        
        # Mock implementation
        return 3  # Position in queue
    
    async def _notify_agent_new_chat(self, agent: Dict, session: Dict):
        """Notify agent of new chat"""
        pass
    
    async def _broadcast_message(self, chat_id: str, sender: str, message: str):
        """Broadcast message via WebSocket"""
        pass
    
    async def _log_chat_message(self, chat_id: str, sender: str, message: str):
        """Log chat message to database"""
        pass
    
    async def _save_chat_transcript(self, session: Dict):
        """Save complete chat transcript"""
        pass
    
    async def _request_chat_feedback(self, customer_id: str, chat_id: str):
        """Request feedback after chat ends"""
        pass


class PhoneSupport:
    """Phone support system with IVR and call routing"""
    
    def __init__(self):
        self.twilio_client = TwilioClient(
            os.getenv("TWILIO_ACCOUNT_SID"),
            os.getenv("TWILIO_AUTH_TOKEN")
        )
        self.phone_number = os.getenv("TWILIO_PHONE_NUMBER")
        
    async def handle_incoming_call(self, from_number: str) -> Dict:
        """Handle incoming support call"""
        
        # Create IVR menu
        ivr_response = self._create_ivr_menu()
        
        # Log call
        call_record = {
            "call_id": f"CALL-{uuid.uuid4().hex[:8].upper()}",
            "from_number": from_number,
            "to_number": self.phone_number,
            "started_at": datetime.utcnow().isoformat(),
            "ivr_path": []
        }
        
        return {
            "call_id": call_record["call_id"],
            "ivr_response": ivr_response
        }
    
    def _create_ivr_menu(self) -> str:
        """Create IVR menu structure"""
        
        return """
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Gather numDigits="1" action="/ivr/handle-selection" method="POST">
                <Say voice="alice">
                    Welcome to Spirit Tours Support.
                    For booking assistance, press 1.
                    For existing reservations, press 2.
                    For payment issues, press 3.
                    For emergencies, press 9.
                    To speak with an agent, press 0.
                </Say>
            </Gather>
            <Say>We didn't receive any input. Goodbye!</Say>
        </Response>
        """
    
    async def route_to_agent(self, call_id: str, department: str) -> Dict:
        """Route call to appropriate agent"""
        
        # Find available phone agent
        agent = await self._find_available_phone_agent(department)
        
        if agent:
            # Transfer call
            transfer_result = await self._transfer_call(call_id, agent["phone"])
            
            return {
                "status": "transferred",
                "agent": agent["name"],
                "wait_time": 0
            }
        else:
            # Add to queue
            position = await self._add_to_phone_queue(call_id, department)
            
            return {
                "status": "queued",
                "position": position,
                "estimated_wait": f"{position * 3} minutes"
            }
    
    async def _find_available_phone_agent(self, department: str) -> Optional[Dict]:
        """Find available phone agent"""
        
        # Mock implementation
        return {
            "agent_id": "AGT002",
            "name": "John Smith",
            "phone": "+1234567890",
            "department": department
        }
    
    async def _transfer_call(self, call_id: str, agent_phone: str) -> bool:
        """Transfer call to agent"""
        
        # Use Twilio API to transfer
        return True
    
    async def _add_to_phone_queue(self, call_id: str, department: str) -> int:
        """Add call to department queue"""
        
        return 2  # Position in queue


class SupportAnalytics:
    """Analytics and reporting for support system"""
    
    def __init__(self, db_session):
        self.db_session = db_session
        
    async def get_support_metrics(self, start_date: datetime, end_date: datetime) -> Dict:
        """Get comprehensive support metrics"""
        
        metrics = {
            "ticket_metrics": await self._get_ticket_metrics(start_date, end_date),
            "agent_metrics": await self._get_agent_metrics(start_date, end_date),
            "channel_metrics": await self._get_channel_metrics(start_date, end_date),
            "satisfaction_metrics": await self._get_satisfaction_metrics(start_date, end_date),
            "response_time_metrics": await self._get_response_time_metrics(start_date, end_date)
        }
        
        return metrics
    
    async def _get_ticket_metrics(self, start_date: datetime, end_date: datetime) -> Dict:
        """Get ticket-related metrics"""
        
        # Query database for metrics
        # Mock data for demonstration
        
        return {
            "total_tickets": 1250,
            "resolved_tickets": 1180,
            "open_tickets": 70,
            "resolution_rate": 94.4,
            "avg_resolution_time": 3.5,  # hours
            "tickets_by_priority": {
                "critical": 50,
                "high": 200,
                "medium": 600,
                "low": 400
            },
            "tickets_by_category": {
                "booking": 400,
                "payment": 200,
                "cancellation": 150,
                "modification": 250,
                "technical": 100,
                "complaint": 50,
                "information": 100
            }
        }
    
    async def _get_agent_metrics(self, start_date: datetime, end_date: datetime) -> Dict:
        """Get agent performance metrics"""
        
        return {
            "total_agents": 25,
            "active_agents": 20,
            "avg_tickets_per_agent": 50,
            "top_performers": [
                {"name": "Sarah Johnson", "tickets_resolved": 125, "satisfaction": 4.8},
                {"name": "John Smith", "tickets_resolved": 118, "satisfaction": 4.7},
                {"name": "Maria Garcia", "tickets_resolved": 110, "satisfaction": 4.9}
            ],
            "avg_handle_time": 12.5,  # minutes
            "first_call_resolution": 78.5  # percentage
        }
    
    async def _get_channel_metrics(self, start_date: datetime, end_date: datetime) -> Dict:
        """Get metrics by support channel"""
        
        return {
            "channel_distribution": {
                "email": 35.0,
                "chat": 30.0,
                "phone": 20.0,
                "whatsapp": 10.0,
                "social_media": 5.0
            },
            "avg_response_by_channel": {
                "chat": 2,  # minutes
                "phone": 5,
                "email": 120,
                "whatsapp": 15,
                "social_media": 30
            }
        }
    
    async def _get_satisfaction_metrics(self, start_date: datetime, end_date: datetime) -> Dict:
        """Get customer satisfaction metrics"""
        
        return {
            "avg_satisfaction_score": 4.3,
            "nps_score": 65,
            "csat_score": 86.5,
            "satisfaction_trend": "improving",
            "feedback_response_rate": 45.2
        }
    
    async def _get_response_time_metrics(self, start_date: datetime, end_date: datetime) -> Dict:
        """Get response time metrics"""
        
        return {
            "avg_first_response": 15,  # minutes
            "avg_resolution_time": 210,  # minutes
            "sla_compliance": 92.3,  # percentage
            "escalation_rate": 5.2  # percentage
        }


# Export classes
__all__ = [
    'SupportChannel',
    'TicketPriority',
    'TicketStatus',
    'AgentStatus',
    'IssueCategory',
    'SupportTicket',
    'SupportAgent',
    'SupportChannelRouter',
    'AITicketClassifier',
    'LiveChatSystem',
    'PhoneSupport',
    'SupportAnalytics'
]