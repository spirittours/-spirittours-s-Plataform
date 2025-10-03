"""
Performance Tests para Spirit Tours Platform
Tests de rendimiento, carga y stress para APIs y servicios críticos.
"""
import pytest
import asyncio
import time
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
import json
import random

import httpx
import aiohttp
import psutil
import matplotlib.pyplot as plt
import numpy as np

from backend.core.config import settings


@dataclass
class PerformanceMetrics:
    """Métricas de rendimiento"""
    response_times: List[float]
    success_count: int
    error_count: int
    throughput: float  # requests per second
    avg_response_time: float
    p95_response_time: float
    p99_response_time: float
    memory_usage: float
    cpu_usage: float


@dataclass
class LoadTestConfig:
    """Configuración para tests de carga"""
    concurrent_users: int
    requests_per_user: int
    duration_seconds: int
    ramp_up_seconds: int
    endpoint_url: str
    request_data: Dict[str, Any]
    headers: Dict[str, str]


class PerformanceTestRunner:
    """Runner para tests de performance"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results: List[PerformanceMetrics] = []
    
    async def measure_endpoint_performance(
        self, 
        endpoint: str, 
        method: str = "GET",
        data: Dict = None,
        headers: Dict = None,
        num_requests: int = 100,
        concurrent_requests: int = 10
    ) -> PerformanceMetrics:
        """
        Medir performance de un endpoint específico
        """
        response_times = []
        success_count = 0
        error_count = 0
        start_time = time.time()
        
        # Monitor system resources
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        async with aiohttp.ClientSession() as session:
            semaphore = asyncio.Semaphore(concurrent_requests)
            
            async def make_request():
                async with semaphore:
                    request_start = time.time()
                    try:
                        url = f"{self.base_url}{endpoint}"
                        
                        if method.upper() == "GET":
                            async with session.get(url, headers=headers) as response:
                                await response.text()
                                if response.status < 400:
                                    return time.time() - request_start, True
                                else:
                                    return time.time() - request_start, False
                        elif method.upper() == "POST":
                            async with session.post(url, json=data, headers=headers) as response:
                                await response.text()
                                if response.status < 400:
                                    return time.time() - request_start, True
                                else:
                                    return time.time() - request_start, False
                    except Exception:
                        return time.time() - request_start, False
            
            # Execute requests
            tasks = [make_request() for _ in range(num_requests)]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in results:
                if isinstance(result, Exception):
                    error_count += 1
                    response_times.append(5.0)  # Timeout assumption
                else:
                    response_time, success = result
                    response_times.append(response_time)
                    if success:
                        success_count += 1
                    else:
                        error_count += 1
        
        # Calculate metrics
        end_time = time.time()
        duration = end_time - start_time
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        return PerformanceMetrics(
            response_times=response_times,
            success_count=success_count,
            error_count=error_count,
            throughput=num_requests / duration if duration > 0 else 0,
            avg_response_time=statistics.mean(response_times) if response_times else 0,
            p95_response_time=np.percentile(response_times, 95) if response_times else 0,
            p99_response_time=np.percentile(response_times, 99) if response_times else 0,
            memory_usage=final_memory - initial_memory,
            cpu_usage=psutil.cpu_percent(interval=1)
        )
    
    def generate_performance_report(self, metrics: PerformanceMetrics, test_name: str) -> Dict:
        """Generar reporte de performance"""
        return {
            "test_name": test_name,
            "timestamp": datetime.now().isoformat(),
            "metrics": {
                "total_requests": len(metrics.response_times),
                "successful_requests": metrics.success_count,
                "failed_requests": metrics.error_count,
                "success_rate": (metrics.success_count / len(metrics.response_times)) * 100 if metrics.response_times else 0,
                "throughput_rps": metrics.throughput,
                "avg_response_time_ms": metrics.avg_response_time * 1000,
                "p95_response_time_ms": metrics.p95_response_time * 1000,
                "p99_response_time_ms": metrics.p99_response_time * 1000,
                "memory_usage_mb": metrics.memory_usage,
                "cpu_usage_percent": metrics.cpu_usage
            },
            "performance_grade": self._calculate_performance_grade(metrics)
        }
    
    def _calculate_performance_grade(self, metrics: PerformanceMetrics) -> str:
        """Calcular grade de performance basado en métricas"""
        score = 0
        
        # Success rate (40% del score)
        success_rate = (metrics.success_count / len(metrics.response_times)) * 100 if metrics.response_times else 0
        if success_rate >= 99:
            score += 40
        elif success_rate >= 95:
            score += 30
        elif success_rate >= 90:
            score += 20
        else:
            score += 10
        
        # Response time (40% del score)
        avg_ms = metrics.avg_response_time * 1000
        if avg_ms <= 100:
            score += 40
        elif avg_ms <= 500:
            score += 30
        elif avg_ms <= 1000:
            score += 20
        else:
            score += 10
        
        # Throughput (20% del score)
        if metrics.throughput >= 1000:
            score += 20
        elif metrics.throughput >= 500:
            score += 15
        elif metrics.throughput >= 100:
            score += 10
        else:
            score += 5
        
        # Convert to grade
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"


@pytest.fixture
def performance_runner():
    """Fixture para performance test runner"""
    return PerformanceTestRunner()


class TestAPIPerformance:
    """Tests de performance para APIs principales"""
    
    @pytest.mark.asyncio
    @pytest.mark.performance
    async def test_tours_search_performance(self, performance_runner: PerformanceTestRunner):
        """Test de performance para búsqueda de tours"""
        
        # Configurar datos de prueba
        search_params = {
            "location": "Sedona",
            "date_from": (datetime.now() + timedelta(days=7)).isoformat(),
            "date_to": (datetime.now() + timedelta(days=14)).isoformat(),
            "participants": 2,
            "max_price": 500
        }
        
        # Ejecutar test de performance
        metrics = await performance_runner.measure_endpoint_performance(
            endpoint="/api/tours/search",
            method="GET",
            data=search_params,
            num_requests=500,
            concurrent_requests=50
        )
        
        # Generar reporte
        report = performance_runner.generate_performance_report(metrics, "Tours Search API")
        
        # Assertions de performance
        assert metrics.success_count / len(metrics.response_times) >= 0.95, "Success rate below 95%"
        assert metrics.avg_response_time <= 2.0, f"Avg response time too high: {metrics.avg_response_time}s"
        assert metrics.p95_response_time <= 5.0, f"P95 response time too high: {metrics.p95_response_time}s"
        assert metrics.throughput >= 50, f"Throughput too low: {metrics.throughput} rps"
        
        print(f"Performance Report: {json.dumps(report, indent=2)}")
    
    @pytest.mark.asyncio
    @pytest.mark.performance
    async def test_reservation_creation_performance(self, performance_runner: PerformanceTestRunner):
        """Test de performance para creación de reservas"""
        
        # Primero crear un tour de prueba
        tour_data = {
            "title": "Performance Test Tour",
            "description": "Tour for performance testing",
            "duration_hours": 2,
            "max_participants": 100,
            "price_per_person": 99.99,
            "location": "Test Location"
        }
        
        async with httpx.AsyncClient(base_url=performance_runner.base_url) as client:
            tour_response = await client.post("/api/tours", json=tour_data)
            tour_id = tour_response.json()["id"]
        
        # Datos de reserva para tests
        reservation_data = {
            "tour_id": tour_id,
            "tour_date": (datetime.now() + timedelta(days=10)).isoformat(),
            "participants": 2,
            "customer_data": {
                "first_name": "Test",
                "last_name": "Customer",
                "email": f"test.perf.{random.randint(1000, 9999)}@test.com",
                "phone": "+1-555-0100"
            }
        }
        
        # Ejecutar test de performance
        metrics = await performance_runner.measure_endpoint_performance(
            endpoint="/api/reservations",
            method="POST",
            data=reservation_data,
            num_requests=200,
            concurrent_requests=20
        )
        
        report = performance_runner.generate_performance_report(metrics, "Reservation Creation API")
        
        # Assertions específicas para creación de reservas
        assert metrics.success_count / len(metrics.response_times) >= 0.90, "Success rate below 90%"
        assert metrics.avg_response_time <= 3.0, f"Avg response time too high: {metrics.avg_response_time}s"
        assert metrics.throughput >= 20, f"Throughput too low: {metrics.throughput} rps"
        
        print(f"Reservation Performance Report: {json.dumps(report, indent=2)}")
    
    @pytest.mark.asyncio
    @pytest.mark.performance
    async def test_analytics_dashboard_performance(self, performance_runner: PerformanceTestRunner):
        """Test de performance para dashboard de analytics"""
        
        metrics = await performance_runner.measure_endpoint_performance(
            endpoint="/api/analytics/dashboard/metrics",
            method="GET",
            num_requests=300,
            concurrent_requests=30
        )
        
        report = performance_runner.generate_performance_report(metrics, "Analytics Dashboard API")
        
        # Analytics debe ser muy rápido debido a caching
        assert metrics.success_count / len(metrics.response_times) >= 0.98, "Success rate below 98%"
        assert metrics.avg_response_time <= 1.0, f"Avg response time too high: {metrics.avg_response_time}s"
        assert metrics.throughput >= 100, f"Throughput too low: {metrics.throughput} rps"
        
        print(f"Analytics Performance Report: {json.dumps(report, indent=2)}")


class TestDatabasePerformance:
    """Tests de performance para operaciones de base de datos"""
    
    @pytest.mark.asyncio
    @pytest.mark.performance
    async def test_database_query_performance(self, performance_runner: PerformanceTestRunner):
        """Test de performance para queries complejas de base de datos"""
        
        # Test query compleja que une múltiples tablas
        complex_query_data = {
            "query_type": "reservation_summary",
            "parameters": {
                "date_from": (datetime.now() - timedelta(days=30)).isoformat(),
                "date_to": datetime.now().isoformat(),
                "include_customer_data": True,
                "include_payment_data": True,
                "include_tour_data": True
            }
        }
        
        metrics = await performance_runner.measure_endpoint_performance(
            endpoint="/api/analytics/reports/query",
            method="POST",
            data=complex_query_data,
            num_requests=100,
            concurrent_requests=10
        )
        
        report = performance_runner.generate_performance_report(metrics, "Database Complex Query")
        
        # Queries complejas pueden ser más lentas pero deben ser consistentes
        assert metrics.success_count / len(metrics.response_times) >= 0.95, "Success rate below 95%"
        assert metrics.avg_response_time <= 5.0, f"Avg response time too high: {metrics.avg_response_time}s"
        assert metrics.p99_response_time <= 15.0, f"P99 response time too high: {metrics.p99_response_time}s"
        
        print(f"Database Performance Report: {json.dumps(report, indent=2)}")


class TestStressTest:
    """Tests de stress para identificar puntos de falla"""
    
    @pytest.mark.asyncio
    @pytest.mark.stress
    async def test_api_stress_increasing_load(self, performance_runner: PerformanceTestRunner):
        """Test de stress con carga incremental"""
        
        stress_results = []
        load_levels = [10, 25, 50, 100, 200, 500]  # Concurrent users
        
        for concurrent_users in load_levels:
            print(f"Testing with {concurrent_users} concurrent users...")
            
            metrics = await performance_runner.measure_endpoint_performance(
                endpoint="/api/tours/search",
                method="GET",
                num_requests=concurrent_users * 5,
                concurrent_requests=concurrent_users
            )
            
            result = {
                "concurrent_users": concurrent_users,
                "success_rate": (metrics.success_count / len(metrics.response_times)) * 100,
                "avg_response_time": metrics.avg_response_time,
                "throughput": metrics.throughput,
                "memory_usage": metrics.memory_usage
            }
            stress_results.append(result)
            
            # Pausa entre tests para recuperación del sistema
            await asyncio.sleep(2)
            
            # Condición de falla para detener el test
            if result["success_rate"] < 50:
                print(f"System failure detected at {concurrent_users} concurrent users")
                break
        
        # Análisis de resultados
        print("\nStress Test Results:")
        for result in stress_results:
            print(f"Users: {result['concurrent_users']}, "
                  f"Success Rate: {result['success_rate']:.2f}%, "
                  f"Avg Response: {result['avg_response_time']:.3f}s, "
                  f"Throughput: {result['throughput']:.1f} rps")
        
        # Encontrar punto de degradación
        degradation_point = None
        for i, result in enumerate(stress_results):
            if result["success_rate"] < 95 or result["avg_response_time"] > 2.0:
                degradation_point = result["concurrent_users"]
                break
        
        if degradation_point:
            print(f"Performance degradation starts at {degradation_point} concurrent users")
        else:
            print("No performance degradation detected within test limits")
        
        # Al menos debe soportar 50 usuarios concurrentes sin degradación significativa
        assert len([r for r in stress_results if r["concurrent_users"] <= 50 and r["success_rate"] >= 95]) > 0, \
            "System cannot handle 50 concurrent users with 95% success rate"


class TestMemoryAndResourceUsage:
    """Tests de uso de memoria y recursos del sistema"""
    
    @pytest.mark.asyncio
    @pytest.mark.performance
    async def test_memory_leak_detection(self, performance_runner: PerformanceTestRunner):
        """Test para detectar memory leaks durante operaciones prolongadas"""
        
        memory_measurements = []
        process = psutil.Process()
        
        # Baseline memory
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_measurements.append(initial_memory)
        
        # Ejecutar múltiples ciclos de requests
        for cycle in range(10):
            print(f"Memory test cycle {cycle + 1}/10")
            
            # Ejecutar requests
            await performance_runner.measure_endpoint_performance(
                endpoint="/api/analytics/dashboard/metrics",
                method="GET",
                num_requests=100,
                concurrent_requests=20
            )
            
            # Medir memoria después del ciclo
            current_memory = process.memory_info().rss / 1024 / 1024  # MB
            memory_measurements.append(current_memory)
            
            # Pausa para garbage collection
            await asyncio.sleep(1)
        
        # Análisis de memoria
        memory_growth = memory_measurements[-1] - memory_measurements[0]
        avg_growth_per_cycle = memory_growth / 10
        
        print(f"Initial Memory: {initial_memory:.2f} MB")
        print(f"Final Memory: {memory_measurements[-1]:.2f} MB")
        print(f"Total Growth: {memory_growth:.2f} MB")
        print(f"Avg Growth per Cycle: {avg_growth_per_cycle:.2f} MB")
        
        # Memory leak detection
        # Crecimiento de más de 50MB total o 10MB promedio por ciclo indica posible leak
        assert memory_growth < 50, f"Possible memory leak detected: {memory_growth:.2f} MB growth"
        assert avg_growth_per_cycle < 10, f"High memory growth per cycle: {avg_growth_per_cycle:.2f} MB"
    
    @pytest.mark.asyncio
    @pytest.mark.performance
    async def test_cpu_usage_under_load(self, performance_runner: PerformanceTestRunner):
        """Test de uso de CPU bajo carga sostenida"""
        
        cpu_measurements = []
        
        # Monitor CPU during load test
        async def monitor_cpu():
            for _ in range(30):  # Monitor for 30 seconds
                cpu_percent = psutil.cpu_percent(interval=1)
                cpu_measurements.append(cpu_percent)
        
        # Start CPU monitoring
        monitor_task = asyncio.create_task(monitor_cpu())
        
        # Generate load
        load_tasks = []
        for _ in range(5):  # 5 concurrent load generators
            task = asyncio.create_task(
                performance_runner.measure_endpoint_performance(
                    endpoint="/api/tours/search",
                    method="GET",
                    num_requests=200,
                    concurrent_requests=40
                )
            )
            load_tasks.append(task)
        
        # Wait for both monitoring and load generation
        await asyncio.gather(monitor_task, *load_tasks)
        
        # Analyze CPU usage
        if cpu_measurements:
            avg_cpu = statistics.mean(cpu_measurements)
            max_cpu = max(cpu_measurements)
            
            print(f"Average CPU Usage: {avg_cpu:.2f}%")
            print(f"Maximum CPU Usage: {max_cpu:.2f}%")
            
            # CPU usage should not consistently exceed 80%
            high_cpu_count = len([c for c in cpu_measurements if c > 80])
            high_cpu_ratio = high_cpu_count / len(cpu_measurements)
            
            assert high_cpu_ratio < 0.5, f"CPU usage too high: {high_cpu_ratio:.2%} of time above 80%"
            assert max_cpu < 95, f"Peak CPU usage too high: {max_cpu:.2f}%"


if __name__ == "__main__":
    # Ejecutar performance tests
    pytest.main([__file__, "-v", "-m", "performance"])