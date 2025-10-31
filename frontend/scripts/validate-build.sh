#!/bin/bash

# ============================================
# BUILD VALIDATION SCRIPT
# Spirit Tours Frontend
# ============================================

set -e  # Exit on error

echo "🚀 Starting Spirit Tours Frontend Build Validation..."
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "ℹ $1"
}

# ============================================
# 1. Check Prerequisites
# ============================================
echo ""
echo "📋 Step 1: Checking Prerequisites..."
echo "============================================"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
    
    # Check if version is >= 18
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -lt 18 ]; then
        print_error "Node.js version must be >= 18.x (current: $NODE_VERSION)"
        exit 1
    fi
else
    print_error "Node.js is not installed"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm installed: $NPM_VERSION"
else
    print_error "npm is not installed"
    exit 1
fi

# Check Git
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version)
    print_success "Git installed: $GIT_VERSION"
else
    print_warning "Git is not installed (optional)"
fi

# ============================================
# 2. Check Project Structure
# ============================================
echo ""
echo "📁 Step 2: Checking Project Structure..."
echo "============================================"

# Check required files
REQUIRED_FILES=(
    "package.json"
    "tsconfig.json"
    ".env.example"
    "public/index.html"
    "src/index.tsx"
    "src/App.tsx"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "Found: $file"
    else
        print_error "Missing: $file"
        exit 1
    fi
done

# Check required directories
REQUIRED_DIRS=(
    "src/components"
    "src/services"
    "public"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        print_success "Found: $dir/"
    else
        print_error "Missing: $dir/"
        exit 1
    fi
done

# ============================================
# 3. Check Environment Variables
# ============================================
echo ""
echo "🔧 Step 3: Checking Environment Variables..."
echo "============================================"

if [ -f ".env.local" ]; then
    print_success "Found .env.local"
elif [ -f ".env" ]; then
    print_success "Found .env"
else
    print_warning "No .env.local or .env file found"
    print_info "Creating .env.local from .env.example..."
    cp .env.example .env.local
    print_success "Created .env.local"
fi

# ============================================
# 4. Install Dependencies
# ============================================
echo ""
echo "📦 Step 4: Installing Dependencies..."
echo "============================================"

if [ -d "node_modules" ]; then
    print_info "node_modules exists, checking if update needed..."
    npm ci --quiet
    print_success "Dependencies verified and updated"
else
    print_info "Installing dependencies (this may take a few minutes)..."
    npm ci --quiet
    print_success "Dependencies installed successfully"
fi

# ============================================
# 5. TypeScript Type Checking
# ============================================
echo ""
echo "🔍 Step 5: TypeScript Type Checking..."
echo "============================================"

print_info "Running TypeScript compiler check..."
if npx tsc --noEmit; then
    print_success "TypeScript type checking passed"
else
    print_error "TypeScript type checking failed"
    exit 1
fi

# ============================================
# 6. Linting (Optional)
# ============================================
echo ""
echo "🔎 Step 6: Code Linting (Optional)..."
echo "============================================"

if npm run lint --silent 2>/dev/null; then
    print_success "Linting passed"
else
    print_warning "Linting skipped or failed (not critical)"
fi

# ============================================
# 7. Build Production Bundle
# ============================================
echo ""
echo "🏗️  Step 7: Building Production Bundle..."
echo "============================================"

print_info "Running production build (this may take a few minutes)..."

# Clean previous build
if [ -d "build" ]; then
    rm -rf build
    print_info "Cleaned previous build"
fi

# Run build
if GENERATE_SOURCEMAP=false npm run build; then
    print_success "Production build completed successfully"
else
    print_error "Production build failed"
    exit 1
fi

# ============================================
# 8. Analyze Build Output
# ============================================
echo ""
echo "📊 Step 8: Analyzing Build Output..."
echo "============================================"

if [ -d "build" ]; then
    BUILD_SIZE=$(du -sh build | cut -f1)
    print_success "Build directory size: $BUILD_SIZE"
    
    # Check for main files
    if [ -f "build/index.html" ]; then
        print_success "Found: build/index.html"
    else
        print_error "Missing: build/index.html"
        exit 1
    fi
    
    if [ -d "build/static" ]; then
        print_success "Found: build/static/"
        
        # Count JS and CSS files
        JS_COUNT=$(find build/static/js -name "*.js" 2>/dev/null | wc -l)
        CSS_COUNT=$(find build/static/css -name "*.css" 2>/dev/null | wc -l)
        
        print_info "JavaScript chunks: $JS_COUNT"
        print_info "CSS files: $CSS_COUNT"
    else
        print_error "Missing: build/static/"
        exit 1
    fi
    
    # List largest files
    print_info "Largest files in build:"
    find build -type f -exec du -h {} + | sort -rh | head -5
    
else
    print_error "Build directory not created"
    exit 1
fi

# ============================================
# 9. Security Check (Optional)
# ============================================
echo ""
echo "🔒 Step 9: Security Audit (Optional)..."
echo "============================================"

print_info "Running npm audit..."
if npm audit --production 2>/dev/null; then
    print_success "No vulnerabilities found"
else
    print_warning "Some vulnerabilities found (review npm audit output)"
fi

# ============================================
# 10. Test Build Locally (Optional)
# ============================================
echo ""
echo "🧪 Step 10: Testing Build Locally..."
echo "============================================"

print_info "To test the build locally, run:"
echo "  npx serve -s build -p 3000"
echo "  Then open http://localhost:3000"

# ============================================
# Summary
# ============================================
echo ""
echo "============================================"
echo "✅ BUILD VALIDATION COMPLETE!"
echo "============================================"
echo ""
echo "📊 Summary:"
echo "  - Node.js: $NODE_VERSION"
echo "  - npm: $NPM_VERSION"
echo "  - Build size: $BUILD_SIZE"
echo "  - JavaScript chunks: $JS_COUNT"
echo "  - CSS files: $CSS_COUNT"
echo ""
echo "🚀 Next Steps:"
echo "  1. Test build locally: npx serve -s build"
echo "  2. Review PRODUCTION_DEPLOYMENT_GUIDE.md"
echo "  3. Configure production environment variables"
echo "  4. Deploy to staging environment"
echo "  5. Run smoke tests"
echo "  6. Deploy to production"
echo ""
echo "📚 Documentation:"
echo "  - Backend Integration: BACKEND_INTEGRATION_GUIDE.md"
echo "  - Deployment Guide: PRODUCTION_DEPLOYMENT_GUIDE.md"
echo ""

exit 0
