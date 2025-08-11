# 🚀 PromptifyAI: AI Chat, Prompt Enhancer Extension

Transform your AI conversations with intelligent prompt enhancement. A complete solution with browser extension, web dashboard, and personal API key management.

## ✨ What Makes This Special

**🧠 Smart Enhancement Engine**
- Preserves your intent: commands stay commands, questions become detailed queries
- Context-aware using conversation history for better results
- Template + AI hybrid approach for optimal enhancement quality

**🔐 Complete User Management**  
- Clerk authentication with seamless cross-device sync
- Personal API key encryption and secure storage
- Usage analytics with free quota + unlimited personal usage

**📊 Beautiful Web Dashboard**
- Real-time usage tracking (free vs personal API usage)
- API key management with edit/delete capabilities  
- Enhancement history with copy-to-clipboard functionality
- Modern UI with responsive design and dark mode support

**🛡️ Enterprise-Ready Architecture**
- Next.js 14 with TypeScript and MongoDB
- Robust error handling and fallback systems
- Comprehensive audit logging and security measures

## ⚡ Quick Start (5 minutes)

### 1. **Setup Web Dashboard**
```bash
git clone <repo-url>
cd prompt-enhancement-extension
npm install

# Setup environment variables
cp .env.example .env.local
# Add your MongoDB, Clerk, and encryption keys

npm run dev
```

### 2. **Install Browser Extension**
1. Go to `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked" → Select `extension` folder
4. Sign in through the extension popup

### 3. **Configure API Keys (Optional)**
- Extension popup → Settings → Add your OpenAI/Anthropic keys
- Or use our free shared quota (10 requests/day)

### 4. **Start Enhancing**
- Visit ChatGPT or Claude
- Type your message
- Click the "✨ Enhance" button that appears
- Watch your prompt transform!

## 🎯 Core Features

### **Browser Extension**
- **Smart Button Placement**: Appears inside input boxes, not floating
- **Context Detection**: Automatically reads conversation history
- **Real-time Enhancement**: Instant prompt improvements with AI
- **Visual Feedback**: Animated enhance button with status indicators
- **Keyboard Shortcuts**: Quick enhancement with Ctrl+Shift+E

### **Web Dashboard** 
- **Authentication**: Secure login with Clerk
- **Usage Analytics**: Daily/monthly tracking with beautiful charts
- **API Key Management**: Encrypted storage with audit trails
- **Enhancement History**: Browse, search, and copy previous enhancements
- **Settings Sync**: Cross-device configuration synchronization

### **AI Enhancement Engine**
- **Intent Preservation**: Commands → Actions, Questions → Detailed explanations
- **Context Integration**: Uses conversation history for relevance  
- **Provider Support**: OpenAI (GPT-4) and Anthropic (Claude) APIs
- **Fallback System**: Template-based enhancement if AI fails
- **Quality Metrics**: Token usage and processing time tracking

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Browser Ext    │    │   Next.js API   │    │    Database     │
│                 │    │                 │    │                 │
│ • Content Script│◄──►│ • User Auth     │◄──►│ • MongoDB       │
│ • Background SW │    │ • Enhancement   │    │ • User Data     │
│ • Popup UI      │    │ • API Keys      │    │ • Usage Stats   │
│ • Options Page  │    │ • Analytics     │    │ • Audit Logs    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        │              ┌─────────────────┐               │
        └──────────────►│  External APIs  │◄──────────────┘
                       │                 │
                       │ • OpenAI GPT-4  │
                       │ • Anthropic     │
                       │ • Clerk Auth    │
                       └─────────────────┘
```

## 🛠️ Project Structure

```
prompt-enhancement-extension/
├── extension/                    # Browser Extension (Manifest V3)
│   ├── manifest.json            # Extension configuration
│   ├── background/               # Service worker + API integration
│   ├── content/                  # Page injection + UI overlay
│   ├── popup/                    # Extension popup with auth
│   ├── options/                  # Settings page with API keys
│   └── icons/                    # Extension icons
│
├── app/                          # Next.js 14 Web Dashboard
│   ├── api/                      # API routes
│   │   ├── enhance-prompt/       # Main enhancement endpoint
│   │   └── user/                 # User management APIs
│   ├── (dashboard)/              # Protected dashboard pages
│   └── globals.css               # Global styles
│
├── lib/                          # Shared Utilities
│   ├── models/                   # MongoDB Mongoose schemas
│   ├── ai.ts                     # OpenAI/Anthropic integration
│   ├── prompt.ts                 # Enhancement prompt engineering
│   └── db.ts                     # Database connection
│
└── components/                   # Reusable UI components
    ├── ui/                       # Shadcn UI components
    └── dashboard/                # Dashboard-specific components
```

