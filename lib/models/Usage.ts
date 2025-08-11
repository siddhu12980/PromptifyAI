import mongoose, { Schema, Document } from 'mongoose';
import { IUsage } from '../types';

export interface IUsageDocument extends Omit<IUsage, '_id' | 'userId'>, Document {
  userId: mongoose.Types.ObjectId;
}

const UsageSchema = new Schema<IUsageDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String,
    required: true // Format: 'YYYY-MM-DD'
  },
  month: {
    type: String,
    required: true // Format: 'YYYY-MM'
  },
  dailyUsed: {
    type: Number,
    default: 0,
    min: 0
  },
  monthlyUsed: {
    type: Number,
    default: 0,
    min: 0
  },
  requests: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    provider: {
      type: String,
      enum: ['openai', 'anthropic'],
      required: true
    },
    tokens: {
      type: Number,
      required: true,
      min: 0
    },
    cost: {
      type: Number,
      required: true,
      min: 0
    },
    success: {
      type: Boolean,
      required: true
    },
    errorMessage: {
      type: String
    }
  }]
}, {
  timestamps: true
});

// Compound indexes for efficient queries
UsageSchema.index({ userId: 1, date: 1 }, { unique: true });
UsageSchema.index({ userId: 1, month: 1 });
UsageSchema.index({ date: 1 });
UsageSchema.index({ month: 1 });

// Static method to get or create usage document for a specific date
UsageSchema.statics.getOrCreateUsage = async function(userId: mongoose.Types.ObjectId, date: string) {
  const month = date.substring(0, 7); // Extract 'YYYY-MM' from 'YYYY-MM-DD'
  
  let usage = await this.findOne({ userId, date });
  
  if (!usage) {
    usage = new this({
      userId,
      date,
      month,
      dailyUsed: 0,
      monthlyUsed: 0,
      requests: []
    });
    await usage.save();
  }
  
  return usage;
};

// Instance method to add a request and update counters
UsageSchema.methods.addRequest = async function(requestData: {
  provider: 'openai' | 'anthropic';
  tokens: number;
  cost: number;
  success: boolean;
  errorMessage?: string;
}) {
  this.requests.push({
    ...requestData,
    timestamp: new Date()
  });
  
  if (requestData.success) {
    this.dailyUsed += 1;
    this.monthlyUsed += 1;
  }
  
  await this.save();
  return this;
};

export default mongoose.models.Usage || mongoose.model<IUsageDocument>('Usage', UsageSchema); 