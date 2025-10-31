#!/bin/bash

################################################################################
# EMAIL LOAD TESTING SCRIPT
################################################################################
# Purpose: Test email system with 10,000 emails
# Author: AI Developer
# Date: 2025-10-18
# Version: 1.0.0
#
# Usage: ./scripts/load-test-emails.sh [environment]
#
# Features:
# - Send 10,000 test emails
# - Monitor sending rates
# - Track deliverability
# - Generate performance report
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
TOTAL_EMAILS=10000
BATCH_SIZE=100
CONCURRENT_BATCHES=10
TEST_DURATION=3600  # 1 hour max
REPORT_FILE="load_test_emails_$(date +%Y%m%d_%H%M%S).json"

# Metrics
SENT_COUNT=0
FAILED_COUNT=0
START_TIME=$(date +%s)

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
# CAMPAIGN CREATION
################################################################################

create_test_campaign() {
    log_info "Creating test campaign..."
    
    local response=$(curl -s -X POST "${API_URL}/api/v1/campaigns" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "name": "Load Test Campaign - '"$(date +%Y%m%d_%H%M%S)"'",
            "subject": "Load Test Email",
            "from_email": "loadtest@yourdomain.com",
            "from_name": "Load Test",
            "html_content": "<html><body><h1>This is a load test email</h1><p>Email #{{email_number}}</p></body></html>",
            "text_content": "This is a load test email. Email #{{email_number}}",
            "status": "draft"
        }')
    
    CAMPAIGN_ID=$(echo "$response" | jq -r '.id')
    
    if [ "$CAMPAIGN_ID" = "null" ] || [ -z "$CAMPAIGN_ID" ]; then
        log_error "Failed to create campaign"
        exit 1
    fi
    
    log "✅ Campaign created: $CAMPAIGN_ID"
}

################################################################################
# CONTACT LIST CREATION
################################################################################

create_test_contacts() {
    log_info "Creating test contacts..."
    
    local contact_list_response=$(curl -s -X POST "${API_URL}/api/v1/contact-lists" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "name": "Load Test Contacts - '"$(date +%Y%m%d_%H%M%S)"'",
            "description": "Contacts for load testing"
        }')
    
    CONTACT_LIST_ID=$(echo "$contact_list_response" | jq -r '.id')
    
    if [ "$CONTACT_LIST_ID" = "null" ] || [ -z "$CONTACT_LIST_ID" ]; then
        log_error "Failed to create contact list"
        exit 1
    fi
    
    log "✅ Contact list created: $CONTACT_LIST_ID"
    
    # Create contacts in batches
    local contacts_created=0
    local batch_number=0
    
    while [ $contacts_created -lt $TOTAL_EMAILS ]; do
        batch_number=$((batch_number + 1))
        local batch_contacts='['
        
        for i in $(seq 1 $BATCH_SIZE); do
            if [ $contacts_created -ge $TOTAL_EMAILS ]; then
                break
            fi
            
            contacts_created=$((contacts_created + 1))
            
            batch_contacts+='{
                "email": "loadtest'$contacts_created'@example.com",
                "first_name": "Test",
                "last_name": "User'$contacts_created'",
                "custom_fields": {
                    "email_number": '$contacts_created'
                }
            }'
            
            if [ $contacts_created -lt $TOTAL_EMAILS ] && [ $i -lt $BATCH_SIZE ]; then
                batch_contacts+=','
            fi
        done
        
        batch_contacts+=']'
        
        curl -s -X POST "${API_URL}/api/v1/contact-lists/${CONTACT_LIST_ID}/contacts/bulk" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "$batch_contacts" > /dev/null
        
        log_info "Created batch $batch_number ($contacts_created/$TOTAL_EMAILS contacts)"
    done
    
    log "✅ Created $TOTAL_EMAILS test contacts"
}

################################################################################
# EMAIL SENDING
################################################################################

send_emails() {
    log_info "Sending emails..."
    
    # Start campaign
    curl -s -X POST "${API_URL}/api/v1/campaigns/${CAMPAIGN_ID}/start" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{\"contact_list_id\": $CONTACT_LIST_ID}" > /dev/null
    
    log "✅ Campaign started"
    
    # Monitor progress
    local previous_sent=0
    local stall_count=0
    local max_stalls=10
    
    while true; do
        sleep 10
        
        local stats=$(curl -s -X GET "${API_URL}/api/v1/campaigns/${CAMPAIGN_ID}/stats" \
            -H "Authorization: Bearer $TOKEN")
        
        SENT_COUNT=$(echo "$stats" | jq -r '.sent_count // 0')
        FAILED_COUNT=$(echo "$stats" | jq -r '.failed_count // 0')
        local pending_count=$(echo "$stats" | jq -r '.pending_count // 0')
        
        local current_time=$(date +%s)
        local elapsed_time=$((current_time - START_TIME))
        local send_rate=$((SENT_COUNT * 60 / elapsed_time))
        
        log_info "Progress: $SENT_COUNT sent, $FAILED_COUNT failed, $pending_count pending | Rate: ${send_rate}/min"
        
        # Check if finished
        if [ $SENT_COUNT -ge $TOTAL_EMAILS ] || [ $elapsed_time -ge $TEST_DURATION ]; then
            break
        fi
        
        # Check for stalls
        if [ $SENT_COUNT -eq $previous_sent ]; then
            stall_count=$((stall_count + 1))
            if [ $stall_count -ge $max_stalls ]; then
                log_error "Email sending appears to have stalled"
                break
            fi
        else
            stall_count=0
        fi
        
        previous_sent=$SENT_COUNT
    done
    
    log "✅ Email sending completed"
}

################################################################################
# ANALYTICS AND REPORTING
################################################################################

generate_report() {
    log_info "Generating performance report..."
    
    local end_time=$(date +%s)
    local total_time=$((end_time - START_TIME))
    local avg_rate=$((SENT_COUNT * 60 / total_time))
    local success_rate=$(echo "scale=2; $SENT_COUNT * 100 / $TOTAL_EMAILS" | bc)
    
    # Get detailed stats
    local stats=$(curl -s -X GET "${API_URL}/api/v1/campaigns/${CAMPAIGN_ID}/stats" \
        -H "Authorization: Bearer $TOKEN")
    
    local report='{
        "test_type": "email_load_test",
        "environment": "'"$ENVIRONMENT"'",
        "timestamp": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'",
        "configuration": {
            "total_emails": '$TOTAL_EMAILS',
            "batch_size": '$BATCH_SIZE',
            "concurrent_batches": '$CONCURRENT_BATCHES'
        },
        "results": {
            "total_time_seconds": '$total_time',
            "emails_sent": '$SENT_COUNT',
            "emails_failed": '$FAILED_COUNT',
            "success_rate_percent": '$success_rate',
            "average_rate_per_minute": '$avg_rate',
            "campaign_stats": '"$stats"'
        },
        "system_resources": {
            "cpu_usage": "'"$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)"'%",
            "memory_usage": "'"$(free -m | awk 'NR==2{printf "%.2f%%", $3*100/$2}')"'",
            "disk_usage": "'"$(df -h / | awk 'NR==2{print $5}')"'"
        }
    }'
    
    echo "$report" | jq '.' > "$REPORT_FILE"
    
    log "✅ Report generated: $REPORT_FILE"
    
    # Display summary
    echo ""
    log_info "=========================================="
    log_info "EMAIL LOAD TEST SUMMARY"
    log_info "=========================================="
    log_info "Environment: $ENVIRONMENT"
    log_info "Total Emails: $TOTAL_EMAILS"
    log_info "Emails Sent: $SENT_COUNT"
    log_info "Emails Failed: $FAILED_COUNT"
    log_info "Success Rate: ${success_rate}%"
    log_info "Total Time: ${total_time}s ($(($total_time / 60))m)"
    log_info "Average Rate: ${avg_rate} emails/minute"
    log_info "=========================================="
    
    # Check if test passed
    if (( $(echo "$success_rate >= 95" | bc -l) )); then
        log "✅ Load test PASSED (success rate >= 95%)"
        return 0
    else
        log_error "Load test FAILED (success rate < 95%)"
        return 1
    fi
}

################################################################################
# CLEANUP
################################################################################

cleanup() {
    log_info "Cleaning up test data..."
    
    # Delete test contacts
    if [ -n "${CONTACT_LIST_ID:-}" ]; then
        curl -s -X DELETE "${API_URL}/api/v1/contact-lists/${CONTACT_LIST_ID}" \
            -H "Authorization: Bearer $TOKEN" > /dev/null
    fi
    
    log "✅ Cleanup completed"
}

################################################################################
# MAIN FUNCTION
################################################################################

main() {
    log "=========================================="
    log "EMAIL LOAD TEST STARTING"
    log "=========================================="
    log_info "Environment: $ENVIRONMENT"
    log_info "Target: $TOTAL_EMAILS emails"
    log_info "Batch size: $BATCH_SIZE"
    log ""
    
    # Run tests
    authenticate
    create_test_campaign
    create_test_contacts
    send_emails
    
    # Generate report
    if generate_report; then
        log "✅ Email load test completed successfully"
        exit_code=0
    else
        log_error "Email load test failed"
        exit_code=1
    fi
    
    # Cleanup (optional, comment out to keep data for analysis)
    # cleanup
    
    exit $exit_code
}

# Run main
main "$@"
