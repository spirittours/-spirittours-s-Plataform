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
            'OmnichannelCRMService',
            'AIVoiceAgentsService',
            'WebRTCSignalingService',
            'ai_voice_agents_api',
            'webrtc_signaling_api'
        ]
        
        for import_item in required_imports:
            if import_item not in content:
                print(f"❌ Missing import: {import_item}")
                return False
            else:
                print(f"✅ Found import: {import_item}")
                
        # Check for router inclusions
        routers = [
            'app.include_router(omnichannel_communications_api.router)',
            'app.include_router(ai_voice_agents_api.router)',
            'app.include_router(webrtc_signaling_api.router)'
        ]
        
        for router in routers:
            if router in content:
                router_name = router.split('(')[1].split('.')[0]
                print(f"✅ Found {router_name} router inclusion")
            else:
                print(f"❌ Missing router inclusion: {router}")
                return False
            
        # Check for startup initialization
        initializations = [
            ('pbx_service = PBX3CXIntegrationService(pbx_config)', 'PBX service'),
            ('crm_service = OmnichannelCRMService()', 'CRM service'),
            ('voice_agents_service = ai_voice_agents_service', 'AI Voice Agents service'),
            ('webrtc_service = webrtc_signaling_service', 'WebRTC service')
        ]
        
        for init_code, service_name in initializations:
            if init_code in content:
                print(f"✅ Found {service_name} initialization")
            else:
                print(f"❌ Missing {service_name} initialization")
                return False
            
        # Check health endpoint updates
        health_checks = ['pbx_3cx', 'omnichannel_crm', 'ai_voice_agents', 'webrtc_signaling']
        
        for health_check in health_checks:
            if health_check in content:
                print(f"✅ Found {health_check} health check")
            else:
                print(f"❌ Missing {health_check} health check")
                return False
            
        print("\n🎉 All omnichannel + WebRTC integration checks passed!")
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
    print("🚀 Testing Omnichannel + WebRTC Integration...")
    print("="*50)
    
    print("\n📋 Testing main.py integration:")
    main_test = test_main_py_integration()
    
    print("\n⚙️ Testing settings.py configuration:")
    settings_test = test_settings_py_integration()
    
    print("\n" + "="*50)
    if main_test and settings_test:
        print("🎊 ALL TESTS PASSED! Omnichannel + WebRTC integration is complete!")
        sys.exit(0)
    else:
        print("❌ Some tests failed. Please review the integration.")
        sys.exit(1)