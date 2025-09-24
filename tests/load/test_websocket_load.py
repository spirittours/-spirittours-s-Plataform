"""
Load Tests para WebSocket y ML Models - Spirit Tours Platform
Tests de carga específicos para conexiones WebSocket en tiempo real y modelos ML.
"""
import pytest
import asyncio
import websockets
import json
import time
import statistics
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor
import random
import numpy as np

import aiohttp
import psutil


@dataclass
class WebSocketMetrics:
    """Métricas para conexiones WebSocket"""
    connection_count: int
    successful_connections: int
    failed_connections: int
    messages_sent: int
    messages_received: int
    avg_latency: float
    connection_duration: float
    throughput_msgs_per_sec: float
    memory_usage: float
    cpu_usage: float


@dataclass
class MLModelMetrics:
    """Métricas para modelos ML"""
    predictions_made: int
    successful_predictions: int
    failed_predictions: int
    avg_prediction_time: float
    p95_prediction_time: float
    model_accuracy: float
    memory_usage_mb: float
    cpu_usage_percent: float


class WebSocketLoadTester:
    """Load tester para conexiones WebSocket"""
    
    def __init__(self, websocket_url: str = "ws://localhost:8000"):
        self.websocket_url = websocket_url
        self.active_connections: List[websockets.WebSocketServerProtocol] = []
        self.metrics: List[WebSocketMetrics] = []
    
    async def simulate_single_client(
        self,
        client_id: int,
        duration_seconds: int = 60,
        message_interval: float = 1.0
    ) -> Dict[str, Any]:
        """
        Simular un cliente WebSocket individual
        """
        connection_start = time.time()
        messages_sent = 0
        messages_received = 0
        latencies = []
        connection_successful = False
        
        try:
            # Intentar conectar al WebSocket de analytics dashboard
            ws_url = f"{self.websocket_url}/api/analytics/dashboard/realtime"
            
            async with websockets.connect(ws_url) as websocket:
                connection_successful = True
                print(f"Client {client_id} connected successfully")
                
                # Recibir mensaje inicial
                try:
                    initial_msg = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    messages_received += 1
                except asyncio.TimeoutError:
                    pass
                
                end_time = connection_start + duration_seconds
                
                while time.time() < end_time:
                    try:
                        # Simular solicitud de métricas específicas
                        request_msg = {
                            "action": "request_metrics",
                            "client_id": client_id,
                            "timestamp": time.time(),
                            "metrics_types": ["revenue", "reservations", "system_health"]
                        }
                        
                        send_time = time.time()
                        await websocket.send(json.dumps(request_msg))
                        messages_sent += 1
                        
                        # Esperar respuesta
                        try:
                            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                            receive_time = time.time()
                            
                            latencies.append(receive_time - send_time)
                            messages_received += 1
                            
                            # Verificar que la respuesta sea válida
                            response_data = json.loads(response)
                            if "metrics" not in response_data:
                                print(f"Client {client_id}: Invalid response format")
                                
                        except asyncio.TimeoutError:
                            print(f"Client {client_id}: Timeout waiting for response")
                        except json.JSONDecodeError:
                            print(f"Client {client_id}: Invalid JSON response")
                        
                        # Esperar antes del siguiente mensaje
                        await asyncio.sleep(message_interval)
                        
                    except websockets.exceptions.ConnectionClosed:
                        print(f"Client {client_id}: Connection closed by server")
                        break
                    except Exception as e:
                        print(f"Client {client_id}: Error during communication: {e}")
                        break
        
        except Exception as e:
            print(f"Client {client_id}: Failed to connect: {e}")
            connection_successful = False
        
        connection_end = time.time()
        
        return {
            "client_id": client_id,
            "connection_successful": connection_successful,
            "messages_sent": messages_sent,
            "messages_received": messages_received,
            "connection_duration": connection_end - connection_start,
            "avg_latency": statistics.mean(latencies) if latencies else 0,
            "latencies": latencies
        }
    
    async def run_load_test(
        self,
        concurrent_clients: int = 10,
        test_duration: int = 60,
        message_interval: float = 2.0
    ) -> WebSocketMetrics:
        """
        Ejecutar test de carga con múltiples clientes WebSocket concurrentes
        """
        print(f"Starting WebSocket load test: {concurrent_clients} clients for {test_duration}s")
        
        # Monitor system resources
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        start_time = time.time()
        
        # Crear tasks para todos los clientes
        client_tasks = []
        for client_id in range(concurrent_clients):
            task = asyncio.create_task(
                self.simulate_single_client(
                    client_id=client_id,
                    duration_seconds=test_duration,
                    message_interval=message_interval
                )
            )
            client_tasks.append(task)
        
        # Ejecutar todos los clientes concurrentemente
        client_results = await asyncio.gather(*client_tasks, return_exceptions=True)
        
        # Procesar resultados
        successful_connections = 0
        failed_connections = 0
        total_messages_sent = 0
        total_messages_received = 0
        all_latencies = []
        
        for result in client_results:
            if isinstance(result, Exception):
                failed_connections += 1
                print(f"Client task failed: {result}")
            else:
                if result["connection_successful"]:
                    successful_connections += 1
                else:
                    failed_connections += 1
                
                total_messages_sent += result["messages_sent"]
                total_messages_received += result["messages_received"]
                all_latencies.extend(result["latencies"])
        
        # Calculate final metrics
        end_time = time.time()
        test_duration_actual = end_time - start_time
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        metrics = WebSocketMetrics(
            connection_count=concurrent_clients,
            successful_connections=successful_connections,
            failed_connections=failed_connections,
            messages_sent=total_messages_sent,
            messages_received=total_messages_received,
            avg_latency=statistics.mean(all_latencies) if all_latencies else 0,
            connection_duration=test_duration_actual,
            throughput_msgs_per_sec=total_messages_received / test_duration_actual if test_duration_actual > 0 else 0,
            memory_usage=final_memory - initial_memory,
            cpu_usage=psutil.cpu_percent(interval=1)
        )
        
        return metrics


