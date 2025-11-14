#!/bin/bash

# Spirit Tours - Frontend Deployment Script
# This script rebuilds the frontend and copies it to the production location

set -e  # Exit on error

echo "🚀 Starting Frontend Deployment..."

# Navigate to frontend directory
cd "$(dirname "$0")/frontend"

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building production bundle..."
npm run build

echo "✅ Frontend built successfully!"
echo ""
echo "📁 Build output is in: ./frontend/build/"
echo ""
echo "🔧 Next steps:"
echo "1. Copy build files to your web server directory"
echo "2. Example for Nginx:"
echo "   sudo cp -r ./frontend/build/* /var/www/html/spirittours/"
echo "   OR"
echo "   sudo rsync -av --delete ./frontend/build/ /var/www/html/spirittours/"
echo ""
echo "3. Restart Nginx if needed:"
echo "   sudo systemctl reload nginx"
