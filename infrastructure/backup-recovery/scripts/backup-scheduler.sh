#!/bin/bash

# =============================================================================
# AI Multi-Model Platform - Backup Scheduler
# Automated backup scheduling and management system
# =============================================================================

set -euo pipefail

# Configuration
SCHEDULER_CONFIG_FILE="${SCHEDULER_CONFIG_FILE:-/etc/ai-platform/backup-scheduler.conf}"
LOG_FILE="${LOG_FILE:-/var/log/ai-platform/backup-scheduler.log}"
LOCK_FILE="${LOCK_FILE:-/var/run/backup-scheduler.lock}"
PID_FILE="${PID_FILE:-/var/run/backup-scheduler.pid}"
BACKUP_SCRIPT="${BACKUP_SCRIPT:-/opt/ai-platform/scripts/automated-backup.sh}"

# Default configuration
DEFAULT_SCHEDULE="0 2 * * *"  # Daily at 2 AM
DEFAULT_RETENTION_DAYS=30
DEFAULT_MAX_CONCURRENT_BACKUPS=1
DEFAULT_BACKUP_TYPES="full"
DEFAULT_NOTIFICATION_ENABLED=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
    log "ERROR" "Backup scheduler failed with exit code ${exit_code} at line ${line_number}"
    cleanup_and_exit "${exit_code}"
}

trap 'handle_error $? $LINENO' ERR

# Load configuration
load_config() {
    if [[ -f "${SCHEDULER_CONFIG_FILE}" ]]; then
        source "${SCHEDULER_CONFIG_FILE}"
        log "INFO" "Configuration loaded from ${SCHEDULER_CONFIG_FILE}"
    else
        log "WARN" "Configuration file not found, using defaults"
        # Set defaults
        BACKUP_SCHEDULE="${DEFAULT_SCHEDULE}"
        RETENTION_DAYS="${DEFAULT_RETENTION_DAYS}"
        MAX_CONCURRENT_BACKUPS="${DEFAULT_MAX_CONCURRENT_BACKUPS}"
        BACKUP_TYPES="${DEFAULT_BACKUP_TYPES}"
        NOTIFICATION_ENABLED="${DEFAULT_NOTIFICATION_ENABLED}"
    fi
}

# Create lock file
acquire_lock() {
    local lock_timeout="${LOCK_TIMEOUT:-3600}"  # 1 hour default
    local attempt=0
    local max_attempts=5
    
    while [[ $attempt -lt $max_attempts ]]; do
        if (set -C; echo $$ > "$LOCK_FILE") 2>/dev/null; then
            log "INFO" "Lock acquired: $LOCK_FILE"
            echo $$ > "$PID_FILE"
            return 0
        else
            local existing_pid
            if [[ -f "$LOCK_FILE" ]]; then
                existing_pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "unknown")
                
                # Check if process is still running
                if [[ "$existing_pid" != "unknown" ]] && ! kill -0 "$existing_pid" 2>/dev/null; then
                    log "WARN" "Stale lock file found (PID: $existing_pid), removing"
                    rm -f "$LOCK_FILE"
                    continue
                fi
                
                # Check lock age
                local lock_age=$(($(date +%s) - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo $(date +%s))))
                if [[ $lock_age -gt $lock_timeout ]]; then
                    log "WARN" "Lock file is too old (${lock_age}s), removing"
                    rm -f "$LOCK_FILE"
                    continue
                fi
                
                log "WARN" "Lock file exists (PID: $existing_pid, age: ${lock_age}s)"
            fi
        fi
        
        attempt=$((attempt + 1))
        log "INFO" "Waiting for lock... (attempt $attempt/$max_attempts)"
        sleep $((attempt * 10))
    done
    
    log "ERROR" "Could not acquire lock after $max_attempts attempts"
    return 1
}

# Release lock file
release_lock() {
    if [[ -f "$LOCK_FILE" ]]; then
        rm -f "$LOCK_FILE"
        log "INFO" "Lock released"
    fi
    
    if [[ -f "$PID_FILE" ]]; then
        rm -f "$PID_FILE"
    fi
}

# Cleanup and exit
cleanup_and_exit() {
    local exit_code="${1:-0}"
    release_lock
    exit "$exit_code"
}

