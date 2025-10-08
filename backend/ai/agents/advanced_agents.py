"""
AI Agents Avanzados para Spirit Tours
Conserje virtual, traductor en tiempo real, negociador de precios y guía holográfico
"""

import asyncio
import json
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass
import numpy as np
from pydantic import BaseModel, Field
import websockets
import speech_recognition as sr
from gtts import gTTS
import io
import wave
import pyaudio

# AI Libraries
try:
    import openai
    from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
    import torch
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False
    print("AI libraries not available. Install with: pip install openai transformers torch")

# Enums
class AgentType(str, Enum):
    CONCIERGE = "concierge"
    TRANSLATOR = "translator"
    NEGOTIATOR = "negotiator"
    HOLOGRAPHIC_GUIDE = "holographic_guide"
    EMERGENCY_ASSISTANT = "emergency_assistant"
    CULTURAL_ADVISOR = "cultural_advisor"
    ITINERARY_OPTIMIZER = "itinerary_optimizer"
    WEATHER_PREDICTOR = "weather_predictor"

class ConversationMode(str, Enum):
    TEXT = "text"
    VOICE = "voice"
    VIDEO = "video"
    AR = "ar"
    HOLOGRAPHIC = "holographic"

class EmotionalTone(str, Enum):
    FRIENDLY = "friendly"
    PROFESSIONAL = "professional"
    EMPATHETIC = "empathetic"
    EXCITED = "excited"
    CALM = "calm"
    URGENT = "urgent"

# Data Models
@dataclass
class AgentPersonality:
    """AI Agent personality configuration"""
    name: str
    avatar: str
    voice_type: str
    language_proficiency: List[str]
    personality_traits: List[str]
    knowledge_domains: List[str]
    emotional_intelligence: float  # 0-1
    humor_level: float  # 0-1
    formality_level: float  # 0-1

@dataclass
class ConversationContext:
    """Context for ongoing conversation"""
    session_id: str
    user_id: str
    agent_type: AgentType
    language: str
    location: Optional[Dict[str, float]]
    preferences: Dict[str, Any]
    history: List[Dict[str, str]]
    emotional_state: EmotionalTone
    current_task: Optional[str]
    metadata: Dict[str, Any]

class Message(BaseModel):
    """Message in conversation"""
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime
    language: str
    translated: Optional[str] = None
    emotion: Optional[EmotionalTone] = None
    confidence: float = 1.0
    metadata: Dict[str, Any] = {}

class ServiceRequest(BaseModel):
    """Service request from user"""
    request_type: str
    details: str
    urgency: str  # "low", "medium", "high", "emergency"
    location: Optional[Dict[str, float]] = None
    preferences: Dict[str, Any] = {}
    budget: Optional[float] = None
    datetime_needed: Optional[datetime] = None

class NegotiationOffer(BaseModel):
    """Negotiation offer details"""
    item_id: str
    current_price: float
    target_price: float
    max_price: float
    vendor_id: str
    negotiation_rounds: int = 0
    status: str = "pending"
    final_price: Optional[float] = None


