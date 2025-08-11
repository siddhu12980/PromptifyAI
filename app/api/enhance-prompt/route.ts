import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import { User, Usage, Prompt } from "@/lib/models";
import {
  ApiResponse,
  EnhancePromptRequest,
  EnhancePromptResponse,
  QuotaInfo,
} from "@/lib/types";

import { EXTENSION_ORIGIN } from "@/lib/const";
import {
  calculateCost,
  enhanceWithTemplate,
  getApiKey,
  getUserApiKey,
  shouldUseTemplate,
} from "@/lib/helper";
import { callOpenAI } from "@/lib/ai";
import { callAnthropic } from "@/lib/ai";
import { buildAIUserPayload } from "@/lib/prompt";
import { buildAISystemPrompt } from "@/lib/prompt";

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

// AI-based enhancement system prompts

function trimText(text: string, maxChars = 8000): string {
  if (!text) return "";
  if (text.length <= maxChars) return text;

  const trimmed = text.slice(-maxChars);
  const sentenceStart = trimmed.indexOf(". ");
  return sentenceStart > 0 ? trimmed.slice(sentenceStart + 2) : trimmed;
}

// POST /api/enhance-prompt - Main prompt enhancement endpoint
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get authenticated user from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Parse request body
    const body: EnhancePromptRequest = await request.json();
    const { originalText, conversationContext, site } = body;

    console.log("[API] Enhance prompt request:", body);

    // Validate required fields
    if (!originalText || !site) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Missing required fields: originalText, site",
        },
        { status: 400, headers: corsHeaders() }
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

    const userSettings = user.settings;

    console.log("[API] User settings used for request:", userSettings);

    const provider = userSettings.provider || "openai";

    // Get API key (personal or shared)
    let apiKeyInfo;

    try {
      apiKeyInfo = await getApiKey(user, provider);
    } catch (error) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "API key configuration error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Only check quota limits for shared API keys
    let usage;

    if (!apiKeyInfo.isPersonal) {
      // Get current date for usage
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0];

      // Get or create usage document for today
      usage = await (Usage as any).getOrCreateUsage(user._id, dateStr);

      // Check quota limits for shared API usage
      const dailyLimit = user.planId.dailyLimit;
      const monthlyLimit = user.planId.monthlyLimit;

      if (dailyLimit < 999999 && usage.dailyUsed >= dailyLimit) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: "Daily quota exceeded",
            message: `Daily limit of ${dailyLimit} requests reached. Add your personal API key for unlimited usage.`,
          },
          { status: 429, headers: corsHeaders() }
        );
      }

      if (monthlyLimit < 999999 && usage.monthlyUsed >= monthlyLimit) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: "Monthly quota exceeded",
            message: `Monthly limit of ${monthlyLimit} requests reached. Add your personal API key for unlimited usage.`,
          },
          { status: 429, headers: corsHeaders() }
        );
      }
    }

    // Determine enhancement method
    const trimmedContext = trimText(conversationContext || "");
    let enhancedText: string | undefined;
    let method: "template" | "ai" = "ai";
    let tokensUsed = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let cost = 0;

    // Try template enhancement first for simple patterns
    if (shouldUseTemplate(originalText)) {
      const templateResult = enhanceWithTemplate(originalText, trimmedContext);
      if (templateResult && templateResult !== originalText) {
        enhancedText = templateResult;
        method = "template";
        console.log("[API] Using template enhancement");
      }
    }

    // AI enhancement if template didn't work
    if (!enhancedText) {
      const model =
        provider === "openai"
          ? userSettings.openaiModel || "gpt-4o"
          : userSettings.anthropicModel || "claude-3-5-sonnet-20240620";

      // Build AI prompts
      const systemPrompt = buildAISystemPrompt({
        tone: userSettings.tone,
        detail: userSettings.detail,
        audience: userSettings.audience,
      });

      const userPrompt = buildAIUserPayload({
        conversationContext: trimmedContext,
        originalText,
        site,
      });

      // Call AI provider with enhanced error handling
      let result;

      try {
        if (provider === "openai") {
          result = await callOpenAI({
            apiKey: apiKeyInfo.key,
            model,
            system: systemPrompt,
            user: userPrompt,
          });

          // Use actual token counts from OpenAI API
          inputTokens = result.inputTokens;
          outputTokens = result.outputTokens;
          tokensUsed = result.usageTokens;
        } else {
          result = await callAnthropic({
            apiKey: apiKeyInfo.key,
            model,
            system: systemPrompt,
            user: userPrompt,
          });

          // Use actual token counts from Anthropic API
          inputTokens = result.inputTokens;
          outputTokens = result.outputTokens;
          tokensUsed = result.usageTokens;
        }

        enhancedText = result.text;

        // Calculate accurate cost using our helper function
        cost = calculateCost(provider, model, inputTokens, outputTokens);
      } catch (error) {
        // If AI fails, provide user-friendly error message
        const errorMessage =
          error instanceof Error ? error.message : "AI service unavailable";

        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: "Enhancement failed",
            message: `${errorMessage}${
              apiKeyInfo.isPersonal
                ? ""
                : " You can add your personal API key in settings for better reliability."
            }`,
          },
          { status: 500, headers: corsHeaders() }
        );
      }
    }

    const processingTime = Date.now() - startTime;

    // Ensure we have enhanced text (fallback to original if all methods fail)
    if (!enhancedText) {
      enhancedText = originalText + ". Please provide a detailed explanation.";
      method = "template";
    }

    // Record usage in database (only for successful requests)
    if (!apiKeyInfo.isPersonal && usage) {
      await usage.addRequest({
        provider: user.settings.provider,
        tokens: tokensUsed,
        cost,
        success: true,
      });
    }

    // Save prompt to database
    const prompt = new Prompt({
      userId: user._id,
      originalText,
      enhancedText,
      provider: user.settings.provider,
      aiModel:
        user.settings.provider === "openai"
          ? user.settings.openaiModel
          : user.settings.anthropicModel,
      site,
      settings: {
        tone: user.settings.tone,
        detail: user.settings.detail,
        audience: user.settings.audience,
      },
      conversationContext: trimmedContext,
      tokens: tokensUsed,
      processingTime,
      // New tracking fields
      requestType: apiKeyInfo.isPersonal ? "personal" : "free",
      apiKeySource: apiKeyInfo.isPersonal ? "user" : "shared",
      cost: {
        inputTokens: method === "ai" ? inputTokens : 0,
        outputTokens: method === "ai" ? outputTokens : 0,
        totalCostUSD: cost,
      },
    });

    await prompt.save();

    // Build quota info
    let quotaInfo: QuotaInfo;

    if (apiKeyInfo.isPersonal) {
      // Personal API key = unlimited quota
      quotaInfo = {
        dailyUsed: 0,
        dailyLimit: -1,
        dailyRemaining: -1,
        monthlyUsed: 0,
        monthlyLimit: -1,
        monthlyRemaining: -1,
        planName: "Personal API Key",
        isUnlimited: true,
      };
    } else {
      // Shared API key = enforce limits
      const dailyLimit = user.planId.dailyLimit;
      const monthlyLimit = user.planId.monthlyLimit;
      const isUnlimitedDaily = dailyLimit >= 999999;
      const isUnlimitedMonthly = monthlyLimit >= 999999;

      quotaInfo = {
        dailyUsed: usage!.dailyUsed,
        dailyLimit: isUnlimitedDaily ? -1 : dailyLimit,
        dailyRemaining: isUnlimitedDaily
          ? -1
          : Math.max(0, dailyLimit - usage!.dailyUsed),
        monthlyUsed: usage!.monthlyUsed,
        monthlyLimit: isUnlimitedMonthly ? -1 : monthlyLimit,
        monthlyRemaining: isUnlimitedMonthly
          ? -1
          : Math.max(0, monthlyLimit - usage!.monthlyUsed),
        planName: user.planId.displayName,
        isUnlimited: isUnlimitedDaily && isUnlimitedMonthly,
      };
    }

    // Return success response
    const response: EnhancePromptResponse = {
      enhancedText,
      promptId: prompt._id.toString(),
      tokensUsed,
      quotaInfo,
    };

    return NextResponse.json<ApiResponse<EnhancePromptResponse>>(
      {
        success: true,
        data: response,
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error("POST /api/enhance-prompt error:", error);

    // Try to record failed usage if we have user context (only for shared API usage)
    try {
      const clerkUser = await currentUser();
      if (clerkUser) {
        await dbConnect();
        const user = await User.findOne({ clerkId: clerkUser.id });
        if (user) {
          // Check if user has personal API key to decide whether to record usage
          const hasPersonalKey = await getUserApiKey(
            user,
            user.settings.provider
          );

          if (!hasPersonalKey) {
            const today = new Date();
            const dateStr = today.toISOString().split("T")[0];
            const usage = await (Usage as any).getOrCreateUsage(
              user._id,
              dateStr
            );

            await usage.addRequest({
              provider: user.settings.provider,
              tokens: 0,
              cost: 0,
              success: false,
              errorMessage:
                error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
      }
    } catch (usageError) {
      console.error("Failed to record usage for failed request:", usageError);
    }

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "Enhancement failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}
