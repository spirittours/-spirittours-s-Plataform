"""
Expedia API Integration
Handles synchronization with Expedia
"""

from typing import Dict, List, Optional
import requests
from datetime import datetime

class ExpediaAPI:
    """
    Integration with Expedia Rapid API
    https://developers.expediagroup.com/
    """
    
    def __init__(self, api_key: str, secret: str):
        self.api_key = api_key
        self.secret = secret
        self.base_url = "https://api.ean.com/v3"
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        })
    
    def search_properties(
        self,
        region_id: str,
        checkin: datetime,
        checkout: datetime,
        occupancy: str = '2',
        **kwargs
    ) -> List[Dict]:
        """
        Search properties on Expedia
        
        Args:
            region_id: Expedia region ID
            checkin: Check-in date
            checkout: Check-out date
            occupancy: Number of guests
        """
        params = {
            'region_id': region_id,
            'checkin': checkin.strftime('%Y-%m-%d'),
            'checkout': checkout.strftime('%Y-%m-%d'),
            'occupancy': occupancy,
            **kwargs
        }
        
        response = self.session.get(f"{self.base_url}/properties/search", params=params)
        response.raise_for_status()
        return response.json().get('properties', [])
    
    def get_property_details(self, property_id: str) -> Dict:
        """Get detailed property information"""
        response = self.session.get(f"{self.base_url}/properties/{property_id}")
        response.raise_for_status()
        return response.json()
    
    def get_availability(
        self,
        property_id: str,
        checkin: datetime,
        checkout: datetime,
        occupancy: str = '2'
    ) -> Dict:
        """Check property availability and rates"""
        params = {
            'checkin': checkin.strftime('%Y-%m-%d'),
            'checkout': checkout.strftime('%Y-%m-%d'),
            'occupancy': occupancy
        }
        
        response = self.session.get(
            f"{self.base_url}/properties/{property_id}/availability",
            params=params
        )
        response.raise_for_status()
        return response.json()
    
    def create_booking(self, booking_data: Dict) -> Dict:
        """Create a booking on Expedia"""
        response = self.session.post(
            f"{self.base_url}/itineraries",
            json=booking_data
        )
        response.raise_for_status()
        return response.json()
