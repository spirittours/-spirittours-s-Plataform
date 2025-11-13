# 💾 Disk Space Management Guide

## 🚨 Problem: 80 GB Disk Usage

Your Spirit Tours platform is using **80 GB** of disk space, which is **10-15x more than normal**. This guide explains why and how to fix it.

---

## 📊 Expected vs Actual Disk Usage

### **Normal Disk Usage (Expected):**
```
Total: 5-10 GB maximum

Breakdown:
├── OS (Ubuntu): 2-3 GB
├── Docker images: 1-2 GB
├── Application code: 50-200 MB
├── Node modules: 500 MB - 1 GB
├── Python deps: 200-500 MB
├── Logs: 100-500 MB
├── SQLite database: 10-50 MB
└── Docker volumes: 100-500 MB
```

### **Your Current Usage:**
```
Total: ~80 GB ❌ ABNORMAL

Likely breakdown:
├── Docker images (old versions): 20-30 GB ⚠️
├── Docker logs (not rotated): 15-25 GB ⚠️
├── Stopped containers: 5-10 GB ⚠️
├── Unused volumes: 3-5 GB ⚠️
├── Build artifacts: 2-3 GB ⚠️
├── Application code: 200 MB ✅
└── Normal files: 1-2 GB ✅
```

---

## 🔍 Common Causes of Disk Space Issues

### **1. Docker Logs (Most Common - 50-70% of waste)**
```
Problem: Container logs grow indefinitely without rotation
Location: /var/lib/docker/containers/*/
Size: Can grow to 10-20 GB per container
Solution: Truncate logs and enable log rotation
```

### **2. Old Docker Images (20-30% of waste)**
```
Problem: Every rebuild creates a new image
Each build: ~500 MB - 2 GB
After 20 builds: 10-40 GB wasted
Solution: Remove old/unused images
```

### **3. Stopped Containers (10-15% of waste)**
```
Problem: Old containers not removed after stop
Each container: 100-500 MB
After weeks of development: 5-10 GB
Solution: Prune stopped containers
```

### **4. Dangling Volumes (5-10% of waste)**
```
Problem: Volumes from deleted containers remain
Solution: Remove unused volumes
```

### **5. Build Artifacts (5% of waste)**
```
Problem: Old frontend builds accumulate
Location: frontend/build, frontend/.next, frontend/dist
Solution: Clean old builds
```

---

## 🛠️ Step-by-Step Fix

### **Step 1: Diagnose the Problem**

Run the diagnostic script to identify space hogs:

```bash
ssh root@138.197.6.239
cd /opt/spirittours/app
git pull origin main
./diagnose_disk_usage.sh
```

This will show:
- ✅ Overall disk usage
- ✅ Docker images and their sizes
- ✅ Container sizes (running and stopped)
- ✅ Volume sizes
- ✅ Log file sizes
- ✅ Top 20 largest files/directories

**Expected output:**
```
🐳 Docker Disk Usage:
TYPE                TOTAL   ACTIVE   SIZE    RECLAIMABLE
Images              15      3        25GB    20GB (80%)    ⚠️ HIGH
Containers          10      3        5GB     3GB (60%)     ⚠️ HIGH
Local Volumes       8       3        2GB     1GB (50%)     ⚠️
Build Cache         0       0        0B      0B

📝 Log Files:
/var/lib/docker/containers/.../json.log: 15GB  ⚠️ HUGE
/opt/spirittours/app/logs/app.log: 2.5GB       ⚠️ LARGE
```

---

### **Step 2: Clean Up (Safe)**

Run the cleanup script (automatically cleans safe items):

```bash
cd /opt/spirittours/app
./cleanup_disk_space.sh
```

**What it does (all safe):**
1. ✅ Removes stopped containers
2. ✅ Removes dangling images (unused)
3. ✅ Removes unused volumes
4. ✅ Truncates Docker container logs
5. ✅ Cleans npm cache
6. ✅ Removes Python `__pycache__`
7. ✅ Cleans old build artifacts (>7 days)
8. ✅ Optimizes Git repository
9. ✅ Cleans temp files

**What it DOES NOT do (requires manual action):**
- ❌ Does NOT stop running containers
- ❌ Does NOT remove current images
- ❌ Does NOT delete application code
- ❌ Does NOT remove current volumes

**Expected space recovery:** 40-60 GB

---

### **Step 3: Configure Log Rotation (Prevent Future Issues)**

Create Docker log rotation config:

```bash
cat > /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Restart Docker to apply
systemctl restart docker

# Restart your containers
cd /opt/spirittours/app
docker-compose -f docker-compose.digitalocean.yml restart
```

This limits each container log to **3 files × 10 MB = 30 MB max**

---

### **Step 4: Schedule Weekly Cleanup (Automation)**

Add to crontab for automatic weekly cleanup:

```bash
crontab -e

# Add this line:
0 2 * * 0 /opt/spirittours/app/cleanup_disk_space.sh > /var/log/spirit-tours-cleanup.log 2>&1
```

This runs cleanup every Sunday at 2 AM.

---

## 📊 Verification

### **Before Cleanup:**
```bash
df -h /
```
Expected: **80 GB used** ❌

### **After Cleanup:**
```bash
df -h /
```
Expected: **5-15 GB used** ✅

### **Check Docker Usage:**
```bash
docker system df
```
Expected after cleanup:
```
TYPE            TOTAL   SIZE    RECLAIMABLE
Images          3-5     1-2GB   100-500MB
Containers      3       200MB   0B
Volumes         3       100MB   0B
Build Cache     0       0B      0B
```

---

## 🎯 Recommended Disk Space

### **Minimum Requirements:**
```
OS Disk: 20 GB minimum
Spirit Tours: 5-10 GB
Free space needed: 10 GB buffer
Total recommended: 35-40 GB disk
```

### **Current Server:**
```
If 80 GB total disk:
- Used: 5-10 GB (after cleanup) ✅
- Free: 70-75 GB ✅
- Usage: 10-12% ✅

If 100 GB total disk:
- Used: 5-10 GB (after cleanup) ✅
- Free: 90-95 GB ✅
- Usage: 5-10% ✅ IDEAL
```

---

## 🔧 Advanced Cleanup (If Needed)

### **Remove ALL unused Docker data (aggressive):**
```bash
# WARNING: This removes EVERYTHING not in use
docker system prune -a --volumes -f

# This will remove:
# - All stopped containers
# - All networks not used by containers
# - All images without at least one container
# - All build cache
# - All volumes not used by containers

# Space recovered: 50-70 GB
```

**⚠️ WARNING:** Only run this if you're sure. It removes all old images and you'll need to rebuild if you want to rollback.

---

## 📋 Monitoring Commands

### **Check disk usage:**
```bash
df -h /
```

### **Check Docker usage:**
```bash
docker system df -v
```

### **Check largest directories:**
```bash
du -sh /opt/spirittours/app/* | sort -hr
```

### **Check Docker logs:**
```bash
docker ps -q | xargs -I {} sh -c 'echo "Container: {} - Log: $(du -h $(docker inspect --format="{{.LogPath}}" {}) 2>/dev/null | cut -f1)"'
```

### **Check application logs:**
```bash
du -sh /opt/spirittours/app/logs/*
```

---

## 🚀 Quick Commands Reference

```bash
# Diagnose
./diagnose_disk_usage.sh

# Clean (safe)
./cleanup_disk_space.sh

# Check disk
df -h /

# Check Docker
docker system df

# Remove old images (>7 days)
docker image prune -a --filter "until=168h" -f

# Remove stopped containers
docker container prune -f

# Remove unused volumes
docker volume prune -f

# Truncate container logs
docker ps -q | xargs -I {} truncate -s 0 $(docker inspect --format='{{.LogPath}}' {})
```

---

## 📝 Best Practices

### **DO:**
1. ✅ Run cleanup monthly
2. ✅ Configure log rotation
3. ✅ Monitor disk usage weekly
4. ✅ Remove old images after successful deploys
5. ✅ Use `docker system prune` regularly

### **DON'T:**
1. ❌ Let logs grow indefinitely
2. ❌ Keep old Docker images forever
3. ❌ Accumulate stopped containers
4. ❌ Ignore disk space warnings
5. ❌ Run without log rotation

---

## 🎯 Expected Results After Cleanup

### **Disk Usage:**
```
Before: 80 GB (90% used) ❌
After:  8 GB (10% used)  ✅
Saved:  72 GB            🎉
```

### **Docker Usage:**
```
Before:
- Images: 15 (25 GB)
- Containers: 10 (5 GB)
- Volumes: 8 (2 GB)
- Total: 32 GB

After:
- Images: 3 (1.5 GB)
- Containers: 3 (200 MB)
- Volumes: 3 (100 MB)
- Total: 1.8 GB
```

### **Performance Impact:**
- ✅ Faster Docker builds
- ✅ Faster container startup
- ✅ Less disk I/O
- ✅ More free space for database growth

---

## 📞 Need Help?

If after cleanup you still have high disk usage:

1. Run diagnostic script and check output
2. Look for large files: `du -ah /opt/spirittours | sort -hr | head -20`
3. Check if it's the database: `du -sh /var/lib/docker/volumes/*`
4. Review Docker images: `docker images --format "table {{.Repository}}\t{{.Size}}"`

---

**Created by**: AI Assistant  
**Date**: 2025-11-13  
**Status**: ✅ Ready to use
