#!/bin/bash

# ============================================
# Spirit Tours CMS - Pre-Deployment Validation
# ============================================
# Validates everything is ready for production deployment
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="/home/user/webapp"
PASSED=0
FAILED=0
WARNINGS=0

print_header() {
    echo ""
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo ""
}

print_check() {
    echo -ne "  Checking: $1... "
}

print_pass() {
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
}

print_fail() {
    echo -e "${RED}❌ FAIL${NC}"
    echo -e "    ${RED}↳ $1${NC}"
    ((FAILED++))
}

print_warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}"
    echo -e "    ${YELLOW}↳ $1${NC}"
    ((WARNINGS++))
}

# ============================================
# CHECK 1: Project Structure
# ============================================

check_project_structure() {
    print_header "1. Project Structure"
    
    # Check backend exists
    print_check "Backend directory"
    if [ -d "$PROJECT_ROOT/backend" ]; then
        print_pass
    else
        print_fail "Backend directory not found"
    fi
    
    # Check frontend exists
    print_check "Frontend directory"
    if [ -d "$PROJECT_ROOT/spirit-tours" ]; then
        print_pass
    else
        print_fail "Frontend directory not found"
    fi
    
    # Check package.json files
    print_check "Backend package.json"
    if [ -f "$PROJECT_ROOT/backend/package.json" ]; then
        print_pass
    else
        print_fail "Backend package.json not found"
    fi
    
    print_check "Frontend package.json"
    if [ -f "$PROJECT_ROOT/spirit-tours/package.json" ]; then
        print_pass
    else
        print_fail "Frontend package.json not found"
    fi
    
    # Check scripts directory
    print_check "Scripts directory"
    if [ -d "$PROJECT_ROOT/scripts" ]; then
        print_pass
    else
        print_fail "Scripts directory not found"
    fi
    
    # Check seed script
    print_check "Seed script"
    if [ -f "$PROJECT_ROOT/scripts/seed-institutional-pages.js" ]; then
        print_pass
    else
        print_fail "Seed script not found"
    fi
}

# ============================================
# CHECK 2: Backend Files
# ============================================

check_backend_files() {
    print_header "2. Backend Files"
    
    # Check server.js
    print_check "Backend server.js"
    if [ -f "$PROJECT_ROOT/backend/server.js" ]; then
        print_pass
    else
        print_fail "server.js not found"
    fi
    
    # Check CMS models
    print_check "CMS models directory"
    if [ -d "$PROJECT_ROOT/backend/models/cms" ]; then
        print_pass
    else
        print_fail "CMS models directory not found"
    fi
    
    # Check CMS routes
    print_check "CMS routes directory"
    if [ -d "$PROJECT_ROOT/backend/routes/cms" ]; then
        print_pass
    else
        print_fail "CMS routes directory not found"
    fi
    
    # Check CMS services
    print_check "CMS services directory"
    if [ -d "$PROJECT_ROOT/backend/services/cms" ]; then
        print_pass
    else
        print_fail "CMS services directory not found"
    fi
    
    # Check for Mongoose in server.js
    print_check "Mongoose integration in server.js"
    if grep -q "mongoose" "$PROJECT_ROOT/backend/server.js"; then
        print_pass
    else
        print_fail "Mongoose not found in server.js"
    fi
}

# ============================================
# CHECK 3: Frontend Files
# ============================================

