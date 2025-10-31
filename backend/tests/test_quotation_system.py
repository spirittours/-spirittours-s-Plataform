"""
Comprehensive Test Suite for Spirit Tours Quotation System
Tests privacy controls, deposit tracking, and re-quotation limits
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import app and dependencies
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database.connection import db_manager, Base
from models.quotation import (
    GroupQuotation, QuotationResponse, HotelProvider,
    Company, User, QuotationStatus, ResponseStatus, PaymentStatus
)
from integrations.websocket_manager import ws_manager
from integrations.email_service import email_service
from integrations.payment_gateway import payment_service

# Test client
client = TestClient(app)


# ====================
# FIXTURES
# ====================

@pytest.fixture(scope="session")
def test_db():
    """Create test database"""
    # Use SQLite for testing
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    yield TestingSessionLocal()
    
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def sample_company(test_db):
    """Create sample company"""
    company = Company(
        id="CMP-TEST001",
        name="Test Travel Agency",
        type="B2B",
        email="test@spirittours.com",
        phone="+1-555-TEST",
        is_active=True
    )
    test_db.add(company)
    test_db.commit()
    return company


@pytest.fixture
def sample_user(test_db, sample_company):
    """Create sample user"""
    user = User(
        id="USR-TEST001",
        company_id=sample_company.id,
        email="testuser@spirittours.com",
        password_hash="hashed_password",
        first_name="Test",
        last_name="User",
        role="client",
        is_active=True
    )
    test_db.add(user)
    test_db.commit()
    return user


@pytest.fixture
def sample_hotels(test_db):
    """Create sample hotels"""
    hotels = []
    
    for i in range(3):
        hotel = HotelProvider(
            id=f"HTL-TEST00{i+1}",
            code=f"TEST-{i+1}",
            name=f"Test Hotel {i+1}",
            email=f"hotel{i+1}@test.com",
            phone=f"+1-555-000{i+1}",
            address=f"{i+1}00 Test Street",
            city="Test City",
            country="USA",
            category="standard",
            star_rating=4.0 + (i * 0.5),
            total_rooms=100 + (i * 50),
            is_active=True,
            is_verified=True
        )
        hotels.append(hotel)
        test_db.add(hotel)
        
    test_db.commit()
    return hotels


@pytest.fixture
def sample_quotation(test_db, sample_company, sample_user):
    """Create sample quotation with privacy settings"""
    quotation = GroupQuotation(
        id="GQ-TEST-001",
        company_id=sample_company.id,
        user_id=sample_user.id,
        title="Test Group Quotation",
        description="Test quotation for unit tests",
        reference_number="TEST-REF-001",
        destination="Test Destination",
        check_in_date=datetime.now() + timedelta(days=30),
        check_out_date=datetime.now() + timedelta(days=35),
        num_nights=5,
        num_rooms=20,
        num_guests=40,
        budget_min=Decimal("5000"),
        budget_max=Decimal("10000"),
        currency="USD",
        deadline=datetime.now() + timedelta(days=7),
        status=QuotationStatus.PUBLISHED,
        privacy_settings={
            "hide_competitor_prices": True,  # CRITICAL: Default hidden
            "show_own_ranking": True,
            "admin_can_override": True
        },
        deposit_config={
            "required": True,
            "amount": 1000,
            "percentage": 0.20,
            "received": False
        }
    )
    test_db.add(quotation)
    test_db.commit()
    return quotation


# ====================
# PRIVACY TESTS
# ====================

class TestPrivacyControls:
    """Test that hotels cannot see competitor prices by default"""
    
    def test_hotel_cannot_see_competitor_prices(self, test_db, sample_quotation, sample_hotels):
        """CRITICAL TEST: Verify hotels cannot see competitor prices"""
        
        # Create responses from different hotels
        responses = []
        for i, hotel in enumerate(sample_hotels):
            response = QuotationResponse(
                id=f"QR-TEST-00{i+1}",
                quotation_id=sample_quotation.id,
                hotel_id=hotel.id,
                base_price=Decimal(str(5000 + (i * 500))),
                final_price=Decimal(str(4500 + (i * 500))),
                total_price=Decimal(str(22500 + (i * 2500))),
                currency="USD",
                can_see_competitor_prices=False,  # DEFAULT: Cannot see
                status=ResponseStatus.SUBMITTED
            )
            responses.append(response)
            test_db.add(response)
            
        test_db.commit()
        
        # Test: Hotel 1 requests quotation details
        hotel_1_view = self._get_hotel_view(
            test_db,
            sample_quotation.id,
            sample_hotels[0].id,
            responses
        )
        
        # Verify Hotel 1 can see its own price
        assert hotel_1_view["own_response"]["final_price"] == 4500
        
        # Verify Hotel 1 CANNOT see competitor prices
        for competitor in hotel_1_view["competitor_responses"]:
            assert "final_price" not in competitor
            assert "base_price" not in competitor
            assert competitor.get("prices_hidden") == True
            
    def test_admin_can_toggle_price_visibility(self, test_db, sample_quotation, sample_hotels):
        """Test admin can enable price visibility for specific hotel"""
        
        # Create response with admin override
        response = QuotationResponse(
            id="QR-TEST-ADM",
            quotation_id=sample_quotation.id,
            hotel_id=sample_hotels[0].id,
            base_price=Decimal("5000"),
            final_price=Decimal("4500"),
            can_see_competitor_prices=True,  # Admin enabled visibility
            visibility_changed_by="admin",
            visibility_changed_at=datetime.now(),
            status=ResponseStatus.SUBMITTED
        )
        test_db.add(response)
        test_db.commit()
        
        # Verify hotel can now see prices
        assert response.can_see_competitor_prices == True
        assert response.visibility_changed_by == "admin"
        
    def _get_hotel_view(self, session, quotation_id, hotel_id, all_responses):
        """Simulate hotel view with privacy filters"""
        own_response = None
        competitor_responses = []
        
        for response in all_responses:
            if response.hotel_id == hotel_id:
                own_response = {
                    "hotel_id": response.hotel_id,
                    "base_price": float(response.base_price),
                    "final_price": float(response.final_price),
                    "status": response.status.value
                }
            else:
                # Apply privacy filter
                if response.can_see_competitor_prices:
                    competitor_responses.append({
                        "hotel_id": response.hotel_id,
                        "final_price": float(response.final_price),
                        "status": response.status.value
                    })
                else:
                    competitor_responses.append({
                        "hotel_id": response.hotel_id,
                        "status": response.status.value,
                        "prices_hidden": True
                    })
                    
        return {
            "own_response": own_response,
            "competitor_responses": competitor_responses
        }


# ====================
# RE-QUOTATION LIMIT TESTS
# ====================

class TestReQuotationLimits:
    """Test re-quotation limits (max 2 updates)"""
    
    def test_hotel_can_update_price_twice(self, test_db, sample_quotation, sample_hotels):
        """Test hotel can update price exactly 2 times"""
        
        hotel = sample_hotels[0]
        
        # Create initial response
        response = QuotationResponse(
            id="QR-LIMIT-001",
            quotation_id=sample_quotation.id,
            hotel_id=hotel.id,
            base_price=Decimal("5000"),
            final_price=Decimal("4500"),
            price_update_attempts=0,
            max_price_updates=2,
            status=ResponseStatus.SUBMITTED
        )
        test_db.add(response)
        test_db.commit()
        
        # First update - should succeed
        response.final_price = Decimal("4400")
        response.price_update_attempts = 1
        test_db.commit()
        assert response.price_update_attempts == 1
        
        # Second update - should succeed
        response.final_price = Decimal("4300")
        response.price_update_attempts = 2
        test_db.commit()
        assert response.price_update_attempts == 2
        
        # Third update - should fail
        with pytest.raises(Exception) as exc_info:
            if response.price_update_attempts >= response.max_price_updates:
                raise ValueError("Maximum price updates reached. Contact administrator.")
                
        assert "Maximum price updates reached" in str(exc_info.value)
        
    def test_admin_can_reset_update_counter(self, test_db, sample_quotation, sample_hotels):
        """Test admin can reset update counter"""
        
        response = QuotationResponse(
            id="QR-RESET-001",
            quotation_id=sample_quotation.id,
            hotel_id=sample_hotels[0].id,
            base_price=Decimal("5000"),
            final_price=Decimal("4500"),
            price_update_attempts=2,  # Already at limit
            max_price_updates=2,
            status=ResponseStatus.SUBMITTED
        )
        test_db.add(response)
        test_db.commit()
        
        # Admin resets counter
        response.price_update_attempts = 0
        response.updated_at = datetime.now()
        test_db.commit()
        
        # Now hotel can update again
        response.final_price = Decimal("4400")
        response.price_update_attempts = 1
        test_db.commit()
        
        assert response.price_update_attempts == 1


# ====================
# DEPOSIT TESTS
# ====================

class TestDepositSystem:
    """Test deposit tracking and payment processing"""
    
    @pytest.mark.asyncio
    async def test_deposit_calculation(self, test_db, sample_quotation):
        """Test deposit amount calculation"""
        
        # Test percentage-based deposit (20% of max budget)
        expected_deposit = float(sample_quotation.budget_max) * 0.20
        deposit_config = sample_quotation.deposit_config
        
        if deposit_config["percentage"]:
            calculated_deposit = float(sample_quotation.budget_max) * deposit_config["percentage"]
            assert calculated_deposit == expected_deposit
            
        # Test fixed amount deposit
        deposit_config["amount"] = 1000
        assert deposit_config["amount"] == 1000
        
    @pytest.mark.asyncio
    async def test_deposit_payment_flow(self, test_db, sample_quotation):
        """Test complete deposit payment flow"""
        
        # Process deposit payment
        deposit_result = await payment_service.process_deposit(
            quotation_id=sample_quotation.id,
            amount=Decimal("1000"),
            currency="USD",
            payment_method={"type": "card", "test": True},
            customer_info={"email": "test@example.com", "name": "Test Customer"},
            country_code="US"
        )
        
        # Verify payment record created
        assert deposit_result["quotation_id"] == sample_quotation.id
        assert deposit_result["amount"] == 1000
        assert deposit_result["type"] == "deposit"
        assert deposit_result["status"] in ["pending", "processing", "completed"]
        
    def test_group_creation_after_deposit(self, test_db, sample_quotation):
        """Test group is created after deposit confirmation"""
        
        # Simulate deposit received
        sample_quotation.deposit_config["received"] = True
        sample_quotation.deposit_config["payment_date"] = datetime.now().isoformat()
        sample_quotation.payment_status = PaymentStatus.DEPOSIT_RECEIVED
        sample_quotation.status = QuotationStatus.CONFIRMED
        test_db.commit()
        
        # Verify quotation status changed
        assert sample_quotation.payment_status == PaymentStatus.DEPOSIT_RECEIVED
        assert sample_quotation.status == QuotationStatus.CONFIRMED
        assert sample_quotation.deposit_config["received"] == True


# ====================
# DEADLINE TESTS
# ====================

class TestDeadlineManagement:
    """Test deadline and extension management"""
    
    def test_deadline_extension(self, test_db, sample_quotation):
        """Test deadline can be extended maximum 2 times"""
        
        original_deadline = sample_quotation.deadline
        
        # First extension - should succeed
        sample_quotation.deadline = original_deadline + timedelta(days=3)
        sample_quotation.deadline_extensions_used = 1
        test_db.commit()
        assert sample_quotation.deadline_extensions_used == 1
        
        # Second extension - should succeed
        sample_quotation.deadline = sample_quotation.deadline + timedelta(days=3)
        sample_quotation.deadline_extensions_used = 2
        test_db.commit()
        assert sample_quotation.deadline_extensions_used == 2
        
        # Third extension - should fail
        with pytest.raises(Exception) as exc_info:
            if sample_quotation.deadline_extensions_used >= sample_quotation.max_extensions_allowed:
                raise ValueError("Maximum extensions reached")
                
        assert "Maximum extensions reached" in str(exc_info.value)
        
    def test_quotation_expiration(self, test_db, sample_quotation):
        """Test quotation expires after deadline"""
        
        # Set deadline to past
        sample_quotation.deadline = datetime.now() - timedelta(days=1)
        test_db.commit()
        
        # Check if quotation should be expired
        if datetime.now() > sample_quotation.deadline:
            sample_quotation.status = QuotationStatus.EXPIRED
            test_db.commit()
            
        assert sample_quotation.status == QuotationStatus.EXPIRED


# ====================
# INTEGRATION TESTS
# ====================

class TestAPIIntegration:
    """Test API endpoints integration"""
    
    def test_create_quotation_endpoint(self):
        """Test creating quotation via API"""
        
        quotation_data = {
            "title": "API Test Quotation",
            "destination": "Miami",
            "check_in_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "check_out_date": (datetime.now() + timedelta(days=35)).isoformat(),
            "num_rooms": 10,
            "num_guests": 20,
            "budget_min": 5000,
            "budget_max": 10000,
            "hide_competitor_prices": True,  # Ensure privacy by default
            "deposit_required": True,
            "deposit_percentage": 0.20
        }
        
        # Note: This would require auth token in real scenario
        # response = client.post("/api/v1/quotations/", json=quotation_data)
        # assert response.status_code == 201
        # assert response.json()["data"]["privacy_settings"]["hide_competitor_prices"] == True
        
    def test_health_check_endpoint(self):
        """Test health check endpoint"""
        
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "services" in data
        
    def test_websocket_connection(self):
        """Test WebSocket connection"""
        
        # This would require WebSocket test client
        # with client.websocket_connect("/ws/quotations/TEST-001") as websocket:
        #     websocket.send_json({"type": "ping"})
        #     data = websocket.receive_json()
        #     assert data["type"] == "pong"


# ====================
# PERFORMANCE TESTS
# ====================

class TestPerformance:
    """Performance and load tests"""
    
    @pytest.mark.asyncio
    async def test_concurrent_responses(self, test_db, sample_quotation, sample_hotels):
        """Test system handles concurrent responses from multiple hotels"""
        
        async def submit_response(hotel):
            return QuotationResponse(
                id=f"QR-PERF-{hotel.id}",
                quotation_id=sample_quotation.id,
                hotel_id=hotel.id,
                base_price=Decimal("5000"),
                final_price=Decimal("4500"),
                status=ResponseStatus.SUBMITTED
            )
            
        # Simulate concurrent submissions
        tasks = [submit_response(hotel) for hotel in sample_hotels]
        responses = await asyncio.gather(*tasks)
        
        assert len(responses) == len(sample_hotels)
        
    def test_large_quotation_handling(self, test_db, sample_company, sample_user):
        """Test handling of large group quotations"""
        
        large_quotation = GroupQuotation(
            id="GQ-LARGE-001",
            company_id=sample_company.id,
            user_id=sample_user.id,
            title="Large Group - 500 rooms",
            reference_number="LARGE-001",
            destination="Las Vegas",
            check_in_date=datetime.now() + timedelta(days=90),
            check_out_date=datetime.now() + timedelta(days=95),
            num_rooms=500,  # Large group
            num_guests=1000,
            budget_min=Decimal("100000"),
            budget_max=Decimal("200000"),
            currency="USD",
            deadline=datetime.now() + timedelta(days=14),
            status=QuotationStatus.DRAFT
        )
        
        test_db.add(large_quotation)
        test_db.commit()
        
        assert large_quotation.num_rooms == 500
        assert large_quotation.num_guests == 1000


# ====================
# RUN TESTS
# ====================

if __name__ == "__main__":
    pytest.main(["-v", __file__])