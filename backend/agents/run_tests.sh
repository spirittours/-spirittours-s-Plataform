#!/bin/bash
#
# AI Agents Test Runner
#
# Runs the complete test suite for the AI agents system.
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}AI AGENTS TEST SUITE${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo -e "${RED}Error: pytest is not installed${NC}"
    echo -e "${YELLOW}Install with: pip install pytest pytest-asyncio${NC}"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "pytest.ini" ]; then
    echo -e "${RED}Error: Must be run from backend/agents directory${NC}"
    exit 1
fi

# Run tests
echo -e "${YELLOW}Running tests...${NC}"
echo ""

# Run with coverage if available
if command -v pytest-cov &> /dev/null; then
    pytest --cov=. --cov-report=term-missing --cov-report=html
else
    pytest
fi

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}❌ TESTS FAILED${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi
