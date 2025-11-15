# Spirit Tours Booking API - Deployment Summary

**Date**: 2025-11-15  
**Issue**: Production error `POST https://plataform.spirittours.us/api/v1/bookings 400 (Bad Request)`  
**Goal**: Make booking endpoint work end-to-end from frontend UI to backend API

---

## Problem Evolution Timeline

1. **502 Bad Gateway** → Pydantic validation rejecting extra environment variables
2. **404 Not Found** → Missing route decorator
3. **Port Mismatch** → Hardcoded port 8000 instead of reading environment
4. **Wrong Dockerfile** → docker-compose.yml using Node.js Dockerfile for Python backend
5. **PostgreSQL Errors** → Hardcoded PostgreSQL default causing connection failures
6. **405 Method Not Allowed** → Router prefix causing path mismatch
7. **Conflicting Endpoints** → Old mock endpoint overriding new router
8. **Frontend Container Crash** → Nginx config trying to proxy to non-existent "backend" host
9. **Frontend Cached Build** → Docker using old build from before fixes (CURRENT)
10. **422 Unprocessable Entity** → Frontend sending old data format due to cached build

---

## Critical Files Modified

### Backend Changes

#### `/home/user/webapp/backend/api/booking_api.py`
**Changes**:
- Removed router prefix to fix path resolution
- Added multiple path variations for compatibility
- Uses full paths in decorators

```python
# Line 24
router = APIRouter(tags=["Bookings"])

# Lines 82-87
@router.post("/api/v1/bookings", response_model=BookingResponse)
@router.post("/api/v1/bookings/", response_model=BookingResponse)
@router.post("/api/v1/bookings/create", response_model=BookingResponse)
async def create_booking(
    booking_request: BookingRequest,
    db: Session = Depends(get_db)
):
```

**Expected Request Format**:
```json
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
```

#### `/home/user/webapp/backend/main.py`
**Changes**:
- Read PORT from environment variable (lines 3475-3483)
- Commented out conflicting mock endpoint (lines 3384-3469)

```python
# Lines 3475-3483
if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", "8000"))
    logger.info(f"🚀 Starting Spirit Tours API Server on port {port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True, log_level="info")
```

#### `/home/user/webapp/backend/config/database.py`
**Changes**:
- Modified to use SQLite fallback when MONGODB_URI exists but DATABASE_URL doesn't
- Prevents PostgreSQL connection errors

```python
# Lines 24-33
def __init__(self):
    mongodb_uri = os.getenv("MONGODB_URI")
    if mongodb_uri and not os.getenv("DATABASE_URL"):
        self.database_url = ""  # Empty will trigger SQLite fallback
    else:
        self.database_url = os.getenv("DATABASE_URL", "")
```

### Frontend Changes

#### `/home/user/webapp/frontend/src/AppSimple.tsx`
**Changes** (lines 156-170):
- Updated booking data structure to match backend BookingRequest model
- Changed field names: `tour_id` → `product_id`, `participants` → `participants_count`
- Added required fields: `slot_id`, `country`, `language`

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

**Status**: ⚠️ Code changed in repository but NOT deployed (cached build)

#### `/home/user/webapp/frontend/.env.production`
**Created new file**:
```bash
REACT_APP_API_URL=https://plataform.spirittours.us
REACT_APP_WS_URL=wss://plataform.spirittours.us
```

**Status**: ⚠️ Created but not included in deployed build (Docker cache)

#### `/home/user/webapp/frontend/default.conf`
**Changes** (lines 53-78):
- Commented out `/api/` proxy location (caused container crash)
- Commented out `/ws/` proxy location
- Main Nginx on host handles API proxying

```nginx
# API proxy - DISABLED (handled by main Nginx on host)
# location /api/ {
#     proxy_pass http://backend:8000/api/;
#     ...
# }
```

#### `/home/user/webapp/docker-compose.yml`
**Changes**:
- Fixed backend build context from `.` to `./backend`
- Changed environment variable from `NODE_ENV` to `ENVIRONMENT`
- Set PORT to 5000

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
  ports:
    - "5000:5000"
  environment:
    ENVIRONMENT: production
    PORT: 5000
```

---

## Production Server Configuration

### `/opt/spirittours/app/.env`
**Changes made on production**:
```bash
# Commented out PostgreSQL settings
# DATABASE_URL=postgresql://...
# DATABASE_PORT=5432

# Changed backend port
PORT=5000

# Added Pydantic config
PYDANTIC_EXTRA=allow

# Kept MongoDB settings
MONGODB_URI=mongodb://admin:changeme@localhost:27017/spirittours?authSource=admin
```

---

## Git Commits Summary

1. **f19eed21c** - Added ConfigDict(extra='allow') to fix Pydantic validation
2. **20a332084** - Removed old Config class
3. **f7bca7f12** - Added route decorator, fixed port reading
4. **dbac55060** - Fixed docker-compose.yml backend build context
5. **1f3d93cf5** - Modified database.py for SQLite fallback
6. **106882f8c** - Fixed router prefix causing 405 errors
7. **5e8569e40** - Commented out conflicting mock endpoint in main.py
8. **6580e536e** - Created .env.production with production URLs
9. **e78c74ab7** - Fixed default.conf nginx proxy configuration

---

## Current Problem: Docker Build Cache

### Evidence of Cache Issue

**Build logs showed**:
```
Step 22/28 : COPY --from=builder /app/build /usr/share/nginx/html
 ---> Using cache
 ---> 6e5a44f8466a
