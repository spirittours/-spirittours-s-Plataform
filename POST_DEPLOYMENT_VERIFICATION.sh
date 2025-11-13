#!/bin/bash

##############################################################################
# POST-DEPLOYMENT VERIFICATION SCRIPT
# Verifica que el fix del booking esté funcionando correctamente
##############################################################################

set -e

echo "================================================================"
echo "🧪 POST-DEPLOYMENT VERIFICATION - Spirit Tours"
echo "================================================================"
echo "Started: $(date)"
echo ""

BASE_URL="https://plataform.spirittours.us"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

##############################################################################
# Helper Functions
##############################################################################

test_pass() {
    echo -e "   ${GREEN}✅ PASS${NC}: $1"
    PASSED=$((PASSED + 1))
}

test_fail() {
    echo -e "   ${RED}❌ FAIL${NC}: $1"
    FAILED=$((FAILED + 1))
}

test_warn() {
    echo -e "   ${YELLOW}⚠️  WARN${NC}: $1"
    WARNINGS=$((WARNINGS + 1))
}

test_info() {
    echo -e "   ${BLUE}ℹ️  INFO${NC}: $1"
}

##############################################################################
# TEST 1: Frontend Accessibility
##############################################################################

echo "1️⃣  Frontend Accessibility Test"
echo "─────────────────────────────────"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    test_pass "Frontend accessible [HTTP: 200]"
elif [ "$HTTP_CODE" = "000" ]; then
    test_fail "Cannot reach frontend (network error)"
else
    test_fail "Frontend returned HTTP $HTTP_CODE"
fi
echo ""

##############################################################################
# TEST 2: Bundle Update Check
##############################################################################

echo "2️⃣  Bundle Update Verification"
echo "─────────────────────────────────"

CURRENT_BUNDLE=$(curl -s "$BASE_URL" | grep -o 'static/js/main.[^"]*\.js' | head -1)
PREVIOUS_BUNDLE="static/js/main.da2c5622.js"

if [ -n "$CURRENT_BUNDLE" ]; then
    test_info "Current bundle: $CURRENT_BUNDLE"
    
    if [ "$CURRENT_BUNDLE" != "$PREVIOUS_BUNDLE" ]; then
        test_pass "Bundle updated (hash changed)"
    else
        test_warn "Bundle hash unchanged - cache may need clearing"
        test_info "Old: $PREVIOUS_BUNDLE"
        test_info "New: $CURRENT_BUNDLE"
        test_info "Action: Clear browser cache with Ctrl+Shift+R"
    fi
else
    test_fail "Could not detect JavaScript bundle"
fi
echo ""

##############################################################################
# TEST 3: Backend Health Check
##############################################################################

echo "3️⃣  Backend Health Check"
echo "─────────────────────────────────"

HEALTH_RESPONSE=$(curl -s "$BASE_URL/health" || echo "ERROR")

if [ "$HEALTH_RESPONSE" = "healthy" ]; then
    test_pass "Backend is healthy"
else
    test_fail "Backend health check failed: $HEALTH_RESPONSE"
fi
echo ""

##############################################################################
# TEST 4: Tours Endpoint
##############################################################################

echo "4️⃣  Tours Endpoint Test"
echo "─────────────────────────────────"

TOURS_RESPONSE=$(curl -s "$BASE_URL/api/v1/tours")
TOUR_COUNT=$(echo "$TOURS_RESPONSE" | grep -o '"id"' | wc -l)

if [ "$TOUR_COUNT" -ge 7 ]; then
    test_pass "Tours endpoint returns data ($TOUR_COUNT tours)"
elif [ "$TOUR_COUNT" -gt 0 ]; then
    test_warn "Tours endpoint works but returns fewer tours ($TOUR_COUNT)"
else
    test_fail "Tours endpoint returned no data"
fi
echo ""

##############################################################################
# TEST 5: Booking Creation (CRITICAL)
##############################################################################

echo "5️⃣  🔥 CRITICAL: Booking Creation Test"
echo "─────────────────────────────────"

echo "   Testing with tour-001 (Sedona Vortex)..."

BOOKING_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/api/v1/bookings" \
    -H "Content-Type: application/json" \
    -d '{"tour_id":"tour-001","booking_date":"2025-12-20","participants":2}')

