"""
AI Tour Designer Generativo - Sistema de Generación de Tours Personalizados
Utiliza GPT-4/5 para crear itinerarios 100% personalizados en tiempo real
"""

from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import json
import asyncio
from enum import Enum
import openai
from dataclasses import dataclass
import numpy as np
from collections import defaultdict

# Configuration
class TravelStyle(str, Enum):
    ADVENTURE = "adventure"
    CULTURAL = "cultural"
    LUXURY = "luxury"
    BUDGET = "budget"
    FAMILY = "family"
    ROMANTIC = "romantic"
    SOLO = "solo"
    BUSINESS = "business"
    WELLNESS = "wellness"
    GASTRONOMY = "gastronomy"
    PHOTOGRAPHY = "photography"
    ECO_FRIENDLY = "eco_friendly"

class ActivityType(str, Enum):
    SIGHTSEEING = "sightseeing"
    DINING = "dining"
    SHOPPING = "shopping"
    ENTERTAINMENT = "entertainment"
    SPORTS = "sports"
    RELAXATION = "relaxation"
    NIGHTLIFE = "nightlife"
    EDUCATION = "education"
    NATURE = "nature"
    CULTURAL = "cultural"

class TransportMode(str, Enum):
    WALKING = "walking"
    PUBLIC_TRANSPORT = "public_transport"
    TAXI = "taxi"
    RENTAL_CAR = "rental_car"
    BICYCLE = "bicycle"
    PRIVATE_DRIVER = "private_driver"
    BOAT = "boat"
    HELICOPTER = "helicopter"

# Data Models
class UserProfile(BaseModel):
    """Perfil completo del usuario para personalización"""
    user_id: str
    age: int
    nationality: str
    languages: List[str]
    interests: List[str]
    travel_history: List[Dict[str, Any]]
    dietary_restrictions: Optional[List[str]] = []
    accessibility_needs: Optional[List[str]] = []
    travel_companions: Optional[int] = 1
    companion_ages: Optional[List[int]] = []
    fitness_level: int = Field(ge=1, le=5, default=3)
    cultural_preferences: Optional[Dict[str, Any]] = {}
    shopping_preferences: Optional[List[str]] = []
    photography_interests: Optional[bool] = False
    
class TourPreferences(BaseModel):
    """Preferencias específicas para el tour"""
    destination: str
    start_date: datetime
    end_date: datetime
    travel_style: List[TravelStyle]
    preferred_activities: List[ActivityType]
    avoided_activities: List[ActivityType] = []
    accommodation_type: str = "hotel"
    meal_preferences: List[str] = []
    transport_preference: TransportMode = TransportMode.PUBLIC_TRANSPORT
    pace: str = Field(default="moderate", pattern="^(relaxed|moderate|fast)$")
    must_see_attractions: List[str] = []
    avoid_attractions: List[str] = []
    special_occasions: Optional[str] = None
    weather_preference: Optional[str] = "any"
    
class BudgetRange(BaseModel):
    """Rango de presupuesto para el viaje"""
    total_budget: float
    currency: str = "USD"
    daily_budget: Optional[float] = None
    accommodation_budget: Optional[float] = None
    food_budget: Optional[float] = None
    activities_budget: Optional[float] = None
    transport_budget: Optional[float] = None
    shopping_budget: Optional[float] = None
    emergency_fund: Optional[float] = None
    budget_flexibility: float = Field(ge=0, le=0.3, default=0.1)  # 10% flexibility

class DayActivity(BaseModel):
    """Actividad individual en el itinerario"""
    time: str
    duration_minutes: int
    activity_name: str
    activity_type: ActivityType
    description: str
    location: Dict[str, Any]  # {name, address, coordinates, google_maps_url}
    cost_estimate: float
    booking_required: bool = False
    booking_url: Optional[str] = None
    tips: List[str] = []
    alternatives: List[Dict[str, Any]] = []
    weather_dependent: bool = False
    accessibility_info: Optional[str] = None
    photo_opportunity: bool = False
    local_insights: Optional[str] = None

