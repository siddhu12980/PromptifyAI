# Prompt Enhancer Extension - Installation & Testing Guide

## Quick Start (5 minutes)

### 1. Load Extension in Chrome/Edge

1. Open Chrome/Edge and go to `chrome://extensions/` (or `edge://extensions/`)
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `extension` folder from this project
5. The extension should now appear in your extensions list

### 2. Configure API Keys

1. Right-click the extension icon in your toolbar
2. Select "Options" (or click the gear icon in the popup)
3. Enter your API key:
   - **OpenAI API Key**: Get from https://platform.openai.com/api-keys
   - **Anthropic API Key**: Get from https://console.anthropic.com/

### 3. Test the Extension

1. Go to https://chat.openai.com or https://claude.ai
2. Start a conversation or navigate to an existing chat
3. Type something in the input box (e.g., "help me write an email")
4. Look for the "Enhance Prompt" button that should appear above the input box
5. Click it to enhance your prompt

## Troubleshooting

### Extension Not Loading
- Check Developer Console: `F12` → Console tab for errors
- Verify all files are present in the `extension` folder
- Try reloading the extension: Extensions page → Reload button

### No Enhance Button Appears
1. Open Developer Console (`F12`)
2. Look for messages starting with `[PE:content]`
3. If no messages, the content script isn't loading
4. Check that you're on a supported site (chat.openai.com or claude.ai)

### API Errors
- **"No API key configured"**: Add your API key in Options
- **"401 Unauthorized"**: Check if your API key is valid
- **"Rate limit"**: You've exceeded API limits, wait or upgrade plan
- **"Network error"**: Check internet connection

### Background Script Issues
1. Go to `chrome://extensions/`
2. Click "Service worker" link next to the extension
3. Check console for background script logs starting with `[PE:bg]`

## Extension Features

### Popup UI
- **Enable/Disable**: Toggle extension on/off
- **Settings**: Quick access to options page
- **Keyboard Shortcut**: Link to configure shortcuts
- **Recent Prompts**: History of enhanced prompts

### Options Page
- **API Keys**: Configure OpenAI/Anthropic keys
- **Provider**: Choose between OpenAI (GPT) or Anthropic (Claude)
- **Model Selection**: Pick specific models
- **Enhancement Settings**: Tone, detail level, target audience
- **History**: Manage prompt history

### Content Script Features
- **Auto-detection**: Works on ChatGPT and Claude
- **Real-time**: Monitors conversation updates
- **Non-intrusive**: Clean overlay UI
- **Keyboard Support**: Optional keyboard shortcuts

## Development Notes

### File Structure
```
extension/
├── manifest.json          # Extension configuration
├── icons/                 # Extension icons
├── background/
│   └── background.js      # Service worker
├── content/
│   ├── content.js         # Page interaction script
│   └── overlay.css        # UI styling
├── popup/
│   ├── popup.html         # Extension popup
│   ├── popup.js           # Popup logic
│   └── popup.css          # Popup styling
└── options/
    ├── options.html       # Settings page
    ├── options.js         # Settings logic
    └── options.css        # Settings styling
```

### Console Messages
- `[PE:content]`: Content script messages
- `[PE:bg]`: Background script messages
- `[PE:popup]`: Popup script messages
- `[PE:options]`: Options page messages

### Storage
- Uses `chrome.storage.sync` for settings and API keys
- History is limited to 20 items by default
- Settings sync across devices when signed into Chrome

## API Key Setup

### OpenAI
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)
4. Paste into extension options

### Anthropic
1. Go to https://console.anthropic.com/
2. Navigate to API Keys section
3. Create a new key
4. Copy and paste into extension options

## Security Notes

- API keys are stored locally using Chrome's secure storage
- Keys are never sent to any servers except OpenAI/Anthropic
- No telemetry or tracking is implemented
- All processing happens locally in your browser

## Need Help?

1. Check browser console for error messages
2. Verify you're on a supported site
3. Ensure API keys are configured correctly
4. Try reloading the extension
5. Restart the browser if issues persist 