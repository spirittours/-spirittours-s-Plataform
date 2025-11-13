# 🚀 Complete Fix Guide - Do Everything

This guide will fix EVERYTHING in order:
1. Clean disk space (80GB → 8GB)
2. Deploy error handling fix
3. Verify everything works

---

## 🎯 PART 1: Clean Disk Space (10 minutes)

**You're already in the server, so run:**

```bash
cd /opt/spirittours/app
git pull origin main
./diagnose_disk_usage.sh
```

**Review the output**, then run cleanup:

```bash
./cleanup_disk_space.sh
```

**When prompted**, type `y` and press Enter.

**Expected result:**
```
Disk usage BEFORE: 80 GB (80%)
Disk usage AFTER:  8 GB (8%)
Space saved: 72 GB 🎉
```

---

## 🎯 PART 2: Deploy Error Handling Fix

You have **3 options** - choose the easiest for you:

### **Option A: SCP from Local Machine (Fastest - 2 min)**

**Open a NEW terminal on your LOCAL machine** (not SSH):

```bash
scp /home/user/webapp/frontend/src/AppSimple.tsx root@138.197.6.239:/opt/spirittours/app/frontend/src/AppSimple.tsx
```

Then **back in your SSH session**:

```bash
cd /opt/spirittours/app
docker-compose -f docker-compose.digitalocean.yml up -d --build frontend
sleep 60
docker ps | grep frontend
```

---

### **Option B: Apply Patch File (Medium - 5 min)**

**In your SSH session:**

```bash
cd /opt/spirittours/app

# Copy patch file from local
# (First download it from /home/user/webapp/AppSimple_error_handling.patch)
```

**On your LOCAL machine:**

```bash
scp /home/user/webapp/AppSimple_error_handling.patch root@138.197.6.239:/opt/spirittours/app/
```

**Back in SSH:**

```bash
cd /opt/spirittours/app
patch -p1 < AppSimple_error_handling.patch
docker-compose -f docker-compose.digitalocean.yml up -d --build frontend
sleep 60
docker ps | grep frontend
```

---

### **Option C: Manual Edit (Slowest - 10 min)**

**In your SSH session:**

```bash
cd /opt/spirittours/app
cp frontend/src/AppSimple.tsx frontend/src/AppSimple.tsx.backup
nano frontend/src/AppSimple.tsx
```

**Make these 3 changes:**

#### Change 1: Add errorMessage state (line 75)
Find this line:
```typescript
const [successMessage, setSuccessMessage] = useState('');
```

Add AFTER it:
```typescript
const [errorMessage, setErrorMessage] = useState('');
```

#### Change 2: Replace handleCreateBooking function (lines 147-176)

Find the function starting with:
```typescript
const handleCreateBooking = async () => {
```

Replace the ENTIRE function with:
```typescript
const handleCreateBooking = async () => {
  if (!selectedTour) return;

  // Clear any previous messages
  setErrorMessage('');
  setSuccessMessage('');

  try {
    console.log('Creating booking with data:', {
      tour_id: selectedTour.id,
      booking_date: bookingForm.booking_date,
      participants: bookingForm.participants
    });

    const response = await fetch(`${API_URL}/api/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tour_id: selectedTour.id,
        booking_date: bookingForm.booking_date,
        participants: bookingForm.participants
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Booking created successfully:', data);
      setSuccessMessage(`Booking created successfully! ID: ${data.booking_id}`);
      setOpenBookingDialog(false);
      fetchBookings();
      fetchStats();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } else {
      // Handle error responses
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      console.error('Booking failed:', response.status, errorData);
      setErrorMessage(`Error: ${errorData.detail || 'Failed to create booking'}`);
      
      // Clear error message after 5 seconds
      setTimeout(() => setErrorMessage(''), 5000);
    }
  } catch (error) {
    console.error('Error creating booking:', error);
    setErrorMessage('Network error: Unable to connect to server');
    
    // Clear error message after 5 seconds
    setTimeout(() => setErrorMessage(''), 5000);
  }
};
```

#### Change 3: Add error alert (around line 200)

Find this block:
```typescript
{successMessage && (
  <Alert severity="success" sx={{ mb: 2 }}>
    {successMessage}
  </Alert>
)}
```

Add AFTER it:
```typescript
{errorMessage && (
  <Alert severity="error" sx={{ mb: 2 }}>
    {errorMessage}
  </Alert>
)}
```

**Save and exit:**
- Press `Ctrl + O` (save)
- Press `Enter` (confirm)
- Press `Ctrl + X` (exit)

**Then rebuild:**
```bash
docker-compose -f docker-compose.digitalocean.yml up -d --build frontend
sleep 60
docker ps | grep frontend
```

---

## 🎯 PART 3: Verification (5 minutes)

### Check Disk Space:
```bash
df -h /
docker system df
```

**Expected:**
```
Before: 80 GB used (80%)
After:  8 GB used (8%)
```

### Check Containers:
```bash
docker ps
```

**Expected:** All 3 containers running and healthy

### Check Endpoints:
```bash
curl -s https://plataform.spirittours.us/api/v1/tours | head -c 100
```

**Expected:** JSON with tours data

### Test in Browser:

1. Open: https://plataform.spirittours.us
2. Open browser console (F12)
3. Click "Book Now" on a tour
4. Fill form and submit
5. **Look for in console:**
   - "Creating booking with data: {...}"
   - Either "Booking created successfully" or "Booking failed: 400 {...}"
6. **Look for on page:**
   - Green alert if success
   - Red alert if error

---

## 🎯 PART 4: Fix GitHub Push (If needed)

If GitHub is still failing, try:

```bash
cd /home/user/webapp
git remote -v
git push origin main
```

If still fails, that's OK - code is deployed directly on server.

---

## ✅ Success Checklist

After completing all steps:

- [ ] Disk usage is ~8 GB (was 80 GB)
- [ ] Docker system df shows reasonable sizes
- [ ] All 3 containers running and healthy
- [ ] Frontend shows at https://plataform.spirittours.us
- [ ] Tours load correctly
- [ ] Booking dialog opens
- [ ] Console shows debug logs when booking
- [ ] Error messages show in red alerts (if error occurs)
- [ ] Success messages show in green alerts (if success)

---

## 🚨 Troubleshooting

### Disk cleanup didn't work:
```bash
# Try manual cleanup
docker system prune -a -f
docker volume prune -f
```

### Frontend not building:
```bash
# Check logs
docker logs spirit-tours-frontend --tail 50

# Try force rebuild
docker-compose -f docker-compose.digitalocean.yml down
docker-compose -f docker-compose.digitalocean.yml up -d --build
```

### Still seeing 400 error:
- Check browser console for "Creating booking with data: {...}"
- Check what tour_id value is being sent
- Check if it's "tour-001" (string) or something else
- The error message should now show in a red alert

---

## 📊 Summary

**Time investment:** ~30-40 minutes total
**Space saved:** ~70 GB
**Problems fixed:** 4 major issues
**Result:** Production-ready platform

---

**Let me know which option you chose and how it went!** 🚀
