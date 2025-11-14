# Spirit Tours - Deployment Instructions

## 🎯 Problem Fixed
Fixed the `POST https://plataform.spirittours.us/api/v1/bookings 400 (Bad Request)` error.

### Root Causes Identified and Fixed:
1. ✅ **Conflicting Mock Endpoint**: Old `@app.post("/api/v1/bookings")` in `main.py` was overriding the new `booking_api.py` router
2. ✅ **Frontend Data Mismatch**: Frontend was sending wrong field names (`country_code` instead of `country`)

## 📦 Changes Pushed (Commit 5e8569e40)

### Backend Changes:
- **File**: `backend/main.py` (lines 3384-3469)
- **Action**: Commented out the old mock booking endpoint that was causing conflicts
- **Why**: The old endpoint expected `tour_id`, `booking_date`, `participants` and tried to validate against a mock tours list, causing "Tour not found" errors

### Frontend Changes:
- **File**: `frontend/src/AppSimple.tsx` (lines 156-170)
- **Action**: Fixed customer data structure
  - Changed `country_code: "US"` → `country: "US"`
  - Added `language: "es"` field
- **Why**: Backend's `CustomerInfo` model expects `country` and `language` fields

## 🚀 Deployment Steps on Production Server

### Step 1: Pull Latest Code
```bash
cd /opt/spirittours/app
git pull origin main
```

### Step 2: Rebuild Backend Container
```bash
# Rebuild backend with the fixed main.py
docker-compose build backend

# Restart backend service
docker-compose up -d backend

# Check logs to verify it started correctly
docker-compose logs -f backend
```

### Step 3: Rebuild Frontend Container/Static Files

**Option A: If using Docker for frontend**
```bash
docker-compose build frontend
docker-compose up -d frontend
docker-compose logs -f frontend
```

**Option B: If serving static build through Nginx**
```bash
cd /opt/spirittours/app/frontend
npm install
npm run build

# Copy build files to nginx static directory (adjust path as needed)
# Example:
# sudo cp -r build/* /var/www/html/spirittours/
```

### Step 4: Test the Fix

**Test 1: Health Check**
```bash
curl https://plataform.spirittours.us/health
# Expected: {"status": "ok"}
```

**Test 2: Booking Endpoint with Correct Format**
```bash
curl -X POST https://plataform.spirittours.us/api/v1/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "+34600000000",
      "country": "ES",
      "language": "es"
    },
    "product_id": "test-tour-123",
    "slot_id": "slot-2024-12-20",
    "participants_count": 2,
    "customer_type": "b2c_direct",
    "booking_channel": "direct_website"
  }'
```

**Expected Response:**
```json
{
  "booking_id": "...",
  "booking_reference": "ST20241220XXXXXX",
  "customer_type": "b2c_direct",
  "booking_channel": "direct_website",
  "gross_amount": 100.00,
  "net_amount": 100.00,
  "commission_amount": 0.00,
  "currency": "EUR",
  "product_name": "Madrid City Tour",
  "destination": "Madrid",
  "travel_date": "...",
  "participants": 2,
  "booking_status": "confirmed",
  "created_at": "..."
}
```

**Test 3: Frontend UI Test**
1. Open browser: `https://plataform.spirittours.us`
2. Click on a tour
3. Select date and participants
4. Click "Create Booking"
5. ✅ **Expected**: Booking created successfully (no more 400 error!)

## 🔍 Verification Checklist

- [ ] Backend container restarted successfully
- [ ] Frontend rebuilt and deployed
- [ ] Health endpoint returns 200 OK
- [ ] Booking endpoint accepts correct format
- [ ] Frontend booking form works without 400 errors
- [ ] Browser console shows no errors
- [ ] Booking data saved in database (check with `docker-compose exec backend python -m scripts.check_bookings` if script exists)

## 📝 Technical Details

### Backend Booking Endpoint (`/api/v1/bookings`)
- **Location**: `backend/api/booking_api.py`
- **Method**: POST
- **Expects**: Complete `BookingRequest` model with customer object
- **Returns**: `BookingResponse` with booking details

### Frontend Booking Request
- **Location**: `frontend/src/AppSimple.tsx` → `handleCreateBooking()`
- **Now sends**: Correct format matching backend's `BookingRequest` model

### What Was Wrong Before:
```javascript
// ❌ OLD (was causing 400 error)
{
  tour_id: "...",          // Wrong field name
  booking_date: "...",     // Not expected by backend
  participants: 2,         // Wrong field name
  country_code: "US"       // Wrong field name in customer
}
```

### What's Correct Now:
```javascript
// ✅ NEW (matches backend model)
{
  customer: {
    first_name: "Guest",
    last_name: "User",
    email: "guest@spirittours.com",
    phone: "+1234567890",
    country: "US",          // ✅ Correct field name
    language: "es"          // ✅ Added required field
  },
  product_id: "...",        // ✅ Correct field name
  slot_id: "...",           // ✅ Required field added
  participants_count: 2,    // ✅ Correct field name
  customer_type: "b2c_direct",
  booking_channel: "direct_website"
}
```

## 🐛 Troubleshooting

### If backend container fails to start:
```bash
docker-compose logs backend
# Check for Python syntax errors or import issues
```

### If frontend still shows 400 error:
```bash
# Check if frontend code was actually updated
docker-compose exec frontend cat /app/src/AppSimple.tsx | grep "country:"
# Should show: country: "US",

# Check browser cache
# - Open DevTools → Network tab → Disable cache
# - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

### If booking endpoint returns different error:
```bash
# Check backend logs for detailed error
docker-compose logs -f backend | grep -i error

# Check database connection
docker-compose exec backend python -c "from config.database import engine; print(engine.url)"
```

## 📞 Support

If deployment fails, check:
1. Docker container logs: `docker-compose logs backend frontend`
2. Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
3. Backend Python logs in container
4. Browser console for frontend JavaScript errors

---

**Deploy Date**: 2025-01-XX  
**Deployed By**: [Your Name]  
**Git Commit**: 5e8569e40  
**Status**: Ready for deployment
