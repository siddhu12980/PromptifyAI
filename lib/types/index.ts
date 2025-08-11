// Types for database models and API responses

export interface IApiKeyAudit {
  action: 'created' | 'updated' | 'rotated' | 'deleted' | 'accessed';
  provider: 'openai' | 'anthropic';
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
}

export interface IEncryptedApiKey {
  encryptedKey: string;
  iv: string;
  tag: string;
  lastUpdated: Date;
  isValid: boolean;
}

export interface IUser {
  _id: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  planId: string;
  settings: {
    provider: 'openai' | 'anthropic';
    openaiModel: string;
    anthropicModel: string;
    tone: 'neutral' | 'friendly' | 'professional' | 'persuasive' | 'academic';
    detail: 'concise' | 'balanced' | 'exhaustive';
    audience: string;
  };
  apiKeys: {
    openai: IEncryptedApiKey;
    anthropic: IEncryptedApiKey;
  };
  apiKeyAudit: IApiKeyAudit[];
  createdAt: Date;
  updatedAt: Date;
  lastActive: Date;
}

export interface IUsage {
  _id: string;
  userId: string;
  date: string; // 'YYYY-MM-DD'
  month: string; // 'YYYY-MM'
  dailyUsed: number;
  monthlyUsed: number;
  requests: {
    timestamp: Date;
    provider: 'openai' | 'anthropic';
    tokens: number;
    cost: number;
    success: boolean;
    errorMessage?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IPrompt {
  _id: string;
  userId: string;
  originalText: string;
  enhancedText: string;
  provider: 'openai' | 'anthropic';
  aiModel: string;
  site: 'ChatGPT' | 'Claude';
  settings: {
    tone: string;
    detail: string;
    audience: string;
  };
  conversationContext?: string;
  quality?: number; // 1-5 rating (for future feedback)
  tokens: number;
  processingTime: number; // milliseconds
  // Request type and billing information
  requestType: 'free' | 'personal' | 'paid' ;
  apiKeySource: 'user' | 'shared' | 'premium';
  cost: {
    inputTokens: number;
    outputTokens: number;
    totalCostUSD: number;
  };
  createdAt: Date;
}

export interface IPlan {
  _id: string;
  name: 'free' | 'pro' | 'business' | 'enterprise';
  displayName: string;
  description: string;
  dailyLimit: number;
  monthlyLimit: number;
  price: number; // in cents (0 for free)
  currency: string;
  features: string[];
  stripeProductId?: string; // for future Stripe integration
  stripePriceId?: string; // for future Stripe integration
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface QuotaInfo {
  dailyUsed: number;
  dailyLimit: number;
  dailyRemaining: number;
  monthlyUsed: number;
  monthlyLimit: number;
  monthlyRemaining: number;
  planName: string;
  isUnlimited: boolean;
}

export interface EnhancePromptRequest {
  originalText: string;
  conversationContext?: string;
  site: 'ChatGPT' | 'Claude';
  settings?: {
    tone?: string;
    detail?: string;
    audience?: string;
  };
}

export interface EnhancePromptResponse {
  enhancedText: string;
  promptId: string;
  tokensUsed: number;
  quotaInfo: QuotaInfo;
}

// API Key management types
export interface ApiKeyRequest {
  provider: 'openai' | 'anthropic';
  apiKey: string;
}

export interface ApiKeyResponse {
  provider: 'openai' | 'anthropic';
  isValid: boolean;
  lastUpdated: Date;
} 