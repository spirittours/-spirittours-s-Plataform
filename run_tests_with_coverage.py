#!/usr/bin/env python3
"""
Script to run all tests with coverage report
"""
import os
import sys
import subprocess
import json
from pathlib import Path
from datetime import datetime

def setup_test_environment():
    """Setup test environment variables and dependencies."""
    print("🔧 Setting up test environment...")
    
    # Set test environment variables
    os.environ['ENVIRONMENT'] = 'test'
    os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
    os.environ['REDIS_URL'] = 'redis://localhost:6379/1'
    os.environ['JWT_SECRET'] = 'test_secret_key'
    
    # Install test dependencies if needed
    subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 
                   'pytest', 'pytest-cov', 'pytest-asyncio', 'pytest-mock'])
    
    print("✅ Test environment ready\n")

def run_unit_tests():
    """Run unit tests with coverage."""
    print("🧪 Running Unit Tests...")
    result = subprocess.run([
        sys.executable, '-m', 'pytest',
        'tests/unit',
        '-v',
        '--cov=backend',
        '--cov-report=term-missing',
        '--cov-report=json',
        '-m', 'not integration and not e2e',
        '--tb=short'
    ], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print(result.stderr)
    
    return result.returncode == 0

def run_integration_tests():
    """Run integration tests."""
    print("\n🔗 Running Integration Tests...")
    result = subprocess.run([
        sys.executable, '-m', 'pytest',
        'tests/integration',
        '-v',
        '--cov=backend',
        '--cov-append',
        '--cov-report=term-missing',
        '-m', 'integration',
        '--tb=short'
    ], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print(result.stderr)
    
    return result.returncode == 0

def run_api_tests():
    """Run API endpoint tests."""
    print("\n🌐 Running API Tests...")
    result = subprocess.run([
        sys.executable, '-m', 'pytest',
        'tests/api',
        '-v',
        '--cov=backend',
        '--cov-append',
        '--cov-report=term-missing',
        '--tb=short'
    ], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print(result.stderr)
    
    return result.returncode == 0

def generate_coverage_report():
    """Generate detailed coverage report."""
    print("\n📊 Generating Coverage Report...")
    
    # Generate HTML report
    subprocess.run([
        sys.executable, '-m', 'coverage', 'html',
        '--directory=coverage_html'
    ])
    
    # Generate XML report for CI/CD
    subprocess.run([
        sys.executable, '-m', 'coverage', 'xml',
        '-o', 'coverage.xml'
    ])
    
    # Read JSON coverage
    coverage_file = Path('coverage.json')
    if coverage_file.exists():
        with open(coverage_file, 'r') as f:
            coverage_data = json.load(f)
            total_coverage = coverage_data.get('totals', {}).get('percent_covered', 0)
            
        print(f"\n✨ Total Coverage: {total_coverage:.2f}%")
        
        # Check coverage threshold
        COVERAGE_THRESHOLD = 80
        if total_coverage >= COVERAGE_THRESHOLD:
            print(f"✅ Coverage meets threshold ({COVERAGE_THRESHOLD}%)")
            return True
        else:
            print(f"⚠️  Coverage below threshold ({COVERAGE_THRESHOLD}%)")
            return False
    
    return False

def run_specific_test_suite(suite_name):
    """Run a specific test suite."""
    test_suites = {
        'payments': 'tests/unit/test_payment_service.py',
        'notifications': 'tests/unit/test_notification_service.py',
        'bookings': 'tests/integration/test_booking_api.py',
        'auth': 'tests/unit/test_auth_service.py',
        'ai': 'tests/unit/test_ai_orchestrator.py'
    }
    
    if suite_name in test_suites:
        print(f"🎯 Running {suite_name} tests...")
        result = subprocess.run([
            sys.executable, '-m', 'pytest',
            test_suites[suite_name],
            '-v',
            '--cov=backend',
            '--cov-report=term-missing'
        ])
        return result.returncode == 0
    
    print(f"❌ Unknown test suite: {suite_name}")
    return False

def create_test_summary():
    """Create a summary of test results."""
    print("\n📝 Test Summary")
    print("=" * 50)
    
    # Count test files
    test_files = list(Path('tests').rglob('test_*.py'))
    print(f"📁 Test Files: {len(test_files)}")
    
    # Try to get test statistics from pytest cache
    cache_dir = Path('.pytest_cache/v/cache')
    if cache_dir.exists():
        lastfailed = cache_dir / 'lastfailed'
        if lastfailed.exists():
            with open(lastfailed, 'r') as f:
                failed_tests = json.load(f)
                if failed_tests:
                    print(f"❌ Failed Tests: {len(failed_tests)}")
                    for test in list(failed_tests.keys())[:5]:
                        print(f"   - {test}")
    
    # Coverage summary
    if Path('coverage.json').exists():
        with open('coverage.json', 'r') as f:
            coverage_data = json.load(f)
            files_coverage = coverage_data.get('files', {})
            
            print(f"\n📊 Coverage by Module:")
            for file_path, file_data in sorted(files_coverage.items())[:10]:
                percent = file_data.get('summary', {}).get('percent_covered', 0)
                module = Path(file_path).stem
                print(f"   {module:30} {percent:6.2f}%")
    
    print("\n" + "=" * 50)

def main():
    """Main test runner."""
    print("""
╔══════════════════════════════════════════════════╗
║     🧪 SPIRIT TOURS TEST SUITE RUNNER 🧪        ║
╚══════════════════════════════════════════════════╝
    """)
    
    # Setup environment
    setup_test_environment()
    
    # Track results
    results = {
        'unit': False,
        'integration': False,
        'api': False,
        'coverage': False
    }
    
    # Run test suites
    if len(sys.argv) > 1:
        # Run specific suite
        suite = sys.argv[1]
        success = run_specific_test_suite(suite)
        results[suite] = success
    else:
        # Run all tests
        results['unit'] = run_unit_tests()
        results['integration'] = run_integration_tests()
        results['api'] = run_api_tests()
        results['coverage'] = generate_coverage_report()
    
    # Create summary
    create_test_summary()
    
    # Final report
    print("\n🏁 Final Results:")
    all_passed = all(results.values())
    
    for suite, passed in results.items():
        status = "✅" if passed else "❌"
        print(f"   {status} {suite.capitalize()}")
    
    if all_passed:
        print("\n🎉 All tests passed successfully!")
        return 0
    else:
        print("\n❌ Some tests failed. Please review the output above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())