# Spirit Tours - Production Deployment Fix Instructions

## 🎯 Problem Summary

The frontend was making requests to `/api/v1/api/v1/tours` (double prefix) instead of `/api/v1/tours` because:

1. **Root Cause**: `AppSimple.tsx` constructs URLs as `${API_URL}/api/v1/tours`
2. **Previous Config**: `.env` had `REACT_APP_API_URL=https://plataform.spirittours.us/api/v1`
3. **Result**: `https://plataform.spirittours.us/api/v1` + `/api/v1/tours` = ❌ `/api/v1/api/v1/tours`

## ✅ Solution Applied

### Changes Made:

1. **`.env` File**:
   - **Before**: `REACT_APP_API_URL=https://plataform.spirittours.us/api/v1`
   - **After**: `REACT_APP_API_URL=https://plataform.spirittours.us`
   - **Why**: Let the frontend code add the `/api/v1` suffix

2. **`docker-compose.digitalocean.yml` File**:
   - **Before**: `ports: - "80:80"`
   - **After**: `ports: - "8080:80"`
   - **Why**: Avoid conflict with host Nginx on port 80

## 🚀 Deployment Steps (Run on Production Server)

### Option A: Automated Deployment (Recommended)

```bash
# SSH into production server
ssh root@138.197.6.239

# Navigate to app directory
cd /opt/spirittours/app

# Pull latest changes (includes the deployment script)
git fetch origin main
git reset --hard origin/main

# Run the automated deployment script
bash deploy_production_fix.sh
```

### Option B: Manual Deployment

If you prefer manual control or the script encounters issues:

```bash
# SSH into production server
ssh root@138.197.6.239

# Navigate to app directory
cd /opt/spirittours/app

# Step 1: Pull latest changes
git fetch origin main
git reset --hard origin/main

# Step 2: Verify the changes
echo "Checking REACT_APP_API_URL..."
grep "REACT_APP_API_URL" .env

echo "Checking frontend port..."
grep -A3 "frontend:" docker-compose.digitalocean.yml | grep "ports"

# Step 3: Stop existing containers
docker-compose -f docker-compose.digitalocean.yml down

# Step 4: Rebuild frontend (critical - this bakes in the new env vars)
docker-compose -f docker-compose.digitalocean.yml build --no-cache frontend

# Step 5: Start all services
docker-compose -f docker-compose.digitalocean.yml up -d

# Step 6: Wait for services to start
sleep 30

# Step 7: Check status
docker-compose -f docker-compose.digitalocean.yml ps

# Step 8: View logs if needed
docker logs spirit-tours-frontend --tail 50
docker logs spirit-tours-backend --tail 50
```

## 🔍 Verification Steps

### 1. Check Container Status

```bash
docker ps
```

Expected output should show:
- `spirit-tours-redis` - healthy
- `spirit-tours-backend` - healthy
- `spirit-tours-frontend` - running on port 8080

### 2. Test Backend API Directly

```bash
# Health check
curl http://localhost:8000/health

# Test tours endpoint
curl http://localhost:8000/api/v1/tours | jq '.tours[0].title'

# Should output: "Sedona Vortex Experience"
```

### 3. Test Through Public Domain

```bash
# Test tours endpoint via domain
curl https://plataform.spirittours.us/api/v1/tours | jq '.tours[0].title'

# Should output: "Sedona Vortex Experience"
```

### 4. Check Frontend in Browser

1. Open: `https://plataform.spirittours.us`
2. Press `F12` to open Developer Console
3. Go to "Console" tab
4. Look for API requests in "Network" tab

**✅ Success indicators:**
- ✅ No 404 errors for `/api/v1/api/v1/tours`
- ✅ Successful requests to `/api/v1/tours`, `/api/v1/stats`, `/api/v1/bookings`
- ✅ Dashboard shows statistics cards
- ✅ Tours section displays 3 mock tours
- ✅ Recent bookings section shows data

**❌ Failure indicators:**
- ❌ Errors: `GET .../api/v1/api/v1/tours 404`
- ❌ Console errors: `Cannot read properties of undefined`
- ❌ Blank page or empty dashboard

### 5. Verify JavaScript Bundle Changed

```bash
# Check the hash of the main JavaScript file
docker exec spirit-tours-frontend ls -la /usr/share/nginx/html/static/js/ | grep main

# The hash should be DIFFERENT from: main.8c3be5a0.js
# If it's still 8c3be5a0, the build didn't pick up the changes
```

## 🐛 Troubleshooting

### Issue: Frontend container won't start (port conflict)

**Symptom**: Error: `address already in use` for port 80

**Cause**: `docker-compose.digitalocean.yml` reverted to `80:80`

