#!/bin/bash

################################################################################
# USER LOAD TESTING SCRIPT
################################################################################
# Purpose: Test system with 100,000 concurrent users
# Author: AI Developer
# Date: 2025-10-18
# Version: 1.0.0
#
# Usage: ./scripts/load-test-users.sh [environment]
#
# Features:
# - Simulate 100,000 concurrent users
# - Test API endpoints under load
# - Monitor response times and error rates
# - Generate performance report
#
# Requirements:
# - Apache Bench (ab) or wrk
# - curl
# - jq
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
TOTAL_USERS=100000
CONCURRENT_USERS=1000
RAMP_UP_TIME=300  # 5 minutes
TEST_DURATION=1800  # 30 minutes
REPORT_FILE="load_test_users_$(date +%Y%m%d_%H%M%S).json"

# Endpoints to test
declare -A ENDPOINTS=(
    ["/health"]="GET"
    ["/api/v1/health"]="GET"
    ["/api/v1/campaigns"]="GET"
    ["/api/v1/contacts"]="GET"
    ["/api/v1/analytics/overview"]="GET"
)

# Metrics
START_TIME=$(date +%s)
RESULTS_DIR="/tmp/load_test_results_$$"

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

################################################################################
# PREREQUISITE CHECKS
################################################################################

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check for load testing tools
    if ! command -v wrk &> /dev/null && ! command -v ab &> /dev/null; then
        log_error "Neither 'wrk' nor 'ab' (Apache Bench) found"
        log_error "Install with: sudo apt-get install wrk apache2-utils"
        exit 1
    fi
    
    # Check for curl and jq
    if ! command -v curl &> /dev/null || ! command -v jq &> /dev/null; then
        log_error "curl or jq not found"
        log_error "Install with: sudo apt-get install curl jq"
        exit 1
    fi
    
    # Create results directory
    mkdir -p "$RESULTS_DIR"
    
    log "✅ Prerequisites checked"
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
# BASELINE METRICS
################################################################################

capture_baseline_metrics() {
    log_info "Capturing baseline metrics..."
    
    # CPU and Memory before test
    local baseline='{
        "timestamp": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'",
        "cpu_usage": "'"$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)"'%",
        "memory_usage": "'"$(free -m | awk 'NR==2{printf "%.2f%%", $3*100/$2}')"'",
        "disk_usage": "'"$(df -h / | awk 'NR==2{print $5}')"'",
        "network_connections": '$(netstat -an | grep ESTABLISHED | wc -l)',
        "load_average": "'"$(uptime | awk -F'load average:' '{print $2}')"'"
    }'
    
    echo "$baseline" > "${RESULTS_DIR}/baseline_metrics.json"
    
    log "✅ Baseline metrics captured"
}

################################################################################
# LOAD TESTING WITH WRK
################################################################################

run_wrk_test() {
    local endpoint=$1
    local method=$2
    local output_file=$3
    
    log_info "Testing endpoint: $method $endpoint"
    
    local url="${API_URL}${endpoint}"
    local threads=10
    local connections=$CONCURRENT_USERS
    local duration="${TEST_DURATION}s"
    
    # Create Lua script for authentication
    local lua_script="${RESULTS_DIR}/auth_script.lua"
    cat > "$lua_script" << EOF
wrk.method = "$method"
wrk.headers["Authorization"] = "Bearer $TOKEN"
wrk.headers["Content-Type"] = "application/json"
EOF
    
    # Run wrk test
    wrk -t $threads -c $connections -d $duration \
        --latency --timeout 30s \
        -s "$lua_script" \
        "$url" > "$output_file" 2>&1
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log "✅ Test completed: $method $endpoint"
    else
        log_error "Test failed: $method $endpoint"
    fi
    
    return $exit_code
}

################################################################################
# LOAD TESTING WITH APACHE BENCH
################################################################################

