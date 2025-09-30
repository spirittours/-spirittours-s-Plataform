#!/bin/bash

# =============================================================================
# AI Multi-Model Platform - Automated Backup System
# Comprehensive backup solution for enterprise-grade systems
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_CONFIG_FILE="${BACKUP_CONFIG_FILE:-/etc/ai-platform/backup.conf}"
LOG_FILE="${LOG_FILE:-/var/log/ai-platform/backup.log}"
NOTIFICATION_WEBHOOK="${NOTIFICATION_WEBHOOK:-}"
ENCRYPTION_KEY_FILE="${ENCRYPTION_KEY_FILE:-/etc/ai-platform/backup.key}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
PARALLEL_JOBS="${PARALLEL_JOBS:-4}"

# Default backup targets
DEFAULT_BACKUP_TARGETS=(
    "database"
    "redis"
    "application"
    "configurations"
    "logs"
    "certificates"
    "monitoring"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
    log "ERROR" "Script failed with exit code ${exit_code} at line ${line_number}"
    send_notification "BACKUP_FAILED" "Automated backup failed with exit code ${exit_code} at line ${line_number}"
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
                \"backup_id\": \"${BACKUP_ID}\"
            }" || log "WARN" "Failed to send notification"
    fi
}

# Load configuration
load_config() {
    if [[ -f "${BACKUP_CONFIG_FILE}" ]]; then
        source "${BACKUP_CONFIG_FILE}"
        log "INFO" "Configuration loaded from ${BACKUP_CONFIG_FILE}"
    else
        log "WARN" "Configuration file not found, using defaults"
    fi
}

# Generate backup ID
BACKUP_ID="backup-$(date +%Y%m%d-%H%M%S)-$(hostname -s)"

# Create backup directories
create_backup_structure() {
    local base_dir="$1"
    
    mkdir -p "${base_dir}"/{database,redis,application,configurations,logs,certificates,monitoring}
    mkdir -p "${base_dir}/metadata"
    
    log "INFO" "Created backup directory structure at ${base_dir}"
}

# Database backup function
backup_database() {
    local backup_dir="$1"
    local db_backup_dir="${backup_dir}/database"
    
    log "INFO" "Starting database backup..."
    
    # PostgreSQL backup
    if command -v pg_dump >/dev/null 2>&1; then
        log "INFO" "Backing up PostgreSQL databases..."
        
        # Get list of databases
        databases=$(psql -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}" -t -c "SELECT datname FROM pg_database WHERE NOT datistemplate AND datname != 'postgres';" 2>/dev/null || echo "ai_platform")
        
        while IFS= read -r db; do
            db=$(echo "$db" | tr -d ' ')
            if [[ -n "$db" ]]; then
                log "INFO" "Backing up database: ${db}"
                pg_dump -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}" -d "${db}" \
                    --no-password --verbose --format=custom \
                    --file="${db_backup_dir}/${db}-$(date +%Y%m%d-%H%M%S).dump" || {
                    log "ERROR" "Failed to backup database: ${db}"
                    return 1
                }
            fi
        done <<< "$databases"
    fi
    
    # MongoDB backup (if applicable)
    if command -v mongodump >/dev/null 2>&1; then
        log "INFO" "Backing up MongoDB..."
        mongodump --host "${MONGO_HOST:-localhost:27017}" \
                  --out "${db_backup_dir}/mongodb-$(date +%Y%m%d-%H%M%S)" || {
            log "ERROR" "Failed to backup MongoDB"
            return 1
        }
    fi
    
    log "INFO" "Database backup completed"
}

# Redis backup function
backup_redis() {
    local backup_dir="$1"
    local redis_backup_dir="${backup_dir}/redis"
    
    log "INFO" "Starting Redis backup..."
    
    if command -v redis-cli >/dev/null 2>&1; then
        # Force a background save
        redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" BGSAVE || {
            log "ERROR" "Failed to initiate Redis background save"
            return 1
        }
        
        # Wait for background save to complete
        while [[ $(redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" LASTSAVE) == $(redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" LASTSAVE) ]]; do
            sleep 1
        done
        
        # Copy RDB file
        local redis_data_dir="${REDIS_DATA_DIR:-/var/lib/redis}"
        if [[ -f "${redis_data_dir}/dump.rdb" ]]; then
            cp "${redis_data_dir}/dump.rdb" "${redis_backup_dir}/redis-$(date +%Y%m%d-%H%M%S).rdb"
            log "INFO" "Redis backup completed"
        else
            log "WARN" "Redis RDB file not found"
        fi
    else
        log "WARN" "Redis CLI not available, skipping Redis backup"
    fi
}