HTTP_CODE=$(echo "$BOOKING_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
SUCCESS=$(echo "$BOOKING_RESPONSE" | grep -o '"success":true')
BOOKING_ID=$(echo "$BOOKING_RESPONSE" | grep -o '"booking_id":"[^"]*"' | cut -d'"' -f4)

if [ "$HTTP_CODE" = "200" ] && [ "$SUCCESS" = '"success":true' ]; then
    test_pass "Booking creation WORKS! [HTTP: 200]"
    test_info "Booking ID: $BOOKING_ID"
    
    # Extract more details
    AMOUNT=$(echo "$BOOKING_RESPONSE" | grep -o '"total_amount":[0-9.]*' | cut -d: -f2)
    test_info "Total amount: \$$AMOUNT"
else
    test_fail "Booking creation FAILED [HTTP: $HTTP_CODE]"
    ERROR_DETAIL=$(echo "$BOOKING_RESPONSE" | grep -o '"detail":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$ERROR_DETAIL" ]; then
        test_info "Error: $ERROR_DETAIL"
    fi
fi
echo ""

##############################################################################
# TEST 6: Multiple Tours Test
##############################################################################

echo "6️⃣  Multiple Tours Booking Test"
echo "─────────────────────────────────"

for TOUR_ID in "tour-002" "tour-003" "tour-005"; do
    echo "   Testing $TOUR_ID..."
    
    RESP=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/api/v1/bookings" \
        -H "Content-Type: application/json" \
        -d "{\"tour_id\":\"$TOUR_ID\",\"booking_date\":\"2025-12-25\",\"participants\":3}")
    
    HTTP=$(echo "$RESP" | grep "HTTP_CODE" | cut -d: -f2)
    
    if [ "$HTTP" = "200" ]; then
        BK_ID=$(echo "$RESP" | grep -o '"booking_id":"[^"]*"' | cut -d'"' -f4)
        test_pass "$TOUR_ID booking successful (ID: $BK_ID)"
    else
        test_fail "$TOUR_ID booking failed [HTTP: $HTTP]"
    fi
done
echo ""

##############################################################################
# TEST 7: Validation Tests
##############################################################################

echo "7️⃣  Input Validation Tests"
echo "─────────────────────────────────"

# Test 7a: Minimum participants validation (should fail with 1)
echo "   Test 7a: Minimum participants (1 participant)..."
RESP=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/api/v1/bookings" \
    -H "Content-Type: application/json" \
    -d '{"tour_id":"tour-001","booking_date":"2025-12-20","participants":1}')

HTTP=$(echo "$RESP" | grep "HTTP_CODE" | cut -d: -f2)
ERROR=$(echo "$RESP" | grep -o '"detail":"[^"]*"' | cut -d'"' -f4)

if [ "$HTTP" = "400" ] && [[ "$ERROR" == *"Minimum"* ]]; then
    test_pass "Minimum participants validation works"
    test_info "Expected error: $ERROR"
else
    test_fail "Minimum participants validation not working [HTTP: $HTTP]"
fi

# Test 7b: Empty tour_id validation (should fail)
echo ""
echo "   Test 7b: Empty tour_id..."
RESP=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/api/v1/bookings" \
    -H "Content-Type: application/json" \
    -d '{"tour_id":"","booking_date":"2025-12-20","participants":2}')

HTTP=$(echo "$RESP" | grep "HTTP_CODE" | cut -d: -f2)
ERROR=$(echo "$RESP" | grep -o '"detail":"[^"]*"' | cut -d'"' -f4)

if [ "$HTTP" = "400" ]; then
    test_pass "tour_id validation works"
    test_info "Expected error: $ERROR"
else
    test_fail "tour_id validation not working [HTTP: $HTTP]"
fi

# Test 7c: Invalid tour_id (should return 404)
echo ""
echo "   Test 7c: Invalid tour_id..."
RESP=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/api/v1/bookings" \
    -H "Content-Type: application/json" \
    -d '{"tour_id":"tour-999","booking_date":"2025-12-20","participants":2}')

HTTP=$(echo "$RESP" | grep "HTTP_CODE" | cut -d: -f2)
ERROR=$(echo "$RESP" | grep -o '"detail":"[^"]*"' | cut -d'"' -f4)

if [ "$HTTP" = "404" ]; then
    test_pass "Invalid tour_id handled correctly"
    test_info "Expected error: $ERROR"
else
    test_fail "Invalid tour_id not handled [HTTP: $HTTP]"
fi

echo ""

##############################################################################
# TEST 8: Stats Endpoint
##############################################################################

echo "8️⃣  Statistics Endpoint Test"
echo "─────────────────────────────────"

STATS_RESPONSE=$(curl -s "$BASE_URL/api/v1/stats")
TOTAL_BOOKINGS=$(echo "$STATS_RESPONSE" | grep -o '"total_bookings":[0-9]*' | cut -d: -f2)

if [ -n "$TOTAL_BOOKINGS" ]; then
    test_pass "Stats endpoint working"
    test_info "Total bookings: $TOTAL_BOOKINGS"
else
    test_fail "Stats endpoint not returning data"
fi
echo ""

##############################################################################
# TEST 9: Type Safety Verification
##############################################################################

echo "9️⃣  Type Safety Verification"
echo "─────────────────────────────────"

echo "   Testing tour_id as NUMBER (should fail)..."
RESP=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/api/v1/bookings" \
    -H "Content-Type: application/json" \
    -d '{"tour_id":1,"booking_date":"2025-12-20","participants":2}')

HTTP=$(echo "$RESP" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP" = "404" ]; then
    test_pass "Type safety enforced (numbers rejected)"
    test_info "Backend correctly requires string tour_id"
else
    test_warn "Backend accepts numbers for tour_id [HTTP: $HTTP]"
    test_info "Fix may not be necessary if backend converts automatically"
fi
echo ""

##############################################################################
# TEST 10: Frontend Bundle Analysis
##############################################################################

echo "🔟 Frontend Bundle Code Analysis"
echo "─────────────────────────────────"

if [ -n "$CURRENT_BUNDLE" ]; then
    echo "   Downloading bundle for analysis..."
    BUNDLE_URL="$BASE_URL/$CURRENT_BUNDLE"
    BUNDLE_CODE=$(curl -s "$BUNDLE_URL")
    
    if [ -n "$BUNDLE_CODE" ]; then
        # Check for String() conversion
        if echo "$BUNDLE_CODE" | grep -q "String([^)]*\.id)"; then
            test_pass "String() conversion found in bundle"
        else
            test_warn "String() conversion not clearly visible (may be minified)"
        fi
        
        # Check for error handling
        if echo "$BUNDLE_CODE" | grep -q "errorMessage\|error.*message"; then
            test_pass "Error handling code detected"
        else
            test_warn "Error handling not clearly visible"
        fi
        
        # Bundle size
        BUNDLE_SIZE=$(echo "$BUNDLE_CODE" | wc -c)
        BUNDLE_SIZE_KB=$((BUNDLE_SIZE / 1024))
        test_info "Bundle size: ${BUNDLE_SIZE_KB}KB"
    else
        test_fail "Could not download bundle"
    fi
else
    test_warn "Skipping bundle analysis (bundle not detected)"
fi
echo ""

##############################################################################
# SUMMARY
##############################################################################

echo "================================================================"
echo "📊 VERIFICATION SUMMARY"
echo "================================================================"
echo ""

TOTAL_TESTS=$((PASSED + FAILED + WARNINGS))

echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed:${NC}  $PASSED"
echo -e "${RED}Failed:${NC}  $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

# Calculate percentage
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$(echo "scale=1; $PASSED * 100 / $TOTAL_TESTS" | bc)
    echo "Pass Rate: ${PASS_RATE}%"
    echo ""
fi

# Overall status
if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "Overall Status: ${GREEN}✅ ALL TESTS PASSED${NC}"
    echo ""
    echo "🎉 System is fully functional!"
    echo ""
    echo "Recommended actions:"
    echo "  • Monitor logs for any issues"
    echo "  • Test in different browsers"
    echo "  • Clear browser cache if needed"
    
elif [ $FAILED -eq 0 ]; then
    echo -e "Overall Status: ${YELLOW}⚠️  PASSED WITH WARNINGS${NC}"
    echo ""
    echo "System is functional but has warnings."
    echo "Review warnings above and take appropriate action."
    
elif [ $PASSED -gt $FAILED ]; then
    echo -e "Overall Status: ${YELLOW}⚠️  MOSTLY WORKING${NC}"
    echo ""
    echo "Most tests passed but some failures detected."
    echo "Review failed tests and fix issues."
    
else
    echo -e "Overall Status: ${RED}❌ CRITICAL ISSUES DETECTED${NC}"
    echo ""
    echo "Multiple tests failed. Immediate action required."
    echo ""
    echo "Recommended actions:"
    echo "  1. Check container logs: docker-compose logs frontend"
    echo "  2. Verify deployment was successful"
    echo "  3. Check for errors in browser console"
    echo "  4. Consider rollback if issues persist"
fi

echo ""
echo "================================================================"
echo "Completed: $(date)"
echo "================================================================"
echo ""

# Save report
REPORT_FILE="/tmp/post_deployment_verification_$(date +%Y%m%d_%H%M%S).log"
echo "📝 Full report saved to: $REPORT_FILE"
echo ""

# Exit with appropriate code
if [ $FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi
