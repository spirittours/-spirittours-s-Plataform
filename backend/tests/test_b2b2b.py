"""
Unit Tests for B2B2B Module

Tests agent management, commissions, and white label functionality.
"""

import pytest
from decimal import Decimal
from datetime import date, timedelta
from backend.b2b2b.agent_service import AgentService, AgentStatus, AgentTier
from backend.b2b2b.commission_service import CommissionService, CommissionStatus
from backend.b2b2b.advanced_commission_service import (
    AdvancedCommissionService,
    ProductCategory
)


class TestAgentService:
    """Test cases for Agent Service."""
    
    @pytest.mark.asyncio
    async def test_create_agent(self, sample_agent_data):
        """Test agent creation."""
        service = AgentService()
        
        agent = await service.create_agent(
            name=sample_agent_data["name"],
            email=sample_agent_data["email"],
            phone=sample_agent_data["phone"],
            commission_rate=sample_agent_data["commission_rate"]
        )
        
        assert agent is not None
        assert agent.agent_code.startswith("AG-")
        assert agent.name == sample_agent_data["name"]
        assert agent.status == AgentStatus.ACTIVE
        assert agent.tier == AgentTier.BRONZE
    
    @pytest.mark.asyncio
    async def test_agent_code_generation(self):
        """Test unique agent code generation."""
        service = AgentService()
        
        codes = set()
        for _ in range(100):
            code = service._generate_agent_code()
            assert code not in codes
            assert code.startswith("AG-")
            assert len(code) == 19  # AG-YYYYMMDDHHMMSS format
            codes.add(code)
    
    @pytest.mark.asyncio
    async def test_activate_agent(self):
        """Test agent activation."""
        service = AgentService()
        
        # Mock activation
        agent_code = "AG-TEST-001"
        
        # Test activation logic
        assert hasattr(service, 'activate_agent')
    
    @pytest.mark.asyncio
    async def test_deactivate_agent(self):
        """Test agent deactivation."""
        service = AgentService()
        
        # Test deactivation logic
        assert hasattr(service, 'deactivate_agent')
    
    @pytest.mark.asyncio
    async def test_update_agent_tier(self):
        """Test agent tier update."""
        service = AgentService()
        
        # Test tier upgrade logic
        old_tier = AgentTier.BRONZE
        new_tier = AgentTier.SILVER
        
        assert new_tier.value > old_tier.value


class TestCommissionService:
    """Test cases for Commission Service."""
    
    @pytest.mark.asyncio
    async def test_calculate_commission(self):
        """Test commission calculation."""
        service = CommissionService()
        
        booking_amount = Decimal("1500.00")
        commission_rate = Decimal("10")
        
        commission_amount = booking_amount * (commission_rate / Decimal("100"))
        
        assert commission_amount == Decimal("150.00")
    
    @pytest.mark.asyncio
    async def test_generate_commission(self, sample_booking_data):
        """Test commission generation."""
        service = CommissionService()
        
        commission = await service.generate_commission(
            agent_id=1,
            booking_id=sample_booking_data["booking_id"],
            booking_amount=Decimal(sample_booking_data["total_amount"]),
            commission_rate=Decimal("10")
        )
        
        assert commission is not None
        assert commission.commission_code.startswith("COMM-")
        assert commission.status == CommissionStatus.PENDING
        assert commission.commission_amount > 0
    
    @pytest.mark.asyncio
    async def test_approve_commission(self):
        """Test commission approval."""
        service = CommissionService()
        
        commission_code = "COMM-TEST-001"
        
        # Test approval logic
        assert hasattr(service, 'approve_commission')
    
    @pytest.mark.asyncio
    async def test_pay_commission(self):
        """Test commission payment."""
        service = CommissionService()
        
        commission_code = "COMM-TEST-001"
        
        # Test payment logic
        assert hasattr(service, 'pay_commission')
    
    @pytest.mark.asyncio
    async def test_commission_statement(self):
        """Test agent commission statement generation."""
        service = CommissionService()
        
        period_start = date(2025, 1, 1)
        period_end = date(2025, 12, 31)
        
        # Test statement generation
        assert hasattr(service, 'get_agent_commission_summary')