class VirtualConcierge:
    """
    24/7 Virtual Concierge AI Agent
    """
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        if api_key:
            openai.api_key = api_key
        
        self.personality = AgentPersonality(
            name="Sophie",
            avatar="concierge_avatar_01",
            voice_type="female_professional",
            language_proficiency=["en", "es", "fr", "de", "it", "ja", "zh"],
            personality_traits=["helpful", "knowledgeable", "patient", "proactive"],
            knowledge_domains=["travel", "hospitality", "local_culture", "dining", "events"],
            emotional_intelligence=0.9,
            humor_level=0.3,
            formality_level=0.7
        )
        
        self.active_sessions = {}
        self.service_providers = self._load_service_providers()
    
    def _load_service_providers(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load service provider database"""
        
        return {
            "restaurants": [
                {
                    "id": "rest_001",
                    "name": "Le Bernardin",
                    "type": "fine_dining",
                    "cuisine": "French",
                    "price_range": "$$$$$",
                    "rating": 4.9,
                    "availability": "reservation_required"
                },
                {
                    "id": "rest_002",
                    "name": "Joe's Pizza",
                    "type": "casual",
                    "cuisine": "Italian",
                    "price_range": "$$",
                    "rating": 4.5,
                    "availability": "walk_in"
                }
            ],
            "transportation": [
                {
                    "id": "trans_001",
                    "type": "luxury_car",
                    "provider": "Elite Transfers",
                    "price_per_hour": 150,
                    "availability": "24/7"
                },
                {
                    "id": "trans_002",
                    "type": "taxi",
                    "provider": "City Cabs",
                    "price_per_mile": 3.5,
                    "availability": "24/7"
                }
            ],
            "experiences": [
                {
                    "id": "exp_001",
                    "name": "Private Museum Tour",
                    "duration": "3 hours",
                    "price": 200,
                    "availability": "booking_required"
                }
            ]
        }
    
    async def start_conversation(
        self,
        user_id: str,
        initial_message: str,
        language: str = "en",
        mode: ConversationMode = ConversationMode.TEXT
    ) -> ConversationContext:
        """Start a new conversation with the concierge"""
        
        session_id = f"concierge_{user_id}_{datetime.now().timestamp()}"
        
        context = ConversationContext(
            session_id=session_id,
            user_id=user_id,
            agent_type=AgentType.CONCIERGE,
            language=language,
            location=None,
            preferences={},
            history=[],
            emotional_state=EmotionalTone.FRIENDLY,
            current_task=None,
            metadata={"mode": mode.value}
        )
        
        self.active_sessions[session_id] = context
        
        # Process initial message
        response = await self.process_message(session_id, initial_message)
        
        return context
    
    async def process_message(
        self,
        session_id: str,
        message: str
    ) -> Message:
        """Process user message and generate response"""
        
        context = self.active_sessions.get(session_id)
        if not context:
            raise ValueError(f"Session {session_id} not found")
        
        # Add to history
        user_message = Message(
            role="user",
            content=message,
            timestamp=datetime.now(),
            language=context.language
        )
        context.history.append(user_message.dict())
        
        # Analyze intent
        intent = await self._analyze_intent(message, context)
        
        # Generate response based on intent
        response = await self._generate_response(intent, context)
        
        # Add to history
        assistant_message = Message(
            role="assistant",
            content=response,
            timestamp=datetime.now(),
            language=context.language,
            emotion=context.emotional_state
        )
        context.history.append(assistant_message.dict())
        
        return assistant_message
    
    async def _analyze_intent(
        self,
        message: str,
        context: ConversationContext
    ) -> Dict[str, Any]:
        """Analyze user intent from message"""
        
        # Use GPT to analyze intent
        prompt = f"""
        Analyze the user's intent from this message:
        Message: {message}
        Context: User is traveling, current task: {context.current_task}
        
        Determine:
        1. Primary intent (booking, information, recommendation, assistance, emergency)
        2. Specific service needed
        3. Urgency level
        4. Any mentioned constraints (time, budget, preferences)
        
        Return as JSON.
        """
        
        if AI_AVAILABLE and openai.api_key:
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a travel concierge AI analyzing user requests."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )
            
            try:
                intent = json.loads(response.choices[0].message.content)
            except:
                intent = {
                    "primary_intent": "information",
                    "service": "general",
                    "urgency": "medium",
                    "constraints": {}
                }
        else:
            # Fallback intent analysis
            intent = {
                "primary_intent": "information",
                "service": "general",
                "urgency": "medium",
                "constraints": {}
            }
        
        return intent
    
    async def _generate_response(
        self,
        intent: Dict[str, Any],
        context: ConversationContext
    ) -> str:
        """Generate appropriate response based on intent"""
        
        if intent["primary_intent"] == "booking":
            return await self._handle_booking(intent, context)
        elif intent["primary_intent"] == "recommendation":
            return await self._provide_recommendation(intent, context)
        elif intent["primary_intent"] == "emergency":
            return await self._handle_emergency(intent, context)
        elif intent["primary_intent"] == "assistance":
            return await self._provide_assistance(intent, context)
        else:
            return await self._provide_information(intent, context)
    
    async def _handle_booking(
        self,
        intent: Dict[str, Any],
        context: ConversationContext
    ) -> str:
        """Handle booking requests"""
        
        service = intent.get("service", "general")
        
        if service == "restaurant":
            # Find available restaurants
            restaurants = self.service_providers["restaurants"]
            available = [r for r in restaurants if r["availability"] != "fully_booked"]
            
            if available:
                recommendations = "\n".join([
                    f"- {r['name']}: {r['cuisine']}, {r['price_range']}, Rating: {r['rating']}"
                    for r in available[:3]
                ])
                
                return f"""I'd be happy to help you with restaurant reservations! 

Here are some excellent options:
{recommendations}

Which restaurant would you prefer? I can make the reservation for you right away."""
            else:
                return "I apologize, but restaurants are quite busy today. Would you like me to check availability for tomorrow or suggest alternative dining options?"
        
        elif service == "transportation":
            return """I can arrange transportation for you. We have several options:
- Luxury car service: $150/hour
- Standard taxi: $3.50/mile
- Ride-sharing available

What type of transportation would you prefer, and where would you like to go?"""
        
        else:
            return "I'd be happy to help with your booking. Could you please specify what you'd like to book?"
    
    async def _provide_recommendation(
        self,
        intent: Dict[str, Any],
        context: ConversationContext
    ) -> str:
        """Provide personalized recommendations"""
        
        # Generate recommendations based on context
        recommendations = await self._generate_recommendations(context)
        
        return f"""Based on your preferences, I highly recommend:

1. **Morning**: Visit the local artisan market - it's less crowded before 10 AM
2. **Lunch**: Try the hidden gem restaurant "La Terrazza" - amazing views and authentic cuisine
3. **Afternoon**: Take a guided tour of the historic district with our exclusive local guide
4. **Evening**: Enjoy the sunset from the Observatory Deck - I can reserve VIP access

Would you like me to arrange any of these experiences for you?"""
    
    async def _handle_emergency(
        self,
        intent: Dict[str, Any],
        context: ConversationContext
    ) -> str:
        """Handle emergency situations"""
        
        context.emotional_state = EmotionalTone.URGENT
        
        return """I understand this is an emergency. I'm here to help immediately.

Emergency Services:
- Medical Emergency: Calling local emergency services now...
- Nearest Hospital: City General, 2 miles away
- Embassy Contact: Available 24/7 at +1-555-EMBASSY

I'm also notifying our emergency response team. 
Please stay calm. Help is on the way.

Can you describe your emergency so I can provide more specific assistance?"""
    
    async def _provide_assistance(
        self,
        intent: Dict[str, Any],
        context: ConversationContext
    ) -> str:
        """Provide general assistance"""
        
        return """I'm here to assist you with anything you need during your stay. I can help with:

- Restaurant reservations and recommendations
- Transportation arrangements
- Tickets for events and attractions
- Spa and wellness bookings
- Local area information
- Emergency assistance
- Language translation
- Currency exchange locations

What can I help you with today?"""
    
    async def _provide_information(
        self,
        intent: Dict[str, Any],
        context: ConversationContext
    ) -> str:
        """Provide general information"""
        
        return """I'd be happy to provide you with information. Here are some quick facts about your current location:

- Weather today: Sunny, 75°F (24°C)
- Local time: 2:30 PM
- Currency: USD ($1 = €0.92)
- Nearby attractions: Central Park (0.5 mi), Museum of Art (1 mi)
- Recommended nearby restaurant: Café Luna (5-min walk)

Is there something specific you'd like to know about?"""
    
    async def _generate_recommendations(
        self,
        context: ConversationContext
    ) -> List[Dict[str, Any]]:
        """Generate personalized recommendations"""
        
        # This would use ML models and user preferences
        return [
            {"type": "restaurant", "name": "Le Bernardin", "reason": "Fine dining"},
            {"type": "activity", "name": "Museum Tour", "reason": "Cultural interest"},
            {"type": "spa", "name": "Wellness Center", "reason": "Relaxation"}
        ]
    
    async def handle_voice_input(
        self,
        audio_data: bytes,
        session_id: str
    ) -> Tuple[str, bytes]:
        """Handle voice input and return voice response"""
        
        # Speech to text
        recognizer = sr.Recognizer()
        audio = sr.AudioData(audio_data, 16000, 2)
        
        try:
            text = recognizer.recognize_google(audio)
        except:
            text = "Could not understand audio"
        
        # Process message
        response = await self.process_message(session_id, text)
        
        # Text to speech
        tts = gTTS(response.content, lang=response.language)
        audio_output = io.BytesIO()
        tts.save(audio_output)
        
        return text, audio_output.getvalue()
    
    async def create_service_request(
        self,
        session_id: str,
        request_type: str,
        details: str,
        urgency: str = "medium"
    ) -> ServiceRequest:
        """Create a formal service request"""
        
        context = self.active_sessions.get(session_id)
        if not context:
            raise ValueError(f"Session {session_id} not found")
        
        request = ServiceRequest(
            request_type=request_type,
            details=details,
            urgency=urgency,
            location=context.location,
            preferences=context.preferences,
            datetime_needed=datetime.now() + timedelta(hours=1)
        )
        
        # Process request
        await self._process_service_request(request)
        
        return request
    
    async def _process_service_request(self, request: ServiceRequest):
        """Process and fulfill service request"""
        
        # This would integrate with actual service providers
        pass


class RealTimeTranslator:
    """
    Real-time AI Translator Agent
    """
    
    def __init__(self):
        if AI_AVAILABLE:
            # Load translation models
            self.translator = pipeline("translation", model="Helsinki-NLP/opus-mt-en-es")
            self.tokenizer = AutoTokenizer.from_pretrained("Helsinki-NLP/opus-mt-en-es")
        else:
            self.translator = None
            self.tokenizer = None
        
        self.language_pairs = self._load_language_pairs()
        self.active_sessions = {}
    
    def _load_language_pairs(self) -> Dict[str, str]:
        """Load supported language pairs"""
        
        return {
            "en-es": "Helsinki-NLP/opus-mt-en-es",
            "es-en": "Helsinki-NLP/opus-mt-es-en",
            "en-fr": "Helsinki-NLP/opus-mt-en-fr",
            "fr-en": "Helsinki-NLP/opus-mt-fr-en",
            "en-de": "Helsinki-NLP/opus-mt-en-de",
            "de-en": "Helsinki-NLP/opus-mt-de-en",
            "en-zh": "Helsinki-NLP/opus-mt-en-zh",
            "zh-en": "Helsinki-NLP/opus-mt-zh-en",
            "en-ja": "Helsinki-NLP/opus-mt-en-ja",
            "ja-en": "Helsinki-NLP/opus-mt-ja-en"
        }
    
    async def translate_text(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        context: Optional[str] = None
    ) -> Dict[str, Any]:
        """Translate text between languages"""
        
        # Check if language pair is supported
        pair_key = f"{source_lang}-{target_lang}"
        
        if pair_key not in self.language_pairs:
            return {
                "success": False,
                "error": f"Language pair {pair_key} not supported",
                "original": text,
                "translated": text
            }
        
        if self.translator:
            # Use AI model for translation
            try:
                # Add context if provided
                if context:
                    text_with_context = f"Context: {context}. Text: {text}"
                else:
                    text_with_context = text
                
                result = self.translator(text_with_context)
                translated = result[0]["translation_text"]
                
                return {
                    "success": True,
                    "original": text,
                    "translated": translated,
                    "source_lang": source_lang,
                    "target_lang": target_lang,
                    "confidence": 0.95
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e),
                    "original": text,
                    "translated": text
                }
        else:
            # Fallback translation (mock)
            return {
                "success": True,
                "original": text,
                "translated": f"[Translated to {target_lang}] {text}",
                "source_lang": source_lang,
                "target_lang": target_lang,
                "confidence": 0.5
            }
    
    async def start_live_translation(
        self,
        session_id: str,
        source_lang: str,
        target_lang: str
    ) -> websockets.WebSocketServerProtocol:
        """Start live translation session"""
        
        self.active_sessions[session_id] = {
            "source_lang": source_lang,
            "target_lang": target_lang,
            "start_time": datetime.now(),
            "messages_translated": 0
        }
        
        # Create WebSocket server for real-time translation
        async def translation_handler(websocket, path):
            async for message in websocket:
                # Translate message
                translation = await self.translate_text(
                    message,
                    source_lang,
                    target_lang
                )
                
                # Send back translated text
                await websocket.send(json.dumps(translation))
                
                # Update session stats
                self.active_sessions[session_id]["messages_translated"] += 1
        
        # Start WebSocket server
        return await websockets.serve(translation_handler, "localhost", 8765)
    
    async def translate_conversation(
        self,
        messages: List[Message],
        target_lang: str
    ) -> List[Message]:
        """Translate entire conversation history"""
        
        translated_messages = []
        
        for message in messages:
            if message.language != target_lang:
                translation = await self.translate_text(
                    message.content,
                    message.language,
                    target_lang
                )
                
                message.translated = translation["translated"]
            
            translated_messages.append(message)
        
        return translated_messages
    
    async def detect_language(self, text: str) -> str:
        """Detect language of text"""
        
        # Use language detection model
        # For now, return mock detection
        if any(char in text for char in "áéíóúñ"):
            return "es"
        elif any(char in text for char in "àèìòù"):
            return "fr"
        elif any(char in text for char in "äöüß"):
            return "de"
        elif any(ord(char) > 0x4e00 and ord(char) < 0x9fff for char in text):
            return "zh"
        elif any(ord(char) > 0x3040 and ord(char) < 0x309f for char in text):
            return "ja"
        else:
            return "en"


