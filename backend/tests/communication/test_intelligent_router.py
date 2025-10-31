"""
Unit Tests for IntelligentRouter
"""

import pytest
from datetime import datetime
from backend.communication.intelligent_router import (
    IntelligentRouter,
    ConversationContext,
    ContactInfo,
    Department,
    Intent,
    CustomerType,
    AgentType,
    RoutingMode,
)


@pytest.fixture
def router():
    """Router instance"""
    return IntelligentRouter.get_instance()


@pytest.fixture
def context():
    """Sample conversation context"""
    return ConversationContext(
        session_id="test_session_001",
        user_id="test_user_001",
        channel="whatsapp",
    )


class TestTimeWasterDetection:
    """Tests for time waster detection"""
    
    def test_detect_time_waster_patterns(self, router, context):
        """Should detect time waster phrases"""
        message = "Solo preguntaba, tal vez algún día lo compre"
        
        score = router._calculate_time_waster_score(context, message)
        
        assert score > 0
        assert score >= 2.0  # Two indicators
    
    def test_many_questions_without_purchase_signals(self, router, context):
        """Should increase score with many questions"""
        context.question_count = 6
        context.purchase_signals = 0
        
        message = "¿Y cuánto cuesta?"
        score = router._calculate_time_waster_score(context, message)
        
        assert score > 0.5
    
    def test_no_contact_info_after_many_messages(self, router, context):
        """Should penalize lack of contact info"""
        context.message_count = 10
        
        message = "Ok gracias"
        score = router._calculate_time_waster_score(context, message)
        
        assert score >= 1.5


class TestPurchaseIntentDetection:
    """Tests for purchase intent detection"""
    
    def test_detect_high_purchase_intent(self, router, context):
        """Should detect high purchase intent"""
        message = "Quiero reservar un viaje a Cancún para mañana"
        
        signals = router._detect_purchase_signals(message, context)
        
        assert signals >= 2
        assert context.purchase_signals >= 2
    
    def test_detect_booking_keywords(self, router, context):
        """Should detect booking keywords"""
        messages = [
            "quiero reservar",
            "deseo contratar",
            "voy a comprar",
            "necesito booking",
        ]
        
        for msg in messages:
            signals = router._detect_purchase_signals(msg, context)
            assert signals > 0


class TestContactExtraction:
    """Tests for contact information extraction"""
    
    def test_extract_email(self, router, context):
        """Should extract email"""
        message = "Mi email es juan@example.com"
        
        extracted = router._extract_contact_info(message, context)
        
        assert extracted
        assert context.contact_info.email == "juan@example.com"
    
    def test_extract_phone(self, router, context):
        """Should extract phone number"""
        message = "Mi teléfono es +52 555 123 4567"
        
        extracted = router._extract_contact_info(message, context)
        
        assert extracted
        assert context.contact_info.phone is not None
    
    def test_extract_name(self, router, context):
        """Should extract name"""
        message = "Me llamo Juan Pérez"
        
        extracted = router._extract_contact_info(message, context)
        
        assert extracted
        assert context.contact_info.name == "Juan Pérez"


class TestDepartmentClassification:
    """Tests for department classification"""
    
    def test_classify_customer_service(self, router):
        """Should classify as customer service"""
        message = "Quiero modificar mi reserva existente"
        
        department = router._classify_department(message)
        
        assert department == Department.CUSTOMER_SERVICE
    
    def test_classify_groups(self, router):
        """Should classify as groups/quotes"""
        message = "Necesito cotización para grupo de 25 personas"
        
        department = router._classify_department(message)
        
        assert department == Department.GROUPS_QUOTES
    
    def test_classify_sales(self, router):
        """Should classify as sales"""
        message = "Estoy interesado en viajar a Cancún"
        
        department = router._classify_department(message)
        
        assert department in [Department.SALES, Department.GENERAL_INFO]


class TestRoutingDecisions:
    """Tests for routing decisions"""
    
    @pytest.mark.asyncio
    async def test_route_vip_to_human(self, router, context):
        """VIP customers should go to human"""
        context.customer_type = CustomerType.VIP
        
        decision = await router._determine_routing(context, "Hola")
        
        assert decision["action"] == "route_to_human"
        assert decision["department"] == Department.VIP_SERVICE
    
    @pytest.mark.asyncio
    async def test_route_time_waster_to_ai_only(self, router, context):
        """Time wasters should go to AI only"""
        context.customer_type = CustomerType.TIME_WASTER
        
        decision = await router._determine_routing(context, "Hola")
        
        assert decision["action"] == "route_to_ai"
        assert not decision["allow_escalation"]
    
    @pytest.mark.asyncio
    async def test_route_high_intent_with_contact(self, router, context):
        """High intent with contact should route appropriately"""
        context.purchase_signals = 4
        context.contact_info.email = "test@example.com"
        
        decision = await router._determine_routing(context, "Quiero reservar")
        
        assert decision["action"] in ["route_to_ai", "route_to_human"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