# Signal handlers
handle_signal() {
    local signal="$1"
    log "WARN" "Received signal: $signal"
    cleanup_and_exit 128
}

trap 'handle_signal TERM' TERM
trap 'handle_signal INT' INT
trap 'handle_signal HUP' HUP

# Check if backup is currently running
is_backup_running() {
    local backup_pids
    backup_pids=$(pgrep -f "$BACKUP_SCRIPT" || true)
    
    if [[ -n "$backup_pids" ]]; then
        local count=$(echo "$backup_pids" | wc -l)
        log "INFO" "Found $count running backup process(es): $backup_pids"
        return 0
    else
        return 1
    fi
}

# Get number of running backups
get_running_backup_count() {
    local backup_pids
    backup_pids=$(pgrep -f "$BACKUP_SCRIPT" || true)
    
    if [[ -n "$backup_pids" ]]; then
        echo "$backup_pids" | wc -l
    else
        echo "0"
    fi
}

# Send notification
send_notification() {
    local event="$1"
    local message="$2"
    local severity="${3:-INFO}"
    
    if [[ "${NOTIFICATION_ENABLED:-true}" != "true" ]]; then
        return 0
    fi
    
    if [[ -n "${NOTIFICATION_WEBHOOK:-}" ]]; then
        curl -s -X POST "${NOTIFICATION_WEBHOOK}" \
            -H "Content-Type: application/json" \
            -d "{
                \"event\": \"SCHEDULER_${event}\",
                \"message\": \"${message}\",
                \"severity\": \"${severity}\",
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                \"hostname\": \"$(hostname)\"
            }" || log "WARN" "Failed to send notification"
    fi
}

# Check system resources
check_system_resources() {
    local min_disk_gb="${MIN_DISK_SPACE_GB:-10}"
    local min_memory_mb="${MIN_MEMORY_MB:-1024}"
    
    # Check available disk space
    local available_gb
    available_gb=$(df "${BACKUP_BASE_DIR:-/var/backups}" | tail -1 | awk '{print int($4/1024/1024)}')
    
    if [[ $available_gb -lt $min_disk_gb ]]; then
        log "ERROR" "Insufficient disk space: ${available_gb}GB available, ${min_disk_gb}GB required"
        send_notification "RESOURCE_CHECK_FAILED" "Insufficient disk space for backup: ${available_gb}GB available" "CRITICAL"
        return 1
    fi
    
    # Check available memory
    local available_mb
    available_mb=$(free -m | grep '^Mem:' | awk '{print $7}')
    
    if [[ $available_mb -lt $min_memory_mb ]]; then
        log "WARN" "Low memory: ${available_mb}MB available, ${min_memory_mb}MB recommended"
        send_notification "RESOURCE_WARNING" "Low memory for backup: ${available_mb}MB available" "WARNING"
    fi
    
    # Check system load
    local load_avg
    load_avg=$(uptime | awk -F'load average:' '{ print $2 }' | awk '{ print $1 }' | tr -d ',')
    local load_threshold="${MAX_LOAD_AVERAGE:-4.0}"
    
    if (( $(echo "$load_avg > $load_threshold" | bc -l 2>/dev/null || echo "0") )); then
        log "WARN" "High system load: ${load_avg}, threshold: ${load_threshold}"
        send_notification "LOAD_WARNING" "High system load detected: ${load_avg}" "WARNING"
    fi
    
    return 0
}

# Execute backup
execute_backup() {
    local backup_type="${1:-full}"
    local backup_id="scheduled-$(date +%Y%m%d-%H%M%S)"
    
    log "INFO" "Starting scheduled backup - Type: $backup_type, ID: $backup_id"
    
    # Check concurrent backup limit
    local running_count
    running_count=$(get_running_backup_count)
    local max_concurrent="${MAX_CONCURRENT_BACKUPS:-1}"
    
    if [[ $running_count -ge $max_concurrent ]]; then
        log "ERROR" "Maximum concurrent backups reached: $running_count/$max_concurrent"
        send_notification "BACKUP_SKIPPED" "Backup skipped - max concurrent limit reached: $running_count/$max_concurrent" "WARNING"
        return 1
    fi
    
    # Check system resources
    if ! check_system_resources; then
        log "ERROR" "System resource check failed"
        send_notification "BACKUP_SKIPPED" "Backup skipped - insufficient system resources" "ERROR"
        return 1
    fi
    
    # Set environment variables for backup script
    export BACKUP_TYPE="$backup_type"
    export BACKUP_ID="$backup_id"
    export BACKUP_SCHEDULED="true"
    export SCHEDULER_PID="$$"
    
    # Execute backup script
    local backup_start_time=$(date +%s)
    local backup_log_file="${LOG_FILE%/*}/backup-${backup_id}.log"
    
    log "INFO" "Executing backup script: $BACKUP_SCRIPT"
    send_notification "BACKUP_STARTED" "Scheduled backup started - Type: $backup_type, ID: $backup_id"
    
    if "$BACKUP_SCRIPT" 2>&1 | tee "$backup_log_file"; then
        local backup_end_time=$(date +%s)
        local backup_duration=$((backup_end_time - backup_start_time))
        
        log "INFO" "Backup completed successfully - Duration: ${backup_duration}s"
        send_notification "BACKUP_COMPLETED" "Scheduled backup completed successfully - Duration: ${backup_duration}s" "SUCCESS"
        
        # Update backup history
        update_backup_history "$backup_id" "$backup_type" "success" "$backup_duration"
        
        return 0
    else
        local backup_end_time=$(date +%s)
        local backup_duration=$((backup_end_time - backup_start_time))
        
        log "ERROR" "Backup failed - Duration: ${backup_duration}s"
        send_notification "BACKUP_FAILED" "Scheduled backup failed - Duration: ${backup_duration}s" "CRITICAL"
        
        # Update backup history
        update_backup_history "$backup_id" "$backup_type" "failed" "$backup_duration"
        
        return 1
    fi
}

# Update backup history
update_backup_history() {
    local backup_id="$1"
    local backup_type="$2"
    local status="$3"
    local duration="$4"
    
    local history_file="${LOG_FILE%/*}/backup-history.json"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    # Create history entry
    local entry="{
        \"backup_id\": \"$backup_id\",
        \"backup_type\": \"$backup_type\",
        \"status\": \"$status\",
        \"timestamp\": \"$timestamp\",
        \"duration_seconds\": $duration,
        \"hostname\": \"$(hostname)\",
        \"scheduler_version\": \"1.0\"
    }"
    
    # Initialize history file if it doesn't exist
    if [[ ! -f "$history_file" ]]; then
        echo "[]" > "$history_file"
    fi
    
    # Add entry to history
    local temp_file=$(mktemp)
    jq ". += [$entry]" "$history_file" > "$temp_file" && mv "$temp_file" "$history_file" || {
        log "WARN" "Failed to update backup history"
        rm -f "$temp_file"
    }
    
    # Cleanup old history entries (keep last 1000)
    if [[ $(jq 'length' "$history_file" 2>/dev/null || echo "0") -gt 1000 ]]; then
        jq '.[100:]' "$history_file" > "$temp_file" && mv "$temp_file" "$history_file" || {
            log "WARN" "Failed to cleanup backup history"
            rm -f "$temp_file"
        }
    fi
}

# Get backup statistics
get_backup_stats() {
    local history_file="${LOG_FILE%/*}/backup-history.json"
    local days="${1:-30}"
    
    if [[ ! -f "$history_file" ]]; then
        echo "No backup history found"
        return
    fi
    
    local cutoff_date=$(date -d "$days days ago" -u +%Y-%m-%dT%H:%M:%SZ)
    
    echo "Backup Statistics (Last $days days):"
    echo "======================================"
    
    # Total backups
    local total_backups
    total_backups=$(jq --arg cutoff "$cutoff_date" '[.[] | select(.timestamp >= $cutoff)] | length' "$history_file" 2>/dev/null || echo "0")
    echo "Total backups: $total_backups"
    
    # Success rate
    local successful_backups
    successful_backups=$(jq --arg cutoff "$cutoff_date" '[.[] | select(.timestamp >= $cutoff and .status == "success")] | length' "$history_file" 2>/dev/null || echo "0")
    
    if [[ $total_backups -gt 0 ]]; then
        local success_rate=$((successful_backups * 100 / total_backups))
        echo "Success rate: ${success_rate}% (${successful_backups}/${total_backups})"
    else
        echo "Success rate: N/A"
    fi
    
    # Average duration
    local avg_duration
    avg_duration=$(jq --arg cutoff "$cutoff_date" '[.[] | select(.timestamp >= $cutoff and .status == "success") | .duration_seconds] | add / length' "$history_file" 2>/dev/null | cut -d. -f1 || echo "0")
    
    if [[ $avg_duration -gt 0 ]]; then
        echo "Average duration: ${avg_duration}s"
    else
        echo "Average duration: N/A"
    fi
    
    # Last backup
    local last_backup
    last_backup=$(jq -r '.[-1] | "\(.timestamp) (\(.status))"' "$history_file" 2>/dev/null || echo "N/A")
    echo "Last backup: $last_backup"
    
    # Failed backups in last 24 hours
    local yesterday=$(date -d "1 day ago" -u +%Y-%m-%dT%H:%M:%SZ)
    local recent_failures
    recent_failures=$(jq --arg cutoff "$yesterday" '[.[] | select(.timestamp >= $cutoff and .status == "failed")] | length' "$history_file" 2>/dev/null || echo "0")
    
    if [[ $recent_failures -gt 0 ]]; then
        echo -e "${RED}Recent failures (24h): $recent_failures${NC}"
    else
        echo -e "${GREEN}Recent failures (24h): $recent_failures${NC}"
    fi
}