class PriceNegotiator:
    """
    AI Price Negotiation Agent
    """
    
    def __init__(self):
        self.negotiation_strategies = self._load_strategies()
        self.vendor_profiles = self._load_vendor_profiles()
        self.active_negotiations = {}
    
    def _load_strategies(self) -> Dict[str, Any]:
        """Load negotiation strategies"""
        
        return {
            "aggressive": {
                "initial_offer": 0.6,  # 60% of asking price
                "increment": 0.05,
                "max_rounds": 5,
                "walk_away": 0.85
            },
            "moderate": {
                "initial_offer": 0.75,
                "increment": 0.03,
                "max_rounds": 4,
                "walk_away": 0.92
            },
            "conservative": {
                "initial_offer": 0.85,
                "increment": 0.02,
                "max_rounds": 3,
                "walk_away": 0.95
            }
        }
    
    def _load_vendor_profiles(self) -> Dict[str, Any]:
        """Load vendor negotiation profiles"""
        
        return {
            "flexible": {
                "acceptance_threshold": 0.8,
                "counter_offer_factor": 1.1,
                "patience": "low"
            },
            "moderate": {
                "acceptance_threshold": 0.9,
                "counter_offer_factor": 1.05,
                "patience": "medium"
            },
            "firm": {
                "acceptance_threshold": 0.95,
                "counter_offer_factor": 1.02,
                "patience": "high"
            }
        }
    
    async def negotiate_price(
        self,
        item_id: str,
        current_price: float,
        target_price: float,
        vendor_id: str,
        strategy: str = "moderate"
    ) -> NegotiationOffer:
        """Negotiate price with vendor"""
        
        negotiation = NegotiationOffer(
            item_id=item_id,
            current_price=current_price,
            target_price=target_price,
            max_price=current_price * self.negotiation_strategies[strategy]["walk_away"],
            vendor_id=vendor_id,
            negotiation_rounds=0,
            status="in_progress"
        )
        
        # Start negotiation
        final_price = await self._conduct_negotiation(negotiation, strategy)
        
        negotiation.final_price = final_price
        negotiation.status = "completed" if final_price else "failed"
        
        return negotiation
    
    async def _conduct_negotiation(
        self,
        negotiation: NegotiationOffer,
        strategy: str
    ) -> Optional[float]:
        """Conduct price negotiation rounds"""
        
        strat = self.negotiation_strategies[strategy]
        current_offer = negotiation.current_price * strat["initial_offer"]
        
        for round in range(strat["max_rounds"]):
            negotiation.negotiation_rounds += 1
            
            # Make offer
            vendor_response = await self._vendor_response(
                negotiation.vendor_id,
                current_offer,
                negotiation.current_price
            )
            
            if vendor_response["accepted"]:
                return current_offer
            
            # Check if we should continue
            if current_offer >= negotiation.max_price:
                break
            
            # Increase offer
            current_offer *= (1 + strat["increment"])
            current_offer = min(current_offer, negotiation.max_price)
        
        return None
    
    async def _vendor_response(
        self,
        vendor_id: str,
        offer: float,
        asking_price: float
    ) -> Dict[str, Any]:
        """Simulate vendor response to offer"""
        
        # Get vendor profile (mock)
        vendor_type = "moderate"  # Would be looked up
        profile = self.vendor_profiles[vendor_type]
        
        acceptance_price = asking_price * profile["acceptance_threshold"]
        
        if offer >= acceptance_price:
            return {"accepted": True, "counter_offer": None}
        else:
            counter = offer * profile["counter_offer_factor"]
            return {"accepted": False, "counter_offer": counter}


