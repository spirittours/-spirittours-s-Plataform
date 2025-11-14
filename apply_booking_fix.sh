#!/bin/bash
################################################################################
# Apply Booking Fix Directly on Server
# This script patches the AppSimple.tsx file directly
################################################################################

set -e

echo "=========================================="
echo "🔧 Applying Booking Fix Patch"
echo "=========================================="
echo ""

cd /opt/spirittours/app

# Backup
echo "💾 Creating backup..."
cp frontend/src/AppSimple.tsx frontend/src/AppSimple.tsx.backup.$(date +%Y%m%d_%H%M%S)
echo "   ✅ Backup created"
echo ""

# Apply fix using sed
echo "🔧 Applying fixes..."

# Fix 1: Change interface line 38
sed -i 's/id: number;/id: string;  \/\/ Changed from number to string to match backend format/' frontend/src/AppSimple.tsx

# Fix 2: Update booking data creation (more complex - using perl for multi-line)
perl -i -pe 'BEGIN{undef $/;} s/try \{\n      const response = await fetch/try {\n      \/\/ Ensure tour_id is a string (backend expects string like '\''tour-001'\'')\n      const bookingData = {\n        tour_id: String(selectedTour.id),\n        booking_date: bookingForm.booking_date,\n        participants: Number(bookingForm.participants)\n      };\n\n      console.log('\''Creating booking with data:'\'', bookingData);\n\n      const response = await fetch/g' frontend/src/AppSimple.tsx

# Fix 3: Update the body to use bookingData
sed -i 's/body: JSON.stringify({/body: JSON.stringify(bookingData)/g' frontend/src/AppSimple.tsx
sed -i '/tour_id: selectedTour.id,/d' frontend/src/AppSimple.tsx
sed -i '/booking_date: bookingForm.booking_date,/d' frontend/src/AppSimple.tsx  
sed -i '/participants: bookingForm.participants/d' frontend/src/AppSimple.tsx
sed -i 's/})/)/g' frontend/src/AppSimple.tsx

echo "   ✅ Fixes applied"
echo ""

echo "✅ Fix Applied Successfully!"
echo ""
echo "Now rebuild frontend:"
echo "  docker-compose -f docker-compose.digitalocean.yml up -d --build frontend"
echo ""
