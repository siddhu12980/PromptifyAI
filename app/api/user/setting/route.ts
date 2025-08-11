/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models";
import { ApiResponse } from "@/lib/types";

const EXTENSION_ORIGIN = "chrome-extension://jmdhjncoalbiiiffhjfpijnigeelgphg";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": EXTENSION_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

// Default settings for new users
const DEFAULT_SETTINGS = {
  enabled: true,
  provider: "openai", // "openai" or "anthropic"
  openaiModel: "gpt-4o",
  anthropicModel: "claude-3-5-sonnet-20240620",
  tone: "neutral", // neutral, professional, friendly, persuasive, academic
  detail: "balanced", // concise, balanced, exhaustive
  audience: "", // empty string for general audience
};

// GET /api/user/setting - Get user's settings
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

    // Find user in our database
    const user = await User.findOne({ clerkId: clerkUser.id });
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "User not found" },
        { status: 404, headers: corsHeaders() }
      );
    }

    // Return user's settings, falling back to defaults for missing values
    const settings = {
      ...DEFAULT_SETTINGS,
      ...user.settings,
    };

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { settings },
    }, { headers: corsHeaders() });
  } catch (error) {
    console.error("GET /api/user/setting error:", error);
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

// PUT /api/user/setting - Update user's settings
export async function PUT(request: NextRequest) {
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
    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid settings data" },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Validate settings
    const validatedSettings = validateSettings(settings);
    if (!validatedSettings.valid) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: validatedSettings.error },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Connect to database
    await dbConnect();

    // Find and update user
    const user = await User.findOne({ clerkId: clerkUser.id });
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "User not found" },
        { status: 404, headers: corsHeaders() }
      );
    }

    // Update user settings
    user.settings = {
      ...user.settings,
      ...validatedSettings.settings,
    };
    user.updatedAt = new Date();

    await user.save();

    console.log(`[API] Updated settings for user ${user.email}`);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Settings updated successfully",
      data: { settings: user.settings },
    }, { headers: corsHeaders() });
  } catch (error) {
    console.error("PUT /api/user/setting error:", error);
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

// Validate settings object
function validateSettings(settings: any): { valid: boolean; settings?: any; error?: string } {
  const validProviders = ["openai", "anthropic"];
  const validTones = ["neutral", "professional", "friendly", "persuasive", "academic"];
  const validDetails = ["concise", "balanced", "exhaustive"];

  const validated: any = {};

  // Validate enabled (boolean)
  if (settings.hasOwnProperty("enabled")) {
    if (typeof settings.enabled !== "boolean") {
      return { valid: false, error: "enabled must be a boolean" };
    }
    validated.enabled = settings.enabled;
  }

  // Validate provider
  if (settings.hasOwnProperty("provider")) {
    if (!validProviders.includes(settings.provider)) {
      return { valid: false, error: `provider must be one of: ${validProviders.join(", ")}` };
    }
    validated.provider = settings.provider;
  }

  // Validate openaiModel
  if (settings.hasOwnProperty("openaiModel")) {
    if (typeof settings.openaiModel !== "string" || settings.openaiModel.trim().length === 0) {
      return { valid: false, error: "openaiModel must be a non-empty string" };
    }
    validated.openaiModel = settings.openaiModel.trim();
  }

  // Validate anthropicModel
  if (settings.hasOwnProperty("anthropicModel")) {
    if (typeof settings.anthropicModel !== "string" || settings.anthropicModel.trim().length === 0) {
      return { valid: false, error: "anthropicModel must be a non-empty string" };
    }
    validated.anthropicModel = settings.anthropicModel.trim();
  }

  // Validate tone
  if (settings.hasOwnProperty("tone")) {
    if (!validTones.includes(settings.tone)) {
      return { valid: false, error: `tone must be one of: ${validTones.join(", ")}` };
    }
    validated.tone = settings.tone;
  }

  // Validate detail
  if (settings.hasOwnProperty("detail")) {
    if (!validDetails.includes(settings.detail)) {
      return { valid: false, error: `detail must be one of: ${validDetails.join(", ")}` };
    }
    validated.detail = settings.detail;
  }

  // Validate audience (optional string)
  if (settings.hasOwnProperty("audience")) {
    if (typeof settings.audience !== "string") {
      return { valid: false, error: "audience must be a string" };
    }
    validated.audience = settings.audience.trim();
  }

  return { valid: true, settings: validated };
}