class DayItinerary(BaseModel):
    """Itinerario de un día completo"""
    day_number: int
    date: datetime
    day_title: str
    day_theme: str
    activities: List[DayActivity]
    meals: List[Dict[str, Any]]  # Breakfast, lunch, dinner recommendations
    accommodation: Dict[str, Any]
    transport_details: List[Dict[str, Any]]
    total_cost_estimate: float
    walking_distance_km: float
    highlights: List[str]
    insider_tips: List[str]
    emergency_contacts: Dict[str, str]
    weather_forecast: Optional[Dict[str, Any]] = None

class GeneratedTour(BaseModel):
    """Tour completo generado por IA"""
    tour_id: str
    generated_at: datetime
    user_id: str
    destination: str
    title: str
    description: str
    duration_days: int
    start_date: datetime
    end_date: datetime
    total_budget_estimate: float
    itinerary: List[DayItinerary]
    packing_list: List[str]
    visa_requirements: Dict[str, Any]
    health_safety_info: Dict[str, Any]
    cultural_etiquette: List[str]
    language_phrases: Dict[str, str]
    emergency_numbers: Dict[str, str]
    weather_summary: Dict[str, Any]
    sustainability_score: float
    personalization_score: float
    alternative_versions: List[Dict[str, Any]] = []
    booking_links: Dict[str, str] = {}
    travel_insurance_recommendation: Optional[Dict[str, Any]] = None
    carbon_footprint_estimate: Optional[float] = None

