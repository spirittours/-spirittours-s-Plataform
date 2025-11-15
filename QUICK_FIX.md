# Quick Fix Guide - Frontend Cache Issue

## Problem Summary
The frontend Docker container is using a **cached build** from before the fixes were made. This means:
- Frontend still connects to `localhost:8000` instead of `https://plataform.spirittours.us`
- Frontend still sends old data format (`tour_id`) instead of new format (`product_id`, `customer`)

## Root Cause
Docker build used cached layers (`Using cache` in Steps 22-28), reusing the `/app/build` directory from **before**:
- `.env.production` was created
- `AppSimple.tsx` was updated

## Evidence
**Frontend JavaScript** (current deployed version):
```javascript
// Old format being sent by cached build
{
  "tour_id": "tour-003",
  "booking_date": "2025-11-14", 
  "participants": 1
}
```

**Backend expects** (from booking_api.py):
```json
{
  "customer": {
    "email": "...",
    "first_name": "...",
    "last_name": "...",
    "phone": "...",
    "country": "...",
    "language": "..."
  },
  "product_id": "tour-003",
  "slot_id": "slot-2025-11-14",
  "participants_count": 1,
  "customer_type": "b2c_direct",
  "booking_channel": "direct_website"
}
```

**Backend error response**:
```
422 Unprocessable Entity
Field required: customer, product_id, slot_id, participants_count
```

## Solution

### On Production Server

```bash
# Pull latest code
cd /opt/spirittours/app
git pull origin main

# Run the automated rebuild script
chmod +x REBUILD_FRONTEND.sh
./REBUILD_FRONTEND.sh
```

### Manual Steps (if script not available)

```bash
cd /opt/spirittours/app

# Stop and remove container
docker stop spirit-tours-frontend
docker rm spirit-tours-frontend

# Rebuild WITHOUT cache (takes 5-10 minutes)
docker build --no-cache -t app-frontend frontend/

# Start new container
docker run -d \
  --name spirit-tours-frontend \
  --restart unless-stopped \
  -p 8080:80 \
  app-frontend

# Verify
sleep 15
docker ps | grep frontend
curl -I http://localhost:8080
```

### In Browser

1. **Clear site data**:
   - Open DevTools (F12)
   - Go to Application tab
   - Click "Clear site data" button
   - Close DevTools

2. **Hard refresh**:
   - Windows/Linux: `Ctrl+Shift+R`
   - Mac: `Cmd+Shift+R`

3. **Test booking**:
   - Open Network tab
   - Try to create a booking
   - Verify POST URL: `https://plataform.spirittours.us/api/v1/bookings` (NOT localhost:8000)
   - Verify request payload has `customer` object
   - Should get 200 OK response with booking confirmation

## Files That Were Fixed (but not deployed)

### `frontend/.env.production` (created)
```bash
REACT_APP_API_URL=https://plataform.spirittours.us
REACT_APP_WS_URL=wss://plataform.spirittours.us
```

### `frontend/src/AppSimple.tsx` (updated lines 156-170)
```javascript
const bookingData = {
  customer: {
    first_name: "Guest",
    last_name: "User",
    email: "guest@spirittours.com",
    phone: "+1234567890",
    country: "US",
    language: "es"
  },
  product_id: String(selectedTour.id),
  slot_id: `slot-${bookingForm.booking_date}`,
  participants_count: Number(bookingForm.participants),
  customer_type: "b2c_direct",
  booking_channel: "direct_website"
};
```

### `frontend/default.conf` (fixed)
```nginx
# Commented out proxy locations that were crashing container
# location /api/ { ... }  # DISABLED
# location /ws/ { ... }   # DISABLED
```

## Expected Behavior After Fix

### Network Tab Should Show
```
Request URL: https://plataform.spirittours.us/api/v1/bookings
Request Method: POST
Status Code: 200 OK

Request Payload:
{
  "customer": {
    "email": "guest@spirittours.com",
    "first_name": "Guest",
    "last_name": "User",
    "phone": "+1234567890",
    "country": "US",
    "language": "es"
  },
  "product_id": "tour-003",
  "slot_id": "slot-2025-11-14",
  "participants_count": 1,
  "customer_type": "b2c_direct",
  "booking_channel": "direct_website"
}

Response:
{
  "booking_id": "BK-20251115-XXXX",
  "status": "confirmed",
  "customer_email": "guest@spirittours.com",
  "product_id": "tour-003",
  "booking_date": "2025-11-14",
  "total_amount": 0.0
}
```

### Backend Logs Should Show
```
INFO: Received booking request for product tour-003
INFO: Created booking BK-20251115-XXXX for customer guest@spirittours.com
INFO: 172.17.0.1:XXXXX - "POST /api/v1/bookings HTTP/1.1" 200 OK
```

## Why --no-cache is Required

React environment variables (`REACT_APP_*`) are:
- Read at **BUILD TIME** (not runtime)
- Injected into JavaScript bundle during `npm run build`
- Bundled into static files in `/app/build` directory

Docker multi-stage build:
1. **Stage 1 (builder)**: Runs `npm run build` → creates `/app/build`
2. **Stage 2 (production)**: Copies `/app/build` to nginx

When Docker uses cache:
- It reuses old `/app/build` from Stage 1
- This directory was created BEFORE `.env.production` existed
- JavaScript still has hardcoded `localhost:8000` URLs

With `--no-cache`:
- Stage 1 runs completely from scratch
- Reads new `.env.production` file
- Creates new `/app/build` with correct URLs
- Compiles updated `AppSimple.tsx` code

## Verification Checklist

- [ ] Rebuild completed without errors
- [ ] Container running: `docker ps | grep frontend`
- [ ] HTTP 200 response: `curl -I http://localhost:8080`
- [ ] Browser cache cleared
- [ ] Hard refresh performed
- [ ] POST URL is `https://plataform.spirittours.us/api/v1/bookings`
- [ ] Request payload has `customer` object
- [ ] Request payload has `product_id` (not `tour_id`)
- [ ] Response status is 200 OK
- [ ] Backend logs show successful booking creation

## Troubleshooting

### If rebuild fails
```bash
# Check Docker logs
docker logs spirit-tours-frontend

# Check if port is in use
netstat -tulpn | grep 8080

# Remove all frontend containers
docker ps -a | grep frontend
docker rm -f $(docker ps -aq -f name=frontend)

# Try rebuild again
docker build --no-cache -t app-frontend frontend/
```

### If still getting 422 error
```bash
# Verify .env.production exists
cat /opt/spirittours/app/frontend/.env.production

# Check build logs for environment variables
docker build --no-cache -t app-frontend frontend/ 2>&1 | grep REACT_APP

# Inspect built image
docker run --rm app-frontend cat /usr/share/nginx/html/index.html | grep -o 'https://[^"]*'
```

### If browser still shows old code
1. Clear all browser data (not just cache)
2. Try in incognito/private window
3. Try different browser
4. Check Service Worker: DevTools → Application → Service Workers → Unregister

## Contact
For issues, check:
- **Deployment Summary**: `/opt/spirittours/app/DEPLOYMENT_SUMMARY.md`
- **Backend Logs**: `docker logs spirittours-backend`
- **Frontend Logs**: `docker logs spirit-tours-frontend`
- **Nginx Logs**: `/var/log/nginx/error.log`
