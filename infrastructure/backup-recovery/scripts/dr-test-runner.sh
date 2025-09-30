#!/bin/bash

# =============================================================================
# AI Multi-Model Platform - Disaster Recovery Test Runner
# Automated DR testing and validation system
# =============================================================================

set -euo pipefail

# Configuration
DR_TEST_CONFIG_FILE="${DR_TEST_CONFIG_FILE:-/etc/ai-platform/dr-test.conf}"
LOG_FILE="${LOG_FILE:-/var/log/ai-platform/dr-test.log}"
TEST_WORKSPACE="${TEST_WORKSPACE:-/tmp/dr-test}"
DR_SCRIPT="${DR_SCRIPT:-/opt/ai-platform/scripts/disaster-recovery.sh}"
BACKUP_SCRIPT="${BACKUP_SCRIPT:-/opt/ai-platform/scripts/automated-backup.sh}"
NOTIFICATION_WEBHOOK="${NOTIFICATION_WEBHOOK:-}"

# Test configuration defaults
DEFAULT_TEST_ENVIRONMENT="staging"
DEFAULT_TEST_FREQUENCY="monthly"
DEFAULT_TEST_COMPONENTS="database,application"
DEFAULT_TEST_TIMEOUT=7200  # 2 hours
DEFAULT_CLEANUP_DELAY=3600 # 1 hour

# Test result tracking
TEST_ID="dr-test-$(date +%Y%m%d-%H%M%S)-$(hostname -s)"
TEST_START_TIME=""
TEST_STATUS="running"
FAILED_TESTS=()
PASSED_TESTS=()

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_FILE}"
}

# Error handling
handle_error() {
    local exit_code=$1
    local line_number=$2
    log "ERROR" "DR test failed with exit code ${exit_code} at line ${line_number}"
    TEST_STATUS="failed"
    send_notification "DR_TEST_FAILED" "DR test failed with exit code ${exit_code} at line ${line_number}" "CRITICAL"
    cleanup_test_environment
    generate_test_report
    exit "${exit_code}"
}

trap 'handle_error $? $LINENO' ERR

# Notification function
send_notification() {
    local event="$1"
    local message="$2"
    local severity="${3:-INFO}"
    
    if [[ -n "${NOTIFICATION_WEBHOOK}" ]]; then
        curl -s -X POST "${NOTIFICATION_WEBHOOK}" \
            -H "Content-Type: application/json" \
            -d "{
                \"event\": \"${event}\",
                \"message\": \"${message}\",
                \"severity\": \"${severity}\",
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                \"hostname\": \"$(hostname)\",
                \"test_id\": \"${TEST_ID}\"
            }" || log "WARN" "Failed to send notification"
    fi
}

# Load configuration
load_config() {
    if [[ -f "${DR_TEST_CONFIG_FILE}" ]]; then
        source "${DR_TEST_CONFIG_FILE}"
        log "INFO" "DR test configuration loaded from ${DR_TEST_CONFIG_FILE}"
    else
        log "WARN" "DR test configuration file not found, using defaults"
        TEST_ENVIRONMENT="${DEFAULT_TEST_ENVIRONMENT}"
        TEST_FREQUENCY="${DEFAULT_TEST_FREQUENCY}"
        TEST_COMPONENTS="${DEFAULT_TEST_COMPONENTS}"
        TEST_TIMEOUT="${DEFAULT_TEST_TIMEOUT}"
        CLEANUP_DELAY="${DEFAULT_CLEANUP_DELAY}"
    fi
}