check_frontend_files() {
    print_header "3. Frontend Files"
    
    # Check CMS components
    print_check "CMS components directory"
    if [ -d "$PROJECT_ROOT/spirit-tours/src/components/admin/cms" ]; then
        print_pass
    else
        print_fail "CMS components directory not found"
    fi
    
    # Check PageBuilder
    print_check "PageBuilder component"
    if [ -f "$PROJECT_ROOT/spirit-tours/src/components/admin/cms/PageBuilder.jsx" ]; then
        print_pass
    else
        print_fail "PageBuilder.jsx not found"
    fi
    
    # Check PagesManagement
    print_check "PagesManagement component"
    if [ -f "$PROJECT_ROOT/spirit-tours/src/components/admin/cms/PagesManagement.jsx" ]; then
        print_pass
    else
        print_fail "PagesManagement.jsx not found"
    fi
    
    # Check blocks directory
    print_check "Blocks directory"
    if [ -d "$PROJECT_ROOT/spirit-tours/src/components/admin/cms/blocks" ]; then
        print_pass
    else
        print_fail "Blocks directory not found"
    fi
    
    # Check API client
    print_check "CMS API client"
    if [ -f "$PROJECT_ROOT/spirit-tours/src/services/api/cms/cmsAPI.js" ]; then
        print_pass
    else
        print_fail "CMS API client not found"
    fi
}

# ============================================
# CHECK 4: Dependencies
# ============================================

check_dependencies() {
    print_header "4. Dependencies"
    
    # Check Node.js
    print_check "Node.js installation"
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_pass
        echo -e "    ${BLUE}Version: $NODE_VERSION${NC}"
    else
        print_fail "Node.js not installed"
    fi
    
    # Check npm
    print_check "npm installation"
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        print_pass
        echo -e "    ${BLUE}Version: $NPM_VERSION${NC}"
    else
        print_fail "npm not installed"
    fi
    
    # Check backend node_modules
    print_check "Backend dependencies"
    if [ -d "$PROJECT_ROOT/backend/node_modules" ]; then
        print_pass
    else
        print_warn "Backend node_modules not found. Run: cd backend && npm install"
    fi
    
    # Check frontend node_modules
    print_check "Frontend dependencies"
    if [ -d "$PROJECT_ROOT/spirit-tours/node_modules" ]; then
        print_pass
    else
        print_warn "Frontend node_modules not found. Run: cd spirit-tours && npm install"
    fi
}

# ============================================
# CHECK 5: Configuration
# ============================================

check_configuration() {
    print_header "5. Configuration"
    
    # Check .env file
    print_check ".env file exists"
    if [ -f "$PROJECT_ROOT/.env" ]; then
        print_pass
    else
        print_fail ".env file not found"
    fi
    
    # Check MONGODB_URI in .env
    print_check "MONGODB_URI in .env"
    if [ -f "$PROJECT_ROOT/.env" ] && grep -q "MONGODB_URI" "$PROJECT_ROOT/.env"; then
        print_pass
    else
        print_warn "MONGODB_URI not configured in .env"
    fi
    
    # Check JWT_SECRET in .env
    print_check "JWT_SECRET in .env"
    if [ -f "$PROJECT_ROOT/.env" ] && grep -q "JWT_SECRET" "$PROJECT_ROOT/.env"; then
        print_pass
    else
        print_warn "JWT_SECRET not configured in .env"
    fi
}

# ============================================
# CHECK 6: Documentation
# ============================================

check_documentation() {
    print_header "6. Documentation"
    
    # Check CMS documentation
    print_check "CMS implementation docs"
    if [ -f "$PROJECT_ROOT/CMS_DINAMICO_FRONTEND_IMPLEMENTATION.md" ]; then
        print_pass
    else
        print_fail "CMS documentation not found"
    fi
    
    # Check MongoDB setup guide
    print_check "MongoDB setup guide"
    if [ -f "$PROJECT_ROOT/MONGODB_SETUP.md" ]; then
        print_pass
    else
        print_fail "MongoDB setup guide not found"
    fi
    
    # Check testing guide
    print_check "Testing guide"
    if [ -f "$PROJECT_ROOT/CMS_TESTING_GUIDE.md" ]; then
        print_pass
    else
        print_fail "Testing guide not found"
    fi
    
    # Check deployment checklist
    print_check "Deployment checklist"
    if [ -f "$PROJECT_ROOT/DEPLOYMENT_CHECKLIST.md" ]; then
        print_pass
    else
        print_fail "Deployment checklist not found"
    fi
    
    # Check quick start guide
    print_check "Quick start guide"
    if [ -f "$PROJECT_ROOT/QUICK_START.md" ]; then
        print_pass
    else
        print_fail "Quick start guide not found"
    fi
    
    # Check seed script docs
    print_check "Seed script documentation"
    if [ -f "$PROJECT_ROOT/scripts/README_SEED.md" ]; then
        print_pass
    else
        print_fail "Seed script documentation not found"
    fi
}

