#!/usr/bin/env python3
"""
Spirit Tours Test Suite Runner
Comprehensive test execution script with reporting and analysis.
"""

import argparse
import asyncio
import os
import sys
import subprocess
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import pytest

class TestRunner:
    """Advanced test runner for Spirit Tours platform."""
    
    def __init__(self):
        self.start_time = None
        self.test_results = {}
        self.coverage_threshold = 85
        
    def setup_environment(self):
        """Setup test environment variables."""
        test_env = {
            'TESTING': 'true',
            'DATABASE_URL': 'postgresql://test_user:test_password@localhost:5432/spirittours_test',
            'REDIS_URL': 'redis://localhost:6379/1',  # Use DB 1 for tests
            'SECRET_KEY': 'test_secret_key_for_testing_only',
            'DISABLE_AUTH': 'false',  # Keep auth enabled for realistic testing
            'LOG_LEVEL': 'WARNING',  # Reduce log noise during tests
        }
        
        for key, value in test_env.items():
            os.environ[key] = value
            
        print("✅ Test environment configured")
    
    def run_unit_tests(self, verbose: bool = False, coverage: bool = True) -> Dict:
        """Run unit tests with optional coverage."""
        print("\n🧪 Running Unit Tests...")
        
        cmd = [
            'pytest', 'tests/unit/',
            '--junitxml=unit-test-results.xml',
            '-m', 'unit'
        ]
        
        if coverage:
            cmd.extend([
                '--cov=backend',
                '--cov=ai-agents',
                '--cov-report=html:unit-htmlcov',
                '--cov-report=xml:unit-coverage.xml',
                '--cov-report=term-missing',
                f'--cov-fail-under={self.coverage_threshold}'
            ])
            
        if verbose:
            cmd.append('-v')
        else:
            cmd.extend(['-q', '--tb=short'])
            
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        return {
            'name': 'Unit Tests',
            'success': result.returncode == 0,
            'output': result.stdout,
            'errors': result.stderr,
            'duration': 0  # Will be calculated by caller
        }
    
    def run_integration_tests(self, verbose: bool = False) -> Dict:
        """Run integration tests."""
        print("\n🔗 Running Integration Tests...")
        
        cmd = [
            'pytest', 'tests/integration/',
            '--junitxml=integration-test-results.xml',
            '-m', 'integration'
        ]
        
        if verbose:
            cmd.append('-v')
        else:
            cmd.extend(['-q', '--tb=short'])
            
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        return {
            'name': 'Integration Tests',
            'success': result.returncode == 0,
            'output': result.stdout,
            'errors': result.stderr,
            'duration': 0
        }
    
    def run_e2e_tests(self, verbose: bool = False) -> Dict:
        """Run end-to-end tests."""
        print("\n🌐 Running End-to-End Tests...")
        
        cmd = [
            'pytest', 'tests/e2e/',
            '--junitxml=e2e-test-results.xml',
            '-m', 'e2e'
        ]
        
        if verbose:
            cmd.append('-v')
        else:
            cmd.extend(['-q', '--tb=short'])
            
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        return {
            'name': 'E2E Tests',
            'success': result.returncode == 0,
            'output': result.stdout,
            'errors': result.stderr,
            'duration': 0
        }
    
    def run_performance_tests(self, verbose: bool = False) -> Dict:
        """Run performance tests."""
        print("\n⚡ Running Performance Tests...")
        
        cmd = [
            'pytest', 
            'tests/unit/test_payment_service.py::TestPaymentPerformance',
            'tests/unit/test_notification_service.py::TestNotificationPerformance',
            'tests/unit/test_file_service.py::TestFileServicePerformance',
            'tests/unit/test_ai_orchestrator.py::TestAISystemPerformance',
            '--junitxml=performance-test-results.xml',
            '--benchmark-json=benchmark-results.json',
            '-m', 'slow or performance'
        ]
        
        if verbose:
            cmd.append('-v')
        else:
            cmd.extend(['-q', '--tb=short'])
            
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        return {
            'name': 'Performance Tests',
            'success': result.returncode == 0,
            'output': result.stdout,
            'errors': result.stderr,
            'duration': 0
        }
    
    def run_security_tests(self) -> Dict:
        """Run security analysis."""
        print("\n🔒 Running Security Analysis...")
        
        # Bandit security scan
        bandit_cmd = [
            'bandit', '-r', 'backend/', 'ai-agents/',
            '-f', 'json', '-o', 'bandit-report.json'
        ]
        
        bandit_result = subprocess.run(bandit_cmd, capture_output=True, text=True)
        
        # Safety check for dependencies
        safety_cmd = ['safety', 'check', '--json', '--output', 'safety-report.json']
        safety_result = subprocess.run(safety_cmd, capture_output=True, text=True)
        
        return {
            'name': 'Security Analysis',
            'success': bandit_result.returncode == 0 and safety_result.returncode == 0,
            'output': f"Bandit: {bandit_result.stdout}\nSafety: {safety_result.stdout}",
            'errors': f"Bandit: {bandit_result.stderr}\nSafety: {safety_result.stderr}",
            'duration': 0
        }
    
    def check_code_quality(self) -> Dict:
        """Check code quality with linting tools."""
        print("\n✨ Checking Code Quality...")
        
        # Black formatting check
        black_cmd = ['black', '--check', '--diff', 'backend/', 'ai-agents/']
        black_result = subprocess.run(black_cmd, capture_output=True, text=True)
        
        # Flake8 linting
        flake8_cmd = ['flake8', 'backend/', 'ai-agents/', '--output-file=flake8-report.txt']
        flake8_result = subprocess.run(flake8_cmd, capture_output=True, text=True)
        
        # Import sorting check
        isort_cmd = ['isort', '--check-only', '--diff', 'backend/', 'ai-agents/']
        isort_result = subprocess.run(isort_cmd, capture_output=True, text=True)
        
        all_passed = (
            black_result.returncode == 0 and 
            flake8_result.returncode == 0 and 
            isort_result.returncode == 0
        )
        
        return {
            'name': 'Code Quality',
            'success': all_passed,
            'output': f"Black: OK\nFlake8: {'OK' if flake8_result.returncode == 0 else 'Issues found'}\nIsort: OK",
            'errors': f"Black: {black_result.stderr}\nFlake8: {flake8_result.stderr}\nIsort: {isort_result.stderr}",
            'duration': 0
        }
    
    def generate_report(self, results: List[Dict], total_duration: float):
        """Generate comprehensive test report."""
        print("\n" + "="*80)
        print("🎯 SPIRIT TOURS TEST SUITE SUMMARY")
        print("="*80)
        
        print(f"📅 Executed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"⏱️  Total Duration: {total_duration:.2f} seconds")
        print()
        
        # Test results summary
        total_tests = len(results)
        passed_tests = sum(1 for r in results if r['success'])
        failed_tests = total_tests - passed_tests
        
        print("📊 RESULTS SUMMARY:")
        print(f"   ✅ Passed: {passed_tests}/{total_tests}")
        print(f"   ❌ Failed: {failed_tests}/{total_tests}")
        print(f"   📈 Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print()
        
        # Detailed results
        print("📋 DETAILED RESULTS:")
        for result in results:
            status = "✅ PASS" if result['success'] else "❌ FAIL"
            print(f"   {status} {result['name']}")
            
            if not result['success'] and result['errors']:
                print(f"      Error: {result['errors'][:100]}...")
        
        print()
        
        # Coverage information
        if Path('unit-coverage.xml').exists():
            print("📈 COVERAGE REPORTS:")
            print("   • HTML Report: unit-htmlcov/index.html")
            print("   • XML Report: unit-coverage.xml")
            print()
        
        # Recommendations
        print("💡 RECOMMENDATIONS:")
        if failed_tests > 0:
            print("   • Review failed tests and fix issues")
            print("   • Check error logs for detailed information")
        
        if Path('benchmark-results.json').exists():
            print("   • Review performance benchmarks")
            
        if Path('bandit-report.json').exists():
            print("   • Review security scan results")
        
        print("   • Maintain test coverage above 85%")
        print("   • Run tests regularly during development")
        print()
        
        # Final status
        overall_success = all(r['success'] for r in results)
        if overall_success:
            print("🎉 ALL TESTS PASSED! Platform is ready for deployment.")
        else:
            print("⚠️  SOME TESTS FAILED. Please fix issues before deployment.")
            
        return overall_success
    
    def run_all_tests(self, test_types: List[str], verbose: bool = False, coverage: bool = True) -> bool:
        """Run specified test suites."""
        self.start_time = time.time()
        results = []
        
        print("🚀 Starting Spirit Tours Test Suite")
        print(f"📋 Running tests: {', '.join(test_types)}")
        
        # Setup test environment
        self.setup_environment()
        
        # Run selected test suites
        if 'unit' in test_types:
            start = time.time()
            result = self.run_unit_tests(verbose, coverage)
            result['duration'] = time.time() - start
            results.append(result)
        
        if 'integration' in test_types:
            start = time.time()
            result = self.run_integration_tests(verbose)
            result['duration'] = time.time() - start
            results.append(result)
        
        if 'e2e' in test_types:
            start = time.time()
            result = self.run_e2e_tests(verbose)
            result['duration'] = time.time() - start
            results.append(result)
        
        if 'performance' in test_types:
            start = time.time()
            result = self.run_performance_tests(verbose)
            result['duration'] = time.time() - start
            results.append(result)
        
        if 'security' in test_types:
            start = time.time()
            result = self.run_security_tests()
            result['duration'] = time.time() - start
            results.append(result)
        
        if 'quality' in test_types:
            start = time.time()
            result = self.check_code_quality()
            result['duration'] = time.time() - start
            results.append(result)
        
        # Generate final report
        total_duration = time.time() - self.start_time
        return self.generate_report(results, total_duration)

def main():
    """Main entry point for test runner."""
    parser = argparse.ArgumentParser(
        description='Spirit Tours Test Suite Runner',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_tests.py                          # Run all tests
  python run_tests.py --types unit integration # Run specific test types
  python run_tests.py --verbose               # Verbose output
  python run_tests.py --no-coverage          # Skip coverage report
  python run_tests.py --quick                # Run only unit tests
        """
    )
    
    parser.add_argument(
        '--types',
        nargs='+',
        choices=['unit', 'integration', 'e2e', 'performance', 'security', 'quality'],
        default=['unit', 'integration', 'e2e', 'security', 'quality'],
        help='Test types to run (default: all except performance)'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Verbose output'
    )
    
    parser.add_argument(
        '--no-coverage',
        action='store_true',
        help='Skip coverage reporting'
    )
    
    parser.add_argument(
        '--quick',
        action='store_true',
        help='Run only unit tests (quick check)'
    )
    
    parser.add_argument(
        '--performance',
        action='store_true',
        help='Include performance tests'
    )
    
    args = parser.parse_args()
    
    # Adjust test types based on flags
    if args.quick:
        test_types = ['unit']
    elif args.performance:
        test_types = args.types + ['performance'] if 'performance' not in args.types else args.types
    else:
        test_types = args.types
    
    # Initialize and run tests
    runner = TestRunner()
    
    try:
        success = runner.run_all_tests(
            test_types=test_types,
            verbose=args.verbose,
            coverage=not args.no_coverage
        )
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Test execution interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n💥 Test runner error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()