class MLModelLoadTester:
    """Load tester para modelos de Machine Learning"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def test_revenue_prediction_load(
        self,
        concurrent_requests: int = 10,
        total_requests: int = 100
    ) -> MLModelMetrics:
        """
        Test de carga para predicción de ingresos
        """
        print(f"Testing revenue prediction with {concurrent_requests} concurrent requests")
        
        # Datos históricos simulados para predicción
        historical_data = []
        base_date = datetime.now() - timedelta(days=90)
        
        for i in range(90):
            date = base_date + timedelta(days=i)
            revenue = 1000 + (i * 10) + random.uniform(-100, 100)
            historical_data.append({
                "date": date.isoformat(),
                "revenue": revenue,
                "reservations": max(1, int(revenue / 100)),
                "customers": max(1, int(revenue / 150))
            })
        
        request_data = {
            "prediction_type": "revenue_forecast",
            "parameters": {
                "forecast_days": 30,
                "confidence_interval": 0.95
            },
            "historical_data": historical_data
        }
        
        return await self._run_ml_load_test(
            endpoint="/api/analytics/predictions",
            request_data=request_data,
            concurrent_requests=concurrent_requests,
            total_requests=total_requests,
            test_name="Revenue Prediction"
        )
    
    async def test_churn_prediction_load(
        self,
        concurrent_requests: int = 5,
        total_requests: int = 50
    ) -> MLModelMetrics:
        """
        Test de carga para predicción de churn
        """
        print(f"Testing churn prediction with {concurrent_requests} concurrent requests")
        
        # Datos de clientes simulados
        customer_data = []
        for i in range(100):
            customer_data.append({
                "customer_id": f"cust_{i}",
                "total_bookings": random.randint(1, 20),
                "total_spent": random.uniform(100, 5000),
                "days_since_last_booking": random.randint(0, 365),
                "avg_booking_value": random.uniform(50, 500),
                "preferred_tour_type": random.choice(["adventure", "cultural", "spiritual", "scenic"]),
                "communication_score": random.uniform(0, 1),
                "satisfaction_score": random.uniform(0, 5)
            })
        
        request_data = {
            "prediction_type": "customer_churn",
            "parameters": {
                "prediction_horizon_days": 30,
                "threshold": 0.5
            },
            "customer_data": customer_data
        }
        
        return await self._run_ml_load_test(
            endpoint="/api/analytics/predictions",
            request_data=request_data,
            concurrent_requests=concurrent_requests,
            total_requests=total_requests,
            test_name="Churn Prediction"
        )
    
    async def test_price_optimization_load(
        self,
        concurrent_requests: int = 8,
        total_requests: int = 80
    ) -> MLModelMetrics:
        """
        Test de carga para optimización de precios
        """
        print(f"Testing price optimization with {concurrent_requests} concurrent requests")
        
        request_data = {
            "prediction_type": "price_optimization",
            "parameters": {
                "tour_id": "test_tour_123",
                "current_price": 150.0,
                "date_range": {
                    "start_date": (datetime.now() + timedelta(days=7)).isoformat(),
                    "end_date": (datetime.now() + timedelta(days=37)).isoformat()
                },
                "optimization_goal": "revenue_maximization"
            }
        }
        
        return await self._run_ml_load_test(
            endpoint="/api/analytics/predictions",
            request_data=request_data,
            concurrent_requests=concurrent_requests,
            total_requests=total_requests,
            test_name="Price Optimization"
        )
    
    async def _run_ml_load_test(
        self,
        endpoint: str,
        request_data: Dict[str, Any],
        concurrent_requests: int,
        total_requests: int,
        test_name: str
    ) -> MLModelMetrics:
        """
        Ejecutar test de carga genérico para modelo ML
        """
        # Monitor system resources
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        prediction_times = []
        successful_predictions = 0
        failed_predictions = 0
        start_time = time.time()
        
        semaphore = asyncio.Semaphore(concurrent_requests)
        
        async def make_prediction_request():
            async with semaphore:
                request_start = time.time()
                try:
                    url = f"{self.base_url}{endpoint}"
                    async with self.session.post(url, json=request_data) as response:
                        await response.json()
                        request_time = time.time() - request_start
                        
                        if response.status == 201:
                            prediction_times.append(request_time)
                            return True, request_time
                        else:
                            return False, request_time
                except Exception as e:
                    request_time = time.time() - request_start
                    print(f"Prediction request failed: {e}")
                    return False, request_time
        
        # Ejecutar requests
        tasks = [make_prediction_request() for _ in range(total_requests)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Procesar resultados
        for result in results:
            if isinstance(result, Exception):
                failed_predictions += 1
                prediction_times.append(10.0)  # Timeout assumption
            else:
                success, pred_time = result
                if success:
                    successful_predictions += 1
                else:
                    failed_predictions += 1
        
        # Calculate metrics
        end_time = time.time()
        test_duration = end_time - start_time
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        metrics = MLModelMetrics(
            predictions_made=total_requests,
            successful_predictions=successful_predictions,
            failed_predictions=failed_predictions,
            avg_prediction_time=statistics.mean(prediction_times) if prediction_times else 0,
            p95_prediction_time=np.percentile(prediction_times, 95) if prediction_times else 0,
            model_accuracy=successful_predictions / total_requests if total_requests > 0 else 0,
            memory_usage_mb=final_memory - initial_memory,
            cpu_usage_percent=psutil.cpu_percent(interval=1)
        )
        
        print(f"{test_name} Load Test Results:")
        print(f"  Successful Predictions: {successful_predictions}/{total_requests}")
        print(f"  Success Rate: {metrics.model_accuracy:.2%}")
        print(f"  Avg Prediction Time: {metrics.avg_prediction_time:.3f}s")
        print(f"  P95 Prediction Time: {metrics.p95_prediction_time:.3f}s")
        print(f"  Memory Usage: {metrics.memory_usage_mb:.2f} MB")
        
        return metrics


class TestWebSocketLoad:
    """Tests de carga para conexiones WebSocket"""
    
    @pytest.mark.asyncio
    @pytest.mark.load
    async def test_websocket_concurrent_connections(self):
        """
        Test de carga con conexiones WebSocket concurrentes
        """
        tester = WebSocketLoadTester()
        
        # Test con diferentes niveles de carga
        load_levels = [5, 10, 20, 30]
        
        for concurrent_clients in load_levels:
            print(f"\nTesting {concurrent_clients} concurrent WebSocket clients...")
            
            try:
                metrics = await tester.run_load_test(
                    concurrent_clients=concurrent_clients,
                    test_duration=30,  # 30 seconds per test
                    message_interval=2.0
                )
                
                print(f"Results for {concurrent_clients} clients:")
                print(f"  Successful Connections: {metrics.successful_connections}/{metrics.connection_count}")
                print(f"  Messages Sent: {metrics.messages_sent}")
                print(f"  Messages Received: {metrics.messages_received}")
                print(f"  Avg Latency: {metrics.avg_latency:.3f}s")
                print(f"  Throughput: {metrics.throughput_msgs_per_sec:.1f} msgs/sec")
                print(f"  Memory Usage: {metrics.memory_usage:.2f} MB")
                
                # Assertions básicas
                connection_success_rate = metrics.successful_connections / metrics.connection_count
                assert connection_success_rate >= 0.8, \
                    f"Connection success rate too low: {connection_success_rate:.2%}"
                
                if metrics.messages_sent > 0:
                    message_success_rate = metrics.messages_received / metrics.messages_sent
                    assert message_success_rate >= 0.7, \
                        f"Message success rate too low: {message_success_rate:.2%}"
                
                assert metrics.avg_latency <= 5.0, \
                    f"Average latency too high: {metrics.avg_latency:.3f}s"
                
                # Pausa entre tests
                await asyncio.sleep(5)
                
            except Exception as e:
                print(f"WebSocket load test failed at {concurrent_clients} clients: {e}")
                # No fallar el test completamente, solo reportar
                if concurrent_clients <= 10:  # Debe soportar al menos 10 clientes
                    pytest.fail(f"Cannot handle {concurrent_clients} WebSocket clients: {e}")
    
    @pytest.mark.asyncio
    @pytest.mark.load
    async def test_websocket_sustained_load(self):
        """
        Test de carga sostenida para WebSocket
        """
        tester = WebSocketLoadTester()
        
        # Test de carga sostenida por 2 minutos
        metrics = await tester.run_load_test(
            concurrent_clients=15,
            test_duration=120,  # 2 minutes
            message_interval=3.0
        )
        
        print(f"Sustained Load Test Results (2 minutes):")
        print(f"  Connection Success Rate: {metrics.successful_connections/metrics.connection_count:.2%}")
        print(f"  Total Messages Exchanged: {metrics.messages_received}")
        print(f"  Average Latency: {metrics.avg_latency:.3f}s")
        print(f"  Sustained Throughput: {metrics.throughput_msgs_per_sec:.1f} msgs/sec")
        
        # Assertions para carga sostenida
        assert metrics.successful_connections >= 12, "Cannot sustain 12+ WebSocket connections"
        assert metrics.avg_latency <= 3.0, "Latency degraded during sustained load"
        assert metrics.throughput_msgs_per_sec >= 5.0, "Throughput too low for sustained load"


class TestMLModelLoad:
    """Tests de carga para modelos de Machine Learning"""
    
    @pytest.mark.asyncio
    @pytest.mark.load
    async def test_revenue_prediction_load(self):
        """Test de carga para modelo de predicción de ingresos"""
        
        async with MLModelLoadTester() as tester:
            metrics = await tester.test_revenue_prediction_load(
                concurrent_requests=8,
                total_requests=40
            )
            
            # Assertions para modelo de predicción
            assert metrics.model_accuracy >= 0.90, \
                f"Revenue prediction success rate too low: {metrics.model_accuracy:.2%}"
            
            assert metrics.avg_prediction_time <= 10.0, \
                f"Revenue prediction too slow: {metrics.avg_prediction_time:.3f}s"
            
            assert metrics.p95_prediction_time <= 20.0, \
                f"P95 prediction time too high: {metrics.p95_prediction_time:.3f}s"
    
    @pytest.mark.asyncio
    @pytest.mark.load
    async def test_churn_prediction_load(self):
        """Test de carga para modelo de predicción de churn"""
        
        async with MLModelLoadTester() as tester:
            metrics = await tester.test_churn_prediction_load(
                concurrent_requests=5,
                total_requests=25
            )
            
            # Assertions para predicción de churn
            assert metrics.model_accuracy >= 0.85, \
                f"Churn prediction success rate too low: {metrics.model_accuracy:.2%}"
            
            assert metrics.avg_prediction_time <= 15.0, \
                f"Churn prediction too slow: {metrics.avg_prediction_time:.3f}s"
    
    @pytest.mark.asyncio
    @pytest.mark.load
    async def test_price_optimization_load(self):
        """Test de carga para modelo de optimización de precios"""
        
        async with MLModelLoadTester() as tester:
            metrics = await tester.test_price_optimization_load(
                concurrent_requests=6,
                total_requests=30
            )
            
            # Assertions para optimización de precios
            assert metrics.model_accuracy >= 0.88, \
                f"Price optimization success rate too low: {metrics.model_accuracy:.2%}"
            
            assert metrics.avg_prediction_time <= 8.0, \
                f"Price optimization too slow: {metrics.avg_prediction_time:.3f}s"
    
    @pytest.mark.asyncio
    @pytest.mark.load
    async def test_ml_models_parallel_load(self):
        """Test de carga con múltiples modelos ML ejecutándose en paralelo"""
        
        async with MLModelLoadTester() as tester:
            # Ejecutar múltiples tipos de predicción en paralelo
            tasks = [
                tester.test_revenue_prediction_load(concurrent_requests=3, total_requests=15),
                tester.test_churn_prediction_load(concurrent_requests=2, total_requests=10),
                tester.test_price_optimization_load(concurrent_requests=3, total_requests=15)
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Verificar que todos los modelos funcionaron correctamente bajo carga paralela
            successful_tests = 0
            for i, result in enumerate(results):
                if not isinstance(result, Exception):
                    if result.model_accuracy >= 0.80:  # Criterio más relajado para carga paralela
                        successful_tests += 1
                    print(f"Parallel Test {i+1}: {result.model_accuracy:.2%} success rate")
                else:
                    print(f"Parallel Test {i+1} failed: {result}")
            
            assert successful_tests >= 2, \
                "At least 2 out of 3 ML models should work correctly under parallel load"


if __name__ == "__main__":
    # Ejecutar load tests
    pytest.main([__file__, "-v", "-m", "load"])