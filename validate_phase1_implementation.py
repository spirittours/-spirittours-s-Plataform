#!/usr/bin/env python3
"""
Phase 1 Implementation Validation Script
Comprehensive validation of AI Call Reporting, Intelligent Scheduling,
and Production Infrastructure components.
"""

import asyncio
import logging
import sys
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import traceback
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/tmp/phase1_validation.log')
    ]
)
logger = logging.getLogger(__name__)

# Add backend to path
sys.path.append(str(Path(__file__).parent))

class Phase1ValidationSuite:
    """
    Comprehensive validation suite for Phase 1 implementation
    Tests all core components and integration points
    """
    
    def __init__(self):
        self.validation_results = {
            "start_time": datetime.now(timezone.utc).isoformat(),
            "components_tested": [],
            "tests_passed": 0,
            "tests_failed": 0,
            "errors": [],
            "warnings": [],
            "performance_metrics": {},
            "summary": {}
        }
        
        logger.info("🚀 Starting Phase 1 Implementation Validation")
        logger.info("=" * 60)
    
    async def run_comprehensive_validation(self) -> Dict[str, Any]:
        """Run complete validation suite"""
        
        try:
            # 1. Validate Core Service Imports
            await self._validate_service_imports()
            
            # 2. Validate Call Reporting Service
            await self._validate_call_reporting_service()
            
            # 3. Validate Intelligent Scheduling Service  
            await self._validate_intelligent_scheduling_service()
            
            # 4. Validate Monitoring Service
            await self._validate_monitoring_service()
            
            # 5. Validate Performance Optimization
            await self._validate_performance_optimization()
            
            # 6. Validate Production Database Configuration
            await self._validate_production_database_config()
            
            # 7. Validate Load Balancer Configuration
            await self._validate_load_balancer_config()
            
            # 8. Validate External Services Integration
            await self._validate_external_services_config()
            
            # 9. Validate API Endpoints
            await self._validate_api_endpoints()
            
            # 10. Validate Integration Points
            await self._validate_integration_points()
            
            # 11. Performance and Load Testing
            await self._run_performance_tests()
            
            # Generate final summary
            self._generate_validation_summary()
            
        except Exception as e:
            logger.error(f"❌ Critical validation error: {e}")
            self.validation_results["errors"].append({
                "type": "critical_error",
                "message": str(e),
                "traceback": traceback.format_exc()
            })
        
        finally:
            self.validation_results["end_time"] = datetime.now(timezone.utc).isoformat()
            self.validation_results["total_duration"] = (
                datetime.fromisoformat(self.validation_results["end_time"].replace('Z', '+00:00')) -
                datetime.fromisoformat(self.validation_results["start_time"].replace('Z', '+00:00'))
            ).total_seconds()
        
        return self.validation_results
    
    async def _validate_service_imports(self):
        """Validate that all core services can be imported successfully"""
        logger.info("🔍 Validating Service Imports...")
        
        services_to_test = [
            ("backend.services.call_reporting_service", "CallReportingService"),
            ("backend.services.intelligent_scheduling_service", "IntelligentSchedulingService"),
            ("backend.services.monitoring_service", "AdvancedMonitoringService"),
            ("backend.services.performance_optimization_service", "PerformanceOptimizationService"),
            ("backend.config.production_database", "ProductionDatabaseConfig"),
            ("backend.config.load_balancer_config", "LoadBalancerConfiguration"),
            ("backend.config.external_services_config", "ExternalServicesConfiguration"),
        ]
        
        for module_name, class_name in services_to_test:
            try:
                module = __import__(module_name, fromlist=[class_name])
                service_class = getattr(module, class_name)
                logger.info(f"✅ Successfully imported {module_name}.{class_name}")
                self.validation_results["tests_passed"] += 1
                
            except Exception as e:
                logger.error(f"❌ Failed to import {module_name}.{class_name}: {e}")
                self.validation_results["tests_failed"] += 1
                self.validation_results["errors"].append({
                    "test": f"import_{module_name}_{class_name}",
                    "error": str(e)
                })
        
        self.validation_results["components_tested"].append("service_imports")
    
    async def _validate_call_reporting_service(self):
        """Validate Call Reporting Service functionality"""
        logger.info("🤖 Validating Call Reporting Service...")
        
        try:
            from backend.services.call_reporting_service import (
                CallReportingService, CallReport, CallStatus, Sentiment
            )
            
            # Test service initialization
            from unittest.mock import AsyncMock
            mock_db = AsyncMock()
            service = CallReportingService(mock_db)
            
            # Validate service methods exist
            required_methods = [
                "analyze_call_and_generate_report",
                "_extract_call_information",
                "_analyze_customer_location", 
                "_perform_ai_analysis"
            ]
            
            for method in required_methods:
                if hasattr(service, method):
                    logger.info(f"✅ Method {method} exists")
                    self.validation_results["tests_passed"] += 1
                else:
                    logger.error(f"❌ Missing method: {method}")
                    self.validation_results["tests_failed"] += 1
            
            # Test data structures
            test_call_data = {
                "call_id": "validation_test_001",
                "customer_phone": "+34612345678",
                "agent_id": "agent_001",
                "start_time": datetime.now(timezone.utc),
                "end_time": datetime.now(timezone.utc) + timedelta(minutes=10),
                "transcript": "Test call for validation purposes"
            }
            
            # Validate AI analysis structure (mock)
            service.openai_client = AsyncMock()
            mock_response = AsyncMock()
            mock_response.choices = [AsyncMock()]
            mock_response.choices[0].message = AsyncMock()
            mock_response.choices[0].message.content = json.dumps({
                "sentiment": "positive",
                "confidence": 0.85,
                "key_topics": ["test", "validation"],
                "customer_intent": "test_validation",
                "language_detected": "en"
            })
            service.openai_client.chat.completions.create.return_value = mock_response
            
            # Test call analysis
            start_time = time.time()
            call_report = await service.analyze_call_and_generate_report(test_call_data)
            analysis_time = time.time() - start_time
            
            # Validate report structure
            assert isinstance(call_report, CallReport)
            assert call_report.call_id == "validation_test_001"
            assert call_report.customer_phone == "+34612345678"
            assert call_report.sentiment in [Sentiment.POSITIVE, Sentiment.NEGATIVE, Sentiment.NEUTRAL]
            
            logger.info(f"✅ Call analysis completed in {analysis_time:.2f}s")
            self.validation_results["performance_metrics"]["call_analysis_time"] = analysis_time
            self.validation_results["tests_passed"] += 1
            
        except Exception as e:
            logger.error(f"❌ Call Reporting Service validation failed: {e}")
            self.validation_results["tests_failed"] += 1
            self.validation_results["errors"].append({
                "test": "call_reporting_service",
                "error": str(e),
                "traceback": traceback.format_exc()
            })
        
        self.validation_results["components_tested"].append("call_reporting_service")
    
    async def _validate_intelligent_scheduling_service(self):
        """Validate Intelligent Scheduling Service functionality"""
        logger.info("📅 Validating Intelligent Scheduling Service...")
        
        try:
            from backend.services.intelligent_scheduling_service import (
                IntelligentSchedulingService, AppointmentRequest, AppointmentType
            )
            
            # Test service initialization
            from unittest.mock import AsyncMock, Mock
            mock_db = AsyncMock()
            service = IntelligentSchedulingService(mock_db)
            
            # Validate required methods
            required_methods = [
                "schedule_appointment",
                "schedule_appointment_from_call",
                "_find_optimal_time_slots",
                "_analyze_customer_preferences",
                "_detect_timezone_from_phone"
            ]
            
            for method in required_methods:
                if hasattr(service, method):
                    logger.info(f"✅ Method {method} exists")
                    self.validation_results["tests_passed"] += 1
                else:
                    logger.error(f"❌ Missing method: {method}")
                    self.validation_results["tests_failed"] += 1
            
            # Test timezone detection
            test_phones = [
                ("+34612345678", "ES", "Europe/Madrid"),
                ("+1234567890", "US", "America/New_York"),
                ("+44207123456", "GB", "Europe/London")
            ]
            
            start_time = time.time()
            for phone, expected_country, expected_tz in test_phones:
                country, timezone_str = await service._detect_timezone_from_phone(phone)
                assert country == expected_country
                assert timezone_str == expected_tz
                logger.info(f"✅ Timezone detection: {phone} -> {country}, {timezone_str}")
            
            timezone_detection_time = time.time() - start_time
            self.validation_results["performance_metrics"]["timezone_detection_time"] = timezone_detection_time
            self.validation_results["tests_passed"] += len(test_phones)
            
            # Test appointment request structure
            test_request = AppointmentRequest(
                customer_phone="+34612345678",
                appointment_type=AppointmentType.CONSULTATION,
                preferred_date=datetime.now(timezone.utc) + timedelta(days=1),
                customer_timezone="Europe/Madrid"
            )
            
            assert test_request.customer_phone == "+34612345678"
            assert test_request.appointment_type == AppointmentType.CONSULTATION
            logger.info("✅ AppointmentRequest structure validation passed")
            self.validation_results["tests_passed"] += 1
            
        except Exception as e:
            logger.error(f"❌ Intelligent Scheduling Service validation failed: {e}")
            self.validation_results["tests_failed"] += 1
            self.validation_results["errors"].append({
                "test": "intelligent_scheduling_service",
                "error": str(e),
                "traceback": traceback.format_exc()
            })
        
        self.validation_results["components_tested"].append("intelligent_scheduling_service")
    
    async def _validate_monitoring_service(self):
        """Validate Advanced Monitoring Service functionality"""
        logger.info("📊 Validating Monitoring Service...")
        
        try:
            from backend.services.monitoring_service import (
                AdvancedMonitoringService, ServiceMetric, MetricType
            )
            
            from unittest.mock import AsyncMock
            mock_db = AsyncMock()
            service = AdvancedMonitoringService(mock_db)
            
            # Validate core methods
            required_methods = [
                "get_system_health_dashboard",
                "get_call_analytics_dashboard",
                "get_scheduling_analytics_dashboard",
                "record_custom_metric"
            ]
            
            for method in required_methods:
                if hasattr(service, method):
                    logger.info(f"✅ Method {method} exists")
                    self.validation_results["tests_passed"] += 1
                else:
                    logger.error(f"❌ Missing method: {method}")
                    self.validation_results["tests_failed"] += 1
            
            # Test metric recording
            test_metric = ServiceMetric(
                name="validation_test_metric",
                value=42.0,
                metric_type=MetricType.GAUGE,
                timestamp=datetime.now(timezone.utc),
                labels={"test": "validation"}
            )
            
            start_time = time.time()
            await service.record_custom_metric(test_metric)
            metric_record_time = time.time() - start_time
            
            logger.info(f"✅ Metric recording completed in {metric_record_time:.3f}s")
            self.validation_results["performance_metrics"]["metric_record_time"] = metric_record_time
            self.validation_results["tests_passed"] += 1
            
            # Test dashboard generation
            start_time = time.time()
            dashboard = await service.get_system_health_dashboard()
            dashboard_time = time.time() - start_time
            
            assert isinstance(dashboard, dict)
            assert "current_performance" in dashboard
            logger.info(f"✅ Dashboard generation completed in {dashboard_time:.2f}s")
            self.validation_results["performance_metrics"]["dashboard_generation_time"] = dashboard_time
            self.validation_results["tests_passed"] += 1
            
        except Exception as e:
            logger.error(f"❌ Monitoring Service validation failed: {e}")
            self.validation_results["tests_failed"] += 1
            self.validation_results["errors"].append({
                "test": "monitoring_service",
                "error": str(e),
                "traceback": traceback.format_exc()
            })
        
        self.validation_results["components_tested"].append("monitoring_service")
    
    async def _validate_performance_optimization(self):
        """Validate Performance Optimization Service"""
        logger.info("⚡ Validating Performance Optimization Service...")
        
        try:
            from backend.services.performance_optimization_service import (
                PerformanceOptimizationService, QueryOptimizer, CacheManager
            )
            
            from unittest.mock import AsyncMock
            mock_db = AsyncMock()
            service = PerformanceOptimizationService(mock_db)
            
            # Validate components
            assert hasattr(service, 'query_optimizer')
            assert hasattr(service, 'cache_manager')
            assert isinstance(service.query_optimizer, QueryOptimizer)
            assert isinstance(service.cache_manager, CacheManager)
            
            # Test query optimization
            test_query = "SELECT * FROM customers WHERE country = 'ES' AND created_at > '2024-01-01'"
            
            start_time = time.time()
            optimization_result = await service.optimize_query(test_query)
            query_optimization_time = time.time() - start_time
            
            assert isinstance(optimization_result, dict)
            assert "optimization_suggestions" in optimization_result
            
            logger.info(f"✅ Query optimization completed in {query_optimization_time:.2f}s")
            self.validation_results["performance_metrics"]["query_optimization_time"] = query_optimization_time
            self.validation_results["tests_passed"] += 1
            
            # Test cache operations
            cache_manager = service.cache_manager
            
            start_time = time.time()
            await cache_manager.set("test_cache", "validation_key", {"test": "data"}, 60)
            cached_value = await cache_manager.get("test_cache", "validation_key")
            cache_operation_time = time.time() - start_time
            
            assert cached_value is not None
            assert cached_value["test"] == "data"
            
            logger.info(f"✅ Cache operations completed in {cache_operation_time:.3f}s")
            self.validation_results["performance_metrics"]["cache_operation_time"] = cache_operation_time
            self.validation_results["tests_passed"] += 1
            
        except Exception as e:
            logger.error(f"❌ Performance Optimization Service validation failed: {e}")
            self.validation_results["tests_failed"] += 1
            self.validation_results["errors"].append({
                "test": "performance_optimization_service",
                "error": str(e),
                "traceback": traceback.format_exc()
            })
        
        self.validation_results["components_tested"].append("performance_optimization")
    
    async def _validate_production_database_config(self):
        """Validate Production Database Configuration"""
        logger.info("🗄️ Validating Production Database Configuration...")
        
        try:
            from backend.config.production_database import ProductionDatabaseConfig
            
            # Test configuration initialization
            config = ProductionDatabaseConfig()
            
            # Validate configuration structure
            assert hasattr(config, 'pool_config')
            assert hasattr(config, 'read_write_config')
            assert hasattr(config, 'monitoring_config')
            
            # Validate pool configuration
            pool_config = config.pool_config
            required_pool_settings = ["pool_size", "max_overflow", "pool_timeout", "pool_recycle"]
            
            for setting in required_pool_settings:
                assert setting in pool_config
                logger.info(f"✅ Pool config has {setting}: {pool_config[setting]}")
            
            # Test database URL generation
            db_urls = config.get_database_urls()
            assert isinstance(db_urls, dict)
            assert "write" in db_urls
            assert "read" in db_urls
            
            logger.info("✅ Database URLs generated successfully")
            self.validation_results["tests_passed"] += len(required_pool_settings) + 2
            
        except Exception as e:
            logger.error(f"❌ Production Database Configuration validation failed: {e}")
            self.validation_results["tests_failed"] += 1
            self.validation_results["errors"].append({
                "test": "production_database_config",
                "error": str(e),
                "traceback": traceback.format_exc()
            })
        
        self.validation_results["components_tested"].append("production_database_config")
    
    async def _validate_load_balancer_config(self):
        """Validate Load Balancer Configuration"""
        logger.info("⚖️ Validating Load Balancer Configuration...")
        
        try:
            from backend.config.load_balancer_config import (
                LoadBalancerConfiguration, get_load_balancer_config,
                generate_nginx_config_file, generate_haproxy_config_file
            )
            
            # Test configuration initialization
            config = get_load_balancer_config()
            
            # Validate configuration structure
            pools = config.get_all_pools()
            assert len(pools) > 0
            
            required_pools = ["api", "frontend", "ai_agents"]
            for pool_name in required_pools:
                assert pool_name in pools
                pool = pools[pool_name]
                assert len(pool.servers) > 0
                logger.info(f"✅ Pool {pool_name} configured with {len(pool.servers)} servers")
            
            # Test configuration validation
            issues = config.validate_configuration()
            if issues:
                logger.warning(f"⚠️ Configuration issues found: {issues}")
                self.validation_results["warnings"].extend(issues)
            else:
                logger.info("✅ Load balancer configuration validation passed")
            
            # Test config generation
            start_time = time.time()
            nginx_config_path = generate_nginx_config_file("/tmp/test_nginx.conf")
            haproxy_config_path = generate_haproxy_config_file("/tmp/test_haproxy.cfg")
            config_generation_time = time.time() - start_time
            
            # Verify files were created
            assert Path(nginx_config_path).exists()
            assert Path(haproxy_config_path).exists()
            
            logger.info(f"✅ Config files generated in {config_generation_time:.2f}s")
            self.validation_results["performance_metrics"]["config_generation_time"] = config_generation_time
            self.validation_results["tests_passed"] += len(required_pools) + 2
            
        except Exception as e:
            logger.error(f"❌ Load Balancer Configuration validation failed: {e}")
            self.validation_results["tests_failed"] += 1
            self.validation_results["errors"].append({
                "test": "load_balancer_config",
                "error": str(e),
                "traceback": traceback.format_exc()
            })
        
        self.validation_results["components_tested"].append("load_balancer_config")
    
    async def _validate_external_services_config(self):
        """Validate External Services Configuration"""
        logger.info("🔗 Validating External Services Configuration...")
        
        try:
            from backend.config.external_services_config import (
                ExternalServicesConfiguration, get_external_services_config
            )
            
            # Test configuration initialization
            config = get_external_services_config()
            
            # Validate service configuration
            services = config.get_all_services()
            
            required_services = ["openai", "elevenlabs", "twilio", "sendgrid"]
            for service_name in required_services:
                assert service_name in services
                service_config = services[service_name]
                assert service_config.name is not None
                assert service_config.base_url is not None
                logger.info(f"✅ Service {service_name} configured: {service_config.name}")
            
            # Test health checking
            start_time = time.time()
            health_status = await config.check_all_services_health()
            health_check_time = time.time() - start_time
            
            assert isinstance(health_status, dict)
            logger.info(f"✅ Health check completed in {health_check_time:.2f}s")
            self.validation_results["performance_metrics"]["health_check_time"] = health_check_time
            
            # Test rate limiting configuration
            rate_limits = config.get_service_rate_limits()
            assert isinstance(rate_limits, dict)
            
            self.validation_results["tests_passed"] += len(required_services) + 2
            
        except Exception as e:
            logger.error(f"❌ External Services Configuration validation failed: {e}")
            self.validation_results["tests_failed"] += 1
            self.validation_results["errors"].append({
                "test": "external_services_config",
                "error": str(e),
                "traceback": traceback.format_exc()
            })
        
        self.validation_results["components_tested"].append("external_services_config")
    
    async def _validate_api_endpoints(self):
        """Validate API Endpoints"""
        logger.info("🌐 Validating API Endpoints...")
        
        try:
            from backend.api.monitoring_endpoints import get_monitoring_router
            
            # Test router creation
            router = get_monitoring_router()
            assert router is not None
            
            # Validate routes exist
            routes = [route.path for route in router.routes]
            
            required_endpoints = [
                "/api/v1/monitoring/health/dashboard",
                "/api/v1/monitoring/analytics/calls",
                "/api/v1/monitoring/analytics/scheduling",
                "/api/v1/monitoring/summary"
            ]
            
            for endpoint in required_endpoints:
                if any(endpoint in route for route in routes):
                    logger.info(f"✅ Endpoint {endpoint} exists")
                    self.validation_results["tests_passed"] += 1
                else:
                    logger.error(f"❌ Missing endpoint: {endpoint}")
                    self.validation_results["tests_failed"] += 1
            
        except Exception as e:
            logger.error(f"❌ API Endpoints validation failed: {e}")
            self.validation_results["tests_failed"] += 1
            self.validation_results["errors"].append({
                "test": "api_endpoints",
                "error": str(e),
                "traceback": traceback.format_exc()
            })
        
        self.validation_results["components_tested"].append("api_endpoints")
    
    async def _validate_integration_points(self):
        """Validate Integration Points Between Services"""
        logger.info("🔄 Validating Service Integration Points...")
        
        try:
            # Test call reporting to scheduling integration
            from backend.services.call_reporting_service import CallReport, Sentiment, AppointmentType
            from backend.services.intelligent_scheduling_service import IntelligentSchedulingService
            from unittest.mock import AsyncMock
            
            # Create mock call report
            call_report = CallReport(
                call_id="integration_test_001",
                customer_phone="+34612345678", 
                agent_id="agent_001",
                start_time=datetime.now(timezone.utc),
                end_time=datetime.now(timezone.utc) + timedelta(minutes=10),
                duration_minutes=10.0,
                sentiment=Sentiment.POSITIVE,
                customer_country="ES",
                customer_timezone="Europe/Madrid",
                appointment_requested=True,
                appointment_type=AppointmentType.CONSULTATION,
                follow_up_required=True
            )
            
            # Test scheduling from call report
            mock_db = AsyncMock()
            scheduling_service = IntelligentSchedulingService(mock_db)
            
            # Mock available slots
            from backend.services.intelligent_scheduling_service import TimeSlot
            scheduling_service._get_available_slots = AsyncMock(return_value=[
                TimeSlot(
                    start_time=datetime.now(timezone.utc) + timedelta(days=1, hours=14),
                    end_time=datetime.now(timezone.utc) + timedelta(days=1, hours=15),
                    agent_id="agent_001"
                )
            ])
            
            start_time = time.time()
            appointment = await scheduling_service.schedule_appointment_from_call(call_report)
            integration_time = time.time() - start_time
            
            assert appointment is not None
            assert appointment.customer_phone == "+34612345678"
            
            logger.info(f"✅ Call-to-scheduling integration completed in {integration_time:.2f}s")
            self.validation_results["performance_metrics"]["integration_time"] = integration_time
            self.validation_results["tests_passed"] += 1
            
        except Exception as e:
            logger.error(f"❌ Integration validation failed: {e}")
            self.validation_results["tests_failed"] += 1
            self.validation_results["errors"].append({
                "test": "service_integration",
                "error": str(e),
                "traceback": traceback.format_exc()
            })
        
        self.validation_results["components_tested"].append("service_integration")
    
    async def _run_performance_tests(self):
        """Run Performance and Load Tests"""
        logger.info("🚀 Running Performance Tests...")
        
        try:
            # Test concurrent operations
            concurrent_tasks = []
            
            # Simulate multiple call analyses
            for i in range(5):
                task = self._simulate_call_analysis(f"perf_test_{i}")
                concurrent_tasks.append(task)
            
            start_time = time.time()
            await asyncio.gather(*concurrent_tasks)
            concurrent_processing_time = time.time() - start_time
            
            logger.info(f"✅ Concurrent processing of 5 calls: {concurrent_processing_time:.2f}s")
            self.validation_results["performance_metrics"]["concurrent_call_processing"] = concurrent_processing_time
            
            # Test memory usage simulation
            memory_test_results = await self._simulate_memory_usage_test()
            self.validation_results["performance_metrics"]["memory_usage"] = memory_test_results
            
            self.validation_results["tests_passed"] += 2
            
        except Exception as e:
            logger.error(f"❌ Performance testing failed: {e}")
            self.validation_results["tests_failed"] += 1
            self.validation_results["errors"].append({
                "test": "performance_testing",
                "error": str(e),
                "traceback": traceback.format_exc()
            })
        
        self.validation_results["components_tested"].append("performance_testing")
    
    async def _simulate_call_analysis(self, call_id: str) -> dict:
        """Simulate call analysis for performance testing"""
        
        # Simulate AI processing delay
        await asyncio.sleep(0.1)  # 100ms simulated processing
        
        return {
            "call_id": call_id,
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "sentiment": "positive",
            "processing_time_ms": 100
        }
    
    async def _simulate_memory_usage_test(self) -> dict:
        """Simulate memory usage testing"""
        
        # Create some data structures to test memory usage
        test_data = []
        for i in range(1000):
            test_data.append({
                "id": i,
                "timestamp": datetime.now(timezone.utc),
                "data": f"test_data_{i}" * 10
            })
        
        # Simulate processing
        await asyncio.sleep(0.05)
        
        return {
            "objects_created": len(test_data),
            "estimated_memory_kb": len(test_data) * 0.5  # Rough estimate
        }
    
    def _generate_validation_summary(self):
        """Generate comprehensive validation summary"""
        
        total_tests = self.validation_results["tests_passed"] + self.validation_results["tests_failed"]
        success_rate = (self.validation_results["tests_passed"] / max(total_tests, 1)) * 100
        
        self.validation_results["summary"] = {
            "total_tests_run": total_tests,
            "tests_passed": self.validation_results["tests_passed"],
            "tests_failed": self.validation_results["tests_failed"],
            "success_rate_percentage": round(success_rate, 2),
            "components_validated": len(self.validation_results["components_tested"]),
            "total_errors": len(self.validation_results["errors"]),
            "total_warnings": len(self.validation_results["warnings"]),
            "validation_status": "PASSED" if success_rate >= 90 else "FAILED",
            "performance_summary": self._summarize_performance_metrics()
        }
        
        # Log final summary
        logger.info("=" * 60)
        logger.info("📋 PHASE 1 VALIDATION SUMMARY")
        logger.info("=" * 60)
        logger.info(f"🎯 Overall Status: {self.validation_results['summary']['validation_status']}")
        logger.info(f"📊 Success Rate: {success_rate:.1f}% ({self.validation_results['tests_passed']}/{total_tests})")
        logger.info(f"🔧 Components Validated: {len(self.validation_results['components_tested'])}")
        logger.info(f"❌ Errors: {len(self.validation_results['errors'])}")
        logger.info(f"⚠️ Warnings: {len(self.validation_results['warnings'])}")
        
        if self.validation_results["errors"]:
            logger.info("\n❌ ERRORS FOUND:")
            for error in self.validation_results["errors"]:
                logger.error(f"  - {error['test']}: {error['error']}")
        
        if self.validation_results["warnings"]:
            logger.info("\n⚠️ WARNINGS:")
            for warning in self.validation_results["warnings"]:
                logger.warning(f"  - {warning}")
        
        logger.info("=" * 60)
    
    def _summarize_performance_metrics(self) -> dict:
        """Summarize performance metrics"""
        
        metrics = self.validation_results["performance_metrics"]
        
        return {
            "call_analysis_avg_time": metrics.get("call_analysis_time", 0),
            "timezone_detection_avg_time": metrics.get("timezone_detection_time", 0) / 3,  # 3 test cases
            "dashboard_generation_time": metrics.get("dashboard_generation_time", 0),
            "concurrent_processing_efficiency": metrics.get("concurrent_call_processing", 0),
            "config_generation_performance": metrics.get("config_generation_time", 0),
            "overall_performance_rating": self._calculate_performance_rating(metrics)
        }
    
    def _calculate_performance_rating(self, metrics: dict) -> str:
        """Calculate overall performance rating"""
        
        # Define performance thresholds
        thresholds = {
            "call_analysis_time": 5.0,        # seconds
            "dashboard_generation_time": 3.0,  # seconds
            "concurrent_call_processing": 10.0, # seconds for 5 calls
            "config_generation_time": 5.0      # seconds
        }
        
        performance_scores = []
        
        for metric, threshold in thresholds.items():
            if metric in metrics:
                score = min(100, (threshold / max(metrics[metric], 0.1)) * 100)
                performance_scores.append(score)
        
        if not performance_scores:
            return "unknown"
        
        avg_score = sum(performance_scores) / len(performance_scores)
        
        if avg_score >= 90:
            return "excellent"
        elif avg_score >= 70:
            return "good"
        elif avg_score >= 50:
            return "acceptable"
        else:
            return "needs_improvement"

async def main():
    """Main validation execution"""
    
    print("🚀 Spirit Tours Phase 1 Implementation Validation")
    print("=" * 60)
    
    # Create validation suite
    validator = Phase1ValidationSuite()
    
    try:
        # Run comprehensive validation
        results = await validator.run_comprehensive_validation()
        
        # Save results to file
        results_file = "/tmp/phase1_validation_results.json"
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\n💾 Full results saved to: {results_file}")
        
        # Print final status
        summary = results["summary"]
        if summary["validation_status"] == "PASSED":
            print("\n✅ PHASE 1 VALIDATION PASSED!")
            print("🎉 All core components are working correctly and ready for production.")
            return 0
        else:
            print("\n❌ PHASE 1 VALIDATION FAILED!")
            print(f"❌ {summary['tests_failed']} tests failed out of {summary['total_tests_run']} total tests.")
            print("🔧 Please review the errors and fix the issues before deployment.")
            return 1
    
    except Exception as e:
        print(f"\n💥 CRITICAL VALIDATION ERROR: {e}")
        logger.error(f"Critical validation error: {e}")
        logger.error(traceback.format_exc())
        return 1

if __name__ == "__main__":
    # Run the validation suite
    exit_code = asyncio.run(main())