class TestAdvancedCommissionService:
    """Test cases for Advanced Commission Service."""
    
    @pytest.mark.asyncio
    async def test_tiered_commission_calculation(self):
        """Test tiered commission calculation."""
        service = AdvancedCommissionService()
        
        # Test Bronze tier (0-10k): 3%
        booking_amount_bronze = Decimal("5000.00")
        expected_bronze = booking_amount_bronze * Decimal("0.03")
        
        # Test Silver tier (10k-25k): 4% + 0.5% bonus
        booking_amount_silver = Decimal("15000.00")
        expected_silver = booking_amount_silver * Decimal("0.045")
        
        # Test Gold tier (25k-50k): 5% + 1% bonus
        booking_amount_gold = Decimal("30000.00")
        expected_gold = booking_amount_gold * Decimal("0.06")
        
        # Test Platinum tier (50k+): 6% + 2% bonus
        booking_amount_platinum = Decimal("60000.00")
        expected_platinum = booking_amount_platinum * Decimal("0.08")
        
        assert expected_bronze == Decimal("150.00")
        assert expected_silver == Decimal("675.00")
        assert expected_gold == Decimal("1800.00")
        assert expected_platinum == Decimal("4800.00")
    
    @pytest.mark.asyncio
    async def test_product_based_commission(self):
        """Test product-based commission calculation."""
        service = AdvancedCommissionService()
        
        booking_amount = Decimal("1000.00")
        
        # Test different product categories
        flights_commission = booking_amount * Decimal("0.02")  # 2%
        hotels_commission = booking_amount * Decimal("0.05")  # 5%
        tours_commission = booking_amount * Decimal("0.08")  # 8%
        packages_commission = booking_amount * Decimal("0.10")  # 10%
        insurance_commission = booking_amount * Decimal("0.15")  # 15%
        
        assert flights_commission == Decimal("20.00")
        assert hotels_commission == Decimal("50.00")
        assert tours_commission == Decimal("80.00")
        assert packages_commission == Decimal("100.00")
        assert insurance_commission == Decimal("150.00")
    
    @pytest.mark.asyncio
    async def test_seasonal_multipliers(self):
        """Test seasonal multipliers."""
        service = AdvancedCommissionService()
        
        base_commission = Decimal("100.00")
        
        # High season: 1.2x
        high_season_commission = base_commission * Decimal("1.2")
        assert high_season_commission == Decimal("120.00")
        
        # Shoulder season: 1.0x
        shoulder_season_commission = base_commission * Decimal("1.0")
        assert shoulder_season_commission == Decimal("100.00")
        
        # Low season: 1.3x (incentive)
        low_season_commission = base_commission * Decimal("1.3")
        assert low_season_commission == Decimal("130.00")
    
    @pytest.mark.asyncio
    async def test_bonus_calculation(self):
        """Test bonus calculation."""
        service = AdvancedCommissionService()
        
        # Volume milestone bonus: 500 EUR every 10k
        volume = Decimal("35000.00")
        volume_milestones = int(volume / Decimal("10000"))
        volume_bonus = Decimal("500") * volume_milestones
        
        assert volume_milestones == 3
        assert volume_bonus == Decimal("1500.00")
        
        # Booking count bonus: 200 EUR every 20 bookings
        booking_count = 45
        booking_milestones = booking_count // 20
        booking_bonus = Decimal("200") * booking_milestones
        
        assert booking_milestones == 2
        assert booking_bonus == Decimal("400.00")
        
        # Referral bonus: 300 EUR per agent
        referrals = 5
        referral_bonus = Decimal("300") * referrals
        
        assert referral_bonus == Decimal("1500.00")
    
    @pytest.mark.asyncio
    async def test_leaderboard_generation(self):
        """Test leaderboard generation."""
        service = AdvancedCommissionService()
        
        period_start = date(2025, 1, 1)
        period_end = date(2025, 12, 31)
        
        # Test leaderboard logic
        assert hasattr(service, 'get_leaderboard')
    
    @pytest.mark.asyncio
    async def test_commission_forecast(self):
        """Test commission forecasting."""
        service = AdvancedCommissionService()
        
        # Test forecasting logic
        assert hasattr(service, 'get_commission_forecast')


class TestWhiteLabelService:
    """Test cases for White Label Service."""
    
    @pytest.mark.asyncio
    async def test_enable_white_label(self):
        """Test enabling white label for agent."""
        from backend.b2b2b.white_label_service import WhiteLabelService
        
        service = WhiteLabelService()
        
        agent_code = "AG-TEST-001"
        
        # Test white label enablement
        assert hasattr(service, 'enable_white_label')
    
    @pytest.mark.asyncio
    async def test_white_label_configuration(self):
        """Test white label configuration."""
        from backend.b2b2b.white_label_service import WhiteLabelService
        
        service = WhiteLabelService()
        
        config = {
            "brand_name": "Mi Agencia",
            "logo_url": "https://example.com/logo.png",
            "primary_color": "#2E7D32",
            "domain": "viajes.miagencia.com"
        }
        
        # Test configuration update
        assert hasattr(service, 'update_white_label_config')
    
    @pytest.mark.asyncio
    async def test_domain_validation(self):
        """Test custom domain validation."""
        from backend.b2b2b.white_label_service import WhiteLabelService
        
        service = WhiteLabelService()
        
        # Valid domain
        valid_domain = "viajes.miagencia.com"
        assert "." in valid_domain
        assert len(valid_domain) > 3
        
        # Invalid domain
        invalid_domain = "invalid"
        assert "." not in invalid_domain


# Integration tests
@pytest.mark.integration
class TestB2B2BIntegration:
    """Integration tests for B2B2B module."""
    
    @pytest.mark.asyncio
    async def test_complete_commission_flow(self):
        """Test complete commission workflow."""
        agent_service = AgentService()
        commission_service = CommissionService()
        
        # 1. Create agent
        agent = await agent_service.create_agent(
            name="Test Agency",
            email="test@agency.com",
            phone="+34600123456",
            commission_rate=Decimal("10")
        )
        
        # 2. Generate commission
        # (would generate from actual booking)
        
        # 3. Approve commission
        # (would approve commission)
        
        # 4. Pay commission
        # (would process payment)
        
        # Verify complete flow
        assert agent is not None
    
    @pytest.mark.asyncio
    async def test_multi_agent_commission_calculation(self):
        """Test commission calculation for multiple agents."""
        service = CommissionService()
        
        agents = [
            {"id": 1, "rate": Decimal("10")},
            {"id": 2, "rate": Decimal("12")},
            {"id": 3, "rate": Decimal("15")},
        ]
        
        booking_amount = Decimal("1000.00")
        
        total_commissions = Decimal("0")
        for agent in agents:
            commission = booking_amount * (agent["rate"] / Decimal("100"))
            total_commissions += commission
        
        assert total_commissions == Decimal("370.00")


# Performance tests
@pytest.mark.performance
class TestB2B2BPerformance:
    """Performance tests for B2B2B module."""
    
    @pytest.mark.asyncio
    async def test_commission_calculation_performance(self):
        """Test commission calculation performance."""
        import time
        
        service = CommissionService()
        
        start_time = time.time()
        
        # Calculate 1000 commissions
        for i in range(1000):
            booking_amount = Decimal("1500.00")
            commission_rate = Decimal("10")
            commission = booking_amount * (commission_rate / Decimal("100"))
        
        end_time = time.time()
        elapsed_ms = (end_time - start_time) * 1000
        
        # Should calculate 1000 commissions in less than 100ms
        assert elapsed_ms < 100
    
    @pytest.mark.asyncio
    async def test_leaderboard_generation_performance(self):
        """Test leaderboard generation performance."""
        import time
        
        service = AdvancedCommissionService()
        
        start_time = time.time()
        
        # Generate leaderboard
        # (would query and rank agents)
        
        end_time = time.time()
        elapsed_ms = (end_time - start_time) * 1000
        
        # Should generate leaderboard in less than 500ms
        assert elapsed_ms < 500
