"""
Integration and E2E Tests

Tests complete workflows and system integration.
"""

import pytest
from decimal import Decimal
from datetime import date, timedelta


@pytest.mark.integration
class TestBookingWorkflow:
    """Test complete booking workflow."""
    
    @pytest.mark.asyncio
    async def test_complete_booking_flow(
        self,
        sample_customer_data,
        sample_booking_data,
        api_client
    ):
        """Test end-to-end booking process."""
        
        # 1. Search for destinations
        search_response = await api_client.get(
            "/api/destinations",
            params={"query": "Barcelona"}
        )
        assert search_response.status_code == 200
        
        # 2. Create booking
        booking_response = await api_client.post(
            "/api/bookings",
            json=sample_booking_data
        )
        assert booking_response.status_code == 201
        
        # 3. Process payment
        payment_data = {
            "booking_id": sample_booking_data["booking_id"],
            "amount": sample_booking_data["total_amount"],
            "payment_method": "credit_card"
        }
        payment_response = await api_client.post(
            "/api/payments",
            json=payment_data
        )
        assert payment_response.status_code == 200
        
        # 4. Generate invoice
        invoice_response = await api_client.post(
            "/api/accounting/invoices/generate",
            json={
                "booking_id": sample_booking_data["booking_id"]
            }
        )
        assert invoice_response.status_code == 201
        
        # 5. Send confirmation email
        email_response = await api_client.post(
            "/api/notifications/email/booking-confirmation",
            json={
                "booking_id": sample_booking_data["booking_id"],
                "customer_email": sample_customer_data["email"]
            }
        )
        assert email_response.status_code == 200


