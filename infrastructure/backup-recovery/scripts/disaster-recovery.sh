#!/bin/bash

# =============================================================================
# AI Multi-Model Platform - Disaster Recovery System
# Comprehensive disaster recovery and system restoration
# =============================================================================

set -euo pipefail

# Configuration
DR_CONFIG_FILE="${DR_CONFIG_FILE:-/etc/ai-platform/disaster-recovery.conf}"
LOG_FILE="${LOG_FILE:-/var/log/ai-platform/disaster-recovery.log}"
NOTIFICATION_WEBHOOK="${NOTIFICATION_WEBHOOK:-}"
ENCRYPTION_KEY_FILE="${ENCRYPTION_KEY_FILE:-/etc/ai-platform/backup.key}"
RECOVERY_WORKSPACE="${RECOVERY_WORKSPACE:-/tmp/disaster-recovery}"
PARALLEL_JOBS="${PARALLEL_JOBS:-4}"

# Recovery modes
RECOVERY_MODES=(
    "full"          # Complete system restoration
    "database"      # Database only
    "application"   # Application code and assets
    "configuration" # System configurations
    "selective"     # User-specified components
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Generate recovery session ID
RECOVERY_ID="recovery-$(date +%Y%m%d-%H%M%S)-$(hostname -s)"

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
    log "ERROR" "Disaster recovery failed with exit code ${exit_code} at line ${line_number}"
    send_notification "DR_FAILED" "Disaster recovery failed with exit code ${exit_code} at line ${line_number}" "CRITICAL"
    cleanup_recovery_workspace
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
                \"recovery_id\": \"${RECOVERY_ID}\"
            }" || log "WARN" "Failed to send notification"
    fi
}

# Load configuration
load_config() {
    if [[ -f "${DR_CONFIG_FILE}" ]]; then
        source "${DR_CONFIG_FILE}"
        log "INFO" "DR configuration loaded from ${DR_CONFIG_FILE}"
    else
        log "WARN" "DR configuration file not found, using defaults"
    fi
}

# Display usage
usage() {
    cat << EOF
AI Multi-Model Platform - Disaster Recovery System

Usage: $0 [OPTIONS] <mode> <backup_file>

Recovery Modes:
    full            Complete system restoration
    database        Database restoration only
    application     Application code and assets only
    configuration   System configurations only
    selective       Interactive component selection

Options:
    -w, --workspace DIR     Recovery workspace directory (default: ${RECOVERY_WORKSPACE})
    -c, --config FILE       DR configuration file (default: ${DR_CONFIG_FILE})
    -n, --dry-run          Simulate recovery without making changes
    -f, --force            Skip confirmation prompts
    -v, --verbose          Enable verbose logging
    -h, --help             Show this help message

Examples:
    $0 full /var/backups/ai-platform/backup-20241201-120000.tar.gz.enc
    $0 database /var/backups/ai-platform/backup-20241201-120000.tar.gz
    $0 --dry-run selective /var/backups/ai-platform/backup-20241201-120000.tar.gz

Environment Variables:
    DR_CONFIG_FILE         Path to DR configuration file
    RECOVERY_WORKSPACE     Recovery workspace directory
    NOTIFICATION_WEBHOOK   Webhook URL for notifications
    ENCRYPTION_KEY_FILE    Path to backup encryption key

EOF
}

# Parse command line arguments
parse_arguments() {
    local dry_run=false
    local force=false
    local verbose=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -w|--workspace)
                RECOVERY_WORKSPACE="$2"
                shift 2
                ;;
            -c|--config)
                DR_CONFIG_FILE="$2"
                shift 2
                ;;
            -n|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            -*)
                log "ERROR" "Unknown option: $1"
                usage
                exit 1
                ;;
            *)
                if [[ -z "${RECOVERY_MODE:-}" ]]; then
                    RECOVERY_MODE="$1"
                elif [[ -z "${BACKUP_FILE:-}" ]]; then
                    BACKUP_FILE="$1"
                else
                    log "ERROR" "Too many arguments"
                    usage
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # Validate required arguments
    if [[ -z "${RECOVERY_MODE:-}" ]]; then
        log "ERROR" "Recovery mode not specified"
        usage
        exit 1
    fi
    
    if [[ -z "${BACKUP_FILE:-}" ]]; then
        log "ERROR" "Backup file not specified"
        usage
        exit 1
    fi
    
    # Validate recovery mode
    local valid_mode=false
    for mode in "${RECOVERY_MODES[@]}"; do
        if [[ "$RECOVERY_MODE" == "$mode" ]]; then
            valid_mode=true
            break
        fi
    done
    
    if [[ "$valid_mode" == false ]]; then
        log "ERROR" "Invalid recovery mode: $RECOVERY_MODE"
        log "ERROR" "Valid modes: ${RECOVERY_MODES[*]}"
        exit 1
    fi
    
    # Check backup file exists
    if [[ ! -f "$BACKUP_FILE" ]]; then
        log "ERROR" "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
}

