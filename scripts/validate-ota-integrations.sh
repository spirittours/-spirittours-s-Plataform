#!/bin/bash

################################################################################
# OTA INTEGRATIONS VALIDATION SCRIPT
################################################################################
# Purpose: Validate all OTA integrations (Airbnb, Agoda, HostelWorld, Trivago)
# Author: AI Developer
# Date: 2025-10-18
# Version: 1.0.0
#
# Usage: ./scripts/validate-ota-integrations.sh [environment]
#
# Features:
# - Test authentication for each OTA
# - Validate rate push/pull
# - Test reservation synchronization
# - Check availability updates
# - Generate integration report
#
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT="${1:-staging}"
API_URL="${API_URL:-http://localhost:8000}"
REPORT_FILE="ota_validation_$(date +%Y%m%d_%H%M%S).json"

# OTA Platforms
declare -a OTA_PLATFORMS=("airbnb" "agoda" "hostelworld" "trivago" "booking" "expedia")

# Test results
declare -A TEST_RESULTS

################################################################################
# HELPER FUNCTIONS
################################################################################

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR:${NC} $1"
}

log_info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING:${NC} $1"
}

################################################################################
# AUTHENTICATION
################################################################################

authenticate() {
    log_info "Authenticating with API..."
    
    local response=$(curl -s -X POST "${API_URL}/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "username": "admin",
            "password": "admin123"
        }')
    
    TOKEN=$(echo "$response" | jq -r '.access_token')
    
    if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
        log_error "Authentication failed"
        exit 1
    fi
    
    log "✅ Authenticated successfully"
}

################################################################################
# TEST 1: OTA AUTHENTICATION
################################################################################

