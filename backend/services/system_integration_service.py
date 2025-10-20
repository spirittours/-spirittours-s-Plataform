"""
System Integration Service
Connects all components: Virtual Guide, Transport Verification, GPS Navigation, Admin Dashboard
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func

from ..virtual_guide.ai_guide_personalities import AIVirtualGuideService, GuidePersonality, TourismType
from ..services.transport_verification_service import TransportVerificationService, VerificationMethod
from ..services.gps_navigation_service import GPSNavigationService, TravelMode
from ..cache.redis_cache import RedisCache
from ..services.notification_service import NotificationService
from ..services.websocket_manager import WebSocketManager

logger = logging.getLogger(__name__)

class SystemEventType(str, Enum):
    """System-wide event types"""
    # Journey Events
    JOURNEY_STARTED = "journey_started"
    JOURNEY_ARRIVAL = "journey_arrival"
    JOURNEY_PICKUP = "journey_pickup"
    JOURNEY_TOUR_START = "journey_tour_start"
    JOURNEY_LOCATION_REACHED = "journey_location_reached"
    JOURNEY_COMPLETED = "journey_completed"
    
    # Guide Events
    GUIDE_ACTIVATED = "guide_activated"
    GUIDE_SPEAKING = "guide_speaking"
    GUIDE_PERSONALITY_CHANGED = "guide_personality_changed"
    GUIDE_QUESTION_ANSWERED = "guide_question_answered"
    
    # Transport Events
    TRANSPORT_VERIFIED = "transport_verified"
    TRANSPORT_FRAUD_DETECTED = "transport_fraud_detected"
    TRANSPORT_LOCATION_UPDATE = "transport_location_update"
    TRANSPORT_ROUTE_DEVIATION = "transport_route_deviation"
    
    # Communication Events
    MESSAGE_SENT = "message_sent"
    EMERGENCY_ALERT = "emergency_alert"
    LOCATION_SHARED = "location_shared"
    
    # Admin Events
    ADMIN_INTERVENTION = "admin_intervention"
    ADMIN_MESSAGE_BROADCAST = "admin_message_broadcast"
    ADMIN_GUIDE_OVERRIDE = "admin_guide_override"

@dataclass
class SystemEvent:
    """System-wide event"""
    event_type: SystemEventType
    timestamp: datetime
    source: str  # Component that generated the event
    target: Optional[str]  # Component that should handle the event
    data: Dict[str, Any]
    priority: int  # 1 (low) to 5 (critical)
    require_acknowledgment: bool = False

class IntegratedJourneySession:
    """Integrated session managing all components for a journey"""
    
    def __init__(
        self,
        session_id: str,
        trip_id: str,
        user_id: str,
        group_ids: List[str],
        itinerary: Dict[str, Any]
    ):
        self.session_id = session_id
        self.trip_id = trip_id
        self.user_id = user_id
        self.group_ids = group_ids
        self.itinerary = itinerary
        
        # Component instances
        self.virtual_guide = None
        self.transport_session = None
        self.navigation_session = None
        self.communication_channel = None
        
        # State tracking
        self.current_stage = "initialized"
        self.current_location = None
        self.events_history = []
        self.active_alerts = []
        
        # Metrics
        self.start_time = datetime.utcnow()
        self.satisfaction_score = 0
        self.interaction_count = 0
        self.fraud_score = 0

class SystemIntegrationService:
    """Main integration service coordinating all components"""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.cache = RedisCache()
        self.notification_service = NotificationService()
        self.websocket_manager = WebSocketManager()
        
        # Initialize component services
        self.guide_service = AIVirtualGuideService(db_session)
        self.transport_service = TransportVerificationService(db_session)
        self.navigation_service = GPSNavigationService()
        
        # Active sessions
        self.active_sessions: Dict[str, IntegratedJourneySession] = {}
        
        # Event queue
        self.event_queue = asyncio.Queue()
        
        # Start event processor
        asyncio.create_task(self._process_events())
    
    async def start_integrated_journey(
        self,
        trip_data: Dict[str, Any]
    ) -> IntegratedJourneySession:
        """Start a fully integrated journey with all components"""
        
        logger.info(f"Starting integrated journey for trip {trip_data['trip_id']}")
        
        # Create integrated session
        session = IntegratedJourneySession(
            session_id=f"integrated_{trip_data['trip_id']}_{datetime.utcnow().timestamp()}",
            trip_id=trip_data['trip_id'],
            user_id=trip_data['user_id'],
            group_ids=trip_data.get('group_ids', []),
            itinerary=trip_data['itinerary']
        )
        
        # 1. Initialize Virtual Guide
        session.virtual_guide = await self.guide_service.create_virtual_guide(
            user_id=trip_data['user_id'],
            trip_id=trip_data['trip_id'],
            personality=GuidePersonality(trip_data.get('guide_personality', 'friendly_casual')),
            tourism_type=TourismType(trip_data.get('tourism_type', 'cultural')),
            language=trip_data.get('language', 'en-US'),
            perspective=trip_data.get('perspective'),
            group_size=trip_data.get('group_size', 1),
            special_requirements=trip_data.get('special_requirements')
        )
        
        # 2. Generate Transport Verification Codes
        verification_codes = await self.transport_service.generate_verification_codes(
            trip_id=trip_data['trip_id'],
            methods=[
                VerificationMethod.PIN_CODE,
                VerificationMethod.QR_CODE,
                VerificationMethod.GPS_LOCATION
            ]
        )
        
        # 3. Initialize Navigation
        if trip_data['itinerary'].get('destinations'):
            first_destination = trip_data['itinerary']['destinations'][0]
            route = await self.navigation_service.get_turn_by_turn_directions(
                origin=trip_data.get('pickup_location', (0, 0)),
                destination=(first_destination['latitude'], first_destination['longitude']),
                mode=TravelMode.WALKING
            )
            
            session.navigation_session = await self.navigation_service.start_navigation_session(
                user_id=trip_data['user_id'],
                route=route,
                guide_personality=trip_data.get('guide_personality')
            )
        
        # 4. Create Communication Channel
        session.communication_channel = await self._create_communication_channel(
            trip_id=trip_data['trip_id'],
            participants=[
                {'id': trip_data['user_id'], 'role': 'tourist'},
                {'id': trip_data.get('driver_id'), 'role': 'driver'},
                {'id': 'admin', 'role': 'admin'}
            ]
        )
        
        # 5. Send initial notifications
        await self._send_journey_start_notifications(session, verification_codes)
        
        # 6. Register session
        self.active_sessions[session.session_id] = session
        
        # 7. Emit start event
        await self.emit_event(SystemEvent(
            event_type=SystemEventType.JOURNEY_STARTED,
            timestamp=datetime.utcnow(),
            source="integration_service",
            target="admin_dashboard",
            data={
                "session_id": session.session_id,
                "trip_id": trip_data['trip_id'],
                "guide": session.virtual_guide.profile.name,
                "verification_codes": verification_codes['verification_data']
            },
            priority=3
        ))
        
        # 8. Start welcome message from guide
        welcome = await session.virtual_guide.generate_introduction()
        await self._broadcast_to_session(session.session_id, {
            "type": "guide_message",
            "data": welcome
        })
        
        return session
    
    async def handle_location_update(
        self,
        session_id: str,
        location: Tuple[float, float],
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Handle location update from any component"""
        
        session = self.active_sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        session.current_location = location
        responses = {}
        
        # 1. Update Virtual Guide
        if session.virtual_guide:
            guide_response = await session.virtual_guide.navigate_step_by_step(
                current_location=location,
                destination=self._get_next_destination(session),
                explain_surroundings=True
            )
            responses['guide'] = guide_response
        
        # 2. Update Transport Tracking
        if session.transport_session:
            tracking_response = await self.transport_service.track_real_time_location(
                trip_id=session.trip_id,
                location=location,
                speed=metadata.get('speed') if metadata else None,
                heading=metadata.get('heading') if metadata else None
            )
            responses['transport'] = tracking_response
            
            # Check for fraud indicators
            if tracking_response.get('fraud_score', 0) > 70:
                await self._handle_fraud_detection(session, tracking_response)
        
        # 3. Update Navigation
        if session.navigation_session:
            nav_response = await session.navigation_session.update_location(
                location=location,
                heading=metadata.get('heading') if metadata else None,
                speed=metadata.get('speed') if metadata else None
            )
            responses['navigation'] = nav_response
        
        # 4. Broadcast to communication channel
        await self._broadcast_location_update(session, location, responses)
        
        # 5. Check for proximity triggers
        await self._check_proximity_triggers(session, location)
        
        # 6. Update admin dashboard
        await self.websocket_manager.broadcast_to_admins({
            "type": "location_update",
            "session_id": session_id,
            "location": {"lat": location[0], "lng": location[1]},
            "responses": responses
        })
        
        return {
            "status": "updated",
            "location": location,
            "responses": responses,
            "stage": session.current_stage
        }
    
    async def verify_transport(
        self,
        session_id: str,
        method: VerificationMethod,
        verification_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Verify transport with integrated response"""
        
        session = self.active_sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        # Perform verification
        result = await self.transport_service.verify_transport(
            trip_id=session.trip_id,
            method=method,
            verification_data=verification_data
        )
        
        # Update session
        session.fraud_score = result.confidence_score
        
        # Guide responds to verification
        if session.virtual_guide:
            if result.status.value == "verified":
                guide_message = await self._generate_guide_response(
                    session.virtual_guide,
                    "transport_verified",
                    {"driver_name": verification_data.get('driver_name')}
                )
            else:
                guide_message = await self._generate_guide_response(
                    session.virtual_guide,
                    "transport_failed",
                    {"reason": result.details.get('error')}
                )
            
            await self._broadcast_to_session(session_id, {
                "type": "guide_message",
                "data": {"text": guide_message, "audio_url": None}
            })
        
        # Emit event
        await self.emit_event(SystemEvent(
            event_type=SystemEventType.TRANSPORT_VERIFIED if result.status.value == "verified" 
                       else SystemEventType.TRANSPORT_FRAUD_DETECTED,
            timestamp=datetime.utcnow(),
            source="transport_service",
            target="admin_dashboard",
            data={
                "session_id": session_id,
                "verification_result": result.__dict__
            },
            priority=4 if result.fraud_indicators else 2
        ))
        
        return {
            "verification_result": result.__dict__,
            "guide_response": guide_message if 'guide_message' in locals() else None,
            "session_status": session.current_stage
        }
    
    async def handle_user_question(
        self,
        session_id: str,
        question: str,
        context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Handle user question with integrated response"""
        
        session = self.active_sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        session.interaction_count += 1
        
        # Get answer from virtual guide
        answer = await session.virtual_guide.answer_question(question, context)
        
        # Log interaction
        await self._log_interaction(session, "question", {
            "question": question,
            "answer": answer['answer']
        })
        
        # Check if question relates to navigation
        if self._is_navigation_question(question):
            nav_info = await self._get_navigation_context(session)
            answer['navigation_context'] = nav_info
        
        # Broadcast to channel
        await self._broadcast_to_session(session_id, {
            "type": "qa_interaction",
            "data": {
                "question": question,
                "answer": answer
            }
        })
        
        return answer
    
    async def change_guide_personality(
        self,
        session_id: str,
        new_personality: GuidePersonality
    ) -> Dict[str, Any]:
        """Change guide personality mid-journey"""
        
        session = self.active_sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        # Switch personality
        result = await session.virtual_guide.switch_personality(new_personality)
        
        # Notify all components
        await self.emit_event(SystemEvent(
            event_type=SystemEventType.GUIDE_PERSONALITY_CHANGED,
            timestamp=datetime.utcnow(),
            source="integration_service",
            target="all",
            data={
                "session_id": session_id,
                "old_personality": result['previous_guide'],
                "new_personality": result['new_guide']
            },
            priority=2
        ))
        
        # Broadcast to users
        await self._broadcast_to_session(session_id, {
            "type": "personality_change",
            "data": result
        })
        
        return result
    
    async def broadcast_admin_message(
        self,
        target: str,  # "all", session_id, or group_id
        message: str,
        priority: str = "normal"
    ) -> Dict[str, Any]:
        """Broadcast message from admin dashboard"""
        
        recipients = []
        
        if target == "all":
            recipients = list(self.active_sessions.keys())
        elif target in self.active_sessions:
            recipients = [target]
        else:
            # Find sessions with matching group
            for session_id, session in self.active_sessions.items():
                if target in session.group_ids:
                    recipients.append(session_id)
        
        # Send to each recipient
        for session_id in recipients:
            await self._broadcast_to_session(session_id, {
                "type": "admin_message",
                "data": {
                    "message": message,
                    "priority": priority,
                    "timestamp": datetime.utcnow().isoformat()
                }
            })
            
            # If high priority, also have guide announce it
            if priority == "high" and session_id in self.active_sessions:
                session = self.active_sessions[session_id]
                if session.virtual_guide:
                    guide_announcement = await self._generate_guide_response(
                        session.virtual_guide,
                        "admin_announcement",
                        {"message": message}
                    )
                    await self._broadcast_to_session(session_id, {
                        "type": "guide_announcement",
                        "data": {"text": guide_announcement}
                    })
        
        return {
            "recipients_count": len(recipients),
            "recipients": recipients,
            "message": message,
            "priority": priority
        }
    
    async def handle_emergency(
        self,
        session_id: str,
        emergency_type: str,
        details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle emergency situation"""
        
        session = self.active_sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        # 1. Alert admin dashboard immediately
        await self.emit_event(SystemEvent(
            event_type=SystemEventType.EMERGENCY_ALERT,
            timestamp=datetime.utcnow(),
            source="integration_service",
            target="admin_dashboard",
            data={
                "session_id": session_id,
                "emergency_type": emergency_type,
                "details": details,
                "location": session.current_location,
                "participants": self._get_session_participants(session)
            },
            priority=5,
            require_acknowledgment=True
        ))
        
        # 2. Guide provides emergency assistance
        if session.virtual_guide:
            emergency_guidance = await self._generate_guide_response(
                session.virtual_guide,
                f"emergency_{emergency_type}",
                details
            )
            
            await self._broadcast_to_session(session_id, {
                "type": "emergency_guidance",
                "data": {
                    "text": emergency_guidance,
                    "emergency_type": emergency_type,
                    "emergency_contacts": self._get_emergency_contacts(session)
                }
            })
        
        # 3. Share location with emergency services
        if session.current_location:
            await self._share_emergency_location(session)
        
        # 4. Open priority communication channel
        await self._open_emergency_channel(session)
        
        # 5. Log emergency
        await self._log_emergency(session, emergency_type, details)
        
        return {
            "status": "emergency_handled",
            "emergency_id": f"EM_{session_id}_{datetime.utcnow().timestamp()}",
            "guidance_provided": True,
            "admin_alerted": True,
            "emergency_contacts": self._get_emergency_contacts(session)
        }
    
    async def get_session_analytics(
        self,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get analytics for session(s)"""
        
        if session_id:
            session = self.active_sessions.get(session_id)
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            return self._calculate_session_metrics(session)
        else:
            # Return analytics for all active sessions
            analytics = {
                "total_active_sessions": len(self.active_sessions),
                "sessions": []
            }
            
            for sid, session in self.active_sessions.items():
                analytics["sessions"].append({
                    "session_id": sid,
                    "metrics": self._calculate_session_metrics(session)
                })
            
            return analytics
    
    # Helper methods
    
    async def _process_events(self):
        """Process system events asynchronously"""
        while True:
            try:
                event = await self.event_queue.get()
                await self._handle_event(event)
            except Exception as e:
                logger.error(f"Error processing event: {e}")
            await asyncio.sleep(0.1)
    
    async def _handle_event(self, event: SystemEvent):
        """Handle a system event"""
        
        # Route to appropriate handler
        if event.target == "admin_dashboard":
            await self.websocket_manager.send_to_admin_dashboard(event.data)
        elif event.target == "all":
            await self._broadcast_to_all_sessions(event.data)
        elif event.target in self.active_sessions:
            await self._broadcast_to_session(event.target, event.data)
        
        # Log high-priority events
        if event.priority >= 4:
            logger.warning(f"High priority event: {event.event_type} - {event.data}")
        
        # Handle acknowledgment if required
        if event.require_acknowledgment:
            await self._wait_for_acknowledgment(event)
    
    async def emit_event(self, event: SystemEvent):
        """Emit a system event"""
        await self.event_queue.put(event)
        
        # Store in event history
        if event.data.get('session_id') in self.active_sessions:
            session = self.active_sessions[event.data['session_id']]
            session.events_history.append(event)
    
    async def _broadcast_to_session(self, session_id: str, data: Dict):
        """Broadcast data to all participants in a session"""
        await self.websocket_manager.broadcast_to_session(session_id, data)
    
    async def _broadcast_to_all_sessions(self, data: Dict):
        """Broadcast data to all active sessions"""
        for session_id in self.active_sessions:
            await self._broadcast_to_session(session_id, data)
    
    def _get_next_destination(self, session: IntegratedJourneySession) -> Optional[Dict]:
        """Get next destination from itinerary"""
        if not session.itinerary.get('destinations'):
            return None
        
        # Find next unvisited destination
        for dest in session.itinerary['destinations']:
            if dest['id'] not in session.virtual_guide.visited_locations:
                return dest
        
        return None
    
    async def _generate_guide_response(
        self,
        guide,
        scenario: str,
        context: Dict
    ) -> str:
        """Generate contextual guide response"""
        
        templates = {
            "transport_verified": f"Great! I see you've met {context.get('driver_name', 'your driver')}. Let's start our adventure!",
            "transport_failed": f"Hmm, there seems to be an issue with verification. {context.get('reason', 'Please try again.')}",
            "admin_announcement": f"Important message from our team: {context.get('message', '')}",
            "emergency_medical": "Stay calm. Help is on the way. Is the person conscious and breathing?",
            "emergency_security": "Your safety is our priority. Move to a safe location if possible.",
            "emergency_lost": "Don't worry, I'll help you find your way. Can you see any landmarks?"
        }
        
        base_response = templates.get(scenario, "Let me help you with that.")
        
        # Add personality flavor
        if guide.profile.personality == GuidePersonality.COMEDIAN_FUNNY:
            base_response += " But hey, at least we're having an adventure, right?"
        elif guide.profile.personality == GuidePersonality.WARM_MATERNAL:
            base_response += " Don't worry dear, everything will be fine."
        
        return base_response
    
    async def _check_proximity_triggers(
        self,
        session: IntegratedJourneySession,
        location: Tuple[float, float]
    ):
        """Check for proximity-based triggers"""
        
        # Check distance to destinations
        if session.itinerary.get('destinations'):
            for dest in session.itinerary['destinations']:
                distance = self._calculate_distance(
                    location,
                    (dest['latitude'], dest['longitude'])
                )
                
                if distance < 50 and dest['id'] not in session.virtual_guide.visited_locations:
                    # Trigger arrival at destination
                    await session.virtual_guide.explain_location(dest)
                    session.virtual_guide.visited_locations.append(dest['id'])
                    
                    # Emit event
                    await self.emit_event(SystemEvent(
                        event_type=SystemEventType.JOURNEY_LOCATION_REACHED,
                        timestamp=datetime.utcnow(),
                        source="integration_service",
                        target="admin_dashboard",
                        data={
                            "session_id": session.session_id,
                            "destination": dest,
                            "arrival_time": datetime.utcnow().isoformat()
                        },
                        priority=2
                    ))
    
    def _calculate_distance(self, loc1: Tuple[float, float], loc2: Tuple[float, float]) -> float:
        """Calculate distance between two points in meters"""
        from geopy.distance import geodesic
        return geodesic(loc1, loc2).meters
    
    def _calculate_session_metrics(self, session: IntegratedJourneySession) -> Dict:
        """Calculate metrics for a session"""
        
        duration = (datetime.utcnow() - session.start_time).total_seconds()
        
        return {
            "duration_minutes": duration / 60,
            "interaction_count": session.interaction_count,
            "satisfaction_score": session.satisfaction_score,
            "fraud_score": session.fraud_score,
            "visited_locations": len(session.virtual_guide.visited_locations) if session.virtual_guide else 0,
            "total_locations": len(session.itinerary.get('destinations', [])),
            "completion_percentage": (
                len(session.virtual_guide.visited_locations) / 
                max(len(session.itinerary.get('destinations', [])), 1) * 100
            ) if session.virtual_guide else 0,
            "active_alerts": len(session.active_alerts),
            "current_stage": session.current_stage
        }
    
    async def _handle_fraud_detection(
        self,
        session: IntegratedJourneySession,
        tracking_response: Dict
    ):
        """Handle fraud detection"""
        
        # Alert admin
        await self.emit_event(SystemEvent(
            event_type=SystemEventType.TRANSPORT_FRAUD_DETECTED,
            timestamp=datetime.utcnow(),
            source="transport_service",
            target="admin_dashboard",
            data={
                "session_id": session.session_id,
                "fraud_score": tracking_response['fraud_score'],
                "indicators": tracking_response.get('anomalies', []),
                "location": session.current_location
            },
            priority=4,
            require_acknowledgment=True
        ))
        
        # Guide warns passengers
        if session.virtual_guide:
            warning = await self._generate_guide_response(
                session.virtual_guide,
                "fraud_warning",
                {"indicators": tracking_response.get('anomalies', [])}
            )
            
            await self._broadcast_to_session(session.session_id, {
                "type": "security_warning",
                "data": {"text": warning, "severity": "high"}
            })
    
    async def _create_communication_channel(
        self,
        trip_id: str,
        participants: List[Dict]
    ) -> str:
        """Create communication channel for trip"""
        
        channel_id = f"channel_{trip_id}_{datetime.utcnow().timestamp()}"
        
        # Register channel in cache
        await self.cache.set(
            f"channel:{channel_id}",
            json.dumps({
                "trip_id": trip_id,
                "participants": participants,
                "created_at": datetime.utcnow().isoformat()
            }),
            expire=86400  # 24 hours
        )
        
        return channel_id
    
    async def _broadcast_location_update(
        self,
        session: IntegratedJourneySession,
        location: Tuple[float, float],
        responses: Dict
    ):
        """Broadcast location update to communication channel"""
        
        await self._broadcast_to_session(session.session_id, {
            "type": "location_update",
            "data": {
                "location": {"lat": location[0], "lng": location[1]},
                "navigation": responses.get('navigation'),
                "guide_commentary": responses.get('guide', {}).get('guide_commentary')
            }
        })
    
    def _get_session_participants(self, session: IntegratedJourneySession) -> List[Dict]:
        """Get list of session participants"""
        return [
            {"id": session.user_id, "role": "tourist"},
            {"id": "driver_001", "role": "driver"},  # Would get from session
            {"id": "admin", "role": "admin"}
        ]
    
    def _get_emergency_contacts(self, session: IntegratedJourneySession) -> Dict:
        """Get emergency contacts for location"""
        return {
            "police": "100",
            "medical": "101",
            "tourist_police": "+972-2-5391111",
            "embassy": "+972-3-5193555",
            "local_support": "+972-50-1234567"
        }
    
    async def _share_emergency_location(self, session: IntegratedJourneySession):
        """Share location with emergency services"""
        # Implementation would integrate with emergency services API
        pass
    
    async def _open_emergency_channel(self, session: IntegratedJourneySession):
        """Open priority emergency communication channel"""
        # Implementation would create high-priority WebRTC connection
        pass
    
    async def _log_emergency(
        self,
        session: IntegratedJourneySession,
        emergency_type: str,
        details: Dict
    ):
        """Log emergency incident"""
        # Store in database for records
        pass
    
    async def _log_interaction(
        self,
        session: IntegratedJourneySession,
        interaction_type: str,
        data: Dict
    ):
        """Log user interaction for analytics"""
        # Store interaction data
        pass
    
    def _is_navigation_question(self, question: str) -> bool:
        """Check if question relates to navigation"""
        nav_keywords = [
            'where', 'how far', 'distance', 'time', 'route',
            'way', 'direction', 'navigate', 'lost', 'find'
        ]
        return any(keyword in question.lower() for keyword in nav_keywords)
    
    async def _get_navigation_context(self, session: IntegratedJourneySession) -> Dict:
        """Get current navigation context"""
        if not session.navigation_session:
            return {}
        
        return {
            "current_step": session.navigation_session.current_step_index,
            "distance_to_turn": session.navigation_session.distance_to_next_turn,
            "total_remaining": session.navigation_session._calculate_remaining_distance(),
            "estimated_arrival": session.navigation_session._estimate_arrival().isoformat()
        }
    
    async def _send_journey_start_notifications(
        self,
        session: IntegratedJourneySession,
        verification_codes: Dict
    ):
        """Send notifications for journey start"""
        
        # Send to user
        await self.notification_service.send_notification(
            user_id=session.user_id,
            title="Your Journey Begins!",
            message=f"Your guide {session.virtual_guide.profile.name} is ready. Verification PIN: {verification_codes['verification_data'].get('pin_code')}",
            data={"session_id": session.session_id}
        )
        
        # Send to driver if assigned
        if session.transport_session:
            await self.notification_service.send_notification(
                user_id=session.transport_session.driver_id,
                title="New Pickup Assignment",
                message=f"Trip {session.trip_id} - Verification required",
                data={"trip_id": session.trip_id}
            )
    
    async def _wait_for_acknowledgment(self, event: SystemEvent):
        """Wait for event acknowledgment"""
        # Implementation would wait for admin acknowledgment
        pass