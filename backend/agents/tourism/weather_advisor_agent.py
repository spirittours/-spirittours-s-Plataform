"""
Weather Advisor Agent

Provides weather-based recommendations for tours and activities.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from ..base.agent_base import (
    AgentBase, AgentRequest, AgentResponse,
    AgentStatus, AgentCapability
)


class WeatherAdvisorAgent(AgentBase):
    """Weather-based tour recommendations and alerts"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(
            name="weather_advisor",
            description="Weather-based recommendations and alerts",
            version="1.0.0",
            config=config
        )
    
    def get_capabilities(self) -> List[AgentCapability]:
        return [
            AgentCapability.RECOMMENDATION,
            AgentCapability.API_INTEGRATION,
            AgentCapability.DATA_ANALYSIS,
        ]
    
    def validate_request(self, request: AgentRequest) -> tuple[bool, Optional[str]]:
        if request.intent in ['check_weather', 'recommend_activities', 'weather_alerts']:
            if 'location' not in request.parameters:
                return False, "Missing required parameter: location"
            return True, None
        return False, f"Unknown intent: {request.intent}"
    
    async def process(self, request: AgentRequest) -> AgentResponse:
        if request.intent == 'check_weather':
            result = await self._check_weather(request.parameters)
        elif request.intent == 'recommend_activities':
            result = await self._recommend_activities(request.parameters)
        elif request.intent == 'weather_alerts':
            result = await self._get_weather_alerts(request.parameters)
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
            result=result
        )
    
    async def _check_weather(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get weather forecast for location"""
        location = params['location']
        days = params.get('days', 7)
        
        # Mock weather data (integrate with OpenWeatherMap API)
        forecast = []
        for i in range(days):
            date = datetime.now() + timedelta(days=i)
            forecast.append({
                'date': date.strftime('%Y-%m-%d'),
                'temp_c': 25 + (i % 5),
                'condition': 'Sunny' if i % 2 == 0 else 'Partly Cloudy',
                'precipitation_mm': 0 if i % 3 != 0 else 5,
                'wind_kph': 15 + (i % 10),
                'humidity': 60 + (i % 20),
            })
        
        return {
            'location': location,
            'forecast': forecast,
            'recommendations': self._generate_weather_recommendations(forecast)
        }
    
    async def _recommend_activities(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Recommend activities based on weather"""
        weather = await self._check_weather(params)
        
        recommendations = []
        for day in weather['forecast']:
            if day['condition'] == 'Sunny' and day['temp_c'] < 30:
                activities = ['Outdoor tours', 'Beach visits', 'Hiking']
            elif day['precipitation_mm'] > 0:
                activities = ['Museums', 'Indoor attractions', 'Shopping']
            else:
                activities = ['City tours', 'Cultural sites', 'Restaurants']
            
            recommendations.append({
                'date': day['date'],
                'weather': day['condition'],
                'recommended_activities': activities
            })
        
        return {'daily_recommendations': recommendations}
    
    async def _get_weather_alerts(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get weather alerts and warnings"""
        location = params['location']
        
        # Mock alerts
        alerts = []
        
        return {
            'location': location,
            'alerts': alerts,
            'severity': 'none'
        }
    
    def _generate_weather_recommendations(self, forecast: List[Dict]) -> List[str]:
        """Generate weather-based recommendations"""
        recommendations = []
        
        hot_days = sum(1 for d in forecast if d['temp_c'] > 30)
        rainy_days = sum(1 for d in forecast if d['precipitation_mm'] > 5)
        
        if hot_days > 3:
            recommendations.append("Pack sunscreen and stay hydrated")
        if rainy_days > 2:
            recommendations.append("Bring rain gear and plan indoor activities")
        
        return recommendations
