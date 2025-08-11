import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../types';

export interface IUserDocument extends Omit<IUser, '_id' | 'planId'>, Document {
  planId: mongoose.Types.ObjectId;
}

// Schema for API key audit logs
const ApiKeyAuditSchema = new Schema({
  action: {
    type: String,
    enum: ['created', 'updated', 'rotated', 'deleted', 'accessed'],
    required: true
  },
  provider: {
    type: String,
    enum: ['openai', 'anthropic'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: String,
  userAgent: String,
  success: {
    type: Boolean,
    required: true
  },
  error: String
});

const UserSchema = new Schema<IUserDocument>({
  clerkId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  planId: {
    type: Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  settings: {
    provider: {
      type: String,
      enum: ['openai', 'anthropic'],
      default: 'openai'
    },
    openaiModel: {
      type: String,
      default: 'gpt-4o'
    },
    anthropicModel: {
      type: String,
      default: 'claude-3-5-sonnet-20240620'
    },
    tone: {
      type: String,
      enum: ['neutral', 'friendly', 'professional', 'persuasive', 'academic'],
      default: 'neutral'
    },
    detail: {
      type: String,
      enum: ['concise', 'balanced', 'exhaustive'],
      default: 'balanced'
    },
    audience: {
      type: String,
      default: ''
    }
  },
  // Encrypted API keys
  apiKeys: {
    openai: {
      encryptedKey: {
        type: String,
        select: false // Don't include in normal queries
      },
      iv: {
        type: String,
        select: false
      },
      tag: {
        type: String,
        select: false
      },
      lastUpdated: Date,
      isValid: {
        type: Boolean,
        default: false
      }
    },
    anthropic: {
      encryptedKey: {
        type: String,
        select: false
      },
      iv: {
        type: String,
        select: false
      },
      tag: {
        type: String,
        select: false
      },
      lastUpdated: Date,
      isValid: {
        type: Boolean,
        default: false
      }
    }
  },
  // API key audit logs
  apiKeyAudit: [ApiKeyAuditSchema],
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ planId: 1 });
UserSchema.index({ lastActive: -1 });

// Update lastActive on any update
UserSchema.pre('save', function(next) {
  if (this.isModified() && !this.isModified('lastActive')) {
    this.set('lastActive', new Date());
  }
  next();
});

// Method to add audit log
UserSchema.methods.addApiKeyAudit = async function(
  action: 'created' | 'updated' | 'rotated' | 'deleted' | 'accessed',
  provider: 'openai' | 'anthropic',
  details: {
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    error?: string;
  }
) {
  this.apiKeyAudit.push({
    action,
    provider,
    timestamp: new Date(),
    ipAddress: details.ipAddress,
    userAgent: details.userAgent,
    success: details.success,
    error: details.error
  });

  // Keep only last 100 audit logs
  if (this.apiKeyAudit.length > 100) {
    this.apiKeyAudit = this.apiKeyAudit.slice(-100);
  }

  if (this.isModified()) {
    await this.save();
  }
};

export default mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