class HolographicGuide:
    """
    Holographic Tour Guide AI Agent
    """
    
    def __init__(self):
        self.avatar_models = self._load_avatar_models()
        self.tour_scripts = self._load_tour_scripts()
        self.active_tours = {}
    
    def _load_avatar_models(self) -> Dict[str, Any]:
        """Load 3D avatar models"""
        
        return {
            "historical_expert": {
                "model_url": "/assets/avatars/historian.glb",
                "animations": ["idle", "walk", "point", "explain"],
                "voice": "mature_male"
            },
            "local_guide": {
                "model_url": "/assets/avatars/local.glb",
                "animations": ["idle", "walk", "gesture", "laugh"],
                "voice": "friendly_female"
            },
            "kids_character": {
                "model_url": "/assets/avatars/mascot.glb",
                "animations": ["idle", "jump", "dance", "wave"],
                "voice": "animated_character"
            }
        }
    
    def _load_tour_scripts(self) -> Dict[str, Any]:
        """Load tour guide scripts"""
        
        return {
            "historical_tour": {
                "duration": 60,  # minutes
                "stops": [
                    {
                        "location": "Main Square",
                        "script": "Welcome to the historic Main Square, built in 1750...",
                        "animation": "explain",
                        "duration": 5
                    },
                    {
                        "location": "Cathedral",
                        "script": "This magnificent cathedral took 200 years to complete...",
                        "animation": "point",
                        "duration": 8
                    }
                ]
            }
        }
    
    async def start_holographic_tour(
        self,
        tour_type: str,
        avatar_type: str,
        language: str = "en"
    ) -> Dict[str, Any]:
        """Start a holographic guided tour"""
        
        tour_id = f"tour_{datetime.now().timestamp()}"
        
        # Load tour script and avatar
        script = self.tour_scripts.get(tour_type, self.tour_scripts["historical_tour"])
        avatar = self.avatar_models.get(avatar_type, self.avatar_models["local_guide"])
        
        # Initialize tour
        tour = {
            "tour_id": tour_id,
            "type": tour_type,
            "avatar": avatar,
            "script": script,
            "language": language,
            "current_stop": 0,
            "status": "active",
            "start_time": datetime.now()
        }
        
        self.active_tours[tour_id] = tour
        
        # Return holographic display configuration
        return {
            "tour_id": tour_id,
            "avatar_url": avatar["model_url"],
            "initial_position": {"x": 0, "y": 0, "z": -2},
            "initial_animation": "idle",
            "voice_config": {
                "type": avatar["voice"],
                "language": language,
                "speed": 1.0
            },
            "first_stop": script["stops"][0],
            "websocket_url": f"ws://localhost:8766/holographic/{tour_id}"
        }
    
    async def update_tour_position(
        self,
        tour_id: str,
        user_position: Dict[str, float]
    ) -> Dict[str, Any]:
        """Update tour based on user position"""
        
        tour = self.active_tours.get(tour_id)
        if not tour:
            return {"error": "Tour not found"}
        
        # Check if user reached next stop
        current_stop = tour["current_stop"]
        stops = tour["script"]["stops"]
        
        if current_stop < len(stops) - 1:
            # Check proximity to next stop
            # (Simplified - would use actual geolocation)
            tour["current_stop"] += 1
            next_stop = stops[tour["current_stop"]]
            
            return {
                "action": "move_to_next",
                "stop": next_stop,
                "avatar_action": next_stop["animation"],
                "narration": next_stop["script"]
            }
        else:
            return {
                "action": "tour_complete",
                "message": "Thank you for joining the tour!"
            }
    
    async def answer_question(
        self,
        tour_id: str,
        question: str
    ) -> Dict[str, str]:
        """Answer user question during tour"""
        
        tour = self.active_tours.get(tour_id)
        if not tour:
            return {"error": "Tour not found"}
        
        # Generate contextual answer
        context = tour["script"]["stops"][tour["current_stop"]]
        
        # Use AI to generate answer
        answer = await self._generate_contextual_answer(question, context)
        
        return {
            "question": question,
            "answer": answer,
            "avatar_action": "explain"
        }
    
    async def _generate_contextual_answer(
        self,
        question: str,
        context: Dict[str, Any]
    ) -> str:
        """Generate answer based on tour context"""
        
        # Use GPT or similar to generate contextual answer
        # For now, return mock answer
        return f"That's a great question! At {context['location']}, {context['script'][:50]}..."