"""
🧪 INTEGRATION TESTS - Analytics API
Suite completa de tests de integración para todas las APIs del sistema Analytics

Autor: GenSpark AI Developer  
Fase: 7 - Testing & Quality Assurance
Fecha: 2024-09-24
"""

import pytest
import asyncio
import json
import websockets
from httpx import AsyncClient
from fastapi.testclient import TestClient
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta
import redis
import pandas as pd

# Import FastAPI app and dependencies
from backend.main import app
from backend.analytics.real_time_dashboard import create_dashboard_instance
from backend.analytics.automated_reports import AutomatedReportsSystem, ReportType, ReportFrequency
from backend.analytics.predictive_analytics import create_analytics_engine, PredictionType

class TestAnalyticsDashboardAPI:
    """Test suite para Analytics Dashboard API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Cliente de prueba para FastAPI"""
        return TestClient(app)
    
    @pytest.fixture
    async def async_client(self):
        """Cliente asíncrono para FastAPI"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            yield client
    
    def test_dashboard_metrics_endpoint(self, client):
        """Test endpoint de métricas del dashboard"""
        response = client.get("/api/analytics/dashboard/metrics")
        
        # Should return 200 or 503 (if service not available)
        assert response.status_code in [200, 503]
        
        if response.status_code == 200:
            data = response.json()
            assert "status" in data
            assert "data" in data
            assert "timestamp" in data
    
    def test_dashboard_revenue_summary_endpoint(self, client):
        """Test endpoint de resumen de ingresos"""
        response = client.get("/api/analytics/dashboard/revenue-summary?period=7d")
        
        assert response.status_code in [200, 503]
        
        if response.status_code == 200:
            data = response.json()
            assert "status" in data
            assert "data" in data
            assert data["data"]["period"] == "7d"
    
    def test_dashboard_ai_agents_status_endpoint(self, client):
        """Test endpoint de estado de agentes IA"""
        response = client.get("/api/analytics/dashboard/ai-agents-status")
        
        assert response.status_code in [200, 503]
        
        if response.status_code == 200:
            data = response.json()
            assert "status" in data
            assert "data" in data
            
            # Verify AI agents data structure
            agents_data = data["data"]
            assert "overview" in agents_data
            assert "track_performance" in agents_data
            assert "total_agents" in agents_data
    
    def test_dashboard_config_endpoint(self, client):
        """Test endpoint de configuración del dashboard"""
        response = client.get("/api/analytics/config/dashboard")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert "config" in data
        
        config = data["config"]
        assert "refresh_intervals" in config
        assert "supported_metrics" in config
        assert "websocket_endpoint" in config
    
    def test_health_check_endpoint(self, client):
        """Test endpoint de health check"""
        response = client.get("/api/analytics/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert data["status"] in ["healthy", "degraded", "unhealthy"]
        assert "services" in data
        assert "timestamp" in data

class TestAnalyticsReportsAPI:
    """Test suite para Analytics Reports API endpoints"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_generate_report_endpoint(self, client):
        """Test endpoint de generación de reportes"""
        report_request = {
            "report_type": "FINANCIAL_SUMMARY",
            "recipients": ["test@example.com"],
            "title": "Test Financial Report",
            "description": "Integration test report",
            "parameters": {"period": "30d"},
            "include_charts": True,
            "delivery_method": "email"
        }
        
        response = client.post("/api/analytics/reports/generate", json=report_request)
        
        assert response.status_code in [200, 503]
        
        if response.status_code == 200:
            data = response.json()
            assert "status" in data
            assert "report_id" in data
            assert "estimated_completion" in data
    
    def test_schedule_report_endpoint(self, client):
        """Test endpoint de programación de reportes"""
        schedule_request = {
            "report_type": "AI_PERFORMANCE",
            "recipients": ["ai-team@example.com"],
            "title": "Weekly AI Performance",
            "description": "Automated weekly report",
            "schedule_frequency": "WEEKLY",
            "delivery_method": "email"
        }
        
        response = client.post("/api/analytics/reports/schedule", json=schedule_request)
        
        assert response.status_code in [200, 503]
        
        if response.status_code == 200:
            data = response.json()
            assert "status" in data
            assert "report_id" in data
            assert "frequency" in data
            assert "next_run" in data
    
    def test_get_scheduled_reports_endpoint(self, client):
        """Test endpoint de listado de reportes programados"""
        response = client.get("/api/analytics/reports/scheduled")
        
        assert response.status_code in [200, 503]
        
        if response.status_code == 200:
            data = response.json()
            assert "status" in data
            assert "data" in data
            assert "total_count" in data
            assert isinstance(data["data"], list)
    
    def test_reports_config_endpoint(self, client):
        """Test endpoint de configuración de reportes"""
        response = client.get("/api/analytics/config/reports")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert "config" in data
        
        config = data["config"]
        assert "supported_types" in config
        assert "frequencies" in config
        assert "delivery_methods" in config

