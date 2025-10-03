#!/usr/bin/env python3
"""
Disaster Recovery CLI Tool for Spirit Tours
Command-line interface for managing rollbacks and disaster recovery operations
"""

import asyncio
import json
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
import click
import yaml
from tabulate import tabulate
from colorama import init, Fore, Back, Style

# Add the parent directory to the path so we can import our modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.disaster_recovery import (
    DisasterRecoveryOrchestrator, RecoveryType, RecoveryStatus,
    BackupType, RecoveryPoint, RecoveryOperation
)

# Initialize colorama for cross-platform colored output
init(autoreset=True)

class DisasterRecoveryCLI:
    """Command-line interface for disaster recovery operations"""
    
    def __init__(self):
        self.orchestrator = None
        self.config_path = "/home/user/webapp/config/disaster_recovery.yaml"
        
    async def initialize(self, config_path: Optional[str] = None):
        """Initialize the disaster recovery orchestrator"""
        if config_path:
            self.config_path = config_path
            
        self.orchestrator = DisasterRecoveryOrchestrator(self.config_path)
        
    def print_header(self, title: str):
        """Print formatted header"""
        print(f"\n{Fore.CYAN}{Style.BRIGHT}{'=' * 60}")
        print(f"{title:^60}")
        print(f"{'=' * 60}{Style.RESET_ALL}\n")
    
    def print_success(self, message: str):
        """Print success message"""
        print(f"{Fore.GREEN}✓ {message}{Style.RESET_ALL}")
    
    def print_error(self, message: str):
        """Print error message"""
        print(f"{Fore.RED}✗ {message}{Style.RESET_ALL}")
    
    def print_warning(self, message: str):
        """Print warning message"""
        print(f"{Fore.YELLOW}⚠ {message}{Style.RESET_ALL}")
    
    def print_info(self, message: str):
        """Print info message"""
        print(f"{Fore.BLUE}ℹ {message}{Style.RESET_ALL}")
    
    async def show_status(self):
        """Display current system status and recovery operations"""
        self.print_header("Spirit Tours - Disaster Recovery Status")
        
        try:
            # Show recent recovery operations
            history = await self.orchestrator.get_recovery_history(limit=10)
            
            if history:
                print(f"{Fore.CYAN}Recent Recovery Operations:{Style.RESET_ALL}")
                
                table_data = []
                for op in history:
                    duration = ""
                    if op.end_time:
                        duration = f"{(op.end_time - op.start_time).total_seconds():.1f}s"
                    
                    status_color = ""
                    if op.status == RecoveryStatus.COMPLETED:
                        status_color = Fore.GREEN
                    elif op.status == RecoveryStatus.FAILED:
                        status_color = Fore.RED
                    elif op.status == RecoveryStatus.IN_PROGRESS:
                        status_color = Fore.YELLOW
                    
                    table_data.append([
                        op.start_time.strftime("%Y-%m-%d %H:%M:%S"),
                        op.recovery_type.value.replace("_", " ").title(),
                        f"{status_color}{op.status.value.replace('_', ' ').title()}{Style.RESET_ALL}",
                        duration,
                        op.operation_id[:8]
                    ])
                
                headers = ["Timestamp", "Type", "Status", "Duration", "ID"]
                print(tabulate(table_data, headers=headers, tablefmt="grid"))
            else:
                self.print_info("No recent recovery operations found")
            
            # Show available recovery points
            recovery_points = await self.orchestrator.get_available_recovery_points(days_back=7)
            
            if recovery_points:
                print(f"\n{Fore.CYAN}Available Recovery Points (Last 7 days):{Style.RESET_ALL}")
                
                table_data = []
                for rp in recovery_points[:10]:  # Show first 10
                    table_data.append([
                        rp.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                        rp.deployment_version,
                        rp.recovery_type.value.replace("_", " ").title(),
                        f"{rp.health_metrics.get('cpu_usage', 0):.1f}%",
                        f"{rp.health_metrics.get('memory_usage', 0):.1f}%"
                    ])
                
                headers = ["Timestamp", "Version", "Type", "CPU", "Memory"]
                print(tabulate(table_data, headers=headers, tablefmt="grid"))
            else:
                self.print_warning("No recovery points found in the last 7 days")
            
            # Show active operations
            if self.orchestrator.active_operations:
                print(f"\n{Fore.YELLOW}Active Operations:{Style.RESET_ALL}")
                for op_id, operation in self.orchestrator.active_operations.items():
                    print(f"  • {op_id}: {operation.recovery_type.value} - {operation.status.value}")
            
        except Exception as e:
            self.print_error(f"Failed to retrieve status: {e}")
    
    async def create_recovery_point(self, version: str, recovery_type: str = "rollback"):
        """Create a new recovery point"""
        self.print_header("Creating Recovery Point")
        
        try:
            recovery_type_enum = RecoveryType(recovery_type)
            
            self.print_info(f"Creating recovery point for version: {version}")
            self.print_info(f"Recovery type: {recovery_type}")
            
            # Show progress indicator
            print(f"{Fore.YELLOW}Creating recovery point... ", end="")
            
            recovery_point = await self.orchestrator.create_recovery_point(
                deployment_version=version,
                recovery_type=recovery_type_enum
            )
            
            print(f"{Fore.GREEN}✓{Style.RESET_ALL}")
            
            self.print_success(f"Recovery point created successfully!")
            print(f"  Timestamp: {recovery_point.timestamp}")
            print(f"  Version: {recovery_point.deployment_version}")
            print(f"  Database backup: {os.path.basename(recovery_point.database_backup)}")
            print(f"  Code snapshot: {os.path.basename(recovery_point.code_snapshot)}")
            print(f"  Config snapshot: {os.path.basename(recovery_point.config_snapshot)}")
            
            # Show health metrics
            if recovery_point.health_metrics:
                print(f"\n{Fore.CYAN}Health Metrics at Recovery Point:{Style.RESET_ALL}")
                metrics_table = [
                    ["CPU Usage", f"{recovery_point.health_metrics.get('cpu_usage', 0):.1f}%"],
                    ["Memory Usage", f"{recovery_point.health_metrics.get('memory_usage', 0):.1f}%"],
                    ["Disk Usage", f"{recovery_point.health_metrics.get('disk_usage', 0):.1f}%"],
                    ["Load Average", f"{recovery_point.health_metrics.get('load_average_1min', 0):.2f}"],
                ]
                print(tabulate(metrics_table, headers=["Metric", "Value"], tablefmt="simple"))
            
        except ValueError as e:
            self.print_error(f"Invalid recovery type: {recovery_type}")
            self.print_info("Valid types: rollback, failover, restore, emergency_stop, data_recovery, service_recovery, infrastructure_recovery")
        except Exception as e:
            self.print_error(f"Failed to create recovery point: {e}")
    
    async def execute_rollback(self, version: str, force: bool = False, interactive: bool = True):
        """Execute rollback to specified version"""
        self.print_header("Executing Rollback")
        
        try:
            self.print_info(f"Target version: {version}")
            self.print_info(f"Force mode: {'Yes' if force else 'No'}")
            
            # Interactive confirmation
            if interactive and not force:
                response = input(f"\n{Fore.YELLOW}Are you sure you want to rollback to version {version}? (yes/no): {Style.RESET_ALL}")
                if response.lower() not in ['yes', 'y']:
                    self.print_info("Rollback cancelled")
                    return
            
            # Find suitable recovery point
            recovery_points = await self.orchestrator.get_available_recovery_points()
            target_recovery_point = None
            
            for rp in recovery_points:
                if rp.deployment_version == version:
                    target_recovery_point = rp
                    break
            
            if target_recovery_point:
                self.print_info(f"Found recovery point: {target_recovery_point.timestamp}")
            else:
                self.print_warning(f"No recovery point found for version {version}, proceeding with code-only rollback")
            
            # Start rollback operation
            self.print_info("Starting rollback operation...")
            
            operation = await self.orchestrator.execute_rollback(
                target_version=version,
                recovery_point=target_recovery_point,
                force=force
            )
            
            # Monitor rollback progress
            await self._monitor_operation_progress(operation)
            
            # Show final results
            if operation.status == RecoveryStatus.COMPLETED:
                self.print_success("Rollback completed successfully!")
            elif operation.status == RecoveryStatus.PARTIAL:
                self.print_warning(f"Rollback partially completed: {operation.error_message}")
            else:
                self.print_error(f"Rollback failed: {operation.error_message}")
            
            # Show verification results
            if operation.verification_results:
                print(f"\n{Fore.CYAN}Verification Results:{Style.RESET_ALL}")
                for check, passed in operation.verification_results.items():
                    status = f"{Fore.GREEN}✓{Style.RESET_ALL}" if passed else f"{Fore.RED}✗{Style.RESET_ALL}"
                    print(f"  {status} {check.replace('_', ' ').title()}")
            
        except Exception as e:
            self.print_error(f"Rollback operation failed: {e}")
    
    async def execute_disaster_recovery(self, recovery_type: str, emergency: bool = False):
        """Execute disaster recovery operation"""
        self.print_header("Executing Disaster Recovery")
        
        try:
            recovery_type_enum = RecoveryType(recovery_type)
            
            self.print_info(f"Recovery type: {recovery_type}")
            self.print_info(f"Emergency mode: {'Yes' if emergency else 'No'}")
            
            if emergency:
                self.print_warning("EMERGENCY MODE ACTIVATED - Bypassing safety checks")
            
            # Interactive confirmation for critical operations
            if recovery_type_enum in [RecoveryType.EMERGENCY_STOP, RecoveryType.INFRASTRUCTURE_RECOVERY]:
                response = input(f"\n{Fore.RED}WARNING: This is a critical operation that may cause service disruption. Continue? (yes/no): {Style.RESET_ALL}")
                if response.lower() not in ['yes', 'y']:
                    self.print_info("Operation cancelled")
                    return
            
            # Start disaster recovery operation
            self.print_info("Starting disaster recovery operation...")
            
            operation = await self.orchestrator.execute_disaster_recovery(
                recovery_type=recovery_type_enum,
                emergency_mode=emergency
            )
            
            # Monitor operation progress
            await self._monitor_operation_progress(operation)
            
            # Show final results
            if operation.status == RecoveryStatus.COMPLETED:
                self.print_success("Disaster recovery completed successfully!")
            elif operation.status == RecoveryStatus.PARTIAL:
                self.print_warning(f"Disaster recovery partially completed: {operation.error_message}")
            else:
                self.print_error(f"Disaster recovery failed: {operation.error_message}")
            
            # Show affected services
            if operation.affected_services:
                print(f"\n{Fore.CYAN}Affected Services:{Style.RESET_ALL}")
                for service in operation.affected_services:
                    print(f"  • {service}")
            
        except ValueError as e:
            self.print_error(f"Invalid recovery type: {recovery_type}")
            self.print_info("Valid types: failover, restore, emergency_stop, data_recovery, service_recovery, infrastructure_recovery")
        except Exception as e:
            self.print_error(f"Disaster recovery operation failed: {e}")
    
    async def list_recovery_points(self, days: int = 30, limit: int = 50):
        """List available recovery points"""
        self.print_header("Available Recovery Points")
        
        try:
            recovery_points = await self.orchestrator.get_available_recovery_points(days_back=days)
            
            if not recovery_points:
                self.print_info(f"No recovery points found in the last {days} days")
                return
            
            # Limit results
            if len(recovery_points) > limit:
                recovery_points = recovery_points[:limit]
                self.print_info(f"Showing first {limit} of {len(recovery_points)} recovery points")
            
            table_data = []
            for i, rp in enumerate(recovery_points, 1):
                # Calculate age
                age = datetime.now(rp.timestamp.tzinfo) - rp.timestamp
                age_str = f"{age.days}d {age.seconds // 3600}h"
                
                # Format size information
                db_size = "N/A"
                code_size = "N/A"
                
                try:
                    if os.path.exists(rp.database_backup):
                        db_size = f"{os.path.getsize(rp.database_backup) / 1024 / 1024:.1f}MB"
                except:
                    pass
                    
                try:
                    if os.path.exists(rp.code_snapshot):
                        code_size = f"{os.path.getsize(rp.code_snapshot) / 1024 / 1024:.1f}MB"
                except:
                    pass
                
                table_data.append([
                    i,
                    rp.timestamp.strftime("%Y-%m-%d %H:%M"),
                    rp.deployment_version[:20] if len(rp.deployment_version) > 20 else rp.deployment_version,
                    rp.recovery_type.value.replace("_", " ").title(),
                    age_str,
                    db_size,
                    code_size,
                    f"{rp.health_metrics.get('cpu_usage', 0):.1f}%" if rp.health_metrics else "N/A"
                ])
            
            headers = ["#", "Timestamp", "Version", "Type", "Age", "DB Size", "Code Size", "CPU"]
            print(tabulate(table_data, headers=headers, tablefmt="grid"))
            
            # Show summary statistics
            print(f"\n{Fore.CYAN}Summary:{Style.RESET_ALL}")
            print(f"  Total recovery points: {len(recovery_points)}")
            
            # Group by type
            type_counts = {}
            for rp in recovery_points:
                type_counts[rp.recovery_type.value] = type_counts.get(rp.recovery_type.value, 0) + 1
            
            for recovery_type, count in type_counts.items():
                print(f"  {recovery_type.replace('_', ' ').title()}: {count}")
            
        except Exception as e:
            self.print_error(f"Failed to list recovery points: {e}")
    
    async def cleanup_old_backups(self, dry_run: bool = False):
        """Cleanup old backup files and recovery points"""
        self.print_header("Cleanup Old Backups")
        
        try:
            if dry_run:
                self.print_info("DRY RUN MODE - No files will be deleted")
            
            self.print_info("Scanning for old backup files...")
            
            # Get current recovery points before cleanup
            before_count = len(await self.orchestrator.get_available_recovery_points(days_back=365))
            
            if not dry_run:
                await self.orchestrator.cleanup_old_recovery_points()
            
            # Get recovery points after cleanup
            after_count = len(await self.orchestrator.get_available_recovery_points(days_back=365))
            
            cleaned_count = before_count - after_count
            
            if dry_run:
                self.print_info(f"Would clean up approximately {cleaned_count} old recovery points")
            else:
                self.print_success(f"Cleaned up {cleaned_count} old recovery points")
            
        except Exception as e:
            self.print_error(f"Cleanup operation failed: {e}")
    
    async def validate_system_health(self):
        """Validate current system health and readiness"""
        self.print_header("System Health Validation")
        
        try:
            # Check orchestrator initialization
            if not self.orchestrator:
                await self.initialize()
            
            health_checks = []
            
            # Database connectivity
            try:
                if self.orchestrator.db_engine:
                    with self.orchestrator.db_engine.connect() as conn:
                        conn.execute("SELECT 1")
                    health_checks.append(("Database Connection", True, "Connected successfully"))
                else:
                    health_checks.append(("Database Connection", False, "Database engine not initialized"))
            except Exception as e:
                health_checks.append(("Database Connection", False, f"Connection failed: {e}"))
            
            # Redis connectivity
            try:
                if self.orchestrator.redis_client:
                    self.orchestrator.redis_client.ping()
                    health_checks.append(("Redis Connection", True, "Connected successfully"))
                else:
                    health_checks.append(("Redis Connection", False, "Redis client not initialized"))
            except Exception as e:
                health_checks.append(("Redis Connection", False, f"Connection failed: {e}"))
            
            # Docker connectivity
            try:
                self.orchestrator.docker_client.ping()
                containers = self.orchestrator.docker_client.containers.list()
                health_checks.append(("Docker Connection", True, f"Connected - {len(containers)} containers"))
            except Exception as e:
                health_checks.append(("Docker Connection", False, f"Connection failed: {e}"))
            
            # Backup storage access
            try:
                backup_dir = "/backups"
                os.makedirs(backup_dir, exist_ok=True)
                test_file = os.path.join(backup_dir, "test_write.tmp")
                with open(test_file, 'w') as f:
                    f.write("test")
                os.remove(test_file)
                health_checks.append(("Backup Storage", True, "Read/write access confirmed"))
            except Exception as e:
                health_checks.append(("Backup Storage", False, f"Access failed: {e}"))
            
            # System resources
            try:
                import psutil
                cpu_percent = psutil.cpu_percent()
                memory_percent = psutil.virtual_memory().percent
                disk_percent = psutil.disk_usage('/').percent
                
                resource_status = "Good"
                resource_details = f"CPU: {cpu_percent:.1f}%, Memory: {memory_percent:.1f}%, Disk: {disk_percent:.1f}%"
                
                if cpu_percent > 90 or memory_percent > 90 or disk_percent > 90:
                    resource_status = "Warning - High usage"
                
                health_checks.append(("System Resources", cpu_percent < 95 and memory_percent < 95 and disk_percent < 95, resource_details))
            except Exception as e:
                health_checks.append(("System Resources", False, f"Check failed: {e}"))
            
            # Display results
            table_data = []
            overall_healthy = True
            
            for check_name, status, details in health_checks:
                status_symbol = f"{Fore.GREEN}✓{Style.RESET_ALL}" if status else f"{Fore.RED}✗{Style.RESET_ALL}"
                status_text = f"{Fore.GREEN}Healthy{Style.RESET_ALL}" if status else f"{Fore.RED}Unhealthy{Style.RESET_ALL}"
                
                table_data.append([status_symbol, check_name, status_text, details])
                
                if not status:
                    overall_healthy = False
            
            headers = ["", "Component", "Status", "Details"]
            print(tabulate(table_data, headers=headers, tablefmt="grid"))
            
            # Overall status
            if overall_healthy:
                self.print_success("System is healthy and ready for disaster recovery operations")
            else:
                self.print_warning("System has health issues that may affect disaster recovery")
            
        except Exception as e:
            self.print_error(f"Health validation failed: {e}")
    
    async def _monitor_operation_progress(self, operation: RecoveryOperation):
        """Monitor and display progress of recovery operation"""
        print(f"\n{Fore.YELLOW}Monitoring operation progress...{Style.RESET_ALL}")
        
        start_time = time.time()
        last_status = None
        
        while operation.status in [RecoveryStatus.INITIATED, RecoveryStatus.IN_PROGRESS, RecoveryStatus.VERIFYING]:
            # Update status display
            if operation.status != last_status:
                status_display = operation.status.value.replace('_', ' ').title()
                print(f"{Fore.BLUE}Status: {status_display}{Style.RESET_ALL}")
                last_status = operation.status
            
            # Show current step if available
            if operation.rollback_steps and operation.status == RecoveryStatus.IN_PROGRESS:
                # This is a simplified progress indicator
                # In a real implementation, you'd track current step index
                elapsed = time.time() - start_time
                print(f"Elapsed time: {elapsed:.1f}s", end='\r')
            
            await asyncio.sleep(2)  # Check every 2 seconds
        
        print()  # New line after progress monitoring


# Click CLI commands
cli = DisasterRecoveryCLI()

@click.group()
@click.option('--config', '-c', help='Configuration file path')
@click.pass_context
async def disaster_recovery(ctx, config):
    """Spirit Tours Disaster Recovery CLI"""
    ctx.ensure_object(dict)
    ctx.obj['config'] = config
    await cli.initialize(config)

@disaster_recovery.command()
async def status():
    """Show current system status and recovery operations"""
    await cli.show_status()

@disaster_recovery.command()
@click.argument('version')
@click.option('--type', 'recovery_type', default='rollback', help='Recovery point type')
async def create_recovery_point(version, recovery_type):
    """Create a new recovery point"""
    await cli.create_recovery_point(version, recovery_type)

@disaster_recovery.command()
@click.argument('version')
@click.option('--force', is_flag=True, help='Skip validation checks')
@click.option('--non-interactive', is_flag=True, help='Skip confirmation prompts')
async def rollback(version, force, non_interactive):
    """Execute rollback to specified version"""
    await cli.execute_rollback(version, force, not non_interactive)

@disaster_recovery.command()
@click.argument('recovery_type')
@click.option('--emergency', is_flag=True, help='Emergency mode (bypass safety checks)')
async def disaster_recovery_cmd(recovery_type, emergency):
    """Execute disaster recovery operation"""
    await cli.execute_disaster_recovery(recovery_type, emergency)

@disaster_recovery.command()
@click.option('--days', default=30, help='Number of days to look back')
@click.option('--limit', default=50, help='Maximum number of recovery points to show')
async def list_recovery_points(days, limit):
    """List available recovery points"""
    await cli.list_recovery_points(days, limit)

@disaster_recovery.command()
@click.option('--dry-run', is_flag=True, help='Show what would be cleaned without deleting')
async def cleanup(dry_run):
    """Cleanup old backup files and recovery points"""
    await cli.cleanup_old_backups(dry_run)

@disaster_recovery.command()
async def health():
    """Validate system health and readiness"""
    await cli.validate_system_health()


def main():
    """Main entry point for CLI"""
    # Use asyncio.run for the Click commands
    import asyncio
    
    # Monkey patch click commands to work with asyncio
    original_main = disaster_recovery.main
    
    def async_main(*args, **kwargs):
        return asyncio.run(original_main(*args, **kwargs))
    
    disaster_recovery.main = async_main
    disaster_recovery()


if __name__ == '__main__':
    main()