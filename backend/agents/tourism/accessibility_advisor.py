"""
Accessibility Advisor Agent
==========================

Provides accessibility information and recommendations for travelers
with mobility, visual, hearing, or other special needs.

Author: Spirit Tours Development Team
Date: 2025-11-02
"""

from typing import Any, Dict, List, Optional
import logging

from ..base import BaseAgent, AgentCapability, AgentTask

logger = logging.getLogger(__name__)


class AccessibilityAdvisorAgent(BaseAgent):
    """Agent providing accessibility guidance and recommendations."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(
            agent_name="Accessibility Advisor",
            agent_type="accessibility-advisor",
            capabilities={
                AgentCapability.RECOMMENDATION,
                AgentCapability.DATA_ANALYSIS,
            },
            config=config or {}
        )
    
    async def process_task(self, task: AgentTask) -> Dict[str, Any]:
        """Process accessibility assessment request."""
        payload = task.payload
        
        location = payload.get('location', 'Jerusalem')
        needs_type = payload.get('needs_type', ['mobility'])  # mobility, visual, hearing, cognitive
        poi_id = payload.get('poi_id')
        
        logger.info(f"Providing accessibility info for {location}, needs: {needs_type}")
        
        # In production, query database for actual accessibility ratings
        accessibility_info = self._get_accessibility_info(location, poi_id)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(needs_type, accessibility_info)
        
        return {
            'location': location,
            'accessibility_info': accessibility_info,
            'recommendations': recommendations,
            'accessible_alternatives': self._get_alternatives(location, needs_type),
        }
    
    def _get_accessibility_info(self, location: str, poi_id: Optional[str]) -> Dict[str, Any]:
        """Get accessibility information for location or POI."""
        return {
            'wheelchair_accessible': True,
            'wheelchair_rental_available': True,
            'accessible_restrooms': True,
            'elevator_access': True,
            'braille_signage': True,
            'audio_guides': True,
            'sign_language_tours': False,
            'mobility_rating': 8,
            'visual_rating': 7,
            'hearing_rating': 6,
            'parking': {
                'accessible_parking': True,
                'spaces': 10,
                'distance_to_entrance': '50m',
            },
            'entrances': {
                'ramp_access': True,
                'automatic_doors': True,
                'step_free': True,
            },
            'facilities': {
                'accessible_toilets': True,
                'changing_facilities': True,
                'seating_areas': True,
            }
        }
    
    def _generate_recommendations(
        self,
        needs_type: List[str],
        accessibility_info: Dict[str, Any]
    ) -> List[str]:
        """Generate personalized accessibility recommendations."""
        recommendations = []
        
        if 'mobility' in needs_type:
            if accessibility_info.get('wheelchair_accessible'):
                recommendations.append('Location is wheelchair accessible')
            if accessibility_info.get('wheelchair_rental_available'):
                recommendations.append('Wheelchair rental available on-site')
            recommendations.append('Book accessible transport in advance')
        
        if 'visual' in needs_type:
            if accessibility_info.get('audio_guides'):
                recommendations.append('Audio guides available for visually impaired')
            if accessibility_info.get('braille_signage'):
                recommendations.append('Braille signage throughout site')
            recommendations.append('Request assistance from staff on arrival')
        
        if 'hearing' in needs_type:
            if accessibility_info.get('sign_language_tours'):
                recommendations.append('Sign language tours available (book in advance)')
            recommendations.append('Written guides and visual displays available')
        
        recommendations.append('Contact venue 24h in advance for special assistance')
        
        return recommendations
    
    def _get_alternatives(self, location: str, needs_type: List[str]) -> List[Dict[str, Any]]:
        """Get alternative accessible attractions."""
        return [
            {
                'name': 'Yad Vashem',
                'accessibility_rating': 10,
                'features': ['Fully wheelchair accessible', 'Audio guides', 'Accessible parking'],
            },
            {
                'name': 'Israel Museum',
                'accessibility_rating': 9,
                'features': ['Wheelchair accessible', 'Braille labels', 'Accessible restrooms'],
            },
        ]
