"""
Load Testing Suite for Spirit Tours Platform
Comprehensive load testing scenarios using Locust.
"""

import json
import random
import time
from datetime import datetime, timedelta
from typing import Dict, Any

from locust import HttpUser, task, between, events
from locust.exception import StopUser

# Test data generators
class TestDataGenerator:
    """Generate realistic test data for load testing."""
    
    DESTINATIONS = [
        'Paris', 'Tokyo', 'New York', 'London', 'Barcelona', 'Rome',
        'Amsterdam', 'Berlin', 'Prague', 'Vienna', 'Budapest', 'Madrid'
    ]
    
    CUSTOMER_NAMES = [
        ('John', 'Doe'), ('Jane', 'Smith'), ('Carlos', 'Garcia'),
        ('Maria', 'Rodriguez'), ('David', 'Wilson'), ('Sarah', 'Brown'),
        ('Michael', 'Johnson'), ('Emma', 'Davis'), ('Oliver', 'Miller'),
        ('Isabella', 'Martinez')
    ]
    
    EMAIL_DOMAINS = ['example.com', 'test.com', 'demo.org', 'sample.net']
    
    @classmethod
    def random_destination(cls) -> str:
        """Get random destination."""
        return random.choice(cls.DESTINATIONS)
    
    @classmethod
    def random_customer(cls) -> Dict[str, str]:
        """Generate random customer data."""
        first_name, last_name = random.choice(cls.CUSTOMER_NAMES)
        email_domain = random.choice(cls.EMAIL_DOMAINS)
        
        return {
            'first_name': first_name,
            'last_name': last_name,
            'email': f'{first_name.lower()}.{last_name.lower()}@{email_domain}',
            'phone': f'+34{random.randint(600000000, 699999999)}'
        }
    
    @classmethod
    def random_search_query(cls) -> Dict[str, Any]:
        """Generate random search query."""
        destination = cls.random_destination()
        start_date = datetime.now() + timedelta(days=random.randint(30, 365))
        end_date = start_date + timedelta(days=random.randint(3, 14))
        travelers = random.randint(1, 4)
        budget = random.randint(500, 5000)
        
        return {
            'query_text': f'Find vacation packages to {destination} for {travelers} people',
            'query_type': 'booking_assistance',
            'context': {
                'destination': destination,
                'check_in': start_date.strftime('%Y-%m-%d'),
                'check_out': end_date.strftime('%Y-%m-%d'),
                'travelers': travelers,
                'budget': budget
            }
        }

class SpiritToursUser(HttpUser):
    """Base user class for Spirit Tours load testing."""
    
    wait_time = between(1, 5)  # Wait 1-5 seconds between tasks
    
    def on_start(self):
        """Called when a user starts."""
        self.customer_data = TestDataGenerator.random_customer()
        self.auth_token = None
        self.booking_id = None
        
        # Simulate user login (mock)
        self.auth_headers = {
            'Authorization': f'Bearer load_test_token_{random.randint(1000, 9999)}',
            'Content-Type': 'application/json'
        }
    
    def on_stop(self):
        """Called when a user stops."""
        pass

