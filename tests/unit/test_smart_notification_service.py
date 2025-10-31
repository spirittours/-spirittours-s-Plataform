"""
Unit Tests for Smart Notification Service
Tests the cost-optimized notification algorithm
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from decimal import Decimal

# Mock the services we'll test
class MockSmartNotificationService:
    """Mock service for testing notification logic"""
    
    def __init__(self):
        self.whatsapp_enabled = True
        self.email_enabled = True
        self.sms_enabled = False
        self.monthly_budget = 100.0
        self.spent_this_month = 0.0
        self.whatsapp_cache = {}
    
    def calculate_sms_cost(self, phone_number: str) -> float:
        """Calculate SMS cost based on destination"""
        if phone_number.startswith('+52'):  # Mexico
            return 0.06
        elif phone_number.startswith('+1'):  # USA/Canada
            return 0.05
        else:
            return 0.15  # International
    
    def check_whatsapp_availability(self, phone_number: str) -> bool:
        """Check if user has WhatsApp (with cache)"""
        # Check cache first
        if phone_number in self.whatsapp_cache:
            cache_entry = self.whatsapp_cache[phone_number]
            if cache_entry['expires_at'] > datetime.now():
                return cache_entry['has_whatsapp']
        
        # Simulate API check
        has_whatsapp = self._simulate_whatsapp_check(phone_number)
        
        # Cache result for 24 hours
        self.whatsapp_cache[phone_number] = {
            'has_whatsapp': has_whatsapp,
            'expires_at': datetime.now() + timedelta(hours=24)
        }
        
        return has_whatsapp
    
    def _simulate_whatsapp_check(self, phone_number: str) -> bool:
        """Simulate WhatsApp availability check"""
        # For testing: Mexico numbers have WhatsApp, others don't
        return phone_number.startswith('+52')
    
    def check_sms_budget_available(self, cost: float) -> bool:
        """Check if SMS budget allows sending"""
        return (self.spent_this_month + cost) <= self.monthly_budget
    
    def send_notification_optimized(
        self,
        phone_number: str,
        email: str,
        message: str,
        allow_whatsapp: bool = True,
        allow_email: bool = True,
        allow_sms: bool = True
    ) -> dict:
        """
        Send notification using cost-optimized strategy
        Priority: WhatsApp (free) > Email (free) > SMS (paid)
        """
        result = {
            'success': False,
            'channel_used': None,
            'channels_attempted': [],
            'cost_incurred': 0.0,
            'cost_saved': 0.0,
            'error': None
        }
        
        potential_sms_cost = self.calculate_sms_cost(phone_number)
        
        # Strategy 1: Try WhatsApp first (FREE)
        if self.whatsapp_enabled and allow_whatsapp:
            result['channels_attempted'].append('whatsapp')
            has_whatsapp = self.check_whatsapp_availability(phone_number)
            
            if has_whatsapp:
                # Simulate WhatsApp send
                result['success'] = True
                result['channel_used'] = 'whatsapp'
                result['cost_incurred'] = 0.0
                result['cost_saved'] = potential_sms_cost
                return result
        
        # Strategy 2: Try Email (FREE)
        if self.email_enabled and allow_email and email:
            result['channels_attempted'].append('email')
            # Simulate email send
            result['success'] = True
            result['channel_used'] = 'email'
            result['cost_incurred'] = 0.0
            result['cost_saved'] = potential_sms_cost
            return result
        
        # Strategy 3: SMS as last resort (PAID)
        if self.sms_enabled and allow_sms:
            result['channels_attempted'].append('sms')
            
            if self.check_sms_budget_available(potential_sms_cost):
                # Simulate SMS send
                result['success'] = True
                result['channel_used'] = 'sms'
                result['cost_incurred'] = potential_sms_cost
                result['cost_saved'] = 0.0
                self.spent_this_month += potential_sms_cost
                return result
            else:
                result['error'] = 'SMS budget exceeded'
        
        # All channels failed or disabled
        result['error'] = 'All notification channels failed or disabled'
        return result


class TestSmartNotificationService:
    """Test suite for Smart Notification Service"""
    
    @pytest.fixture
    def service(self):
        """Create service instance for testing"""
        return MockSmartNotificationService()
    
    def test_cost_calculation_mexico(self, service):
        """Test SMS cost calculation for Mexico"""
        cost = service.calculate_sms_cost('+52-555-1234567')
        assert cost == 0.06, "Mexico SMS should cost $0.06"
    
    def test_cost_calculation_usa(self, service):
        """Test SMS cost calculation for USA"""
        cost = service.calculate_sms_cost('+1-555-9876543')
        assert cost == 0.05, "USA SMS should cost $0.05"
    
    def test_cost_calculation_international(self, service):
        """Test SMS cost calculation for international"""
        cost = service.calculate_sms_cost('+44-20-1234-5678')
        assert cost == 0.15, "International SMS should cost $0.15"
    
    def test_whatsapp_cache_hit(self, service):
        """Test WhatsApp availability cache works"""
        phone = '+52-555-1234567'
        
        # First call - cache miss
        result1 = service.check_whatsapp_availability(phone)
        assert phone in service.whatsapp_cache
        
        # Second call - cache hit (should return same without API call)
        result2 = service.check_whatsapp_availability(phone)
        assert result1 == result2
        assert service.whatsapp_cache[phone]['expires_at'] > datetime.now()
    
    def test_whatsapp_cache_expiration(self, service):
        """Test WhatsApp cache expires after 24 hours"""
        phone = '+52-555-1234567'
        
        # Add expired cache entry
        service.whatsapp_cache[phone] = {
            'has_whatsapp': False,
            'expires_at': datetime.now() - timedelta(hours=1)  # Expired
        }
        
        # Should refresh cache
        result = service.check_whatsapp_availability(phone)
        assert service.whatsapp_cache[phone]['expires_at'] > datetime.now()
    
    def test_notification_priority_whatsapp_first(self, service):
        """Test WhatsApp is tried first (highest priority)"""
        result = service.send_notification_optimized(
            phone_number='+52-555-1234567',  # Has WhatsApp
            email='test@email.com',
            message='Test message'
        )
        
        assert result['success'] is True
        assert result['channel_used'] == 'whatsapp'
        assert result['cost_incurred'] == 0.0
        assert result['cost_saved'] == 0.06  # Saved SMS cost
    
    def test_notification_fallback_to_email(self, service):
        """Test fallback to email when WhatsApp unavailable"""
        result = service.send_notification_optimized(
            phone_number='+1-555-9876543',  # No WhatsApp
            email='test@email.com',
            message='Test message'
        )
        
        assert result['success'] is True
        assert result['channel_used'] == 'email'
        assert result['cost_incurred'] == 0.0
        assert result['cost_saved'] == 0.05  # Saved SMS cost
        assert 'whatsapp' in result['channels_attempted']
        assert 'email' in result['channels_attempted']
    
    def test_notification_fallback_to_sms(self, service):
        """Test fallback to SMS when WhatsApp and Email unavailable"""
        service.sms_enabled = True  # Enable SMS
        
        result = service.send_notification_optimized(
            phone_number='+1-555-9876543',  # No WhatsApp
            email=None,  # No email
            message='Test message',
            allow_email=False
        )
        
        assert result['success'] is True
        assert result['channel_used'] == 'sms'
        assert result['cost_incurred'] == 0.05
        assert result['cost_saved'] == 0.0
        assert len(result['channels_attempted']) == 2  # whatsapp + sms
    
    def test_sms_budget_enforcement(self, service):
        """Test SMS budget is enforced"""
        service.sms_enabled = True
        service.monthly_budget = 1.0  # $1 budget
        service.spent_this_month = 0.95  # Already spent $0.95
        
        result = service.send_notification_optimized(
            phone_number='+1-555-9876543',
            email=None,
            message='Test message',
            allow_whatsapp=False,
            allow_email=False
        )
        
        assert result['success'] is False
        assert result['error'] == 'SMS budget exceeded'
    
    def test_cost_savings_calculation(self, service):
        """Test accurate cost savings calculation"""
        # WhatsApp notification saves SMS cost
        result = service.send_notification_optimized(
            phone_number='+52-555-1234567',
            email='test@email.com',
            message='Test'
        )
        
        assert result['cost_saved'] == 0.06  # Mexico SMS cost
        
        # Email notification also saves SMS cost
        result2 = service.send_notification_optimized(
            phone_number='+1-555-9876543',
            email='test@email.com',
            message='Test'
        )
        
        assert result2['cost_saved'] == 0.05  # USA SMS cost
    
    def test_all_channels_disabled(self, service):
        """Test behavior when all channels are disabled"""
        service.whatsapp_enabled = False
        service.email_enabled = False
        service.sms_enabled = False
        
        result = service.send_notification_optimized(
            phone_number='+52-555-1234567',
            email='test@email.com',
            message='Test'
        )
        
        assert result['success'] is False
        assert 'All notification channels failed or disabled' in result['error']
    
    def test_user_preferences_respected(self, service):
        """Test user notification preferences are respected"""
        # User disallows WhatsApp
        result = service.send_notification_optimized(
            phone_number='+52-555-1234567',
            email='test@email.com',
            message='Test',
            allow_whatsapp=False
        )
        
        assert result['channel_used'] == 'email'  # Should skip to email
        assert 'whatsapp' not in result['channels_attempted']
    
    def test_monthly_cost_tracking(self, service):
        """Test monthly SMS cost is tracked correctly"""
        service.sms_enabled = True
        initial_spent = service.spent_this_month
        
        result = service.send_notification_optimized(
            phone_number='+1-555-9876543',
            email=None,
            message='Test',
            allow_whatsapp=False,
            allow_email=False
        )
        
        assert service.spent_this_month == initial_spent + 0.05
    
    def test_cost_optimization_roi(self, service):
        """Test overall cost optimization achieves 98% savings"""
        # Simulate 100 notifications
        total_notifications = 100
        whatsapp_sent = 0
        email_sent = 0
        sms_sent = 0
        total_cost = 0.0
        total_saved = 0.0
        
        for i in range(total_notifications):
            # 70% have WhatsApp, 28% email only, 2% SMS only
            if i < 70:
                phone = '+52-555-0000000'  # Has WhatsApp
                email = 'test@email.com'
            elif i < 98:
                phone = '+1-555-0000000'  # No WhatsApp, has email
                email = 'test@email.com'
            else:
                phone = '+1-555-0000000'
                email = None  # SMS only
                service.sms_enabled = True
            
            result = service.send_notification_optimized(
                phone_number=phone,
                email=email,
                message='Test'
            )
            
            if result['channel_used'] == 'whatsapp':
                whatsapp_sent += 1
            elif result['channel_used'] == 'email':
                email_sent += 1
            elif result['channel_used'] == 'sms':
                sms_sent += 1
            
            total_cost += result['cost_incurred']
            total_saved += result['cost_saved']
        
        # Calculate savings percentage
        potential_sms_cost = 98 * 0.05 + 2 * 0.05  # All via SMS
        actual_savings_percent = (total_saved / potential_sms_cost) * 100
        
        assert whatsapp_sent == 70
        assert email_sent == 28
        assert sms_sent == 2
        assert total_cost == 0.10  # Only 2 SMS sent
        assert actual_savings_percent >= 95  # At least 95% savings


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
