# Manual Deployment Steps for Error Handling Fix

## Option 1: Copy via SCP (Fastest)

From your local machine (not in SSH):

```bash
# Copy the updated file to server
scp /home/user/webapp/frontend/src/AppSimple.tsx root@138.197.6.239:/opt/spirittours/app/frontend/src/

# Then SSH and rebuild
ssh root@138.197.6.239
cd /opt/spirittours/app
docker-compose -f docker-compose.digitalocean.yml up -d --build frontend
```

## Option 2: Manual Edit on Server

SSH to server and edit the file directly:

```bash
ssh root@138.197.6.239
cd /opt/spirittours/app
nano frontend/src/AppSimple.tsx
```

### Changes to make:

1. **Add errorMessage state** (after line 75):
```typescript
const [successMessage, setSuccessMessage] = useState('');
const [errorMessage, setErrorMessage] = useState('');  // ADD THIS LINE
```

2. **Replace handleCreateBooking function** (lines 147-176):

Replace the entire function with this improved version:

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

3. **Add error alert** (after the success alert around line 200):

```typescript
{successMessage && (
  <Alert severity="success" sx={{ mb: 2 }}>
    {successMessage}
  </Alert>
)}
{errorMessage && (
  <Alert severity="error" sx={{ mb: 2 }}>
    {errorMessage}
  </Alert>
)}
```

### After editing:

```bash
# Save and exit (Ctrl+O, Enter, Ctrl+X in nano)

# Rebuild frontend
docker-compose -f docker-compose.digitalocean.yml up -d --build frontend

# Wait for build
sleep 60

# Check it's running
docker ps | grep frontend
```

## Option 3: Wait for GitHub to Recover

If GitHub is back online:

```bash
# On your local machine
cd /home/user/webapp
git push origin main

# On server
ssh root@138.197.6.239
cd /opt/spirittours/app
git pull origin main
docker-compose -f docker-compose.digitalocean.yml up -d --build frontend
```

## Verification

After deploying:

1. Open https://plataform.spirittours.us
2. Open browser console (F12)
3. Click "Book Now" on any tour
4. Try to submit
5. Look for console messages:
   - "Creating booking with data: {...}"
   - Either "Booking created successfully" or "Booking failed: 400 {...}"
6. You should see error messages in red alerts if something fails

## What to Look For

If you still see 400 error, the console will now show:
- The exact data being sent
- The exact error message from backend
- Whether it's a network issue or validation issue

This will help us identify the root cause.