# Setup test environment
setup_test_environment() {
    log "INFO" "Setting up DR test environment: $TEST_WORKSPACE"
    
    # Clean existing workspace
    if [[ -d "$TEST_WORKSPACE" ]]; then
        rm -rf "$TEST_WORKSPACE"
    fi
    
    mkdir -p "$TEST_WORKSPACE"/{backups,restore,logs,reports,scripts}
    
    # Create test configuration
    cat > "$TEST_WORKSPACE/test-config.json" << EOF
{
    "test_id": "${TEST_ID}",
    "test_environment": "${TEST_ENVIRONMENT}",
    "test_components": "${TEST_COMPONENTS}",
    "test_timeout": ${TEST_TIMEOUT},
    "test_workspace": "${TEST_WORKSPACE}",
    "start_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    
    log "INFO" "Test environment setup completed"
}

# Cleanup test environment
cleanup_test_environment() {
    if [[ "${CLEANUP_ENABLED:-true}" == "true" && -d "$TEST_WORKSPACE" ]]; then
        log "INFO" "Cleaning up test environment in ${CLEANUP_DELAY} seconds..."
        sleep "${CLEANUP_DELAY}"
        rm -rf "$TEST_WORKSPACE"
        log "INFO" "Test environment cleanup completed"
    else
        log "INFO" "Test environment preserved at: $TEST_WORKSPACE"
    fi
}

# Create test backup
create_test_backup() {
    log "INFO" "Creating test backup for DR testing..."
    
    local backup_file="$TEST_WORKSPACE/backups/dr-test-backup.tar.gz"
    
    # Use the automated backup script to create a test backup
    export BACKUP_BASE_DIR="$TEST_WORKSPACE/backups"
    export BACKUP_ID="dr-test-$(date +%Y%m%d-%H%M%S)"
    export DRY_RUN=false
    
    if "$BACKUP_SCRIPT" 2>&1 | tee "$TEST_WORKSPACE/logs/backup-creation.log"; then
        log "INFO" "Test backup created successfully"
        
        # Find the created backup file
        local created_backup
        created_backup=$(find "$TEST_WORKSPACE/backups" -name "*.tar.gz*" -type f | head -1)
        
        if [[ -n "$created_backup" ]]; then
            echo "$created_backup" > "$TEST_WORKSPACE/backup-file.txt"
            log "INFO" "Test backup file: $(basename "$created_backup")"
            return 0
        else
            log "ERROR" "Could not find created backup file"
            return 1
        fi
    else
        log "ERROR" "Failed to create test backup"
        return 1
    fi
}

# Test database recovery
test_database_recovery() {
    log "INFO" "Testing database recovery..."
    
    local test_name="database_recovery"
    local backup_file
    backup_file=$(cat "$TEST_WORKSPACE/backup-file.txt" 2>/dev/null || echo "")
    
    if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
        log "ERROR" "No backup file available for database recovery test"
        FAILED_TESTS+=("$test_name")
        return 1
    fi
    
    # Create test database environment
    local test_db_name="dr_test_$(date +%Y%m%d_%H%M%S)"
    local original_db_name="${TEST_DATABASE_NAME:-ai_platform}"
    
    log "INFO" "Creating test database: $test_db_name"
    
    # Create test database
    if ! psql -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}" -c "CREATE DATABASE $test_db_name;" 2>/dev/null; then
        log "ERROR" "Failed to create test database"
        FAILED_TESTS+=("$test_name")
        return 1
    fi
    
    # Test recovery to test database
    export RECOVERY_WORKSPACE="$TEST_WORKSPACE/restore/database"
    export DB_RECOVERY_TARGET="$test_db_name"
    export DRY_RUN=false
    
    if timeout "${TEST_TIMEOUT}" "$DR_SCRIPT" database "$backup_file" --force 2>&1 | tee "$TEST_WORKSPACE/logs/database-recovery.log"; then
        log "INFO" "Database recovery test completed"
        
        # Validate recovered database
        if validate_database_recovery "$test_db_name"; then
            log "INFO" "Database recovery validation passed"
            PASSED_TESTS+=("$test_name")
        else
            log "ERROR" "Database recovery validation failed"
            FAILED_TESTS+=("$test_name")
        fi
    else
        log "ERROR" "Database recovery test failed"
        FAILED_TESTS+=("$test_name")
    fi
    
    # Cleanup test database
    psql -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}" -c "DROP DATABASE IF EXISTS $test_db_name;" 2>/dev/null || true
    
    return 0
}