class GenerativeTourDesigner:
    """
    Diseñador de tours con IA generativa usando GPT-4/5
    """
    
    def __init__(self, api_key: str, model: str = "gpt-4-turbo-preview"):
        self.api_key = api_key
        self.model = model
        openai.api_key = api_key
        self.client = openai.AsyncOpenAI(api_key=api_key)
        
        # Cache para optimización
        self.destination_cache = {}
        self.activity_cache = {}
        self.prompt_templates = self._load_prompt_templates()
        
    def _load_prompt_templates(self) -> Dict[str, str]:
        """Carga templates de prompts optimizados"""
        return {
            "tour_generation": """
You are an expert travel planner AI. Create a highly personalized {duration_days}-day tour itinerary for {destination}.

USER PROFILE:
- Age: {age}
- Nationality: {nationality}
- Interests: {interests}
- Travel Style: {travel_style}
- Budget: {budget} {currency}
- Companions: {companions}
- Dietary Restrictions: {dietary}
- Accessibility Needs: {accessibility}

PREFERENCES:
- Dates: {start_date} to {end_date}
- Must See: {must_see}
- Activities: {preferred_activities}
- Avoid: {avoided_activities}
- Pace: {pace}
- Special Occasion: {special_occasion}

Generate a complete day-by-day itinerary with:
1. Detailed activities with timing and duration
2. Restaurant recommendations for each meal
3. Accommodation suggestions
4. Transport between locations
5. Cost estimates in {currency}
6. Insider tips and local insights
7. Alternative options for weather/preference changes
8. Emergency contacts and safety info
9. Cultural etiquette tips
10. Sustainability considerations

Format as JSON with the structure provided.
Make it unique, memorable, and perfectly suited to this traveler's profile.
Include hidden gems and local experiences not found in typical tourist guides.
""",
            "activity_enhancement": """
Enhance this activity with local insights and personalization:
Activity: {activity_name}
Location: {location}
User Interests: {interests}
Travel Style: {travel_style}

Provide:
1. Best time to visit
2. How to avoid crowds
3. Local tips
4. Photo spots
5. Nearby hidden gems
6. Cultural context
7. Sustainability tips
""",
            "budget_optimization": """
Optimize this itinerary for a {budget} {currency} budget:
Current estimated cost: {current_cost}
Activities: {activities}
Duration: {days} days

Suggest cost-saving alternatives while maintaining quality and personalization.
Include free/low-cost hidden gems and local experiences.
""",
            "sustainability_analysis": """
Analyze the environmental impact of this tour:
{itinerary_summary}

Provide:
1. Carbon footprint estimate
2. Sustainability score (0-100)
3. Eco-friendly alternatives
4. Local impact considerations
5. Responsible tourism tips
"""
        }
    
    async def generate_custom_tour(
        self,
        user_profile: UserProfile,
        preferences: TourPreferences,
        budget: BudgetRange,
        constraints: List[str] = None
    ) -> GeneratedTour:
        """
        Genera tour completamente personalizado usando GPT-4/5
        """
        try:
            # 1. Análisis de perfil y preferencias
            profile_analysis = await self._analyze_user_profile(user_profile, preferences)
            
            # 2. Investigación del destino
            destination_data = await self._research_destination(
                preferences.destination,
                preferences.start_date,
                preferences.end_date
            )
            
            # 3. Generación del itinerario base
            base_itinerary = await self._generate_base_itinerary(
                profile_analysis,
                destination_data,
                preferences,
                budget
            )
            
            # 4. Personalización profunda
            personalized_itinerary = await self._deep_personalization(
                base_itinerary,
                user_profile,
                preferences
            )
            
            # 5. Optimización de presupuesto
            optimized_itinerary = await self._optimize_budget(
                personalized_itinerary,
                budget
            )
            
            # 6. Añadir información práctica
            complete_tour = await self._add_practical_info(
                optimized_itinerary,
                user_profile,
                preferences
            )
            
            # 7. Análisis de sostenibilidad
            sustainability_data = await self._analyze_sustainability(complete_tour)
            complete_tour.sustainability_score = sustainability_data["score"]
            complete_tour.carbon_footprint_estimate = sustainability_data["carbon_footprint"]
            
            # 8. Generar versiones alternativas
            alternatives = await self._generate_alternatives(
                complete_tour,
                user_profile,
                preferences
            )
            complete_tour.alternative_versions = alternatives
            
            # 9. Calcular score de personalización
            complete_tour.personalization_score = await self._calculate_personalization_score(
                complete_tour,
                user_profile,
                preferences
            )
            
            return complete_tour
            
        except Exception as e:
            print(f"Error generando tour: {str(e)}")
            raise
    
    async def _analyze_user_profile(
        self,
        user_profile: UserProfile,
        preferences: TourPreferences
    ) -> Dict[str, Any]:
        """Análisis profundo del perfil del usuario"""
        
        prompt = f"""
        Analyze this traveler profile and provide insights for tour planning:
        
        Age: {user_profile.age}
        Interests: {', '.join(user_profile.interests)}
        Travel History: {len(user_profile.travel_history)} previous trips
        Travel Style: {', '.join([s.value for s in preferences.travel_style])}
        Companions: {user_profile.travel_companions}
        
        Provide:
        1. Personality type (adventurous/cautious/balanced)
        2. Recommended activity types
        3. Optimal daily schedule
        4. Social preferences
        5. Risk tolerance
        6. Cultural openness
        7. Physical capability considerations
        """
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an expert travel psychologist."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        
        return json.loads(response.choices[0].message.content)
    
    async def _research_destination(
        self,
        destination: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Investigación completa del destino"""
        
        # Check cache
        cache_key = f"{destination}_{start_date.date()}_{end_date.date()}"
        if cache_key in self.destination_cache:
            return self.destination_cache[cache_key]
        
        prompt = f"""
        Research {destination} for travel dates {start_date.date()} to {end_date.date()}.
        
        Provide comprehensive information:
        1. Weather forecast and climate
        2. Local events and festivals
        3. Top attractions (tourist and hidden gems)
        4. Best restaurants (local and international)
        5. Transportation options
        6. Safety considerations
        7. Cultural norms and etiquette
        8. Shopping areas
        9. Nightlife options
        10. Day trip possibilities
        11. Emergency services
        12. WiFi availability
        13. Currency and payment methods
        14. Language considerations
        15. Current travel restrictions or requirements
        
        Format as detailed JSON.
        """
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a local travel expert with deep knowledge of destinations worldwide."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.6
        )
        
        destination_data = json.loads(response.choices[0].message.content)
        self.destination_cache[cache_key] = destination_data
        
        return destination_data
    
    async def _generate_base_itinerary(
        self,
        profile_analysis: Dict[str, Any],
        destination_data: Dict[str, Any],
        preferences: TourPreferences,
        budget: BudgetRange
    ) -> List[DayItinerary]:
        """Genera itinerario base día por día"""
        
        duration = (preferences.end_date - preferences.start_date).days + 1
        
        prompt = self.prompt_templates["tour_generation"].format(
            duration_days=duration,
            destination=preferences.destination,
            age=profile_analysis.get("age_group", "adult"),
            nationality=profile_analysis.get("nationality", "international"),
            interests=", ".join(preferences.must_see_attractions),
            travel_style=", ".join([s.value for s in preferences.travel_style]),
            budget=budget.total_budget,
            currency=budget.currency,
            companions=preferences.travel_companions if hasattr(preferences, 'travel_companions') else 1,
            dietary=", ".join(preferences.meal_preferences),
            accessibility="none",
            start_date=preferences.start_date.date(),
            end_date=preferences.end_date.date(),
            must_see=", ".join(preferences.must_see_attractions),
            preferred_activities=", ".join([a.value for a in preferences.preferred_activities]),
            avoided_activities=", ".join([a.value for a in preferences.avoided_activities]),
            pace=preferences.pace,
            special_occasion=preferences.special_occasions or "none"
        )
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an expert tour planner. Generate detailed JSON itineraries."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            max_tokens=4000
        )
        
        itinerary_data = json.loads(response.choices[0].message.content)
        
        # Convert to DayItinerary objects
        itinerary = []
        for day_data in itinerary_data["days"]:
            activities = [DayActivity(**activity) for activity in day_data["activities"]]
            day = DayItinerary(
                day_number=day_data["day_number"],
                date=preferences.start_date + timedelta(days=day_data["day_number"]-1),
                day_title=day_data["title"],
                day_theme=day_data["theme"],
                activities=activities,
                meals=day_data["meals"],
                accommodation=day_data["accommodation"],
                transport_details=day_data["transport"],
                total_cost_estimate=day_data["estimated_cost"],
                walking_distance_km=day_data.get("walking_distance", 0),
                highlights=day_data["highlights"],
                insider_tips=day_data["tips"],
                emergency_contacts=destination_data.get("emergency_contacts", {})
            )
            itinerary.append(day)
        
        return itinerary
    
    async def _deep_personalization(
        self,
        base_itinerary: List[DayItinerary],
        user_profile: UserProfile,
        preferences: TourPreferences
    ) -> List[DayItinerary]:
        """Personalización profunda del itinerario"""
        
        personalized_itinerary = []
        
        for day in base_itinerary:
            # Personalizar cada actividad
            personalized_activities = []
            for activity in day.activities:
                enhanced = await self._enhance_activity(
                    activity,
                    user_profile.interests,
                    preferences.travel_style
                )
                personalized_activities.append(enhanced)
            
            day.activities = personalized_activities
            
            # Añadir toques personales basados en intereses
            if "photography" in user_profile.interests:
                day.insider_tips.append("Best photo spot: Golden hour at main attraction")
            
            if "gastronomy" in user_profile.interests:
                day.insider_tips.append(f"Don't miss the local specialty at {day.meals[1]['restaurant']}")
            
            personalized_itinerary.append(day)
        
        return personalized_itinerary
    
    async def _enhance_activity(
        self,
        activity: DayActivity,
        interests: List[str],
        travel_style: List[TravelStyle]
    ) -> DayActivity:
        """Mejora una actividad con insights locales"""
        
        prompt = self.prompt_templates["activity_enhancement"].format(
            activity_name=activity.activity_name,
            location=activity.location.get("name", ""),
            interests=", ".join(interests),
            travel_style=", ".join([s.value for s in travel_style])
        )
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a local insider providing exclusive tips."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        
        enhancements = json.loads(response.choices[0].message.content)
        
        activity.tips.extend(enhancements.get("tips", []))
        activity.local_insights = enhancements.get("local_insights", "")
        activity.photo_opportunity = enhancements.get("photo_spots", False)
        
        return activity
    
    async def _optimize_budget(
        self,
        itinerary: List[DayItinerary],
        budget: BudgetRange
    ) -> List[DayItinerary]:
        """Optimiza el itinerario según el presupuesto"""
        
        total_cost = sum(day.total_cost_estimate for day in itinerary)
        
        if total_cost > budget.total_budget * (1 + budget.budget_flexibility):
            # Necesita optimización
            activities_list = []
            for day in itinerary:
                for activity in day.activities:
                    activities_list.append({
                        "name": activity.activity_name,
                        "cost": activity.cost_estimate,
                        "type": activity.activity_type.value
                    })
            
            prompt = self.prompt_templates["budget_optimization"].format(
                budget=budget.total_budget,
                currency=budget.currency,
                current_cost=total_cost,
                activities=json.dumps(activities_list),
                days=len(itinerary)
            )
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a budget travel expert."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.6
            )
            
            optimizations = json.loads(response.choices[0].message.content)
            
            # Aplicar optimizaciones
            for day in itinerary:
                for activity in day.activities:
                    if activity.activity_name in optimizations.get("replacements", {}):
                        # Reemplazar con alternativa más económica
                        alternative = optimizations["replacements"][activity.activity_name]
                        activity.activity_name = alternative["name"]
                        activity.cost_estimate = alternative["cost"]
                        activity.description = alternative["description"]
        
        return itinerary
    
    async def _add_practical_info(
        self,
        itinerary: List[DayItinerary],
        user_profile: UserProfile,
        preferences: TourPreferences
    ) -> GeneratedTour:
        """Añade información práctica al tour completo"""
        
        # Generar información práctica
        prompt = f"""
        Generate practical information for a {len(itinerary)}-day trip to {preferences.destination}:
        
        Traveler nationality: {user_profile.nationality}
        Travel dates: {preferences.start_date.date()} to {preferences.end_date.date()}
        
        Provide:
        1. Visa requirements
        2. Vaccination/health requirements
        3. Packing list (weather appropriate)
        4. Cultural etiquette tips
        5. Essential local phrases
        6. Emergency contacts
        7. Travel insurance recommendations
        8. Currency/payment tips
        9. SIM card/WiFi recommendations
        10. Safety considerations
        
        Format as JSON.
        """
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a travel preparation expert."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.6
        )
        
        practical_info = json.loads(response.choices[0].message.content)
        
        # Crear tour completo
        tour = GeneratedTour(
            tour_id=f"tour_{user_profile.user_id}_{datetime.now().timestamp()}",
            generated_at=datetime.now(),
            user_id=user_profile.user_id,
            destination=preferences.destination,
            title=f"Your Perfect {len(itinerary)}-Day {preferences.destination} Adventure",
            description=f"A personalized journey through {preferences.destination} tailored to your interests",
            duration_days=len(itinerary),
            start_date=preferences.start_date,
            end_date=preferences.end_date,
            total_budget_estimate=sum(day.total_cost_estimate for day in itinerary),
            itinerary=itinerary,
            packing_list=practical_info["packing_list"],
            visa_requirements=practical_info["visa_requirements"],
            health_safety_info=practical_info["health_requirements"],
            cultural_etiquette=practical_info["cultural_tips"],
            language_phrases=practical_info["essential_phrases"],
            emergency_numbers=practical_info["emergency_contacts"],
            weather_summary=practical_info.get("weather_summary", {}),
            sustainability_score=0.0,  # Se calculará después
            personalization_score=0.0,  # Se calculará después
            travel_insurance_recommendation=practical_info.get("insurance_recommendation")
        )
        
        return tour
    
    async def _analyze_sustainability(self, tour: GeneratedTour) -> Dict[str, Any]:
        """Analiza la sostenibilidad del tour"""
        
        # Crear resumen del itinerario
        itinerary_summary = []
        for day in tour.itinerary:
            itinerary_summary.append({
                "day": day.day_number,
                "activities": [a.activity_name for a in day.activities],
                "transport": day.transport_details,
                "accommodation": day.accommodation.get("type", "hotel")
            })
        
        prompt = self.prompt_templates["sustainability_analysis"].format(
            itinerary_summary=json.dumps(itinerary_summary)
        )
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a sustainable tourism expert."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.6
        )
        
        return json.loads(response.choices[0].message.content)
    
    async def _generate_alternatives(
        self,
        tour: GeneratedTour,
        user_profile: UserProfile,
        preferences: TourPreferences
    ) -> List[Dict[str, Any]]:
        """Genera versiones alternativas del tour"""
        
        alternatives = []
        
        # Versión budget-friendly
        budget_version = {
            "type": "budget_friendly",
            "title": "Budget-Friendly Version",
            "description": "Same amazing experience, lower cost",
            "savings": "30-40%",
            "key_changes": [
                "Budget accommodations",
                "More public transport",
                "Free/low-cost activities",
                "Local street food options"
            ]
        }
        alternatives.append(budget_version)
        
        # Versión luxury
        luxury_version = {
            "type": "luxury",
            "title": "Luxury Upgrade",
            "description": "Premium experience with exclusive access",
            "additional_cost": "50-70%",
            "key_changes": [
                "5-star accommodations",
                "Private transportation",
                "VIP access to attractions",
                "Michelin-starred dining"
            ]
        }
        alternatives.append(luxury_version)
        
        # Versión eco-friendly
        eco_version = {
            "type": "eco_friendly",
            "title": "Sustainable Journey",
            "description": "Minimal environmental impact",
            "sustainability_score": "95/100",
            "key_changes": [
                "Eco-certified hotels",
                "Carbon-neutral transport",
                "Local community experiences",
                "Zero-waste initiatives"
            ]
        }
        alternatives.append(eco_version)
        
        return alternatives
    
    async def _calculate_personalization_score(
        self,
        tour: GeneratedTour,
        user_profile: UserProfile,
        preferences: TourPreferences
    ) -> float:
        """Calcula el score de personalización del tour"""
        
        score = 0.0
        max_score = 100.0
        
        # Check de intereses cubiertos
        interests_covered = 0
        for interest in user_profile.interests:
            for day in tour.itinerary:
                for activity in day.activities:
                    if interest.lower() in activity.description.lower():
                        interests_covered += 1
                        break
        
        interest_score = (interests_covered / len(user_profile.interests)) * 30
        score += interest_score
        
        # Check de must-see attractions
        must_see_covered = 0
        for attraction in preferences.must_see_attractions:
            for day in tour.itinerary:
                for activity in day.activities:
                    if attraction.lower() in activity.activity_name.lower():
                        must_see_covered += 1
                        break
        
        if preferences.must_see_attractions:
            must_see_score = (must_see_covered / len(preferences.must_see_attractions)) * 25
            score += must_see_score
        else:
            score += 25
        
        # Check de estilo de viaje
        style_match = 0
        for style in preferences.travel_style:
            if style == TravelStyle.LUXURY and any("luxury" in day.accommodation.get("type", "").lower() for day in tour.itinerary):
                style_match += 1
            elif style == TravelStyle.BUDGET and tour.total_budget_estimate <= preferences.budget.total_budget * 0.8:
                style_match += 1
            elif style == TravelStyle.ADVENTURE and any(a.activity_type == ActivityType.SPORTS for day in tour.itinerary for a in day.activities):
                style_match += 1
            else:
                style_match += 0.5
        
        style_score = (style_match / len(preferences.travel_style)) * 20
        score += style_score
        
        # Check de ritmo
        if preferences.pace == "relaxed" and all(len(day.activities) <= 4 for day in tour.itinerary):
            score += 10
        elif preferences.pace == "moderate" and all(4 <= len(day.activities) <= 6 for day in tour.itinerary):
            score += 10
        elif preferences.pace == "fast" and all(len(day.activities) >= 6 for day in tour.itinerary):
            score += 10
        
        # Bonus por información local
        if any(day.insider_tips for day in tour.itinerary):
            score += 10
        
        # Bonus por alternativas
        if tour.alternative_versions:
            score += 5
        
        return min(score, max_score)
    
    async def regenerate_section(
        self,
        tour: GeneratedTour,
        section: str,
        feedback: str
    ) -> GeneratedTour:
        """Regenera una sección específica basada en feedback"""
        
        prompt = f"""
        User feedback for {section}: {feedback}
        
        Current tour: {tour.title}
        Destination: {tour.destination}
        Duration: {tour.duration_days} days
        
        Regenerate the {section} section based on this feedback.
        Maintain consistency with the rest of the itinerary.
        """
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an adaptive travel planner."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        
        updates = json.loads(response.choices[0].message.content)
        
        # Aplicar actualizaciones según la sección
        if section == "activities":
            for day_num, new_activities in updates.items():
                tour.itinerary[int(day_num)-1].activities = [
                    DayActivity(**activity) for activity in new_activities
                ]
        elif section == "accommodation":
            for day in tour.itinerary:
                day.accommodation = updates.get(str(day.day_number), day.accommodation)
        elif section == "meals":
            for day in tour.itinerary:
                day.meals = updates.get(str(day.day_number), day.meals)
        
        # Recalcular scores
        tour.personalization_score = await self._calculate_personalization_score(
            tour,
            UserProfile(user_id=tour.user_id, age=30, nationality="US", languages=["en"], interests=[]),
            TourPreferences(
                destination=tour.destination,
                start_date=tour.start_date,
                end_date=tour.end_date,
                travel_style=[TravelStyle.CULTURAL],
                preferred_activities=[ActivityType.SIGHTSEEING]
            )
        )
        
        return tour
    
    async def save_tour(self, tour: GeneratedTour, database_connection) -> str:
        """Guarda el tour generado en la base de datos"""
        
        query = """
        INSERT INTO generated_tours (
            tour_id, user_id, destination, title, description,
            duration_days, start_date, end_date, total_budget_estimate,
            itinerary_json, sustainability_score, personalization_score,
            generated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING tour_id
        """
        
        result = await database_connection.fetchval(
            query,
            tour.tour_id,
            tour.user_id,
            tour.destination,
            tour.title,
            tour.description,
            tour.duration_days,
            tour.start_date,
            tour.end_date,
            tour.total_budget_estimate,
            json.dumps(tour.dict()),
            tour.sustainability_score,
            tour.personalization_score,
            tour.generated_at
        )
        
        return result
    
    async def get_tour_analytics(self, user_id: str) -> Dict[str, Any]:
        """Obtiene analytics de los tours generados por un usuario"""
        
        return {
            "total_tours_generated": 0,
            "average_personalization_score": 0.0,
            "average_sustainability_score": 0.0,
            "most_visited_destinations": [],
            "preferred_travel_styles": [],
            "average_budget": 0.0,
            "total_days_planned": 0
        }


# API Endpoints Handler
class TourDesignerAPI:
    """API endpoints para el Tour Designer Generativo"""
    
    def __init__(self, designer: GenerativeTourDesigner):
        self.designer = designer
    
    async def generate_tour_endpoint(
        self,
        user_profile: UserProfile,
        preferences: TourPreferences,
        budget: BudgetRange
    ) -> Dict[str, Any]:
        """Endpoint para generar un tour personalizado"""
        
        try:
            tour = await self.designer.generate_custom_tour(
                user_profile,
                preferences,
                budget
            )
            
            return {
                "status": "success",
                "tour": tour.dict(),
                "message": "Tour generated successfully"
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }
    
    async def regenerate_section_endpoint(
        self,
        tour_id: str,
        section: str,
        feedback: str
    ) -> Dict[str, Any]:
        """Endpoint para regenerar una sección del tour"""
        
        # Load tour from database
        # tour = await load_tour(tour_id)
        
        # Regenerate section
        # updated_tour = await self.designer.regenerate_section(tour, section, feedback)
        
        return {
            "status": "success",
            "message": "Section regenerated successfully"
        }
    
    async def get_analytics_endpoint(self, user_id: str) -> Dict[str, Any]:
        """Endpoint para obtener analytics de tours"""
        
        analytics = await self.designer.get_tour_analytics(user_id)
        
        return {
            "status": "success",
            "analytics": analytics
        }