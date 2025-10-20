"""
AI Virtual Tour Guide System with Multiple Personalities
Complete replacement for human guides with full journey management
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import random

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func

from ..services.gps_navigation_service import GPSNavigationService
from ..services.translation_service import TranslationService
from ..services.tts_service import TextToSpeechService
from ..ai_integration.content_generator import AIContentGenerator
from ..cache.redis_cache import RedisCache

logger = logging.getLogger(__name__)

# ===================== GUIDE PERSONALITIES =====================

class GuidePersonality(str, Enum):
    """Different AI guide personality types"""
    # Professional Guides
    PROFESSIONAL_FORMAL = "professional_formal"  # Traditional, formal guide
    ACADEMIC_EXPERT = "academic_expert"  # Professor-like, detailed explanations
    
    # Friendly Guides
    FRIENDLY_CASUAL = "friendly_casual"  # Relaxed, conversational
    ENTHUSIASTIC_ENERGETIC = "enthusiastic_energetic"  # High energy, excited
    WARM_MATERNAL = "warm_maternal"  # Caring, motherly figure
    COOL_YOUTH = "cool_youth"  # Young, trendy, uses modern slang
    
    # Entertainment Guides
    COMEDIAN_FUNNY = "comedian_funny"  # Makes jokes, humor-focused
    STORYTELLER_DRAMATIC = "storyteller_dramatic"  # Dramatic narratives
    MYSTERIOUS_INTRIGUING = "mysterious_intriguing"  # Creates mystery and suspense
    
    # Cultural Guides
    LOCAL_INSIDER = "local_insider"  # Local person sharing secrets
    CULTURAL_AMBASSADOR = "cultural_ambassador"  # Deep cultural insights
    
    # Specialized Guides
    KIDS_ENTERTAINER = "kids_entertainer"  # For children, educational fun
    ROMANTIC_COUPLES = "romantic_couples"  # For couples, romantic focus
    ADVENTURE_EXPLORER = "adventure_explorer"  # Adventure and exploration
    SPIRITUAL_MINDFUL = "spiritual_mindful"  # Meditation, mindfulness
    
    # Neutral
    NEUTRAL_BALANCED = "neutral_balanced"  # Balanced, adaptable

class TourismType(str, Enum):
    """Types of tourism experiences"""
    RELIGIOUS = "religious"
    CULTURAL = "cultural"
    HISTORICAL = "historical"
    ADVENTURE = "adventure"
    LEISURE = "leisure"
    BUSINESS = "business"
    EDUCATIONAL = "educational"
    MEDICAL = "medical"
    GASTRONOMIC = "gastronomic"
    SHOPPING = "shopping"
    NATURE = "nature"
    ROMANTIC = "romantic"
    FAMILY = "family"
    LUXURY = "luxury"
    BUDGET = "budget"
    NEUTRAL = "neutral"  # General tourism

@dataclass
class GuideProfile:
    """Complete profile for AI guide personality"""
    personality: GuidePersonality
    name: str
    gender: str  # male, female, neutral
    age_appearance: str  # young, middle, senior
    voice_style: str
    speaking_pace: str  # slow, normal, fast
    humor_level: int  # 0-10
    formality_level: int  # 0-10
    detail_level: int  # 0-10
    interaction_style: str
    catchphrases: List[str]
    introduction_style: str
    farewell_style: str
    knowledge_areas: List[str]
    languages: List[str]
    special_traits: List[str]

# ===================== AI GUIDE PERSONALITIES DATABASE =====================

GUIDE_PERSONALITIES_DB = {
    GuidePersonality.PROFESSIONAL_FORMAL: GuideProfile(
        personality=GuidePersonality.PROFESSIONAL_FORMAL,
        name="Professor Williams",
        gender="male",
        age_appearance="senior",
        voice_style="authoritative, clear, articulate",
        speaking_pace="normal",
        humor_level=2,
        formality_level=9,
        detail_level=9,
        interaction_style="Good morning ladies and gentlemen. Let me guide you through...",
        catchphrases=[
            "As you can observe...",
            "It's worth noting that...",
            "The historical significance...",
            "Please direct your attention to..."
        ],
        introduction_style="Good day. I'm Professor Williams, and I'll be your guide today. With over 30 years of experience in historical research...",
        farewell_style="It has been my pleasure to share this knowledge with you. Safe travels.",
        knowledge_areas=["history", "architecture", "archaeology", "art"],
        languages=["en-US", "en-GB", "fr-FR", "de-DE"],
        special_traits=["academic citations", "precise dates", "scholarly approach"]
    ),
    
    GuidePersonality.FRIENDLY_CASUAL: GuideProfile(
        personality=GuidePersonality.FRIENDLY_CASUAL,
        name="Sarah",
        gender="female",
        age_appearance="young",
        voice_style="warm, friendly, conversational",
        speaking_pace="normal",
        humor_level=6,
        formality_level=3,
        detail_level=6,
        interaction_style="Hey there! So excited to show you around...",
        catchphrases=[
            "Oh, you're gonna love this!",
            "Fun fact coming up...",
            "This is my favorite part...",
            "Pretty cool, right?"
        ],
        introduction_style="Hi everyone! I'm Sarah, and I'm super excited to be your guide today! We're going to have so much fun exploring together...",
        farewell_style="It's been awesome hanging out with you all! Hope you had as much fun as I did!",
        knowledge_areas=["culture", "local life", "food", "entertainment"],
        languages=["en-US", "es-MX", "pt-BR"],
        special_traits=["local recommendations", "personal anecdotes", "Instagram spots"]
    ),
    
    GuidePersonality.COMEDIAN_FUNNY: GuideProfile(
        personality=GuidePersonality.COMEDIAN_FUNNY,
        name="Mike the Joker",
        gender="male",
        age_appearance="middle",
        voice_style="playful, animated, expressive",
        speaking_pace="fast",
        humor_level=10,
        formality_level=2,
        detail_level=5,
        interaction_style="Alright folks, buckle up for the comedy tour of your life!",
        catchphrases=[
            "But wait, it gets better!",
            "You can't make this stuff up!",
            "And here's the kicker...",
            "Comedy gold, people!"
        ],
        introduction_style="Ladies and gentlemen, boys and girls, I'm Mike, your guide, comedian, and occasional fact-checker! Get ready to laugh and learn!",
        farewell_style="You've been an amazing audience! Don't forget to tip your guide... with laughter!",
        knowledge_areas=["humor", "pop culture", "entertainment", "local jokes"],
        languages=["en-US", "en-GB"],
        special_traits=["dad jokes", "puns", "funny historical facts", "roasting tourists (gently)"]
    ),
    
    GuidePersonality.WARM_MATERNAL: GuideProfile(
        personality=GuidePersonality.WARM_MATERNAL,
        name="Maria Rosa",
        gender="female",
        age_appearance="middle",
        voice_style="caring, warm, nurturing",
        speaking_pace="slow",
        humor_level=4,
        formality_level=5,
        detail_level=7,
        interaction_style="Hello my dears, let me take care of you today...",
        catchphrases=[
            "Oh sweethearts, look at this...",
            "Be careful here, my dears...",
            "Let me tell you a story...",
            "Just like my grandmother used to say..."
        ],
        introduction_style="Welcome, welcome! I'm Maria Rosa, but you can call me Mama Rosa. I'll make sure you're all comfortable and well taken care of!",
        farewell_style="Take care my darlings! Don't forget to eat well and rest! Come back soon!",
        knowledge_areas=["culture", "traditions", "food", "family stories"],
        languages=["es-ES", "es-MX", "it-IT", "pt-PT"],
        special_traits=["checking if everyone's okay", "food recommendations", "safety reminders", "local remedies"]
    ),
    
    GuidePersonality.COOL_YOUTH: GuideProfile(
        personality=GuidePersonality.COOL_YOUTH,
        name="Alex",
        gender="neutral",
        age_appearance="young",
        voice_style="trendy, energetic, modern",
        speaking_pace="fast",
        humor_level=7,
        formality_level=1,
        detail_level=5,
        interaction_style="Yo! What's up everyone? Ready to explore?",
        catchphrases=[
            "This is literally amazing!",
            "No cap, this is fire!",
            "Let's vibe with the history...",
            "This hits different..."
        ],
        introduction_style="Yooo! I'm Alex, your guide for today! We're about to see some absolutely sick places! Follow me on Insta for behind-the-scenes!",
        farewell_style="That was lit! Hope y'all had a blast! Don't forget to tag us in your stories!",
        knowledge_areas=["social media spots", "nightlife", "trendy places", "youth culture"],
        languages=["en-US", "en-GB"],
        special_traits=["TikTok references", "Gen Z slang", "photo ops", "viral spots"]
    ),
    
    GuidePersonality.STORYTELLER_DRAMATIC: GuideProfile(
        personality=GuidePersonality.STORYTELLER_DRAMATIC,
        name="Giovanni",
        gender="male",
        age_appearance="middle",
        voice_style="theatrical, dramatic, expressive",
        speaking_pace="varied",
        humor_level=3,
        formality_level=6,
        detail_level=8,
        interaction_style="Gather 'round, for I have tales to tell...",
        catchphrases=[
            "Imagine, if you will...",
            "The plot thickens...",
            "But fate had other plans...",
            "And thus begins our tale..."
        ],
        introduction_style="Welcome, travelers, to a journey through time and legend! I am Giovanni, your narrator in this epic adventure!",
        farewell_style="And so our story comes to an end... but yours, dear travelers, has just begun!",
        knowledge_areas=["legends", "myths", "historical drama", "romance"],
        languages=["en-GB", "it-IT", "fr-FR"],
        special_traits=["dramatic pauses", "voice modulation", "character voices", "suspense building"]
    ),
    
    GuidePersonality.LOCAL_INSIDER: GuideProfile(
        personality=GuidePersonality.LOCAL_INSIDER,
        name="Ahmed",
        gender="male",
        age_appearance="middle",
        voice_style="authentic, friendly, knowledgeable",
        speaking_pace="normal",
        humor_level=5,
        formality_level=4,
        detail_level=7,
        interaction_style="My friends, let me show you the REAL city...",
        catchphrases=[
            "Only locals know this...",
            "Tourist guides won't tell you this...",
            "My grandfather told me...",
            "The secret is..."
        ],
        introduction_style="Salaam! I'm Ahmed, born and raised here. Forget the tourist traps - I'll show you how we really live!",
        farewell_style="You're always welcome back, my friends! You know the real places now!",
        knowledge_areas=["local secrets", "hidden gems", "authentic food", "local customs"],
        languages=["ar-SA", "en-US", "fr-FR"],
        special_traits=["secret spots", "local prices", "avoiding scams", "family recipes"]
    ),
    
    GuidePersonality.KIDS_ENTERTAINER: GuideProfile(
        personality=GuidePersonality.KIDS_ENTERTAINER,
        name="Captain Adventure",
        gender="neutral",
        age_appearance="young",
        voice_style="animated, exciting, playful",
        speaking_pace="varied",
        humor_level=8,
        formality_level=1,
        detail_level=3,
        interaction_style="Hey adventurers! Ready for an amazing quest?",
        catchphrases=[
            "Super duper cool!",
            "Can you spot the treasure?",
            "Let's use our imagination!",
            "High five, explorers!"
        ],
        introduction_style="Ahoy there, young explorers! I'm Captain Adventure, and we're going on the best adventure EVER!",
        farewell_style="You were the BEST adventure crew ever! Keep exploring and stay curious!",
        knowledge_areas=["fun facts", "games", "puzzles", "adventures"],
        languages=["en-US", "es-MX"],
        special_traits=["treasure hunts", "counting games", "animal sounds", "interactive challenges"]
    ),
    
    GuidePersonality.ROMANTIC_COUPLES: GuideProfile(
        personality=GuidePersonality.ROMANTIC_COUPLES,
        name="Isabella",
        gender="female",
        age_appearance="middle",
        voice_style="soft, romantic, intimate",
        speaking_pace="slow",
        humor_level=3,
        formality_level=6,
        detail_level=6,
        interaction_style="Welcome, lovebirds, to a romantic journey...",
        catchphrases=[
            "Perfect for a romantic moment...",
            "Many couples have kissed here...",
            "Legend says lovers who...",
            "The sunset here is magical..."
        ],
        introduction_style="Welcome, beautiful couples! I'm Isabella, and I'll help you discover the most romantic corners of our city...",
        farewell_style="May your love story continue as beautifully as the places we've seen together...",
        knowledge_areas=["romantic spots", "love stories", "proposal locations", "couple activities"],
        languages=["en-US", "fr-FR", "it-IT", "es-ES"],
        special_traits=["sunset timings", "photo spots for couples", "romantic restaurants", "love legends"]
    ),
    
    GuidePersonality.SPIRITUAL_MINDFUL: GuideProfile(
        personality=GuidePersonality.SPIRITUAL_MINDFUL,
        name="Sage",
        gender="neutral",
        age_appearance="middle",
        voice_style="calm, peaceful, meditative",
        speaking_pace="slow",
        humor_level=2,
        formality_level=5,
        detail_level=6,
        interaction_style="Welcome, fellow seekers of wisdom...",
        catchphrases=[
            "Take a moment to breathe...",
            "Feel the energy of this place...",
            "Let's practice mindfulness here...",
            "Connect with the sacred..."
        ],
        introduction_style="Namaste. I'm Sage, your companion on this spiritual journey. Let's explore with open hearts and minds...",
        farewell_style="May the peace you've found here stay with you always. Namaste.",
        knowledge_areas=["spirituality", "meditation", "energy", "sacred sites"],
        languages=["en-US", "hi-IN", "ja-JP"],
        special_traits=["meditation moments", "breathing exercises", "energy explanations", "quiet reflection"]
    )
}

# ===================== AI VIRTUAL GUIDE SERVICE =====================

class AIVirtualGuideService:
    """Complete AI Virtual Guide Service replacing human guides"""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.navigation_service = GPSNavigationService()
        self.translation_service = TranslationService()
        self.tts_service = TextToSpeechService()
        self.ai_generator = AIContentGenerator()
        self.cache = RedisCache()
        self.active_guides: Dict[str, 'VirtualGuideInstance'] = {}
    
    async def create_virtual_guide(
        self,
        user_id: str,
        trip_id: str,
        personality: GuidePersonality,
        tourism_type: TourismType,
        language: str,
        perspective: Optional[str] = None,
        group_size: int = 1,
        special_requirements: Optional[Dict] = None
    ) -> 'VirtualGuideInstance':
        """Create a personalized virtual guide instance for a user/group"""
        
        # Get guide profile
        guide_profile = GUIDE_PERSONALITIES_DB.get(
            personality,
            GUIDE_PERSONALITIES_DB[GuidePersonality.NEUTRAL_BALANCED]
        )
        
        # Create guide instance
        guide = VirtualGuideInstance(
            guide_id=f"guide_{user_id}_{trip_id}",
            user_id=user_id,
            trip_id=trip_id,
            profile=guide_profile,
            tourism_type=tourism_type,
            language=language,
            perspective=perspective,
            group_size=group_size,
            special_requirements=special_requirements or {},
            service=self
        )
        
        # Initialize guide
        await guide.initialize()
        
        # Store active guide
        self.active_guides[guide.guide_id] = guide
        
        return guide
    
    async def get_active_guide(self, guide_id: str) -> Optional['VirtualGuideInstance']:
        """Get an active guide instance"""
        return self.active_guides.get(guide_id)

# ===================== VIRTUAL GUIDE INSTANCE =====================

class VirtualGuideInstance:
    """Individual instance of a virtual guide for a specific trip"""
    
    def __init__(
        self,
        guide_id: str,
        user_id: str,
        trip_id: str,
        profile: GuideProfile,
        tourism_type: TourismType,
        language: str,
        perspective: Optional[str],
        group_size: int,
        special_requirements: Dict,
        service: AIVirtualGuideService
    ):
        self.guide_id = guide_id
        self.user_id = user_id
        self.trip_id = trip_id
        self.profile = profile
        self.tourism_type = tourism_type
        self.language = language
        self.perspective = perspective
        self.group_size = group_size
        self.special_requirements = special_requirements
        self.service = service
        
        # Journey tracking
        self.journey_stage = "pre_arrival"  # pre_arrival, arrival, touring, departure
        self.current_location = None
        self.next_destination = None
        self.itinerary = []
        self.visited_locations = []
        
        # Interaction history
        self.interaction_count = 0
        self.user_preferences = {}
        self.feedback_received = []
        
        # Real-time state
        self.is_active = False
        self.is_speaking = False
        self.current_explanation = None
        self.navigation_mode = False
        
    async def initialize(self):
        """Initialize the guide with welcome message and setup"""
        self.is_active = True
        
        # Generate personalized introduction
        intro = await self.generate_introduction()
        
        # Log initialization
        logger.info(f"Virtual guide {self.guide_id} initialized for user {self.user_id}")
        
        return intro
    
    async def generate_introduction(self) -> Dict[str, Any]:
        """Generate personalized introduction based on profile"""
        
        # Build introduction prompt
        prompt = f"""
        You are {self.profile.name}, a virtual tour guide with the following characteristics:
        - Personality: {self.profile.personality.value}
        - Voice Style: {self.profile.voice_style}
        - Humor Level: {self.profile.humor_level}/10
        - Formality: {self.profile.formality_level}/10
        
        Tourism Type: {self.tourism_type.value}
        Language: {self.language}
        Group Size: {self.group_size}
        Perspective: {self.perspective or 'neutral'}
        
        Generate a warm, personalized introduction in your character's style.
        Use this introduction style as reference: "{self.profile.introduction_style}"
        Include:
        1. Warm greeting
        2. Your name and personality
        3. What you'll show them today
        4. Set expectations for the journey
        5. A catchphrase: {random.choice(self.profile.catchphrases)}
        
        Make it sound natural and engaging, not robotic.
        """
        
        # Generate with AI
        introduction_text = await self.service.ai_generator.generate_content(prompt)
        
        # Generate audio
        audio_url = await self.service.tts_service.generate_audio(
            text=introduction_text,
            language=self.language,
            voice=self._get_voice_config(),
            speed=self._get_speaking_speed()
        )
        
        return {
            "text": introduction_text,
            "audio_url": audio_url,
            "guide_name": self.profile.name,
            "personality": self.profile.personality.value,
            "duration": len(introduction_text) // 15  # Rough estimate
        }
    
    async def navigate_step_by_step(
        self,
        current_location: Tuple[float, float],
        destination: Dict[str, Any],
        explain_surroundings: bool = True
    ) -> Dict[str, Any]:
        """Navigate user step by step with explanations at each point"""
        
        # Get navigation instructions
        nav_instructions = await self.service.navigation_service.get_turn_by_turn_directions(
            current_location,
            (destination['latitude'], destination['longitude'])
        )
        
        # Current step
        current_step = nav_instructions['steps'][0] if nav_instructions['steps'] else None
        
        if not current_step:
            return {"error": "No navigation available"}
        
        # Generate guide commentary for this step
        commentary_prompt = f"""
        You are {self.profile.name} guiding tourists.
        Current navigation step: {current_step['instruction']}
        Distance: {current_step['distance']}
        
        In your personality style ({self.profile.personality.value}):
        1. Give the navigation instruction clearly
        2. Add interesting information about what they're seeing
        3. Use a catchphrase: {random.choice(self.profile.catchphrases)}
        4. Keep humor level at {self.profile.humor_level}/10
        
        Make it conversational and engaging, not just directions.
        """
        
        commentary = await self.service.ai_generator.generate_content(commentary_prompt)
        
        # Look for points of interest nearby
        nearby_pois = await self._find_nearby_points_of_interest(current_location)
        
        # Generate audio
        audio_url = await self.service.tts_service.generate_audio(
            text=commentary,
            language=self.language,
            voice=self._get_voice_config(),
            speed=self._get_speaking_speed()
        )
        
        return {
            "current_step": current_step,
            "guide_commentary": commentary,
            "audio_url": audio_url,
            "nearby_points": nearby_pois,
            "next_instruction": nav_instructions['steps'][1] if len(nav_instructions['steps']) > 1 else None,
            "total_distance_remaining": nav_instructions['total_distance'],
            "estimated_time_remaining": nav_instructions['total_time']
        }
    
    async def explain_location(
        self,
        location: Dict[str, Any],
        detail_level: Optional[str] = None
    ) -> Dict[str, Any]:
        """Explain a location in the guide's personality and style"""
        
        # Determine detail level
        detail = detail_level or ("detailed" if self.profile.detail_level > 7 else "standard")
        
        # Build explanation prompt
        prompt = f"""
        You are {self.profile.name}, explaining {location['name']}.
        
        Personality traits:
        - Style: {self.profile.voice_style}
        - Humor: {self.profile.humor_level}/10
        - Formality: {self.profile.formality_level}/10
        - Catchphrases: {', '.join(self.profile.catchphrases)}
        
        Tourism type: {self.tourism_type.value}
        Perspective: {self.perspective or 'neutral'}
        Detail level: {detail}
        
        Create an engaging explanation that includes:
        1. Introduction to the place
        2. Historical/cultural significance
        3. Interesting facts or stories
        4. Why it matters for {self.tourism_type.value} tourism
        5. Photo opportunities
        6. Practical tips
        
        Stay in character and make it entertaining!
        Include at least one of your catchphrases naturally.
        """
        
        explanation = await self.service.ai_generator.generate_content(prompt)
        
        # Generate audio
        audio_url = await self.service.tts_service.generate_audio(
            text=explanation,
            language=self.language,
            voice=self._get_voice_config(),
            speed=self._get_speaking_speed()
        )
        
        # Track visit
        self.visited_locations.append({
            "location": location,
            "timestamp": datetime.utcnow(),
            "explanation_given": True
        })
        
        return {
            "location": location,
            "explanation": explanation,
            "audio_url": audio_url,
            "duration": len(explanation) // 15,
            "guide_tips": await self._generate_location_tips(location),
            "next_location": self.next_destination
        }
    
    async def handle_journey_stage(self, stage: str, data: Dict) -> Dict[str, Any]:
        """Handle different stages of the journey"""
        
        self.journey_stage = stage
        
        if stage == "arrival":
            return await self._handle_arrival(data)
        elif stage == "pickup_point":
            return await self._handle_pickup_point(data)
        elif stage == "start_tour":
            return await self._handle_tour_start(data)
        elif stage == "touring":
            return await self._handle_touring(data)
        elif stage == "meal_time":
            return await self._handle_meal_recommendations(data)
        elif stage == "departure":
            return await self._handle_departure(data)
        else:
            return {"error": "Unknown journey stage"}
    
    async def _handle_arrival(self, data: Dict) -> Dict[str, Any]:
        """Handle tourist arrival at destination country"""
        
        prompt = f"""
        You are {self.profile.name} welcoming tourists who just arrived.
        
        Flight: {data.get('flight_number', 'Unknown')}
        Airport: {data.get('airport', 'Unknown')}
        Time: {data.get('arrival_time', 'Now')}
        
        In your personality style, provide:
        1. Warm welcome to the country
        2. Brief orientation about the airport
        3. Instructions for immigration/customs
        4. Where to find the pickup point
        5. How to contact the driver/transport
        6. Emergency contacts
        
        Be {self.profile.voice_style} and include: {random.choice(self.profile.catchphrases)}
        """
        
        welcome_message = await self.service.ai_generator.generate_content(prompt)
        
        return {
            "stage": "arrival",
            "message": welcome_message,
            "airport_map": data.get('airport_map_url'),
            "pickup_location": data.get('pickup_location'),
            "driver_contact": data.get('driver_contact'),
            "emergency_numbers": data.get('emergency_contacts')
        }
    
    async def _handle_pickup_point(self, data: Dict) -> Dict[str, Any]:
        """Guide tourist to pickup point and facilitate meeting with driver"""
        
        return {
            "stage": "pickup_point",
            "navigation": await self.navigate_step_by_step(
                data['current_location'],
                data['pickup_location']
            ),
            "driver_info": data.get('driver_info'),
            "share_location_enabled": True,
            "estimated_arrival": data.get('eta')
        }
    
    async def _handle_tour_start(self, data: Dict) -> Dict[str, Any]:
        """Start the actual tour with introduction and overview"""
        
        prompt = f"""
        You are {self.profile.name} starting the tour.
        
        Today's itinerary: {json.dumps(data.get('itinerary', []))}
        Group size: {self.group_size}
        Tour type: {self.tourism_type.value}
        
        Create an exciting tour introduction that:
        1. Builds excitement for the day
        2. Overview of places we'll visit
        3. Estimated timings
        4. Comfort breaks and meal times
        5. Safety guidelines
        6. How to stay together as a group
        
        Personality: {self.profile.personality.value}
        Include: {random.choice(self.profile.catchphrases)}
        """
        
        tour_intro = await self.service.ai_generator.generate_content(prompt)
        
        return {
            "stage": "tour_start",
            "introduction": tour_intro,
            "itinerary": data.get('itinerary'),
            "tour_map": data.get('tour_map_url'),
            "first_destination": data.get('first_destination')
        }
    
    async def _handle_meal_recommendations(self, data: Dict) -> Dict[str, Any]:
        """Provide meal recommendations based on location and preferences"""
        
        prompt = f"""
        You are {self.profile.name} recommending lunch/dinner options.
        
        Current location: {data.get('location')}
        Time: {data.get('meal_time')}
        Dietary restrictions: {data.get('dietary_restrictions', 'None')}
        Budget: {data.get('budget', 'Medium')}
        
        Recommend 3-5 restaurants with:
        1. Why you recommend each
        2. Specialties to try
        3. Price range
        4. Distance from current location
        5. Any insider tips
        
        Style: {self.profile.voice_style}
        Tourism type: {self.tourism_type.value}
        """
        
        recommendations = await self.service.ai_generator.generate_content(prompt)
        
        return {
            "stage": "meal_time",
            "recommendations": recommendations,
            "restaurants": data.get('nearby_restaurants'),
            "navigation_available": True
        }
    
    async def answer_question(self, question: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """Answer tourist questions in character"""
        
        prompt = f"""
        You are {self.profile.name} answering a tourist's question.
        
        Question: {question}
        Context: {json.dumps(context) if context else 'General question'}
        
        Answer in your personality style:
        - Voice: {self.profile.voice_style}
        - Humor: {self.profile.humor_level}/10
        - Detail: {self.profile.detail_level}/10
        
        Make it helpful but stay in character.
        Use one of these if appropriate: {', '.join(self.profile.catchphrases)}
        """
        
        answer = await self.service.ai_generator.generate_content(prompt)
        
        # Generate audio
        audio_url = await self.service.tts_service.generate_audio(
            text=answer,
            language=self.language,
            voice=self._get_voice_config()
        )
        
        return {
            "question": question,
            "answer": answer,
            "audio_url": audio_url,
            "related_info": await self._find_related_information(question)
        }
    
    async def switch_personality(self, new_personality: GuidePersonality) -> Dict[str, Any]:
        """Switch to a different guide personality mid-tour"""
        
        old_profile = self.profile
        new_profile = GUIDE_PERSONALITIES_DB[new_personality]
        
        # Generate transition message
        transition_prompt = f"""
        Create a smooth transition from {old_profile.name} to {new_profile.name}.
        
        Old guide says goodbye in their style: {old_profile.farewell_style}
        New guide introduces themselves: {new_profile.introduction_style}
        
        Make it feel natural, like changing guides.
        """
        
        transition = await self.service.ai_generator.generate_content(transition_prompt)
        
        # Update profile
        self.profile = new_profile
        
        return {
            "previous_guide": old_profile.name,
            "new_guide": new_profile.name,
            "transition_message": transition,
            "personality": new_personality.value
        }
    
    def _get_voice_config(self) -> Dict:
        """Get voice configuration based on guide profile"""
        return {
            "gender": self.profile.gender,
            "style": self.profile.voice_style,
            "personality": self.profile.personality.value
        }
    
    def _get_speaking_speed(self) -> float:
        """Get speaking speed based on profile"""
        speed_map = {
            "slow": 0.9,
            "normal": 1.0,
            "fast": 1.1,
            "varied": 1.0  # Will vary in TTS
        }
        return speed_map.get(self.profile.speaking_pace, 1.0)
    
    async def _find_nearby_points_of_interest(self, location: Tuple[float, float]) -> List[Dict]:
        """Find nearby points of interest"""
        # Implementation would query database for nearby POIs
        return []
    
    async def _generate_location_tips(self, location: Dict) -> List[str]:
        """Generate practical tips for a location"""
        tips = []
        
        # Based on personality, generate different types of tips
        if self.profile.personality == GuidePersonality.LOCAL_INSIDER:
            tips.append("Best time to visit: Early morning to avoid crowds")
            tips.append("Local price: Don't pay more than $X")
        elif self.profile.personality == GuidePersonality.ROMANTIC_COUPLES:
            tips.append("Perfect sunset spot at 6:30 PM")
            tips.append("Quiet corner for intimate moments")
        
        return tips
    
    async def _find_related_information(self, question: str) -> Dict:
        """Find information related to the question"""
        # Implementation would search knowledge base
        return {}
    
    async def _handle_touring(self, data: Dict) -> Dict[str, Any]:
        """Handle the active touring phase"""
        return {
            "stage": "touring",
            "current_location": data.get('current_location'),
            "next_destination": data.get('next_destination'),
            "time_at_location": data.get('suggested_time'),
            "explanation": await self.explain_location(data.get('current_location'))
        }
    
    async def _handle_departure(self, data: Dict) -> Dict[str, Any]:
        """Handle departure and farewell"""
        
        prompt = f"""
        You are {self.profile.name} saying goodbye to the tourists.
        
        Tour summary: Visited {len(self.visited_locations)} places
        Tour type: {self.tourism_type.value}
        
        Create a heartfelt farewell that:
        1. Summarizes the day's highlights
        2. Thanks them for their company
        3. Wishes them safe travels
        4. Invites them to return
        
        Use your farewell style: {self.profile.farewell_style}
        Include: {random.choice(self.profile.catchphrases)}
        """
        
        farewell = await self.service.ai_generator.generate_content(prompt)
        
        return {
            "stage": "departure",
            "farewell_message": farewell,
            "tour_summary": {
                "places_visited": len(self.visited_locations),
                "total_distance": data.get('total_distance'),
                "duration": data.get('tour_duration')
            },
            "feedback_request": True
        }

# ===================== JOURNEY CONTROLLER =====================

class JourneyController:
    """Controls the entire journey from arrival to departure"""
    
    def __init__(self, guide_service: AIVirtualGuideService):
        self.guide_service = guide_service
        self.active_journeys: Dict[str, 'Journey'] = {}
    
    async def start_journey(
        self,
        user_id: str,
        trip_id: str,
        itinerary: Dict,
        preferences: Dict
    ) -> 'Journey':
        """Start a new journey with virtual guide"""
        
        journey = Journey(
            journey_id=f"journey_{trip_id}",
            user_id=user_id,
            trip_id=trip_id,
            itinerary=itinerary,
            preferences=preferences,
            controller=self
        )
        
        # Create virtual guide
        guide = await self.guide_service.create_virtual_guide(
            user_id=user_id,
            trip_id=trip_id,
            personality=GuidePersonality(preferences.get('guide_personality', 'friendly_casual')),
            tourism_type=TourismType(preferences.get('tourism_type', 'cultural')),
            language=preferences.get('language', 'en-US'),
            perspective=preferences.get('perspective'),
            group_size=preferences.get('group_size', 1)
        )
        
        journey.virtual_guide = guide
        await journey.initialize()
        
        self.active_journeys[journey.journey_id] = journey
        
        return journey

class Journey:
    """Complete journey management from arrival to departure"""
    
    def __init__(
        self,
        journey_id: str,
        user_id: str,
        trip_id: str,
        itinerary: Dict,
        preferences: Dict,
        controller: JourneyController
    ):
        self.journey_id = journey_id
        self.user_id = user_id
        self.trip_id = trip_id
        self.itinerary = itinerary
        self.preferences = preferences
        self.controller = controller
        self.virtual_guide: Optional[VirtualGuideInstance] = None
        
        # Journey tracking
        self.current_stage = "pre_arrival"
        self.current_day = 0
        self.current_location = None
        self.transport_verified = False
        self.guide_active = False
        
    async def initialize(self):
        """Initialize the journey"""
        # Set up journey tracking
        self.guide_active = True
        
        # Send welcome message
        intro = await self.virtual_guide.initialize()
        
        return intro
    
    async def update_location(self, location: Tuple[float, float]):
        """Update current location and trigger appropriate actions"""
        self.current_location = location
        
        # Check proximity to next destination
        if self.virtual_guide and self.virtual_guide.next_destination:
            distance = self._calculate_distance(
                location,
                (self.virtual_guide.next_destination['latitude'],
                 self.virtual_guide.next_destination['longitude'])
            )
            
            if distance < 50:  # Within 50 meters
                # Trigger arrival at destination
                return await self.virtual_guide.explain_location(
                    self.virtual_guide.next_destination
                )
        
        return None
    
    def _calculate_distance(self, loc1: Tuple[float, float], loc2: Tuple[float, float]) -> float:
        """Calculate distance between two points in meters"""
        # Simplified calculation - in production use proper geodesic distance
        import math
        R = 6371000  # Earth radius in meters
        lat1, lon1 = math.radians(loc1[0]), math.radians(loc1[1])
        lat2, lon2 = math.radians(loc2[0]), math.radians(loc2[1])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c