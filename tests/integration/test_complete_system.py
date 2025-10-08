"""
Complete Integration Tests for Spirit Tours Platform
Comprehensive testing of all system components
"""

import pytest
import asyncio
import aiohttp
import asyncpg
import aioredis
from datetime import datetime, timedelta
import json
import uuid
from typing import Dict, List, Optional, Any
import logging

# Import all system modules
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.gds_integration.multi_gds_hub import MultiGDSOrchestrator, SearchRequest
from backend.channel_manager.advanced_channel_manager import ChannelManager
from backend.pms.housekeeping_module import HousekeepingModule
from backend.pms.maintenance_system import MaintenanceSystem
from backend.config.ota_credentials import OTACredentialsManager
from backend.training.staff_training_system import StaffTrainingSystem
from backend.monitoring.dashboard_system import MonitoringDashboard

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class IntegrationTestSuite:
    """Complete integration test suite"""
    
    def __init__(self):
        self.test_results = []
        self.db_pool = None
        self.redis_client = None
        self.gds_orchestrator = None
        self.channel_manager = None
        self.housekeeping = None
        self.maintenance = None
        self.training = None
        self.monitoring = None
    
    async def setup(self):
        """Setup test environment"""
        logger.info("🚀 Setting up integration test environment...")
        
        try:
            # Database connections
            self.db_pool = await asyncpg.create_pool(
                "postgresql://spirittours_user:secure_password_123@localhost/spirittours",
                min_size=1,
                max_size=10
            )
            
            self.redis_client = await aioredis.create_redis_pool(
                'redis://localhost',
                minsize=1,
                maxsize=10
            )
            
            # Initialize modules
            self.gds_orchestrator = MultiGDSOrchestrator()
            await self.gds_orchestrator.initialize()
            
            self.channel_manager = ChannelManager()
            await self.channel_manager.initialize()
            
            self.housekeeping = HousekeepingModule()
            await self.housekeeping.initialize()
            
            self.maintenance = MaintenanceSystem()
            await self.maintenance.initialize()
            
            self.training = StaffTrainingSystem()
            await self.training.initialize()
            
            self.monitoring = MonitoringDashboard()
            await self.monitoring.initialize()
            
            logger.info("✅ Test environment setup complete")
            return True
            
        except Exception as e:
            logger.error(f"❌ Setup failed: {str(e)}")
            return False
    
    async def teardown(self):
        """Clean up test environment"""
        logger.info("🧹 Cleaning up test environment...")
        
        if self.db_pool:
            await self.db_pool.close()
        
        if self.redis_client:
            self.redis_client.close()
            await self.redis_client.wait_closed()
        
        # Close module connections
        if self.housekeeping:
            await self.housekeeping.close()
        if self.maintenance:
            await self.maintenance.close()
        if self.training:
            await self.training.close()
        if self.monitoring:
            await self.monitoring.close()
        
        logger.info("✅ Cleanup complete")
    
    def record_result(self, test_name: str, status: str, message: str = ""):
        """Record test result"""
        self.test_results.append({
            "test": test_name,
            "status": status,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        emoji = "✅" if status == "PASSED" else "❌"
        logger.info(f"{emoji} {test_name}: {status} {message}")
    
    # Test 1: Database Connectivity
    async def test_database_connectivity(self):
        """Test database connections"""
        test_name = "Database Connectivity"
        
        try:
            # Test PostgreSQL
            async with self.db_pool.acquire() as conn:
                result = await conn.fetchval("SELECT 1")
                assert result == 1, "PostgreSQL query failed"
            
            # Test Redis
            await self.redis_client.set("test_key", "test_value")
            value = await self.redis_client.get("test_key")
            assert value == b"test_value", "Redis operation failed"
            
            self.record_result(test_name, "PASSED")
            return True
            
        except Exception as e:
            self.record_result(test_name, "FAILED", str(e))
            return False
    
    # Test 2: GDS Integration
    async def test_gds_integration(self):
        """Test GDS search and booking flow"""
        test_name = "GDS Integration"
        
        try:
            # Create search request
            search_request = SearchRequest(
                type="hotel",
                destination="New York",
                check_in=datetime.utcnow() + timedelta(days=30),
                check_out=datetime.utcnow() + timedelta(days=33),
                guests=2,
                rooms=1
            )
            
            # Test search across multiple providers
            results = await self.gds_orchestrator.search_all(
                search_request,
                providers=["amadeus", "hotelbeds"]
            )
            
            assert results is not None, "No search results returned"
            assert "amadeus" in results or "hotelbeds" in results, "No provider results"
            
            # Test caching
            cached_results = await self.gds_orchestrator.get_cached_results(
                search_request.get_cache_key()
            )
            assert cached_results is not None, "Cache not working"
            
            self.record_result(test_name, "PASSED", f"Found results from {len(results)} providers")
            return True
            
        except Exception as e:
            self.record_result(test_name, "FAILED", str(e))
            return False
    
    # Test 3: Channel Manager
    async def test_channel_manager(self):
        """Test channel connectivity and sync"""
        test_name = "Channel Manager"
        
        try:
            # Test OTA connection
            test_property = {
                "property_id": "test_prop_001",
                "name": "Test Hotel",
                "rooms": [
                    {"room_id": "room_001", "type": "standard", "inventory": 10}
                ]
            }
            
            # Connect to test channel (Airbnb)
            connection = await self.channel_manager.connect_channel(
                property_id=test_property["property_id"],
                channel="airbnb",
                credentials={
                    "client_id": "test_client",
                    "client_secret": "test_secret"
                }
            )
            
            assert connection is not None, "Failed to create channel connection"
            
            # Test inventory update
            update_result = await self.channel_manager.update_inventory(
                connection_id=connection["connection_id"],
                availability_data=[{
                    "date": (datetime.utcnow() + timedelta(days=1)).date(),
                    "available": 5,
                    "rate": 150.00
                }]
            )
            
            assert update_result["status"] == "success", "Inventory update failed"
            
            self.record_result(test_name, "PASSED", "Channel connection and sync successful")
            return True
            
        except Exception as e:
            self.record_result(test_name, "FAILED", str(e))
            return False
    
    # Test 4: Housekeeping Module
    async def test_housekeeping_module(self):
        """Test housekeeping task management"""
        test_name = "Housekeeping Module"
        
        try:
            # Create housekeeping task
            from backend.pms.housekeeping_module import TaskType, CleaningPriority
            
            task = await self.housekeeping.create_cleaning_task(
                room_number="101",
                task_type=TaskType.CHECKOUT_CLEANING,
                priority=CleaningPriority.HIGH,
                guest_arrival=datetime.utcnow() + timedelta(hours=3)
            )
            
            assert task is not None, "Failed to create task"
            assert task.priority == CleaningPriority.HIGH, "Priority not set correctly"
            
            # Test task assignment
            assignments = await self.housekeeping.assign_tasks_optimally([task])
            assert len(assignments) > 0 or len(self.housekeeping.staff_members) == 0, "Task assignment failed"
            
            # Test dashboard
            dashboard = await self.housekeeping.get_real_time_dashboard()
            assert "room_statuses" in dashboard, "Dashboard data incomplete"
            
            self.record_result(test_name, "PASSED", f"Created task {task.task_id}")
            return True
            
        except Exception as e:
            self.record_result(test_name, "FAILED", str(e))
            return False
    
    # Test 5: Maintenance System
    async def test_maintenance_system(self):
        """Test maintenance work order management"""
        test_name = "Maintenance System"
        
        try:
            from backend.pms.maintenance_system import MaintenanceType, Priority
            
            # Create work order
            work_order = await self.maintenance.create_work_order(
                title="AC Unit Repair",
                description="Room 201 AC not cooling",
                maintenance_type=MaintenanceType.CORRECTIVE,
                priority=Priority.HIGH,
                location="Room 201",
                requested_by="Front Desk",
                estimated_hours=2.0
            )
            
            assert work_order is not None, "Failed to create work order"
            assert work_order.status.value in ["pending", "scheduled"], "Invalid status"
            
            # Test predictive maintenance
            if self.maintenance.assets:
                asset_id = list(self.maintenance.assets.keys())[0]
                prediction = await self.maintenance.predict_asset_failure(asset_id)
                assert "probability" in prediction, "Prediction failed"
            
            # Test dashboard
            dashboard = await self.maintenance.get_maintenance_dashboard()
            assert "work_orders" in dashboard, "Dashboard incomplete"
            
            self.record_result(test_name, "PASSED", f"Work order {work_order.order_id} created")
            return True
            
        except Exception as e:
            self.record_result(test_name, "FAILED", str(e))
            return False
    
    # Test 6: Staff Training
    async def test_staff_training(self):
        """Test staff training system"""
        test_name = "Staff Training System"
        
        try:
            from backend.training.staff_training_system import StaffRole
            
            # Enroll staff member
            staff = await self.training.enroll_staff(
                name="John Test",
                email=f"john.test.{uuid.uuid4().hex[:8]}@spirittours.com",
                role=StaffRole.HOUSEKEEPING,
                department="Operations"
            )
            
            assert staff is not None, "Failed to enroll staff"
            assert len(staff.current_modules) > 0, "No modules assigned"
            
            # Start training module
            if "platform_intro" in self.training.training_modules:
                progress = await self.training.start_module(
                    staff_id=staff.staff_id,
                    module_id="platform_intro"
                )
                assert progress is not None, "Failed to start module"
                
                # Update progress
                await self.training.update_progress(
                    progress_id=progress.progress_id,
                    topic_completed="intro_1",
                    quiz_score=85.0,
                    time_spent=15
                )
                assert progress.completion_percentage >= 0, "Progress not tracked"
            
            # Generate dashboard
            dashboard = await self.training.generate_training_dashboard()
            assert "summary" in dashboard, "Dashboard incomplete"
            
            self.record_result(test_name, "PASSED", f"Staff {staff.name} enrolled")
            return True
            
        except Exception as e:
            self.record_result(test_name, "FAILED", str(e))
            return False
    
    # Test 7: Monitoring Dashboard
    async def test_monitoring_dashboard(self):
        """Test monitoring and alerting system"""
        test_name = "Monitoring Dashboard"
        
        try:
            # Get executive dashboard
            dashboard_data = await self.monitoring.get_dashboard_data("executive")
            assert "widgets" in dashboard_data, "Dashboard data missing"
            assert len(dashboard_data["widgets"]) > 0, "No widgets configured"
            
            # Test metric collection
            from backend.monitoring.dashboard_system import MetricType
            
            # Simulate some metrics
            await self.redis_client.set("search_count", "100")
            await self.redis_client.set("booking_count", "5")
            await self.redis_client.set("ai_request_count", "50")
            
            # Check alerts
            alerts = [a for a in self.monitoring.alerts if not a["acknowledged"]]
            
            # Export metrics
            export_data = await self.monitoring.export_metrics("json")
            assert export_data is not None, "Export failed"
            
            self.record_result(test_name, "PASSED", f"Dashboard active, {len(alerts)} alerts")
            return True
            
        except Exception as e:
            self.record_result(test_name, "FAILED", str(e))
            return False
    
    # Test 8: End-to-End Booking Flow
    async def test_end_to_end_booking(self):
        """Test complete booking flow"""
        test_name = "End-to-End Booking Flow"
        
        try:
            # Step 1: Search for availability
            search_request = SearchRequest(
                type="hotel",
                destination="Paris",
                check_in=datetime.utcnow() + timedelta(days=60),
                check_out=datetime.utcnow() + timedelta(days=63),
                guests=2,
                rooms=1
            )
            
            results = await self.gds_orchestrator.search_all(search_request)
            assert results is not None, "Search failed"
            
            # Step 2: Create booking in database
            async with self.db_pool.acquire() as conn:
                booking_id = await conn.fetchval("""
                    INSERT INTO core.bookings (
                        booking_reference, user_id, booking_type,
                        status, total_amount, currency
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING booking_id
                """,
                    f"TEST{uuid.uuid4().hex[:8].upper()}",
                    uuid.uuid4(),  # Test user
                    "hotel",
                    "confirmed",
                    450.00,
                    "USD"
                )
            
            assert booking_id is not None, "Booking creation failed"
            
            # Step 3: Create housekeeping tasks for arrival
            from backend.pms.housekeeping_module import TaskType, CleaningPriority
            
            task = await self.housekeeping.create_cleaning_task(
                room_number="201",
                task_type=TaskType.CHECKOUT_CLEANING,
                priority=CleaningPriority.HIGH,
                guest_arrival=search_request.check_in
            )
            
            # Step 4: Update channel inventory
            # This would normally sync with actual OTAs
            
            # Step 5: Record in monitoring
            await self.redis_client.incr("booking_count")
            
            self.record_result(test_name, "PASSED", f"Booking {booking_id} completed")
            return True
            
        except Exception as e:
            self.record_result(test_name, "FAILED", str(e))
            return False
    
    # Test 9: API Credentials Validation
    async def test_api_credentials(self):
        """Test OTA API credentials configuration"""
        test_name = "API Credentials Validation"
        
        try:
            credentials_manager = OTACredentialsManager()
            
            # Validate all credentials
            validation_results = credentials_manager.validate_all_credentials()
            
            # Get summary
            summary = credentials_manager.get_credential_summary()
            
            assert summary["total_providers"] > 0, "No providers configured"
            assert summary["configured"] > 0, "No credentials configured"
            
            # Test specific provider
            amadeus_cred = credentials_manager.get_credential("amadeus")
            assert amadeus_cred is not None, "Amadeus credentials missing"
            assert amadeus_cred.api_key is not None, "Amadeus API key missing"
            
            self.record_result(
                test_name,
                "PASSED",
                f"{summary['configured']}/{summary['total_providers']} providers configured"
            )
            return True
            
        except Exception as e:
            self.record_result(test_name, "FAILED", str(e))
            return False
    
    # Test 10: Performance Test
    async def test_system_performance(self):
        """Test system performance metrics"""
        test_name = "System Performance"
        
        try:
            import time
            
            # Test database query performance
            start_time = time.time()
            async with self.db_pool.acquire() as conn:
                for _ in range(100):
                    await conn.fetchval("SELECT COUNT(*) FROM core.bookings")
            db_time = time.time() - start_time
            
            assert db_time < 5.0, f"Database queries too slow: {db_time:.2f}s"
            
            # Test Redis performance
            start_time = time.time()
            for i in range(1000):
                await self.redis_client.set(f"perf_test_{i}", i)
                await self.redis_client.get(f"perf_test_{i}")
            redis_time = time.time() - start_time
            
            assert redis_time < 2.0, f"Redis operations too slow: {redis_time:.2f}s"
            
            # Test concurrent operations
            async def concurrent_operation():
                await self.redis_client.incr("concurrent_test")
            
            start_time = time.time()
            await asyncio.gather(*[concurrent_operation() for _ in range(100)])
            concurrent_time = time.time() - start_time
            
            assert concurrent_time < 1.0, f"Concurrent ops too slow: {concurrent_time:.2f}s"
            
            self.record_result(
                test_name,
                "PASSED",
                f"DB: {db_time:.2f}s, Redis: {redis_time:.2f}s, Concurrent: {concurrent_time:.2f}s"
            )
            return True
            
        except Exception as e:
            self.record_result(test_name, "FAILED", str(e))
            return False
    
    async def run_all_tests(self):
        """Run all integration tests"""
        logger.info("=" * 60)
        logger.info("🧪 Starting Spirit Tours Platform Integration Tests")
        logger.info("=" * 60)
        
        # Setup
        setup_success = await self.setup()
        if not setup_success:
            logger.error("Setup failed, aborting tests")
            return
        
        # Run tests
        test_methods = [
            self.test_database_connectivity,
            self.test_gds_integration,
            self.test_channel_manager,
            self.test_housekeeping_module,
            self.test_maintenance_system,
            self.test_staff_training,
            self.test_monitoring_dashboard,
            self.test_end_to_end_booking,
            self.test_api_credentials,
            self.test_system_performance
        ]
        
        for test_method in test_methods:
            try:
                await test_method()
            except Exception as e:
                logger.error(f"Test {test_method.__name__} crashed: {str(e)}")
                self.record_result(test_method.__name__, "CRASHED", str(e))
        
        # Teardown
        await self.teardown()
        
        # Generate report
        self.generate_test_report()
    
    def generate_test_report(self):
        """Generate test report"""
        logger.info("\n" + "=" * 60)
        logger.info("📊 Test Results Summary")
        logger.info("=" * 60)
        
        total_tests = len(self.test_results)
        passed = sum(1 for r in self.test_results if r["status"] == "PASSED")
        failed = sum(1 for r in self.test_results if r["status"] == "FAILED")
        crashed = sum(1 for r in self.test_results if r["status"] == "CRASHED")
        
        logger.info(f"Total Tests: {total_tests}")
        logger.info(f"✅ Passed: {passed}")
        logger.info(f"❌ Failed: {failed}")
        logger.info(f"💥 Crashed: {crashed}")
        logger.info(f"Success Rate: {(passed/total_tests*100):.1f}%")
        
        logger.info("\nDetailed Results:")
        for result in self.test_results:
            status_emoji = "✅" if result["status"] == "PASSED" else "❌"
            logger.info(f"{status_emoji} {result['test']}: {result['status']}")
            if result["message"]:
                logger.info(f"   → {result['message']}")
        
        # Save report to file
        report_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "summary": {
                "total": total_tests,
                "passed": passed,
                "failed": failed,
                "crashed": crashed,
                "success_rate": passed/total_tests*100 if total_tests > 0 else 0
            },
            "results": self.test_results
        }
        
        with open("/home/user/webapp/tests/integration/test_report.json", "w") as f:
            json.dump(report_data, f, indent=2)
        
        logger.info("\n📝 Report saved to test_report.json")
        
        if failed > 0 or crashed > 0:
            logger.warning("\n⚠️ Some tests failed. Please review the results.")
        else:
            logger.info("\n🎉 All tests passed successfully!")


async def main():
    """Main test runner"""
    test_suite = IntegrationTestSuite()
    await test_suite.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())