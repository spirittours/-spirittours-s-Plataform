#!/bin/bash

# Spirit Tours AI Guide - Database Backup Script
# Automated PostgreSQL backup with compression and S3 upload (optional)

set -e

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/spirit-tours}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="${POSTGRES_DB:-spirit_tours_db}"
DB_USER="${POSTGRES_USER:-spirit_tours_user}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_$TIMESTAMP.sql"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🗄️  Spirit Tours Database Backup"
echo "================================"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}❌ pg_dump not found. Please install PostgreSQL client tools.${NC}"
    exit 1
fi

# Perform backup
echo "📦 Creating backup..."
echo "   Database: $DB_NAME"
echo "   Host: $DB_HOST:$DB_PORT"
echo "   User: $DB_USER"
echo "   File: $BACKUP_FILE"
echo ""

if PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c -b -v -f "$BACKUP_FILE" 2>&1; then
    echo -e "${GREEN}✅ Database backup created successfully${NC}"
    
    # Get file size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "   Backup size: $BACKUP_SIZE"
else
    echo -e "${RED}❌ Backup failed${NC}"
    exit 1
fi

# Compress backup
echo ""
echo "🗜️  Compressing backup..."
if gzip "$BACKUP_FILE"; then
    echo -e "${GREEN}✅ Backup compressed${NC}"
    COMPRESSED_FILE="${BACKUP_FILE}.gz"
    COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    echo "   Compressed size: $COMPRESSED_SIZE"
else
    echo -e "${RED}❌ Compression failed${NC}"
    COMPRESSED_FILE="$BACKUP_FILE"
fi

# Upload to S3 (optional)
if [ -n "$AWS_S3_BUCKET" ] && command -v aws &> /dev/null; then
    echo ""
    echo "☁️  Uploading to S3..."
    S3_PATH="s3://$AWS_S3_BUCKET/backups/postgres/$(basename $COMPRESSED_FILE)"
    
    if aws s3 cp "$COMPRESSED_FILE" "$S3_PATH"; then
        echo -e "${GREEN}✅ Backup uploaded to S3${NC}"
        echo "   S3 path: $S3_PATH"
    else
        echo -e "${YELLOW}⚠️  S3 upload failed (backup saved locally)${NC}"
    fi
fi

# Clean up old backups
echo ""
echo "🧹 Cleaning up old backups..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo -e "${GREEN}✅ Deleted $DELETED_COUNT old backup(s) (older than $RETENTION_DAYS days)${NC}"

# Backup summary
echo ""
echo "================================"
echo -e "${GREEN}🎉 Backup completed successfully!${NC}"
echo ""
echo "Summary:"
echo "   Backup file: $COMPRESSED_FILE"
echo "   Backup size: $COMPRESSED_SIZE"
echo "   Timestamp: $TIMESTAMP"
if [ -n "$AWS_S3_BUCKET" ]; then
    echo "   S3 backup: Enabled"
fi
echo "   Retention: $RETENTION_DAYS days"
echo ""

# Return backup file path for scripting
echo "$COMPRESSED_FILE"
