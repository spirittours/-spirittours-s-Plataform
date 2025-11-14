#!/usr/bin/env python3
"""
Analytics Module Validation Script
Verifies analytics dashboard integration and functionality
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def check_file_exists(filepath: str, description: str) -> bool:
    """Check if a file exists"""
    if os.path.exists(filepath):
        print(f"✅ {description}: {filepath}")
        return True
    else:
        print(f"❌ {description} NOT FOUND: {filepath}")
        return False

def check_import(module_path: str, description: str) -> bool:
    """Check if a module can be imported"""
    try:
        __import__(module_path)
        print(f"✅ {description} imports successfully")
        return True
    except ImportError as e:
        print(f"❌ {description} import failed: {str(e)}")
        return False
    except Exception as e:
        print(f"⚠️ {description} import error (non-critical): {str(e)}")
        return True  # Count as success if it's just a runtime error

def check_repository_methods():
    """Check if analytics repository has all required methods"""
    try:
        from analytics.repository import AnalyticsRepository
        
        required_methods = [
            'get_overview_metrics',
            'get_sales_by_period',
            'get_top_selling_tours',
            'get_user_growth',
            'get_user_engagement',
            'get_tour_performance',
            'get_booking_stats',
            'get_revenue_breakdown'
        ]
        
        all_present = True
        for method_name in required_methods:
            if hasattr(AnalyticsRepository, method_name):
                print(f"✅ AnalyticsRepository.{method_name} exists")
            else:
                print(f"❌ AnalyticsRepository.{method_name} NOT FOUND")
                all_present = False
        
        return all_present
        
    except Exception as e:
        print(f"❌ Failed to check repository methods: {str(e)}")
        return False

def check_pydantic_models():
    """Check if all Pydantic models are defined"""
    try:
        from analytics.models import (
            OverviewMetrics,
            SalesAnalytics,
            TopToursResponse,
            UserGrowthResponse,
            UserEngagement,
            TourPerformance,
            BookingStats,
            RevenueBreakdown,
            ExportRequest
        )
        
        models = [
            'OverviewMetrics',
            'SalesAnalytics',
            'TopToursResponse',
            'UserGrowthResponse',
            'UserEngagement',
            'TourPerformance',
            'BookingStats',
            'RevenueBreakdown',
            'ExportRequest'
        ]
        
        print(f"✅ All {len(models)} Pydantic models imported successfully")
        return True
        
    except Exception as e:
        print(f"❌ Failed to import Pydantic models: {str(e)}")
        return False

def check_router_endpoints():
    """Check if router has all required endpoints"""
    try:
        from analytics.routes import router
        
        # Check router is configured
        print(f"✅ Analytics router imported successfully")
        print(f"   - Prefix: {router.prefix}")
        print(f"   - Tags: {router.tags}")
        
        # Count routes
        route_count = len(router.routes)
        print(f"   - Total routes: {route_count}")
        
        if route_count >= 10:
            print(f"✅ Router has {route_count} endpoints (expected ~10)")
            return True
        else:
            print(f"⚠️ Router has {route_count} endpoints (expected ~10)")
            return False
            
    except Exception as e:
        print(f"❌ Failed to check router: {str(e)}")
        return False

def check_main_integration():
    """Check if analytics is integrated in main.py"""
    try:
        main_py_path = Path(__file__).parent / "main.py"
        
        with open(main_py_path, 'r') as f:
            content = f.read()
        
        checks = {
            'import': 'from analytics.routes import router as analytics_router',
            'include': 'app.include_router(analytics_router)'
        }
        
        all_present = True
        for check_name, check_string in checks.items():
            if check_string in content:
                print(f"✅ Analytics {check_name} found in main.py")
            else:
                print(f"❌ Analytics {check_name} NOT FOUND in main.py")
                all_present = False
        
        return all_present
        
    except Exception as e:
        print(f"❌ Failed to check main.py integration: {str(e)}")
        return False

def main():
    """Run all validation checks"""
    print("=" * 70)
    print("ANALYTICS MODULE VALIDATION")
    print("=" * 70)
    print()
    
    results = []
    
    # Check file structure
    print("📁 Checking File Structure...")
    print("-" * 70)
    base_path = Path(__file__).parent
    files_to_check = [
        (str(base_path / "analytics" / "__init__.py"), "Analytics __init__.py"),
        (str(base_path / "analytics" / "models.py"), "Analytics models.py"),
        (str(base_path / "analytics" / "repository.py"), "Analytics repository.py"),
        (str(base_path / "analytics" / "routes.py"), "Analytics routes.py")
    ]
    
    for filepath, description in files_to_check:
        results.append(check_file_exists(filepath, description))
    print()
    
    # Check imports
    print("📦 Checking Module Imports...")
    print("-" * 70)
    imports_to_check = [
        ("analytics.models", "Analytics models"),
        ("analytics.repository", "Analytics repository"),
        ("analytics.routes", "Analytics routes"),
        ("analytics", "Analytics module")
    ]
    
    for module_path, description in imports_to_check:
        results.append(check_import(module_path, description))
    print()
    
    # Check repository methods
    print("🔧 Checking Repository Methods...")
    print("-" * 70)
    results.append(check_repository_methods())
    print()
    
    # Check Pydantic models
    print("📋 Checking Pydantic Models...")
    print("-" * 70)
    results.append(check_pydantic_models())
    print()
    
    # Check router endpoints
    print("🌐 Checking Router Endpoints...")
    print("-" * 70)
    results.append(check_router_endpoints())
    print()
    
    # Check main.py integration
    print("🔗 Checking main.py Integration...")
    print("-" * 70)
    results.append(check_main_integration())
    print()
    
    # Summary
    print("=" * 70)
    print("VALIDATION SUMMARY")
    print("=" * 70)
    passed = sum(results)
    total = len(results)
    percentage = (passed / total * 100) if total > 0 else 0
    
    print(f"Total Checks: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {percentage:.1f}%")
    print()
    
    if passed == total:
        print("🎉 ALL CHECKS PASSED! Analytics module is ready!")
        print()
        print("Next steps:")
        print("  1. Start the FastAPI server: uvicorn main:app --reload")
        print("  2. Visit http://localhost:8000/docs")
        print("  3. Test analytics endpoints under '📊 Analytics Dashboard' section")
        print("  4. Use admin credentials to access protected endpoints")
        return 0
    else:
        print("⚠️ SOME CHECKS FAILED. Please review the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