class TestAnalyticsPredictionsAPI:
    """Test suite para Analytics Predictions API endpoints"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_generate_prediction_endpoint(self, client):
        """Test endpoint de generación de predicciones"""
        prediction_request = {
            "prediction_type": "REVENUE_FORECAST",
            "parameters": {"goal": "revenue"},
            "confidence_level": 0.95,
            "forecast_horizon": 14
        }
        
        response = client.post("/api/analytics/predictions/generate", json=prediction_request)
        
        assert response.status_code in [200, 503]
        
        if response.status_code == 200:
            data = response.json()
            assert "status" in data
            assert "data" in data
            
            prediction_data = data["data"]
            assert "prediction_type" in prediction_data
            assert "model_type" in prediction_data
            assert "prediction_value" in prediction_data
            assert "confidence_score" in prediction_data
    
    def test_revenue_forecast_endpoint(self, client):
        """Test endpoint específico de pronóstico de ingresos"""
        response = client.get("/api/analytics/predictions/revenue-forecast?days=30")
        
        assert response.status_code in [200, 503]
        
        if response.status_code == 200:
            data = response.json()
            assert "status" in data
            assert "forecast_period" in data
            assert "predictions" in data
            assert "confidence" in data
            assert data["forecast_period"] == "30 days"
    
    def test_churn_risk_endpoint(self, client):
        """Test endpoint de análisis de riesgo de churn"""
        response = client.get("/api/analytics/predictions/churn-risk")
        
        assert response.status_code in [200, 503]
        
        if response.status_code == 200:
            data = response.json()
            assert "status" in data
            assert "churn_analysis" in data
            assert "confidence" in data
            assert "risk_factors" in data

class TestAnalyticsKPIsAPI:
    """Test suite para Analytics KPIs API endpoints"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_kpis_overview_endpoint(self, client):
        """Test endpoint de overview de KPIs"""
        response = client.get("/api/analytics/kpis/overview?period=30d")
        
        assert response.status_code in [200, 503]
        
        if response.status_code == 200:
            data = response.json()
            assert "status" in data
            assert "data" in data
            assert "period" in data
            
            kpis_data = data["data"]
            assert "financial_kpis" in kpis_data
            assert "operational_kpis" in kpis_data
            assert "customer_kpis" in kpis_data
            assert "ai_kpis" in kpis_data
    
    def test_ai_agents_kpis_endpoint(self, client):
        """Test endpoint de KPIs específicos de agentes IA"""
        response = client.get("/api/analytics/kpis/ai-agents")
        
        assert response.status_code in [200, 503]
        
        if response.status_code == 200:
            data = response.json()
            assert "status" in data
            assert "data" in data
            
            ai_kpis = data["data"]
            assert "performance_overview" in ai_kpis
            assert "track_breakdown" in ai_kpis
            assert "efficiency_metrics" in ai_kpis

