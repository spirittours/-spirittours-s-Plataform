"""
Booking.com API Integration
Handles synchronization with Booking.com
"""

from typing import Dict, List, Optional
import requests
from datetime import datetime

class BookingComAPI:
    """
    Integration with Booking.com Partner API
    https://developers.booking.com/
    """
    
    def __init__(self, api_key: str, affiliate_id: str):
        self.api_key = api_key
        self.affiliate_id = affiliate_id
        self.base_url = "https://distribution-xml.booking.com/2.7/json"
        self.session = requests.Session()
    
    def search_hotels(
        self,
        city_id: int,
        checkin: datetime,
        checkout: datetime,
        adults: int = 2,
        **kwargs
    ) -> List[Dict]:
        """
        Search hotels on Booking.com
        
        Args:
            city_id: Booking.com city ID
            checkin: Check-in date
            checkout: Check-out date
            adults: Number of adults
        """
        params = {
            'city_ids': city_id,
            'checkin': checkin.strftime('%Y-%m-%d'),
            'checkout': checkout.strftime('%Y-%m-%d'),
            'room1': f'A,A' * (adults // 2),  # Format: A,A for 2 adults
            'affiliate_id': self.affiliate_id,
            **kwargs
        }
        
        response = self.session.get(
            f"{self.base_url}/search",
            params=params,
            headers={'Authorization': f'Bearer {self.api_key}'}
        )
        response.raise_for_status()
        return response.json().get('result', [])
    
    def get_hotel_details(self, hotel_id: int) -> Dict:
        """Get detailed hotel information"""
        params = {
            'hotel_ids': hotel_id,
            'affiliate_id': self.affiliate_id
        }
        
        response = self.session.get(
            f"{self.base_url}/hotels",
            params=params,
            headers={'Authorization': f'Bearer {self.api_key}'}
        )
        response.raise_for_status()
        return response.json()
    
    def get_room_availability(
        self,
        hotel_id: int,
        checkin: datetime,
        checkout: datetime,
        adults: int = 2
    ) -> List[Dict]:
        """Check room availability and prices"""
        params = {
            'hotel_ids': hotel_id,
            'checkin': checkin.strftime('%Y-%m-%d'),
            'checkout': checkout.strftime('%Y-%m-%d'),
            'room1': f'A,A' * (adults // 2),
            'affiliate_id': self.affiliate_id
        }
        
        response = self.session.get(
            f"{self.base_url}/blockavailability",
            params=params,
            headers={'Authorization': f'Bearer {self.api_key}'}
        )
        response.raise_for_status()
        return response.json().get('rooms', [])
    
    def create_booking(self, booking_data: Dict) -> Dict:
        """
        Create a booking on Booking.com
        Note: Requires special partner agreement
        """
        response = self.session.post(
            f"{self.base_url}/reservations",
            json=booking_data,
            headers={'Authorization': f'Bearer {self.api_key}'}
        )
        response.raise_for_status()
        return response.json()
