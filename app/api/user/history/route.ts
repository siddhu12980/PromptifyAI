import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import { User, Prompt } from "@/lib/models";
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

// GET /api/user/history - Get user's prompt enhancement history
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

    // Find user
    const user = await User.findOne({ clerkId: clerkUser.id });
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "User not found" },
        { status: 404, headers: corsHeaders() }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50); // Max 50 items per page
    const site = searchParams.get("site"); // Filter by site (ChatGPT, Claude)
    const provider = searchParams.get("provider"); // Filter by provider (openai, anthropic)
    const search = searchParams.get("search"); // Search in original/enhanced text

    // Build query
    const query: any = { userId: user._id };

    if (site) {
      query.site = site;
    }

    if (provider) {
      query.provider = provider;
    }

    // Add text search if provided
    if (search) {
      query.$or = [
        { originalText: { $regex: search, $options: "i" } },
        { enhancedText: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await Prompt.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Get prompts with pagination
    const prompts = await Prompt.find(query)
      .sort({ createdAt: -1 }) // Most recent first
      .skip(skip)
      .limit(limit)
      .select(
        "originalText enhancedText provider aiModel site settings tokens processingTime quality requestType cost createdAt"
      )
      .lean();

    // Format response data
    const historyItems = prompts.map((prompt: any) => ({
      id: prompt._id.toString(),
      originalText: prompt.originalText,
      enhancedText: prompt.enhancedText,
      provider: prompt.provider,
      model: prompt.aiModel,
      site: prompt.site,
      settings: prompt.settings,
      tokens: prompt.tokens,
      processingTime: prompt.processingTime,
      quality: prompt.quality || null,
      requestType: prompt.requestType || 'free',
      cost: prompt.cost || { inputTokens: 0, outputTokens: 0, totalCostUSD: 0 },
      createdAt: prompt.createdAt,
      // Add improvement ratio for analytics
      improvementRatio: prompt.enhancedText.length / prompt.originalText.length,
      // Add preview for UI
      originalPreview: prompt.originalText.slice(0, 100),
      enhancedPreview: prompt.enhancedText.slice(0, 100),
    }));

    // Get some basic stats
    const stats = await Prompt.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: null,
          totalPrompts: { $sum: 1 },
          totalTokens: { $sum: "$tokens" },
          avgProcessingTime: { $avg: "$processingTime" },
          avgImprovementRatio: {
            $avg: {
              $divide: [
                { $strLenCP: "$enhancedText" },
                { $strLenCP: "$originalText" },
              ],
            },
          },
          providerBreakdown: {
            $push: "$provider",
          },
          siteBreakdown: {
            $push: "$site",
          },
        },
      },
    ]);

    // Get enhanced usage stats (daily breakdown by request type)
    const now = new Date();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usageStats = await Prompt.aggregate([
      {
        $match: {
          userId: user._id,
          createdAt: { $gte: startOfDay, $lte: now },
        },
      },
      {
        $group: {
          _id: "$requestType",
          count: { $sum: 1 },
          totalTokens: { $sum: "$tokens" },
          totalCost: { $sum: "$cost.totalCostUSD" },
          avgProcessingTime: { $avg: "$processingTime" },
          providers: { $addToSet: "$provider" },
        },
      },
    ]);

    const monthlyUsageStats = await Prompt.aggregate([
      {
        $match: {
          userId: user._id,
          createdAt: { $gte: startOfMonth, $lte: now },
        },
      },
      {
        $group: {
          _id: "$requestType",
          count: { $sum: 1 },
          totalTokens: { $sum: "$tokens" },
          totalCost: { $sum: "$cost.totalCostUSD" },
          avgProcessingTime: { $avg: "$processingTime" },
          providers: { $addToSet: "$provider" },
        },
      },
    ]);

    // Process usage stats
    const dailyStatsMap = usageStats.reduce((acc: any, stat: any) => {
      acc[stat._id] = stat;
      return acc;
    }, {});

    const monthlyStatsMap = monthlyUsageStats.reduce((acc: any, stat: any) => {
      acc[stat._id] = stat;
      return acc;
    }, {});

    // Check if user has personal API keys
    const hasPersonalApiKeys = !!(
      user.apiKeys?.openai?.isValid || user.apiKeys?.anthropic?.isValid
    );

    // Enhanced usage info for popup
    const enhancedUsage = {
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
      totalDailyUsage:
        (dailyStatsMap.free?.count || 0) + (dailyStatsMap.personal?.count || 0),
      totalMonthlyUsage:
        (monthlyStatsMap.free?.count || 0) +
        (monthlyStatsMap.personal?.count || 0),
    };

    console.log("enhancedUsage", enhancedUsage);

    const userStats = stats[0] || {
      totalPrompts: 0,
      totalTokens: 0,
      avgProcessingTime: 0,
      avgImprovementRatio: 1,
      providerBreakdown: [],
      siteBreakdown: [],
    };

    console.log("userStats", userStats);

    console.log("---------------");
    console.log("monthlyStatsMap", user);

    // Count provider usage
    const providerCounts = userStats.providerBreakdown.reduce(
      (acc: any, provider: string) => {
        acc[provider] = (acc[provider] || 0) + 1;
        return acc;
      },
      {}
    );

    // Count site usage
    const siteCounts = userStats.siteBreakdown.reduce(
      (acc: any, site: string) => {
        acc[site] = (acc[site] || 0) + 1;
        return acc;
      },
      {}
    );

    console.log("historyItems", historyItems);

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          items: historyItems,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
          filters: {
            site,
            provider,
            search,
          },
          stats: {
            totalPrompts: userStats.totalPrompts,
            totalTokens: userStats.totalTokens,
            avgProcessingTime: Math.round(userStats.avgProcessingTime),
            avgImprovementRatio: Number(
              userStats.avgImprovementRatio.toFixed(2)
            ),
            providerUsage: providerCounts,
            siteUsage: siteCounts,
          },
          enhancedUsage,
        },
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error("GET /api/user/history error:", error);
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

