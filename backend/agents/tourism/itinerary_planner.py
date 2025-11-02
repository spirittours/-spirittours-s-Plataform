"""
Itinerary Planner Agent
=======================

Creates optimized tour itineraries based on customer preferences, constraints,
and real-time data. Uses intelligent algorithms to balance time, distance,
interests, and logistics.

Features:
- Multi-day itinerary generation
- POI (Point of Interest) selection and ranking
- Route optimization (TSP solver)
- Time management and pacing
- Activity clustering by location and theme
- Budget-aware recommendations
- Accessibility considerations
- Weather-aware planning

Author: Spirit Tours Development Team
Date: 2025-11-02
"""

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
import logging

from ..base import BaseAgent, AgentCapability, AgentTask

logger = logging.getLogger(__name__)


class ItineraryPlannerAgent(BaseAgent):
    """
    Agent responsible for creating optimized tour itineraries.
    
    This agent analyzes customer preferences, available attractions,
    time constraints, and various other factors to generate optimal
    day-by-day itineraries.
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize Itinerary Planner Agent.
        
        Args:
            config: Optional configuration dictionary
        """
        super().__init__(
            agent_name="Itinerary Planner",
            agent_type="itinerary-planner",
            capabilities={
                AgentCapability.RECOMMENDATION,
                AgentCapability.OPTIMIZATION,
                AgentCapability.DATA_ANALYSIS,
            },
            config=config or {}
        )
        
        # Configuration parameters
        self.default_duration_days = self.config.get('default_duration_days', 7)
        self.max_stops_per_day = self.config.get('max_stops_per_day', 4)
        self.optimization_algorithm = self.config.get('optimization_algorithm', 'greedy')
        self.default_start_time = self.config.get('default_start_time', '09:00')
        self.default_end_time = self.config.get('default_end_time', '18:00')
        
        # POI database (in production, this would be from database)
        self._poi_database = self._initialize_poi_database()
    
    def _initialize_poi_database(self) -> List[Dict[str, Any]]:
        """
        Initialize Points of Interest database.
        
        In production, this would query the database. For now, using sample data.
        
        Returns:
            List of POI dictionaries
        """
        return [
            {
                'id': 'poi-001',
                'name': 'Western Wall',
                'location': 'Jerusalem',
                'coordinates': [35.2346, 31.7767],
                'category': 'religious',
                'interests': ['history', 'religion', 'culture'],
                'duration_hours': 1.5,
                'accessibility_rating': 8,
                'popularity_score': 95,
                'best_time': 'morning',
                'cost_level': 'free',
            },
            {
                'id': 'poi-002',
                'name': 'Yad Vashem',
                'location': 'Jerusalem',
                'coordinates': [35.1753, 31.7740],
                'category': 'museum',
                'interests': ['history', 'education', 'culture'],
                'duration_hours': 3.0,
                'accessibility_rating': 10,
                'popularity_score': 90,
                'best_time': 'morning',
                'cost_level': 'free',
            },
            {
                'id': 'poi-003',
                'name': 'Mahane Yehuda Market',
                'location': 'Jerusalem',
                'coordinates': [35.2125, 31.7850],
                'category': 'market',
                'interests': ['food', 'culture', 'shopping'],
                'duration_hours': 2.0,
                'accessibility_rating': 6,
                'popularity_score': 85,
                'best_time': 'afternoon',
                'cost_level': 'medium',
            },
            {
                'id': 'poi-004',
                'name': 'Old City of Acre',
                'location': 'Acre',
                'coordinates': [35.0667, 32.9231],
                'category': 'historical',
                'interests': ['history', 'archaeology', 'culture'],
                'duration_hours': 3.0,
                'accessibility_rating': 5,
                'popularity_score': 80,
                'best_time': 'any',
                'cost_level': 'low',
            },
            {
                'id': 'poi-005',
                'name': 'Masada',
                'location': 'Dead Sea',
                'coordinates': [35.3544, 31.3156],
                'category': 'historical',
                'interests': ['history', 'archaeology', 'nature'],
                'duration_hours': 4.0,
                'accessibility_rating': 7,
                'popularity_score': 92,
                'best_time': 'morning',
                'cost_level': 'medium',
            },
            {
                'id': 'poi-006',
                'name': 'Dead Sea Beaches',
                'location': 'Dead Sea',
                'coordinates': [35.4890, 31.3317],
                'category': 'nature',
                'interests': ['nature', 'wellness', 'relaxation'],
                'duration_hours': 3.0,
                'accessibility_rating': 6,
                'popularity_score': 88,
                'best_time': 'afternoon',
                'cost_level': 'medium',
            },
            {
                'id': 'poi-007',
                'name': 'Tel Aviv Beaches',
                'location': 'Tel Aviv',
                'coordinates': [34.7692, 32.0810],
                'category': 'beach',
                'interests': ['nature', 'relaxation', 'nightlife'],
                'duration_hours': 2.5,
                'accessibility_rating': 8,
                'popularity_score': 85,
                'best_time': 'afternoon',
                'cost_level': 'low',
            },
            {
                'id': 'poi-008',
                'name': 'Jaffa Old City',
                'location': 'Tel Aviv',
                'coordinates': [34.7520, 32.0544],
                'category': 'historical',
                'interests': ['history', 'culture', 'art'],
                'duration_hours': 2.0,
                'accessibility_rating': 6,
                'popularity_score': 82,
                'best_time': 'afternoon',
                'cost_level': 'low',
            },
        ]
    
    async def process_task(self, task: AgentTask) -> Dict[str, Any]:
        """
        Process an itinerary planning task.
        
        Args:
            task: Task containing planning parameters
            
        Returns:
            Dictionary containing the generated itinerary
        """
        payload = task.payload
        
        # Extract parameters
        destination = payload.get('destination', 'Israel')
        start_date_str = payload.get('start_date')
        end_date_str = payload.get('end_date')
        duration_days = payload.get('duration_days', self.default_duration_days)
        group_size = payload.get('group_size', 2)
        interests = payload.get('interests', ['culture', 'history'])
        budget_range = payload.get('budget_range', 'mid')  # low, mid, high
        accessibility_needs = payload.get('accessibility_needs', False)
        pace = payload.get('pace', 'moderate')  # relaxed, moderate, fast
        
        # Parse dates
        if start_date_str:
            start_date = datetime.fromisoformat(start_date_str)
        else:
            start_date = datetime.now() + timedelta(days=30)
        
        if end_date_str:
            end_date = datetime.fromisoformat(end_date_str)
            duration_days = (end_date - start_date).days + 1
        else:
            end_date = start_date + timedelta(days=duration_days - 1)
        
        logger.info(f"Planning itinerary: {destination}, {duration_days} days, interests: {interests}")
        
        # Step 1: Filter POIs based on criteria
        candidate_pois = self._filter_pois(
            destination=destination,
            interests=interests,
            budget_range=budget_range,
            accessibility_needs=accessibility_needs
        )
        
        # Step 2: Rank POIs
        ranked_pois = self._rank_pois(
            pois=candidate_pois,
            interests=interests,
            group_size=group_size
        )
        
        # Step 3: Generate day-by-day itinerary
        itinerary = self._generate_itinerary(
            pois=ranked_pois,
            start_date=start_date,
            duration_days=duration_days,
            pace=pace
        )
        
        # Step 4: Add logistics and timing
        itinerary_with_timing = self._add_timing_details(itinerary)
        
        # Step 5: Calculate summary statistics
        summary = self._calculate_summary(itinerary_with_timing)
        
        return {
            'itinerary': itinerary_with_timing,
            'summary': summary,
            'metadata': {
                'destination': destination,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'duration_days': duration_days,
                'total_pois': len([stop for day in itinerary_with_timing for stop in day['stops']]),
                'generated_at': datetime.utcnow().isoformat(),
            }
        }
    
    def _filter_pois(
        self,
        destination: str,
        interests: List[str],
        budget_range: str,
        accessibility_needs: bool
    ) -> List[Dict[str, Any]]:
        """
        Filter POIs based on criteria.
        
        Args:
            destination: Target destination
            interests: List of user interests
            budget_range: Budget level (low, mid, high)
            accessibility_needs: Whether accessibility is required
            
        Returns:
            List of filtered POIs
        """
        filtered = []
        
        for poi in self._poi_database:
            # Check location match
            if destination.lower() not in poi['location'].lower() and destination.lower() != 'israel':
                continue
            
            # Check interests overlap
            if not any(interest.lower() in [i.lower() for i in poi['interests']] for interest in interests):
                continue
            
            # Check budget
            cost_level = poi['cost_level']
            if budget_range == 'low' and cost_level in ['high']:
                continue
            elif budget_range == 'mid' and cost_level in ['high']:
                continue  # Be flexible for mid-range
            
            # Check accessibility
            if accessibility_needs and poi['accessibility_rating'] < 7:
                continue
            
            filtered.append(poi)
        
        logger.debug(f"Filtered {len(filtered)} POIs from {len(self._poi_database)} total")
        return filtered
    
    def _rank_pois(
        self,
        pois: List[Dict[str, Any]],
        interests: List[str],
        group_size: int
    ) -> List[Dict[str, Any]]:
        """
        Rank POIs by relevance score.
        
        Args:
            pois: List of POIs to rank
            interests: User interests
            group_size: Size of the group
            
        Returns:
            Sorted list of POIs with scores
        """
        scored_pois = []
        
        for poi in pois:
            score = poi['popularity_score']
            
            # Boost score for matching interests
            interest_matches = sum(
                1 for interest in interests
                if interest.lower() in [i.lower() for i in poi['interests']]
            )
            score += interest_matches * 10
            
            # Consider accessibility
            score += poi['accessibility_rating'] * 0.5
            
            # Add score to POI
            poi_with_score = {**poi, 'relevance_score': score}
            scored_pois.append(poi_with_score)
        
        # Sort by score (descending)
        scored_pois.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        return scored_pois
    
    def _generate_itinerary(
        self,
        pois: List[Dict[str, Any]],
        start_date: datetime,
        duration_days: int,
        pace: str
    ) -> List[Dict[str, Any]]:
        """
        Generate day-by-day itinerary.
        
        Args:
            pois: Ranked list of POIs
            start_date: Start date of tour
            duration_days: Number of days
            pace: Tour pace (relaxed, moderate, fast)
            
        Returns:
            List of day dictionaries with stops
        """
        # Determine stops per day based on pace
        if pace == 'relaxed':
            stops_per_day = 2
        elif pace == 'fast':
            stops_per_day = 4
        else:  # moderate
            stops_per_day = 3
        
        itinerary = []
        poi_index = 0
        
        for day_num in range(duration_days):
            date = start_date + timedelta(days=day_num)
            
            day_stops = []
            for _ in range(min(stops_per_day, len(pois) - poi_index)):
                if poi_index < len(pois):
                    day_stops.append(pois[poi_index])
                    poi_index += 1
            
            if day_stops:  # Only add day if there are stops
                itinerary.append({
                    'day': day_num + 1,
                    'date': date.isoformat(),
                    'stops': day_stops,
                    'theme': self._determine_day_theme(day_stops),
                })
        
        return itinerary
    
    def _determine_day_theme(self, stops: List[Dict[str, Any]]) -> str:
        """
        Determine the main theme of a day based on stops.
        
        Args:
            stops: List of stops for the day
            
        Returns:
            Theme string
        """
        if not stops:
            return 'Free day'
        
        # Count categories
        categories = [stop['category'] for stop in stops]
        most_common = max(set(categories), key=categories.count)
        
        theme_map = {
            'religious': 'Spiritual Journey',
            'historical': 'Historical Exploration',
            'museum': 'Cultural Discovery',
            'market': 'Local Life & Markets',
            'nature': 'Nature & Outdoors',
            'beach': 'Coastal Relaxation',
        }
        
        return theme_map.get(most_common, 'Mixed Activities')
    
    def _add_timing_details(self, itinerary: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Add timing details to itinerary.
        
        Args:
            itinerary: Basic itinerary structure
            
        Returns:
            Itinerary with timing information
        """
        detailed_itinerary = []
        
        for day in itinerary:
            current_time = datetime.strptime(self.default_start_time, '%H:%M')
            
            stops_with_timing = []
            for i, stop in enumerate(day['stops']):
                # Add arrival time
                stop_with_timing = {
                    **stop,
                    'arrival_time': current_time.strftime('%H:%M'),
                    'duration_hours': stop['duration_hours'],
                }
                
                # Calculate departure time
                departure_time = current_time + timedelta(hours=stop['duration_hours'])
                stop_with_timing['departure_time'] = departure_time.strftime('%H:%M')
                
                # Add travel time to next stop (if not last stop)
                if i < len(day['stops']) - 1:
                    travel_time = 0.5  # 30 minutes default
                    current_time = departure_time + timedelta(hours=travel_time)
                    stop_with_timing['travel_to_next'] = travel_time
                else:
                    current_time = departure_time
                
                stops_with_timing.append(stop_with_timing)
            
            detailed_itinerary.append({
                **day,
                'stops': stops_with_timing,
                'start_time': self.default_start_time,
                'end_time': current_time.strftime('%H:%M'),
            })
        
        return detailed_itinerary
    
    def _calculate_summary(self, itinerary: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate summary statistics for itinerary.
        
        Args:
            itinerary: Complete itinerary
            
        Returns:
            Summary dictionary
        """
        total_stops = sum(len(day['stops']) for day in itinerary)
        total_duration = sum(
            stop['duration_hours']
            for day in itinerary
            for stop in day['stops']
        )
        
        # Count categories
        categories = {}
        for day in itinerary:
            for stop in day['stops']:
                cat = stop['category']
                categories[cat] = categories.get(cat, 0) + 1
        
        return {
            'total_days': len(itinerary),
            'total_stops': total_stops,
            'total_hours': round(total_duration, 1),
            'avg_stops_per_day': round(total_stops / len(itinerary), 1) if itinerary else 0,
            'categories': categories,
            'estimated_cost': self._estimate_cost(itinerary),
        }
    
    def _estimate_cost(self, itinerary: List[Dict[str, Any]]) -> str:
        """
        Estimate cost range for itinerary.
        
        Args:
            itinerary: Complete itinerary
            
        Returns:
            Cost estimate string
        """
        cost_levels = []
        for day in itinerary:
            for stop in day['stops']:
                cost_levels.append(stop['cost_level'])
        
        if not cost_levels:
            return 'N/A'
        
        # Simple cost estimation
        free_count = cost_levels.count('free')
        low_count = cost_levels.count('low')
        medium_count = cost_levels.count('medium')
        high_count = cost_levels.count('high')
        
        if high_count > len(cost_levels) * 0.5:
            return '$$$$ (High)'
        elif medium_count > len(cost_levels) * 0.5:
            return '$$$ (Medium)'
        elif free_count > len(cost_levels) * 0.5:
            return '$ (Budget Friendly)'
        else:
            return '$$ (Moderate)'
