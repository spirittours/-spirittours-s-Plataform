#!/bin/bash
# 🧪 Smoke Tests - AI Multi-Model Management System
# Quick validation tests for deployment verification

set -euo pipefail

# 🎨 Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 📊 Configuration
ENVIRONMENT=${1:-production}
TIMEOUT=30
RETRIES=3

# 🌐 URLs
if [ "$ENVIRONMENT" = "production" ]; then
    BASE_URL="https://ai-multimodel.genspark.ai"
    API_URL="https://api.ai-multimodel.genspark.ai"
    WS_URL="wss://api.ai-multimodel.genspark.ai/ws"
else
    BASE_URL="https://staging.ai-multimodel.genspark.ai"
    API_URL="https://staging-api.ai-multimodel.genspark.ai"
    WS_URL="wss://staging-api.ai-multimodel.genspark.ai/ws"
fi

log() { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}"; }
error() { echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $1${NC}"; }
info() { echo -e "${BLUE}[$(date '+%H:%M:%S')] ℹ️  $1${NC}"; }

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    info "Running: $test_name"
    
    if eval "$test_command" >/dev/null 2>&1; then
        log "PASSED: $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        error "FAILED: $test_name"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

main() {
    info "🧪 Starting smoke tests for $ENVIRONMENT environment"
    info "🌐 Base URL: $BASE_URL"
    info "🔗 API URL: $API_URL"
    
    # 🌐 Frontend Tests
    run_test "Frontend accessibility" "curl -f -s --max-time $TIMEOUT '$BASE_URL'"
    run_test "Frontend returns HTML" "curl -s --max-time $TIMEOUT '$BASE_URL' | grep -q '<html'"
    run_test "Frontend has correct title" "curl -s --max-time $TIMEOUT '$BASE_URL' | grep -q 'AI Multi-Model'"
    
    # 🔗 API Tests
    run_test "API health endpoint" "curl -f -s --max-time $TIMEOUT '$API_URL/health'"
    run_test "API returns JSON health" "curl -s --max-time $TIMEOUT '$API_URL/health' | jq -e '.status == \"ok\"'"
    run_test "API v1 endpoint accessible" "curl -f -s --max-time $TIMEOUT '$API_URL/api/v1/health'"
    run_test "API models endpoint" "curl -f -s --max-time $TIMEOUT '$API_URL/api/v1/models'"
    run_test "API returns models list" "curl -s --max-time $TIMEOUT '$API_URL/api/v1/models' | jq -e '.models | length > 0'"
    
    # 📊 Monitoring Tests
    run_test "Metrics endpoint accessible" "curl -f -s --max-time $TIMEOUT '$API_URL/metrics'"
    run_test "Prometheus metrics format" "curl -s --max-time $TIMEOUT '$API_URL/metrics' | grep -q 'http_requests_total'"
    
    # 🔐 Security Tests
    run_test "Security headers present" "curl -I -s --max-time $TIMEOUT '$BASE_URL' | grep -q 'X-Frame-Options'"
    run_test "HTTPS redirect" "curl -I -s --max-time $TIMEOUT 'http://ai-multimodel.genspark.ai' | grep -q '301\\|302'"
    
    # 🧠 AI Model Tests (basic)
    if command -v jq >/dev/null 2>&1; then
        run_test "GPT-4 model available" "curl -s --max-time $TIMEOUT '$API_URL/api/v1/models' | jq -e '.models[] | select(.name | contains(\"GPT-4\"))'"
        run_test "Claude model available" "curl -s --max-time $TIMEOUT '$API_URL/api/v1/models' | jq -e '.models[] | select(.name | contains(\"Claude\"))'"
        run_test "At least 10 models available" "curl -s --max-time $TIMEOUT '$API_URL/api/v1/models' | jq -e '.models | length >= 10'"
    fi
    
    # 📊 Performance Tests
    run_test "API response time < 2s" "timeout 2 curl -f -s '$API_URL/health'"
    run_test "Frontend response time < 3s" "timeout 3 curl -f -s '$BASE_URL'"
    
    # 🔄 WebSocket Test (if wscat is available)
    if command -v wscat >/dev/null 2>&1; then
        run_test "WebSocket connection" "timeout 10 wscat -c '$WS_URL' --close"
    else
        warn "wscat not available, skipping WebSocket test"
    fi
    
    # 📈 Analytics Test
    run_test "Analytics endpoint" "curl -f -s --max-time $TIMEOUT '$API_URL/api/v1/analytics/status'"
    
    # 🗄️ Database Connection Test
    run_test "Database connectivity" "curl -s --max-time $TIMEOUT '$API_URL/api/v1/health' | jq -e '.database == \"connected\"'"
    
    # 📦 Cache Test  
    run_test "Redis connectivity" "curl -s --max-time $TIMEOUT '$API_URL/api/v1/health' | jq -e '.cache == \"connected\"'"
    
    # 🎯 Load Balancer Test
    run_test "Load balancer status" "curl -s --max-time $TIMEOUT '$API_URL/api/v1/load-balancer/status' | jq -e '.status == \"active\"'"
    
    # Results summary
    echo
    info "🎯 Smoke Tests Summary for $ENVIRONMENT"
    log "✅ Passed: $PASSED_TESTS/$TOTAL_TESTS"
    
    if [ $FAILED_TESTS -gt 0 ]; then
        error "❌ Failed: $FAILED_TESTS/$TOTAL_TESTS"
        echo
        error "🚨 Some smoke tests failed! Please investigate before proceeding."
        exit 1
    else
        echo
        log "🎉 All smoke tests passed! Deployment verification successful."
        exit 0
    fi
}

# Check dependencies
if ! command -v curl >/dev/null 2>&1; then
    error "curl is required for smoke tests"
    exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
    warn "jq not found - some JSON validation tests will be skipped"
fi

# Run tests
main "$@"