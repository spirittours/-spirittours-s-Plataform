# Spirit Tours - Backup Service Dockerfile
FROM postgres:15-alpine

# Install dependencies
RUN apk add --no-cache \
    aws-cli \
    curl \
    bash \
    gzip \
    tzdata

# Set timezone
ENV TZ=UTC

# Create backup directory
RUN mkdir -p /backup /scripts

# Copy backup scripts
COPY backup.sh /scripts/backup.sh
COPY restore.sh /scripts/restore.sh
RUN chmod +x /scripts/*.sh

# Setup cron
RUN echo "0 2 * * * /scripts/backup.sh >> /var/log/backup/backup.log 2>&1" > /etc/crontabs/root

# Start cron
CMD ["crond", "-f", "-l", "2"]