# System pre-checks
perform_system_checks() {
    log "INFO" "Performing system pre-checks..."
    
    # Check available disk space
    local required_space_gb=10
    local available_space_gb=$(df "${RECOVERY_WORKSPACE%/*}" | tail -1 | awk '{print int($4/1024/1024)}')
    
    if [[ $available_space_gb -lt $required_space_gb ]]; then
        log "ERROR" "Insufficient disk space. Required: ${required_space_gb}GB, Available: ${available_space_gb}GB"
        exit 1
    fi
    
    # Check required commands
    local required_commands=("tar" "openssl" "psql" "redis-cli" "docker" "kubectl")
    local missing_commands=()
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            missing_commands+=("$cmd")
        fi
    done
    
    if [[ ${#missing_commands[@]} -gt 0 ]]; then
        log "WARN" "Missing commands: ${missing_commands[*]}"
    fi
    
    # Check system resources
    local memory_gb=$(free -g | grep '^Mem:' | awk '{print $2}')
    if [[ $memory_gb -lt 4 ]]; then
        log "WARN" "Low system memory: ${memory_gb}GB (recommended: 4GB+)"
    fi
    
    # Check running services
    local critical_services=("postgresql" "redis" "nginx" "docker")
    for service in "${critical_services[@]}"; do
        if systemctl is-active --quiet "$service" 2>/dev/null; then
            log "INFO" "Service $service is running"
        else
            log "WARN" "Service $service is not running"
        fi
    done
    
    log "INFO" "System pre-checks completed"
}

# Backup validation
validate_backup() {
    local backup_file="$1"
    
    log "INFO" "Validating backup file: $(basename "$backup_file")"
    
    # Check file size
    local file_size=$(ls -lh "$backup_file" | awk '{print $5}')
    log "INFO" "Backup file size: $file_size"
    
    # Validate backup integrity
    if [[ "$backup_file" == *.enc ]]; then
        log "INFO" "Validating encrypted backup..."
        if [[ -f "${ENCRYPTION_KEY_FILE}" ]]; then
            openssl enc -aes-256-gcm -d -in "$backup_file" \
                -pass file:"${ENCRYPTION_KEY_FILE}" | tar -tz >/dev/null 2>&1 || {
                log "ERROR" "Backup validation failed - corrupted or wrong encryption key"
                exit 1
            }
        else
            log "ERROR" "Encryption key not found: ${ENCRYPTION_KEY_FILE}"
            exit 1
        fi
    else
        log "INFO" "Validating unencrypted backup..."
        tar -tzf "$backup_file" >/dev/null 2>&1 || {
            log "ERROR" "Backup validation failed - corrupted archive"
            exit 1
        }
    fi
    
    log "INFO" "Backup validation successful"
}

# Extract backup
extract_backup() {
    local backup_file="$1"
    local extract_dir="$2"
    
    log "INFO" "Extracting backup to: $extract_dir"
    mkdir -p "$extract_dir"
    
    if [[ "$backup_file" == *.enc ]]; then
        log "INFO" "Decrypting and extracting encrypted backup..."
        openssl enc -aes-256-gcm -d -in "$backup_file" \
            -pass file:"${ENCRYPTION_KEY_FILE}" | tar -xzf - -C "$extract_dir" || {
            log "ERROR" "Failed to decrypt and extract backup"
            exit 1
        }
    else
        log "INFO" "Extracting unencrypted backup..."
        tar -xzf "$backup_file" -C "$extract_dir" || {
            log "ERROR" "Failed to extract backup"
            exit 1
        }
    fi
    
    log "INFO" "Backup extraction completed"
}

# Setup recovery workspace
setup_recovery_workspace() {
    log "INFO" "Setting up recovery workspace: $RECOVERY_WORKSPACE"
    
    # Clean existing workspace if it exists
    if [[ -d "$RECOVERY_WORKSPACE" ]]; then
        if [[ "${FORCE:-false}" == "true" ]]; then
            rm -rf "$RECOVERY_WORKSPACE"
        else
            read -p "Recovery workspace exists. Remove it? [y/N]: " -r
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                rm -rf "$RECOVERY_WORKSPACE"
            else
                log "ERROR" "Recovery workspace exists and removal was declined"
                exit 1
            fi
        fi
    fi
    
    mkdir -p "$RECOVERY_WORKSPACE"/{extract,staging,logs,scripts}
    
    # Extract backup
    extract_backup "$BACKUP_FILE" "$RECOVERY_WORKSPACE/extract"
    
    # Find the actual backup directory
    BACKUP_EXTRACT_DIR=$(find "$RECOVERY_WORKSPACE/extract" -maxdepth 1 -type d -name "backup-*" | head -1)
    
    if [[ -z "$BACKUP_EXTRACT_DIR" ]]; then
        log "ERROR" "Could not find backup directory in extracted archive"
        exit 1
    fi
    
    log "INFO" "Recovery workspace setup completed"
}

# Cleanup recovery workspace
cleanup_recovery_workspace() {
    if [[ -d "$RECOVERY_WORKSPACE" ]]; then
        log "INFO" "Cleaning up recovery workspace"
        rm -rf "$RECOVERY_WORKSPACE"
    fi
}

# Create system snapshot before recovery
create_system_snapshot() {
    log "INFO" "Creating system snapshot before recovery..."
    
    local snapshot_dir="$RECOVERY_WORKSPACE/pre-recovery-snapshot"
    mkdir -p "$snapshot_dir"
    
    # Database snapshot
    if command -v pg_dump >/dev/null 2>&1; then
        log "INFO" "Creating database snapshot..."
        databases=$(psql -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}" -t -c "SELECT datname FROM pg_database WHERE NOT datistemplate AND datname != 'postgres';" 2>/dev/null || echo "ai_platform")
        
        while IFS= read -r db; do
            db=$(echo "$db" | tr -d ' ')
            if [[ -n "$db" ]]; then
                pg_dump -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}" -d "$db" \
                    --no-password --verbose --format=custom \
                    --file="$snapshot_dir/pre-recovery-${db}.dump" 2>/dev/null || true
            fi
        done <<< "$databases"
    fi
    
    # Configuration snapshot
    local config_paths=(
        "/etc/ai-platform"
        "/etc/nginx/sites-available"
        "/etc/ssl/ai-platform"
    )
    
    for path in "${config_paths[@]}"; do
        if [[ -e "$path" ]]; then
            local basename=$(basename "$path")
            cp -r "$path" "$snapshot_dir/pre-recovery-config-$basename" 2>/dev/null || true
        fi
    done
    
    # Application snapshot
    if [[ -d "${APP_ROOT:-/opt/ai-platform}" ]]; then
        rsync -a "${APP_ROOT:-/opt/ai-platform}/" "$snapshot_dir/pre-recovery-app/" 2>/dev/null || true
    fi
    
    log "INFO" "System snapshot created at: $snapshot_dir"
}

# Restore database
restore_database() {
    log "INFO" "Starting database restoration..."
    
    local db_backup_dir="$BACKUP_EXTRACT_DIR/database"
    
    if [[ ! -d "$db_backup_dir" ]]; then
        log "WARN" "No database backup found in archive"
        return 0
    fi
    
    # PostgreSQL restoration
    local pg_dumps=($(find "$db_backup_dir" -name "*.dump" -type f))
    for dump_file in "${pg_dumps[@]}"; do
        local db_name=$(basename "$dump_file" | sed 's/-[0-9]*-[0-9]*.dump$//')
        
        log "INFO" "Restoring PostgreSQL database: $db_name"
        
        if [[ "${DRY_RUN:-false}" == "true" ]]; then
            log "INFO" "[DRY RUN] Would restore database $db_name from $dump_file"
        else
            # Create database if it doesn't exist
            psql -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}" -c "SELECT 1 FROM pg_database WHERE datname='$db_name'" | grep -q 1 || \
                psql -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}" -c "CREATE DATABASE $db_name;" || {
                log "ERROR" "Failed to create database: $db_name"
                return 1
            }
            
            # Restore database
            pg_restore -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}" \
                -d "$db_name" --clean --if-exists --no-owner --no-privileges \
                --verbose "$dump_file" || {
                log "ERROR" "Failed to restore database: $db_name"
                return 1
            }
        fi
    done
    
    # MongoDB restoration
    local mongo_backups=($(find "$db_backup_dir" -name "mongodb-*" -type d))
    for backup_dir in "${mongo_backups[@]}"; do
        log "INFO" "Restoring MongoDB from: $(basename "$backup_dir")"
        
        if [[ "${DRY_RUN:-false}" == "true" ]]; then
            log "INFO" "[DRY RUN] Would restore MongoDB from $backup_dir"
        else
            mongorestore --host "${MONGO_HOST:-localhost:27017}" --drop "$backup_dir" || {
                log "ERROR" "Failed to restore MongoDB"
                return 1
            }
        fi
    done
    
    log "INFO" "Database restoration completed"
}

