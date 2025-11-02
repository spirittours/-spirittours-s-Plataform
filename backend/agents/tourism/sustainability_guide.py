"""
Sustainability Guide Agent
==========================

Provides eco-friendly travel recommendations, carbon footprint analysis,
and sustainable tourism guidance.

Author: Spirit Tours Development Team
Date: 2025-11-02
"""

from typing import Any, Dict, List, Optional
import logging

from ..base import BaseAgent, AgentCapability, AgentTask

logger = logging.getLogger(__name__)


class SustainabilityGuideAgent(BaseAgent):
    """Agent providing sustainability guidance for eco-conscious travelers."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(
            agent_name="Sustainability Guide",
            agent_type="sustainability-guide",
            capabilities={
                AgentCapability.RECOMMENDATION,
                AgentCapability.DATA_ANALYSIS,
            },
            config=config or {}
        )
    
    async def process_task(self, task: AgentTask) -> Dict[str, Any]:
        """Process sustainability assessment request."""
        payload = task.payload
        
        itinerary = payload.get('itinerary', {})
        transport_modes = payload.get('transport_modes', ['car'])
        accommodation_type = payload.get('accommodation_type', 'hotel')
        group_size = payload.get('group_size', 2)
        
        logger.info(f"Analyzing sustainability for group of {group_size}")
        
        # Calculate carbon footprint
        carbon_footprint = self._calculate_carbon_footprint(
            transport_modes, accommodation_type, group_size, itinerary
        )
        
        # Generate eco-friendly recommendations
        recommendations = self._generate_eco_recommendations(carbon_footprint, itinerary)
        
        # Find sustainable alternatives
        sustainable_options = self._get_sustainable_options()
        
        return {
            'carbon_footprint': carbon_footprint,
            'recommendations': recommendations,
            'sustainable_options': sustainable_options,
            'sustainability_score': self._calculate_sustainability_score(carbon_footprint),
        }
    
    def _calculate_carbon_footprint(
        self,
        transport_modes: List[str],
        accommodation_type: str,
        group_size: int,
        itinerary: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate estimated carbon footprint."""
        # Emission factors (kg CO2 per person per day/km)
        transport_emissions = {
            'flight': 0.25,  # per km
            'car': 0.12,  # per km
            'bus': 0.05,  # per km
            'train': 0.04,  # per km
            'walking': 0.0,
            'bicycle': 0.0,
        }
        
        accommodation_emissions = {
            'hotel': 30,  # kg CO2 per night
            'eco_hotel': 15,
            'hostel': 10,
            'airbnb': 20,
            'camping': 5,
        }
        
        # Calculate transport emissions (assuming 200km average per day)
        avg_km_per_day = 200
        days = itinerary.get('days', 7) if isinstance(itinerary, dict) else 7
        
        transport_co2 = sum(
            transport_emissions.get(mode, 0.1) * avg_km_per_day * days
            for mode in transport_modes
        ) / len(transport_modes)
        
        # Calculate accommodation emissions
        accommodation_co2 = accommodation_emissions.get(accommodation_type, 25) * days
        
        # Calculate activities emissions (estimated)
        activities_co2 = 10 * days  # Average daily activity emissions
        
        # Total per person
        total_per_person = transport_co2 + accommodation_co2 + activities_co2
        
        # Total for group
        total_group = total_per_person * group_size
        
        return {
            'transport_co2_kg': round(transport_co2, 2),
            'accommodation_co2_kg': round(accommodation_co2, 2),
            'activities_co2_kg': round(activities_co2, 2),
            'total_per_person_kg': round(total_per_person, 2),
            'total_group_kg': round(total_group, 2),
            'equivalent_trees_needed': round(total_group / 20, 1),  # 1 tree absorbs ~20kg CO2/year
        }
    
    def _generate_eco_recommendations(
        self,
        carbon_footprint: Dict[str, Any],
        itinerary: Dict[str, Any]
    ) -> List[str]:
        """Generate eco-friendly recommendations."""
        recommendations = []
        
        # Transport recommendations
        if carbon_footprint['transport_co2_kg'] > 100:
            recommendations.append('Consider using public transportation or shared buses to reduce emissions')
            recommendations.append('Group travel in a single vehicle instead of multiple cars')
        
        # Accommodation recommendations
        if carbon_footprint['accommodation_co2_kg'] > 150:
            recommendations.append('Choose eco-certified hotels or accommodations')
            recommendations.append('Look for hotels with renewable energy and water conservation')
        
        # General recommendations
        recommendations.extend([
            'Bring reusable water bottles and shopping bags',
            'Support local businesses and restaurants',
            'Minimize plastic use and single-use items',
            'Respect wildlife and natural habitats',
            'Choose walking tours when possible',
            'Offset your carbon footprint through certified programs',
        ])
        
        return recommendations
    
    def _get_sustainable_options(self) -> List[Dict[str, Any]]:
        """Get sustainable tourism options."""
        return [
            {
                'type': 'eco_tour',
                'name': 'Sustainable Desert Hiking',
                'carbon_savings': '40%',
                'features': ['Local guides', 'Zero waste', 'Native flora education'],
            },
            {
                'type': 'accommodation',
                'name': 'Green-certified Hotels',
                'carbon_savings': '50%',
                'features': ['Solar power', 'Water recycling', 'Organic food'],
            },
            {
                'type': 'transport',
                'name': 'Electric Vehicle Tours',
                'carbon_savings': '80%',
                'features': ['Zero emissions', 'Quiet rides', 'Modern comfort'],
            },
        ]
    
    def _calculate_sustainability_score(self, carbon_footprint: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate sustainability score (0-100)."""
        total_co2 = carbon_footprint['total_per_person_kg']
        
        # Scoring (lower emissions = higher score)
        if total_co2 < 100:
            score = 90
            rating = 'Excellent'
        elif total_co2 < 200:
            score = 75
            rating = 'Good'
        elif total_co2 < 300:
            score = 50
            rating = 'Fair'
        else:
            score = 25
            rating = 'Needs Improvement'
        
        return {
            'score': score,
            'rating': rating,
            'message': f'Your trip has a {rating.lower()} sustainability profile.',
        }
