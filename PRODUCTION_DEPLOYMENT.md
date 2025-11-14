# Spirit Tours - Production Deployment Guide

## 🎯 Current Situation

- **Backend**: Runs in Docker container (port 5000)
- **Frontend**: Static files served by Nginx (no Docker container)
- **Issue**: Backend showing 502 Bad Gateway after rebuild

---

## 🔍 Step 1: Diagnose Backend Issue

Run these commands on your production server:

```bash
cd /opt/spirittours/app

# Check backend logs
docker-compose logs backend | tail -100

# Check container status
docker-compose ps

# Check backend health directly
docker-compose exec backend curl -f http://localhost:5000/health || echo "Backend not responding"
```

### Common Issues to Look For:

1. **Pydantic validation errors** - Check for "Extra inputs are not permitted"
2. **Database connection errors** - Check MONGODB_URI
3. **Port binding errors** - Check if port 5000 is already in use
4. **Import errors** - Missing Python packages

---

## 🔧 Step 2: Fix Backend (if needed)

### If backend is not starting:

```bash
# Stop all services
docker-compose down

# Check .env file has correct values
cat .env | grep -E "MONGODB_URI|PORT|OPENAI_API_KEY"

# Rebuild backend from scratch
docker-compose build --no-cache backend

# Start services
docker-compose up -d

# Follow logs in real-time
docker-compose logs -f backend
```

### Expected Backend Logs (Success):

```
INFO:     Started server process [1]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:5000 (Press CTRL+C to quit)
```

### If you see "Extra inputs are not permitted":

The `.env` file on production might have extra variables. Check:

```bash
cat /opt/spirittours/app/.env
```

Make sure `PYDANTIC_EXTRA=allow` is set, or remove conflicting variables.

---

## 📦 Step 3: Deploy Frontend

### Option A: Using the deployment script

```bash
cd /opt/spirittours/app

# Run the deployment script
./deploy-frontend.sh

# Copy built files to Nginx directory
# (Adjust path based on your nginx.conf)
sudo cp -r frontend/build/* /var/www/html/spirittours/
# OR use rsync to avoid leaving old files:
sudo rsync -av --delete frontend/build/ /var/www/html/spirittours/

# Reload Nginx
sudo systemctl reload nginx
```

### Option B: Manual deployment

```bash
cd /opt/spirittours/app/frontend

# Install dependencies
npm install

# Build production bundle
npm run build

# Copy to web server
sudo cp -r build/* /var/www/html/spirittours/

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🧪 Step 4: Test Everything

### Test 1: Backend Health

```bash
curl https://plataform.spirittours.us/health
# Expected: {"status":"ok"} or similar
```

### Test 2: Backend Booking Endpoint

```bash
curl -X POST https://plataform.spirittours.us/api/v1/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "first_name": "Test",
      "last_name": "User",
      "email": "test@spirittours.com",
      "phone": "+34600000000",
      "country": "ES",
      "language": "es"
    },
    "product_id": "test-123",
    "slot_id": "slot-2024-12-20",
    "participants_count": 2,
    "customer_type": "b2c_direct",
    "booking_channel": "direct_website"
  }'
```

**Expected**: JSON response with booking details (status 200)

### Test 3: Frontend in Browser

1. Open: `https://plataform.spirittours.us`
2. Open Browser DevTools → Console
3. Select a tour
4. Try to create a booking
5. **Check**: No more "400 Bad Request" error!

---

## 🚨 Troubleshooting

### Backend 502 Error

**Possible causes:**
1. Backend container crashed - Check: `docker-compose logs backend`
2. Port mismatch - Check: `docker-compose ps` shows port 5000
3. Nginx misconfiguration - Check: `/etc/nginx/sites-available/spirittours.conf`

**Fix:**
```bash
# Restart backend
docker-compose restart backend

# If that doesn't work, rebuild
docker-compose down
docker-compose build backend
docker-compose up -d
```

### Frontend Still Shows 400 Error

**Possible causes:**
1. Browser cache - Hard refresh: `Ctrl+Shift+R`
2. Old build files - Clear build directory: `rm -rf frontend/build && npm run build`
3. Nginx serving old files - Check: `sudo ls -la /var/www/html/spirittours/`

**Fix:**
```bash
# Clear browser cache OR open in Incognito mode

# Rebuild frontend with clean slate
cd frontend
rm -rf build node_modules
npm install
npm run build

# Deploy fresh files
sudo rsync -av --delete build/ /var/www/html/spirittours/
sudo systemctl reload nginx
```

### Database Connection Issues

If backend logs show database errors:

```bash
# Check if MongoDB is running
docker-compose ps mongodb

# Check connection from backend container
docker-compose exec backend python -c "
from pymongo import MongoClient
uri = 'mongodb://admin:changeme@mongodb:27017/spirittours?authSource=admin'
client = MongoClient(uri)
print('MongoDB connected:', client.server_info()['version'])
"
```

---

## 📋 Quick Reference Commands

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs mongodb
docker-compose logs redis

# Restart a service
docker-compose restart backend

# Rebuild and restart
docker-compose up -d --build backend

# Check running containers
docker-compose ps

# Stop all services
docker-compose down

# Start all services
docker-compose up -d

# Check Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## ✅ Success Checklist

- [ ] Backend container is running: `docker-compose ps` shows "Up"
- [ ] Backend health check works: `curl https://plataform.spirittours.us/health`
- [ ] Backend booking endpoint responds: Test with curl command above
- [ ] Frontend files deployed: Check `/var/www/html/spirittours/` has files
- [ ] Frontend loads in browser: `https://plataform.spirittours.us`
- [ ] Frontend booking works: No 400 error when creating booking
- [ ] Browser console clean: No JavaScript errors

---

## 📞 Need Help?

Please share:
1. Output of: `docker-compose logs backend | tail -100`
2. Output of: `docker-compose ps`
3. Output of: `curl -I https://plataform.spirittours.us/health`
4. Browser console errors (if any)

This will help diagnose the exact issue.
