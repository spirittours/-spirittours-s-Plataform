#!/bin/bash
# Spirit Tours - PostgreSQL Backup Script
# Version: 1.0.0
# Runs daily at 2 AM UTC

set -e

# ============================================
# Configuration
# ============================================
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/backup"
BACKUP_FILE="${BACKUP_DIR}/spirittours_${TIMESTAMP}.sql.gz"
LOG_FILE="/var/log/backup/backup.log"

# Database configuration (from environment)
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-spirittours_db}"
DB_USER="${DB_USER:-spirittours}"
DB_PASSWORD="${DB_PASSWORD}"

# AWS S3 configuration
AWS_S3_BUCKET="${AWS_S3_BUCKET}"
S3_PATH="s3://${AWS_S3_BUCKET}/backups/postgres"

# Retention policy
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Slack webhook for notifications
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL}"

# ============================================
# Functions
# ============================================
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

send_slack_notification() {
    local status="$1"
    local message="$2"
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local color="good"
        if [ "$status" == "error" ]; then
            color="danger"
        fi
        
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"Spirit Tours Backup $status\",
                    \"text\": \"$message\",
                    \"ts\": $(date +%s)
                }]
            }" 2>&1 | tee -a "$LOG_FILE"
    fi
}

cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Local cleanup
    find "$BACKUP_DIR" -name "spirittours_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    
    # S3 cleanup (if AWS configured)
    if [ -n "$AWS_S3_BUCKET" ]; then
        aws s3 ls "$S3_PATH/" | while read -r line; do
            backup_date=$(echo "$line" | awk '{print $1}')
            backup_file=$(echo "$line" | awk '{print $4}')
            
            if [ -n "$backup_date" ]; then
                backup_epoch=$(date -d "$backup_date" +%s)
                current_epoch=$(date +%s)
                days_old=$(( (current_epoch - backup_epoch) / 86400 ))
                
                if [ $days_old -gt $RETENTION_DAYS ]; then
                    log "Deleting old S3 backup: $backup_file (${days_old} days old)"
                    aws s3 rm "${S3_PATH}/${backup_file}"
                fi
            fi
        done
    fi
}

# ============================================
# Main Backup Process
# ============================================
log "===== Starting backup process ====="
log "Backup file: $BACKUP_FILE"

# Check if PostgreSQL is accessible
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>&1 | tee -a "$LOG_FILE"; then
    log "ERROR: Cannot connect to PostgreSQL"
    send_slack_notification "error" "Cannot connect to PostgreSQL database"
    exit 1
fi

# Create backup
log "Creating database dump..."
if PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=plain \
    --no-owner \
    --no-acl \
    --verbose \
    2>&1 | gzip > "$BACKUP_FILE"; then
    
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | awk '{print $1}')
    log "Backup created successfully: $BACKUP_FILE ($BACKUP_SIZE)"
else
    log "ERROR: Backup failed"
    send_slack_notification "error" "Database backup failed"
    exit 1
fi

# Verify backup
log "Verifying backup integrity..."
if gunzip -t "$BACKUP_FILE" 2>&1 | tee -a "$LOG_FILE"; then
    log "Backup verification successful"
else
    log "ERROR: Backup verification failed"
    send_slack_notification "error" "Backup file is corrupted"
    exit 1
fi

# Upload to S3 (if configured)
if [ -n "$AWS_S3_BUCKET" ]; then
    log "Uploading backup to S3: $S3_PATH/"
    if aws s3 cp "$BACKUP_FILE" "$S3_PATH/" \
        --storage-class STANDARD_IA \
        --metadata "timestamp=$TIMESTAMP,database=$DB_NAME" 2>&1 | tee -a "$LOG_FILE"; then
        log "S3 upload successful"
    else
        log "ERROR: S3 upload failed"
        send_slack_notification "error" "Failed to upload backup to S3"
        exit 1
    fi
fi

# Cleanup old backups
cleanup_old_backups

# Success notification
log "===== Backup process completed successfully ====="
send_slack_notification "success" "Database backup completed successfully. Size: $BACKUP_SIZE"

exit 0
