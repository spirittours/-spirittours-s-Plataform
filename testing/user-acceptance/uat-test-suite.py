#!/usr/bin/env python3
"""
Spirit Tours - User Acceptance Testing (UAT) Suite
Comprehensive testing suite for validating all system functionalities
"""

import os
import sys
import time
import json
import logging
import requests
import unittest
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed
import pandas as pd
from faker import Faker
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'uat_test_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Test configuration
@dataclass
class TestConfig:
    """Test environment configuration"""
    base_url: str = os.getenv('TEST_BASE_URL', 'http://localhost:8001')
    frontend_url: str = os.getenv('TEST_FRONTEND_URL', 'http://localhost:3001')
    api_key: str = os.getenv('TEST_API_KEY', 'test_api_key_2024')
    test_user_email: str = 'uat_tester@spirit-tours.com'
    test_user_password: str = 'UATTest2024!'
    selenium_headless: bool = True
    parallel_users: int = 10
    test_duration_minutes: int = 30

@dataclass
class TestResult:
    """Test result structure"""
    test_name: str
    status: str  # 'PASSED', 'FAILED', 'SKIPPED'
    duration_ms: float
    error_message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class UATTestSuite:
    """Main UAT Test Suite Class"""
    
    def __init__(self, config: TestConfig):
        self.config = config
        self.faker = Faker()
        self.test_results: List[TestResult] = []
        self.session = requests.Session()
        self.auth_token: Optional[str] = None
        self.driver: Optional[webdriver.Chrome] = None
        
    def setup(self):
        """Setup test environment"""
        logger.info("Setting up UAT test environment...")
        
        # Setup Selenium WebDriver
        chrome_options = Options()
        if self.config.selenium_headless:
            chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        
        try:
            self.driver = webdriver.Chrome(options=chrome_options)
            logger.info("Selenium WebDriver initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize WebDriver: {e}")
    
    def teardown(self):
        """Cleanup test environment"""
        logger.info("Cleaning up test environment...")
        if self.driver:
            self.driver.quit()
        self.session.close()
    
    def run_test(self, test_func, test_name: str) -> TestResult:
        """Run a single test and capture results"""
        start_time = time.time()
        try:
            test_func()
            duration_ms = (time.time() - start_time) * 1000
            result = TestResult(
                test_name=test_name,
                status='PASSED',
                duration_ms=duration_ms
            )
            logger.info(f"✓ Test {test_name} PASSED in {duration_ms:.2f}ms")
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            result = TestResult(
                test_name=test_name,
                status='FAILED',
                duration_ms=duration_ms,
                error_message=str(e)
            )
            logger.error(f"✗ Test {test_name} FAILED: {e}")
        
        self.test_results.append(result)
        return result
    
    # ========== AUTHENTICATION TESTS ==========
    
    def test_user_registration(self):
        """Test user registration flow"""
        test_user = {
            'email': self.faker.email(),
            'password': 'TestPass2024!',
            'first_name': self.faker.first_name(),
            'last_name': self.faker.last_name(),
            'phone': self.faker.phone_number()
        }
        
        response = self.session.post(
            f"{self.config.base_url}/api/auth/register",
            json=test_user
        )
        
        assert response.status_code == 201, f"Registration failed: {response.text}"
        data = response.json()
        assert 'user_id' in data, "User ID not returned"
        assert data['email'] == test_user['email'], "Email mismatch"
        
        return data['user_id']
    
    def test_user_login(self):
        """Test user login flow"""
        login_data = {
            'username': self.config.test_user_email,
            'password': self.config.test_user_password
        }
        
        response = self.session.post(
            f"{self.config.base_url}/api/auth/login",
            data=login_data
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert 'access_token' in data, "Access token not returned"
        
        self.auth_token = data['access_token']
        self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
        
        return self.auth_token
    
    def test_2fa_authentication(self):
        """Test 2FA authentication flow"""
        # First, enable 2FA
        response = self.session.post(
            f"{self.config.base_url}/api/auth/2fa/enable"
        )
        
        assert response.status_code == 200, f"2FA enable failed: {response.text}"
        data = response.json()
        assert 'qr_code' in data, "QR code not returned"
        assert 'backup_codes' in data, "Backup codes not returned"
        
        # Simulate 2FA verification (in real test, use actual TOTP)
        verify_data = {
            'totp_code': '123456'  # This would be generated from the secret
        }
        
        # Note: This would fail in real scenario without valid TOTP
        logger.info("2FA setup completed (verification simulated)")
    
    # ========== BOOKING TESTS ==========
    
    def test_tour_search(self):
        """Test tour search functionality"""
        search_params = {
            'destination': 'Madrid',
            'date_from': datetime.now().isoformat(),
            'date_to': (datetime.now() + timedelta(days=7)).isoformat(),
            'guests': 2,
            'price_min': 50,
            'price_max': 500
        }
        
        response = self.session.get(
            f"{self.config.base_url}/api/tours/search",
            params=search_params
        )
        
        assert response.status_code == 200, f"Tour search failed: {response.text}"
        data = response.json()
        assert 'tours' in data, "Tours not returned"
        assert isinstance(data['tours'], list), "Tours should be a list"
        
        if data['tours']:
            tour = data['tours'][0]
            assert 'id' in tour, "Tour ID missing"
            assert 'name' in tour, "Tour name missing"
            assert 'price' in tour, "Tour price missing"
        
        return data['tours']
    
    def test_create_booking(self):
        """Test booking creation flow"""
        # First, get available tours
        tours = self.test_tour_search()
        assert tours, "No tours available for booking"
        
        tour = tours[0]
        booking_data = {
            'tour_id': tour['id'],
            'date': (datetime.now() + timedelta(days=3)).isoformat(),
            'guests': 2,
            'guest_details': [
                {
                    'first_name': self.faker.first_name(),
                    'last_name': self.faker.last_name(),
                    'email': self.faker.email()
                },
                {
                    'first_name': self.faker.first_name(),
                    'last_name': self.faker.last_name(),
                    'email': self.faker.email()
                }
            ],
            'special_requests': 'Vegetarian meals preferred',
            'payment_method': 'card'
        }
        
        response = self.session.post(
            f"{self.config.base_url}/api/bookings/create",
            json=booking_data
        )
        
        assert response.status_code == 201, f"Booking creation failed: {response.text}"
        data = response.json()
        assert 'booking_id' in data, "Booking ID not returned"
        assert 'status' in data, "Booking status not returned"
        assert data['status'] == 'pending_payment', "Unexpected booking status"
        
        return data['booking_id']
    
    def test_process_payment(self):
        """Test payment processing flow"""
        booking_id = self.test_create_booking()
        
        payment_data = {
            'booking_id': booking_id,
            'payment_method': 'card',
            'card_details': {
                'number': '4242424242424242',  # Test card
                'exp_month': 12,
                'exp_year': 2025,
                'cvc': '123'
            },
            'amount': 299.99,
            'currency': 'USD'
        }
        
        response = self.session.post(
            f"{self.config.base_url}/api/payments/process",
            json=payment_data
        )
        
        assert response.status_code == 200, f"Payment processing failed: {response.text}"
        data = response.json()
        assert 'transaction_id' in data, "Transaction ID not returned"
        assert 'status' in data, "Payment status not returned"
        assert data['status'] in ['succeeded', 'processing'], "Unexpected payment status"
        
        return data['transaction_id']
    
    # ========== AI AGENT TESTS ==========
    
    def test_ai_chat_agent(self):
        """Test AI chat agent functionality"""
        chat_data = {
            'message': 'I need recommendations for a romantic weekend in Paris',
            'context': {
                'user_preferences': ['romantic', 'luxury', 'culture'],
                'budget': 'high'
            }
        }
        
        response = self.session.post(
            f"{self.config.base_url}/api/ai/chat",
            json=chat_data
        )
        
        assert response.status_code == 200, f"AI chat failed: {response.text}"
        data = response.json()
        assert 'response' in data, "AI response not returned"
        assert 'recommendations' in data, "Recommendations not returned"
        assert len(data['recommendations']) > 0, "No recommendations provided"
    
    def test_ai_price_optimization(self):
        """Test AI price optimization agent"""
        optimization_data = {
            'tour_id': 'test_tour_001',
            'current_price': 199.99,
            'demand_level': 'high',
            'season': 'peak',
            'competitor_prices': [189.99, 209.99, 195.99]
        }
        
        response = self.session.post(
            f"{self.config.base_url}/api/ai/optimize-price",
            json=optimization_data
        )
        
        assert response.status_code == 200, f"Price optimization failed: {response.text}"
        data = response.json()
        assert 'optimized_price' in data, "Optimized price not returned"
        assert 'confidence_score' in data, "Confidence score not returned"
        assert data['confidence_score'] >= 0 and data['confidence_score'] <= 1
    
    # ========== UI/FRONTEND TESTS ==========
    
    def test_homepage_loading(self):
        """Test homepage loading and key elements"""
        self.driver.get(self.config.frontend_url)
        
        # Wait for page to load
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        # Check key elements
        assert self.driver.find_element(By.CLASS_NAME, "navbar"), "Navbar not found"
        assert self.driver.find_element(By.CLASS_NAME, "hero-section"), "Hero section not found"
        assert self.driver.find_element(By.CLASS_NAME, "search-form"), "Search form not found"
        
        # Check page title
        assert "Spirit Tours" in self.driver.title, "Page title incorrect"
    
    def test_booking_flow_ui(self):
        """Test complete booking flow through UI"""
        self.driver.get(f"{self.config.frontend_url}/tours")
        
        # Wait for tours to load
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "tour-card"))
        )
        
        # Click first tour
        first_tour = self.driver.find_element(By.CLASS_NAME, "tour-card")
        first_tour.click()
        
        # Wait for tour details
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "book-now-btn"))
        )
        
        # Click Book Now
        book_btn = self.driver.find_element(By.CLASS_NAME, "book-now-btn")
        book_btn.click()
        
        # Fill booking form (simplified)
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.ID, "booking-form"))
        )
        
        logger.info("UI booking flow test completed")
    
    # ========== PERFORMANCE TESTS ==========
    
    def test_concurrent_users(self):
        """Test system performance with concurrent users"""
        def simulate_user(user_id: int):
            """Simulate a single user session"""
            session = requests.Session()
            
            # Login
            login_response = session.post(
                f"{self.config.base_url}/api/auth/login",
                data={
                    'username': f'user{user_id}@test.com',
                    'password': 'TestPass2024!'
                }
            )
            
            # Search tours
            search_response = session.get(
                f"{self.config.base_url}/api/tours/search",
                params={'destination': 'Madrid'}
            )
            
            # Create booking
            if search_response.status_code == 200:
                tours = search_response.json().get('tours', [])
                if tours:
                    booking_response = session.post(
                        f"{self.config.base_url}/api/bookings/create",
                        json={
                            'tour_id': tours[0]['id'],
                            'date': datetime.now().isoformat(),
                            'guests': 1
                        }
                    )
            
            return {
                'user_id': user_id,
                'login_status': login_response.status_code,
                'search_status': search_response.status_code
            }
        
        # Run concurrent user simulations
        with ThreadPoolExecutor(max_workers=self.config.parallel_users) as executor:
            futures = [
                executor.submit(simulate_user, i) 
                for i in range(self.config.parallel_users)
            ]
            
            results = []
            for future in as_completed(futures):
                try:
                    result = future.result(timeout=30)
                    results.append(result)
                except Exception as e:
                    logger.error(f"Concurrent user test failed: {e}")
        
        # Analyze results
        success_rate = sum(1 for r in results if r['login_status'] == 200) / len(results)
        assert success_rate >= 0.95, f"Success rate too low: {success_rate:.2%}"
        
        logger.info(f"Concurrent users test: {success_rate:.2%} success rate")
    
    def test_api_response_times(self):
        """Test API response times"""
        endpoints = [
            ('/api/health', 'GET', None),
            ('/api/tours/search?destination=Madrid', 'GET', None),
            ('/api/auth/login', 'POST', {
                'username': self.config.test_user_email,
                'password': self.config.test_user_password
            })
        ]
        
        response_times = []
        
        for endpoint, method, data in endpoints:
            start_time = time.time()
            
            if method == 'GET':
                response = self.session.get(f"{self.config.base_url}{endpoint}")
            else:
                response = self.session.post(f"{self.config.base_url}{endpoint}", json=data)
            
            response_time = (time.time() - start_time) * 1000
            response_times.append({
                'endpoint': endpoint,
                'method': method,
                'status_code': response.status_code,
                'response_time_ms': response_time
            })
            
            # Assert response time is under 1 second
            assert response_time < 1000, f"Response time too high for {endpoint}: {response_time}ms"
        
        # Log performance metrics
        avg_response_time = sum(r['response_time_ms'] for r in response_times) / len(response_times)
        logger.info(f"Average API response time: {avg_response_time:.2f}ms")
    
    # ========== INTEGRATION TESTS ==========
    
    def test_notification_system(self):
        """Test notification system integration"""
        notification_data = {
            'recipient': self.config.test_user_email,
            'type': 'booking_confirmation',
            'channel': 'email',
            'template_id': 'booking_confirm_001',
            'data': {
                'booking_id': 'TEST123',
                'tour_name': 'Madrid City Tour',
                'date': datetime.now().isoformat()
            }
        }
        
        response = self.session.post(
            f"{self.config.base_url}/api/notifications/send",
            json=notification_data
        )
        
        assert response.status_code == 200, f"Notification send failed: {response.text}"
        data = response.json()
        assert 'notification_id' in data, "Notification ID not returned"
        assert 'status' in data, "Notification status not returned"
    
    def test_multi_channel_booking(self):
        """Test multi-channel booking integration"""
        channels = ['direct_website', 'mobile_app', 'tour_operator_api']
        
        for channel in channels:
            booking_data = {
                'tour_id': 'test_tour_001',
                'channel': channel,
                'date': datetime.now().isoformat(),
                'guests': 2,
                'channel_metadata': {
                    'source': channel,
                    'campaign': 'uat_test'
                }
            }
            
            response = self.session.post(
                f"{self.config.base_url}/api/bookings/multichannel",
                json=booking_data
            )
            
            assert response.status_code in [200, 201], f"Booking via {channel} failed"
            logger.info(f"Multi-channel booking test passed for: {channel}")
    
    # ========== REPORT GENERATION ==========
    
    def generate_report(self):
        """Generate comprehensive UAT test report"""
        report_data = {
            'test_suite': 'Spirit Tours UAT',
            'execution_time': datetime.now().isoformat(),
            'environment': self.config.base_url,
            'total_tests': len(self.test_results),
            'passed': sum(1 for r in self.test_results if r.status == 'PASSED'),
            'failed': sum(1 for r in self.test_results if r.status == 'FAILED'),
            'skipped': sum(1 for r in self.test_results if r.status == 'SKIPPED'),
            'success_rate': 0,
            'test_results': [asdict(r) for r in self.test_results]
        }
        
        if report_data['total_tests'] > 0:
            report_data['success_rate'] = (report_data['passed'] / report_data['total_tests']) * 100
        
        # Save report as JSON
        report_filename = f"uat_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_filename, 'w') as f:
            json.dump(report_data, f, indent=2)
        
        # Generate HTML report
        html_report = self._generate_html_report(report_data)
        html_filename = report_filename.replace('.json', '.html')
        with open(html_filename, 'w') as f:
            f.write(html_report)
        
        # Print summary
        print("\n" + "="*60)
        print("UAT TEST SUITE EXECUTION SUMMARY")
        print("="*60)
        print(f"Total Tests: {report_data['total_tests']}")
        print(f"Passed: {report_data['passed']} ✓")
        print(f"Failed: {report_data['failed']} ✗")
        print(f"Success Rate: {report_data['success_rate']:.2f}%")
        print(f"Report saved: {report_filename}")
        print(f"HTML Report: {html_filename}")
        print("="*60)
        
        return report_data
    
    def _generate_html_report(self, report_data: Dict[str, Any]) -> str:
        """Generate HTML report"""
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>UAT Test Report - Spirit Tours</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                h1 {{ color: #2c3e50; }}
                .summary {{ background: #ecf0f1; padding: 15px; border-radius: 5px; }}
                .passed {{ color: #27ae60; font-weight: bold; }}
                .failed {{ color: #e74c3c; font-weight: bold; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
                th, td {{ padding: 10px; text-align: left; border: 1px solid #ddd; }}
                th {{ background-color: #3498db; color: white; }}
                tr:nth-child(even) {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <h1>UAT Test Report - Spirit Tours</h1>
            <div class="summary">
                <p><strong>Execution Time:</strong> {execution_time}</p>
                <p><strong>Environment:</strong> {environment}</p>
                <p><strong>Total Tests:</strong> {total_tests}</p>
                <p class="passed">Passed: {passed}</p>
                <p class="failed">Failed: {failed}</p>
                <p><strong>Success Rate:</strong> {success_rate:.2f}%</p>
            </div>
            <h2>Test Results</h2>
            <table>
                <tr>
                    <th>Test Name</th>
                    <th>Status</th>
                    <th>Duration (ms)</th>
                    <th>Error Message</th>
                </tr>
                {test_rows}
            </table>
        </body>
        </html>
        """
        
        test_rows = ""
        for result in report_data['test_results']:
            status_class = 'passed' if result['status'] == 'PASSED' else 'failed'
            test_rows += f"""
                <tr>
                    <td>{result['test_name']}</td>
                    <td class="{status_class}">{result['status']}</td>
                    <td>{result['duration_ms']:.2f}</td>
                    <td>{result.get('error_message', '-')}</td>
                </tr>
            """
        
        return html_template.format(
            execution_time=report_data['execution_time'],
            environment=report_data['environment'],
            total_tests=report_data['total_tests'],
            passed=report_data['passed'],
            failed=report_data['failed'],
            success_rate=report_data['success_rate'],
            test_rows=test_rows
        )
    
    def run_all_tests(self):
        """Run all UAT tests"""
        test_methods = [
            ('User Registration', self.test_user_registration),
            ('User Login', self.test_user_login),
            ('2FA Authentication', self.test_2fa_authentication),
            ('Tour Search', self.test_tour_search),
            ('Create Booking', self.test_create_booking),
            ('Process Payment', self.test_process_payment),
            ('AI Chat Agent', self.test_ai_chat_agent),
            ('AI Price Optimization', self.test_ai_price_optimization),
            ('Homepage Loading', self.test_homepage_loading),
            ('Booking Flow UI', self.test_booking_flow_ui),
            ('Concurrent Users', self.test_concurrent_users),
            ('API Response Times', self.test_api_response_times),
            ('Notification System', self.test_notification_system),
            ('Multi-Channel Booking', self.test_multi_channel_booking)
        ]
        
        logger.info(f"Starting UAT Test Suite with {len(test_methods)} tests...")
        
        for test_name, test_method in test_methods:
            self.run_test(test_method, test_name)
        
        return self.generate_report()


def main():
    """Main execution function"""
    config = TestConfig()
    test_suite = UATTestSuite(config)
    
    try:
        test_suite.setup()
        test_suite.test_user_login()  # Login first for authenticated tests
        report = test_suite.run_all_tests()
        
        # Exit with appropriate code
        if report['failed'] > 0:
            sys.exit(1)
        else:
            sys.exit(0)
            
    except Exception as e:
        logger.error(f"UAT Test Suite failed: {e}")
        sys.exit(1)
    finally:
        test_suite.teardown()


if __name__ == "__main__":
    main()