## 🔧 Environment Setup

Create `.env.local`:
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/prompt-enhancer

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Encryption (Generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your-32-byte-hex-key

# AI APIs (Optional - for shared quota)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## 🎨 Technology Stack

**Frontend & Extension**
- TypeScript + Vanilla JS (for extension compatibility)
- Chrome Extension Manifest V3
- Shadcn UI components
- Tailwind CSS for styling

**Backend & Database**  
- Next.js 14 with App Router
- MongoDB with Mongoose ODM
- Clerk for authentication
- AES-256-GCM encryption

**AI & Enhancement**
- OpenAI GPT-4 API
- Anthropic Claude API  
- Custom prompt engineering system
- Template-based fallbacks

## 📊 Features Deep Dive

### **Intelligent Enhancement**
```
User Input: "can you remove the control settings"
Enhanced:   "Remove the control settings from this interface and show me the steps"

User Input: "what is typescript"  
Enhanced:   "Explain TypeScript, including how it works, why it matters, and provide practical examples"
```

### **Usage Analytics**
- **Free Quota**: 10 requests/day with monthly limits
- **Personal API**: Unlimited with cost tracking
- **Visual Dashboard**: Charts, progress bars, and usage badges
- **Request Classification**: Free vs Personal API usage separation

### **Security & Privacy**
- **API Key Encryption**: AES-256-GCM with unique IVs
- **Audit Logging**: Complete access and modification history
- **Zero Data Collection**: No telemetry or user data harvesting
- **Cross-Device Sync**: Secure settings synchronization

## 🚀 Deployment

### **Extension Publication**
1. Build extension: `cd extension && zip -r extension.zip *`
2. Upload to Chrome Web Store
3. Update `EXTENSION_ORIGIN` in production

### **Web Dashboard Deployment**
```bash
# Production build
npm run build

# Deploy to Vercel/Netlify
npx vercel deploy

# Or Docker
docker build -t prompt-enhancer .
docker run -p 3000:3000 prompt-enhancer
```

## 🐛 Troubleshooting

### **Extension Issues**
```javascript
// Test extension loading
document.querySelector('.pe-overlay') ? 
  console.log('✅ Extension loaded') : 
  console.log('❌ Extension not found');

// Check authentication
chrome.runtime.sendMessage({type: 'check-auth'}, console.log);
```

### **Common Problems**
- **"Extension not working"** → Check if enabled in `chrome://extensions/`
- **"Authentication failed"** → Sign in through popup, check internet
- **"Enhancement slow"** → Check API key validity, try different provider
- **"Quota exceeded"** → Add personal API key or wait for reset

### **Debug Commands**
```bash
# Check extension logs
# 1. Go to chrome://extensions/
# 2. Click "Service worker" link
# 3. Look for [PE: prefixed messages

# Test API connectivity  
curl -X POST http://localhost:3000/api/enhance-prompt \
  -H "Content-Type: application/json" \
  -d '{"originalText":"test","site":"ChatGPT"}'
```

## 📈 Performance & Limits

**Free Tier**
- 10 requests/day
- 200 requests/month  
- Shared API keys
- Basic analytics

**Personal API Keys**
- Unlimited requests
- Your own API costs
- Advanced analytics
- Cost tracking

**Response Times**
- Template Enhancement: ~50ms
- AI Enhancement: ~2-5s
- Dashboard Loading: ~200ms
- Cross-device Sync: ~500ms

## 🤝 Contributing

1. **Fork** the repository
2. **Create** feature branch: `git checkout -b feature/amazing-feature`
3. **Test** extension: Load in Chrome and verify functionality
4. **Test** dashboard: `npm run dev` and check all pages
5. **Submit** PR with detailed description

**Development Setup**
```bash
# Install dependencies
npm install

# Start development servers
npm run dev          # Next.js dashboard
# Load extension manually in Chrome

# Run tests
npm run test

# Type checking
npm run type-check
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🎉 What's Next?

We've built an incredible foundation! Potential future enhancements:

- **🌍 Multi-language Support**: Detect and enhance in different languages
- **🎨 Custom Templates**: User-defined enhancement templates  
- **📱 Mobile App**: React Native companion app
- **🔌 Platform Expansion**: Discord, Slack, Teams integration
- **🧠 Learning Mode**: ML-based personalized enhancement patterns
- **💰 Monetization**: Premium plans with advanced features

**Built with ❤️ for the AI community**

Ready to transform your AI conversations? Get started in 5 minutes! 🚀
