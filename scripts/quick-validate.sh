#!/bin/bash

echo "=================================="
echo "SPIRIT TOURS - QUICK VALIDATION"
echo "=================================="
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js not found"
fi

# Check npm
if command -v npm &> /dev/null; then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm not found"
fi

# Check Python
if command -v python3 &> /dev/null; then
    echo "✅ Python: $(python3 --version)"
else
    echo "❌ Python not found"
fi

echo ""
echo "=================================="
echo "FILE CHECKS"
echo "=================================="

# Check critical files
files=(".env" "package.json" "backend/server.js" "backend/config/port-manager.js")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

echo ""
echo "=================================="
echo "SECURITY CHECKS"
echo "=================================="

# Check for default passwords
if grep -q "password\|changeme" .env 2>/dev/null; then
    echo "⚠️  Warning: Possible default passwords in .env"
else
    echo "✅ No obvious default passwords"
fi

# Check for console.log (sample)
console_count=$(grep -r "console.log" backend --include="*.js" 2>/dev/null | wc -l)
echo "ℹ️  Found $console_count console.log statements"

echo ""
echo "=================================="
echo "SCRIPT CHECKS"
echo "=================================="

scripts=("scripts/optimize-mongodb.js" "scripts/detect-bugs.js" "backend/config/port-manager.js")
for script in "${scripts[@]}"; do
    if [ -f "$script" ]; then
        echo "✅ $script exists"
    else
        echo "❌ $script missing"
    fi
done

echo ""
echo "=================================="
echo "VALIDATION COMPLETE"
echo "=================================="