class WebsiteUser(SpiritToursUser):
    """Regular website user behavior simulation."""
    
    @task(30)
    def search_packages_ai(self):
        """Search for packages using AI query."""
        search_data = TestDataGenerator.random_search_query()
        search_data['user_id'] = f"load_user_{random.randint(1, 1000)}"
        
        with self.client.post(
            '/api/ai/query',
            json=search_data,
            headers=self.auth_headers,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    response.success()
                else:
                    response.failure(f"AI query failed: {data.get('error_message', 'Unknown error')}")
            else:
                response.failure(f"HTTP {response.status_code}")
    
    @task(20)
    def browse_packages(self):
        """Browse available packages."""
        destination = TestDataGenerator.random_destination()
        
        with self.client.get(
            f'/api/packages/search',
            params={
                'destination': destination,
                'limit': 10
            },
            headers=self.auth_headers,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")
    
    @task(15)
    def get_package_details(self):
        """Get detailed package information."""
        package_id = f"package_{random.randint(1, 100)}"
        
        with self.client.get(
            f'/api/packages/{package_id}',
            headers=self.auth_headers,
            catch_response=True
        ) as response:
            if response.status_code in [200, 404]:  # 404 is acceptable for non-existent packages
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")
    
    @task(10)
    def create_booking(self):
        """Create a new booking."""
        booking_data = {
            'package_id': f"package_{random.randint(1, 50)}",
            'travelers': [
                {
                    'type': 'adult',
                    'first_name': self.customer_data['first_name'],
                    'last_name': self.customer_data['last_name'],
                    'email': self.customer_data['email'],
                    'phone': self.customer_data['phone']
                }
            ],
            'special_requests': 'Load testing booking'
        }
        
        with self.client.post(
            '/api/bookings/create',
            json=booking_data,
            headers=self.auth_headers,
            catch_response=True
        ) as response:
            if response.status_code == 201:
                data = response.json()
                self.booking_id = data.get('booking_id')
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")
    
    @task(8)
    def process_payment(self):
        """Process payment for booking."""
        if not self.booking_id:
            return
        
        payment_data = {
            'booking_id': self.booking_id,
            'amount': random.uniform(500, 3000),
            'currency': 'EUR',
            'payment_method': 'card',
            'provider': 'stripe'
        }
        
        with self.client.post(
            '/api/payments/process',
            json=payment_data,
            headers=self.auth_headers,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    response.success()
                else:
                    response.failure(f"Payment failed: {data.get('error_message', 'Unknown error')}")
            else:
                response.failure(f"HTTP {response.status_code}")
    
    @task(5)
    def send_notification(self):
        """Send notification (simulate customer service)."""
        notification_data = {
            'type': 'email',
            'recipient': self.customer_data['email'],
            'subject': 'Load Test Notification',
            'content': 'This is a load testing notification.',
            'priority': 'medium'
        }
        
        with self.client.post(
            '/api/notifications/send',
            json=notification_data,
            headers=self.auth_headers,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")
    
    @task(3)
    def get_analytics_data(self):
        """Fetch analytics data (admin function)."""
        with self.client.get(
            '/api/analytics/kpis',
            headers=self.auth_headers,
            catch_response=True
        ) as response:
            if response.status_code in [200, 401, 403]:  # Auth errors are acceptable
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")

class B2BPartnerUser(SpiritToursUser):
    """B2B partner user behavior simulation."""
    
    def on_start(self):
        """Setup B2B partner authentication."""
        super().on_start()
        self.auth_headers['X-Partner-ID'] = f'PARTNER_{random.randint(100, 999)}'
    
    @task(25)
    def search_partner_inventory(self):
        """Search partner inventory."""
        search_data = {
            'destination': TestDataGenerator.random_destination(),
            'check_in': (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'),
            'check_out': (datetime.now() + timedelta(days=37)).strftime('%Y-%m-%d'),
            'travelers': random.randint(2, 8),
            'partner_tier': random.choice(['standard', 'premium', 'enterprise'])
        }
        
        with self.client.post(
            '/api/b2b/inventory/search',
            json=search_data,
            headers=self.auth_headers,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")
    
    @task(20)
    def create_partner_booking(self):
        """Create booking on behalf of customer."""
        booking_data = {
            'package_id': f"partner_package_{random.randint(1, 30)}",
            'partner_reference': f"AGENCY_BOOKING_{random.randint(1000, 9999)}",
            'end_customer_details': self.customer_data,
            'travelers': [self.customer_data],
            'markup_percentage': random.uniform(0.10, 0.25)
        }
        
        with self.client.post(
            '/api/b2b/bookings/create',
            json=booking_data,
            headers=self.auth_headers,
            catch_response=True
        ) as response:
            if response.status_code == 201:
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")
    
    @task(15)
    def get_commission_data(self):
        """Check commission information."""
        with self.client.get(
            '/api/b2b/commissions/summary',
            headers=self.auth_headers,
            catch_response=True
        ) as response:
            if response.status_code in [200, 401, 403]:
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")

class AIIntensiveUser(SpiritToursUser):
    """User that heavily uses AI features."""
    
    @task(40)
    def complex_ai_query(self):
        """Send complex AI queries."""
        complex_queries = [
            {
                'query_text': 'Plan a sustainable luxury trip to Costa Rica with adventure activities and cultural immersion for 2 weeks',
                'query_type': 'comprehensive_planning',
                'context': {
                    'budget': 8000,
                    'duration': '14 days',
                    'interests': ['sustainability', 'luxury', 'adventure', 'culture'],
                    'group_size': 2
                },
                'require_multiple_agents': True
            },
            {
                'query_text': 'Analyze market opportunities for eco-tourism in Northern Europe',
                'query_type': 'market_analysis',
                'context': {
                    'region': 'Northern Europe',
                    'focus': 'eco-tourism',
                    'timeframe': '2024-2025'
                }
            },
            {
                'query_text': 'Generate marketing content for winter ski packages in the Alps',
                'query_type': 'content_generation',
                'context': {
                    'season': 'winter',
                    'activity': 'skiing',
                    'region': 'Alps',
                    'target_audience': 'luxury travelers'
                }
            }
        ]
        
        query_data = random.choice(complex_queries)
        query_data['user_id'] = f"ai_user_{random.randint(1, 500)}"
        
        with self.client.post(
            '/api/ai/query',
            json=query_data,
            headers=self.auth_headers,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    response.success()
                    
                    # Simulate follow-up queries based on results
                    if random.random() < 0.3:  # 30% chance of follow-up
                        self.followup_ai_query(data.get('query_id'))
                else:
                    response.failure(f"AI query failed: {data.get('error_message', 'Unknown error')}")
            else:
                response.failure(f"HTTP {response.status_code}")
    
    def followup_ai_query(self, original_query_id: str):
        """Send follow-up query based on previous results."""
        followup_data = {
            'query_text': 'Refine the previous recommendations with more specific details',
            'query_type': 'booking_assistance',
            'context': {
                'previous_query_id': original_query_id,
                'refinement': 'more_specific_details'
            },
            'user_id': f"ai_user_{random.randint(1, 500)}"
        }
        
        with self.client.post(
            '/api/ai/query',
            json=followup_data,
            headers=self.auth_headers,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Follow-up query failed: HTTP {response.status_code}")
    
    @task(20)
    def get_ai_system_status(self):
        """Check AI system status."""
        with self.client.get(
            '/api/ai/agents',
            headers=self.auth_headers,
            catch_response=True
        ) as response:
            if response.status_code in [200, 401, 403]:
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")
    
    @task(15)
    def get_ai_analytics(self):
        """Get AI system analytics."""
        with self.client.get(
            '/api/ai/analytics',
            headers=self.auth_headers,
            catch_response=True
        ) as response:
            if response.status_code in [200, 401, 403]:
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")

# Performance monitoring events
@events.request.add_listener
def request_stats(request_type, name, response_time, response_length, response, context, exception, start_time, url, **kwargs):
    """Track request statistics for analysis."""
    if exception:
        print(f"Request failed: {name} - {exception}")
    elif response and response.status_code >= 400:
        print(f"HTTP Error: {name} - {response.status_code}")

@events.test_start.add_listener
def test_start_handler(environment, **kwargs):
    """Called when test starts."""
    print("🚀 Starting Spirit Tours Load Test")
    print(f"Target host: {environment.host}")

@events.test_stop.add_listener
def test_stop_handler(environment, **kwargs):
    """Called when test stops."""
    print("🏁 Load test completed")
    
    # Print summary statistics
    stats = environment.stats
    print(f"Total requests: {stats.total.num_requests}")
    print(f"Failures: {stats.total.num_failures}")
    print(f"Average response time: {stats.total.avg_response_time:.2f}ms")
    print(f"Max response time: {stats.total.max_response_time:.2f}ms")
    print(f"Requests per second: {stats.total.current_rps:.2f}")

# Custom load test scenarios
class StressTestUser(HttpUser):
    """High-intensity stress testing user."""
    
    wait_time = between(0.1, 0.5)  # Very short wait times
    
    @task
    def rapid_fire_requests(self):
        """Rapid fire requests to stress test the system."""
        endpoints = [
            '/api/health',
            '/api/analytics/kpis',
            '/api/ai/agents',
            '/api/packages/search?limit=5'
        ]
        
        endpoint = random.choice(endpoints)
        self.client.get(endpoint, headers={'Authorization': 'Bearer stress_test_token'})

# Export user classes for Locust
__all__ = ['WebsiteUser', 'B2BPartnerUser', 'AIIntensiveUser', 'StressTestUser']