import dbConnect from "./db";
import { Plan } from "./models";

// Initial subscription plans
const initialPlans = [
  {
    name: "free",
    displayName: "Free",
    description: "Perfect for trying out prompt enhancement",
    dailyLimit: 10,
    monthlyLimit: 200,
    price: 0,
    currency: "usd",
    features: [
      "10 enhanced prompts per day",
      "Basic prompt templates",
      "ChatGPT & Claude support",
      "Standard processing speed",
    ],
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "pro",
    displayName: "Pro",
    description: "For regular users who want more flexibility",
    dailyLimit: 100,
    monthlyLimit: 2000,
    price: 999, // $9.99/month in cents
    currency: "usd",
    features: [
      "100 enhanced prompts per day",
      "Premium prompt templates",
      "Priority processing",
      "Prompt history & search",
      "Advanced customization",
      "Email support",
    ],
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "business",
    displayName: "Business",
    description: "For teams and heavy users",
    dailyLimit: 500,
    monthlyLimit: 10000,
    price: 2999, // $29.99/month in cents
    currency: "usd",
    features: [
      "500 enhanced prompts per day",
      "Custom prompt templates",
      "Team collaboration features",
      "Advanced analytics",
      "API access",
      "Priority support",
      "Usage reporting",
    ],
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "enterprise",
    displayName: "Enterprise",
    description: "For large organizations with custom needs",
    dailyLimit: 999999, // Very high number for "unlimited"
    monthlyLimit: 999999, // Very high number for "unlimited"
    price: 9999, // $99.99/month in cents (contact for custom pricing)
    currency: "usd",
    features: [
      "Unlimited enhanced prompts",
      "Custom AI model integration",
      "White-label solution",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantees",
      "On-premise deployment options",
    ],
    isActive: true,
    sortOrder: 4,
  },
];

export async function seedPlans() {
  try {
    await dbConnect();

    console.log("🌱 Seeding plans...");

    // Check if plans already exist
    const existingPlans = await Plan.find();
    if (existingPlans.length > 0) {
      console.log("📋 Plans already exist, skipping seed");
      return existingPlans;
    }

    // Create all plans
    const createdPlans = await Plan.insertMany(initialPlans);

    console.log(`✅ Successfully created ${createdPlans.length} plans:`);
    createdPlans.forEach((plan) => {
      console.log(
        `   - ${plan.displayName}: ${plan.dailyLimit} daily, $${
          plan.price / 100
        }/month`
      );
    });

    return createdPlans;
  } catch (error) {
    console.error("❌ Error seeding plans:", error);
    throw error;
  }
}

export async function getFreePlan() {
  await dbConnect();
  return await Plan.findOne({ name: "free" });
}

// Run seed if called directly
if (require.main === module) {
  seedPlans()
    .then(() => {
      console.log("🎉 Seed completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seed failed:", error);
      process.exit(1);
    });
}
