# Extension Configuration Guide

## Setting Up Shared API Keys (Developer Only)

To enable the shared quota system for your users, you need to add your API keys to the `background.js` file.

### Step 1: Get Your API Keys

1. **OpenAI API Key**:
   - Go to: https://platform.openai.com/api-keys
   - Create a new API key
   - Copy the key (starts with `sk-...`)

2. **Anthropic API Key**:
   - Go to: https://console.anthropic.com/
   - Create a new API key
   - Copy the key (starts with `sk-ant-...`)

### Step 2: Add Keys to Extension

Edit `extension/background/background.js` around line 22:

```javascript
const SHARED_API = {
  openaiKey: "sk-your-openai-key-here", // Replace with your actual OpenAI key
  anthropicKey: "sk-ant-your-anthropic-key-here", // Replace with your actual Anthropic key
  dailyQuota: 10, // Free requests per day per user (resets at midnight)
  monthlyQuota: 200, // Maximum requests per month per user (safety limit)
};
```

### Step 3: Configure Quota Limits

You can adjust the quota values:

- **`dailyQuota`**: Number of free requests per day per user (default: 10)
  - Resets automatically at midnight (00:00) each day
  - This is the primary limiting factor users will encounter

- **`monthlyQuota`**: Maximum requests per month per user (default: 200)
  - Safety limit to prevent abuse
  - Resets on the 1st of each month
  - Acts as a secondary limit if someone uses the extension heavily

## Quota System Behavior

### Daily Limits
- ✅ **10 requests per day** (configurable)
- 🔄 **Resets at midnight** (00:00 local time)
- ⏰ **Shows hours until reset** when limit reached

### Monthly Limits  
- ✅ **200 requests per month** (configurable)
- 🔄 **Resets on 1st of each month**
- 🛡️ **Safety net** to prevent abuse

### User Experience
- **Daily quota reached**: "Daily limit reached (10/10). Resets in 6 hours."
- **Monthly quota reached**: "Monthly limit reached (200/200). Please set up your own API key."
- **Personal API key**: Unlimited usage, no restrictions

## Security Notes

⚠️ **Important**: These API keys will be included in the extension package. Consider:

1. **Cost Management**: Set billing limits on your API accounts
2. **Usage Monitoring**: Monitor API usage regularly  
3. **Key Rotation**: Rotate keys periodically for security
4. **Quota Tuning**: Adjust daily/monthly limits based on usage patterns

## Alternative: Users Provide Their Own Keys

If you don't want to provide shared API keys, users can:

1. Get their own API keys from OpenAI/Anthropic
2. Add them in the extension's settings page
3. Get unlimited usage with their own keys

This approach gives users full control and you don't need to manage API costs. 