import { NextRequest, NextResponse } from "next/server";
import { seedPlans } from "@/lib/seed-plans";
import { ApiResponse } from "@/lib/types";
import { EXTENSION_ORIGIN } from "@/lib/const";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": EXTENSION_ORIGIN, // exact match required
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
// GET /api/user/seed - Seed the database with initial plans
export async function GET(request: NextRequest) {
  try {
    console.log("🌱 Starting database seed...");

    // Run the seed function
    const createdPlans = await seedPlans();

    console.log("✅ Database seed completed successfully");

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Database seeded successfully",
      data: {
        plansCreated: createdPlans.length,
        plans: createdPlans.map((plan) => ({
          name: plan.name,
          displayName: plan.displayName,
          dailyLimit: plan.dailyLimit,
          monthlyLimit: plan.monthlyLimit,
          price: plan.price,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Database seed failed:", error);

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "Failed to seed database",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
