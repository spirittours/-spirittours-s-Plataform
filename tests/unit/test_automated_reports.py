"""
🧪 UNIT TESTS - Automated Reports
Suite completa de tests unitarios para el sistema de reportes automáticos

Autor: GenSpark AI Developer  
Fase: 7 - Testing & Quality Assurance
Fecha: 2024-09-24
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock, mock_open
from datetime import datetime, timedelta
from decimal import Decimal
import json
import pandas as pd
import numpy as np
from io import BytesIO
import matplotlib.pyplot as plt

# Import modules to test
from backend.analytics.automated_reports import (
    AutomatedReportsSystem,
    ReportConfig,
    ReportData,
    ReportType,
    ReportFrequency,
    create_default_report_configs
)

class TestReportConfig:
    """Test suite para ReportConfig dataclass"""
    
    def test_report_config_initialization(self):
        """Test inicialización básica de ReportConfig"""
        config = ReportConfig(
            report_id="test_report_001",
            report_type=ReportType.FINANCIAL_SUMMARY,
            frequency=ReportFrequency.DAILY,
            recipients=["test@example.com"],
            title="Test Financial Report",
            description="Test description"
        )
        
        assert config.report_id == "test_report_001"
        assert config.report_type == ReportType.FINANCIAL_SUMMARY
        assert config.frequency == ReportFrequency.DAILY
        assert config.recipients == ["test@example.com"]
        assert config.title == "Test Financial Report"
        assert config.description == "Test description"
        assert config.active is True
        assert isinstance(config.created_at, datetime)
    
    def test_report_config_with_parameters(self):
        """Test ReportConfig con parámetros adicionales"""
        parameters = {
            "period": "30d",
            "include_charts": True,
            "format": "pdf"
        }
        
        config = ReportConfig(
            report_id="test_report_002",
            report_type=ReportType.AI_PERFORMANCE,
            frequency=ReportFrequency.WEEKLY,
            recipients=["ai@example.com", "manager@example.com"],
            title="AI Performance Weekly",
            description="Weekly AI metrics report",
            parameters=parameters,
            delivery_method="slack"
        )
        
        assert config.parameters["period"] == "30d"
        assert config.parameters["include_charts"] is True
        assert config.delivery_method == "slack"

class TestReportData:
    """Test suite para ReportData dataclass"""
    
    def test_report_data_initialization(self):
        """Test inicialización de ReportData"""
        config = ReportConfig(
            report_id="test",
            report_type=ReportType.CUSTOMER_ANALYTICS,
            frequency=ReportFrequency.MONTHLY,
            recipients=["test@example.com"],
            title="Test Report",
            description="Test"
        )
        
        test_data = {"customers": 100, "revenue": Decimal('10000.00')}
        
        report_data = ReportData(
            report_config=config,
            data=test_data
        )
        
        assert report_data.report_config == config
        assert report_data.data == test_data
        assert isinstance(report_data.charts, list)
        assert len(report_data.charts) == 0
        assert isinstance(report_data.generated_at, datetime)
        assert report_data.file_path is None
        assert report_data.size_mb == 0.0

class TestAutomatedReportsSystem:
    """Test suite principal para AutomatedReportsSystem"""
    
    @pytest.fixture
    def mock_db_session(self):
        return Mock()
    
    @pytest.fixture
    def smtp_config(self):
        return {
            "host": "smtp.example.com",
            "port": 587,
            "username": "reports@example.com",
            "password": "test_password",
            "from_email": "reports@example.com",
            "use_tls": True
        }
    
    @pytest.fixture
    def reports_system(self, mock_db_session, smtp_config):
        return AutomatedReportsSystem(mock_db_session, smtp_config)
    
    def test_reports_system_initialization(self, reports_system):
        """Test inicialización del sistema de reportes"""
        assert reports_system.db is not None
        assert isinstance(reports_system.smtp_config, dict)
        assert isinstance(reports_system.reports_config, list)
        assert len(reports_system.reports_config) == 0
        assert reports_system.scheduler_running is False
        assert reports_system.executor is not None
    
    def test_add_report_config(self, reports_system):
        """Test agregar configuración de reporte"""
        config = ReportConfig(
            report_id="test_001",
            report_type=ReportType.FINANCIAL_SUMMARY,
            frequency=ReportFrequency.DAILY,
            recipients=["test@example.com"],
            title="Test Report",
            description="Test"
        )
        
        reports_system.add_report_config(config)
        
        assert len(reports_system.reports_config) == 1
        assert reports_system.reports_config[0] == config
        assert config.next_run is not None  # Should be calculated
    
    def test_calculate_next_run(self, reports_system):
        """Test cálculo de próxima ejecución"""
        now = datetime.utcnow()
        
        # Test daily
        daily_next = reports_system._calculate_next_run(ReportFrequency.DAILY)
        assert daily_next > now
        assert (daily_next - now).days == 1
        
        # Test weekly
        weekly_next = reports_system._calculate_next_run(ReportFrequency.WEEKLY)
        assert weekly_next > now
        assert (weekly_next - now).days == 7
        
        # Test on-demand
        on_demand_next = reports_system._calculate_next_run(ReportFrequency.ON_DEMAND)
        assert on_demand_next is None
    
    @pytest.mark.asyncio
    async def test_generate_financial_report_data(self, reports_system):
        """Test generación de datos de reporte financiero"""
        parameters = {"days": 30}
        
        financial_data = await reports_system._generate_financial_report_data(parameters)
        
        assert isinstance(financial_data, dict)
        assert "summary" in financial_data
        assert "revenue_by_channel" in financial_data
        assert "commission_breakdown" in financial_data
        assert "payment_methods" in financial_data
        
        # Verify summary structure
        summary = financial_data["summary"]
        assert "total_revenue" in summary
        assert "net_revenue" in summary
        assert "profit_margin" in summary
        assert "growth_rate" in summary
        
        # Verify revenue by channel
        revenue_channels = financial_data["revenue_by_channel"]
        assert "b2c" in revenue_channels
        assert "b2b" in revenue_channels
        assert "b2b2c" in revenue_channels
    
    @pytest.mark.asyncio
    async def test_generate_ai_performance_data(self, reports_system):
        """Test generación de datos de performance de IA"""
        parameters = {}
        
        ai_data = await reports_system._generate_ai_performance_data(parameters)
        
        assert isinstance(ai_data, dict)
        assert "overview" in ai_data
        assert "track_performance" in ai_data
        assert "agent_details" in ai_data
        assert "usage_patterns" in ai_data
        assert "cost_analysis" in ai_data
        
        # Verify overview
        overview = ai_data["overview"]
        assert "total_agents" in overview
        assert overview["total_agents"] == 25
        assert "avg_response_time" in overview
        assert "overall_success_rate" in overview
        
        # Verify track performance
        track_perf = ai_data["track_performance"]
        assert "track_1" in track_perf
        assert "track_2" in track_perf
        assert "track_3" in track_perf
    
    @pytest.mark.asyncio
    async def test_generate_customer_analytics_data(self, reports_system):
        """Test generación de datos de analytics de clientes"""
        parameters = {}
        
        customer_data = await reports_system._generate_customer_analytics_data(parameters)
        
        assert isinstance(customer_data, dict)
        assert "customer_overview" in customer_data
        assert "customer_segments" in customer_data
        assert "demographic_analysis" in customer_data
        assert "satisfaction_metrics" in customer_data
        assert "behavior_patterns" in customer_data
        assert "retention_analysis" in customer_data
        
        # Verify customer overview
        overview = customer_data["customer_overview"]
        assert "total_customers" in overview
        assert "customer_retention_rate" in overview
        assert "avg_customer_lifetime_value" in overview
    
    @pytest.mark.asyncio
    async def test_generate_operational_health_data(self, reports_system):
        """Test generación de datos de salud operacional"""
        parameters = {}
        
        health_data = await reports_system._generate_operational_health_data(parameters)
        
        assert isinstance(health_data, dict)
        assert "system_health" in health_data
        assert "service_metrics" in health_data
        assert "infrastructure_metrics" in health_data
        assert "security_metrics" in health_data
        assert "performance_trends" in health_data
        
        # Verify system health
        system_health = health_data["system_health"]
        assert "overall_uptime" in system_health
        assert "avg_response_time" in system_health
        assert "error_rate" in system_health
    
    @pytest.mark.asyncio
    async def test_generate_report_complete_workflow(self, reports_system):
        """Test workflow completo de generación de reporte"""
        config = ReportConfig(
            report_id="test_financial",
            report_type=ReportType.FINANCIAL_SUMMARY,
            frequency=ReportFrequency.DAILY,
            recipients=["test@example.com"],
            title="Test Financial Report",
            description="Test report generation",
            include_charts=True
        )
        
        # Mock chart generation to avoid matplotlib issues in tests
        with patch.object(reports_system, '_generate_charts', return_value=[]):
            report_data = await reports_system.generate_report(config)
        
        assert isinstance(report_data, ReportData)
        assert report_data.report_config == config
        assert isinstance(report_data.data, dict)
        assert isinstance(report_data.charts, list)
        assert isinstance(report_data.generated_at, datetime)
    
    @pytest.mark.asyncio
    async def test_create_financial_charts(self, reports_system):
        """Test creación de gráficos financieros"""
        test_data = {
            "revenue_by_channel": {
                "b2c": {"revenue": Decimal('5000.00')},
                "b2b": {"revenue": Decimal('3000.00')},
                "b2b2c": {"revenue": Decimal('2000.00')}
            },
            "monthly_trends": [
                {"month": "Jan", "revenue": Decimal('8000.00')},
                {"month": "Feb", "revenue": Decimal('9000.00')},
                {"month": "Mar", "revenue": Decimal('10000.00')}
            ]
        }
        
        # Mock matplotlib to avoid display issues
        with patch('matplotlib.pyplot.savefig') as mock_savefig, \
             patch('matplotlib.pyplot.close') as mock_close:
            
            # Mock BytesIO to return fake image data
            mock_savefig.return_value = None
            
            with patch('backend.analytics.automated_reports.BytesIO') as mock_bytesio:
                mock_buffer = Mock()
                mock_buffer.getvalue.return_value = b'fake_chart_data'
                mock_bytesio.return_value = mock_buffer
                
                charts = await reports_system._create_financial_charts(test_data)
                
                assert isinstance(charts, list)
                # Should create 2 charts (revenue by channel + monthly trends)
                assert len(charts) >= 1
                mock_close.assert_called()
    
    @pytest.mark.asyncio
    async def test_create_ai_performance_charts(self, reports_system):
        """Test creación de gráficos de performance de IA"""
        test_data = {
            "track_performance": {
                "track_1": {"success_rate": 0.96, "avg_response_time": 0.72},
                "track_2": {"success_rate": 0.89, "avg_response_time": 1.15},
                "track_3": {"success_rate": 0.92, "avg_response_time": 0.98}
            }
        }
        
        with patch('matplotlib.pyplot.savefig') as mock_savefig, \
             patch('matplotlib.pyplot.close') as mock_close:
            
            mock_savefig.return_value = None
            
            with patch('backend.analytics.automated_reports.BytesIO') as mock_bytesio:
                mock_buffer = Mock()
                mock_buffer.getvalue.return_value = b'fake_chart_data'
                mock_bytesio.return_value = mock_buffer
                
                charts = await reports_system._create_ai_performance_charts(test_data)
                
                assert isinstance(charts, list)
                assert len(charts) >= 1
                mock_close.assert_called()
    
    @pytest.mark.asyncio
    async def test_send_email_report(self, reports_system):
        """Test envío de reporte por email"""
        config = ReportConfig(
            report_id="test_email",
            report_type=ReportType.FINANCIAL_SUMMARY,
            frequency=ReportFrequency.DAILY,
            recipients=["test@example.com"],
            title="Test Email Report",
            description="Test"
        )
        
        test_data = {"revenue": Decimal('10000.00')}
        charts = [b'fake_chart_1', b'fake_chart_2']
        
        report_data = ReportData(
            report_config=config,
            data=test_data,
            charts=charts
        )
        
        # Mock email sending
        with patch('smtplib.SMTP') as mock_smtp, \
             patch.object(reports_system, '_generate_html_report', return_value="<html>Test</html>"):
            
            mock_server = Mock()
            mock_smtp.return_value.__enter__.return_value = mock_server
            
            await reports_system._send_email_report(report_data)
            
            # Verify SMTP was called
            mock_smtp.assert_called_once()
            mock_server.send_message.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_generate_html_report(self, reports_system):
        """Test generación de HTML para reporte"""
        config = ReportConfig(
            report_id="test_html",
            report_type=ReportType.AI_PERFORMANCE,
            frequency=ReportFrequency.WEEKLY,
            recipients=["test@example.com"],
            title="Test HTML Report",
            description="Test HTML generation"
        )
        
        test_data = {
            "overview": {"total_agents": 25},
            "performance": {"success_rate": 0.95}
        }
        
        report_data = ReportData(
            report_config=config,
            data=test_data
        )
        
        # Mock Jinja2 template
        with patch.object(reports_system.template_env, 'get_template') as mock_get_template:
            mock_template = Mock()
            mock_template.render.return_value = "<html><h1>Test HTML Report</h1></html>"
            mock_get_template.return_value = mock_template
            
            html_content = await reports_system._generate_html_report(report_data)
            
            assert isinstance(html_content, str)
            assert "<html>" in html_content
            assert "Test HTML Report" in html_content
    
    def test_scheduler_start_stop(self, reports_system):
        """Test inicio y parada del scheduler"""
        # Add a test config
        config = ReportConfig(
            report_id="scheduled_test",
            report_type=ReportType.FINANCIAL_SUMMARY,
            frequency=ReportFrequency.DAILY,
            recipients=["test@example.com"],
            title="Scheduled Test",
            description="Test"
        )
        reports_system.add_report_config(config)
        
        # Mock schedule module
        with patch('backend.analytics.automated_reports.schedule') as mock_schedule, \
             patch('threading.Thread') as mock_thread:
            
            mock_schedule.every.return_value.day.at.return_value.do.return_value = None
            
            # Start scheduler
            reports_system.start_scheduler()
            assert reports_system.scheduler_running is True
            
            # Verify thread was started
            mock_thread.assert_called_once()
            
            # Stop scheduler
            reports_system.stop_scheduler()
            assert reports_system.scheduler_running is False
            mock_schedule.clear.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_generate_and_send_report_workflow(self, reports_system):
        """Test workflow completo de generación y envío"""
        config = ReportConfig(
            report_id="workflow_test",
            report_type=ReportType.CUSTOMER_ANALYTICS,
            frequency=ReportFrequency.WEEKLY,
            recipients=["test@example.com"],
            title="Workflow Test Report",
            description="Test complete workflow",
            delivery_method="email"
        )
        
        # Mock dependencies
        with patch.object(reports_system, 'generate_report') as mock_generate, \
             patch.object(reports_system, '_send_email_report') as mock_send_email:
            
            mock_report_data = ReportData(
                report_config=config,
                data={"test": "data"}
            )
            mock_generate.return_value = mock_report_data
            mock_send_email.return_value = None
            
            await reports_system.generate_and_send_report(config)
            
            mock_generate.assert_called_once_with(config)
            mock_send_email.assert_called_once_with(mock_report_data)
            
            # Verify next_run was updated
            assert config.next_run is not None

class TestReportUtils:
    """Test suite para utilidades de reportes"""
    
    def test_create_default_report_configs(self):
        """Test creación de configuraciones por defecto"""
        configs = create_default_report_configs()
        
        assert isinstance(configs, list)
        assert len(configs) >= 3  # Should have at least 3 default configs
        
        # Verify each config is properly formatted
        for config in configs:
            assert isinstance(config, ReportConfig)
            assert config.report_id is not None
            assert config.report_type is not None
            assert config.frequency is not None
            assert len(config.recipients) > 0
            assert config.title is not None
    
    def test_report_types_enum(self):
        """Test enum de tipos de reportes"""
        # Verify all expected report types exist
        expected_types = [
            "financial_summary",
            "ai_performance", 
            "customer_analytics",
            "operational_health",
            "sales_pipeline",
            "revenue_breakdown",
            "custom_report"
        ]
        
        for expected_type in expected_types:
            # Should not raise exception
            report_type = ReportType(expected_type)
            assert report_type.value == expected_type
    
    def test_report_frequencies_enum(self):
        """Test enum de frecuencias de reportes"""
        expected_frequencies = [
            "daily",
            "weekly",
            "monthly", 
            "quarterly",
            "on_demand"
        ]
        
        for expected_freq in expected_frequencies:
            frequency = ReportFrequency(expected_freq)
            assert frequency.value == expected_freq

@pytest.mark.integration
class TestReportsIntegration:
    """Test de integración para sistema de reportes completo"""
    
    @pytest.mark.asyncio
    async def test_full_reports_workflow_integration(self):
        """Test workflow completo de reportes (integración)"""
        mock_db = Mock()
        smtp_config = {
            "host": "smtp.test.com",
            "port": 587,
            "username": "test",
            "password": "test"
        }
        
        reports_system = AutomatedReportsSystem(mock_db, smtp_config)
        
        # Add multiple report configurations
        configs = create_default_report_configs()
        for config in configs[:2]:  # Test with first 2 configs
            reports_system.add_report_config(config)
        
        assert len(reports_system.reports_config) == 2
        
        # Generate reports for each configuration
        with patch.object(reports_system, '_generate_charts', return_value=[]), \
             patch.object(reports_system, '_send_email_report', new_callable=AsyncMock):
            
            for config in reports_system.reports_config:
                report_data = await reports_system.generate_report(config)
                
                assert isinstance(report_data, ReportData)
                assert report_data.report_config.report_type == config.report_type
                assert isinstance(report_data.data, dict)
                assert len(report_data.data) > 0
    
    @pytest.mark.asyncio
    async def test_error_handling_integration(self):
        """Test manejo de errores en integración completa"""
        mock_db = Mock()
        reports_system = AutomatedReportsSystem(mock_db)
        
        # Test with invalid configuration
        invalid_config = ReportConfig(
            report_id="invalid_test",
            report_type=ReportType.CUSTOM_REPORT,  # This might fail
            frequency=ReportFrequency.DAILY,
            recipients=["test@example.com"],
            title="Invalid Test",
            description="Test error handling"
        )
        
        # Should handle error gracefully
        with patch.object(reports_system, '_generate_custom_report_data') as mock_custom:
            mock_custom.side_effect = Exception("Custom report error")
            
            report_data = await reports_system.generate_report(invalid_config)
            
            # Should still return a ReportData object, possibly with error info
            assert isinstance(report_data, ReportData)

class TestPerformance:
    """Test suite para performance de reportes"""
    
    @pytest.mark.asyncio
    async def test_concurrent_report_generation(self):
        """Test generación concurrente de reportes"""
        mock_db = Mock()
        reports_system = AutomatedReportsSystem(mock_db)
        
        # Create multiple configurations
        configs = []
        for i in range(3):
            config = ReportConfig(
                report_id=f"concurrent_test_{i}",
                report_type=ReportType.FINANCIAL_SUMMARY,
                frequency=ReportFrequency.DAILY,
                recipients=[f"test{i}@example.com"],
                title=f"Concurrent Test {i}",
                description="Concurrent generation test"
            )
            configs.append(config)
        
        # Mock chart generation to speed up tests
        with patch.object(reports_system, '_generate_charts', return_value=[]):
            
            # Generate reports concurrently
            start_time = datetime.utcnow()
            
            tasks = [reports_system.generate_report(config) for config in configs]
            results = await asyncio.gather(*tasks)
            
            end_time = datetime.utcnow()
            execution_time = (end_time - start_time).total_seconds()
            
            # Verify all reports were generated
            assert len(results) == 3
            for result in results:
                assert isinstance(result, ReportData)
            
            # Should complete in reasonable time (less than 10 seconds for 3 reports)
            assert execution_time < 10.0

if __name__ == "__main__":
    # Configurar pytest para running individual
    pytest.main([__file__, "-v", "--tb=short"])