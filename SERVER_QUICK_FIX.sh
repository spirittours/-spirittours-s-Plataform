#!/bin/bash
################################################################################
# QUICK FIX for Booking 400 Error - Run on Server
# This applies the complete fix directly
################################################################################

echo "=========================================="
echo "🚀 Quick Fix - Booking 400 Error"
echo "=========================================="
echo ""

cd /opt/spirittours/app

# Backup
echo "💾 Backup..."
cp frontend/src/AppSimple.tsx frontend/src/AppSimple.tsx.backup

# Apply the two critical fixes
echo "🔧 Fix 1: Change Tour interface..."
sed -i '38s/id: number;/id: string;/' frontend/src/AppSimple.tsx

echo "🔧 Fix 2: Add type conversion in booking..."
# Find line with "try {" in handleCreateBooking and add conversion code after it
sed -i '/const handleCreateBooking = async/,/try {/{
  /try {/a\
      // Ensure tour_id is a string\
      const bookingData = {\
        tour_id: String(selectedTour.id),\
        booking_date: bookingForm.booking_date,\
        participants: Number(bookingForm.participants)\
      };\
      console.log("Creating booking with data:", bookingData);
}' frontend/src/AppSimple.tsx

# Replace the body line
sed -i 's/tour_id: selectedTour.id,/tour_id: String(selectedTour.id),/' frontend/src/AppSimple.tsx

echo "   ✅ Done"
echo ""

echo "🔨 Rebuilding frontend..."
docker-compose -f docker-compose.digitalocean.yml up -d --build frontend

echo ""
echo "⏳ Waiting 60 seconds..."
sleep 60

echo ""
echo "=========================================="
echo "✅ FIX APPLIED!"
echo "=========================================="
echo ""
echo "🧪 Test now:"
echo "1. Go to: https://plataform.spirittours.us"
echo "2. Hard refresh: Ctrl+Shift+R"
echo "3. Open console: F12"
echo "4. Click 'Book Now'"
echo "5. Try booking - should work!"
echo ""