# Restore Redis
restore_redis() {
    log "INFO" "Starting Redis restoration..."
    
    local redis_backup_dir="$BACKUP_EXTRACT_DIR/redis"
    
    if [[ ! -d "$redis_backup_dir" ]]; then
        log "WARN" "No Redis backup found in archive"
        return 0
    fi
    
    local redis_dumps=($(find "$redis_backup_dir" -name "*.rdb" -type f))
    
    if [[ ${#redis_dumps[@]} -eq 0 ]]; then
        log "WARN" "No Redis RDB files found"
        return 0
    fi
    
    # Use the most recent RDB file
    local latest_rdb=$(ls -t "${redis_dumps[@]}" | head -1)
    
    log "INFO" "Restoring Redis from: $(basename "$latest_rdb")"
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log "INFO" "[DRY RUN] Would restore Redis from $latest_rdb"
    else
        # Stop Redis service
        systemctl stop redis-server 2>/dev/null || systemctl stop redis 2>/dev/null || true
        
        # Backup current RDB file
        local redis_data_dir="${REDIS_DATA_DIR:-/var/lib/redis}"
        if [[ -f "$redis_data_dir/dump.rdb" ]]; then
            mv "$redis_data_dir/dump.rdb" "$redis_data_dir/dump.rdb.backup.$(date +%Y%m%d-%H%M%S)" || true
        fi
        
        # Copy restored RDB file
        cp "$latest_rdb" "$redis_data_dir/dump.rdb" || {
            log "ERROR" "Failed to copy Redis RDB file"
            return 1
        }
        
        # Set proper ownership
        chown redis:redis "$redis_data_dir/dump.rdb" 2>/dev/null || true
        
        # Start Redis service
        systemctl start redis-server 2>/dev/null || systemctl start redis 2>/dev/null || {
            log "ERROR" "Failed to start Redis service"
            return 1
        }
        
        # Wait for Redis to be ready
        local retry=0
        while [[ $retry -lt 30 ]]; do
            if redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" ping 2>/dev/null | grep -q PONG; then
                break
            fi
            sleep 1
            ((retry++))
        done
        
        if [[ $retry -eq 30 ]]; then
            log "ERROR" "Redis did not start properly after restoration"
            return 1
        fi
    fi
    
    log "INFO" "Redis restoration completed"
}

# Restore application
restore_application() {
    log "INFO" "Starting application restoration..."
    
    local app_backup_dir="$BACKUP_EXTRACT_DIR/application"
    
    if [[ ! -d "$app_backup_dir" ]]; then
        log "WARN" "No application backup found in archive"
        return 0
    fi
    
    # Find application archives
    local app_archives=($(find "$app_backup_dir" -name "*.tar.gz" -type f))
    
    for archive in "${app_archives[@]}"; do
        local archive_name=$(basename "$archive")
        local component_name=$(echo "$archive_name" | sed 's/-[0-9]*-[0-9]*.tar.gz$//')
        
        log "INFO" "Restoring application component: $component_name"
        
        if [[ "${DRY_RUN:-false}" == "true" ]]; then
            log "INFO" "[DRY RUN] Would restore $component_name from $archive"
        else
            case "$component_name" in
                "ai-platform")
                    local target_dir="${APP_ROOT:-/opt/ai-platform}"
                    ;;
                "uploads")
                    local target_dir="${UPLOAD_DIR:-/var/lib/ai-platform/uploads}"
                    ;;
                "static")
                    local target_dir="${STATIC_DIR:-/var/lib/ai-platform/static}"
                    ;;
                *)
                    log "WARN" "Unknown application component: $component_name"
                    continue
                    ;;
            esac
            
            # Create backup of current directory
            if [[ -d "$target_dir" ]]; then
                mv "$target_dir" "${target_dir}.backup.$(date +%Y%m%d-%H%M%S)" || {
                    log "ERROR" "Failed to backup current $component_name directory"
                    return 1
                }
            fi
            
            # Create target directory and extract
            mkdir -p "$(dirname "$target_dir")"
            tar -xzf "$archive" -C "$(dirname "$target_dir")" || {
                log "ERROR" "Failed to extract $component_name"
                return 1
            }
            
            # Set proper ownership and permissions
            if [[ -d "$target_dir" ]]; then
                chown -R "${APP_USER:-root}:${APP_GROUP:-root}" "$target_dir" 2>/dev/null || true
                find "$target_dir" -type f -exec chmod 644 {} \; 2>/dev/null || true
                find "$target_dir" -type d -exec chmod 755 {} \; 2>/dev/null || true
                find "$target_dir" -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true
            fi
        fi
    done
    
    log "INFO" "Application restoration completed"
}

# Restore configurations
restore_configurations() {
    log "INFO" "Starting configuration restoration..."
    
    local config_backup_dir="$BACKUP_EXTRACT_DIR/configurations"
    
    if [[ ! -d "$config_backup_dir" ]]; then
        log "WARN" "No configuration backup found in archive"
        return 0
    fi
    
    # Find configuration archives
    local config_archives=($(find "$config_backup_dir" -name "config-*.tar.gz" -type f))
    
    for archive in "${config_archives[@]}"; do
        local archive_name=$(basename "$archive")
        local config_name=$(echo "$archive_name" | sed 's/^config-//' | sed 's/-[0-9]*-[0-9]*.tar.gz$//')
        
        log "INFO" "Restoring configuration: $config_name"
        
        if [[ "${DRY_RUN:-false}" == "true" ]]; then
            log "INFO" "[DRY RUN] Would restore configuration $config_name from $archive"
        else
            case "$config_name" in
                "ai-platform")
                    local target_dir="/etc/ai-platform"
                    ;;
                "sites-available")
                    local target_dir="/etc/nginx/sites-available"
                    ;;
                "ai-platform")
                    local target_dir="/etc/ssl/ai-platform"
                    ;;
                "prometheus")
                    local target_dir="/etc/prometheus"
                    ;;
                "grafana")
                    local target_dir="/etc/grafana"
                    ;;
                *)
                    log "WARN" "Unknown configuration: $config_name"
                    continue
                    ;;
            esac
            
            # Create backup of current configuration
            if [[ -e "$target_dir" ]]; then
                mv "$target_dir" "${target_dir}.backup.$(date +%Y%m%d-%H%M%S)" || {
                    log "ERROR" "Failed to backup current $config_name"
                    return 1
                }
            fi
            
            # Extract configuration
            mkdir -p "$(dirname "$target_dir")"
            tar -xzf "$archive" -C "$(dirname "$target_dir")" || {
                log "ERROR" "Failed to extract configuration $config_name"
                return 1
            }
            
            # Set proper ownership and permissions
            if [[ -e "$target_dir" ]]; then
                chown -R root:root "$target_dir" 2>/dev/null || true
                find "$target_dir" -type f -exec chmod 644 {} \; 2>/dev/null || true
                find "$target_dir" -type d -exec chmod 755 {} \; 2>/dev/null || true
            fi
        fi
    done
    
    # Restore Docker configurations
    local docker_info_files=($(find "$config_backup_dir" -name "docker-*.txt" -type f))
    if [[ ${#docker_info_files[@]} -gt 0 ]]; then
        log "INFO" "Docker configuration files found in backup"
        for file in "${docker_info_files[@]}"; do
            cp "$file" "$RECOVERY_WORKSPACE/logs/" || true
        done
    fi
    
    # Restore Kubernetes configurations
    local k8s_files=($(find "$config_backup_dir" -name "k8s-*.yaml" -type f))
    if [[ ${#k8s_files[@]} -gt 0 && "${DRY_RUN:-false}" != "true" ]]; then
        log "INFO" "Restoring Kubernetes configurations..."
        for k8s_file in "${k8s_files[@]}"; do
            if command -v kubectl >/dev/null 2>&1; then
                kubectl apply -f "$k8s_file" 2>/dev/null || log "WARN" "Failed to apply K8s config: $(basename "$k8s_file")"
            fi
        done
    fi
    
    log "INFO" "Configuration restoration completed"
}

# Restore certificates
restore_certificates() {
    log "INFO" "Starting certificate restoration..."
    
    local cert_backup_dir="$BACKUP_EXTRACT_DIR/certificates"
    
    if [[ ! -d "$cert_backup_dir" ]]; then
        log "WARN" "No certificate backup found in archive"
        return 0
    fi
    
    # Find certificate archives
    local cert_archives=($(find "$cert_backup_dir" -name "certs-*.tar.gz" -type f))
    
    for archive in "${cert_archives[@]}"; do
        local archive_name=$(basename "$archive")
        local cert_type=$(echo "$archive_name" | sed 's/^certs-//' | sed 's/-[0-9]*-[0-9]*.tar.gz$//')
        
        log "INFO" "Restoring certificates: $cert_type"
        
        if [[ "${DRY_RUN:-false}" == "true" ]]; then
            log "INFO" "[DRY RUN] Would restore certificates $cert_type from $archive"
        else
            case "$cert_type" in
                "ai-platform")
                    local target_dir="/etc/ssl/ai-platform"
                    ;;
                "letsencrypt")
                    local target_dir="/etc/letsencrypt"
                    ;;
                "ssl")
                    local target_dir="/etc/nginx/ssl"
                    ;;
                "certs")
                    local target_dir="${CERT_DIR:-/opt/ai-platform/certs}"
                    ;;
                *)
                    log "WARN" "Unknown certificate type: $cert_type"
                    continue
                    ;;
            esac
            
            # Create backup of current certificates
            if [[ -d "$target_dir" ]]; then
                mv "$target_dir" "${target_dir}.backup.$(date +%Y%m%d-%H%M%S)" || {
                    log "ERROR" "Failed to backup current certificates"
                    return 1
                }
            fi
            
            # Extract certificates
            mkdir -p "$(dirname "$target_dir")"
            tar -xzf "$archive" -C "$(dirname "$target_dir")" || {
                log "ERROR" "Failed to extract certificates $cert_type"
                return 1
            }
            
            # Set proper ownership and permissions
            if [[ -d "$target_dir" ]]; then
                chown -R root:root "$target_dir" 2>/dev/null || true
                find "$target_dir" -name "*.key" -exec chmod 600 {} \; 2>/dev/null || true
                find "$target_dir" -name "*.crt" -exec chmod 644 {} \; 2>/dev/null || true
                find "$target_dir" -name "*.pem" -exec chmod 644 {} \; 2>/dev/null || true
                find "$target_dir" -type d -exec chmod 755 {} \; 2>/dev/null || true
            fi
        fi
    done
    
    log "INFO" "Certificate restoration completed"
}

# Restore monitoring data
restore_monitoring() {
    log "INFO" "Starting monitoring data restoration..."
    
    local monitoring_backup_dir="$BACKUP_EXTRACT_DIR/monitoring"
    
    if [[ ! -d "$monitoring_backup_dir" ]]; then
        log "WARN" "No monitoring backup found in archive"
        return 0
    fi
    
    # Restore Prometheus data
    local prometheus_archives=($(find "$monitoring_backup_dir" -name "prometheus-data-*.tar.gz" -type f))
    for archive in "${prometheus_archives[@]}"; do
        log "INFO" "Restoring Prometheus data from: $(basename "$archive")"
        
        if [[ "${DRY_RUN:-false}" == "true" ]]; then
            log "INFO" "[DRY RUN] Would restore Prometheus data from $archive"
        else
            local target_dir="${PROMETHEUS_DATA_DIR:-/var/lib/prometheus}"
            
            # Stop Prometheus service
            systemctl stop prometheus 2>/dev/null || true
            
            # Backup current data
            if [[ -d "$target_dir" ]]; then
                mv "$target_dir" "${target_dir}.backup.$(date +%Y%m%d-%H%M%S)" || true
            fi
            
            # Extract Prometheus data
            mkdir -p "$(dirname "$target_dir")"
            tar -xzf "$archive" -C "$(dirname "$target_dir")" || {
                log "ERROR" "Failed to extract Prometheus data"
                return 1
            }
            
            # Set proper ownership
            chown -R prometheus:prometheus "$target_dir" 2>/dev/null || true
            
            # Start Prometheus service
            systemctl start prometheus 2>/dev/null || true
        fi
    done
    
    # Restore Grafana data
    local grafana_archives=($(find "$monitoring_backup_dir" -name "grafana-data-*.tar.gz" -type f))
    for archive in "${grafana_archives[@]}"; do
        log "INFO" "Restoring Grafana data from: $(basename "$archive")"
        
        if [[ "${DRY_RUN:-false}" == "true" ]]; then
            log "INFO" "[DRY RUN] Would restore Grafana data from $archive"
        else
            local target_dir="${GRAFANA_DATA_DIR:-/var/lib/grafana}"
            
            # Stop Grafana service
            systemctl stop grafana-server 2>/dev/null || true
            
            # Backup current data
            if [[ -d "$target_dir" ]]; then
                mv "$target_dir" "${target_dir}.backup.$(date +%Y%m%d-%H%M%S)" || true
            fi
            
            # Extract Grafana data
            mkdir -p "$(dirname "$target_dir")"
            tar -xzf "$archive" -C "$(dirname "$target_dir")" || {
                log "ERROR" "Failed to extract Grafana data"
                return 1
            }
            
            # Set proper ownership
            chown -R grafana:grafana "$target_dir" 2>/dev/null || true
            
            # Start Grafana service
            systemctl start grafana-server 2>/dev/null || true
        fi
    done
    
    log "INFO" "Monitoring data restoration completed"
}

# Post-recovery verification
verify_recovery() {
    log "INFO" "Starting post-recovery verification..."
    
    local verification_results=()
    
    # Database connectivity
    if command -v psql >/dev/null 2>&1; then
        if psql -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}" -c "SELECT 1;" >/dev/null 2>&1; then
            verification_results+=("✓ Database connectivity: PASS")
        else
            verification_results+=("✗ Database connectivity: FAIL")
        fi
    fi
    
    # Redis connectivity
    if command -v redis-cli >/dev/null 2>&1; then
        if redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" ping 2>/dev/null | grep -q PONG; then
            verification_results+=("✓ Redis connectivity: PASS")
        else
            verification_results+=("✗ Redis connectivity: FAIL")
        fi
    fi
    
    # Application files
    if [[ -d "${APP_ROOT:-/opt/ai-platform}" ]]; then
        verification_results+=("✓ Application files: PRESENT")
    else
        verification_results+=("✗ Application files: MISSING")
    fi
    
    # Configuration files
    if [[ -d "/etc/ai-platform" ]]; then
        verification_results+=("✓ Configuration files: PRESENT")
    else
        verification_results+=("✗ Configuration files: MISSING")
    fi
    
    # SSL certificates
    local cert_dirs=("/etc/ssl/ai-platform" "/etc/letsencrypt" "/etc/nginx/ssl")
    local cert_found=false
    for cert_dir in "${cert_dirs[@]}"; do
        if [[ -d "$cert_dir" ]]; then
            cert_found=true
            break
        fi
    done
    
    if [[ "$cert_found" == true ]]; then
        verification_results+=("✓ SSL certificates: PRESENT")
    else
        verification_results+=("✗ SSL certificates: MISSING")
    fi
    
    # Services status
    local services=("postgresql" "redis" "nginx" "docker")
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service" 2>/dev/null; then
            verification_results+=("✓ Service $service: RUNNING")
        else
            verification_results+=("✗ Service $service: NOT RUNNING")
        fi
    done
    
    # Print verification results
    log "INFO" "Recovery verification results:"
    for result in "${verification_results[@]}"; do
        log "INFO" "$result"
    done
    
    # Count failures
    local failures=$(printf '%s\n' "${verification_results[@]}" | grep -c "✗" || echo "0")
    
    if [[ $failures -eq 0 ]]; then
        log "INFO" "All verification checks passed"
        return 0
    else
        log "WARN" "$failures verification checks failed"
        return 1
    fi
}

