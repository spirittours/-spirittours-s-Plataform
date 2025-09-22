"""
End-to-End Tests for Complete Booking Workflow
Testing complete user journey from search to payment confirmation.
"""

import pytest
import asyncio
from decimal import Decimal
from datetime import datetime, timedelta
from unittest.mock import patch, Mock
import json
import uuid

from fastapi.testclient import TestClient
from backend.main import app

class TestCompleteBookingWorkflow:
    """E2E test suite for complete booking workflow."""

    @pytest.fixture
    def client(self):
        """Create FastAPI test client."""
        return TestClient(app)

    @pytest.fixture
    def customer_auth_headers(self):
        """Customer authentication headers."""
        return {
            'Authorization': 'Bearer customer_token_123',
            'Content-Type': 'application/json'
        }

    @pytest.fixture
    def admin_auth_headers(self):
        """Admin authentication headers."""
        return {
            'Authorization': 'Bearer admin_token_456',
            'Content-Type': 'application/json'
        }

    @pytest.fixture
    def sample_customer_data(self):
        """Sample customer registration data."""
        return {
            'email': 'john.doe@example.com',
            'password': 'SecurePassword123!',
            'first_name': 'John',
            'last_name': 'Doe',
            'phone': '+34612345678',
            'preferences': {
                'language': 'en',
                'currency': 'EUR',
                'notification_email': True,
                'notification_sms': True
            }
        }

    def test_complete_b2c_booking_workflow(self, client, customer_auth_headers):
        """Test complete B2C booking workflow from search to confirmation."""
        
        # Step 1: Customer searches for packages using AI
        search_query = {
            'query_text': 'Find romantic getaway packages to Paris for 2 people in December with luxury hotels',
            'query_type': 'booking_assistance',
            'user_id': 'customer_123',
            'context': {
                'destination': 'Paris',
                'travelers': 2,
                'budget': 3000,
                'travel_dates': ['2024-12-20', '2024-12-27'],
                'preferences': ['romantic', 'luxury', 'cultural']
            }
        }
        
        mock_ai_recommendations = {
            'query_id': str(uuid.uuid4()),
            'success': True,
            'response_text': 'Found 5 romantic Paris packages matching your criteria',
            'confidence_score': 0.94,
            'agent_responses': [{
                'agent_name': 'booking_optimizer',
                'response': {
                    'recommendations': [
                        {
                            'package_id': 'paris_romantic_001',
                            'title': 'Paris Romance Deluxe',
                            'price': 2750.00,
                            'description': 'Luxury suite at Hotel Plaza Athénée, Seine cruise, Michelin dining',
                            'highlights': ['5-star hotel', 'Seine cruise', 'Champagne dinner'],
                            'savings': 250.00,
                            'availability': True
                        }
                    ]
                }
            }]
        }
        
        with patch('backend.ai_manager.AIOrchestrator.process_query', return_value=mock_ai_recommendations):
            search_response = client.post(
                '/api/ai/query',
                json=search_query,
                headers=customer_auth_headers
            )
            
            assert search_response.status_code == 200
            search_data = search_response.json()
            assert search_data['success'] is True
            
            # Extract recommended package
            package_id = search_data['agent_responses'][0]['response']['recommendations'][0]['package_id']
            package_price = search_data['agent_responses'][0]['response']['recommendations'][0]['price']
        
        # Step 2: Customer requests detailed package information
        with patch('backend.services.booking_service.BookingService.get_package_details') as mock_details:
            mock_package_details = {
                'package_id': package_id,
                'title': 'Paris Romance Deluxe',
                'price': package_price,
                'detailed_itinerary': [
                    {'day': 1, 'activities': ['Arrival at CDG', 'Hotel check-in', 'Seine cruise']},
                    {'day': 2, 'activities': ['Louvre Museum', 'Champs-Élysées', 'Michelin dinner']},
                ],
                'inclusions': ['Flights', 'Hotel', 'Breakfast', 'Activities'],
                'terms_conditions': 'Standard booking terms apply',
                'availability': True,
                'max_travelers': 4
            }
            mock_details.return_value = mock_package_details
            
            package_response = client.get(
                f'/api/bookings/packages/{package_id}',
                headers=customer_auth_headers
            )
            
            assert package_response.status_code == 200
            package_data = package_response.json()
            assert package_data['package_id'] == package_id
            assert package_data['availability'] is True
        
        # Step 3: Customer creates booking (reservation)
        booking_data = {
            'package_id': package_id,
            'travelers': [
                {
                    'type': 'adult',
                    'first_name': 'John',
                    'last_name': 'Doe',
                    'email': 'john.doe@example.com',
                    'phone': '+34612345678',
                    'passport_number': 'X1234567Y',
                    'date_of_birth': '1985-05-15'
                },
                {
                    'type': 'adult',
                    'first_name': 'Jane',
                    'last_name': 'Doe',
                    'email': 'jane.doe@example.com',
                    'phone': '+34612345679',
                    'passport_number': 'X7654321Y',
                    'date_of_birth': '1987-08-20'
                }
            ],
            'special_requests': 'Honeymoon suite if available',
            'contact_preferences': {
                'email': True,
                'sms': True,
                'whatsapp': False
            }
        }
        
        mock_booking_creation = {
            'booking_id': 'BOOK789012',
            'status': 'pending_payment',
            'total_amount': package_price,
            'currency': 'EUR',
            'payment_deadline': (datetime.now() + timedelta(hours=24)).isoformat(),
            'reservation_code': 'RSV-PARIS-789012'
        }
        
        with patch('backend.services.booking_service.BookingService.create_booking', return_value=mock_booking_creation):
            booking_response = client.post(
                '/api/bookings/create',
                json=booking_data,
                headers=customer_auth_headers
            )
            
            assert booking_response.status_code == 201
            booking_result = booking_response.json()
            assert booking_result['booking_id'] == 'BOOK789012'
            assert booking_result['status'] == 'pending_payment'
            booking_id = booking_result['booking_id']
        
        # Step 4: Process payment
        payment_data = {
            'booking_id': booking_id,
            'amount': package_price,
            'currency': 'EUR',
            'payment_method': 'card',
            'provider': 'stripe',
            'customer_email': 'john.doe@example.com',
            'card_token': 'tok_visa_test_card'
        }
        
        mock_payment_intent = Mock()
        mock_payment_intent.id = 'pi_successful_payment'
        mock_payment_intent.status = 'succeeded'
        mock_payment_intent.amount = int(package_price * 100)
        mock_payment_intent.currency = 'eur'
        
        with patch('stripe.PaymentIntent.create', return_value=mock_payment_intent):
            payment_response = client.post(
                '/api/payments/process',
                json=payment_data,
                headers=customer_auth_headers
            )
            
            assert payment_response.status_code == 200
            payment_result = payment_response.json()
            assert payment_result['success'] is True
            assert payment_result['transaction_id'] == 'pi_successful_payment'
        
        # Step 5: Booking confirmation and notifications
        with patch('backend.services.booking_service.BookingService.confirm_booking') as mock_confirm:
            mock_confirm.return_value = {
                'booking_id': booking_id,
                'status': 'confirmed',
                'confirmation_code': 'CONF-PARIS-789012',
                'vouchers_generated': True
            }
            
            with patch('aiosmtplib.send') as mock_email:
                mock_email.return_value = {'status': 'sent'}
                
                with patch('twilio.rest.Client') as mock_sms:
                    mock_client = Mock()
                    mock_message = Mock()
                    mock_message.sid = 'SM_confirmation_123'
                    mock_message.status = 'sent'
                    mock_client.messages.create.return_value = mock_message
                    mock_sms.return_value = mock_client
                    
                    confirm_response = client.post(
                        f'/api/bookings/{booking_id}/confirm',
                        json={'payment_transaction_id': 'pi_successful_payment'},
                        headers=customer_auth_headers
                    )
                    
                    assert confirm_response.status_code == 200
                    confirm_result = confirm_response.json()
                    assert confirm_result['status'] == 'confirmed'
                    assert confirm_result['confirmation_code'] == 'CONF-PARIS-789012'
        
        # Step 6: Verify notifications were sent
        notification_history_response = client.get(
            '/api/notifications/history/customer_123',
            headers=customer_auth_headers
        )
        
        if notification_history_response.status_code == 200:
            notifications = notification_history_response.json()
            # Should have confirmation email and SMS
            assert len(notifications.get('notifications', [])) >= 2
        
        # Step 7: Customer retrieves booking details
        booking_details_response = client.get(
            f'/api/bookings/{booking_id}',
            headers=customer_auth_headers
        )
        
        assert booking_details_response.status_code == 200
        final_booking_data = booking_details_response.json()
        assert final_booking_data['booking_id'] == booking_id
        assert final_booking_data['status'] == 'confirmed'

    def test_b2b_partner_booking_workflow(self, client):
        """Test B2B partner booking workflow with commission calculations."""
        
        # Partner authentication
        partner_headers = {
            'Authorization': 'Bearer partner_token_789',
            'Content-Type': 'application/json',
            'X-Partner-ID': 'PARTNER_TRAVEL_AGENCY_001'
        }
        
        # Step 1: Partner searches for inventory
        partner_search = {
            'destination': 'Barcelona',
            'check_in': '2024-11-15',
            'check_out': '2024-11-22',
            'travelers': 4,
            'budget_range': [2000, 4000],
            'partner_tier': 'premium'
        }
        
        mock_inventory = {
            'available_packages': [
                {
                    'package_id': 'barcelona_premium_001',
                    'title': 'Barcelona Cultural Experience',
                    'base_price': 3200.00,
                    'partner_price': 2880.00,  # 10% partner discount
                    'commission_rate': 0.15,
                    'availability': 8,
                    'partner_exclusive': True
                }
            ],
            'total_results': 1
        }
        
        with patch('backend.services.booking_service.BookingService.search_partner_inventory', return_value=mock_inventory):
            inventory_response = client.post(
                '/api/b2b/inventory/search',
                json=partner_search,
                headers=partner_headers
            )
            
            assert inventory_response.status_code == 200
            inventory_data = inventory_response.json()
            assert len(inventory_data['available_packages']) == 1
            
            package = inventory_data['available_packages'][0]
            partner_price = package['partner_price']
            commission_rate = package['commission_rate']
        
        # Step 2: Partner creates booking for their customer
        partner_booking_data = {
            'package_id': 'barcelona_premium_001',
            'partner_reference': 'AGENCY_BOOKING_456',
            'end_customer_details': {
                'name': 'Martinez Family',
                'email': 'martinez@example.com',
                'phone': '+34987654321'
            },
            'travelers': [
                {'type': 'adult', 'name': 'Carlos Martinez'},
                {'type': 'adult', 'name': 'Maria Martinez'},
                {'type': 'child', 'name': 'Sofia Martinez', 'age': 8},
                {'type': 'child', 'name': 'Diego Martinez', 'age': 10}
            ],
            'payment_terms': 'partner_credit',
            'markup_percentage': 0.20  # Partner adds 20% markup
        }
        
        final_price = partner_price * (1 + partner_booking_data['markup_percentage'])
        expected_commission = partner_price * commission_rate
        
        mock_partner_booking = {
            'booking_id': 'B2B_BOOK_456',
            'status': 'confirmed',
            'partner_price': partner_price,
            'final_customer_price': final_price,
            'commission_amount': expected_commission,
            'payment_status': 'partner_credit_applied'
        }
        
        with patch('backend.services.booking_service.BookingService.create_partner_booking', return_value=mock_partner_booking):
            partner_booking_response = client.post(
                '/api/b2b/bookings/create',
                json=partner_booking_data,
                headers=partner_headers
            )
            
            assert partner_booking_response.status_code == 201
            booking_result = partner_booking_response.json()
            assert booking_result['booking_id'] == 'B2B_BOOK_456'
            assert booking_result['commission_amount'] == expected_commission
        
        # Step 3: Verify commission calculation
        commission_response = client.get(
            f'/api/b2b/bookings/B2B_BOOK_456/commission',
            headers=partner_headers
        )
        
        assert commission_response.status_code == 200
        commission_data = commission_response.json()
        assert commission_data['commission_amount'] == expected_commission
        assert commission_data['commission_rate'] == commission_rate

    def test_booking_modification_workflow(self, client, customer_auth_headers):
        """Test booking modification and change management workflow."""
        
        # Existing booking
        booking_id = 'BOOK_MODIFY_789'
        
        # Step 1: Customer requests booking modification
        modification_request = {
            'booking_id': booking_id,
            'changes': {
                'travel_dates': {
                    'new_check_in': '2024-12-22',
                    'new_check_out': '2024-12-29'
                },
                'travelers_count': 3,  # Adding one more traveler
                'room_upgrade': 'suite'
            },
            'reason': 'Family member joining the trip'
        }
        
        mock_modification_quote = {
            'modification_id': 'MOD_123456',
            'original_price': 2750.00,
            'new_price': 3200.00,
            'price_difference': 450.00,
            'change_fees': 50.00,
            'total_additional_cost': 500.00,
            'new_cancellation_policy': 'Modified booking - 72h cancellation'
        }
        
        with patch('backend.services.booking_service.BookingService.quote_modification', return_value=mock_modification_quote):
            quote_response = client.post(
                '/api/bookings/modifications/quote',
                json=modification_request,
                headers=customer_auth_headers
            )
            
            assert quote_response.status_code == 200
            quote_data = quote_response.json()
            assert quote_data['total_additional_cost'] == 500.00
        
        # Step 2: Customer approves and pays for modification
        modification_approval = {
            'modification_id': 'MOD_123456',
            'approved': True,
            'payment_method': 'card',
            'card_token': 'tok_visa_modification'
        }
        
        mock_payment_intent = Mock()
        mock_payment_intent.id = 'pi_modification_payment'
        mock_payment_intent.status = 'succeeded'
        mock_payment_intent.amount = 50000  # €500.00 in cents
        
        with patch('stripe.PaymentIntent.create', return_value=mock_payment_intent):
            with patch('backend.services.booking_service.BookingService.apply_modification') as mock_apply:
                mock_apply.return_value = {
                    'booking_id': booking_id,
                    'modification_applied': True,
                    'new_total_price': 3200.00,
                    'updated_confirmation_code': 'CONF-PARIS-789012-MOD'
                }
                
                approval_response = client.post(
                    '/api/bookings/modifications/approve',
                    json=modification_approval,
                    headers=customer_auth_headers
                )
                
                assert approval_response.status_code == 200
                approval_data = approval_response.json()
                assert approval_data['modification_applied'] is True

    def test_booking_cancellation_workflow(self, client, customer_auth_headers):
        """Test booking cancellation and refund workflow."""
        
        booking_id = 'BOOK_CANCEL_999'
        
        # Step 1: Customer requests cancellation quote
        cancellation_request = {
            'booking_id': booking_id,
            'cancellation_reason': 'Emergency - family illness',
            'request_date': datetime.now().isoformat()
        }
        
        mock_cancellation_quote = {
            'booking_id': booking_id,
            'original_amount': 2750.00,
            'cancellation_fees': 275.00,  # 10% cancellation fee
            'refund_amount': 2475.00,
            'processing_fee': 25.00,
            'net_refund': 2450.00,
            'refund_timeline': '5-10 business days'
        }
        
        with patch('backend.services.booking_service.BookingService.quote_cancellation', return_value=mock_cancellation_quote):
            quote_response = client.post(
                '/api/bookings/cancellations/quote',
                json=cancellation_request,
                headers=customer_auth_headers
            )
            
            assert quote_response.status_code == 200
            quote_data = quote_response.json()
            assert quote_data['net_refund'] == 2450.00
        
        # Step 2: Customer confirms cancellation
        cancellation_confirmation = {
            'booking_id': booking_id,
            'confirm_cancellation': True,
            'accept_terms': True
        }
        
        mock_refund = Mock()
        mock_refund.id = 're_cancellation_refund'
        mock_refund.status = 'succeeded'
        mock_refund.amount = 245000  # €2450.00 in cents
        
        with patch('stripe.Refund.create', return_value=mock_refund):
            with patch('backend.services.booking_service.BookingService.process_cancellation') as mock_cancel:
                mock_cancel.return_value = {
                    'booking_id': booking_id,
                    'status': 'cancelled',
                    'refund_transaction_id': 're_cancellation_refund',
                    'refund_amount': 2450.00
                }
                
                cancellation_response = client.post(
                    '/api/bookings/cancellations/confirm',
                    json=cancellation_confirmation,
                    headers=customer_auth_headers
                )
                
                assert cancellation_response.status_code == 200
                cancellation_data = cancellation_response.json()
                assert cancellation_data['status'] == 'cancelled'
                assert cancellation_data['refund_amount'] == 2450.00

    def test_customer_service_escalation_workflow(self, client, customer_auth_headers, admin_auth_headers):
        """Test customer service issue escalation workflow."""
        
        booking_id = 'BOOK_ISSUE_555'
        
        # Step 1: Customer reports an issue
        issue_report = {
            'booking_id': booking_id,
            'issue_type': 'service_complaint',
            'priority': 'high',
            'description': 'Hotel room was not as described in the booking. No balcony and poor cleanliness.',
            'photos': ['photo1.jpg', 'photo2.jpg'],
            'preferred_resolution': 'partial_refund'
        }
        
        mock_ticket_creation = {
            'ticket_id': 'TICKET_789',
            'status': 'open',
            'priority': 'high',
            'assigned_agent': 'customer_service_agent_001',
            'estimated_resolution': '48 hours'
        }
        
        with patch('backend.services.customer_service.CustomerServiceService.create_ticket', return_value=mock_ticket_creation):
            ticket_response = client.post(
                '/api/customer-service/issues/create',
                json=issue_report,
                headers=customer_auth_headers
            )
            
            assert ticket_response.status_code == 201
            ticket_data = ticket_response.json()
            assert ticket_data['ticket_id'] == 'TICKET_789'
            ticket_id = ticket_data['ticket_id']
        
        # Step 2: AI agent provides initial assessment
        ai_assessment_query = {
            'query_text': f'Analyze customer complaint for booking {booking_id} - hotel room quality issues',
            'query_type': 'customer_service',
            'context': {
                'booking_id': booking_id,
                'issue_type': 'service_complaint',
                'customer_history': 'loyal_customer_5_years'
            }
        }
        
        mock_ai_assessment = {
            'query_id': str(uuid.uuid4()),
            'success': True,
            'response_text': 'Customer complaint appears valid. Recommend 30% refund and future discount.',
            'confidence_score': 0.88,
            'agent_responses': [{
                'agent_name': 'customer_prophet',
                'response': {
                    'recommended_action': 'partial_refund',
                    'refund_percentage': 0.30,
                    'additional_compensation': 'future_booking_discount_15%',
                    'reasoning': 'Loyal customer with valid complaint'
                }
            }]
        }
        
        with patch('backend.ai_manager.AIOrchestrator.process_query', return_value=mock_ai_assessment):
            ai_response = client.post(
                '/api/ai/query',
                json=ai_assessment_query,
                headers=admin_auth_headers
            )
            
            assert ai_response.status_code == 200
            ai_data = ai_response.json()
            assert ai_data['confidence_score'] == 0.88
        
        # Step 3: Admin resolves the issue based on AI recommendation
        resolution_data = {
            'ticket_id': ticket_id,
            'resolution_type': 'partial_refund',
            'refund_amount': 825.00,  # 30% of original booking
            'compensation': {
                'type': 'future_discount',
                'value': 15,
                'valid_until': '2025-12-31'
            },
            'resolution_notes': 'Processed 30% refund as recommended by AI assessment'
        }
        
        mock_resolution = {
            'ticket_id': ticket_id,
            'status': 'resolved',
            'refund_transaction_id': 're_complaint_refund',
            'compensation_code': 'DISCOUNT_15_LOYAL_001'
        }
        
        with patch('stripe.Refund.create') as mock_refund_create:
            mock_refund = Mock()
            mock_refund.id = 're_complaint_refund'
            mock_refund.status = 'succeeded'
            mock_refund_create.return_value = mock_refund
            
            with patch('backend.services.customer_service.CustomerServiceService.resolve_ticket', return_value=mock_resolution):
                resolution_response = client.post(
                    '/api/customer-service/tickets/resolve',
                    json=resolution_data,
                    headers=admin_auth_headers
                )
                
                assert resolution_response.status_code == 200
                resolution_result = resolution_response.json()
                assert resolution_result['status'] == 'resolved'

class TestWorkflowPerformance:
    """Performance tests for complete workflows."""
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_concurrent_booking_workflows(self, client):
        """Test multiple concurrent booking workflows."""
        import time
        import concurrent.futures
        
        def complete_booking_flow(customer_id):
            """Simulate complete booking flow for one customer."""
            
            customer_headers = {
                'Authorization': f'Bearer customer_token_{customer_id}',
                'Content-Type': 'application/json'
            }
            
            # Search -> Book -> Pay -> Confirm
            search_query = {
                'query_text': f'Find packages for customer {customer_id}',
                'query_type': 'booking_assistance',
                'user_id': f'customer_{customer_id}',
                'context': {'destination': f'destination_{customer_id}'}
            }
            
            # Mock all external services
            with patch('backend.ai_manager.AIOrchestrator.process_query') as mock_ai, \
                 patch('stripe.PaymentIntent.create') as mock_payment, \
                 patch('aiosmtplib.send') as mock_email:
                
                # Setup mocks
                mock_ai.return_value = {'success': True, 'query_id': f'query_{customer_id}'}
                
                mock_intent = Mock()
                mock_intent.id = f'pi_{customer_id}'
                mock_intent.status = 'succeeded'
                mock_payment.return_value = mock_intent
                
                mock_email.return_value = {'status': 'sent'}
                
                # Execute workflow steps
                search_response = client.post('/api/ai/query', json=search_query, headers=customer_headers)
                
                booking_data = {
                    'package_id': f'package_{customer_id}',
                    'travelers': [{'name': f'Customer {customer_id}'}]
                }
                
                with patch('backend.services.booking_service.BookingService.create_booking') as mock_create:
                    mock_create.return_value = {
                        'booking_id': f'BOOK_{customer_id}',
                        'status': 'pending_payment',
                        'total_amount': 1000.00
                    }
                    booking_response = client.post('/api/bookings/create', json=booking_data, headers=customer_headers)
                
                payment_data = {
                    'booking_id': f'BOOK_{customer_id}',
                    'amount': 1000.00,
                    'currency': 'EUR'
                }
                payment_response = client.post('/api/payments/process', json=payment_data, headers=customer_headers)
                
                return all([
                    search_response.status_code == 200,
                    booking_response.status_code == 201,
                    payment_response.status_code == 200
                ])
        
        start_time = time.time()
        
        # Run 10 concurrent booking workflows
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(complete_booking_flow, i) for i in range(10)]
            results = [future.result() for future in futures]
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # All workflows should complete successfully within 30 seconds
        assert total_time < 30.0
        success_count = sum(results)
        assert success_count >= 8  # At least 80% success rate