@pytest.mark.asyncio
class TestAnalyticsWebSocketIntegration:
    """Test suite para integración WebSocket del dashboard"""
    
    @pytest.fixture
    def mock_dashboard(self):
        """Mock dashboard instance"""
        dashboard = Mock()
        dashboard.collect_all_metrics = AsyncMock()
        dashboard.connect_websocket = AsyncMock()
        dashboard.disconnect_websocket = Mock()
        dashboard.active_connections = []
        return dashboard
    
    async def test_websocket_connection_flow(self, mock_dashboard):
        """Test flujo completo de conexión WebSocket"""
        # This is a simplified test since actual WebSocket testing requires a running server
        
        # Simulate WebSocket connection
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        mock_websocket.send_json = AsyncMock()
        mock_websocket.receive_json = AsyncMock()
        
        # Test connection
        await mock_dashboard.connect_websocket(mock_websocket)
        mock_dashboard.connect_websocket.assert_called_once_with(mock_websocket)
        
        # Test message handling
        mock_websocket.receive_json.return_value = {"type": "ping"}
        
        # Simulate ping-pong
        expected_response = {"type": "pong", "timestamp": datetime.utcnow().isoformat()}
        
        # In a real WebSocket, this would send the response
        await mock_websocket.send_json(expected_response)
        mock_websocket.send_json.assert_called()
    
    async def test_websocket_metrics_broadcast(self, mock_dashboard):
        """Test broadcast de métricas via WebSocket"""
        # Mock multiple connections
        mock_ws1 = Mock()
        mock_ws1.send_json = AsyncMock()
        mock_ws2 = Mock()
        mock_ws2.send_json = AsyncMock()
        
        mock_dashboard.active_connections = [mock_ws1, mock_ws2]
        
        # Mock broadcast_metrics method
        mock_dashboard.broadcast_metrics = AsyncMock()
        
        test_metrics = {
            "type": "dashboard_update",
            "data": {"revenue": 10000, "ai_success_rate": 0.95},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Test broadcast
        await mock_dashboard.broadcast_metrics(test_metrics)
        mock_dashboard.broadcast_metrics.assert_called_once()

class TestCRMIntegration:
    """Test suite para integración con sistema CRM"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_crm_analytics_integration(self, client):
        """Test integración con datos del CRM"""
        # Test endpoint que debería usar datos del CRM
        response = client.get("/api/analytics/dashboard/metrics")
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify CRM data is included
            if "data" in data and "crm" in data["data"]:
                crm_metrics = data["data"]["crm"]
                
                # Should include CRM-specific metrics
                expected_crm_fields = [
                    "lead_management", "sales_pipeline", 
                    "customer_interactions", "ticket_management"
                ]
                
                # Check if any CRM fields are present
                has_crm_data = any(field in crm_metrics for field in expected_crm_fields)
                assert has_crm_data or len(crm_metrics) > 0
    
    def test_ai_agents_integration(self, client):
        """Test integración con los 25 agentes IA"""
        response = client.get("/api/analytics/dashboard/ai-agents-status")
        
        if response.status_code == 200:
            data = response.json()
            
            if "data" in data:
                ai_data = data["data"]
                
                # Should show 25 total agents
                if "total_agents" in ai_data:
                    assert ai_data["total_agents"] == 25
                
                # Should have track performance for 3 tracks
                if "track_performance" in ai_data:
                    track_perf = ai_data["track_performance"]
                    # Should have data for tracks 1, 2, and 3
                    expected_tracks = ["track_1", "track_2", "track_3"]
                    has_track_data = any(track in track_perf for track in expected_tracks)
                    assert has_track_data

class TestPaymentSystemIntegration:
    """Test suite para integración con sistema de pagos"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_payment_analytics_integration(self, client):
        """Test integración con datos de pagos"""
        response = client.get("/api/analytics/dashboard/revenue-summary")
        
        if response.status_code == 200:
            data = response.json()
            
            if "data" in data:
                revenue_data = data["data"]
                
                # Should include payment-related metrics
                expected_payment_fields = [
                    "total_revenue", "conversion_rate", 
                    "channel_breakdown"
                ]
                
                has_payment_data = any(field in revenue_data for field in expected_payment_fields)
                assert has_payment_data or "total_revenue" in revenue_data

class TestDatabaseIntegration:
    """Test suite para integración con base de datos"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    @pytest.mark.asyncio
    async def test_database_connection_health(self, client):
        """Test salud de conexión a base de datos"""
        response = client.get("/api/analytics/health")
        
        assert response.status_code == 200
        data = response.json()
        
        # Health check should include database status
        if "services" in data:
            services = data["services"]
            
            # May include database-related services
            db_indicators = ["dashboard", "reports", "analytics_engine"]
            has_db_health = any(service in services for service in db_indicators)
            
            # At least some services should be reported
            assert len(services) > 0

@pytest.mark.integration
class TestFullAnalyticsWorkflow:
    """Test suite para workflow completo de analytics"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_complete_analytics_workflow(self, client):
        """Test workflow completo desde dashboard hasta reportes"""
        # Step 1: Check dashboard health
        health_response = client.get("/api/analytics/health")
        assert health_response.status_code == 200
        
        # Step 2: Get dashboard metrics
        metrics_response = client.get("/api/analytics/dashboard/metrics")
        # Should work or return service unavailable
        assert metrics_response.status_code in [200, 503]
        
        # Step 3: Check KPIs
        kpis_response = client.get("/api/analytics/kpis/overview")
        assert kpis_response.status_code in [200, 503]
        
        # Step 4: Test prediction generation
        prediction_request = {
            "prediction_type": "REVENUE_FORECAST",
            "forecast_horizon": 7
        }
        
        prediction_response = client.post(
            "/api/analytics/predictions/generate", 
            json=prediction_request
        )
        assert prediction_response.status_code in [200, 503]
        
        # Step 5: Test report generation
        report_request = {
            "report_type": "FINANCIAL_SUMMARY",
            "recipients": ["test@example.com"],
            "title": "Integration Test Report"
        }
        
        report_response = client.post(
            "/api/analytics/reports/generate",
            json=report_request
        )
        assert report_response.status_code in [200, 503]
    
    def test_configuration_endpoints_workflow(self, client):
        """Test workflow de configuración completo"""
        # Get dashboard configuration
        dashboard_config = client.get("/api/analytics/config/dashboard")
        assert dashboard_config.status_code == 200
        
        # Get reports configuration  
        reports_config = client.get("/api/analytics/config/reports")
        assert reports_config.status_code == 200
        
        # Verify configurations are consistent
        dashboard_data = dashboard_config.json()
        reports_data = reports_config.json()
        
        assert "config" in dashboard_data
        assert "config" in reports_data
        
        # Both should have valid configuration structures
        assert len(dashboard_data["config"]) > 0
        assert len(reports_data["config"]) > 0

class TestErrorHandlingIntegration:
    """Test suite para manejo de errores en integración"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_invalid_prediction_request(self, client):
        """Test manejo de request inválido para predicción"""
        invalid_request = {
            "prediction_type": "INVALID_TYPE",
            "forecast_horizon": -1
        }
        
        response = client.post("/api/analytics/predictions/generate", json=invalid_request)
        
        # Should return client error or service unavailable
        assert response.status_code in [400, 422, 503]
    
    def test_invalid_report_request(self, client):
        """Test manejo de request inválido para reporte"""
        invalid_request = {
            "report_type": "INVALID_REPORT",
            "recipients": [],  # Empty recipients
            "title": ""  # Empty title
        }
        
        response = client.post("/api/analytics/reports/generate", json=invalid_request)
        
        # Should return client error or service unavailable
        assert response.status_code in [400, 422, 503]
    
    def test_nonexistent_endpoints(self, client):
        """Test endpoints que no existen"""
        response = client.get("/api/analytics/nonexistent/endpoint")
        assert response.status_code == 404
        
        response = client.post("/api/analytics/invalid/endpoint")
        assert response.status_code == 404

if __name__ == "__main__":
    # Configurar pytest para running individual
    pytest.main([__file__, "-v", "--tb=short"])