# Generate recovery report
generate_recovery_report() {
    local report_file="${RECOVERY_WORKSPACE}/recovery-report-${RECOVERY_ID}.json"
    local end_time=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    cat > "$report_file" << EOF
{
    "recovery_summary": {
        "recovery_id": "${RECOVERY_ID}",
        "start_time": "${START_TIME}",
        "end_time": "${end_time}",
        "duration_seconds": $(($(date +%s) - $(date -d "${START_TIME}" +%s))),
        "recovery_mode": "${RECOVERY_MODE}",
        "backup_file": "$(basename "$BACKUP_FILE")",
        "dry_run": ${DRY_RUN:-false},
        "status": "${RECOVERY_STATUS:-completed}"
    },
    "system_state": {
        "hostname": "$(hostname)",
        "timestamp": "${end_time}",
        "recovery_workspace": "${RECOVERY_WORKSPACE}",
        "pre_recovery_snapshot": "$([ -d "${RECOVERY_WORKSPACE}/pre-recovery-snapshot" ] && echo "true" || echo "false")"
    },
    "components_restored": $(printf '%s\n' "${RESTORED_COMPONENTS[@]:-}" | jq -R . | jq -s . 2>/dev/null || echo "[]"),
    "verification_results": $(printf '%s\n' "${verification_results[@]:-}" | jq -R . | jq -s . 2>/dev/null || echo "[]")
}
EOF
    
    log "INFO" "Recovery report generated: $report_file"
}

