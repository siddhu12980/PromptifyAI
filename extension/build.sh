#!/bin/bash

# Prompt Enhancer Extension Build Script
# Usage: ./build.sh [version]

set -e

VERSION=${1:-$(grep '"version"' manifest.json | sed 's/.*"version": "\(.*\)".*/\1/')}
BUILD_DIR="builds"
PACKAGE_NAME="prompt-enhancer-v${VERSION}"

echo "🚀 Building Prompt Enhancer Extension v${VERSION}"

# Create build directory
mkdir -p ${BUILD_DIR}
cd ${BUILD_DIR}

# Clean previous build
rm -rf ${PACKAGE_NAME}
mkdir ${PACKAGE_NAME}

echo "📁 Copying extension files..."

# Copy essential files
cp -r ../icons ${PACKAGE_NAME}/
cp -r ../background ${PACKAGE_NAME}/
cp -r ../content ${PACKAGE_NAME}/
cp -r ../popup ${PACKAGE_NAME}/
cp -r ../options ${PACKAGE_NAME}/
cp ../manifest.json ${PACKAGE_NAME}/
cp ../util.js ${PACKAGE_NAME}/

# Copy documentation for distribution
cp ../INSTALLATION.md ${PACKAGE_NAME}/
cp ../README.md ${PACKAGE_NAME}/

echo "📦 Creating distribution packages..."

# Create ZIP for Chrome Web Store
cd ${PACKAGE_NAME}
zip -r ../${PACKAGE_NAME}-store.zip . -x "*.md"
cd ..

# Create ZIP with docs for GitHub releases
zip -r ${PACKAGE_NAME}-github.zip ${PACKAGE_NAME}/

echo "✅ Build complete!"
echo "📄 Files created:"
echo "   - ${BUILD_DIR}/${PACKAGE_NAME}-store.zip (for Chrome Web Store)"
echo "   - ${BUILD_DIR}/${PACKAGE_NAME}-github.zip (for GitHub releases)"
echo "   - ${BUILD_DIR}/${PACKAGE_NAME}/ (unpacked for testing)"

echo ""
echo "🎯 Next steps:"
echo "   1. Test the unpacked extension: chrome://extensions/ -> Load unpacked"
echo "   2. Upload ${PACKAGE_NAME}-store.zip to Chrome Web Store"
echo "   3. Create GitHub release with ${PACKAGE_NAME}-github.zip" 