```

This means Docker reused the `/app/build` directory from BEFORE:
- `.env.production` was created
- `AppSimple.tsx` was updated

### Proof Frontend Uses Old Code

**Backend logs show frontend sending OLD format**:
```json
{
  "tour_id": "tour-003",
  "booking_date": "2025-11-14",
  "participants": 1
}
```

**Backend expects NEW format**:
```json
{
  "customer": {...},
  "product_id": "tour-003",
  "slot_id": "slot-2025-11-14",
  "participants_count": 1
}
```

**Error message**:
```
Field required: customer, product_id, slot_id, participants_count
```

### Why Cache Happened

React build process:
1. Reads `.env.production` at BUILD time (not runtime)
2. Injects values into JavaScript bundle during compilation
3. Creates static files in `/app/build` directory

Docker multi-stage build:
1. **Stage 1 (builder)**: Runs `npm run build` → creates `/app/build`
2. **Stage 2 (production)**: Copies `/app/build` to nginx directory

When Docker used cache:
- It skipped Stage 1 (builder) entirely
- Reused old `/app/build` from before `.env.production` existed
- Frontend still connects to `localhost:8000` instead of `plataform.spirittours.us`

---

## Required Fix: No-Cache Rebuild

### Commands to Execute

```bash
# On production server
cd /opt/spirittours/app

# Stop and remove current container
docker stop spirit-tours-frontend
docker rm spirit-tours-frontend

# Rebuild WITHOUT cache (will take 5-10 minutes)
docker build --no-cache -t app-frontend frontend/

# Start new container
docker run -d \
  --name spirit-tours-frontend \
  --restart unless-stopped \
  -p 8080:80 \
  app-frontend

# Wait for startup
sleep 15

# Verify
docker ps | grep frontend
curl -I http://localhost:8080
```

### Browser Testing Steps

After rebuild:
1. Open DevTools → Application tab
2. Click "Clear site data" button
3. Close and reopen browser
4. Navigate to https://plataform.spirittours.us
5. Hard refresh (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac)
6. Open Network tab
7. Try creating a booking
8. Verify POST request shows:
   - URL: `https://plataform.spirittours.us/api/v1/bookings` (NOT localhost:8000)
   - Request payload has `customer` object and `product_id` (NOT `tour_id`)

---

## Expected Behavior After Fix

### Network Request
```
POST https://plataform.spirittours.us/api/v1/bookings
Content-Type: application/json

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
```

### Backend Response
```json
{
  "booking_id": "BK-20251115-XXXX",
  "status": "confirmed",
  "customer_email": "guest@spirittours.com",
  "product_id": "tour-003",
  "booking_date": "2025-11-14",
  "total_amount": 0.0
}
```

### Backend Logs (Success)
```
INFO: Received booking request for product tour-003
INFO: Created booking BK-20251115-XXXX for customer guest@spirittours.com
INFO: 172.17.0.1:XXXXX - "POST /api/v1/bookings HTTP/1.1" 200 OK
```

---

## Architecture Overview

### Production Stack

**Nginx (Host Level)** - Port 80/443
- Serves as reverse proxy
- Routes `/` → Frontend container (port 8080)
- Routes `/api/` → Backend container (port 5000)
- Routes `/ws/` → Backend WebSocket (port 5000)

**Frontend Container** - Port 8080
- Nginx Alpine serving React static build
- No backend proxy (handled by host Nginx)
- Built from `frontend/Dockerfile`

**Backend Container** - Port 5000
- Python FastAPI application
- Uvicorn ASGI server
- SQLite fallback database (when no PostgreSQL)
- Built from `backend/Dockerfile`

**MongoDB Container** - Port 27017
- MongoDB 7.0 (currently not used by backend)
- Backend using SQLite fallback instead

### Request Flow

```
User Browser
    ↓
https://plataform.spirittours.us/api/v1/bookings
    ↓
Nginx (Host) :443
    ↓
Backend Container :5000 (FastAPI)
    ↓
SQLite Database (/tmp/spirittours_dev.db)
```

---

## Known Limitations

1. **SQLite Fallback**: Using temporary SQLite instead of MongoDB
   - Database file: `/tmp/spirittours_dev.db`
   - Will lose data on container restart
   - Should migrate to MongoDB for production

2. **Hardcoded Customer Data**: Frontend sends static "Guest User" info
   - No actual customer input form yet
   - Should add real form fields for customer details

3. **Development URLs in .env**: Frontend `.env` still has sandbox URLs
   - `.env.production` is correct
   - Should update `.env` for local development consistency

---

## Pending Tasks

- [ ] **CRITICAL**: Rebuild frontend with `--no-cache` flag
- [ ] Clear browser cache and test end-to-end booking
- [ ] Verify booking saves to database correctly
- [ ] Add proper MongoDB integration (remove SQLite fallback)
- [ ] Add real customer input form in frontend
- [ ] Update frontend `.env` with correct development URLs
- [ ] Add error handling and validation feedback in UI
- [ ] Add booking confirmation page/modal

---

## Success Criteria

✅ Frontend connects to `https://plataform.spirittours.us` (NOT localhost:8000)  
✅ POST request includes all required fields (customer, product_id, slot_id, etc.)  
✅ Backend validates request successfully  
✅ Booking saves to database  
✅ Backend returns 200 OK with booking confirmation  
✅ Frontend shows success message to user  

---

## Contact & References

- **Production URL**: https://plataform.spirittours.us
- **Repository**: /home/user/webapp (mapped to /opt/spirittours/app on server)
- **Backend API Docs**: https://plataform.spirittours.us/docs
- **Branch**: main (genspark_ai_developer merged)