# Interactive component selection
select_components_interactive() {
    log "INFO" "Interactive component selection mode"
    
    local available_components=()
    
    # Check what's available in the backup
    if [[ -d "$BACKUP_EXTRACT_DIR/database" ]]; then
        available_components+=("database")
    fi
    
    if [[ -d "$BACKUP_EXTRACT_DIR/redis" ]]; then
        available_components+=("redis")
    fi
    
    if [[ -d "$BACKUP_EXTRACT_DIR/application" ]]; then
        available_components+=("application")
    fi
    
    if [[ -d "$BACKUP_EXTRACT_DIR/configurations" ]]; then
        available_components+=("configurations")
    fi
    
    if [[ -d "$BACKUP_EXTRACT_DIR/certificates" ]]; then
        available_components+=("certificates")
    fi
    
    if [[ -d "$BACKUP_EXTRACT_DIR/monitoring" ]]; then
        available_components+=("monitoring")
    fi
    
    if [[ ${#available_components[@]} -eq 0 ]]; then
        log "ERROR" "No components found in backup"
        exit 1
    fi
    
    echo "Available components in backup:"
    for i in "${!available_components[@]}"; do
        echo "  $((i+1)). ${available_components[i]}"
    done
    
    echo "Select components to restore (comma-separated numbers, or 'all' for all components):"
    read -r selection
    
    SELECTED_COMPONENTS=()
    
    if [[ "$selection" == "all" ]]; then
        SELECTED_COMPONENTS=("${available_components[@]}")
    else
        IFS=',' read -ra selections <<< "$selection"
        for sel in "${selections[@]}"; do
            sel=$(echo "$sel" | tr -d ' ')
            if [[ "$sel" =~ ^[0-9]+$ ]] && [[ $sel -ge 1 ]] && [[ $sel -le ${#available_components[@]} ]]; then
                SELECTED_COMPONENTS+=("${available_components[$((sel-1))]}")
            else
                log "WARN" "Invalid selection: $sel"
            fi
        done
    fi
    
    if [[ ${#SELECTED_COMPONENTS[@]} -eq 0 ]]; then
        log "ERROR" "No valid components selected"
        exit 1
    fi
    
    log "INFO" "Selected components: ${SELECTED_COMPONENTS[*]}"
}

# Confirmation prompt
confirm_recovery() {
    if [[ "${FORCE:-false}" == "true" ]]; then
        return 0
    fi
    
    echo -e "${RED}WARNING: This operation will restore system components and may overwrite existing data.${NC}"
    echo "Recovery mode: $RECOVERY_MODE"
    echo "Backup file: $(basename "$BACKUP_FILE")"
    echo "Recovery workspace: $RECOVERY_WORKSPACE"
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        echo -e "${YELLOW}This is a DRY RUN - no actual changes will be made.${NC}"
    fi
    
    echo
    read -p "Do you want to proceed with the recovery? [y/N]: " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "INFO" "Recovery cancelled by user"
        exit 0
    fi
}

# Main recovery function
main() {
    local start_timestamp=$(date +%s)
    START_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    log "INFO" "Starting disaster recovery process - ID: ${RECOVERY_ID}"
    send_notification "DR_STARTED" "Disaster recovery process started - Mode: ${RECOVERY_MODE}"
    
    # Load configuration
    load_config
    
    # System checks
    perform_system_checks
    
    # Validate backup
    validate_backup "$BACKUP_FILE"
    
    # Setup recovery workspace
    setup_recovery_workspace
    
    # Create system snapshot
    create_system_snapshot
    
    # Confirmation
    confirm_recovery
    
    # Component selection for selective mode
    if [[ "$RECOVERY_MODE" == "selective" ]]; then
        select_components_interactive
    fi
    
    # Perform recovery based on mode
    RESTORED_COMPONENTS=()
    
    case "$RECOVERY_MODE" in
        "full")
            restore_database && RESTORED_COMPONENTS+=("database")
            restore_redis && RESTORED_COMPONENTS+=("redis")
            restore_application && RESTORED_COMPONENTS+=("application")
            restore_configurations && RESTORED_COMPONENTS+=("configurations")
            restore_certificates && RESTORED_COMPONENTS+=("certificates")
            restore_monitoring && RESTORED_COMPONENTS+=("monitoring")
            ;;
        "database")
            restore_database && RESTORED_COMPONENTS+=("database")
            ;;
        "application")
            restore_application && RESTORED_COMPONENTS+=("application")
            ;;
        "configuration")
            restore_configurations && RESTORED_COMPONENTS+=("configurations")
            ;;
        "selective")
            for component in "${SELECTED_COMPONENTS[@]}"; do
                case "$component" in
                    "database")
                        restore_database && RESTORED_COMPONENTS+=("database")
                        ;;
                    "redis")
                        restore_redis && RESTORED_COMPONENTS+=("redis")
                        ;;
                    "application")
                        restore_application && RESTORED_COMPONENTS+=("application")
                        ;;
                    "configurations")
                        restore_configurations && RESTORED_COMPONENTS+=("configurations")
                        ;;
                    "certificates")
                        restore_certificates && RESTORED_COMPONENTS+=("certificates")
                        ;;
                    "monitoring")
                        restore_monitoring && RESTORED_COMPONENTS+=("monitoring")
                        ;;
                esac
            done
            ;;
    esac
    
    # Post-recovery verification
    if verify_recovery; then
        RECOVERY_STATUS="completed"
    else
        RECOVERY_STATUS="completed_with_warnings"
    fi
    
    # Generate recovery report
    generate_recovery_report
    
    # Cleanup (optional)
    if [[ "${KEEP_WORKSPACE:-false}" != "true" ]]; then
        cleanup_recovery_workspace
    fi
    
    local duration=$(($(date +%s) - start_timestamp))
    
    log "INFO" "Disaster recovery completed - Status: $RECOVERY_STATUS, Duration: ${duration}s"
    send_notification "DR_COMPLETED" "Disaster recovery completed - Status: $RECOVERY_STATUS, Components: ${RESTORED_COMPONENTS[*]}, Duration: ${duration}s" \
        "$([ "$RECOVERY_STATUS" == "completed" ] && echo "SUCCESS" || echo "WARNING")"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    parse_arguments "$@"
    main
fi