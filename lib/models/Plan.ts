import mongoose, { Schema, Document } from "mongoose";
import { IPlan } from "../types";

export interface IPlanDocument extends Omit<IPlan, "_id">, Document {}

const PlanSchema = new Schema<IPlanDocument>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ["free", "pro", "business", "enterprise"],
    },
    displayName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    dailyLimit: {
      type: Number,
      required: true,
      min: 0,
    },
    monthlyLimit: {
      type: Number,
      required: true,
      min: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0, // in cents
    },
    currency: {
      type: String,
      default: "usd",
    },
    features: [
      {
        type: String,
        required: true,
      },
    ],
    stripeProductId: {
      type: String,
      sparse: true, // for future Stripe integration
    },
    stripePriceId: {
      type: String,
      sparse: true, // for future Stripe integration
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance (removed name since unique: true already creates it)
PlanSchema.index({ isActive: 1, sortOrder: 1 });

export default mongoose.models.Plan ||
  mongoose.model<IPlanDocument>("Plan", PlanSchema);