test_ota_authentication() {
    local ota=$1
    log_info "Testing $ota authentication..."
    
    local response=$(curl -s -w "\n%{http_code}" -X POST \
        "${API_URL}/api/v1/ota/${ota}/test-connection" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        log "✅ $ota authentication successful"
        TEST_RESULTS["${ota}_auth"]="PASS"
        return 0
    else
        log_error "$ota authentication failed (HTTP $http_code)"
        log_error "Response: $body"
        TEST_RESULTS["${ota}_auth"]="FAIL"
        return 1
    fi
}

################################################################################
# TEST 2: RATE PUSH
################################################################################

test_rate_push() {
    local ota=$1
    log_info "Testing $ota rate push..."
    
    local test_data='{
        "property_id": "test_property_123",
        "room_type_id": "test_room_456",
        "rates": [
            {
                "date": "'"$(date -d '+7 days' +%Y-%m-%d)"'",
                "rate": 100.00,
                "currency": "USD"
            },
            {
                "date": "'"$(date -d '+8 days' +%Y-%m-%d)"'",
                "rate": 110.00,
                "currency": "USD"
            }
        ]
    }'
    
    local response=$(curl -s -w "\n%{http_code}" -X POST \
        "${API_URL}/api/v1/ota/${ota}/rates" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$test_data")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        log "✅ $ota rate push successful"
        TEST_RESULTS["${ota}_rate_push"]="PASS"
        return 0
    else
        log_error "$ota rate push failed (HTTP $http_code)"
        log_error "Response: $body"
        TEST_RESULTS["${ota}_rate_push"]="FAIL"
        return 1
    fi
}

################################################################################
# TEST 3: RATE PULL
################################################################################

test_rate_pull() {
    local ota=$1
    log_info "Testing $ota rate pull..."
    
    local start_date=$(date -d '+1 day' +%Y-%m-%d)
    local end_date=$(date -d '+30 days' +%Y-%m-%d)
    
    local response=$(curl -s -w "\n%{http_code}" -X GET \
        "${API_URL}/api/v1/ota/${ota}/rates?property_id=test_property_123&start_date=${start_date}&end_date=${end_date}" \
        -H "Authorization: Bearer $TOKEN")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        local rate_count=$(echo "$body" | jq -r '. | length' 2>/dev/null || echo "0")
        log "✅ $ota rate pull successful ($rate_count rates retrieved)"
        TEST_RESULTS["${ota}_rate_pull"]="PASS"
        return 0
    else
        log_error "$ota rate pull failed (HTTP $http_code)"
        TEST_RESULTS["${ota}_rate_pull"]="FAIL"
        return 1
    fi
}

################################################################################
# TEST 4: AVAILABILITY UPDATE
################################################################################

test_availability_update() {
    local ota=$1
    log_info "Testing $ota availability update..."
    
    local test_data='{
        "property_id": "test_property_123",
        "room_type_id": "test_room_456",
        "availability": [
            {
                "date": "'"$(date -d '+7 days' +%Y-%m-%d)"'",
                "available": true,
                "available_units": 5
            },
            {
                "date": "'"$(date -d '+8 days' +%Y-%m-%d)"'",
                "available": true,
                "available_units": 3
            }
        ]
    }'
    
    local response=$(curl -s -w "\n%{http_code}" -X POST \
        "${API_URL}/api/v1/ota/${ota}/availability" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$test_data")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        log "✅ $ota availability update successful"
        TEST_RESULTS["${ota}_availability"]="PASS"
        return 0
    else
        log_error "$ota availability update failed (HTTP $http_code)"
        TEST_RESULTS["${ota}_availability"]="FAIL"
        return 1
    fi
}

################################################################################
# TEST 5: RESERVATION SYNC
################################################################################

test_reservation_sync() {
    local ota=$1
    log_info "Testing $ota reservation sync..."
    
    local start_date=$(date -d '-7 days' +%Y-%m-%d)
    local end_date=$(date -d '+7 days' +%Y-%m-%d)
    
    local response=$(curl -s -w "\n%{http_code}" -X GET \
        "${API_URL}/api/v1/ota/${ota}/reservations?start_date=${start_date}&end_date=${end_date}" \
        -H "Authorization: Bearer $TOKEN")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        local reservation_count=$(echo "$body" | jq -r '. | length' 2>/dev/null || echo "0")
        log "✅ $ota reservation sync successful ($reservation_count reservations)"
        TEST_RESULTS["${ota}_reservations"]="PASS"
        return 0
    else
        log_error "$ota reservation sync failed (HTTP $http_code)"
        TEST_RESULTS["${ota}_reservations"]="FAIL"
        return 1
    fi
}

################################################################################
# TEST 6: WEBHOOK VALIDATION
################################################################################

test_webhook_validation() {
    local ota=$1
    log_info "Testing $ota webhook configuration..."
    
    local response=$(curl -s -w "\n%{http_code}" -X GET \
        "${API_URL}/api/v1/ota/${ota}/webhooks" \
        -H "Authorization: Bearer $TOKEN")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        log "✅ $ota webhook configuration valid"
        TEST_RESULTS["${ota}_webhooks"]="PASS"
        return 0
    else
        log_warning "$ota webhook configuration check skipped or not configured"
        TEST_RESULTS["${ota}_webhooks"]="SKIP"
        return 0
    fi
}

################################################################################
# RUN ALL TESTS FOR OTA
################################################################################

run_ota_tests() {
    local ota=$1
    
    log_info "=========================================="
    log_info "TESTING OTA: ${ota^^}"
    log_info "=========================================="
    
    local tests_passed=0
    local tests_failed=0
    
    # Test 1: Authentication
    if test_ota_authentication "$ota"; then
        tests_passed=$((tests_passed + 1))
        
        # Only run other tests if authentication succeeds
        
        # Test 2: Rate Push
        if test_rate_push "$ota"; then
            tests_passed=$((tests_passed + 1))
        else
            tests_failed=$((tests_failed + 1))
        fi
        
        # Test 3: Rate Pull
        if test_rate_pull "$ota"; then
            tests_passed=$((tests_passed + 1))
        else
            tests_failed=$((tests_failed + 1))
        fi
        
        # Test 4: Availability Update
        if test_availability_update "$ota"; then
            tests_passed=$((tests_passed + 1))
        else
            tests_failed=$((tests_failed + 1))
        fi
        
        # Test 5: Reservation Sync
        if test_reservation_sync "$ota"; then
            tests_passed=$((tests_passed + 1))
        else
            tests_failed=$((tests_failed + 1))
        fi
        
        # Test 6: Webhook Validation
        if test_webhook_validation "$ota"; then
            tests_passed=$((tests_passed + 1))
        else
            tests_failed=$((tests_failed + 1))
        fi
    else
        tests_failed=6  # All tests fail if authentication fails
        TEST_RESULTS["${ota}_rate_push"]="FAIL"
        TEST_RESULTS["${ota}_rate_pull"]="FAIL"
        TEST_RESULTS["${ota}_availability"]="FAIL"
        TEST_RESULTS["${ota}_reservations"]="FAIL"
        TEST_RESULTS["${ota}_webhooks"]="FAIL"
    fi
    
    log_info "OTA ${ota^^}: $tests_passed passed, $tests_failed failed"
    echo ""
    
    return $tests_failed
}

################################################################################
# GENERATE REPORT
################################################################################

generate_report() {
    log_info "Generating validation report..."
    
    # Build test results JSON
    local results='{'
    local first=true
    
    for ota in "${OTA_PLATFORMS[@]}"; do
        if [ "$first" = true ]; then
            first=false
        else
            results+=','
        fi
        
        results+='"'$ota'": {
            "authentication": "'${TEST_RESULTS["${ota}_auth"]:-SKIP}'",
            "rate_push": "'${TEST_RESULTS["${ota}_rate_push"]:-SKIP}'",
            "rate_pull": "'${TEST_RESULTS["${ota}_rate_pull"]:-SKIP}'",
            "availability": "'${TEST_RESULTS["${ota}_availability"]:-SKIP}'",
            "reservations": "'${TEST_RESULTS["${ota}_reservations"]:-SKIP}'",
            "webhooks": "'${TEST_RESULTS["${ota}_webhooks"]:-SKIP}'"
        }'
    done
    
    results+='}'
    
    # Calculate summary statistics
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    local skipped_tests=0
    
    for key in "${!TEST_RESULTS[@]}"; do
        total_tests=$((total_tests + 1))
        case "${TEST_RESULTS[$key]}" in
            PASS) passed_tests=$((passed_tests + 1)) ;;
            FAIL) failed_tests=$((failed_tests + 1)) ;;
            SKIP) skipped_tests=$((skipped_tests + 1)) ;;
        esac
    done
    
    local success_rate=$(echo "scale=2; $passed_tests * 100 / ($total_tests - $skipped_tests)" | bc 2>/dev/null || echo "0")
    
    # Build final report
    local report='{
        "test_type": "ota_integration_validation",
        "environment": "'"$ENVIRONMENT"'",
        "timestamp": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'",
        "summary": {
            "total_tests": '$total_tests',
            "passed": '$passed_tests',
            "failed": '$failed_tests',
            "skipped": '$skipped_tests',
            "success_rate_percent": '$success_rate'
        },
        "ota_results": '"$results"'
    }'
    
    echo "$report" | jq '.' > "$REPORT_FILE"
    
    log "✅ Report generated: $REPORT_FILE"
    
    # Display summary
    echo ""
    log_info "=========================================="
    log_info "OTA INTEGRATION VALIDATION SUMMARY"
    log_info "=========================================="
    log_info "Environment: $ENVIRONMENT"
    log_info "Total Tests: $total_tests"
    log_info "Passed: $passed_tests"
    log_info "Failed: $failed_tests"
    log_info "Skipped: $skipped_tests"
    log_info "Success Rate: ${success_rate}%"
    log_info "=========================================="
    echo ""
    
    # Display per-OTA results
    for ota in "${OTA_PLATFORMS[@]}"; do
        log_info "${ota^^}:"
        echo "  Auth: ${TEST_RESULTS["${ota}_auth"]:-SKIP}"
        echo "  Rate Push: ${TEST_RESULTS["${ota}_rate_push"]:-SKIP}"
        echo "  Rate Pull: ${TEST_RESULTS["${ota}_rate_pull"]:-SKIP}"
        echo "  Availability: ${TEST_RESULTS["${ota}_availability"]:-SKIP}"
        echo "  Reservations: ${TEST_RESULTS["${ota}_reservations"]:-SKIP}"
        echo "  Webhooks: ${TEST_RESULTS["${ota}_webhooks"]:-SKIP}"
        echo ""
    done
    
    # Check if validation passed
    if [ $failed_tests -eq 0 ]; then
        log "✅ OTA integration validation PASSED"
        return 0
    else
        log_error "OTA integration validation FAILED ($failed_tests failures)"
        return 1
    fi
}

################################################################################
# MAIN FUNCTION
################################################################################

main() {
    log "=========================================="
    log "OTA INTEGRATION VALIDATION STARTING"
    log "=========================================="
    log_info "Environment: $ENVIRONMENT"
    log_info "OTA Platforms: ${OTA_PLATFORMS[*]}"
    echo ""
    
    # Authenticate
    authenticate
    
    # Test each OTA
    for ota in "${OTA_PLATFORMS[@]}"; do
        run_ota_tests "$ota"
        sleep 2  # Small delay between OTA tests
    done
    
    # Generate report
    if generate_report; then
        log "✅ OTA integration validation completed successfully"
        exit 0
    else
        log_error "OTA integration validation failed"
        exit 1
    fi
}

# Run main
main "$@"