# Application backup function
backup_application() {
    local backup_dir="$1"
    local app_backup_dir="${backup_dir}/application"
    
    log "INFO" "Starting application backup..."
    
    # Application code and assets
    local app_paths=(
        "${APP_ROOT:-/opt/ai-platform}"
        "${UPLOAD_DIR:-/var/lib/ai-platform/uploads}"
        "${STATIC_DIR:-/var/lib/ai-platform/static}"
    )
    
    for path in "${app_paths[@]}"; do
        if [[ -d "$path" ]]; then
            local basename=$(basename "$path")
            log "INFO" "Backing up application path: ${path}"
            tar -czf "${app_backup_dir}/${basename}-$(date +%Y%m%d-%H%M%S).tar.gz" -C "$(dirname "$path")" "$basename" || {
                log "ERROR" "Failed to backup application path: ${path}"
                return 1
            }
        fi
    done
    
    log "INFO" "Application backup completed"
}

# Configuration backup function
backup_configurations() {
    local backup_dir="$1"
    local config_backup_dir="${backup_dir}/configurations"
    
    log "INFO" "Starting configuration backup..."
    
    # System configurations
    local config_paths=(
        "/etc/ai-platform"
        "/etc/nginx/sites-available"
        "/etc/ssl/ai-platform"
        "${HOME}/.kube/config"
        "/etc/prometheus"
        "/etc/grafana"
    )
    
    for path in "${config_paths[@]}"; do
        if [[ -e "$path" ]]; then
            local basename=$(basename "$path")
            local dirname=$(dirname "$path")
            log "INFO" "Backing up configuration: ${path}"
            tar -czf "${config_backup_dir}/config-${basename}-$(date +%Y%m%d-%H%M%S).tar.gz" -C "$dirname" "$basename" 2>/dev/null || {
                log "WARN" "Failed to backup configuration: ${path}"
            }
        fi
    done
    
    # Docker configurations
    if command -v docker >/dev/null 2>&1; then
        docker system df > "${config_backup_dir}/docker-system-info-$(date +%Y%m%d-%H%M%S).txt" 2>/dev/null || true
        docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.Size}}" > "${config_backup_dir}/docker-images-$(date +%Y%m%d-%H%M%S).txt" 2>/dev/null || true
    fi
    
    # Kubernetes configurations
    if command -v kubectl >/dev/null 2>&1; then
        kubectl get all --all-namespaces -o yaml > "${config_backup_dir}/k8s-resources-$(date +%Y%m%d-%H%M%S).yaml" 2>/dev/null || true
        kubectl get configmaps --all-namespaces -o yaml > "${config_backup_dir}/k8s-configmaps-$(date +%Y%m%d-%H%M%S).yaml" 2>/dev/null || true
        kubectl get secrets --all-namespaces -o yaml > "${config_backup_dir}/k8s-secrets-$(date +%Y%m%d-%H%M%S).yaml" 2>/dev/null || true
    fi
    
    log "INFO" "Configuration backup completed"
}

# Logs backup function
backup_logs() {
    local backup_dir="$1"
    local logs_backup_dir="${backup_dir}/logs"
    
    log "INFO" "Starting logs backup..."
    
    # Application logs
    local log_paths=(
        "/var/log/ai-platform"
        "/var/log/nginx"
        "/var/log/postgresql"
        "/var/log/redis"
        "${APP_ROOT:-/opt/ai-platform}/logs"
    )
    
    for path in "${log_paths[@]}"; do
        if [[ -d "$path" ]]; then
            local basename=$(basename "$path")
            log "INFO" "Backing up logs: ${path}"
            # Compress logs older than 1 day
            find "$path" -name "*.log" -mtime +1 -type f -exec gzip {} \; 2>/dev/null || true
            tar -czf "${logs_backup_dir}/logs-${basename}-$(date +%Y%m%d-%H%M%S).tar.gz" -C "$(dirname "$path")" "$basename" || {
                log "WARN" "Failed to backup logs: ${path}"
            }
        fi
    done
    
    # Docker logs
    if command -v docker >/dev/null 2>&1; then
        docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" > "${logs_backup_dir}/docker-containers-$(date +%Y%m%d-%H%M%S).txt" || true
    fi
    
    log "INFO" "Logs backup completed"
}

