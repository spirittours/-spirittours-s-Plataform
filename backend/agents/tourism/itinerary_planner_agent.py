"""
Itinerary Planner Agent

AI-powered itinerary planning considering:
- Tourist preferences and interests
- Time constraints and pacing
- Geographic optimization
- Seasonal factors
- Budget constraints
- Accessibility requirements
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import math
from ..base.agent_base import (
    AgentBase,
    AgentRequest,
    AgentResponse,
    AgentStatus,
    AgentCapability
)


class ItineraryPlannerAgent(AgentBase):
    """
    Intelligent itinerary planner that creates optimized tour plans
    based on user preferences, constraints, and real-world factors.
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(
            name="itinerary_planner",
            description="AI-powered itinerary planning with optimization",
            version="1.0.0",
            config=config
        )
        
        # Default touring speeds (km/h)
        self.default_speeds = {
            'walking': 4.0,
            'driving': 50.0,
            'highway': 90.0,
        }
        
        # Average visit durations by site type (minutes)
        self.default_durations = {
            'landmark': 45,
            'museum': 120,
            'restaurant': 90,
            'religious_site': 60,
            'archaeological_site': 90,
            'nature_site': 120,
            'shopping': 60,
            'beach': 180,
        }
        
    def get_capabilities(self) -> List[AgentCapability]:
        return [
            AgentCapability.OPTIMIZATION,
            AgentCapability.RECOMMENDATION,
            AgentCapability.GEOSPATIAL,
            AgentCapability.SCHEDULING,
            AgentCapability.DATA_ANALYSIS,
        ]
    
    def validate_request(self, request: AgentRequest) -> tuple[bool, Optional[str]]:
        """Validate itinerary planning request"""
        required_params = []
        
        if request.intent == 'create_itinerary':
            required_params = ['start_location', 'duration_days', 'interests']
        elif request.intent == 'optimize_itinerary':
            required_params = ['stops']
        elif request.intent == 'suggest_stops':
            required_params = ['current_location', 'interests']
        else:
            return False, f"Unknown intent: {request.intent}"
        
        for param in required_params:
            if param not in request.parameters:
                return False, f"Missing required parameter: {param}"
        
        return True, None
    
    async def process(self, request: AgentRequest) -> AgentResponse:
        """Process itinerary planning requests"""
        
        if request.intent == 'create_itinerary':
            result = await self._create_itinerary(request.parameters)
        elif request.intent == 'optimize_itinerary':
            result = await self._optimize_itinerary(request.parameters)
        elif request.intent == 'suggest_stops':
            result = await self._suggest_stops(request.parameters)
        else:
            return AgentResponse(
                request_id=request.request_id,
                agent_name=self.name,
                status=AgentStatus.ERROR,
                error=f"Unknown intent: {request.intent}"
            )
        
        return AgentResponse(
            request_id=request.request_id,
            agent_name=self.name,
            status=AgentStatus.COMPLETED,
            result=result,
            metadata={
                'intent': request.intent,
                'parameters': request.parameters,
            }
        )
    
    async def _create_itinerary(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a complete itinerary from scratch.
        
        Parameters:
            start_location: Starting point coordinates [lng, lat]
            duration_days: Number of days for the tour
            interests: List of interest categories
            budget: Optional budget constraint
            pace: Optional pace ('relaxed', 'moderate', 'fast')
            accessibility: Optional accessibility requirements
        """
        start_location = params['start_location']
        duration_days = params['duration_days']
        interests = params['interests']
        budget = params.get('budget', 'moderate')
        pace = params.get('pace', 'moderate')
        accessibility = params.get('accessibility', {})
        
        # Pace multipliers for daily activities
        pace_multipliers = {
            'relaxed': 0.7,
            'moderate': 1.0,
            'fast': 1.3,
        }
        multiplier = pace_multipliers.get(pace, 1.0)
        
        # Determine daily touring hours based on pace
        daily_hours = {
            'relaxed': 6,
            'moderate': 8,
            'fast': 10,
        }
        hours_per_day = daily_hours.get(pace, 8)
        
        # Build itinerary for each day
        days = []
        for day_num in range(1, duration_days + 1):
            day_plan = self._plan_single_day(
                day_num=day_num,
                start_location=start_location,
                interests=interests,
                hours_available=hours_per_day,
                pace_multiplier=multiplier,
                accessibility=accessibility
            )
            days.append(day_plan)
        
        # Calculate totals
        total_cost = sum(day['estimated_cost'] for day in days)
        total_distance = sum(day['total_distance_km'] for day in days)
        total_stops = sum(len(day['stops']) for day in days)
        
        return {
            'itinerary': {
                'duration_days': duration_days,
                'pace': pace,
                'interests': interests,
                'days': days,
            },
            'summary': {
                'total_cost_usd': total_cost,
                'total_distance_km': total_distance,
                'total_stops': total_stops,
                'cost_per_day': total_cost / duration_days,
            },
            'recommendations': self._generate_recommendations(
                days, interests, budget, pace
            ),
        }
    
    def _plan_single_day(
        self,
        day_num: int,
        start_location: List[float],
        interests: List[str],
        hours_available: int,
        pace_multiplier: float,
        accessibility: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Plan activities for a single day"""
        
        # Sample stops based on interests (in real implementation, query database)
        available_stops = self._get_stops_for_interests(
            interests, start_location, accessibility
        )
        
        # Select and optimize stops for the day
        daily_stops = self._select_daily_stops(
            available_stops,
            hours_available,
            pace_multiplier,
            start_location
        )
        
        # Calculate timing and distances
        stops_with_timing = self._calculate_timing(
            daily_stops,
            start_location,
            hours_available
        )
        
        # Calculate costs
        estimated_cost = sum(stop.get('entrance_fee', 0) for stop in stops_with_timing)
        estimated_cost += 50  # Add food/transport budget
        
        # Calculate total distance
        total_distance = self._calculate_total_distance(stops_with_timing)
        
        return {
            'day': day_num,
            'stops': stops_with_timing,
            'total_distance_km': total_distance,
            'estimated_cost': estimated_cost,
            'start_time': '08:00',
            'end_time': self._calculate_end_time('08:00', hours_available),
        }
    
    def _get_stops_for_interests(
        self,
        interests: List[str],
        location: List[float],
        accessibility: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Get available stops matching interests"""
        
        # Mock data - in real implementation, query database
        all_stops = [
            {
                'id': 'western_wall',
                'name': 'Western Wall',
                'type': 'religious_site',
                'coordinates': [35.2345, 31.7767],
                'categories': ['history', 'religion', 'culture'],
                'duration_minutes': 60,
                'entrance_fee': 0,
                'accessibility': {
                    'wheelchair_accessible': True,
                    'audio_guide': True,
                },
            },
            {
                'id': 'yad_vashem',
                'name': 'Yad Vashem Holocaust Museum',
                'type': 'museum',
                'coordinates': [35.1753, 31.7743],
                'categories': ['history', 'education', 'culture'],
                'duration_minutes': 180,
                'entrance_fee': 0,
                'accessibility': {
                    'wheelchair_accessible': True,
                    'audio_guide': True,
                    'sign_language': False,
                },
            },
            {
                'id': 'dead_sea',
                'name': 'Dead Sea',
                'type': 'nature_site',
                'coordinates': [35.4836, 31.5590],
                'categories': ['nature', 'relaxation', 'unique'],
                'duration_minutes': 240,
                'entrance_fee': 30,
                'accessibility': {
                    'wheelchair_accessible': False,
                    'audio_guide': False,
                },
            },
            {
                'id': 'tel_aviv_beach',
                'name': 'Tel Aviv Beach',
                'type': 'beach',
                'coordinates': [34.7675, 32.0804],
                'categories': ['nature', 'relaxation', 'beach'],
                'duration_minutes': 180,
                'entrance_fee': 0,
                'accessibility': {
                    'wheelchair_accessible': True,
                    'audio_guide': False,
                },
            },
            {
                'id': 'masada',
                'name': 'Masada',
                'type': 'archaeological_site',
                'coordinates': [35.3539, 31.3156],
                'categories': ['history', 'adventure', 'archaeology'],
                'duration_minutes': 180,
                'entrance_fee': 35,
                'accessibility': {
                    'wheelchair_accessible': False,
                    'audio_guide': True,
                },
            },
        ]
        
        # Filter by interests
        matching_stops = [
            stop for stop in all_stops
            if any(interest in stop['categories'] for interest in interests)
        ]
        
        # Filter by accessibility if required
        if accessibility.get('wheelchair_required'):
            matching_stops = [
                stop for stop in matching_stops
                if stop['accessibility'].get('wheelchair_accessible', False)
            ]
        
        return matching_stops
    
    def _select_daily_stops(
        self,
        available_stops: List[Dict[str, Any]],
        hours_available: int,
        pace_multiplier: float,
        start_location: List[float]
    ) -> List[Dict[str, Any]]:
        """Select optimal stops for a single day"""
        
        minutes_available = hours_available * 60
        selected_stops = []
        time_used = 0
        
        # Simple greedy selection (in real implementation, use optimization algorithm)
        for stop in available_stops[:4]:  # Limit to 4 stops per day
            stop_duration = stop['duration_minutes'] / pace_multiplier
            travel_time = 30  # Simplified travel time
            
            if time_used + stop_duration + travel_time <= minutes_available:
                selected_stops.append(stop)
                time_used += stop_duration + travel_time
        
        return selected_stops
    
    def _calculate_timing(
        self,
        stops: List[Dict[str, Any]],
        start_location: List[float],
        hours_available: int
    ) -> List[Dict[str, Any]]:
        """Calculate arrival/departure times for each stop"""
        
        current_time = 8 * 60  # Start at 8:00 AM (in minutes)
        stops_with_timing = []
        
        for stop in stops:
            arrival_time = current_time
            departure_time = arrival_time + stop['duration_minutes']
            
            stops_with_timing.append({
                **stop,
                'arrival_time': self._format_time(arrival_time),
                'departure_time': self._format_time(departure_time),
                'duration_minutes': stop['duration_minutes'],
            })
            
            current_time = departure_time + 30  # Add travel time to next stop
        
        return stops_with_timing
    
    def _format_time(self, minutes: int) -> str:
        """Convert minutes to HH:MM format"""
        hours = minutes // 60
        mins = minutes % 60
        return f"{hours:02d}:{mins:02d}"
    
    def _calculate_end_time(self, start_time: str, hours: int) -> str:
        """Calculate end time from start time and duration"""
        start_hour, start_min = map(int, start_time.split(':'))
        total_minutes = start_hour * 60 + start_min + hours * 60
        return self._format_time(total_minutes)
    
    def _calculate_total_distance(self, stops: List[Dict[str, Any]]) -> float:
        """Calculate total distance between stops"""
        total_distance = 0.0
        
        for i in range(len(stops) - 1):
            coord1 = stops[i]['coordinates']
            coord2 = stops[i + 1]['coordinates']
            distance = self._haversine_distance(coord1, coord2)
            total_distance += distance
        
        return round(total_distance, 2)
    
    def _haversine_distance(
        self,
        coord1: List[float],
        coord2: List[float]
    ) -> float:
        """Calculate distance between two coordinates using Haversine formula"""
        lon1, lat1 = coord1
        lon2, lat2 = coord2
        
        R = 6371  # Earth radius in kilometers
        
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlon / 2) ** 2)
        
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c
    
    async def _optimize_itinerary(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize existing itinerary stop order"""
        
        stops = params['stops']
        
        # Simple nearest neighbor optimization
        if len(stops) <= 2:
            return {'optimized_stops': stops, 'improvement': 0}
        
        # Calculate original distance
        original_distance = self._calculate_total_distance(stops)
        
        # Optimize using nearest neighbor heuristic
        optimized = [stops[0]]  # Start with first stop
        remaining = stops[1:]
        
        while remaining:
            last_stop = optimized[-1]
            nearest = min(
                remaining,
                key=lambda s: self._haversine_distance(
                    last_stop['coordinates'],
                    s['coordinates']
                )
            )
            optimized.append(nearest)
            remaining.remove(nearest)
        
        optimized_distance = self._calculate_total_distance(optimized)
        improvement = ((original_distance - optimized_distance) / original_distance) * 100
        
        return {
            'optimized_stops': optimized,
            'original_distance_km': original_distance,
            'optimized_distance_km': optimized_distance,
            'improvement_percent': round(improvement, 2),
        }
    
    async def _suggest_stops(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Suggest nearby stops based on interests"""
        
        current_location = params['current_location']
        interests = params['interests']
        max_results = params.get('max_results', 5)
        max_distance_km = params.get('max_distance_km', 50)
        
        # Get available stops
        available_stops = self._get_stops_for_interests(
            interests,
            current_location,
            params.get('accessibility', {})
        )
        
        # Calculate distances and filter
        stops_with_distance = []
        for stop in available_stops:
            distance = self._haversine_distance(
                current_location,
                stop['coordinates']
            )
            if distance <= max_distance_km:
                stops_with_distance.append({
                    **stop,
                    'distance_km': round(distance, 2),
                })
        
        # Sort by distance and limit results
        suggestions = sorted(
            stops_with_distance,
            key=lambda s: s['distance_km']
        )[:max_results]
        
        return {
            'suggestions': suggestions,
            'count': len(suggestions),
        }
    
    def _generate_recommendations(
        self,
        days: List[Dict[str, Any]],
        interests: List[str],
        budget: str,
        pace: str
    ) -> List[str]:
        """Generate helpful recommendations"""
        
        recommendations = []
        
        # Pace recommendations
        if pace == 'fast':
            recommendations.append(
                "Consider a more relaxed pace to fully enjoy each location"
            )
        
        # Budget recommendations
        total_cost = sum(day['estimated_cost'] for day in days)
        if budget == 'budget' and total_cost > 500:
            recommendations.append(
                "Look for free alternatives or museum discount cards to reduce costs"
            )
        
        # General recommendations
        recommendations.append(
            "Book popular attractions in advance to avoid queues"
        )
        recommendations.append(
            "Consider purchasing local SIM card for navigation and communication"
        )
        
        return recommendations
