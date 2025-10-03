#!/usr/bin/env python3
"""
Comprehensive Test Runner para Spirit Tours Platform
Script para ejecutar todos los tipos de tests de forma organizada.
"""
import os
import sys
import subprocess
import argparse
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
import json


class TestRunner:
    """Runner principal para todos los tests"""
    
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.results: Dict[str, Any] = {}
        self.start_time = datetime.now()
        
    def log(self, message: str, level: str = "INFO"):
        """Log con timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
    
    def run_command(self, cmd: List[str], description: str) -> Dict[str, Any]:
        """Ejecutar comando y capturar resultado"""
        self.log(f"🚀 {description}")
        
        start_time = time.time()
        try:
            result = subprocess.run(
                cmd, 
                capture_output=True, 
                text=True, 
                timeout=300  # 5 minutes timeout
            )
            
            duration = time.time() - start_time
            
            if result.returncode == 0:
                self.log(f"✅ {description} - PASSED ({duration:.2f}s)")
                return {
                    "status": "PASSED",
                    "duration": duration,
                    "stdout": result.stdout,
                    "stderr": result.stderr
                }
            else:
                self.log(f"❌ {description} - FAILED ({duration:.2f}s)")
                if self.verbose:
                    self.log(f"STDOUT: {result.stdout}")
                    self.log(f"STDERR: {result.stderr}")
                return {
                    "status": "FAILED",
                    "duration": duration,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "returncode": result.returncode
                }
                
        except subprocess.TimeoutExpired:
            self.log(f"⏰ {description} - TIMEOUT")
            return {
                "status": "TIMEOUT",
                "duration": 300,
                "error": "Test timed out after 5 minutes"
            }
        except Exception as e:
            self.log(f"💥 {description} - ERROR: {e}")
            return {
                "status": "ERROR",
                "error": str(e),
                "duration": time.time() - start_time
            }
    
    def run_unit_tests(self) -> Dict[str, Any]:
        """Ejecutar unit tests"""
        cmd = [
            "python", "-m", "pytest",
            "tests/unit/",
            "-v",
            "-m", "unit",
            "--cov=backend",
            "--cov-report=html:reports/coverage/unit",
            "--cov-report=xml:reports/coverage/unit.xml",
            "--junit-xml=reports/junit/unit.xml"
        ]
        
        return self.run_command(cmd, "Unit Tests")
    
    def run_integration_tests(self) -> Dict[str, Any]:
        """Ejecutar integration tests"""
        cmd = [
            "python", "-m", "pytest",
            "tests/integration/",
            "-v",
            "-m", "integration",
            "--cov=backend",
            "--cov-report=html:reports/coverage/integration",
            "--cov-report=xml:reports/coverage/integration.xml",
            "--junit-xml=reports/junit/integration.xml"
        ]
        
        return self.run_command(cmd, "Integration Tests")
    
    def run_e2e_tests(self) -> Dict[str, Any]:
        """Ejecutar end-to-end tests"""
        cmd = [
            "python", "-m", "pytest",
            "tests/e2e/",
            "-v",
            "-m", "e2e",
            "--junit-xml=reports/junit/e2e.xml"
        ]
        
        return self.run_command(cmd, "End-to-End Tests")
    
    def run_performance_tests(self) -> Dict[str, Any]:
        """Ejecutar performance tests"""
        cmd = [
            "python", "-m", "pytest",
            "tests/performance/",
            "-v",
            "-m", "performance",
            "--junit-xml=reports/junit/performance.xml"
        ]
        
        return self.run_command(cmd, "Performance Tests")
    
    def run_load_tests(self) -> Dict[str, Any]:
        """Ejecutar load tests"""
        cmd = [
            "python", "-m", "pytest",
            "tests/load/",
            "-v",
            "-m", "load",
            "--junit-xml=reports/junit/load.xml"
        ]
        
        return self.run_command(cmd, "Load Tests")
    
    def run_security_tests(self) -> Dict[str, Any]:
        """Ejecutar security tests"""
        cmd = [
            "python", "-m", "pytest",
            "tests/security/",
            "-v",
            "-m", "security",
            "--junit-xml=reports/junit/security.xml"
        ]
        
        return self.run_command(cmd, "Security Tests")
    
    def run_smoke_tests(self) -> Dict[str, Any]:
        """Ejecutar smoke tests rápidos"""
        cmd = [
            "python", "-m", "pytest",
            "-v",
            "-m", "smoke",
            "--junit-xml=reports/junit/smoke.xml"
        ]
        
        return self.run_command(cmd, "Smoke Tests")
    
    def run_analytics_tests(self) -> Dict[str, Any]:
        """Ejecutar tests específicos de analytics"""
        cmd = [
            "python", "-m", "pytest",
            "tests/unit/test_analytics_dashboard.py",
            "tests/unit/test_predictive_analytics.py", 
            "tests/unit/test_automated_reports.py",
            "tests/integration/test_analytics_api_integration.py",
            "-v",
            "-m", "analytics",
            "--cov=backend/analytics",
            "--cov-report=html:reports/coverage/analytics",
            "--junit-xml=reports/junit/analytics.xml"
        ]
        
        return self.run_command(cmd, "Analytics Tests")
    
    def create_reports_directory(self):
        """Crear directorios para reportes"""
        directories = [
            "reports/coverage/unit",
            "reports/coverage/integration", 
            "reports/coverage/analytics",
            "reports/junit",
            "reports/performance",
            "reports/security"
        ]
        
        for directory in directories:
            Path(directory).mkdir(parents=True, exist_ok=True)
    
    def generate_summary_report(self) -> Dict[str, Any]:
        """Generar reporte resumen de todos los tests"""
        total_duration = (datetime.now() - self.start_time).total_seconds()
        
        # Contar resultados
        passed_tests = len([r for r in self.results.values() if r.get("status") == "PASSED"])
        failed_tests = len([r for r in self.results.values() if r.get("status") == "FAILED"])
        error_tests = len([r for r in self.results.values() if r.get("status") == "ERROR"])
        timeout_tests = len([r for r in self.results.values() if r.get("status") == "TIMEOUT"])
        total_tests = len(self.results)
        
        # Calcular scores
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        summary = {
            "timestamp": datetime.now().isoformat(),
            "total_duration": total_duration,
            "summary": {
                "total_suites": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "errors": error_tests,
                "timeouts": timeout_tests,
                "success_rate": success_rate
            },
            "test_results": self.results,
            "recommendations": self.get_recommendations()
        }
        
        return summary
    
    def get_recommendations(self) -> List[str]:
        """Generar recomendaciones basadas en resultados"""
        recommendations = []
        
        failed_tests = [name for name, result in self.results.items() 
                       if result.get("status") == "FAILED"]
        
        if failed_tests:
            recommendations.append(f"⚠️ {len(failed_tests)} test suite(s) failed: {', '.join(failed_tests)}")
            recommendations.append("🔧 Review failed tests and fix issues before deployment")
        
        if any(result.get("status") == "TIMEOUT" for result in self.results.values()):
            recommendations.append("⏰ Some tests timed out - consider optimizing slow tests")
        
        if any(result.get("status") == "ERROR" for result in self.results.values()):
            recommendations.append("💥 Test execution errors detected - check test environment")
        
        # Recomendaciones específicas
        if self.results.get("Security Tests", {}).get("status") == "FAILED":
            recommendations.append("🔐 Security vulnerabilities found - address before production")
        
        if self.results.get("Performance Tests", {}).get("status") == "FAILED":
            recommendations.append("🚀 Performance issues detected - optimize before deployment")
        
        if not recommendations:
            recommendations.append("✅ All tests passed successfully!")
            recommendations.append("🚀 Ready for deployment")
        
        return recommendations
    
    def save_report(self, summary: Dict[str, Any]):
        """Guardar reporte en archivo JSON"""
        report_path = f"reports/test_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(report_path, 'w') as f:
            json.dump(summary, f, indent=2)
        
        self.log(f"📊 Test summary saved to: {report_path}")
    
    def print_summary(self, summary: Dict[str, Any]):
        """Imprimir resumen en consola"""
        print("\n" + "="*80)
        print("🎯 SPIRIT TOURS - TEST EXECUTION SUMMARY")
        print("="*80)
        
        print(f"\n📊 Overall Results:")
        print(f"   Total Test Suites: {summary['summary']['total_suites']}")
        print(f"   ✅ Passed: {summary['summary']['passed']}")
        print(f"   ❌ Failed: {summary['summary']['failed']}")
        print(f"   💥 Errors: {summary['summary']['errors']}")
        print(f"   ⏰ Timeouts: {summary['summary']['timeouts']}")
        print(f"   🎯 Success Rate: {summary['summary']['success_rate']:.1f}%")
        print(f"   ⏱️  Total Duration: {summary['total_duration']:.2f}s")
        
        print(f"\n📋 Detailed Results:")
        for test_name, result in summary['test_results'].items():
            status = result.get('status', 'UNKNOWN')
            duration = result.get('duration', 0)
            
            if status == "PASSED":
                icon = "✅"
            elif status == "FAILED":
                icon = "❌"
            elif status == "ERROR":
                icon = "💥"
            elif status == "TIMEOUT":
                icon = "⏰"
            else:
                icon = "❓"
            
            print(f"   {icon} {test_name}: {status} ({duration:.2f}s)")
        
        print(f"\n💡 Recommendations:")
        for rec in summary['recommendations']:
            print(f"   {rec}")
        
        print("\n" + "="*80)


def main():
    """Función principal"""
    parser = argparse.ArgumentParser(description="Spirit Tours Test Runner")
    parser.add_argument(
        "--suite", 
        choices=["all", "unit", "integration", "e2e", "performance", "load", "security", "smoke", "analytics"],
        default="all",
        help="Test suite to run"
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--no-reports", action="store_true", help="Skip generating reports")
    
    args = parser.parse_args()
    
    runner = TestRunner(verbose=args.verbose)
    
    # Crear directorios de reportes
    if not args.no_reports:
        runner.create_reports_directory()
    
    runner.log("🎯 Starting Spirit Tours Test Execution")
    runner.log(f"Suite: {args.suite}")
    
    # Ejecutar tests según la suite seleccionada
    if args.suite == "all":
        runner.results["Unit Tests"] = runner.run_unit_tests()
        runner.results["Integration Tests"] = runner.run_integration_tests() 
        runner.results["E2E Tests"] = runner.run_e2e_tests()
        runner.results["Performance Tests"] = runner.run_performance_tests()
        runner.results["Load Tests"] = runner.run_load_tests()
        runner.results["Security Tests"] = runner.run_security_tests()
    elif args.suite == "unit":
        runner.results["Unit Tests"] = runner.run_unit_tests()
    elif args.suite == "integration":
        runner.results["Integration Tests"] = runner.run_integration_tests()
    elif args.suite == "e2e":
        runner.results["E2E Tests"] = runner.run_e2e_tests()
    elif args.suite == "performance":
        runner.results["Performance Tests"] = runner.run_performance_tests()
    elif args.suite == "load":
        runner.results["Load Tests"] = runner.run_load_tests()
    elif args.suite == "security":
        runner.results["Security Tests"] = runner.run_security_tests()
    elif args.suite == "smoke":
        runner.results["Smoke Tests"] = runner.run_smoke_tests()
    elif args.suite == "analytics":
        runner.results["Analytics Tests"] = runner.run_analytics_tests()
    
    # Generar resumen
    summary = runner.generate_summary_report()
    runner.print_summary(summary)
    
    if not args.no_reports:
        runner.save_report(summary)
    
    # Exit code basado en resultados
    failed_count = summary['summary']['failed'] + summary['summary']['errors']
    if failed_count > 0:
        runner.log(f"❌ {failed_count} test suite(s) failed")
        sys.exit(1)
    else:
        runner.log("✅ All tests passed successfully!")
        sys.exit(0)


if __name__ == "__main__":
    main()