// DELETE /api/user/history - Delete user's prompt history
export async function DELETE(request: NextRequest) {
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

    // Find user
    const user = await User.findOne({ clerkId: clerkUser.id });
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "User not found" },
        { status: 404, headers: corsHeaders() }
      );
    }

    // Parse query parameters for selective deletion
    const { searchParams } = new URL(request.url);
    const promptId = searchParams.get("id"); // Delete specific prompt
    const site = searchParams.get("site"); // Delete all from specific site
    const provider = searchParams.get("provider"); // Delete all from specific provider
    const olderThan = searchParams.get("olderThan"); // Delete older than date (ISO string)
    const clearAll = searchParams.get("clearAll") === "true"; // Delete everything

    let deleteQuery: any = { userId: user._id };
    let deletedCount = 0;

    if (promptId) {
      // Delete specific prompt
      deleteQuery._id = promptId;
      const result = await Prompt.deleteOne(deleteQuery);
      deletedCount = result.deletedCount;

      if (deletedCount === 0) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Prompt not found or access denied" },
          { status: 404, headers: corsHeaders() }
        );
      }
    } else if (clearAll) {
      // Delete all user's prompts
      const result = await Prompt.deleteMany(deleteQuery);
      deletedCount = result.deletedCount;
    } else {
      // Build selective delete query
      if (site) {
        deleteQuery.site = site;
      }

      if (provider) {
        deleteQuery.provider = provider;
      }

      if (olderThan) {
        const cutoffDate = new Date(olderThan);
        if (!isNaN(cutoffDate.getTime())) {
          deleteQuery.createdAt = { $lt: cutoffDate };
        }
      }

      // Only proceed if we have at least one filter (prevent accidental full deletion)
      if (Object.keys(deleteQuery).length === 1) {
        // Only userId
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error:
              "Please specify deletion criteria: id, site, provider, olderThan, or clearAll=true",
          },
          { status: 400, headers: corsHeaders() }
        );
      }

      const result = await Prompt.deleteMany(deleteQuery);
      deletedCount = result.deletedCount;
    }

    // Log the deletion for audit purposes
    console.log(
      `User ${clerkUser.id} deleted ${deletedCount} prompts with query:`,
      deleteQuery
    );

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: `Successfully deleted ${deletedCount} prompt${
          deletedCount !== 1 ? "s" : ""
        }`,
        data: {
          deletedCount,
          query: deleteQuery,
        },
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error("DELETE /api/user/history error:", error);
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
