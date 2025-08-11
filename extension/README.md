# Prompt Enhancer: AI Chat Assistant (MV3)

A Chromium Manifest V3 extension to improve prompts on ChatGPT and Claude using advanced prompt/context engineering. It reads the visible conversation and your current input, sends it to your chosen AI provider (OpenAI or Anthropic) using your API key, and returns an improved, structured prompt. It only replaces your input when you click "Replace with Improved Prompt".

## Features

- Overlay UI on chat pages (Phantom-inspired styling) with:
  - Enhance button
  - Panel to review the improved prompt
  - Replace / Copy / Cancel actions
- Options page to configure:
  - Provider and model (OpenAI or Anthropic)
  - API keys (stored in chrome.storage.sync)
  - Tone, detail level, target audience
  - Enable/disable
- Popup:
  - Quick enable/disable
  - Link to shortcuts
  - Recent improved prompts history (stored in sync, capped)
- Privacy: processes only on explicit user action; no automatic sending

## Install (Developer Mode)

1. Download this folder to your computer.
2. Open Chrome → chrome://extensions
3. Enable "Developer mode" (top-right).
4. Click "Load unpacked" and select the `extension` folder.
5. Click the extension icon → "Options" to add your API key(s) and configure settings.
6. Visit https://chat.openai.com or https://claude.ai and use the "Enhance" button above the input.
7. Optional: assign a keyboard shortcut in chrome://extensions/shortcuts.

## Notes

- The content script uses robust selectors and mutation observers to read visible conversation text across UI updates.
- API keys are never hardcoded and only used in the background service worker.
- The extension respects your privacy: it sends data only when you click Enhance or trigger the keyboard command, and only on supported domains.

## Troubleshooting

- If Enhance says "Extension is disabled", toggle it on in the popup or options.
- If you see provider errors, double-check your API key and model name.
- Google Chrome may restrict default shortcuts—use chrome://extensions/shortcuts to set one.
