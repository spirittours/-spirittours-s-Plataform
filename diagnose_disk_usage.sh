#!/bin/bash
################################################################################
# Spirit Tours - Disk Usage Diagnostic Script
# Analyzes disk usage and identifies space hogs
################################################################################

set -e

echo "=========================================="
echo "🔍 Spirit Tours - Disk Usage Analysis"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Note: Running without root. Some commands may not work."
    echo ""
fi

# 1. Overall disk usage
echo "📊 Overall Disk Usage:"
df -h / | tail -n 1
echo ""

# 2. Docker disk usage (most common culprit)
echo "🐳 Docker Disk Usage:"
docker system df -v
echo ""

# 3. Application directory size
echo "📁 Application Directory Size:"
if [ -d "/opt/spirittours/app" ]; then
    du -sh /opt/spirittours/app
    echo ""
    echo "   Breakdown by subdirectory:"
    du -sh /opt/spirittours/app/* 2>/dev/null | sort -hr | head -20
else
    echo "   ⚠️  /opt/spirittours/app not found"
fi
echo ""

# 4. Docker images
echo "🖼️  Docker Images:"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | head -20
echo ""

# 5. Docker containers (running and stopped)
echo "📦 Docker Containers:"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
echo ""

# 6. Docker volumes
echo "💾 Docker Volumes:"
docker volume ls
echo ""
echo "   Volume sizes:"
docker volume ls -q | xargs -I {} sh -c 'echo "Volume: {} - Size: $(docker volume inspect {} --format "{{.Mountpoint}}" | xargs du -sh 2>/dev/null || echo "N/A")"' 2>/dev/null
echo ""

# 7. Log files
echo "📝 Log Files:"
if [ -d "/opt/spirittours/app/logs" ]; then
    du -sh /opt/spirittours/app/logs
    echo "   Largest log files:"
    find /opt/spirittours/app/logs -type f -exec du -h {} \; 2>/dev/null | sort -hr | head -10
fi
echo ""

echo "   Docker container logs:"
docker ps -q | xargs -I {} sh -c 'echo "Container: $(docker inspect --format="{{.Name}}" {}) - Log size: $(du -sh $(docker inspect --format="{{.LogPath}}" {}) 2>/dev/null | cut -f1)"' 2>/dev/null
echo ""

# 8. Node modules (can be huge)
echo "📦 Node Modules:"
if [ -d "/opt/spirittours/app/frontend/node_modules" ]; then
    du -sh /opt/spirittours/app/frontend/node_modules
fi
if [ -d "/opt/spirittours/app/backend/node_modules" ]; then
    du -sh /opt/spirittours/app/backend/node_modules
fi
if [ -d "/opt/spirittours/app/node_modules" ]; then
    du -sh /opt/spirittours/app/node_modules
fi
echo ""

# 9. Build artifacts
echo "🏗️  Build Artifacts:"
if [ -d "/opt/spirittours/app/frontend/build" ]; then
    du -sh /opt/spirittours/app/frontend/build
fi
if [ -d "/opt/spirittours/app/frontend/.next" ]; then
    du -sh /opt/spirittours/app/frontend/.next
fi
if [ -d "/opt/spirittours/app/frontend/dist" ]; then
    du -sh /opt/spirittours/app/frontend/dist
fi
echo ""

# 10. Git directory (can grow large)
echo "📚 Git Repository:"
if [ -d "/opt/spirittours/app/.git" ]; then
    du -sh /opt/spirittours/app/.git
    echo "   Git objects:"
    du -sh /opt/spirittours/app/.git/objects
fi
echo ""

# 11. Temp files
echo "🗑️  Temporary Files:"
if [ -d "/tmp" ]; then
    echo "   /tmp directory:"
    du -sh /tmp 2>/dev/null || echo "   Cannot access /tmp"
fi
if [ -d "/var/tmp" ]; then
    echo "   /var/tmp directory:"
    du -sh /var/tmp 2>/dev/null || echo "   Cannot access /var/tmp"
fi
echo ""

# 12. System logs
echo "📋 System Logs:"
if [ -d "/var/log" ]; then
    du -sh /var/log 2>/dev/null || echo "   Cannot access /var/log"
    echo "   Largest system log files:"
    find /var/log -type f -exec du -h {} \; 2>/dev/null | sort -hr | head -10
fi
echo ""

# 13. Database files
echo "🗄️  Database Files:"
find /opt/spirittours/app -name "*.db" -o -name "*.sqlite" -o -name "*.sqlite3" 2>/dev/null | xargs du -h 2>/dev/null
echo ""

# 14. Top 20 largest files/directories
echo "📊 Top 20 Largest Items:"
du -ah /opt/spirittours 2>/dev/null | sort -hr | head -20
echo ""

# 15. Dangling Docker resources
echo "🧹 Docker Dangling Resources:"
echo "   Dangling images:"
docker images -f "dangling=true" -q | wc -l
echo "   Unused volumes:"
docker volume ls -f "dangling=true" -q | wc -l
echo "   Stopped containers:"
docker ps -a -f "status=exited" -q | wc -l
echo ""

echo "=========================================="
echo "✅ Diagnostic Complete"
echo "=========================================="
echo ""
echo "📝 Summary of potential issues to check:"
echo "   1. Check Docker images count (should be < 10)"
echo "   2. Check Docker volumes (unused volumes)"
echo "   3. Check log files (rotate if > 1GB)"
echo "   4. Check stopped containers (remove if not needed)"
echo "   5. Check node_modules size (should be < 1GB)"
echo ""
echo "🧹 To clean up, run: ./cleanup_disk_space.sh"
echo ""