# Validate database recovery
validate_database_recovery() {
    local test_db="$1"
    
    log "INFO" "Validating database recovery: $test_db"
    
    # Check database connectivity
    if ! psql -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}" -d "$test_db" -c "SELECT 1;" >/dev/null 2>&1; then
        log "ERROR" "Cannot connect to recovered database"
        return 1
    fi
    
    # Check if critical tables exist
    local critical_tables=("users" "organizations" "api_keys" "models")
    for table in "${critical_tables[@]}"; do
        if ! psql -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}" -d "$test_db" \
            -c "SELECT 1 FROM information_schema.tables WHERE table_name = '$table';" | grep -q 1; then
            log "WARN" "Critical table not found: $table"
        else
            log "INFO" "Critical table found: $table"
        fi
    done
    
    # Run custom validation queries if available
    local validation_file="${DR_VALIDATION_QUERIES_FILE:-/etc/ai-platform/dr-validation.sql}"
    if [[ -f "$validation_file" ]]; then
        log "INFO" "Running custom validation queries"
        if psql -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}" -d "$test_db" -f "$validation_file" \
            > "$TEST_WORKSPACE/logs/database-validation.log" 2>&1; then
            log "INFO" "Custom validation queries passed"
        else
            log "WARN" "Some custom validation queries failed"
        fi
    fi
    
    return 0
}

# Test application recovery
test_application_recovery() {
    log "INFO" "Testing application recovery..."
    
    local test_name="application_recovery"
    local backup_file
    backup_file=$(cat "$TEST_WORKSPACE/backup-file.txt" 2>/dev/null || echo "")
    
    if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
        log "ERROR" "No backup file available for application recovery test"
        FAILED_TESTS+=("$test_name")
        return 1
    fi
    
    # Create test application directory
    local test_app_dir="$TEST_WORKSPACE/restore/application"
    mkdir -p "$test_app_dir"
    
    # Test recovery to test directory
    export RECOVERY_WORKSPACE="$TEST_WORKSPACE/restore/application"
    export APP_RECOVERY_ROOT="$test_app_dir/ai-platform"
    export DRY_RUN=false
    
    if timeout "${TEST_TIMEOUT}" "$DR_SCRIPT" application "$backup_file" --force 2>&1 | tee "$TEST_WORKSPACE/logs/application-recovery.log"; then
        log "INFO" "Application recovery test completed"
        
        # Validate recovered application
        if validate_application_recovery "$test_app_dir"; then
            log "INFO" "Application recovery validation passed"
            PASSED_TESTS+=("$test_name")
        else
            log "ERROR" "Application recovery validation failed"
            FAILED_TESTS+=("$test_name")
        fi
    else
        log "ERROR" "Application recovery test failed"
        FAILED_TESTS+=("$test_name")
    fi
    
    return 0
}

# Validate application recovery
validate_application_recovery() {
    local test_app_dir="$1"
    
    log "INFO" "Validating application recovery: $test_app_dir"
    
    # Check if application directory exists
    if [[ ! -d "$test_app_dir/ai-platform" ]]; then
        log "ERROR" "Application directory not found after recovery"
        return 1
    fi
    
    # Check critical application files
    local critical_files=(
        "package.json"
        "requirements.txt"
        "backend/app.py"
        "frontend/src/App.tsx"
    )
    
    for file in "${critical_files[@]}"; do
        if [[ -f "$test_app_dir/ai-platform/$file" ]]; then
            log "INFO" "Critical file found: $file"
        else
            log "WARN" "Critical file missing: $file"
        fi
    done
    
    # Check file permissions
    if [[ -r "$test_app_dir/ai-platform" && -x "$test_app_dir/ai-platform" ]]; then
        log "INFO" "Application directory permissions are correct"
    else
        log "WARN" "Application directory permissions may be incorrect"
    fi
    
    return 0
}

# Test configuration recovery
test_configuration_recovery() {
    log "INFO" "Testing configuration recovery..."
    
    local test_name="configuration_recovery"
    local backup_file
    backup_file=$(cat "$TEST_WORKSPACE/backup-file.txt" 2>/dev/null || echo "")
    
    if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
        log "ERROR" "No backup file available for configuration recovery test"
        FAILED_TESTS+=("$test_name")
        return 1
    fi
    
    # Create test configuration directory
    local test_config_dir="$TEST_WORKSPACE/restore/configuration"
    mkdir -p "$test_config_dir"
    
    # Test recovery to test directory
    export RECOVERY_WORKSPACE="$TEST_WORKSPACE/restore/configuration"
    export CONFIG_RECOVERY_ROOT="$test_config_dir"
    export DRY_RUN=false
    
    if timeout "${TEST_TIMEOUT}" "$DR_SCRIPT" configuration "$backup_file" --force 2>&1 | tee "$TEST_WORKSPACE/logs/configuration-recovery.log"; then
        log "INFO" "Configuration recovery test completed"
        
        # Validate recovered configuration
        if validate_configuration_recovery "$test_config_dir"; then
            log "INFO" "Configuration recovery validation passed"
            PASSED_TESTS+=("$test_name")
        else
            log "ERROR" "Configuration recovery validation failed"
            FAILED_TESTS+=("$test_name")
        fi
    else
        log "ERROR" "Configuration recovery test failed"
        FAILED_TESTS+=("$test_name")
    fi
    
    return 0
}

