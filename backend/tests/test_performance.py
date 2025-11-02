"""
Performance Tests
Spirit Tours Platform
"""

import pytest
import asyncio
import time
import concurrent.futures
from datetime import datetime
from typing import List, Dict
from fastapi.testclient import TestClient
import numpy as np

from main import app
from core.cache_manager import CacheManager
from core.database import get_db

client = TestClient(app)


class TestAPIPerformance:
    """Test API endpoint performance"""
    
    def setup_method(self):
        """Setup performance test fixtures"""
        self.base_url = "/api/v1"
        self.test_user = {
            "email": "perf_test@example.com",
            "password": "PerfTest123!"
        }
        self.cache = CacheManager()
    
    @pytest.mark.performance
    def test_endpoint_response_time(self):
        """Test that key endpoints respond within acceptable time"""
        
        endpoints = [
            ("/tours", "GET", None, 1.0),
            ("/tours/search?destination=Paris", "GET", None, 1.5),
            ("/tours/tour-123", "GET", None, 0.5),
            ("/bookings", "GET", None, 1.0),
        ]
        
        results = []
        
        for endpoint, method, data, max_time in endpoints:
            start_time = time.time()
            
            if method == "GET":
                response = client.get(f"{self.base_url}{endpoint}")
            elif method == "POST":
                response = client.post(f"{self.base_url}{endpoint}", json=data)
            
            elapsed_time = time.time() - start_time
            
            results.append({
                "endpoint": endpoint,
                "method": method,
                "response_time": elapsed_time,
                "status_code": response.status_code,
                "passed": elapsed_time < max_time
            })
            
            # Assert response time is within limit
            assert elapsed_time < max_time, f"{endpoint} took {elapsed_time}s (max: {max_time}s)"
        
        # Print performance report
        self._print_performance_report(results)
    
    @pytest.mark.performance
    def test_concurrent_requests(self):
        """Test system performance under concurrent load"""
        
        num_requests = 100
        num_workers = 10
        
        def make_request(i):
            start_time = time.time()
            response = client.get(f"{self.base_url}/tours")
            return {
                "request_id": i,
                "response_time": time.time() - start_time,
                "status_code": response.status_code
            }
        
        # Execute concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_workers) as executor:
            futures = [executor.submit(make_request, i) for i in range(num_requests)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # Analyze results
        response_times = [r["response_time"] for r in results]
        successful_requests = [r for r in results if r["status_code"] == 200]
        
        avg_response_time = np.mean(response_times)
        p95_response_time = np.percentile(response_times, 95)
        p99_response_time = np.percentile(response_times, 99)
        success_rate = len(successful_requests) / num_requests * 100
        
        # Assertions
        assert avg_response_time < 2.0, f"Average response time too high: {avg_response_time}s"
        assert p95_response_time < 3.0, f"P95 response time too high: {p95_response_time}s"
        assert success_rate >= 95, f"Success rate too low: {success_rate}%"
        
        # Print stats
        print(f"\n=== Concurrent Request Performance ===")
        print(f"Total Requests: {num_requests}")
        print(f"Concurrent Workers: {num_workers}")
        print(f"Average Response Time: {avg_response_time:.3f}s")
        print(f"P95 Response Time: {p95_response_time:.3f}s")
        print(f"P99 Response Time: {p99_response_time:.3f}s")
        print(f"Success Rate: {success_rate:.1f}%")
    
    @pytest.mark.performance
    def test_database_query_performance(self):
        """Test database query performance"""
        
        queries = [
            ("Select all tours", "SELECT * FROM tours LIMIT 100"),
            ("Search tours", "SELECT * FROM tours WHERE destination LIKE '%Paris%'"),
            ("Get user bookings", "SELECT * FROM bookings WHERE user_id = 1"),
            ("Complex join", """
                SELECT t.*, b.*, u.* 
                FROM tours t 
                JOIN bookings b ON t.id = b.tour_id 
                JOIN users u ON b.user_id = u.id 
                LIMIT 10
            """),
        ]
        
        results = []
        db = next(get_db())
        
        for query_name, query in queries:
            start_time = time.time()
            
            try:
                result = db.execute(query)
                row_count = len(result.fetchall()) if result else 0
            except Exception as e:
                row_count = 0
            
            elapsed_time = time.time() - start_time
            
            results.append({
                "query": query_name,
                "time": elapsed_time,
                "rows": row_count
            })
            
            # Assert query time is reasonable
            assert elapsed_time < 0.5, f"Query '{query_name}' took {elapsed_time}s"
        
        # Print query performance
        print("\n=== Database Query Performance ===")
        for r in results:
            print(f"{r['query']}: {r['time']:.3f}s ({r['rows']} rows)")
    
    @pytest.mark.performance
    def test_cache_performance(self):
        """Test cache system performance"""
        
        # Test data
        test_key = "perf_test_key"
        test_data = {"data": "x" * 1000}  # 1KB of data
        
        # Test cache write performance
        write_times = []
        for i in range(100):
            start_time = time.time()
            self.cache.set(f"{test_key}_{i}", test_data, ttl=60)
            write_times.append(time.time() - start_time)
        
        # Test cache read performance
        read_times = []
        for i in range(100):
            start_time = time.time()
            self.cache.get(f"{test_key}_{i}")
            read_times.append(time.time() - start_time)
        
        # Calculate metrics
        avg_write_time = np.mean(write_times) * 1000  # Convert to ms
        avg_read_time = np.mean(read_times) * 1000
        
        # Assertions
        assert avg_write_time < 10, f"Cache write too slow: {avg_write_time:.2f}ms"
        assert avg_read_time < 5, f"Cache read too slow: {avg_read_time:.2f}ms"
        
        print(f"\n=== Cache Performance ===")
        print(f"Average Write Time: {avg_write_time:.2f}ms")
        print(f"Average Read Time: {avg_read_time:.2f}ms")
        
        # Cleanup
        for i in range(100):
            self.cache.delete(f"{test_key}_{i}")
    
    @pytest.mark.performance
    def test_search_performance(self):
        """Test search functionality performance"""
        
        search_queries = [
            {"destination": "Paris", "date": "2025-06-01"},
            {"destination": "London", "participants": 4},
            {"price_min": 100, "price_max": 500},
            {"duration": 3, "category": "adventure"},
        ]
        
        results = []
        
        for query in search_queries:
            start_time = time.time()
            response = client.get(f"{self.base_url}/tours/search", params=query)
            elapsed_time = time.time() - start_time
            
            results.append({
                "query": query,
                "time": elapsed_time,
                "status": response.status_code
            })
            
            # Assert search is fast enough
            assert elapsed_time < 2.0, f"Search took {elapsed_time}s"
        
        # Print search performance
        print("\n=== Search Performance ===")
        for r in results:
            print(f"Query {r['query']}: {r['time']:.3f}s")
    
    @pytest.mark.performance
    def test_load_test_booking_creation(self):
        """Load test booking creation endpoint"""
        
        num_bookings = 50
        booking_times = []
        successful = 0
        
        for i in range(num_bookings):
            booking_data = {
                "tour_id": f"tour-{i % 10}",  # Rotate through 10 tours
                "start_date": "2025-06-01",
                "participants": 2,
                "customer_email": f"user{i}@example.com"
            }
            
            start_time = time.time()
            response = client.post(f"{self.base_url}/bookings", json=booking_data)
            booking_times.append(time.time() - start_time)
            
            if response.status_code in [200, 201]:
                successful += 1
        
        # Calculate metrics
        avg_time = np.mean(booking_times)
        max_time = np.max(booking_times)
        success_rate = successful / num_bookings * 100
        
        print(f"\n=== Booking Creation Load Test ===")
        print(f"Total Bookings: {num_bookings}")
        print(f"Average Time: {avg_time:.3f}s")
        print(f"Max Time: {max_time:.3f}s")
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Assertions
        assert avg_time < 1.0, f"Average booking time too high: {avg_time}s"
        assert max_time < 3.0, f"Max booking time too high: {max_time}s"
    
    @pytest.mark.performance
    def test_memory_usage(self):
        """Test memory usage doesn't grow excessively"""
        
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        
        # Get initial memory
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Perform operations that might leak memory
        for i in range(1000):
            client.get(f"{self.base_url}/tours")
            if i % 100 == 0:
                current_memory = process.memory_info().rss / 1024 / 1024
                memory_growth = current_memory - initial_memory
                print(f"Memory after {i} requests: {current_memory:.1f}MB (growth: {memory_growth:.1f}MB)")
        
        # Final memory check
        final_memory = process.memory_info().rss / 1024 / 1024
        memory_growth = final_memory - initial_memory
        
        print(f"\n=== Memory Usage ===")
        print(f"Initial: {initial_memory:.1f}MB")
        print(f"Final: {final_memory:.1f}MB")
        print(f"Growth: {memory_growth:.1f}MB")
        
        # Assert memory growth is reasonable
        assert memory_growth < 100, f"Memory grew too much: {memory_growth}MB"
    
    def _print_performance_report(self, results: List[Dict]):
        """Print a formatted performance report"""
        
        print("\n" + "="*60)
        print("PERFORMANCE TEST REPORT")
        print("="*60)
        
        for result in results:
            status = "✓" if result.get("passed", False) else "✗"
            print(f"{status} {result['endpoint']} ({result['method']})")
            print(f"  Response Time: {result['response_time']:.3f}s")
            print(f"  Status Code: {result['status_code']}")
        
        print("="*60)


class TestScalabilityTests:
    """Test system scalability"""
    
    @pytest.mark.performance
    @pytest.mark.slow
    def test_sustained_load(self):
        """Test system under sustained load for extended period"""
        
        duration_seconds = 60  # Run for 1 minute
        requests_per_second = 10
        
        start_time = time.time()
        request_times = []
        errors = 0
        
        while time.time() - start_time < duration_seconds:
            request_start = time.time()
            
            try:
                response = client.get("/api/v1/tours")
                if response.status_code != 200:
                    errors += 1
            except Exception:
                errors += 1
            
            request_times.append(time.time() - request_start)
            
            # Sleep to maintain request rate
            sleep_time = max(0, (1.0 / requests_per_second) - (time.time() - request_start))
            time.sleep(sleep_time)
        
        # Calculate statistics
        total_requests = len(request_times)
        avg_response_time = np.mean(request_times)
        p95_response_time = np.percentile(request_times, 95)
        error_rate = errors / total_requests * 100
        
        print(f"\n=== Sustained Load Test Results ===")
        print(f"Duration: {duration_seconds}s")
        print(f"Target RPS: {requests_per_second}")
        print(f"Total Requests: {total_requests}")
        print(f"Average Response Time: {avg_response_time:.3f}s")
        print(f"P95 Response Time: {p95_response_time:.3f}s")
        print(f"Error Rate: {error_rate:.2f}%")
        
        # Assertions
        assert avg_response_time < 1.0
        assert p95_response_time < 2.0
        assert error_rate < 5.0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "performance"])