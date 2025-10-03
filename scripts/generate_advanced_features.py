#!/usr/bin/env python3
"""
Advanced Features Generation Script
Generates ML features, API Documentation, OTA integrations, Workflow Designer
"""

import os
from pathlib import Path

BASE_DIR = Path("/home/user/webapp")

def create_file(path: Path, content: str):
    """Create file with content"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')
    print(f"✅ {path.relative_to(BASE_DIR)}")

#===========================================
# 1. RECOMMENDATION ENGINE (ML)
#===========================================

def generate_recommendation_engine():
    """Generate AI-powered recommendation engine"""
    
    recommendation_engine = '''"""
AI-Powered Recommendation Engine
Uses collaborative filtering and content-based filtering
"""

import numpy as np
from typing import List, Dict, Tuple
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
import pandas as pd

class RecommendationEngine:
    """
    Hybrid Recommendation System
    Combines collaborative and content-based filtering
    """
    
    def __init__(self):
        self.user_item_matrix = None
        self.item_features = None
        self.tfidf_vectorizer = TfidfVectorizer(max_features=100)
        self.similarity_matrix = None
        
    def train(self, bookings_data: pd.DataFrame, tours_data: pd.DataFrame):
        """
        Train recommendation models
        
        Args:
            bookings_data: DataFrame with columns [user_id, tour_id, rating]
            tours_data: DataFrame with columns [tour_id, description, category, tags]
        """
        # Create user-item matrix for collaborative filtering
        self.user_item_matrix = bookings_data.pivot_table(
            index='user_id',
            columns='tour_id',
            values='rating',
            fill_value=0
        )
        
        # Create item features for content-based filtering
        tours_data['combined_features'] = (
            tours_data['description'] + ' ' + 
            tours_data['category'] + ' ' + 
            tours_data['tags']
        )
        
        self.item_features = self.tfidf_vectorizer.fit_transform(
            tours_data['combined_features']
        )
        
        # Compute item-item similarity matrix
        self.similarity_matrix = cosine_similarity(self.item_features)
        
    def get_user_recommendations(
        self,
        user_id: str,
        n_recommendations: int = 10,
        method: str = 'hybrid'
    ) -> List[Tuple[str, float]]:
        """
        Get personalized recommendations for a user
        
        Args:
            user_id: User identifier
            n_recommendations: Number of recommendations to return
            method: 'collaborative', 'content', or 'hybrid'
            
        Returns:
            List of (tour_id, score) tuples
        """
        if method == 'collaborative':
            return self._collaborative_filtering(user_id, n_recommendations)
        elif method == 'content':
            return self._content_based_filtering(user_id, n_recommendations)
        else:  # hybrid
            collab_recs = self._collaborative_filtering(user_id, n_recommendations * 2)
            content_recs = self._content_based_filtering(user_id, n_recommendations * 2)
            
            # Combine and re-rank
            combined = {}
            for tour_id, score in collab_recs:
                combined[tour_id] = score * 0.6  # 60% weight to collaborative
            
            for tour_id, score in content_recs:
                if tour_id in combined:
                    combined[tour_id] += score * 0.4  # 40% weight to content
                else:
                    combined[tour_id] = score * 0.4
            
            # Sort and return top N
            sorted_recs = sorted(combined.items(), key=lambda x: x[1], reverse=True)
            return sorted_recs[:n_recommendations]
    
    def _collaborative_filtering(self, user_id: str, n: int) -> List[Tuple[str, float]]:
        """Collaborative filtering recommendations"""
        if self.user_item_matrix is None or user_id not in self.user_item_matrix.index:
            return []
        
        # Find similar users
        user_ratings = self.user_item_matrix.loc[user_id]
        similarities = cosine_similarity(
            [user_ratings],
            self.user_item_matrix
        )[0]
        
        # Get weighted average of ratings from similar users
        recommendations = {}
        for idx, sim in enumerate(similarities):
            if sim > 0.5:  # Similarity threshold
                other_user_id = self.user_item_matrix.index[idx]
                other_ratings = self.user_item_matrix.loc[other_user_id]
                
                for tour_id, rating in other_ratings.items():
                    if rating > 0 and user_ratings[tour_id] == 0:  # Not yet rated by user
                        if tour_id not in recommendations:
                            recommendations[tour_id] = 0
                        recommendations[tour_id] += sim * rating
        
        sorted_recs = sorted(recommendations.items(), key=lambda x: x[1], reverse=True)
        return sorted_recs[:n]
    
    def _content_based_filtering(self, user_id: str, n: int) -> List[Tuple[str, float]]:
        """Content-based filtering recommendations"""
        if self.user_item_matrix is None or user_id not in self.user_item_matrix.index:
            return []
        
        # Get user's liked tours
        user_ratings = self.user_item_matrix.loc[user_id]
        liked_tours = user_ratings[user_ratings > 3.5].index.tolist()
        
        if not liked_tours:
            return []
        
        # Find similar tours based on content
        recommendations = {}
        for tour_id in liked_tours:
            tour_idx = self.user_item_matrix.columns.get_loc(tour_id)
            similar_scores = self.similarity_matrix[tour_idx]
            
            for idx, score in enumerate(similar_scores):
                rec_tour_id = self.user_item_matrix.columns[idx]
                if rec_tour_id not in liked_tours and user_ratings[rec_tour_id] == 0:
                    if rec_tour_id not in recommendations:
                        recommendations[rec_tour_id] = 0
                    recommendations[rec_tour_id] += score
        
        sorted_recs = sorted(recommendations.items(), key=lambda x: x[1], reverse=True)
        return sorted_recs[:n]
    
    def get_similar_tours(self, tour_id: str, n: int = 5) -> List[Tuple[str, float]]:
        """Get similar tours based on content"""
        if tour_id not in self.user_item_matrix.columns:
            return []
        
        tour_idx = self.user_item_matrix.columns.get_loc(tour_id)
        similar_scores = self.similarity_matrix[tour_idx]
        
        # Get top N similar tours (excluding the tour itself)
        similar_indices = np.argsort(similar_scores)[::-1][1:n+1]
        similar_tours = [
            (self.user_item_matrix.columns[idx], similar_scores[idx])
            for idx in similar_indices
        ]
        
        return similar_tours


# Global recommendation engine instance
recommendation_engine = RecommendationEngine()
'''
    create_file(BASE_DIR / "backend/ai/recommendation_engine.py", recommendation_engine)

#===========================================
# 2. API DOCUMENTATION & SDK
#===========================================

def generate_api_documentation():
    """Generate comprehensive API documentation"""
    
    # SDK Client for Python
    python_sdk = '''"""
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
'''
    create_file(BASE_DIR / "sdk/python/spirit_tours/__init__.py", python_sdk)
    
    # Postman Collection
    postman_collection = '''{
  "info": {
    "name": "Spirit Tours API",
    "description": "Complete API collection for Spirit Tours platform",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{auth_token}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "base_url",
      "value": "https://api.spirittours.com",
      "type": "string"
    },
    {
      "key": "auth_token",
      "value": "",
      "type": "string"
    }
  ],
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\\n  \\"email\\": \\"user@example.com\\",\\n  \\"password\\": \\"SecurePass123!\\",\\n  \\"name\\": \\"John Doe\\"\\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{base_url}}/api/auth/register",
              "host": ["{{base_url}}"],
              "path": ["api", "auth", "register"]
            }
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\\n  \\"email\\": \\"user@example.com\\",\\n  \\"password\\": \\"SecurePass123!\\"\\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{base_url}}/api/auth/login",
              "host": ["{{base_url}}"],
              "path": ["api", "auth", "login"]
            }
          }
        }
      ]
    },
    {
      "name": "Tours",
      "item": [
        {
          "name": "Search Tours",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/api/tours/search?destination=Paris&adults=2",
              "host": ["{{base_url}}"],
              "path": ["api", "tours", "search"],
              "query": [
                {
                  "key": "destination",
                  "value": "Paris"
                },
                {
                  "key": "adults",
                  "value": "2"
                }
              ]
            }
          }
        },
        {
          "name": "Get Tour Details",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/api/tours/:tourId",
              "host": ["{{base_url}}"],
              "path": ["api", "tours", ":tourId"],
              "variable": [
                {
                  "key": "tourId",
                  "value": "tour-123"
                }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "Bookings",
      "item": [
        {
          "name": "Create Booking",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\\n  \\"tourId\\": \\"tour-123\\",\\n  \\"tourDate\\": \\"2025-12-01\\",\\n  \\"adults\\": 2,\\n  \\"children\\": 0\\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{base_url}}/api/bookings",
              "host": ["{{base_url}}"],
              "path": ["api", "bookings"]
            }
          }
        }
      ]
    }
  ]
}'''
    create_file(BASE_DIR / "docs/postman/spirit-tours-collection.json", postman_collection)

#===========================================
# 3. THIRD-PARTY OTA INTEGRATIONS
#===========================================

def generate_ota_integrations():
    """Generate integrations with third-party OTAs"""
    
    booking_com_integration = '''"""
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
'''
    create_file(BASE_DIR / "backend/integrations/booking_com_api.py", booking_com_integration)
    
    expedia_integration = '''"""
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
'''
    create_file(BASE_DIR / "backend/integrations/expedia_api.py", expedia_integration)

#===========================================
# MAIN EXECUTION
#===========================================

def main():
    """Main execution"""
    print("🚀 GENERATING ADVANCED FEATURES")
    print("=" * 80)
    
    print("\n🤖 Generating ML Recommendation Engine...")
    generate_recommendation_engine()
    
    print("\n📚 Generating API Documentation & SDK...")
    generate_api_documentation()
    
    print("\n🌐 Generating OTA Integrations...")
    generate_ota_integrations()
    
    print("\n" + "=" * 80)
    print("✅ ADVANCED FEATURES GENERATED!")
    print("\n📊 Summary:")
    print("  ✅ AI Recommendation Engine (Collaborative + Content-Based)")
    print("  ✅ Python SDK Client")
    print("  ✅ Postman API Collection")
    print("  ✅ Booking.com Integration")
    print("  ✅ Expedia Integration")

if __name__ == "__main__":
    main()
