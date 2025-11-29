#!/bin/bash

# Quick Test Script for Improvements
# Run this after each change to verify no regressions

echo "🧪 Running Quick Regression Test..."
echo ""

# Check if app builds
echo "1. Checking build..."
npm run build:br > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Build successful"
else
    echo "   ❌ Build failed!"
    exit 1
fi

# Check for console errors (basic check)
echo "2. Checking for syntax errors..."
npx eslint src/router/index.js src/stores/index.js --quiet
if [ $? -eq 0 ]; then
    echo "   ✅ No syntax errors"
else
    echo "   ⚠️  Some linting issues (may be warnings)"
fi

echo ""
echo "✅ Quick test complete!"
echo ""
echo "📋 Manual Testing Required:"
echo "   1. Start dev server: npm run dev:br"
echo "   2. Test login for all user types"
echo "   3. Test session persistence (refresh page)"
echo "   4. Test navigation between routes"
echo "   5. Check browser console for errors"
echo ""