# Certificates backup function
backup_certificates() {
    local backup_dir="$1"
    local certs_backup_dir="${backup_dir}/certificates"
    
    log "INFO" "Starting certificates backup..."
    
    # SSL certificates
    local cert_paths=(
        "/etc/ssl/ai-platform"
        "/etc/letsencrypt"
        "/etc/nginx/ssl"
        "${CERT_DIR:-/opt/ai-platform/certs}"
    )
    
    for path in "${cert_paths[@]}"; do
        if [[ -d "$path" ]]; then
            local basename=$(basename "$path")
            log "INFO" "Backing up certificates: ${path}"
            tar -czf "${certs_backup_dir}/certs-${basename}-$(date +%Y%m%d-%H%M%S).tar.gz" -C "$(dirname "$path")" "$basename" || {
                log "WARN" "Failed to backup certificates: ${path}"
            }
        fi
    done
    
    log "INFO" "Certificates backup completed"
}

# Monitoring data backup function
backup_monitoring() {
    local backup_dir="$1"
    local monitoring_backup_dir="${backup_dir}/monitoring"
    
    log "INFO" "Starting monitoring backup..."
    
    # Prometheus data
    if [[ -d "${PROMETHEUS_DATA_DIR:-/var/lib/prometheus}" ]]; then
        log "INFO" "Backing up Prometheus data..."
        tar -czf "${monitoring_backup_dir}/prometheus-data-$(date +%Y%m%d-%H%M%S).tar.gz" \
            -C "$(dirname "${PROMETHEUS_DATA_DIR:-/var/lib/prometheus}")" \
            "$(basename "${PROMETHEUS_DATA_DIR:-/var/lib/prometheus}")" || {
            log "WARN" "Failed to backup Prometheus data"
        }
    fi
    
    # Grafana data
    if [[ -d "${GRAFANA_DATA_DIR:-/var/lib/grafana}" ]]; then
        log "INFO" "Backing up Grafana data..."
        tar -czf "${monitoring_backup_dir}/grafana-data-$(date +%Y%m%d-%H%M%S).tar.gz" \
            -C "$(dirname "${GRAFANA_DATA_DIR:-/var/lib/grafana}")" \
            "$(basename "${GRAFANA_DATA_DIR:-/var/lib/grafana}")" || {
            log "WARN" "Failed to backup Grafana data"
        }
    fi
    
    log "INFO" "Monitoring backup completed"
}

# Create backup metadata
create_backup_metadata() {
    local backup_dir="$1"
    local metadata_file="${backup_dir}/metadata/backup_info.json"
    
    cat > "$metadata_file" << EOF
{
    "backup_id": "${BACKUP_ID}",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "hostname": "$(hostname)",
    "backup_type": "full",
    "retention_days": ${RETENTION_DAYS},
    "encryption": "$([ -f "${ENCRYPTION_KEY_FILE}" ] && echo "enabled" || echo "disabled")",
    "system_info": {
        "os": "$(uname -s)",
        "architecture": "$(uname -m)",
        "kernel": "$(uname -r)",
        "uptime": "$(uptime -p 2>/dev/null || echo "unknown")"
    },
    "backup_targets": $(printf '%s\n' "${DEFAULT_BACKUP_TARGETS[@]}" | jq -R . | jq -s .),
    "backup_size": "$(du -sh "${backup_dir}" 2>/dev/null | cut -f1 || echo "unknown")",
    "file_count": $(find "${backup_dir}" -type f | wc -l)
}
EOF
    
    log "INFO" "Backup metadata created"
}

# Encrypt backup
encrypt_backup() {
    local backup_dir="$1"
    
    if [[ -f "${ENCRYPTION_KEY_FILE}" ]]; then
        log "INFO" "Encrypting backup archive..."
        
        local archive_name="${BACKUP_ID}.tar.gz"
        local encrypted_name="${BACKUP_ID}.tar.gz.enc"
        
        # Create archive
        tar -czf "${BACKUP_BASE_DIR}/${archive_name}" -C "$(dirname "${backup_dir}")" "$(basename "${backup_dir}")" || {
            log "ERROR" "Failed to create backup archive"
            return 1
        }
        
        # Encrypt archive
        openssl enc -aes-256-gcm -salt -in "${BACKUP_BASE_DIR}/${archive_name}" \
            -out "${BACKUP_BASE_DIR}/${encrypted_name}" \
            -pass file:"${ENCRYPTION_KEY_FILE}" || {
            log "ERROR" "Failed to encrypt backup"
            return 1
        }
        
        # Remove unencrypted archive
        rm -f "${BACKUP_BASE_DIR}/${archive_name}"
        
        # Remove unencrypted backup directory
        rm -rf "${backup_dir}"
        
        log "INFO" "Backup encrypted successfully: ${encrypted_name}"
    else
        log "INFO" "Encryption key not found, backup will remain unencrypted"
        
        # Just create archive without encryption
        local archive_name="${BACKUP_ID}.tar.gz"
        tar -czf "${BACKUP_BASE_DIR}/${archive_name}" -C "$(dirname "${backup_dir}")" "$(basename "${backup_dir}")" || {
            log "ERROR" "Failed to create backup archive"
            return 1
        }
        
        # Remove backup directory
        rm -rf "${backup_dir}"
        
        log "INFO" "Backup archived successfully: ${archive_name}"
    fi
}

# Upload backup to remote storage
upload_backup() {
    local backup_file="$1"
    
    if [[ -n "${REMOTE_STORAGE_URL:-}" ]]; then
        log "INFO" "Uploading backup to remote storage..."
        
        case "${REMOTE_STORAGE_TYPE:-s3}" in
            "s3")
                if command -v aws >/dev/null 2>&1; then
                    aws s3 cp "$backup_file" "${REMOTE_STORAGE_URL}/" || {
                        log "ERROR" "Failed to upload backup to S3"
                        return 1
                    }
                else
                    log "ERROR" "AWS CLI not available for S3 upload"
                    return 1
                fi
                ;;
            "gcs")
                if command -v gsutil >/dev/null 2>&1; then
                    gsutil cp "$backup_file" "${REMOTE_STORAGE_URL}/" || {
                        log "ERROR" "Failed to upload backup to GCS"
                        return 1
                    }
                else
                    log "ERROR" "gsutil not available for GCS upload"
                    return 1
                fi
                ;;
            "rsync")
                rsync -avz --progress "$backup_file" "${REMOTE_STORAGE_URL}/" || {
                    log "ERROR" "Failed to upload backup via rsync"
                    return 1
                }
                ;;
            *)
                log "WARN" "Unknown remote storage type: ${REMOTE_STORAGE_TYPE}"
                ;;
        esac
        
        log "INFO" "Backup uploaded successfully"
    else
        log "INFO" "No remote storage configured, keeping local backup only"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "INFO" "Starting backup cleanup (retention: ${RETENTION_DAYS} days)..."
    
    # Local cleanup
    find "${BACKUP_BASE_DIR}" -name "backup-*.tar.gz*" -mtime +${RETENTION_DAYS} -type f -delete 2>/dev/null || true
    
    # Remote cleanup (if configured)
    if [[ -n "${REMOTE_STORAGE_URL:-}" ]]; then
        case "${REMOTE_STORAGE_TYPE:-s3}" in
            "s3")
                if command -v aws >/dev/null 2>&1; then
                    aws s3 ls "${REMOTE_STORAGE_URL}/" | while read -r line; do
                        file_date=$(echo "$line" | awk '{print $1}')
                        file_name=$(echo "$line" | awk '{print $4}')
                        if [[ -n "$file_date" && -n "$file_name" ]]; then
                            if [[ $(date -d "$file_date" +%s) -lt $(date -d "${RETENTION_DAYS} days ago" +%s) ]]; then
                                aws s3 rm "${REMOTE_STORAGE_URL}/${file_name}" || true
                            fi
                        fi
                    done
                fi
                ;;
        esac
    fi
    
    log "INFO" "Backup cleanup completed"
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    log "INFO" "Verifying backup integrity..."
    
    if [[ "$backup_file" == *.enc ]]; then
        # Verify encrypted backup
        if [[ -f "${ENCRYPTION_KEY_FILE}" ]]; then
            openssl enc -aes-256-gcm -d -in "$backup_file" \
                -pass file:"${ENCRYPTION_KEY_FILE}" | tar -tz >/dev/null 2>&1 || {
                log "ERROR" "Backup verification failed"
                return 1
            }
        else
            log "WARN" "Cannot verify encrypted backup without encryption key"
        fi
    else
        # Verify unencrypted backup
        tar -tzf "$backup_file" >/dev/null 2>&1 || {
            log "ERROR" "Backup verification failed"
            return 1
        }
    fi
    
    log "INFO" "Backup verification successful"
}

