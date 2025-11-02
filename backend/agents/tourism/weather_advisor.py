"""
Weather Advisor Agent
====================

Provides weather forecasts, seasonal recommendations, and weather-aware
suggestions for tour planning.

Features:
- Multi-day weather forecasts
- Seasonal activity recommendations
- Weather-based itinerary adjustments
- Extreme weather alerts
- Best time to visit suggestions
- Clothing and equipment recommendations

Author: Spirit Tours Development Team
Date: 2025-11-02
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import logging
import random

from ..base import BaseAgent, AgentCapability, AgentTask

logger = logging.getLogger(__name__)


class WeatherAdvisorAgent(BaseAgent):
    """Agent responsible for weather forecasting and recommendations."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize Weather Advisor Agent."""
        super().__init__(
            agent_name="Weather Advisor",
            agent_type="weather-advisor",
            capabilities={
                AgentCapability.DATA_ANALYSIS,
                AgentCapability.RECOMMENDATION,
                AgentCapability.NOTIFICATION,
                AgentCapability.API_INTEGRATION,
            },
            config=config or {}
        )
        
        self.api_key = self.config.get('weather_api_key', 'demo_key')
        self.forecast_days = self.config.get('forecast_days', 14)
    
    async def process_task(self, task: AgentTask) -> Dict[str, Any]:
        """
        Process weather forecast request.
        
        Args:
            task: Task containing location and date range
            
        Returns:
            Weather forecast and recommendations
        """
        payload = task.payload
        
        location = payload.get('location', 'Jerusalem')
        start_date_str = payload.get('start_date')
        days = payload.get('days', 7)
        
        if start_date_str:
            start_date = datetime.fromisoformat(start_date_str)
        else:
            start_date = datetime.now()
        
        logger.info(f"Generating weather forecast for {location}, {days} days")
        
        # Generate forecast (in production, call actual weather API)
        forecast = self._generate_forecast(location, start_date, days)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(forecast)
        
        # Check for alerts
        alerts = self._check_weather_alerts(forecast)
        
        return {
            'location': location,
            'forecast': forecast,
            'recommendations': recommendations,
            'alerts': alerts,
            'summary': self._generate_summary(forecast),
        }
    
    def _generate_forecast(
        self,
        location: str,
        start_date: datetime,
        days: int
    ) -> List[Dict[str, Any]]:
        """
        Generate weather forecast.
        
        In production, this would call OpenWeatherMap or similar API.
        For demo, generating realistic sample data.
        """
        forecast = []
        
        # Israel climate patterns
        month = start_date.month
        is_summer = month in [6, 7, 8, 9]
        is_winter = month in [12, 1, 2]
        
        for i in range(days):
            date = start_date + timedelta(days=i)
            
            if is_summer:
                temp_high = random.randint(28, 35)
                temp_low = random.randint(20, 25)
                condition = random.choice(['sunny', 'sunny', 'sunny', 'partly_cloudy'])
                precipitation_chance = random.randint(0, 10)
            elif is_winter:
                temp_high = random.randint(12, 18)
                temp_low = random.randint(6, 12)
                condition = random.choice(['partly_cloudy', 'cloudy', 'rainy', 'sunny'])
                precipitation_chance = random.randint(20, 60)
            else:  # Spring/Fall
                temp_high = random.randint(18, 26)
                temp_low = random.randint(12, 18)
                condition = random.choice(['sunny', 'partly_cloudy', 'cloudy'])
                precipitation_chance = random.randint(5, 30)
            
            forecast.append({
                'date': date.isoformat(),
                'day_of_week': date.strftime('%A'),
                'temp_high': temp_high,
                'temp_low': temp_low,
                'condition': condition,
                'precipitation_chance': precipitation_chance,
                'humidity': random.randint(40, 70),
                'wind_speed': random.randint(5, 25),
                'uv_index': random.randint(4, 9) if condition == 'sunny' else random.randint(2, 6),
            })
        
        return forecast
    
    def _generate_recommendations(self, forecast: List[Dict[str, Any]]) -> List[str]:
        """Generate weather-based recommendations."""
        recommendations = []
        
        # Analyze forecast trends
        avg_temp = sum(day['temp_high'] for day in forecast) / len(forecast)
        max_precipitation = max(day['precipitation_chance'] for day in forecast)
        sunny_days = sum(1 for day in forecast if day['condition'] == 'sunny')
        
        # Temperature recommendations
        if avg_temp > 30:
            recommendations.append("Expect hot weather. Bring sunscreen, hat, and stay hydrated.")
            recommendations.append("Plan indoor activities during midday heat (12 PM - 4 PM).")
        elif avg_temp < 15:
            recommendations.append("Cool weather expected. Pack warm layers and light jacket.")
        else:
            recommendations.append("Pleasant weather forecast. Perfect for outdoor activities!")
        
        # Precipitation recommendations
        if max_precipitation > 50:
            recommendations.append("High chance of rain. Bring umbrella and rain gear.")
            recommendations.append("Consider backup indoor activities.")
        elif max_precipitation > 30:
            recommendations.append("Possible showers. Light rain jacket recommended.")
        
        # UV recommendations
        if any(day['uv_index'] > 7 for day in forecast):
            recommendations.append("High UV index expected. Use SPF 30+ sunscreen regularly.")
        
        # Positive recommendations
        if sunny_days > len(forecast) * 0.7:
            recommendations.append("Mostly sunny days ahead - great for sightseeing!")
        
        return recommendations
    
    def _check_weather_alerts(self, forecast: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Check for weather alerts."""
        alerts = []
        
        for day in forecast:
            # Extreme heat alert
            if day['temp_high'] > 38:
                alerts.append({
                    'date': day['date'],
                    'severity': 'high',
                    'type': 'extreme_heat',
                    'message': f"Extreme heat warning: {day['temp_high']}°C. Limit outdoor exposure.",
                })
            
            # Heavy rain alert
            if day['precipitation_chance'] > 70:
                alerts.append({
                    'date': day['date'],
                    'severity': 'medium',
                    'type': 'heavy_rain',
                    'message': f"Heavy rain expected ({day['precipitation_chance']}% chance). Plan accordingly.",
                })
            
            # High UV alert
            if day['uv_index'] > 8:
                alerts.append({
                    'date': day['date'],
                    'severity': 'medium',
                    'type': 'high_uv',
                    'message': f"Very high UV index ({day['uv_index']}). Extra sun protection needed.",
                })
        
        return alerts
    
    def _generate_summary(self, forecast: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate weather summary statistics."""
        return {
            'avg_temp_high': round(sum(d['temp_high'] for d in forecast) / len(forecast), 1),
            'avg_temp_low': round(sum(d['temp_low'] for d in forecast) / len(forecast), 1),
            'max_temp': max(d['temp_high'] for d in forecast),
            'min_temp': min(d['temp_low'] for d in forecast),
            'rainy_days': sum(1 for d in forecast if d['precipitation_chance'] > 50),
            'sunny_days': sum(1 for d in forecast if d['condition'] == 'sunny'),
            'overall_condition': self._determine_overall_condition(forecast),
        }
    
    def _determine_overall_condition(self, forecast: List[Dict[str, Any]]) -> str:
        """Determine overall weather condition."""
        sunny = sum(1 for d in forecast if d['condition'] == 'sunny')
        rainy = sum(1 for d in forecast if d['condition'] == 'rainy')
        
        total = len(forecast)
        if sunny > total * 0.7:
            return 'Mostly Sunny'
        elif rainy > total * 0.5:
            return 'Rainy'
        else:
            return 'Mixed Conditions'
