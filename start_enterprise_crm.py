#!/usr/bin/env python3
"""
Start Enterprise CRM
Complete setup and startup script for Spirit Tours Enterprise CRM
"""

import os
import sys
import subprocess
import time
import threading
import signal
from pathlib import Path

def print_banner():
    """Print startup banner"""
    print("="*80)
    print("🏢 SPIRIT TOURS ENTERPRISE CRM")
    print("="*80)
    print("🚀 Sistema Empresarial Completo")
    print("📊 8 Departamentos • 35+ Usuarios • 25 Agentes AI")
    print("🔐 Control RBAC Granular • 13 Sucursales Globales")
    print("="*80)

def setup_enterprise_system():
    """Setup enterprise RBAC system"""
    print("📦 Setting up Enterprise System...")
    
    # Change to backend directory
    backend_dir = Path(__file__).parent / "backend"
    
    # Run enterprise setup
    try:
        result = subprocess.run([
            sys.executable, "setup_enterprise_system.py"
        ], cwd=backend_dir, check=True, capture_output=True, text=True)
        
        print("✅ Enterprise system setup completed!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error setting up enterprise system: {e}")
        print(f"Output: {e.stdout}")
        print(f"Error: {e.stderr}")
        return False

def start_backend():
    """Start the FastAPI backend server"""
    print("🔧 Starting Backend Server...")
    
    backend_dir = Path(__file__).parent / "backend"
    
    # Start the RBAC backend
    backend_process = subprocess.Popen([
        sys.executable, "main_rbac.py"
    ], cwd=backend_dir)
    
    return backend_process

def start_frontend():
    """Start the React frontend"""
    print("🎨 Starting Frontend Server...")
    
    frontend_dir = Path(__file__).parent / "frontend"
    
    # Check if node_modules exists
    if not (frontend_dir / "node_modules").exists():
        print("📦 Installing frontend dependencies...")
        subprocess.run(["npm", "install"], cwd=frontend_dir, check=True)
    
    # Start React development server
    frontend_process = subprocess.Popen([
        "npm", "start"
    ], cwd=frontend_dir)
    
    return frontend_process

def wait_for_servers():
    """Wait for servers to be ready"""
    print("⏳ Waiting for servers to start...")
    time.sleep(5)
    
    # Check backend
    try:
        import requests
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend server is ready!")
        else:
            print("⚠️  Backend server responded but may not be fully ready")
    except Exception as e:
        print(f"⚠️  Could not verify backend status: {e}")
    
    print("🌐 Frontend should be available at: http://localhost:3000")

def print_user_guide():
    """Print user guide"""
    print("\n" + "="*80)
    print("📖 GUÍA DE ACCESO AL SISTEMA")
    print("="*80)
    print("🌐 URL de Acceso: http://localhost:3000")
    print()
    print("👥 USUARIOS DE DEMOSTRACIÓN PRINCIPALES:")
    print("="*80)
    print("🏆 NIVEL EJECUTIVO:")
    print("   • CEO: ceo / CEO123!")
    print("   • COO: coo / COO123!")
    print()
    print("💰 DEPARTAMENTO VENTAS:")
    print("   • Director: sales.director / Sales123!")
    print("   • Gerente: sales.manager / Sales123!")
    print("   • Ejecutivo: sales.senior / Sales123!")
    print()
    print("📞 CALL CENTER:")
    print("   • Director: callcenter.director / Call123!")
    print("   • Agente Senior: agent.senior / Call123!")
    print("   • Agente: agent.standard / Call123!")
    print()
    print("📊 MARKETING:")
    print("   • Director: marketing.director / Mark123!")
    print("   • Especialista: digital.specialist / Mark123!")
    print()
    print("💳 FINANZAS:")
    print("   • Director: finance.director / Finance123!")
    print("   • Contador: accountant / Finance123!")
    print()
    print("🔧 IT & TECNOLOGÍA:")
    print("   • CTO: cto / Tech123!")
    print("   • Desarrollador: developer / Tech123!")
    print("   • Soporte: support.tech / Tech123!")
    print()
    print("🏢 OTROS DEPARTAMENTOS:")
    print("   • Operaciones: operations.director / Ops123!")
    print("   • RRHH: hr.director / HR123!")
    print("   • Legal: legal.director / Legal123!")
    print()
    print("🔐 SUPER ADMIN ORIGINAL:")
    print("   • Admin: admin / Admin123!")
    print()
    print("📋 CARACTERÍSTICAS DEL SISTEMA:")
    print("="*80)
    print("   ✅ 35+ usuarios con diferentes niveles de acceso")
    print("   ✅ 8 departamentos empresariales completos")
    print("   ✅ 25 agentes AI con control de acceso individual")
    print("   ✅ 13 sucursales globales")
    print("   ✅ Sistema RBAC con permisos granulares")
    print("   ✅ Dashboard diferenciado por rol y departamento")
    print("   ✅ Gestión completa de usuarios para administradores")
    print("   ✅ Audit trail y logs de seguridad")
    print()
    print("🚀 El sistema está listo para usar!")
    print("📱 La página de login mostrará todos los usuarios disponibles")
    print("="*80)

def signal_handler(signum, frame):
    """Handle Ctrl+C gracefully"""
    print("\n🛑 Shutting down servers...")
    sys.exit(0)

def main():
    """Main execution function"""
    signal.signal(signal.SIGINT, signal_handler)
    
    print_banner()
    
    # Setup enterprise system
    if not setup_enterprise_system():
        print("❌ Failed to setup enterprise system")
        return 1
    
    print("🚀 Starting servers...")
    
    # Start backend
    backend_process = start_backend()
    
    # Wait a moment for backend to start
    time.sleep(3)
    
    # Start frontend
    frontend_process = start_frontend()
    
    # Wait for servers to be ready
    wait_for_servers()
    
    # Print user guide
    print_user_guide()
    
    try:
        # Keep the script running
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        backend_process.terminate()
        frontend_process.terminate()
        backend_process.wait()
        frontend_process.wait()
        print("✅ Servers stopped")
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)