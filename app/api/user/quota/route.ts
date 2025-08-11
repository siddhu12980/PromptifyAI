import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import { User, Prompt, Usage } from "@/lib/models";
import { ApiResponse, QuotaInfo } from "@/lib/types";
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

// Enhanced quota info type
interface EnhancedQuotaInfo extends QuotaInfo {
  freeUsage: {
    dailyUsed: number;
    monthlyUsed: number;
  };
  personalUsage: {
    dailyUsed: number;
    monthlyUsed: number;
    totalCost: number;
  };
  paidUsage?: {
    dailyUsed: number;
    monthlyUsed: number;
    totalCost: number;
  };
  hasPersonalApiKeys: boolean;
}

// GET /api/user/quota - Get user's current quota information with separate tracking
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Connect to database
    await dbConnect();

    // Find user with plan details
    const user = await User.findOne({ clerkId: clerkUser.id }).populate(
      "planId"
    );
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "User not found" },
        { status: 404, headers: corsHeaders() }
      );
    }

    // Get quota usage (free requests only)
    const quotaUsage = await (Prompt as any).getUserQuotaUsage(user._id);
    const dailyFreeUsed = quotaUsage[0]?.dailyUsage?.[0]?.count || 0;
    const monthlyFreeUsed = quotaUsage[0]?.monthlyUsage?.[0]?.count || 0;

    // Get daily usage stats (both free and personal)
    const dailyStats = await (Prompt as any).getUserUsageStats(
      user._id,
      "daily"
    );
    const monthlyStats = await (Prompt as any).getUserUsageStats(
      user._id,
      "monthly"
    );

    // Process stats
    const dailyStatsMap = dailyStats.reduce((acc: any, stat: any) => {
      acc[stat._id] = stat;
      return acc;
    }, {});

    const monthlyStatsMap = monthlyStats.reduce((acc: any, stat: any) => {
      acc[stat._id] = stat;
      return acc;
    }, {});

    // Check if user has personal API keys
    const hasPersonalApiKeys = !!(
      user.apiKeys?.openai?.encryptedKey ||
      user.apiKeys?.anthropic?.encryptedKey
    );

    // Calculate quota info
    const dailyLimit = user.planId.dailyLimit;
    const monthlyLimit = user.planId.monthlyLimit;

    // Handle unlimited plans (999999 means unlimited)
    const isUnlimitedDaily = dailyLimit >= 999999;
    const isUnlimitedMonthly = monthlyLimit >= 999999;

    const enhancedQuotaInfo: EnhancedQuotaInfo = {
      // Original quota info (for free usage only)
      dailyUsed: dailyFreeUsed,
      dailyLimit: isUnlimitedDaily ? -1 : dailyLimit,
      dailyRemaining: isUnlimitedDaily
        ? -1
        : Math.max(0, dailyLimit - dailyFreeUsed),
      monthlyUsed: monthlyFreeUsed,
      monthlyLimit: isUnlimitedMonthly ? -1 : monthlyLimit,
      monthlyRemaining: isUnlimitedMonthly
        ? -1
        : Math.max(0, monthlyLimit - monthlyFreeUsed),
      planName: user.planId.displayName,
      isUnlimited: isUnlimitedDaily && isUnlimitedMonthly,

      // Enhanced tracking
      freeUsage: {
        dailyUsed: dailyStatsMap.free?.count || 0,
        monthlyUsed: monthlyStatsMap.free?.count || 0,
      },
      personalUsage: {
        dailyUsed: dailyStatsMap.personal?.count || 0,
        monthlyUsed: monthlyStatsMap.personal?.count || 0,
        totalCost: monthlyStatsMap.personal?.totalCost || 0,
      },
      hasPersonalApiKeys,
    };

    console.log("enhancedQuotaInfo", enhancedQuotaInfo);

    return NextResponse.json<ApiResponse<EnhancedQuotaInfo>>(
      {
        success: true,
        data: enhancedQuotaInfo,
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error("GET /api/user/quota error:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// POST /api/user/quota - Record a new usage event
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { provider, tokens, cost, success, errorMessage } = body;

    // Validate required fields
    if (
      !provider ||
      typeof tokens !== "number" ||
      typeof cost !== "number" ||
      typeof success !== "boolean"
    ) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error:
            "Invalid request body. Required: provider, tokens, cost, success",
        },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Find user
    const user = await User.findOne({ clerkId: clerkUser.id }).populate(
      "planId"
    );
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Get current date
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0]; // 'YYYY-MM-DD'

    // Get or create usage document for today
    const usage = await (Usage as any).getOrCreateUsage(user._id, dateStr);

    // Check quota limits before recording usage (if it's a successful request)
    if (success) {
      const dailyLimit = user.planId.dailyLimit;
      const monthlyLimit = user.planId.monthlyLimit;

      // Check daily limit (unless unlimited - 999999 means unlimited)
      if (dailyLimit < 999999 && usage.dailyUsed >= dailyLimit) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: "Daily quota exceeded",
            message: `Daily limit of ${dailyLimit} requests reached`,
          },
          { status: 429 }
        );
      }

      // Check monthly limit (unless unlimited - 999999 means unlimited)
      if (monthlyLimit < 999999 && usage.monthlyUsed >= monthlyLimit) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: "Monthly quota exceeded",
            message: `Monthly limit of ${monthlyLimit} requests reached`,
          },
          { status: 429 }
        );
      }
    }

    // Record the usage
    await usage.addRequest({
      provider,
      tokens,
      cost,
      success,
      errorMessage,
    });

    // Get updated quota info
    const dailyUsed = usage.dailyUsed;
    const dailyLimit = user.planId.dailyLimit;
    const monthlyLimit = user.planId.monthlyLimit;

    const isUnlimitedDaily = dailyLimit >= 999999;
    const isUnlimitedMonthly = monthlyLimit >= 999999;

    const quotaInfo: QuotaInfo = {
      dailyUsed,
      dailyLimit: isUnlimitedDaily ? -1 : dailyLimit,
      dailyRemaining: isUnlimitedDaily
        ? -1
        : Math.max(0, dailyLimit - dailyUsed),
      monthlyUsed: usage.monthlyUsed,
      monthlyLimit: isUnlimitedMonthly ? -1 : monthlyLimit,
      monthlyRemaining: isUnlimitedMonthly
        ? -1
        : Math.max(0, monthlyLimit - usage.monthlyUsed),
      planName: user.planId.displayName,
      isUnlimited: isUnlimitedDaily && isUnlimitedMonthly,
    };

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Usage recorded successfully",
      data: {
        requestId: usage.requests[usage.requests.length - 1]._id,
        quotaInfo,
      },
    });
  } catch (error) {
    console.error("POST /api/user/quota error:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
