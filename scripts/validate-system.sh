#!/bin/bash

# =====================================================
# SYSTEM VALIDATION SCRIPT
# Validates the entire Spirit Tours system
# =====================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     SPIRIT TOURS - SYSTEM VALIDATION SCRIPT              ║"
echo "╔═══════════════════════════════════════════════════════════╗"
echo ""

# Track results
PASSED=0
FAILED=0
WARNINGS=0

# Function to print results
print_result() {
    local status=$1
    local message=$2
    
    if [ "$status" = "pass" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $message"
        ((PASSED++))
    elif [ "$status" = "fail" ]; then
        echo -e "${RED}❌ FAIL${NC}: $message"
        ((FAILED++))
    elif [ "$status" = "warn" ]; then
        echo -e "${YELLOW}⚠️  WARN${NC}: $message"
        ((WARNINGS++))
    else
        echo -e "${BLUE}ℹ️  INFO${NC}: $message"
    fi
}

echo "═══════════════════════════════════════════════════════════"
echo "1. CHECKING ENVIRONMENT"
echo "═══════════════════════════════════════════════════════════"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_result "pass" "Node.js installed: $NODE_VERSION"
else
    print_result "fail" "Node.js not found"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_result "pass" "npm installed: $NPM_VERSION"
else
    print_result "fail" "npm not found"
fi

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    print_result "pass" "Python installed: $PYTHON_VERSION"
else
    print_result "fail" "Python not found"
fi

# Check MongoDB
if command -v mongod &> /dev/null; then
    MONGO_VERSION=$(mongod --version | head -n 1)
    print_result "pass" "MongoDB installed"
else
    print_result "warn" "MongoDB not found (optional)"
fi

# Check Redis
if command -v redis-server &> /dev/null; then
    REDIS_VERSION=$(redis-server --version)
    print_result "pass" "Redis installed"
else
    print_result "warn" "Redis not found (optional)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "2. CHECKING CONFIGURATION FILES"
echo "═══════════════════════════════════════════════════════════"

# Check .env file
if [ -f ".env" ]; then
    print_result "pass" ".env file exists"
    
    # Check for default passwords
    if grep -q "password\|changeme" .env; then
        print_result "fail" "Default passwords found in .env - MUST CHANGE!"
    else
        print_result "pass" "No default passwords in .env"
    fi
else
    print_result "fail" ".env file not found"
fi

# Check .env.secure
if [ -f ".env.secure" ]; then
    print_result "pass" ".env.secure template exists"
else
    print_result "warn" ".env.secure not found"
fi

# Check package.json
if [ -f "package.json" ]; then
    print_result "pass" "package.json exists"
else
    print_result "fail" "package.json not found"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "3. CHECKING DEPENDENCIES"
echo "═══════════════════════════════════════════════════════════"

# Check node_modules
if [ -d "node_modules" ]; then
    MODULE_COUNT=$(ls -1 node_modules | wc -l)
    print_result "pass" "node_modules exists ($MODULE_COUNT packages)"
else
    print_result "fail" "node_modules not found - run 'npm install'"
fi

# Check for security vulnerabilities
if command -v npm &> /dev/null; then
    echo ""
    echo "Running npm audit..."
    AUDIT_RESULT=$(npm audit --audit-level=moderate 2>&1 || true)
    
    if echo "$AUDIT_RESULT" | grep -q "found 0 vulnerabilities"; then
        print_result "pass" "No security vulnerabilities found"
    else
        print_result "warn" "Security vulnerabilities found - run 'npm audit fix'"
    fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "4. CHECKING FILE STRUCTURE"
echo "═══════════════════════════════════════════════════════════"

# Check critical directories
REQUIRED_DIRS=("backend" "frontend" "scripts" "logs")

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        print_result "pass" "Directory exists: $dir"
    else
        print_result "fail" "Directory missing: $dir"
    fi
done

# Check critical files
REQUIRED_FILES=(
    "backend/server.js"
    "backend/config/port-manager.js"
    "scripts/optimize-mongodb.js"
    "scripts/detect-bugs.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_result "pass" "File exists: $file"
    else
        print_result "fail" "File missing: $file"
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "5. CHECKING CODE QUALITY"
echo "═══════════════════════════════════════════════════════════"

# Check for syntax errors in JavaScript files
echo "Checking JavaScript syntax..."
JS_ERRORS=0
for file in $(find backend -name "*.js" -type f 2>/dev/null | head -10); do
    if ! node -c "$file" 2>/dev/null; then
        print_result "fail" "Syntax error in: $file"
        ((JS_ERRORS++))
    fi
done

if [ $JS_ERRORS -eq 0 ]; then
    print_result "pass" "No JavaScript syntax errors found"
fi

# Check for Python syntax errors
echo "Checking Python syntax..."
PY_ERRORS=0
for file in $(find backend -name "*.py" -type f 2>/dev/null | head -10); do
    if ! python3 -m py_compile "$file" 2>/dev/null; then
        print_result "fail" "Syntax error in: $file"
        ((PY_ERRORS++))
    fi
done

if [ $PY_ERRORS -eq 0 ]; then
    print_result "pass" "No Python syntax errors found"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "6. CHECKING PORTS"
echo "═══════════════════════════════════════════════════════════"

# Check if critical ports are available
PORTS=(5000 5001 5002 3000)

for port in "${PORTS[@]}"; do
    if ! lsof -i:$port &> /dev/null; then
        print_result "pass" "Port $port is available"
    else
        print_result "warn" "Port $port is in use"
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "7. SECURITY CHECKS"
echo "═══════════════════════════════════════════════════════════"

# Check for exposed secrets
if grep -r "password.*=.*['\"].*['\"]" backend --include="*.js" 2>/dev/null | grep -v "process.env" | head -1 &>/dev/null; then
    print_result "fail" "Hardcoded passwords found in code"
else
    print_result "pass" "No hardcoded passwords found"
fi

# Check for console.log in production code
CONSOLE_COUNT=$(grep -r "console.log" backend --include="*.js" 2>/dev/null | wc -l)
if [ $CONSOLE_COUNT -gt 0 ]; then
    print_result "warn" "Found $CONSOLE_COUNT console.log statements"
else
    print_result "pass" "No console.log statements found"
fi

# Check for debugger statements
DEBUGGER_COUNT=$(grep -r "debugger" backend --include="*.js" 2>/dev/null | wc -l)
if [ $DEBUGGER_COUNT -gt 0 ]; then
    print_result "fail" "Found $DEBUGGER_COUNT debugger statements"
else
    print_result "pass" "No debugger statements found"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "8. DOCUMENTATION"
echo "═══════════════════════════════════════════════════════════"

# Check for README
if [ -f "README.md" ]; then
    print_result "pass" "README.md exists"
else
    print_result "warn" "README.md not found"
fi

# Check for system analysis reports
if [ -f "SYSTEM_ANALYSIS_REPORT_2025.md" ]; then
    print_result "pass" "System analysis report exists"
else
    print_result "warn" "System analysis report not found"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "VALIDATION SUMMARY"
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo "═══════════════════════════════════════════════════════════"

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 SYSTEM VALIDATION PASSED!${NC}"
    echo "System is ready for deployment (address warnings if possible)"
    exit 0
else
    echo -e "${RED}❌ SYSTEM VALIDATION FAILED!${NC}"
    echo "Please fix the failed checks before deployment"
    exit 1
fi
