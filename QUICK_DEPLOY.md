# ⚡ Quick Deployment Reference - Port Fix

## 🎯 One-Command Deploy

```bash
cd /opt/spirittours/app && git pull origin main && docker-compose stop backend && docker-compose build --no-cache backend && docker-compose up -d backend && sleep 30 && docker logs spirittours-backend --tail 20
```

## ✅ Quick Verify

```bash
# Should show port 5000
docker logs spirittours-backend | grep "port 5000"

# Should return 200 OK
curl -s http://localhost:5000/health | head -5

# Should return 405 (not 502)
curl -I https://plataform.spirittours.us/api/v1/bookings
```

## 🔧 If Something Goes Wrong

```bash
# Check what's listening on port 5000
sudo netstat -tlnp | grep 5000

# Check backend container
docker ps | grep spirittours-backend

# View full logs
docker logs spirittours-backend

# Restart everything
docker-compose restart
```

## 📊 Expected Output

**Backend Logs:**
```
🚀 Starting Spirit Tours API Server on port 5000...
INFO: Uvicorn running on http://0.0.0.0:5000
```

**Health Check:**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "services": { ... }
}
```

**Booking Endpoint (GET):**
```
HTTP/1.1 405 Method Not Allowed
```
(This is correct - POST is required, not GET)

---

**Fix Applied**: backend/main.py now reads PORT environment variable  
**Commits**: f7bca7f12, f8fef01b0, 731e9fb59  
**Status**: ✅ Ready to Deploy
