"""
Performance Tests
Load testing for critical endpoints
"""

import pytest
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

class TestPerformance:
    """Performance and load tests"""
    
    def test_concurrent_requests(self):
        """Test handling concurrent requests"""
        def make_request():
            start = time.time()
            response = client.get("/")
            duration = time.time() - start
            return response.status_code, duration
        
        # Execute 100 concurrent requests
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(make_request) for _ in range(100)]
            results = [f.result() for f in as_completed(futures)]
        
        # Check results
        success_count = sum(1 for status, _ in results if status == 200)
        avg_duration = sum(d for _, d in results) / len(results)
        
        assert success_count >= 95  # 95% success rate
        assert avg_duration < 1.0  # Average under 1 second
    
    def test_search_performance(self):
        """Test search endpoint performance"""
        start = time.time()
        response = client.get("/api/tours/search?destination=Paris")
        duration = time.time() - start
        
        assert response.status_code == 200
        assert duration < 2.0  # Should respond within 2 seconds
    
    def test_cache_performance(self):
        """Test cache effectiveness"""
        # First request (cache miss)
        start1 = time.time()
        response1 = client.get("/api/tours/featured")
        duration1 = time.time() - start1
        
        # Second request (cache hit)
        start2 = time.time()
        response2 = client.get("/api/tours/featured")
        duration2 = time.time() - start2
        
        # Cached request should be faster
        assert duration2 < duration1
        assert duration2 < 0.1  # Cached response under 100ms