@pytest.mark.integration
class TestPaymentIntegration:
    """Test payment gateway integration."""
    
    @pytest.mark.asyncio
    async def test_credit_card_payment(self, api_client):
        """Test credit card payment processing."""
        
        payment_data = {
            "amount": 1500.00,
            "currency": "EUR",
            "payment_method": "credit_card",
            "card_number": "4242424242424242",  # Test card
            "card_expiry": "12/25",
            "card_cvv": "123",
            "customer_name": "Juan Pérez"
        }
        
        response = await api_client.post(
            "/api/payments/process",
            json=payment_data
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "success"
        assert "transaction_id" in result
    
    @pytest.mark.asyncio
    async def test_paypal_payment(self, api_client):
        """Test PayPal payment processing."""
        
        payment_data = {
            "amount": 1500.00,
            "currency": "EUR",
            "payment_method": "paypal",
            "paypal_email": "customer@example.com"
        }
        
        response = await api_client.post(
            "/api/payments/process",
            json=payment_data
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "success"
    
    @pytest.mark.asyncio
    async def test_payment_refund(self, api_client):
        """Test payment refund processing."""
        
        refund_data = {
            "transaction_id": "TXN-TEST-001",
            "amount": 1500.00,
            "reason": "Customer requested cancellation"
        }
        
        response = await api_client.post(
            "/api/payments/refund",
            json=refund_data
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "success"


@pytest.mark.integration
class TestAccountingIntegration:
    """Test accounting system integration."""
    
    @pytest.mark.asyncio
    async def test_invoice_to_receipt_flow(self, api_client):
        """Test invoice generation and receipt creation flow."""
        
        # 1. Generate invoice
        invoice_response = await api_client.post(
            "/api/accounting/invoices/generate",
            json={
                "customer_id": "CUST-TEST-001",
                "booking_id": "BK-TEST-001"
            }
        )
        assert invoice_response.status_code == 201
        invoice = invoice_response.json()
        invoice_number = invoice["invoice_number"]
        
        # 2. Mark as paid
        payment_response = await api_client.post(
            f"/api/accounting/invoices/{invoice_number}/pay",
            json={
                "payment_method": "credit_card",
                "payment_reference": "PAY-TEST-001"
            }
        )
        assert payment_response.status_code == 200
        
        # 3. Generate receipt
        receipt_response = await api_client.post(
            "/api/accounting/receipts/generate",
            json={
                "invoice_number": invoice_number,
                "amount": 1500.00
            }
        )
        assert receipt_response.status_code == 201
        
        # 4. Verify reconciliation
        reconcile_response = await api_client.get(
            f"/api/accounting/reconciliation/status/{invoice_number}"
        )
        assert reconcile_response.status_code == 200
        result = reconcile_response.json()
        assert result["status"] == "matched"
    
    @pytest.mark.asyncio
    async def test_external_accounting_sync(self, api_client):
        """Test sync with external accounting systems."""
        
        # Sync invoices to QuickBooks
        qb_response = await api_client.post(
            "/api/accounting/external/quickbooks/sync-invoices",
            json={
                "from_date": "2025-01-01",
                "to_date": "2025-12-31"
            }
        )
        assert qb_response.status_code == 200
        
        # Sync invoices to Xero
        xero_response = await api_client.post(
            "/api/accounting/external/xero/sync-invoices",
            json={
                "from_date": "2025-01-01",
                "to_date": "2025-12-31"
            }
        )
        assert xero_response.status_code == 200


@pytest.mark.integration
class TestB2B2BIntegration:
    """Test B2B2B system integration."""
    
    @pytest.mark.asyncio
    async def test_agent_booking_commission_flow(self, api_client):
        """Test complete agent booking and commission flow."""
        
        # 1. Agent creates booking
        booking_response = await api_client.post(
            "/api/b2b2b/bookings",
            json={
                "agent_code": "AG-TEST-001",
                "customer_id": "CUST-TEST-001",
                "destination": "Barcelona",
                "amount": 1500.00
            }
        )
        assert booking_response.status_code == 201
        booking = booking_response.json()
        
        # 2. Commission automatically generated
        commission_response = await api_client.get(
            f"/api/b2b2b/commissions/booking/{booking['booking_id']}"
        )
        assert commission_response.status_code == 200
        commission = commission_response.json()
        assert commission["commission_amount"] > 0
        
        # 3. Approve commission
        approve_response = await api_client.post(
            f"/api/b2b2b/commissions/{commission['commission_code']}/approve"
        )
        assert approve_response.status_code == 200
        
        # 4. Pay commission
        pay_response = await api_client.post(
            f"/api/b2b2b/commissions/{commission['commission_code']}/pay",
            json={
                "payment_method": "bank_transfer",
                "payment_reference": "TRF-TEST-001"
            }
        )
        assert pay_response.status_code == 200


@pytest.mark.integration
class TestAnalyticsIntegration:
    """Test analytics and BI integration."""
    
    @pytest.mark.asyncio
    async def test_real_time_dashboard(self, api_client):
        """Test real-time analytics dashboard."""
        
        response = await api_client.get("/api/analytics/kpis/realtime")
        
        assert response.status_code == 200
        kpis = response.json()
        
        assert "revenue" in kpis
        assert "bookings" in kpis
        assert "conversion_rate" in kpis
    
    @pytest.mark.asyncio
    async def test_custom_report_generation(self, api_client):
        """Test custom report creation and execution."""
        
        # 1. Create custom report
        create_response = await api_client.post(
            "/api/analytics/reports/custom",
            params={
                "report_name": "Monthly Revenue Report",
                "description": "Revenue by month",
                "metrics": ["revenue", "bookings"],
                "dimensions": ["time", "geography"],
                "aggregation_period": "month",
                "created_by": 1
            }
        )
        assert create_response.status_code == 200
        report = create_response.json()
        
        # 2. Execute report
        execute_response = await api_client.post(
            f"/api/analytics/reports/custom/{report['report_id']}/execute",
            params={
                "from_date": "2025-01-01",
                "to_date": "2025-12-31"
            }
        )
        assert execute_response.status_code == 200
        result = execute_response.json()
        
        assert "data" in result
        assert "summary" in result


@pytest.mark.integration
class TestBundlingIntegration:
    """Test bundling and cross-sell integration."""
    
    @pytest.mark.asyncio
    async def test_bundle_creation_and_booking(self, api_client, sample_bundle_data):
        """Test bundle creation and booking process."""
        
        # 1. Create bundle
        bundle_response = await api_client.post(
            "/api/bundling/bundles/create",
            json={
                "products": sample_bundle_data["products"],
                "booking_date": date.today().isoformat(),
                "travel_date": (date.today() + timedelta(days=30)).isoformat()
            }
        )
        assert bundle_response.status_code == 200
        bundle = bundle_response.json()
        
        assert bundle["success"] is True
        assert "bundle" in bundle
        assert bundle["bundle"]["discounted_price"] < bundle["bundle"]["base_price"]
        
        # 2. Book bundle
        booking_response = await api_client.post(
            "/api/bookings/bundle",
            json={
                "bundle_id": bundle["bundle"]["bundle_id"],
                "customer_id": "CUST-TEST-001"
            }
        )
        assert booking_response.status_code == 201
    
    @pytest.mark.asyncio
    async def test_cross_sell_recommendations(self, api_client):
        """Test cross-sell recommendation flow."""
        
        # Get recommendations for a product
        response = await api_client.post(
            "/api/bundling/recommendations/cross-sell",
            json={
                "primary_product": {
                    "product_id": "PROD-001",
                    "product_type": "flight",
                    "name": "Vuelo Madrid-Barcelona",
                    "description": "Vuelo directo",
                    "base_price": 150.00,
                    "supplier_id": "SUP-001",
                    "destination": "Barcelona",
                    "duration_days": 1,
                    "available_from": date.today().isoformat(),
                    "available_to": (date.today() + timedelta(days=365)).isoformat(),
                    "max_capacity": 200
                },
                "available_products": [],
                "max_recommendations": 5
            }
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "recommendations" in result


@pytest.mark.integration
class TestAIIntegration:
    """Test AI recommendations integration."""
    
    @pytest.mark.asyncio
    async def test_personalized_recommendations(self, api_client):
        """Test AI-powered personalized recommendations."""
        
        # 1. Analyze customer
        analyze_response = await api_client.post(
            "/api/ai/customers/CUST-TEST-001/analyze",
            json={
                "bookings": [
                    {
                        "booking_date": "2024-06-15",
                        "destination": "Barcelona",
                        "amount": 1500.00,
                        "activities": ["beach", "culture", "food"]
                    }
                ]
            }
        )
        assert analyze_response.status_code == 200
        
        # 2. Get recommendations
        rec_response = await api_client.get(
            "/api/ai/recommendations/CUST-TEST-001",
            params={"num_recommendations": 5}
        )
        assert rec_response.status_code == 200
        result = rec_response.json()
        
        assert "recommendations" in result
        assert len(result["recommendations"]) > 0
        
        # Verify recommendation quality
        for rec in result["recommendations"]:
            assert rec["confidence_score"] > 0
            assert "reasoning" in rec
    
    @pytest.mark.asyncio
    async def test_demand_forecasting(self, api_client):
        """Test demand forecasting integration."""
        
        response = await api_client.get(
            "/api/ai/forecast/demand",
            params={
                "destination": "Barcelona",
                "product_type": "package",
                "forecast_months": 6
            }
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "forecasts" in result
        assert len(result["forecasts"]) == 6
        assert "summary" in result


# Load testing
@pytest.mark.load
class TestSystemLoad:
    """Load and stress tests."""
    
    @pytest.mark.asyncio
    @pytest.mark.parametrize("concurrent_users", [10, 50, 100])
    async def test_concurrent_bookings(self, concurrent_users, api_client):
        """Test system under concurrent booking load."""
        import asyncio
        
        async def create_booking():
            response = await api_client.post(
                "/api/bookings",
                json={
                    "customer_id": f"CUST-{concurrent_users}",
                    "destination": "Barcelona",
                    "amount": 1500.00
                }
            )
            return response.status_code
        
        # Create concurrent bookings
        tasks = [create_booking() for _ in range(concurrent_users)]
        results = await asyncio.gather(*tasks)
        
        # All should succeed
        assert all(status == 201 for status in results)
    
    @pytest.mark.asyncio
    async def test_high_volume_report_generation(self, api_client):
        """Test report generation under high load."""
        import asyncio
        
        async def generate_report():
            response = await api_client.get(
                "/api/analytics/reports/balance-sheet"
            )
            return response.status_code
        
        # Generate 50 reports concurrently
        tasks = [generate_report() for _ in range(50)]
        results = await asyncio.gather(*tasks)
        
        # Most should succeed (allow some failures under extreme load)
        success_rate = sum(1 for status in results if status == 200) / len(results)
        assert success_rate >= 0.95  # 95% success rate
