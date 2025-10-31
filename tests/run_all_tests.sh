#!/bin/bash

# ============================================================================
# Spirit Tours - Test Runner Script
# Runs all unit tests and generates coverage report
# ============================================================================

echo "================================"
echo "Spirit Tours - Running All Tests"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
PYTHON_TESTS_PASSED=0
JS_TESTS_PASSED=0
TOTAL_TESTS=0
FAILED_TESTS=0

# ============================================================================
# Python Unit Tests
# ============================================================================
echo -e "${YELLOW}>>> Running Python Unit Tests${NC}"
echo ""

cd "$(dirname "$0")/.." || exit 1

if command -v pytest &> /dev/null; then
    echo "Running Smart Notification Service tests..."
    if pytest tests/unit/test_smart_notification_service.py -v --tb=short; then
        echo -e "${GREEN}✓ Smart Notification tests passed${NC}"
        PYTHON_TESTS_PASSED=$((PYTHON_TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ Smart Notification tests failed${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
    
    echo "Running Trip State Machine tests..."
    if pytest tests/unit/test_trip_state_machine.py -v --tb=short; then
        echo -e "${GREEN}✓ Trip State Machine tests passed${NC}"
        PYTHON_TESTS_PASSED=$((PYTHON_TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ Trip State Machine tests failed${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
    
    TOTAL_TESTS=$((TOTAL_TESTS + 2))
else
    echo -e "${YELLOW}⚠ pytest not installed - skipping Python tests${NC}"
    echo "Install with: pip install pytest"
    echo ""
fi

# ============================================================================
# JavaScript/Node.js Unit Tests
# ============================================================================
echo -e "${YELLOW}>>> Running JavaScript Unit Tests${NC}"
echo ""

if command -v mocha &> /dev/null; then
    echo "Running WebSocket Event tests..."
    if mocha tests/unit/test_websocket_events.js --reporter spec; then
        echo -e "${GREEN}✓ WebSocket Event tests passed${NC}"
        JS_TESTS_PASSED=$((JS_TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ WebSocket Event tests failed${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
else
    echo -e "${YELLOW}⚠ mocha not installed - skipping JavaScript tests${NC}"
    echo "Install with: npm install -g mocha chai sinon"
    echo ""
fi

# ============================================================================
# Test Summary
# ============================================================================
echo "================================"
echo "Test Results Summary"
echo "================================"
echo ""

PASSED_TESTS=$((PYTHON_TESTS_PASSED + JS_TESTS_PASSED))

echo "Python Tests:     ${PYTHON_TESTS_PASSED}/2"
echo "JavaScript Tests: ${JS_TESTS_PASSED}/1"
echo "----------------------------"
echo "Total:            ${PASSED_TESTS}/${TOTAL_TESTS}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ ${FAILED_TESTS} test suite(s) failed${NC}"
    exit 1
fi
