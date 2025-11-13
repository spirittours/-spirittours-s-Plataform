#!/bin/bash
################################################################################
# Spirit Tours - Disk Space Cleanup Script
# Safely cleans up Docker and application files
################################################################################

set -e

echo "=========================================="
echo "🧹 Spirit Tours - Disk Cleanup"
echo "=========================================="
echo ""

# Safety check
read -p "⚠️  This will clean Docker resources and logs. Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled"
    exit 1
fi

echo ""
echo "📊 Disk usage BEFORE cleanup:"
df -h / | tail -n 1
echo ""

# 1. Clean Docker system (safe - keeps running containers)
echo "🐳 Cleaning Docker system..."
echo "   Removing stopped containers..."
docker container prune -f
echo ""

echo "   Removing dangling images..."
docker image prune -f
echo ""

echo "   Removing unused volumes..."
docker volume prune -f
echo ""

echo "   Removing build cache..."
docker builder prune -f
echo ""

# 2. Clean old Docker images (keep only latest 3 versions)
echo "🖼️  Removing old Docker images..."
# Remove images older than 7 days (except currently used)
docker image prune -a --filter "until=168h" -f
echo ""

# 3. Clean application logs
echo "📝 Cleaning application logs..."
if [ -d "/opt/spirittours/app/logs" ]; then
    echo "   Truncating logs older than 7 days..."
    find /opt/spirittours/app/logs -type f -name "*.log" -mtime +7 -exec truncate -s 0 {} \;
    echo "   Removing old log archives..."
    find /opt/spirittours/app/logs -type f \( -name "*.log.*" -o -name "*.gz" \) -mtime +30 -delete
fi
echo ""

# 4. Clean Docker container logs (can grow huge)
echo "📋 Cleaning Docker container logs..."
docker ps -q | while read container_id; do
    log_file=$(docker inspect --format='{{.LogPath}}' $container_id)
    if [ -f "$log_file" ]; then
        log_size=$(du -h "$log_file" | cut -f1)
        echo "   Truncating log for container $container_id (was $log_size)..."
        truncate -s 0 "$log_file"
    fi
done
echo ""

# 5. Clean npm cache (if exists)
echo "📦 Cleaning npm cache..."
if command -v npm &> /dev/null; then
    npm cache clean --force 2>/dev/null || true
fi
echo ""

# 6. Clean Python cache
echo "🐍 Cleaning Python cache..."
if [ -d "/opt/spirittours/app" ]; then
    find /opt/spirittours/app -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find /opt/spirittours/app -type f -name "*.pyc" -delete 2>/dev/null || true
fi
echo ""

# 7. Clean build artifacts (keep only current build)
echo "🏗️  Cleaning old build artifacts..."
if [ -d "/opt/spirittours/app/frontend" ]; then
    # Clean old builds but keep current
    find /opt/spirittours/app/frontend -type d -name ".next" -mtime +7 -exec rm -rf {} + 2>/dev/null || true
fi
echo ""

# 8. Clean Git garbage
echo "📚 Optimizing Git repository..."
if [ -d "/opt/spirittours/app/.git" ]; then
    cd /opt/spirittours/app
    git gc --aggressive --prune=now 2>/dev/null || true
    cd - > /dev/null
fi
echo ""

# 9. Clean system temp files
echo "🗑️  Cleaning temporary files..."
find /tmp -type f -atime +7 -delete 2>/dev/null || true
echo ""

# 10. System log rotation
echo "📋 Rotating system logs..."
if command -v logrotate &> /dev/null; then
    logrotate -f /etc/logrotate.conf 2>/dev/null || true
fi
echo ""

echo "=========================================="
echo "✅ Cleanup Complete!"
echo "=========================================="
echo ""

echo "📊 Disk usage AFTER cleanup:"
df -h / | tail -n 1
echo ""

echo "🐳 Docker system usage AFTER cleanup:"
docker system df
echo ""

echo "💡 Recommendations:"
echo "   1. Set up log rotation for application logs"
echo "   2. Configure Docker log rotation"
echo "   3. Schedule weekly cleanup: cron job"
echo "   4. Monitor disk usage: df -h"
echo ""

echo "📝 To prevent future issues, add to crontab:"
echo "   0 2 * * 0 /opt/spirittours/app/cleanup_disk_space.sh"
echo "   (Runs every Sunday at 2 AM)"
echo ""