# Validate configuration recovery
validate_configuration_recovery() {
    local test_config_dir="$1"
    
    log "INFO" "Validating configuration recovery: $test_config_dir"
    
    # Check for configuration files
    local config_patterns=(
        "*.conf"
        "*.yaml"
        "*.yml"
        "*.json"
        "*.env"
    )
    
    local found_configs=0
    for pattern in "${config_patterns[@]}"; do
        if find "$test_config_dir" -name "$pattern" -type f | head -1 | grep -q .; then
            ((found_configs++))
        fi
    done
    
    if [[ $found_configs -gt 0 ]]; then
        log "INFO" "Configuration files found: $found_configs patterns matched"
        return 0
    else
        log "ERROR" "No configuration files found"
        return 1
    fi
}

# Test full system recovery
test_full_recovery() {
    log "INFO" "Testing full system recovery..."
    
    local test_name="full_recovery"
    local backup_file
    backup_file=$(cat "$TEST_WORKSPACE/backup-file.txt" 2>/dev/null || echo "")
    
    if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
        log "ERROR" "No backup file available for full recovery test"
        FAILED_TESTS+=("$test_name")
        return 1
    fi
    
    # Create isolated test environment
    local test_full_dir="$TEST_WORKSPACE/restore/full"
    mkdir -p "$test_full_dir"
    
    # Test full recovery with dry run to avoid system disruption
    export RECOVERY_WORKSPACE="$TEST_WORKSPACE/restore/full"
    export DRY_RUN=true
    
    if timeout "${TEST_TIMEOUT}" "$DR_SCRIPT" full "$backup_file" --force 2>&1 | tee "$TEST_WORKSPACE/logs/full-recovery.log"; then
        log "INFO" "Full recovery dry-run test completed successfully"
        PASSED_TESTS+=("$test_name")
    else
        log "ERROR" "Full recovery dry-run test failed"
        FAILED_TESTS+=("$test_name")
    fi
    
    return 0
}

# Test backup integrity
test_backup_integrity() {
    log "INFO" "Testing backup integrity..."
    
    local test_name="backup_integrity"
    local backup_file
    backup_file=$(cat "$TEST_WORKSPACE/backup-file.txt" 2>/dev/null || echo "")
    
    if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
        log "ERROR" "No backup file available for integrity test"
        FAILED_TESTS+=("$test_name")
        return 1
    fi
    
    # Test backup file integrity
    if [[ "$backup_file" == *.enc ]]; then
        log "INFO" "Testing encrypted backup integrity"
        if [[ -f "${ENCRYPTION_KEY_FILE:-/etc/ai-platform/backup.key}" ]]; then
            if openssl enc -aes-256-gcm -d -in "$backup_file" \
                -pass file:"${ENCRYPTION_KEY_FILE}" | tar -tz >/dev/null 2>&1; then
                log "INFO" "Encrypted backup integrity test passed"
                PASSED_TESTS+=("$test_name")
            else
                log "ERROR" "Encrypted backup integrity test failed"
                FAILED_TESTS+=("$test_name")
            fi
        else
            log "ERROR" "Encryption key not available for integrity test"
            FAILED_TESTS+=("$test_name")
        fi
    else
        log "INFO" "Testing unencrypted backup integrity"
        if tar -tzf "$backup_file" >/dev/null 2>&1; then
            log "INFO" "Unencrypted backup integrity test passed"
            PASSED_TESTS+=("$test_name")
        else
            log "ERROR" "Unencrypted backup integrity test failed"
            FAILED_TESTS+=("$test_name")
        fi
    fi
    
    return 0
}

# Test recovery performance
test_recovery_performance() {
    log "INFO" "Testing recovery performance..."
    
    local test_name="recovery_performance"
    local backup_file
    backup_file=$(cat "$TEST_WORKSPACE/backup-file.txt" 2>/dev/null || echo "")
    
    if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
        log "ERROR" "No backup file available for performance test"
        FAILED_TESTS+=("$test_name")
        return 1
    fi
    
    # Measure backup extraction time
    local start_time=$(date +%s)
    local extract_dir="$TEST_WORKSPACE/performance/extract"
    mkdir -p "$extract_dir"
    
    if [[ "$backup_file" == *.enc ]]; then
        if [[ -f "${ENCRYPTION_KEY_FILE:-/etc/ai-platform/backup.key}" ]]; then
            openssl enc -aes-256-gcm -d -in "$backup_file" \
                -pass file:"${ENCRYPTION_KEY_FILE}" | tar -xzf - -C "$extract_dir" 2>/dev/null || {
                log "ERROR" "Failed to extract backup for performance test"
                FAILED_TESTS+=("$test_name")
                return 1
            }
        else
            log "ERROR" "Encryption key not available for performance test"
            FAILED_TESTS+=("$test_name")
            return 1
        fi
    else
        tar -xzf "$backup_file" -C "$extract_dir" 2>/dev/null || {
            log "ERROR" "Failed to extract backup for performance test"
            FAILED_TESTS+=("$test_name")
            return 1
        }
    fi
    
    local end_time=$(date +%s)
    local extraction_time=$((end_time - start_time))
    
    # Calculate performance metrics
    local backup_size_mb
    backup_size_mb=$(du -m "$backup_file" | cut -f1)
    local extraction_rate_mbps
    
    if [[ $extraction_time -gt 0 ]]; then
        extraction_rate_mbps=$((backup_size_mb / extraction_time))
    else
        extraction_rate_mbps=$backup_size_mb
    fi
    
    log "INFO" "Performance test results:"
    log "INFO" "  Backup size: ${backup_size_mb}MB"
    log "INFO" "  Extraction time: ${extraction_time}s"
    log "INFO" "  Extraction rate: ${extraction_rate_mbps}MB/s"
    
    # Store performance metrics
    cat > "$TEST_WORKSPACE/performance-metrics.json" << EOF
{
    "backup_size_mb": ${backup_size_mb},
    "extraction_time_seconds": ${extraction_time},
    "extraction_rate_mbps": ${extraction_rate_mbps},
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    
    # Check if performance meets baseline (if available)
    local baseline_file="${DR_PERFORMANCE_BASELINE:-/etc/ai-platform/dr-performance-baseline.json}"
    if [[ -f "$baseline_file" ]]; then
        local baseline_rate
        baseline_rate=$(jq -r '.extraction_rate_mbps' "$baseline_file" 2>/dev/null || echo "0")
        local performance_threshold="${DR_PERFORMANCE_THRESHOLD:-0.8}"  # 80% of baseline
        local min_acceptable_rate
        min_acceptable_rate=$(echo "$baseline_rate * $performance_threshold" | bc -l 2>/dev/null | cut -d. -f1)
        
        if [[ $extraction_rate_mbps -ge $min_acceptable_rate ]]; then
            log "INFO" "Recovery performance test passed (${extraction_rate_mbps}MB/s >= ${min_acceptable_rate}MB/s)"
            PASSED_TESTS+=("$test_name")
        else
            log "WARN" "Recovery performance below baseline (${extraction_rate_mbps}MB/s < ${min_acceptable_rate}MB/s)"
            FAILED_TESTS+=("$test_name")
        fi
    else
        log "INFO" "No performance baseline available, recording current performance"
        PASSED_TESTS+=("$test_name")
    fi
    
    return 0
}

# Run test suite
run_test_suite() {
    local components="${TEST_COMPONENTS:-database,application,configuration}"
    IFS=',' read -ra component_array <<< "$components"
    
    log "INFO" "Running DR test suite for components: $components"
    
    # Always test backup integrity first
    test_backup_integrity
    
    # Test recovery performance
    test_recovery_performance
    
    # Test individual components
    for component in "${component_array[@]}"; do
        component=$(echo "$component" | tr -d ' ')
        case "$component" in
            "database")
                test_database_recovery
                ;;
            "application")
                test_application_recovery
                ;;
            "configuration")
                test_configuration_recovery
                ;;
            "full")
                test_full_recovery
                ;;
            *)
                log "WARN" "Unknown test component: $component"
                ;;
        esac
    done
    
    # Test full recovery if not already tested
    if [[ ! " ${component_array[*]} " =~ " full " ]]; then
        test_full_recovery
    fi
}

# Generate test report
generate_test_report() {
    local report_file="$TEST_WORKSPACE/reports/dr-test-report-${TEST_ID}.json"
    local end_time=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local duration=$(($(date +%s) - $(date -d "$TEST_START_TIME" +%s)))
    
    mkdir -p "$(dirname "$report_file")"
    
    # Create comprehensive test report
    cat > "$report_file" << EOF
{
    "test_summary": {
        "test_id": "${TEST_ID}",
        "start_time": "${TEST_START_TIME}",
        "end_time": "${end_time}",
        "duration_seconds": ${duration},
        "status": "${TEST_STATUS}",
        "environment": "${TEST_ENVIRONMENT}",
        "components_tested": "${TEST_COMPONENTS}"
    },
    "test_results": {
        "total_tests": $((${#PASSED_TESTS[@]} + ${#FAILED_TESTS[@]})),
        "passed_tests": ${#PASSED_TESTS[@]},
        "failed_tests": ${#FAILED_TESTS[@]},
        "success_rate": $(echo "scale=2; ${#PASSED_TESTS[@]} * 100 / ($((${#PASSED_TESTS[@]} + ${#FAILED_TESTS[@]})))" | bc -l 2>/dev/null || echo "0"),
        "passed_test_names": $(printf '%s\n' "${PASSED_TESTS[@]:-}" | jq -R . | jq -s . 2>/dev/null || echo "[]"),
        "failed_test_names": $(printf '%s\n' "${FAILED_TESTS[@]:-}" | jq -R . | jq -s . 2>/dev/null || echo "[]")
    },
    "system_info": {
        "hostname": "$(hostname)",
        "os": "$(uname -s)",
        "kernel": "$(uname -r)",
        "architecture": "$(uname -m)",
        "timestamp": "${end_time}"
    },
    "performance_metrics": $(cat "$TEST_WORKSPACE/performance-metrics.json" 2>/dev/null || echo "{}"),
    "test_workspace": "${TEST_WORKSPACE}",
    "logs_location": "${TEST_WORKSPACE}/logs"
}
EOF
    
    log "INFO" "Test report generated: $report_file"
    
    # Display summary
    echo
    echo "=================================="
    echo "DR Test Suite Results"
    echo "=================================="
    echo "Test ID: $TEST_ID"
    echo "Status: $TEST_STATUS"
    echo "Duration: ${duration}s"
    echo "Total tests: $((${#PASSED_TESTS[@]} + ${#FAILED_TESTS[@]}))"
    echo "Passed: ${#PASSED_TESTS[@]}"
    echo "Failed: ${#FAILED_TESTS[@]}"
    
    if [[ ${#PASSED_TESTS[@]} -gt 0 ]]; then
        echo -e "${GREEN}Passed tests: ${PASSED_TESTS[*]}${NC}"
    fi
    
    if [[ ${#FAILED_TESTS[@]} -gt 0 ]]; then
        echo -e "${RED}Failed tests: ${FAILED_TESTS[*]}${NC}"
    fi
    
    echo "Report: $report_file"
    echo "=================================="
}

# Display usage
usage() {
    cat << EOF
AI Multi-Model Platform - DR Test Runner

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    run                Run complete DR test suite
    create-backup     Create test backup only
    test-integrity    Test backup integrity only
    test-database     Test database recovery only
    test-application  Test application recovery only
    test-config       Test configuration recovery only
    test-performance  Test recovery performance only
    generate-report   Generate test report from existing results

Options:
    --config FILE           DR test configuration file
    --workspace DIR         Test workspace directory
    --components LIST       Comma-separated list of components to test
    --timeout SECONDS       Test timeout in seconds
    --environment ENV       Test environment (staging, development)
    --cleanup-delay SECONDS Delay before cleanup in seconds
    --no-cleanup            Skip cleanup of test environment
    --help                  Show this help message

Examples:
    $0 run                                    # Run complete test suite
    $0 run --components database,application  # Test specific components
    $0 test-database --timeout 1800          # Test database recovery only
    $0 create-backup                          # Create test backup only
    $0 --no-cleanup run                       # Run tests without cleanup

Environment Variables:
    DR_TEST_CONFIG_FILE    Path to DR test configuration file
    TEST_WORKSPACE         Test workspace directory
    DR_SCRIPT             Path to disaster recovery script
    BACKUP_SCRIPT         Path to backup script

EOF
}

# Main function
main() {
    local command=""
    local no_cleanup=false
    
    TEST_START_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            run|create-backup|test-integrity|test-database|test-application|test-config|test-performance|generate-report)
                command="$1"
                shift
                ;;
            --config)
                DR_TEST_CONFIG_FILE="$2"
                shift 2
                ;;
            --workspace)
                TEST_WORKSPACE="$2"
                shift 2
                ;;
            --components)
                TEST_COMPONENTS="$2"
                shift 2
                ;;
            --timeout)
                TEST_TIMEOUT="$2"
                shift 2
                ;;
            --environment)
                TEST_ENVIRONMENT="$2"
                shift 2
                ;;
            --cleanup-delay)
                CLEANUP_DELAY="$2"
                shift 2
                ;;
            --no-cleanup)
                no_cleanup=true
                shift
                ;;
            --help)
                usage
                exit 0
                ;;
            -*)
                log "ERROR" "Unknown option: $1"
                usage
                exit 1
                ;;
            *)
                log "ERROR" "Unknown argument: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Default command
    if [[ -z "$command" ]]; then
        command="run"
    fi
    
    # Set cleanup flag
    if [[ "$no_cleanup" == true ]]; then
        CLEANUP_ENABLED=false
    fi
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Load configuration
    load_config
    
    log "INFO" "Starting DR test runner - ID: ${TEST_ID}, Command: ${command}"
    send_notification "DR_TEST_STARTED" "DR test started - ID: ${TEST_ID}, Command: ${command}"
    
    # Setup test environment for most commands
    if [[ "$command" != "generate-report" ]]; then
        setup_test_environment
    fi
    
    # Execute command
    case "$command" in
        "run")
            create_test_backup
            run_test_suite
            TEST_STATUS="completed"
            ;;
        "create-backup")
            create_test_backup
            TEST_STATUS="completed"
            ;;
        "test-integrity")
            create_test_backup
            test_backup_integrity
            TEST_STATUS="completed"
            ;;
        "test-database")
            create_test_backup
            test_database_recovery
            TEST_STATUS="completed"
            ;;
        "test-application")
            create_test_backup
            test_application_recovery
            TEST_STATUS="completed"
            ;;
        "test-config")
            create_test_backup
            test_configuration_recovery
            TEST_STATUS="completed"
            ;;
        "test-performance")
            create_test_backup
            test_recovery_performance
            TEST_STATUS="completed"
            ;;
        "generate-report")
            # Generate report from existing test data
            if [[ -d "$TEST_WORKSPACE" ]]; then
                TEST_STATUS="report_only"
            else
                log "ERROR" "No test workspace found for report generation"
                exit 1
            fi
            ;;
        *)
            log "ERROR" "Unknown command: $command"
            usage
            exit 1
            ;;
    esac
    
    # Generate final report
    generate_test_report
    
    # Send completion notification
    if [[ ${#FAILED_TESTS[@]} -eq 0 ]]; then
        send_notification "DR_TEST_COMPLETED" "DR test completed successfully - Passed: ${#PASSED_TESTS[@]}, Failed: ${#FAILED_TESTS[@]}" "SUCCESS"
    else
        send_notification "DR_TEST_COMPLETED_WITH_FAILURES" "DR test completed with failures - Passed: ${#PASSED_TESTS[@]}, Failed: ${#FAILED_TESTS[@]}" "WARNING"
    fi
    
    # Cleanup
    if [[ "$CLEANUP_ENABLED" != false ]]; then
        cleanup_test_environment
    fi
    
    log "INFO" "DR test runner completed - Status: $TEST_STATUS"
    
    # Exit with error if tests failed
    if [[ ${#FAILED_TESTS[@]} -gt 0 ]]; then
        exit 1
    fi
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi