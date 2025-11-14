#!/bin/bash
# Spirit Tours - PostgreSQL Restore Script
# Version: 1.0.0

set -e

# ============================================
# Configuration
# ============================================
BACKUP_DIR="/backup"
LOG_FILE="/var/log/backup/restore.log"

# Database configuration (from environment)
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-spirittours_db}"
DB_USER="${DB_USER:-spirittours}"
DB_PASSWORD="${DB_PASSWORD}"

# AWS S3 configuration
AWS_S3_BUCKET="${AWS_S3_BUCKET}"
S3_PATH="s3://${AWS_S3_BUCKET}/backups/postgres"

# ============================================
# Functions
# ============================================
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

list_backups() {
    log "Available backups:"
    echo "LOCAL BACKUPS:"
    ls -lh "$BACKUP_DIR"/spirittours_*.sql.gz 2>/dev/null || echo "No local backups found"
    
    if [ -n "$AWS_S3_BUCKET" ]; then
        echo ""
        echo "S3 BACKUPS:"
        aws s3 ls "$S3_PATH/" | grep spirittours_ || echo "No S3 backups found"
    fi
}

restore_backup() {
    local backup_file="$1"
    
    # Download from S3 if it's an S3 path
    if [[ "$backup_file" == s3://* ]]; then
        log "Downloading backup from S3..."
        local local_file="${BACKUP_DIR}/$(basename "$backup_file")"
        if ! aws s3 cp "$backup_file" "$local_file"; then
            log "ERROR: Failed to download backup from S3"
            exit 1
        fi
        backup_file="$local_file"
    fi
    
    # Verify file exists
    if [ ! -f "$backup_file" ]; then
        log "ERROR: Backup file not found: $backup_file"
        exit 1
    fi
    
    log "Restoring from: $backup_file"
    
    # Verify backup integrity
    log "Verifying backup integrity..."
    if ! gunzip -t "$backup_file"; then
        log "ERROR: Backup file is corrupted"
        exit 1
    fi
    
    # Warning prompt
    read -p "WARNING: This will DROP and recreate the database. Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log "Restore cancelled by user"
        exit 0
    fi
    
    # Drop existing connections
    log "Terminating existing database connections..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres <<EOF
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DB_NAME'
  AND pid <> pg_backend_pid();
EOF
    
    # Drop and recreate database
    log "Dropping and recreating database..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres <<EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
EOF
    
    # Restore backup
    log "Restoring database..."
    if gunzip -c "$backup_file" | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; then
        log "Restore completed successfully"
    else
        log "ERROR: Restore failed"
        exit 1
    fi
    
    # Verify restoration
    log "Verifying restoration..."
    local table_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    log "Restored $table_count tables"
    
    log "===== Restore completed successfully ====="
}

# ============================================
# Main
# ============================================
case "$1" in
    list)
        list_backups
        ;;
    restore)
        if [ -z "$2" ]; then
            echo "Usage: $0 restore <backup_file>"
            echo "       $0 restore latest"
            echo "       $0 list"
            exit 1
        fi
        
        if [ "$2" == "latest" ]; then
            LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/spirittours_*.sql.gz 2>/dev/null | head -1)
            if [ -z "$LATEST_BACKUP" ]; then
                log "ERROR: No local backups found"
                exit 1
            fi
            restore_backup "$LATEST_BACKUP"
        else
            restore_backup "$2"
        fi
        ;;
    *)
        echo "Usage: $0 {list|restore} [backup_file]"
        echo ""
        echo "Commands:"
        echo "  list                    - List available backups"
        echo "  restore <file>          - Restore from specific backup file"
        echo "  restore latest          - Restore from latest backup"
        echo ""
        echo "Examples:"
        echo "  $0 list"
        echo "  $0 restore /backup/spirittours_20240101_020000.sql.gz"
        echo "  $0 restore latest"
        echo "  $0 restore s3://bucket/backups/postgres/spirittours_20240101_020000.sql.gz"
        exit 1
        ;;
esac
