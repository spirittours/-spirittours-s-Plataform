#!/usr/bin/env python3
"""
Spirit Tours Load Testing Runner
Automated load testing execution with different scenarios.
"""

import argparse
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
import json

class LoadTestRunner:
    """Load test execution and management."""
    
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.results_dir = Path("load_test_results")
        self.results_dir.mkdir(exist_ok=True)
        
    def run_smoke_test(self):
        """Run quick smoke test with low load."""
        print("🔥 Running Smoke Test (Low Load)")
        
        cmd = [
            'locust',
            '--locustfile', 'tests/load/locustfile.py',
            '--host', self.base_url,
            '--users', '10',
            '--spawn-rate', '2',
            '--run-time', '60s',
            '--headless',
            '--csv', str(self.results_dir / 'smoke_test'),
            '--html', str(self.results_dir / 'smoke_test_report.html'),
            'WebsiteUser'
        ]
        
        return self._execute_test(cmd, "smoke_test")
    
    def run_load_test(self):
        """Run standard load test."""
        print("📊 Running Load Test (Medium Load)")
        
        cmd = [
            'locust',
            '--locustfile', 'tests/load/locustfile.py',
            '--host', self.base_url,
            '--users', '50',
            '--spawn-rate', '5',
            '--run-time', '300s',  # 5 minutes
            '--headless',
            '--csv', str(self.results_dir / 'load_test'),
            '--html', str(self.results_dir / 'load_test_report.html'),
            'WebsiteUser'
        ]
        
        return self._execute_test(cmd, "load_test")
    
    def run_stress_test(self):
        """Run stress test with high load."""
        print("⚡ Running Stress Test (High Load)")
        
        cmd = [
            'locust',
            '--locustfile', 'tests/load/locustfile.py',
            '--host', self.base_url,
            '--users', '200',
            '--spawn-rate', '10',
            '--run-time', '600s',  # 10 minutes
            '--headless',
            '--csv', str(self.results_dir / 'stress_test'),
            '--html', str(self.results_dir / 'stress_test_report.html'),
            'StressTestUser'
        ]
        
        return self._execute_test(cmd, "stress_test")
    
    def run_ai_intensive_test(self):
        """Run AI-intensive load test."""
        print("🤖 Running AI Intensive Test")
        
        cmd = [
            'locust',
            '--locustfile', 'tests/load/locustfile.py',
            '--host', self.base_url,
            '--users', '30',
            '--spawn-rate', '3',
            '--run-time', '400s',
            '--headless',
            '--csv', str(self.results_dir / 'ai_intensive_test'),
            '--html', str(self.results_dir / 'ai_intensive_test_report.html'),
            'AIIntensiveUser'
        ]
        
        return self._execute_test(cmd, "ai_intensive_test")
    
    def run_b2b_test(self):
        """Run B2B partner workflow test."""
        print("🏢 Running B2B Partner Test")
        
        cmd = [
            'locust',
            '--locustfile', 'tests/load/locustfile.py',
            '--host', self.base_url,
            '--users', '25',
            '--spawn-rate', '3',
            '--run-time', '300s',
            '--headless',
            '--csv', str(self.results_dir / 'b2b_test'),
            '--html', str(self.results_dir / 'b2b_test_report.html'),
            'B2BPartnerUser'
        ]
        
        return self._execute_test(cmd, "b2b_test")
    
    def run_mixed_load_test(self):
        """Run mixed workload test with multiple user types."""
        print("🌐 Running Mixed Workload Test")
        
        cmd = [
            'locust',
            '--locustfile', 'tests/load/locustfile.py',
            '--host', self.base_url,
            '--users', '100',
            '--spawn-rate', '5',
            '--run-time', '900s',  # 15 minutes
            '--headless',
            '--csv', str(self.results_dir / 'mixed_load_test'),
            '--html', str(self.results_dir / 'mixed_load_test_report.html'),
            'WebsiteUser', 'B2BPartnerUser', 'AIIntensiveUser'
        ]
        
        return self._execute_test(cmd, "mixed_load_test")
    
    def run_endurance_test(self):
        """Run long-duration endurance test."""
        print("🏃‍♀️ Running Endurance Test (30 minutes)")
        
        cmd = [
            'locust',
            '--locustfile', 'tests/load/locustfile.py',
            '--host', self.base_url,
            '--users', '75',
            '--spawn-rate', '3',
            '--run-time', '1800s',  # 30 minutes
            '--headless',
            '--csv', str(self.results_dir / 'endurance_test'),
            '--html', str(self.results_dir / 'endurance_test_report.html'),
            'WebsiteUser', 'B2BPartnerUser'
        ]
        
        return self._execute_test(cmd, "endurance_test")
    
    def _execute_test(self, cmd: list, test_name: str) -> dict:
        """Execute a load test command and return results."""
        start_time = time.time()
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
            duration = time.time() - start_time
            
            # Parse results from CSV files if available
            stats = self._parse_test_results(test_name)
            
            return {
                'test_name': test_name,
                'success': result.returncode == 0,
                'duration': duration,
                'output': result.stdout,
                'errors': result.stderr,
                'stats': stats
            }
            
        except subprocess.TimeoutExpired:
            return {
                'test_name': test_name,
                'success': False,
                'duration': time.time() - start_time,
                'output': '',
                'errors': 'Test timed out after 1 hour',
                'stats': {}
            }
        except Exception as e:
            return {
                'test_name': test_name,
                'success': False,
                'duration': time.time() - start_time,
                'output': '',
                'errors': str(e),
                'stats': {}
            }
    
    def _parse_test_results(self, test_name: str) -> dict:
        """Parse Locust CSV results."""
        stats_file = self.results_dir / f"{test_name}_stats.csv"
        
        if not stats_file.exists():
            return {}
        
        try:
            import csv
            
            with open(stats_file, 'r') as f:
                reader = csv.DictReader(f)
                stats = {}
                
                for row in reader:
                    if row['Name'] == 'Aggregated':
                        stats = {
                            'total_requests': int(row['Request Count']),
                            'failure_count': int(row['Failure Count']),
                            'avg_response_time': float(row['Average Response Time']),
                            'max_response_time': float(row['Max Response Time']),
                            'requests_per_second': float(row['Average Content Size'])  # This maps to RPS in some versions
                        }
                        break
                
                return stats
                
        except Exception as e:
            print(f"Warning: Could not parse results for {test_name}: {e}")
            return {}
    
    def generate_report(self, results: list):
        """Generate comprehensive load test report."""
        print("\n" + "="*80)
        print("📊 SPIRIT TOURS LOAD TEST SUMMARY")
        print("="*80)
        
        print(f"📅 Executed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🌐 Target: {self.base_url}")
        print()
        
        # Overall summary
        total_tests = len(results)
        passed_tests = sum(1 for r in results if r['success'])
        total_duration = sum(r['duration'] for r in results)
        
        print("📈 OVERALL RESULTS:")
        print(f"   ✅ Passed: {passed_tests}/{total_tests}")
        print(f"   ❌ Failed: {total_tests - passed_tests}/{total_tests}")
        print(f"   ⏱️  Total Duration: {total_duration:.1f} seconds")
        print()
        
        # Individual test results
        print("📋 TEST DETAILS:")
        for result in results:
            status = "✅ PASS" if result['success'] else "❌ FAIL"
            duration = result['duration']
            
            print(f"   {status} {result['test_name']} ({duration:.1f}s)")
            
            if result['stats']:
                stats = result['stats']
                print(f"      📊 Requests: {stats.get('total_requests', 'N/A')}")
                print(f"      📉 Failures: {stats.get('failure_count', 'N/A')}")
                print(f"      ⚡ Avg Response: {stats.get('avg_response_time', 'N/A')}ms")
                print(f"      🚀 Max Response: {stats.get('max_response_time', 'N/A')}ms")
            
            if not result['success']:
                print(f"      ❌ Error: {result['errors'][:100]}...")
        
        print()
        
        # Performance thresholds analysis
        print("🎯 PERFORMANCE ANALYSIS:")
        
        performance_issues = []
        
        for result in results:
            if result['stats']:
                stats = result['stats']
                avg_response = stats.get('avg_response_time', 0)
                max_response = stats.get('max_response_time', 0)
                failure_rate = stats.get('failure_count', 0) / max(stats.get('total_requests', 1), 1)
                
                if avg_response > 1000:  # > 1 second average
                    performance_issues.append(f"{result['test_name']}: High average response time ({avg_response:.1f}ms)")
                
                if max_response > 5000:  # > 5 seconds max
                    performance_issues.append(f"{result['test_name']}: Very high max response time ({max_response:.1f}ms)")
                
                if failure_rate > 0.05:  # > 5% failure rate
                    performance_issues.append(f"{result['test_name']}: High failure rate ({failure_rate:.1%})")
        
        if performance_issues:
            print("   ⚠️  Performance Issues Found:")
            for issue in performance_issues:
                print(f"      • {issue}")
        else:
            print("   ✅ All performance metrics within acceptable thresholds")
        
        print()
        
        # Reports and artifacts
        print("📄 GENERATED REPORTS:")
        for result in results:
            test_name = result['test_name']
            html_report = self.results_dir / f"{test_name}_report.html"
            csv_stats = self.results_dir / f"{test_name}_stats.csv"
            
            if html_report.exists():
                print(f"   📊 {test_name}: {html_report}")
            if csv_stats.exists():
                print(f"   📈 {test_name} CSV: {csv_stats}")
        
        print()
        
        # Recommendations
        print("💡 RECOMMENDATIONS:")
        if passed_tests == total_tests:
            print("   ✅ All load tests passed successfully")
            print("   🚀 Platform is ready for production load")
        else:
            print("   ⚠️  Some tests failed - investigate before production")
        
        if performance_issues:
            print("   🔧 Address performance issues identified above")
            print("   📊 Review detailed HTML reports for insights")
        
        print("   📈 Monitor these metrics in production:")
        print("      • Average response time < 500ms")
        print("      • 95th percentile response time < 2000ms")
        print("      • Error rate < 1%")
        print("      • System resource utilization < 80%")
        
        print()
        
        # Overall assessment
        overall_success = passed_tests == total_tests and not performance_issues
        
        if overall_success:
            print("🎉 LOAD TESTING PASSED! Platform performs well under load.")
        else:
            print("⚠️  LOAD TESTING ISSUES DETECTED. Review and optimize before production.")
        
        return overall_success
    
    def run_test_suite(self, test_types: list, custom_url: str = None) -> bool:
        """Run specified load test suite."""
        if custom_url:
            self.base_url = custom_url
        
        print("🚀 Starting Spirit Tours Load Test Suite")
        print(f"🌐 Target URL: {self.base_url}")
        print(f"📋 Tests to run: {', '.join(test_types)}")
        print(f"📁 Results directory: {self.results_dir}")
        print()
        
        results = []
        
        # Execute selected tests
        if 'smoke' in test_types:
            results.append(self.run_smoke_test())
        
        if 'load' in test_types:
            results.append(self.run_load_test())
        
        if 'stress' in test_types:
            results.append(self.run_stress_test())
        
        if 'ai' in test_types:
            results.append(self.run_ai_intensive_test())
        
        if 'b2b' in test_types:
            results.append(self.run_b2b_test())
        
        if 'mixed' in test_types:
            results.append(self.run_mixed_load_test())
        
        if 'endurance' in test_types:
            results.append(self.run_endurance_test())
        
        # Generate comprehensive report
        return self.generate_report(results)

def main():
    """Main entry point for load test runner."""
    parser = argparse.ArgumentParser(
        description='Spirit Tours Load Testing Suite',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Test Types:
  smoke      - Quick smoke test (10 users, 1 min)
  load       - Standard load test (50 users, 5 min)
  stress     - High load stress test (200 users, 10 min)
  ai         - AI-intensive test (30 users, 7 min)
  b2b        - B2B partner workflow test (25 users, 5 min)
  mixed      - Mixed workload test (100 users, 15 min)
  endurance  - Long duration test (75 users, 30 min)

Examples:
  python run_load_tests.py --types smoke load
  python run_load_tests.py --types stress --url http://staging.spirittours.com
  python run_load_tests.py --all
        """
    )
    
    parser.add_argument(
        '--types',
        nargs='+',
        choices=['smoke', 'load', 'stress', 'ai', 'b2b', 'mixed', 'endurance'],
        default=['smoke', 'load'],
        help='Load test types to run (default: smoke, load)'
    )
    
    parser.add_argument(
        '--all',
        action='store_true',
        help='Run all load test types'
    )
    
    parser.add_argument(
        '--url',
        default='http://localhost:8000',
        help='Target URL for load testing (default: http://localhost:8000)'
    )
    
    args = parser.parse_args()
    
    # Determine test types to run
    if args.all:
        test_types = ['smoke', 'load', 'stress', 'ai', 'b2b', 'mixed']
    else:
        test_types = args.types
    
    # Check if Locust is available
    try:
        subprocess.run(['locust', '--version'], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Error: Locust is not installed or not in PATH")
        print("Install with: pip install locust")
        sys.exit(1)
    
    # Initialize and run load tests
    runner = LoadTestRunner()
    
    try:
        success = runner.run_test_suite(test_types, args.url)
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Load testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n💥 Load test runner error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()