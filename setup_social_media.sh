#!/bin/bash

# Spirit Tours - Social Media System Setup Script
# Automates deployment steps for quick setup

set -e  # Exit on error

echo "🚀 Spirit Tours Social Media System - Setup Script"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

# Check if running from correct directory
if [ ! -f "setup_social_media.sh" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

echo "Step 1: Checking Prerequisites"
echo "--------------------------------"

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    print_success "Python installed: $PYTHON_VERSION"
else
    print_error "Python 3 is not installed"
    exit 1
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version)
    print_success "PostgreSQL installed: $PSQL_VERSION"
else
    print_warning "PostgreSQL not found. Please install PostgreSQL 14+"
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_warning "Node.js not found. Please install Node.js 16+"
fi

echo ""
echo "Step 2: Generating Encryption Key"
echo "-----------------------------------"

# Generate encryption key
ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

if [ -z "$ENCRYPTION_KEY" ]; then
    print_error "Failed to generate encryption key"
    exit 1
fi

print_success "Encryption key generated"
print_info "Key: $ENCRYPTION_KEY"
print_warning "SAVE THIS KEY SECURELY! You'll need it for .env configuration"

echo ""
echo "Step 3: Creating Backend .env File"
echo "------------------------------------"

# Create backend .env file
if [ ! -f "backend/.env" ]; then
    cat > backend/.env << EOF
# Database Configuration
DATABASE_URL=postgresql://spirit_tours_user:your_secure_password@localhost:5432/spirit_tours

# Social Media Encryption Key
SOCIAL_CREDENTIALS_ENCRYPTION_KEY=$ENCRYPTION_KEY

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:8000

# Security
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Admin User
ADMIN_EMAIL=admin@spirittours.com
ADMIN_PASSWORD=admin123
EOF

    print_success "Created backend/.env"
    print_warning "Edit backend/.env and change:"
    print_warning "  - DATABASE_URL (update password)"
    print_warning "  - ADMIN_PASSWORD (change from default)"
else
    print_info "backend/.env already exists, skipping"
fi

echo ""
echo "Step 4: Installing Backend Dependencies"
echo "-----------------------------------------"

cd backend

# Check if venv exists
if [ ! -d "venv" ]; then
    print_info "Creating virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
fi

# Activate venv and install dependencies
print_info "Installing Python packages..."
source venv/bin/activate

pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt > /dev/null 2>&1

# Install additional dependencies
print_info "Installing social media dependencies..."
pip install httpx cryptography python-dotenv > /dev/null 2>&1

print_success "Backend dependencies installed"

echo ""
echo "Step 5: Database Migrations"
echo "----------------------------"

print_info "Checking database connection..."

# Test database connection
if psql -U spirit_tours_user -d spirit_tours -c "SELECT 1;" &> /dev/null; then
    print_success "Database connection successful"
    
    print_info "Running database migrations..."
    alembic upgrade head
    
    if [ $? -eq 0 ]; then
        print_success "Database migrations completed"
    else
        print_error "Database migrations failed"
        print_info "Please check your DATABASE_URL in backend/.env"
    fi
else
    print_warning "Could not connect to database"
    print_info "Please ensure PostgreSQL is running and configured"
    print_info "Run these commands manually:"
    print_info "  sudo -u postgres psql"
    print_info "  CREATE DATABASE spirit_tours;"
    print_info "  CREATE USER spirit_tours_user WITH PASSWORD 'your_password';"
    print_info "  GRANT ALL PRIVILEGES ON DATABASE spirit_tours TO spirit_tours_user;"
fi

cd ..

echo ""
echo "Step 6: Frontend Configuration"
echo "--------------------------------"

cd frontend

# Create frontend .env
if [ ! -f ".env" ]; then
    cat > .env << EOF
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENV=development
EOF
    print_success "Created frontend/.env"
else
    print_info "frontend/.env already exists, skipping"
fi

# Install frontend dependencies
print_info "Installing Node.js packages..."
npm install > /dev/null 2>&1

if [ $? -eq 0 ]; then
    print_success "Frontend dependencies installed"
else
    print_warning "Some frontend dependencies may have issues"
    print_info "Run 'npm install' manually if needed"
fi

cd ..

echo ""
echo "Step 7: Testing Encryption Service"
echo "------------------------------------"

cd backend
source venv/bin/activate

python3 << 'PYTHON_EOF'
import os
from services.social_media_encryption import get_encryption_service

try:
    service = get_encryption_service()
    
    # Test encryption
    test_value = "test_secret_123"
    encrypted = service.encrypt(test_value)
    decrypted = service.decrypt(encrypted)
    
    if decrypted == test_value:
        print("✅ Encryption test: PASSED")
    else:
        print("❌ Encryption test: FAILED")
except Exception as e:
    print(f"❌ Encryption test error: {e}")
PYTHON_EOF

cd ..

echo ""
echo "=============================================="
echo "🎉 Setup Complete!"
echo "=============================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1️⃣  Edit configuration files:"
echo "   backend/.env    - Update DATABASE_URL and ADMIN_PASSWORD"
echo "   frontend/.env   - Update API_URL for production"
echo ""
echo "2️⃣  Start the backend server:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "3️⃣  Start the frontend server (in another terminal):"
echo "   cd frontend"
echo "   npm start"
echo ""
echo "4️⃣  Access the admin dashboard:"
echo "   http://localhost:3000/admin/social-media"
echo ""
echo "5️⃣  Obtain API credentials:"
echo "   Follow API_KEYS_STEP_BY_STEP_GUIDE.md"
echo ""
echo "📚 Documentation:"
echo "   - DEPLOYMENT_GUIDE_SOCIAL_MEDIA.md"
echo "   - API_KEYS_STEP_BY_STEP_GUIDE.md"
echo "   - FEATURE_16_SOCIAL_MEDIA_AI_COMPLETO.md"
echo ""
echo "🔐 Encryption Key (SAVE THIS!):"
echo "   $ENCRYPTION_KEY"
echo ""
echo "=============================================="
