#!/usr/bin/env python3
"""
Spirit Tours Platform Launcher
Complete system startup with all services
"""

import os
import sys
import time
import subprocess
import signal
import json
from pathlib import Path

class PlatformLauncher:
    def __init__(self):
        self.base_dir = Path("/home/user/webapp")
        self.processes = []
        self.services_status = {}
        
    def check_dependencies(self):
        """Check if all dependencies are installed"""
        print("📦 Checking dependencies...")
        
        # Check Python packages
        try:
            import fastapi
            import sqlalchemy
            import redis
            print("✅ Backend dependencies installed")
            return True
        except ImportError:
            print("⚠️ Some backend dependencies are missing")
            return False
    
    def setup_database(self):
        """Initialize database"""
        print("🗄️ Setting up database...")
        
        # Use SQLite for simplicity in sandbox
        os.environ['DATABASE_URL'] = 'sqlite:///./spirittours.db'
        
        # Create database file
        db_path = self.base_dir / "spirittours.db"
        if not db_path.exists():
            db_path.touch()
        
        print("✅ Database ready (SQLite)")
    
    def start_backend(self):
        """Start FastAPI backend"""
        print("🚀 Starting Backend API...")
        
        os.chdir(self.base_dir / "backend")
        
        # Start uvicorn
        cmd = [
            sys.executable, "-m", "uvicorn",
            "main:app",
            "--host", "0.0.0.0",
            "--port", "8000",
            "--reload"
        ]
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=str(self.base_dir / "backend")
        )
        
        self.processes.append(process)
        print("✅ Backend API starting on port 8000...")
        
        return process
    
    def start_frontend(self):
        """Start React frontend"""
        print("🎨 Starting Frontend...")
        
        frontend_dir = self.base_dir / "frontend"
        
        # Check if node_modules exists
        if not (frontend_dir / "node_modules").exists():
            print("📦 Installing frontend dependencies...")
            subprocess.run(
                ["npm", "install"],
                cwd=str(frontend_dir),
                capture_output=True
            )
        
        # Start React dev server
        cmd = ["npm", "start"]
        
        env = os.environ.copy()
        env["PORT"] = "3000"
        env["REACT_APP_API_URL"] = "http://localhost:8000"
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=str(frontend_dir),
            env=env
        )
        
        self.processes.append(process)
        print("✅ Frontend starting on port 3000...")
        
        return process
    
    def check_service_health(self):
        """Check if services are running"""
        import requests
        
        print("\n🔍 Checking service health...")
        
        # Check backend
        try:
            response = requests.get("http://localhost:8000/health", timeout=5)
            if response.status_code == 200:
                print("✅ Backend API: Healthy")
                self.services_status["backend"] = "running"
        except:
            print("⚠️ Backend API: Not responding yet")
            self.services_status["backend"] = "starting"
        
        # Check frontend
        try:
            response = requests.get("http://localhost:3000", timeout=5)
            if response.status_code == 200:
                print("✅ Frontend: Healthy")
                self.services_status["frontend"] = "running"
        except:
            print("⚠️ Frontend: Not responding yet")
            self.services_status["frontend"] = "starting"
    
    def print_access_info(self):
        """Print access information"""
        print("\n" + "="*50)
        print("🎉 Spirit Tours Platform is starting!")
        print("="*50)
        print("\n📍 Access Points:")
        print("  • Frontend: http://localhost:3000")
        print("  • Backend API: http://localhost:8000")
        print("  • API Documentation: http://localhost:8000/docs")
        print("  • Admin Panel: http://localhost:3000/admin")
        
        print("\n🔑 Default Credentials:")
        print("  • Admin: admin@spirittours.com / admin123")
        print("  • Agent: agent@spirittours.com / agent123")
        
        print("\n📊 System Status:")
        print("  • Backend: " + self.services_status.get("backend", "starting"))
        print("  • Frontend: " + self.services_status.get("frontend", "starting"))
        print("  • Database: SQLite (ready)")
        
        print("\n💡 Tips:")
        print("  • Services may take a moment to fully start")
        print("  • Check logs in the terminal for details")
        print("  • Press Ctrl+C to stop all services")
        print("\n" + "="*50)
    
    def cleanup(self, signum=None, frame=None):
        """Clean up and stop all services"""
        print("\n🛑 Stopping all services...")
        
        for process in self.processes:
            try:
                process.terminate()
                process.wait(timeout=5)
            except:
                process.kill()
        
        print("✅ All services stopped")
        sys.exit(0)
    
    def run(self):
        """Main launcher function"""
        print("="*50)
        print("🌟 Spirit Tours Platform Launcher")
        print("="*50)
        print()
        
        # Set up signal handler for cleanup
        signal.signal(signal.SIGINT, self.cleanup)
        signal.signal(signal.SIGTERM, self.cleanup)
        
        # Check dependencies
        if not self.check_dependencies():
            print("\n⚠️ Installing dependencies first...")
            print("This may take a few minutes...")
            subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt", "-q"])
        
        # Setup database
        self.setup_database()
        
        # Start services
        backend_proc = self.start_backend()
        time.sleep(3)  # Give backend time to start
        
        frontend_proc = self.start_frontend()
        time.sleep(3)  # Give frontend time to start
        
        # Check health
        self.check_service_health()
        
        # Print access info
        self.print_access_info()
        
        # Keep running
        print("\n⌛ Services are running. Press Ctrl+C to stop...")
        
        try:
            # Monitor processes
            while True:
                time.sleep(5)
                # Check if processes are still running
                for proc in self.processes:
                    if proc.poll() is not None:
                        print(f"\n⚠️ A service has stopped unexpectedly")
                        self.cleanup()
        except KeyboardInterrupt:
            self.cleanup()


if __name__ == "__main__":
    launcher = PlatformLauncher()
    launcher.run()