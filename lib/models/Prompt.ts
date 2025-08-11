import mongoose, { Schema, Document } from 'mongoose';
import { IPrompt } from '../types';

export interface IPromptDocument extends Omit<IPrompt, '_id' | 'userId'>, Document {
  userId: mongoose.Types.ObjectId;
}

const PromptSchema = new Schema<IPromptDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalText: {
    type: String,
    required: true,
    maxlength: 10000 // Reasonable limit for original prompts
  },
  enhancedText: {
    type: String,
    required: true,
    maxlength: 20000 // Larger limit for enhanced prompts
  },
  provider: {
    type: String,
    enum: ['openai', 'anthropic'],
    required: true
  },
  aiModel: {
    type: String,
    required: true
  },
  site: {
    type: String,
    enum: ['ChatGPT', 'Claude'],
    required: true
  },
  settings: {
    tone: {
      type: String,
      required: true
    },
    detail: {
      type: String,
      required: true
    },
    audience: {
      type: String,
      default: ''
    }
  },
  conversationContext: {
    type: String,
    maxlength: 50000 // Large limit for conversation context
  },
  quality: {
    type: Number,
    min: 1,
    max: 5 // For future user feedback/rating system
  },
  tokens: {
    type: Number,
    required: true,
    min: 0
  },
  processingTime: {
    type: Number,
    required: true,
    min: 0 // in milliseconds
  },
  // Request type and billing information
  requestType: {
    type: String,
    enum: ['free', 'personal', 'paid'],
    required: true,
    default: 'free'
  },
  // API key source for personal requests
  apiKeySource: {
    type: String,
    enum: ['user', 'shared', 'premium'],
    default: 'shared'
  },
  // Cost information for personal API usage
  cost: {
    inputTokens: {
      type: Number,
      default: 0,
      min: 0
    },
    outputTokens: {
      type: Number,
      default: 0,
      min: 0
    },
    totalCostUSD: {
      type: Number,
      default: 0,
      min: 0
    }
  },
}, {
  timestamps: true
});

// Indexes for efficient queries
PromptSchema.index({ userId: 1, createdAt: -1 });
PromptSchema.index({ provider: 1, createdAt: -1 });
PromptSchema.index({ site: 1, createdAt: -1 });
PromptSchema.index({ createdAt: -1 });
PromptSchema.index({ quality: 1 }); // For future analytics on quality

// Text indexes for search functionality (future feature)
PromptSchema.index({ 
  originalText: 'text', 
  enhancedText: 'text' 
}, {
  weights: {
    originalText: 2,
    enhancedText: 1
  }
});

// Virtual for enhancement improvement ratio
PromptSchema.virtual('improvementRatio').get(function() {
  if (!this.originalText || !this.enhancedText) return 0;
  return this.enhancedText.length / this.originalText.length;
});

// Static method to get user's recent prompts
PromptSchema.statics.getRecentByUser = function(userId: mongoose.Types.ObjectId, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('originalText enhancedText provider site settings quality createdAt');
};

// Static method for analytics (future use)
/* eslint-disable @typescript-eslint/no-explicit-any */
PromptSchema.statics.getAnalytics = function(filters: any = {}) {
  return this.aggregate([
    { $match: filters },
    {
      $group: {
        _id: {
          provider: '$provider',
          site: '$site'
        },
        count: { $sum: 1 },
        avgTokens: { $avg: '$tokens' },
        avgProcessingTime: { $avg: '$processingTime' },
        avgQuality: { $avg: '$quality' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to get user's usage statistics
PromptSchema.statics.getUserUsageStats = function(userId: mongoose.Types.ObjectId, timeframe: 'daily' | 'monthly' = 'daily') {
  const now = new Date();
  const startDate = new Date();
  
  if (timeframe === 'daily') {
    startDate.setHours(0, 0, 0, 0);
  } else {
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
  }

  return this.aggregate([
    {
      $match: {
        userId,
        createdAt: { $gte: startDate, $lte: now }
      }
    },
    {
      $group: {
        _id: '$requestType',
        count: { $sum: 1 },
        totalTokens: { $sum: '$tokens' },
        totalCost: { $sum: '$cost.totalCostUSD' },
        avgProcessingTime: { $avg: '$processingTime' },
        providers: { $addToSet: '$provider' }
      }
    }
  ]);
};

// Static method to get user's quota usage (free requests only)
PromptSchema.statics.getUserQuotaUsage = function(userId: mongoose.Types.ObjectId) {
  const now = new Date();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  return this.aggregate([
    {
      $match: {
        userId,
        requestType: 'free' // Only count free requests towards quota
      }
    },
    {
      $facet: {
        dailyUsage: [
          {
            $match: {
              createdAt: { $gte: startOfDay, $lte: now }
            }
          },
          {
            $count: "count"
          }
        ],
        monthlyUsage: [
          {
            $match: {
              createdAt: { $gte: startOfMonth, $lte: now }
            }
          },
          {
            $count: "count"
          }
        ]
      }
    }
  ]);
};

export default mongoose.models.Prompt || mongoose.model<IPromptDocument>('Prompt', PromptSchema); 