# Validate backup schedule
validate_schedule() {
    local schedule="$1"
    
    # Basic cron expression validation
    if [[ ! "$schedule" =~ ^[0-9*,-/]+[[:space:]]+[0-9*,-/]+[[:space:]]+[0-9*,-/]+[[:space:]]+[0-9*,-/]+[[:space:]]+[0-9*,-/]+$ ]]; then
        log "ERROR" "Invalid cron schedule format: $schedule"
        return 1
    fi
    
    # Test with crontab
    if ! (echo "$schedule echo test" | crontab -T) >/dev/null 2>&1; then
        log "ERROR" "Invalid cron schedule: $schedule"
        return 1
    fi
    
    return 0
}

# Install cron job
install_cron() {
    local schedule="${BACKUP_SCHEDULE:-$DEFAULT_SCHEDULE}"
    local script_path="$(realpath "$0")"
    
    log "INFO" "Installing cron job with schedule: $schedule"
    
    # Validate schedule
    if ! validate_schedule "$schedule"; then
        log "ERROR" "Cannot install cron job with invalid schedule"
        return 1
    fi
    
    # Create cron job entry
    local cron_job="$schedule $script_path run >/dev/null 2>&1"
    
    # Install cron job
    (crontab -l 2>/dev/null | grep -v "$script_path"; echo "$cron_job") | crontab - || {
        log "ERROR" "Failed to install cron job"
        return 1
    }
    
    log "INFO" "Cron job installed successfully"
    send_notification "CRON_INSTALLED" "Backup scheduler cron job installed with schedule: $schedule"
}

# Uninstall cron job
uninstall_cron() {
    local script_path="$(realpath "$0")"
    
    log "INFO" "Uninstalling cron job"
    
    # Remove cron job
    (crontab -l 2>/dev/null | grep -v "$script_path") | crontab - || {
        log "WARN" "Failed to uninstall cron job or no cron job found"
    }
    
    log "INFO" "Cron job uninstalled"
    send_notification "CRON_UNINSTALLED" "Backup scheduler cron job uninstalled"
}

# Show current cron jobs
show_cron() {
    local script_path="$(realpath "$0")"
    
    echo "Current cron jobs for backup scheduler:"
    echo "======================================"
    
    local cron_jobs
    cron_jobs=$(crontab -l 2>/dev/null | grep "$script_path" || true)
    
    if [[ -n "$cron_jobs" ]]; then
        echo "$cron_jobs"
    else
        echo "No cron jobs found for backup scheduler"
    fi
}

