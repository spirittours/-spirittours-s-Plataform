#!/usr/bin/env python3
"""
Disaster Recovery and Advanced Rollback System for Spirit Tours
Enhanced automated rollback with comprehensive disaster recovery mechanisms
"""

import asyncio
import json
import logging
import os
import shutil
import subprocess
import tempfile
import time
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple, Set
from concurrent.futures import ThreadPoolExecutor
import yaml

# External Dependencies
import docker
import redis
import psutil
import boto3
from psycopg2 import sql
import aiofiles
import asyncpg
from kubernetes import client as k8s_client, config as k8s_config
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from cryptography.fernet import Fernet


class RecoveryType(Enum):
    """Types of disaster recovery operations"""
    ROLLBACK = "rollback"
    FAILOVER = "failover"
    RESTORE = "restore"
    EMERGENCY_STOP = "emergency_stop"
    DATA_RECOVERY = "data_recovery"
    SERVICE_RECOVERY = "service_recovery"
    INFRASTRUCTURE_RECOVERY = "infrastructure_recovery"


class BackupType(Enum):
    """Types of backup operations"""
    FULL = "full"
    INCREMENTAL = "incremental"
    DIFFERENTIAL = "differential"
    TRANSACTION_LOG = "transaction_log"
    CONFIGURATION = "configuration"
    CODE = "code"


class RecoveryStatus(Enum):
    """Recovery operation status"""
    INITIATED = "initiated"
    IN_PROGRESS = "in_progress"
    VERIFYING = "verifying"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"
    PARTIAL = "partial"


@dataclass
class BackupConfig:
    """Configuration for backup operations"""
    backup_type: BackupType
    retention_days: int = 30
    compression: bool = True
    encryption: bool = True
    storage_location: str = "/backups"
    s3_bucket: Optional[str] = None
    schedule_cron: Optional[str] = None
    max_backup_size: int = 10737418240  # 10GB
    verify_integrity: bool = True
    
    
@dataclass
class RecoveryPoint:
    """Represents a point-in-time recovery snapshot"""
    timestamp: datetime
    deployment_version: str
    database_backup: str
    code_snapshot: str
    config_snapshot: str
    services_state: Dict[str, Any]
    health_metrics: Dict[str, float]
    recovery_type: RecoveryType
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RecoveryOperation:
    """Represents a disaster recovery operation"""
    operation_id: str
    recovery_type: RecoveryType
    status: RecoveryStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    target_recovery_point: Optional[RecoveryPoint] = None
    affected_services: Set[str] = field(default_factory=set)
    error_message: Optional[str] = None
    rollback_steps: List[str] = field(default_factory=list)
    verification_results: Dict[str, bool] = field(default_factory=dict)


class DisasterRecoveryOrchestrator:
    """
    Advanced disaster recovery and rollback orchestration system
    Provides comprehensive recovery capabilities for Spirit Tours infrastructure
    """
    
    def __init__(self, config_path: str = "/home/user/webapp/config/disaster_recovery.yaml"):
        self.config_path = config_path
        self.config = self._load_config()
        self.logger = self._setup_logging()
        self.docker_client = docker.from_env()
        self.redis_client = None
        self.db_engine = None
        self.recovery_history: List[RecoveryOperation] = []
        self.active_operations: Dict[str, RecoveryOperation] = {}
        self.backup_manager = BackupManager(self.config.get('backup', {}))
        self.monitoring_client = MonitoringClient(self.config.get('monitoring', {}))
        
        # Initialize external clients
        self._initialize_clients()
        
    def _load_config(self) -> Dict[str, Any]:
        """Load disaster recovery configuration"""
        default_config = {
            'recovery': {
                'max_rollback_depth': 10,
                'verification_timeout': 300,
                'parallel_recovery_jobs': 3,
                'emergency_contact': 'admin@spirittours.com',
                'auto_failover': True,
                'backup_verification': True
            },
            'database': {
                'connection_string': 'postgresql://user:pass@localhost/spirittours',
                'backup_location': '/backups/database',
                'max_connections': 20,
                'query_timeout': 30
            },
            'storage': {
                's3_bucket': 'spirittours-backups',
                'local_backup_path': '/backups',
                'encryption_key_path': '/secrets/backup_encryption_key',
                'retention_policy': {'days': 30, 'versions': 5}
            },
            'kubernetes': {
                'namespace': 'spirittours',
                'config_path': '~/.kube/config',
                'deployment_timeout': 600
            },
            'monitoring': {
                'alert_webhook': None,
                'metrics_retention': 168,  # hours
                'health_check_interval': 30
            }
        }
        
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r') as f:
                    file_config = yaml.safe_load(f)
                    default_config.update(file_config)
            except Exception as e:
                self.logger.warning(f"Failed to load config from {self.config_path}: {e}")
                
        return default_config
    
    def _setup_logging(self) -> logging.Logger:
        """Setup comprehensive logging for disaster recovery"""
        logger = logging.getLogger('disaster_recovery')
        logger.setLevel(logging.INFO)
        
        # Create handlers
        console_handler = logging.StreamHandler()
        file_handler = logging.FileHandler('/home/user/webapp/logs/disaster_recovery.log')
        
        # Create formatters
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(formatter)
        file_handler.setFormatter(formatter)
        
        logger.addHandler(console_handler)
        logger.addHandler(file_handler)
        
        return logger
    
    def _initialize_clients(self):
        """Initialize external service clients"""
        try:
            # Redis client for state management
            redis_config = self.config.get('redis', {})
            self.redis_client = redis.Redis(
                host=redis_config.get('host', 'localhost'),
                port=redis_config.get('port', 6379),
                db=redis_config.get('db', 0),
                decode_responses=True
            )
            
            # Database engine
            db_config = self.config['database']
            self.db_engine = create_engine(
                db_config['connection_string'],
                pool_size=db_config.get('max_connections', 20),
                pool_timeout=db_config.get('query_timeout', 30),
                echo=False
            )
            
            # Kubernetes client (if available)
            try:
                k8s_config.load_kube_config(self.config['kubernetes']['config_path'])
                self.k8s_apps_v1 = k8s_client.AppsV1Api()
                self.k8s_core_v1 = k8s_client.CoreV1Api()
            except Exception as e:
                self.logger.warning(f"Kubernetes client not available: {e}")
                self.k8s_apps_v1 = None
                self.k8s_core_v1 = None
                
        except Exception as e:
            self.logger.error(f"Failed to initialize clients: {e}")
    
    async def create_recovery_point(self, 
                                  deployment_version: str,
                                  recovery_type: RecoveryType = RecoveryType.ROLLBACK) -> RecoveryPoint:
        """
        Create a comprehensive recovery point for current system state
        """
        self.logger.info(f"Creating recovery point for deployment {deployment_version}")
        
        try:
            timestamp = datetime.now(timezone.utc)
            
            # Create database backup
            db_backup_path = await self.backup_manager.create_database_backup(
                f"recovery_point_{timestamp.strftime('%Y%m%d_%H%M%S')}"
            )
            
            # Create code snapshot
            code_snapshot_path = await self._create_code_snapshot(deployment_version)
            
            # Create configuration snapshot
            config_snapshot_path = await self._create_config_snapshot()
            
            # Capture services state
            services_state = await self._capture_services_state()
            
            # Collect health metrics
            health_metrics = await self.monitoring_client.collect_health_metrics()
            
            recovery_point = RecoveryPoint(
                timestamp=timestamp,
                deployment_version=deployment_version,
                database_backup=db_backup_path,
                code_snapshot=code_snapshot_path,
                config_snapshot=config_snapshot_path,
                services_state=services_state,
                health_metrics=health_metrics,
                recovery_type=recovery_type,
                metadata={
                    'system_load': psutil.cpu_percent(),
                    'memory_usage': psutil.virtual_memory().percent,
                    'disk_usage': psutil.disk_usage('/').percent,
                    'active_connections': len(self._get_active_connections())
                }
            )
            
            # Store recovery point
            await self._store_recovery_point(recovery_point)
            
            self.logger.info(f"Recovery point created successfully: {recovery_point.timestamp}")
            return recovery_point
            
        except Exception as e:
            self.logger.error(f"Failed to create recovery point: {e}")
            raise
    
    async def execute_rollback(self, 
                             target_version: str,
                             recovery_point: Optional[RecoveryPoint] = None,
                             force: bool = False) -> RecoveryOperation:
        """
        Execute comprehensive rollback to previous deployment version
        """
        operation_id = f"rollback_{int(time.time())}"
        operation = RecoveryOperation(
            operation_id=operation_id,
            recovery_type=RecoveryType.ROLLBACK,
            status=RecoveryStatus.INITIATED,
            start_time=datetime.now(timezone.utc),
            target_recovery_point=recovery_point
        )
        
        self.active_operations[operation_id] = operation
        
        try:
            self.logger.info(f"Starting rollback operation {operation_id} to version {target_version}")
            operation.status = RecoveryStatus.IN_PROGRESS
            
            # Pre-rollback validation
            if not force:
                validation_result = await self._validate_rollback_feasibility(target_version, recovery_point)
                if not validation_result['feasible']:
                    operation.status = RecoveryStatus.FAILED
                    operation.error_message = validation_result['reason']
                    return operation
            
            # Create current state backup before rollback
            current_recovery_point = await self.create_recovery_point(
                "pre_rollback_backup",
                RecoveryType.ROLLBACK
            )
            
            # Execute rollback steps
            rollback_steps = await self._plan_rollback_steps(target_version, recovery_point)
            operation.rollback_steps = rollback_steps
            
            for step_idx, step in enumerate(rollback_steps):
                self.logger.info(f"Executing rollback step {step_idx + 1}/{len(rollback_steps)}: {step}")
                
                try:
                    await self._execute_rollback_step(step, operation)
                except Exception as step_error:
                    self.logger.error(f"Rollback step failed: {step} - {step_error}")
                    
                    # Attempt step recovery or abort
                    if not await self._recover_from_step_failure(step, step_error, operation):
                        operation.status = RecoveryStatus.FAILED
                        operation.error_message = f"Step failure: {step} - {step_error}"
                        
                        # Emergency rollback to current state
                        await self._emergency_restore(current_recovery_point)
                        return operation
            
            # Post-rollback verification
            operation.status = RecoveryStatus.VERIFYING
            verification_results = await self._verify_rollback_success(target_version, operation)
            operation.verification_results = verification_results
            
            if all(verification_results.values()):
                operation.status = RecoveryStatus.COMPLETED
                self.logger.info(f"Rollback operation {operation_id} completed successfully")
            else:
                operation.status = RecoveryStatus.PARTIAL
                failed_checks = [k for k, v in verification_results.items() if not v]
                operation.error_message = f"Partial rollback - failed checks: {failed_checks}"
                self.logger.warning(f"Rollback partially completed: {failed_checks}")
                
        except Exception as e:
            self.logger.error(f"Rollback operation {operation_id} failed: {e}")
            operation.status = RecoveryStatus.FAILED
            operation.error_message = str(e)
            
        finally:
            operation.end_time = datetime.now(timezone.utc)
            await self._store_recovery_operation(operation)
            self.recovery_history.append(operation)
            del self.active_operations[operation_id]
        
        return operation
    
    async def execute_disaster_recovery(self, 
                                      recovery_type: RecoveryType,
                                      recovery_point: Optional[RecoveryPoint] = None,
                                      emergency_mode: bool = False) -> RecoveryOperation:
        """
        Execute disaster recovery based on type and severity
        """
        operation_id = f"disaster_recovery_{int(time.time())}"
        operation = RecoveryOperation(
            operation_id=operation_id,
            recovery_type=recovery_type,
            status=RecoveryStatus.INITIATED,
            start_time=datetime.now(timezone.utc),
            target_recovery_point=recovery_point
        )
        
        self.active_operations[operation_id] = operation
        
        try:
            self.logger.critical(f"Starting disaster recovery operation {operation_id}: {recovery_type}")
            operation.status = RecoveryStatus.IN_PROGRESS
            
            # Send emergency notifications
            if emergency_mode:
                await self._send_emergency_notifications(operation)
            
            # Execute recovery strategy based on type
            if recovery_type == RecoveryType.FAILOVER:
                await self._execute_failover_recovery(operation)
            elif recovery_type == RecoveryType.RESTORE:
                await self._execute_restore_recovery(operation, recovery_point)
            elif recovery_type == RecoveryType.EMERGENCY_STOP:
                await self._execute_emergency_stop(operation)
            elif recovery_type == RecoveryType.DATA_RECOVERY:
                await self._execute_data_recovery(operation)
            elif recovery_type == RecoveryType.SERVICE_RECOVERY:
                await self._execute_service_recovery(operation)
            elif recovery_type == RecoveryType.INFRASTRUCTURE_RECOVERY:
                await self._execute_infrastructure_recovery(operation)
            else:
                raise ValueError(f"Unsupported recovery type: {recovery_type}")
            
            # Verify recovery success
            operation.status = RecoveryStatus.VERIFYING
            verification_results = await self._verify_disaster_recovery(operation)
            operation.verification_results = verification_results
            
            if all(verification_results.values()):
                operation.status = RecoveryStatus.COMPLETED
                self.logger.info(f"Disaster recovery operation {operation_id} completed successfully")
            else:
                operation.status = RecoveryStatus.PARTIAL
                failed_checks = [k for k, v in verification_results.items() if not v]
                operation.error_message = f"Partial recovery - failed checks: {failed_checks}"
                
        except Exception as e:
            self.logger.error(f"Disaster recovery operation {operation_id} failed: {e}")
            operation.status = RecoveryStatus.FAILED
            operation.error_message = str(e)
            
        finally:
            operation.end_time = datetime.now(timezone.utc)
            await self._store_recovery_operation(operation)
            self.recovery_history.append(operation)
            del self.active_operations[operation_id]
        
        return operation
    
    async def _validate_rollback_feasibility(self, 
                                           target_version: str, 
                                           recovery_point: Optional[RecoveryPoint]) -> Dict[str, Any]:
        """Validate if rollback is feasible and safe"""
        try:
            # Check if target version exists
            if not await self._version_exists(target_version):
                return {'feasible': False, 'reason': f'Target version {target_version} not found'}
            
            # Check rollback depth
            current_version = await self._get_current_version()
            rollback_depth = await self._calculate_rollback_depth(current_version, target_version)
            
            max_depth = self.config['recovery']['max_rollback_depth']
            if rollback_depth > max_depth:
                return {'feasible': False, 'reason': f'Rollback depth {rollback_depth} exceeds maximum {max_depth}'}
            
            # Check database compatibility
            db_compatible = await self._check_database_compatibility(target_version)
            if not db_compatible:
                return {'feasible': False, 'reason': 'Database schema incompatible with target version'}
            
            # Check system resources
            resource_check = await self._check_system_resources()
            if not resource_check['sufficient']:
                return {'feasible': False, 'reason': f'Insufficient resources: {resource_check["details"]}'}
            
            # Check active connections and transactions
            active_connections = self._get_active_connections()
            if len(active_connections) > 100:  # Threshold for safety
                return {'feasible': False, 'reason': f'Too many active connections: {len(active_connections)}'}
            
            return {
                'feasible': True,
                'rollback_depth': rollback_depth,
                'estimated_duration': rollback_depth * 30,  # seconds
                'active_connections': len(active_connections)
            }
            
        except Exception as e:
            return {'feasible': False, 'reason': f'Validation error: {str(e)}'}
    
    async def _plan_rollback_steps(self, 
                                 target_version: str, 
                                 recovery_point: Optional[RecoveryPoint]) -> List[str]:
        """Plan detailed rollback steps"""
        steps = []
        
        # Stop current services gracefully
        steps.append("stop_current_services")
        
        # Backup current state
        steps.append("backup_current_state")
        
        # Rollback database if needed
        if recovery_point and recovery_point.database_backup:
            steps.append("rollback_database")
        
        # Rollback application code
        steps.append("rollback_application_code")
        
        # Rollback configuration
        steps.append("rollback_configuration")
        
        # Update container images
        steps.append("update_container_images")
        
        # Restart services with target version
        steps.append("restart_services")
        
        # Verify service health
        steps.append("verify_service_health")
        
        # Update load balancer configuration
        steps.append("update_load_balancer")
        
        # Run integration tests
        steps.append("run_integration_tests")
        
        # Update monitoring configuration
        steps.append("update_monitoring")
        
        return steps
    
    async def _execute_rollback_step(self, step: str, operation: RecoveryOperation):
        """Execute individual rollback step"""
        step_start = time.time()
        
        try:
            if step == "stop_current_services":
                await self._stop_services_gracefully()
            elif step == "backup_current_state":
                await self._backup_current_state_before_rollback()
            elif step == "rollback_database":
                await self._rollback_database(operation.target_recovery_point)
            elif step == "rollback_application_code":
                await self._rollback_application_code(operation.target_recovery_point)
            elif step == "rollback_configuration":
                await self._rollback_configuration(operation.target_recovery_point)
            elif step == "update_container_images":
                await self._update_container_images(operation.target_recovery_point)
            elif step == "restart_services":
                await self._restart_services()
            elif step == "verify_service_health":
                await self._verify_service_health()
            elif step == "update_load_balancer":
                await self._update_load_balancer_config()
            elif step == "run_integration_tests":
                await self._run_integration_tests()
            elif step == "update_monitoring":
                await self._update_monitoring_config()
            else:
                raise ValueError(f"Unknown rollback step: {step}")
                
            step_duration = time.time() - step_start
            self.logger.info(f"Rollback step '{step}' completed in {step_duration:.2f} seconds")
            
        except Exception as e:
            self.logger.error(f"Rollback step '{step}' failed: {e}")
            raise
    
    async def _execute_failover_recovery(self, operation: RecoveryOperation):
        """Execute failover to backup infrastructure"""
        self.logger.info("Executing failover recovery")
        
        try:
            # Activate standby database
            await self._activate_standby_database()
            operation.affected_services.add("database")
            
            # Switch to backup application servers
            await self._switch_to_backup_servers()
            operation.affected_services.add("application")
            
            # Update DNS/load balancer to point to backup
            await self._update_dns_for_failover()
            operation.affected_services.add("dns")
            
            # Verify failover success
            await asyncio.sleep(30)  # Wait for propagation
            await self._verify_failover_health()
            
        except Exception as e:
            self.logger.error(f"Failover recovery failed: {e}")
            raise
    
    async def _execute_restore_recovery(self, 
                                      operation: RecoveryOperation, 
                                      recovery_point: Optional[RecoveryPoint]):
        """Execute restore from backup"""
        self.logger.info("Executing restore recovery")
        
        if not recovery_point:
            # Find latest suitable recovery point
            recovery_point = await self._find_latest_recovery_point()
        
        try:
            # Stop all services
            await self._stop_all_services()
            operation.affected_services.update(await self._get_all_service_names())
            
            # Restore database
            if recovery_point.database_backup:
                await self._restore_database_from_backup(recovery_point.database_backup)
            
            # Restore application code
            if recovery_point.code_snapshot:
                await self._restore_code_from_snapshot(recovery_point.code_snapshot)
            
            # Restore configuration
            if recovery_point.config_snapshot:
                await self._restore_config_from_snapshot(recovery_point.config_snapshot)
            
            # Restart services
            await self._restart_all_services()
            
        except Exception as e:
            self.logger.error(f"Restore recovery failed: {e}")
            raise
    
    async def _execute_emergency_stop(self, operation: RecoveryOperation):
        """Execute emergency stop of all services"""
        self.logger.critical("Executing emergency stop")
        
        try:
            # Get all running services
            service_names = await self._get_all_service_names()
            operation.affected_services.update(service_names)
            
            # Stop services immediately (no graceful shutdown)
            await self._emergency_stop_all_services()
            
            # Stop database connections
            await self._close_all_database_connections()
            
            # Update monitoring to reflect emergency state
            await self._set_emergency_monitoring_state()
            
        except Exception as e:
            self.logger.error(f"Emergency stop failed: {e}")
            raise
    
    async def _create_code_snapshot(self, deployment_version: str) -> str:
        """Create a snapshot of current code state"""
        snapshot_dir = f"/backups/code_snapshots/{deployment_version}_{int(time.time())}"
        os.makedirs(snapshot_dir, exist_ok=True)
        
        # Create tar archive of current code
        archive_path = f"{snapshot_dir}/code_snapshot.tar.gz"
        
        await asyncio.create_subprocess_exec(
            'tar', '-czf', archive_path, 
            '-C', '/home/user/webapp', 
            '--exclude=__pycache__',
            '--exclude=.git',
            '--exclude=node_modules',
            '--exclude=venv',
            '.'
        )
        
        return archive_path
    
    async def _create_config_snapshot(self) -> str:
        """Create a snapshot of current configuration"""
        snapshot_dir = f"/backups/config_snapshots/{int(time.time())}"
        os.makedirs(snapshot_dir, exist_ok=True)
        
        config_files = [
            '/home/user/webapp/config',
            '/home/user/webapp/.env',
            '/home/user/webapp/docker-compose.yml'
        ]
        
        archive_path = f"{snapshot_dir}/config_snapshot.tar.gz"
        
        # Create tar archive of configuration files
        tar_cmd = ['tar', '-czf', archive_path]
        for config_file in config_files:
            if os.path.exists(config_file):
                tar_cmd.append(config_file)
        
        await asyncio.create_subprocess_exec(*tar_cmd)
        
        return archive_path
    
    async def _capture_services_state(self) -> Dict[str, Any]:
        """Capture current state of all services"""
        services_state = {}
        
        try:
            # Docker containers
            containers = self.docker_client.containers.list(all=True)
            services_state['docker_containers'] = [
                {
                    'name': container.name,
                    'image': container.image.tags[0] if container.image.tags else 'unknown',
                    'status': container.status,
                    'ports': container.ports,
                    'labels': container.labels
                }
                for container in containers
            ]
            
            # System processes
            services_state['system_processes'] = [
                {
                    'pid': proc.pid,
                    'name': proc.info['name'],
                    'cmdline': proc.info['cmdline'],
                    'status': proc.info['status']
                }
                for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'status'])
                if 'spirittours' in ' '.join(proc.info.get('cmdline', []))
            ]
            
            # Database connections
            if self.db_engine:
                with self.db_engine.connect() as conn:
                    result = conn.execute(text("SELECT count(*) as active_connections FROM pg_stat_activity"))
                    services_state['database_connections'] = result.fetchone()[0]
            
            # Redis state
            if self.redis_client:
                services_state['redis_info'] = self.redis_client.info()
            
        except Exception as e:
            self.logger.warning(f"Failed to capture complete services state: {e}")
            services_state['error'] = str(e)
        
        return services_state
    
    def _get_active_connections(self) -> List[Dict[str, Any]]:
        """Get list of active database connections"""
        connections = []
        
        try:
            if self.db_engine:
                with self.db_engine.connect() as conn:
                    result = conn.execute(text("""
                        SELECT pid, usename, application_name, client_addr, state, query_start
                        FROM pg_stat_activity 
                        WHERE state = 'active'
                    """))
                    
                    for row in result:
                        connections.append({
                            'pid': row[0],
                            'username': row[1],
                            'application': row[2],
                            'client_addr': row[3],
                            'state': row[4],
                            'query_start': row[5]
                        })
        except Exception as e:
            self.logger.warning(f"Failed to get active connections: {e}")
        
        return connections
    
    async def _store_recovery_point(self, recovery_point: RecoveryPoint):
        """Store recovery point metadata"""
        recovery_data = {
            'timestamp': recovery_point.timestamp.isoformat(),
            'deployment_version': recovery_point.deployment_version,
            'database_backup': recovery_point.database_backup,
            'code_snapshot': recovery_point.code_snapshot,
            'config_snapshot': recovery_point.config_snapshot,
            'services_state': recovery_point.services_state,
            'health_metrics': recovery_point.health_metrics,
            'recovery_type': recovery_point.recovery_type.value,
            'metadata': recovery_point.metadata
        }
        
        # Store in Redis
        if self.redis_client:
            key = f"recovery_point:{recovery_point.timestamp.isoformat()}"
            self.redis_client.setex(
                key, 
                timedelta(days=self.config['storage']['retention_policy']['days']).total_seconds(),
                json.dumps(recovery_data, default=str)
            )
        
        # Store in file system
        recovery_file = f"/backups/recovery_points/{recovery_point.timestamp.strftime('%Y%m%d_%H%M%S')}.json"
        os.makedirs(os.path.dirname(recovery_file), exist_ok=True)
        
        async with aiofiles.open(recovery_file, 'w') as f:
            await f.write(json.dumps(recovery_data, indent=2, default=str))
    
    async def get_recovery_history(self, limit: int = 50) -> List[RecoveryOperation]:
        """Get recovery operation history"""
        return self.recovery_history[-limit:]
    
    async def get_available_recovery_points(self, 
                                          days_back: int = 30) -> List[RecoveryPoint]:
        """Get available recovery points within specified timeframe"""
        recovery_points = []
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_back)
        
        try:
            # Search in Redis
            if self.redis_client:
                keys = self.redis_client.keys("recovery_point:*")
                for key in keys:
                    data = self.redis_client.get(key)
                    if data:
                        recovery_data = json.loads(data)
                        timestamp = datetime.fromisoformat(recovery_data['timestamp'])
                        if timestamp >= cutoff_date:
                            recovery_points.append(self._deserialize_recovery_point(recovery_data))
            
            # Search in file system
            recovery_points_dir = "/backups/recovery_points"
            if os.path.exists(recovery_points_dir):
                for filename in os.listdir(recovery_points_dir):
                    if filename.endswith('.json'):
                        filepath = os.path.join(recovery_points_dir, filename)
                        try:
                            with open(filepath, 'r') as f:
                                recovery_data = json.load(f)
                                timestamp = datetime.fromisoformat(recovery_data['timestamp'])
                                if timestamp >= cutoff_date:
                                    recovery_points.append(self._deserialize_recovery_point(recovery_data))
                        except Exception as e:
                            self.logger.warning(f"Failed to load recovery point {filename}: {e}")
            
            # Sort by timestamp (most recent first)
            recovery_points.sort(key=lambda rp: rp.timestamp, reverse=True)
            
        except Exception as e:
            self.logger.error(f"Failed to get recovery points: {e}")
        
        return recovery_points
    
    def _deserialize_recovery_point(self, data: Dict[str, Any]) -> RecoveryPoint:
        """Deserialize recovery point from stored data"""
        return RecoveryPoint(
            timestamp=datetime.fromisoformat(data['timestamp']),
            deployment_version=data['deployment_version'],
            database_backup=data['database_backup'],
            code_snapshot=data['code_snapshot'],
            config_snapshot=data['config_snapshot'],
            services_state=data['services_state'],
            health_metrics=data['health_metrics'],
            recovery_type=RecoveryType(data['recovery_type']),
            metadata=data.get('metadata', {})
        )
    
    async def cleanup_old_recovery_points(self):
        """Cleanup old recovery points based on retention policy"""
        retention_days = self.config['storage']['retention_policy']['days']
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
        
        cleaned_count = 0
        
        try:
            # Cleanup Redis keys
            if self.redis_client:
                keys = self.redis_client.keys("recovery_point:*")
                for key in keys:
                    data = self.redis_client.get(key)
                    if data:
                        recovery_data = json.loads(data)
                        timestamp = datetime.fromisoformat(recovery_data['timestamp'])
                        if timestamp < cutoff_date:
                            self.redis_client.delete(key)
                            cleaned_count += 1
            
            # Cleanup file system
            recovery_points_dir = "/backups/recovery_points"
            if os.path.exists(recovery_points_dir):
                for filename in os.listdir(recovery_points_dir):
                    if filename.endswith('.json'):
                        filepath = os.path.join(recovery_points_dir, filename)
                        try:
                            with open(filepath, 'r') as f:
                                recovery_data = json.load(f)
                                timestamp = datetime.fromisoformat(recovery_data['timestamp'])
                                if timestamp < cutoff_date:
                                    # Remove recovery point files
                                    os.remove(filepath)
                                    
                                    # Remove associated backup files
                                    if os.path.exists(recovery_data.get('database_backup', '')):
                                        os.remove(recovery_data['database_backup'])
                                    if os.path.exists(recovery_data.get('code_snapshot', '')):
                                        shutil.rmtree(os.path.dirname(recovery_data['code_snapshot']))
                                    if os.path.exists(recovery_data.get('config_snapshot', '')):
                                        shutil.rmtree(os.path.dirname(recovery_data['config_snapshot']))
                                    
                                    cleaned_count += 1
                        except Exception as e:
                            self.logger.warning(f"Failed to process recovery point {filename}: {e}")
            
            self.logger.info(f"Cleaned up {cleaned_count} old recovery points")
            
        except Exception as e:
            self.logger.error(f"Failed to cleanup recovery points: {e}")


class BackupManager:
    """Manages comprehensive backup operations"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.logger = logging.getLogger('backup_manager')
        self.encryption_key = self._load_encryption_key()
        
    def _load_encryption_key(self) -> Optional[bytes]:
        """Load or generate encryption key for backups"""
        key_path = self.config.get('encryption_key_path', '/secrets/backup_encryption_key')
        
        try:
            if os.path.exists(key_path):
                with open(key_path, 'rb') as f:
                    return f.read()
            else:
                # Generate new key
                key = Fernet.generate_key()
                os.makedirs(os.path.dirname(key_path), exist_ok=True)
                with open(key_path, 'wb') as f:
                    f.write(key)
                return key
        except Exception as e:
            logging.error(f"Failed to load encryption key: {e}")
            return None
    
    async def create_database_backup(self, backup_name: str) -> str:
        """Create encrypted database backup"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f"{backup_name}_{timestamp}.sql.gz"
        backup_path = os.path.join('/backups/database', backup_filename)
        
        os.makedirs(os.path.dirname(backup_path), exist_ok=True)
        
        try:
            # Create database dump
            dump_cmd = [
                'pg_dump',
                '--verbose',
                '--no-password',
                '--format=custom',
                '--compress=9',
                '--file', backup_path,
                'postgresql://user:pass@localhost/spirittours'  # TODO: Use actual connection string
            ]
            
            process = await asyncio.create_subprocess_exec(
                *dump_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise Exception(f"pg_dump failed: {stderr.decode()}")
            
            # Encrypt backup if encryption is enabled
            if self.encryption_key:
                encrypted_path = f"{backup_path}.enc"
                await self._encrypt_file(backup_path, encrypted_path)
                os.remove(backup_path)  # Remove unencrypted version
                backup_path = encrypted_path
            
            return backup_path
            
        except Exception as e:
            self.logger.error(f"Database backup failed: {e}")
            raise
    
    async def _encrypt_file(self, input_path: str, output_path: str):
        """Encrypt file using Fernet encryption"""
        if not self.encryption_key:
            raise ValueError("No encryption key available")
        
        fernet = Fernet(self.encryption_key)
        
        async with aiofiles.open(input_path, 'rb') as infile:
            async with aiofiles.open(output_path, 'wb') as outfile:
                data = await infile.read()
                encrypted_data = fernet.encrypt(data)
                await outfile.write(encrypted_data)


class MonitoringClient:
    """Client for monitoring and health metrics collection"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.logger = logging.getLogger('monitoring_client')
    
    async def collect_health_metrics(self) -> Dict[str, float]:
        """Collect comprehensive health metrics"""
        metrics = {}
        
        try:
            # System metrics
            metrics['cpu_usage'] = psutil.cpu_percent()
            metrics['memory_usage'] = psutil.virtual_memory().percent
            metrics['disk_usage'] = psutil.disk_usage('/').percent
            
            # Network metrics
            net_io = psutil.net_io_counters()
            metrics['network_bytes_sent'] = net_io.bytes_sent
            metrics['network_bytes_recv'] = net_io.bytes_recv
            
            # Process metrics
            metrics['process_count'] = len(psutil.pids())
            
            # Load average
            metrics['load_average_1min'] = os.getloadavg()[0]
            
            return metrics
            
        except Exception as e:
            self.logger.error(f"Failed to collect health metrics: {e}")
            return {}


async def main():
    """Main function for disaster recovery CLI"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Spirit Tours Disaster Recovery System')
    parser.add_argument('action', choices=[
        'create_recovery_point', 'rollback', 'disaster_recovery', 
        'list_recovery_points', 'cleanup', 'status'
    ])
    parser.add_argument('--version', help='Target deployment version')
    parser.add_argument('--recovery-type', choices=[rt.value for rt in RecoveryType])
    parser.add_argument('--force', action='store_true', help='Force operation without validation')
    parser.add_argument('--config', help='Configuration file path')
    
    args = parser.parse_args()
    
    # Initialize disaster recovery orchestrator
    config_path = args.config or '/home/user/webapp/config/disaster_recovery.yaml'
    orchestrator = DisasterRecoveryOrchestrator(config_path)
    
    try:
        if args.action == 'create_recovery_point':
            version = args.version or 'manual_recovery_point'
            recovery_point = await orchestrator.create_recovery_point(version)
            print(f"Recovery point created: {recovery_point.timestamp}")
            
        elif args.action == 'rollback':
            if not args.version:
                print("Error: --version required for rollback")
                return 1
            
            operation = await orchestrator.execute_rollback(
                target_version=args.version,
                force=args.force
            )
            print(f"Rollback operation: {operation.operation_id} - Status: {operation.status}")
            
        elif args.action == 'disaster_recovery':
            if not args.recovery_type:
                print("Error: --recovery-type required for disaster recovery")
                return 1
            
            recovery_type = RecoveryType(args.recovery_type)
            operation = await orchestrator.execute_disaster_recovery(
                recovery_type=recovery_type,
                emergency_mode=args.force
            )
            print(f"Disaster recovery operation: {operation.operation_id} - Status: {operation.status}")
            
        elif args.action == 'list_recovery_points':
            recovery_points = await orchestrator.get_available_recovery_points()
            print(f"Found {len(recovery_points)} recovery points:")
            for rp in recovery_points[:10]:  # Show last 10
                print(f"  {rp.timestamp} - {rp.deployment_version} ({rp.recovery_type.value})")
                
        elif args.action == 'cleanup':
            await orchestrator.cleanup_old_recovery_points()
            print("Cleanup completed")
            
        elif args.action == 'status':
            history = await orchestrator.get_recovery_history(limit=10)
            print(f"Recent recovery operations ({len(history)}):")
            for op in history:
                duration = ""
                if op.end_time:
                    duration = f" ({(op.end_time - op.start_time).total_seconds():.1f}s)"
                print(f"  {op.start_time} - {op.recovery_type.value} - {op.status.value}{duration}")
                
    except Exception as e:
        print(f"Error: {e}")
        return 1
    
    return 0


if __name__ == '__main__':
    asyncio.run(main())