run_ab_test() {
    local endpoint=$1
    local method=$2
    local output_file=$3
    
    log_info "Testing endpoint: $method $endpoint"
    
    local url="${API_URL}${endpoint}"
    local requests=$TOTAL_USERS
    local concurrency=$CONCURRENT_USERS
    
    # Run Apache Bench test
    ab -n $requests -c $concurrency \
        -t $TEST_DURATION \
        -g "${output_file}.tsv" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        "$url" > "$output_file" 2>&1
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log "✅ Test completed: $method $endpoint"
    else
        log_error "Test failed: $method $endpoint"
    fi
    
    return $exit_code
}

################################################################################
# RUN TESTS
################################################################################

run_load_tests() {
    log_info "Starting load tests..."
    
    local test_tool=""
    if command -v wrk &> /dev/null; then
        test_tool="wrk"
    elif command -v ab &> /dev/null; then
        test_tool="ab"
    fi
    
    log_info "Using load testing tool: $test_tool"
    
    local endpoint_num=0
    for endpoint in "${!ENDPOINTS[@]}"; do
        endpoint_num=$((endpoint_num + 1))
        local method="${ENDPOINTS[$endpoint]}"
        local output_file="${RESULTS_DIR}/test_${endpoint_num}_$(echo $endpoint | tr '/' '_').txt"
        
        if [ "$test_tool" = "wrk" ]; then
            run_wrk_test "$endpoint" "$method" "$output_file"
        elif [ "$test_tool" = "ab" ]; then
            run_ab_test "$endpoint" "$method" "$output_file"
        fi
        
        # Wait between tests
        sleep 5
    done
    
    log "✅ All load tests completed"
}

################################################################################
# PARSE WRK RESULTS
################################################################################

parse_wrk_results() {
    local result_file=$1
    
    local requests_per_sec=$(grep "Requests/sec:" "$result_file" | awk '{print $2}')
    local avg_latency=$(grep "Latency" "$result_file" | head -1 | awk '{print $2}')
    local total_requests=$(grep "requests in" "$result_file" | awk '{print $1}')
    local total_errors=$(grep "Non-2xx" "$result_file" | awk '{print $4}' || echo "0")
    
    local result='{
        "requests_per_second": '"${requests_per_sec:-0}"',
        "average_latency": "'"${avg_latency:-unknown}"'",
        "total_requests": '"${total_requests:-0}"',
        "total_errors": '"${total_errors:-0}"'
    }'
    
    echo "$result"
}

################################################################################
# PARSE APACHE BENCH RESULTS
################################################################################

parse_ab_results() {
    local result_file=$1
    
    local requests_per_sec=$(grep "Requests per second:" "$result_file" | awk '{print $4}')
    local avg_latency=$(grep "Time per request:" "$result_file" | head -1 | awk '{print $4}')
    local total_requests=$(grep "Complete requests:" "$result_file" | awk '{print $3}')
    local total_errors=$(grep "Failed requests:" "$result_file" | awk '{print $3}' || echo "0")
    
    local result='{
        "requests_per_second": '"${requests_per_sec:-0}"',
        "average_latency": "'"${avg_latency:-unknown}"'",
        "total_requests": '"${total_requests:-0}"',
        "total_errors": '"${total_errors:-0}"'
    }'
    
    echo "$result"
}

################################################################################
# GENERATE REPORT
################################################################################

generate_report() {
    log_info "Generating performance report..."
    
    local end_time=$(date +%s)
    local total_time=$((end_time - START_TIME))
    
    # Determine which tool was used
    local test_tool=""
    if command -v wrk &> /dev/null; then
        test_tool="wrk"
    elif command -v ab &> /dev/null; then
        test_tool="ab"
    fi
    
    # Parse results for each endpoint
    local endpoint_results='['
    local endpoint_num=0
    for endpoint in "${!ENDPOINTS[@]}"; do
        endpoint_num=$((endpoint_num + 1))
        local method="${ENDPOINTS[$endpoint]}"
        local result_file="${RESULTS_DIR}/test_${endpoint_num}_$(echo $endpoint | tr '/' '_').txt"
        
        if [ -f "$result_file" ]; then
            local parsed_results=""
            if [ "$test_tool" = "wrk" ]; then
                parsed_results=$(parse_wrk_results "$result_file")
            elif [ "$test_tool" = "ab" ]; then
                parsed_results=$(parse_ab_results "$result_file")
            fi
            
            endpoint_results+='{
                "endpoint": "'"$endpoint"'",
                "method": "'"$method"'",
                "results": '"$parsed_results"'
            }'
            
            if [ $endpoint_num -lt ${#ENDPOINTS[@]} ]; then
                endpoint_results+=','
            fi
        fi
    done
    endpoint_results+=']'
    
    # Capture final system metrics
    local final_metrics='{
        "timestamp": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'",
        "cpu_usage": "'"$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)"'%",
        "memory_usage": "'"$(free -m | awk 'NR==2{printf "%.2f%%", $3*100/$2}')"'",
        "disk_usage": "'"$(df -h / | awk 'NR==2{print $5}')"'",
        "network_connections": '$(netstat -an | grep ESTABLISHED | wc -l)',
        "load_average": "'"$(uptime | awk -F'load average:' '{print $2}')"'"
    }'
    
    # Build final report
    local baseline_metrics=$(cat "${RESULTS_DIR}/baseline_metrics.json")
    
    local report='{
        "test_type": "user_load_test",
        "environment": "'"$ENVIRONMENT"'",
        "timestamp": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'",
        "configuration": {
            "total_users": '$TOTAL_USERS',
            "concurrent_users": '$CONCURRENT_USERS',
            "ramp_up_time_seconds": '$RAMP_UP_TIME',
            "test_duration_seconds": '$TEST_DURATION',
            "tool_used": "'"$test_tool"'"
        },
        "system_metrics": {
            "baseline": '"$baseline_metrics"',
            "final": '"$final_metrics"'
        },
        "endpoint_results": '"$endpoint_results"',
        "total_test_time_seconds": '$total_time'
    }'
    
    echo "$report" | jq '.' > "$REPORT_FILE"
    
    log "✅ Report generated: $REPORT_FILE"
    
    # Display summary
    echo ""
    log_info "=========================================="
    log_info "USER LOAD TEST SUMMARY"
    log_info "=========================================="
    log_info "Environment: $ENVIRONMENT"
    log_info "Total Users: $TOTAL_USERS"
    log_info "Concurrent Users: $CONCURRENT_USERS"
    log_info "Test Duration: ${TEST_DURATION}s ($(($TEST_DURATION / 60))m)"
    log_info "Total Time: ${total_time}s"
    log_info "Tool Used: $test_tool"
    echo ""
    echo "$endpoint_results" | jq -r '.[] | "Endpoint: \(.method) \(.endpoint)\n  Requests/sec: \(.results.requests_per_second)\n  Avg Latency: \(.results.average_latency)\n  Total Requests: \(.results.total_requests)\n  Total Errors: \(.results.total_errors)\n"'
    log_info "=========================================="
    
    log "✅ User load test completed"
}

################################################################################
# CLEANUP
################################################################################

cleanup() {
    log_info "Cleaning up..."
    
    # Keep results directory for analysis
    log_info "Results saved in: $RESULTS_DIR"
    
    log "✅ Cleanup completed"
}

################################################################################
# MAIN FUNCTION
################################################################################

main() {
    log "=========================================="
    log "USER LOAD TEST STARTING"
    log "=========================================="
    log_info "Environment: $ENVIRONMENT"
    log_info "Target: $TOTAL_USERS users"
    log_info "Concurrent: $CONCURRENT_USERS users"
    log_info "Duration: ${TEST_DURATION}s"
    echo ""
    
    # Run tests
    check_prerequisites
    authenticate
    capture_baseline_metrics
    run_load_tests
    generate_report
    
    log "✅ User load test completed successfully"
}

# Trap for cleanup
trap cleanup EXIT

# Run main
main "$@"