# Check backup health
check_backup_health() {
    local days="${1:-7}"
    
    echo "Backup Health Check (Last $days days):"
    echo "====================================="
    
    # Check if backup script exists and is executable
    if [[ -x "$BACKUP_SCRIPT" ]]; then
        echo -e "${GREEN}✓ Backup script is executable${NC}"
    else
        echo -e "${RED}✗ Backup script not found or not executable: $BACKUP_SCRIPT${NC}"
    fi
    
    # Check configuration
    if [[ -f "$SCHEDULER_CONFIG_FILE" ]]; then
        echo -e "${GREEN}✓ Configuration file exists${NC}"
    else
        echo -e "${YELLOW}⚠ Configuration file not found (using defaults): $SCHEDULER_CONFIG_FILE${NC}"
    fi
    
    # Check log directory
    local log_dir=$(dirname "$LOG_FILE")
    if [[ -d "$log_dir" && -w "$log_dir" ]]; then
        echo -e "${GREEN}✓ Log directory is writable${NC}"
    else
        echo -e "${RED}✗ Log directory not writable: $log_dir${NC}"
    fi
    
    # Check backup directory
    local backup_dir="${BACKUP_BASE_DIR:-/var/backups/ai-platform}"
    if [[ -d "$backup_dir" && -w "$backup_dir" ]]; then
        echo -e "${GREEN}✓ Backup directory is writable${NC}"
    else
        echo -e "${RED}✗ Backup directory not writable: $backup_dir${NC}"
    fi
    
    # Check system resources
    echo
    if check_system_resources; then
        echo -e "${GREEN}✓ System resources are adequate${NC}"
    else
        echo -e "${RED}✗ System resources are insufficient${NC}"
    fi
    
    # Check recent backup status
    echo
    get_backup_stats "$days"
}

# Display usage
usage() {
    cat << EOF
AI Multi-Model Platform - Backup Scheduler

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    run                     Execute scheduled backup
    install-cron           Install cron job for automated scheduling
    uninstall-cron         Remove cron job
    show-cron              Show current cron jobs
    status                 Show backup statistics and health
    health-check           Perform comprehensive health check
    test                   Test backup execution without scheduling

Options:
    --config FILE          Configuration file path
    --log-file FILE        Log file path
    --backup-type TYPE     Backup type (full, incremental, differential)
    --dry-run              Simulate backup execution
    --force                Force backup execution even if limits are reached
    --help                 Show this help message

Examples:
    $0 run                          # Execute backup now
    $0 install-cron                 # Install daily backup cron job
    $0 status --days 7              # Show last 7 days statistics
    $0 test --backup-type full      # Test full backup execution
    $0 health-check                 # Comprehensive system health check

Environment Variables:
    SCHEDULER_CONFIG_FILE    Path to scheduler configuration file
    BACKUP_SCRIPT           Path to backup execution script
    LOG_FILE                Path to log file
    LOCK_FILE               Path to lock file

EOF
}

# Main function
main() {
    local command=""
    local backup_type="full"
    local dry_run=false
    local force=false
    local days=30
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            run|install-cron|uninstall-cron|show-cron|status|health-check|test)
                command="$1"
                shift
                ;;
            --config)
                SCHEDULER_CONFIG_FILE="$2"
                shift 2
                ;;
            --log-file)
                LOG_FILE="$2"
                shift 2
                ;;
            --backup-type)
                backup_type="$2"
                shift 2
                ;;
            --days)
                days="$2"
                shift 2
                ;;
            --dry-run)
                dry_run=true
                export DRY_RUN=true
                shift
                ;;
            --force)
                force=true
                export FORCE=true
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
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Load configuration
    load_config
    
    # Execute command
    case "$command" in
        "run")
            if ! acquire_lock; then
                log "ERROR" "Could not acquire lock for backup execution"
                exit 1
            fi
            
            if [[ "$dry_run" == true ]]; then
                log "INFO" "DRY RUN: Would execute backup (type: $backup_type)"
                cleanup_and_exit 0
            fi
            
            execute_backup "$backup_type"
            cleanup_and_exit $?
            ;;
        "install-cron")
            install_cron
            ;;
        "uninstall-cron")
            uninstall_cron
            ;;
        "show-cron")
            show_cron
            ;;
        "status")
            get_backup_stats "$days"
            ;;
        "health-check")
            check_backup_health "$days"
            ;;
        "test")
            export DRY_RUN=true
            if ! acquire_lock; then
                log "ERROR" "Could not acquire lock for backup test"
                exit 1
            fi
            
            log "INFO" "Testing backup execution (type: $backup_type)"
            execute_backup "$backup_type"
            cleanup_and_exit $?
            ;;
        *)
            log "ERROR" "Unknown command: $command"
            usage
            exit 1
            ;;
    esac
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi