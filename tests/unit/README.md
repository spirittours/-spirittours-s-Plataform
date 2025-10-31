# Unit Tests - Spirit Tours Platform

Comprehensive unit tests for critical services and components.

## 📋 Test Coverage

### Python Tests

#### 1. Smart Notification Service (`test_smart_notification_service.py`)
Tests the cost-optimized notification algorithm achieving 98% cost reduction.

**Test Cases (18 tests):**
- ✅ SMS cost calculation (Mexico, USA, International)
- ✅ WhatsApp availability cache (hit, miss, expiration)
- ✅ Notification prioritization (WhatsApp → Email → SMS)
- ✅ Fallback logic when channels unavailable
- ✅ SMS budget enforcement
- ✅ Cost savings calculation
- ✅ User preference respect
- ✅ Monthly cost tracking
- ✅ Overall ROI verification (98% savings)

**Key Metrics Tested:**
- WhatsApp success rate
- Email fallback rate
- SMS usage minimization
- Budget compliance
- Cost savings accuracy

#### 2. Trip State Machine (`test_trip_state_machine.py`)
Tests the 10-state trip lifecycle and transition logic.

**Test Cases (25 tests):**
- ✅ State transitions (10 states vs Expedia's 4)
- ✅ Payment confirmation workflow
- ✅ Trip start/completion logic
- ✅ Cancellation policies
- ✅ Refund calculation (14 days: 100%, 7 days: 75%, 2 days: 50%, <2 days: 0%)
- ✅ No-show handling
- ✅ Modification time limits
- ✅ Invalid transition blocking
- ✅ Status history tracking
- ✅ Waiting list and priority workflows

**State Coverage:**
- `pending` → `upcoming` → `in_progress` → `completed`
- `pending` → `cancelled` → `refunded`
- `upcoming` → `no_show`
- `upcoming` → `modified` → `upcoming`
- `waiting_list` → `upcoming`
- `upcoming` → `priority` → `in_progress`

### JavaScript Tests

#### 3. WebSocket Event Handlers (`test_websocket_events.js`)
Tests real-time communication infrastructure.

**Test Cases (20 tests):**
- ✅ Room management (join, leave, cleanup)
- ✅ Message broadcasting
- ✅ Typing indicators
- ✅ GPS location updates (every 30 seconds)
- ✅ Message read receipts
- ✅ Online/offline status
- ✅ Event tracking and logging
- ✅ Error handling
- ✅ Scalability (multiple rooms, high-frequency updates)

**Real-time Features Tested:**
- Multi-user chat rooms
- Location broadcasting
- Presence indicators
- Event synchronization

## 🚀 Running Tests

### Run All Tests
```bash
./tests/run_all_tests.sh
```

### Run Specific Test Suite

**Python Tests:**
```bash
# Smart Notification Service
pytest tests/unit/test_smart_notification_service.py -v

# Trip State Machine
pytest tests/unit/test_trip_state_machine.py -v
```

**JavaScript Tests:**
```bash
# WebSocket Events
mocha tests/unit/test_websocket_events.js --reporter spec
```

### Run with Coverage

**Python:**
```bash
pytest tests/unit/ --cov=backend/services --cov-report=html
```

**JavaScript:**
```bash
nyc mocha tests/unit/test_websocket_events.js
```

## 📊 Expected Results

### Test Success Criteria

All tests should pass with:
- **Python:** 43 tests passed
- **JavaScript:** 20 tests passed
- **Total:** 63 tests passed

### Performance Benchmarks

| Test Suite | Execution Time | Coverage |
|------------|---------------|----------|
| Smart Notifications | < 2 seconds | 95%+ |
| Trip State Machine | < 2 seconds | 95%+ |
| WebSocket Events | < 3 seconds | 90%+ |

## 🔧 Requirements

### Python Dependencies
```bash
pip install pytest pytest-cov
```

### JavaScript Dependencies
```bash
npm install --save-dev mocha chai sinon nyc
```

## 📝 Test Patterns

### 1. Arrange-Act-Assert (AAA)
```python
def test_example(service):
    # Arrange
    service.setup_data()
    
    # Act
    result = service.perform_action()
    
    # Assert
    assert result.success is True
```

### 2. Given-When-Then (BDD)
```python
def test_refund_calculation():
    # Given: Trip 14+ days away
    trip = create_trip(days_until=20)
    
    # When: Calculate refund
    refund = trip.calculate_refund_amount()
    
    # Then: 100% refund
    assert refund == trip.paid_amount
```

### 3. Mocking External Services
```python
@patch('whatsapp_service.send_message')
def test_notification_with_mock(mock_send):
    # Configure mock
    mock_send.return_value = {'success': True}
    
    # Test logic
    result = send_notification()
    
    # Verify mock called
    mock_send.assert_called_once()
```

## 🐛 Debugging Failed Tests

### View Detailed Output
```bash
pytest tests/unit/test_smart_notification_service.py -v --tb=long
```

### Run Specific Test
```bash
pytest tests/unit/test_smart_notification_service.py::TestSmartNotificationService::test_cost_optimization_roi -v
```

### Debug Mode
```bash
pytest tests/unit/ --pdb  # Drop into debugger on failure
```

## 📈 Test Metrics

### Coverage Goals
- Critical services: 95%+
- Business logic: 90%+
- Utility functions: 85%+

### Assertions per Test
- Minimum: 2 assertions
- Average: 3-4 assertions
- Complex tests: 5+ assertions

## 🎯 Key Test Scenarios

### Cost Optimization Scenario
```python
# Verifies 98% cost reduction
# Input: 100 notifications
# Expected: 70 WhatsApp, 28 Email, 2 SMS
# Cost: $0.10 vs $5.00 (98% savings)
```

### Trip Lifecycle Scenario
```python
# Full trip workflow
# pending → upcoming → in_progress → completed
# With cancellation and refund branches
```

### Real-time Communication Scenario
```javascript
// Multi-user chat
// GPS updates every 30s
// Typing indicators
// Read receipts
```

## 📚 Additional Resources

- **Pytest Documentation:** https://docs.pytest.org/
- **Mocha Documentation:** https://mochajs.org/
- **Chai Assertions:** https://www.chaijs.com/
- **Testing Best Practices:** See project wiki

## 🔄 Continuous Integration

Tests run automatically on:
- Every commit (pre-commit hook)
- Pull request creation
- Merge to main branch
- Scheduled daily builds

## ✅ Test Checklist

Before committing code:
- [ ] All unit tests pass
- [ ] Coverage > 90% for new code
- [ ] No test warnings or deprecations
- [ ] Test names are descriptive
- [ ] Mock external dependencies
- [ ] Tests are isolated (no shared state)
- [ ] Fast execution (< 5 seconds total)

---

**Last Updated:** October 25, 2024  
**Test Framework:** pytest 7.x + mocha 10.x  
**Total Tests:** 63 unit tests
