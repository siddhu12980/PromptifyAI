# 🚀 Quick Start - Get Your Extension Running in 3 Minutes

## Step 1: Load the Extension (1 minute)

1. **Open Chrome** and go to `chrome://extensions/`
2. **Enable Developer mode** (toggle in top-right)
3. **Click "Load unpacked"**
4. **Select the `extension` folder** from this project
5. **Pin the extension** to your toolbar (puzzle piece icon → pin)

## Step 2: Add Your API Key (1 minute)

### Option A: OpenAI (Recommended for testing)
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)

### Option B: Anthropic/Claude
1. Go to https://console.anthropic.com/
2. Create an API key
3. Copy the key

### Configure the Extension:
1. **Right-click the extension icon** → "Options"
2. **Paste your API key** in the appropriate field
3. **Click "Save Settings"**

## Step 3: Test It (1 minute)

1. **Go to https://chat.openai.com** (or https://claude.ai)
2. **Type something** in the chat input (e.g., "help me write an email")
3. **Look for the "Enhance Prompt" button** above the input box
4. **Click it** and watch your prompt get enhanced!

---

## 🛠 Troubleshooting

### "I don't see the Enhance button"

**Quick Debug:**
1. Open Developer Console (`F12`)
2. Copy and paste this test script:

```javascript
// Copy this entire block and paste in console
console.log("🧪 Quick Extension Test");
const overlay = document.querySelector('.pe-overlay');
const button = document.querySelector('.pe-enhance-btn');
if (overlay || button) {
  console.log("✅ Extension loaded!");
} else {
  console.log("❌ Extension not found. Check:");
  console.log("- Are you on chat.openai.com or claude.ai?");
  console.log("- Is extension enabled in chrome://extensions/?");
  console.log("- Try refreshing the page");
}
```

### "API Error" or "No response"

1. **Check your API key** in extension options
2. **Verify the key works** by testing it directly in the API playground
3. **Check your API credits/billing**

### "Extension not loading"

1. **Go to `chrome://extensions/`**
2. **Click "Reload" button** under your extension
3. **Check for error messages** in red
4. **Try closing and reopening Chrome**

---

## 🎯 What Should Happen

When working correctly:

1. **Yellow "Enhance Prompt" button** appears above the input box
2. **Clicking it shows a panel** with "Enhancing..." status
3. **After a few seconds**, you get an improved version of your prompt
4. **Click "Replace"** to use the enhanced prompt
5. **Your original text is replaced** with the enhanced version

---

## 📁 File Structure Check

Make sure your `extension` folder contains:

```
extension/
├── manifest.json
├── icons/
│   ├── icon-16.svg
│   ├── icon-48.svg
│   └── icon-128.svg
├── background/
│   └── background.js
├── content/
│   ├── content.js
│   └── overlay.css
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
└── options/
    ├── options.html
    ├── options.js
    └── options.css
```

---

## 🎉 Success!

If you see the enhance button and can enhance a prompt, congratulations! Your extension is working.

### Next Steps:
- Customize settings in the options page
- Try different prompt enhancement styles
- Set up keyboard shortcuts in `chrome://extensions/shortcuts`

---

## 🆘 Still Having Issues?

1. **Run the full test script** in `extension/test-extension.js`
2. **Check the detailed guide** in `extension/INSTALLATION.md`
3. **Look at browser console** for error messages (F12 → Console)

The extension uses console logging prefixed with `[PE:` to help debug issues. 