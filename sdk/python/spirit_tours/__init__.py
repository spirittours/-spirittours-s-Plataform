"""
Spirit Tours Python SDK
Official Python client for Spirit Tours API
"""

from typing import Dict, List, Optional, Any
import requests
from datetime import datetime

class SpiritToursClient:
    """
    Official Python SDK for Spirit Tours API
    
    Usage:
        client = SpiritToursClient(api_key='your_api_key')
        tours = client.tours.search(destination='Paris')
    """
    
    def __init__(self, api_key: str, base_url: str = "https://api.spirittours.com"):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        })
        
        # Initialize resource endpoints
        self.tours = ToursResource(self)
        self.bookings = BookingsResource(self)
        self.users = UsersResource(self)
    
    def _request(self, method: str, endpoint: str, **kwargs) -> Dict:
        """Make API request"""
        url = f"{self.base_url}{endpoint}"
        response = self.session.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()


class ToursResource:
    """Tours API endpoints"""
    
    def __init__(self, client: SpiritToursClient):
        self.client = client
    
    def list(self, page: int = 1, page_size: int = 20) -> Dict:
        """List all tours"""
        return self.client._request(
            'GET',
            '/api/tours',
            params={'page': page, 'page_size': page_size}
        )
    
    def get(self, tour_id: str) -> Dict:
        """Get tour details"""
        return self.client._request('GET', f'/api/tours/{tour_id}')
    
    def search(
        self,
        destination: Optional[str] = None,
        start_date: Optional[datetime] = None,
        adults: int = 2,
        **filters
    ) -> Dict:
        """Search tours with filters"""
        params = {'adults': adults, **filters}
        if destination:
            params['destination'] = destination
        if start_date:
            params['start_date'] = start_date.isoformat()
        
        return self.client._request('GET', '/api/tours/search', params=params)
    
    def featured(self) -> List[Dict]:
        """Get featured tours"""
        return self.client._request('GET', '/api/tours/featured')


class BookingsResource:
    """Bookings API endpoints"""
    
    def __init__(self, client: SpiritToursClient):
        self.client = client
    
    def create(
        self,
        tour_id: str,
        tour_date: datetime,
        adults: int,
        children: int = 0,
        **kwargs
    ) -> Dict:
        """Create a new booking"""
        data = {
            'tour_id': tour_id,
            'tour_date': tour_date.isoformat(),
            'adults': adults,
            'children': children,
            **kwargs
        }
        return self.client._request('POST', '/api/bookings', json=data)
    
    def get(self, booking_id: str) -> Dict:
        """Get booking details"""
        return self.client._request('GET', f'/api/bookings/{booking_id}')
    
    def list(self, user_id: Optional[str] = None) -> List[Dict]:
        """List bookings"""
        params = {'user_id': user_id} if user_id else {}
        return self.client._request('GET', '/api/bookings', params=params)
    
    def cancel(self, booking_id: str, reason: Optional[str] = None) -> Dict:
        """Cancel a booking"""
        data = {'reason': reason} if reason else {}
        return self.client._request('POST', f'/api/bookings/{booking_id}/cancel', json=data)


class UsersResource:
    """Users API endpoints"""
    
    def __init__(self, client: SpiritToursClient):
        self.client = client
    
    def me(self) -> Dict:
        """Get current user"""
        return self.client._request('GET', '/api/auth/me')
    
    def update(self, **data) -> Dict:
        """Update user profile"""
        return self.client._request('PUT', '/api/auth/profile', json=data)


# Example usage
if __name__ == "__main__":
    # Initialize client
    client = SpiritToursClient(api_key='your_api_key_here')
    
    # Search tours
    tours = client.tours.search(destination='Paris', adults=2)
    print(f"Found {len(tours)} tours")
    
    # Create booking
    booking = client.bookings.create(
        tour_id='tour-123',
        tour_date=datetime(2025, 12, 1),
        adults=2,
        children=0
    )
    print(f"Booking created: {booking['id']}")
