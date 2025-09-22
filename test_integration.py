#!/usr/bin/env python3
"""
Test script to verify omnichannel integration in main.py
"""
import sys
import os
import ast

def test_main_py_integration():
    """Test that main.py has the correct omnichannel integration"""
    
    try:
        # Read main.py file
        with open('backend/main.py', 'r') as f:
            content = f.read()
            
        # Check for required imports
        required_imports = [
            'omnichannel_communications_api',
            'PBX3CXIntegrationService',
            'OmnichannelCRMService'
        ]
        
        for import_item in required_imports:
            if import_item not in content:
                print(f"❌ Missing import: {import_item}")
                return False
            else:
                print(f"✅ Found import: {import_item}")
                
        # Check for router inclusion
        if 'app.include_router(omnichannel_communications_api.router)' in content:
            print("✅ Found omnichannel router inclusion")
        else:
            print("❌ Missing omnichannel router inclusion")
            return False
            
        # Check for startup initialization
        if 'pbx_service = PBX3CXIntegrationService(pbx_config)' in content:
            print("✅ Found PBX service initialization")
        else:
            print("❌ Missing PBX service initialization")
            return False
            
        if 'crm_service = OmnichannelCRMService()' in content:
            print("✅ Found CRM service initialization")
        else:
            print("❌ Missing CRM service initialization")
            return False
            
        # Check health endpoint updates
        if 'pbx_3cx' in content and 'omnichannel_crm' in content:
            print("✅ Found health check updates for omnichannel services")
        else:
            print("❌ Missing health check updates")
            return False
            
        print("\n🎉 All omnichannel integration checks passed!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing integration: {str(e)}")
        return False

def test_settings_py_integration():
    """Test that settings.py has the new configurations"""
    
    try:
        # Read settings.py file
        with open('backend/config/settings.py', 'r') as f:
            content = f.read()
            
        # Check for 3CX PBX settings
        pbx_settings = [
            'PBX_3CX_SERVER_URL',
            'PBX_3CX_USERNAME',
            'PBX_3CX_PASSWORD',
            'PBX_3CX_PORT'
        ]
        
        for setting in pbx_settings:
            if setting in content:
                print(f"✅ Found PBX setting: {setting}")
            else:
                print(f"❌ Missing PBX setting: {setting}")
                return False
                
        # Check for social media settings
        social_settings = [
            'WHATSAPP_ACCESS_TOKEN',
            'FACEBOOK_PAGE_ACCESS_TOKEN',
            'INSTAGRAM_ACCESS_TOKEN',
            'TIKTOK_ACCESS_TOKEN',
            'TWITTER_BEARER_TOKEN',
            'LINKEDIN_ACCESS_TOKEN'
        ]
        
        for setting in social_settings:
            if setting in content:
                print(f"✅ Found social media setting: {setting}")
            else:
                print(f"❌ Missing social media setting: {setting}")
                return False
                
        print("\n🎉 All settings configuration checks passed!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing settings: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Testing Omnichannel Integration...")
    print("="*50)
    
    print("\n📋 Testing main.py integration:")
    main_test = test_main_py_integration()
    
    print("\n⚙️ Testing settings.py configuration:")
    settings_test = test_settings_py_integration()
    
    print("\n" + "="*50)
    if main_test and settings_test:
        print("🎊 ALL TESTS PASSED! Omnichannel integration is complete!")
        sys.exit(0)
    else:
        print("❌ Some tests failed. Please review the integration.")
        sys.exit(1)