**Fix**:
```bash
# Manually edit the file
nano docker-compose.digitalocean.yml

# Find the frontend service and change:
# FROM: - "80:80"
# TO:   - "8080:80"

# Save and restart
docker-compose -f docker-compose.digitalocean.yml up -d
```

### Issue: Still seeing `/api/v1/api/v1/` errors after rebuild

**Symptom**: Browser console shows `404` for `/api/v1/api/v1/tours`

**Possible Causes**:
1. Browser cache
2. Old build still in Docker
3. `.env` file didn't update correctly

**Fix**:
```bash
# 1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

# 2. Verify .env content
cat .env | grep REACT_APP_API_URL
# Should show: REACT_APP_API_URL=https://plataform.spirittours.us
# Should NOT show: REACT_APP_API_URL=https://plataform.spirittours.us/api/v1

# 3. Force rebuild with no cache
docker-compose -f docker-compose.digitalocean.yml down
docker system prune -f
docker-compose -f docker-compose.digitalocean.yml build --no-cache --pull frontend
docker-compose -f docker-compose.digitalocean.yml up -d
```

### Issue: Main JS hash hasn't changed

**Symptom**: Still seeing `main.8c3be5a0.js` after rebuild

**Cause**: Build cache or environment variables not being passed

**Fix**:
```bash
# 1. Verify environment variables are in docker-compose file
grep -A5 "build:" docker-compose.digitalocean.yml | grep -A5 "args:"

# Should show:
#   args:
#     - REACT_APP_API_URL=${REACT_APP_API_URL}
#     - REACT_APP_WS_URL=${REACT_APP_WS_URL}
#     - REACT_APP_ENVIRONMENT=production

# 2. Check if .env is being loaded
docker-compose -f docker-compose.digitalocean.yml config | grep REACT_APP_API_URL

# 3. Rebuild with explicit environment variables
REACT_APP_API_URL=https://plataform.spirittours.us \
REACT_APP_WS_URL=wss://plataform.spirittours.us/ws \
REACT_APP_ENVIRONMENT=production \
docker-compose -f docker-compose.digitalocean.yml build --no-cache frontend
```

### Issue: Backend returning 500 errors

**Symptom**: Backend logs show Python errors

**Fix**:
```bash
# Check backend logs
docker logs spirit-tours-backend --tail 100

# Common fix: Restart backend
docker-compose -f docker-compose.digitalocean.yml restart backend

# Wait and check
sleep 10
curl http://localhost:8000/health
```

## 📋 Post-Deployment Checklist

- [ ] All containers running (`docker ps`)
- [ ] Backend health check passes (`curl http://localhost:8000/health`)
- [ ] Tours API returns data (`curl https://plataform.spirittours.us/api/v1/tours`)
- [ ] Frontend loads without errors (check browser console)
- [ ] Dashboard displays statistics
- [ ] Tours section shows 3 mock tours
- [ ] No `/api/v1/api/v1/` double prefix errors
- [ ] JavaScript bundle hash changed from `8c3be5a0`

## 🔗 Important URLs

- **Production Site**: https://plataform.spirittours.us
- **Backend API**: https://plataform.spirittours.us/api/v1
- **Backend Health**: https://plataform.spirittours.us/api/v1/../health (or direct: http://138.197.6.239:8000/health)
- **GitHub Repo**: https://github.com/spirittours/-spirittours-s-Plataform

## 📞 Support

If issues persist after following these instructions:

1. **Capture logs**:
   ```bash
   docker logs spirit-tours-frontend > frontend.log 2>&1
   docker logs spirit-tours-backend > backend.log 2>&1
   docker-compose -f docker-compose.digitalocean.yml ps > containers.log
   ```

2. **Check configuration**:
   ```bash
   cat .env | grep REACT_APP > config.log
   grep -A10 "frontend:" docker-compose.digitalocean.yml >> config.log
   ```

3. Share the log files for further assistance.

## 🎉 Expected Result

After successful deployment, you should see:

**Frontend (https://plataform.spirittours.us)**:
- Clean console with no errors
- Dashboard with 4 statistics cards (Total Tours, Total Bookings, Total Revenue, System Status)
- "Available Tours" section with 3 cards:
  - Sedona Vortex Experience ($129)
  - Monument Valley Sunset Tour ($199)
  - Grand Canyon Private Tour ($299)
- "Recent Bookings" section with sample bookings

**Backend (API)**:
- Health endpoint responding with 200 OK
- Mock endpoints returning proper JSON structures
- All responses matching TypeScript interfaces

---

**Last Updated**: 2025-11-13  
**Version**: 1.0.0  
**Git Commit**: e2254c5f1
