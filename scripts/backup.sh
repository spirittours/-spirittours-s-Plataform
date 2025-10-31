#!/bin/bash

# Automated Backup Script for Spirit Tours
# Creates backups of database, files, and configurations

set -e

# Configuration
BACKUP_DIR="/backups"
BACKUP_RETENTION_DAYS=30
S3_BUCKET="${AWS_S3_BUCKET:-spirit-tours-backups}"
TIMESTAMP=$(date +'%Y%m%d-%H%M%S')
BACKUP_NAME="spirit-tours-backup-${TIMESTAMP}"

# Create backup directory
mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}"
cd "${BACKUP_DIR}/${BACKUP_NAME}"

# Backup database
echo "Backing up database..."
docker-compose exec -T postgres pg_dump -U postgres spirit_tours > database.sql
gzip database.sql

# Backup Redis
echo "Backing up Redis..."
docker-compose exec -T redis redis-cli BGSAVE
sleep 2
docker cp spirit_tours_redis:/data/dump.rdb redis-dump.rdb

# Backup application files
echo "Backing up application files..."
tar -czf application.tar.gz \
    --exclude='node_modules' \
    --exclude='__pycache__' \
    --exclude='.git' \
    --exclude='*.log' \
    /home/user/webapp/backend \
    /home/user/webapp/frontend/src \
    /home/user/webapp/frontend/public

# Backup configurations
echo "Backing up configurations..."
tar -czf configs.tar.gz \
    /home/user/webapp/.env \
    /home/user/webapp/docker-compose.yml \
    /home/user/webapp/nginx.conf \
    /etc/nginx/sites-enabled/ \
    2>/dev/null || true

# Create single archive
cd ..
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}/"

# Upload to S3 if configured
if [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
    echo "Uploading to S3..."
    aws s3 cp "${BACKUP_NAME}.tar.gz" "s3://${S3_BUCKET}/${BACKUP_NAME}.tar.gz"
fi

# Clean up old backups
echo "Cleaning old backups..."
find ${BACKUP_DIR} -name "spirit-tours-backup-*.tar.gz" -mtime +${BACKUP_RETENTION_DAYS} -delete

# Clean up temporary directory
rm -rf "${BACKUP_NAME}"

echo "✅ Backup completed: ${BACKUP_NAME}.tar.gz"

# Send notification
curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"✅ Spirit Tours backup completed successfully: ${BACKUP_NAME}\"}" \
    ${SLACK_WEBHOOK_URL} 2>/dev/null || true