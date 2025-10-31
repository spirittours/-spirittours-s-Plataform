#!/bin/bash

###############################################################################
# Bundle Analyzer Script
# 
# Analyzes the production build bundle to identify optimization opportunities
# Generates visual reports and statistics about bundle composition
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Spirit Tours - Bundle Analyzer${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if build directory exists
if [ ! -d "build" ]; then
    echo -e "${YELLOW}⚠️  Build directory not found. Creating production build...${NC}"
    npm run build
fi

echo -e "${GREEN}✓ Build directory found${NC}"
echo ""

# ============================================================================
# BUNDLE SIZE ANALYSIS
# ============================================================================

echo -e "${BLUE}📦 Analyzing bundle sizes...${NC}"
echo ""

# Main bundle size
MAIN_SIZE=$(du -sh build/static/js/main.*.js 2>/dev/null | cut -f1 || echo "N/A")
echo -e "Main Bundle: ${GREEN}${MAIN_SIZE}${NC}"

# Vendor chunks size
VENDOR_SIZE=$(du -sh build/static/js/vendors*.js 2>/dev/null | cut -f1 || echo "N/A")
echo -e "Vendor Chunks: ${GREEN}${VENDOR_SIZE}${NC}"

# Total JS size
TOTAL_JS=$(du -sh build/static/js 2>/dev/null | cut -f1 || echo "N/A")
echo -e "Total JS: ${GREEN}${TOTAL_JS}${NC}"

# Total CSS size
TOTAL_CSS=$(du -sh build/static/css 2>/dev/null | cut -f1 || echo "N/A")
echo -e "Total CSS: ${GREEN}${TOTAL_CSS}${NC}"

# Total build size
TOTAL_BUILD=$(du -sh build 2>/dev/null | cut -f1 || echo "N/A")
echo -e "Total Build: ${GREEN}${TOTAL_BUILD}${NC}"

echo ""

# ============================================================================
# FILE COUNT ANALYSIS
# ============================================================================

echo -e "${BLUE}📊 File statistics...${NC}"
echo ""

JS_COUNT=$(find build/static/js -name "*.js" 2>/dev/null | wc -l || echo "0")
echo -e "JavaScript files: ${GREEN}${JS_COUNT}${NC}"

CSS_COUNT=$(find build/static/css -name "*.css" 2>/dev/null | wc -l || echo "0")
echo -e "CSS files: ${GREEN}${CSS_COUNT}${NC}"

MAP_COUNT=$(find build/static -name "*.map" 2>/dev/null | wc -l || echo "0")
echo -e "Source maps: ${GREEN}${MAP_COUNT}${NC}"

echo ""

# ============================================================================
# LARGEST FILES
# ============================================================================

echo -e "${BLUE}🔍 Top 10 largest files:${NC}"
echo ""

find build/static -type f -exec du -h {} + 2>/dev/null | \
    sort -rh | \
    head -10 | \
    awk '{printf "  %s\t%s\n", $1, $2}'

echo ""

# ============================================================================
# GZIP COMPRESSION SIMULATION
# ============================================================================

echo -e "${BLUE}🗜️  Gzip compression estimates:${NC}"
echo ""

# Check if gzip is available
if command -v gzip &> /dev/null; then
    for file in build/static/js/main.*.js; do
        if [ -f "$file" ]; then
            ORIGINAL=$(du -h "$file" | cut -f1)
            COMPRESSED=$(gzip -c "$file" | wc -c | numfmt --to=iec-i)
            echo -e "  $(basename "$file")"
            echo -e "    Original: ${YELLOW}${ORIGINAL}${NC}"
            echo -e "    Gzipped:  ${GREEN}${COMPRESSED}${NC}"
        fi
    done
else
    echo -e "${YELLOW}⚠️  gzip not available for compression analysis${NC}"
fi

echo ""

# ============================================================================
# OPTIMIZATION SUGGESTIONS
# ============================================================================

echo -e "${BLUE}💡 Optimization suggestions:${NC}"
echo ""

# Check if main bundle is too large (> 500KB)
MAIN_SIZE_KB=$(find build/static/js/main.*.js -exec du -k {} + 2>/dev/null | cut -f1 || echo "0")
if [ "$MAIN_SIZE_KB" -gt 500 ]; then
    echo -e "${YELLOW}⚠️  Main bundle is larger than 500KB${NC}"
    echo -e "   Consider implementing more aggressive code splitting"
    echo ""
fi

# Check if there are too many chunk files (> 50)
if [ "$JS_COUNT" -gt 50 ]; then
    echo -e "${YELLOW}⚠️  Too many JavaScript chunks (${JS_COUNT})${NC}"
    echo -e "   Consider consolidating some chunks"
    echo ""
fi

# Check for source maps in production
if [ "$MAP_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Source maps included in build (${MAP_COUNT} files)${NC}"
    echo -e "   Consider removing source maps for production or hosting separately"
    echo ""
fi

# Check for duplicate dependencies
if command -v npx &> /dev/null; then
    echo -e "${BLUE}🔎 Checking for duplicate dependencies...${NC}"
    npx npm-check-duplicates 2>/dev/null || echo -e "${YELLOW}   Install 'npm-check-duplicates' for this analysis${NC}"
    echo ""
fi

# ============================================================================
# RECOMMENDATIONS
# ============================================================================

echo -e "${BLUE}✅ Recommendations:${NC}"
echo ""
echo "1. Use lazy loading for route components"
echo "2. Implement dynamic imports for large features"
echo "3. Enable Gzip/Brotli compression on server"
echo "4. Use CDN for static assets"
echo "5. Implement service worker for caching"
echo "6. Consider splitting vendor bundles further"
echo "7. Remove unused dependencies"
echo "8. Optimize images and fonts"
echo ""

# ============================================================================
# VISUAL BUNDLE ANALYZER
# ============================================================================

echo -e "${BLUE}🎨 Generating visual bundle report...${NC}"
echo ""

# Check if source-map-explorer is installed
if command -v npx &> /dev/null; then
    if npm list source-map-explorer &> /dev/null; then
        echo -e "${GREEN}✓ Generating interactive bundle visualization...${NC}"
        npx source-map-explorer 'build/static/js/*.js' --html bundle-report.html
        echo -e "${GREEN}✓ Report saved to: bundle-report.html${NC}"
        echo ""
    else
        echo -e "${YELLOW}💡 Install 'source-map-explorer' for visual analysis:${NC}"
        echo -e "   npm install --save-dev source-map-explorer"
        echo ""
    fi
fi

# ============================================================================
# COMPLETION
# ============================================================================

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}✓ Bundle analysis complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "For detailed analysis, run:"
echo -e "  ${BLUE}ANALYZE=true npm run build${NC}"
echo ""
