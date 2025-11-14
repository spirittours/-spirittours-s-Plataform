# Production Port Fix Deployment Guide

## Problem Summary

**Issue**: 502 Bad Gateway on `https://plataform.spirittours.us/api/v1/bookings`

**Root Cause**: 
- Docker port mapping: `5000:5000` (host:container)
- Backend hardcoded to listen on port `8000` inside container
- Nginx routes to `localhost:5000` but nothing is listening there
- Backend `PORT` environment variable was ignored

**Fix**: Modified `backend/main.py` to read `PORT` from environment variable

## Deployment Steps

### Option 1: Automated Script

```bash
# On production server
cd /opt/spirittours/app  # or wherever your app is located
chmod +x deploy-port-fix.sh
./deploy-port-fix.sh
```

### Option 2: Manual Steps

```bash
# 1. Navigate to application directory
cd /opt/spirittours/app

# 2. Pull latest code
git fetch origin main
git pull origin main

# 3. Verify the fix is present
grep -A 5 "port = int(os.getenv" backend/main.py
# Should show: port = int(os.getenv("PORT", "8000"))

# 4. Rebuild and restart backend
docker-compose stop backend
docker-compose build --no-cache backend
docker-compose up -d backend

# 5. Wait for startup (30 seconds)
sleep 30

# 6. Check logs to confirm port 5000
docker logs spirittours-backend --tail 20
# Should show: "Starting Spirit Tours API Server on port 5000..."

# 7. Test local endpoint
curl http://localhost:5000/health
# Should return JSON health status

# 8. Test booking endpoint locally
curl -X GET http://localhost:5000/api/v1/bookings
# Should return 405 Method Not Allowed (GET not supported, need POST)

# 9. Test public endpoint
curl -X GET https://plataform.spirittours.us/api/v1/bookings
# Should return 405 Method Not Allowed instead of 502 Bad Gateway
```

## Verification Checklist

✅ **Before Fix**:
- `curl http://localhost:5000/health` → Connection reset
- `curl https://plataform.spirittours.us/api/v1/bookings` → 502 Bad Gateway

✅ **After Fix**:
- `curl http://localhost:5000/health` → 200 OK with JSON
- `curl https://plataform.spirittours.us/api/v1/bookings` → 405 Method Not Allowed
- Backend logs show: "Starting Spirit Tours API Server on port 5000..."

## Testing the Booking Endpoint

```bash
# Test POST request (valid method for this endpoint)
curl -X POST https://plataform.spirittours.us/api/v1/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "tour_id": "test_tour",
    "date": "2024-12-01",
    "participants": 2,
    "customer_name": "Test User",
    "customer_email": "test@example.com"
  }'

# Should return booking confirmation or validation error (not 502)
```

## What Changed

### Before (broken):
```python
# backend/main.py - line 2044
if __name__ == "__main__":
    logger.info("🚀 Starting Spirit Tours API Server...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0", 
        port=8000,  # ← HARDCODED! Docker expects 5000
        reload=True,
        log_level="info"
    )
```

### After (fixed):
```python
# backend/main.py - line 2044
if __name__ == "__main__":
    import os
    
    # Get port from environment variable or default to 8000
    port = int(os.getenv("PORT", "8000"))  # ← NOW READS ENV VAR
    
    logger.info(f"🚀 Starting Spirit Tours API Server on port {port}...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0", 
        port=port,  # ← DYNAMIC PORT
        reload=True,
        log_level="info"
    )
```

### Docker Configuration (docker-compose.yml):
```yaml
backend:
  ports:
    - "5000:5000"  # Maps host:5000 → container:5000
  environment:
    PORT: 5000     # Tells backend to use port 5000
```

## Troubleshooting

### Issue: Still getting 502 Bad Gateway

**Check 1**: Verify backend is listening on port 5000
```bash
docker exec spirittours-backend netstat -tlnp | grep 5000
# Should show python listening on 0.0.0.0:5000
```

**Check 2**: Verify Docker port mapping
```bash
docker ps | grep spirittours-backend
# Should show: 0.0.0.0:5000->5000/tcp
```

**Check 3**: Check backend logs
```bash
docker logs spirittours-backend --tail 50
# Look for: "Starting Spirit Tours API Server on port 5000..."
```

**Check 4**: Verify nginx is routing correctly
```bash
sudo nginx -t
sudo systemctl status nginx
# Check /etc/nginx/sites-available/spirittours for proxy_pass http://localhost:5000
```

### Issue: Backend crashes on startup

**Check 1**: Database connection
```bash
docker logs spirittours-backend | grep -i "database\|mongo\|postgres"
```

**Check 2**: Missing dependencies
```bash
docker exec spirittours-backend pip list
```

**Check 3**: Environment variables
```bash
docker exec spirittours-backend env | grep -E "(PORT|DATABASE|MONGO)"
```

## Additional Notes

### Database Configuration
The backend is configured for **MongoDB** (docker-compose.yml shows `MONGODB_URI`), but backend code tries to connect to **PostgreSQL**. This may cause startup issues. Check `.env.production` file for correct database settings.

### Port Configuration Best Practices
- **Local development**: Uses port 8000 (default fallback)
- **Docker/Production**: Uses PORT environment variable (5000)
- **Frontend**: Should use `http://localhost:8080` (React dev server)

## Success Indicators

1. ✅ Backend logs show: "Starting Spirit Tours API Server on port 5000..."
2. ✅ `docker logs` shows Uvicorn running on `http://0.0.0.0:5000`
3. ✅ `curl http://localhost:5000/health` returns 200 OK
4. ✅ `curl https://plataform.spirittours.us/health` returns 200 OK
5. ✅ No 502 errors when accessing API endpoints

## Support

If issues persist after applying this fix:
1. Check all environment variables in `docker-compose.yml`
2. Verify nginx configuration matches port 5000
3. Check backend startup logs for any errors
4. Verify database connection string is correct

---

**Commit**: `fix: Read PORT from environment variable to fix Docker port mismatch`  
**Date**: 2024-11-14  
**Fixed**: 502 Bad Gateway error on production booking endpoint