# ============================================
# CHECK 7: Utility Scripts
# ============================================

check_utility_scripts() {
    print_header "7. Utility Scripts"
    
    # Check cms-utils.sh
    print_check "CMS utilities script"
    if [ -f "$PROJECT_ROOT/scripts/cms-utils.sh" ]; then
        print_pass
    else
        print_fail "cms-utils.sh not found"
    fi
    
    # Check if executable
    print_check "cms-utils.sh is executable"
    if [ -x "$PROJECT_ROOT/scripts/cms-utils.sh" ]; then
        print_pass
    else
        print_warn "cms-utils.sh is not executable. Run: chmod +x scripts/cms-utils.sh"
    fi
    
    # Check demo scripts
    print_check "Demo start script"
    if [ -f "$PROJECT_ROOT/scripts/start-demo.sh" ]; then
        print_pass
    else
        print_warn "start-demo.sh not found"
    fi
    
    print_check "Demo stop script"
    if [ -f "$PROJECT_ROOT/scripts/stop-demo.sh" ]; then
        print_pass
    else
        print_warn "stop-demo.sh not found"
    fi
}

# ============================================
# CHECK 8: Git Status
# ============================================

check_git_status() {
    print_header "8. Git Status"
    
    # Check if git repo
    print_check "Git repository"
    if [ -d "$PROJECT_ROOT/.git" ]; then
        print_pass
    else
        print_fail "Not a git repository"
        return
    fi
    
    # Check current branch
    print_check "Current branch"
    CURRENT_BRANCH=$(cd "$PROJECT_ROOT" && git branch --show-current)
    echo -e "${GREEN}✅ PASS${NC}"
    echo -e "    ${BLUE}Branch: $CURRENT_BRANCH${NC}"
    ((PASSED++))
    
    # Check for uncommitted changes
    print_check "Uncommitted changes"
    if [ -z "$(cd "$PROJECT_ROOT" && git status --porcelain)" ]; then
        print_pass
        echo -e "    ${BLUE}Working directory clean${NC}"
    else
        print_warn "You have uncommitted changes"
        echo -e "    ${YELLOW}Run: git status${NC}"
    fi
}

# ============================================
# FINAL REPORT
# ============================================

print_final_report() {
    echo ""
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}  PRE-DEPLOYMENT CHECK COMPLETE${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo ""
    echo -e "${GREEN}✅ Passed:  $PASSED${NC}"
    echo -e "${RED}❌ Failed:  $FAILED${NC}"
    echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
    echo ""
    
    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}🎉 All critical checks passed!${NC}"
        echo ""
        echo -e "${CYAN}Next Steps:${NC}"
        echo "  1. Set up MongoDB (see MONGODB_SETUP.md)"
        echo "  2. Run seed script: node scripts/seed-institutional-pages.js"
        echo "  3. Start backend: cd backend && npm start"
        echo "  4. Start frontend: cd spirit-tours && npm start"
        echo "  5. Access CMS: http://localhost:3000/admin/cms/pages"
        echo ""
        echo -e "${CYAN}Or use demo mode (no MongoDB):${NC}"
        echo "  bash scripts/start-demo.sh"
        echo ""
        exit 0
    else
        echo -e "${RED}⚠️  Some checks failed. Please fix the issues above.${NC}"
        echo ""
        exit 1
    fi
}

# ============================================
# MAIN EXECUTION
# ============================================

main() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  SPIRIT TOURS CMS - PRE-DEPLOYMENT CHECK      ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════╝${NC}"
    
    check_project_structure
    check_backend_files
    check_frontend_files
    check_dependencies
    check_configuration
    check_documentation
    check_utility_scripts
    check_git_status
    
    print_final_report
}

# Run main
main
