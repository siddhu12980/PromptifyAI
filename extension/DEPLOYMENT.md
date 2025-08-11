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

# 🚀 Prompt Enhancer Extension - Build & Deployment Guide

## Quick Build & Test

### 1. Build the Extension

```bash
# From the extension directory
cd extension/

# Build with current version (from manifest.json)
./build.sh

# Or specify a version
./build.sh 1.0.2
```

This creates:
- `builds/prompt-enhancer-v1.0.1-store.zip` (for Chrome Web Store)
- `builds/prompt-enhancer-v1.0.1-github.zip` (for GitHub releases)
- `builds/prompt-enhancer-v1.0.1/` (unpacked for testing)

### 2. Test Locally

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the `builds/prompt-enhancer-v1.0.1/` folder
5. Test on https://chat.openai.com or https://claude.ai

## 📦 Chrome Web Store Deployment

### Prerequisites

1. **Chrome Web Store Developer Account**
   - Go to https://chrome.google.com/webstore/devconsole/
   - Pay one-time $5 registration fee
   - Verify your identity

2. **Store Assets** (create these)
   - **Icon**: 128x128px PNG (your main icon)
   - **Screenshots**: 1280x800px or 640x400px (show the extension in action)
   - **Promotional Images**: 440x280px (optional but recommended)

### Upload Process

1. **Login to Developer Console**
   - Go to https://chrome.google.com/webstore/devconsole/
   - Click "Add new item"

2. **Upload Extension**
   - Upload `builds/prompt-enhancer-v1.0.1-store.zip`
   - Chrome will validate your manifest and files

3. **Fill Store Listing**
   ```
   Extension Name: Prompt Enhancer: AI Chat Assistant
   
   Summary: 
   Enhance AI chat prompts using advanced prompt and context engineering. Works on ChatGPT and Claude.
   
   Description:
   🚀 Transform your AI conversations with intelligent prompt enhancement!
   
   Prompt Enhancer uses advanced AI techniques to automatically improve your prompts for ChatGPT and Claude, helping you get better, more detailed responses.
   
   ✨ KEY FEATURES:
   • Instant prompt enhancement with 1-click
   • Works on ChatGPT and Claude
   • Preserves your original intent
   • Multiple enhancement styles (professional, casual, detailed)
   • Secure API key storage
   • Usage history and analytics
   
   🎯 HOW IT WORKS:
   1. Type your prompt on ChatGPT or Claude
   2. Click the "Enhance" button that appears
   3. Your prompt is intelligently improved
   4. Send the enhanced version for better results
   
   💡 PERFECT FOR:
   • Content creators
   • Developers and engineers  
   • Students and researchers
   • Business professionals
   • Anyone who wants better AI responses
   
   🔒 PRIVACY & SECURITY:
   • Your API keys are encrypted and stored locally
   • No data collection or tracking
   • Open source and transparent
   
   Category: Productivity
   Language: English
   ```

4. **Upload Assets**
   - Main icon (128x128px)
   - Screenshots showing the extension working
   - Promotional images

5. **Submit for Review**
   - Review all information
   - Submit for Chrome Web Store review
   - Review typically takes 3-7 days

## 🐙 GitHub Releases

### 1. Prepare Repository

```bash
# Tag the release
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1
```

### 2. Create Release

1. Go to your GitHub repository
2. Click "Releases" → "Create a new release"
3. Choose tag `v1.0.1`
4. Title: `Prompt Enhancer v1.0.1`
5. Description:
   ```markdown
   ## 🎉 What's New in v1.0.1
   
   ### ✨ Features
   - Enhanced prompt engineering algorithms
   - Better context preservation
   - Improved UI/UX
   
   ### 🐛 Bug Fixes
   - Fixed authentication issues
   - Improved error handling
   - Better mobile responsiveness
   
   ### 📦 Installation
   - Download `prompt-enhancer-v1.0.1-github.zip`
   - Extract and load unpacked in Chrome
   - See INSTALLATION.md for detailed instructions
   
   ### 🔗 Links
   - [Chrome Web Store](https://chrome.google.com/webstore/detail/...)
   - [Installation Guide](https://github.com/your-repo/blob/main/extension/INSTALLATION.md)
   - [Report Issues](https://github.com/your-repo/issues)
   ```
6. Upload `builds/prompt-enhancer-v1.0.1-github.zip`
7. Publish release

## 🔄 Update Process

### Version Bump

1. **Update manifest.json**
   ```json
   {
     "version": "1.0.2"
   }
   ```

2. **Build new version**
   ```bash
   ./build.sh 1.0.2
   ```

3. **Test thoroughly**
   ```bash
   # Load the new build
   chrome://extensions/ → Load unpacked → builds/prompt-enhancer-v1.0.2/
   ```

### Chrome Web Store Update

1. Go to Developer Console
2. Find your extension
3. Click "Package" → "Upload new package"
4. Upload new ZIP file
5. Update store listing if needed
6. Submit for review

## 📊 Analytics & Monitoring

### Chrome Web Store Metrics
- Users (installs, active users)
- Ratings and reviews
- Crash reports

### GitHub Metrics
- Download counts
- Issue reports
- Star count

## 🛡️ Security Considerations

### Before Publishing

1. **Code Review**
   - No hardcoded API keys
   - Proper permission usage
   - Input validation

2. **Manifest Security**
   ```json
   {
     "permissions": ["storage", "activeTab", "scripting", "tabs"],
     "host_permissions": [
       "https://chat.openai.com/*",
       "https://claude.ai/*"
     ]
   }
   ```

3. **Content Security Policy**
   - No inline scripts
   - Proper CSP headers
   - Secure external resources

## 🚨 Troubleshooting

### Build Issues

```bash
# Permission denied
chmod +x build.sh

# Missing zip command
sudo apt install zip  # Ubuntu/Debian
brew install zip      # macOS
```

### Store Rejection

Common reasons:
- **Permissions**: Too broad permissions
- **Description**: Unclear or missing functionality
- **Screenshots**: Poor quality or missing
- **Code**: Security issues or malicious behavior

### Recovery Steps

1. Read rejection email carefully
2. Fix identified issues
3. Test thoroughly
4. Resubmit with changelog

## 📋 Checklist

### Pre-Deploy
- [ ] Code tested on multiple sites
- [ ] No console errors
- [ ] API keys work correctly
- [ ] UI looks good on different screen sizes
- [ ] Permissions are minimal
- [ ] Version bumped in manifest.json

### Store Submission
- [ ] High-quality screenshots
- [ ] Clear description with features
- [ ] Proper categorization
- [ ] Contact information provided
- [ ] Privacy policy (if collecting data)

### Post-Deploy
- [ ] Monitor for reviews
- [ ] Watch for crash reports  
- [ ] Update documentation
- [ ] Plan next features

## 🎯 Success Tips

1. **Quality Screenshots**: Show the extension actually working
2. **Clear Description**: Focus on user benefits, not technical details
3. **Responsive Support**: Reply to reviews and fix issues quickly
4. **Regular Updates**: Keep the extension current with platform changes
5. **User Feedback**: Listen to users and implement requested features

---

Your extension is ready for deployment! 🚀

The build script handles everything automatically, and your extension follows all Chrome Web Store guidelines. 