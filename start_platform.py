#!/usr/bin/env python3
"""
Enterprise Booking Platform Startup Script
Comprehensive system initialization and service management
"""

import os
import sys
import subprocess
import time
import signal
import logging
from pathlib import Path
from typing import Dict, List, Optional
import json
import psutil

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PlatformManager:
    """Enterprise Platform Management System"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.backend_path = self.project_root / "backend"
        self.services = {}
        self.running_processes = []
        
        # Service configurations
        self.service_configs = {
            "database": {
                "name": "PostgreSQL Database",
                "required": True,
                "check_command": ["pg_isready", "-h", "localhost", "-p", "5432"],
                "start_command": None,  # System service
                "description": "PostgreSQL database server"
            },
            "redis": {
                "name": "Redis Cache",
                "required": False,
                "check_command": ["redis-cli", "ping"],
                "start_command": ["redis-server"],
                "description": "Redis caching server"
            },
            "backend": {
                "name": "FastAPI Backend",
                "required": True,
                "check_command": None,
                "start_command": ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
                "description": "Main FastAPI backend service"
            }
        }
        
        self.setup_signal_handlers()
    
    def setup_signal_handlers(self):
        """Setup graceful shutdown handlers"""
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
    
    def signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, shutting down gracefully...")
        self.stop_all_services()
        sys.exit(0)
    
    def check_prerequisites(self) -> bool:
        """Check system prerequisites"""
        
        logger.info("🔍 Checking system prerequisites...")
        
        # Check Python version
        if sys.version_info < (3, 9):
            logger.error("❌ Python 3.9+ required")
            return False
        
        logger.info(f"✅ Python {sys.version.split()[0]}")
        
        # Check required Python packages
        required_packages = [
            "fastapi", "uvicorn", "sqlalchemy", "alembic", 
            "psycopg2", "aiohttp", "pydantic"
        ]
        
        missing_packages = []
        for package in required_packages:
            try:
                __import__(package.replace("-", "_"))
                logger.info(f"✅ {package}")
            except ImportError:
                missing_packages.append(package)
                logger.error(f"❌ {package}")
        
        if missing_packages:
            logger.error(f"❌ Missing required packages: {', '.join(missing_packages)}")
            logger.info("💡 Install with: pip install -r requirements.txt")
            return False
        
        # Check database connection
        if not self.check_database():
            logger.error("❌ Database connection failed")
            return False
        
        return True
    
    def check_database(self) -> bool:
        """Check database connection and setup"""
        
        try:
            import psycopg2
            
            db_config = {
                "host": os.environ.get("DB_HOST", "localhost"),
                "port": int(os.environ.get("DB_PORT", "5432")),
                "user": os.environ.get("DB_USER", "postgres"),
                "password": os.environ.get("DB_PASSWORD", "postgres"),
                "database": os.environ.get("DB_NAME", "enterprise_booking")
            }
            
            # Test connection
            conn = psycopg2.connect(**db_config)
            conn.close()
            
            logger.info(f"✅ Database connection successful ({db_config['database']}@{db_config['host']})")
            return True
            
        except Exception as e:
            logger.warning(f"⚠️  Database connection failed: {str(e)}")
            logger.info("💡 Run 'python init_database.py' to initialize the database")
            return False
    
    def check_service(self, service_name: str) -> bool:
        """Check if a service is running"""
        
        config = self.service_configs.get(service_name)
        if not config or not config.get("check_command"):
            return False
        
        try:
            result = subprocess.run(
                config["check_command"],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.returncode == 0
        except Exception:
            return False
    
    def start_service(self, service_name: str) -> bool:
        """Start a service"""
        
        config = self.service_configs.get(service_name)
        if not config:
            logger.error(f"❌ Unknown service: {service_name}")
            return False
        
        if not config.get("start_command"):
            logger.info(f"ℹ️  {config['name']} is a system service (manage externally)")
            return True
        
        try:
            logger.info(f"🚀 Starting {config['name']}...")
            
            if service_name == "backend":
                # Change to project root for backend
                process = subprocess.Popen(
                    config["start_command"],
                    cwd=self.project_root,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True
                )
            else:
                process = subprocess.Popen(
                    config["start_command"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True
                )
            
            self.running_processes.append(process)
            self.services[service_name] = process
            
            # Give service time to start
            time.sleep(2)
            
            # Check if process is still running
            if process.poll() is None:
                logger.info(f"✅ {config['name']} started (PID: {process.pid})")
                return True
            else:
                logger.error(f"❌ {config['name']} failed to start")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to start {config['name']}: {str(e)}")
            return False
    
    def stop_service(self, service_name: str):
        """Stop a service"""
        
        if service_name in self.services:
            process = self.services[service_name]
            logger.info(f"🛑 Stopping {self.service_configs[service_name]['name']}...")
            
            try:
                process.terminate()
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                logger.warning(f"⚠️  Force killing {service_name}")
                process.kill()
            
            del self.services[service_name]
            
            if process in self.running_processes:
                self.running_processes.remove(process)
    
    def stop_all_services(self):
        """Stop all running services"""
        
        for service_name in list(self.services.keys()):
            self.stop_service(service_name)
    
    def display_status(self):
        """Display platform status"""
        
        logger.info("\n" + "=" * 70)
        logger.info("🎯 ENTERPRISE BOOKING PLATFORM - STATUS")
        logger.info("=" * 70)
        
        for service_name, config in self.service_configs.items():
            status = "🟢 RUNNING" if self.check_service(service_name) else "🔴 STOPPED"
            required = "REQUIRED" if config["required"] else "OPTIONAL"
            
            logger.info(f"{config['name']:.<40} {status:>15} ({required})")
        
        logger.info("\n📊 System Information:")
        logger.info(f"   • CPU Usage: {psutil.cpu_percent()}%")
        logger.info(f"   • Memory Usage: {psutil.virtual_memory().percent}%")
        logger.info(f"   • Disk Usage: {psutil.disk_usage('/').percent}%")
        
        if self.services:
            logger.info(f"\n🔧 Running Services: {len(self.services)}")
            for service_name, process in self.services.items():
                logger.info(f"   • {service_name} (PID: {process.pid})")
    
    def run_database_init(self) -> bool:
        """Initialize database if needed"""
        
        if self.check_database():
            return True
        
        logger.info("🗄️  Database not initialized. Running initialization...")
        
        try:
            result = subprocess.run(
                [sys.executable, "init_database.py"],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                logger.info("✅ Database initialization completed")
                return True
            else:
                logger.error(f"❌ Database initialization failed: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Database initialization error: {str(e)}")
            return False
    
    def install_dependencies(self) -> bool:
        """Install Python dependencies"""
        
        requirements_file = self.project_root / "requirements.txt"
        
        if not requirements_file.exists():
            logger.warning("⚠️  requirements.txt not found, skipping dependency installation")
            return True
        
        logger.info("📦 Installing Python dependencies...")
        
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                logger.info("✅ Dependencies installed successfully")
                return True
            else:
                logger.error(f"❌ Dependency installation failed: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Dependency installation error: {str(e)}")
            return False
    
    def start_platform(self):
        """Start the complete platform"""
        
        logger.info("🚀 STARTING ENTERPRISE BOOKING PLATFORM")
        logger.info("=" * 70)
        
        # Step 1: Check prerequisites
        if not self.check_prerequisites():
            logger.error("❌ Prerequisites check failed. Cannot start platform.")
            return False
        
        # Step 2: Initialize database if needed
        if not self.run_database_init():
            logger.error("❌ Database initialization failed. Cannot start platform.")
            return False
        
        # Step 3: Start required services
        logger.info("\n🔧 Starting platform services...")
        
        success = True
        for service_name, config in self.service_configs.items():
            if config["required"] or service_name == "backend":
                if service_name != "database":  # Database should already be running
                    if not self.start_service(service_name):
                        success = False
        
        if success:
            self.display_status()
            
            logger.info("\n" + "=" * 70)
            logger.info("🎉 PLATFORM STARTED SUCCESSFULLY!")
            logger.info("=" * 70)
            logger.info("\n🌐 Access Points:")
            logger.info("   • API Documentation: http://localhost:8000/docs")
            logger.info("   • API ReDoc: http://localhost:8000/redoc")
            logger.info("   • Health Check: http://localhost:8000/health")
            logger.info("   • System Status: http://localhost:8000/api/v1/agents/status")
            logger.info("\n🔑 Default Admin Credentials:")
            logger.info("   • Email: admin@spirittours.com")
            logger.info("   • Password: admin123")
            logger.info("\n⚠️  Press Ctrl+C to stop the platform")
            
            # Keep platform running
            try:
                while True:
                    time.sleep(1)
                    # Check if any required service has died
                    for service_name, process in list(self.services.items()):
                        if process.poll() is not None:
                            logger.error(f"❌ Service {service_name} has died!")
                            return False
            except KeyboardInterrupt:
                logger.info("\n👋 Shutting down platform...")
                self.stop_all_services()
                logger.info("✅ Platform stopped successfully")
        else:
            logger.error("❌ Failed to start some required services")
            self.stop_all_services()
            return False
        
        return True

def main():
    """Main entry point"""
    
    # Parse command line arguments
    import argparse
    
    parser = argparse.ArgumentParser(description="Enterprise Booking Platform Manager")
    parser.add_argument("action", nargs="?", default="start", 
                       choices=["start", "stop", "status", "init-db", "install-deps"],
                       help="Action to perform")
    
    args = parser.parse_args()
    
    manager = PlatformManager()
    
    try:
        if args.action == "start":
            return manager.start_platform()
        elif args.action == "status":
            manager.display_status()
            return True
        elif args.action == "init-db":
            return manager.run_database_init()
        elif args.action == "install-deps":
            return manager.install_dependencies()
        elif args.action == "stop":
            manager.stop_all_services()
            return True
        else:
            parser.print_help()
            return False
            
    except Exception as e:
        logger.error(f"❌ Platform management error: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)