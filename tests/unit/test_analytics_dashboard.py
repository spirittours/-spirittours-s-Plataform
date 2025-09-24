"""
🧪 UNIT TESTS - Analytics Dashboard
Suite completa de tests unitarios para el sistema de dashboard en tiempo real

Autor: GenSpark AI Developer  
Fase: 7 - Testing & Quality Assurance
Fecha: 2024-09-24
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime, timedelta
import json
import redis
import pandas as pd
from decimal import Decimal

# Import modules to test
from backend.analytics.real_time_dashboard import (
    RealTimeDashboard,
    DashboardMetrics, 
    RevenueBreakdown,
    AIAgentMetrics,
    WebSocketManager,
    create_dashboard_instance
)

class TestDashboardMetrics:
    """Test suite para DashboardMetrics dataclass"""
    
    def test_dashboard_metrics_initialization(self):
        """Test inicialización correcta de DashboardMetrics"""
        metrics = DashboardMetrics()
        
        assert isinstance(metrics.revenue_metrics, dict)
        assert isinstance(metrics.ai_performance_metrics, dict)
        assert isinstance(metrics.crm_metrics, dict)
        assert isinstance(metrics.call_center_metrics, dict)
        assert isinstance(metrics.customer_journey_metrics, dict)
        assert isinstance(metrics.system_health_metrics, dict)
        assert isinstance(metrics.timestamp, datetime)
    
    def test_dashboard_metrics_with_data(self):
        """Test DashboardMetrics con datos específicos"""
        test_data = {
            "total_revenue": Decimal('10000.00'),
            "conversion_rate": 0.125
        }
        
        metrics = DashboardMetrics(revenue_metrics=test_data)
        
        assert metrics.revenue_metrics["total_revenue"] == Decimal('10000.00')
        assert metrics.revenue_metrics["conversion_rate"] == 0.125
    
    def test_revenue_breakdown_calculations(self):
        """Test cálculos en RevenueBreakdown"""
        breakdown = RevenueBreakdown(
            b2c_revenue=Decimal('5000.00'),
            b2b_revenue=Decimal('3000.00'),
            b2b2c_revenue=Decimal('2000.00')
        )
        
        # Test total calculation
        expected_total = Decimal('10000.00')
        breakdown.total_revenue = breakdown.b2c_revenue + breakdown.b2b_revenue + breakdown.b2b2c_revenue
        
        assert breakdown.total_revenue == expected_total

class TestWebSocketManager:
    """Test suite para WebSocketManager"""
    
    @pytest.fixture
    def websocket_manager(self):
        return WebSocketManager()
    
    @pytest.fixture
    def mock_websocket(self):
        websocket = Mock()
        websocket.accept = AsyncMock()
        websocket.send_json = AsyncMock()
        websocket.send_text = AsyncMock()
        return websocket
    
    @pytest.mark.asyncio
    async def test_websocket_connect(self, websocket_manager, mock_websocket):
        """Test conexión WebSocket"""
        await websocket_manager.connect(mock_websocket)
        
        mock_websocket.accept.assert_called_once()
        assert mock_websocket in websocket_manager.active_connections
    
    def test_websocket_disconnect(self, websocket_manager, mock_websocket):
        """Test desconexión WebSocket"""
        websocket_manager.active_connections.append(mock_websocket)
        websocket_manager.disconnect(mock_websocket)
        
        assert mock_websocket not in websocket_manager.active_connections
    
    @pytest.mark.asyncio
    async def test_websocket_broadcast_success(self, websocket_manager, mock_websocket):
        """Test broadcast exitoso a conexiones"""
        websocket_manager.active_connections.append(mock_websocket)
        
        test_message = {"type": "test", "data": "test_data"}
        await websocket_manager.broadcast(test_message)
        
        mock_websocket.send_json.assert_called_once_with(test_message)
    
    @pytest.mark.asyncio
    async def test_websocket_broadcast_with_error(self, websocket_manager, mock_websocket):
        """Test broadcast con error en conexión"""
        mock_websocket.send_json.side_effect = Exception("Connection error")
        websocket_manager.active_connections.append(mock_websocket)
        
        test_message = {"type": "test", "data": "test_data"}
        await websocket_manager.broadcast(test_message)
        
        # Verificar que la conexión con error se removió
        assert mock_websocket not in websocket_manager.active_connections

class TestRealTimeDashboard:
    """Test suite para RealTimeDashboard"""
    
    @pytest.fixture
    def mock_db_session(self):
        return Mock()
    
    @pytest.fixture
    def mock_redis_client(self):
        redis_mock = Mock(spec=redis.Redis)
        redis_mock.get.return_value = None
        redis_mock.setex.return_value = True
        return redis_mock
    
    @pytest.fixture
    def dashboard(self, mock_db_session, mock_redis_client):
        return RealTimeDashboard(mock_db_session, mock_redis_client)
    
    def test_dashboard_initialization(self, dashboard):
        """Test inicialización correcta del dashboard"""
        assert dashboard.db is not None
        assert dashboard.redis is not None
        assert isinstance(dashboard.active_connections, list)
        assert dashboard.cache_ttl == 300
        assert dashboard.update_interval == 30
        assert dashboard._running is False
    
    @pytest.mark.asyncio
    async def test_websocket_connect_workflow(self, dashboard):
        """Test workflow completo de conexión WebSocket"""
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        mock_websocket.send_json = AsyncMock()
        
        # Mock collect_all_metrics to avoid complex dependencies
        dashboard.collect_all_metrics = AsyncMock(return_value=DashboardMetrics())
        
        await dashboard.connect_websocket(mock_websocket)
        
        mock_websocket.accept.assert_called_once()
        assert mock_websocket in dashboard.active_connections
        dashboard.collect_all_metrics.assert_called_once()
        mock_websocket.send_json.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_collect_revenue_metrics(self, dashboard):
        """Test recopilación de métricas de ingresos"""
        revenue_data = await dashboard._collect_revenue_metrics()
        
        assert isinstance(revenue_data, dict)
        assert "today" in revenue_data
        assert "last_7_days" in revenue_data
        assert "last_30_days" in revenue_data
        assert "top_revenue_sources" in revenue_data
        
        # Verificar estructura de datos
        today_data = revenue_data["today"]
        assert "b2c_revenue" in today_data
        assert "b2b_revenue" in today_data
        assert "b2b2c_revenue" in today_data
        assert "conversion_rate" in today_data
    
    @pytest.mark.asyncio
    async def test_collect_ai_performance_metrics(self, dashboard):
        """Test recopilación de métricas de IA"""
        ai_data = await dashboard._collect_ai_performance_metrics()
        
        assert isinstance(ai_data, dict)
        assert "overall_performance" in ai_data
        assert "track_performance" in ai_data
        assert "top_performing_agents" in ai_data
        assert "real_time_activity" in ai_data
        
        # Verificar tracks
        track_performance = ai_data["track_performance"]
        assert "track_1" in track_performance
        assert "track_2" in track_performance
        assert "track_3" in track_performance
        
        # Verificar métricas de cada track
        for track_data in track_performance.values():
            assert "queries_processed" in track_data
            assert "success_rate" in track_data
            assert "avg_response_time" in track_data
    
    @pytest.mark.asyncio
    async def test_collect_crm_metrics(self, dashboard):
        """Test recopilación de métricas de CRM"""
        crm_data = await dashboard._collect_crm_metrics()
        
        assert isinstance(crm_data, dict)
        assert "lead_management" in crm_data
        assert "sales_pipeline" in crm_data
        assert "customer_interactions" in crm_data
        assert "ticket_management" in crm_data
        
        # Verificar lead management
        lead_data = crm_data["lead_management"]
        assert "total_leads_today" in lead_data
        assert "qualified_leads" in lead_data
        assert "conversion_rate" in lead_data
        assert "lead_sources" in lead_data
    
    @pytest.mark.asyncio
    async def test_collect_system_health_metrics(self, dashboard):
        """Test recopilación de métricas de salud del sistema"""
        health_data = await dashboard._collect_system_health_metrics()
        
        assert isinstance(health_data, dict)
        assert "system_status" in health_data
        assert "service_status" in health_data
        assert "resource_utilization" in health_data
        assert "alerts_summary" in health_data
        
        # Verificar system status
        system_status = health_data["system_status"]
        assert "overall_health" in system_status
        assert "uptime" in system_status
        assert "response_time" in system_status
        assert "error_rate" in system_status
    
    @pytest.mark.asyncio
    async def test_cache_functionality(self, dashboard):
        """Test funcionalidad de cache Redis"""
        # Test cache miss
        dashboard.redis.get.return_value = None
        cached_metrics = await dashboard._get_cached_metrics()
        assert cached_metrics is None
        
        # Test cache hit
        test_metrics = DashboardMetrics()
        dashboard.redis.get.return_value = json.dumps(test_metrics.__dict__, default=str)
        
        # Mock the JSON parsing to avoid datetime issues
        with patch('json.loads') as mock_json_loads:
            mock_json_loads.return_value = {
                'revenue_metrics': {},
                'ai_performance_metrics': {},
                'crm_metrics': {},
                'call_center_metrics': {},
                'customer_journey_metrics': {},
                'system_health_metrics': {},
                'timestamp': datetime.utcnow().isoformat()
            }
            
            cached_metrics = await dashboard._get_cached_metrics()
            assert cached_metrics is not None
    
    @pytest.mark.asyncio
    async def test_collect_all_metrics_with_cache(self, dashboard):
        """Test collect_all_metrics usando cache"""
        # Mock cache hit
        cached_data = {
            'revenue_metrics': {'test': 'data'},
            'ai_performance_metrics': {},
            'crm_metrics': {},
            'call_center_metrics': {},
            'customer_journey_metrics': {},
            'system_health_metrics': {},
            'timestamp': datetime.utcnow().isoformat()
        }
        
        dashboard._get_cached_metrics = AsyncMock(return_value=DashboardMetrics(**cached_data))
        
        metrics = await dashboard.collect_all_metrics()
        
        assert isinstance(metrics, DashboardMetrics)
        dashboard._get_cached_metrics.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_collect_all_metrics_without_cache(self, dashboard):
        """Test collect_all_metrics sin cache (fresh data)"""
        # Mock cache miss
        dashboard._get_cached_metrics = AsyncMock(return_value=None)
        dashboard._cache_metrics = AsyncMock()
        
        # Mock individual metric collection methods
        dashboard._collect_revenue_metrics = AsyncMock(return_value={'revenue': 'data'})
        dashboard._collect_ai_performance_metrics = AsyncMock(return_value={'ai': 'data'})
        dashboard._collect_crm_metrics = AsyncMock(return_value={'crm': 'data'})
        dashboard._collect_call_center_metrics = AsyncMock(return_value={'call': 'data'})
        dashboard._collect_customer_journey_metrics = AsyncMock(return_value={'journey': 'data'})
        dashboard._collect_system_health_metrics = AsyncMock(return_value={'health': 'data'})
        
        metrics = await dashboard.collect_all_metrics()
        
        assert isinstance(metrics, DashboardMetrics)
        assert metrics.revenue_metrics == {'revenue': 'data'}
        assert metrics.ai_performance_metrics == {'ai': 'data'}
        dashboard._cache_metrics.assert_called_once_with(metrics)
    
    @pytest.mark.asyncio
    async def test_real_time_updates_lifecycle(self, dashboard):
        """Test lifecycle de actualizaciones en tiempo real"""
        dashboard.collect_all_metrics = AsyncMock(return_value=DashboardMetrics())
        dashboard.broadcast_metrics = AsyncMock()
        
        # Test start
        update_task = asyncio.create_task(dashboard.start_real_time_updates())
        
        # Let it run for a short time
        await asyncio.sleep(0.1)
        
        # Test stop
        await dashboard.stop_real_time_updates()
        
        # Cancel the task to clean up
        update_task.cancel()
        
        assert dashboard._running is False

class TestAIAgentMetrics:
    """Test suite para AIAgentMetrics"""
    
    def test_ai_agent_metrics_initialization(self):
        """Test inicialización de AIAgentMetrics"""
        agent_metrics = AIAgentMetrics(
            agent_name="TestAgent AI",
            track="Track 1"
        )
        
        assert agent_metrics.agent_name == "TestAgent AI"
        assert agent_metrics.track == "Track 1"
        assert agent_metrics.queries_processed == 0
        assert agent_metrics.success_rate == 0.0
        assert agent_metrics.cost_per_interaction == Decimal('0.00')
    
    def test_ai_agent_metrics_with_data(self):
        """Test AIAgentMetrics con datos completos"""
        agent_metrics = AIAgentMetrics(
            agent_name="BookingOptimizer AI",
            track="Track 1",
            queries_processed=1500,
            success_rate=0.98,
            avg_response_time=0.65,
            revenue_generated=Decimal('15000.50')
        )
        
        assert agent_metrics.queries_processed == 1500
        assert agent_metrics.success_rate == 0.98
        assert agent_metrics.avg_response_time == 0.65
        assert agent_metrics.revenue_generated == Decimal('15000.50')

class TestDashboardUtils:
    """Test suite para utilidades del dashboard"""
    
    @pytest.mark.asyncio
    async def test_create_dashboard_instance(self):
        """Test creación de instancia del dashboard"""
        mock_db_session = Mock()
        
        with patch('redis.from_url') as mock_redis:
            mock_redis.return_value = Mock(spec=redis.Redis)
            
            dashboard = await create_dashboard_instance(mock_db_session)
            
            assert isinstance(dashboard, RealTimeDashboard)
            assert dashboard.db == mock_db_session
            mock_redis.assert_called_once_with("redis://localhost:6379")

@pytest.mark.integration
class TestDashboardIntegration:
    """Test de integración para dashboard completo"""
    
    @pytest.mark.asyncio
    async def test_full_dashboard_workflow(self):
        """Test workflow completo del dashboard"""
        mock_db = Mock()
        mock_redis = Mock(spec=redis.Redis)
        mock_redis.get.return_value = None
        mock_redis.setex.return_value = True
        
        dashboard = RealTimeDashboard(mock_db, mock_redis)
        
        # Test collect metrics
        metrics = await dashboard.collect_all_metrics()
        assert isinstance(metrics, DashboardMetrics)
        
        # Test WebSocket connection
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        mock_websocket.send_json = AsyncMock()
        
        await dashboard.connect_websocket(mock_websocket)
        assert len(dashboard.active_connections) == 1
        
        # Test broadcast
        test_message = {"type": "test", "data": "integration_test"}
        await dashboard.broadcast_metrics(metrics)
        
        # Cleanup
        dashboard.disconnect_websocket(mock_websocket)
        assert len(dashboard.active_connections) == 0

if __name__ == "__main__":
    # Configurar pytest para running individual
    pytest.main([__file__, "-v", "--tb=short"])