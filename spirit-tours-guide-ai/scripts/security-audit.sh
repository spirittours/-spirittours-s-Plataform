#!/bin/bash

# Spirit Tours AI Guide - Security Audit Script
# Basic security checks for production deployment

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ISSUES_FOUND=0

echo "🔐 Spirit Tours Security Audit"
echo "=============================="
echo ""

# Check .env file permissions
echo "📁 Checking .env file security..."
if [ -f ".env" ]; then
    PERMS=$(stat -c "%a" .env 2>/dev/null || stat -f "%A" .env 2>/dev/null)
    if [ "$PERMS" = "600" ] || [ "$PERMS" = "400" ]; then
        echo -e "${GREEN}✅ .env file permissions are secure ($PERMS)${NC}"
    else
        echo -e "${RED}❌ .env file permissions are too open ($PERMS)${NC}"
        echo "   Run: chmod 600 .env"
        ((ISSUES_FOUND++))
    fi
else
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
fi

# Check for default passwords
echo ""
echo "🔑 Checking for default/weak configurations..."
if [ -f ".env" ]; then
    if grep -qi "change_this" .env; then
        echo -e "${RED}❌ Found 'change_this' in .env - update with secure values${NC}"
        ((ISSUES_FOUND++))
    else
        echo -e "${GREEN}✅ No obvious default passwords found${NC}"
    fi
    
    # Check JWT secret length
    JWT_SECRET=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2 || echo "")
    if [ ${#JWT_SECRET} -lt 32 ]; then
        echo -e "${RED}❌ JWT_SECRET is too short (${#JWT_SECRET} chars, should be 32+)${NC}"
        ((ISSUES_FOUND++))
    else
        echo -e "${GREEN}✅ JWT_SECRET length is adequate (${#JWT_SECRET} chars)${NC}"
    fi
fi

# Check Node.js version
echo ""
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    echo -e "${GREEN}✅ Node.js version is up to date (v$NODE_VERSION)${NC}"
else
    echo -e "${RED}❌ Node.js version is outdated (v$NODE_VERSION). Update to v18+${NC}"
    ((ISSUES_FOUND++))
fi

# Check for known vulnerabilities in dependencies
echo ""
echo "🔍 Checking for vulnerable dependencies..."
if command -v npm &> /dev/null; then
    if npm audit --production > /dev/null 2>&1; then
        echo -e "${GREEN}✅ No high/critical vulnerabilities found${NC}"
    else
        echo -e "${YELLOW}⚠️  Vulnerabilities found - run 'npm audit' for details${NC}"
        echo "   Run: npm audit fix"
        ((ISSUES_FOUND++))
    fi
else
    echo -e "${YELLOW}⚠️  npm not available, skipping dependency check${NC}"
fi

# Check SSL/TLS configuration
echo ""
echo "🔒 Checking SSL/TLS configuration..."
if [ -f "nginx/conf.d/default.conf" ]; then
    if grep -q "ssl_protocols TLSv1.2 TLSv1.3" nginx/conf.d/default.conf; then
        echo -e "${GREEN}✅ TLS 1.2/1.3 configured in Nginx${NC}"
    else
        echo -e "${RED}❌ Weak TLS configuration in Nginx${NC}"
        ((ISSUES_FOUND++))
    fi
    
    if grep -q "ssl_ciphers" nginx/conf.d/default.conf; then
        echo -e "${GREEN}✅ Cipher configuration found${NC}"
    else
        echo -e "${YELLOW}⚠️  No cipher configuration in Nginx${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Nginx configuration not found${NC}"
fi

# Check for exposed secrets in code
echo ""
echo "🔎 Scanning for exposed secrets..."
if command -v grep &> /dev/null; then
    # Check for potential API keys in code
    PATTERNS=("sk-" "api_key" "password" "secret" "token")
    FOUND_SECRETS=false
    
    for pattern in "${PATTERNS[@]}"; do
        if grep -r --exclude-dir={node_modules,.git,build,dist} --exclude="*.md" -i "$pattern" backend/ 2>/dev/null | grep -v "process.env" | grep -q .; then
            if [ "$FOUND_SECRETS" = false ]; then
                echo -e "${RED}❌ Potential secrets found in code:${NC}"
                FOUND_SECRETS=true
                ((ISSUES_FOUND++))
            fi
            echo -e "   ${YELLOW}Pattern '$pattern' found - review manually${NC}"
        fi
    done
    
    if [ "$FOUND_SECRETS" = false ]; then
        echo -e "${GREEN}✅ No obvious exposed secrets in code${NC}"
    fi
fi

# Check CORS configuration
echo ""
echo "🌐 Checking CORS configuration..."
if grep -q "CORS_ORIGIN=\*" .env 2>/dev/null; then
    echo -e "${YELLOW}⚠️  CORS is set to allow all origins (*)${NC}"
    echo "   Consider restricting to specific domains in production"
    ((ISSUES_FOUND++))
else
    echo -e "${GREEN}✅ CORS appears to be configured with specific origins${NC}"
fi

# Check for Docker security
if command -v docker &> /dev/null; then
    echo ""
    echo "🐳 Checking Docker security..."
    
    # Check if containers run as root
    if docker ps --format "{{.Names}}" | grep -q spirit-tours; then
        CONTAINERS=$(docker ps --filter "name=spirit-tours" --format "{{.Names}}")
        for container in $CONTAINERS; do
            USER=$(docker inspect --format='{{.Config.User}}' $container 2>/dev/null || echo "root")
            if [ "$USER" = "root" ] || [ -z "$USER" ]; then
                echo -e "${YELLOW}⚠️  Container $container runs as root${NC}"
                ((ISSUES_FOUND++))
            else
                echo -e "${GREEN}✅ Container $container runs as non-root user${NC}"
            fi
        done
    fi
fi

# Check rate limiting
echo ""
echo "🚦 Checking rate limiting..."
if grep -q "express-rate-limit" package.json; then
    echo -e "${GREEN}✅ Rate limiting package installed${NC}"
    if grep -q "rateLimit" backend/server.js 2>/dev/null; then
        echo -e "${GREEN}✅ Rate limiting configured in server${NC}"
    else
        echo -e "${YELLOW}⚠️  Rate limiting not configured in server${NC}"
    fi
else
    echo -e "${RED}❌ Rate limiting package not installed${NC}"
    ((ISSUES_FOUND++))
fi

# Check security headers
echo ""
echo "🛡️  Checking security headers..."
if grep -q "helmet" package.json; then
    echo -e "${GREEN}✅ Helmet security middleware installed${NC}"
    if grep -q "helmet()" backend/server.js 2>/dev/null; then
        echo -e "${GREEN}✅ Helmet configured in server${NC}"
    else
        echo -e "${YELLOW}⚠️  Helmet not used in server${NC}"
    fi
else
    echo -e "${RED}❌ Helmet security middleware not installed${NC}"
    ((ISSUES_FOUND++))
fi

# Summary
echo ""
echo "=============================="
if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ Security Audit: PASSED${NC}"
    echo "No critical security issues found"
    exit 0
elif [ $ISSUES_FOUND -le 3 ]; then
    echo -e "${YELLOW}⚠️  Security Audit: WARNINGS${NC}"
    echo "$ISSUES_FOUND issue(s) found - review recommended"
    exit 1
else
    echo -e "${RED}❌ Security Audit: FAILED${NC}"
    echo "$ISSUES_FOUND issue(s) found - action required"
    exit 2
fi