# Generate backup report
generate_backup_report() {
    local backup_file="$1"
    local report_file="${BACKUP_BASE_DIR}/backup-report-$(date +%Y%m%d-%H%M%S).json"
    
    local backup_size=$(ls -lh "$backup_file" | awk '{print $5}')
    local backup_size_bytes=$(ls -l "$backup_file" | awk '{print $5}')
    local end_time=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    cat > "$report_file" << EOF
{
    "backup_summary": {
        "backup_id": "${BACKUP_ID}",
        "start_time": "${START_TIME}",
        "end_time": "${end_time}",
        "duration_seconds": $(($(date +%s) - $(date -d "${START_TIME}" +%s))),
        "status": "completed",
        "backup_file": "$(basename "$backup_file")",
        "backup_size_human": "${backup_size}",
        "backup_size_bytes": ${backup_size_bytes},
        "encryption_enabled": $([ -f "${ENCRYPTION_KEY_FILE}" ] && echo "true" || echo "false"),
        "remote_upload": $([ -n "${REMOTE_STORAGE_URL:-}" ] && echo "true" || echo "false")
    },
    "system_state": {
        "hostname": "$(hostname)",
        "timestamp": "${end_time}",
        "disk_usage": $(df -h "${BACKUP_BASE_DIR}" | tail -1 | awk '{print "{\"filesystem\":\"" $1 "\",\"size\":\"" $2 "\",\"used\":\"" $3 "\",\"available\":\"" $4 "\",\"use_percent\":\"" $5 "\"}"}'),
        "memory_usage": $(free -h | grep '^Mem:' | awk '{print "{\"total\":\"" $2 "\",\"used\":\"" $3 "\",\"free\":\"" $4 "\",\"available\":\"" $7 "\"}"}')
    }
}
EOF
    
    log "INFO" "Backup report generated: ${report_file}"
}

# Main backup function
main() {
    local start_timestamp=$(date +%s)
    START_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    log "INFO" "Starting automated backup process - ID: ${BACKUP_ID}"
    send_notification "BACKUP_STARTED" "Automated backup process started"
    
    # Load configuration
    load_config
    
    # Set backup base directory
    BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-/var/backups/ai-platform}"
    mkdir -p "${BACKUP_BASE_DIR}"
    
    # Create backup directory
    local backup_dir="${BACKUP_BASE_DIR}/${BACKUP_ID}"
    create_backup_structure "$backup_dir"
    
    # Perform backups
    local failed_backups=()
    
    for target in "${DEFAULT_BACKUP_TARGETS[@]}"; do
        log "INFO" "Processing backup target: ${target}"
        case "$target" in
            "database")
                backup_database "$backup_dir" || failed_backups+=("database")
                ;;
            "redis")
                backup_redis "$backup_dir" || failed_backups+=("redis")
                ;;
            "application")
                backup_application "$backup_dir" || failed_backups+=("application")
                ;;
            "configurations")
                backup_configurations "$backup_dir" || failed_backups+=("configurations")
                ;;
            "logs")
                backup_logs "$backup_dir" || failed_backups+=("logs")
                ;;
            "certificates")
                backup_certificates "$backup_dir" || failed_backups+=("certificates")
                ;;
            "monitoring")
                backup_monitoring "$backup_dir" || failed_backups+=("monitoring")
                ;;
        esac
    done
    
    # Create backup metadata
    create_backup_metadata "$backup_dir"
    
    # Encrypt and archive backup
    encrypt_backup "$backup_dir"
    
    # Determine final backup file
    local backup_file
    if [[ -f "${BACKUP_BASE_DIR}/${BACKUP_ID}.tar.gz.enc" ]]; then
        backup_file="${BACKUP_BASE_DIR}/${BACKUP_ID}.tar.gz.enc"
    else
        backup_file="${BACKUP_BASE_DIR}/${BACKUP_ID}.tar.gz"
    fi
    
    # Verify backup
    verify_backup "$backup_file"
    
    # Upload to remote storage
    upload_backup "$backup_file"
    
    # Generate backup report
    generate_backup_report "$backup_file"
    
    # Cleanup old backups
    cleanup_old_backups
    
    local duration=$(($(date +%s) - start_timestamp))
    
    if [[ ${#failed_backups[@]} -eq 0 ]]; then
        log "INFO" "Backup completed successfully in ${duration} seconds"
        send_notification "BACKUP_COMPLETED" "Backup completed successfully - Duration: ${duration}s, File: $(basename "$backup_file")" "SUCCESS"
    else
        log "WARN" "Backup completed with failures: ${failed_backups[*]}"
        send_notification "BACKUP_PARTIAL" "Backup completed with failures in: ${failed_backups[*]} - Duration: ${duration}s" "WARNING"
    fi
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi