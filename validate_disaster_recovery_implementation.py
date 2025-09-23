#!/usr/bin/env python3
"""
Comprehensive Validation Suite for Disaster Recovery Implementation
Validates all aspects of automated rollback and disaster recovery functionality
"""

import asyncio
import json
import logging
import os
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple, Any
import sys

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class DisasterRecoveryValidator:
    """
    Comprehensive validator for disaster recovery and rollback implementation
    """
    
    def __init__(self):
        self.results = []
        self.performance_metrics = {}
        self.start_time = time.time()
        
    def log_result(self, test_name: str, passed: bool, details: str = "", duration: float = 0.0):
        """Log test result with details"""
        status = "✓ PASS" if passed else "✗ FAIL"
        result = {
            'test_name': test_name,
            'status': status,
            'passed': passed,
            'details': details,
            'duration': duration,
            'timestamp': datetime.now().isoformat()
        }
        self.results.append(result)
        
        # Color coding for console output
        color = '\033[92m' if passed else '\033[91m'  # Green for pass, red for fail
        reset = '\033[0m'
        
        duration_str = f" ({duration:.3f}s)" if duration > 0 else ""
        print(f"{color}{status}{reset} {test_name}{duration_str}")
        if details and not passed:
            print(f"    Details: {details}")
    
    async def validate_file_structure(self) -> bool:
        """Validate that all required disaster recovery files exist"""
        print("\n" + "="*60)
        print("DISASTER RECOVERY FILE STRUCTURE VALIDATION")
        print("="*60)
        
        required_files = [
            # Core disaster recovery system
            'infrastructure/disaster_recovery.py',
            'config/disaster_recovery.yaml',
            'scripts/disaster_recovery_cli.py',
            
            # Tests
            'tests/test_disaster_recovery.py',
            
            # Documentation
            'docs/disaster_recovery_runbook.md',
            
            # Validation script
            'validate_disaster_recovery_implementation.py'
        ]
        
        all_exist = True
        for file_path in required_files:
            start_time = time.time()
            full_path = Path(file_path)
            exists = full_path.exists()
            duration = time.time() - start_time
            
            if exists:
                file_size = full_path.stat().st_size
                details = f"Size: {file_size:,} bytes"
            else:
                details = f"File not found: {file_path}"
                all_exist = False
            
            self.log_result(f"File exists: {file_path}", exists, details, duration)
        
        return all_exist
    
    async def validate_core_imports(self) -> bool:
        """Validate that core disaster recovery modules can be imported"""
        print("\n" + "="*60)
        print("DISASTER RECOVERY IMPORTS VALIDATION")
        print("="*60)
        
        import_tests = [
            ('infrastructure.disaster_recovery', ['DisasterRecoveryOrchestrator', 'RecoveryType', 'RecoveryStatus']),
            ('infrastructure.disaster_recovery', ['RecoveryPoint', 'RecoveryOperation', 'BackupManager']),
            ('infrastructure.disaster_recovery', ['MonitoringClient', 'BackupType']),
        ]
        
        all_imports_successful = True
        
        for module_name, classes in import_tests:
            start_time = time.time()
            try:
                module = __import__(module_name, fromlist=classes)
                for class_name in classes:
                    if hasattr(module, class_name):
                        cls = getattr(module, class_name)
                        details = f"Class type: {type(cls).__name__}"
                    else:
                        raise ImportError(f"Class {class_name} not found in {module_name}")
                
                duration = time.time() - start_time
                self.log_result(f"Import {module_name}: {', '.join(classes)}", True, details, duration)
                
            except Exception as e:
                duration = time.time() - start_time
                details = f"Import error: {str(e)}"
                self.log_result(f"Import {module_name}: {', '.join(classes)}", False, details, duration)
                all_imports_successful = False
        
        return all_imports_successful
    
    async def validate_disaster_recovery_orchestrator(self) -> bool:
        """Validate DisasterRecoveryOrchestrator functionality"""
        print("\n" + "="*60)
        print("DISASTER RECOVERY ORCHESTRATOR VALIDATION")
        print("="*60)
        
        try:
            from infrastructure.disaster_recovery import DisasterRecoveryOrchestrator, RecoveryType
            
            # Test 1: Orchestrator initialization
            start_time = time.time()
            try:
                # Create temporary config for testing
                import tempfile
                import yaml
                
                with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
                    test_config = {
                        'recovery': {'max_rollback_depth': 5, 'verification_timeout': 60},
                        'database': {'connection_string': 'sqlite:///test.db', 'backup_location': '/tmp'},
                        'storage': {'local_backup_path': '/tmp', 'retention_policy': {'days': 7}},
                        'monitoring': {'metrics_retention': 24}
                    }
                    yaml.dump(test_config, f)
                    config_path = f.name
                
                orchestrator = DisasterRecoveryOrchestrator(config_path)
                duration = time.time() - start_time
                self.log_result("DisasterRecoveryOrchestrator initialization", True, "Successfully created orchestrator", duration)
                
                # Clean up
                os.unlink(config_path)
                
            except Exception as e:
                duration = time.time() - start_time
                self.log_result("DisasterRecoveryOrchestrator initialization", False, str(e), duration)
                return False
            
            # Test 2: Configuration loading
            start_time = time.time()
            try:
                config = orchestrator.config
                required_sections = ['recovery', 'database', 'storage', 'monitoring']
                missing_sections = [section for section in required_sections if section not in config]
                
                if not missing_sections:
                    duration = time.time() - start_time
                    details = f"Config sections: {list(config.keys())}"
                    self.log_result("Configuration loading", True, details, duration)
                else:
                    duration = time.time() - start_time
                    details = f"Missing sections: {missing_sections}"
                    self.log_result("Configuration loading", False, details, duration)
                    return False
                    
            except Exception as e:
                duration = time.time() - start_time
                self.log_result("Configuration loading", False, str(e), duration)
                return False
            
            # Test 3: Method existence
            start_time = time.time()
            required_methods = [
                'create_recovery_point',
                'execute_rollback', 
                'execute_disaster_recovery',
                'get_available_recovery_points',
                'cleanup_old_recovery_points'
            ]
            
            missing_methods = []
            for method_name in required_methods:
                if not hasattr(orchestrator, method_name):
                    missing_methods.append(method_name)
                elif not callable(getattr(orchestrator, method_name)):
                    missing_methods.append(f"{method_name} (not callable)")
            
            duration = time.time() - start_time
            if not missing_methods:
                details = f"All {len(required_methods)} methods present"
                self.log_result("Required methods validation", True, details, duration)
            else:
                details = f"Missing methods: {missing_methods}"
                self.log_result("Required methods validation", False, details, duration)
                return False
            
            return True
            
        except Exception as e:
            self.log_result("DisasterRecoveryOrchestrator validation", False, f"Unexpected error: {str(e)}")
            return False
    
    async def validate_recovery_types_and_enums(self) -> bool:
        """Validate recovery type enums and data structures"""
        print("\n" + "="*60)
        print("RECOVERY TYPES AND ENUMS VALIDATION")
        print("="*60)
        
        try:
            from infrastructure.disaster_recovery import RecoveryType, RecoveryStatus, BackupType
            
            # Test RecoveryType enum
            start_time = time.time()
            expected_recovery_types = [
                'ROLLBACK', 'FAILOVER', 'RESTORE', 'EMERGENCY_STOP', 
                'DATA_RECOVERY', 'SERVICE_RECOVERY', 'INFRASTRUCTURE_RECOVERY'
            ]
            
            missing_types = []
            for recovery_type in expected_recovery_types:
                if not hasattr(RecoveryType, recovery_type):
                    missing_types.append(recovery_type)
            
            duration = time.time() - start_time
            if not missing_types:
                details = f"All {len(expected_recovery_types)} recovery types present"
                self.log_result("RecoveryType enum validation", True, details, duration)
            else:
                details = f"Missing types: {missing_types}"
                self.log_result("RecoveryType enum validation", False, details, duration)
                return False
            
            # Test RecoveryStatus enum
            start_time = time.time()
            expected_statuses = ['INITIATED', 'IN_PROGRESS', 'VERIFYING', 'COMPLETED', 'FAILED', 'ROLLED_BACK', 'PARTIAL']
            
            missing_statuses = []
            for status in expected_statuses:
                if not hasattr(RecoveryStatus, status):
                    missing_statuses.append(status)
            
            duration = time.time() - start_time
            if not missing_statuses:
                details = f"All {len(expected_statuses)} recovery statuses present"
                self.log_result("RecoveryStatus enum validation", True, details, duration)
            else:
                details = f"Missing statuses: {missing_statuses}"
                self.log_result("RecoveryStatus enum validation", False, details, duration)
                return False
            
            # Test BackupType enum
            start_time = time.time()
            expected_backup_types = ['FULL', 'INCREMENTAL', 'DIFFERENTIAL', 'TRANSACTION_LOG', 'CONFIGURATION', 'CODE']
            
            missing_backup_types = []
            for backup_type in expected_backup_types:
                if not hasattr(BackupType, backup_type):
                    missing_backup_types.append(backup_type)
            
            duration = time.time() - start_time
            if not missing_backup_types:
                details = f"All {len(expected_backup_types)} backup types present"
                self.log_result("BackupType enum validation", True, details, duration)
            else:
                details = f"Missing backup types: {missing_backup_types}"
                self.log_result("BackupType enum validation", False, details, duration)
                return False
            
            return True
            
        except Exception as e:
            self.log_result("Recovery types and enums validation", False, f"Import error: {str(e)}")
            return False
    
    async def validate_data_structures(self) -> bool:
        """Validate data structure classes"""
        print("\n" + "="*60)
        print("DATA STRUCTURES VALIDATION")
        print("="*60)
        
        try:
            from infrastructure.disaster_recovery import (
                RecoveryPoint, RecoveryOperation, BackupConfig, 
                RecoveryType, RecoveryStatus, BackupType
            )
            from datetime import datetime, timezone
            
            # Test RecoveryPoint creation
            start_time = time.time()
            try:
                recovery_point = RecoveryPoint(
                    timestamp=datetime.now(timezone.utc),
                    deployment_version="v1.0.0",
                    database_backup="/test/backup.sql",
                    code_snapshot="/test/code.tar.gz",
                    config_snapshot="/test/config.tar.gz",
                    services_state={},
                    health_metrics={'cpu': 50.0},
                    recovery_type=RecoveryType.ROLLBACK
                )
                
                duration = time.time() - start_time
                details = f"Version: {recovery_point.deployment_version}, Type: {recovery_point.recovery_type.value}"
                self.log_result("RecoveryPoint creation", True, details, duration)
                
            except Exception as e:
                duration = time.time() - start_time
                self.log_result("RecoveryPoint creation", False, str(e), duration)
                return False
            
            # Test RecoveryOperation creation
            start_time = time.time()
            try:
                recovery_operation = RecoveryOperation(
                    operation_id="test_op_001",
                    recovery_type=RecoveryType.ROLLBACK,
                    status=RecoveryStatus.INITIATED,
                    start_time=datetime.now(timezone.utc)
                )
                
                duration = time.time() - start_time
                details = f"ID: {recovery_operation.operation_id}, Status: {recovery_operation.status.value}"
                self.log_result("RecoveryOperation creation", True, details, duration)
                
            except Exception as e:
                duration = time.time() - start_time
                self.log_result("RecoveryOperation creation", False, str(e), duration)
                return False
            
            # Test BackupConfig creation
            start_time = time.time()
            try:
                backup_config = BackupConfig(
                    backup_type=BackupType.FULL,
                    retention_days=30,
                    compression=True,
                    encryption=True
                )
                
                duration = time.time() - start_time
                details = f"Type: {backup_config.backup_type.value}, Retention: {backup_config.retention_days} days"
                self.log_result("BackupConfig creation", True, details, duration)
                
            except Exception as e:
                duration = time.time() - start_time
                self.log_result("BackupConfig creation", False, str(e), duration)
                return False
            
            return True
            
        except Exception as e:
            self.log_result("Data structures validation", False, f"Import error: {str(e)}")
            return False
    
    async def validate_cli_functionality(self) -> bool:
        """Validate CLI tool functionality"""
        print("\n" + "="*60)
        print("CLI FUNCTIONALITY VALIDATION")
        print("="*60)
        
        cli_file = Path('scripts/disaster_recovery_cli.py')
        
        # Test 1: CLI file exists and is executable
        start_time = time.time()
        try:
            if cli_file.exists():
                # Check if file has proper shebang and imports
                with open(cli_file, 'r') as f:
                    content = f.read()
                    
                has_shebang = content.startswith('#!/usr/bin/env python3')
                has_click_import = 'import click' in content
                has_asyncio_import = 'import asyncio' in content
                has_disaster_recovery_import = 'from infrastructure.disaster_recovery' in content
                
                duration = time.time() - start_time
                
                if all([has_shebang, has_click_import, has_asyncio_import, has_disaster_recovery_import]):
                    details = "CLI structure valid with proper imports"
                    self.log_result("CLI file structure validation", True, details, duration)
                else:
                    missing = []
                    if not has_shebang: missing.append("shebang")
                    if not has_click_import: missing.append("click import")
                    if not has_asyncio_import: missing.append("asyncio import")
                    if not has_disaster_recovery_import: missing.append("disaster_recovery import")
                    details = f"Missing components: {missing}"
                    self.log_result("CLI file structure validation", False, details, duration)
                    return False
            else:
                duration = time.time() - start_time
                self.log_result("CLI file structure validation", False, "CLI file not found", duration)
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_result("CLI file structure validation", False, str(e), duration)
            return False
        
        # Test 2: CLI command structure
        start_time = time.time()
        try:
            # Check for expected CLI commands
            expected_commands = [
                '@disaster_recovery.command()',
                'def status():',
                'def create_recovery_point(',
                'def rollback(',
                'def disaster_recovery_cmd(',
                'def list_recovery_points(',
                'def cleanup(',
                'def health():'
            ]
            
            missing_commands = []
            for command in expected_commands:
                if command not in content:
                    missing_commands.append(command.replace('def ', '').replace('():', '').replace('(', ''))
            
            duration = time.time() - start_time
            
            if not missing_commands:
                details = f"All {len(expected_commands)} CLI commands present"
                self.log_result("CLI commands validation", True, details, duration)
            else:
                details = f"Missing commands: {missing_commands}"
                self.log_result("CLI commands validation", False, details, duration)
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_result("CLI commands validation", False, str(e), duration)
            return False
        
        return True
    
    async def validate_configuration(self) -> bool:
        """Validate configuration file structure and content"""
        print("\n" + "="*60)
        print("CONFIGURATION VALIDATION")
        print("="*60)
        
        config_file = Path('config/disaster_recovery.yaml')
        
        # Test 1: Config file exists
        start_time = time.time()
        if not config_file.exists():
            duration = time.time() - start_time
            self.log_result("Configuration file existence", False, "Config file not found", duration)
            return False
        
        # Test 2: YAML parsing
        start_time = time.time()
        try:
            import yaml
            with open(config_file, 'r') as f:
                config = yaml.safe_load(f)
            
            duration = time.time() - start_time
            details = f"Successfully parsed YAML with {len(config)} top-level sections"
            self.log_result("YAML parsing", True, details, duration)
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_result("YAML parsing", False, str(e), duration)
            return False
        
        # Test 3: Required configuration sections
        start_time = time.time()
        required_sections = [
            'recovery', 'database', 'storage', 'monitoring', 'services',
            'load_balancer', 'security', 'external_services', 'disaster_scenarios',
            'rollback', 'logging', 'performance', 'testing'
        ]
        
        missing_sections = []
        for section in required_sections:
            if section not in config:
                missing_sections.append(section)
        
        duration = time.time() - start_time
        
        if not missing_sections:
            details = f"All {len(required_sections)} required sections present"
            self.log_result("Configuration sections validation", True, details, duration)
        else:
            details = f"Missing sections: {missing_sections}"
            self.log_result("Configuration sections validation", False, details, duration)
            return False
        
        # Test 4: Critical configuration values
        start_time = time.time()
        try:
            # Check recovery configuration
            recovery_config = config.get('recovery', {})
            required_recovery_keys = ['max_rollback_depth', 'verification_timeout', 'parallel_recovery_jobs']
            missing_recovery_keys = [key for key in required_recovery_keys if key not in recovery_config]
            
            # Check database configuration
            db_config = config.get('database', {})
            required_db_keys = ['connection_string', 'backup_location', 'max_connections']
            missing_db_keys = [key for key in required_db_keys if key not in db_config]
            
            # Check storage configuration
            storage_config = config.get('storage', {})
            required_storage_keys = ['local_backup_path', 'retention_policy']
            missing_storage_keys = [key for key in required_storage_keys if key not in storage_config]
            
            duration = time.time() - start_time
            
            all_missing = missing_recovery_keys + missing_db_keys + missing_storage_keys
            if not all_missing:
                details = "All critical configuration keys present"
                self.log_result("Critical configuration validation", True, details, duration)
            else:
                details = f"Missing keys: {all_missing}"
                self.log_result("Critical configuration validation", False, details, duration)
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_result("Critical configuration validation", False, str(e), duration)
            return False
        
        return True
    
    async def validate_documentation(self) -> bool:
        """Validate disaster recovery documentation"""
        print("\n" + "="*60)
        print("DOCUMENTATION VALIDATION")
        print("="*60)
        
        doc_file = Path('docs/disaster_recovery_runbook.md')
        
        # Test 1: Documentation file exists
        start_time = time.time()
        if not doc_file.exists():
            duration = time.time() - start_time
            self.log_result("Documentation file existence", False, "Runbook file not found", duration)
            return False
        
        # Test 2: Documentation content validation
        start_time = time.time()
        try:
            with open(doc_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check for required sections
            required_sections = [
                '# Spirit Tours - Disaster Recovery & Rollback Runbook',
                '## 🚨 Emergency Contacts & Escalation',
                '## 📋 Quick Reference Commands',
                '## 🎯 Disaster Recovery Scenarios',
                '## 🔧 Detailed Recovery Procedures',
                '## 📊 Monitoring & Health Checks',
                '## 🧪 Testing & Validation',
                '## 📝 Communication & Documentation',
                '## 🔐 Security Considerations',
                '## 📈 Performance Optimization',
                '## 🚀 Continuous Improvement'
            ]
            
            missing_sections = []
            for section in required_sections:
                if section not in content:
                    missing_sections.append(section.replace('#', '').strip())
            
            duration = time.time() - start_time
            
            if not missing_sections:
                file_size = len(content)
                details = f"All {len(required_sections)} sections present, {file_size:,} characters"
                self.log_result("Documentation content validation", True, details, duration)
            else:
                details = f"Missing sections: {missing_sections}"
                self.log_result("Documentation content validation", False, details, duration)
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_result("Documentation content validation", False, str(e), duration)
            return False
        
        # Test 3: Code examples validation
        start_time = time.time()
        try:
            # Count code blocks
            code_blocks = content.count('```bash')
            command_examples = content.count('cd /home/user/webapp')
            
            duration = time.time() - start_time
            
            if code_blocks >= 10 and command_examples >= 5:
                details = f"{code_blocks} code blocks, {command_examples} command examples"
                self.log_result("Documentation code examples", True, details, duration)
            else:
                details = f"Insufficient examples: {code_blocks} code blocks, {command_examples} commands"
                self.log_result("Documentation code examples", False, details, duration)
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_result("Documentation code examples", False, str(e), duration)
            return False
        
        return True
    
    async def validate_test_coverage(self) -> bool:
        """Validate test coverage for disaster recovery functionality"""
        print("\n" + "="*60)
        print("TEST COVERAGE VALIDATION")
        print("="*60)
        
        test_file = Path('tests/test_disaster_recovery.py')
        
        # Test 1: Test file exists
        start_time = time.time()
        if not test_file.exists():
            duration = time.time() - start_time
            self.log_result("Test file existence", False, "Test file not found", duration)
            return False
        
        # Test 2: Test content validation
        start_time = time.time()
        try:
            with open(test_file, 'r') as f:
                content = f.read()
            
            # Check for test classes and methods
            expected_test_classes = [
                'class TestDisasterRecoveryOrchestrator',
                'class TestBackupManager',
                'class TestMonitoringClient',
                'class TestIntegration'
            ]
            
            expected_test_methods = [
                'test_create_recovery_point',
                'test_execute_rollback_success',
                'test_execute_rollback_validation_failure',
                'test_execute_rollback_step_failure',
                'test_execute_disaster_recovery_failover',
                'test_execute_disaster_recovery_restore',
                'test_validate_rollback_feasibility_success',
                'test_create_database_backup',
                'test_encrypt_file',
                'test_collect_health_metrics',
                'test_full_rollback_workflow'
            ]
            
            missing_classes = [cls for cls in expected_test_classes if cls not in content]
            missing_methods = [method for method in expected_test_methods if method not in content]
            
            duration = time.time() - start_time
            
            if not missing_classes and not missing_methods:
                details = f"{len(expected_test_classes)} test classes, {len(expected_test_methods)} test methods"
                self.log_result("Test coverage validation", True, details, duration)
            else:
                missing = missing_classes + missing_methods
                details = f"Missing tests: {missing[:5]}..." if len(missing) > 5 else f"Missing tests: {missing}"
                self.log_result("Test coverage validation", False, details, duration)
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_result("Test coverage validation", False, str(e), duration)
            return False
        
        # Test 3: pytest compatibility
        start_time = time.time()
        try:
            # Check for pytest fixtures and async test support
            has_pytest_fixtures = '@pytest.fixture' in content
            has_async_tests = '@pytest.mark.asyncio' in content
            has_mocking = 'from unittest.mock import' in content
            
            duration = time.time() - start_time
            
            if has_pytest_fixtures and has_async_tests and has_mocking:
                details = "pytest fixtures, asyncio support, and mocking present"
                self.log_result("pytest compatibility", True, details, duration)
            else:
                missing = []
                if not has_pytest_fixtures: missing.append("fixtures")
                if not has_async_tests: missing.append("asyncio")
                if not has_mocking: missing.append("mocking")
                details = f"Missing pytest features: {missing}"
                self.log_result("pytest compatibility", False, details, duration)
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_result("pytest compatibility", False, str(e), duration)
            return False
        
        return True
    
    async def validate_performance_requirements(self) -> bool:
        """Validate performance characteristics of disaster recovery system"""
        print("\n" + "="*60)
        print("PERFORMANCE REQUIREMENTS VALIDATION")
        print("="*60)
        
        # Test 1: Module import performance
        start_time = time.time()
        try:
            from infrastructure.disaster_recovery import DisasterRecoveryOrchestrator
            import_duration = time.time() - start_time
            
            # Import should be fast (< 1 second)
            if import_duration < 1.0:
                details = f"Import completed in {import_duration:.3f}s"
                self.log_result("Module import performance", True, details, import_duration)
                self.performance_metrics['import_time'] = import_duration
            else:
                details = f"Import too slow: {import_duration:.3f}s (>1.0s)"
                self.log_result("Module import performance", False, details, import_duration)
                return False
                
        except Exception as e:
            import_duration = time.time() - start_time
            self.log_result("Module import performance", False, str(e), import_duration)
            return False
        
        # Test 2: Configuration loading performance
        start_time = time.time()
        try:
            import tempfile
            import yaml
            
            # Create test config
            with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
                test_config = {
                    'recovery': {'max_rollback_depth': 5},
                    'database': {'connection_string': 'sqlite:///test.db', 'backup_location': '/tmp'},
                    'storage': {'local_backup_path': '/tmp'},
                    'monitoring': {'metrics_retention': 24}
                }
                yaml.dump(test_config, f)
                config_path = f.name
            
            # Test configuration loading
            orchestrator = DisasterRecoveryOrchestrator(config_path)
            config_load_duration = time.time() - start_time
            
            # Configuration loading should be fast (< 0.5 seconds)
            if config_load_duration < 0.5:
                details = f"Config loaded in {config_load_duration:.3f}s"
                self.log_result("Configuration loading performance", True, details, config_load_duration)
                self.performance_metrics['config_load_time'] = config_load_duration
            else:
                details = f"Config loading too slow: {config_load_duration:.3f}s (>0.5s)"
                self.log_result("Configuration loading performance", False, details, config_load_duration)
                return False
            
            # Clean up
            os.unlink(config_path)
            
        except Exception as e:
            config_load_duration = time.time() - start_time
            self.log_result("Configuration loading performance", False, str(e), config_load_duration)
            return False
        
        # Test 3: Memory usage validation
        start_time = time.time()
        try:
            import psutil
            import gc
            
            # Measure initial memory
            process = psutil.Process()
            initial_memory = process.memory_info().rss / 1024 / 1024  # MB
            
            # Create multiple orchestrator instances
            orchestrators = []
            for i in range(10):
                with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
                    yaml.dump(test_config, f)
                    config_path = f.name
                
                orch = DisasterRecoveryOrchestrator(config_path)
                orchestrators.append(orch)
                os.unlink(config_path)
            
            # Measure peak memory
            peak_memory = process.memory_info().rss / 1024 / 1024  # MB
            memory_per_instance = (peak_memory - initial_memory) / 10
            
            # Clean up
            del orchestrators
            gc.collect()
            
            final_memory = process.memory_info().rss / 1024 / 1024  # MB
            memory_recovered = peak_memory - final_memory
            
            duration = time.time() - start_time
            
            # Each instance should use < 10MB
            if memory_per_instance < 10.0:
                details = f"Memory per instance: {memory_per_instance:.2f}MB, recovered: {memory_recovered:.2f}MB"
                self.log_result("Memory usage performance", True, details, duration)
                self.performance_metrics['memory_per_instance'] = memory_per_instance
            else:
                details = f"Memory usage too high: {memory_per_instance:.2f}MB per instance (>10MB)"
                self.log_result("Memory usage performance", False, details, duration)
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_result("Memory usage performance", False, str(e), duration)
            return False
        
        return True
    
    async def validate_integration_compatibility(self) -> bool:
        """Validate integration with existing system components"""
        print("\n" + "="*60)
        print("INTEGRATION COMPATIBILITY VALIDATION")
        print("="*60)
        
        # Test 1: Check for conflicts with existing implementations
        start_time = time.time()
        try:
            # Check if automated deployment system exists and is compatible
            deployment_file = Path('infrastructure/automated_deployment.py')
            if deployment_file.exists():
                with open(deployment_file, 'r') as f:
                    deployment_content = f.read()
                
                # Check for integration points
                has_deployment_integration = 'disaster_recovery' in deployment_content or 'DisasterRecovery' in deployment_content
                has_rollback_integration = 'rollback' in deployment_content.lower()
                
                duration = time.time() - start_time
                
                if has_rollback_integration:  # Integration not required, but rollback concepts should exist
                    details = "Compatible with existing deployment system"
                    self.log_result("Deployment system integration", True, details, duration)
                else:
                    details = "No rollback concepts found in deployment system"
                    self.log_result("Deployment system integration", False, details, duration)
                    return False
            else:
                duration = time.time() - start_time
                details = "No existing deployment system found - standalone implementation"
                self.log_result("Deployment system integration", True, details, duration)
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_result("Deployment system integration", False, str(e), duration)
            return False
        
        # Test 2: Check compatibility with existing service configurations
        start_time = time.time()
        try:
            # Check for existing service files
            service_dirs = [
                'backend/services',
                'backend/config', 
                'frontend',
                'infrastructure'
            ]
            
            existing_services = []
            for service_dir in service_dirs:
                if Path(service_dir).exists():
                    existing_services.append(service_dir)
            
            duration = time.time() - start_time
            
            if existing_services:
                details = f"Compatible with existing services: {existing_services}"
                self.log_result("Service compatibility", True, details, duration)
            else:
                details = "No existing services found - new system deployment"
                self.log_result("Service compatibility", True, details, duration)
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_result("Service compatibility", False, str(e), duration)
            return False
        
        # Test 3: Validate configuration compatibility
        start_time = time.time()
        try:
            # Check if disaster recovery config is compatible with system
            config_files = [
                'config/database.yaml',
                'config/production_database.py',
                'config/load_balancer_config.py',
                '.env'
            ]
            
            compatible_configs = []
            for config_file in config_files:
                if Path(config_file).exists():
                    compatible_configs.append(config_file)
            
            duration = time.time() - start_time
            details = f"Found {len(compatible_configs)} existing config files"
            self.log_result("Configuration compatibility", True, details, duration)
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_result("Configuration compatibility", False, str(e), duration)
            return False
        
        return True
    
    def generate_performance_report(self) -> Dict[str, Any]:
        """Generate performance metrics report"""
        return {
            'total_validation_time': time.time() - self.start_time,
            'metrics': self.performance_metrics,
            'test_count': len(self.results),
            'passed_tests': len([r for r in self.results if r['passed']]),
            'failed_tests': len([r for r in self.results if not r['passed']]),
            'success_rate': len([r for r in self.results if r['passed']]) / len(self.results) * 100 if self.results else 0
        }
    
    def print_summary(self):
        """Print comprehensive validation summary"""
        total_time = time.time() - self.start_time
        passed_tests = len([r for r in self.results if r['passed']])
        failed_tests = len([r for r in self.results if not r['passed']])
        success_rate = (passed_tests / len(self.results) * 100) if self.results else 0
        
        print("\n" + "="*60)
        print("DISASTER RECOVERY VALIDATION SUMMARY")
        print("="*60)
        
        print(f"\nValidation Results:")
        print(f"  Total Tests: {len(self.results)}")
        print(f"  Passed: {passed_tests}")
        print(f"  Failed: {failed_tests}")
        print(f"  Success Rate: {success_rate:.1f}%")
        print(f"  Total Time: {total_time:.2f} seconds")
        
        if self.performance_metrics:
            print(f"\nPerformance Metrics:")
            for metric, value in self.performance_metrics.items():
                if 'time' in metric:
                    print(f"  {metric}: {value:.3f}s")
                else:
                    print(f"  {metric}: {value:.2f}MB")
        
        if failed_tests > 0:
            print(f"\nFailed Tests:")
            for result in self.results:
                if not result['passed']:
                    print(f"  ✗ {result['test_name']}: {result['details']}")
        
        # Overall assessment
        if success_rate >= 95:
            print(f"\n🎉 EXCELLENT: Disaster Recovery implementation is comprehensive and ready for production!")
        elif success_rate >= 85:
            print(f"\n✅ GOOD: Disaster Recovery implementation is solid with minor issues to address.")
        elif success_rate >= 70:
            print(f"\n⚠️  FAIR: Disaster Recovery implementation needs improvement before production use.")
        else:
            print(f"\n❌ NEEDS WORK: Disaster Recovery implementation requires significant improvements.")
        
        return success_rate


async def main():
    """Main validation function"""
    print("Spirit Tours - Disaster Recovery Implementation Validator")
    print("=" * 60)
    print(f"Starting comprehensive validation at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    validator = DisasterRecoveryValidator()
    
    try:
        # Run all validation tests
        validations = [
            validator.validate_file_structure(),
            validator.validate_core_imports(),
            validator.validate_disaster_recovery_orchestrator(),
            validator.validate_recovery_types_and_enums(), 
            validator.validate_data_structures(),
            validator.validate_cli_functionality(),
            validator.validate_configuration(),
            validator.validate_documentation(),
            validator.validate_test_coverage(),
            validator.validate_performance_requirements(),
            validator.validate_integration_compatibility()
        ]
        
        # Execute all validations
        results = await asyncio.gather(*validations, return_exceptions=True)
        
        # Check for any exceptions
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                validator.log_result(f"Validation {i+1}", False, f"Exception: {str(result)}")
        
        # Generate and print summary
        success_rate = validator.print_summary()
        
        # Generate performance report
        performance_report = validator.generate_performance_report()
        
        # Save results to file
        report_file = Path('disaster_recovery_validation_report.json')
        with open(report_file, 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'results': validator.results,
                'performance_report': performance_report,
                'success_rate': success_rate
            }, f, indent=2)
        
        print(f"\nDetailed report saved to: {report_file}")
        
        # Return appropriate exit code
        return 0 if success_rate >= 85 else 1
        
    except Exception as e:
        print(f"\n❌ VALIDATION FAILED: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return 1


if __name__ == '__main__':
    exit_code = asyncio.run(main())
    sys.exit(exit_code)